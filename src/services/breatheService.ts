import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiConfig } from '../config/environment';
import { normalizeVersion } from '../utils/scripture';
import path from 'path';
import fs from 'fs';
import { appConfig } from '../config/environment';

export type Feeling =
  | 'anxious'
  | 'stressed'
  | 'sad'
  | 'lonely'
  | 'ashamed'
  | 'angry'
  | 'tempted'
  | 'grateful'
  | 'hopeful'
  | 'tired'
  | 'overwhelmed'
  | 'fearful'
  | 'grieving'
  | 'joyful'
  | 'numb'
  | 'discouraged';

export interface BreathingPattern {
  inhale: number; // seconds
  hold: number; // seconds
  exhale: number; // seconds
  rest?: number; // seconds
}

export interface OverlayStep {
  phase: 'inhale' | 'hold' | 'exhale' | 'rest';
  seconds: number;
  text: string;
}

export interface BreatheAnalysisOptions {
  cycles?: number;
  bibleVersion?: string | null;
}

export interface BreatheAnalysisResult {
  feeling: Feeling;
  sentiment: 'negative' | 'neutral' | 'positive';
  confidence: number; // 0..1
  summary: string;
  keywords: string[];
  affirmations: string[];
  breathing: BreathingPattern;
  overlays: OverlayStep[]; // for the requested number of cycles
  textAndScriptures: string[]; // ordered list of short supportive lines and scripture lines
  asmrTips: string[]; // optional client hints
  asmrAudioUrl?: string | undefined; // selected 1-min audio clip URL
  asmrAudioName?: string | undefined; // filename or friendly title
}

const FEELING_KEYWORDS: Record<Feeling, string[]> = {
  anxious: ['anxious', 'anxiety', 'panic', 'uneasy', 'worry', 'worried', 'nervous', 'racing'],
  stressed: ['stress', 'stressed', 'pressured', 'tense', 'tight', 'burned out', 'burnout'],
  sad: ['sad', 'down', 'blue', 'depressed', 'low', 'tearful'],
  lonely: ['lonely', 'alone', 'isolated', "no one", 'nobody'],
  ashamed: ['ashamed', 'shame', 'guilty', 'guilt', 'regret', 'unworthy', 'condemn'],
  angry: ['angry', 'mad', 'rage', 'furious', 'irritated', 'resent'],
  tempted: ['tempted', 'urge', 'craving', 'triggered', 'weak'],
  grateful: ['grateful', 'thankful', 'thanks', 'blessed'],
  hopeful: ['hopeful', 'hope', 'optimistic'],
  tired: ['tired', 'weary', 'exhausted', 'fatigued', 'drained'],
  overwhelmed: ['overwhelmed', 'too much', 'overloaded', 'can\'t handle', 'flooded'],
  fearful: ['fear', 'afraid', 'scared', 'terrified'],
  grieving: ['grief', 'grieving', 'loss', 'mourning', 'miss them'],
  joyful: ['joy', 'joyful', 'happy', 'glad', 'praise'],
  numb: ['numb', 'empty', 'nothing', 'detached'],
  discouraged: ['discouraged', 'hopeless', 'give up', 'defeated']
};

// Scriptures will be provided by the model within textAndScriptures; no hardcoded refs here.

const DEFAULT_PATTERN: BreathingPattern = { inhale: 4, hold: 4, exhale: 6, rest: 2 };

const DEFAULT_AFFIRMATIONS: Record<Feeling, string[]> = {
  anxious: ["In Christ, I am safe.", "God\'s peace guards my heart."],
  stressed: ["God carries what I can\'t.", 'I rest in His strength.'],
  sad: ["God is near to my broken heart.", 'Joy will come again.'],
  lonely: ["Jesus is with me.", 'I am not alone.'],
  ashamed: ['In Jesus, I am forgiven.', 'There is no condemnation now.'],
  angry: ['Lord, slow me down.', 'I choose a gentle spirit.'],
  tempted: ['God makes a way out.', 'I walk by the Spirit.'],
  grateful: ['Thank You for today.', 'Your goodness surrounds me.'],
  hopeful: ['My hope is in You.', 'You are faithful.'],
  tired: ['You renew my strength.', 'You restore my soul.'],
  overwhelmed: ['Lead me to the Rock.', 'You hold all things together.'],
  fearful: ['When I fear, I trust You.', 'You are my refuge.'],
  grieving: ['You catch my tears.', 'You are close to me.'],
  joyful: ['I rejoice in You.', 'Your joy is my strength.'],
  numb: ['Breathe new life in me.', 'Create in me a clean heart.'],
  discouraged: ['Be strong and courageous.', 'I won\'t give up.'],
};

