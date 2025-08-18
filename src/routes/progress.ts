import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate, AuthenticatedFastifyRequest } from '../middleware/auth';
import { IAPIResponse } from '../types/auth';
import AccountabilityCheckIn, { CheckInVisibility } from '../models/AccountabilityCheckIn';
import type { CheckInStatus } from '../models/AccountabilityCheckIn';
import { Op } from 'sequelize';
import { getAnalytics, getCalendarForMonth, getAchievementsForUser, evaluateAndUnlockAchievements, recordCheckInAndUpdateStreak } from '../services/progressService';
import { PushQueue } from '../jobs/notificationJobs';

export default async function (fastify: FastifyInstance, options: FastifyPluginOptions) {
  fastify.addHook('preHandler', authenticate);

  const createCheckinSchema = {
    body: {
      type: 'object',
      required: ['mood'],
      properties: {
        mood: { type: 'number', minimum: 0, maximum: 1 },
        note: { type: 'string' },
        visibility: { type: 'string', enum: ['private', 'partner', 'group'] },
        partnerIds: { type: 'array', items: { type: 'number' } },
        groupIds: { type: 'array', items: { type: 'number' } },
  status: { type: 'string', enum: ['victory', 'relapse'] },
      },
    },
  } as const;

  // POST /progress/checkins — alias of accountability check-in
  fastify.post(
    '/progress/checkins',
    { schema: createCheckinSchema },
    async (
      request: FastifyRequest<{
        Body: {
          mood: number;
          note?: string;
          visibility?: CheckInVisibility;
          partnerIds?: number[];
          groupIds?: number[];
          status?: CheckInStatus;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
  const { mood, note, visibility = 'private', partnerIds, groupIds, status = 'victory' } = request.body;
        const userId = (request as AuthenticatedFastifyRequest).userId;

        if (mood === undefined || mood < 0 || mood > 1) {
          const response: IAPIResponse = {
            success: false,
            message: 'Validation failed',
            error: 'Mood is required and must be a number between 0 and 1.',
            statusCode: 400,
          };
          return reply.status(400).send(response);
        }

        if (visibility === 'partner' && (!partnerIds || partnerIds.length === 0)) {
          return reply.status(400).send({ success: false, message: 'Validation failed', error: 'Partner IDs are required for partner visibility.', statusCode: 400 });
        }
        if (visibility === 'group' && (!groupIds || groupIds.length === 0)) {
          return reply.status(400).send({ success: false, message: 'Validation failed', error: 'Group IDs are required for group visibility.', statusCode: 400 });
        }

        const checkIn = await AccountabilityCheckIn.create({
          userId,
          mood,
          note: note ?? null,
          visibility,
          partnerIds: visibility === 'partner' ? partnerIds ?? null : null,
          groupIds: visibility === 'group' ? groupIds ?? null : null,
          status,
        });

        // Update progress and evaluate achievements
  await recordCheckInAndUpdateStreak(userId, checkIn.createdAt, checkIn.getDataValue('status') as any);
        const newlyUnlocked = await evaluateAndUnlockAchievements(userId);

        if (checkIn.visibility === 'partner' && checkIn.partnerIds) {
          await Promise.all(
            checkIn.partnerIds.map((partnerId) =>
              PushQueue.sendNotification({
                type: 'checkin_created',
                actorId: userId,
                targetUserId: partnerId,
                title: 'New Check-in',
                body: `${(request as AuthenticatedFastifyRequest).user.username} has posted a new check-in.`,
                data: { checkInId: checkIn.id },
              })
            )
          );
        }

        const response: IAPIResponse = {
          success: true,
          message: 'Check-in created successfully',
          data: { checkIn, newlyUnlocked },
          statusCode: 201,
        };
        return reply.status(201).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to create check-in',
          error: error.message,
          statusCode: 500,
        };
        return reply.status(500).send(response);
      }
    }
  );

  // GET /progress/achievements
  fastify.get('/progress/achievements', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as AuthenticatedFastifyRequest).userId;
      const items = await getAchievementsForUser(userId);
      return reply.status(200).send({ success: true, message: 'Achievements retrieved', data: { items }, statusCode: 200 } satisfies IAPIResponse);
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: 'Failed to get achievements', error: error.message, statusCode: 500 } satisfies IAPIResponse);
    }
  });

  // POST /progress/achievements/:id/unlock
  fastify.post(
    '/progress/achievements/:id/unlock',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        // Run an evaluation; if already unlocked, return existing
        const newly = await evaluateAndUnlockAchievements(userId);
        const id = Number(request.params.id);
        const targetNew = newly.find((n) => n.achievementId === id);
        if (targetNew) {
          return reply.status(200).send({ success: true, message: 'Achievement unlocked', data: targetNew, statusCode: 200 } satisfies IAPIResponse);
        }
        // If not in newly unlocked, check if already unlocked previously
        const { default: UserAchievement } = await import('../models/UserAchievement');
        const existing = await UserAchievement.findOne({ where: { userId, achievementId: id } });
        if (existing) {
          return reply.status(200).send({ success: true, message: 'Achievement already unlocked', data: existing, statusCode: 200 } satisfies IAPIResponse);
        }
        return reply.status(400).send({ success: false, message: 'Achievement not eligible to unlock', statusCode: 400 } satisfies IAPIResponse);
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: 'Failed to unlock achievement', error: error.message, statusCode: 500 } satisfies IAPIResponse);
      }
    }
  );

  // GET /progress/analytics?period=last_4_weeks|all_time
  fastify.get(
    '/progress/analytics',
    async (
      request: FastifyRequest<{ Querystring: { period?: 'last_4_weeks' | 'all_time' } }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const period = request.query.period ?? 'last_4_weeks';
        const summary = await getAnalytics(userId, period);
        return reply.status(200).send({ success: true, message: 'Analytics summary', data: summary, statusCode: 200 } satisfies IAPIResponse);
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: 'Failed to get analytics', error: error.message, statusCode: 500 } satisfies IAPIResponse);
      }
    }
  );

  // GET /progress/calendar?month=YYYY-MM
  fastify.get(
    '/progress/calendar',
    async (
      request: FastifyRequest<{ Querystring: { month?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const month = request.query.month ?? new Date().toISOString().slice(0, 7);
        const result = await getCalendarForMonth(userId, month);
        return reply.status(200).send({ success: true, message: 'Calendar generated', data: result, statusCode: 200 } satisfies IAPIResponse);
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: 'Failed to get calendar', error: error.message, statusCode: 500 } satisfies IAPIResponse);
      }
    }
  );
}


