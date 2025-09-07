import { FastifyInstance } from 'fastify';
import { authenticate, AuthenticatedFastifyRequest } from '../middleware/auth';
import { getUserFirsts, setFirstFlag } from '../services/userFirstsService';

export default async function userFirstsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /user/firsts - fetch flags
  fastify.get('/user/firsts', async (request, reply) => {
    const userId = (request as AuthenticatedFastifyRequest).userId;
    const firsts = await getUserFirsts(userId);
    return reply.send({
      success: true,
      message: 'OK',
      statusCode: 200,
      data: {
        has_created_fast: firsts.hasCreatedFast,
        has_created_private_community: firsts.hasCreatedPrivateCommunity,
        has_joined_reddit: firsts.hasJoinedReddit,
        has_added_a_partner: firsts.hasAddedAPartner,
        has_made_a_prayer_request: firsts.hasMadeAPrayerRequest,
        has_shared_a_victory: firsts.hasSharedAVictory,
        has_shared_with_a_friend: firsts.hasSharedWithAFriend,
      },
    });
  });

  // POST /user/firsts/shared-with-friend - mark flag
  fastify.post('/user/firsts/shared-with-friend', async (request, reply) => {
    const userId = (request as AuthenticatedFastifyRequest).userId;
    await setFirstFlag(userId, 'hasSharedWithAFriend');
    return reply.status(204).send();
  });

  // POST /user/firsts/joined-reddit - mark flag
  fastify.post('/user/firsts/joined-reddit', async (request, reply) => {
    const userId = (request as AuthenticatedFastifyRequest).userId;
    await setFirstFlag(userId, 'hasJoinedReddit');
    return reply.status(204).send();
  });
}
