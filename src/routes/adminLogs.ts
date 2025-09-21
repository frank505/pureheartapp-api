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

  // API endpoint to get paginated logs
  fastify.get('/admin/logs/api', async (request, reply) => {
    if (!authGuard(request.raw, reply)) return;
    
    const query = request.query as any;
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(query.limit) || 50));
    const level = query.level || '';
    const search = query.search || '';
    
    try {
      const content = fs.readFileSync(LOG_FILE, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      
      // Parse and filter logs
      let logs = lines.map((line, index) => {
        try {
          const parsed = JSON.parse(line);
          return { ...parsed, _index: index, _raw: line };
        } catch {
          return { msg: line, level: 30, time: Date.now(), _index: index, _raw: line };
        }
      }).reverse(); // Most recent first
      
      // Apply filters
      if (level) {
        const levelMap: {[key: number]: string} = {60:'fatal',50:'error',40:'warn',30:'info',20:'debug',10:'trace'};
        logs = logs.filter(log => {
          const logLevel = log.levelName || levelMap[log.level] || 'info';
          return logLevel === level;
        });
      }
      
      if (search) {
        logs = logs.filter(log => {
          try {
            return JSON.stringify(log).toLowerCase().includes(search.toLowerCase());
          } catch {
            return log._raw.toLowerCase().includes(search.toLowerCase());
          }
        });
      }
      
      // Pagination
      const total = logs.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paginatedLogs = logs.slice(offset, offset + limit);
      
      reply.send({
        logs: paginatedLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (err) {
      reply.code(500).send({ error: 'Failed to read logs' });
    }
  });

  // Serve UI
  fastify.get('/admin/logs', async (request, reply) => {
    if (!authGuard(request.raw, reply)) return;
    // Allow inline script/styles for this admin page UI
    reply.header('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: https:; base-uri 'self'; font-src 'self' https: data:; form-action 'self'; frame-ancestors 'self'; object-src 'none'; upgrade-insecure-requests");

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Server Logs</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto; margin:0; background:#0b1020; color:#e5e7eb}
    header{position:sticky;top:0;background:#0f172a;display:flex;gap:12px;flex-wrap:wrap;align-items:center;padding:10px 14px;border-bottom:1px solid #1f2937}
    input,select,button{background:#111827;color:#e5e7eb;border:1px solid #374151;border-radius:6px;padding:6px 10px}
    button{cursor:pointer}
    #container{padding:12px}
    #toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:6px}
    #log{white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;background:#0b1020;border:1px solid #1f2937;border-radius:8px;padding:12px;height:70vh;overflow:auto}
    .line{padding:6px 0; border-bottom:1px solid #1f2937;}
    .info{color:#93c5fd}
    .warn{color:#fbbf24}
    .error{color:#f87171}
    .debug{color:#a78bfa}
    .fatal{color:#fb7185}
    .trace{color:#34d399}
    .request{color:#10b981; font-weight:500}
    .muted{opacity:.8}
    .row{display:flex;gap:10px;align-items:center}
    .spacer{flex:1}
    .pill{padding:2px 6px;border-radius:999px;background:#111827;border:1px solid #1f2937;font-size:12px}
  </style>
</head>
<body>
<header>
  <div class="row" style="gap:8px">
    <strong>Server Logs</strong>
    <span id="modeBadge" class="pill muted">History</span>
  </div>
  <div id="toolbar">
    <label>Mode <select id="mode">
      <option value="history">History</option>
      <option value="live">Live</option>
    </select></label>
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
    <label id="limitWrap">Per page <select id="limit">
      <option>25</option>
      <option selected>50</option>
      <option>100</option>
    </select></label>
    <button id="prev">Prev</button>
    <button id="next">Next</button>
    <span id="pageInfo" class="muted">Page 1</span>
    <div class="spacer"></div>
    <button id="pause" style="display:none">Pause</button>
    <button id="clear">Clear</button>
    <span id="status" class="muted">ready</span>
  </div>
</header>
<div id="container">
  <div id="log"></div>
</div>
<script>
  const logEl = document.getElementById('log');
  const modeSel = document.getElementById('mode');
  const levelSel = document.getElementById('level');
  const searchEl = document.getElementById('search');
  const statusEl = document.getElementById('status');
  const pauseBtn = document.getElementById('pause');
  const clearBtn = document.getElementById('clear');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const pageInfo = document.getElementById('pageInfo');
  const limitSel = document.getElementById('limit');
  const limitWrap = document.getElementById('limitWrap');
  const modeBadge = document.getElementById('modeBadge');
  let paused = false;
  let es = null;
  let page = 1;
  let totalPages = 1;

  function levelName(lvl){
    const map = {60:'fatal',50:'error',40:'warn',30:'info',20:'debug',10:'trace'};
    if (typeof lvl === 'string') return lvl;
    return map[lvl] || 'info';
  }

  function renderLine(obj, raw){
    const div = document.createElement('div');
    let lvl = 'info';
    let time = '';
    let msg = raw;
    let reqInfo = '';
    
    if (obj) {
      lvl = obj.levelName || levelName(obj.level);
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
      const lvl = obj && (obj.levelName || levelName(obj.level)) || 'info';
      if (lvl !== lvlFilter) return false;
    }
    const q = searchEl.value.trim();
    if (q){
      try{ if (JSON.stringify(obj).toLowerCase().includes(q.toLowerCase())) return true; }catch(e){}
      return raw.toLowerCase().includes(q.toLowerCase());
    }
    return true;
  }

  function connect(){
    if (es) { try{ es.close(); }catch(e){} }
    es = new EventSource('/admin/logs/stream');
    statusEl.textContent = 'live';
    es.onmessage = function(e){
      if (paused) return;
      const raw = e.data;
      let obj = null;
      try{ 
        obj = JSON.parse(raw); 
        if (obj.level && !obj.levelName){ obj.levelName = levelName(obj.level); }
      }catch(_){ }
      if (!passesFilters(obj, raw)) return;
      const atBottom = logEl.scrollTop + logEl.clientHeight >= logEl.scrollHeight - 10;
      logEl.appendChild(renderLine(obj, raw));
      if (atBottom) logEl.scrollTop = logEl.scrollHeight;
    };
    es.onerror = function(){ statusEl.textContent = 'reconnecting...'; setTimeout(function(){ connect(); }, 2000); };
    es.onopen = function(){ statusEl.textContent = 'live'; };
  }

  function loadPage(){
    const lvl = encodeURIComponent(levelSel.value);
    const q = encodeURIComponent(searchEl.value.trim());
    const limit = encodeURIComponent(limitSel.value);
    const url = '/admin/logs/api?page=' + page + '&limit=' + limit + (lvl ? '&level=' + lvl : '') + (q ? '&search=' + q : '');
    statusEl.textContent = 'loading...';
    fetch(url).then(function(r){ return r.json(); }).then(function(data){
      statusEl.textContent = 'loaded';
      logEl.innerHTML = '';
      (data.logs || []).forEach(function(item){
        var raw = item._raw || '';
        var obj = item;
        try{ if (!obj.levelName && obj.level){ obj.levelName = levelName(obj.level); } }catch(e){}
        logEl.appendChild(renderLine(obj, raw));
      });
      totalPages = (data.pagination && data.pagination.totalPages) || 1;
      pageInfo.textContent = 'Page ' + page + ' / ' + totalPages + '  (' + ((data.pagination && data.pagination.total) || 0) + ' total)';
      prevBtn.disabled = page <= 1;
      nextBtn.disabled = page >= totalPages;
    }).catch(function(){ statusEl.textContent = 'error'; });
  }

  function setMode(mode){
    if (mode === 'live'){
      modeSel.value = 'live';
      modeBadge.textContent = 'Live';
      pauseBtn.style.display = '';
      limitWrap.style.display = 'none';
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      pageInfo.style.display = 'none';
      logEl.innerHTML = '';
      connect();
    } else {
      modeSel.value = 'history';
      modeBadge.textContent = 'History';
      pauseBtn.style.display = 'none';
      limitWrap.style.display = '';
      prevBtn.style.display = '';
      nextBtn.style.display = '';
      pageInfo.style.display = '';
      if (es) { try{ es.close(); }catch(e){} es = null; statusEl.textContent = 'ready'; }
      page = 1;
      loadPage();
    }
  }

  // Events
  pauseBtn.onclick = function(){ paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; };
  clearBtn.onclick = function(){ logEl.innerHTML = ''; };
  levelSel.onchange = function(){ if (modeSel.value === 'history'){ page = 1; loadPage(); } };
  limitSel.onchange = function(){ page = 1; loadPage(); };
  prevBtn.onclick = function(){ if (page > 1){ page--; loadPage(); } };
  nextBtn.onclick = function(){ if (page < totalPages){ page++; loadPage(); } };
  var searchTimer = null;
  searchEl.oninput = function(){ if (modeSel.value === 'history'){ clearTimeout(searchTimer); searchTimer = setTimeout(function(){ page = 1; loadPage(); }, 300); } };
  modeSel.onchange = function(){ setMode(modeSel.value); };

  // Init in History mode
  setMode('history');
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
