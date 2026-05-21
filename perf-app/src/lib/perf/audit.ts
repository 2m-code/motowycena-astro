/**
 * Orchestrator pełnego audytu: N runów -> aggregate -> diagnostics -> save.
 *
 * Główny entry point - wywoływany przez:
 *   - API endpoint /api/audit (POST)
 *   - CLI (bin/audit.mjs)
 */
import { randomUUID } from 'node:crypto';
import { runSingleMeasurement } from './measure.js';
import { aggregateSamples, pickRepresentative } from './aggregate.js';
import {
  analyzeSecurityHeaders,
  buildDiagnostics,
  buildPlainLanguageSummary,
} from './analyze.js';
import { saveReport } from './storage.js';
import { getProfile } from './profiles.js';
import { pushProgress, finishJob, failJob, setJobStatus } from './jobs.js';
import type { Report, Sample, SeoCheck } from './types.js';

export interface RunAuditOptions {
  url: string;
  profileId: string;
  runs: number;
  /** Optional - jeśli podany, emituje progress przez jobs.ts */
  jobId?: string;
}

export async function runAudit(opts: RunAuditOptions): Promise<Report> {
  const { url, profileId, runs, jobId } = opts;
  const startedAt = Date.now();
  const profile = getProfile(profileId);

  const emit = (msg: Omit<Parameters<typeof pushProgress>[1], 'timestamp'>) => {
    if (jobId) pushProgress(jobId, msg);
  };

  try {
    if (jobId) setJobStatus(jobId, 'running');
    emit({ type: 'started', message: `Audyt ${url} (${runs} runów, profil: ${profile.label})` });

    const samples: Sample[] = [];
    let lastSeoMeta: any = null;

    for (let i = 1; i <= runs; i++) {
      emit({
        type: 'run-start',
        runIndex: i,
        totalRuns: runs,
        message: `Run ${i}/${runs}...`,
      });

      try {
        const sample = await runSingleMeasurement(url, profile);
        samples.push(sample);

        // ostatni sample przechowuje SEO meta (collected from page evaluate)
        // tymczasowo trzymamy w sample - w przyszłości extract do osobnego pola
        emit({
          type: 'run-sample',
          runIndex: i,
          totalRuns: runs,
          sample: {
            lcp: sample.lcp,
            cls: sample.cls,
            fcp: sample.fcp,
            ttfb: sample.ttfb,
            tbtProxy: sample.tbtProxy,
            transferSize: sample.transferSize,
            runDurationMs: sample.runDurationMs,
          },
          message: `Run ${i}: LCP=${Math.round(sample.lcp)}ms CLS=${sample.cls.toFixed(3)} TBT*=${Math.round(sample.tbtProxy)}ms`,
        });
      } catch (err: any) {
        emit({
          type: 'log',
          message: `Run ${i} fail: ${err?.message ?? err}`,
        });
      }
    }

    if (samples.length === 0) {
      throw new Error('Wszystkie runy nieudane - brak danych do agregacji');
    }

    emit({ type: 'aggregating', message: 'Agreguję statystyki...' });
    const aggregate = aggregateSamples(samples);
    const representative = pickRepresentative(samples, aggregate);
    const security = analyzeSecurityHeaders(representative.responseHeaders);

    // SEO check robimy z meta - ale obecnie meta jest w collected.meta z observers.ts
    // a Sample tego nie zawiera. Tymczasowo: pusty stub (poprawka przy rozbudowie).
    // TODO: dorzucić `meta` do Sample
    const seo: SeoCheck = {
      title: null,
      titleLength: 0,
      description: null,
      descriptionLength: 0,
      h1Count: 0,
      canonical: null,
      hasJsonLd: false,
      jsonLdTypes: [],
      hasOpenGraph: false,
      hasViewportMeta: false,
      lang: null,
    };

    const diagnostics = buildDiagnostics(aggregate, representative, security, seo);
    const plain = buildPlainLanguageSummary(aggregate, diagnostics);

    const reportId = randomUUID();
    const report: Report = {
      id: reportId,
      url,
      host: new URL(url).hostname,
      profile,
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      runs: samples.length,
      aggregate,
      representative,
      security,
      seo,
      diagnostics,
      plainLanguage: plain,
    };

    await saveReport(report);

    if (jobId) {
      emit({
        type: 'done',
        message: `Gotowe (${samples.length}/${runs} runów udanych)`,
        report,
      });
      finishJob(jobId, reportId);
    }

    return report;
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    if (jobId) {
      emit({ type: 'failed', message: msg, error: msg });
      failJob(jobId, msg);
    }
    throw err;
  }
}
