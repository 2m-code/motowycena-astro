#!/usr/bin/env node
/**
 * Local web UI for the advanced performance audit.
 *
 * Open http://localhost:8787, enter a domain, run an audit, then open the
 * generated HTML/MD/JSON reports from the browser.
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const JOB_ROOT = path.join(ROOT, 'web-runs');
const DEFAULT_PORT = Number(process.env.PORT || 8787);
const jobs = new Map();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

await mkdir(JOB_ROOT, { recursive: true });

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/') {
      return sendHtml(res, renderHome());
    }

    if (req.method === 'POST' && url.pathname === '/api/audits') {
      const body = await readJsonBody(req);
      const job = startAudit(body);
      return sendJson(res, publicJob(job), 201);
    }

    if (req.method === 'GET' && url.pathname === '/api/jobs') {
      return sendJson(res, Array.from(jobs.values()).map(publicJob));
    }

    const jobMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)$/);
    if (req.method === 'GET' && jobMatch) {
      const job = jobs.get(jobMatch[1]);
      if (!job) return sendJson(res, { error: 'Job not found' }, 404);
      return sendJson(res, publicJob(job));
    }

    const fileMatch = url.pathname.match(/^\/job-file\/([^/]+)\/(.+)$/);
    if (req.method === 'GET' && fileMatch) {
      return serveJobFile(res, fileMatch[1], decodeURIComponent(fileMatch[2]));
    }

    sendText(res, 'Not found', 404);
  } catch (error) {
    sendJson(res, { error: error.message }, 500);
  }
});

listenWithFallback(server, DEFAULT_PORT);

function startAudit(input) {
  const job = {
    id: randomUUID(),
    status: 'running',
    createdAt: new Date().toISOString(),
    finishedAt: null,
    input: normalizeInput(input),
    logs: [],
    exitCode: null,
    error: null,
    files: [],
    plainLanguage: null,
    metrics: null,
  };
  job.outputRoot = path.join(JOB_ROOT, job.id);
  jobs.set(job.id, job);

  mkdir(job.outputRoot, { recursive: true })
    .then(() => runAuditProcess(job))
    .catch((error) => {
      job.status = 'failed';
      job.finishedAt = new Date().toISOString();
      job.error = error.message;
      job.logs.push(`ERROR: ${error.message}`);
    });

  return job;
}

function normalizeInput(input = {}) {
  const url = normalizeUrl(String(input.url || ''));
  if (!url) throw new Error('URL is required.');

  const runs = clampInt(input.runs, 3, 1, 20);
  const profiles = new Set(['mobile-slow4g', 'mobile-fast4g', 'desktop-cable', 'no-throttle']);
  const profile = profiles.has(input.profile) ? input.profile : 'mobile-slow4g';

  return {
    url,
    runs,
    profile,
    budget: Boolean(input.budget),
    screenshot: input.screenshot !== false,
  };
}

function normalizeUrl(raw) {
  const value = raw.trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function clampInt(raw, fallback, min, max) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function runAuditProcess(job) {
  const args = [
    path.join(ROOT, '05-advanced-audit.mjs'),
    '--url',
    job.input.url,
    '--runs',
    String(job.input.runs),
    '--profile',
    job.input.profile,
    '--out',
    job.outputRoot,
    '--format',
    'all',
  ];

  if (job.input.screenshot) args.push('--screenshot');
  if (job.input.budget) args.push('--budget', 'budgets.example.json', '--fail-on-budget');

  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    windowsHide: true,
    shell: false,
    env: process.env,
  });

  const append = (chunk) => {
    const text = chunk.toString();
    job.logs.push(text);
    if (job.logs.join('').length > 120000) {
      job.logs = [job.logs.join('').slice(-90000)];
    }
  };

  child.stdout.on('data', append);
  child.stderr.on('data', append);
  child.on('error', (error) => {
    job.status = 'failed';
    job.error = error.message;
    job.finishedAt = new Date().toISOString();
    job.logs.push(`ERROR: ${error.message}`);
  });
  child.on('close', async (code) => {
    job.exitCode = code;
    job.status = code === 0 || job.input.budget ? 'done' : 'failed';
    job.finishedAt = new Date().toISOString();
    try {
      await collectJobFiles(job);
    } catch (error) {
      job.logs.push(`\nERROR collecting reports: ${error.message}`);
    }
  });
}

async function collectJobFiles(job) {
  const files = await walk(job.outputRoot);
  job.files = files
    .map((file) => {
      const rel = path.relative(job.outputRoot, file).replaceAll(path.sep, '/');
      return {
        name: path.basename(file),
        rel,
        type: typeFor(file),
        url: `/job-file/${encodeURIComponent(job.id)}/${encodeURI(rel)}`,
      };
    })
    .sort((a, b) => orderFor(a.type) - orderFor(b.type) || a.rel.localeCompare(b.rel));

  const jsonReport = job.files.find((file) => file.type === 'json' && file.name !== 'summary.json');
  if (jsonReport) {
    const fullPath = path.join(job.outputRoot, jsonReport.rel);
    const parsed = JSON.parse(await readFile(fullPath, 'utf8'));
    job.plainLanguage = parsed.plainLanguage || null;
    job.metrics = parsed.aggregate?.metrics || null;
  }
}

async function walk(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

function typeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.html') return 'html';
  if (ext === '.md') return 'markdown';
  if (ext === '.json') return 'json';
  if (ext === '.png') return 'screenshot';
  return ext.replace('.', '') || 'file';
}

function orderFor(type) {
  return { html: 1, markdown: 2, json: 3, screenshot: 4 }[type] || 9;
}

async function serveJobFile(res, jobId, relPath) {
  const job = jobs.get(jobId);
  if (!job) return sendText(res, 'Job not found', 404);

  const normalizedRel = relPath.replaceAll('/', path.sep);
  const fullPath = path.resolve(job.outputRoot, normalizedRel);
  const root = path.resolve(job.outputRoot);
  if (!fullPath.startsWith(root)) return sendText(res, 'Forbidden', 403);

  try {
    await stat(fullPath);
  } catch {
    return sendText(res, 'File not found', 404);
  }

  const ext = path.extname(fullPath).toLowerCase();
  res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
  createReadStream(fullPath).pipe(res);
}

function publicJob(job) {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    finishedAt: job.finishedAt,
    input: job.input,
    logs: job.logs.join(''),
    exitCode: job.exitCode,
    error: job.error,
    files: job.files,
    plainLanguage: job.plainLanguage,
    metrics: job.metrics,
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

function sendHtml(res, html, status = 200) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}

function sendText(res, text, status = 200) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

function listenWithFallback(serverInstance, startPort) {
  let port = startPort;
  const tryListen = () => {
    serverInstance.once('error', (error) => {
      if (error.code === 'EADDRINUSE' && port < startPort + 20) {
        port += 1;
        tryListen();
      } else {
        console.error(`Server error: ${error.message}`);
        process.exitCode = 1;
      }
    });
    serverInstance.listen(port, '127.0.0.1', () => {
      console.log(`Performance audit server running: http://127.0.0.1:${port}`);
      console.log('Press Ctrl+C to stop.');
    });
  };
  tryListen();
}

function renderHome() {
  return `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Performance Audit Server</title>
  <style>
    :root {
      --bg: #f5f7fb;
      --panel: #ffffff;
      --text: #182230;
      --muted: #667085;
      --line: #d8dee9;
      --accent: #165d8f;
      --good: #0f7b4f;
      --bad: #b42318;
      --warn: #9a6700;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.45;
    }
    header, main { max-width: 1120px; margin: 0 auto; padding: 24px; }
    header { padding-top: 30px; }
    h1 { margin: 0 0 6px; font-size: 28px; letter-spacing: 0; }
    h2 { margin: 26px 0 12px; font-size: 18px; letter-spacing: 0; }
    .muted { color: var(--muted); }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 18px;
    }
    form {
      display: grid;
      grid-template-columns: minmax(260px, 1fr) 170px 130px auto auto;
      gap: 12px;
      align-items: end;
    }
    label { display: grid; gap: 6px; font-size: 13px; color: var(--muted); }
    input, select {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 10px 11px;
      font: inherit;
      color: var(--text);
      background: #fff;
    }
    .checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 42px;
      color: var(--text);
    }
    .checkbox input { width: auto; }
    button {
      border: 0;
      border-radius: 6px;
      padding: 11px 15px;
      font: inherit;
      font-weight: 700;
      color: #fff;
      background: var(--accent);
      cursor: pointer;
      min-height: 42px;
    }
    button:disabled { opacity: .55; cursor: wait; }
    .status {
      display: inline-block;
      border-radius: 999px;
      padding: 3px 9px;
      font-size: 12px;
      font-weight: 700;
      background: #e8eef7;
      color: var(--accent);
    }
    .status.done { color: var(--good); background: #e9f7ef; }
    .status.failed { color: var(--bad); background: #fdecec; }
    .logs {
      white-space: pre-wrap;
      overflow: auto;
      max-height: 360px;
      background: #111827;
      color: #f8fafc;
      border-radius: 8px;
      padding: 14px;
      font: 12px Consolas, "Courier New", monospace;
    }
    .plain-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 14px;
    }
    ul { margin: 8px 0 0; padding-left: 20px; }
    li { margin: 5px 0; }
    .files { display: flex; flex-wrap: wrap; gap: 8px; }
    .files a {
      display: inline-block;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px 10px;
      color: var(--accent);
      background: #fff;
      text-decoration: none;
      font-weight: 700;
      font-size: 13px;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 10px;
    }
    .metric {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 12px;
    }
    .metric strong { display: block; font-size: 20px; margin-top: 4px; }
    @media (max-width: 900px) {
      form { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Performance Audit Server</h1>
    <div class="muted">Wpisz domene, odpal pomiar i otworz raport z sekcja "Po ludzku".</div>
  </header>
  <main>
    <section class="panel">
      <form id="auditForm">
        <label>
          Domena albo URL
          <input id="url" name="url" value="https://www.motowycena.pl" placeholder="example.com" required>
        </label>
        <label>
          Profil
          <select id="profile" name="profile">
            <option value="mobile-slow4g">telefon wolne 4G</option>
            <option value="mobile-fast4g">telefon szybkie 4G</option>
            <option value="desktop-cable">desktop</option>
            <option value="no-throttle">bez symulacji</option>
          </select>
        </label>
        <label>
          Runy
          <input id="runs" name="runs" type="number" min="1" max="20" value="3">
        </label>
        <label class="checkbox">
          <input id="budget" name="budget" type="checkbox">
          Budget
        </label>
        <button id="startButton" type="submit">Start</button>
      </form>
    </section>

    <section id="jobSection" style="display:none">
      <h2>Aktualny pomiar <span id="status" class="status">running</span></h2>
      <div class="panel">
        <div id="summary" class="muted"></div>
        <h2>Raporty</h2>
        <div id="files" class="files"></div>
        <h2>Wynik po ludzku</h2>
        <div id="plain"></div>
        <h2>Metryki p75</h2>
        <div id="metrics" class="metrics"></div>
        <h2>Logi</h2>
        <pre id="logs" class="logs"></pre>
      </div>
    </section>
  </main>

  <script>
    const form = document.getElementById('auditForm');
    const startButton = document.getElementById('startButton');
    const jobSection = document.getElementById('jobSection');
    const statusEl = document.getElementById('status');
    const summaryEl = document.getElementById('summary');
    const filesEl = document.getElementById('files');
    const plainEl = document.getElementById('plain');
    const metricsEl = document.getElementById('metrics');
    const logsEl = document.getElementById('logs');
    let pollTimer = null;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      startButton.disabled = true;
      jobSection.style.display = 'block';
      filesEl.innerHTML = '';
      plainEl.innerHTML = '<div class="muted">Czekam na wynik...</div>';
      metricsEl.innerHTML = '';
      logsEl.textContent = '';
      statusEl.textContent = 'running';
      statusEl.className = 'status';

      const payload = {
        url: document.getElementById('url').value,
        profile: document.getElementById('profile').value,
        runs: Number(document.getElementById('runs').value || 3),
        budget: document.getElementById('budget').checked,
        screenshot: true
      };

      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const job = await res.json();
      if (!res.ok) {
        startButton.disabled = false;
        logsEl.textContent = job.error || 'Blad startu.';
        return;
      }
      poll(job.id);
    });

    async function poll(id) {
      clearTimeout(pollTimer);
      const res = await fetch('/api/jobs/' + encodeURIComponent(id));
      const job = await res.json();
      renderJob(job);
      if (job.status === 'running') {
        pollTimer = setTimeout(() => poll(id), 1200);
      } else {
        startButton.disabled = false;
      }
    }

    function renderJob(job) {
      statusEl.textContent = job.status;
      statusEl.className = 'status ' + job.status;
      summaryEl.textContent = job.input.url + ' / ' + job.input.profile + ' / runy: ' + job.input.runs;
      logsEl.textContent = job.logs || '';
      logsEl.scrollTop = logsEl.scrollHeight;

      filesEl.innerHTML = '';
      for (const file of job.files || []) {
        const a = document.createElement('a');
        a.href = file.url;
        a.target = '_blank';
        a.textContent = file.type.toUpperCase() + ': ' + file.name;
        filesEl.appendChild(a);
      }

      renderPlain(job.plainLanguage);
      renderMetrics(job.metrics);
    }

    function renderPlain(plain) {
      if (!plain) return;
      plainEl.innerHTML = [
        '<p><strong>' + escapeHtml(plain.headline) + '</strong></p>',
        '<div class="plain-grid">',
        block('Co jest dobre', plain.good),
        block('Co boli', plain.problems),
        block('Co poprawic najpierw', plain.nextActions),
        block('Mini-slownik', plain.dictionary),
        '</div>'
      ].join('');
    }

    function block(title, items) {
      return '<div><h3>' + escapeHtml(title) + '</h3><ul>' +
        (items || []).map(item => '<li>' + escapeHtml(item) + '</li>').join('') +
        '</ul></div>';
    }

    function renderMetrics(metrics) {
      if (!metrics) return;
      const defs = [
        ['LCP', 'lcp', 'ms'],
        ['CLS', 'cls', ''],
        ['TTFB', 'ttfb', 'ms'],
        ['TBT*', 'tbtProxy', 'ms'],
        ['Transfer', 'totalTransferKB', 'KB'],
        ['Requesty', 'resourceCount', '']
      ];
      metricsEl.innerHTML = defs.map(([label, key, unit]) => {
        const stat = metrics[key];
        const value = stat ? formatMetric(stat.p75, unit) : 'n/a';
        return '<div class="metric"><span>' + label + '</span><strong>' + value + '</strong></div>';
      }).join('');
    }

    function formatMetric(value, unit) {
      if (value === null || value === undefined) return 'n/a';
      if (unit === 'ms') return Math.round(value) + ' ms';
      if (unit === 'KB') return Math.round(value * 10) / 10 + ' KB';
      if (unit === '') return Number(value).toFixed(value < 1 ? 3 : 0);
      return value + ' ' + unit;
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }
  </script>
</body>
</html>`;
}
