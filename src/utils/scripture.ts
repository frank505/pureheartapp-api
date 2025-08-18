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
  // Hope and Encouragement
  'Psalm 23:1-3', 'Philippians 4:6-7', 'Proverbs 3:5-6', 'Isaiah 41:10', 'Matthew 11:28-30',
  'Romans 8:28', '2 Corinthians 12:9-10', 'Ephesians 6:10-11', 'John 14:27', 'Psalm 46:1-3',
  'Isaiah 40:31', 'Jeremiah 29:11', 'Lamentations 3:22-23', 'Romans 15:13', 'Psalm 27:13-14',
  
  // Strength and Recovery
  'James 1:2-4', 'Hebrews 12:1-2', '1 Peter 5:6-7', 'Psalm 34:17-18', 'Psalm 121:1-2',
  '1 Corinthians 10:13', 'Isaiah 43:18-19', 'Joel 2:25-26', 'Psalm 147:3', 'Isaiah 61:1-3',
  'Psalm 51:10-12', 'Galatians 6:9', '2 Corinthians 5:17', 'Romans 8:37-39', 'Philippians 1:6',
  
  // Faith and Trust
  'Romans 12:2', 'Galatians 5:22-23', 'Colossians 3:12-14', 'Psalm 91:1-2', 'John 15:5',
  'Hebrews 11:1', 'Mark 11:24', 'Matthew 17:20', '2 Corinthians 5:7', 'Psalm 112:7',
  'Romans 10:17', '1 John 5:4', 'James 2:17', 'Hebrews 10:23', 'Psalm 37:3-4',
  
  // Peace and Comfort
  'Romans 5:3-5', 'Matthew 6:33-34', 'Isaiah 26:3', 'John 16:33', 'Philippians 4:13',
  'Psalm 55:22', '2 Thessalonians 3:16', 'Colossians 3:15', '1 Peter 5:10', 'Isaiah 54:10',
  'Psalm 29:11', 'Romans 15:33', 'John 20:19', '2 Corinthians 13:11', 'Numbers 6:24-26',
  
  // Love and Relationships
  'Psalm 27:1', 'Psalm 139:23-24', '1 John 4:7-8', '1 Corinthians 13:4-7', 'John 13:34-35',
  'Romans 12:9-10', 'Ephesians 4:2-3', '1 Peter 4:8', 'Colossians 3:14', '1 John 4:19',
  'Romans 13:8', 'John 15:12-13', '1 Corinthians 16:14', 'Proverbs 17:17', 'Ephesians 5:2',
  
  // Wisdom and Guidance
  '1 John 1:9', '2 Timothy 1:7', 'Micah 6:8', 'Psalm 19:14', 'James 1:5',
  'Proverbs 4:5-7', 'Psalm 32:8', 'Proverbs 2:6', 'Ecclesiastes 7:12', 'Colossians 2:2-3',
  'Proverbs 9:10', 'James 3:17', 'Proverbs 16:16', 'Psalm 111:10', '1 Kings 3:9',
  
  // Victory and Overcoming
  'Joshua 1:9', '1 John 5:4-5', 'Romans 8:31', 'Deuteronomy 20:4', '2 Chronicles 20:15',
  'Isaiah 54:17', '1 Corinthians 15:57', 'Deuteronomy 31:6', '2 Timothy 4:7-8', 'Revelation 12:11',
  'Psalm 18:2', 'Romans 12:21', '1 John 4:4', 'James 4:7', 'Zechariah 4:6',
  
  // Grace and Mercy
  'Ephesians 2:8-9', 'Hebrews 4:16', 'Titus 2:11-12', '2 Corinthians 9:8', 'Romans 6:14',
  'James 4:6', '1 Peter 5:10', 'Romans 5:20-21', 'Hebrews 13:9', '2 Timothy 2:1',
  'Lamentations 3:22-23', 'Psalm 103:8', 'Isaiah 30:18', 'Micah 7:18', '1 Timothy 1:13-14',
  
  // Healing and Restoration
  'Jeremiah 17:14', 'Psalm 30:2', 'James 5:14-15', 'Isaiah 53:5', '3 John 1:2',
  'Psalm 103:2-3', 'Exodus 15:26', 'Jeremiah 30:17', 'Psalm 41:3', 'Matthew 10:1',
  'Mark 5:34', 'Acts 10:38', 'Matthew 8:17', '1 Peter 2:24', 'Malachi 4:2',
  
  // Purpose and Calling
  'Jeremiah 1:5', 'Ephesians 2:10', 'Philippians 3:14', '2 Timothy 1:9', 'Romans 8:28-30',
  '1 Peter 2:9', 'Isaiah 43:1', 'Psalm 138:8', 'Colossians 3:23-24', '1 Corinthians 7:17',
  'Philippians 1:6', 'Jeremiah 29:11', '2 Thessalonians 1:11', 'Acts 13:36', 'Ephesians 4:1',
  
  // Joy and Gladness
  'Psalm 16:11', 'Nehemiah 8:10', 'John 15:11', 'Psalm 30:5', 'Isaiah 61:3',
  'Romans 15:13', 'Psalm 126:5-6', 'James 1:2-3', 'Psalm 28:7', '1 Peter 1:8-9',
  'Habakkuk 3:18', 'Psalm 43:4', 'Isaiah 55:12', 'Zephaniah 3:17', 'Psalm 47:1',
  
  // Protection and Safety
  'Psalm 91:1-4', '2 Thessalonians 3:3', 'Isaiah 41:10', 'Psalm 121:7-8', 'Proverbs 18:10',
  'Psalm 34:7', 'Isaiah 54:17', '2 Samuel 22:3-4', 'Nahum 1:7', 'Psalm 46:1',
  'Deuteronomy 31:6', 'Psalm 32:7', 'Proverbs 3:23-24', 'Isaiah 43:2', 'Psalm 5:11',
  
  // Promises and Faithfulness
  'Joshua 21:45', '2 Corinthians 1:20', '2 Peter 1:4', 'Hebrews 10:23', 'Numbers 23:19',
  'Deuteronomy 7:9', 'Psalm 89:8', '1 Kings 8:56', '2 Timothy 2:13', 'Lamentations 3:23',
  'Isaiah 25:1', '1 Thessalonians 5:24', 'Psalm 145:13', 'Romans 4:21', 'Hebrews 6:18',
  
  // New Life and Transformation
  '2 Corinthians 5:17', 'Ezekiel 36:26', 'Romans 6:4', 'Colossians 3:9-10', 'Galatians 2:20',
  'Romans 12:2', 'Ephesians 4:22-24', 'Titus 3:5', '1 Peter 1:3', 'John 3:3',
  'Romans 8:11', 'Philippians 3:20-21', '2 Corinthians 3:18', 'Isaiah 43:19', 'Revelation 21:5',
  
  // Prayer and Supplication
  'Matthew 7:7-8', 'Philippians 4:6-7', 'James 5:16', '1 John 5:14-15', 'Mark 11:24',
  'Romans 8:26', 'Jeremiah 33:3', 'Matthew 6:6', 'Colossians 4:2', '1 Thessalonians 5:17',
  'Luke 18:1', 'Psalm 145:18', 'Hebrews 4:16', 'James 1:6', 'Ephesians 6:18',
  
  // Additional Verses for Daily Strength
  'Isaiah 12:2', 'Psalm 118:14', 'Habakkuk 3:19', '2 Corinthians 4:16', 'Ephesians 3:16',
  'Colossians 1:11', 'Isaiah 40:29', 'Psalm 138:3', 'Nehemiah 8:10', '1 Chronicles 16:11',
  'Psalm 73:26', 'Isaiah 40:31', 'Philippians 4:13', '2 Timothy 4:17', 'Exodus 15:2'
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

// Hydrate a list of scripture references with full verse text via bible-api.com
export const hydrateScripturesList = async (
  list: Array<{ reference: string; reason?: string; text?: string; version?: string }>,
  preferredVersion?: string | null
): Promise<Array<{ reference: string; reason?: string; text?: string; version?: string }>> => {
  const version = normalizeVersion(preferredVersion);
  const results: Array<{ reference: string; reason?: string; text?: string; version?: string }> = [];
  for (const s of list) {
    if (s.text && s.text.trim()) {
      // Ensure version present even if text already provided
      results.push({ ...s, version: s.version || version });
      continue;
    }
    try {
      const passage = await fetchPassage(s.reference, version);
      results.push({ ...s, reference: passage.reference, text: passage.text, version });
    } catch {
      // Keep at least the reference and version if fetch fails
      results.push({ ...s, version });
    }
  }
  return results;
};


