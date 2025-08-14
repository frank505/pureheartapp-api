import { Worker, Job } from 'bullmq';
import { queueConnection, QUEUE_NAMES, JOB_TYPES, queueManager } from '../config/queue';
import { EmailService } from '../utils/email';
import { IEmailTemplateData } from '../types/auth';

/**
 * Email job processors using BullMQ
 * This module handles all background email processing through Redis queues
 */

/**
 * Email job data interfaces
 */
export interface WelcomeEmailJobData {
  email: string;
  userData: IEmailTemplateData;
}

export interface PasswordResetEmailJobData {
  email: string;
  resetUrl: string;
  userData: IEmailTemplateData;
}

export interface EmailVerificationJobData {
  email: string;
  verificationUrl: string;
  userData: IEmailTemplateData;
}

export interface PasswordChangedNotificationJobData {
  email: string;
  userData: IEmailTemplateData;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface GroupInviteEmailJobData {
  email: string;
  groupName: string;
  inviteCode: string;
}

export interface AccountabilityInviteEmailJobData {
  email: string;
  inviterName: string;
  inviteCode: string;
}

/**
 * Union type for all email job data
 */
export type EmailJobData =
  | WelcomeEmailJobData
  | PasswordResetEmailJobData
  | EmailVerificationJobData
  | PasswordChangedNotificationJobData
  | GroupInviteEmailJobData
  | AccountabilityInviteEmailJobData;

/**
 * Email job processor class
 * Handles the actual email sending logic for queued jobs
 */
export class EmailJobProcessor {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Process welcome email job
   */
  async processWelcomeEmail(job: Job<WelcomeEmailJobData>): Promise<void> {
    const { email, userData } = job.data;

    job.log(`Processing welcome email for ${email}`);

    try {
      const success = await this.emailService.sendWelcomeEmail(email, userData);

      if (!success) {
        throw new Error('Failed to send welcome email');
      }

      job.log(`✅ Welcome email sent successfully to ${email}`);
    } catch (error) {
      job.log(`❌ Failed to send welcome email to ${email}: ${error}`);
      throw error;
    }
  }

  /**
   * Process password reset email job
   */
  async processPasswordResetEmail(job: Job<PasswordResetEmailJobData>): Promise<void> {
    const { email, resetUrl, userData } = job.data;

    job.log(`Processing password reset email for ${email}`);

    try {
      const success = await this.emailService.sendPasswordResetEmail(email, resetUrl, userData);

      if (!success) {
        throw new Error('Failed to send password reset email');
      }

      job.log(`✅ Password reset email sent successfully to ${email}`);
    } catch (error) {
      job.log(`❌ Failed to send password reset email to ${email}: ${error}`);
      throw error;
    }
  }

  /**
   * Process email verification job
   */
  async processEmailVerification(job: Job<EmailVerificationJobData>): Promise<void> {
    const { email, verificationUrl, userData } = job.data;

    job.log(`Processing email verification for ${email}`);

    try {
      const success = await this.emailService.sendEmailVerificationEmail(
        email,
        verificationUrl,
        userData
      );

      if (!success) {
        throw new Error('Failed to send email verification');
      }

      job.log(`✅ Email verification sent successfully to ${email}`);
    } catch (error) {
      job.log(`❌ Failed to send email verification to ${email}: ${error}`);
      throw error;
    }
  }

  /**
   * Process password changed notification job
   */
  async processPasswordChangedNotification(job: Job<PasswordChangedNotificationJobData>): Promise<void> {
    const { email, userData, timestamp, ipAddress, userAgent } = job.data;

    job.log(`Processing password changed notification for ${email}`);

    try {
      const success = await this.emailService.sendPasswordChangedNotification(
        email,
        userData,
        timestamp,
        ipAddress,
        userAgent
      );

      if (!success) {
        throw new Error('Failed to send password changed notification');
      }

      job.log(`✅ Password changed notification sent successfully to ${email}`);
    } catch (error) {
      job.log(`❌ Failed to send password changed notification to ${email}: ${error}`);
      throw error;
    }
  }

  /**
   * Process group invite email job
   */
  async processGroupInvite(job: Job<GroupInviteEmailJobData>): Promise<void> {
    const { email, groupName, inviteCode } = job.data;
    job.log(`Processing group invite email for ${email} to group ${groupName}`);
    try {
      const success = await this.emailService.sendGroupInviteEmail(email, groupName, inviteCode);
      if (!success) {
        throw new Error('Failed to send group invite email');
      }
      job.log(`✅ Group invite email sent successfully to ${email}`);
    } catch (error) {
      job.log(`❌ Failed to send group invite email to ${email}: ${error}`);
      throw error;
    }
  }

