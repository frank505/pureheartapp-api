import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authenticate } from '../middleware/auth';
import AIChatSession from '../models/AIChatSession';
import AIChatMessage from '../models/AIChatMessage';
import { AIChatService } from '../services/aiChatService';
import { requireLLMAccess, paywallResponse } from '../services/accessControlService';

interface PaginatedQuery { page?: string; limit?: string; }
const parsePagination = (request: FastifyRequest) => {
  const { page = '1', limit = '20' } = (request.query as any) || {} as PaginatedQuery;
  const currentPage = Math.max(parseInt(String(page), 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
  return { currentPage, pageSize, offset: (currentPage - 1) * pageSize };
};

export default async function aiChatRoutes(fastify: FastifyInstance) {
  // Basic in-memory throttling per user for AI endpoints (fallback if Redis rate limit is elsewhere)
  const lastCall: Map<number, number> = new Map();
  const THROTTLE_MS = 2000;

  // List sessions for user
  fastify.get('/ai/sessions', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = (request as any).userId as number;
    const now = Date.now();
    if (lastCall.has(userId) && now - (lastCall.get(userId) || 0) < THROTTLE_MS) {
      reply.header('Retry-After', Math.ceil((THROTTLE_MS - (now - (lastCall.get(userId) || 0))) / 1000).toString());
      return reply.status(429).send({ success: false, message: 'Too many requests', statusCode: 429 });
    }
    lastCall.set(userId, now);
    const { currentPage, pageSize, offset } = parsePagination(request);

    const { rows, count } = await AIChatSession.findAndCountAll({
      where: { userId },
      limit: pageSize,
      offset,
      order: [['lastActivityAt', 'DESC']],
    } as any);

    const items = rows.map((s) => ({
      id: s.id,
      title: s.title || 'Untitled',
      archived: s.archived,
      lastActivityAt: s.lastActivityAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return reply.send({ items, page: currentPage, totalPages: Math.ceil(count / pageSize) });
  });

  // Get messages of a session
  fastify.get('/ai/sessions/:id/messages', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = (request as any).userId as number;
    const now = Date.now();
    if (lastCall.has(userId) && now - (lastCall.get(userId) || 0) < THROTTLE_MS) {
      reply.header('Retry-After', Math.ceil((THROTTLE_MS - (now - (lastCall.get(userId) || 0))) / 1000).toString());
      return reply.status(429).send({ success: false, message: 'Too many requests', statusCode: 429 });
    }
    lastCall.set(userId, now);
    const { id } = request.params as { id: string };
    const { currentPage, pageSize, offset } = parsePagination(request);

    const session = await AIChatSession.findOne({ where: { id: Number(id), userId } });
    if (!session) return reply.status(404).send({ success: false, message: 'Session not found', statusCode: 404 });

    const { rows, count } = await AIChatMessage.findAndCountAll({
      where: { sessionId: session.id },
      limit: pageSize,
      offset,
      order: [['createdAt', 'ASC']],
    } as any);

    const items = rows.map((m) => ({ id: m.id, role: m.role, content: m.content, safetyFlag: m.safetyFlag, createdAt: m.createdAt.toISOString() }));

    return reply.send({ items, page: currentPage, totalPages: Math.ceil(count / pageSize) });
  });

  // Create a new session or continue existing by posting a user message; AI replies
  fastify.post('/ai/message', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = (request as any).userId as number;
    const { sessionId, message } = request.body as { sessionId?: number; message: string };
    const now = Date.now();
    if (lastCall.has(userId) && now - (lastCall.get(userId) || 0) < THROTTLE_MS) {
      reply.header('Retry-After', Math.ceil((THROTTLE_MS - (now - (lastCall.get(userId) || 0))) / 1000).toString());
      return reply.status(429).send({ success: false, message: 'Too many requests', statusCode: 429 });
    }
    lastCall.set(userId, now);

    if (!message || typeof message !== 'string') {
      return reply.status(400).send({ success: false, message: 'Message is required', statusCode: 400 });
    }

    let session: AIChatSession | null = null;

    if (sessionId) {
      session = await AIChatSession.findOne({ where: { id: sessionId, userId } });
      if (!session) return reply.status(404).send({ success: false, message: 'Session not found', statusCode: 404 });
    } else {
      // Title from first user message (truncated)
      const title = message.trim().slice(0, 80);
      session = await AIChatSession.create({ userId, title, archived: false, metadata: null });
    }

    // Persist user message
    await AIChatMessage.create({ sessionId: session.id, role: 'user', content: message });

    // Build short rolling history (last 20)
    const recent = await AIChatMessage.findAll({ where: { sessionId: session.id }, order: [['createdAt', 'ASC']], limit: 20 });
    const history = recent.map((m) => ({ role: m.role as 'user'|'assistant'|'system', content: m.content }));

    // Access control
    const access = await requireLLMAccess(userId, 'ai_chat');
    if (!access.allowed) {
      return reply.status(402).send(paywallResponse('ai_chat', access.trialEndsAt));
    }
    // Generate AI reply
    const ai = await AIChatService.generateReply(userId, message, history);

    // Persist AI message
    const aiMsg = await AIChatMessage.create({ sessionId: session.id, role: 'assistant', content: ai.content, safetyFlag: !!ai.safetyFlag });

    // Update session last activity
    session.lastActivityAt = new Date();
    if (!session.title || session.title.trim().length === 0) {
      session.title = message.trim().slice(0, 80);
    }
    await session.save();

    return reply.send({ session: { id: session.id, title: session.title, lastActivityAt: session.lastActivityAt.toISOString() }, message: { id: aiMsg.id, role: aiMsg.role, content: aiMsg.content, createdAt: aiMsg.createdAt.toISOString() } });
  });

  // Streamed chatbot endpoint using Server-Sent Events
  fastify.post('/ai/message/stream', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = (request as any).userId as number;
    const { sessionId, message } = request.body as { sessionId?: number; message: string };
    if (!message || typeof message !== 'string') {
      return reply.status(400).send({ success: false, message: 'Message is required', statusCode: 400 });
    }

    const now = Date.now();
    if (lastCall.has(userId) && now - (lastCall.get(userId) || 0) < THROTTLE_MS) {
      reply.header('Retry-After', Math.ceil((THROTTLE_MS - (now - (lastCall.get(userId) || 0))) / 1000).toString());
      return reply.status(429).send({ success: false, message: 'Too many requests', statusCode: 429 });
    }
    lastCall.set(userId, now);

  let session: AIChatSession | null = null;
    if (sessionId) {
      session = await AIChatSession.findOne({ where: { id: sessionId, userId } });
      if (!session) return reply.status(404).send({ success: false, message: 'Session not found', statusCode: 404 });
    } else {
      const title = message.trim().slice(0, 80);
      session = await AIChatSession.create({ userId, title, archived: false, metadata: null });
    }

    await AIChatMessage.create({ sessionId: session.id, role: 'user', content: message });
    const access = await requireLLMAccess(userId, 'ai_chat');
    if (!access.allowed) {
      // Immediately finish SSE with paywall event
      reply.header('Content-Type', 'application/json');
      return reply.status(402).send(paywallResponse('ai_chat', access.trialEndsAt));
    }
    const recent = await AIChatMessage.findAll({ where: { sessionId: session.id }, order: [['createdAt', 'ASC']], limit: 20 });
    const history = recent.map((m) => ({ role: m.role as 'user'|'assistant'|'system', content: m.content }));

    // SSE headers
    reply.header('Content-Type', 'text/event-stream');
    reply.header('Cache-Control', 'no-cache');
    reply.header('Connection', 'keep-alive');
    reply.raw.write(`event: open\n` + `data: {"ok":true,"sessionId":${session.id}}\n\n`);

    let full = '';
    try {
      const result = await AIChatService.generateReplyStream(userId, message, history, (delta) => {
        full += delta;
        const safe = delta.replace(/\n/g, '\\n');
        reply.raw.write(`event: delta\n` + `data: {"text":"${safe}"}\n\n`);
      });

      const aiMsg = await AIChatMessage.create({ sessionId: session.id, role: 'assistant', content: full, safetyFlag: !!result.safetyFlag });
      session.lastActivityAt = new Date();
      if (!session.title || session.title.trim().length === 0) session.title = message.trim().slice(0, 80);
      await session.save();

      reply.raw.write(`event: done\n` + `data: {"messageId":${aiMsg.id}}\n\n`);
      reply.raw.end();
    } catch (err: any) {
      const msg = (err?.message || 'AI error').replace(/\n/g, ' ');
      reply.raw.write(`event: error\n` + `data: {"error":"${msg}"}\n\n`);
      reply.raw.end();
    }
  });

  // Rename session
  fastify.patch('/ai/sessions/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = (request as any).userId as number;
    const { id } = request.params as { id: string };
    const { title, archived } = request.body as { title?: string; archived?: boolean };
    const session = await AIChatSession.findOne({ where: { id: Number(id), userId } });
    if (!session) return reply.status(404).send({ success: false, message: 'Session not found', statusCode: 404 });
    if (title !== undefined) session.title = title?.trim().slice(0, 200) || null;
    if (archived !== undefined) session.archived = !!archived;
    await session.save();
    return reply.send({ id: session.id, title: session.title, archived: session.archived, lastActivityAt: session.lastActivityAt.toISOString() });
  });

  // Delete session and all messages
  fastify.delete('/ai/sessions/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = (request as any).userId as number;
    const { id } = request.params as { id: string };
    const session = await AIChatSession.findOne({ where: { id: Number(id), userId } });
    if (!session) return reply.status(404).send({ success: false, message: 'Session not found', statusCode: 404 });

    // Delete all messages first (paranoid: true means soft delete)
    await AIChatMessage.destroy({ where: { sessionId: session.id }, force: true });
    // Then delete session (force: true for hard delete)
    await session.destroy({ force: true });

    return reply.status(204).send();
  });
}
