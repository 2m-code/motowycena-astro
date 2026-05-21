#!/usr/bin/env node
/**
 * CLI używające dokładnie tych samych modułów co Astro UI.
 *
 * Przykład:
 *   node bin/audit.mjs --url https://www.motowycena.pl --runs 5
 *   node bin/audit.mjs --url http://localhost:4321 --profile desktop-cable --runs 3
 *   node bin/audit.mjs --list-profiles
 */
import { runAudit } from '../src/lib/perf/audit.js';
import { listProfiles, getProfile } from '../src/lib/perf/profiles.js';
import { closeBrowser } from '../src/lib/perf/measure.js';

function parseArgs(argv) {
  const opts = { url: null, profileId: 'mobile-slow4g', runs: 3, listProfiles: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--url') opts.url = argv[++i];
    else if (arg === '--profile') opts.profileId = argv[++i];
    else if (arg === '--runs') opts.runs = parseInt(argv[++i], 10);
    else if (arg === '--list-profiles') opts.listProfiles = true;
    else if (arg === '--help' || arg === '-h') {
      console.log('audit --url <url> [--profile <id>] [--runs <n>]');
      console.log('audit --list-profiles');
      process.exit(0);
    }
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));

if (opts.listProfiles) {
  console.log('Dostępne profile:');
  for (const p of listProfiles()) {
    console.log(`  ${p.id.padEnd(20)} ${p.label}`);
  }
  process.exit(0);
}

if (!opts.url) {
  console.error('--url wymagane. Użyj --help.');
  process.exit(1);
}

const profile = getProfile(opts.profileId);

console.log(`\n🔬 Audyt: ${opts.url}`);
console.log(`   Profil: ${profile.label}`);
console.log(`   Runy: ${opts.runs}\n`);

try {
  const report = await runAudit({
    url: opts.url,
    profileId: opts.profileId,
    runs: opts.runs,
  });

  console.log('\n═══ WYNIKI (p75) ═══');
  for (const [key, stat] of Object.entries({
    LCP: report.aggregate.lcp,
    CLS: report.aggregate.cls,
    FCP: report.aggregate.fcp,
    TTFB: report.aggregate.ttfb,
    'TBT*': report.aggregate.tbtProxy,
  })) {
    const verdict = report.aggregate.verdicts[key.toLowerCase().replace('*', 'Proxy').replace('tbt', 'tbtProxy')] || 'good';
    const color = verdict === 'good' ? '\x1b[32m' : verdict === 'needs-work' ? '\x1b[33m' : '\x1b[31m';
    const value = key === 'CLS' ? stat.p75.toFixed(3) : `${Math.round(stat.p75)}ms`;
    console.log(`  ${key.padEnd(6)} ${value.padStart(8)}  ${color}${verdict.toUpperCase()}\x1b[0m`);
  }

  console.log(`\n💬 ${report.plainLanguage}\n`);
  console.log(`📁 Zapisano: data/reports/${report.host}/${report.id}.json`);
  if (report.diagnostics.length > 0) {
    console.log(`\nDiagnostyka: ${report.diagnostics.length} problemów - zobacz raport.`);
  }
} catch (err) {
  console.error('FAIL:', err?.message ?? err);
  process.exitCode = 1;
} finally {
  await closeBrowser();
}
