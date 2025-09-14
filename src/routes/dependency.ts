import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { assessDependency, DependencyAssessmentInput } from '../services/dependencyAssessmentService';
import { authenticate } from '../middleware/auth';
import { requireLLMAccess, paywallResponse } from '../services/accessControlService';

interface AssessBody extends DependencyAssessmentInput {}

export default async function dependencyRoutes(fastify: FastifyInstance) {
	// Public endpoint (no auth) to assess porn dependency between 40-100% via LLM
	fastify.post('/dependency/assess', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		const body = (request.body as AssessBody) || {};

		if (!body.narrative && !body.answers) {
			return reply.status(400).send({ success: false, message: 'Provide narrative or answers', statusCode: 400 });
		}

		try {
			const userId = (request as any).userId as number;
			const access = await requireLLMAccess(userId, 'dependency_assessment');
			if (!access.allowed) {
				return reply.status(402).send(paywallResponse('dependency_assessment', access.trialEndsAt));
			}
			const result = await assessDependency(body);
			return reply.send({
				success: true,
				message: 'OK',
				statusCode: 200,
				data: { score: result.score, reasoning: result.reasoning }
			});
		} catch (err: any) {
			request.log.error('dependency assess error', err);
			return reply.status(500).send({ success: false, message: 'Internal error', statusCode: 500, error: err?.message });
		}
	});
}

