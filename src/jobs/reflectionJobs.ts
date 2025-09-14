import { Queue, Worker, JobsOptions } from 'bullmq';
import nodeCron from 'node-cron';
import { queueConnection, queueManager, QUEUE_NAMES } from '../config/queue';
import { OnboardingData, User, PrayerRequest, GroupMember, AccountabilityPartner } from '../models';
import DailyReflection from '../models/DailyReflection';
import { getLocalDateString, selectDailyReference, fetchPassage, normalizeVersion } from '../utils/scripture';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiConfig } from '../config/environment';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import { cleanGeminiResponse } from '../utils/gemini';

type GenerateWeeklyReflectionsJob = {
  userId: number;
  timezone: string;
  startDate: string; // YYYY-MM-DD for day 1 of the 7-day window
};

type AccessiblePrayerRequest = Pick<PrayerRequest, 'id' | 'title' | 'body' | 'userId' | 'visibility' | 'createdAt'> & { source: 'own' | 'partner' | 'group' };

const getAccessiblePrayerRequests = async (userId: number): Promise<AccessiblePrayerRequest[]> => {
  const [own, groupMemberships, partnerships] = await Promise.all([
    PrayerRequest.findAll({ where: { userId }, order: [['createdAt', 'DESC']], limit: 20 }),
    GroupMember.findAll({ where: { userId }, attributes: ['groupId'] }),
    AccountabilityPartner.findAll({ where: { [Op.or]: [{ userId }, { receiverId: userId }], receiverId: { [Op.ne]: null } } }),
  ]);
  const groupIds = groupMemberships.map(g => g.groupId);
  const partnerUserIds = partnerships
    .map(p => (p.userId === userId ? p.receiverId : p.userId))
    .filter((id): id is number => id !== null);

  const sharedConds: any[] = [];
  if (groupIds.length > 0) {
    sharedConds.push({ visibility: 'group', [Op.or]: groupIds.map(id => sequelize.literal(`JSON_CONTAINS(group_ids, CAST(${id} AS JSON))`)) });
  }
  if (partnerUserIds.length > 0) {
    sharedConds.push({ visibility: 'partner', userId: { [Op.in]: partnerUserIds }, [Op.and]: [sequelize.literal(`JSON_CONTAINS(partner_ids, CAST(${userId} AS JSON))`)] });
  }
  let shared: PrayerRequest[] = [];
  if (sharedConds.length) {
    shared = await PrayerRequest.findAll({ where: { [Op.or]: sharedConds }, order: [['createdAt', 'DESC']], limit: 30 });
  }
  const taggedOwn: AccessiblePrayerRequest[] = own.map(r => ({ id: r.id, title: r.title, body: r.body, userId: r.userId, visibility: r.visibility, createdAt: r.createdAt as any, source: 'own' }));
  const taggedShared: AccessiblePrayerRequest[] = shared.map(r => ({ id: r.id, title: r.title, body: r.body, userId: r.userId, visibility: r.visibility, createdAt: r.createdAt as any, source: 'partner' }));
  return [...taggedOwn, ...taggedShared].slice(0, 30);
};

type ReflectionUnit = { title?: string; body: string; scriptureReference?: string };

