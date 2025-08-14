import { FastifyInstance } from 'fastify';
import { authenticate, AuthenticatedFastifyRequest } from '../middleware/auth';
import Notification from '../models/Notification';

export default async function notificationsRoutes(fastify: FastifyInstance) {
  // List notifications
  fastify.get('/notifications', { preHandler: [authenticate] }, async (request, reply) => {
    const { page = '1', limit = '20' } = (request.query as any) || {};
    const currentPage = Math.max(parseInt(String(page), 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
    const { userId } = request as AuthenticatedFastifyRequest;

    const { rows, count } = await Notification.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
    });

    const items = rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body ?? undefined,
      data: n.data ?? undefined,
      readAt: n.readAt ? n.readAt.toISOString() : undefined,
      createdAt: n.createdAt.toISOString(),
    }));

    return reply.send({ items, page: currentPage, totalPages: Math.ceil(count / pageSize) });
  });

  // Mark one as read
  fastify.post('/notifications/:id/read', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const n = await Notification.findOne({ where: { id: Number(id), userId } });
    if (!n) return reply.status(404).send({ success: false, message: 'Not found', statusCode: 404 });
    n.readAt = new Date();
    await n.save();
    return reply.status(204).send();
  });

  // Mark all as read
  fastify.post('/notifications/read-all', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request as AuthenticatedFastifyRequest;
    await Notification.update({ readAt: new Date() } as any, { where: { userId, readAt: null } });
    return reply.status(204).send();
  });
}


