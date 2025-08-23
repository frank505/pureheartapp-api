import nodeCron from 'node-cron';
import { Op } from 'sequelize';
import { Worker, JobsOptions } from 'bullmq';
import Fast from '../models/Fast';
import FastReminderLog from '../models/FastReminderLog';
import Notification from '../models/Notification';
import { sendPushToUser } from '../services/pushService';
import { JOB_TYPES, QUEUE_NAMES, queueConnection, queueManager, DEFAULT_JOB_OPTIONS } from '../config/queue';

type FastingReminderJobData = {
  fastId: number;
  userId: number;
  dateKey: string;
  timeKey: string;
  title: string;
  body: string;
  data: Record<string, any>;
};

export const initializeFastingWorker = (): void => {
  const worker = new Worker(
    QUEUE_NAMES.FASTING,
    async (job) => {
      if (job.name !== JOB_TYPES.FASTING.SEND_PRAYER_REMINDER) return true;
      const payload = job.data as FastingReminderJobData;

      // Idempotency check
      const exists = await FastReminderLog.findOne({
        where: { fastId: payload.fastId, userId: payload.userId, dateKey: payload.dateKey, timeKey: payload.timeKey },
      });
      if (exists) return true;

      await Notification.create({
        userId: payload.userId,
        type: 'generic',
        title: payload.title,
        body: payload.body,
        data: payload.data as any,
      });
      await sendPushToUser(payload.userId, { title: payload.title, body: payload.body, data: payload.data as any });
      await FastReminderLog.create({
        fastId: payload.fastId,
        userId: payload.userId,
        dateKey: payload.dateKey,
        timeKey: payload.timeKey,
        sentAt: new Date(),
      });
      return true;
    },
    { connection: queueConnection }
  );
  queueManager.addWorker(QUEUE_NAMES.FASTING, worker);
};

// Runs every minute: update fast statuses and send prayer-time reminders exactly once per time slot per day
export const scheduleFastingCron = () => {
  nodeCron.schedule('* * * * *', async () => {
    const now = new Date();

    // Update statuses concurrently
    await Promise.all([
      Fast.update({ status: 'active' } as any, { where: { status: 'upcoming', startTime: { [Op.lte]: now } } }),
      Fast.update({ status: 'completed', completedAt: now } as any, { where: { status: 'active', endTime: { [Op.lte]: now } } }),
    ]);

    // Fetch active fasts with reminders enabled
    const actives = await Fast.findAll({ where: { status: 'active', reminderEnabled: true } });
    if (!actives.length) return;

    // Determine current UTC keys once
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mi = String(now.getUTCMinutes()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const timeKey = `${hh}:${mi}`;

    // Build per-fast jobs and dispatch via queue in parallel
    const queue = queueManager.getFastingQueue();
    const jobOpts: JobsOptions = DEFAULT_JOB_OPTIONS.fasting as any;

    const jobsToAdd = actives
      .map((fast) => ({ fast, times: (fast.prayerTimes || []).filter((t: string) => /^\d{2}:\d{2}$/.test(t)) }))
      .filter(({ times }) => times.includes(timeKey))
      .map(({ fast }) => {
        const title = 'Prayer Time Reminder';
        const body = fast.prayerFocus ? `It's time to pray — ${fast.prayerFocus}` : "It's time to pray";
        const data = { purpose: 'fast_prayer', fastId: String(fast.id), timeKey } as Record<string, any>;
        const payload: FastingReminderJobData = {
          fastId: fast.id,
          userId: fast.userId,
          dateKey,
          timeKey,
          title,
          body,
          data,
        };
        return queue.add(JOB_TYPES.FASTING.SEND_PRAYER_REMINDER, payload, jobOpts);
      });

    await Promise.all(jobsToAdd);
  });
};

export const FastingQueue = {
  async enqueuePrayerReminder(payload: FastingReminderJobData) {
    const queue = queueManager.getFastingQueue();
    const opts: JobsOptions = DEFAULT_JOB_OPTIONS.fasting as any;
    await queue.add(JOB_TYPES.FASTING.SEND_PRAYER_REMINDER, payload, opts);
  },
};
