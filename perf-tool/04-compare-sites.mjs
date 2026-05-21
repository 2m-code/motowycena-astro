/**
 * BONUS – porównanie dwóch URL-i obok siebie.
 *
 * Idealne do: stara strona vs nowa strona, A/B testing, monitoring po deploy.
 *
 * Uruchom:
 *   node 04-compare-sites.mjs https://www.motowycena.pl http://localhost:4321/
 */
import puppeteer from 'puppeteer';

const URL_A = process.argv[2] || 'https://www.motowycena.pl/';
const URL_B = process.argv[3] || 'http://localhost:4321/';
const RUNS = parseInt(process.argv[4] || '3', 10);

console.log('\n🔬 Porównanie performance');
console.log(`A: ${URL_A}`);
console.log(`B: ${URL_B}`);
console.log(`Runs per URL: ${RUNS}\n`);

async function measure(url) {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const samples = [];

  for (let i = 0; i < RUNS; i++) {
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
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise(r => setTimeout(r, 1500));
      const data = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        return {
          ...window.__d,
          ttfb: nav.responseStart - nav.requestStart,
          transferSize: nav.transferSize,
        };
      });
      const tbt = data.longTasks.reduce((s, task) => {
        if (task.startTime < data.fcp) return s;
        return s + Math.max(0, task.duration - 50);
      }, 0);
      samples.push({ lcp: data.lcp, cls: data.cls, fcp: data.fcp, ttfb: data.ttfb, tbt, kb: data.transferSize / 1024 });
    } catch {
      // ignore failed runs
    }
    await page.close();
  }

  await browser.close();

  const median = (arr, key) => {
    const vs = arr.map(s => s[key]).sort((a, b) => a - b);
    return vs[Math.floor(vs.length / 2)];
  };

  return {
    lcp: median(samples, 'lcp'),
    cls: median(samples, 'cls'),
    fcp: median(samples, 'fcp'),
    ttfb: median(samples, 'ttfb'),
    tbt: median(samples, 'tbt'),
    kb: median(samples, 'kb'),
  };
}

console.log('Mierzę A...');
const a = await measure(URL_A);
console.log(`  LCP=${a.lcp.toFixed(0)}ms CLS=${a.cls.toFixed(3)} TBT*=${a.tbt.toFixed(0)}ms TTFB=${a.ttfb.toFixed(0)}ms\n`);

console.log('Mierzę B...');
const b = await measure(URL_B);
console.log(`  LCP=${b.lcp.toFixed(0)}ms CLS=${b.cls.toFixed(3)} TBT*=${b.tbt.toFixed(0)}ms TTFB=${b.ttfb.toFixed(0)}ms\n`);

// Tabela porównawcza
const diff = (a, b) => {
  const d = b - a;
  const pct = (d / a) * 100;
  const sign = d < 0 ? '\x1b[32m▼' : '\x1b[31m▲';
  return `${sign} ${Math.abs(pct).toFixed(1)}%\x1b[0m`;
};

console.log('═══ PORÓWNANIE (median z runów) ═══');
console.log('Metryka  |       A |       B | Zmiana');
console.log('---------|---------|---------|-------');
console.log(`LCP      | ${a.lcp.toFixed(0).padStart(7)} | ${b.lcp.toFixed(0).padStart(7)} | ${diff(a.lcp, b.lcp)}`);
console.log(`CLS      | ${a.cls.toFixed(3).padStart(7)} | ${b.cls.toFixed(3).padStart(7)} | ${diff(a.cls || 0.001, b.cls || 0.001)}`);
console.log(`FCP      | ${a.fcp.toFixed(0).padStart(7)} | ${b.fcp.toFixed(0).padStart(7)} | ${diff(a.fcp, b.fcp)}`);
console.log(`TTFB     | ${a.ttfb.toFixed(0).padStart(7)} | ${b.ttfb.toFixed(0).padStart(7)} | ${diff(a.ttfb, b.ttfb)}`);
console.log(`TBT*     | ${a.tbt.toFixed(0).padStart(7)} | ${b.tbt.toFixed(0).padStart(7)} | ${diff(a.tbt || 1, b.tbt || 1)}`);
console.log(`Transfer | ${a.kb.toFixed(0).padStart(7)} | ${b.kb.toFixed(0).padStart(7)} | ${diff(a.kb, b.kb)} KB`);

console.log('\n▼ = B lepsze od A (mniejsze = lepsze)');
console.log('▲ = B gorsze od A');
console.log('TBT* = lab proxy dla responsywności. Oficjalny Core Web Vital to INP z danych użytkowników.\n');
