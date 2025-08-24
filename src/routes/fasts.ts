import { FastifyInstance } from 'fastify';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import { IAPIResponse } from '../types/auth';
import Fast from '../models/Fast';
import FastPrayerLog from '../models/FastPrayerLog';
import FastProgressLog from '../models/FastProgressLog';
import { Op } from 'sequelize';
import FastJournal from '../models/FastJournal';
import AccountabilityPartner from '../models/AccountabilityPartner';
import AccountabilityComment from '../models/AccountabilityComment';
import { PushQueue } from '../jobs/notificationJobs';
import User from '../models/User';
import { EmailQueueService } from '../jobs/emailJobs';

const fixedScheduleSchema = Joi.object({
  kind: Joi.string().valid('fixed').required(),
  startAt: Joi.string().isoDate().required(),
  endAt: Joi.string().isoDate().required(),
  timezone: Joi.string().optional(),
});

const recurringScheduleSchema = Joi.object({
  kind: Joi.string().valid('recurring').required(),
  frequency: Joi.string().valid('daily', 'weekly').required(),
  daysOfWeek: Joi.alternatives().conditional('frequency', {
    is: 'weekly',
    then: Joi.array().items(Joi.number().integer().min(0).max(6)).min(1).required(),
    otherwise: Joi.forbidden(),
  }),
  window: Joi.object({ start: Joi.string().pattern(/^\d{2}:\d{2}$/).required(), end: Joi.string().pattern(/^\d{2}:\d{2}$/).required() }).required(),
  timezone: Joi.string().required(),
});

const createFastSchema = Joi.object({
  type: Joi.string().valid('daily', 'nightly', 'weekly', 'custom', 'breakthrough').required(),
  schedule: Joi.alternatives().try(fixedScheduleSchema, recurringScheduleSchema).required(),
  goal: Joi.string().optional(),
  smartGoal: Joi.string().optional(),
  prayerTimes: Joi.array().items(Joi.string().pattern(/^\d{2}:\d{2}$/)).default([]),
  verse: Joi.string().optional(),
  prayerFocus: Joi.string().optional(),
  reminderEnabled: Joi.boolean().default(true),
  widgetEnabled: Joi.boolean().default(true),
  addAccountabilityPartners: Joi.boolean().default(false),
});

const updateFastSchema = Joi.object({
  goal: Joi.string().optional(),
  prayerTimes: Joi.array().items(Joi.string().pattern(/^\d{2}:\d{2}$/)).optional(),
});

const prayerLogSchema = Joi.object({
  prayerTime: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
  loggedAt: Joi.date().iso().default(() => new Date().toISOString()),
  duration: Joi.string().optional(), // ISO8601 duration like PT10M
  type: Joi.string().optional(),
  notes: Joi.string().optional(),
  verseUsed: Joi.string().optional(),
});

const progressSchema = Joi.object({
  hungerLevel: Joi.number().min(0).max(5).optional(),
  spiritualClarity: Joi.number().min(0).max(5).optional(),
  temptationStrength: Joi.number().min(0).max(5).optional(),
  notes: Joi.string().optional(),
  breakthrough: Joi.boolean().optional(),
});

function isoDurationToSeconds(d?: string | null): number | null {
  if (!d) return null;
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(d);
  if (!m) return null;
  const [_, D, H, M, S] = m;
  const days = D ? parseInt(D, 10) : 0;
  const hours = H ? parseInt(H, 10) : 0;
  const mins = M ? parseInt(M, 10) : 0;
  const secs = S ? parseInt(S, 10) : 0;
  return days * 86400 + hours * 3600 + mins * 60 + secs;
}

