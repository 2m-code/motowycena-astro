/**
 * Kod wstrzykiwany w stronę PRZED nawigacją przez `page.evaluateOnNewDocument()`.
 * Nasłuchuje wszystkie PerformanceObserver i odkłada metryki w `window.__perf`.
 *
 * Cała ta funkcja jest STRINGIFIKOWANA i wykonywana w kontekście przeglądarki -
 * nie ma dostępu do nodejs ani naszych importów. Musi być self-contained.
 *
 * CLS używa **session window** wg https://web.dev/articles/cls#what-is-cls,
 * nie sumy wszystkich shiftów.
 */
export function installObserversInPage(): void {
  // Ten kod działa w przeglądarce. Brak typów - to JS w runtime page'a.
  // @ts-ignore - window jest w przeglądarce
  const w: any = window;
  w.__perf = {
    lcp: 0,
    lcpElement: null,
    cls: 0,
    clsCurrentSessionValue: 0,
    clsCurrentSessionStart: 0,
    clsLastShiftTime: 0,
    fcp: 0,
    longTasks: [] as { startTime: number; duration: number }[],
  };

  // LCP - bierzemy ostatni element (oficjalny algorytm web.dev)
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as any;
      w.__perf.lcp = last.renderTime || last.loadTime || last.startTime;
      if (last.element) {
        // Selector - heurystyka: tag#id.class
        const el: Element = last.element;
        let sel = el.tagName.toLowerCase();
        if (el.id) sel += '#' + el.id;
        else if (el.className && typeof el.className === 'string') {
          sel += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
        }
        w.__perf.lcpElement = {
          selector: sel,
          url: (last.url as string) || null,
        };
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    /* not supported */
  }

  // CLS - session window: shift-y są łączone w sesję jeśli odległość < 1s
  // i sesja krótsza niż 5s. Wynik = MAX z wszystkich sesji.
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e: any = entry;
        if (e.hadRecentInput) continue;

        const isNewSession =
          w.__perf.clsLastShiftTime === 0 ||
          e.startTime - w.__perf.clsLastShiftTime > 1000 ||
          e.startTime - w.__perf.clsCurrentSessionStart > 5000;

        if (isNewSession) {
          w.__perf.clsCurrentSessionValue = e.value;
          w.__perf.clsCurrentSessionStart = e.startTime;
        } else {
          w.__perf.clsCurrentSessionValue += e.value;
        }

        w.__perf.clsLastShiftTime = e.startTime;
        w.__perf.cls = Math.max(w.__perf.cls, w.__perf.clsCurrentSessionValue);
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {
    /* not supported */
  }

  // FCP
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          w.__perf.fcp = entry.startTime;
        }
      }
    }).observe({ type: 'paint', buffered: true });
  } catch {
    /* not supported */
  }

  // Long Tasks (> 50ms blokujących main thread)
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        w.__perf.longTasks.push({
          startTime: entry.startTime,
          duration: entry.duration,
        });
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch {
    /* not supported */
  }
}

/**
 * Kod wykonywany W STRONIE po zakończeniu nawigacji, żeby wyciągnąć zebrane dane.
 */
export function collectFromPage(): {
  perf: any;
  navigation: any;
  resources: any[];
  meta: {
    title: string;
    description: string | null;
    canonical: string | null;
    h1Count: number;
    hasJsonLd: boolean;
    jsonLdTypes: string[];
    hasOpenGraph: boolean;
    hasViewportMeta: boolean;
    lang: string | null;
  };
} {
  const w: any = window;
  const navList = performance.getEntriesByType('navigation');
  const navEntry: any = navList[0];

  const resources = performance.getEntriesByType('resource').map((r: any) => ({
    name: r.name,
    type: r.initiatorType,
    size: r.transferSize ?? 0,
    duration: r.duration ?? 0,
    cached: (r.transferSize ?? 0) === 0 && (r.decodedBodySize ?? 0) > 0,
  }));

  // SEO meta
  const titleEl = document.querySelector('title');
  const descEl: any = document.querySelector('meta[name="description"]');
  const canonEl: any = document.querySelector('link[rel="canonical"]');
  const ogEl = document.querySelector('meta[property^="og:"]');
  const viewportEl: any = document.querySelector('meta[name="viewport"]');
  const jsonLdEls = Array.from(
    document.querySelectorAll('script[type="application/ld+json"]'),
  );

  const jsonLdTypes: string[] = [];
  for (const el of jsonLdEls) {
    try {
      const parsed = JSON.parse(el.textContent || '{}');
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const t = item['@type'];
        if (Array.isArray(t)) jsonLdTypes.push(...t);
        else if (typeof t === 'string') jsonLdTypes.push(t);
      }
    } catch {
      /* invalid JSON-LD */
    }
  }

  return {
    perf: w.__perf,
    navigation: navEntry
      ? {
          ttfb: navEntry.responseStart - navEntry.requestStart,
          domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.fetchStart,
          loadComplete: navEntry.loadEventEnd - navEntry.fetchStart,
          transferSize: navEntry.transferSize ?? 0,
          encodedBodySize: navEntry.encodedBodySize ?? 0,
          decodedBodySize: navEntry.decodedBodySize ?? 0,
        }
      : null,
    resources,
    meta: {
      title: titleEl?.textContent ?? '',
      description: descEl?.content ?? null,
      canonical: canonEl?.href ?? null,
      h1Count: document.querySelectorAll('h1').length,
      hasJsonLd: jsonLdEls.length > 0,
      jsonLdTypes,
      hasOpenGraph: !!ogEl,
      hasViewportMeta: !!viewportEl,
      lang: document.documentElement.lang || null,
    },
  };
}
