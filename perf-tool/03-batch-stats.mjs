/**
 * POZIOM 3 – wiele runów + percentyle.
 *
 * Pojedynczy run NIE wystarcza. Web Vitals są stochastyczne (zależne od cache,
 * stanu sieci, JIT compilera). WebPageTest robi 3-9 runów i raportuje p50/p75/p95.
 *
 * Robimy to samo:
 *   1. N runów per URL
 *   2. Liczymy median (p50), p75, p95
 *   3. Porównujemy z progami Google (dla lab proxy; finalnie CWV sprawdzaj
 *      także w CrUX / Search Console / własnym RUM)
 *
 * Uruchom:
 *   node 03-batch-stats.mjs https://www.motowycena.pl 9
 */
import puppeteer from 'puppeteer';

const URL_TO_TEST = process.argv[2] || 'http://localhost:4321/';
const RUNS = parseInt(process.argv[3] || '5', 10);

console.log(`\n🔬 Batch test: ${URL_TO_TEST}`);
console.log(`Runs: ${RUNS}  (każdy ze świeżym Chromem, bez cache)\n`);

const measurements = [];

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox'],
});

for (let i = 1; i <= RUNS; i++) {
  process.stdout.write(`Run ${i}/${RUNS}... `);

  const page = await browser.newPage();
  const client = await page.createCDPSession();

  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: 1.6 * 1024 * 1024 / 8,
    uploadThroughput: 750 * 1024 / 8,
    latency: 400,
  });
  await client.send('Network.clearBrowserCache');

  await page.evaluateOnNewDocument(() => {
    window.__d = {
      lcp: 0,
      cls: 0,
      fcp: 0,
      clsSessionValue: 0,
      clsSessionStart: 0,
      clsLastShiftTime: 0,
      longTasks: [],
    };
    new PerformanceObserver(l => {
      const last = l.getEntries().slice(-1)[0];
      window.__d.lcp = last.renderTime || last.loadTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue;

        const isNewSession =
          window.__d.clsLastShiftTime === 0 ||
          e.startTime - window.__d.clsLastShiftTime > 1000 ||
          e.startTime - window.__d.clsSessionStart > 5000;

        if (isNewSession) {
          window.__d.clsSessionValue = e.value;
          window.__d.clsSessionStart = e.startTime;
        } else {
          window.__d.clsSessionValue += e.value;
        }

        window.__d.clsLastShiftTime = e.startTime;
        window.__d.cls = Math.max(window.__d.cls, window.__d.clsSessionValue);
      }
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__d.fcp = e.startTime;
    }).observe({ type: 'paint', buffered: true });
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) {
        window.__d.longTasks.push({ startTime: e.startTime, duration: e.duration });
      }
    }).observe({ type: 'longtask', buffered: true });
  });

  try {
    await page.goto(URL_TO_TEST, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 1500));

    const data = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return {
        ...window.__d,
        ttfb: nav.responseStart - nav.requestStart,
        load: nav.loadEventEnd - nav.fetchStart,
        transferSize: nav.transferSize,
      };
    });

    const tbt = data.longTasks.reduce((s, task) => {
      if (task.startTime < data.fcp) return s;
      return s + Math.max(0, task.duration - 50);
    }, 0);
    measurements.push({
      lcp: data.lcp,
      cls: data.cls,
      fcp: data.fcp,
      ttfb: data.ttfb,
      load: data.load,
      tbt,
      transferKB: data.transferSize / 1024,
    });

    console.log(`LCP=${data.lcp.toFixed(0)}ms CLS=${data.cls.toFixed(3)} TBT*=${tbt.toFixed(0)}ms`);
  } catch (err) {
    console.log(`ERR ${err.message}`);
  }

  await page.close();
}

await browser.close();

// === STATYSTYKI ===
const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
};

const median = (vs) => percentile(vs, 50);
const stdev = (vs) => {
  const mean = vs.reduce((s, v) => s + v, 0) / vs.length;
  const variance = vs.reduce((s, v) => s + (v - mean) ** 2, 0) / vs.length;
  return Math.sqrt(variance);
};

const metrics = ['lcp', 'cls', 'fcp', 'ttfb', 'load', 'tbt', 'transferKB'];
const units = { lcp: 'ms', cls: '', fcp: 'ms', ttfb: 'ms', load: 'ms', tbt: 'ms', transferKB: 'KB' };
const thresholds = {
  lcp: [2500, 4000],
  cls: [0.1, 0.25],
  fcp: [1800, 3000],
  ttfb: [800, 1800],
  tbt: [200, 600],
};

const grade = (m, value) => {
  const t = thresholds[m];
  if (!t) return '';
  if (value <= t[0]) return '\x1b[32mGOOD\x1b[0m';
  if (value <= t[1]) return '\x1b[33mNEEDS WORK\x1b[0m';
  return '\x1b[31mPOOR\x1b[0m';
};

console.log('\n═══ STATYSTYKI (po wszystkich runach) ═══');
console.log('Metryka   |     p50 |     p75 |     p95 |   stdev |  ocena (przy p75)');
console.log('----------|---------|---------|---------|---------|----------');
for (const m of metrics) {
  const vals = measurements.map(r => r[m]).filter(v => typeof v === 'number');
  if (!vals.length) continue;
  const p50 = median(vals);
  const p75 = percentile(vals, 75);
  const p95 = percentile(vals, 95);
  const sd = stdev(vals);
  const fmt = m === 'cls' ? (v) => v.toFixed(3) : (v) => v.toFixed(0);
  console.log(
    `${m.padEnd(9)} | ${fmt(p50).padStart(7)} | ${fmt(p75).padStart(7)} | ${fmt(p95).padStart(7)} | ${fmt(sd).padStart(7)} | ${grade(m, p75)}`,
  );
}

console.log('\n💡 Google używa 75 percentyla w oficjalnej ocenie CWV z danych terenowych (CrUX/RUM).');
console.log('   Ten skrypt daje lab proxy: dobre do regresji i porównań, ale nie zastępuje danych prawdziwych użytkowników.');
console.log('   TBT* jest proxy responsywności w labie. Oficjalny Core Web Vital dla responsywności to INP.\n');
