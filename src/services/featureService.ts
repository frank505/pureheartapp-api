import { Op } from 'sequelize';
import { ensureUserProgress } from './progressService';
import Victory from '../models/Victory';
import Group from '../models/Group';
import AccountabilityPartner from '../models/AccountabilityPartner';

export type FeatureKey =
  | 'victory_public_post'
  | 'communities_public_create'
  | 'multiple_accountability_partners'
  | 'create_multiple_public_communities'
  | 'post_more_than_one_victory';

const THRESHOLDS: Record<FeatureKey, number> = {
  victory_public_post: 7,
  communities_public_create: 14,
  multiple_accountability_partners: 21,
  create_multiple_public_communities: 30,
  post_more_than_one_victory: 90,
};

export const getFeatureThreshold = (feature: FeatureKey): number => THRESHOLDS[feature];

export const hasFeatureUnlocked = async (userId: number, feature: FeatureKey): Promise<boolean> => {
  const progress = await ensureUserProgress(userId);
  const needed = getFeatureThreshold(feature);
  // Use current relapse-free streak to reflect "past day X where user did not relapse"
  return (progress.currentCheckInStreak || 0) >= needed;
};

export const requireFeatureUnlocked = async (userId: number, feature: FeatureKey): Promise<void> => {
  const ok = await hasFeatureUnlocked(userId, feature);
  if (!ok) {
    const needed = getFeatureThreshold(feature);
    const err = new Error(`Feature locked. Requires a relapse-free check-in streak of ${needed} days.`);
    (err as any).statusCode = 403;
    (err as any).code = 'FEATURE_LOCKED';
    throw err;
  }
};

export const countUserPublicCommunitiesOwned = async (userId: number): Promise<number> => {
  return Group.count({ where: { ownerId: userId, privacy: 'public' } as any });
};

export const countUserVictories = async (userId: number): Promise<number> => {
  return Victory.count({ where: { userId } });
};

export const countAcceptedPartners = async (userId: number): Promise<number> => {
  const result: any = await AccountabilityPartner.count({
    where: {
      usedAt: { [Op.not]: null },
      [Op.or]: [{ userId }, { receiverId: userId }],
    },
  } as any);
  return typeof result === 'number' ? result : Array.isArray(result) ? result.length : 0;
};
