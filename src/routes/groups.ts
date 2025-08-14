import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Op, WhereOptions } from 'sequelize';
import { authenticate, AuthenticatedFastifyRequest, optionalAuthenticate } from '../middleware/auth';
import { Group, GroupInvite, GroupJoinRequest, GroupMember, Message, MessageAttachment, MessageRead, User } from '../models';
import { generateUniqueGroupInviteCode } from '../utils/invite';
import { PushQueue } from '../jobs/notificationJobs';
import Notification from '../models/Notification';
import { IAPIResponse } from '../types/auth';

const parsePagination = (request: FastifyRequest) => {
  const { page = '1', limit = '20' } = (request.query as any) || {};
  const currentPage = Math.max(parseInt(String(page), 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
  return { currentPage, pageSize, offset: (currentPage - 1) * pageSize };
};

const toUserRef = (user: User) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
});

export default async function groupRoutes(fastify: FastifyInstance) {
  // Create group (supports initial invites via emails[] and optional inviteCode)
  fastify.post('/groups', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request as AuthenticatedFastifyRequest;
    const { name, description, privacy, emails, inviteCode } = request.body as { name: string; description?: string; privacy: 'public' | 'private'; emails?: string[]; inviteCode?: string };

    if (!name || !privacy) {
      return reply.status(400).send({ success: false, message: 'Missing required fields', statusCode: 400 });
    }

    const created = await Group.create({ name, description: description || null, privacy, ownerId: userId, inviteCode: inviteCode || null });
    // Add owner as member
    await GroupMember.create({ groupId: created.id, userId, role: 'owner' });

    // Queue invite emails if provided
    if (Array.isArray(emails) && emails.length) {
      const validEmails = emails.filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
      const codeToUse = created.inviteCode || (await generateUniqueGroupInviteCode());
      if (!created.inviteCode) {
        created.inviteCode = codeToUse;
        await created.save();
      }
      for (const e of validEmails) {
        await GroupInvite.create({ groupId: created.id, email: e, status: 'pending' });
        // minimal send; email send handled by email worker
        const { EmailQueueService } = await import('../jobs/emailJobs');
        await EmailQueueService.getEmailQueueStats(); // ensure queue exists
        // dynamically import queue service to avoid circular
        (await import('../jobs/emailJobs')).EmailQueueService.addGroupInviteEmailJob?.(e, created.name, codeToUse).catch(() => {});
      }
    }

    const response = {
      id: created.id,
      name: created.name,
      description: created.description ?? undefined,
      privacy: created.privacy,
      iconUrl: created.iconUrl ?? undefined,
      ownerId: created.ownerId,
      membersCount: created.membersCount,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };

    return reply.status(201).send(response);
  });

  // Public discovery list
  fastify.get('/groups', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const { currentPage, pageSize, offset } = parsePagination(request);
    const where: WhereOptions = { privacy: 'public' };
    const { rows, count } = await Group.findAndCountAll({ where, limit: pageSize, offset, order: [['createdAt', 'DESC']] });
    const items = rows.map((g) => ({
      id: g.id, name: g.name, description: g.description ?? undefined, privacy: g.privacy, iconUrl: g.iconUrl ?? undefined, ownerId: g.ownerId, membersCount: g.membersCount, createdAt: g.createdAt.toISOString(), updatedAt: g.updatedAt.toISOString(),
    }));
    return reply.send({ items, page: currentPage, totalPages: Math.ceil(count / pageSize) });
  });

  // My groups
  fastify.get('/groups/mine', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request as AuthenticatedFastifyRequest;
    const { currentPage, pageSize, offset } = parsePagination(request);
    const { rows, count } = await Group.findAndCountAll({
      include: [{ model: User, as: 'members', through: { attributes: [] }, where: { id: userId }, required: true }],
      limit: pageSize,
      offset,
      order: [['updatedAt', 'DESC']],
    } as any);
    const items = rows.map((g) => ({ id: g.id, name: g.name, description: g.description ?? undefined, privacy: g.privacy, iconUrl: g.iconUrl ?? undefined, ownerId: g.ownerId, membersCount: g.membersCount, createdAt: g.createdAt.toISOString(), updatedAt: g.updatedAt.toISOString() }));
    return reply.send({ items, page: currentPage, totalPages: Math.ceil(count / pageSize) });
  });

  // Search groups (public only)
  fastify.get('/groups/search', async (request, reply) => {
    const { q = '' } = request.query as any;
    const { currentPage, pageSize, offset } = parsePagination(request);
    const where: WhereOptions = { privacy: 'public', name: { [Op.like]: `%${q}%` } } as any;
    const { rows, count } = await Group.findAndCountAll({ where, limit: pageSize, offset, order: [['membersCount', 'DESC']] });
    const items = rows.map((g) => ({ id: g.id, name: g.name, description: g.description ?? undefined, privacy: g.privacy, iconUrl: g.iconUrl ?? undefined, ownerId: g.ownerId, membersCount: g.membersCount, createdAt: g.createdAt.toISOString(), updatedAt: g.updatedAt.toISOString() }));
    return reply.send({ items, page: currentPage, totalPages: Math.ceil(count / pageSize) });
  });

  // Get group by id
  fastify.get('/groups/:id', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const group = await Group.findByPk(Number(id));
    if (!group) return reply.status(404).send({ success: false, message: 'Not found', statusCode: 404 });
    return reply.send({ id: group.id, name: group.name, description: group.description ?? undefined, privacy: group.privacy, iconUrl: group.iconUrl ?? undefined, ownerId: group.ownerId, membersCount: group.membersCount, createdAt: group.createdAt.toISOString(), updatedAt: group.updatedAt.toISOString() });
  });

  // Update group
  fastify.patch('/groups/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const { name, description, privacy } = request.body as { name?: string; description?: string; privacy?: 'public' | 'private' };
    const group = await Group.findByPk(Number(id));
    if (!group) return reply.status(404).send({ success: false, message: 'Not found', statusCode: 404 });
    // Only owner can update
    if (group.ownerId !== userId) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    if (name !== undefined) group.name = name;
    if (description !== undefined) group.description = description;
    if (privacy !== undefined) group.privacy = privacy;
    await group.save();
    return reply.send({ id: group.id, name: group.name, description: group.description ?? undefined, privacy: group.privacy, iconUrl: group.iconUrl ?? undefined, ownerId: group.ownerId, membersCount: group.membersCount, createdAt: group.createdAt.toISOString(), updatedAt: group.updatedAt.toISOString() });
  });

  // Delete group
  fastify.delete('/groups/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const group = await Group.findByPk(Number(id));
    if (!group) return reply.status(404).send({ success: false, message: 'Not found', statusCode: 404 });
    if (group.ownerId !== userId) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    await group.destroy();
    return reply.status(204).send();
  });

  // Upload icon placeholder (multipart or presign); for now accept URL
  fastify.post('/groups/:id/icon', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { iconUrl } = request.body as { iconUrl?: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const group = await Group.findByPk(Number(id));
    if (!group) return reply.status(404).send({ success: false, message: 'Not found', statusCode: 404 });
    if (group.ownerId !== userId) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    group.iconUrl = iconUrl || null;
    await group.save();
    return reply.send({ id: group.id, iconUrl: group.iconUrl ?? undefined });
  });

  // Members list
  fastify.get('/groups/:id/members', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { currentPage, pageSize, offset } = parsePagination(request);
    const query = (request.query as any)?.query as string | undefined;
    const whereUser: any = query
      ? { [Op.or]: [{ firstName: { [Op.like]: `%${query}%` } }, { lastName: { [Op.like]: `%${query}%` } }, { email: { [Op.like]: `%${query}%` } }] }
      : {};
    const { rows, count } = await GroupMember.findAndCountAll({
      where: { groupId: Number(id) },
      include: [{ model: User, as: 'user', where: whereUser, required: Object.keys(whereUser).length > 0 }],
      limit: pageSize,
      offset,
      order: [['createdAt', 'DESC']],
    } as any);
    const items = rows.map((m: any) => ({ user: toUserRef(m.user), role: m.role, mutedUntil: m.mutedUntil ? m.mutedUntil.toISOString() : null, banned: m.banned, joinedAt: m.createdAt.toISOString() }));
    return reply.send({ items, page: currentPage, totalPages: Math.ceil(count / pageSize) });
  });

  // Join group
  fastify.post('/groups/:id/join', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const group = await Group.findByPk(Number(id));
    if (!group) return reply.status(404).send({ success: false, message: 'Not found', statusCode: 404 });
    if (group.privacy === 'private') return reply.status(403).send({ success: false, message: 'Private group', statusCode: 403 });
    const [member, created] = await GroupMember.findOrCreate({ where: { groupId: Number(id), userId }, defaults: { role: 'member' } } as any);
    if (created) {
      group.membersCount += 1;
      await group.save();
    }
    return reply.status(204).send();
  });

  // Leave group
  fastify.delete('/groups/:id/leave', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const group = await Group.findByPk(Number(id));
    if (!group) return reply.status(404).send({ success: false, message: 'Not found', statusCode: 404 });
    const membership = await GroupMember.findOne({ where: { groupId: Number(id), userId } });
    if (!membership) return reply.status(404).send({ success: false, message: 'Not a member', statusCode: 404 });
    if (membership.role === 'owner') return reply.status(409).send({ success: false, message: 'Owner cannot leave; transfer ownership or delete group', statusCode: 409 });
    await membership.destroy();
    group.membersCount = Math.max(0, group.membersCount - 1);
    await group.save();
    return reply.status(204).send();
  });

  // Change member role (owner/mod only)
  fastify.post('/groups/:id/members/:userId/role', { preHandler: [authenticate] }, async (request, reply) => {
    const { id, userId: targetUserId } = request.params as { id: string; userId: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const { role } = request.body as { role: 'owner' | 'moderator' | 'member' };
    const group = await Group.findByPk(Number(id));
    if (!group) return reply.status(404).send({ success: false, message: 'Not found', statusCode: 404 });
    const actor = await GroupMember.findOne({ where: { groupId: Number(id), userId } });
    if (!actor || (actor.role !== 'owner' && actor.role !== 'moderator')) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    if (role === 'owner' && actor.role !== 'owner') return reply.status(403).send({ success: false, message: 'Only owner can transfer ownership', statusCode: 403 });
    const membership = await GroupMember.findOne({ where: { groupId: Number(id), userId: Number(targetUserId) } });
    if (!membership) return reply.status(404).send({ success: false, message: 'Member not found', statusCode: 404 });
    membership.role = role as any;
    await membership.save();
    if (role === 'owner') {
      group.ownerId = Number(targetUserId);
      await group.save();
      // downgrade previous owner
      actor.role = 'moderator';
      await actor.save();
    }
    return reply.send({ role: membership.role });
  });

  // Kick member
  fastify.delete('/groups/:id/members/:userId', { preHandler: [authenticate] }, async (request, reply) => {
    const { id, userId: targetUserId } = request.params as { id: string; userId: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const group = await Group.findByPk(Number(id));
    if (!group) return reply.status(404).send({ success: false, message: 'Not found', statusCode: 404 });
    const actor = await GroupMember.findOne({ where: { groupId: Number(id), userId } });
    if (!actor || (actor.role !== 'owner' && actor.role !== 'moderator')) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    const membership = await GroupMember.findOne({ where: { groupId: Number(id), userId: Number(targetUserId) } });
    if (!membership) return reply.status(404).send({ success: false, message: 'Member not found', statusCode: 404 });
    if (membership.role === 'owner') return reply.status(409).send({ success: false, message: 'Cannot kick owner', statusCode: 409 });
    await membership.destroy();
    group.membersCount = Math.max(0, group.membersCount - 1);
    await group.save();
    return reply.status(204).send();
  });

  // Mute member
  fastify.post('/groups/:id/members/:userId/mute', { preHandler: [authenticate] }, async (request, reply) => {
    const { id, userId: targetUserId } = request.params as { id: string; userId: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const { until } = request.body as { until?: string };
    const actor = await GroupMember.findOne({ where: { groupId: Number(id), userId } });
    if (!actor || (actor.role !== 'owner' && actor.role !== 'moderator')) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    const membership = await GroupMember.findOne({ where: { groupId: Number(id), userId: Number(targetUserId) } });
    if (!membership) return reply.status(404).send({ success: false, message: 'Member not found', statusCode: 404 });
    membership.mutedUntil = until ? new Date(until) : null;
    await membership.save();
    return reply.send({ mutedUntil: membership.mutedUntil ? membership.mutedUntil.toISOString() : undefined });
  });

  // Ban / Unban
  fastify.post('/groups/:id/members/:userId/ban', { preHandler: [authenticate] }, async (request, reply) => {
    const { id, userId: targetUserId } = request.params as { id: string; userId: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const actor = await GroupMember.findOne({ where: { groupId: Number(id), userId } });
    if (!actor || (actor.role !== 'owner' && actor.role !== 'moderator')) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    const membership = await GroupMember.findOne({ where: { groupId: Number(id), userId: Number(targetUserId) } });
    if (!membership) return reply.status(404).send({ success: false, message: 'Member not found', statusCode: 404 });
    if (membership.role === 'owner') return reply.status(409).send({ success: false, message: 'Cannot ban owner', statusCode: 409 });
    membership.banned = true;
    await membership.save();
    return reply.status(204).send();
  });
  fastify.delete('/groups/:id/members/:userId/ban', { preHandler: [authenticate] }, async (request, reply) => {
    const { id, userId: targetUserId } = request.params as { id: string; userId: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const actor = await GroupMember.findOne({ where: { groupId: Number(id), userId } });
    if (!actor || (actor.role !== 'owner' && actor.role !== 'moderator')) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    const membership = await GroupMember.findOne({ where: { groupId: Number(id), userId: Number(targetUserId) } });
    if (!membership) return reply.status(404).send({ success: false, message: 'Member not found', statusCode: 404 });
    membership.banned = false;
    await membership.save();
    return reply.status(204).send();
  });

  // Invite by emails
  fastify.post('/groups/:id/invite', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { emails, inviteCode } = request.body as { emails: string[]; inviteCode?: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const actor = await GroupMember.findOne({ where: { groupId: Number(id), userId } });
    if (!actor || (actor.role !== 'owner' && actor.role !== 'moderator')) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    const invited: string[] = [];
    const invalid: string[] = [];
    const group = await Group.findByPk(Number(id));
    if (!group) return reply.status(404).send({ success: false, message: 'Group not found', statusCode: 404 });
    // update or set invite code if provided
    if (inviteCode && inviteCode.trim().length > 0) {
      const desiredCode = inviteCode.trim();
      const conflict = await Group.findOne({ where: { inviteCode: desiredCode } });
      if (conflict && conflict.id !== group.id) {
        return reply.status(409).send({ success: false, message: 'Invite code already in use', statusCode: 409 });
      }
      group.inviteCode = desiredCode;
      await group.save();
    }
    const codeToUse = group.inviteCode || (await generateUniqueGroupInviteCode());
    if (!group.inviteCode) {
      group.inviteCode = codeToUse;
      await group.save();
    }
    for (const email of emails || []) {
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { invalid.push(email); continue; }
      await GroupInvite.create({ groupId: Number(id), email, status: 'pending' });
      invited.push(email);
      // Send invite email with code
      (await import('../jobs/emailJobs')).EmailQueueService.addGroupInviteEmailJob?.(email, group.name, codeToUse).catch(() => {});
      // If email belongs to an existing user, send an in-app notification
      const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
      if (existingUser) {
        await PushQueue.sendNotification({
          type: 'group_invite',
          targetUserId: existingUser.id,
          title: 'You have been invited to a group',
          body: `Group: ${group.name}`,
          data: { groupId: group.id, purpose: 'group' },
        });
      }
    }
    return reply.send({ invited, invalid, code: codeToUse });
  });

  // List invites
  fastify.get('/groups/:id/invites', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { currentPage, pageSize, offset } = parsePagination(request);
    const { rows, count } = await GroupInvite.findAndCountAll({ where: { groupId: Number(id) }, limit: pageSize, offset, order: [['createdAt', 'DESC']] });
    const items = rows.map((inv) => ({ id: inv.id, email: inv.email ?? undefined, status: inv.status, createdAt: inv.createdAt.toISOString(), expiresAt: inv.expiresAt ? inv.expiresAt.toISOString() : undefined }));
    return reply.send({ items, page: currentPage, totalPages: Math.ceil(count / pageSize) });
  });

  // Revoke invite
  fastify.delete('/groups/:id/invites/:inviteId', { preHandler: [authenticate] }, async (request, reply) => {
    const { id, inviteId } = request.params as { id: string; inviteId: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const actor = await GroupMember.findOne({ where: { groupId: Number(id), userId } });
    if (!actor || (actor.role !== 'owner' && actor.role !== 'moderator')) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    const invite = await GroupInvite.findOne({ where: { id: Number(inviteId), groupId: Number(id) } });
    if (!invite) return reply.status(404).send({ success: false, message: 'Invite not found', statusCode: 404 });
    invite.status = 'revoked';
    await invite.save();
    return reply.status(204).send();
  });

  // Rotate invite code
  fastify.post('/groups/:id/invite-code/rotate', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const group = await Group.findByPk(Number(id));
    if (!group) return reply.status(404).send({ success: false, message: 'Not found', statusCode: 404 });
    const actor = await GroupMember.findOne({ where: { groupId: Number(id), userId } });
    if (!actor || (actor.role !== 'owner' && actor.role !== 'moderator')) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    const code = await generateUniqueGroupInviteCode();
    group.inviteCode = code;
    await group.save();
    return reply.send({ code });
  });

  // Join by code
  fastify.post('/groups/join-by-code', { preHandler: [authenticate] }, async (request, reply) => {
    const { code } = request.body as { code: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    if (!code) return reply.status(400).send({ success: false, message: 'Code required', statusCode: 400 });
    const group = await Group.findOne({ where: { inviteCode: code } });
    if (!group) return reply.status(404).send({ success: false, message: 'Invalid code', statusCode: 404 });
    const [membership, created] = await GroupMember.findOrCreate({ where: { groupId: group.id, userId }, defaults: { role: 'member' } } as any);
    if (created) {
      group.membersCount += 1;
      await group.save();
    }
    return reply.status(204).send();
  });

  // Private group join request
  fastify.post('/groups/:id/requests', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const group = await Group.findByPk(Number(id));
    if (!group) return reply.status(404).send({ success: false, message: 'Not found', statusCode: 404 });
    if (group.privacy !== 'private') return reply.status(400).send({ success: false, message: 'Group is public', statusCode: 400 });
    await GroupJoinRequest.findOrCreate({ where: { groupId: Number(id), userId }, defaults: { status: 'pending' } } as any);
    return reply.status(204).send();
  });

  // List requests (owner/mod)
  fastify.get('/groups/:id/requests', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const actor = await GroupMember.findOne({ where: { groupId: Number(id), userId } });
    if (!actor || (actor.role !== 'owner' && actor.role !== 'moderator')) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    const { currentPage, pageSize, offset } = parsePagination(request);
    const { rows, count } = await GroupJoinRequest.findAndCountAll({ where: { groupId: Number(id) }, include: [{ model: User, as: 'user' }], limit: pageSize, offset, order: [['createdAt', 'DESC']] } as any);
    const items = rows.map((r: any) => ({ id: r.id, user: toUserRef(r.user), status: r.status, createdAt: r.createdAt.toISOString(), decidedAt: r.decidedAt ? r.decidedAt.toISOString() : undefined }));
    return reply.send({ items, page: currentPage, totalPages: Math.ceil(count / pageSize) });
  });

  // Approve/decline request
  fastify.post('/groups/:id/requests/:requestId/approve', { preHandler: [authenticate] }, async (request, reply) => {
    const { id, requestId } = request.params as { id: string; requestId: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const actor = await GroupMember.findOne({ where: { groupId: Number(id), userId } });
    if (!actor || (actor.role !== 'owner' && actor.role !== 'moderator')) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    const req = await GroupJoinRequest.findOne({ where: { id: Number(requestId), groupId: Number(id) } });
    if (!req) return reply.status(404).send({ success: false, message: 'Request not found', statusCode: 404 });
    req.status = 'approved';
    req.decidedAt = new Date();
    await req.save();
    const [membership, created] = await GroupMember.findOrCreate({ where: { groupId: Number(id), userId: req.userId }, defaults: { role: 'member' } } as any);
    if (created) {
      const group = await Group.findByPk(Number(id));
      if (group) { group.membersCount += 1; await group.save(); }
    }
    // Notify the user whose request was approved
    await PushQueue.sendNotification({
      type: 'group_join_approved',
      targetUserId: req.userId,
      title: 'Your request to join a group was approved',
      body: '',
      data: { groupId: id, purpose: 'group' },
    });
    return reply.status(204).send();
  });
  fastify.post('/groups/:id/requests/:requestId/decline', { preHandler: [authenticate] }, async (request, reply) => {
    const { id, requestId } = request.params as { id: string; requestId: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const actor = await GroupMember.findOne({ where: { groupId: Number(id), userId } });
    if (!actor || (actor.role !== 'owner' && actor.role !== 'moderator')) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    const req = await GroupJoinRequest.findOne({ where: { id: Number(requestId), groupId: Number(id) } });
    if (!req) return reply.status(404).send({ success: false, message: 'Request not found', statusCode: 404 });
    req.status = 'declined';
    req.decidedAt = new Date();
    await req.save();
    return reply.status(204).send();
  });

  // Messages: list with cursor/before/after and thread via parentId
  fastify.get('/groups/:id/messages', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { cursor, limit = '20', before, after, parentId } = (request.query as any) || {};
    const pageSize = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
    // Ensure member
    const { userId } = request as AuthenticatedFastifyRequest;
    const isMember = await GroupMember.findOne({ where: { groupId: Number(id), userId } });
    if (!isMember) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });

    const where: any = { groupId: Number(id) };
    if (parentId) where.parentId = parentId;
    if (cursor) where.createdAt = { [Op.lt]: new Date(cursor) };
    if (before) where.createdAt = { [Op.lt]: new Date(before) };
    if (after) where.createdAt = { [Op.gt]: new Date(after) };

    const rows = await Message.findAll({ where, order: [['createdAt', 'DESC']], limit: pageSize, include: [] });
    const items = await Promise.all(rows.map(async (m) => {
      const attachments = await MessageAttachment.findAll({ where: { messageId: m.id } });
      let author: any;
      if (m.isAI || m.authorId == null) {
        author = { id: 'ai', name: 'AI' };
      } else {
        const u = await User.findByPk(m.authorId);
        author = u ? toUserRef(u) : { id: 'ai', name: 'AI' };
      }
      return {
        id: m.id,
        groupId: m.groupId,
        author,
        text: m.text ?? undefined,
        attachments: attachments.map(a => ({ id: a.id, type: a.type, url: a.url, name: a.name || undefined })),
        parentId: m.parentId || undefined,
        threadCount: m.threadCount || undefined,
        pinned: m.pinned,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
        deletedAt: m.deletedAt ? m.deletedAt.toISOString() : undefined,
      };
    }));
    const last = rows[rows.length - 1];
    const nextCursor = rows.length === pageSize && last ? last.createdAt.toISOString() : undefined;
    return reply.send({ items, nextCursor });
  });

  // Create message
  fastify.post('/groups/:id/messages', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const { text, attachments, parentId } = request.body as { text?: string; attachments?: Array<{ type: string; url: string; name?: string }>; parentId?: string };
    const isMember = await GroupMember.findOne({ where: { groupId: Number(id), userId } });
    if (!isMember) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });

    if (!text && (!attachments || attachments.length === 0)) {
      return reply.status(400).send({ success: false, message: 'Message must have text or attachments', statusCode: 400 });
    }

    const msg = await Message.create({ groupId: Number(id), authorId: userId, text: text ?? null, parentId: parentId ? Number(parentId) : null });
    if (attachments && attachments.length) {
      for (const a of attachments) {
        await MessageAttachment.create({ messageId: msg.id, type: (a.type as any), url: a.url, name: a.name || null });
      }
    }

    if (parentId) {
      const parent = await Message.findByPk(Number(parentId));
      if (parent) { parent.threadCount += 1; await parent.save(); }
    }

    // Push notification job
    const pushPayload: any = { type: 'group_message', groupId: id, messageId: msg.id, actorId: userId };
    if (text) pushPayload.previewText = text.slice(0, 120);
    await PushQueue.sendGroupMessageNotification(pushPayload);

    const outAttachments = await MessageAttachment.findAll({ where: { messageId: msg.id } });
    const author = toUserRef((await User.findByPk(userId))!);
    const response = {
      id: msg.id,
      groupId: msg.groupId,
      author,
      text: msg.text ?? undefined,
      attachments: outAttachments.map(a => ({ id: a.id, type: a.type, url: a.url, name: a.name || undefined })),
      parentId: msg.parentId || undefined,
      threadCount: msg.threadCount || undefined,
      pinned: msg.pinned,
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt.toISOString(),
    };
    return reply.status(201).send(response);
  });

  // Edit message
  fastify.patch('/groups/:id/messages/:messageId', { preHandler: [authenticate] }, async (request, reply) => {
    const { id, messageId } = request.params as { id: string; messageId: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const { text, attachments } = request.body as { text?: string; attachments?: Array<{ type: string; url: string; name?: string }> };
    const msg = await Message.findOne({ where: { id: Number(messageId), groupId: Number(id) } });
    if (!msg) return reply.status(404).send({ success: false, message: 'Message not found', statusCode: 404 });
    const actor = await GroupMember.findOne({ where: { groupId: Number(id), userId } });
    if (!actor) return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    if (msg.authorId !== userId && actor.role === 'member') return reply.status(403).send({ success: false, message: 'Forbidden', statusCode: 403 });
    if (text !== undefined) msg.text = text;
    await msg.save();
    if (attachments) {
      // Simplest approach: replace all
      const existing = await MessageAttachment.findAll({ where: { messageId: Number(messageId) } });
      for (const e of existing) await e.destroy();
      for (const a of attachments) await MessageAttachment.create({ messageId: Number(messageId), type: (a.type as any), url: a.url, name: a.name || null });
    }
    const outAttachments = await MessageAttachment.findAll({ where: { messageId: Number(messageId) } });
    const author = msg.isAI ? { id: 'ai', name: 'AI' } : toUserRef((await User.findByPk(msg.authorId!))!);
    return reply.send({ id: msg.id, groupId: msg.groupId, author, text: msg.text ?? undefined, attachments: outAttachments.map(a => ({ id: a.id, type: a.type, url: a.url, name: a.name || undefined })), parentId: msg.parentId || undefined, threadCount: msg.threadCount || undefined, pinned: msg.pinned, createdAt: msg.createdAt.toISOString(), updatedAt: msg.updatedAt.toISOString() });
  });

  // Delete message (soft)
  fastify.delete('/groups/:id/messages/:messageId', { preHandler: [authenticate] }, async (request, reply) => {
    const { id, messageId } = request.params as { id: string; messageId: string };
    const { userId } = request as AuthenticatedFastifyRequest;
    const msg = await Message.findOne({ where: { id: Number(messageId), groupId: Number(id) } });
    if (!msg) return reply.status(404).send();
    const actor = await GroupMember.findOne({ where: { groupId: Number(id), userId } });
    if (!actor) return reply.status(403).send();
    if (msg.authorId !== userId && actor.role === 'member') return reply.status(403).send();
    await msg.destroy();
    return reply.status(204).send();
  });

  // Unread counts per group for current user
  fastify.get('/groups/unread-counts', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request as AuthenticatedFastifyRequest;
    // Get groups for user
    const memberships = await GroupMember.findAll({ where: { userId } });
    const groupIds = memberships.map(m => m.groupId);
    const items: { groupId: number; unread: number }[] = [];
    for (const gid of groupIds) {
      // Unread = messages in group where no read record for user
      const messages = await Message.findAll({ where: { groupId: gid } });
      let unread = 0;
      for (const m of messages) {
        const read = await MessageRead.findOne({ where: { messageId: m.id, userId } });
        if (!read) unread += 1;
      }
      items.push({ groupId: gid, unread });
    }
    return reply.send({ items });
  });
}


