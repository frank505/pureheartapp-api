import { Queue, Worker, ConnectionOptions } from 'bullmq';
import { redisConfig, serverConfig } from './environment';

/**
 * Queue configuration and setup using BullMQ
 * This module provides Redis-based queue management for background jobs
 */

/**
 * Redis connection configuration for BullMQ
 */
export const queueConnection: ConnectionOptions = {
  host: redisConfig.host,
  port: redisConfig.port,
  ...(redisConfig.password && { password: redisConfig.password }),
  // Use a different database for queues to separate from cache data
  db: 1,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  family: 4, // IPv4
};

/**
 * Queue names constants
 * This helps maintain consistency across the application
 */
export const QUEUE_NAMES = {
  EMAIL: 'email-queue',
  NOTIFICATIONS: 'notifications-queue',
  TRUTH_LIES: 'truth-lies-queue',
  USER_CLEANUP: 'user-cleanup-queue',
  ANALYTICS: 'analytics-queue',
} as const;

/**
 * Job types for different queues
 */
export const JOB_TYPES = {
  TRUTH_LIES: {
    GENERATE_PERSONALIZED: 'generate-personalized-truth-lies',
    UPDATE_COMMON_LIES: 'update-common-lies',
  },
  EMAIL: {
    WELCOME: 'send-welcome-email',
    PASSWORD_RESET: 'send-password-reset-email',
    EMAIL_VERIFICATION: 'send-email-verification',
    PASSWORD_CHANGED: 'send-password-changed-notification',
    GROUP_INVITE: 'send-group-invite-email',
    ACCOUNTABILITY_INVITE: 'send-accountability-invite-email',
  },
  NOTIFICATIONS: {
    PUSH_NOTIFICATION: 'send-push-notification',
    SMS: 'send-sms',
  },
  USER_CLEANUP: {
    DELETE_UNVERIFIED: 'delete-unverified-users',
    CLEANUP_SESSIONS: 'cleanup-expired-sessions',
  },
  ANALYTICS: {
    TRACK_EVENT: 'track-user-event',
    GENERATE_REPORT: 'generate-analytics-report',
  },
} as const;

/**
 * Default job options for different types of jobs
 */
export const DEFAULT_JOB_OPTIONS = {
  // Email jobs - high priority, immediate processing
  email: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    removeOnComplete: { count: 100 }, // Keep last 100 completed jobs
    removeOnFail: { count: 50 },      // Keep last 50 failed jobs
  },
  
  // Notification jobs - medium priority
  notification: {
    attempts: 2,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 25 },
  },
  
  // Cleanup jobs - low priority, can be delayed
  cleanup: {
    attempts: 1,
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 10 },
    delay: 5000, // 5 second delay
  },
  
  // Analytics jobs - low priority, batch processing
  analytics: {
    attempts: 2,
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 50 },
    delay: 1000,
  },
  
  // Truth/Lies jobs - high priority, immediate processing
  truthLies: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
};

/**
 * Create and configure queues
 */
