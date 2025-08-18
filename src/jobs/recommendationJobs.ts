import { Queue, Worker, JobsOptions } from 'bullmq';
import nodeCron from 'node-cron';
import { queueManager, QUEUE_NAMES, queueConnection } from '../config/queue';
import { google } from 'googleapis';
import DailyRecommendation from '../models/DailyRecommendation';
import { OnboardingData, User, PrayerRequest, GroupMember, AccountabilityPartner } from '../models';
import { geminiConfig, youtubeConfig } from '../config/environment';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDailyScripture, normalizeVersion, fetchPassage, selectDailyReference } from '../utils/scripture';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import { cleanGeminiResponse } from '../utils/gemini';

type GenerateDailyRecJob = {
  userId: number;
  localDate: string; // YYYY-MM-DD in user's timezone
  timezone: string;  // IANA tz
};

const youtube = google.youtube('v3');

export const buildLocalDate = (timezone: string, baseDate?: Date): string => {
  const now = baseDate ?? new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const p = fmt.formatToParts(now);
  const y = p.find(x => x.type === 'year')?.value || '1970';
  const m = p.find(x => x.type === 'month')?.value || '01';
  const d = p.find(x => x.type === 'day')?.value || '01';
  return `${y}-${m}-${d}`;
};

/**
 * Builds a search query and related data from an OnboardingData object.
 * @param onboarding - The user's OnboardingData object, or null.
 * @returns An object with the following properties:
 * - query: The search query string.
 * - bibleVersion: The user's preferred Bible version, if provided.
 * - preferredChannels: An array of preferred YouTube channels or people.
 */
export const buildSearchQuery = (onboarding: OnboardingData | null): { query: string; bibleVersion?: string; preferredChannels: string[] } => {
  let bibleVersion: string | undefined;
  const preferredChannels: string[] = [];
  const parts: string[] = [];

  const faith = onboarding?.faithData as any;
  const personal = onboarding?.personalInfo as any;
  const addAssess = onboarding?.additionalAssessmentData as any;

  if (faith?.bibleVersion) bibleVersion = String(faith.bibleVersion);
  if (faith?.topics && Array.isArray(faith.topics)) parts.push(faith.topics.join(' '));
  if (personal?.interests) parts.push(String(personal.interests));
  if (addAssess?.struggles) parts.push(String(addAssess.struggles));
  if (faith?.favoriteChannels && Array.isArray(faith.favoriteChannels)) preferredChannels.push(...faith.favoriteChannels.map((c: any) => String(c)));
  if (faith?.favoritePeople && Array.isArray(faith.favoritePeople)) preferredChannels.push(...faith.favoritePeople.map((c: any) => String(c)));

  const query = (parts.join(' ').trim() || 'christian encouragement devotional').slice(0, 200);
  const base: { query: string; bibleVersion?: string; preferredChannels: string[] } = { query, preferredChannels };
  if (bibleVersion) base.bibleVersion = bibleVersion;
  return base;
};

export const maybeRefineQueryWithGemini = async (baseQuery: string, onboarding: OnboardingData | null): Promise<string> => {
  // Legacy helper retained for compatibility; not used after combined LLM call
  return baseQuery;
};

const fetchScripture = async (bibleVersion?: string): Promise<{ reference: string; text: string } | null> => {
  const v = normalizeVersion(bibleVersion);
  const s = await getDailyScripture('UTC', v);
  return { reference: s.reference, text: s.text };
};

type CombinedPlan = {
  refinedQuery?: string;
  dailyScripture: { reference: string; text: string; version: string };
  prayerFocus?: string | null;
  scripturesToPrayWith?: Array<{ reference: string; reason?: string }> | null;
};

