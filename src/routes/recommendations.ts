import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate, AuthenticatedFastifyRequest } from '../middleware/auth';
import DailyRecommendation from '../models/DailyRecommendation';

export default async function recommendationsRoutes(fastify: FastifyInstance) {
  // Get today's recommendation for the authenticated user
  fastify.get('/recommendations/today', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request as AuthenticatedFastifyRequest;
    const tz = (request.headers['x-user-timezone'] as string) || 'UTC';
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = formatter.formatToParts(now);
    const yyyy = parts.find(p => p.type === 'year')?.value || '1970';
    const mm = parts.find(p => p.type === 'month')?.value || '01';
    const dd = parts.find(p => p.type === 'day')?.value || '01';
    const localDate = `${yyyy}-${mm}-${dd}`;

    const rec = await DailyRecommendation.findOne({ where: { userId, localDate }, order: [['createdAt', 'DESC']] });
    if (!rec) return reply.status(404).send({ success: false, message: 'Recommendation not available yet', statusCode: 404 });
     console.log({rec});
    return reply.send({
      success: true,
      message: 'OK',
      statusCode: 200,
      data: {
        id: rec.id,
        localDate: rec.localDate,
        bibleVersion: rec.bibleVersion ?? undefined,
        scriptureReference: rec.scriptureReference ?? undefined,
        scriptureText: rec.scriptureText ?? undefined,
        youtube: rec.youtubeUrl ? {
          url: rec.youtubeUrl,
          videoId: rec.youtubeVideoId ?? undefined,
          title: rec.youtubeTitle ?? undefined,
          channelId: rec.youtubeChannelId ?? undefined,
          channelTitle: rec.youtubeChannelTitle ?? undefined,
        } : undefined,
      }
    });
  });

  // Paginated history
  fastify.get('/recommendations/history', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request as AuthenticatedFastifyRequest;
    const { page = '1', limit = '20' } = (request.query as any) || {};
    const currentPage = Math.max(parseInt(String(page), 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);

    const { rows, count } = await DailyRecommendation.findAndCountAll({
      where: { userId },
      order: [['localDate', 'DESC']],
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
    });

    const items = rows.map(rec => ({
      id: rec.id,
      localDate: rec.localDate,
      bibleVersion: rec.bibleVersion ?? undefined,
      scriptureReference: rec.scriptureReference ?? undefined,
      youtube: rec.youtubeUrl ? {
        url: rec.youtubeUrl,
        title: rec.youtubeTitle ?? undefined,
      } : undefined,
      createdAt: rec.createdAt?.toISOString(),
    }));

    return reply.send({ items, page: currentPage, totalPages: Math.ceil(count / pageSize) });
  });

  fastify.post('/recommendations/generate', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request as AuthenticatedFastifyRequest;
    const tz = (request.headers['x-user-timezone'] as string) || 'UTC';
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = formatter.formatToParts(now);
    const yyyy = parts.find(p => p.type === 'year')?.value || '1970';
    const mm = parts.find(p => p.type === 'month')?.value || '01';
    const dd = parts.find(p => p.type === 'day')?.value || '01';
    const localDate = `${yyyy}-${mm}-${dd}`;

    const { enqueueGenerateDailyRecommendation } = await import('../jobs/recommendationJobs');
    await enqueueGenerateDailyRecommendation({ userId, localDate, timezone: tz });

    return reply.status(202).send({ success: true, message: 'Recommendation generation job enqueued.' });
  });
}