const buildFiveReflections = async (args: {
  onboarding: OnboardingData | null;
  prayerRequests: AccessiblePrayerRequest[];
  timezone: string;
  displayDate: string;
  preferredVersion?: string | null;
  allowAI: boolean;
}): Promise<ReflectionUnit[]> => {
  const preferredVersion = normalizeVersion(args.preferredVersion);
  if (!geminiConfig.apiKey || !args.allowAI) {
    // Simple fallback: 1 main scripture + 4 prompts based on prayer titles
    const ref = selectDailyReference(args.timezone);
    const passage = await fetchPassage(ref, preferredVersion);
    const titles = args.prayerRequests.map(r => r.title).filter(Boolean).slice(0, 4);
    const list: ReflectionUnit[] = [
      { title: 'Today\'s Scripture', body: passage.text, scriptureReference: passage.reference },
      ...titles.map(t => ({ title: `Pray about: ${t}`, body: `Bring "${t}" before God today. Invite the Holy Spirit to guide you and give you strength.` }))
    ];
    // Pad to 5
    while (list.length < 5) list.push({ body: 'Pause to breathe and invite Jesus into this moment. Offer a short prayer of gratitude.' });
    return list.slice(0, 5);
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiConfig.apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `Create five short Christian daily reflections as strict JSON. Inputs:\n- display_date: ${args.displayDate}\n- timezone: ${args.timezone}\n- onboarding: ${JSON.stringify(args.onboarding?.toJSON?.() ?? args.onboarding ?? {})}\n- prayer_requests: ${JSON.stringify(args.prayerRequests.map(p => ({ title: p.title, body: p.body, source: p.source })))}\n- preferred_version: ${preferredVersion.toUpperCase()} (one of: KJV, WEB, ASV, DARBY, YLT)\n\nRules:\n1) Return EXACTLY one JSON object with key \'items\' as an array of 5 objects. No code fences.\n2) Each item shape: {\n  "title"?: string,\n  "body": string, // <= 500 chars, pastoral tone, practical next step, Christ-centered\n  "scripture_reference"?: string // optional verse reference that supports the reflection\n}\n3) Avoid quoting long passages in body. Keep concise and devotional.`;
    const resp = await model.generateContent(prompt);
    const raw = resp.response.text().trim();
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = cleanGeminiResponse<any>(raw); }
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    const cleaned: ReflectionUnit[] = items.slice(0, 5).map((it: any) => ({
      title: typeof it?.title === 'string' ? it.title.slice(0, 255) : undefined,
      body: String(it?.body || '').slice(0, 1000),
      scriptureReference: typeof it?.scripture_reference === 'string' ? it.scripture_reference : undefined,
    }));
    // Ensure 5
    while (cleaned.length < 5) cleaned.push({ body: 'Pause to breathe and invite Jesus into this moment. Offer a short prayer of gratitude.' });
    return cleaned.slice(0, 5);
  } catch {
    // Fallback path
    const ref = selectDailyReference(args.timezone);
    const passage = await fetchPassage(ref, preferredVersion);
    return [
      { title: 'Today\'s Scripture', body: passage.text, scriptureReference: passage.reference },
      { body: 'Ask the Lord for wisdom for one decision you\'re facing today.' },
      { body: 'Pray a blessing over a friend or accountability partner.' },
      { body: 'List three things you\'re grateful for and thank God for them.' },
      { body: 'Invite the Holy Spirit to strengthen you in your areas of weakness.' },
    ];
  }
};

export const enqueueGenerateWeeklyReflections = async (data: GenerateWeeklyReflectionsJob, opts?: JobsOptions) => {
  const queue = queueManager.getAnalyticsQueue();
  await queue.add('generate-weekly-reflections', data, { attempts: 2, removeOnComplete: { count: 100 }, removeOnFail: { count: 50 }, ...opts });
};

export const initializeReflectionWorker = () => {
  const queue = queueManager.getAnalyticsQueue();
  const worker = new Worker(queue.name, async job => {
    if (job.name === 'generate-weekly-reflections') {
      return runGenerateWeeklyReflections(job.data as GenerateWeeklyReflectionsJob);
    }
  }, { connection: queueConnection });

  queueManager.addWorker(QUEUE_NAMES.ANALYTICS, worker);
  return worker;
};

import { requireLLMAccess } from '../services/accessControlService';

export const runGenerateWeeklyReflections = async ({ userId, timezone, startDate }: GenerateWeeklyReflectionsJob) => {
  const onboarding = await OnboardingData.findOne({ where: { userId } });
  const prayerRequests = await getAccessiblePrayerRequests(userId);
  const preferredVersion = (onboarding as any)?.faithData?.bibleVersion ?? null;

  // Determine AI access once
  let allowAI = false;
  try {
    const access = await requireLLMAccess(userId, 'reflections_generation');
    allowAI = access.allowed;
  } catch {}

  // 7 days, 5 reflections per day
  for (let day = 0; day < 7; day++) {
    const d = new Date(startDate + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + day);
    const displayDate = getLocalDateString(timezone, d);

    // Skip if already have 5 for that day
    const existing = await DailyReflection.count({ where: { userId, displayDate } });
    if (existing >= 5) continue;

  const reflections = await buildFiveReflections({ onboarding, prayerRequests, timezone, displayDate, preferredVersion, allowAI });
  const toCreate = reflections.map((r, idx) => ({
      userId,
      displayDate,
      orderInDay: idx + 1,
      title: r.title ?? null,
      body: r.body,
      scriptureReference: r.scriptureReference ?? null,
      context: { timezone, startDate },
    }));

    await DailyReflection.bulkCreate(toCreate, { ignoreDuplicates: true });
  }
};

// Weekly cron: runs every Sunday at 02:00 UTC
export const scheduleWeeklyReflections = () => {
  nodeCron.schedule('0 2 * * 0', async () => {
    const users = await User.findAll({ where: { isActive: true }, include: [{ model: OnboardingData, as: 'onboardingData' }] });
    for (const user of users) {
      const tz = user.timezone || (user as any).onboardingData?.personalInfo?.timezone || 'UTC';
      const start = getLocalDateString(tz); // today as start of 7-day window
      await enqueueGenerateWeeklyReflections({ userId: user.id, timezone: tz, startDate: start });
    }
  });
};
