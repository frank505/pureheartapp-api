import axios from 'axios';

export type PublicDomainBibleVersion = 'kjv' | 'web' | 'asv' | 'darby' | 'ylt';

export interface ScriptureResult {
  reference: string;
  text: string;
  version: PublicDomainBibleVersion;
}

const SUPPORTED_VERSIONS: PublicDomainBibleVersion[] = ['kjv', 'web', 'asv', 'darby', 'ylt'];

export const normalizeVersion = (input?: string | null): PublicDomainBibleVersion => {
  if (!input) return 'web';
  const v = String(input).toLowerCase();
  if (v.includes('kjv')) return 'kjv';
  if (v.includes('asv')) return 'asv';
  if (v.includes('darby')) return 'darby';
  if (v.includes('ylt')) return 'ylt';
  if (v.includes('web') || v.includes('world english')) return 'web';
  return 'web';
};

const DAILY_PLAN: string[] = [
  'Psalm 23:1-3',
  'Philippians 4:6-7',
  'Proverbs 3:5-6',
  'Isaiah 41:10',
  'Matthew 11:28-30',
  'Romans 8:28',
  '2 Corinthians 12:9-10',
  'Ephesians 6:10-11',
  'John 14:27',
  'Psalm 46:1-3',
  'James 1:2-4',
  'Hebrews 12:1-2',
  '1 Peter 5:6-7',
  'Psalm 34:17-18',
  'Psalm 121:1-2',
  'Romans 12:2',
  'Galatians 5:22-23',
  'Colossians 3:12-14',
  'Psalm 91:1-2',
  'John 15:5',
  'Romans 5:3-5',
  'Matthew 6:33-34',
  'Psalm 51:10-12',
  'Isaiah 40:31',
  'Psalm 27:1',
  'Psalm 139:23-24',
  '1 Corinthians 10:13',
  '1 John 1:9',
  '2 Timothy 1:7',
  'Micah 6:8',
  'Psalm 19:14'
];

export const getLocalDateString = (tz: string, date?: Date): string => {
  const d = date ?? new Date();
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const p = f.formatToParts(d);
  const y = p.find(x => x.type === 'year')?.value || '1970';
  const m = p.find(x => x.type === 'month')?.value || '01';
  const dd = p.find(x => x.type === 'day')?.value || '01';
  return `${y}-${m}-${dd}`;
};

export const selectDailyReference = (tz: string, date?: Date): string => {
  const d = date ?? new Date();
  const dayOfYear = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
  const idx = dayOfYear % DAILY_PLAN.length;
  const choice = DAILY_PLAN[idx] ?? DAILY_PLAN[0];
  return choice as string;
};

export const fetchPassage = async (reference: string, version: PublicDomainBibleVersion): Promise<ScriptureResult> => {
  const url = `https://bible-api.com/${encodeURIComponent(reference)}?translation=${version}`;
  const res = await axios.get(url, { timeout: 10000 });
  if (!res.data) throw new Error('Empty Bible API response');
  const text = res.data.text || '';
  const ref = res.data.reference || reference;
  return { reference: ref, text: text.trim(), version };
};

export const getDailyScripture = async (tz: string, preferredVersion?: string | null, date?: Date): Promise<ScriptureResult> => {
  const version = normalizeVersion(preferredVersion);
  const ref = selectDailyReference(tz, date);
  return fetchPassage(ref, version);
};


