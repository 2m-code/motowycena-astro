/**
 * POZIOM 2 – Puppeteer + custom metrics z PerformanceObserver.
 *
 * Tutaj NIE używamy Lighthouse jako black-boxa. Sami:
 *   1. Odpalamy headless Chromium przez Puppeteer
 *   2. Instalujemy PerformanceObserver w stronie (zbiera metryki)
 *   3. Po zaladowaniu wyciągamy zebrane dane
 *   4. Liczymy własne metryki
 *
 * Ważne: to nie jest 1:1 reimplementacja Lighthouse. To własny lab audit
 * oparty o te same publiczne browser APIs. Lighthouse ma dodatkowy trace
 * pipeline, scoring i heurystyki.
 *
 * Uruchom:
 *   node 02-puppeteer-custom.mjs https://www.motowycena.pl
 */
import puppeteer from 'puppeteer';

const URL_TO_TEST = process.argv[2] || 'http://localhost:4321/';
const NETWORK_PRESET = process.argv[3] || 'fast4g'; // fast4g | slow4g | 3g | none

const NETWORK_PROFILES = {
  // download/upload w bajtach/s, latency w ms
  fast4g:  { offline: false, downloadThroughput: 9 * 1024 * 1024 / 8, uploadThroughput: 1.5 * 1024 * 1024 / 8, latency: 170 },
  slow4g:  { offline: false, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, latency: 400 },
  '3g':    { offline: false, downloadThroughput: 750 * 1024 / 8, uploadThroughput: 250 * 1024 / 8, latency: 600 },
  none:    null,
};

console.log(`\n🔬 Puppeteer custom audit: ${URL_TO_TEST} (network: ${NETWORK_PRESET})\n`);

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
const client = await page.createCDPSession();

// 1. CPU throttling (jak na słabym mobilu)
await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

// 2. Network throttling
const networkProfile = NETWORK_PROFILES[NETWORK_PRESET];
if (networkProfile) {
  await client.send('Network.emulateNetworkConditions', networkProfile);
}

// 3. Czyścimy cache (każdy run od zera)
await client.send('Network.clearBrowserCache');
await client.send('Network.clearBrowserCookies');

// 4. Wstrzykujemy PerformanceObserver PRZED nawigacją (przez init script)
// To kluczowe - musi być zarejestrowany zanim strona zacznie się ładować.
await page.evaluateOnNewDocument(() => {
  window.__perfData = {
    lcp: 0,           // Largest Contentful Paint
    cls: 0,           // Cumulative Layout Shift
    fcp: 0,           // First Contentful Paint
    clsSessionValue: 0,
    clsSessionStart: 0,
    clsLastShiftTime: 0,
    longTasks: [],    // Long tasks > 50ms
    resources: [],    // Network resources
  };

  // LCP – PerformanceObserver z type 'largest-contentful-paint'
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const last = entries[entries.length - 1];
    window.__perfData.lcp = last.renderTime || last.loadTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  // CLS – official windowing model:
  // największa "session window" layout shiftów, nie prosta suma całej strony.
  // Nowa sesja zaczyna się, gdy przerwa >1s albo obecna sesja trwa >5s.
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // Pomijamy shifty po user interaction (mają hadRecentInput=true)
      if (entry.hadRecentInput) continue;

      const isNewSession =
        window.__perfData.clsLastShiftTime === 0 ||
        entry.startTime - window.__perfData.clsLastShiftTime > 1000 ||
        entry.startTime - window.__perfData.clsSessionStart > 5000;

      if (isNewSession) {
        window.__perfData.clsSessionValue = entry.value;
        window.__perfData.clsSessionStart = entry.startTime;
      } else {
        window.__perfData.clsSessionValue += entry.value;
      }

      window.__perfData.clsLastShiftTime = entry.startTime;
      window.__perfData.cls = Math.max(window.__perfData.cls, window.__perfData.clsSessionValue);
    }
  }).observe({ type: 'layout-shift', buffered: true });

  // FCP
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        window.__perfData.fcp = entry.startTime;
      }
    }
  }).observe({ type: 'paint', buffered: true });

  // Long tasks (>50ms blocking main thread)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__perfData.longTasks.push({
        startTime: entry.startTime,
        duration: entry.duration,
      });
    }
  }).observe({ type: 'longtask', buffered: true });
});

// 5. Mierzymy czas TOTAL od nawigacji
const startTime = Date.now();

// 6. Nawigujemy i czekamy aż wszystko się załaduje
const response = await page.goto(URL_TO_TEST, {
  waitUntil: 'networkidle2',  // czekaj aż mniej niż 2 connections przez 500ms
  timeout: 60000,
});

const navigationTime = Date.now() - startTime;
const httpStatus = response.status();
const responseHeaders = response.headers();

// 7. Dajemy stronie chwilę żeby PerformanceObserver dokończył łapanie LCP
await new Promise(r => setTimeout(r, 1500));