export default async function fastRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // POST /fasts - Create a new fast
  fastify.post('/fasts', async (request, reply) => {
    const { error, value } = createFastSchema.validate(request.body, { abortEarly: false });
    if (error) {
      const response: IAPIResponse = { success: false, message: 'Validation failed', statusCode: 400, error: error.message };
      return reply.status(400).send(response);
    }
  const userId = (request as any).userId as number;
  const userRow = await User.findByPk(userId);

    // Normalize schedule into Fast fields
    let start: Date;
    let end: Date;
    let scheduleKind: 'fixed' | 'recurring' | null = null;
    let frequency: 'daily' | 'weekly' | null = null;
    let daysOfWeek: number[] | null = null;
    let windowStart: string | null = null;
    let windowEnd: string | null = null;
    let timezone: string | null = null;

    if (value.schedule.kind === 'fixed') {
      scheduleKind = 'fixed';
      start = new Date(value.schedule.startAt);
      end = new Date(value.schedule.endAt);
      timezone = value.schedule.timezone || userRow?.timezone || null; // informative only; dates carry offset
    } else {
      scheduleKind = 'recurring';
      frequency = value.schedule.frequency;
      timezone = value.schedule.timezone || userRow?.timezone || 'UTC';
      daysOfWeek = value.schedule.frequency === 'weekly' ? (value.schedule.daysOfWeek as number[]) : null;
      windowStart = value.schedule.window.start;
      windowEnd = value.schedule.window.end;
      // For recurring, set a long-running window; use now and +1 year
      const now = new Date();
      start = now;
      const oneYearLater = new Date(now.getTime());
      oneYearLater.setUTCFullYear(now.getUTCFullYear() + 1);
      end = oneYearLater;
    }

    // Validate
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return reply.status(400).send({ success: false, message: 'Invalid schedule time range', statusCode: 400 });
    }

    // Prevent multiple concurrent/scheduled fasts
    const existingOngoing = await Fast.findOne({ where: { userId, status: { [Op.in]: ['active', 'upcoming'] } } });
    if (existingOngoing) {
      return reply.status(409).send({ success: false, message: 'You already have an active or scheduled fast. Complete or break it before starting a new one.', statusCode: 409 });
    }
    const now = new Date();
    const status: 'upcoming' | 'active' = now < start ? 'upcoming' : 'active';

    const created = await Fast.create({
      userId,
      type: value.type,
      goal: value.goal ?? null,
      smartGoal: value.smartGoal ?? null,
      prayerTimes: value.prayerTimes ?? [],
      verse: value.verse ?? null,
      prayerFocus: value.prayerFocus ?? null,
  startTime: start,
  endTime: end,
  scheduleKind,
  frequency,
  daysOfWeek,
  windowStart,
  windowEnd,
  timezone,
      status,
      reminderEnabled: value.reminderEnabled ?? true,
      widgetEnabled: value.widgetEnabled ?? true,
      addAccountabilityPartners: value.addAccountabilityPartners ?? false,
    });

    // If user wants partner accountability, notify established partners (those with receiverId present)
    if (created.addAccountabilityPartners) {
      try {
        const [faster, partnerships] = await Promise.all([
          User.findByPk(userId),
          AccountabilityPartner.findAll({ where: { userId, receiverId: { [Op.ne]: null } } }),
        ]);
        const partnerIds = partnerships
          .map((p) => p.receiverId)
          .filter((id): id is number => id != null);
        if (partnerIds.length) {
          // Fetch partner users to get names and emails
          const partners = await User.findAll({ where: { id: { [Op.in]: partnerIds } } });
          const fasterName = faster ? faster.getFullName() : 'Your partner';
          await Promise.all([
            // Push notifications to partners via queue helper
            ...partners.map((pu) =>
              PushQueue.sendNotification({
                type: 'generic',
                actorId: userId,
                targetUserId: pu.id,
                title: 'Your partner started a fast',
                body: `${fasterName} just started a fast. Encourage and pray for them.`,
                data: { purpose: 'fast_started', fastId: String(created.id) },
              })
            ),
            // Emails to partners via email queue
            ...partners
              .filter((pu) => !!pu.email)
              .map((pu) => EmailQueueService.addFastStartedEmailJob(pu.email, pu.firstName || 'Partner', fasterName)),
          ]);
        }
      } catch (notifyErr) {
        request.log.error('Error notifying accountability partners on fast create:', notifyErr);
      }
    }

    const response: IAPIResponse = { success: true, message: 'Fast created', statusCode: 201, data: created };
    return reply.status(201).send(response);
  });

  // GET /fasts - List with pagination and filters
  fastify.get('/fasts', async (request, reply) => {
    const q = request.query as any;
    const page = Math.max(1, parseInt(q.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(q.limit || '10', 10)));
    const offset = (page - 1) * limit;
    const userId = (request as any).userId as number;

    const where: any = { userId };
    if (q.status) where.status = q.status;
    if (q.type) where.type = q.type;
    if (q.startDate || q.endDate) {
      where.startTime = {} as any;
      if (q.startDate) where.startTime[Op.gte] = new Date(q.startDate);
      if (q.endDate) where.startTime[Op.lte] = new Date(q.endDate);
    }

    const { rows, count } = await Fast.findAndCountAll({ where, order: [['startTime', 'DESC']], limit, offset });
    const response: IAPIResponse = { success: true, message: 'Fasts fetched', statusCode: 200, data: { items: rows, total: count, page, limit } };
    return reply.status(200).send(response);
  });

  // GET /fasts/:fastId
  fastify.get('/fasts/:fastId', async (request, reply) => {
    const userId = (request as any).userId as number;
    const fastId = Number((request.params as any).fastId);
  const fast = await Fast.findOne({ where: { id: fastId, userId } });
    if (!fast) return reply.status(404).send({ success: false, message: 'Fast not found', statusCode: 404 });

    const now = new Date();
    const totalHours = Math.max(0, (fast.endTime.getTime() - fast.startTime.getTime()) / 3600000);
    const elapsed = Math.max(0, Math.min(now.getTime(), fast.endTime.getTime()) - fast.startTime.getTime()) / 3600000;
    const percentage = totalHours > 0 ? Math.min(100, (elapsed / totalHours) * 100) : 0;
    const currentDurationISO = `PT${Math.floor(elapsed)}H${Math.floor((elapsed % 1) * 60)}M`;

    const prayers = await FastPrayerLog.findAll({ where: { fastId } });
    const completedPrayers = Array.from(new Set(prayers.map(p => p.prayerTime).filter(Boolean))) as string[];

  // Recent journals (owner only)
  const recentJournals = await FastJournal.findAll({ where: { fastId: fast.id, userId }, order: [['createdAt', 'DESC']], limit: 3 });

  const response: IAPIResponse = {
      success: true,
      message: 'Fast details',
      statusCode: 200,
      data: {
        id: fast.id,
        type: fast.type,
        status: fast.status,
        goal: fast.goal,
        smartGoal: fast.smartGoal,
        startTime: fast.startTime,
        endTime: fast.endTime,
        currentDuration: currentDurationISO,
        prayerTimes: fast.prayerTimes || [],
        completedPrayers,
        verse: fast.verse,
        prayerFocus: fast.prayerFocus,
        progress: {
          percentage,
          hoursCompleted: Math.round(elapsed * 10) / 10,
          totalHours: Math.round(totalHours * 10) / 10,
        },
  accountabilityPartner: null,
  recentJournals,
      }
    };
    return reply.status(200).send(response);
  });

  // PUT /fasts/:fastId
  fastify.put('/fasts/:fastId', async (request, reply) => {
    const { error, value } = updateFastSchema.validate(request.body, { abortEarly: false });
    if (error) return reply.status(400).send({ success: false, message: 'Validation failed', statusCode: 400, error: error.message });
    const userId = (request as any).userId as number;
    const fastId = Number((request.params as any).fastId);
    const fast = await Fast.findOne({ where: { id: fastId, userId } });
    if (!fast) return reply.status(404).send({ success: false, message: 'Fast not found', statusCode: 404 });

    if (fast.status === 'active') {
      if (value.goal !== undefined) fast.goal = value.goal;
      if (value.prayerTimes !== undefined) fast.prayerTimes = value.prayerTimes;
      await fast.save();
    } else {
      Object.assign(fast, value);
      await fast.save();
    }
    return reply.status(200).send({ success: true, message: 'Fast updated', statusCode: 200, data: fast });
  });

  // POST /fasts/:fastId/complete
  fastify.post('/fasts/:fastId/complete', async (request, reply) => {
    const userId = (request as any).userId as number;
    const fastId = Number((request.params as any).fastId);
    const fast = await Fast.findOne({ where: { id: fastId, userId } });
    if (!fast) return reply.status(404).send({ success: false, message: 'Fast not found', statusCode: 404 });
    fast.status = 'completed';
    fast.completedAt = new Date();
    await fast.save();
    return reply.status(200).send({ success: true, message: 'Fast completed', statusCode: 200, data: fast });
  });

  // POST /fasts/:fastId/break
  fastify.post('/fasts/:fastId/break', async (request, reply) => {
    const userId = (request as any).userId as number;
    const fastId = Number((request.params as any).fastId);
    const fast = await Fast.findOne({ where: { id: fastId, userId } });
    if (!fast) return reply.status(404).send({ success: false, message: 'Fast not found', statusCode: 404 });
    fast.status = 'failed';
    fast.brokenAt = new Date();
    await fast.save();
    return reply.status(200).send({ success: true, message: 'Fast ended early', statusCode: 200, data: fast });
  });

  // POST /fasts/:fastId/prayers
  fastify.post('/fasts/:fastId/prayers', async (request, reply) => {
    const { error, value } = prayerLogSchema.validate(request.body, { abortEarly: false });
    if (error) return reply.status(400).send({ success: false, message: 'Validation failed', statusCode: 400, error: error.message });
    const userId = (request as any).userId as number;
    const fastId = Number((request.params as any).fastId);
    const fast = await Fast.findOne({ where: { id: fastId, userId } });
    if (!fast) return reply.status(404).send({ success: false, message: 'Fast not found', statusCode: 404 });

    const durationSeconds = isoDurationToSeconds(value.duration || null);
    const created = await FastPrayerLog.create({
      fastId,
      userId,
      prayerTime: value.prayerTime ?? null,
      loggedAt: value.loggedAt ? new Date(value.loggedAt) : new Date(),
      durationSeconds,
      type: value.type ?? null,
      notes: value.notes ?? null,
      verseUsed: value.verseUsed ?? null,
    });
    return reply.status(201).send({ success: true, message: 'Prayer logged', statusCode: 201, data: created });
  });

  // GET /fasts/:fastId/prayers
  fastify.get('/fasts/:fastId/prayers', async (request, reply) => {
    const userId = (request as any).userId as number;
    const fastId = Number((request.params as any).fastId);
    const fast = await Fast.findOne({ where: { id: fastId, userId } });
    if (!fast) return reply.status(404).send({ success: false, message: 'Fast not found', statusCode: 404 });
    const items = await FastPrayerLog.findAll({ where: { fastId }, order: [['loggedAt', 'DESC']] });
    const res = items.map(i => ({
      id: i.id,
      prayerTime: i.prayerTime,
      loggedAt: i.loggedAt,
      duration: i.durationSeconds != null ? `PT${Math.floor(i.durationSeconds / 60)}M` : null,
      type: i.type,
      notes: i.notes,
      verseUsed: i.verseUsed,
    }));
    return reply.status(200).send({ success: true, message: 'Prayer history', statusCode: 200, data: res });
  });

  // POST /fasts/:fastId/progress
  fastify.post('/fasts/:fastId/progress', async (request, reply) => {
    const { error, value } = progressSchema.validate(request.body, { abortEarly: false });
    if (error) return reply.status(400).send({ success: false, message: 'Validation failed', statusCode: 400, error: error.message });
    const userId = (request as any).userId as number;
    const fastId = Number((request.params as any).fastId);
    const fast = await Fast.findOne({ where: { id: fastId, userId } });
    if (!fast) return reply.status(404).send({ success: false, message: 'Fast not found', statusCode: 404 });

    const created = await FastProgressLog.create({
      fastId,
      userId,
      hungerLevel: value.hungerLevel ?? null,
      spiritualClarity: value.spiritualClarity ?? null,
      temptationStrength: value.temptationStrength ?? null,
      notes: value.notes ?? null,
      breakthrough: value.breakthrough ?? null,
    });
    return reply.status(201).send({ success: true, message: 'Progress updated', statusCode: 201, data: created });
  });

  // Journals
  const journalSchema = Joi.object({
    title: Joi.string().max(255).allow('', null),
    body: Joi.string().required(),
    attachments: Joi.array().items(Joi.object({ type: Joi.string().required(), url: Joi.string().required(), name: Joi.string().optional() })).optional(),
    visibility: Joi.string().valid('private', 'partner').default('private'),
  });

  // POST /fasts/:fastId/journals
  fastify.post('/fasts/:fastId/journals', async (request, reply) => {
    const { error, value } = journalSchema.validate(request.body, { abortEarly: false });
    if (error) return reply.status(400).send({ success: false, message: 'Validation failed', statusCode: 400, error: error.message });
    const userId = (request as any).userId as number;
    const fastId = Number((request.params as any).fastId);
    const fast = await Fast.findOne({ where: { id: fastId, userId } });
    if (!fast) return reply.status(404).send({ success: false, message: 'Fast not found', statusCode: 404 });

    if (value.visibility === 'partner' && !fast.addAccountabilityPartners) {
      return reply.status(400).send({ success: false, message: 'Partner sharing is disabled for this fast', statusCode: 400 });
    }

    const journal = await FastJournal.create({
      fastId,
      userId,
      title: value.title ?? null,
      body: value.body,
      attachments: value.attachments ?? null,
      visibility: value.visibility,
    });

    // Notify partners if shared and has established partners
    if (journal.visibility === 'partner' && fast.addAccountabilityPartners) {
      const partnerships = await AccountabilityPartner.findAll({
        where: {
          [Op.or]: [{ userId }, { receiverId: userId }],
          receiverId: { [Op.ne]: null },
        },
      });
      const partnerUserIds = partnerships
        .map((p) => (p.userId === userId ? p.receiverId : p.userId))
        .filter((id): id is number => id != null);
      await Promise.all(
        partnerUserIds.map((pid) =>
          PushQueue.sendNotification({
            type: 'generic',
            actorId: userId,
            targetUserId: pid,
            title: 'New Fast Journal',
            body: 'A new journal entry was posted.',
            data: { fastId, journalId: journal.id },
          })
        )
      );
    }

    return reply.status(201).send({ success: true, message: 'Journal created', statusCode: 201, data: journal });
  });

  // GET /fasts/:fastId/journals
  fastify.get('/fasts/:fastId/journals', async (request, reply) => {
    const userId = (request as any).userId as number;
    const fastId = Number((request.params as any).fastId);
    const fast = await Fast.findOne({ where: { id: fastId } });
    if (!fast) return reply.status(404).send({ success: false, message: 'Fast not found', statusCode: 404 });

    // Owner sees all; partners see only partner-visible if sharing enabled and partnership exists
    let where: any = { fastId };
    if (fast.userId !== userId) {
      if (!fast.addAccountabilityPartners) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
      // Check partnership
      const partnership = await AccountabilityPartner.findOne({
        where: {
          [Op.or]: [
            { userId: fast.userId, receiverId: userId },
            { userId, receiverId: fast.userId },
          ],
          receiverId: { [Op.ne]: null },
        },
      });
      if (!partnership) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
      where.visibility = 'partner';
    } else {
      where.userId = userId;
    }
    const items = await FastJournal.findAll({ where, order: [['createdAt', 'DESC']] });
    return reply.status(200).send({ success: true, message: 'Journals', statusCode: 200, data: items });
  });

  // GET /fasts/:fastId/journals/:journalId
  fastify.get('/fasts/:fastId/journals/:journalId', async (request, reply) => {
    const userId = (request as any).userId as number;
    const { fastId, journalId } = (request.params as any);
    const fast = await Fast.findByPk(Number(fastId));
    if (!fast) return reply.status(404).send({ success: false, message: 'Fast not found', statusCode: 404 });
    const journal = await FastJournal.findByPk(Number(journalId));
    if (!journal || journal.fastId !== fast.id) return reply.status(404).send({ success: false, message: 'Journal not found', statusCode: 404 });
    if (journal.userId !== userId) {
      if (!(fast.addAccountabilityPartners && journal.visibility === 'partner')) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
      const partnership = await AccountabilityPartner.findOne({
        where: {
          [Op.or]: [
            { userId: fast.userId, receiverId: userId },
            { userId, receiverId: fast.userId },
          ],
          receiverId: { [Op.ne]: null },
        },
      });
      if (!partnership) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    }
    return reply.status(200).send({ success: true, message: 'Journal', statusCode: 200, data: journal });
  });

  // DELETE /fasts/:fastId/journals/:journalId
  fastify.delete('/fasts/:fastId/journals/:journalId', async (request, reply) => {
    const userId = (request as any).userId as number;
    const { fastId, journalId } = (request.params as any);
    const journal = await FastJournal.findByPk(Number(journalId));
    if (!journal || journal.fastId !== Number(fastId)) return reply.status(404).send({ success: false, message: 'Journal not found', statusCode: 404 });
    if (journal.userId !== userId) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    await journal.destroy();
    return reply.status(204).send();
  });

  // Comments on journals
  const commentSchema = Joi.object({
    body: Joi.string().required(),
    mentions: Joi.array().items(Joi.number()).optional(),
    attachments: Joi.array().items(Joi.object({ type: Joi.string().required(), url: Joi.string().required(), name: Joi.string().optional() })).optional(),
  });

  // POST /fasts/:fastId/journals/:journalId/comments
  fastify.post('/fasts/:fastId/journals/:journalId/comments', async (request, reply) => {
    const { error, value } = commentSchema.validate(request.body, { abortEarly: false });
    if (error) return reply.status(400).send({ success: false, message: 'Validation failed', statusCode: 400, error: error.message });
    const userId = (request as any).userId as number;
    const { fastId, journalId } = (request.params as any);
    const fast = await Fast.findByPk(Number(fastId));
    const journal = await FastJournal.findByPk(Number(journalId));
    if (!fast || !journal || journal.fastId !== fast.id) return reply.status(404).send({ success: false, message: 'Journal not found', statusCode: 404 });

    // Permission: owner can comment; partner can comment only if visibility is partner and addAccountabilityPartners enabled and they are partnered
    if (journal.userId !== userId) {
      if (!(fast.addAccountabilityPartners && journal.visibility === 'partner')) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
      const partnership = await AccountabilityPartner.findOne({
        where: {
          [Op.or]: [
            { userId: fast.userId, receiverId: userId },
            { userId, receiverId: fast.userId },
          ],
          receiverId: { [Op.ne]: null },
        },
      });
      if (!partnership) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    }

    const comment = await AccountabilityComment.create({
      userId,
      targetType: 'fast_journal',
      targetId: journal.id,
      body: value.body,
      mentions: value.mentions ?? null,
      attachments: value.attachments ?? null,
    });

    // Notify owner if partner commented
    if (journal.userId !== userId) {
      await PushQueue.sendNotification({
        type: 'generic',
        actorId: userId,
        targetUserId: journal.userId,
        title: 'New comment on your journal',
        body: 'Your fast journal received a new comment.',
        data: { fastId: fast.id, journalId: journal.id, commentId: comment.id },
      });
    }

    return reply.status(201).send({ success: true, message: 'Comment created', statusCode: 201, data: comment });
  });

  // GET /fasts/:fastId/journals/:journalId/comments
  fastify.get('/fasts/:fastId/journals/:journalId/comments', async (request, reply) => {
    const userId = (request as any).userId as number;
    const { fastId, journalId } = (request.params as any);
    const fast = await Fast.findByPk(Number(fastId));
    const journal = await FastJournal.findByPk(Number(journalId));
    if (!fast || !journal || journal.fastId !== fast.id) return reply.status(404).send({ success: false, message: 'Journal not found', statusCode: 404 });
    if (journal.userId !== userId) {
      if (!(fast.addAccountabilityPartners && journal.visibility === 'partner')) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
      const partnership = await AccountabilityPartner.findOne({
        where: {
          [Op.or]: [
            { userId: fast.userId, receiverId: userId },
            { userId, receiverId: fast.userId },
          ],
          receiverId: { [Op.ne]: null },
        },
      });
      if (!partnership) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    }
    const items = await AccountabilityComment.findAll({ where: { targetType: 'fast_journal', targetId: journal.id }, order: [['createdAt', 'ASC']] });
    return reply.status(200).send({ success: true, message: 'Comments', statusCode: 200, data: items });
  });

  // PARTNER VIEWS
  // GET /fasts/partners/active - list fasters who assigned current user and are actively fasting
  fastify.get('/fasts/partners/active', async (request, reply) => {
    const partnerId = (request as any).userId as number;
    const q = request.query as any;
    const page = Math.max(1, parseInt(q?.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(q?.limit || '10', 10)));
    const offset = (page - 1) * limit;

    // Partnerships where the faster (userId) assigned current user as receiver
    const partnerships = await AccountabilityPartner.findAll({ where: { receiverId: partnerId } });
    const fasterIds = Array.from(new Set(partnerships.map(p => p.userId)));
    if (!fasterIds.length) {
      return reply.status(200).send({ success: true, message: 'Active fasters', statusCode: 200, data: { items: [], total: 0, page, limit } });
    }

    const { rows: fasts, count } = await Fast.findAndCountAll({
      where: {
        userId: { [Op.in]: fasterIds },
        status: 'active',
        addAccountabilityPartners: true,
      },
      order: [['endTime', 'ASC']],
      limit,
      offset,
    });

    const userIds = Array.from(new Set(fasts.map(f => f.userId)));
    const users = await User.findAll({ where: { id: { [Op.in]: userIds } } });
    const userMap = new Map(users.map(u => [u.id, u] as const));

    const now = new Date();
    const items = fasts.map(f => {
      const totalHours = Math.max(0, (f.endTime.getTime() - f.startTime.getTime()) / 3600000);
      const elapsed = Math.max(0, Math.min(now.getTime(), f.endTime.getTime()) - f.startTime.getTime()) / 3600000;
      const percentage = totalHours > 0 ? Math.min(100, (elapsed / totalHours) * 100) : 0;
      const u = userMap.get(f.userId);
      return {
        fastId: f.id,
        type: f.type,
        startTime: f.startTime,
        endTime: f.endTime,
        progress: {
          percentage,
          hoursCompleted: Math.round(elapsed * 10) / 10,
          totalHours: Math.round(totalHours * 10) / 10,
        },
        user: u
          ? {
              id: u.id,
              firstName: u.firstName,
              lastName: u.lastName,
              avatar: (u as any).avatar ?? null,
              username: (u as any).username,
            }
          : { id: f.userId },
      };
    });

    return reply.status(200).send({ success: true, message: 'Active fasters', statusCode: 200, data: { items, total: count, page, limit } });
  });

  // GET /fasts/partners/:userId/journals - list partner-visible journals for a given faster's active fast(s)
  fastify.get('/fasts/partners/:userId/journals', async (request, reply) => {
    const partnerId = (request as any).userId as number;
    const fasterId = Number((request.params as any).userId);
    const q = request.query as any;
    const page = Math.max(1, parseInt(q?.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(q?.limit || '10', 10)));
    const offset = (page - 1) * limit;

    // Verify directional partnership: faster assigned current user
    const partnership = await AccountabilityPartner.findOne({ where: { userId: fasterId, receiverId: partnerId } });
    if (!partnership) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });

    // Active fasts for this faster where partner sharing is enabled
    const activeFasts = await Fast.findAll({ where: { userId: fasterId, status: 'active', addAccountabilityPartners: true } });
    if (!activeFasts.length) {
      return reply.status(200).send({ success: true, message: 'Journals', statusCode: 200, data: { items: [], total: 0, page, limit } });
    }
    const fastIds = activeFasts.map(f => f.id);

    const { rows, count } = await FastJournal.findAndCountAll({
      where: {
        userId: fasterId,
        fastId: { [Op.in]: fastIds },
        visibility: 'partner',
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return reply.status(200).send({ success: true, message: 'Journals', statusCode: 200, data: { items: rows, total: count, page, limit } });
  });

}
