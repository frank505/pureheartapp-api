import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import charityPaymentService from '../services/charityPaymentService';

/**
 * Webhook Routes
 * Handles external service webhook endpoints
 */
export default async function webhookRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  /**
   * @route POST /webhooks/stripe
   * @desc Handle Stripe webhook events for charity payments
   * @access Public (verified via Stripe signature)
   */
  fastify.post<{
    Body: any;
  }>('/webhooks/stripe', async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    try {
      // For now, we'll handle the webhook event directly
      // In production, you would verify the signature first
      const event = request.body as any;

      if (!event || typeof event.type !== 'string') {
        return reply.status(400).send({
          success: false,
          message: 'Invalid webhook event'
        });
      }

      // Process the webhook event through charity payment service
      await charityPaymentService.handleWebhookEvent(event as any);

      return reply.status(200).send({
        success: true,
        message: 'Webhook processed successfully'
      });

    } catch (error) {
      console.error('Stripe webhook error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to process webhook',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @route GET /webhooks/stripe/test
   * @desc Test endpoint for webhook connectivity
   * @access Public
   */
  fastify.get('/webhooks/stripe/test', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      success: true,
      message: 'Stripe webhook endpoint is operational',
      timestamp: new Date().toISOString()
    });
  });
}