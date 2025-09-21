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
    .line{padding:2px 0; border-bottom:1px solid #1f2937;}
    .info{color:#93c5fd}
    .warn{color:#fbbf24}
    .error{color:#f87171}
    .debug{color:#a78bfa}
    .fatal{color:#fb7185}
    .trace{color:#34d399}
    .request{color:#10b981; font-weight:500}
  </style>
</head>
<body>
<header>
  <strong>Server Logs</strong>
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
  <span id="status" style="margin-left:auto;opacity:.7">connecting...</span>
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
    let lvl = 'info';
    let time = '';
    let msg = raw;
    let reqInfo = '';
    
    if (obj) {
      const levelMap = {60:'fatal',50:'error',40:'warn',30:'info',20:'debug',10:'trace'};
      lvl = obj.levelName || levelMap[obj.level] || 'info';
      time = obj.time ? new Date(obj.time).toLocaleTimeString() : '';
      msg = obj.msg || raw;
      
      if (obj.req) {
        reqInfo = ' [' + obj.req.method + ' ' + obj.req.url + ']';
        if (obj.req.parameters && Object.keys(obj.req.parameters).length) {
          reqInfo += ' params: ' + JSON.stringify(obj.req.parameters);
        }
        div.classList.add('request');
      }
      
      if (obj.res) {
        reqInfo += ' → ' + obj.res.statusCode;
        if (obj.responseTime) {
          reqInfo += ' (' + Math.round(obj.responseTime) + 'ms)';
        }
      }
      
      if (obj.err) {
        msg += ' ERROR: ' + (obj.err.message || obj.err);
        if (obj.err.stack) {
          msg += '\n' + obj.err.stack;
        }
      }
    }
    
    div.className = 'line ' + lvl;
    div.textContent = '[' + time + '] ' + lvl.toUpperCase() + ': ' + msg + reqInfo;
    return div;
  }

  function passesFilters(obj, raw){
    const lvlFilter = levelSel.value;
    if (lvlFilter){
      const levelMap = {60:'fatal',50:'error',40:'warn',30:'info',20:'debug',10:'trace'};
      const lvl = obj && (obj.levelName || levelMap[obj.level]) || 'info';
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
    if (es) es.close();
    es = new EventSource('/admin/logs/stream');
    statusEl.textContent = 'live';
    es.onmessage = (e)=>{
      if (paused) return;
      const raw = e.data;
      let obj = null;
      try{ 
        obj = JSON.parse(raw); 
        if (obj.level && !obj.levelName){
          const map={60:'fatal',50:'error',40:'warn',30:'info',20:'debug',10:'trace'}; 
          obj.levelName = map[obj.level] || obj.level; 
        }
      }catch(_){ }
      if (!passesFilters(obj, raw)) return;
      const atBottom = logEl.scrollTop + logEl.clientHeight >= logEl.scrollHeight - 10;
      logEl.appendChild(renderLine(obj, raw));
      if (atBottom) logEl.scrollTop = logEl.scrollHeight;
    };
    es.onerror = ()=>{ 
      statusEl.textContent = 'reconnecting...'; 
      setTimeout(()=>{ connect(); }, 2000); 
    };
    es.onopen = ()=>{ statusEl.textContent = 'live'; };
  }
  connect();

  pauseBtn.onclick = ()=>{ paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; };
  clearBtn.onclick = ()=>{ logEl.innerHTML = ''; };
  
  levelSel.onchange = ()=>{ logEl.innerHTML = ''; connect(); };
  searchEl.oninput = ()=>{ logEl.innerHTML = ''; connect(); };
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

    function send(line: string){
      if (line.trim()) {
        reply.raw.write(`data: ${line.replace(/\n/g, '').replace(/\r/g, '')}\n\n`);
      }
    }

    // Read existing logs first
    try {
      const content = fs.readFileSync(LOG_FILE, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      // Send last 100 lines to start
      lines.slice(-100).forEach(line => send(line));
    } catch (err) {
      console.log('Error reading initial log content:', err);
    }

    // Watch for new lines
    let lastSize = 0;
    try {
      lastSize = fs.statSync(LOG_FILE).size;
    } catch (err) {
      lastSize = 0;
    }

    const watcher = fs.watchFile(LOG_FILE, { interval: 500 }, (curr, prev) => {
      if (curr.size > lastSize) {
        // File grew, read new content
        const stream = fs.createReadStream(LOG_FILE, { 
          encoding: 'utf8', 
          start: lastSize,
          end: curr.size - 1
        });
        
        let buffer = '';
        stream.on('data', (chunk) => {
          buffer += chunk;
          let idx;
          while((idx = buffer.indexOf('\n')) >= 0){
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (line) send(line);
          }
        });
        
        lastSize = curr.size;
      }
    });

    request.raw.on('close', () => {
      fs.unwatchFile(LOG_FILE);
      reply.raw.end();
    });

    // Send a heartbeat every 30 seconds
    const interval = setInterval(() => {
      try {
        reply.raw.write(': heartbeat\n\n');
      } catch (err) {
        clearInterval(interval);
      }
    }, 30000);
    
    request.raw.on('close', () => clearInterval(interval));
  });
}
