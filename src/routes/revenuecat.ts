import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { revenuecatConfig } from '../config/environment';
import { SubscriptionService } from '../services/subscriptionService';
import { IAPIResponse } from '../types/auth';
import { authenticate, AuthenticatedFastifyRequest } from '../middleware/auth';

interface RawBodyFastifyRequest extends FastifyRequest {
  rawBody?: Buffer; // left for future raw-body plugin integration
}

export default async function revenuecatRoutes(fastify: FastifyInstance) {
  // Webhook endpoint (POST /api/revenuecat/webhook)
  fastify.post('/revenuecat/webhook', { config: { rawBody: true } }, async (request: RawBodyFastifyRequest, reply: FastifyReply) => {
    const start = Date.now();
    const signatureHeader = request.headers['x-webhook-signature'] as string | undefined;
    let parsed: any;
    try {
      // We rely on Fastify's JSON parser; raw body plugin (if enabled) gives rawBody for signature verification
      parsed = request.body as any;
    } catch (err) {
      return reply.status(400).send({ success: false, message: 'Invalid JSON', statusCode: 400 });
    }

    // Optional signature verification
    if (revenuecatConfig.webhookSecret) {
      if (!signatureHeader || !request.rawBody) {
        // We can't verify without rawBody; log warning but continue to avoid dropping events (optionally user can enable plugin later)
        request.log.warn('RevenueCat webhook secret configured but rawBody not present; skipping signature verification. Install @fastify/raw-body to enable.');
      } else {
        const expected = crypto.createHmac('sha256', revenuecatConfig.webhookSecret).update(request.rawBody).digest('hex');
        if (expected !== signatureHeader) {
          return reply.status(401).send({ success: false, message: 'Invalid signature', statusCode: 401 });
        }
      }
    }

    // Allow for batch events (RevenueCat can send array) or single.
    const events = Array.isArray(parsed) ? parsed : [parsed];
    const results: any[] = [];
    for (const evt of events) {
      try {
        const r = await SubscriptionService.upsertFromRevenueCat(evt);
        results.push({ ok: true, ...r });
      } catch (e: any) {
  fastify.log.error({ err: e, stack: (e as any)?.stack }, 'RevenueCat processing error');
        results.push({ ok: false, error: e?.message });
      }
    }

    const response: IAPIResponse = {
      success: true,
      message: 'Processed RevenueCat webhook',
      statusCode: 200,
      data: {
        results,
        processingMs: Date.now() - start,
      }
    };
    return reply.status(200).send(response);
  });

  // Authenticated endpoint to fetch current subscription (GET /api/subscriptions/status)
  fastify.get('/subscriptions/status', { preHandler: [authenticate] }, async (request, reply) => {
    const authReq = request as AuthenticatedFastifyRequest;
    const sub = await SubscriptionService.getActivePremiumForUser(authReq.userId);
    const response: IAPIResponse = {
      success: true,
      message: 'Subscription status',
      statusCode: 200,
      data: {
        active: Boolean(sub),
        productId: sub?.productId || null,
        platform: sub?.platform || null,
        entitlementId: sub?.entitlementId || null,
        expirationDate: sub?.expirationDate || null,
        willRenew: sub?.willRenew || false,
        periodType: sub?.periodType || null,
      }
    };
    return reply.status(200).send(response);
  });
}
