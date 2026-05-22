/**
 * CookieBanner – minimalny RODO-friendly banner.
 *
 * Cloudflare Web Analytics (jeśli używane) nie używa cookies – więc baner
 * jest formalnością. Ale dla kompletności i pełnej zgodności wyświetlamy,
 * dając wybór "Akceptuj" / "Tylko niezbędne". Wybór zapisujemy w localStorage.
 *
 * Hydratacja client:idle - nie blokuje LCP.
 * Banner pokazuje się tylko jeśli localStorage.cookieConsent nie jest ustawione.
 */
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cookieConsent';

type Consent = 'accepted' | 'necessary' | null;

export default function CookieBanner() {
  // Domyślnie nie pokazujemy – żeby uniknąć flashu zanim sprawdzimy storage.
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Consent;
      if (!saved) setShow(true);
    } catch {
      // Tryb prywatny / blokada storage – nie pokazujemy bo i tak nie zapiszemy.
    }
  }, []);

  const handleChoice = (choice: Exclude<Consent, null>) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Ignoruj – wybór nie zostanie zapamiętany, ale przynajmniej zamykamy banner.
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-heading"
      aria-describedby="cookie-text"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-40 bg-white border border-gray-200 shadow-2xl rounded-xl p-5"
    >
      {/* role=dialog daje semantykę okna, nie kolidujemy z hierarchią <h1>/<h2> strony. */}
      <p id="cookie-heading" className="font-bold text-gray-900 mb-2">
        Pliki cookies
      </p>
      <p id="cookie-text" className="text-sm text-gray-600 leading-relaxed mb-4">
        Używamy minimalnej liczby plików cookies oraz Cloudflare Web Analytics (bez cookies)
        do mierzenia ruchu. Szczegóły w{' '}
        <a href="/polityka-prywatnosci/" className="text-brand-700 underline hover:text-brand-900">
          polityce prywatności
        </a>
        .
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => handleChoice('accepted')}
          className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-3 rounded-lg transition"
        >
          Akceptuję wszystkie
        </button>
        <button
          type="button"
          onClick={() => handleChoice('necessary')}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-semibold px-4 py-3 rounded-lg transition"
        >
          Tylko niezbędne
        </button>
      </div>
    </div>
  );
}
