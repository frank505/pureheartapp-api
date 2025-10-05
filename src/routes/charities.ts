import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../middleware/auth';
import CharityOrganization from '../models/CharityOrganization';

/**
 * Charity Routes
 * Handles charity organization endpoints for donation selection
 */
export default async function charityRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  // Apply authentication to all routes
  fastify.addHook('preHandler', authenticate);

  /**
   * @route GET /charities
   * @desc Get list of verified charity organizations for user selection
   * @access Private
   */
  fastify.get('/charities', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const charities = await CharityOrganization.findAll({
        where: { 
          isVerified: true,
          isActive: true 
        },
        attributes: [
          'id',
          'name', 
          'category',
          'description',
          'website',
          'missionStatement',
          'ein'
        ],
        order: [['name', 'ASC']]
      });

      return reply.status(200).send({
        success: true,
        message: 'Verified charity organizations retrieved successfully',
        data: {
          charities,
          count: charities.length
        }
      });

    } catch (error) {
      console.error('Error fetching charities:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to fetch charity organizations',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @route GET /charities/:id
   * @desc Get detailed information about a specific charity organization
   * @access Private
   */
  fastify.get<{
    Params: { id: string };
  }>('/charities/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const charity = await CharityOrganization.findOne({
        where: { 
          id: parseInt(id),
          isVerified: true,
          isActive: true 
        }
      });

      if (!charity) {
        return reply.status(404).send({
          success: false,
          message: 'Charity organization not found'
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Charity organization details retrieved successfully',
        data: { charity }
      });

    } catch (error) {
      console.error('Error fetching charity details:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to fetch charity details',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}