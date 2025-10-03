import nodeCron from 'node-cron';
import { Op } from 'sequelize';
import User from '../models/User';
import AccountabilityCheckIn from '../models/AccountabilityCheckIn';
import { evaluateAndUnlockAchievements, recordCheckInAndUpdateStreak } from '../services/progressService';

/**
 * Common timezone mappings for easier processing
 * In a production environment, you might want to use a more comprehensive timezone library
 */
const TIMEZONE_OFFSETS = {
  // Major US timezones
  'PST': -8, 'PDT': -7, // Pacific
  'MST': -7, 'MDT': -6, // Mountain
  'CST': -6, 'CDT': -5, // Central
  'EST': -5, 'EDT': -4, // Eastern
  
  // European timezones
  'GMT': 0, 'UTC': 0,   // GMT/UTC
  'CET': 1, 'CEST': 2,  // Central European
  'EET': 2, 'EEST': 3,  // Eastern European
  
  // Asia Pacific
  'JST': 9,  // Japan
  'AEST': 10, 'AEDT': 11, // Australian Eastern
  'IST': 5.5, // India (half-hour offset)
};

/**
 * Service to create automatic check-ins for users who haven't checked in for the day
 * This runs at the end of each timezone day to ensure users maintain their streaks
 */

/**
 * Gets the timezone offset from a timezone string
 * @param timezone - The timezone string (e.g., 'EST', 'PST', 'UTC+5', etc.)
 * @returns The offset in hours, or 0 if unable to parse
 */
const getTimezoneOffset = (timezone: string | null): number => {
  if (!timezone) return 0;
  
  // Check if it's a known timezone abbreviation
  const upperTz = timezone.toUpperCase();
  if (TIMEZONE_OFFSETS[upperTz as keyof typeof TIMEZONE_OFFSETS]) {
    return TIMEZONE_OFFSETS[upperTz as keyof typeof TIMEZONE_OFFSETS];
  }
  
  // Try to parse UTC+X or UTC-X format
  const utcMatch = timezone.match(/UTC([+-])(\d+(?:\.\d+)?)/i);
  if (utcMatch && utcMatch[1] && utcMatch[2]) {
    const sign = utcMatch[1] === '+' ? 1 : -1;
    const offset = parseFloat(utcMatch[2]);
    return sign * offset;
  }
  
  // Try to parse +X or -X format
  const offsetMatch = timezone.match(/^([+-])(\d+(?:\.\d+)?)$/);
  if (offsetMatch && offsetMatch[1] && offsetMatch[2]) {
    const sign = offsetMatch[1] === '+' ? 1 : -1;
    const offset = parseFloat(offsetMatch[2]);
    return sign * offset;
  }
  
  return 0; // Default to UTC if unable to parse
};

/**
 * Creates an automatic check-in for a user
 * This is called when a user hasn't made a manual check-in for the day
 * 
 * @param userId - The ID of the user to create an automatic check-in for
 * @param targetDate - The date to check for (in user's timezone)
 */
const createAutomaticCheckIn = async (userId: number, targetDate: Date): Promise<void> => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      console.log(`Auto check-in: User ${userId} not found`);
      return;
    }

    const userTimezone = user.timezone || 'UTC';
    const timezoneOffset = getTimezoneOffset(userTimezone);
    
    // Calculate the start and end of the target date in the user's timezone
    const userDate = new Date(targetDate);
    userDate.setUTCHours(userDate.getUTCHours() - timezoneOffset); // Convert to user's timezone
    
    const startOfDay = new Date(userDate);
    startOfDay.setUTCHours(-timezoneOffset, 0, 0, 0); // Start of day in user's timezone, converted to UTC
    
    const endOfDay = new Date(userDate);
    endOfDay.setUTCHours(23 - timezoneOffset, 59, 59, 999); // End of day in user's timezone, converted to UTC

    // Check if user has already checked in today
    const existingCheckIn = await AccountabilityCheckIn.findOne({
      where: {
        userId,
        createdAt: {
          [Op.between]: [startOfDay, endOfDay]
        }
      }
    });

    if (existingCheckIn) {
      console.log(`Auto check-in: User ${userId} already has a ${existingCheckIn.isAutomatic ? 'automatic' : 'manual'} check-in for ${targetDate.toISOString().split('T')[0]}`);
      return;
    }

    // Create automatic check-in with default values
    const automaticCheckIn = await AccountabilityCheckIn.create({
      userId,
      mood: 0.5, // Neutral mood for automatic check-ins
      note: 'Automatic check-in - no manual check-in recorded for this day',
      visibility: 'private', // Keep automatic check-ins private
      status: 'relapse', // Assume relapse since user didn't check in manually
      // isAutomatic: true is now the default, so no need to explicitly set it
    });

    console.log(`Auto check-in: Created automatic check-in ${automaticCheckIn.id} for user ${userId} (${user.username}) in timezone ${userTimezone}`);

    // Update progress and evaluate achievements (but don't notify partners)
    await recordCheckInAndUpdateStreak(userId, automaticCheckIn.createdAt, automaticCheckIn.status);
    const newlyUnlocked = await evaluateAndUnlockAchievements(userId);
    
    if (newlyUnlocked && newlyUnlocked.length > 0) {
      console.log(`Auto check-in: User ${userId} unlocked ${newlyUnlocked.length} achievements from automatic check-in`);
    }

  } catch (error: any) {
    console.error(`Auto check-in: Error creating automatic check-in for user ${userId}:`, error.message);
  }
};

