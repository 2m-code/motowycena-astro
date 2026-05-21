/**
 * Form do uruchamiania nowego audytu (React island).
 * Po submit POST /api/audit -> redirect do /jobs/[id] z live progress.
 */
import { useEffect, useState, type FormEvent } from 'react';

interface ProfileOption {
  id: string;
  label: string;
}

export default function AuditForm() {
  const [url, setUrl] = useState('');
  const [profileId, setProfileId] = useState('mobile-slow4g');
  const [runs, setRuns] = useState(3);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/profiles')
      .then((r) => r.json())
      .then((d: { profiles: ProfileOption[] }) => setProfiles(d.profiles))
      .catch(() => {
        /* fallback - default profile będzie działać */
      });
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), profileId, runs }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      window.location.href = `/jobs/${data.jobId}/`;
    } catch (err: any) {
      setError(err?.message ?? String(err));
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5"
    >
      <div>
        <label htmlFor="url" className="block text-sm font-semibold mb-1">
          URL do zmierzenia
        </label>
        <input
          id="url"
          type="url"
          required
          placeholder="https://www.motowycena.pl/"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Pełny URL z protokołem (https://). Może być localhost.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="profile" className="block text-sm font-semibold mb-1">
            Profil testu
          </label>
          <select
            id="profile"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
          >
            {profiles.length === 0 && (
              <option value="mobile-slow4g">Mobile / Slow 4G (default)</option>
            )}
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="runs" className="block text-sm font-semibold mb-1">
            Liczba runów
          </label>
          <input
            id="runs"
            type="number"
            min="1"
            max="15"
            value={runs}
            onChange={(e) => setRuns(parseInt(e.target.value) || 3)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            3-5 dla quick check, 9 dla statystycznie stabilnych wyników.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !url.trim()}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
      >
        {submitting ? 'Startuję...' : 'Zmierz wydajność →'}
      </button>
    </form>
  );
}