  /**
   * Process accountability invite email job
   */
  async processAccountabilityInviteEmail(job: Job<AccountabilityInviteEmailJobData>): Promise<void> {
    const { email, inviterName, inviteCode } = job.data;
    job.log(`Processing accountability invite email for ${email} from ${inviterName}`);
    try {
      const success = await this.emailService.sendAccountabilityInviteEmail(email, inviterName, inviteCode);
      if (!success) {
        throw new Error('Failed to send accountability invite email');
      }
      job.log(`✅ Accountability invite email sent successfully to ${email}`);
    } catch (error) {
      job.log(`❌ Failed to send accountability invite email to ${email}: ${error}`);
      throw error;
    }
  }
}

/**
 * Email worker class that processes jobs from the email queue
 */
export class EmailWorker {
  private worker: Worker;
  private processor: EmailJobProcessor;

  constructor() {
    this.processor = new EmailJobProcessor();

    // Create the worker
    this.worker = new Worker(
      QUEUE_NAMES.EMAIL,
      async (job: Job) => await this.processJob(job),
      {
        connection: queueConnection,
        concurrency: 5, // Process up to 5 email jobs concurrently
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      }
    );

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Process individual jobs based on their type
   */
  private async processJob(job: Job): Promise<void> {
    const startTime = Date.now();

    try {
      switch (job.name) {
        case JOB_TYPES.EMAIL.WELCOME:
          await this.processor.processWelcomeEmail(job as Job<WelcomeEmailJobData>);
          break;

        case JOB_TYPES.EMAIL.PASSWORD_RESET:
          await this.processor.processPasswordResetEmail(job as Job<PasswordResetEmailJobData>);
          break;

        case JOB_TYPES.EMAIL.EMAIL_VERIFICATION:
          await this.processor.processEmailVerification(job as Job<EmailVerificationJobData>);
          break;

        case JOB_TYPES.EMAIL.PASSWORD_CHANGED:
          await this.processor.processPasswordChangedNotification(job as Job<PasswordChangedNotificationJobData>);
          break;
        case JOB_TYPES.EMAIL.GROUP_INVITE:
          await this.processor.processGroupInvite(job as Job<GroupInviteEmailJobData>);
          break;

        case JOB_TYPES.EMAIL.ACCOUNTABILITY_INVITE:
          await this.processor.processAccountabilityInviteEmail(job as Job<AccountabilityInviteEmailJobData>);
          break;

        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Email job ${job.id} (${job.name}) completed in ${duration}ms`);

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Email job ${job.id} (${job.name}) failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Set up event listeners for the worker
   */
  private setupEventListeners(): void {
    this.worker.on('completed', (job) => {
      console.log(`📧 Email job ${job.id} completed: ${job.name}`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`📧 Email job ${job?.id} failed: ${job?.name}`, err);
    });

    this.worker.on('error', (err) => {
      console.error('📧 Email worker error:', err);
    });

    this.worker.on('stalled', (jobId) => {
      console.warn(`📧 Email job ${jobId} stalled`);
    });

    this.worker.on('progress', (job, progress) => {
      console.log(`📧 Email job ${job.id} progress: ${progress}%`);
    });
  }

  /**
   * Close the worker gracefully
   */
  async close(): Promise<void> {
    await this.worker.close();
    console.log('✅ Email worker closed');
  }

  /**
   * Get the worker instance
   */
  getWorker(): Worker {
    return this.worker;
  }
}

/**
 * Queue helper functions for adding jobs to the email queue
 */
export class EmailQueueService {
  /**
   * Add welcome email job to queue
   */
  static async addWelcomeEmailJob(
    email: string,
    userData: IEmailTemplateData,
    priority: number = 1
  ): Promise<Job<WelcomeEmailJobData>> {
    const emailQueue = queueManager.getEmailQueue();

    return emailQueue.add(
      JOB_TYPES.EMAIL.WELCOME,
      { email, userData },
      {
        priority,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      }
    );
  }

  /**
   * Add password reset email job to queue
   */
  static async addPasswordResetEmailJob(
    email: string,
    resetUrl: string,
    userData: IEmailTemplateData,
    priority: number = 5 // High priority for security-related emails
  ): Promise<Job<PasswordResetEmailJobData>> {
    const emailQueue = queueManager.getEmailQueue();

    return emailQueue.add(
      JOB_TYPES.EMAIL.PASSWORD_RESET,
      { email, resetUrl, userData },
      {
        priority,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      }
    );
  }

  /**
   * Add email verification job to queue
   */
  static async addEmailVerificationJob(
    email: string,
    verificationUrl: string,
    userData: IEmailTemplateData,
    priority: number = 3 // Medium-high priority
  ): Promise<Job<EmailVerificationJobData>> {
    const emailQueue = queueManager.getEmailQueue();

    return emailQueue.add(
      JOB_TYPES.EMAIL.EMAIL_VERIFICATION,
      { email, verificationUrl, userData },
      {
        priority,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      }
    );
  }

  /**
   * Add password changed notification job to queue
   */
  static async addPasswordChangedNotificationJob(
    email: string,
    userData: IEmailTemplateData,
    timestamp: string,
    ipAddress?: string,
    userAgent?: string,
    priority: number = 4 // High priority for security notifications
  ): Promise<Job<PasswordChangedNotificationJobData>> {
    const emailQueue = queueManager.getEmailQueue();

    return emailQueue.add(
      JOB_TYPES.EMAIL.PASSWORD_CHANGED,
      { email, userData, timestamp, ipAddress, userAgent },
      {
        priority,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      }
    );
  }

  /**
   * Add group invite email job to queue
   */
  static async addGroupInviteEmailJob(
    email: string,
    groupName: string,
    inviteCode: string,
    priority: number = 3
  ) {
    const emailQueue = queueManager.getEmailQueue();
    return emailQueue.add(
      JOB_TYPES.EMAIL.GROUP_INVITE,
      { email, groupName, inviteCode },
      {
        priority,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      }
    );
  }

  /**
   * Add accountability invite email job to queue
   */
  static async addAccountabilityInviteEmailJob(
    email: string,
    inviterName: string,
    inviteCode: string,
    priority: number = 2
  ) {
    const emailQueue = queueManager.getEmailQueue();
    return emailQueue.add(
      JOB_TYPES.EMAIL.ACCOUNTABILITY_INVITE,
      { email, inviterName, inviteCode },
      {
        priority,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      }
    );
  }

  /**
   * Get email queue statistics
   */
  static async getEmailQueueStats(): Promise<any> {
    const emailQueue = queueManager.getEmailQueue();

    const waiting = await emailQueue.getWaiting();
    const active = await emailQueue.getActive();
    const completed = await emailQueue.getCompleted();
    const failed = await emailQueue.getFailed();
    const delayed = await emailQueue.getDelayed();

    return {
      counts: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      },
      jobs: {
        recent_completed: completed.slice(-10),
        recent_failed: failed.slice(-10),
      }
    };
  }

  /**
   * Retry failed email jobs
   */
  static async retryFailedJobs(): Promise<void> {
    const emailQueue = queueManager.getEmailQueue();
    const failedJobs = await emailQueue.getFailed();

    for (const job of failedJobs) {
      await job.retry();
    }

    console.log(`🔄 Retried ${failedJobs.length} failed email jobs`);
  }

  /**
   * Clear all jobs from email queue
   */
  static async clearAllJobs(): Promise<void> {
    const emailQueue = queueManager.getEmailQueue();

    await emailQueue.drain();
    await emailQueue.clean(0, 1000);

    console.log('🧹 Cleared all jobs from email queue');
  }
}

// Initialize and export email worker
let emailWorker: EmailWorker | null = null;

/**
 * Initialize email worker
 */
export const initializeEmailWorker = (): EmailWorker => {
  if (!emailWorker) {
    emailWorker = new EmailWorker();
    queueManager.addWorker(QUEUE_NAMES.EMAIL, emailWorker.getWorker());
    console.log('🚀 Email worker initialized');
  }
  return emailWorker;
};

/**
 * Get email worker instance
 */
export const getEmailWorker = (): EmailWorker | null => {
  return emailWorker;
};

/**
 * Close email worker
 */
export const closeEmailWorker = async (): Promise<void> => {
  if (emailWorker) {
    await emailWorker.close();
    emailWorker = null;
    console.log('✅ Email worker closed');
  }
};