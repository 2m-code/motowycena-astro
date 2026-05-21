#!/usr/bin/env node
/**
 * Advanced performance audit CLI.
 *
 * What this measures:
 * - Lab Web Vitals: LCP, CLS, FCP, TTFB and TBT proxy
 * - Navigation Timing: DNS/TCP/TLS/request/response/DCL/load
 * - Resource Timing + CDP transfer sizes
 * - Long tasks, third-party origins, resource groups
 * - Basic SEO and security headers
 * - Optional CrUX field data if CRUX_API_KEY is provided
 *
 * What this does not pretend:
 * - It does not replace field RUM data.
 * - It does not measure official INP unless you collect real user interactions.
 * - It is not a byte-for-byte clone of Lighthouse/PageSpeed.
 */
import puppeteer from 'puppeteer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PROFILES = {
  'mobile-slow4g': {
    label: 'Mobile / Slow 4G / CPU x4',
    formFactor: 'PHONE',
    viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    userAgent:
      'Mozilla/5.0 (Linux; Android 11; Moto G Power) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    cpuThrottle: 4,
    network: {
      offline: false,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
      latency: 400,
    },
  },
  'mobile-fast4g': {
    label: 'Mobile / Fast 4G / CPU x4',
    formFactor: 'PHONE',
    viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    cpuThrottle: 4,
    network: {
      offline: false,
      downloadThroughput: (9 * 1024 * 1024) / 8,
      uploadThroughput: (1.5 * 1024 * 1024) / 8,
      latency: 170,
    },
  },
  'desktop-cable': {
    label: 'Desktop / Cable / CPU x1',
    formFactor: 'DESKTOP',
    viewport: { width: 1365, height: 940, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    cpuThrottle: 1,
    network: {
      offline: false,
      downloadThroughput: (10 * 1024 * 1024) / 8,
      uploadThroughput: (5 * 1024 * 1024) / 8,
      latency: 40,
    },
  },
  'no-throttle': {
    label: 'Current machine / no throttling',
    formFactor: 'DESKTOP',
    viewport: { width: 1365, height: 940, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    cpuThrottle: 1,
    network: null,
  },
};

const DEFAULT_BUDGET = {
  metrics: {
    lcpP75: 2500,
    clsP75: 0.1,
    fcpP75: 1800,
    ttfbP75: 800,
    tbtProxyP75: 200,
    loadP75: 5000,
  },
  resources: {
    totalTransferKBP75: 750,
    scriptKBP75: 180,
    stylesheetKBP75: 100,
    imageKBP75: 450,
    fontKBP75: 120,
    thirdPartyKBP75: 250,
    resourceCountP75: 70,
  },
  seo: {
    requireTitle: true,
    maxTitleLength: 65,
    requireMetaDescription: true,
    minMetaDescriptionLength: 70,
    maxMetaDescriptionLength: 170,
    requireExactlyOneH1: true,
    requireCanonical: true,
    maxImagesMissingAlt: 0,
  },
  security: {
    requireHttps: false,
    requireHsts: false,
    requireCsp: false,
    requireXContentTypeOptions: false,
    requireReferrerPolicy: false,
  },
};

const WEB_VITAL_THRESHOLDS = {
  lcp: [2500, 4000],
  cls: [0.1, 0.25],
  inp: [200, 500],
  fcp: [1800, 3000],
  ttfb: [800, 1800],
  tbtProxy: [200, 600],
};

const HELP = `
Advanced performance audit

Usage:
  node 05-advanced-audit.mjs --url https://example.com
  node 05-advanced-audit.mjs --url https://a.com,https://b.com --runs 5 --profile mobile-slow4g
  node 05-advanced-audit.mjs --urls urls.txt --budget budgets.example.json --fail-on-budget

Options:
  --url <url>              URL to test. Can be repeated or comma-separated.
  --urls <file>            Text file with one URL per line.
  --runs <n>               Number of runs per URL. Default: 5.
  --profile <name>         mobile-slow4g, mobile-fast4g, desktop-cable, no-throttle.
  --out <dir>              Output directory. Default: reports.
  --format <list>          json,md,html,all. Default: all.
  --budget <file>          JSON performance budget.
  --fail-on-budget         Exit with code 1 when budget fails.
  --timeout <ms>           Navigation timeout. Default: 60000.
  --wait <ms>              Extra wait after networkidle2. Default: 1500.
  --screenshot             Save a full-page screenshot from run 1.
  --crux                   Also query CrUX if CRUX_API_KEY or --crux-key is available.
  --crux-key <key>         Google CrUX API key.
  --list-profiles          Print available profiles.
  --help                   Show this help.
`;

function parseArgs(argv) {
  const opts = {
    urls: [],
    urlsFile: null,
    runs: 5,
    profile: 'mobile-slow4g',
    out: 'reports',
    format: 'all',
    budgetPath: null,
    failOnBudget: false,
    timeout: 60000,
    wait: 1500,
    screenshot: false,
    crux: false,
    cruxKey: process.env.CRUX_API_KEY || null,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (!value) throw new Error(`Missing value for ${arg}`);
      return value;
    };

    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--list-profiles') opts.listProfiles = true;
    else if (arg === '--url') opts.urls.push(...splitUrls(next()));
    else if (arg === '--urls') opts.urlsFile = next();
    else if (arg === '--runs') opts.runs = parsePositiveInt(next(), 'runs');
    else if (arg === '--profile') opts.profile = next();
    else if (arg === '--out') opts.out = next();
    else if (arg === '--format') opts.format = next();
    else if (arg === '--budget') opts.budgetPath = next();
    else if (arg === '--fail-on-budget') opts.failOnBudget = true;
    else if (arg === '--timeout') opts.timeout = parsePositiveInt(next(), 'timeout');
    else if (arg === '--wait') opts.wait = parsePositiveInt(next(), 'wait', { allowZero: true });
    else if (arg === '--screenshot') opts.screenshot = true;
    else if (arg === '--crux') opts.crux = true;
    else if (arg === '--crux-key') {
      opts.crux = true;
      opts.cruxKey = next();
    } else if (arg.startsWith('http://') || arg.startsWith('https://')) {
      opts.urls.push(arg);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return opts;
}

function parsePositiveInt(raw, name, { allowZero = false } = {}) {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < (allowZero ? 0 : 1)) {
    throw new Error(`${name} must be ${allowZero ? 'a non-negative' : 'a positive'} integer`);
  }
  return value;
}

function splitUrls(raw) {
  return raw
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
}

async function loadUrls(opts) {
  const urls = [...opts.urls];
  if (opts.urlsFile) {
    const text = await readFile(opts.urlsFile, 'utf8');
    urls.push(
      ...text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#')),
    );
  }

  const normalized = [...new Set(urls.map(normalizeUrl))];
  if (normalized.length === 0) throw new Error('Provide at least one --url or --urls file.');
  return normalized;
}

function normalizeUrl(url) {
  if (!/^https?:\/\//i.test(url)) return `https://${url}`;
  return url;
}

async function loadBudget(opts) {
  if (!opts.budgetPath) return { source: 'default recommended budget', data: DEFAULT_BUDGET };
  const text = await readFile(opts.budgetPath, 'utf8');
  return { source: opts.budgetPath, data: mergeDeep(DEFAULT_BUDGET, JSON.parse(text)) };
}

function mergeDeep(base, override) {
  const out = structuredClone(base);
  for (const [key, value] of Object.entries(override || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = mergeDeep(out[key] || {}, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function printProfiles() {
  console.log('Available profiles:');
  for (const [name, profile] of Object.entries(PROFILES)) {
    console.log(`  ${name.padEnd(16)} ${profile.label}`);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(HELP.trim());
    return;
  }
  if (opts.listProfiles) {
    printProfiles();
    return;
  }
  if (!PROFILES[opts.profile]) {
    throw new Error(`Unknown profile "${opts.profile}". Use --list-profiles.`);
  }

  const urls = await loadUrls(opts);
  const budget = await loadBudget(opts);
  const formats = parseFormats(opts.format);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputRoot = path.resolve(opts.out, timestamp);
  await mkdir(outputRoot, { recursive: true });

  console.log(`\nAdvanced performance audit`);
  console.log(`Profile: ${opts.profile} (${PROFILES[opts.profile].label})`);
  console.log(`Runs per URL: ${opts.runs}`);
  console.log(`Budget: ${budget.source}`);
  console.log(`Output: ${outputRoot}\n`);

  const results = [];
  for (const url of urls) {
    const result = await auditUrl(url, opts, budget.data, outputRoot, formats);
    results.push(result);
  }

  const summaryPath = path.join(outputRoot, 'summary.json');
  await writeFile(summaryPath, JSON.stringify(results.map(stripHeavySampleData), null, 2), 'utf8');

  const failed = results.some((r) => r.budget.failed);
  console.log(`\nSummary written: ${summaryPath}`);

  if (failed && opts.failOnBudget) {
    console.log('Budget failed and --fail-on-budget was used. Exiting with code 1.');
    process.exitCode = 1;
  }
}

function parseFormats(raw) {
  const formats = raw === 'all' ? ['json', 'md', 'html'] : raw.split(',').map((f) => f.trim());
  const allowed = new Set(['json', 'md', 'html']);
  for (const format of formats) {
    if (!allowed.has(format)) throw new Error(`Unknown format "${format}". Use json,md,html,all.`);
  }
  return new Set(formats);
}

async function auditUrl(url, opts, budget, outputRoot, formats) {
  const profile = PROFILES[opts.profile];
  const slug = slugFromUrl(url);
  const urlDir = path.join(outputRoot, slug);
  await mkdir(urlDir, { recursive: true });

  console.log(`\n=== ${url} ===`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const samples = [];
  try {
    for (let i = 1; i <= opts.runs; i++) {
      process.stdout.write(`Run ${i}/${opts.runs}... `);
      const sample = await measureRun(browser, url, profile, opts, urlDir, i);
      samples.push(sample);

      if (sample.error) {
        console.log(`ERROR ${sample.error}`);
      } else {
        console.log(
          [
            `LCP=${fmtMs(sample.metrics.lcp)}`,
            `CLS=${fmtNum(sample.metrics.cls, 3)}`,
            `TBT*=${fmtMs(sample.metrics.tbtProxy)}`,
            `TTFB=${fmtMs(sample.metrics.ttfb)}`,
            `KB=${fmtNum(sample.metrics.totalTransferKB, 0)}`,
            `req=${sample.metrics.resourceCount}`,
          ].join(' '),
        );
      }
    }
  } finally {
    await browser.close();
  }

  const aggregate = aggregateSamples(samples);
  const representative = pickRepresentativeSample(samples, aggregate);
  const crux = opts.crux ? await fetchCrux(url, profile, opts.cruxKey) : null;
  const budgetResult = evaluateBudget(aggregate, representative, budget, url);
  const diagnostics = buildDiagnostics(representative, url);
  const plainLanguage = buildPlainLanguageSummary(aggregate, budgetResult, diagnostics);
  const report = {
    meta: {
      tool: 'motowycena-advanced-performance-audit',
      version: '1.0.0',
      auditedAt: new Date().toISOString(),
      url,
      profile: opts.profile,
      profileLabel: profile.label,
      runsRequested: opts.runs,
      runsOk: samples.filter((s) => !s.error).length,
      runsFailed: samples.filter((s) => s.error).length,
      notes: [
        'TBT* is a lab proxy for responsiveness, not official INP.',
        'Official INP needs field data or real user interactions.',
        'Resource transfer sizes use Resource Timing plus CDP encodedDataLength fallback.',
      ],
    },
    aggregate,
    budget: budgetResult,
    crux,
    diagnostics,
    plainLanguage,
    samples,
  };

  const paths = await writeReports(report, urlDir, slug, formats);
  report.paths = paths;

  printAggregate(report);
  printPlainLanguage(report);
  return report;
}

async function measureRun(browser, url, profile, opts, urlDir, runIndex) {
  const page = await browser.newPage();
  const client = await page.createCDPSession();
  const cdpRequests = new Map();
  const failedRequests = [];
  const consoleMessages = [];

  client.on('Network.responseReceived', ({ requestId, response, type }) => {
    cdpRequests.set(requestId, {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      mimeType: response.mimeType,
      protocol: response.protocol,
      fromDiskCache: Boolean(response.fromDiskCache),
      fromServiceWorker: Boolean(response.fromServiceWorker),
      headers: lowerCaseKeys(response.headers || {}),
      type,
      encodedDataLength: Number(response.encodedDataLength || 0),
    });
  });
  client.on('Network.loadingFinished', ({ requestId, encodedDataLength }) => {
    const record = cdpRequests.get(requestId);
    if (record) record.encodedDataLength = Number(encodedDataLength || record.encodedDataLength || 0);
  });
  client.on('Network.loadingFailed', ({ requestId, errorText, type }) => {
    const record = cdpRequests.get(requestId);
    failedRequests.push({
      url: record?.url || requestId,
      type,
      errorText,
    });
  });

  page.on('requestfailed', (request) => {
    failedRequests.push({
      url: request.url(),
      type: request.resourceType(),
      errorText: request.failure()?.errorText || 'unknown',
    });
  });
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text().slice(0, 500),
      });
    }
  });
  page.on('pageerror', (error) => {
    consoleMessages.push({ type: 'pageerror', text: error.message.slice(0, 500) });
  });

  try {
    await client.send('Network.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Network.clearBrowserCache');
    await client.send('Network.clearBrowserCookies');
    await client.send('Emulation.setCPUThrottlingRate', { rate: profile.cpuThrottle });
    if (profile.network) {
      await client.send('Network.emulateNetworkConditions', profile.network);
    }

    await page.setViewport(profile.viewport);
    await page.setUserAgent(profile.userAgent);
    await page.evaluateOnNewDocument(installPerformanceObservers);

    const startedAt = Date.now();
    const mainResponse = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: opts.timeout,
    });
    await sleep(opts.wait);
    const wallClockMs = Date.now() - startedAt;

    let screenshot = null;
    if (opts.screenshot && runIndex === 1) {
      screenshot = path.join(urlDir, `screenshot-run-${runIndex}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
    }

    const pageMetrics = await page.metrics();
    const browserData = await page.evaluate(collectBrowserData);
    const networkByUrl = buildNetworkByUrl(cdpRequests);
    const enrichedResources = enrichResources(browserData.resources, networkByUrl, url);
    const grouped = groupResources(enrichedResources, browserData.navigation.transferSize);
    const longTasks = browserData.perf.longTasks || [];
    const tbtProxy = longTasks.reduce((sum, task) => {
      if (task.startTime < browserData.perf.fcp) return sum;
      return sum + Math.max(0, task.duration - 50);
    }, 0);

    const mainHeaders = lowerCaseKeys(mainResponse?.headers() || {});
    const mainUrl = mainResponse?.url() || url;
    const metrics = {
      lcp: browserData.perf.lcp?.value || 0,
      cls: browserData.perf.cls || 0,
      fcp: browserData.perf.fcp || 0,
      fp: browserData.perf.fp || 0,
      observedInp: browserData.perf.observedInp?.value || null,
      tbtProxy,
      ttfb: browserData.navigation.ttfb,
      dns: browserData.navigation.dns,
      tcp: browserData.navigation.tcp,
      tls: browserData.navigation.tls,
      request: browserData.navigation.request,
      response: browserData.navigation.response,
      domContentLoaded: browserData.navigation.domContentLoaded,
      load: browserData.navigation.load,
      wallClockMs,
      totalTransferKB: grouped.totalTransferKB,
      totalDecodedKB: grouped.totalDecodedKB,
      resourceCount: enrichedResources.length + 1,
      scriptKB: grouped.byType.script.kb,
      stylesheetKB: grouped.byType.stylesheet.kb,
      imageKB: grouped.byType.image.kb,
      fontKB: grouped.byType.font.kb,
      fetchKB: grouped.byType.fetch.kb,
      thirdPartyKB: grouped.thirdPartyKB,
    };

    return {
      runIndex,
      error: null,
      screenshot,
      main: {
        url: mainUrl,
        status: mainResponse?.status() || null,
        headers: mainHeaders,
        fromCache: Boolean(mainResponse?.fromCache?.()),
        fromServiceWorker: Boolean(mainResponse?.fromServiceWorker?.()),
      },
      metrics,
      lcpElement: browserData.perf.lcp || null,
      clsShifts: browserData.perf.clsShifts || [],
      longTasks,
      observedInp: browserData.perf.observedInp || null,
      resources: enrichedResources,
      resourceGroups: grouped,
      seo: browserData.seo,
      security: analyzeSecurity(url, mainHeaders),
      pageMetrics,
      failedRequests: dedupeByKey(failedRequests, (item) => `${item.url}:${item.errorText}`),
      consoleMessages: consoleMessages.slice(0, 50),
    };
  } catch (error) {
    return {
      runIndex,
      error: error.message,
      metrics: {},
      failedRequests,
      consoleMessages,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

function installPerformanceObservers() {
  const selectorFor = (node) => {
    if (!node || node.nodeType !== 1) return null;
    const el = node;
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let current = el;
    while (current && current.nodeType === 1 && parts.length < 4) {
      let part = current.nodeName.toLowerCase();
      if (current.classList && current.classList.length) {
        part += `.${Array.from(current.classList).slice(0, 2).map((c) => CSS.escape(c)).join('.')}`;
      }
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((child) => child.nodeName === current.nodeName);
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
      parts.unshift(part);
      current = parent;
    }
    return parts.join(' > ');
  };

  const rectFor = (rect) =>
    rect
      ? {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }
      : null;

  window.__advancedAudit = {
    fp: 0,
    fcp: 0,
    lcp: null,
    cls: 0,
    clsSessionValue: 0,
    clsSessionStart: 0,
    clsLastShiftTime: 0,
    clsShifts: [],
    longTasks: [],
    observedInp: null,
    observerErrors: [],
  };

  const safeObserve = (type, options, callback) => {
    try {
      new PerformanceObserver(callback).observe({ type, buffered: true, ...options });
    } catch (error) {
      window.__advancedAudit.observerErrors.push(`${type}: ${error.message}`);
    }
  };

  safeObserve('paint', {}, (list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-paint') window.__advancedAudit.fp = entry.startTime;
      if (entry.name === 'first-contentful-paint') window.__advancedAudit.fcp = entry.startTime;
    }
  });

  safeObserve('largest-contentful-paint', {}, (list) => {
    const last = list.getEntries().slice(-1)[0];
    if (!last) return;
    window.__advancedAudit.lcp = {
      value: last.renderTime || last.loadTime || last.startTime,
      renderTime: last.renderTime,
      loadTime: last.loadTime,
      size: last.size,
      url: last.url || null,
      tagName: last.element?.tagName || null,
      selector: selectorFor(last.element),
      text: last.element?.innerText?.trim().slice(0, 140) || null,
    };
  });

  safeObserve('layout-shift', {}, (list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;

      const isNewSession =
        window.__advancedAudit.clsLastShiftTime === 0 ||
        entry.startTime - window.__advancedAudit.clsLastShiftTime > 1000 ||
        entry.startTime - window.__advancedAudit.clsSessionStart > 5000;

      if (isNewSession) {
        window.__advancedAudit.clsSessionValue = entry.value;
        window.__advancedAudit.clsSessionStart = entry.startTime;
      } else {
        window.__advancedAudit.clsSessionValue += entry.value;
      }

      window.__advancedAudit.clsLastShiftTime = entry.startTime;
      window.__advancedAudit.cls = Math.max(
        window.__advancedAudit.cls,
        window.__advancedAudit.clsSessionValue,
      );
      window.__advancedAudit.clsShifts.push({
        value: entry.value,
        startTime: entry.startTime,
        sources: (entry.sources || []).slice(0, 5).map((source) => ({
          selector: selectorFor(source.node),
          previousRect: rectFor(source.previousRect),
          currentRect: rectFor(source.currentRect),
        })),
      });
    }
  });

  safeObserve('longtask', {}, (list) => {
    for (const entry of list.getEntries()) {
      window.__advancedAudit.longTasks.push({
        startTime: entry.startTime,
        duration: entry.duration,
      });
    }
  });

  safeObserve('event', { durationThreshold: 16 }, (list) => {
    for (const entry of list.getEntries()) {
      const candidate = {
        value: entry.duration,
        name: entry.name,
        startTime: entry.startTime,
        processingStart: entry.processingStart,
        processingEnd: entry.processingEnd,
        selector: selectorFor(entry.target),
      };
      if (!window.__advancedAudit.observedInp || candidate.value > window.__advancedAudit.observedInp.value) {
        window.__advancedAudit.observedInp = candidate;
      }
    }
  });
}

function collectBrowserData() {
  const nav = performance.getEntriesByType('navigation')[0];
  const resources = performance.getEntriesByType('resource').map((r) => ({
    name: r.name,
    initiatorType: r.initiatorType || 'other',
    startTime: r.startTime,
    duration: r.duration,
    transferSize: r.transferSize || 0,
    encodedBodySize: r.encodedBodySize || 0,
    decodedBodySize: r.decodedBodySize || 0,
    nextHopProtocol: r.nextHopProtocol || '',
    renderBlockingStatus: r.renderBlockingStatus || '',
    responseEnd: r.responseEnd,
  }));

  const getMeta = (name) =>
    document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.getAttribute('content') || '';
  const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((script) => {
    const text = script.textContent || '';
    try {
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : [data];
      return {
        ok: true,
        types: items.flatMap((item) => {
          const type = item['@type'];
          return Array.isArray(type) ? type : type ? [type] : [];
        }),
      };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });
  const images = Array.from(document.images);

  return {
    perf: window.__advancedAudit,
    navigation: {
      type: nav?.type || 'unknown',
      redirect: (nav?.redirectEnd || 0) - (nav?.redirectStart || 0),
      dns: (nav?.domainLookupEnd || 0) - (nav?.domainLookupStart || 0),
      tcp: (nav?.connectEnd || 0) - (nav?.connectStart || 0),
      tls: nav?.secureConnectionStart ? nav.connectEnd - nav.secureConnectionStart : 0,
      request: (nav?.responseStart || 0) - (nav?.requestStart || 0),
      response: (nav?.responseEnd || 0) - (nav?.responseStart || 0),
      ttfb: (nav?.responseStart || 0) - (nav?.requestStart || 0),
      domContentLoaded: (nav?.domContentLoadedEventEnd || 0) - (nav?.fetchStart || 0),
      load: (nav?.loadEventEnd || 0) - (nav?.fetchStart || 0),
      transferSize: nav?.transferSize || 0,
      encodedBodySize: nav?.encodedBodySize || 0,
      decodedBodySize: nav?.decodedBodySize || 0,
    },
    resources,
    seo: {
      finalUrl: location.href,
      lang: document.documentElement.lang || '',
      title: document.title || '',
      titleLength: (document.title || '').length,
      description: getMeta('description'),
      descriptionLength: getMeta('description').length,
      canonical: document.querySelector('link[rel="canonical"]')?.href || '',
      robots: getMeta('robots'),
      viewport: getMeta('viewport'),
      h1Count: document.querySelectorAll('h1').length,
      h1Texts: Array.from(document.querySelectorAll('h1'))
        .map((h) => h.innerText.trim())
        .filter(Boolean)
        .slice(0, 10),
      imageCount: images.length,
      imagesMissingAlt: images.filter((img) => !img.hasAttribute('alt') || img.getAttribute('alt').trim() === '')
        .length,
      internalLinks: Array.from(document.links).filter((a) => a.origin === location.origin).length,
      externalLinks: Array.from(document.links).filter((a) => a.origin !== location.origin).length,
      jsonLdCount: jsonLd.length,
      jsonLdTypes: jsonLd.flatMap((entry) => entry.types || []),
      jsonLdErrors: jsonLd.filter((entry) => !entry.ok).map((entry) => entry.error),
      domNodes: document.getElementsByTagName('*').length,
    },
  };
}

function buildNetworkByUrl(cdpRequests) {
  const byUrl = new Map();
  for (const record of cdpRequests.values()) {
    const existing = byUrl.get(record.url);
    if (existing) {
      existing.encodedDataLength += record.encodedDataLength || 0;
      existing.count += 1;
    } else {
      byUrl.set(record.url, { ...record, count: 1 });
    }
  }
  return byUrl;
}

function enrichResources(resources, networkByUrl, pageUrl) {
  const pageOrigin = safeOrigin(pageUrl);
  return resources.map((resource) => {
    const cdp = networkByUrl.get(resource.name);
    const type = classifyResource(resource, cdp);
    const transferSize = resource.transferSize || cdp?.encodedDataLength || 0;
    const decodedBodySize = resource.decodedBodySize || resource.encodedBodySize || transferSize;
    const origin = safeOrigin(resource.name);
    return {
      ...resource,
      type,
      status: cdp?.status || null,
      mimeType: cdp?.mimeType || '',
      protocol: resource.nextHopProtocol || cdp?.protocol || '',
      transferSize,
      decodedBodySize,
      transferKB: transferSize / 1024,
      decodedKB: decodedBodySize / 1024,
      origin,
      isThirdParty: origin !== '' && pageOrigin !== '' && origin !== pageOrigin,
      cacheControl: cdp?.headers?.['cache-control'] || '',
      contentEncoding: cdp?.headers?.['content-encoding'] || '',
    };
  });
}

function classifyResource(resource, cdp) {
  const name = resource.name.toLowerCase();
  const initiator = resource.initiatorType;
  const mime = (cdp?.mimeType || '').toLowerCase();
  if (
    initiator === 'img' ||
    initiator === 'image' ||
    mime.startsWith('image/') ||
    /\.(avif|webp|png|jpe?g|gif|svg|ico)(\?|$)/.test(name)
  ) {
    return 'image';
  }
  if (initiator === 'font' || mime.includes('font') || /\.(woff2?|ttf|otf|eot)(\?|$)/.test(name)) return 'font';
  if (initiator === 'script' || mime.includes('javascript') || /\.(mjs|js)(\?|$)/.test(name)) return 'script';
  if (mime.includes('css') || /\.(css)(\?|$)/.test(name)) return 'stylesheet';
  if (['fetch', 'xmlhttprequest', 'beacon'].includes(initiator)) return 'fetch';
  return 'other';
}

function groupResources(resources, documentTransferSize) {
  const byType = {
    document: { count: 1, kb: documentTransferSize / 1024, decodedKB: 0 },
    script: { count: 0, kb: 0, decodedKB: 0 },
    stylesheet: { count: 0, kb: 0, decodedKB: 0 },
    image: { count: 0, kb: 0, decodedKB: 0 },
    font: { count: 0, kb: 0, decodedKB: 0 },
    fetch: { count: 0, kb: 0, decodedKB: 0 },
    other: { count: 0, kb: 0, decodedKB: 0 },
  };

  const byOrigin = new Map();
  for (const r of resources) {
    const bucket = byType[r.type] || byType.other;
    bucket.count += 1;
    bucket.kb += r.transferKB;
    bucket.decodedKB += r.decodedKB;

    if (!byOrigin.has(r.origin)) byOrigin.set(r.origin, { origin: r.origin, count: 0, kb: 0 });
    const origin = byOrigin.get(r.origin);
    origin.count += 1;
    origin.kb += r.transferKB;
  }

  const totalTransferKB = Object.values(byType).reduce((sum, bucket) => sum + bucket.kb, 0);
  const totalDecodedKB =
    documentTransferSize / 1024 + resources.reduce((sum, resource) => sum + resource.decodedKB, 0);
  const thirdPartyKB = resources.filter((r) => r.isThirdParty).reduce((sum, resource) => sum + resource.transferKB, 0);

  return {
    byType,
    byOrigin: Array.from(byOrigin.values()).sort((a, b) => b.kb - a.kb),
    totalTransferKB,
    totalDecodedKB,
    thirdPartyKB,
  };
}

function aggregateSamples(samples) {
  const ok = samples.filter((sample) => !sample.error);
  const metricKeys = [
    'lcp',
    'cls',
    'fcp',
    'fp',
    'observedInp',
    'tbtProxy',
    'ttfb',
    'dns',
    'tcp',
    'tls',
    'request',
    'response',
    'domContentLoaded',
    'load',
    'wallClockMs',
    'totalTransferKB',
    'totalDecodedKB',
    'resourceCount',
    'scriptKB',
    'stylesheetKB',
    'imageKB',
    'fontKB',
    'fetchKB',
    'thirdPartyKB',
  ];

  const metrics = {};
  for (const key of metricKeys) {
    metrics[key] = stats(ok.map((sample) => sample.metrics[key]).filter((value) => typeof value === 'number'));
  }

  return {
    runsOk: ok.length,
    runsFailed: samples.length - ok.length,
    metrics,
  };
}

function stats(values) {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!clean.length) {
    return { count: 0, min: null, max: null, avg: null, stdev: null, p50: null, p75: null, p95: null };
  }
  const avg = clean.reduce((sum, value) => sum + value, 0) / clean.length;
  const variance = clean.reduce((sum, value) => sum + (value - avg) ** 2, 0) / clean.length;
  return {
    count: clean.length,
    min: clean[0],
    max: clean[clean.length - 1],
    avg,
    stdev: Math.sqrt(variance),
    p50: percentile(clean, 50),
    p75: percentile(clean, 75),
    p95: percentile(clean, 95),
  };
}

function percentile(sortedValues, p) {
  if (!sortedValues.length) return null;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.min(sortedValues.length - 1, Math.max(0, index))];
}

function pickRepresentativeSample(samples, aggregate) {
  const ok = samples.filter((sample) => !sample.error);
  if (!ok.length) return null;
  const target = aggregate.metrics.lcp.p75 ?? aggregate.metrics.lcp.p50 ?? ok[0].metrics.lcp;
  return ok
    .map((sample) => ({ sample, distance: Math.abs((sample.metrics.lcp || 0) - target) }))
    .sort((a, b) => a.distance - b.distance)[0].sample;
}

async function fetchCrux(url, profile, apiKey) {
  if (!apiKey) {
    return {
      status: 'skipped',
      reason: 'No CRUX_API_KEY or --crux-key provided.',
    };
  }

  try {
    const endpoint = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url,
        formFactor: profile.formFactor,
        metrics: [
          'largest_contentful_paint',
          'cumulative_layout_shift',
          'interaction_to_next_paint',
          'first_contentful_paint',
          'experimental_time_to_first_byte',
        ],
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { status: 'error', error: data?.error?.message || response.statusText };
    }
    return {
      status: 'ok',
      formFactor: profile.formFactor,
      metrics: simplifyCruxMetrics(data.record?.metrics || {}),
    };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

function simplifyCruxMetrics(metrics) {
  const out = {};
  for (const [key, value] of Object.entries(metrics)) {
    out[key] = {
      p75: value?.percentiles?.p75 ?? null,
      fractions: value?.histogram?.map((bucket) => ({
        start: bucket.start ?? null,
        end: bucket.end ?? null,
        density: bucket.density ?? null,
      })),
    };
  }
  return out;
}

function evaluateBudget(aggregate, representative, budget, url) {
  const checks = [];
  const add = (category, name, actual, limit, pass, help, severity = 'error') => {
    checks.push({ category, name, actual, limit, pass, severity, help });
  };

  const metricMap = {
    lcpP75: ['lcp', 'p75', 'LCP p75 should stay under the Core Web Vitals good threshold.'],
    clsP75: ['cls', 'p75', 'CLS p75 should stay below visible layout shift risk.'],
    fcpP75: ['fcp', 'p75', 'FCP p75 controls when users first see content.'],
    ttfbP75: ['ttfb', 'p75', 'TTFB p75 tells whether server/CDN response is slow.'],
    tbtProxyP75: ['tbtProxy', 'p75', 'TBT* p75 is a lab proxy for responsiveness.'],
    tbtP75: ['tbtProxy', 'p75', 'Alias for tbtProxyP75.'],
    loadP75: ['load', 'p75', 'Load event p75 should not drift too high.'],
  };
  for (const [budgetKey, [metricKey, statKey, help]] of Object.entries(metricMap)) {
    const limit = budget.metrics?.[budgetKey];
    if (typeof limit !== 'number') continue;
    const actual = aggregate.metrics[metricKey]?.[statKey];
    add('metrics', budgetKey, actual, limit, actual !== null && actual <= limit, help);
  }

  const resourceMap = {
    totalTransferKBP75: ['totalTransferKB', 'Total transferred KB p75.'],
    scriptKBP75: ['scriptKB', 'JavaScript transfer KB p75.'],
    stylesheetKBP75: ['stylesheetKB', 'CSS transfer KB p75.'],
    imageKBP75: ['imageKB', 'Image transfer KB p75.'],
    fontKBP75: ['fontKB', 'Font transfer KB p75.'],
    thirdPartyKBP75: ['thirdPartyKB', 'Third-party transfer KB p75.'],
    resourceCountP75: ['resourceCount', 'Request count p75.'],
  };
  for (const [budgetKey, [metricKey, help]] of Object.entries(resourceMap)) {
    const limit = budget.resources?.[budgetKey];
    if (typeof limit !== 'number') continue;
    const actual = aggregate.metrics[metricKey]?.p75;
    add('resources', budgetKey, actual, limit, actual !== null && actual <= limit, help);
  }

  if (representative) {
    const seo = representative.seo;
    const seoBudget = budget.seo || {};
    if (seoBudget.requireTitle) {
      add('seo', 'requireTitle', Boolean(seo.title), true, Boolean(seo.title), 'Document should have a title.');
    }
    if (typeof seoBudget.maxTitleLength === 'number') {
      add(
        'seo',
        'maxTitleLength',
        seo.titleLength,
        seoBudget.maxTitleLength,
        seo.titleLength > 0 && seo.titleLength <= seoBudget.maxTitleLength,
        'Title should be concise enough for SERP display.',
        'warning',
      );
    }
    if (seoBudget.requireMetaDescription) {
      add(
        'seo',
        'requireMetaDescription',
        Boolean(seo.description),
        true,
        Boolean(seo.description),
        'Meta description improves SERP snippet control.',
      );
    }
    if (typeof seoBudget.minMetaDescriptionLength === 'number') {
      add(
        'seo',
        'minMetaDescriptionLength',
        seo.descriptionLength,
        seoBudget.minMetaDescriptionLength,
        seo.descriptionLength >= seoBudget.minMetaDescriptionLength,
        'Very short descriptions waste SERP space.',
        'warning',
      );
    }
    if (typeof seoBudget.maxMetaDescriptionLength === 'number') {
      add(
        'seo',
        'maxMetaDescriptionLength',
        seo.descriptionLength,
        seoBudget.maxMetaDescriptionLength,
        seo.descriptionLength <= seoBudget.maxMetaDescriptionLength,
        'Long descriptions may be truncated in SERP.',
        'warning',
      );
    }
    if (seoBudget.requireExactlyOneH1) {
      add('seo', 'requireExactlyOneH1', seo.h1Count, 1, seo.h1Count === 1, 'Use exactly one primary H1.');
    }
    if (seoBudget.requireCanonical) {
      add(
        'seo',
        'requireCanonical',
        Boolean(seo.canonical),
        true,
        Boolean(seo.canonical),
        'Canonical URL helps avoid duplicate indexing.',
      );
    }
    if (typeof seoBudget.maxImagesMissingAlt === 'number') {
      add(
        'seo',
        'maxImagesMissingAlt',
        seo.imagesMissingAlt,
        seoBudget.maxImagesMissingAlt,
        seo.imagesMissingAlt <= seoBudget.maxImagesMissingAlt,
        'Missing alt hurts accessibility and image SEO.',
        'warning',
      );
    }

    const security = representative.security;
    const secBudget = budget.security || {};
    if (secBudget.requireHttps) {
      add('security', 'requireHttps', security.https, true, security.https, 'Production pages should use HTTPS.');
    } else if (!isLocalUrl(url)) {
      add('security', 'httpsRecommended', security.https, true, security.https, 'HTTPS recommended.', 'warning');
    }
    if (secBudget.requireHsts) {
      add('security', 'requireHsts', security.hsts, true, security.hsts, 'HSTS enforces HTTPS in browsers.');
    }
    if (secBudget.requireCsp) {
      add('security', 'requireCsp', security.csp, true, security.csp, 'CSP reduces XSS blast radius.');
    }
    if (secBudget.requireXContentTypeOptions) {
      add(
        'security',
        'requireXContentTypeOptions',
        security.xContentTypeOptions,
        true,
        security.xContentTypeOptions,
        'X-Content-Type-Options: nosniff prevents MIME confusion.',
      );
    }
    if (secBudget.requireReferrerPolicy) {
      add(
        'security',
        'requireReferrerPolicy',
        security.referrerPolicy,
        true,
        security.referrerPolicy,
        'Referrer-Policy controls URL leakage to other origins.',
      );
    }
  }

  const failedChecks = checks.filter((check) => !check.pass && check.severity === 'error');
  const warnings = checks.filter((check) => !check.pass && check.severity === 'warning');
  return {
    passed: failedChecks.length === 0,
    failed: failedChecks.length > 0,
    failedCount: failedChecks.length,
    warningCount: warnings.length,
    checks,
  };
}

function buildDiagnostics(sample, url) {
  if (!sample) return null;
  const topResources = [...sample.resources].sort((a, b) => b.transferKB - a.transferKB).slice(0, 12);
  const slowResources = [...sample.resources].sort((a, b) => b.duration - a.duration).slice(0, 12);
  const renderBlocking = sample.resources
    .filter((r) => r.renderBlockingStatus === 'blocking')
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 12);
  const statusProblems = sample.resources.filter((r) => r.status && r.status >= 400);
  const thirdPartyOrigins = sample.resourceGroups.byOrigin
    .filter((origin) => origin.origin && origin.origin !== safeOrigin(url))
    .slice(0, 12);

  return {
    lcpElement: sample.lcpElement,
    topResources: slimResources(topResources),
    slowResources: slimResources(slowResources),
    renderBlocking: slimResources(renderBlocking),
    thirdPartyOrigins,
    statusProblems: slimResources(statusProblems),
    longTasksTop: [...sample.longTasks].sort((a, b) => b.duration - a.duration).slice(0, 10),
    failedRequests: sample.failedRequests,
    consoleMessages: sample.consoleMessages,
    seo: sample.seo,
    security: sample.security,
  };
}

function buildPlainLanguageSummary(aggregate, budget, diagnostics) {
  if (aggregate.runsOk === 0) {
    return {
      headline: 'Nie udalo sie zmierzyc strony. Wszystkie runy zakonczyly sie bledem.',
      verdict: [
        'Brak danych LCP/CLS/TTFB, bo Chrome nie zdolal poprawnie otworzyc strony.',
        'To zwykle oznacza literowke w domenie, problem DNS, brak internetu albo blokade po stronie serwera.',
      ],
      good: ['Brak zielonych punktow, bo pomiar nie doszedl do skutku.'],
      problems: ['Nie ma wiarygodnych metryk performance. Najpierw trzeba otworzyc poprawny URL.'],
      nextActions: [
        'Sprawdz, czy domena otwiera sie normalnie w przegladarce.',
        'Wpisz pelny adres, np. https://example.com zamiast samego tekstu z literowka.',
        'Jesli strona dziala w przegladarce, sprobuj profilu no-throttle, zeby wykluczyc problem z throttlingiem.',
      ],
      dictionary: [
        'DNS = system, ktory zamienia domene na adres serwera.',
        'Run = pojedynczy pomiar strony w Chrome.',
        'Raport bez udanych runow nie nadaje sie do oceny szybkosci.',
      ],
    };
  }

  const metric = (key) => aggregate.metrics[key]?.p75 ?? null;
  const lcp = metric('lcp');
  const cls = metric('cls');
  const fcp = metric('fcp');
  const ttfb = metric('ttfb');
  const tbt = metric('tbtProxy');
  const transfer = metric('totalTransferKB');
  const requests = metric('resourceCount');
  const fontKB = metric('fontKB');
  const scriptKB = metric('scriptKB');
  const imageKB = metric('imageKB');

  const problems = budget.checks
    .filter((check) => !check.pass)
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
    .slice(0, 8)
    .map(humanizeBudgetCheck);

  const good = [];
  if (isGood(lcp, 'lcp')) good.push(`Najwiekszy widoczny element strony pojawia sie szybko: ${formatMetric(lcp, 'ms')}.`);
  if (isGood(cls, 'cls')) good.push(`Strona prawie nie skacze podczas ladowania: CLS ${formatMetric(cls, '')}.`);
  if (isGood(tbt, 'tbtProxy')) good.push(`Przegladarka nie jest dlugo blokowana JavaScriptem: TBT* ${formatMetric(tbt, 'ms')}.`);
  if (transfer !== null && transfer <= 750) good.push(`Calkowity transfer jest jeszcze rozsadny: ${formatMetric(transfer, 'KB')}.`);

  const actions = [];
  if (budget.checks.some((c) => !c.pass && c.name === 'requireMetaDescription')) {
    actions.push('Dodaj meta description: to jest opis pod tytulem w Google. Bez tego Google sam zgaduje opis strony.');
  }
  if (budget.checks.some((c) => !c.pass && c.name === 'fontKBP75')) {
    actions.push(`Odchudz fonty: teraz ida za duze pliki fontow (${formatMetric(fontKB, 'KB')}). Najczesciej pomaga mniej krojow, mniej wag i font-display: swap.`);
  }
  if (budget.checks.some((c) => !c.pass && c.name === 'scriptKBP75')) {
    actions.push(`Odchudz JavaScript: teraz JS ma ${formatMetric(scriptKB, 'KB')}. Szukaj pluginow, sliderow i kodu, ktory laduje sie na kazdej stronie bez potrzeby.`);
  }
  if (budget.checks.some((c) => !c.pass && c.name === 'imageKBP75')) {
    actions.push(`Skompresuj obrazy: teraz obrazy maja ${formatMetric(imageKB, 'KB')}. Celuj w WebP/AVIF i konkretne wymiary pod layout.`);
  }
  if (budget.checks.some((c) => !c.pass && c.name === 'ttfbP75')) {
    actions.push(`Popraw czas odpowiedzi serwera/CDN: TTFB to ${formatMetric(ttfb, 'ms')}. To czas zanim przegladarka dostanie pierwszy bajt HTML.`);
  }
  if (budget.checks.some((c) => !c.pass && c.name === 'maxImagesMissingAlt')) {
    actions.push('Dodaj alt do obrazow: pomaga dostepnosci i daje Google lepszy kontekst obrazkow.');
  }
  if (actions.length === 0 && problems.length > 0) {
    actions.push('Zacznij od czerwonych pozycji w sekcji Budget. To sa rzeczy, ktore przekroczyly ustawione limity.');
  }
  if (actions.length === 0) {
    actions.push('Nie ma duzych czerwonych flag w tym pomiarze. Kolejny krok to pomiar kilku waznych podstron i porownanie p75.');
  }

  const topResource = diagnostics?.topResources?.[0];
  if (topResource) {
    actions.push(`Najwiekszy pojedynczy zasob w tym pomiarze: ${topResource.type}, ${topResource.kb} KB. URL: ${topResource.url}`);
  }

  const headline =
    budget.failedCount > 0
      ? `Strona dziala, ale sa ${budget.failedCount} rzeczy do poprawy w budzecie.`
      : 'Strona miesci sie w ustawionym budzecie technicznym.';

  const verdict = [
    `LCP p75: ${formatMetric(lcp, 'ms')} (${humanGrade(lcp, 'lcp')})`,
    `CLS p75: ${formatMetric(cls, '')} (${humanGrade(cls, 'cls')})`,
    `TTFB p75: ${formatMetric(ttfb, 'ms')} (${humanGrade(ttfb, 'ttfb')})`,
    `TBT* p75: ${formatMetric(tbt, 'ms')} (${humanGrade(tbt, 'tbtProxy')})`,
    `Transfer p75: ${formatMetric(transfer, 'KB')}`,
    `Requesty p75: ${formatMetric(requests, '')}`,
  ];

  const dictionary = [
    'LCP = kiedy uzytkownik widzi najwiekszy wazny element strony, zwykle hero, naglowek albo duzy obraz.',
    'CLS = czy strona skacze podczas ladowania. Nisko znaczy stabilnie.',
    'TTFB = ile czekamy na pierwszy bajt z serwera. Wysoko znaczy problem z hostingiem, backendem albo CDN.',
    'TBT* = ile JavaScript blokuje przegladarke w labie. To przyblizenie responsywnosci, nie oficjalny INP.',
    'p75 = wynik, ktory jest lepszy dla 75% pomiarow. Google patrzy podobnie na dane terenowe.',
  ];

  return {
    headline,
    verdict,
    good: good.length ? good : ['Brak mocnych zielonych punktow w tym pomiarze albo pomiar byl zbyt maly.'],
    problems: problems.length ? problems : ['Nie widze krytycznych problemow wzgledem ustawionego budzetu.'],
    nextActions: actions.slice(0, 6),
    dictionary,
  };
}

function severityRank(severity) {
  return severity === 'error' ? 0 : 1;
}

function isGood(value, metric) {
  if (value === null || value === undefined || !WEB_VITAL_THRESHOLDS[metric]) return false;
  return value <= WEB_VITAL_THRESHOLDS[metric][0];
}

function humanGrade(value, metric) {
  const g = grade(value, metric);
  if (g === 'good') return 'dobrze';
  if (g === 'needs-work') return 'do poprawy';
  if (g === 'poor') return 'slabo';
  return 'brak oceny';
}

function humanizeBudgetCheck(check) {
  const actual = formatValue(check.actual);
  const limit = formatValue(check.limit);
  const label = `${check.name}: ${actual} / limit ${limit}`;
  const meanings = {
    lcpP75: 'Najwiekszy element pojawia sie za pozno. Uzytkownik za dlugo patrzy na niepelna strone.',
    clsP75: 'Strona za bardzo przeskakuje podczas ladowania.',
    fcpP75: 'Pierwsza tresc pojawia sie za pozno.',
    ttfbP75: 'Serwer/CDN za dlugo zwleka z pierwsza odpowiedzia.',
    tbtProxyP75: 'JavaScript za dlugo blokuje glowny watek przegladarki.',
    loadP75: 'Pelne zaladowanie strony trwa za dlugo.',
    totalTransferKBP75: 'Strona pobiera za duzo danych.',
    scriptKBP75: 'Za duzo JavaScriptu trafia do przegladarki.',
    stylesheetKBP75: 'Za duzo CSS trafia do przegladarki.',
    imageKBP75: 'Obrazy sa za ciezkie.',
    fontKBP75: 'Fonty sa za ciezkie.',
    thirdPartyKBP75: 'Zewnetrzne skrypty/uslugi pobieraja za duzo danych.',
    resourceCountP75: 'Strona robi za duzo requestow.',
    requireMetaDescription: 'Brakuje opisu strony dla Google.',
    minMetaDescriptionLength: 'Opis dla Google jest za krotki.',
    maxMetaDescriptionLength: 'Opis dla Google jest za dlugi.',
    requireExactlyOneH1: 'Strona powinna miec jeden glowny naglowek H1.',
    requireCanonical: 'Brakuje canonical URL, czyli informacji ktory adres jest glowna wersja strony.',
    maxImagesMissingAlt: 'Czesc obrazow nie ma alt, czyli opisu dla czytnikow i Google.',
    requireHttps: 'Strona powinna dzialac po HTTPS.',
    requireHsts: 'Brakuje HSTS, czyli wymuszenia HTTPS w przegladarce.',
    requireCsp: 'Brakuje CSP, czyli waznego naglowka bezpieczenstwa.',
    requireXContentTypeOptions: 'Brakuje X-Content-Type-Options: nosniff.',
    requireReferrerPolicy: 'Brakuje Referrer-Policy.',
  };
  return `${label} - ${meanings[check.name] || check.help}`;
}

function slimResources(resources) {
  return resources.map((r) => ({
    url: r.name,
    type: r.type,
    status: r.status,
    kb: round(r.transferKB, 1),
    duration: round(r.duration, 0),
    protocol: r.protocol,
    cacheControl: r.cacheControl,
  }));
}

async function writeReports(report, urlDir, slug, formats) {
  const paths = {};
  if (formats.has('json')) {
    paths.json = path.join(urlDir, `${slug}.json`);
    await writeFile(paths.json, JSON.stringify(report, null, 2), 'utf8');
  }
  if (formats.has('md')) {
    paths.markdown = path.join(urlDir, `${slug}.md`);
    await writeFile(paths.markdown, renderMarkdown(report), 'utf8');
  }
  if (formats.has('html')) {
    paths.html = path.join(urlDir, `${slug}.html`);
    await writeFile(paths.html, renderHtml(report), 'utf8');
  }
  return paths;
}

function printAggregate(report) {
  const rows = [
    ['LCP', report.aggregate.metrics.lcp, 'ms', 'lcp'],
    ['CLS', report.aggregate.metrics.cls, '', 'cls'],
    ['FCP', report.aggregate.metrics.fcp, 'ms', 'fcp'],
    ['TTFB', report.aggregate.metrics.ttfb, 'ms', 'ttfb'],
    ['TBT*', report.aggregate.metrics.tbtProxy, 'ms', 'tbtProxy'],
    ['Transfer', report.aggregate.metrics.totalTransferKB, 'KB', null],
    ['Requests', report.aggregate.metrics.resourceCount, '', null],
  ];

  console.log('\nMetric      p50        p75        p95        grade');
  console.log('--------------------------------------------------');
  for (const [label, stat, unit, thresholdKey] of rows) {
    const p50 = formatMetric(stat.p50, unit);
    const p75 = formatMetric(stat.p75, unit);
    const p95 = formatMetric(stat.p95, unit);
    const gradeText = thresholdKey ? grade(stat.p75, thresholdKey).toUpperCase() : '';
    console.log(`${label.padEnd(9)} ${p50.padStart(9)} ${p75.padStart(10)} ${p95.padStart(10)} ${gradeText}`);
  }
  console.log(`Budget: ${report.budget.passed ? 'PASS' : 'FAIL'} (${report.budget.failedCount} errors, ${report.budget.warningCount} warnings)`);
  if (report.paths?.html) console.log(`HTML: ${report.paths.html}`);
  if (report.paths?.markdown) console.log(`MD:   ${report.paths.markdown}`);
  if (report.paths?.json) console.log(`JSON: ${report.paths.json}`);
}

function printPlainLanguage(report) {
  const plain = report.plainLanguage;
  if (!plain) return;
  console.log('\nPo ludzku:');
  console.log(`  ${plain.headline}`);
  for (const action of plain.nextActions.slice(0, 3)) {
    console.log(`  - ${action}`);
  }
}

function renderMarkdown(report) {
  const plain = report.plainLanguage;
  const plainSection = plain
    ? `## Po ludzku

${plain.headline}

### Wynik w prostych slowach

${plain.verdict.map((item) => `- ${item}`).join('\n')}

### Co jest dobre

${plain.good.map((item) => `- ${item}`).join('\n')}

### Co boli

${plain.problems.map((item) => `- ${item}`).join('\n')}

### Co poprawic najpierw

${plain.nextActions.map((item) => `- ${item}`).join('\n')}

### Mini-slownik

${plain.dictionary.map((item) => `- ${item}`).join('\n')}
`
    : '';
  const budgetRows = report.budget.checks
    .map(
      (c) =>
        `| ${c.pass ? 'PASS' : c.severity === 'warning' ? 'WARN' : 'FAIL'} | ${c.category} | ${c.name} | ${formatValue(
          c.actual,
        )} | ${formatValue(c.limit)} | ${c.help} |`,
    )
    .join('\n');
  const metricRows = [
    ['LCP', 'lcp', 'ms'],
    ['CLS', 'cls', ''],
    ['FCP', 'fcp', 'ms'],
    ['TTFB', 'ttfb', 'ms'],
    ['TBT*', 'tbtProxy', 'ms'],
    ['Transfer', 'totalTransferKB', 'KB'],
    ['Requests', 'resourceCount', ''],
    ['JS', 'scriptKB', 'KB'],
    ['CSS', 'stylesheetKB', 'KB'],
    ['Images', 'imageKB', 'KB'],
    ['Fonts', 'fontKB', 'KB'],
    ['Third-party', 'thirdPartyKB', 'KB'],
  ]
    .map(([label, key, unit]) => {
      const stat = report.aggregate.metrics[key];
      return `| ${label} | ${formatMetric(stat.p50, unit)} | ${formatMetric(stat.p75, unit)} | ${formatMetric(
        stat.p95,
        unit,
      )} | ${key in WEB_VITAL_THRESHOLDS ? grade(stat.p75, key) : ''} |`;
    })
    .join('\n');
  const topResources = (report.diagnostics?.topResources || [])
    .map((r) => `| ${r.type} | ${r.kb} KB | ${r.duration} ms | ${r.status || ''} | ${r.url} |`)
    .join('\n');
  const thirdParty = (report.diagnostics?.thirdPartyOrigins || [])
    .map((o) => `| ${o.origin || '(unknown)'} | ${o.count} | ${round(o.kb, 1)} KB |`)
    .join('\n');

  return `# Performance audit: ${report.meta.url}

Profile: \`${report.meta.profile}\` (${report.meta.profileLabel})
Runs: ${report.meta.runsOk}/${report.meta.runsRequested} OK
Audited at: ${report.meta.auditedAt}

Important: \`TBT*\` is a lab proxy for responsiveness. Official Core Web Vitals responsiveness is \`INP\` from field/user interaction data.

${plainSection}

## Metrics

| Metric | p50 | p75 | p95 | Grade |
|--------|-----|-----|-----|-------|
${metricRows}

## Budget

Status: **${report.budget.passed ? 'PASS' : 'FAIL'}**

| Status | Category | Check | Actual | Limit | Meaning |
|--------|----------|-------|--------|-------|---------|
${budgetRows}

## LCP element

\`\`\`json
${JSON.stringify(report.diagnostics?.lcpElement || null, null, 2)}
\`\`\`

## Top resources by transfer

| Type | Size | Duration | Status | URL |
|------|------|----------|--------|-----|
${topResources}

## Third-party origins

| Origin | Requests | Transfer |
|--------|----------|----------|
${thirdParty}

## SEO snapshot

\`\`\`json
${JSON.stringify(report.diagnostics?.seo || null, null, 2)}
\`\`\`

## Security headers

\`\`\`json
${JSON.stringify(report.diagnostics?.security || null, null, 2)}
\`\`\`

## CrUX field data

\`\`\`json
${JSON.stringify(report.crux || { status: 'not requested' }, null, 2)}
\`\`\`
`;
}

function renderHtml(report) {
  const plain = report.plainLanguage;
  const listItems = (items) => (items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('\n');
  const metricCards = [
    ['LCP', 'lcp', 'ms'],
    ['CLS', 'cls', ''],
    ['FCP', 'fcp', 'ms'],
    ['TTFB', 'ttfb', 'ms'],
    ['TBT*', 'tbtProxy', 'ms'],
    ['Transfer', 'totalTransferKB', 'KB'],
    ['Requests', 'resourceCount', ''],
    ['Third-party', 'thirdPartyKB', 'KB'],
  ]
    .map(([label, key, unit]) => {
      const stat = report.aggregate.metrics[key];
      const g = key in WEB_VITAL_THRESHOLDS ? grade(stat.p75, key) : 'info';
      return `<section class="card ${g}">
        <div class="label">${escapeHtml(label)}</div>
        <div class="value">${escapeHtml(formatMetric(stat.p75, unit))}</div>
        <div class="muted">p50 ${escapeHtml(formatMetric(stat.p50, unit))} / p95 ${escapeHtml(
          formatMetric(stat.p95, unit),
        )}</div>
      </section>`;
    })
    .join('\n');
  const budgetRows = report.budget.checks
    .map(
      (c) => `<tr class="${c.pass ? 'pass' : c.severity === 'warning' ? 'warn' : 'fail'}">
        <td>${c.pass ? 'PASS' : c.severity === 'warning' ? 'WARN' : 'FAIL'}</td>
        <td>${escapeHtml(c.category)}</td>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(formatValue(c.actual))}</td>
        <td>${escapeHtml(formatValue(c.limit))}</td>
        <td>${escapeHtml(c.help)}</td>
      </tr>`,
    )
    .join('\n');
  const topResourceRows = (report.diagnostics?.topResources || [])
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.type)}</td>
        <td>${escapeHtml(`${r.kb} KB`)}</td>
        <td>${escapeHtml(`${r.duration} ms`)}</td>
        <td>${escapeHtml(String(r.status || ''))}</td>
        <td class="url">${escapeHtml(r.url)}</td>
      </tr>`,
    )
    .join('\n');
  const thirdPartyRows = (report.diagnostics?.thirdPartyOrigins || [])
    .map(
      (o) => `<tr>
        <td class="url">${escapeHtml(o.origin || '(unknown)')}</td>
        <td>${o.count}</td>
        <td>${round(o.kb, 1)} KB</td>
      </tr>`,
    )
    .join('\n');
  const plainSection = plain
    ? `<section class="plain">
      <h2>Po ludzku</h2>
      <p class="lead">${escapeHtml(plain.headline)}</p>
      <div class="plain-grid">
        <div>
          <h3>Wynik w prostych slowach</h3>
          <ul>${listItems(plain.verdict)}</ul>
        </div>
        <div>
          <h3>Co poprawic najpierw</h3>
          <ul>${listItems(plain.nextActions)}</ul>
        </div>
      </div>
      <div class="plain-grid">
        <div>
          <h3>Co jest dobre</h3>
          <ul>${listItems(plain.good)}</ul>
        </div>
        <div>
          <h3>Co boli</h3>
          <ul>${listItems(plain.problems)}</ul>
        </div>
      </div>
      <h3>Mini-slownik</h3>
      <ul>${listItems(plain.dictionary)}</ul>
    </section>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Performance audit - ${escapeHtml(report.meta.url)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f9;
      --panel: #ffffff;
      --text: #17202a;
      --muted: #657080;
      --line: #d8dee8;
      --good: #0f7b4f;
      --warn: #9a6700;
      --bad: #b42318;
      --info: #315f8c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.45;
    }
    header, main { max-width: 1180px; margin: 0 auto; padding: 24px; }
    header { padding-top: 32px; }
    h1 { margin: 0 0 8px; font-size: 28px; letter-spacing: 0; }
    h2 { margin: 32px 0 12px; font-size: 20px; letter-spacing: 0; }
    .muted { color: var(--muted); font-size: 13px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-top: 18px;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-left-width: 5px;
      border-radius: 8px;
      padding: 14px;
    }
    .card.good { border-left-color: var(--good); }
    .card.needs-work { border-left-color: var(--warn); }
    .card.poor { border-left-color: var(--bad); }
    .card.info { border-left-color: var(--info); }
    .label { color: var(--muted); font-size: 12px; text-transform: uppercase; }
    .value { font-size: 26px; font-weight: 700; margin: 4px 0; }
    .plain {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 18px;
      margin: 8px 0 26px;
    }
    .plain h2 { margin-top: 0; }
    .plain h3 { margin: 14px 0 6px; font-size: 15px; }
    .plain .lead { font-size: 18px; font-weight: 700; margin: 0 0 12px; }
    .plain-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 14px;
    }
    .plain ul { margin: 0 0 8px; padding-left: 20px; }
    .plain li { margin: 5px 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }
    th, td {
      text-align: left;
      border-bottom: 1px solid var(--line);
      padding: 9px 10px;
      vertical-align: top;
      font-size: 13px;
    }
    th { background: #eef2f7; }
    tr:last-child td { border-bottom: 0; }
    tr.pass td:first-child { color: var(--good); font-weight: 700; }
    tr.warn td:first-child { color: var(--warn); font-weight: 700; }
    tr.fail td:first-child { color: var(--bad); font-weight: 700; }
    .url {
      font-family: Consolas, "Courier New", monospace;
      overflow-wrap: anywhere;
      font-size: 12px;
    }
    pre {
      background: #111827;
      color: #f8fafc;
      padding: 14px;
      border-radius: 8px;
      overflow: auto;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <header>
    <h1>Performance audit</h1>
    <div class="muted">${escapeHtml(report.meta.url)}</div>
    <div class="muted">Profile: ${escapeHtml(report.meta.profile)} (${escapeHtml(
      report.meta.profileLabel,
    )}) / Runs OK: ${report.meta.runsOk}/${report.meta.runsRequested} / ${escapeHtml(report.meta.auditedAt)}</div>
    <div class="grid">${metricCards}</div>
  </header>
  <main>
    ${plainSection}

    <h2>Budget: ${report.budget.passed ? 'PASS' : 'FAIL'}</h2>
    <table>
      <thead><tr><th>Status</th><th>Category</th><th>Check</th><th>Actual</th><th>Limit</th><th>Meaning</th></tr></thead>
      <tbody>${budgetRows}</tbody>
    </table>

    <h2>LCP element</h2>
    <pre>${escapeHtml(JSON.stringify(report.diagnostics?.lcpElement || null, null, 2))}</pre>

    <h2>Top resources by transfer</h2>
    <table>
      <thead><tr><th>Type</th><th>Size</th><th>Duration</th><th>Status</th><th>URL</th></tr></thead>
      <tbody>${topResourceRows}</tbody>
    </table>

    <h2>Third-party origins</h2>
    <table>
      <thead><tr><th>Origin</th><th>Requests</th><th>Transfer</th></tr></thead>
      <tbody>${thirdPartyRows}</tbody>
    </table>

    <h2>SEO snapshot</h2>
    <pre>${escapeHtml(JSON.stringify(report.diagnostics?.seo || null, null, 2))}</pre>

    <h2>Security headers</h2>
    <pre>${escapeHtml(JSON.stringify(report.diagnostics?.security || null, null, 2))}</pre>

    <h2>CrUX field data</h2>
    <pre>${escapeHtml(JSON.stringify(report.crux || { status: 'not requested' }, null, 2))}</pre>
  </main>
</body>
</html>`;
}

function analyzeSecurity(url, headers) {
  const csp = Boolean(headers['content-security-policy']);
  const xFrame = Boolean(headers['x-frame-options']);
  return {
    https: new URL(url).protocol === 'https:',
    hsts: Boolean(headers['strict-transport-security']),
    csp,
    xContentTypeOptions: String(headers['x-content-type-options'] || '').toLowerCase() === 'nosniff',
    referrerPolicy: Boolean(headers['referrer-policy']),
    permissionsPolicy: Boolean(headers['permissions-policy']),
    clickjackingProtection: xFrame || /frame-ancestors/i.test(headers['content-security-policy'] || ''),
    compression: headers['content-encoding'] || '',
    cacheControl: headers['cache-control'] || '',
  };
}

function stripHeavySampleData(result) {
  return {
    meta: result.meta,
    aggregate: result.aggregate,
    budget: {
      passed: result.budget.passed,
      failedCount: result.budget.failedCount,
      warningCount: result.budget.warningCount,
    },
    plainLanguage: result.plainLanguage,
    paths: result.paths,
  };
}

function grade(value, metric) {
  if (value === null || value === undefined || !WEB_VITAL_THRESHOLDS[metric]) return 'info';
  const [good, poor] = WEB_VITAL_THRESHOLDS[metric];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-work';
  return 'poor';
}

function lowerCaseKeys(obj) {
  return Object.fromEntries(Object.entries(obj || {}).map(([key, value]) => [String(key).toLowerCase(), value]));
}

function safeOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

function isLocalUrl(url) {
  try {
    const host = new URL(url).hostname;
    return ['localhost', '127.0.0.1', '::1'].includes(host);
  } catch {
    return false;
  }
}

function slugFromUrl(url) {
  const parsed = new URL(url);
  const pathname = parsed.pathname.replace(/^\/|\/$/g, '').replace(/[^\w.-]+/g, '-');
  return `${parsed.hostname}${pathname ? `-${pathname}` : ''}`.replace(/[^\w.-]+/g, '-').slice(0, 120);
}

function dedupeByKey(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatMetric(value, unit) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'n/a';
  if (unit === 'ms') return `${Math.round(value)} ms`;
  if (unit === 'KB') return `${round(value, 1)} KB`;
  if (unit === '') return Number(value).toFixed(value < 1 ? 3 : 0);
  return `${round(value, 1)} ${unit}`;
}

function formatValue(value) {
  if (value === null || value === undefined) return 'n/a';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(round(value, 3));
  return String(value);
}

function fmtMs(value) {
  return `${Math.round(value || 0)}ms`;
}

function fmtNum(value, digits = 1) {
  return Number(value || 0).toFixed(digits);
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
