import Achievement from '../models/Achievement';

export const DEFAULT_ACHIEVEMENTS = [
  // Check-in Streak Achievements aligned with feature unlocks: 7, 14, 21, 30, 90 days
  {
    code: 'streak_7',
    title: 'Weekly Walk',
    description: 'Check in 7 days in a row.',
    category: 'streak',
    tier: 'bronze',
    requirement: { type: 'checkin_streak', value: 7 },
    points: 25,
    scriptureRef: 'Hebrews 12:1',
    blessingText: 'Run with endurance the race set before you.',
    icon: 'streak_bronze',
  },
  {
    code: 'streak_14',
    title: 'Fortnight of Faith',
    description: 'Check in 14 days in a row.',
    category: 'streak',
    tier: 'silver',
    requirement: { type: 'checkin_streak', value: 14 },
    points: 50,
    scriptureRef: 'Psalm 1:2-3',
    blessingText: 'Rooted by streams of living water.',
    icon: 'streak_silver',
  },
  {
    code: 'streak_21',
    title: 'Daniel Fast of Faith',
    description: 'Check in 21 days in a row.',
    category: 'streak',
    tier: 'silver',
    requirement: { type: 'checkin_streak', value: 21 },
    points: 75,
    scriptureRef: 'Daniel 10:3',
    blessingText: 'Your perseverance is heard in heaven.',
    icon: 'streak_silver_2',
  },
  {
    code: 'streak_30',
    title: 'Mountain Mover',
    description: 'Check in 30 days in a row.',
    category: 'streak',
    tier: 'gold',
    requirement: { type: 'checkin_streak', value: 30 },
    points: 120,
    scriptureRef: 'Matthew 17:20',
    blessingText: 'Faith that moves mountains grows day by day.',
    icon: 'streak_gold',
  },
  {
    code: 'streak_90',
    title: 'Season of Victory',
    description: 'Check in 90 days in a row.',
    category: 'streak',
    tier: 'platinum',
    requirement: { type: 'checkin_streak', value: 90 },
    points: 300,
    scriptureRef: 'Galatians 6:9',
    blessingText: 'In due season you will reap if you do not give up.',
    icon: 'streak_platinum',
  },
];

export const initializeDefaultAchievements = async (): Promise<void> => {
  for (const item of DEFAULT_ACHIEVEMENTS) {
    const existing = await Achievement.findOne({ where: { code: item.code } });
    if (!existing) {
      await Achievement.create({ ...item, category: String((item as any).category) } as any);
    }
  }
};


