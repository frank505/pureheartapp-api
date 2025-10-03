import nodeCron from 'node-cron';
import { Op } from 'sequelize';
import SensitiveImage from '../models/SensitiveImage';
import SensitiveImageFinding from '../models/SensitiveImageFinding';
import SensitiveImageComment from '../models/SensitiveImageComment';
import { enqueueSensitiveImageDeletion } from './userCleanupJobs';

/**
 * Screenshot Cleanup Job
 * 
 * This job runs daily to clean up old screenshot records and their associated data:
 * - Deletes SensitiveImage records older than 30 days
 * - Deletes associated SensitiveImageFinding records
 * - Deletes associated SensitiveImageComment records
 * - Deletes stored screenshot objects from S3 (or compatible storage)
 * 
 * The cleanup helps maintain database performance and comply with data retention policies.
 */

const RETENTION_DAYS = 30;

/**
 * Performs the cleanup of old screenshot records
 */
export async function cleanupOldScreenshots(): Promise<void> {
  const startTime = Date.now();
  console.log(`[Screenshot Cleanup] Starting cleanup job at ${new Date().toISOString()}`);

  try {
    // Calculate the cutoff date (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    console.log(`[Screenshot Cleanup] Deleting records older than ${cutoffDate.toISOString()}`);

    // Find all old sensitive images
    const oldImages = await SensitiveImage.findAll({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate
        }
      },
      attributes: ['id', 'imageUrl', 'rawMeta']
    });

    if (oldImages.length === 0) {
      console.log('[Screenshot Cleanup] No old screenshots found to delete');
      return;
    }

    console.log(`[Screenshot Cleanup] Found ${oldImages.length} old screenshots to delete`);

    const imageIds = oldImages.map(img => img.id);

    // Delete associated findings first (foreign key constraint)
    const findingsDeleted = await SensitiveImageFinding.destroy({
      where: {
        imageId: {
          [Op.in]: imageIds
        }
      }
    });
    console.log(`[Screenshot Cleanup] Deleted ${findingsDeleted} image findings`);

    // Delete associated comments
    const commentsDeleted = await SensitiveImageComment.destroy({
      where: {
        imageId: {
          [Op.in]: imageIds
        }
      }
    });
    console.log(`[Screenshot Cleanup] Deleted ${commentsDeleted} image comments`);

    // Enqueue stored screenshot objects for async deletion
    let objectsEnqueued = 0;
    for (const image of oldImages) {
      const meta = (image as any).rawMeta || {};
      const storageKey = meta?.storage?.key || meta?.s3Key || meta?.storageKey || (image.imageUrl && !image.imageUrl.startsWith('http') ? image.imageUrl : undefined);
      if (storageKey) {
        try {
          await enqueueSensitiveImageDeletion(storageKey);
          objectsEnqueued++;
        } catch (error: any) {
          console.error(`[Screenshot Cleanup] Failed to enqueue deletion for storage object ${storageKey}:`, error?.message || error);
        }
      }
    }
    console.log(`[Screenshot Cleanup] Enqueued ${objectsEnqueued} stored screenshot objects for deletion`);

    // Finally, delete the sensitive images themselves
    const imagesDeleted = await SensitiveImage.destroy({
      where: {
        id: {
          [Op.in]: imageIds
        }
      },
      force: true // Hard delete (bypass paranoid mode if enabled)
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Screenshot Cleanup] Cleanup completed successfully in ${duration}s`);
    console.log(`[Screenshot Cleanup] Summary: Deleted ${imagesDeleted} images, ${findingsDeleted} findings, ${commentsDeleted} comments`);

  } catch (error: any) {
    console.error('[Screenshot Cleanup] Error during cleanup:', error);
    throw error;
  }
}

/**
 * Schedules the screenshot cleanup cron job
 * Runs daily at 3:00 AM server time
 */
export function scheduleScreenshotCleanupCron(): void {
  // Run daily at 3:00 AM
  nodeCron.schedule('0 3 * * *', async () => {
    try {
      console.log('[Screenshot Cleanup Cron] Starting scheduled cleanup...');
      await cleanupOldScreenshots();
      console.log('[Screenshot Cleanup Cron] Scheduled cleanup completed');
    } catch (error: any) {
      console.error('[Screenshot Cleanup Cron] Error in scheduled cleanup:', error);
    }
  });

  console.log('[Screenshot Cleanup] Cron job scheduled to run daily at 3:00 AM');
}

/**
 * Manual trigger function for testing or admin purposes
 */
export async function triggerScreenshotCleanup(): Promise<{ success: boolean; message: string; stats?: any }> {
  try {
    await cleanupOldScreenshots();
    return {
      success: true,
      message: 'Screenshot cleanup completed successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Screenshot cleanup failed: ${error.message}`
    };
  }
}
