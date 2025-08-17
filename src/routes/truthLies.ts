import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { 
  getCommonLies, 
  saveTruthEntry, 
  getUserTruthEntries, 
  deleteTruthEntry,
  generateResponseToLie 
} from '../services/truthLiesService';
import { authenticate } from '../middleware/auth';

interface CreateTruthEntryBody {
  lie: string;
  biblicalTruth: string;
  explanation: string;
}

interface ListTruthEntriesQuery {
  isDefault?: boolean;
  search?: string;
}

interface TruthEntryParams {
  id: number;
}

interface GenerateResponseBody {
  lie: string;
}

export default async function truthLiesRoutes(fastify: FastifyInstance) {
  // Get common/default truth-lie entries
  fastify.get('/truth/lies/common', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const lies = await getCommonLies((request as any).userId);
        return reply.send({
          success: true,
          data: lies,
        });
      } catch (error) {
        console.error('Error fetching common lies:', error);
        return reply.status(500).send({
          success: false,
          message: 'Failed to fetch common lies',
        });
      }
    }
  });

  // Save new truth-lie entry
  fastify.post<{ Body: CreateTruthEntryBody }>('/truth/entries', {
    schema: {
      body: {
        type: 'object',
        required: ['lie', 'biblicalTruth', 'explanation'],
        properties: {
          lie: { type: 'string' },
          biblicalTruth: { type: 'string' },
          explanation: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate],
    handler: async (request: FastifyRequest<{ Body: CreateTruthEntryBody }>, reply: FastifyReply) => {
      try {
        const entry = await saveTruthEntry((request as any).userId, request.body);
        
        return reply.send({
          success: true,
          message: 'Truth entry saved successfully',
          data: entry,
        });
      } catch (error) {
        console.error('Error saving truth entry:', error);
        return reply.status(500).send({
          success: false,
          message: 'Failed to save truth entry',
        });
      }
    }
  });

  // List user's truth entries with optional filtering
  fastify.get<{ Querystring: ListTruthEntriesQuery }>('/truth/entries', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          isDefault: { type: 'boolean' },
          search: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate],
    handler: async (request: FastifyRequest<{ Querystring: ListTruthEntriesQuery }>, reply: FastifyReply) => {
      try {
        const entries = await getUserTruthEntries((request as any).userId, request.query);
        
        return reply.send({
          success: true,
          data: entries,
        });
      } catch (error) {
        console.error('Error fetching truth entries:', error);
        return reply.status(500).send({
          success: false,
          message: 'Failed to fetch truth entries',
        });
      }
    }
  });

  // Delete a truth entry
  fastify.delete<{ Params: TruthEntryParams }>('/truth/entries/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' },
        },
      },
    },
    preHandler: [authenticate],
    handler: async (request: FastifyRequest<{ Params: TruthEntryParams }>, reply: FastifyReply) => {
      try {
        await deleteTruthEntry((request as any).userId, request.params.id);
        
        return reply.send({
          success: true,
          message: 'Truth entry deleted successfully',
        });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Entry not found') {
            return reply.status(404).send({
              success: false,
              message: 'Truth entry not found',
            });
          }
          if (error.message === 'Cannot delete default entries') {
            return reply.status(403).send({
              success: false,
              message: 'Cannot delete default entries',
            });
          }
        }
        console.error('Error deleting truth entry:', error);
        return reply.status(500).send({
          success: false,
          message: 'Failed to delete truth entry',
        });
      }
    }
  });

  // Generate biblical response to a lie
  fastify.post<{ Body: GenerateResponseBody }>('/truth/generate-response-to-lie', {
    schema: {
      body: {
        type: 'object',
        required: ['lie'],
        properties: {
          lie: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate],
    handler: async (request: FastifyRequest<{ Body: GenerateResponseBody }>, reply: FastifyReply) => {
      try {
        const response = await generateResponseToLie(request.body.lie);
        
        return reply.send({
          success: true,
          data: response,
        });
      } catch (error) {
        console.error('Error generating response:', error);
        return reply.status(500).send({
          success: false,
          message: 'Failed to generate biblical response',
        });
      }
    }
  });
}
