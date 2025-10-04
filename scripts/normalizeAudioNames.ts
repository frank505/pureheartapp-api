import fs from 'fs';
import path from 'path';

function sanitize(base: string): string {
  // Replace spaces with underscores, collapse repeats, remove non-filename friendly chars (keep letters, numbers, underscores, dashes)
  let s = base.replace(/\s+/g, '_');
  s = s.replace(/[^a-zA-Z0-9_\-]+/g, '_');
  s = s.replace(/_+/g, '_');
  s = s.replace(/^_+|_+$/g, '');
  return s || 'audio_clip';
}


function normalizeDir(dir: string) {
  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
  }
  const entries = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.mp3'));
  const taken = new Set<string>(entries.map(f => f));
  const changes: Array<{ from: string; to: string }> = [];

  for (const file of entries) {
    const ext = path.extname(file);
    const base = path.basename(file, ext);
    const sanitizedBase = sanitize(base);
    let target = sanitizedBase + ext.toLowerCase();
    if (target === file) continue;

    // Resolve collisions
    let i = 1;
    while (fs.existsSync(path.join(dir, target))) {
      const cand = `${sanitizedBase}_${i}${ext.toLowerCase()}`;
      if (!fs.existsSync(path.join(dir, cand))) {
        target = cand;
        break;
      }
      i++;
    }

    changes.push({ from: file, to: target });
  }

  if (!changes.length) {
    console.log('No changes needed.');
    return;
  }

  for (const ch of changes) {
    const fromPath = path.join(dir, ch.from);
    const toPath = path.join(dir, ch.to);
    fs.renameSync(fromPath, toPath);
    console.log(`${ch.from} -> ${ch.to}`);
  }
}

function getAudioRootCandidates(): string[] {
  return [
    path.join(process.cwd(), 'src', '1min_clips'),
    path.join(process.cwd(), '1min_clips'),
  ];
}

(function main() {
  const candidates = getAudioRootCandidates();
  let used: string | null = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) { used = c; break; }
  }
  if (!used) {
    console.error('Could not locate src/1min_clips or 1min_clips.');
    process.exit(1);
  }
  console.log('Normalizing audio filenames in:', used);
  normalizeDir(used);
})();
