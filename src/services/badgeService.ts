import Badge from '../models/Badge';
import UserBadge from '../models/UserBadge';
import Group from '../models/Group';
import UserProgress from '../models/UserProgress';

export const awardBadge = async (userId: number, code: string) => {
  const badge = await Badge.findOne({ where: { code } });
  if (!badge) return null;
  const [userBadge] = await UserBadge.findOrCreate({
    where: { userId, badgeId: badge.id },
    defaults: { userId, badgeId: badge.id, unlockedAt: new Date() },
  });
  return userBadge;
};

export const awardForGroupCreation = async (userId: number) => {
  // First group badge
  await awardBadge(userId, 'badge_first_group');
  // Builder badge for 3+ owned groups (any privacy)
  const groupsOwned = await Group.count({ where: { ownerId: userId } });
  if (groupsOwned >= 3) {
    await awardBadge(userId, 'badge_group_builder_3');
  }
};

export const awardForPrayerProgress = async (userId: number) => {
  const progress = await UserProgress.findOne({ where: { userId } });
  if (!progress) return;
  if (progress.prayerCount >= 1) {
    await awardBadge(userId, 'badge_first_prayer');
  }
  if (progress.prayerCount >= 10) {
    await awardBadge(userId, 'badge_prayer_warrior_10');
  }
  if (progress.prayerCount >= 25) {
    await awardBadge(userId, 'badge_prayer_warrior_25');
  }
};

export const awardForVictoryProgress = async (userId: number) => {
  const progress = await UserProgress.findOne({ where: { userId } });
  if (!progress) return;
  if (progress.victoryCount >= 1) {
    await awardBadge(userId, 'badge_first_victory');
  }
  if (progress.victoryCount >= 10) {
    await awardBadge(userId, 'badge_chain_breaker_10');
  }
};

export const awardForCommentProgress = async (userId: number) => {
  const progress = await UserProgress.findOne({ where: { userId } });
  if (!progress) return;
  if (progress.commentCount >= 5) {
    await awardBadge(userId, 'badge_encourager_5');
  }
  if (progress.commentCount >= 10) {
    await awardBadge(userId, 'badge_encourager_10');
  }
};
