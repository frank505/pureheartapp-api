import { FastifyInstance } from 'fastify';
import { optionalAuthenticate } from '../middleware/auth';
import { IAPIResponse } from '../types/auth';
import Fast from '../models/Fast';

export default async function widgetRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', optionalAuthenticate);

  fastify.get('/widget/data', async (request, reply) => {
    const userId = (request as any).userId as number | undefined;
    let activeFast: any = null;
    let streak = 0;
    let verse = { reference: 'John 8:36', text: 'So if the Son sets you free, you will be free indeed.' };

    if (userId) {
      const now = new Date();
      const fast = await Fast.findOne({ where: { userId, status: 'active' }, order: [['startTime', 'DESC']] });
      if (fast) {
        const totalMs = fast.endTime.getTime() - fast.startTime.getTime();
        const remainingMs = Math.max(0, fast.endTime.getTime() - now.getTime());
        const totalHours = Math.round((totalMs / 3600000) * 10) / 10;
        const doneHours = Math.round(((totalMs - remainingMs) / 3600000) * 10) / 10;
        const progress = totalHours > 0 ? Math.round(((doneHours / totalHours) * 100) * 10) / 10 : 0;
        const nextPrayer = (fast.prayerTimes || []).find(t => {
          const parts = t.split(':');
          const hh = Number(parts[0] ?? 0);
          const mm = Number(parts[1] ?? 0);
          const local = new Date(now);
          local.setHours(hh, mm, 0, 0);
          return local > now;
        }) || (fast.prayerTimes || [])[0] || null;
        activeFast = { id: fast.id, type: fast.type, progress, timeRemaining: `PT${Math.floor(remainingMs / 3600000)}H${Math.floor((remainingMs % 3600000) / 60000)}M`, nextPrayer };
      }
      // Simple placeholder streak until we compute real streaks
      streak = 0;
      if (activeFast && activeFast.progress === 100) streak = 1;
    }

    const response: IAPIResponse = { success: true, message: 'Widget data', statusCode: 200, data: { activeFast, streak, verse } };
    return reply.status(200).send(response);
  });
}
