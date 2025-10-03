import { Worker } from 'bullmq';
import { JOB_TYPES, QUEUE_NAMES, queueConnection, queueManager } from '../config/queue';
import { deleteScreenshotImage } from '../services/screenshotStorageService';

interface DeleteSensitiveImageJobData {
  storageKey: string;
}

export const initializeUserCleanupWorker = (): void => {
  const worker = new Worker(
    QUEUE_NAMES.USER_CLEANUP,
    async (job) => {
      switch (job.name) {
        case JOB_TYPES.USER_CLEANUP.DELETE_SENSITIVE_IMAGE: {
          const { storageKey } = job.data as DeleteSensitiveImageJobData;
          if (!storageKey) {
            job.log('No storageKey provided; skipping deletion');
            return true;
          }

          await deleteScreenshotImage(storageKey);
          job.log(`Deleted sensitive screenshot object: ${storageKey}`);
          return true;
        }
        default:
          job.log(`Unhandled job ${job.name}; skipping`);
          return true;
      }
    },
    { connection: queueConnection }
  );

  worker.on('failed', (job, err) => {
    console.error(
      '[UserCleanupWorker] Job failed',
      job?.id,
      job?.name,
      err
    );
  });

  queueManager.addWorker(QUEUE_NAMES.USER_CLEANUP, worker);
};

export const enqueueSensitiveImageDeletion = async (storageKey: string): Promise<void> => {
  if (!storageKey) {
    return;
  }

  const queue = queueManager.getUserCleanupQueue();
  await queue.add(JOB_TYPES.USER_CLEANUP.DELETE_SENSITIVE_IMAGE, { storageKey });
};
