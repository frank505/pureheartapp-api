import { FastifyInstance } from 'fastify';
import { AccountabilityPartner, InvitationClick, User } from '../models';
import { PushQueue } from '../jobs/notificationJobs';
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

        const emailService = new EmailService();
        const createdInvitations = await Promise.all(
          emails.map(async (email) => {
            const invitationHash = hash || generateSecureToken();
            const invitation = await AccountabilityPartner.create({
              userId,
              hash: invitationHash,
              phoneNumber: phoneNumber || null,
            });
            await emailService.sendAccountabilityInviteEmail(
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
      } catch (error) {
        request.log.error('Error sending invitations by email:', error);
        return reply
          .status(500)
          .send({ success: false, message: 'Failed to send invitations' });
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
    } catch (error) {
      request.log.error('Error accepting invitation:', error);
      return reply.status(500).send({ success: false, message: 'Failed to accept invitation' });
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
    } catch (error) {
      request.log.error('Error accepting invitation by code:', error);
      return reply
        .status(500)
        .send({ success: false, message: 'Failed to accept invitation' });
    }
  });
}

