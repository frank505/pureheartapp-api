import { Queue, Worker, JobsOptions } from 'bullmq';
import nodeCron from 'node-cron';
import { queueManager, QUEUE_NAMES, queueConnection } from '../config/queue';
import { google } from 'googleapis';
import DailyRecommendation from '../models/DailyRecommendation';
import { OnboardingData, User } from '../models';
import { geminiConfig, youtubeConfig } from '../config/environment';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDailyScripture } from '../utils/scripture';

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
  if (!geminiConfig.apiKey) return baseQuery;
  try {
    const genAI = new GoogleGenerativeAI(geminiConfig.apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `Create a concise YouTube search query (max 10 words) for a Christian devotional or sermon based on this onboarding data. Prefer short, uplifting daily content. Return ONLY the query text without quotes.\nOnboarding: ${JSON.stringify(onboarding?.toJSON?.() ?? onboarding ?? {})}\nBase query: ${baseQuery}`;
    const resp = await model.generateContent(prompt);
    const text = resp.response.text().trim();
    if (text && text.length >= 3 && text.length <= 80) {
      return text.replace(/^"|"$/g, '');
    }
  } catch (err) {
    // swallow errors and fallback to base query
  }
  return baseQuery;
};

const fetchScripture = async (bibleVersion?: string): Promise<{ reference: string; text: string } | null> => {
  // Placeholder: In a real integration, pull from a scripture API keyed by version
  const version = bibleVersion || 'NIV';
  return { reference: 'Psalm 23:1-3', text: `The LORD is my shepherd... (${version})` };
};

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
    const { userId, localDate, timezone } = job.data as GenerateDailyRecJob;
    const existing = await DailyRecommendation.findOne({ where: { userId, localDate } });
    if (existing) return existing;

    const onboarding = await OnboardingData.findOne({ where: { userId } });
    const seed = buildSearchQuery(onboarding);
    const refinedQuery = await maybeRefineQueryWithGemini(seed.query, onboarding);
    const query = refinedQuery || seed.query;
    const bibleVersion = seed.bibleVersion;
    const preferredChannels = seed.preferredChannels;

    const scripture = await getDailyScripture(timezone, bibleVersion);

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
      youtubeVideoId: video?.videoId || null,
      youtubeTitle: video?.title || null,
      youtubeChannelId: video?.channelId || null,
      youtubeChannelTitle: video?.channelTitle || null,
      youtubeUrl: video?.url || null,
      queryContext: { query, preferredChannels, timezone },
    });

    return created;
  }, { connection: queueConnection });

  queueManager.addWorker(QUEUE_NAMES.ANALYTICS, worker);

  return worker;
};

export const scheduleDailyRecommendations = () => {
  // Run every hour to ensure today and tomorrow are prepared
  nodeCron.schedule('0 * * * *', async () => {
    const users = await User.findAll({ where: { isActive: true }, include: [{ model: OnboardingData, as: 'onboardingData' }] });
    for (const user of users) {
      const tz = user.timezone || (user as any).onboardingData?.personalInfo?.timezone || 'UTC';
      const today = buildLocalDate(tz);
      const tomorrow = buildLocalDate(tz, new Date(Date.now() + 24 * 60 * 60 * 1000));

      const todayExists = await DailyRecommendation.findOne({ where: { userId: user.id, localDate: today } });
      if (!todayExists) {
        await enqueueGenerateDailyRecommendation({ userId: user.id, localDate: today, timezone: tz });
      }

      const tomorrowExists = await DailyRecommendation.findOne({ where: { userId: user.id, localDate: tomorrow } });
      if (!tomorrowExists) {
        await enqueueGenerateDailyRecommendation({ userId: user.id, localDate: tomorrow, timezone: tz });
      }
    }
  });
};


