import { FastifyInstance } from 'fastify';
import WaitingList from '../models/WaitingList';
import { isValidEmail, sanitizeInput } from '../utils/validation';
import { EmailQueueService } from '../jobs/emailJobs';

export default async function waitingListRoutes(fastify: FastifyInstance) {
  fastify.post('/save-waiting-list', async (request, reply) => {
    try {
      const { email } = request.body as { email?: string };

      if (!email || typeof email !== 'string') {
        return reply.status(400).send({ success: false, message: 'Email is required' });
      }

      const normalizedEmail = sanitizeInput(email).toLowerCase();
      if (!isValidEmail(normalizedEmail)) {
        return reply.status(400).send({ success: false, message: 'Invalid email format' });
      }

      // Upsert-like behavior: create if not exists
      let record = await WaitingList.findOne({ where: { email: normalizedEmail } });
      if (!record) {
        record = await WaitingList.create({ email: normalizedEmail });
      }

      // Schedule an amazing email in 30 minutes (delay in ms)
      await EmailQueueService.addWaitingListThankYouEmail(normalizedEmail, 30 * 60 * 1000);

      return reply.status(201).send({
        success: true,
        message: 'Email saved to waiting list. We will reach out soon.',
        data: { email: normalizedEmail }
      });
    } catch (error) {
  request.log.error({ err: error }, 'Error saving waiting list email');
      return reply.status(500).send({ success: false, message: 'Failed to save waiting list email' });
    }
  });
}
