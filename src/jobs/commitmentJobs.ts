import cron from 'node-cron';
import commitmentService from '../services/commitmentService';

/**
 * Commitment System Cron Jobs
 * Automated tasks for the action commitments system
 */

/**
 * Check for overdue action commitments
 * Runs every hour
 */
export const scheduleOverdueCommitmentsCheck = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('🔍 Checking for overdue action commitments...');
      await commitmentService.checkOverdueCommitments();
      console.log('✅ Overdue commitments check completed');
    } catch (error) {
      console.error('❌ Error checking overdue commitments:', error);
    }
  });
  console.log('✅ Scheduled: Overdue commitments check (hourly)');
};

/**
 * Auto-approve proofs that haven't been verified by partner within 24 hours
 * Runs daily at 2 AM
 */
export const scheduleAutoApproveProofs = () => {
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('🔍 Auto-approving unverified proofs...');
      await commitmentService.autoApproveProofs();
      console.log('✅ Auto-approval completed');
    } catch (error) {
      console.error('❌ Error auto-approving proofs:', error);
    }
  });
  console.log('✅ Scheduled: Auto-approve proofs (daily at 2 AM)');
};

/**
 * Initialize all commitment system cron jobs
 */
export const initializeCommitmentCronJobs = () => {
  console.log('⏰ Initializing commitment system cron jobs...');
  scheduleOverdueCommitmentsCheck();
  scheduleAutoApproveProofs();
  console.log('✅ Commitment cron jobs initialized');
};
