import { Worker, Job } from 'bullmq';
import { queueConnection, QUEUE_NAMES, JOB_TYPES, queueManager } from '../config/queue';
import { generateTruthLiesFromOnboarding } from '../services/truthLiesService';
import { OnboardingState } from '../types/auth';

// Define job data interfaces
export interface GeneratePersonalizedJobData {
  userId: number;
  onboardingData?: Partial<OnboardingState>;
}

// Keep track of the active worker
let activeWorker: Worker | null = null;

// Initialize the truth lies worker
export function initializeTruthLiesWorker() {
  const worker = new Worker(QUEUE_NAMES.TRUTH_LIES, async (job: Job) => {
    try {
      switch (job.name) {
        case JOB_TYPES.TRUTH_LIES.GENERATE_PERSONALIZED:
          const { userId, onboardingData } = job.data as GeneratePersonalizedJobData;
          await generateTruthLiesFromOnboarding(userId, onboardingData);
          break;

        case JOB_TYPES.TRUTH_LIES.UPDATE_COMMON_LIES:
          const { userId: updateUserId } = job.data as GeneratePersonalizedJobData;
          // When updating common lies, fetch fresh onboarding data
          await generateTruthLiesFromOnboarding(updateUserId);
          break;

        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    } catch (error) {
      console.error(`Error processing truth/lies job ${job.name}:`, error);
      throw error;
    }
  }, {
    connection: queueConnection,
  });

  worker.on('completed', (job) => {
    console.log(`✅ Truth/Lies job ${job.id} completed: ${job.name}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Truth/Lies job ${job?.id} failed: ${job?.name}`, err);
  });

  worker.on('error', (err) => {
    console.error('❌ Truth/Lies worker error:', err);
  });

  queueManager.addWorker(QUEUE_NAMES.TRUTH_LIES, worker);
  activeWorker = worker;

  console.log('✅ Truth/Lies worker initialized');
  return worker;
}

/**
 * Close the truth/lies worker gracefully
 */
export async function closeTruthLiesWorker(): Promise<void> {
  if (activeWorker) {
    try {
      await activeWorker.close();
      activeWorker = null;
      console.log('✅ Truth/Lies worker closed');
    } catch (error) {
      console.error('❌ Error closing Truth/Lies worker:', error);
      throw error;
    }
  }
}

// Service class for adding jobs to the queue
export class TruthLiesQueueService {
  /**
   * Add job to generate personalized truth/lies for a user
   */
  static async addGenerateTruthLiesJob(userId: number, onboardingData?: Partial<OnboardingState>) {
    const queue = queueManager.getTruthLiesQueue();
    
    await queue.add(JOB_TYPES.TRUTH_LIES.GENERATE_PERSONALIZED, {
      userId,
      onboardingData,
    });
  }

  /**
   * Add job to update common lies for a user
   */
  static async addUpdateCommonLiesJob(userId: number) {
    const queue = queueManager.getTruthLiesQueue();
    
    await queue.add(JOB_TYPES.TRUTH_LIES.UPDATE_COMMON_LIES, {
      userId,
    });
  }
}
