/**
 * Shared types dla całego perf audyta.
 * Używane zarówno przez CLI (bin/audit.mjs) jak i Astro endpointy.
 */

export type Verdict = 'good' | 'needs-work' | 'poor';

export interface NetworkProfile {
  offline: boolean;
  /** bajty/s */
  downloadThroughput: number;
  /** bajty/s */
  uploadThroughput: number;
  /** ms */
  latency: number;
}

export interface Viewport {
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
}

export interface Profile {
  id: string;
  label: string;
  formFactor: 'PHONE' | 'DESKTOP';
  viewport: Viewport;
  userAgent: string;
  /** Multiplier CPU throttle (1 = brak, 4 = 4x wolniej) */
  cpuThrottle: number;
  network: NetworkProfile;
}

/**
 * Pojedynczy sample - dane z jednego runu Puppeteera.
 * Wszystkie czasy w ms, rozmiary w bajtach (kompresja zachowana).
 */
export interface Sample {
  url: string;
  finalUrl: string;
  httpStatus: number;
  /** Largest Contentful Paint */
  lcp: number;
  /** Cumulative Layout Shift (session window) */
  cls: number;
  /** First Contentful Paint */
  fcp: number;
  /** Time to First Byte (responseStart - requestStart) */
  ttfb: number;
  /** Total Blocking Time proxy (suma long tasks > 50ms po FCP) */
  tbtProxy: number;
  /** Liczba długich tasków (> 50ms) */
  longTasksCount: number;
  /** Suma długości wszystkich long tasks */
  longTasksTotalMs: number;
  /** DOMContentLoaded - od fetchStart */
  domContentLoaded: number;
  /** load event end - od fetchStart */
  loadComplete: number;
  transferSize: number;
  decodedBodySize: number;
  resourcesCount: number;
  resources: ResourceEntry[];
  lcpElement?: {
    selector: string;
    url: string | null;
  };
  /** Headers HTTP odpowiedzi dla głównego dokumentu */
  responseHeaders: Record<string, string>;
  /** Czas wykonania całego runu w ms */
  runDurationMs: number;
  timestamp: string;
}

export interface ResourceEntry {
  name: string;
  type: string;
  size: number;
  duration: number;
  cached: boolean;
}

export interface Stats {
  p50: number;
  p75: number;
  p95: number;
  stdev: number;
  min: number;
  max: number;
  count: number;
}

export interface Aggregate {
  samples: Sample[];
  /** Per-metric stats */
  lcp: Stats;
  cls: Stats;
  fcp: Stats;
  ttfb: Stats;
  tbtProxy: Stats;
  transferSize: Stats;
  /** Verdict używa p75 (zgodnie z CrUX) */
  verdicts: Record<string, Verdict>;
}

export interface SecurityCheck {
  hsts: boolean;
  csp: boolean;
  xContentTypeOptions: boolean;
  referrerPolicy: boolean;
  xFrameOptions: boolean;
}

export interface SeoCheck {
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  h1Count: number;
  canonical: string | null;
  hasJsonLd: boolean;
  jsonLdTypes: string[];
  hasOpenGraph: boolean;
  hasViewportMeta: boolean;
  lang: string | null;
}

export interface Report {
  id: string;
  url: string;
  host: string;
  profile: Profile;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  runs: number;
  aggregate: Aggregate;
  representative: Sample;
  security: SecurityCheck;
  seo: SeoCheck;
  diagnostics: Diagnostic[];
  plainLanguage: string;
}

export interface Diagnostic {
  severity: 'info' | 'warning' | 'critical';
  category: 'performance' | 'security' | 'seo' | 'a11y';
  title: string;
  description: string;
}

export type JobStatus = 'pending' | 'running' | 'done' | 'failed';

export interface JobProgress {
  type:
    | 'started'
    | 'run-start'
    | 'run-sample'
    | 'run-end'
    | 'aggregating'
    | 'done'
    | 'failed'
    | 'log';
  message?: string;
  runIndex?: number;
  totalRuns?: number;
  sample?: Partial<Sample>;
  report?: Report;
  error?: string;
  timestamp: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  url: string;
  profileId: string;
  runs: number;
  createdAt: string;
  finishedAt?: string;
  progress: JobProgress[];
  reportId?: string;
  error?: string;
}

/** Progi Core Web Vitals wg web.dev/vitals (2024). */
export const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  cls: { good: 0.1, poor: 0.25 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 800, poor: 1800 },
  tbtProxy: { good: 200, poor: 600 },
  // INP wymaga RUM - tutaj nie mierzymy oficjalnego
} as const;

export function gradeMetric(value: number, metric: keyof typeof THRESHOLDS): Verdict {
  const t = THRESHOLDS[metric];
  if (!t) return 'good';
  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs-work';
  return 'poor';
}
