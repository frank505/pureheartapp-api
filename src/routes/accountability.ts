import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { IAPIResponse } from '../types/auth';
import AccountabilityCheckIn from '../models/AccountabilityCheckIn';
import { CheckInVisibility } from '../models/AccountabilityCheckIn';
import {
  IPrayerRequest,
  default as PrayerRequest,
  Visibility,
} from '../models/PrayerRequest';
import { IVictory, default as Victory } from '../models/Victory';
import AccountabilityComment from '../models/AccountabilityComment';
import { Op } from 'sequelize';
import { PushQueue } from '../jobs/notificationJobs';
import User from '../models/User';
import { authenticate, AuthenticatedFastifyRequest } from '../middleware/auth';
import AccountabilityPartner from '../models/AccountabilityPartner';
import GroupMember from '../models/GroupMember';
import sequelize from '../config/database';
import Group from '../models/Group';
import { IAuthenticatedRequest } from '../types/auth';
import { recordCheckInAndUpdateStreak, incrementCounter, evaluateAndUnlockAchievements } from '../services/progressService';

/**
 * Encapsulates the routes for accountability features.
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function (fastify: FastifyInstance, options: FastifyPluginOptions) {
  // Middleware to ensure user is authenticated
  fastify.addHook('preHandler', authenticate);

  const createCheckinSchema = {
    body: {
      type: 'object',
      required: ['mood'],
      properties: {
        mood: { type: 'number', minimum: 0, maximum: 1 },
        note: { type: 'string' },
        visibility: { type: 'string', enum: ['private', 'partner', 'group', 'public'] },
        partnerIds: { type: 'array', items: { type: 'number' } },
        groupIds: { type: 'array', items: { type: 'number' } },
      },
    },
  };

  // POST /checkins - Create a new accountability check-in
  fastify.post(
    '/checkins',
    { schema: createCheckinSchema },
    async (
      request: FastifyRequest<{
        Body: {
          mood: number;
          note?: string;
          visibility?: CheckInVisibility;
          partnerIds?: number[];
          groupIds?: number[];
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { mood, note, visibility = 'private', partnerIds, groupIds } = request.body;
        const userId = (request as AuthenticatedFastifyRequest).userId;

        // Basic validation
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
          const response: IAPIResponse = {
            success: false,
            message: 'Validation failed',
            error: 'Partner IDs are required for partner visibility.',
            statusCode: 400,
          };
          return reply.status(400).send(response);
        }

        if (visibility === 'group' && (!groupIds || groupIds.length === 0)) {
          const response: IAPIResponse = {
            success: false,
            message: 'Validation failed',
            error: 'Group IDs are required for group visibility.',
            statusCode: 400,
          };
          return reply.status(400).send(response);
        }

        const checkIn = await AccountabilityCheckIn.create({
          userId,
          mood,
          note: note ?? null,
          visibility,
          partnerIds: visibility === 'partner' ? partnerIds ?? null : null,
          groupIds: visibility === 'group' ? groupIds ?? null : null,
        });

        // Update progress and evaluate achievements
        await recordCheckInAndUpdateStreak(userId, checkIn.createdAt);
        const newlyUnlocked = await evaluateAndUnlockAchievements(userId);

        if (checkIn.visibility === 'partner' && checkIn.partnerIds) {
          await Promise.all(
            checkIn.partnerIds.map((partnerId) =>
              PushQueue.sendNotification({
                type: 'checkin_created',
                actorId: userId,
                targetUserId: partnerId,
                title: 'New Check-in',
                body: `${
                  (request as AuthenticatedFastifyRequest).user.username
                } has posted a new check-in.`,
                data: {
                  checkInId: checkIn.id,
                },
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

        reply.status(201).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to create check-in',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  // GET /checkins - Get all accountability check-ins for the user
  fastify.get(
    '/checkins',
    async (
      request: FastifyRequest<{
        Querystring: {
          from?: string;
          to?: string;
          page?: number;
          limit?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const { from, to } = request.query;
        const page = Number(request.query.page) || 1;
        const limit = Number(request.query.limit) || 10;

        const where: any = { userId };
        if (from && to) {
          where.createdAt = {
            [Op.between]: [new Date(from), new Date(to)],
          };
        }

        const { count, rows } = await AccountabilityCheckIn.findAndCountAll({
          where,
          limit,
          offset: (page - 1) * limit,
          order: [['createdAt', 'DESC']],
        });

        const response: IAPIResponse = {
          success: true,
          message: 'Check-ins retrieved successfully',
          data: {
            items: rows,
            page,
            totalPages: Math.ceil(count / limit),
          },
          statusCode: 200,
        };

        reply.status(200).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to retrieve check-ins',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  // GET /checkins/:id - Get a single accountability check-in
  fastify.get(
    '/checkins/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const { id } = request.params;

        const checkIn = await AccountabilityCheckIn.findOne({ where: { id: Number(id), userId } });

        if (!checkIn) {
          const response: IAPIResponse = {
            success: false,
            message: 'Check-in not found',
            error: 'The requested check-in does not exist or you do not have permission to view it.',
            statusCode: 404,
          };
          return reply.status(404).send(response);
        }

        const response: IAPIResponse = {
          success: true,
          message: 'Check-in retrieved successfully',
          data: checkIn,
          statusCode: 200,
        };

        reply.status(200).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to retrieve check-in',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  // PATCH /checkins/:id - Update an accountability check-in
  fastify.patch(
    '/checkins/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          mood?: number;
          note?: string;
          visibility?: CheckInVisibility;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const { id } = request.params;
        const { mood, note, visibility } = request.body;

        const checkIn = await AccountabilityCheckIn.findOne({ where: { id: Number(id), userId } });

        if (!checkIn) {
          const response: IAPIResponse = {
            success: false,
            message: 'Check-in not found',
            error: 'The requested check-in does not exist or you do not have permission to modify it.',
            statusCode: 404,
          };
          return reply.status(404).send(response);
        }

        if (mood !== undefined) checkIn.mood = mood;
        if (note !== undefined) checkIn.note = note;
        if (visibility !== undefined) checkIn.visibility = visibility;

        await checkIn.save();

        const response: IAPIResponse = {
          success: true,
          message: 'Check-in updated successfully',
          data: checkIn,
          statusCode: 200,
        };

        reply.status(200).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to update check-in',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  // DELETE /checkins/:id - Delete an accountability check-in
  fastify.delete(
    '/checkins/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const { id } = request.params;

        const checkIn = await AccountabilityCheckIn.findOne({ where: { id: Number(id), userId } });

        if (!checkIn) {
          const response: IAPIResponse = {
            success: false,
            message: 'Check-in not found',
            error: 'The requested check-in does not exist or you do not have permission to delete it.',
            statusCode: 404,
          };
          return reply.status(404).send(response);
        }

        await checkIn.destroy();

        const response: IAPIResponse = {
          success: true,
          message: 'Check-in deleted successfully',
          statusCode: 204,
        };

        reply.status(204).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to delete check-in',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  const createPrayerRequestSchema = {
    body: {
      type: 'object',
      required: ['title', 'visibility'],
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
        visibility: { type: 'string', enum: ['private', 'partner', 'group', 'public'] },
        partnerIds: { type: 'array', items: { type: 'number' } },
        groupIds: { type: 'array', items: { type: 'number' } },
      },
    },
  };

  fastify.post(
    '/prayer-requests',
    { schema: createPrayerRequestSchema },
    async (
      request: FastifyRequest<{
        Body: {
          title: string;
          body: string;
          visibility: Visibility;
          partnerIds?: number[];
          groupIds?: number[];
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { title, body, visibility, partnerIds, groupIds } = request.body;
        const userId = (request as AuthenticatedFastifyRequest).userId;

        if (visibility === 'partner' && (!partnerIds || partnerIds.length === 0)) {
          const response: IAPIResponse = {
            success: false,
            message: 'Validation failed',
            error: 'Partner IDs are required for partner visibility.',
            statusCode: 400,
          };
          return reply.status(400).send(response);
        }

        if (visibility === 'group' && (!groupIds || groupIds.length === 0)) {
          const response: IAPIResponse = {
            success: false,
            message: 'Validation failed',
            error: 'Group IDs are required for group visibility.',
            statusCode: 400,
          };
          return reply.status(400).send(response);
        }

        const prayerRequest = await PrayerRequest.create({
          userId,
          title,
          body,
          visibility,
          partnerIds: visibility === 'partner' ? partnerIds ?? null : null,
        });

        // Update progress and evaluate achievements
        await incrementCounter(userId, 'prayerCount');
        const newlyUnlocked = await evaluateAndUnlockAchievements(userId);

        if (prayerRequest.visibility === 'group' && groupIds) {
          await (prayerRequest as any).addGroups(groupIds);
        }

        if (prayerRequest.visibility === 'partner' && prayerRequest.partnerIds) {
          await Promise.all(
            prayerRequest.partnerIds.map((partnerId) =>
              PushQueue.sendNotification({
                type: 'prayer_request_created',
                actorId: userId,
                targetUserId: partnerId,
                title: 'New Prayer Request',
                body: `${
                  (request as AuthenticatedFastifyRequest).user.username
                } has posted a new prayer request.`,
                data: {
                  prayerRequestId: prayerRequest.id,
                },
              })
            )
          );
        }

        const response: IAPIResponse = {
          success: true,
          message: 'Prayer request created successfully',
          data: { prayerRequest, newlyUnlocked },
          statusCode: 201,
        };

        reply.status(201).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to create prayer request',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  // GET /prayer-requests - Get all prayer requests for the user
  fastify.get(
    '/prayer-requests',
    async (
      request: FastifyRequest<{
        Querystring: {
          page?: number;
          limit?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const page = Number(request.query.page) || 1;
        const limit = Number(request.query.limit) || 10;

        const { count, rows } = await PrayerRequest.findAndCountAll({
          where: { userId },
          limit,
          offset: (page - 1) * limit,
          order: [['createdAt', 'DESC']],
        });

        const response: IAPIResponse = {
          success: true,
          message: 'Prayer requests retrieved successfully',
          data: {
            items: rows,
            page,
            totalPages: Math.ceil(count / limit),
          },
          statusCode: 200,
        };

        reply.status(200).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to retrieve prayer requests',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  // GET /prayer-requests/public - Get all public prayer requests
  fastify.get(
    '/prayer-requests/public',
    async (
      request: FastifyRequest<{
        Querystring: {
          page?: number;
          limit?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const page = Number(request.query.page) || 1;
        const limit = Number(request.query.limit) || 10;

        const { count, rows } = await PrayerRequest.findAndCountAll({
          where: { visibility: 'public' },
          limit,
          offset: (page - 1) * limit,
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: User,
              as: 'requestingUser',
              attributes: ['id', 'username', 'avatar'],
            },
          ],
        });

        const response: IAPIResponse = {
          success: true,
          message: 'Public prayer requests retrieved successfully',
          data: {
            items: rows,
            page,
            totalPages: Math.ceil(count / limit),
          },
          statusCode: 200,
        };

        reply.status(200).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to retrieve public prayer requests',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  // GET /prayer-requests/user/:userId - Get all prayer requests for a specific user
  fastify.get(
    '/prayer-requests/user/:userId',
    async (
      request: FastifyRequest<{
        Params: { userId: string };
        Querystring: {
          page?: number;
          limit?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requesterId = (request as AuthenticatedFastifyRequest).userId;
        const { userId: targetUserId } = request.params;
        const page = Number(request.query.page) || 1;
        const limit = Number(request.query.limit) || 10;

        const where: any = { userId: Number(targetUserId) };

        if (requesterId !== Number(targetUserId)) {
          where.visibility = 'public';
        }

        const { count, rows } = await PrayerRequest.findAndCountAll({
          where,
          limit,
          offset: (page - 1) * limit,
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: User,
              as: 'requestingUser',
              attributes: ['id', 'username', 'avatar'],
            },
          ],
        });

        const response: IAPIResponse = {
          success: true,
          message: 'User prayer requests retrieved successfully',
          data: {
            items: rows,
            page,
            totalPages: Math.ceil(count / limit),
          },
          statusCode: 200,
        };

        reply.status(200).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to retrieve user prayer requests',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  // GET /prayer-requests/shared - Get prayer requests shared with the user
  fastify.get(
    '/prayer-requests/shared',
    async (
      request: FastifyRequest<{
        Querystring: {
          page?: number;
          limit?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const page = Number(request.query.page) || 1;
        const limit = Number(request.query.limit) || 10;

        // Get all group IDs the user is a member of
        const groupMemberships = await GroupMember.findAll({ where: { userId }, attributes: ['groupId'] });
        const groupIds = groupMemberships.map((gm) => gm.groupId);

        // Get all partner IDs for the user
        const partnerships = await AccountabilityPartner.findAll({
          where: {
            [Op.or]: [{ userId }, { receiverId: userId }],
            receiverId: { [Op.ne]: null }, // ensure partnership is established
          },
        });
        const partnerUserIds = partnerships
          .map((p) => (p.userId === userId ? p.receiverId : p.userId))
          .filter((id): id is number => id !== null);

        const conditions = [];
        if (groupIds.length > 0) {
          conditions.push({
            visibility: 'group',
            [Op.or]: groupIds.map((id) => sequelize.literal(`JSON_CONTAINS(group_ids, CAST(${id} AS JSON))`)),
          });
        }

        if (partnerUserIds.length > 0) {
          conditions.push({
            visibility: 'partner',
            userId: {
              [Op.in]: partnerUserIds
            },
            [Op.and]: [
              sequelize.literal(`JSON_CONTAINS(partner_ids, CAST(${userId} AS JSON))`)
            ]
          });
        }

        if (conditions.length === 0) {
          return reply.status(200).send({
            success: true,
            message: 'No shared prayer requests found.',
            data: { items: [], page: 1, totalPages: 0 },
            statusCode: 200,
          });
        }

        const { count, rows } = await PrayerRequest.findAndCountAll({
          where: {
            [Op.or]: conditions,
          },
          limit,
          offset: (page - 1) * limit,
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: User,
              as: 'requestingUser',
              attributes: ['id', 'username', 'avatar'],
            },
            {
              model: Group,
              as: 'groups',
              attributes: ['id', 'name', 'iconUrl'],
              through: { attributes: [] },
            },
          ],
        });

        const response: IAPIResponse = {
          success: true,
          message: 'Shared prayer requests retrieved successfully',
          data: {
            items: rows,
            page,
            totalPages: Math.ceil(count / limit),
          },
          statusCode: 200,
        };

        reply.status(200).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to retrieve shared prayer requests',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  // GET /prayer-requests/:id - Get a single prayer request
  fastify.get(
    '/prayer-requests/single/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requesterId = (request as AuthenticatedFastifyRequest).userId;
        const { id } = request.params;

        const prayerRequest = await PrayerRequest.findByPk(Number(id), {
          include: [
            {
              model: User,
              as: 'requestingUser',
              attributes: ['id', 'username', 'avatar'],
            },
            {
              model: Group,
              as: 'groups',
              attributes: ['id', 'name', 'iconUrl'],
              through: { attributes: [] },
            },
          ],
        });

        if (prayerRequest) {
          let canView = false;
          if (prayerRequest.userId === requesterId) {
            canView = true;
          } else if (prayerRequest.visibility === 'public') {
            canView = true;
          } else if (
            prayerRequest.visibility === 'partner' &&
            prayerRequest.partnerIds?.includes(requesterId)
          ) {
            canView = true;
          } else if (prayerRequest.visibility === 'group' && (prayerRequest as any).groupIds) {
            const isMember = await GroupMember.findOne({
              where: {
                userId: requesterId,
                groupId: { [Op.in]: (prayerRequest as any).groupIds },
              },
            });
            if (isMember) {
              canView = true;
            }
          }

          if (canView) {
            const response: IAPIResponse = {
              success: true,
              message: 'Prayer request retrieved successfully',
              data: prayerRequest,
              statusCode: 200,
            };
            return reply.status(200).send(response);
          }
        }

        return reply.status(404).send({
          success: false,
          message: 'Prayer request not found',
          error:
            'The requested prayer request does not exist or you do not have permission to view it.',
          statusCode: 404,
        });
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to retrieve prayer request',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  // PATCH /prayer-requests/:id - Update a prayer request
  fastify.patch(
    '/prayer-requests/:id',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            body: { type: 'string' },
            visibility: { type: 'string', enum: ['private', 'partner', 'group', 'public'] },
            partnerIds: { type: 'array', items: { type: 'number' } },
            groupIds: { type: 'array', items: { type: 'number' } },
          },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const {
        title,
        body,
        visibility,
        partnerIds,
        groupIds,
      } = req.body as Partial<IPrayerRequest>;

      const prayerRequest = await PrayerRequest.findOne({ where: { id, userId: (req as any).user.id } });
      if (!prayerRequest) return reply.status(404).send({ message: 'Prayer request not found' });

      const updates: Partial<IPrayerRequest> = {};
      if (title) updates.title = title;
      if (body) updates.body = body;
      if (visibility) updates.visibility = visibility;
      if (partnerIds) updates.partnerIds = partnerIds;
      if (groupIds) updates.groupIds = groupIds;

      await prayerRequest.update(updates);

      reply.send(prayerRequest);
    }
  );

  // DELETE /prayer-requests/:id - Delete a prayer request
  fastify.delete(
    '/prayer-requests/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const { id } = request.params;

        const prayerRequest = await PrayerRequest.findOne({ where: { id: Number(id), userId } });

        if (!prayerRequest) {
          const response: IAPIResponse = {
            success: false,
            message: 'Prayer request not found',
            error: 'The requested prayer request does not exist or you do not have permission to delete it.',
            statusCode: 404,
          };
          return reply.status(404).send(response);
        }

        await prayerRequest.destroy();

        const response: IAPIResponse = {
          success: true,
          message: 'Prayer request deleted successfully',
          statusCode: 204,
        };

        reply.status(204).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to delete prayer request',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  const createVictorySchema = {
    body: {
      type: 'object',
      required: ['title', 'visibility'],
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
        visibility: { type: 'string', enum: ['private', 'partner', 'group', 'public'] },
        partnerIds: { type: 'array', items: { type: 'number' } },
        groupIds: { type: 'array', items: { type: 'number' } },
      },
    },
  };

  fastify.post(
    '/victories',
    { schema: createVictorySchema },
    async (
      request: FastifyRequest<{
        Body: {
          title: string;
          body?: string;
          visibility: Visibility;
          partnerIds?: number[];
          groupIds?: number[];
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { title, body, visibility, partnerIds, groupIds } = request.body;
        const userId = (request as AuthenticatedFastifyRequest).userId;

        if (!title) {
          const response: IAPIResponse = {
            success: false,
            message: 'Validation failed',
            error: 'Title is required.',
            statusCode: 400,
          };
          return reply.status(400).send(response);
        }

        if (visibility === 'partner' && (!partnerIds || partnerIds.length === 0)) {
          const response: IAPIResponse = {
            success: false,
            message: 'Validation failed',
            error: 'Partner IDs are required for partner visibility.',
            statusCode: 400,
          };
          return reply.status(400).send(response);
        }

        if (visibility === 'group' && (!groupIds || groupIds.length === 0)) {
          const response: IAPIResponse = {
            success: false,
            message: 'Validation failed',
            error: 'Group IDs are required for group visibility.',
            statusCode: 400,
          };
          return reply.status(400).send(response);
        }

        const victory = await Victory.create({
          userId,
          title,
          body: body ?? null,
          visibility,
          partnerIds: visibility === 'partner' ? partnerIds ?? null : null,
        });

        // Update progress and evaluate achievements
        await incrementCounter(userId, 'victoryCount');
        const newlyUnlocked = await evaluateAndUnlockAchievements(userId);

        if (victory.visibility === 'group' && groupIds) {
          await (victory as any).addGroups(groupIds);
        }

        if (victory.visibility === 'partner' && victory.partnerIds) {
          await Promise.all(
            victory.partnerIds.map((partnerId) =>
              PushQueue.sendNotification({
                type: 'victory_created',
                actorId: userId,
                targetUserId: partnerId,
                title: 'New Victory!',
                body: `${
                  (request as AuthenticatedFastifyRequest).user.username
                } has posted a new victory.`,
                data: {
                  victoryId: victory.id,
                },
              })
            )
          );
        }

        const response: IAPIResponse = {
          success: true,
          message: 'Victory created successfully',
          data: { victory, newlyUnlocked },
          statusCode: 201,
        };

        reply.status(201).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to create victory',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  // GET /victories - Get all victories for the user
  fastify.get(
    '/victories',
    async (
      request: FastifyRequest<{
        Querystring: {
          page?: number;
          limit?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const page = Number(request.query.page) || 1;
        const limit = Number(request.query.limit) || 10;

        const { count, rows } = await Victory.findAndCountAll({
          where: { userId },
          limit,
          offset: (page - 1) * limit,
          order: [['createdAt', 'DESC']],
        });

        const response: IAPIResponse = {
          success: true,
          message: 'Victories retrieved successfully',
          data: {
            items: rows,
            page,
            totalPages: Math.ceil(count / limit),
          },
          statusCode: 200,
        };

        reply.status(200).send(response);
      } catch (error: any) {
        console.log({error});
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to retrieve victories',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  fastify.get(
    '/victories/public',
    async (
      request: FastifyRequest<{
        Querystring: {
          page?: number;
          limit?: number;
          search?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const page = Number(request.query.page) || 1;
        const limit = Number(request.query.limit) || 10;
        const search = request.query.search?.trim();
        console.log({page, limit, search});

        // Build where condition
        const whereCondition: any = { visibility: 'public' };
        
        // Add search filter if provided
        if (search) {
          whereCondition[Op.or] = [
            { title: { [Op.iLike]: `%${search}%` } },
            { body: { [Op.iLike]: `%${search}%` } }
          ];
        }

        const { count, rows } = await Victory.findAndCountAll({
          where: whereCondition,
          limit,
          offset: (page - 1) * limit,
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: User,
              as: 'victoriousUser',
              attributes: ['id', 'username', 'avatar'],
            },
          ],
        });

        const response: IAPIResponse = {
          success: true,
          message: search ? `Public victories matching "${search}" retrieved successfully` : 'Public victories retrieved successfully',
          data: {
            items: rows,
            page,
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            search: search || null,
          },
          statusCode: 200,
        };

        reply.status(200).send(response);
      } catch (error: any) {
        console.log({ error });
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to retrieve public victories',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  // GET /victories/user/:userId - Get all victories for a specific user
  fastify.get(
    '/victories/user/:userId',
    async (
      request: FastifyRequest<{
        Params: { userId: string };
        Querystring: {
          page?: number;
          limit?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requesterId = (request as AuthenticatedFastifyRequest).userId;
        const { userId: targetUserId } = request.params;
        const page = Number(request.query.page) || 1;
        const limit = Number(request.query.limit) || 10;

        const where: any = { userId: Number(targetUserId) };

        // If the requester is not the user whose victories are being requested,
        // only show public victories.
        if (requesterId !== Number(targetUserId)) {
          where.visibility = 'public';
        }

        const { count, rows } = await Victory.findAndCountAll({
          where,
          limit,
          offset: (page - 1) * limit,
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: User,
              as: 'victoriousUser',
              attributes: ['id', 'username', 'avatar'],
            },
          ],
        });

        const response: IAPIResponse = {
          success: true,
          message: 'User victories retrieved successfully',
          data: {
            items: rows,
            page,
            totalPages: Math.ceil(count / limit),
          },
          statusCode: 200,
        };

        reply.status(200).send(response);
      } catch (error: any) {
        console.log({ error });
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to retrieve user victories',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  // GET /victories/shared - Get victories shared with the user (as partner or in group)
  fastify.get(
    '/victories/shared',
    async (
      request: FastifyRequest<{
        Querystring: {
          page?: number;
          limit?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const page = Number(request.query.page) || 1;
        const limit = Number(request.query.limit) || 10;

        // Get all group IDs the user is a member of
        const groupMemberships = await GroupMember.findAll({ where: { userId }, attributes: ['groupId'] });
        const groupIds = groupMemberships.map((gm) => gm.groupId);

        // Get all partner IDs for the user
        const partnerships = await AccountabilityPartner.findAll({
          where: {
            [Op.or]: [{ userId }, { receiverId: userId }],
            receiverId: { [Op.ne]: null }, // ensure partnership is established
          },
        });
        const partnerUserIds = partnerships
          .map((p) => (p.userId === userId ? p.receiverId : p.userId))
          .filter((id): id is number => id !== null);

        const conditions = [];
        if (groupIds.length > 0) {
          conditions.push({
            visibility: 'group',
            [Op.or]: groupIds.map((id) => sequelize.literal(`JSON_CONTAINS(group_ids, CAST(${id} AS JSON))`)),
          });
        }

        if (partnerUserIds.length > 0) {
          conditions.push({
            visibility: 'partner',
            userId: {
              [Op.in]: partnerUserIds
            },
            [Op.and]: [
              sequelize.literal(`JSON_CONTAINS(partner_ids, CAST(${userId} AS JSON))`)
            ]
          });
        }

        if (conditions.length === 0) {
          return reply.status(200).send({
            success: true,
            message: 'No shared victories found.',
            data: { items: [], page: 1, totalPages: 0 },
            statusCode: 200,
          });
        }

        const { count, rows } = await Victory.findAndCountAll({
          where: {
            [Op.or]: conditions,
          },
          limit,
          offset: (page - 1) * limit,
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: User,
              as: 'victoriousUser',
              attributes: ['id', 'username', 'avatar'],
            },
            {
              model: Group,
              as: 'groups',
              attributes: ['id', 'name', 'iconUrl'],
              through: { attributes: [] }, // Exclude join table attributes
            },
          ],
        });

        const response: IAPIResponse = {
          success: true,
          message: 'Shared victories retrieved successfully',
          data: {
            items: rows,
            page,
            totalPages: Math.ceil(count / limit),
          },
          statusCode: 200,
        };

        reply.status(200).send(response);
      } catch (error: any) {
        console.log({ error });
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to retrieve shared victories',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  // GET /victories/single/:id - Get a single victory
  fastify.get(
    '/victories/single/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requesterId = (request as AuthenticatedFastifyRequest).userId;
        const { id } = request.params;

        const victory = await Victory.findByPk(Number(id), {
          include: [
            {
              model: User,
              as: 'victoriousUser',
              attributes: ['id', 'username', 'avatar'],
            },
            {
              model: Group,
              as: 'groups',
              attributes: ['id', 'name', 'iconUrl'],
              through: { attributes: [] },
            },
          ],
        });

        if (victory) {
          let canView = false;
          if (victory.userId === requesterId) {
            canView = true;
          } else if (victory.visibility === 'public') {
            canView = true;
          } else if (
            victory.visibility === 'partner' &&
            victory.partnerIds?.includes(requesterId)
          ) {
            canView = true;
          } else if (victory.visibility === 'group' && victory.groupIds) {
            const isMember = await GroupMember.findOne({
              where: {
                userId: requesterId,
                groupId: { [Op.in]: victory.groupIds },
              },
            });
            if (isMember) {
              canView = true;
            }
          }

          if (canView) {
            const response: IAPIResponse = {
              success: true,
              message: 'Victory retrieved successfully',
              data: victory,
              statusCode: 200,
            };
            return reply.status(200).send(response);
          }
        }

        return reply.status(404).send({
          success: false,
          message: 'Victory not found',
          error:
            'The requested victory does not exist or you do not have permission to view it.',
          statusCode: 404,
        });
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to retrieve victory',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  // PATCH /victories/:id - Update a victory
  fastify.patch(
    '/victories/:id',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            body: { type: 'string' },
            visibility: { type: 'string', enum: ['private', 'partner', 'group', 'public'] },
            partnerIds: { type: 'array', items: { type: 'number' } },
            groupIds: { type: 'array', items: { type: 'number' } },
          },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const {
        title,
        body,
        visibility,
        partnerIds,
        groupIds,
      } = req.body as Partial<IVictory>;

      const victory = await Victory.findOne({ where: { id: parseInt(id), userId: (req as any).user.id } });
      if (!victory) return reply.status(404).send({ message: 'Victory not found' });

      const updates: Partial<IVictory> = {};
      if (title) updates.title = title;
      if (body) updates.body = body;
      if (visibility) updates.visibility = visibility;
      if (partnerIds) updates.partnerIds = partnerIds;
      if (groupIds) updates.groupIds = groupIds;

      await victory.update(updates);
       
    
      reply.status(200).send({
        success: true,
        message: 'Victory updated successfully',
        data: {
          ...victory.toJSON(),
          partnerIds: victory.partnerIds ?? [],
          groupIds: victory.groupIds ?? [],
        },
        statusCode: 200,
      });
    }
  );

  // DELETE /victories/:id - Delete a victory
  fastify.delete(
    '/victories/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const { id } = request.params;

        const victory = await Victory.findOne({ where: { id: Number(id), userId } });

        if (!victory) {
          const response: IAPIResponse = {
            success: false,
            message: 'Victory not found',
            error: 'The requested victory does not exist or you do not have permission to delete it.',
            statusCode: 404,
          };
          return reply.status(404).send(response);
        }

        await victory.destroy();

        const response: IAPIResponse = {
          success: true,
          message: 'Victory deleted successfully',
          statusCode: 204,
        };

        reply.status(204).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to delete victory',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  const createCommentSchema = {
    body: {
      type: 'object',
      required: ['body'],
      properties: {
        body: { type: 'string' },
        mentions: { type: 'array', items: { type: 'number' } },
        attachments: { type: 'array' },
      },
    },
  };

  fastify.post(
    '/checkins/:id/comments',
    { schema: createCommentSchema },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          body: string;
          mentions?: number[];
          attachments?: any[];
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const { id: targetId } = request.params;
        const { body, mentions, attachments } = request.body;

        const checkIn = await AccountabilityCheckIn.findByPk(Number(targetId));
        if (!checkIn) {
          const response: IAPIResponse = {
            success: false,
            message: 'Check-in not found',
            statusCode: 404,
          };
          return reply.status(404).send(response);
        }

        const comment = await AccountabilityComment.create({
          userId,
          targetType: 'checkin',
          targetId: Number(targetId),
          body,
          mentions: mentions ?? null,
          attachments: attachments ?? null,
        });

        const newlyUnlocked = await incrementCounter(userId, 'commentCount').then(() => evaluateAndUnlockAchievements(userId));

        if (checkIn.userId !== userId) {
          await PushQueue.sendNotification({
            type: 'checkin_commented',
            actorId: userId,
            targetUserId: checkIn.userId,
            title: 'New Comment on Your Check-in',
            body: `${(request as AuthenticatedFastifyRequest).user.username} has commented on your check-in.`,
            data: {
              checkInId: checkIn.id,
              commentId: comment.id,
            },
          });
        }

        const response: IAPIResponse = {
          success: true,
          message: 'Comment created successfully',
          data: { comment, newlyUnlocked },
          statusCode: 201,
        };

        reply.status(201).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to create comment',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  fastify.post(
    '/prayer-requests/:id/comments',
    { schema: createCommentSchema },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          body: string;
          mentions?: number[];
          attachments?: any[];
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const { id: targetId } = request.params;
        const { body, mentions, attachments } = request.body;

        const prayerRequest = await PrayerRequest.findByPk(Number(targetId));
        if (!prayerRequest) {
          const response: IAPIResponse = {
            success: false,
            message: 'Prayer request not found',
            statusCode: 404,
          };
          return reply.status(404).send(response);
        }

        const comment = await AccountabilityComment.create({
          userId,
          targetType: 'prayer_request',
          targetId: Number(targetId),
          body,
          mentions: mentions ?? null,
          attachments: attachments ?? null,
        });

        const newlyUnlocked = await incrementCounter(userId, 'commentCount').then(() => evaluateAndUnlockAchievements(userId));

        if (prayerRequest.userId !== userId) {
          await PushQueue.sendNotification({
            type: 'prayer_request_commented',
            actorId: userId,
            targetUserId: prayerRequest.userId,
            title: 'New Comment on Your Prayer Request',
            body: `${(request as AuthenticatedFastifyRequest).user.username} has commented on your prayer request.`,
            data: {
              prayerRequestId: prayerRequest.id,
              commentId: comment.id,
            },
          });
        }

        const response: IAPIResponse = {
          success: true,
          message: 'Comment created successfully',
          data: { comment, newlyUnlocked },
          statusCode: 201,
        };

        reply.status(201).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to create comment',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  fastify.post(
    '/victories/:id/comments',
    { schema: createCommentSchema },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          body: string;
          mentions?: number[];
          attachments?: any[];
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const { id: targetId } = request.params;
        const { body, mentions, attachments } = request.body;

        const victory = await Victory.findByPk(Number(targetId));
        if (!victory) {
          const response: IAPIResponse = {
            success: false,
            message: 'Victory not found',
            statusCode: 404,
          };
          return reply.status(404).send(response);
        }

        const comment = await AccountabilityComment.create({
          userId,
          targetType: 'victory',
          targetId: Number(targetId),
          body,
          mentions: mentions ?? null,
          attachments: attachments ?? null,
        });

        const newlyUnlocked = await incrementCounter(userId, 'commentCount').then(() => evaluateAndUnlockAchievements(userId));

        if (victory.userId !== userId) {
          await PushQueue.sendNotification({
            type: 'victory_commented',
            actorId: userId,
            targetUserId: victory.userId,
            title: 'New Comment on Your Victory',
            body: `${(request as AuthenticatedFastifyRequest).user.username} has commented on your victory.`,
            data: {
              victoryId: victory.id,
              commentId: comment.id,
            },
          });
        }

        const response: IAPIResponse = {
          success: true,
          message: 'Comment created successfully',
          data: { comment, newlyUnlocked },
          statusCode: 201,
        };

        reply.status(201).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to create comment',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  const getCommentsHandler = async (
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: {
        page?: number;
        limit?: number;
      };
    }>,
    reply: FastifyReply,
    targetType: 'checkin' | 'prayer_request' | 'victory'
  ) => {
    try {
      const { id: targetId } = request.params;
      const page = Number(request.query.page) || 1;
      const limit = Number(request.query.limit) || 10;

      const { count, rows } = await AccountabilityComment.findAndCountAll({
        where: { targetId: Number(targetId), targetType },
        limit,
        offset: (page - 1) * limit,
        order: [['createdAt', 'DESC']],
        include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
      });

      const response: IAPIResponse = {
        success: true,
        message: 'Comments retrieved successfully',
        data: {
          items: rows,
          page,
          totalPages: Math.ceil(count / limit),
        },
        statusCode: 200,
      };

      reply.status(200).send(response);
    } catch (error: any) {
      const response: IAPIResponse = {
        success: false,
        message: 'Failed to retrieve comments',
        error: error.message,
        statusCode: 500,
      };
      reply.status(500).send(response);
    }
  };

  fastify.get<{ Params: { id: string }; Querystring: { page?: number; limit?: number } }>('/checkins/:id/comments', (req, reply) => getCommentsHandler(req, reply, 'checkin'));
  fastify.get<{ Params: { id: string }; Querystring: { page?: number; limit?: number } }>('/prayer-requests/:id/comments', (req, reply) =>
    getCommentsHandler(req, reply, 'prayer_request')
  );
  fastify.get<{ Params: { id: string }; Querystring: { page?: number; limit?: number } }>('/victories/:id/comments', (req, reply) => getCommentsHandler(req, reply, 'victory'));

  // GET /checkins/streaks - Get user's check-in streaks
  fastify.get(
    '/checkins/streaks',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const checkIns = await AccountabilityCheckIn.findAll({
          where: { userId },
          order: [['createdAt', 'ASC']],
          attributes: ['createdAt'],
        });

        if (checkIns.length === 0) {
          return reply.status(200).send({
            success: true,
            message: 'No check-ins found for this user.',
            data: {
              currentStreak: 0,
              longestStreak: 0,
              streakDates: [],
            },
            statusCode: 200,
          });
        }

        let currentStreak = 0;
        let longestStreak = 0;
        let streakDates: Date[] = [];
        
        if (checkIns.length > 0 && checkIns[0]) {
            currentStreak = 1;
            longestStreak = 1;
            streakDates.push(checkIns[0].createdAt);
        }

        for (let i = 1; i < checkIns.length; i++) {
          const current = checkIns[i];
          const previous = checkIns[i - 1];
          if (!current || !previous) continue;
          const currentDate = new Date(current.createdAt);
          const previousDate = new Date(previous.createdAt);
          const diffTime = Math.abs(currentDate.getTime() - previousDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            currentStreak++;
            streakDates.push(current.createdAt);
          } else if (diffDays > 1) {
            if (currentStreak > longestStreak) {
              longestStreak = currentStreak;
            }
            currentStreak = 1;
            streakDates = [current.createdAt];
          }
        }
        
        if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
        }

        const response: IAPIResponse = {
          success: true,
          message: 'Streaks calculated successfully.',
          data: {
            currentStreak,
            longestStreak,
            streakDates,
          },
          statusCode: 200,
        };
        reply.status(200).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to calculate streaks.',
          error: error.message,
          statusCode: 500,
        };
        reply.status(500).send(response);
      }
    }
  );

  const deleteCommentHandler = async (
    request: FastifyRequest<{
      Params: { id: string; commentId: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = (request as AuthenticatedFastifyRequest).userId;
      const { commentId } = request.params;

      const comment = await AccountabilityComment.findOne({ where: { id: Number(commentId), userId } });

      if (!comment) {
        const response: IAPIResponse = {
          success: false,
          message: 'Comment not found',
          error: 'The requested comment does not exist or you do not have permission to delete it.',
          statusCode: 404,
        };
        return reply.status(404).send(response);
      }

      await comment.destroy();

      const response: IAPIResponse = {
        success: true,
        message: 'Comment deleted successfully',
        statusCode: 204,
      };

      reply.status(204).send(response);
    } catch (error: any) {
      const response: IAPIResponse = {
        success: false,
        message: 'Failed to delete comment',
        error: error.message,
        statusCode: 500,
      };
      reply.status(500).send(response);
    }
  };

  fastify.delete<{ Params: { id: string, commentId: string } }>('/checkins/:id/comments/:commentId', deleteCommentHandler);
  fastify.delete<{ Params: { id: string, commentId: string } }>('/prayer-requests/:id/comments/:commentId', deleteCommentHandler);
  fastify.delete<{ Params: { id: string, commentId: string } }>('/victories/:id/comments/:commentId', deleteCommentHandler);
}