function scoreKeywords(input: string): { feeling: Feeling; score: number; hits: string[] } {
  const text = input.toLowerCase();
  let best: { feeling: Feeling; score: number; hits: string[] } | null = null;
  (Object.keys(FEELING_KEYWORDS) as Feeling[]).forEach((f) => {
    const found: string[] = [];
    let score = 0;
    for (const k of FEELING_KEYWORDS[f]) {
      if (text.includes(k)) {
        found.push(k);
        score += 1;
      }
    }
    if (!best || score > best.score) best = { feeling: f, score, hits: found };
  });
  return best || { feeling: 'anxious', score: 0, hits: [] };
}

type PromptAudioChoice = { name: string; tags: string[] };

async function classifyWithGemini(
  text: string,
  audioChoices: PromptAudioChoice[]
): Promise<{
  feeling: Feeling;
  sentiment: 'negative'|'neutral'|'positive';
  confidence: number;
  summary: string;
  keywords: string[];
  textAndScriptures: string[];
  audioFile?: string | undefined;
}> {
  const apiKey = geminiConfig.apiKey;
  if (!apiKey) {
    const s = scoreKeywords(text);
    const confidence = Math.min(0.9, 0.4 + 0.2 * s.score);
    const audioName = heuristicAudioPick(s.feeling, audioChoices) || undefined;
    return {
      feeling: s.feeling,
      sentiment: 'neutral',
      confidence,
      summary: `Detected cues: ${s.hits.join(', ') || 'none'}.` ,
      keywords: s.hits,
      textAndScriptures: [
        'Breathe: Jesus is near to me.',
        'Be still, and know that I am God. - Psalm 46:10',
      ],
      audioFile: audioName,
    };
  }

  try {
    const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const schema = (Object.keys(FEELING_KEYWORDS) as Feeling[]).join(', ');
    const prompt = `You are a compassionate assistant for a Christian breathing feature (ASMR-style overlays). Given the user's text, do ALL of the following and return STRICT JSON only:
{
  "feeling": "<one of: ${schema}>",
  "sentiment": "negative|neutral|positive",
  "confidence": <number 0..1>,
  "summary": "1-2 very short sentences",
  "keywords": ["word1","word2"],
  "textAndScriptures": [
    // 5-9 short lines total, mixing brief supportive phrases and full Bible verse snippets with references.
    // Keep each line <= 120 chars; include reference like "- Psalm 46:10" when it is scripture.
  ],
  "audioFile": "<exact name from list below>"
}
Notes:
- feeling MUST be one of [${schema}]. If uncertain, choose the closest.
- Keep phrases gentle and non-judgmental, suitable for on-screen overlays while breathing in and out.
- Prefer public domain-friendly verses (KJV/WEB/ASV) phrasing; short snippets are fine.
 - Choose ONE audioFile from this list (name property only): ${JSON.stringify(audioChoices)}
User text: "${text.replace(/"/g, '\\"')}"`;
  const result = await model.generateContent(prompt);
    const raw = result.response.text();
    // Try to parse JSON reliably
    let jsonText = raw.trim();
    const first = jsonText.indexOf('{');
    const last = jsonText.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      jsonText = jsonText.slice(first, last + 1);
    }
    const parsed = JSON.parse(jsonText);
    const feeling = (parsed.feeling || '').toString().toLowerCase().trim();
    const allowed = new Set(Object.keys(FEELING_KEYWORDS));
    const validFeeling = (allowed.has(feeling) ? feeling : 'anxious') as Feeling;
    const audioFile = String(parsed.audioFile || '').trim();
    return {
      feeling: validFeeling,
      sentiment: (String(parsed.sentiment || 'neutral').toLowerCase() as any) === 'positive' ? 'positive' : ((String(parsed.sentiment || 'neutral').toLowerCase() as any) === 'negative' ? 'negative' : 'neutral'),
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.6))),
      summary: String(parsed.summary || '').slice(0, 240),
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map((k: any) => String(k)) : [],
      textAndScriptures: Array.isArray(parsed.textAndScriptures) ? parsed.textAndScriptures.map((s: any) => String(s)).slice(0, 12) : [],
      audioFile,
    };
  } catch {
    const s = scoreKeywords(text);
    const audioName = heuristicAudioPick(s.feeling, audioChoices) || undefined;
    return { feeling: s.feeling, sentiment: 'neutral', confidence: 0.55, summary: 'Lightweight keyword classification.', keywords: s.hits, textAndScriptures: ['Breathe: Jesus is near to me.'], audioFile: audioName } as any;
  }
}

