import { FastifyInstance } from 'fastify';
import { AccountabilityPartner, InvitationClick, User } from '../models';
import { PushQueue } from '../jobs/notificationJobs';
import { EmailQueueService } from '../jobs/emailJobs';
import { appConfig, securityConfig } from '../config/environment';
import {
  IMatchInstallRequest,
  IEmailTemplateData,
  IInviteUser,
} from '../types/auth';
import { Op } from 'sequelize';
import { authenticate, AuthenticatedFastifyRequest } from '../middleware/auth';
import { EmailService } from '../utils/email';
import { generateSecureToken } from '../utils/jwt';

export default async function inviteRoutes(fastify: FastifyInstance) {
  fastify.get('/invite/:inviteId', async (request, reply) => {
    const { inviteId } = request.params as { inviteId: string };
    const userAgent = request.headers['user-agent'] || 'Unknown';
    const ipAddress = request.ip;

    try {
      const invitation = await AccountabilityPartner.findOne({
        where: { hash: inviteId },
      });

      if (!invitation) {
        return reply.status(404).send({
          success: false,
          message: 'Invitation not found',
        });
      }

      await InvitationClick.create({
        invitationId: invitation.id,
        userAgent,
        ipAddress,
      });

      const appStoreUrl = appConfig.appStoreUrl;
      reply.redirect(appStoreUrl);
    } catch (error) {
      request.log.error('Error processing invitation link:', error);
      reply.status(500).send({
        success: false,
        message: 'An error occurred while processing the invitation link.',
      });
    }
  });

  fastify.post<{ Body: IMatchInstallRequest }>(
    '/invites/invitations/match-install',
    async (request, reply) => {
      const { deviceFingerprint } = request.body;
      const ipAddress = request.ip;
      
      // Prioritize fingerprint from the app, fall back to request header.
      const userAgentToMatch =
        deviceFingerprint && typeof deviceFingerprint.userAgent === 'string'
          ? deviceFingerprint.userAgent
          : request.headers['user-agent'] || 'Unknown';

      try {
        const matchWindow = new Date(
          Date.now() - securityConfig.inviteMatchWindowSeconds * 1000
        );

        const recentClick = await InvitationClick.findOne({
          where: {
            ipAddress,
            userAgent: {
              [Op.like]: `%${userAgentToMatch}%`,
            },
            createdAt: {
              [Op.gte]: matchWindow,
            },
          },
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: AccountabilityPartner,
              as: 'invitation',
              required: true,
            },
          ],
        });

        if (recentClick && recentClick.invitation) {
          reply.send({ inviteId: recentClick.invitation.hash });
        } else {
          reply.send({ inviteId: null });
        }
      } catch (error) {
        request.log.error('Error matching install:', error);
        reply.status(500).send({
          success: false,
          message: 'An error occurred while matching the installation.',
        });
      }
    }
  );

  fastify.post<{ Body: IInviteUser }>(
    '/invites/send-by-email',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { emails, hash, phoneNumber } = request.body;
      const { userId } = request as AuthenticatedFastifyRequest;

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return reply
          .status(400)
          .send({ success: false, message: 'Invalid emails' });
      }

      try {
        const invitingUser = await User.findByPk(userId);
        if (!invitingUser) {
          return reply
            .status(404)
            .send({ success: false, message: 'User not found' });
        }

        // Enforce feature lock: multiple_accountability_partners if user already has one
        const { countAcceptedPartners, requireFeatureUnlocked } = await import('../services/featureService');
        const partnersCount = await countAcceptedPartners(userId);
        if (partnersCount >= 1) {
          await requireFeatureUnlocked(userId, 'multiple_accountability_partners');
        }

        const emailService = new EmailService();
        const createdInvitations = await Promise.all(
          emails.map(async (email) => {
            // Check if the email belongs to a user that already has an active partnership with the current user
            const targetUser = await User.findOne({ where: { email } });
            if (targetUser) {
              // Check if there's already an active partnership between these users
              const existingPartnership = await AccountabilityPartner.findOne({
                where: {
                  [Op.or]: [
                    // Current user sent invite to target user (and it was accepted)
                    {
                      userId,
                      receiverId: targetUser.id,
                      usedAt: { [Op.not]: null }
                    },
                    // Target user sent invite to current user (and it was accepted)
                    {
                      userId: targetUser.id,
                      receiverId: userId,
                      usedAt: { [Op.not]: null }
                    }
                  ]
                }
              });

              if (existingPartnership) {
                throw new Error(`User with email ${email} is already your accountability partner`);
              }

              // Check if there's already a pending invitation to this user
              const pendingInvitation = await AccountabilityPartner.findOne({
                where: {
                  userId,
                  receiverId: null,
                  usedAt: null
                },
                include: [
                  {
                    model: User,
                    as: 'receiver',
                    where: { email },
                    required: false
                  }
                ]
              });

              if (pendingInvitation) {
                throw new Error(`You already have a pending invitation to ${email}`);
              }
            }

            const invitationHash = hash || generateSecureToken();
            const invitation = await AccountabilityPartner.create({
              userId,
              hash: invitationHash,
              phoneNumber: phoneNumber || null,
            }); 
            await EmailQueueService.addAccountabilityInviteEmailJob(
              email,
              `${invitingUser.firstName} ${invitingUser.lastName}`,
              invitationHash
            );
            return invitation;
          })
        );

        return reply.status(201).send({
          success: true,
          message: 'Invitations sent successfully',
          invitations: createdInvitations,
        });
      } catch (error: any) {
        request.log.error('Error sending invitations by email:', error);
        const status = (error?.statusCode === 403) ? 403 : 500;
        const msg = error?.code === 'FEATURE_LOCKED' ? error.message : 'Failed to send invitations';
        return reply.status(status).send({ success: false, message: msg });
      }
    }
  );

  // Get invites sent by the authenticated user
  fastify.get('/invites/sent', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request as AuthenticatedFastifyRequest;

    try {
      const invitations = await AccountabilityPartner.findAll({
        where: { userId },
        include: [
          {
            model: User,
            as: 'receiver',
            attributes: ['id', 'email', 'firstName', 'lastName'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      const items = invitations.map((invitation) => {
        const json = invitation.toJSON() as any;
        const receiver = json.receiver
          ? {
              id: json.receiver.id,
              email: json.receiver.email,
              firstName: json.receiver.firstName,
              lastName: json.receiver.lastName,
            }
          : null;
        return {
          id: invitation.id,
          hash: invitation.hash,
          receiver,
          usedAt: invitation.usedAt,
          createdAt: invitation.createdAt,
        };
      });

      return reply.send({ items });
    } catch (error) {
      request.log.error('Error fetching sent invites:', error);
      return reply.status(500).send({ items: [] });
    }
  });

  // Get invites received (accepted) by the authenticated user
  fastify.get('/invites/received', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request as AuthenticatedFastifyRequest;

    try {
      const invitations = await AccountabilityPartner.findAll({
        where: { receiverId: userId },
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'email', 'firstName', 'lastName'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      const items = invitations.map((invitation) => {
        const json = invitation.toJSON() as any;
        const sender = json.sender
          ? {
              id: json.sender.id,
              email: json.sender.email,
              firstName: json.sender.firstName,
              lastName: json.sender.lastName,
            }
          : null;
        return {
          id: invitation.id,
          hash: invitation.hash,
          sender,
          usedAt: invitation.usedAt,
          createdAt: invitation.createdAt,
        };
      });

      return reply.send({ items });
    } catch (error) {
      request.log.error('Error fetching received invites:', error);
      return reply.status(500).send({ items: [] });
    }
  });

  // Get established partners for the authenticated user
  fastify.get('/partners', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request as AuthenticatedFastifyRequest;

    try {
      const acceptedInvites = await AccountabilityPartner.findAll({
        where: {
          usedAt: { [Op.not]: null },
          [Op.or]: [{ userId }, { receiverId: userId }],
        },
        include: [
          { model: User, as: 'sender', attributes: ['id', 'email', 'firstName', 'lastName'] },
          { model: User, as: 'receiver', attributes: ['id', 'email', 'firstName', 'lastName'] },
        ],
        order: [['usedAt', 'DESC']],
      });

      const items = acceptedInvites.map((invitation) => {
        const json = invitation.toJSON() as any;
        const partnerUser = json.sender && json.sender.id === userId ? json.receiver : json.sender;
        const partner = partnerUser
          ? {
              id: partnerUser.id,
              email: partnerUser.email,
              firstName: partnerUser.firstName,
              lastName: partnerUser.lastName,
            }
          : null;
        return {
          id: invitation.id,
          since: invitation.usedAt ?? invitation.createdAt,
          phoneNumber: invitation.phoneNumber,
          partner,
        };
      });

      return reply.send({ items });
    } catch (error) {
      request.log.error('Error fetching partners:', error);
      return reply.status(500).send({ items: [] });
    }
  });

  // Get phone numbers of all partners the authenticated user is accountable to
  fastify.get('/partners/phones', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request as AuthenticatedFastifyRequest;

    try {
      const acceptedInvites = await AccountabilityPartner.findAll({
        where: {
          usedAt: { [Op.not]: null },
          [Op.or]: [{ userId }, { receiverId: userId }],
          phoneNumber: { [Op.not]: null }, // Only get partnerships with phone numbers
        },
        attributes: ['id', 'phoneNumber', 'userId', 'receiverId', 'usedAt'],
        include: [
          { model: User, as: 'sender', attributes: ['id', 'email', 'firstName', 'lastName'] },
          { model: User, as: 'receiver', attributes: ['id', 'email', 'firstName', 'lastName'] },
        ],
        order: [['usedAt', 'DESC']],
      });

      const phoneNumbers = acceptedInvites
        .map((invitation) => {
          const json = (invitation.toJSON ? invitation.toJSON() : (invitation as any)) as any;
          const partnerUser = json.sender && json.sender.id === userId ? json.receiver : json.sender;
          const name = partnerUser
            ? [partnerUser.firstName, partnerUser.lastName].filter(Boolean).join(' ').trim()
            : null;
          return {
            partnerId: invitation.id,
            phoneNumber: invitation.phoneNumber,
            name,
            email: partnerUser ? partnerUser.email : null,
          };
        })
        .filter(item => !!item.phoneNumber); // Extra filter to ensure no null values

      return reply.send({ 
        success: true,
        message: 'Partner phone numbers retrieved successfully',
        data: {
          phoneNumbers,
          count: phoneNumbers.length
        },
        statusCode: 200
      });
    } catch (error) {
      request.log.error('Error fetching partner phone numbers:', error);
      return reply.status(500).send({ 
        success: false,
        message: 'Failed to retrieve partner phone numbers',
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500
      });
    }
  });

  // Revoke an invitation by ID (only by sender and only if not yet used)
  fastify.post('/invites/invitations/:id/revoke', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request as AuthenticatedFastifyRequest;

    try {
      const invitation = await AccountabilityPartner.findByPk(Number(id));

      if (!invitation || invitation.userId !== userId) {
        return reply.status(404).send({ success: false, message: 'Invitation not found' });
      }

      if (invitation.usedAt || invitation.receiverId) {
        return reply.status(409).send({ success: false, message: 'Invitation already used and cannot be revoked' });
      }

      await invitation.destroy();
      return reply.status(204).send();
    } catch (error) {
      request.log.error('Error revoking invitation:', error);
      return reply.status(500).send({ success: false, message: 'Failed to revoke invitation' });
    }
  });

  // Save an invitation hash for the authenticated user (create pending invitation)
  fastify.post<{ Body: { hash: string; phoneNumber?: string } }>('/invites/invitations', { preHandler: [authenticate] }, async (request, reply) => {
    const { hash, phoneNumber } = request.body || ({} as any);
    const { userId } = request as AuthenticatedFastifyRequest;

    if (!hash || typeof hash !== 'string' || hash.trim().length === 0) {
      return reply.status(400).send({ success: false, message: 'Invalid hash' });
    }

    try {
      const existing = await AccountabilityPartner.findOne({ where: { hash } });
      if (existing) {
        if (existing.userId === userId && !existing.usedAt && !existing.receiverId) {
          return reply.status(200).send({ id: existing.id, hash: existing.hash, phoneNumber: existing.phoneNumber });
        }
        return reply.status(409).send({ success: false, message: 'Invitation hash already in use' });
      }

      const created = await AccountabilityPartner.create({ 
        userId, 
        hash,
        phoneNumber: phoneNumber || null 
      });
      return reply.status(201).send({ id: created.id, hash: created.hash, phoneNumber: created.phoneNumber });
    } catch (error) {
      request.log.error('Error saving invitation hash:', error);
      return reply.status(500).send({ success: false, message: 'Failed to save invitation hash' });
    }
  });

  // Accept an invitation using its hash
  fastify.post('/invites/invitations/:hash/accept', { preHandler: [authenticate] }, async (request, reply) => {
    const { hash } = request.params as { hash: string };
    const { userId } = request as AuthenticatedFastifyRequest;

    if (!hash || typeof hash !== 'string' || hash.trim().length === 0) {
      return reply.status(400).send({ success: false, message: 'Invalid hash' });
    }

    try {
      const invitation = await AccountabilityPartner.findOne({ where: { hash } });
      if (!invitation) {
        return reply.status(404).send({ success: false, message: 'Invitation not found' });
      }

      if (invitation.userId === userId) {
        return reply.status(400).send({ success: false, message: 'Cannot accept your own invitation' });
      }

      if (invitation.receiverId || invitation.usedAt) {
        return reply.status(409).send({ success: false, message: 'Invitation already used' });
      }

      // Check if there's already an active partnership between these users
      const existingPartnership = await AccountabilityPartner.findOne({
        where: {
          [Op.or]: [
            // Current user sent invite to invitation sender (and it was accepted)
            {
              userId,
              receiverId: invitation.userId,
              usedAt: { [Op.not]: null }
            },
            // Invitation sender sent invite to current user (and it was accepted)
            {
              userId: invitation.userId,
              receiverId: userId,
              usedAt: { [Op.not]: null }
            }
          ]
        }
      });

      if (existingPartnership) {
        return reply.status(409).send({ success: false, message: 'You already have an active partnership with this user' });
      }

      // Enforce feature lock: multiple_accountability_partners if user already has one
      const { countAcceptedPartners, requireFeatureUnlocked } = await import('../services/featureService');
      const partnersCount = await countAcceptedPartners(userId);
      if (partnersCount >= 1) {
        await requireFeatureUnlocked(userId, 'multiple_accountability_partners');
      }

      invitation.receiverId = userId;
      invitation.usedAt = new Date();
      await invitation.save();

      // Notify the sender that their accountability invite was accepted
      await PushQueue.sendNotification({
        type: 'accountability_invite_accepted',
        targetUserId: invitation.userId,
        title: 'Your accountability invite was accepted',
        body: '',
        data: { invitationId: invitation.id, purpose: 'accountability' },
      });

      // Return a minimal summary
      const updated = await AccountabilityPartner.findByPk(invitation.id, {
        include: [
          { model: User, as: 'sender', attributes: ['id', 'email', 'firstName', 'lastName'] },
          { model: User, as: 'receiver', attributes: ['id', 'email', 'firstName', 'lastName'] },
        ],
      });

      const json = updated?.toJSON() as any;
      return reply.status(200).send({
        id: updated?.id,
        hash: updated?.hash,
        usedAt: updated?.usedAt,
        sender: json?.sender || null,
        receiver: json?.receiver || null,
      });
    } catch (error: any) {
      request.log.error('Error accepting invitation:', error);
      const status = (error?.statusCode === 403) ? 403 : 500;
      const msg = error?.code === 'FEATURE_LOCKED' ? error.message : 'Failed to accept invitation';
      return reply.status(status).send({ success: false, message: msg });
    }
  });

  fastify.post('/invites/accept-by-code', { preHandler: [authenticate] }, async (request, reply) => {
    const { code } = request.body as { code: string };
    const { userId } = request as AuthenticatedFastifyRequest;

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return reply
        .status(400)
        .send({ success: false, message: 'Invalid code' });
    }

    try {
      const invitation = await AccountabilityPartner.findOne({
        where: { hash: code },
      });
      if (!invitation) {
        return reply
          .status(404)
          .send({ success: false, message: 'Invitation not found' });
      }

      if (invitation.userId === userId) {
        return reply
          .status(400)
          .send({ success: false, message: 'Cannot accept your own invitation' });
      }

      if (invitation.receiverId || invitation.usedAt) {
        return reply
          .status(409)
          .send({ success: false, message: 'Invitation already used' });
      }

      // Check if there's already an active partnership between these users
      const existingPartnership = await AccountabilityPartner.findOne({
        where: {
          [Op.or]: [
            // Current user sent invite to invitation sender (and it was accepted)
            {
              userId,
              receiverId: invitation.userId,
              usedAt: { [Op.not]: null }
            },
            // Invitation sender sent invite to current user (and it was accepted)
            {
              userId: invitation.userId,
              receiverId: userId,
              usedAt: { [Op.not]: null }
            }
          ]
        }
      });

      if (existingPartnership) {
        return reply
          .status(409)
          .send({ success: false, message: 'You already have an active partnership with this user' });
      }

      // Enforce feature lock: multiple_accountability_partners if user already has one
      const { countAcceptedPartners, requireFeatureUnlocked } = await import('../services/featureService');
      const partnersCount = await countAcceptedPartners(userId);
      if (partnersCount >= 1) {
        await requireFeatureUnlocked(userId, 'multiple_accountability_partners');
      }

      invitation.receiverId = userId;
      invitation.usedAt = new Date();
      await invitation.save();

      await PushQueue.sendNotification({
        type: 'accountability_invite_accepted',
        targetUserId: invitation.userId,
        title: 'Your accountability invite was accepted',
        body: '',
        data: { invitationId: invitation.id, purpose: 'accountability' },
      });

      const updated = await AccountabilityPartner.findByPk(invitation.id, {
        include: [
          { model: User, as: 'sender', attributes: ['id', 'email', 'firstName', 'lastName'] },
          { model: User, as: 'receiver', attributes: ['id', 'email', 'firstName', 'lastName'] },
        ],
      });

      const json = updated?.toJSON() as any;
      return reply.status(200).send({
        id: updated?.id,
        hash: updated?.hash,
        usedAt: updated?.usedAt,
        sender: json?.sender || null,
        receiver: json?.receiver || null,
      });
    } catch (error: any) {
      request.log.error('Error accepting invitation by code:', error);
      const status = (error?.statusCode === 403) ? 403 : 500;
      const msg = error?.code === 'FEATURE_LOCKED' ? error.message : 'Failed to accept invitation';
      return reply.status(status).send({ success: false, message: msg });
    }
  });
}

