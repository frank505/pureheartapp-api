import User from '../models/User';
import { SubscriptionService } from './subscriptionService';

const TRIAL_DAYS = 7;

export interface LLMAccessResult {
  allowed: boolean;
  mode?: 'trial' | 'premium';
  reason?: string;
  feature?: string;
  trialEndsAt?: string;
}

async function getUser(userId: number) {
  return User.findByPk(userId);
}

export async function hasActiveTrial(user: User): Promise<boolean> {
  const ageMs = Date.now() - user.createdAt.getTime();
  return ageMs < TRIAL_DAYS * 86400000;
}

export async function hasActivePremium(userId: number): Promise<boolean> {
  const sub = await SubscriptionService.getActivePremiumForUser(userId);
  return !!sub;
}

export async function requireLLMAccess(userId: number, feature: string): Promise<LLMAccessResult> {
  const user = await getUser(userId);
  if (!user) return { allowed: false, reason: 'USER_NOT_FOUND', feature };
  const trial = await hasActiveTrial(user);
  if (trial) {
    return { allowed: true, mode: 'trial', feature, trialEndsAt: new Date(user.createdAt.getTime() + TRIAL_DAYS * 86400000).toISOString() };
  }
  const premium = await hasActivePremium(userId);
  if (premium) return { allowed: true, mode: 'premium', feature };
  return { allowed: false, reason: 'PAYWALL', feature, trialEndsAt: new Date(user.createdAt.getTime() + TRIAL_DAYS * 86400000).toISOString() };
}

export function paywallResponse(feature: string, trialEndsAt?: string) {
  return {
    success: false,
    paywall: true,
    feature,
    message: 'Subscription required',
    trialEnded: true,
    trialEndsAt,
    statusCode: 402,
  };
}
