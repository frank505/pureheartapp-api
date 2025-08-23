import Badge from '../models/Badge';

export const DEFAULT_BADGES = [
  // Activity badges (non-gated)
  {
    code: 'badge_first_group',
    title: 'Gatherer',
    description: 'Created your first group.',
  icon: 'https://api.iconify.design/lucide/users.svg',
    tier: 'bronze',
  },
  {
    code: 'badge_group_builder_3',
    title: 'Community Builder',
    description: 'Own three or more groups.',
  icon: 'https://api.iconify.design/lucide/hammer.svg',
    tier: 'silver',
  },
  {
    code: 'badge_first_prayer',
    title: 'First Prayer',
    description: 'Posted your first prayer request.',
  icon: 'https://api.iconify.design/ph/hands-praying.svg',
    tier: 'bronze',
  },
  {
    code: 'badge_prayer_warrior_10',
    title: 'Prayer Warrior',
    description: 'Posted 10+ prayer requests.',
  icon: 'https://api.iconify.design/lucide/shield-check.svg',
    tier: 'silver',
  },
  {
    code: 'badge_prayer_warrior_25',
    title: 'Prayer General',
    description: 'Posted 25+ prayer requests.',
  icon: 'https://api.iconify.design/lucide/crown.svg',
    tier: 'gold',
  },
  {
    code: 'badge_first_victory',
    title: 'First Victory',
    description: 'Shared your first victory.',
  icon: 'https://api.iconify.design/lucide/trophy.svg',
    tier: 'bronze',
  },
  {
    code: 'badge_chain_breaker_10',
    title: 'Chain Breaker',
    description: 'Shared 10+ victories.',
  icon: 'https://api.iconify.design/lucide/link-2-off.svg',
    tier: 'silver',
  },
  {
    code: 'badge_encourager_5',
    title: 'Encourager',
    description: 'Left 5+ encouraging comments.',
  icon: 'https://api.iconify.design/lucide/message-square-heart.svg',
    tier: 'bronze',
  },
  {
    code: 'badge_encourager_10',
    title: 'Barnabas',
    description: 'Left 10+ encouraging comments.',
  icon: 'https://api.iconify.design/lucide/medal.svg',
    tier: 'silver',
  },
  {
    code: 'badge_streak_7',
    title: 'Weekly Warrior',
    description: 'Seven days standing strong.',
  icon: 'https://api.iconify.design/lucide/calendar-check-2.svg',
    tier: 'bronze',
  },
  {
    code: 'badge_streak_14',
    title: 'Fortnight Flame',
    description: 'Fourteen days—your fire grows brighter.',
  icon: 'https://api.iconify.design/lucide/flame.svg',
    tier: 'silver',
  },
  {
    code: 'badge_streak_21',
    title: 'Daniel’s Resolve',
    description: 'Twenty-one days—disciplined and determined.',
  icon: 'https://api.iconify.design/lucide/scroll.svg',
    tier: 'silver',
  },
  {
    code: 'badge_streak_30',
    title: 'Mountain Mover',
    description: 'Thirty days—faith that moves mountains.',
  icon: 'https://api.iconify.design/lucide/mountain.svg',
    tier: 'gold',
  },
  {
    code: 'badge_streak_90',
    title: 'Season of Victory',
    description: 'Ninety days—harvest of perseverance.',
  icon: 'https://api.iconify.design/lucide/award.svg',
    tier: 'platinum',
  },
];

export const initializeDefaultBadges = async (): Promise<void> => {
  for (const item of DEFAULT_BADGES) {
    const existing = await Badge.findOne({ where: { code: item.code } });
    if (!existing) {
      await Badge.create(item as any);
    }
  }
};