const generateDailyPlanWithGemini = async (params: {
  onboarding: OnboardingData | null;
  seedQuery: string;
  dailyReference: string;
  prayerRequests: AccessiblePrayerRequest[];
  preferredVersion?: string | null;
}): Promise<CombinedPlan> => {
  const version = normalizeVersion(params.preferredVersion);
  if (!geminiConfig.apiKey) {
    // Fallbacks without LLM
    const passage = await fetchPassage(params.dailyReference, version);
    const focus = params.prayerRequests.slice(0, 3).map(r => r.title).join('; ');
    return {
      refinedQuery: params.seedQuery,
      dailyScripture: { reference: passage.reference, text: passage.text, version },
      prayerFocus: focus || null,
      scripturesToPrayWith: [{ reference: passage.reference, reason: 'Daily scripture' }],
    };
  }
  try {
    const genAI = new GoogleGenerativeAI(geminiConfig.apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `You are a Christian assistant. Create all outputs in one strict JSON object. Inputs below.\n\n- seed_query: ${params.seedQuery}\n- preferred_version: ${version.toUpperCase()} (must use one of: KJV, WEB, ASV, DARBY, YLT)\n- daily_reference: ${params.dailyReference}\n- onboarding: ${JSON.stringify(params.onboarding?.toJSON?.() ?? params.onboarding ?? {})}\n- prayer_requests: ${JSON.stringify(params.prayerRequests.map(r => ({ title: r.title, body: r.body, source: r.source, createdAt: r.createdAt })))}\n\nRules:\n1) Return EXACTLY one JSON object, no Markdown, no commentary.\n2) JSON shape:\n{\n  "refined_query": string, // 3-10 words for a short daily devotional/sermon search\n  "daily_scripture": { "reference": string, "text": string, "version": string }, // Use preferred_version EXACTLY, provide only the verse text (no quotes, no reference in text)\n  "prayer_focus": string, // <= 200 chars\n  "scriptures_to_pray_with": [ { "reference": string, "reason"?: string } ] // 2-5 references\n}\n3) Do not include code fences. Do not include extra keys.`;
    const resp = await model.generateContent(prompt);
    const raw = resp.response.text().trim();
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = cleanGeminiResponse<any>(raw); }
    // Basic validations and trimming
    const refinedQuery = typeof parsed?.refined_query === 'string' && parsed.refined_query.trim() ? parsed.refined_query.trim() : params.seedQuery;
    const ds = parsed?.daily_scripture || {};
    const dsText = typeof ds.text === 'string' ? ds.text.trim() : '';
    const dsRef = typeof ds.reference === 'string' ? ds.reference.trim() : params.dailyReference;
    const dsVer = typeof ds.version === 'string' ? ds.version.trim() : version.toUpperCase();
    const prayerFocus = typeof parsed?.prayer_focus === 'string' ? parsed.prayer_focus.slice(0, 300) : null;
    const stpw = Array.isArray(parsed?.scriptures_to_pray_with)
      ? parsed.scriptures_to_pray_with
          .filter((x: any) => x && typeof x.reference === 'string')
          .map((x: any) => ({ reference: String(x.reference), reason: typeof x.reason === 'string' ? x.reason : undefined }))
          .slice(0, 5)
      : null;


    // If missing text, fallback to fetch
    let dailyText = dsText;
    if (!dailyText) {
      const fallback = await fetchPassage(dsRef, version);
      dailyText = fallback.text;
    }
    return {
      refinedQuery,
      dailyScripture: { reference: dsRef, text: dailyText, version: version },
      prayerFocus,
      scripturesToPrayWith: stpw,
    };
  } catch (e) {
    // Safe fallback
    const passage = await fetchPassage(params.dailyReference, version);
    return {
      refinedQuery: params.seedQuery,
      dailyScripture: { reference: passage.reference, text: passage.text, version },
      prayerFocus: null,
      scripturesToPrayWith: [{ reference: passage.reference, reason: 'Daily scripture' }],
    };
  }
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

// previous prayer plan LLM function replaced by combined generator

export const searchYouTube = async (apiKey: string, query: string, preferredChannels: string[], excludeVideoIds: string[]): Promise<{ videoId: string; title: string; channelId: string; channelTitle: string; url: string } | null> => {
  const params: any = {
    key: apiKey,
    part: 'snippet',
    q: query,
    maxResults: 10,
    type: 'video',
    videoEmbeddable: 'true',
    order: 'relevance',
  };

  // First try channel-prioritized search by appending channel names
  const channelHint = preferredChannels.slice(0, 3).join(' | ');
  const q1 = channelHint ? `${query} (${channelHint})` : query;

  const res1 = await youtube.search.list({ ...params, q: q1 });
  const items1 = res1.data.items || [];
  const ranked1 = items1
    .map(i => ({
      videoId: i.id?.videoId || '',
      title: i.snippet?.title || '',
      channelId: i.snippet?.channelId || '',
      channelTitle: i.snippet?.channelTitle || '',
    }))
    .filter(v => v.videoId && !excludeVideoIds.includes(v.videoId))
    .sort((a, b) => {
      const aPri = preferredChannels.some(c => a.channelTitle?.toLowerCase().includes(c.toLowerCase()));
      const bPri = preferredChannels.some(c => b.channelTitle?.toLowerCase().includes(c.toLowerCase()));
      return Number(bPri) - Number(aPri);
    });
  if (ranked1[0]) return { ...ranked1[0], url: `https://www.youtube.com/watch?v=${ranked1[0].videoId}` };

  // Fallback generic search
  const res2 = await youtube.search.list(params);
  const items2 = res2.data.items || [];
  const ranked2 = items2
    .map(i => ({
      videoId: i.id?.videoId || '',
      title: i.snippet?.title || '',
      channelId: i.snippet?.channelId || '',
      channelTitle: i.snippet?.channelTitle || '',
    }))
    .filter(v => v.videoId && !excludeVideoIds.includes(v.videoId));
  if (ranked2[0]) return { ...ranked2[0], url: `https://www.youtube.com/watch?v=${ranked2[0].videoId}` };

  return null;
};

export const enqueueGenerateDailyRecommendation = async (data: GenerateDailyRecJob, opts?: JobsOptions) => {
  const queue = queueManager.getAnalyticsQueue();
  await queue.add('generate-daily-recommendation', data, { attempts: 2, removeOnComplete: { count: 100 }, removeOnFail: { count: 50 }, ...opts });
};

export const initializeRecommendationWorker = () => {
  const queue = queueManager.getAnalyticsQueue();
  const worker = new Worker(queue.name, async job => {
    return runGenerateDailyRecommendation(job.data as GenerateDailyRecJob);
  }, { connection: queueConnection });

  queueManager.addWorker(QUEUE_NAMES.ANALYTICS, worker);

  return worker;
};

export const runGenerateDailyRecommendation = async ({ userId, localDate, timezone }: GenerateDailyRecJob) => {
  const existing = await DailyRecommendation.findOne({ where: { userId, localDate } });
  if (existing) {
    let changed = false;
    // Hydrate scriptures_to_pray_with if any missing text
    if (Array.isArray(existing.scripturesToPrayWith) && existing.scripturesToPrayWith.length) {
      const needsHydration = (existing.scripturesToPrayWith as any).some((s: any) => !s?.text || !String(s.text).trim());
      if (needsHydration) {
        const version = normalizeVersion(existing.bibleVersion);
        const hydrated = await Promise.all(
          (existing.scripturesToPrayWith as any).map(async (s: any) => {
            if (s?.text && String(s.text).trim()) {
              return { ...s, version: s.version || version };
            }
            try {
              const passage = await fetchPassage(s.reference, version);
              return { ...s, reference: passage.reference, text: passage.text, version };
            } catch {
              return { ...s, version };
            }
          })
        );
        (existing as any).scripturesToPrayWith = hydrated as any;
        changed = true;
      }
    }
    // Hydrate daily scripture text if missing but reference exists
    if ((!existing.scriptureText || !existing.scriptureText.trim()) && existing.scriptureReference) {
      try {
        const version = normalizeVersion(existing.bibleVersion);
        const passage = await fetchPassage(existing.scriptureReference, version);
        existing.scriptureText = passage.text;
        changed = true;
      } catch {}
    }
    if (changed) await existing.save();
    return existing;
  }

  const onboarding = await OnboardingData.findOne({ where: { userId } });
  const seed = buildSearchQuery(onboarding);
  const bibleVersion = seed.bibleVersion;
  const preferredChannels = seed.preferredChannels;

  // Pick the daily reference and run a single LLM call for all content
  const dailyRef = selectDailyReference(timezone);
  const accessibleRequests = await getAccessiblePrayerRequests(userId);
  const combined = await generateDailyPlanWithGemini({
    onboarding,
    seedQuery: seed.query,
    dailyReference: dailyRef,
    prayerRequests: accessibleRequests,
    preferredVersion: bibleVersion ?? null,
  });
  const query = combined.refinedQuery || seed.query;
  const scripture = combined.dailyScripture;
  let scripturesToPrayWith: Array<{ reference: string; text?: string; version?: string; reason?: string }> | null = null;
  if (combined.scripturesToPrayWith && combined.scripturesToPrayWith.length) {
    const version = normalizeVersion(bibleVersion);
    const results = await Promise.all(
      combined.scripturesToPrayWith.map(async s => {
        try {
          const passage = await fetchPassage(s.reference, version);
          return { reference: passage.reference, text: passage.text, version, reason: s.reason } as { reference: string; text?: string; version?: string; reason?: string };
        } catch {
          return { reference: s.reference, version, reason: s.reason } as { reference: string; text?: string; version?: string; reason?: string };
        }
      })
    );
    scripturesToPrayWith = results;
  }

  const seen = await DailyRecommendation.findAll({ where: { userId }, attributes: ['youtubeVideoId'] });
  const excludeIds = seen.map(s => s.youtubeVideoId!).filter(Boolean);
  const apiKey = youtubeConfig.apiKey || '';
  let video = null;
  if (apiKey) {
    video = await searchYouTube(apiKey, query, preferredChannels, excludeIds);
  }

  const created = await DailyRecommendation.create({
    userId,
    localDate,
    bibleVersion: bibleVersion || null,
    scriptureReference: scripture?.reference || null,
    scriptureText: scripture?.text || null,
    prayerFocus: combined.prayerFocus ?? null,
    scripturesToPrayWith: scripturesToPrayWith ?? null,
    youtubeVideoId: video?.videoId || null,
    youtubeTitle: video?.title || null,
    youtubeChannelId: video?.channelId || null,
    youtubeChannelTitle: video?.channelTitle || null,
    youtubeUrl: video?.url || null,
    queryContext: { query, preferredChannels, timezone },
  });

  return created;
};

export const scheduleDailyRecommendations = () => {
  // Run every hour to ensure today and tomorrow are prepared
  nodeCron.schedule('0 * * * *', async () => {
    const users = await User.findAll({ where: { isActive: true }, include: [{ model: OnboardingData, as: 'onboardingData' }] });
    for (const user of users) {
      const tz = user.timezone || (user as any).onboardingData?.personalInfo?.timezone || 'UTC';
      const today = buildLocalDate(tz);
      const tomorrow = buildLocalDate(tz, new Date(Date.now() + 24 * 60 * 60 * 1000));

      const [todayExists, tomorrowExists] = await Promise.all([
        DailyRecommendation.findOne({ where: { userId: user.id, localDate: today } }),
        DailyRecommendation.findOne({ where: { userId: user.id, localDate: tomorrow } }),
      ]);
      const tasks: Promise<any>[] = [];
      if (!todayExists) tasks.push(enqueueGenerateDailyRecommendation({ userId: user.id, localDate: today, timezone: tz }));
      if (!tomorrowExists) tasks.push(enqueueGenerateDailyRecommendation({ userId: user.id, localDate: tomorrow, timezone: tz }));
      if (tasks.length) await Promise.allSettled(tasks);
    }
  });
};


