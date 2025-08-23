import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authenticate } from '../middleware/auth';
import { analyzeBreathe } from '../services/breatheService';

interface AnalyzeBody {
  text: string; // how the user feels
  cycles?: number; // number of breathing cycles to generate overlays for
  bibleVersion?: string; // e.g. 'web', 'kjv'
}

export default async function breatheRoutes(fastify: FastifyInstance) {
  fastify.post('/breathe/analyze', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { text, cycles, bibleVersion } = (request.body as AnalyzeBody) || {};

    if (!text || typeof text !== 'string' || text.trim().length < 2) {
      return reply.status(400).send({ success: false, message: 'text is required', statusCode: 400 });
    }

    try {
      const opts: any = {};
      if (typeof cycles === 'number') opts.cycles = cycles;
      if (typeof bibleVersion === 'string' && bibleVersion) opts.bibleVersion = bibleVersion;
      const result = await analyzeBreathe(text.trim(), opts);

  return reply.send({
        success: true,
        message: 'OK',
        statusCode: 200,
        data: result,
      });
    } catch (err: any) {
      request.log.error('breathe/analyze error:', err);
      return reply.status(500).send({ success: false, message: 'Internal error', error: err?.message || 'error', statusCode: 500 });
    }
  });
}
