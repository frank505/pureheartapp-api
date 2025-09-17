type InputImage = { url?: string; base64?: string };

export type Finding = { label: string; category?: string; score?: number; raw?: any };
export type Analysis = { status: 'clean' | 'suspicious' | 'explicit'; summary?: string; findings: Finding[] };

const MAX_IMAGES = 5;
const MAX_BYTES = 3 * 1024 * 1024; // 3MB per image safeguard

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null; // enforce HTTPS to avoid SSRF
    const ctrl = new AbortController();
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const mimeType = res.headers.get('content-type') || 'image/jpeg';
    // Optional: enforce image/*
    if (!mimeType.startsWith('image/')) return null;
    const reader = res.body?.getReader();
    if (!reader) {
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength > MAX_BYTES) return null;
      return { base64: Buffer.from(buf).toString('base64'), mimeType };
    }
    let received = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        received += value.length;
        if (received > MAX_BYTES) {
          try { ctrl.abort(); } catch {}
          return null;
        }
        chunks.push(value);
      }
    }
    const buf = Buffer.concat(chunks);
    return { base64: buf.toString('base64'), mimeType };
  } catch {
    return null;
  }
}

function guessMimeFromBase64(b64?: string): string {
  if (!b64) return 'image/jpeg';
  const sig = b64.slice(0, 10);
  if (sig.includes('/9j/')) return 'image/jpeg';
  if (sig.startsWith('iVBOR')) return 'image/png';
  if (sig.startsWith('R0lGO')) return 'image/gif';
  return 'image/jpeg';
}

export async function analyzeImages(images: InputImage[]): Promise<Analysis> {
  const key = process.env.GEMINI_API_KEY;
  const limited = (images || []).slice(0, MAX_IMAGES);
  if (!key) {
    // Fallback heuristic if not configured
    const containsHint = limited.some(img => (img.url || '').match(/porn|nsfw|explicit|nud(e|ity)/i));
    return {
      status: containsHint ? 'explicit' : 'clean',
      summary: containsHint ? 'Detected explicit content by heuristic' : 'No explicit content detected',
      findings: containsHint ? [{ label: 'nudity', category: 'explicit', score: 0.9 }] : [],
    };
  }

  // Build Gemini request parts: prompt + inline images
  const parts: any[] = [
    {
      text:
        'You are a strict content safety classifier. Analyze the following image(s) and return ONLY valid minified JSON with this shape: ' +
        '{"status":"clean|suspicious|explicit","summary":"string","findings":[{"label":"string","category":"explicit|suspicious|other","score":0..1}]}. ' +
        'Use explicit if sexual nudity/acts are present; suspicious if suggestive or borderline. Keep summary short. No extra text.'
    },
  ];

  // Collect image blobs
  const prepared: Array<{ base64: string; mimeType: string }> = [];
  for (const img of limited) {
    if (img.base64) {
      prepared.push({ base64: img.base64.replace(/^data:[^;]+;base64,/, ''), mimeType: guessMimeFromBase64(img.base64) });
      continue;
    }
    if (img.url) {
      const fetched = await fetchImageAsBase64(img.url);
      if (fetched) prepared.push(fetched);
    }
  }
  if (!prepared.length) {
    return { status: 'suspicious', summary: 'No valid images provided for analysis', findings: [] };
  }

  for (const p of prepared) {
    parts.push({ inline_data: { mime_type: p.mimeType, data: p.base64 } });
  }

  try {
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + encodeURIComponent(key);
    const body = { contents: [{ role: 'user', parts }] } as any;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      return { status: 'suspicious', summary: `Moderation call failed: ${res.status}`, findings: [{ label: 'api_error', category: 'other', score: 0, raw: t }] };
    }
    const json: any = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || json?.candidates?.[0]?.content?.parts?.[0]?.text?.[0] || '';
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Attempt to extract JSON block if model added extra tokens
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      }
    }
    if (!parsed || !parsed.status) {
      return { status: 'suspicious', summary: 'Unparsable response from Gemini', findings: [{ label: 'parse_error', category: 'other', score: 0, raw: text }] };
    }
    const status = (parsed.status === 'explicit' || parsed.status === 'suspicious') ? parsed.status : 'clean';
    const findings: Finding[] = Array.isArray(parsed.findings) ? parsed.findings.map((f: any) => ({ label: String(f.label || 'unknown'), category: f.category || 'other', score: typeof f.score === 'number' ? f.score : undefined })) : [];
    return { status, summary: parsed.summary || '', findings };
  } catch (e: any) {
    return { status: 'suspicious', summary: 'Moderation exception', findings: [{ label: 'exception', category: 'other', score: 0, raw: String(e?.message || e) }] };
  }
}