import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import { authenticate, AuthenticatedFastifyRequest } from '../middleware/auth';
import { IAPIResponse } from '../types/auth';
import Panic from '../models/Panic';
import PanicReply from '../models/PanicReply';
import { PushQueue } from '../jobs/notificationJobs';
import AccountabilityPartner from '../models/AccountabilityPartner';
import { Op } from 'sequelize';
import Notification from '../models/Notification';

export default async function (fastify: FastifyInstance, options: FastifyPluginOptions) {
  fastify.addHook('preHandler', authenticate);

  // POST /panic - create a panic record and notify partners
  fastify.post(
    '/panic',
    async (
      request: FastifyRequest<{ Body: { message?: string | null } }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const { message } = request.body || {};

        const panic = await Panic.create({ userId, message: message ?? null });

        // Find accepted partners (where user is sender or receiver)
        const partners = await AccountabilityPartner.findAll({
          where: {
            usedAt: { [Op.not]: null },
            [Op.or]: [{ userId }, { receiverId: userId }],
          } as any,
        });

        

        const myId = userId;
        const counterpartIds = new Set<number>();
        for (const p of partners) {
          if (p.receiverId && p.userId === myId && p.receiverId !== myId) counterpartIds.add(p.receiverId);
          if (p.receiverId && p.receiverId === myId && p.userId !== myId) counterpartIds.add(p.userId);
        }

        const actorName = (request as AuthenticatedFastifyRequest).user?.username || 'Your partner';
        await Promise.all(
          Array.from(counterpartIds).map((targetUserId) =>
            PushQueue.sendNotification({
              type: 'panic_created',
              actorId: myId,
              targetUserId,
              title: 'Panic alert',
              body: `${actorName} is in panic mode${message ? `: "${message}"` : ''}`,
              data: { panicId: panic.id },
            })
          )
        );

        const response: IAPIResponse = {
          success: true,
          message: 'Panic created',
          data: panic,
          statusCode: 200,
        };
        return reply.status(200).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to create panic',
          error: error.message,
          statusCode: 500,
        };
        return reply.status(500).send(response);
      }
    }
  );

  // GET /panics/mine - list all panics created by the current user
  fastify.get(
    '/panics/mine',
    async (
      request: FastifyRequest<{ Querystring: { page?: string | number; limit?: string | number } }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const page = Math.max(parseInt(String(request.query?.page ?? '1'), 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(String(request.query?.limit ?? '20'), 10) || 20, 1), 100);

        const { rows, count } = await Panic.findAndCountAll({
          where: { userId },
          order: [['createdAt', 'DESC']],
          limit,
          offset: (page - 1) * limit,
          include: [{ association: 'user', attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'] }] as any,
        });

        const toPublicUser = (u: any) => (u ? { id: u.id, username: u.username, firstName: u.firstName, lastName: u.lastName, photoUrl: u.avatar ?? null } : undefined);
        const items = rows.map((p: any) => {
          const obj = p.toJSON();
          if (obj.user) obj.user = toPublicUser(obj.user);
          return obj;
        });

        const response: IAPIResponse = {
          success: true,
          message: 'Your panics',
          data: { items, page, totalPages: Math.ceil(count / limit) },
          statusCode: 200,
        };
        return reply.status(200).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to fetch your panics',
          error: error.message,
          statusCode: 500,
        };
        return reply.status(500).send(response);
      }
    }
  );

  // POST /panic/:id/replies - reply to a panic
  fastify.post(
    '/panic/:id/replies',
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: { message: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const panicId = Number(request.params.id);
        const { message } = request.body;

        if (!message || !message.trim()) {
          const response: IAPIResponse = {
            success: false,
            message: 'Validation failed',
            error: 'Message is required',
            statusCode: 400,
          };
          return reply.status(400).send(response);
        }

        const panic = await Panic.findByPk(panicId);
        if (!panic) {
          const response: IAPIResponse = {
            success: false,
            message: 'Panic not found',
            error: 'Invalid panic id',
            statusCode: 404,
          };
          return reply.status(404).send(response);
        }

        // Only the owner or an accepted partner can reply
        let canReply = panic.userId === userId;
        if (!canReply) {
          const relation = await AccountabilityPartner.findOne({
            where: {
              usedAt: { [Op.not]: null },
              [Op.or]: [
                { userId: panic.userId, receiverId: userId },
                { userId, receiverId: panic.userId },
              ],
            } as any,
          });
          canReply = !!relation;
        }

        if (!canReply) {
          const response: IAPIResponse = {
            success: false,
            message: 'Forbidden',
            error: 'You are not allowed to reply to this panic',
            statusCode: 403,
          };
          return reply.status(403).send(response);
        }

        const replyModel = await PanicReply.create({ panicId, userId, message });

        // Notify the panic owner
        await PushQueue.sendNotification({
          type: 'panic_replied',
          actorId: userId,
          targetUserId: panic.userId,
          title: 'Panic reply',
          body: `${(request as AuthenticatedFastifyRequest).user?.username || 'A partner'} replied to your panic`,
          data: { panicId: panic.id, replyId: replyModel.id },
        });

        const response: IAPIResponse = {
          success: true,
          message: 'Reply posted',
          data: replyModel,
          statusCode: 200,
        };
        return reply.status(200).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to post reply',
          error: error.message,
          statusCode: 500,
        };
        return reply.status(500).send(response);
      }
    }
  );

  // GET /panic/:id - get panic with replies
  fastify.get(
    '/panic/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const panicId = Number(request.params.id);

        const panic = await Panic.findByPk(panicId, {
          include: [
            { association: 'replies', include: [{ association: 'replier', attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'] }] } as any,
            { association: 'user', attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'] } as any,
          ],
        });

        if (!panic) {
          const response: IAPIResponse = {
            success: false,
            message: 'Panic not found',
            error: 'Invalid panic id',
            statusCode: 404,
          };
          return reply.status(404).send(response);
        }

        // Authorization: allow owner or their accepted partners to view
        const isOwner = panic.userId === userId;
        let allowed = isOwner;
        if (!allowed) {
          const partners = await AccountabilityPartner.findAll({
            where: {
              usedAt: { [Op.not]: null },
              [Op.or]: [
                { userId: panic.userId, receiverId: userId },
                { userId, receiverId: panic.userId },
              ],
            } as any,
          });
          for (const p of partners) {
            if (p.receiverId) {
              if ((p.userId === panic.userId && p.receiverId === userId) || (p.userId === userId && p.receiverId === panic.userId)) {
                allowed = true; break;
              }
            }
          }
        }

        if (!allowed) {
          const response: IAPIResponse = {
            success: false,
            message: 'Forbidden',
            error: 'You do not have access to this panic',
            statusCode: 403,
          };
          return reply.status(403).send(response);
        }

        const toPublicUser = (u: any) => (u ? { id: u.id, username: u.username, firstName: u.firstName, lastName: u.lastName, photoUrl: u.avatar ?? null } : undefined);
        const out = panic.toJSON() as any;
        if (out.user) out.user = toPublicUser(out.user);
        if (Array.isArray(out.replies)) out.replies = out.replies.map((r: any) => ({
          ...r,
          replier: toPublicUser(r.replier),
        }));

        const response: IAPIResponse = {
          success: true,
          message: 'Panic fetched',
          data: out,
          statusCode: 200,
        };
        return reply.status(200).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to fetch panic',
          error: error.message,
          statusCode: 500,
        };
        return reply.status(500).send(response);
      }
    }
  );

  // GET /panics/for-me - list panics where the user was notified (as a partner)
  fastify.get(
    '/panics/for-me',
    async (
      request: FastifyRequest<{ Querystring: { page?: string | number; limit?: string | number } }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
  const page = Math.max(parseInt(String(request.query?.page ?? '1'), 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(String(request.query?.limit ?? '20'), 10) || 20, 1), 100);
        const { rows: notes, count } = await Notification.findAndCountAll({
          where: { userId, type: 'panic_created' },
          order: [['createdAt', 'DESC']],
          limit,
          offset: (page - 1) * limit,
        });

        const orderedPairs = notes
          .map((n) => {
            const pid = (n.data as any)?.panicId as number | undefined;
            return pid ? ({ panicId: pid, notifiedAt: n.createdAt }) : null;
          })
          .filter((x): x is { panicId: number; notifiedAt: Date } => !!x);

        const panicIds = Array.from(new Set(orderedPairs.map((p) => p.panicId)));
        const notifiedAtMap = new Map<number, Date>();
        for (const p of orderedPairs) if (!notifiedAtMap.has(p.panicId)) notifiedAtMap.set(p.panicId, p.notifiedAt);

        let panics: any[] = [];
        if (panicIds.length > 0) {
          const found = await Panic.findAll({
            where: { id: { [Op.in]: panicIds } },
            include: [{ association: 'user', attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'] }] as any,
          });
          const byId = new Map<number, any>(found.map((p: any) => [p.id, p]));
          // Keep the order by notification createdAt
          const toPublicUser = (u: any) => (u ? { id: u.id, username: u.username, firstName: u.firstName, lastName: u.lastName, photoUrl: u.avatar ?? null } : undefined);
          panics = orderedPairs
            .map((p) => byId.get(p.panicId))
            .filter(Boolean)
            .map((p: any) => ({
              ...(() => { const o = p.toJSON(); if (o.user) o.user = toPublicUser(o.user); return o; })(),
              notifiedAt: (notifiedAtMap.get(p.id) as Date).toISOString(),
            }));
        }

        const response: IAPIResponse = {
          success: true,
          message: 'Panics notified to user',
          data: { items: panics, page, totalPages: Math.ceil(count / limit) },
          statusCode: 200,
        };
        return reply.status(200).send(response);
      } catch (error: any) {
        const response: IAPIResponse = {
          success: false,
          message: 'Failed to fetch panics',
          error: error.message,
          statusCode: 500,
        };
        return reply.status(500).send(response);
      }
    }
  );
}