class QueueManager {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  /**
   * Initialize all queues
   */
  public initializeQueues(): void {
    // Create email queue
    const emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
      connection: queueConnection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS.email,
    });

    // Create notifications queue
    const notificationsQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
      connection: queueConnection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS.notification,
    });

    // Create user cleanup queue
    const userCleanupQueue = new Queue(QUEUE_NAMES.USER_CLEANUP, {
      connection: queueConnection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS.cleanup,
    });

    // Create analytics queue
    const analyticsQueue = new Queue(QUEUE_NAMES.ANALYTICS, {
      connection: queueConnection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS.analytics,
    });

    // Create truth/lies queue
    const truthLiesQueue = new Queue(QUEUE_NAMES.TRUTH_LIES, {
      connection: queueConnection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS.truthLies,
    });

    // Store queues in map
    this.queues.set(QUEUE_NAMES.EMAIL, emailQueue);
    this.queues.set(QUEUE_NAMES.NOTIFICATIONS, notificationsQueue);
    this.queues.set(QUEUE_NAMES.USER_CLEANUP, userCleanupQueue);
    this.queues.set(QUEUE_NAMES.ANALYTICS, analyticsQueue);
    this.queues.set(QUEUE_NAMES.TRUTH_LIES, truthLiesQueue);

    console.log('✅ All queues initialized successfully');
  }

  /**
   * Get a specific queue by name
   */
  public getQueue(queueName: string): Queue | undefined {
    return this.queues.get(queueName);
  }

  /**
   * Get the email queue
   */
  public getEmailQueue(): Queue {
    const queue = this.queues.get(QUEUE_NAMES.EMAIL);
    if (!queue) {
      throw new Error('Email queue not initialized');
    }
    return queue;
  }

  /**
   * Get the notifications queue
   */
  public getNotificationsQueue(): Queue {
    const queue = this.queues.get(QUEUE_NAMES.NOTIFICATIONS);
    if (!queue) {
      throw new Error('Notifications queue not initialized');
    }
    return queue;
  }

  /**
   * Get the user cleanup queue
   */
  public getUserCleanupQueue(): Queue {
    const queue = this.queues.get(QUEUE_NAMES.USER_CLEANUP);
    if (!queue) {
      throw new Error('User cleanup queue not initialized');
    }
    return queue;
  }

  /**
   * Get the analytics queue
   */
  public getAnalyticsQueue(): Queue {
    const queue = this.queues.get(QUEUE_NAMES.ANALYTICS);
    if (!queue) {
      throw new Error('Analytics queue not initialized');
    }
    return queue;
  }

  /**
   * Get the truth/lies queue
   */
  public getTruthLiesQueue(): Queue {
    const queue = this.queues.get(QUEUE_NAMES.TRUTH_LIES);
    if (!queue) {
      throw new Error('Truth/Lies queue not initialized');
    }
    return queue;
  }

  /**
   * Add a worker for a specific queue
   */
  public addWorker(queueName: string, worker: Worker): void {
    this.workers.set(queueName, worker);
  }

  /**
   * Get all queues (useful for Bull Dashboard)
   */
  public getAllQueues(): Queue[] {
    return Array.from(this.queues.values());
  }

  /**
   * Close all queues and workers gracefully
   */
  public async closeAll(): Promise<void> {
    console.log('Closing all queues and workers...');
    
    // Close all workers first
    const workerClosePromises = Array.from(this.workers.values()).map(worker => 
      worker.close()
    );
    await Promise.all(workerClosePromises);
    
    // Close all queues
    const queueClosePromises = Array.from(this.queues.values()).map(queue => 
      queue.close()
    );
    await Promise.all(queueClosePromises);
    
    console.log('✅ All queues and workers closed');
  }

  /**
   * Get queue statistics
   */
  public async getQueueStats(queueName: string): Promise<any> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();
    const delayed = await queue.getDelayed();

    return {
      name: queueName,
      counts: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      },
      jobs: {
        waiting: waiting.slice(0, 10), // Last 10 waiting jobs
        active: active.slice(0, 10),   // Last 10 active jobs
        failed: failed.slice(0, 10),   // Last 10 failed jobs
      }
    };
  }

  /**
   * Clean up old jobs from all queues
   */
  public async cleanupOldJobs(): Promise<void> {
    console.log('Starting queue cleanup...');
    
    for (const [queueName, queue] of this.queues) {
      try {
        // Clean completed jobs older than 24 hours
        await queue.clean(24 * 60 * 60 * 1000, 100, 'completed');
        
        // Clean failed jobs older than 7 days
        await queue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed');
        
        console.log(`✅ Cleaned up old jobs in ${queueName}`);
      } catch (error) {
        console.error(`❌ Error cleaning up ${queueName}:`, error);
      }
    }
  }

  /**
   * Pause all queues
   */
  public async pauseAll(): Promise<void> {
    const pausePromises = Array.from(this.queues.values()).map(queue => 
      queue.pause()
    );
    await Promise.all(pausePromises);
    console.log('✅ All queues paused');
  }

  /**
   * Resume all queues
   */
  public async resumeAll(): Promise<void> {
    const resumePromises = Array.from(this.queues.values()).map(queue => 
      queue.resume()
    );
    await Promise.all(resumePromises);
    console.log('✅ All queues resumed');
  }
}

// Create and export singleton instance
export const queueManager = new QueueManager();

/**
 * Health check for queue system
 */
export const checkQueueHealth = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  queues: Record<string, boolean>;
  error?: string;
}> => {
  try {
    const queueHealth: Record<string, boolean> = {};
    let allHealthy = true;

    for (const [queueName, queue] of queueManager['queues']) {
      try {
        // Try to get queue info to test connection
        await queue.getJobCounts();
        queueHealth[queueName] = true;
      } catch (error) {
        queueHealth[queueName] = false;
        allHealthy = false;
        console.error(`Queue ${queueName} health check failed:`, error);
      }
    }

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      queues: queueHealth,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      queues: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Initialize queue system
 */
export const initializeQueueSystem = (): void => {
  try {
    queueManager.initializeQueues();
    
    // Set up cleanup interval (run every hour)
    if (serverConfig.NODE_ENV === 'production') {
      setInterval(() => {
        queueManager.cleanupOldJobs().catch(error => {
          console.error('Queue cleanup error:', error);
        });
      }, 60 * 60 * 1000); // 1 hour
    }
    
    console.log('🚀 Queue system initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize queue system:', error);
    throw error;
  }
};