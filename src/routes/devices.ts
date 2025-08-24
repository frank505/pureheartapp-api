import { FastifyInstance } from 'fastify';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth';
import { IAPIResponse } from '../types/auth';
import DeviceToken from '../models/DeviceToken';

export default async function devicesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // List current user's device tokens
  fastify.get('/devices', async (request, reply) => {
    const userId = (request as any).userId as number;
    const tokens = await DeviceToken.findAll({ where: { userId }, order: [['updatedAt', 'DESC']] });
    return reply.status(200).send({ success: true, message: 'OK', statusCode: 200, data: tokens.map(t => ({ id: t.id, platform: (t as any).platform, token: (t as any).token, isActive: (t as any).isActive, lastActiveAt: (t as any).lastActiveAt, updatedAt: (t as any).updatedAt })) });
  });

  fastify.post('/devices/register', async (request, reply) => {
    const userId = (request as any).userId as number;
    const { token, platform } = (request.body as any) || {};
    if (!token || !platform || !['ios', 'android'].includes(platform)) {
      const response: IAPIResponse = { success: false, message: 'Invalid payload', statusCode: 400 };
      return reply.status(400).send(response);
    }

    const existing = await DeviceToken.findOne({ where: { userId, token } });
    if (existing) {
      (existing as any).platform = platform;
      (existing as any).isActive = true;
      (existing as any).lastActiveAt = new Date();
      await existing.save();
    } else {
      await DeviceToken.create({ userId, token, platform, isActive: true, lastActiveAt: new Date() } as any);
    }

    const response: IAPIResponse = { success: true, message: 'Device registered', statusCode: 200 };
    return reply.status(200).send(response);
  });

  // Deactivate a specific token (e.g., on logout)
  fastify.post('/devices/deactivate', async (request, reply) => {
    const userId = (request as any).userId as number;
    const { token } = (request.body as any) || {};
    if (!token) return reply.status(400).send({ success: false, message: 'token required', statusCode: 400 });
    const existing = await DeviceToken.findOne({ where: { userId, token } });
    if (!existing) return reply.status(404).send({ success: false, message: 'Not found', statusCode: 404 });
    (existing as any).isActive = false;
    await existing.save();
    return reply.status(200).send({ success: true, message: 'Deactivated', statusCode: 200 });
  });

  // Delete a device token by id
  fastify.delete('/devices/:id', async (request, reply) => {
    const userId = (request as any).userId as number;
    const id = Number((request.params as any).id);
    if (!id) return reply.status(400).send({ success: false, message: 'Invalid id', statusCode: 400 });
    const existing = await DeviceToken.findOne({ where: { id, userId } });
    if (!existing) return reply.status(404).send({ success: false, message: 'Not found', statusCode: 404 });
    await existing.destroy();
    return reply.status(200).send({ success: true, message: 'Deleted', statusCode: 200 });
  });

  // Cleanup: delete inactive tokens older than N days for this user
  fastify.delete('/devices/inactive', async (request, reply) => {
    const userId = (request as any).userId as number;
    const olderThanDays = Number((request.query as any)?.olderThanDays ?? 60);
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const count = await DeviceToken.destroy({ where: { userId, isActive: false, updatedAt: { [Op.lt]: cutoff } } as any });
    return reply.status(200).send({ success: true, message: 'Cleanup done', statusCode: 200, data: { deleted: count } });
  });
}
