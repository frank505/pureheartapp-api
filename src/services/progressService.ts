import { Op } from 'sequelize';
import AccountabilityCheckIn from '../models/AccountabilityCheckIn';
import type { CheckInStatus } from '../models/AccountabilityCheckIn';
import PrayerRequest from '../models/PrayerRequest';
import Victory from '../models/Victory';
import AccountabilityComment from '../models/AccountabilityComment';
import Achievement from '../models/Achievement';
import UserAchievement from '../models/UserAchievement';
import UserProgress from '../models/UserProgress';

export interface AnalyticsSummary {
  checkIns: number;
  prayers: number;
  victories: number;
  comments: number;
  currentCheckInStreak: number;
  longestCheckInStreak: number;
}

export const ensureUserProgress = async (userId: number): Promise<UserProgress> => {
  const existing = await UserProgress.findOne({ where: { userId } });
  if (existing) return existing;
  return UserProgress.create({ userId });
};

export const recordCheckInAndUpdateStreak = async (userId: number, createdAt: Date, status: CheckInStatus = 'victory'): Promise<UserProgress> => {
  const progress = await ensureUserProgress(userId);
  const last = progress.lastCheckInDate ? new Date(progress.lastCheckInDate) : null;
  const createdDate = new Date(createdAt);
  const createdDay = new Date(Date.UTC(createdDate.getUTCFullYear(), createdDate.getUTCMonth(), createdDate.getUTCDate()));
  // Always increment total check-ins
  progress.checkInCount += 1;

  // If this check-in is marked as a relapse, reset current streak and store relapse date
  if (status === 'relapse') {
    progress.currentCheckInStreak = 0;
    progress.lastRelapseDate = createdDay;
    progress.lastCheckInDate = createdDay;
    await progress.save();
    return progress;
  }

  // For victory check-ins, continue the streak logic based on consecutive days
  let current = progress.currentCheckInStreak > 0 ? progress.currentCheckInStreak : 0;
  if (last) {
    const lastDay = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate()));
    const diffDays = Math.floor((createdDay.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      // same day, don't increment streak by day
    } else if (diffDays === 1) {
      current = current + 1;
    } else if (diffDays > 1) {
      // gap detected, streak restarts from 1 (today)
      current = 1;
    }
  } else {
    current = 1; // first ever check-in and it's a victory
  }

  // If there was a relapse after the last check-in and before today, ensure streak counted since last relapse
  if (progress.lastRelapseDate) {
    const rel = new Date(progress.lastRelapseDate);
    const relDay = new Date(Date.UTC(rel.getUTCFullYear(), rel.getUTCMonth(), rel.getUTCDate()));
    if (relDay.getTime() === createdDay.getTime()) {
      // same-day victory after relapse still results in 0 current streak; but we already returned above for relapse
      current = 0;
    } else if (last && relDay.getTime() > last.getTime()) {
      // relapse occurred after the last check-in; this victory starts a new streak today
      current = 1;
    }
  }

  const longest = Math.max(progress.longestCheckInStreak, current);
  progress.currentCheckInStreak = current;
  progress.longestCheckInStreak = longest;
  progress.lastCheckInDate = createdDay;
  await progress.save();
  return progress;
};

export const incrementCounter = async (
  userId: number,
  field: keyof Pick<UserProgress, 'prayerCount' | 'victoryCount' | 'commentCount'>
): Promise<UserProgress> => {
  const progress = await ensureUserProgress(userId);
  progress[field] = (progress[field] as number) + 1 as any;
  await progress.save();
  return progress;
};

export const evaluateAndUnlockAchievements = async (userId: number): Promise<UserAchievement[]> => {
  const progress = await ensureUserProgress(userId);
  const all = await Achievement.findAll();
  const unlocked = await UserAchievement.findAll({ where: { userId } });
  const unlockedIds = new Set(unlocked.map((ua) => ua.achievementId));
  const newlyUnlocked: UserAchievement[] = [];

  const valueForKey = (key: string): number => {
    switch (key) {
      case 'checkin_count':
        return progress.checkInCount;
      case 'prayer_count':
        return progress.prayerCount;
      case 'victory_count':
        return progress.victoryCount;
      case 'comment_count':
        return progress.commentCount;
      case 'checkin_streak_current':
        return progress.currentCheckInStreak;
      case 'checkin_streak_longest':
        return progress.longestCheckInStreak;
      default:
        return 0;
    }
  };

  const meetsRequirement = (req: any): boolean => {
    if (!req) return false;
    switch (req.type) {
      case 'checkin_streak':
        return progress.longestCheckInStreak >= req.value || progress.currentCheckInStreak >= req.value;
      case 'checkin_count':
        return progress.checkInCount >= req.value;
      case 'prayer_count':
        return progress.prayerCount >= req.value;
      case 'victory_count':
        return progress.victoryCount >= req.value;
      case 'comment_count':
        return progress.commentCount >= req.value;
      case 'composite': {
        const rules: Array<{ k: string; v: number }> = req.rules ?? [];
        return rules.length > 0 && rules.every((r) => valueForKey(r.k) >= r.v);
      }
      case 'composite_sum': {
        const fields: string[] = req.fields ?? [];
        const sum = fields.reduce((acc, f) => acc + valueForKey(f), 0);
        return sum >= (req.value ?? 0);
      }
      default:
        return false;
    }
  };

  for (const a of all) {
    if (unlockedIds.has(a.id)) continue;
    const req = (a as any).requirement as any;
    const meets = meetsRequirement(req);
    if (meets) {
      const ua = await UserAchievement.create({
        userId,
        achievementId: a.id,
        progressSnapshot: {
          checkInCount: progress.checkInCount,
          prayerCount: progress.prayerCount,
          victoryCount: progress.victoryCount,
          commentCount: progress.commentCount,
          currentCheckInStreak: progress.currentCheckInStreak,
          longestCheckInStreak: progress.longestCheckInStreak,
        },
      });
      newlyUnlocked.push(ua);
    }
  }
  return newlyUnlocked;
};