function buildOverlays(feeling: Feeling, pattern: BreathingPattern, cycles: number, affirmations: string[]): OverlayStep[] {
  const baseInhale = affirmations[0] || 'Jesus, You are my peace';
  const baseExhale = affirmations[1] || 'I release this into Your hands';
  const steps: OverlayStep[] = [];
  for (let i = 0; i < Math.max(1, cycles); i++) {
    steps.push({ phase: 'inhale', seconds: pattern.inhale, text: baseInhale });
    steps.push({ phase: 'hold', seconds: pattern.hold, text: 'Hold — You are with me' });
    steps.push({ phase: 'exhale', seconds: pattern.exhale, text: baseExhale });
    if (pattern.rest && pattern.rest > 0) {
      steps.push({ phase: 'rest', seconds: pattern.rest, text: 'Rest — Be still' });
    }
  }
  return steps;
}

export async function analyzeBreathe(text: string, options?: BreatheAnalysisOptions): Promise<BreatheAnalysisResult> {
  const cycles = Math.max(1, Math.min(10, options?.cycles ?? 3));
  const bibleVersion = normalizeVersion(options?.bibleVersion);

  // Audio choices to include in prompt (names and tags only)
  const { clips, forPrompt, mapByName } = getAudioClipsForPrompt();
  const classified = await classifyWithGemini(text, forPrompt);
  const feeling = classified.feeling;
  const pattern = DEFAULT_PATTERN;
  const affirmations = DEFAULT_AFFIRMATIONS[feeling];
  // Try to pick two short non-scripture lines for inhale/exhale; fall back to default affirmations
  const nonScripture = (classified.textAndScriptures || []).filter((l) => !/\b\d?\s?[A-Za-z]+\s?\d{1,3}:\d{1,3}\b/.test(l));
  const inhaleLine = (nonScripture[0] || affirmations[0] || 'Jesus, You are my peace').slice(0, 80);
  const exhaleLine = (nonScripture[1] || affirmations[1] || 'I release this into Your hands').slice(0, 80);
  const overlays = buildOverlays(feeling, pattern, cycles, [inhaleLine, exhaleLine]);
  // Resolve picked audio from the single-prompt result, validate against our list
  let audioChoiceName = resolveAudioName(classified.audioFile, forPrompt) || heuristicAudioPick(feeling, forPrompt) || undefined;
  const picked = audioChoiceName ? mapByName.get(audioChoiceName) : undefined;
  const asmrAudioUrl = picked ? picked.url : undefined;
  const asmrAudioName = picked ? picked.name : undefined;

  const asmrTips = [
    'Use a soft, slow cadence with 1–2 second pauses.',
    'Overlay gentle rain or piano at low volume.',
    'Keep on-screen text short and centered for each phase.',
  ];

  return {
    feeling,
    sentiment: classified.sentiment,
    confidence: classified.confidence,
    summary: classified.summary || `We\'ll slow down and breathe with Jesus together.`,
    keywords: classified.keywords,
    affirmations,
    breathing: pattern,
    overlays,
    textAndScriptures: classified.textAndScriptures,
    asmrTips,
    asmrAudioUrl,
    asmrAudioName,
  };
}

// ============ Audio selection helpers ============

type ClipInfo = { name: string; fileName: string; url: string; tags: string[] };

