import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import basicAuth from 'basic-auth';

const LOG_FILE = path.join(process.cwd(), 'logs', 'all.log');

function ensureLogFile() {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '', 'utf-8');
}

function authGuard(req: any, reply: any) {
  const creds = basicAuth(req);
  const user = process.env.ADMIN_USER || 'root';
  const pass = process.env.ADMIN_PASS || 'password';
  if (!creds || creds.name !== user || creds.pass !== pass) {
    reply.header('WWW-Authenticate', 'Basic realm="logs"');
    reply.code(401).send('Access denied');
    return false;
  }
  return true;
}

export default async function adminLogsRoutes(fastify: FastifyInstance) {
  ensureLogFile();

  // Serve simple UI
  fastify.get('/admin/logs', async (request, reply) => {
    if (!authGuard(request.raw, reply)) return;
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Server Logs</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto; margin:0; background:#0b1020; color:#e5e7eb}
    header{position:sticky;top:0;background:#0f172a;display:flex;gap:12px;align-items:center;padding:10px 14px;border-bottom:1px solid #1f2937}
    input,select{background:#111827;color:#e5e7eb;border:1px solid #374151;border-radius:6px;padding:6px 10px}
    #container{padding:12px}
    #log{white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;background:#0b1020;border:1px solid #1f2937;border-radius:8px;padding:12px;height:70vh;overflow:auto}
    .line{padding:2px 0}
    .info{color:#93c5fd}
    .warn{color:#fbbf24}
    .error{color:#f87171}
    .debug{color:#a78bfa}
    .fatal{color:#fb7185}
    .trace{color:#34d399}
  </style>
</head>
<body>
<header>
  <strong>Logs</strong>
  <label>Level <select id="level">
    <option value="">All</option>
    <option>fatal</option>
    <option>error</option>
    <option>warn</option>
    <option>info</option>
    <option>debug</option>
    <option>trace</option>
  </select></label>
  <label>Search <input id="search" placeholder="text or JSON" /></label>
  <button id="pause">Pause</button>
  <button id="clear">Clear</button>
  <span id="status" style="margin-left:auto;opacity:.7"></span>
</header>
<div id="container">
  <div id="log"></div>
</div>
<script>
  const logEl = document.getElementById('log');
  const levelSel = document.getElementById('level');
  const searchEl = document.getElementById('search');
  const statusEl = document.getElementById('status');
  const pauseBtn = document.getElementById('pause');
  const clearBtn = document.getElementById('clear');
  let paused = false;

  function renderLine(obj, raw){
    const div = document.createElement('div');
    const lvl = obj && obj.levelName ? obj.levelName : (obj && obj.level) || 'info';
    div.className = 'line ' + lvl;
    const time = obj && obj.time ? new Date(obj.time).toISOString() : '';
    const msg = obj && obj.msg ? obj.msg : raw;
    div.textContent = '[' + time + '] ' + lvl.toUpperCase() + ': ' + msg;
    return div;
  }

  function passesFilters(obj, raw){
    const lvlFilter = levelSel.value;
    if (lvlFilter){
      const lvl = obj && obj.levelName ? obj.levelName : (obj && obj.level) || '';
      if (lvl !== lvlFilter) return false;
    }
    const q = searchEl.value.trim();
    if (q){
      try{ if (JSON.stringify(obj).toLowerCase().includes(q.toLowerCase())) return true; }catch(e){}
      return raw.toLowerCase().includes(q.toLowerCase());
    }
    return true;
  }

  let es;
  function connect(){
    es = new EventSource('/admin/logs/stream');
    statusEl.textContent = 'live';
    es.onmessage = (e)=>{
      if (paused) return;
      const raw = e.data;
      let obj = null;
      try{ obj = JSON.parse(raw); if (obj.level && !obj.levelName){
        const map={60:'fatal',50:'error',40:'warn',30:'info',20:'debug',10:'trace'}; obj.levelName = map[obj.level] || obj.level; }
      }catch(_){ }
      if (!passesFilters(obj, raw)) return;
      const atBottom = logEl.scrollTop + logEl.clientHeight >= logEl.scrollHeight - 10;
      logEl.appendChild(renderLine(obj, raw));
      if (atBottom) logEl.scrollTop = logEl.scrollHeight;
    };
    es.onerror = ()=>{ statusEl.textContent = 'reconnecting...'; setTimeout(()=>{ es.close(); connect(); }, 1000); };
  }
  connect();

  pauseBtn.onclick = ()=>{ paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; };
  clearBtn.onclick = ()=>{ logEl.innerHTML = ''; };
</script>
</body>
</html>`;
    reply.type('text/html').send(html);
  });

  // SSE stream from log file (non-blocking)
  fastify.get('/admin/logs/stream', async (request, reply) => {
    if (!authGuard(request.raw, reply)) return;

    reply.headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    const stream = fs.createReadStream(LOG_FILE, { encoding: 'utf8', flags: 'a+', start: 0 });
    const watcher = fs.watch(LOG_FILE, { persistent: true });

    function send(line: string){
      reply.raw.write(`data: ${line.replace(/\n/g, '')}\n\n`);
    }

    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk;
      let idx;
      while((idx = buffer.indexOf('\n')) >= 0){
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx+1);
        if (line) send(line);
      }
    });

    watcher.on('change', () => {
      // Tail new data
      fs.readFile(LOG_FILE, 'utf8', (err, data) => {
        if (err) return;
        const lines = data.split('\n');
        const last = lines.slice(-50).filter(Boolean);
        last.forEach(l => send(l));
      });
    });

    request.raw.on('close', () => {
      stream.close();
      watcher.close();
      reply.raw.end();
    });

    // Send a heartbeat
    const interval = setInterval(() => reply.raw.write(': ping\n\n'), 15000);
    request.raw.on('close', () => clearInterval(interval));
  });
}
