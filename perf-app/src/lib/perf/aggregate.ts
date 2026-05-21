/**
 * Statystyki z wielu sample'i.
 */
import type {
  Aggregate,
  Sample,
  Stats,
  Verdict,
} from './types.js';
import { gradeMetric } from './types.js';

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))]!;
}

export function computeStats(values: number[]): Stats {
  if (values.length === 0) {
    return { p50: 0, p75: 0, p95: 0, stdev: 0, min: 0, max: 0, count: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  const variance =
    sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / sorted.length;
  return {
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p95: percentile(sorted, 95),
    stdev: Math.sqrt(variance),
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    count: sorted.length,
  };
}

export function aggregateSamples(samples: Sample[]): Aggregate {
  const lcp = computeStats(samples.map((s) => s.lcp));
  const cls = computeStats(samples.map((s) => s.cls));
  const fcp = computeStats(samples.map((s) => s.fcp));
  const ttfb = computeStats(samples.map((s) => s.ttfb));
  const tbtProxy = computeStats(samples.map((s) => s.tbtProxy));
  const transferSize = computeStats(samples.map((s) => s.transferSize));

  const verdicts: Record<string, Verdict> = {
    lcp: gradeMetric(lcp.p75, 'lcp'),
    cls: gradeMetric(cls.p75, 'cls'),
    fcp: gradeMetric(fcp.p75, 'fcp'),
    ttfb: gradeMetric(ttfb.p75, 'ttfb'),
    tbtProxy: gradeMetric(tbtProxy.p75, 'tbtProxy'),
  };

  return {
    samples,
    lcp,
    cls,
    fcp,
    ttfb,
    tbtProxy,
    transferSize,
    verdicts,
  };
}

/**
 * Wybiera sample najbardziej reprezentatywny -
 * ten którego LCP jest najbliżej mediany.
 */
export function pickRepresentative(samples: Sample[], aggregate: Aggregate): Sample {
  if (samples.length === 0) throw new Error('Empty samples');
  if (samples.length === 1) return samples[0]!;
  const targetLcp = aggregate.lcp.p50;
  let best = samples[0]!;
  let bestDist = Math.abs(best.lcp - targetLcp);
  for (const s of samples.slice(1)) {
    const d = Math.abs(s.lcp - targetLcp);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}
