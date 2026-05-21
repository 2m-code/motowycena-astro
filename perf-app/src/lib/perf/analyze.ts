/**
 * Wnioski z surowych pomiarów: security headers, SEO check, diagnostyka.
 */
import type {
  Aggregate,
  Diagnostic,
  Sample,
  SecurityCheck,
  SeoCheck,
} from './types.js';

export function analyzeSecurityHeaders(
  headers: Record<string, string>,
): SecurityCheck {
  return {
    hsts: !!headers['strict-transport-security'],
    csp: !!headers['content-security-policy'],
    xContentTypeOptions:
      (headers['x-content-type-options'] || '').toLowerCase() === 'nosniff',
    referrerPolicy: !!headers['referrer-policy'],
    xFrameOptions: !!headers['x-frame-options'],
  };
}

export function analyzeSeo(sample: Sample): SeoCheck {
  // Bierzemy meta z page.evaluate (zbieramy w observers.ts)
  // ale aktualnie meta jest osobno - tu używamy heurystyk z resources +
  // przyszłość: zapisywać meta w sample bezpośrednio.
  // Na razie zwracamy puste, bo meta jest w innym miejscu (poniżej).
  return {
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
}

export function buildDiagnostics(
  aggregate: Aggregate,
  representative: Sample,
  security: SecurityCheck,
  seo: SeoCheck,
): Diagnostic[] {
  const diags: Diagnostic[] = [];

  // PERFORMANCE
  if (aggregate.verdicts.lcp === 'poor') {
    diags.push({
      severity: 'critical',
      category: 'performance',
      title: `LCP za wolny: ${Math.round(aggregate.lcp.p75)} ms`,
      description:
        'Largest Contentful Paint przekracza próg "poor" (4000 ms). Najczęstsze przyczyny: ciężkie obrazy bez optymalizacji, render-blocking JS/CSS, słaby TTFB. Sprawdź lcpElement w sample i optymalizuj go (WebP, preload, fetchpriority=high).',
    });
  } else if (aggregate.verdicts.lcp === 'needs-work') {
    diags.push({
      severity: 'warning',
      category: 'performance',
      title: `LCP wymaga poprawy: ${Math.round(aggregate.lcp.p75)} ms`,
      description:
        'LCP między 2.5s a 4s. Zoptymalizuj główny obraz/heading: preload, AVIF/WebP, font-display: swap.',
    });
  }

  if (aggregate.verdicts.cls === 'poor') {
    diags.push({
      severity: 'critical',
      category: 'performance',
      title: `CLS za wysoki: ${aggregate.cls.p75.toFixed(3)}`,
      description:
        'Layout shifts > 0.25. Powody: brak width/height na obrazach, fonty bez size-adjust, treści wstawiane dynamicznie bez rezerwacji miejsca.',
    });
  }

  if (aggregate.verdicts.tbtProxy === 'poor') {
    diags.push({
      severity: 'warning',
      category: 'performance',
      title: `TBT* za wysoki: ${Math.round(aggregate.tbtProxy.p75)} ms`,
      description:
        'Long tasks blokują main thread. Code-split JS, defer skrypty third-party, użyj React Server Components lub Astro islands.',
    });
  }

  if (aggregate.verdicts.ttfb === 'poor') {
    diags.push({
      severity: 'warning',
      category: 'performance',
      title: `TTFB za wolny: ${Math.round(aggregate.ttfb.p75)} ms`,
      description:
        'Server response time > 1.8s. Możliwe przyczyny: brak CDN, slow database, SSR bez cache. Rozważ static generation + edge CDN.',
    });
  }

  // Resources
  const totalKB = aggregate.transferSize.p75 / 1024;
  if (totalKB > 1000) {
    diags.push({
      severity: 'warning',
      category: 'performance',
      title: `Strona za ciężka: ${totalKB.toFixed(0)} KB`,
      description:
        'Transfer powyżej 1 MB jest ciężki dla mobile. Audytuj 3rd-party scripts, optymalizuj obrazy, code-splituj JS.',
    });
  }

  // SECURITY
  if (!security.hsts) {
    diags.push({
      severity: 'warning',
      category: 'security',
      title: 'Brak HSTS',
      description:
        'Nagłówek Strict-Transport-Security wymusza HTTPS. Dodaj: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
    });
  }
  if (!security.xContentTypeOptions) {
    diags.push({
      severity: 'info',
      category: 'security',
      title: 'Brak X-Content-Type-Options: nosniff',
      description:
        'Zapobiega MIME sniffing attacks. Dodaj: X-Content-Type-Options: nosniff',
    });
  }
  if (!security.csp) {
    diags.push({
      severity: 'info',
      category: 'security',
      title: 'Brak Content Security Policy',
      description:
        'CSP to obrona przed XSS. Wdrożenie wymaga audytu inline scripts, ale warto.',
    });
  }

  // SEO
  if (!seo.description || seo.descriptionLength < 50) {
    diags.push({
      severity: 'warning',
      category: 'seo',
      title: 'Meta description za krótki lub brakuje',
      description:
        'Dobry meta description ma 140-160 znaków. Wpływa na CTR z Google SERP.',
    });
  }
  if (seo.h1Count === 0) {
    diags.push({
      severity: 'critical',
      category: 'seo',
      title: 'Brak <h1> na stronie',
      description:
        'Każda strona powinna mieć dokładnie jeden h1 z głównym keyword.',
    });
  } else if (seo.h1Count > 1) {
    diags.push({
      severity: 'info',
      category: 'seo',
      title: `Wiele <h1> na stronie (${seo.h1Count})`,
      description:
        'Zwykle powinien być tylko jeden h1. HTML5 dopuszcza więcej, ale Google preferuje jeden.',
    });
  }
  if (!seo.hasJsonLd) {
    diags.push({
      severity: 'info',
      category: 'seo',
      title: 'Brak structured data (JSON-LD)',
      description:
        'Schema.org markup pomaga Google generować rich snippets. Dodaj LocalBusiness, Service, FAQPage.',
    });
  }
  if (!seo.canonical) {
    diags.push({
      severity: 'warning',
      category: 'seo',
      title: 'Brak <link rel="canonical">',
      description:
        'Bez canonical Google może uznać warianty URL (z/bez trailing slash, z/bez query) za duplicate content.',
    });
  }

  // Sort: critical > warning > info
  const order = { critical: 0, warning: 1, info: 2 };
  diags.sort((a, b) => order[a.severity] - order[b.severity]);

  return diags;
}

export function buildPlainLanguageSummary(
  aggregate: Aggregate,
  diagnostics: Diagnostic[],
): string {
  const v = aggregate.verdicts;
  const allGood =
    v.lcp === 'good' && v.cls === 'good' && v.tbtProxy === 'good';

  if (allGood) {
    return (
      `Strona ładuje się szybko (LCP ${Math.round(aggregate.lcp.p75)}ms), ` +
      `bez przeskoków layoutu (CLS ${aggregate.cls.p75.toFixed(3)}), ` +
      `i nie blokuje przeglądarki (TBT* ${Math.round(aggregate.tbtProxy.p75)}ms). ` +
      `Wszystkie Core Web Vitals są w "good" zakresie. ` +
      `Pamiętaj że to dane laboratoryjne - sprawdź też CrUX / Search Console dla danych od prawdziwych użytkowników.`
    );
  }

  const problems: string[] = [];
  const critical = diagnostics.filter((d) => d.severity === 'critical');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');

  if (v.lcp !== 'good')
    problems.push(`LCP ${Math.round(aggregate.lcp.p75)}ms (próg "good": 2500ms)`);
  if (v.cls !== 'good')
    problems.push(`CLS ${aggregate.cls.p75.toFixed(3)} (próg: 0.1)`);
  if (v.tbtProxy !== 'good')
    problems.push(`TBT* ${Math.round(aggregate.tbtProxy.p75)}ms (próg: 200ms)`);
  if (v.ttfb !== 'good')
    problems.push(`TTFB ${Math.round(aggregate.ttfb.p75)}ms (próg: 800ms)`);

  return (
    `Wykryto problemy: ${problems.join(', ')}. ` +
    `Krytycznych ${critical.length}, ostrzeżeń ${warnings.length}. ` +
    `Najpilniejsze: ${critical[0]?.title || warnings[0]?.title || 'sprawdź sekcję Diagnostyka'}.`
  );
}