// 8. Wyciągamy zebrane dane
const perfData = await page.evaluate(() => {
  // Navigation Timing API – TTFB itp.
  const nav = performance.getEntriesByType('navigation')[0];

  // Resource Timing API – wszystkie pobrane pliki
  const resources = performance.getEntriesByType('resource').map(r => ({
    name: r.name,
    type: r.initiatorType,
    size: r.transferSize,
    duration: r.duration,
    cached: r.transferSize === 0 && r.decodedBodySize > 0,
  }));

  return {
    ...window.__perfData,
    ttfb: nav.responseStart - nav.requestStart,
    domContentLoaded: nav.domContentLoadedEventEnd - nav.fetchStart,
    loadComplete: nav.loadEventEnd - nav.fetchStart,
    transferSize: nav.transferSize,
    encodedBodySize: nav.encodedBodySize,
    decodedBodySize: nav.decodedBodySize,
    resources,
  };
});

// 9. TBT-like lab proxy - liczymy z long tasks po FCP.
// Lighthouse TBT jest liczone między FCP a TTI. My nie wyznaczamy pełnego TTI,
// więc ten wynik traktuj jako "blocking time proxy", nie oficjalny Lighthouse TBT.
const blockingTimeProxy = perfData.longTasks.reduce((sum, task) => {
  if (task.startTime < perfData.fcp) return sum;
  return sum + Math.max(0, task.duration - 50);
}, 0);

// 10. Klasyfikacja wg progów Google Core Web Vitals
const grade = (metric, value, thresholds) => {
  if (value <= thresholds[0]) return '\x1b[32m✓ GOOD\x1b[0m';
  if (value <= thresholds[1]) return '\x1b[33m⚠ NEEDS WORK\x1b[0m';
  return '\x1b[31m✗ POOR\x1b[0m';
};

console.log('═══ HTTP ═══');
console.log(`  Status: ${httpStatus}`);
console.log(`  Server: ${responseHeaders['server'] || '?'}`);
console.log(`  Cache:  ${responseHeaders['cache-control'] || '?'}`);
console.log(`  Encoding: ${responseHeaders['content-encoding'] || 'none'}`);

console.log('\n═══ CORE WEB VITALS + LAB PROXY ═══');
console.log(`  LCP:  ${perfData.lcp.toFixed(0)} ms      ${grade('lcp', perfData.lcp, [2500, 4000])}`);
console.log(`  CLS:  ${perfData.cls.toFixed(3)}          ${grade('cls', perfData.cls, [0.1, 0.25])}`);
console.log(`  TBT*: ${blockingTimeProxy.toFixed(0)} ms      ${grade('tbt', blockingTimeProxy, [200, 600])}`);
console.log('  *TBT is a lab proxy for responsiveness. Real CWV responsiveness is INP from field/user interaction data.');

console.log('\n═══ NAVIGATION TIMING ═══');
console.log(`  TTFB: ${perfData.ttfb.toFixed(0)} ms      ${grade('ttfb', perfData.ttfb, [800, 1800])}`);
console.log(`  FCP:  ${perfData.fcp.toFixed(0)} ms      ${grade('fcp', perfData.fcp, [1800, 3000])}`);
console.log(`  DCL:  ${perfData.domContentLoaded.toFixed(0)} ms`);
console.log(`  Load: ${perfData.loadComplete.toFixed(0)} ms`);
console.log(`  Total navigation: ${navigationTime} ms`);

console.log('\n═══ TRANSFER ═══');
console.log(`  Total transfer:  ${(perfData.transferSize / 1024).toFixed(1)} KB`);
console.log(`  Decoded size:    ${(perfData.decodedBodySize / 1024).toFixed(1)} KB`);
console.log(`  Resources count: ${perfData.resources.length}`);

// Top 5 najcięższych zasobów
console.log('\n═══ TOP 5 NAJCIĘŻSZYCH ZASOBÓW ═══');
const sortedResources = [...perfData.resources]
  .filter(r => r.size > 0)
  .sort((a, b) => b.size - a.size)
  .slice(0, 5);
for (const r of sortedResources) {
  const sizeKb = (r.size / 1024).toFixed(1);
  const name = r.name.length > 60 ? '...' + r.name.slice(-57) : r.name;
  console.log(`  [${r.type.padEnd(8)}] ${sizeKb.padStart(7)} KB  ${name}`);
}

console.log('\n═══ LONG TASKS (>50ms blokujących main thread) ═══');
if (perfData.longTasks.length === 0) {
  console.log('  Brak - main thread czysty 🎉');
} else {
  for (const task of perfData.longTasks) {
    console.log(`  ${task.startTime.toFixed(0).padStart(6)}ms +${task.duration.toFixed(0)}ms`);
  }
}

await browser.close();
console.log('\n');