export const getAchievementsForUser = async (userId: number) => {
  const [all, unlocked] = await Promise.all([
    Achievement.findAll(),
    UserAchievement.findAll({ where: { userId } }),
  ]);
  const unlockedIds = new Set(unlocked.map((ua) => ua.achievementId));
  // Build a transient progress to compute canUnlock
  const progress = await ensureUserProgress(userId);
  const valueForKey = (key: string): number => {
    switch (key) {
      case 'checkin_count':
        return progress.checkInCount;
      case 'prayer_count':
        return progress.prayerCount;
      case 'victory_count':
        return progress.victoryCount;
      case 'comment_count':
        return progress.commentCount;
      case 'checkin_streak_current':
        return progress.currentCheckInStreak;
      case 'checkin_streak_longest':
        return progress.longestCheckInStreak;
      default:
        return 0;
    }
  };
  const meetsRequirement = (req: any): boolean => {
    if (!req) return false;
    switch (req.type) {
      case 'checkin_streak':
        return progress.longestCheckInStreak >= req.value || progress.currentCheckInStreak >= req.value;
      case 'checkin_count':
        return progress.checkInCount >= req.value;
      case 'prayer_count':
        return progress.prayerCount >= req.value;
      case 'victory_count':
        return progress.victoryCount >= req.value;
      case 'comment_count':
        return progress.commentCount >= req.value;
      case 'composite': {
        const rules: Array<{ k: string; v: number }> = req.rules ?? [];
        return rules.length > 0 && rules.every((r) => valueForKey(r.k) >= r.v);
      }
      case 'composite_sum': {
        const fields: string[] = req.fields ?? [];
        const sum = fields.reduce((acc, f) => acc + valueForKey(f), 0);
        return sum >= (req.value ?? 0);
      }
      default:
        return false;
    }
  };

  return all.map((a) => ({
    id: a.id,
    code: (a as any).code,
    title: (a as any).title,
    description: (a as any).description,
    category: (a as any).category,
    tier: (a as any).tier,
    requirement: (a as any).requirement,
    points: (a as any).points,
    icon: (a as any).icon,
    scriptureRef: (a as any).scriptureRef,
    blessingText: (a as any).blessingText,
    unlocked: unlockedIds.has(a.id),
    unlockedAt: unlocked.find((ua) => ua.achievementId === a.id)?.unlockedAt ?? null,
    canUnlock: !unlockedIds.has(a.id) && meetsRequirement((a as any).requirement),
  }));
};

export const getCalendarForMonth = async (userId: number, month: string) => {
  const parts = month.split('-');
  const yearStr: string = parts[0] ?? '';
  const monStr: string = parts[1] ?? '';
  const year = parseInt(yearStr, 10);
  const mon = parseInt(monStr, 10);
  if (Number.isNaN(year) || Number.isNaN(mon) || mon < 1 || mon > 12) {
    throw new Error('Invalid month format. Expected YYYY-MM');
  }
  const start = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, mon, 0, 23, 59, 59));
  const victories = await Victory.findAll({
    where: {
      userId,
      createdAt: { [Op.between]: [start, end] } as any,
    },
    attributes: ['createdAt'],
  });
  const days: Record<string, { victory?: boolean }> = {};
  for (const v of victories) {
    const d = new Date(v.createdAt);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    days[key] = { victory: true };
  }
  return { days };
};

export const getAnalytics = async (userId: number, period: 'last_4_weeks' | 'all_time'): Promise<AnalyticsSummary> => {
  const progress = await ensureUserProgress(userId);
  if (period === 'all_time') {
    return {
      checkIns: progress.checkInCount,
      prayers: progress.prayerCount,
      victories: progress.victoryCount,
      comments: progress.commentCount,
      currentCheckInStreak: progress.currentCheckInStreak,
      longestCheckInStreak: progress.longestCheckInStreak,
    };
  }
  const now = new Date();
  const start = new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000);
  const [checkIns, prayers, victories, comments] = await Promise.all([
    AccountabilityCheckIn.count({ where: { userId, createdAt: { [Op.gte]: start } as any } }),
    PrayerRequest.count({ where: { userId, createdAt: { [Op.gte]: start } as any } }),
    Victory.count({ where: { userId, createdAt: { [Op.gte]: start } as any } }),
    AccountabilityComment.count({ where: { userId, createdAt: { [Op.gte]: start } as any } }),
  ]);
  return {
    checkIns,
    prayers,
    victories,
    comments,
    currentCheckInStreak: progress.currentCheckInStreak,
    longestCheckInStreak: progress.longestCheckInStreak,
  };
};


