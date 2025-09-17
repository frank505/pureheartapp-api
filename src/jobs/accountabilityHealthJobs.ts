import nodeCron from 'node-cron';
import admin from 'firebase-admin';
import { Op } from 'sequelize';
import DeviceToken from '../models/DeviceToken';
import User from '../models/User';
import AccountabilityPartner from '../models/AccountabilityPartner';
import Notification from '../models/Notification';
import { EmailQueueService } from './emailJobs';
import { JOB_TYPES, queueManager } from '../config/queue';
import { initFirebaseIfNeeded } from '../services/pushService';

// Silent push: data-only message (no alert) to validate token
const sendSilentPush = async (token: string) => {
  if (!admin.apps.length) initFirebaseIfNeeded();
  if (!admin.apps.length) return { success: false, error: 'firebase_not_initialized' };
  try {
    await admin.messaging().send({ token, data: { purpose: 'health_check', ts: Date.now().toString() }, android: { priority: 'high' }, apns: { payload: { aps: { 'content-available': 1 } } } });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.errorInfo?.code || e?.code || 'unknown_error' };
  }
};

// Notify partners about uninstall suspicion or reinstall
const notifyPartners = async (user: User, kind: 'suspected_uninstall' | 'reinstalled') => {
  // Find partners where user is sender (accepted) or receiver (used)
  const partnerLinks = await AccountabilityPartner.findAll({
    where: {
      [Op.or]: [
        { userId: user.id, receiverId: { [Op.not]: null } },
        { receiverId: user.id },
      ],
    },
  });
  if (!partnerLinks.length) return;
  const partnerUserIds = Array.from(new Set(partnerLinks.map(p => (p.userId === user.id ? p.receiverId : p.userId)).filter(Boolean))) as number[];
  if (!partnerUserIds.length) return;
  const title = kind === 'suspected_uninstall' ? `⚠️ ${user.username} may have uninstalled the app` : `✅ ${user.username} is back online`;
  const body = kind === 'suspected_uninstall'
    ? `Last seen: ${user.lastLoginAt ? user.lastLoginAt.toISOString() : 'unknown'}`
    : 'They have reinstalled and opened the app again.';
  const partners = await User.findAll({ where: { id: partnerUserIds } });
  await Promise.all(partnerUserIds.map(async (partnerId) => {
    await Notification.create({ userId: partnerId, type: 'generic', title, body, data: { purpose: 'accountability_status', subjectUserId: user.id, status: kind } as any });
  }));
  // Send emails (fire and forget queue additions)
  for (const partner of partners) {
    const email = (partner as any).email;
    if (!email) continue;
    if (kind === 'suspected_uninstall') {
      await queueManager.getEmailQueue().add(JOB_TYPES.EMAIL.ACCOUNTABILITY_UNINSTALL_SUSPECTED, { email, username: user.username, lastSeen: user.lastLoginAt ? user.lastLoginAt.toISOString() : null });
    } else {
      await queueManager.getEmailQueue().add(JOB_TYPES.EMAIL.ACCOUNTABILITY_REINSTALLED, { email, username: user.username });
    }
  }
};

export const scheduleAccountabilityHealthCron = () => {
  // Every 30 minutes
  nodeCron.schedule('*/30 * * * *', async () => {
    const now = new Date();
    // Fetch active tokens not health-checked in last 6 hours (avoid excessive traffic)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const tokens = await DeviceToken.findAll({ where: { isActive: true, [Op.or]: [ { lastHealthCheckAt: { [Op.lt]: sixHoursAgo } }, { lastHealthCheckAt: { [Op.is]: null } } ] } });
    for (const t of tokens) {
      const res = await sendSilentPush(t.token);
      (t as any).lastHealthCheckAt = now;
      if (!res.success) {
        (t as any).lastErrorCode = res.error;
        // Consider invalid codes that indicate uninstall
        const uninstallCodes = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'registration-token-not-registered', 'invalid-registration-token'];
        if (res.error && uninstallCodes.includes(res.error)) {
          (t as any).isActive = false;
        }
      } else {
        (t as any).lastErrorCode = null;
        (t as any).lastActiveAt = now;
      }
      await t.save();
    }

    // For users whose all tokens became inactive => suspect uninstall
    const affectedUserIds = Array.from(new Set(tokens.filter(t => !(t as any).isActive).map(t => t.userId)));
    if (affectedUserIds.length) {
      const users = await User.findAll({ where: { id: affectedUserIds } });
      for (const user of users) {
        const activeCount = await DeviceToken.count({ where: { userId: user.id, isActive: true } });
        if (activeCount === 0 && !(user as any).uninstallSuspectedAt) {
          (user as any).uninstallSuspectedAt = now;
          await user.save();
          await notifyPartners(user, 'suspected_uninstall');
        }
      }
    }
  });
};

// Called during login/device registration to detect reinstall (token changed for same deviceId)
export const detectReinstallForUser = async (userId: number, deviceId: string | undefined | null, newToken: string) => {
  if (!deviceId) return false;
  const prior = await DeviceToken.findOne({ where: { userId, deviceId }, order: [['updatedAt', 'DESC']] });
  if (prior && prior.token !== newToken) {
    // Mark reinstall: clear uninstallSuspectedAt
    const user = await User.findByPk(userId);
    if (user) {
      const wasSuspected = !!(user as any).uninstallSuspectedAt;
      (user as any).uninstallSuspectedAt = null;
      (user as any).lastReinstallAt = new Date();
      (user as any).lastReinstallDeviceId = deviceId;
      (user as any).lastReinstallPlatform = (prior as any).platform || null;
      await user.save();
      if (wasSuspected) await notifyPartners(user, 'reinstalled');
    }
    // Mark reinstall on prior token record for audit trail
    (prior as any).reinstallDetectedAt = new Date();
    await prior.save();
    return true;
  }
  return false;
};

export default scheduleAccountabilityHealthCron;