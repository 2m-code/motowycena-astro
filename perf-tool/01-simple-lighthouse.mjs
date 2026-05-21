/**
 * POZIOM 1 – Lighthouse jako biblioteka.
 *
 * Używamy oficjalnego `lighthouse` z npm. To jest ten sam silnik lab audit,
 * którego używa PageSpeed Insights, ale bez field data z CrUX.
 * Dostajesz raport JSON + HTML + ładny output w terminalu.
 *
 * Uruchom:
 *   node 01-simple-lighthouse.mjs https://www.motowycena.pl
 */
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { writeFileSync } from 'node:fs';

const URL_TO_TEST = process.argv[2] || 'http://localhost:4321/';
const FORM_FACTOR = process.argv[3] || 'mobile'; // 'mobile' | 'desktop'

console.log(`\n🔬 Audyt: ${URL_TO_TEST} (${FORM_FACTOR})\n`);

// 1. Uruchamiamy headless Chrome z odpowiednimi flagami
const chrome = await launch({
  chromeFlags: [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ],
});

// 2. Konfigurujemy Lighthouse
const config = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: FORM_FACTOR,
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    screenEmulation: FORM_FACTOR === 'mobile'
      ? { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false }
      : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    throttling: FORM_FACTOR === 'mobile'
      ? { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4 }  // Slow 4G
      : { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 },    // Cable
  },
};

// 3. Odpalamy audyt
const runnerResult = await lighthouse(URL_TO_TEST, { port: chrome.port }, config);

// 4. Wyciągamy interesujące dane
const lhr = runnerResult.lhr; // Lighthouse Report (full JSON)
const categories = lhr.categories;
const audits = lhr.audits;

const scores = {
  Performance: Math.round(categories.performance.score * 100),
  Accessibility: Math.round(categories.accessibility.score * 100),
  'Best Practices': Math.round(categories['best-practices'].score * 100),
  SEO: Math.round(categories.seo.score * 100),
};

const labMetrics = {
  'LCP (Largest Contentful Paint)': audits['largest-contentful-paint'].displayValue,
  'CLS (Cumulative Layout Shift)': audits['cumulative-layout-shift'].displayValue,
  'TBT (lab proxy for INP)': audits['total-blocking-time'].displayValue,
  'FCP (First Contentful Paint)': audits['first-contentful-paint'].displayValue,
  'Speed Index': audits['speed-index'].displayValue,
  'TTI (Time to Interactive)': audits.interactive?.displayValue || 'not reported by this Lighthouse version',
};

// 5. Pretty print
const colorize = (score) => {
  if (score >= 90) return `\x1b[32m${score}\x1b[0m`;  // zielony
  if (score >= 50) return `\x1b[33m${score}\x1b[0m`;  // żółty
  return `\x1b[31m${score}\x1b[0m`;                    // czerwony
};

console.log('═══ WYNIKI (0-100) ═══');
for (const [name, score] of Object.entries(scores)) {
  console.log(`  ${name.padEnd(18)} ${colorize(score)}`);
}

console.log('\n═══ LAB METRICS ═══');
for (const [name, val] of Object.entries(labMetrics)) {
  console.log(`  ${name.padEnd(40)} ${val}`);
}

console.log('\n═══ TOP 5 PROBLEMÓW ═══');
const failedAudits = Object.values(audits)
  .filter(a => a.score !== null && a.score < 0.9 && a.details)
  .sort((a, b) => (a.score - b.score))
  .slice(0, 5);

for (const audit of failedAudits) {
  console.log(`  [${(audit.score * 100).toFixed(0)}/100] ${audit.title}`);
  if (audit.displayValue) console.log(`         ${audit.displayValue}`);
}

// 6. Zapisujemy pełne raporty
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
writeFileSync(`report-${timestamp}.json`, JSON.stringify(lhr, null, 2));
writeFileSync(`report-${timestamp}.html`, runnerResult.report);
console.log(`\n📄 Pełny raport: report-${timestamp}.html (otwórz w przeglądarce)\n`);

await chrome.kill();
