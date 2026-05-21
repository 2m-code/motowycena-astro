/**
 * Live progress audytu (React island).
 * Subskrybuje SSE /api/audit/[id]/events, pokazuje paski progress.
 * Po finish - redirect do /reports/<host>/<reportId>.
 */
import { useEffect, useRef, useState } from 'react';

interface Props {
  jobId: string;
  hostHint?: string; // żeby przekierować bez czekania na fetch
}

interface ProgressEvent {
  type: string;
  message?: string;
  runIndex?: number;
  totalRuns?: number;
  sample?: {
    lcp?: number;
    cls?: number;
    fcp?: number;
    ttfb?: number;
    tbtProxy?: number;
    transferSize?: number;
    runDurationMs?: number;
  };
  timestamp: string;
}

export default function JobProgress({ jobId, hostHint }: Props) {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [host, setHost] = useState<string | null>(hostHint ?? null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`/api/audit/${jobId}/events`);

    es.addEventListener('progress', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        setEvents((prev) => [...prev, data]);
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('finished', async (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        setReportId(data.reportId);
        setDone(true);

        // Wyciągamy host - albo z hint, albo fetchujemy job
        let h = host;
        if (!h) {
          try {
            const r = await fetch(`/api/audit/${jobId}`);
            const j = await r.json();
            h = new URL(j.url).hostname;
            setHost(h);
          } catch {
            /* leave null */
          }
        }
        if (h) {
          // Mały delay żeby user zobaczył "gotowe!"
          setTimeout(() => {
            window.location.href = `/reports/${encodeURIComponent(h!)}/${data.reportId}/`;
          }, 800);
        }
      } catch {
        /* ignore */
      }
      es.close();
    });

    es.addEventListener('failed', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        setError(data.error || 'Audit failed');
      } catch {
        setError('Audit failed');
      }
      es.close();
    });

    es.onerror = () => {
      // EventSource sam reconnectuje - ale jeśli stream zamknięty po finished, ok
    };

    return () => es.close();
  }, [jobId]);

  // auto-scroll do dołu
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [events]);

  const samples = events.filter((e) => e.type === 'run-sample');
  const total = samples[0]?.totalRuns ?? events.find((e) => e.totalRuns)?.totalRuns ?? 0;
  const completedRuns = samples.length;
  const progressPct = total > 0 ? Math.round((completedRuns / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">
            {done && reportId
              ? '✅ Gotowe - przekierowuję...'
              : error
              ? '❌ Błąd'
              : `🔬 Mierzę... ${completedRuns}/${total || '?'} runów`}
          </h2>
          <span className="text-sm text-gray-500">{progressPct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              error ? 'bg-red-500' : done ? 'bg-green-500' : 'bg-brand-600'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </p>
        )}
      </div>

      {/* Sample table */}
      {samples.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-3">Surowe pomiary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-3">Run</th>
                  <th className="py-2 pr-3">LCP</th>
                  <th className="py-2 pr-3">CLS</th>
                  <th className="py-2 pr-3">FCP</th>
                  <th className="py-2 pr-3">TTFB</th>
                  <th className="py-2 pr-3">TBT*</th>
                  <th className="py-2 pr-3">Transfer</th>
                  <th className="py-2 pr-3">Czas</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {samples.map((s, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-3 text-gray-600">#{s.runIndex}</td>
                    <td className="py-2 pr-3">{fmtMs(s.sample?.lcp)}</td>
                    <td className="py-2 pr-3">{fmtCls(s.sample?.cls)}</td>
                    <td className="py-2 pr-3">{fmtMs(s.sample?.fcp)}</td>
                    <td className="py-2 pr-3">{fmtMs(s.sample?.ttfb)}</td>
                    <td className="py-2 pr-3">{fmtMs(s.sample?.tbtProxy)}</td>
                    <td className="py-2 pr-3">{fmtKB(s.sample?.transferSize)}</td>
                    <td className="py-2 pr-3 text-gray-500">{fmtMs(s.sample?.runDurationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log */}
      <div className="bg-gray-900 text-gray-100 rounded-xl p-4 font-mono text-xs">
        <div className="flex justify-between mb-2">
          <span className="text-gray-400">Log</span>
          <span className="text-gray-500">{events.length} eventów</span>
        </div>
        <div ref={logRef} className="max-h-64 overflow-y-auto space-y-1">
          {events.map((e, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-500 shrink-0">
                {new Date(e.timestamp).toLocaleTimeString('pl-PL', { hour12: false })}
              </span>
              <span className={typeForColor(e.type)}>{e.type}</span>
              <span className="text-gray-300">{e.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function fmtMs(v: number | undefined): string {
  if (v === undefined || v === null) return '-';
  return `${Math.round(v)}ms`;
}
function fmtCls(v: number | undefined): string {
  if (v === undefined || v === null) return '-';
  return v.toFixed(3);
}
function fmtKB(v: number | undefined): string {
  if (v === undefined || v === null) return '-';
  return `${(v / 1024).toFixed(1)}KB`;
}
function typeForColor(t: string): string {
  if (t === 'failed') return 'text-red-400';
  if (t === 'done') return 'text-green-400';
  if (t === 'run-start') return 'text-blue-400';
  if (t === 'run-sample') return 'text-emerald-400';
  if (t === 'aggregating') return 'text-purple-400';
  return 'text-yellow-400';
}
