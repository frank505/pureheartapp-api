import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate, AuthenticatedFastifyRequest } from '../middleware/auth';
import { IAPIResponse } from '../types/auth';
import AccountabilityCheckIn, { CheckInVisibility } from '../models/AccountabilityCheckIn';
import type { CheckInStatus } from '../models/AccountabilityCheckIn';
import { Op } from 'sequelize';
import { getAnalytics, getCalendarForMonth, getAchievementsForUser, evaluateAndUnlockAchievements, recordCheckInAndUpdateStreak } from '../services/progressService';
import UserBadge from '../models/UserBadge';
import Badge from '../models/Badge';
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

  // GET /progress/badges
  fastify.get('/progress/badges', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as AuthenticatedFastifyRequest).userId;
      const items = await UserBadge.findAll({
        where: { userId },
        include: [{ model: Badge, as: 'badge' }],
        order: [['unlockedAt', 'ASC']],
      });
      return reply.status(200).send({ success: true, message: 'Badges retrieved', data: { items }, statusCode: 200 } satisfies IAPIResponse);
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: 'Failed to get badges', error: error.message, statusCode: 500 } satisfies IAPIResponse);
    }
  });

  // GET /progress/features-and-badges
  fastify.get('/progress/features-and-badges', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as AuthenticatedFastifyRequest).userId;
      const { hasFeatureUnlocked, getFeatureThreshold } = await import('../services/featureService');
      const { ensureUserProgress } = await import('../services/progressService');
      const progress = await ensureUserProgress(userId);

      type FeatureKey = import('../services/featureService').FeatureKey;
      const FEATURE_KEYS: FeatureKey[] = [
        'victory_public_post',
        'communities_public_create',
        'multiple_accountability_partners',
        'create_multiple_public_communities',
        'post_more_than_one_victory',
      ];

      const features = await Promise.all(
        FEATURE_KEYS.map(async (key) => {
          const threshold = getFeatureThreshold(key);
          const unlocked = await hasFeatureUnlocked(userId, key);
          const current = progress.currentCheckInStreak || 0;
          const longest = progress.longestCheckInStreak || 0;
          const remainingDays = Math.max(0, threshold - current);
          return {
            key,
            thresholdDays: threshold,
            unlocked,
            currentCheckInStreak: current,
            longestCheckInStreak: longest,
            remainingDays,
          };
        })
      );

      // Badges with status: all badges + unlocked flag and unlockedAt
      const [allBadges, userBadges] = await Promise.all([
        Badge.findAll(),
        UserBadge.findAll({ where: { userId } }),
      ]);
      const awardedMap = new Map(userBadges.map((ub) => [ub.badgeId, ub]));
      const badges = allBadges.map((b) => {
        const awarded = awardedMap.get(b.id) || null;
        return {
          id: b.id,
          code: (b as any).code,
          title: (b as any).title,
          description: (b as any).description,
          icon: (b as any).icon,
          tier: (b as any).tier,
          unlocked: Boolean(awarded),
          unlockedAt: awarded?.unlockedAt ?? null,
        };
      });

      return reply.status(200).send({
        success: true,
        message: 'Features and badges',
        data: { features, badges },
        statusCode: 200,
      } satisfies IAPIResponse);
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: 'Failed to get features and badges', error: error.message, statusCode: 500 } satisfies IAPIResponse);
    }
  });

  // GET /progress/features - returns boolean flags for feature unlocks
  fastify.get('/progress/features', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as AuthenticatedFastifyRequest).userId;
      const { hasFeatureUnlocked } = await import('../services/featureService');
      const [victoryPublic, communitiesPublicCreate, multiPartners, multiPublicCommunities, multiVictories] = await Promise.all([
        hasFeatureUnlocked(userId, 'victory_public_post'),
        hasFeatureUnlocked(userId, 'communities_public_create'),
        hasFeatureUnlocked(userId, 'multiple_accountability_partners'),
        hasFeatureUnlocked(userId, 'create_multiple_public_communities'),
        hasFeatureUnlocked(userId, 'post_more_than_one_victory'),
      ]);
      return reply.status(200).send({ success: true, message: 'Feature flags', data: {
        victory_public_post: victoryPublic,
        communities_public_create: communitiesPublicCreate,
        multiple_accountability_partners: multiPartners,
        create_multiple_public_communities: multiPublicCommunities,
        post_more_than_one_victory: multiVictories,
      }, statusCode: 200 } satisfies IAPIResponse);
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: 'Failed to get features', error: error.message, statusCode: 500 } satisfies IAPIResponse);
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


