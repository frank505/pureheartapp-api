import { revenuecatConfig } from '../config/environment';
import Subscription from '../models/Subscription';
import { User } from '../models';
import { Op } from 'sequelize';

interface RevenueCatWebhookEvent {
  event: {
    id: string;
    type: string; // e.g. INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION
    app_id?: string;
    event_timestamp_ms?: number;
    products?: any[];
    entitlement_id?: string;
    // ... other RC top-level fields (we mainly care about payload.entitlement)
  };
  app_user_id: string;
  environment: string; // SANDBOX / PRODUCTION
  product_id?: string;
  store?: string; // app_store / play_store / stripe etc.
  // Newer RC schema nests data under 'entitlement' or 'transaction' objects; we handle defensively.
  entitlement?: {
    identifier?: string;
    is_active?: boolean;
    will_renew?: boolean;
    latest_purchase_date?: string;
    original_purchase_date?: string;
    expiration_date?: string | null;
    product_identifier?: string;
    store?: string;
    period_type?: 'TRIAL' | 'INTRO' | 'NORMAL';
  };
  transaction?: {
    id?: string; // store_transaction_id
    purchase_date?: string;
    expiration_date?: string | null;
    product_identifier?: string;
    store?: string;
  };
}

// Normalize platform from RevenueCat store nomenclature
const mapStoreToPlatform = (store?: string): Subscription['platform'] => {
  switch (store) {
    case 'app_store':
    case 'mac_app_store':
      return 'apple';
    case 'play_store':
      return 'google';
    case 'stripe':
      return 'stripe';
    case 'amazon':
      return 'amazon';
    case 'promotional':
      return 'promotional';
    default:
      return 'unknown';
  }
};

// Normalize period type
const mapPeriodType = (period?: string | null): Subscription['periodType'] => {
  if (!period) return null;
  switch (period.toLowerCase()) {
    case 'trial': return 'trial';
    case 'intro': return 'intro';
    case 'normal': return 'normal';
    default: return null;
  }
};

export class SubscriptionService {
  /** Return the active subscription (premium) for a user */
  static async getActivePremiumForUser(userId: number) {
    const now = new Date();
    return Subscription.findOne({
      where: {
        userId,
        entitlementId: revenuecatConfig.entitlementPremium,
        isActive: true,
        [Op.or]: [
          { expirationDate: null },
          { expirationDate: { [Op.gt]: now } }
        ]
      },
      order: [['expirationDate', 'DESC']],
    });
  }

  /** Upsert subscription record from RevenueCat webhook */
  static async upsertFromRevenueCat(event: RevenueCatWebhookEvent) {
    const entitlement = event.entitlement || (event as any).payload?.entitlement; // fallback
    const transaction = event.transaction || (event as any).payload?.transaction;
    if (!entitlement) {
      return { skipped: true, reason: 'No entitlement in payload' };
    }
    const entitlementId = entitlement.identifier || entitlement.entitlement_identifier || null;
    const productId = entitlement.product_identifier || entitlement.productIdentifier || event.product_id || null;
    const expirationISO = entitlement.expiration_date || transaction?.expiration_date || null;
    const originalISO = entitlement.original_purchase_date || transaction?.purchase_date || entitlement.latest_purchase_date || null;
    const willRenew = Boolean(entitlement.will_renew);
    const isActive = Boolean(entitlement.is_active);
    const platform = mapStoreToPlatform(entitlement.store || transaction?.store || event.store);
    const periodType = mapPeriodType(entitlement.period_type || (entitlement as any).periodType || null);
    const storeTransactionId = transaction?.id || (event as any).transaction_id || null;

    // Ensure user exists (app_user_id expected to map to numeric user ID; adjust if using UUID)
    const userIdNum = parseInt(event.app_user_id, 10);
    const user = await User.findByPk(userIdNum);
    if (!user) {
      return { skipped: true, reason: 'User not found for app_user_id', appUserId: event.app_user_id };
    }

    // Find existing subscription row (by user + entitlement)
    const existing = await Subscription.findOne({
      where: { userId: user.id, entitlementId: entitlementId },
    });

    const data = {
      userId: user.id,
      appUserId: event.app_user_id,
      platform,
      productId,
      entitlementId,
      storeTransactionId,
      originalPurchaseDate: originalISO ? new Date(originalISO) : null,
      expirationDate: expirationISO ? new Date(expirationISO) : null,
      willRenew,
      isActive,
      periodType,
      environment: event.environment?.toLowerCase() || null,
      lastEventAt: event.event?.event_timestamp_ms ? new Date(event.event.event_timestamp_ms) : new Date(),
      lastEventType: event.event?.type || null,
      latestPayload: {
        event: event.event?.type,
        entitlement: entitlementId,
        platform,
        productId,
        willRenew,
        isActive,
        expirationISO,
      },
    } as any;

    let record: Subscription;
    if (existing) {
      await existing.update(data);
      record = existing;
    } else {
      record = await Subscription.create(data);
    }

    return { skipped: false, record };
  }
}

export default SubscriptionService;