/**
 * Finds users in a specific timezone offset
 * @param targetOffset - The timezone offset to filter by
 * @returns Array of users matching the timezone
 */
const getUsersInTimezone = async (targetOffset: number): Promise<User[]> => {
  // Get all active users
  const allUsers = await User.findAll({
    where: {
      isActive: true,
    },
    attributes: ['id', 'timezone', 'username', 'createdAt']
  });

  // Filter users by timezone offset
  const usersInTimezone = allUsers.filter(user => {
    const userOffset = getTimezoneOffset(user.timezone ?? null);
    return Math.abs(userOffset - targetOffset) < 0.1; // Allow for small floating point differences
  });

  return usersInTimezone;
};

/**
 * Processes automatic check-ins for a specific timezone
 * This should be called once per day at the end of each timezone day
 * 
 * @param timezoneOffset - The timezone offset in hours (e.g., -5 for EST, +1 for CET)
 */
const processAutomaticCheckInsForTimezone = async (timezoneOffset: number): Promise<void> => {
  try {
    console.log(`Auto check-in: Processing automatic check-ins for timezone offset ${timezoneOffset}`);

    // Find users in this specific timezone
    const users = await getUsersInTimezone(timezoneOffset);

    console.log(`Auto check-in: Found ${users.length} active users in timezone offset ${timezoneOffset}`);

    if (users.length === 0) {
      console.log(`Auto check-in: No users found for timezone offset ${timezoneOffset}, skipping`);
      return;
    }

    // Calculate the target date for this timezone
    const now = new Date();
    const targetDate = new Date(now.getTime() + (timezoneOffset * 60 * 60 * 1000));

    let processed = 0;
    let created = 0;
    let skipped = 0;

    // Process users in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(async (user) => {
          const userDate = new Date(targetDate);
          await createAutomaticCheckIn(user.id, userDate);
          return { userId: user.id, success: true };
        })
      );

      // Count results
      results.forEach((result, index) => {
        processed++;
        if (result.status === 'fulfilled') {
          created++;
        } else {
          skipped++;
          console.log(`Auto check-in: Failed to process user ${batch[index]?.id}: ${result.reason}`);
        }
      });
      
      // Small delay between batches to avoid overwhelming the system
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Auto check-in: Completed processing for timezone offset ${timezoneOffset}. Processed: ${processed}, Created: ${created}, Skipped: ${skipped}`);

  } catch (error: any) {
    console.error(`Auto check-in: Error processing automatic check-ins for timezone offset ${timezoneOffset}:`, error.message);
  }
};

/**
 * Schedules the automatic check-in cron jobs
 * This sets up multiple cron jobs to handle different timezones
 */
export const scheduleAutomaticCheckInCron = (): void => {
  console.log('Auto check-in: Setting up automatic check-in cron jobs');

  // Schedule cron jobs for different timezone offsets
  // Run at 11:45 PM in each timezone to catch users who haven't checked in
  
  // UTC (0 offset) - 23:45 UTC
  nodeCron.schedule('45 23 * * *', async () => {
    await processAutomaticCheckInsForTimezone(0);
  }, {
    timezone: 'UTC'
  });

  // EST (UTC-5) - 23:45 EST = 04:45 UTC next day
  nodeCron.schedule('45 4 * * *', async () => {
    await processAutomaticCheckInsForTimezone(-5);
  }, {
    timezone: 'UTC'
  });

  // PST (UTC-8) - 23:45 PST = 07:45 UTC next day
  nodeCron.schedule('45 7 * * *', async () => {
    await processAutomaticCheckInsForTimezone(-8);
  }, {
    timezone: 'UTC'
  });

  // CET (UTC+1) - 23:45 CET = 22:45 UTC
  nodeCron.schedule('45 22 * * *', async () => {
    await processAutomaticCheckInsForTimezone(1);
  }, {
    timezone: 'UTC'
  });

  // Add more timezones as needed...
  // For a more comprehensive solution, you could loop through all major timezones

  console.log('Auto check-in: Automatic check-in cron jobs scheduled');
};

/**
 * Manual function to trigger automatic check-ins for testing
 * This can be called from an API endpoint for testing purposes
 */
export const triggerAutomaticCheckInsForAllTimezones = async (): Promise<void> => {
  console.log('Auto check-in: Manually triggering automatic check-ins for all timezones');
  
  const timezones = [-12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  
  for (const tz of timezones) {
    await processAutomaticCheckInsForTimezone(tz);
  }
  
  console.log('Auto check-in: Completed manual trigger for all timezones');
};

export default scheduleAutomaticCheckInCron;