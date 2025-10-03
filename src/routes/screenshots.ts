import { FastifyInstance } from 'fastify';
import { createHash } from 'crypto';
import { authenticate } from '../middleware/auth';
import { IAPIResponse } from '../types/auth';
import { analyzeImages, prepareImagesForModeration, InputImage } from '../services/imageModerationService';
import SensitiveImage from '../models/SensitiveImage';
import SensitiveImageFinding from '../models/SensitiveImageFinding';
import SensitiveImageComment from '../models/SensitiveImageComment';
import AccountabilityPartner from '../models/AccountabilityPartner';
import { sendPushToUser } from '../services/pushService';
import Notification from '../models/Notification';
import { Op } from 'sequelize';
import { requireLLMAccess, paywallResponse } from '../services/accessControlService';
import { uploadScreenshotImage, getScreenshotAccessUrl } from '../services/screenshotStorageService';

async function isPartner(partnerId: number, userId: number): Promise<boolean> {
  const link = await AccountabilityPartner.findOne({ where: { receiverId: partnerId, userId } });
  if (link) return true;
  const link2 = await AccountabilityPartner.findOne({ where: { userId: partnerId, receiverId: userId } });
  return !!link2;
}

export default async function screenshotsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // POST /api/screenshots/scrutinized
  fastify.post('/screenshots/scrutinized', async (request, reply) => {
    const userId = (request as any).userId as number;
    
    // Check subscription access
    const access = await requireLLMAccess(userId, 'screenshot_analysis');
    if (!access.allowed) {
      return reply.status(402).send(paywallResponse('screenshot_analysis', access.trialEndsAt));
    }
    
    const { images } = (request.body as any) || {};
    if (!Array.isArray(images) || !images.length) {
      return reply.status(400).send({ success: false, message: 'images[] required', statusCode: 400 } as IAPIResponse);
    }
    const inputImages = images as InputImage[];
    const limitedImages = inputImages.slice(0, 5);
    const preparedImages = await prepareImagesForModeration(limitedImages);
    const analysis = await analyzeImages(inputImages, preparedImages);
    
    // Only save suspicious or explicit images - clean images are analyzed but not persisted
    if (analysis.status === 'clean') {
      // Clean images are not saved, clear any sensitive data from memory concurrently
      if (Array.isArray(images)) {
        await Promise.all(images.map(async (img) => {
          if (img && typeof img === 'object') {
            return new Promise<void>((resolve) => {
              if ('base64' in img) delete img.base64;
              if ('url' in img) delete img.url;
              resolve();
            });
          }
        }));
      }
      return reply.status(200).send({ success: true, message: 'Analyzed - Clean image not saved', statusCode: 200, data: { id: null, status: analysis.status, findings: analysis.findings } } as IAPIResponse);
    }
    
    let storageResult: Awaited<ReturnType<typeof uploadScreenshotImage>> | null = null;
    let imageHash: string | null = null;

    if ((analysis.status === 'suspicious' || analysis.status === 'explicit') && preparedImages.length > 0) {
      const primaryImage = preparedImages[0];
      if (primaryImage) {
        const buffer = Buffer.from(primaryImage.base64, 'base64');
        const uploadResult = await uploadScreenshotImage({
          userId,
          buffer,
          mimeType: primaryImage.mimeType,
        });

        storageResult = uploadResult;
        imageHash = createHash('sha256').update(buffer).digest('hex');
      }
    }

    const rawMeta: Record<string, any> = {
      imagesCount: inputImages.length,
    };

    if (storageResult) {
      rawMeta.storage = {
        key: storageResult.storageKey,
        mimeType: storageResult.mimeType,
        contentLength: storageResult.contentLength,
        uploadedAt: new Date().toISOString(),
      };
    }

    // Save only suspicious or explicit images
    const created = await SensitiveImage.create({
      userId,
      status: analysis.status,
      summary: analysis.summary,
      rawMeta: rawMeta as any,
      imageUrl: storageResult?.publicUrl ?? null,
      imageHash,
    } as any);
    if (analysis.findings?.length) {
      await SensitiveImageFinding.bulkCreate(analysis.findings.map(f => ({ imageId: created.id, label: f.label, category: f.category || null, score: f.score ?? null, raw: f.raw ?? null })) as any);
    }
    if (analysis.status === 'explicit') {
      // notify partners
      const links = await AccountabilityPartner.findAll({ where: { [Op.or]: [{ userId }, { receiverId: userId }] } });
      const partnerIds = Array.from(new Set(links.map(l => (l.userId === userId ? l.receiverId : l.userId)).filter(Boolean))) as number[];
      for (const pid of partnerIds) {
        await Notification.create({ userId: pid, type: 'generic', title: 'Sensitive content detected', body: 'A recent screenshot may contain explicit content', data: { sensitiveImageId: created.id } as any });
        await sendPushToUser(pid, { title: 'Sensitive content detected', body: 'Tap to review and encourage accountability', data: { sensitiveImageId: String(created.id) } });
      }
    }
    return reply.status(200).send({ success: true, message: 'Analyzed', statusCode: 200, data: { id: created.id, status: analysis.status, findings: analysis.findings } } as IAPIResponse);
  });

  // GET /api/screenshots/sensitive?userId=123
  fastify.get('/screenshots/sensitive', async (request, reply) => {
    const viewerId = (request as any).userId as number;
    
    // Check subscription access
    const access = await requireLLMAccess(viewerId, 'screenshot_viewing');
    if (!access.allowed) {
      return reply.status(402).send(paywallResponse('screenshot_viewing', access.trialEndsAt));
    }
    
    const q = (request.query as any) || {};
    const userId = Number(q.userId) || viewerId;
    if (viewerId !== userId && !(await isPartner(viewerId, userId))) {
      return reply.status(403).send({ success: false, message: 'Not authorized', statusCode: 403 } as IAPIResponse);
    }
    const items = await SensitiveImage.findAll({ where: { userId }, order: [['createdAt', 'DESC']], include: [{ model: SensitiveImageFinding, as: 'findings' }, { model: SensitiveImageComment, as: 'comments' }] as any });

    const serialized = await Promise.all(
      items.map(async (item) => {
        const data = item.toJSON();
        let storageKey: string | undefined;

        if (data?.rawMeta?.storage?.key) {
          storageKey = data.rawMeta.storage.key;
        } else if (data?.rawMeta?.s3Key) {
          storageKey = data.rawMeta.s3Key;
        } else if (data?.rawMeta?.storageKey) {
          storageKey = data.rawMeta.storageKey;
        } else if (typeof data.imageUrl === 'string' && !data.imageUrl.startsWith('http')) {
          storageKey = data.imageUrl;
        }

        if (storageKey) {
          try {
            data.imageUrl = await getScreenshotAccessUrl(storageKey);
          } catch {
            // Fallback to stored URL if presign fails
            data.imageUrl = data.imageUrl || null;
          }
        }

        return data;
      })
    );

    return reply.status(200).send({ success: true, message: 'OK', statusCode: 200, data: serialized } as IAPIResponse);
  });

  // POST /api/screenshots/:id/comments
  fastify.post('/screenshots/:id/comments', async (request, reply) => {
    const partnerId = (request as any).userId as number;
    
    // Check subscription access
    const access = await requireLLMAccess(partnerId, 'screenshot_commenting');
    if (!access.allowed) {
      return reply.status(402).send(paywallResponse('screenshot_commenting', access.trialEndsAt));
    }
    
    const id = Number((request.params as any).id);
    const { comment } = (request.body as any) || {};
    if (!id || !comment) return reply.status(400).send({ success: false, message: 'Invalid payload', statusCode: 400 });
    const image = await SensitiveImage.findByPk(id);
    if (!image) return reply.status(404).send({ success: false, message: 'Not found', statusCode: 404 });
    const allowed = await isPartner(partnerId, (image as any).userId);
    if (!allowed) return reply.status(403).send({ success: false, message: 'Not authorized', statusCode: 403 });
    const rec = await SensitiveImageComment.create({ imageId: id, authorUserId: partnerId, targetUserId: (image as any).userId, comment } as any);
    // notify user
    await Notification.create({ userId: (image as any).userId, type: 'generic', title: 'Partner commented', body: comment.substring(0, 200), data: { sensitiveImageId: id } as any });
    await sendPushToUser((image as any).userId, { title: 'Partner commented', body: comment.substring(0, 100), data: { sensitiveImageId: String(id) } });
    return reply.status(200).send({ success: true, message: 'Comment added', statusCode: 200, data: rec } as IAPIResponse);
  });

  // POST /api/screenshots/:id/cancel-streak
  fastify.post('/screenshots/:id/cancel-streak', async (request, reply) => {
    const partnerId = (request as any).userId as number;
    
    // Check subscription access
    const access = await requireLLMAccess(partnerId, 'screenshot_streak_cancel');
    if (!access.allowed) {
      return reply.status(402).send(paywallResponse('screenshot_streak_cancel', access.trialEndsAt));
    }
    
    const id = Number((request.params as any).id);
    const image = await SensitiveImage.findByPk(id);
    if (!image) return reply.status(404).send({ success: false, message: 'Not found', statusCode: 404 });
    const targetUserId = (image as any).userId as number;
    const allowed = await isPartner(partnerId, targetUserId);
    if (!allowed) return reply.status(403).send({ success: false, message: 'Not authorized', statusCode: 403 });
    // Cancel streak: minimal placeholder -> create notification; hook into UserProgress if needed
    await Notification.create({ userId: targetUserId, type: 'generic', title: 'Streak cancelled', body: 'A partner cancelled your streak due to sensitive content', data: { sensitiveImageId: id } as any });
    await sendPushToUser(targetUserId, { title: 'Streak cancelled', body: 'A partner cancelled your streak', data: { sensitiveImageId: String(id) } });
    return reply.status(200).send({ success: true, message: 'Streak cancelled (placeholder)', statusCode: 200 } as IAPIResponse);
  });
}
