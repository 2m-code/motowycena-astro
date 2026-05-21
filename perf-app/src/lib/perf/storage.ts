/**
 * Persystencja raportów na dysku.
 * data/reports/<host>/<id>.json
 */
import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Report } from './types.js';

const REPORTS_ROOT = path.resolve(process.cwd(), 'data', 'reports');

function safeSlug(s: string): string {
  return s.replace(/[^a-z0-9-_.]/gi, '_').slice(0, 100);
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

export async function saveReport(report: Report): Promise<string> {
  const host = safeSlug(hostFromUrl(report.url));
  const dir = path.join(REPORTS_ROOT, host);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${report.id}.json`);
  await writeFile(file, JSON.stringify(report, null, 2), 'utf-8');
  return file;
}

export async function loadReport(host: string, id: string): Promise<Report | null> {
  try {
    const file = path.join(REPORTS_ROOT, safeSlug(host), `${safeSlug(id)}.json`);
    const raw = await readFile(file, 'utf-8');
    return JSON.parse(raw) as Report;
  } catch {
    return null;
  }
}

export interface ReportIndex {
  id: string;
  host: string;
  url: string;
  startedAt: string;
  finishedAt: string;
  lcpP75: number;
  clsP75: number;
  verdict: string;
}

export async function listReports(limit = 50): Promise<ReportIndex[]> {
  const results: ReportIndex[] = [];
  try {
    const hosts = await readdir(REPORTS_ROOT);
    for (const host of hosts) {
      const hostDir = path.join(REPORTS_ROOT, host);
      try {
        const s = await stat(hostDir);
        if (!s.isDirectory()) continue;
      } catch {
        continue;
      }
      const files = await readdir(hostDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const raw = await readFile(path.join(hostDir, file), 'utf-8');
          const r = JSON.parse(raw) as Report;
          const worst: string = (() => {
            const vs = Object.values(r.aggregate.verdicts);
            if (vs.includes('poor')) return 'poor';
            if (vs.includes('needs-work')) return 'needs-work';
            return 'good';
          })();
          results.push({
            id: r.id,
            host: r.host,
            url: r.url,
            startedAt: r.startedAt,
            finishedAt: r.finishedAt,
            lcpP75: r.aggregate.lcp.p75,
            clsP75: r.aggregate.cls.p75,
            verdict: worst,
          });
        } catch {
          /* skip broken */
        }
      }
    }
  } catch {
    /* no reports yet */
  }
  results.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return results.slice(0, limit);
}