function getAudioRootDir(): string {
  // Try several candidates to work in dev (ts-node) and build (dist) contexts
  const candidates = [
    // Running ts-node from src/* files
    path.join(__dirname, '..', '1min_clips'), // src/1min_clips
    // Running compiled from dist/*
    path.join(__dirname, '..', 'src', '1min_clips'), // dist/../src/1min_clips
    path.join(__dirname, '1min_clips'), // dist/1min_clips (after build)
    // Fallbacks relative to CWD
    path.join(process.cwd(), 'src', '1min_clips'),
    path.join(process.cwd(), '1min_clips'),
    path.join(process.cwd(), 'dist', '1min_clips'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  // Last resort: default to src/1min_clips relative to CWD
  return path.join(process.cwd(), 'src', '1min_clips');
}

function parseTags(name: string): string[] {
  const lower = name.toLowerCase();
  const tags: string[] = [];
  const pairs: Array<[string, RegExp]> = [
    ['rain', /rain|thunder|storm/],
    ['waterfall', /waterfall/],
    ['brook', /brook|stream|creek/],
    ['waves', /wave|beach|ocean/],
    ['wind', /wind|breeze/],
    ['chimes', /chime|bells/],
    ['birds', /bird|birdsong/],
    ['fireplace', /fireplace|fire|crackle/],
    ['silence', /silence/],
    ['cave', /cave/],
    ['nature', /forest|woods|mountain/],
    ['flute', /flute/],
    ['tibetan', /tibetan|bowl/],
  ];
  for (const [t, re] of pairs) if (re.test(lower)) tags.push(t);
  return tags.length ? tags : ['ambient'];
}

function listAudioClips(): ClipInfo[] {
  const dir = getAudioRootDir();
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.mp3'));
  } catch {
    return [];
  }
  return files.map(fileName => {
    const name = path.basename(fileName, path.extname(fileName)).trim();
    // Construct URL using APP_URL for production to avoid exposing HOST
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.HOST || 'localhost';
    const port = process.env.PORT || '3036';
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.APP_URL || `${protocol}://${host}`)
      : `${protocol}://${host}:${port}`;
    const url = `${baseUrl}/audio/1min/${encodeURIComponent(fileName)}`;
    return { name, fileName, url, tags: parseTags(name) };
  });
}

function getAudioClipsForPrompt(): { clips: ClipInfo[]; forPrompt: Array<{ name: string; tags: string[] }>; mapByName: Map<string, ClipInfo> } {
  const clips = listAudioClips();
  const forPrompt = clips.map(c => ({ name: c.name, tags: c.tags }));
  const mapByName = new Map(clips.map(c => [c.name, c] as const));
  return { clips, forPrompt, mapByName };
}

function heuristicAudioPick(feeling: Feeling, choices: Array<{ name: string; tags: string[] }>): string | null {
  const prefByFeeling: Partial<Record<Feeling, string[]>> = {
    anxious: ['rain', 'waves', 'brook', 'wind'],
    stressed: ['rain', 'brook', 'wind', 'chimes'],
    sad: ['brook', 'waves', 'wind', 'birds'],
    lonely: ['fireplace', 'rain', 'birds'],
    ashamed: ['rain', 'wind', 'waves'],
    angry: ['wind', 'waves', 'rain'],
    tempted: ['rain', 'wind', 'chimes'],
    grateful: ['birds', 'brook', 'chimes'],
    hopeful: ['birds', 'waves', 'chimes'],
    tired: ['rain', 'fireplace', 'brook'],
    overwhelmed: ['rain', 'wind', 'waves'],
    fearful: ['rain', 'wind', 'brook'],
    grieving: ['rain', 'brook', 'wind'],
    joyful: ['birds', 'waves', 'chimes'],
    numb: ['waves', 'wind', 'silence'],
    discouraged: ['rain', 'wind', 'waves'],
  };
  const prefs = prefByFeeling[feeling] || ['rain', 'wind', 'waves', 'brook'];
  for (const p of prefs) {
    const match = choices.find(c => c.tags.includes(p));
    if (match) return match.name;
  }
  return choices[0]?.name || null;
}

function resolveAudioName(
  requested: string | undefined,
  choices: Array<{ name: string; tags: string[] }>
): string | undefined {
  if (!choices.length) return undefined;
  const req = (requested || '').trim();
  if (!req) return undefined;
  // exact case-sensitive
  let found = choices.find(c => c.name === req)?.name;
  if (found) return found;
  const lower = req.toLowerCase();
  // exact case-insensitive
  found = choices.find(c => c.name.toLowerCase() === lower)?.name;
  if (found) return found;
  // normalize spaces/underscores for fuzzy matching
  const norm = lower.replace(/\s+/g, '_');
  const variants = new Set<string>([lower, norm, lower.replace(/_/g, ' ')]);
  found = choices.find(c => variants.has(c.name.toLowerCase()))?.name;
  if (found) return found;
  // substring matches
  found = choices.find(c => c.name.toLowerCase().includes(lower))?.name;
  if (found) return found;
  found = choices.find(c => lower.includes(c.name.toLowerCase()))?.name;
  if (found) return found;
  return undefined;
}
