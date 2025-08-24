import { Worker, JobsOptions } from 'bullmq';
import { JOB_TYPES, QUEUE_NAMES, queueConnection, queueManager, DEFAULT_JOB_OPTIONS } from '../config/queue';
import Notification from '../models/Notification';
import { GroupMember } from '../models';
import { sendPushToUser } from '../services/pushService';

export interface PushPayload {
  type:
    | 'group_message'
    | 'group_invite'
    | 'group_join_approved'
    | 'accountability_invite_accepted'
    | 'checkin_created'
    | 'prayer_request_created'
    | 'victory_created'
    | 'checkin_commented'
    | 'prayer_request_commented'
    | 'victory_commented'
    | 'generic';
  groupId?: string;
  messageId?: string;
  actorId?: number | 'ai';
  targetUserId?: number; // for single-recipient notifications
  title?: string;
  body?: string;
  data?: Record<string, any>;
  previewText?: string; // used by group_message
}

export const initializeNotificationWorker = (): void => {
  const worker = new Worker(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job) => {
      if (job.name === JOB_TYPES.NOTIFICATIONS.PUSH_NOTIFICATION) {
        const payload = job.data as PushPayload;
        if (payload.type === 'group_message' && payload.groupId) {
          const groupIdNum = Number(payload.groupId);
          const actorIdNum = typeof payload.actorId === 'number' ? payload.actorId : undefined;
          const members = await GroupMember.findAll({ where: { groupId: groupIdNum } });
          for (const member of members) {
            if (actorIdNum && member.userId === actorIdNum) continue;
            await Notification.create({
              userId: member.userId,
              type: 'group_message',
              title: 'New message in your group',
              body: payload.previewText || null,
              data: { groupId: groupIdNum, messageId: payload.messageId, purpose: 'group' },
            });
          }
        } else if (
          (payload.type === 'group_invite' ||
            payload.type === 'group_join_approved' ||
            payload.type === 'accountability_invite_accepted' ||
            payload.type === 'checkin_created' ||
            payload.type === 'prayer_request_created' ||
            payload.type === 'victory_created' ||
            payload.type === 'checkin_commented' ||
            payload.type === 'prayer_request_commented' ||
            payload.type === 'victory_commented') &&
          payload.targetUserId
        ) {
          await Notification.create({
            userId: payload.targetUserId,
            type: payload.type as any,
            title:
              payload.title ||
              (payload.type === 'group_invite'
                ? 'You have a new group invite'
                : payload.type === 'group_join_approved'
                ? 'Your group join request was approved'
                : 'New Notification'),
            body: payload.body || null,
            data: payload.data || null,
          });
          await sendPushToUser(payload.targetUserId, { title: payload.title || 'Notification', body: payload.body || undefined, data: (payload.data || {}) as any });
        } else if (payload.type === 'generic' && payload.targetUserId) {
          await Notification.create({
            userId: payload.targetUserId,
            type: 'generic',
            title: payload.title || 'Notification',
            body: payload.body || null,
            data: payload.data || null,
          });
          await sendPushToUser(payload.targetUserId, { title: payload.title || 'Notification', body: payload.body || undefined, data: (payload.data || {}) as any });
        }
        return true;
      }
      return true;
    },
    { connection: queueConnection }
  );
  queueManager.addWorker(QUEUE_NAMES.NOTIFICATIONS, worker);
};

export const PushQueue = {
  async sendGroupMessageNotification(payload: PushPayload) {
    const queue = queueManager.getNotificationsQueue();
    const opts: JobsOptions = DEFAULT_JOB_OPTIONS.notification as any;
    await queue.add(JOB_TYPES.NOTIFICATIONS.PUSH_NOTIFICATION, payload, opts);
  },
  async sendNotification(payload: PushPayload) {
    const queue = queueManager.getNotificationsQueue();
    const opts: JobsOptions = DEFAULT_JOB_OPTIONS.notification as any;
    await queue.add(JOB_TYPES.NOTIFICATIONS.PUSH_NOTIFICATION, payload, opts);
  },
};


