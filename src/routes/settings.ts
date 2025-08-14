import { FastifyInstance } from 'fastify';
import { authenticate, AuthenticatedFastifyRequest } from '../middleware/auth';
import { GENERAL_SETTING_KEYS, getBooleanSetting, setBooleanSetting } from '../config/settings';

export default async function settingsRoutes(fastify: FastifyInstance) {
  // Get current settings
  fastify.get('/settings', { preHandler: [authenticate] }, async (request, reply) => {
    const settings = {
      enable_push_notifications: await getBooleanSetting(GENERAL_SETTING_KEYS.ENABLE_PUSH_NOTIFICATIONS, false),
      weekly_email_notifications: await getBooleanSetting(GENERAL_SETTING_KEYS.WEEKLY_EMAIL_NOTIFICATIONS, false),
    };
    return reply.send(settings);
  });

  // Update settings (partial)
  fastify.patch('/settings', { preHandler: [authenticate] }, async (request, reply) => {
    const body = request.body as Partial<{
      enable_push_notifications: boolean;
      weekly_email_notifications: boolean;
    }>;

    if (body.enable_push_notifications !== undefined) {
      await setBooleanSetting(GENERAL_SETTING_KEYS.ENABLE_PUSH_NOTIFICATIONS, Boolean(body.enable_push_notifications));
    }
    if (body.weekly_email_notifications !== undefined) {
      await setBooleanSetting(GENERAL_SETTING_KEYS.WEEKLY_EMAIL_NOTIFICATIONS, Boolean(body.weekly_email_notifications));
    }

    const settings = {
      enable_push_notifications: await getBooleanSetting(GENERAL_SETTING_KEYS.ENABLE_PUSH_NOTIFICATIONS, false),
      weekly_email_notifications: await getBooleanSetting(GENERAL_SETTING_KEYS.WEEKLY_EMAIL_NOTIFICATIONS, false),
    };

    return reply.send(settings);
  });
}


