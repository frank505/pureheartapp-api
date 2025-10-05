import Action from '../src/models/Action';
import { ActionCategory, ActionDifficulty } from '../src/types/commitment';

/**
 * Seed default actions for the Action Commitments System
 */

const defaultActions = [
  // Community Service
  {
    title: 'Serve at soup kitchen',
    description: 'Help serve meals to those in need at a local soup kitchen or food bank. Spend at least 3 hours helping prepare and distribute food.',
    category: ActionCategory.COMMUNITY_SERVICE,
    difficulty: ActionDifficulty.MEDIUM,
    estimatedHours: 3,
    proofInstructions: 'Take a photo of yourself serving food. Your face must be visible. Include the location name or signage if possible.',
    requiresLocation: true,
  },
  {
    title: 'Clean public spaces',
    description: 'Organize or participate in a community cleanup of parks, streets, or public areas for 2 hours.',
    category: ActionCategory.COMMUNITY_SERVICE,
    difficulty: ActionDifficulty.EASY,
    estimatedHours: 2,
    proofInstructions: 'Take before and after photos showing the cleaned area with you in at least one photo.',
    requiresLocation: true,
  },
  {
    title: 'Visit elderly at nursing home',
    description: 'Spend quality time visiting residents at a nursing home or assisted living facility for 2 hours.',
    category: ActionCategory.COMMUNITY_SERVICE,
    difficulty: ActionDifficulty.MEDIUM,
    estimatedHours: 2,
    proofInstructions: 'Take a respectful photo at the facility (follow facility photo policies). Get a signature or stamp from staff if needed.',
    requiresLocation: true,
  },
  {
    title: 'Tutor or mentor youth',
    description: 'Provide free tutoring or mentoring to students in need for 3 hours.',
    category: ActionCategory.EDUCATION,
    difficulty: ActionDifficulty.MEDIUM,
    estimatedHours: 3,
    proofInstructions: 'Take a photo during the session (protect student privacy - face not required). Provide documentation from organization if available.',
    requiresLocation: false,
  },

  // Church Service
  {
    title: 'Volunteer at church service',
    description: 'Serve at your local church for 3 hours - help with setup, greeting, children\'s ministry, or other needs.',
    category: ActionCategory.CHURCH_SERVICE,
    difficulty: ActionDifficulty.EASY,
    estimatedHours: 3,
    proofInstructions: 'Take a photo at the church showing you serving. Include the church building or signage.',
    requiresLocation: true,
  },
  {
    title: 'Lead or attend Bible study',
    description: 'Lead or actively participate in a Bible study session, helping others grow in their faith.',
    category: ActionCategory.CHURCH_SERVICE,
    difficulty: ActionDifficulty.MEDIUM,
    estimatedHours: 2,
    proofInstructions: 'Take a group photo from the session (with permission). Your face must be visible.',
    requiresLocation: false,
  },
  {
    title: 'Church building maintenance',
    description: 'Help with church building maintenance, cleaning, or improvement projects for 4 hours.',
    category: ActionCategory.CHURCH_SERVICE,
    difficulty: ActionDifficulty.HARD,
    estimatedHours: 4,
    proofInstructions: 'Take photos showing the work being done with you visibly participating.',
    requiresLocation: true,
  },

  // Charity
  {
    title: 'Donate blood',
    description: 'Donate blood at a blood drive or donation center.',
    category: ActionCategory.CHARITY,
    difficulty: ActionDifficulty.EASY,
    estimatedHours: 1.5,
    proofInstructions: 'Take a photo of yourself at the donation center or with the post-donation materials.',
    requiresLocation: true,
  },
  {
    title: 'Volunteer at charity event',
    description: 'Help organize or work at a charitable event or fundraiser for 4 hours.',
    category: ActionCategory.CHARITY,
    difficulty: ActionDifficulty.MEDIUM,
    estimatedHours: 4,
    proofInstructions: 'Take photos showing you participating in the event. Include event signage or materials.',
    requiresLocation: true,
  },
  {
    title: 'Collect donations for charity',
    description: 'Organize and collect clothing, food, or other items for a charitable organization.',
    category: ActionCategory.CHARITY,
    difficulty: ActionDifficulty.MEDIUM,
    estimatedHours: 3,
    proofInstructions: 'Take photos of the collected items and delivery to the charity. Show yourself in the photos.',
    requiresLocation: false,
  },

  // Helping Individuals
  {
    title: 'Help elderly neighbor with chores',
    description: 'Assist an elderly person in your neighborhood with yard work, shopping, or household tasks for 3 hours.',
    category: ActionCategory.HELPING_INDIVIDUALS,
    difficulty: ActionDifficulty.MEDIUM,
    estimatedHours: 3,
    proofInstructions: 'Take photos of the work completed. Include yourself in at least one photo.',
    requiresLocation: false,
  },
  {
    title: 'Prepare meals for someone in need',
    description: 'Cook and deliver meals to someone who is sick, struggling, or in need.',
    category: ActionCategory.HELPING_INDIVIDUALS,
    difficulty: ActionDifficulty.EASY,
    estimatedHours: 2,
    proofInstructions: 'Take photos of meal preparation and delivery (with recipient permission if showing them).',
    requiresLocation: false,
  },
  {
    title: 'Help someone move or repair',
    description: 'Assist someone with moving, home repairs, or other physical labor for 4 hours.',
    category: ActionCategory.HELPING_INDIVIDUALS,
    difficulty: ActionDifficulty.HARD,
    estimatedHours: 4,
    proofInstructions: 'Take photos during the work. Show yourself actively helping.',
    requiresLocation: false,
  },

  // Environmental
  {
    title: 'Plant trees or community garden',
    description: 'Participate in tree planting or help maintain a community garden for 3 hours.',
    category: ActionCategory.ENVIRONMENTAL,
    difficulty: ActionDifficulty.MEDIUM,
    estimatedHours: 3,
    proofInstructions: 'Take photos of yourself planting or gardening. Show the work being done.',
    requiresLocation: true,
  },
  {
    title: 'Beach or river cleanup',
    description: 'Organize or join a beach, river, or waterway cleanup effort for 2 hours.',
    category: ActionCategory.ENVIRONMENTAL,
    difficulty: ActionDifficulty.EASY,
    estimatedHours: 2,
    proofInstructions: 'Take before/after photos with collected trash. Include yourself in photos.',
    requiresLocation: true,
  },

  // Healthcare
  {
    title: 'Volunteer at hospital',
    description: 'Volunteer at a hospital helping patients, families, or staff for 4 hours.',
    category: ActionCategory.HEALTHCARE,
    difficulty: ActionDifficulty.HARD,
    estimatedHours: 4,
    proofInstructions: 'Take a photo at the hospital (following hospital photo policies). Get staff verification if needed.',
    requiresLocation: true,
  },
  {
    title: 'Support group facilitation',
    description: 'Lead or co-lead a recovery or support group session.',
    category: ActionCategory.HEALTHCARE,
    difficulty: ActionDifficulty.HARD,
    estimatedHours: 2,
    proofInstructions: 'Take a group photo (with permission, no faces if anonymity required). Document the session.',
    requiresLocation: false,
  },
];

export async function seedActions() {
  try {
    console.log('🌱 Seeding default actions...');

    // Clear existing actions (optional - remove in production)
    // await Action.destroy({ where: {} });

    // Create actions
    for (const actionData of defaultActions) {
      const existing = await Action.findOne({
        where: { title: actionData.title },
      });

      if (!existing) {
        await Action.create({ ...actionData, isActive: true });
        console.log(`✅ Created action: ${actionData.title}`);
      } else {
        console.log(`⏭️  Action already exists: ${actionData.title}`);
      }
    }

    console.log('✅ Action seeding completed!');
    console.log(`📊 Total actions: ${defaultActions.length}`);
  } catch (error) {
    console.error('❌ Error seeding actions:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  const { testDatabaseConnection } = require('../config/database');
  
  (async () => {
    try {
      await testDatabaseConnection();
      await seedActions();
      process.exit(0);
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  })();
}
