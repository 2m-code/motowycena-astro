# perf-app

Web UI dla narzędzia perf-tool. Zbudowane na **Astro 5 + React 19 + Puppeteer + SSE**.

Ten sam silnik pomiarowy co CLI (`perf-tool/`), ale z webowym interfejsem,
live progressem przez Server-Sent Events i historią raportów na dysku.

## Stack

| Warstwa | Technologia |
|---------|-------------|
| Framework | **Astro 5** `output: 'server'` + `@astrojs/node` |
| UI islands | **React 19** + Tailwind v4 |
| Pomiar | **Puppeteer** + Chrome DevTools Protocol |
| Stream | **Server-Sent Events** (EventEmitter w Node) |
| Persystencja | Filesystem (`data/reports/<host>/*.json`) |

## Architektura folderów

```
perf-app/
├── astro.config.mjs            # output: 'server', adapter Node standalone
├── package.json
├── tsconfig.json
├── bin/
│   └── audit.mjs               # CLI - używa src/lib/perf/
├── src/
│   ├── lib/perf/               # ★ SERCE - shared lib (CLI + web używają)
│   │   ├── types.ts            # TypeScript types + progi CWV
│   │   ├── profiles.ts         # mobile-slow4g, desktop-cable, ...
│   │   ├── observers.ts        # PerformanceObserver kod wstrzykiwany w page
│   │   ├── measure.ts          # 1 puppeteer run -> Sample
│   │   ├── aggregate.ts        # statystyki p50/p75/p95
│   │   ├── analyze.ts          # security headers, diagnostics, plain language
│   │   ├── storage.ts          # zapis/odczyt raportów z dysku
│   │   ├── jobs.ts             # in-memory queue + EventEmitter
│   │   └── audit.ts            # orchestrator: runs -> aggregate -> save
│   ├── pages/
│   │   ├── index.astro         # form
│   │   ├── jobs/[id]/index.astro  # live progress
│   │   ├── reports/index.astro    # historia
│   │   ├── reports/[host]/[id].astro  # raport
│   │   ├── about.astro
│   │   └── api/
│   │       ├── audit.ts           # POST: tworzy job
│   │       ├── audit/[id]/index.ts    # GET: job state
│   │       ├── audit/[id]/events.ts   # GET: SSE stream
│   │       ├── reports/index.ts       # GET: lista
│   │       ├── reports/[host]/[id].ts # GET: pojedynczy
│   │       └── profiles.ts
│   ├── components/
│   │   ├── AuditForm.tsx          # React island
│   │   └── JobProgress.tsx        # React island (SSE consumer)
│   ├── layouts/Layout.astro
│   └── styles/global.css
└── data/
    └── reports/<host>/<uuid>.json  # gitignored
```

## Setup

```bash
cd perf-app
npm install
npm run dev        # http://localhost:4400
```

Pierwsze uruchomienie zajmie ~1-2 min (Puppeteer pobiera Chromium ~150MB).

## CLI

```bash
node bin/audit.mjs --url https://www.motowycena.pl --runs 5 --profile mobile-slow4g
node bin/audit.mjs --list-profiles
```

CLI i web UI używają tych samych modułów z `src/lib/perf/` - jedno źródło prawdy.

## Production deploy

```bash
npm run build
HOST=0.0.0.0 PORT=4400 node ./dist/server/entry.mjs
```

Puppeteer wymaga systemowych zależności (Linux: `libnss3 libatk1.0-0 libxkbcommon0 ...`).
Najprościej Docker `ghcr.io/puppeteer/puppeteer:latest` jako base image.

## SSE pod nginx

Jeśli proxowane przez nginx, ustaw:

```nginx
location /api/audit/ {
    proxy_pass http://localhost:4400;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;             # KLUCZOWE dla SSE
    proxy_read_timeout 86400s;
}
```

## TODO / rozszerzenia

- [ ] Dodać `meta` (title, description, h1Count, jsonLd) do Sample - obecnie zbierane ale nie używane w SEO check
- [ ] Cron / scheduled audits z zapisem do SQLite
- [ ] Slack/Discord webhook po każdym audycie
- [ ] Lighthouse jako alternatywa engine'u
- [ ] Multi-URL batch (lista URL-i w jednym jobie)
- [ ] Performance budgets (`budgets.json` jak w CLI) + exit code
- [ ] CrUX API integration (field data od Google)
- [ ] Diff view: porównaj dwa raporty side-by-side
- [ ] Wykresy trendów (Chart.js) na stronie historii
