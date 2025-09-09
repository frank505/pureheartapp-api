import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate, AuthenticatedFastifyRequest } from '../middleware/auth';
import DailyReflection from '../models/DailyReflection';
import { enqueueGenerateWeeklyReflections } from '../jobs/reflectionJobs';

export default async function reflectionsRoutes(fastify: FastifyInstance) {
  fastify.get('/reflections/today', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request as AuthenticatedFastifyRequest;
    const tz = (request.headers['x-user-timezone'] as string) || 'UTC';
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = fmt.formatToParts(new Date());
    const yyyy = parts.find(p => p.type === 'year')?.value || '1970';
    const mm = parts.find(p => p.type === 'month')?.value || '01';
    const dd = parts.find(p => p.type === 'day')?.value || '01';
    const localDate = `${yyyy}-${mm}-${dd}`;

    const items = await DailyReflection.findAll({ where: { userId, displayDate: localDate }, order: [['orderInDay', 'ASC']] });
    if (!items.length) {
      // If none exist for today, enqueue job to generate the next 7 days starting today
      try {
        await enqueueGenerateWeeklyReflections({ userId, timezone: tz, startDate: localDate });
      } catch (err) {
        request.log.error({ err }, 'Failed to enqueue weekly reflections generation');
      }
      return {
        success: true,
        message: 'No reflections scheduled for today. Generation has been scheduled.',
        statusCode: 200,
        data: []
      };
    }

    return reply.send({
      success: true,
      message: 'OK',
      statusCode: 200,
      data: items.map(r => ({
        id: r.id,
        displayDate: r.displayDate,
        order: r.orderInDay,
        title: r.title ?? undefined,
        body: r.body,
        scriptureReference: r.scriptureReference ?? undefined,
        scriptureText: r.scriptureText ?? undefined,
      }))
    });
  });
}
