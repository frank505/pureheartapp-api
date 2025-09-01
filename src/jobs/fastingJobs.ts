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
      job.log(`Sending fasting reminder for fastId ${payload.fastId} to userId ${payload.userId}`);
     const credsJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
     job?.log('checking for credentials');
     
     if(credsJson){
       job?.log(credsJson);
       const buffer = Buffer.from(credsJson, 'base64');
       job?.log('converting credentials');
    const credentials = JSON.parse(buffer.toString('utf-8'));
    job?.log('firebase credentials: '+ JSON.stringify(credentials));
     }
      
      await Promise.all([
        Notification.create({
        userId: payload.userId,
        type: 'generic',
        title: payload.title,
        body: payload.body,
        data: payload.data as any,
      }),
      sendPushToUser(payload.userId, 
        { title: payload.title, body: payload.body, 
          data: payload.data as any }, job),
      FastReminderLog.create({
        fastId: payload.fastId,
        userId: payload.userId,
        dateKey: payload.dateKey,
        timeKey: payload.timeKey,
        sentAt: new Date(),
      })    
      ]);
      
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
      Fast.update({ status: 'completed', completedAt: now } as any, { where: { status: 'active', endTime: { [Op.lte]: now }, scheduleKind: 'fixed' } }),
    ]);

    // Fetch active fasts with reminders enabled
    const actives = await Fast.findAll({ where: { status: 'active', reminderEnabled: true } });
    if (!actives.length) return;
    
    // Build per-fast jobs based on schedule kinds and timezone-aware minute matching

    // Build per-fast jobs and dispatch via queue in parallel
    const queue = queueManager.getFastingQueue();
    const jobOpts: JobsOptions = DEFAULT_JOB_OPTIONS.fasting as any;
    const jobs: Promise<any>[] = [];
    for (const fast of actives) {
      // If the fixed fast has expired, finalize it and skip notifications (safety net in addition to the bulk update above)
      if (fast.scheduleKind === 'fixed' && now >= fast.endTime) {
        jobs.push(
          Fast.update(
            { status: 'completed', completedAt: now } as any,
            { where: { id: fast.id, status: 'active' } }
          )
        );
        continue;
      } 

      // Skip if outside fixed schedule window (but not expired)
      if (fast.scheduleKind === 'fixed') {
        if (now < fast.startTime) continue;
      }

      // Determine user timezone
      const tz = (fast as any).timezone || 'UTC';
      const fmtDate = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
      const fmtTime = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
      const fmtDow = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
      const [{ value: dateStr }] = (fmtDate as any).formatToParts(now).filter((p: any) => p.type === 'year' || p.type === 'month' || p.type === 'day');
  const timeStr = fmtTime.format(now); // HH:mm
  const [hhmm] = timeStr.split(' ');
  const timeKey: string = (hhmm || timeStr) as string; // ensure string
      // Build YYYY-MM-DD using formatter reliably
      const y = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(now);
      const m = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(now);
      const d = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(now);
      const dateKey = `${y}-${m}-${d}`;

      let match = false;
      if (fast.scheduleKind === 'recurring' && fast.frequency) {
        if (fast.frequency === 'daily') {
          // within window?
          if (fast.windowStart && fast.windowEnd) {
            const start = fast.windowStart || undefined;
            const end = fast.windowEnd || undefined;
            if (start && end && start <= end) {
              match = timeKey === start || timeKey === end || (Array.isArray(fast.prayerTimes) ? fast.prayerTimes.includes(timeKey) : false);
            } else {
              // crosses midnight: consider both days, but we only send at explicit prayerTimes list if provided
              match = (!!start && timeKey === start) || (!!end && timeKey === end) || (Array.isArray(fast.prayerTimes) ? fast.prayerTimes.includes(timeKey) : false);
            }
          } else {
            match = Array.isArray(fast.prayerTimes) ? fast.prayerTimes.includes(timeKey) : false;
          }
        } else if (fast.frequency === 'weekly') {
          const dowStr = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(now);
          const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
          const dow = dowMap[dowStr] ?? new Date().getUTCDay();
          const days = (fast.daysOfWeek || []) as number[];
          if (Array.isArray(days) && days.includes(dow)) {
            match = (Array.isArray(fast.prayerTimes) ? fast.prayerTimes.includes(timeKey) : false) || (fast.windowStart === timeKey) || (fast.windowEnd === timeKey);
          }
        }
      } else {
        // Legacy behavior: prayerTimes exact minute match
        match = Array.isArray(fast.prayerTimes) ? fast.prayerTimes.includes(timeKey) : false;
      }

      if (match) {
        const title = 'Prayer Time Reminder';
        const body = fast.prayerFocus ? `It's time to pray — ${fast.prayerFocus}` : "It's time to pray";
        const data = { purpose: 'fast_prayer', fastId: String(fast.id), timeKey } as Record<string, any>;
  const payload: FastingReminderJobData = { fastId: fast.id, userId: fast.userId, dateKey: dateKey as string, timeKey: timeKey as string, title, body, data };
        jobs.push(queue.add(JOB_TYPES.FASTING.SEND_PRAYER_REMINDER, payload, jobOpts));
      }
    }

    await Promise.all(jobs);
  });
};

export const FastingQueue = {
  async enqueuePrayerReminder(payload: FastingReminderJobData) {
    const queue = queueManager.getFastingQueue();
    const opts: JobsOptions = DEFAULT_JOB_OPTIONS.fasting as any;
    await queue.add(JOB_TYPES.FASTING.SEND_PRAYER_REMINDER, payload, opts);
  },
};
