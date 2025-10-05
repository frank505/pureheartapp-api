import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import commitmentService from '../services/commitmentService';
import {
  ICreateCommitmentRequest,
  IReportRelapseRequest,
  ISubmitProofRequest,
  IVerifyProofRequest,
  ActionCategory,
  ActionDifficulty,
  CommitmentStatus,
  ProofMediaType,
} from '../types/commitment';
import { IAPIResponse } from '../types/auth';
import { authenticate, AuthenticatedFastifyRequest } from '../middleware/auth';
import { uploadScreenshotImage } from '../services/screenshotStorageService';

/**
 * Commitment Routes
 * Handles all action commitment system endpoints
 */

export default async function commitmentRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  // Apply authentication to all routes
  fastify.addHook('preHandler', authenticate);
  // Create a new commitment
  fastify.post<{
    Body: ICreateCommitmentRequest;
  }>(
    '/commitments',
    async (request: FastifyRequest<{ Body: ICreateCommitmentRequest }>, reply: FastifyReply) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;

        const data: ICreateCommitmentRequest = {
          ...request.body as any,
          userId,
        };

        const result = await commitmentService.createCommitment(data);
        return reply.code(201).send(result);
      } catch (error: any) {
        fastify.log.error('Error creating commitment:', error);
        return reply.code(400).send({
          success: false,
          message: error.message || 'Failed to create commitment',
        });
      }
    }
  );

  // Get user's commitments
  fastify.get<{
    Querystring: {
      status?: CommitmentStatus;
    };
  }>(
    '/commitments',
    async (request: FastifyRequest<{ Querystring: { status?: CommitmentStatus } }>, reply: FastifyReply) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const { status } = request.query;
        const commitments = await commitmentService.getUserCommitments(userId, status);

        return reply.send({
          success: true,
          data: commitments,
        });
      } catch (error: any) {
        fastify.log.error('Error fetching commitments:', error);
        return reply.code(500).send({
          success: false,
          message: 'Failed to fetch commitments',
        });
      }
    }
  );

  // Get a specific commitment by ID
  fastify.get<{
    Params: {
      id: string;
    };
  }>(
    '/commitments/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const commitmentId = parseInt(request.params.id);
        const commitment = await commitmentService.getCommitmentById(commitmentId);

        if (!commitment) {
          return reply.code(404).send({
            success: false,
            message: 'Commitment not found',
          });
        }

        // Check if user has access to this commitment
        if (commitment.userId !== userId && commitment.partnerId !== userId) {
          return reply.code(403).send({
            success: false,
            message: 'You do not have access to this commitment',
          });
        }

        return reply.send({
          success: true,
          data: commitment,
        });
      } catch (error: any) {
        fastify.log.error('Error fetching commitment:', error);
        return reply.code(500).send({
          success: false,
          message: 'Failed to fetch commitment',
        });
      }
    }
  );

  // Report a relapse
  fastify.post<{
    Params: {
      id: string;
    };
    Body: IReportRelapseRequest;
  }>(
    '/commitments/:id/report-relapse',
    async (request: FastifyRequest<{ Params: { id: string }; Body: IReportRelapseRequest }>, reply: FastifyReply) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const commitmentId = parseInt(request.params.id);
        const data: IReportRelapseRequest = {
          ...(request.body as any),
          userId,
        };

        const result = await commitmentService.reportRelapse(commitmentId, data);
        return reply.send(result);
      } catch (error: any) {
        fastify.log.error('Error reporting relapse:', error);
        return reply.code(400).send({
          success: false,
          message: error.message || 'Failed to report relapse',
        });
      }
    }
  );

  // Submit proof of action completion
  fastify.post<{
    Params: {
      id: string;
    };
    Body: {
      mediaType?: ProofMediaType;
      mediaBase64?: string; // Base64-encoded media
      mimeType?: string; // e.g., 'image/jpeg', 'video/mp4'
      userNotes?: string;
      capturedAt?: string;
      latitude?: number;
      longitude?: number;
    };
  }>(
    '/commitments/:id/submit-proof',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          mediaType?: ProofMediaType;
          mediaBase64?: string;
          mimeType?: string;
          userNotes?: string;
          capturedAt?: string;
          latitude?: number;
          longitude?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const commitmentId = parseInt(request.params.id);
        const { mediaBase64, mimeType, mediaType, userNotes, capturedAt, latitude, longitude } = request.body;

        // Validate required fields
        if (!mediaBase64) {
          return reply.code(400).send({
            success: false,
            message: 'Media file (base64) is required',
          });
        }

        // Upload to S3
        const buffer = Buffer.from(mediaBase64, 'base64');
        const uploadResult = await uploadScreenshotImage({
          userId,
          buffer,
          mimeType: mimeType || 'image/jpeg',
          prefix: 'action-proofs', // Store in action-proofs folder instead of screenshots
        });

        const mediaFile = {
          url: uploadResult.publicUrl || `storage://${uploadResult.storageKey}`,
          thumbnailUrl: uploadResult.publicUrl || `storage://${uploadResult.storageKey}`, // TODO: Generate actual thumbnail for videos
          storageKey: uploadResult.storageKey,
        };

        // Prepare proof data
        const proofData: ISubmitProofRequest = {
          userId,
          mediaType: mediaType || ProofMediaType.PHOTO,
          capturedAt: capturedAt || new Date().toISOString(),
        };

        if (userNotes) {
          proofData.userNotes = userNotes;
        }

        if (latitude !== undefined) {
          (proofData as any).latitude = latitude;
        }
        if (longitude !== undefined) {
          (proofData as any).longitude = longitude;
        }

        const result = await commitmentService.submitProof(commitmentId, mediaFile, proofData);
        return reply.send(result);
      } catch (error: any) {
        fastify.log.error('Error submitting proof:', error);
        return reply.code(400).send({
          success: false,
          message: error.message || 'Failed to submit proof',
        });
      }
    }
  );

  // Verify proof (partner verification)
  fastify.post<{
    Params: {
      id: string;
    };
    Body: IVerifyProofRequest;
  }>(
    '/commitments/:id/verify-proof',
    async (request: FastifyRequest<{ Params: { id: string }; Body: IVerifyProofRequest }>, reply: FastifyReply) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const commitmentId = parseInt(request.params.id);
        const data: IVerifyProofRequest = {
          ...(request.body as any),
          partnerId: userId,
        };

        const result = await commitmentService.verifyProof(commitmentId, data);
        return reply.send(result);
      } catch (error: any) {
        fastify.log.error('Error verifying proof:', error);
        return reply.code(400).send({
          success: false,
          message: error.message || 'Failed to verify proof',
        });
      }
    }
  );

  // Check deadline status
  fastify.get<{
    Params: {
      id: string;
    };
  }>(
    '/commitments/:id/check-deadline',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const commitmentId = parseInt(request.params.id);
        const commitment = await commitmentService.getCommitmentById(commitmentId);

        if (!commitment) {
          return reply.code(404).send({
            success: false,
            message: 'Commitment not found',
          });
        }

        if (commitment.userId !== userId) {
          return reply.code(403).send({
            success: false,
            message: 'Unauthorized',
          });
        }

        const now = new Date();
        const deadline = commitment.actionDeadline;
        const deadlinePassed = deadline ? now > deadline : false;

        if (deadlinePassed && deadline) {
          const hoursOverdue = Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60));

          return reply.send({
            success: true,
            deadlinePassed: true,
            data: {
              commitmentId: commitment.id,
              status: commitment.status,
              actionDeadline: deadline.toISOString(),
              now: now.toISOString(),
              hoursOverdue,
              options: [
                {
                  type: 'late_completion',
                  title: 'Complete it anyway',
                  description: 'Upload proof late (partial credit)',
                  available: true,
                },
                {
                  type: 'pay_alternative',
                  title: 'Donate to skip',
                  description: 'Pay $50 to charity instead',
                  amount: 5000,
                  available: true,
                },
                {
                  type: 'accept_failure',
                  title: 'Accept incomplete',
                  description: 'Mark commitment as failed',
                  impactOnStreak: true,
                },
              ],
            },
          });
        }

        return reply.send({
          success: true,
          deadlinePassed: false,
          data: {
            commitmentId: commitment.id,
            status: commitment.status,
            actionDeadline: deadline?.toISOString(),
            now: now.toISOString(),
          },
        });
      } catch (error: any) {
        fastify.log.error('Error checking deadline:', error);
        return reply.code(500).send({
          success: false,
          message: 'Failed to check deadline',
        });
      }
    }
  );

  // Get all available actions
  fastify.get<{
    Querystring: {
      category?: ActionCategory;
      difficulty?: ActionDifficulty;
    };
  }>('/actions', async (request, reply: FastifyReply) => {
    try {
      const { category, difficulty } = request.query;
      const actions = await commitmentService.getActions(category, difficulty);

      return reply.send({
        success: true,
        data: actions,
      });
    } catch (error: any) {
      fastify.log.error('Error fetching actions:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch actions',
      });
    }
  });

  // Get a specific action by ID
  fastify.get<{
    Params: {
      id: string;
    };
  }>('/actions/:id', async (request, reply: FastifyReply) => {
    try {
      const actionId = parseInt(request.params.id);
      const action = await commitmentService.getActionById(actionId);

      if (!action) {
        return reply.code(404).send({
          success: false,
          message: 'Action not found',
        });
      }

      return reply.send({
        success: true,
        data: action,
      });
    } catch (error: any) {
      fastify.log.error('Error fetching action:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch action',
      });
    }
  });

  // Get user service statistics
  fastify.get<{
    Params: {
      userId: string;
    };
    Querystring: {
      timeframe?: string;
    };
  }>(
    '/users/:userId/service-stats',
    async (request: FastifyRequest<{ Params: { userId: string }; Querystring: { timeframe?: string } }>, reply: FastifyReply) => {
      try {
        const requestedUserId = parseInt(request.params.userId);
        const currentUserId = (request as AuthenticatedFastifyRequest).userId;

        // Users can only view their own stats (unless admin feature added later)
        if (currentUserId !== requestedUserId) {
          return reply.code(403).send({
            success: false,
            message: 'You can only view your own statistics',
          });
        }

        const { timeframe } = request.query;
        const result = await commitmentService.getUserServiceStats(requestedUserId, timeframe);

        return reply.send(result);
      } catch (error: any) {
        fastify.log.error('Error fetching service stats:', error);
        return reply.code(500).send({
          success: false,
          message: 'Failed to fetch service statistics',
        });
      }
    }
  );

  // Get redemption wall (public feed)
  fastify.get<{
    Querystring: {
      limit?: number;
      offset?: number;
      category?: ActionCategory;
      sortBy?: string;
    };
  }>('/redemption-wall', async (request, reply: FastifyReply) => {
    try {
      const { limit = 20, offset = 0, category, sortBy = 'recent' } = request.query;
      const result = await commitmentService.getRedemptionWall(limit, offset, category, sortBy);

      return reply.send(result);
    } catch (error: any) {
      fastify.log.error('Error fetching redemption wall:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch redemption wall',
      });
    }
  });

  // Get partner verification requests
  fastify.get(
    '/partner/verification-requests',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as AuthenticatedFastifyRequest).userId;
        const requests = await commitmentService.getPartnerVerificationRequests(userId);

        return reply.send({
          success: true,
          data: requests,
        });
      } catch (error: any) {
        fastify.log.error('Error fetching verification requests:', error);
        return reply.code(500).send({
          success: false,
          message: 'Failed to fetch verification requests',
        });
      }
    }
  );

  fastify.log.info('Commitment routes registered');
}
