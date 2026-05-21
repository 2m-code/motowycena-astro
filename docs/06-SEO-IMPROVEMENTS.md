# Konkretne ulepszenia SEO – co dokładnie wdrożymy

Ten dokument opisuje **każde** ulepszenie SEO które wdrożymy na nowej stronie. Każde z nich ma uzasadnienie biznesowe i mierzalny efekt.

## 1. Meta tagi – 100% pokrycia

### Obecnie: 0/15 stron ma meta description
### Po migracji: 15/15 + na każdej nowej stronie

**Format meta title:**
```
[Keyword głównyy] – [USP] | Motowycena
```

Przykłady:
- `Wycena celno-skarbowa pojazdu – Certyfikowany rzeczoznawca | Motowycena`
- `Wycena wartości pojazdu – Profesjonalna ekspertyza w 24h | Motowycena`
- `Rzeczoznawca samochodowy Wielkopolska – Rafał Pelczar | Motowycena`

Reguły:
- Max 60 znaków
- Główny keyword na początku
- Marka na końcu
- Modyfikator (szybko, profesjonalnie, certyfikowany) w środku

**Format meta description:**
```
[Co robisz]. [Wyróżnik/zalety]. [Region/zasięg]. [CTA].
```

Przykład dla `/wycena-celno-skarbowa/`:
```
Profesjonalna wycena celno-skarbowa pojazdów sprowadzanych z zagranicy.
Certyfikowany rzeczoznawca (RS001771), akceptacja w urzędach skarbowych,
termin 24-48h. Sprawdź ofertę i zamów online.
```

Reguły:
- 140-160 znaków
- Główny + secondary keyword
- Co najmniej 1 modyfikator zaufania (numer certyfikatu, lata doświadczenia)
- CTA ("Sprawdź", "Zamów", "Zadzwoń")

## 2. Schema.org markup – pełny pakiet

### LocalBusiness (na każdej stronie, w `<head>`)

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://www.motowycena.pl/#business",
  "name": "Motowycena - Rzeczoznawca Techniki Samochodowej Rafał Pelczar",
  "image": "https://www.motowycena.pl/logo.jpg",
  "telephone": "+48509146666",
  "email": "biuro@motowycena.pl",
  "url": "https://www.motowycena.pl",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "ul. Spacerowa 10",
    "addressLocality": "Garki",
    "postalCode": "63-430",
    "addressCountry": "PL"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 51.6,
    "longitude": 17.7
  },
  "areaServed": [
    {"@type": "AdministrativeArea", "name": "Wielkopolska"},
    {"@type": "AdministrativeArea", "name": "Dolnośląskie"},
    {"@type": "City", "name": "Poznań"},
    {"@type": "City", "name": "Wrocław"},
    {"@type": "City", "name": "Warszawa"},
    {"@type": "City", "name": "Kraków"}
  ],
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
    "opens": "08:00",
    "closes": "18:00"
  },
  "founder": {
    "@type": "Person",
    "name": "Rafał Pelczar",
    "jobTitle": "Rzeczoznawca Techniki Samochodowej",
    "hasCredential": "Certyfikat nr RS001771"
  }
}
```

### Service (na każdej stronie usługi)

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "Wycena celno-skarbowa pojazdu",
  "provider": {"@id": "https://www.motowycena.pl/#business"},
  "areaServed": "PL",
  "offers": {
    "@type": "Offer",
    "priceCurrency": "PLN",
    "priceRange": "200-500 PLN"
  }
}
```

### FAQPage (gdzie wstawimy FAQ)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Ile kosztuje wycena celno-skarbowa?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Koszt wyceny celno-skarbowej zależy od..."
    }
  }]
}
```

### BreadcrumbList (na każdej podstronie)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type":"ListItem","position":1,"name":"Strona główna","item":"https://www.motowycena.pl/"},
    {"@type":"ListItem","position":2,"name":"Usługi","item":"https://www.motowycena.pl/uslugi/"},
    {"@type":"ListItem","position":3,"name":"Wycena celno-skarbowa","item":"https://www.motowycena.pl/wycena-celno-skarbowa/"}
  ]
}
```

### Person (na stronie /o-mnie/)

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Rafał Pelczar",
  "jobTitle": "Rzeczoznawca Techniki Samochodowej",
  "telephone": "+48509146666",
  "email": "biuro@motowycena.pl",
  "hasCredential": [{
    "@type": "EducationalOccupationalCredential",
    "credentialCategory": "certification",
    "identifier": "RS001771",
    "name": "Certyfikat Rzeczoznawcy Samochodowego"
  }],
  "worksFor": {"@id": "https://www.motowycena.pl/#business"}
}
```

## 3. Open Graph + Twitter Cards

Każda strona dostaje OG tagi:

```html
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Motowycena" />
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:url" content="https://www.motowycena.pl/..." />
<meta property="og:image" content="https://www.motowycena.pl/og/..." />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="pl_PL" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="..." />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="https://www.motowycena.pl/og/..." />
```

**OG images** generowane automatycznie:
- 1200x630px
- Tło z logiem
- Tytuł strony jako tekst
- Branding (RS001771)
- Format: JPG (mniejszy niż PNG)

## 4. Core Web Vitals – cel: zielony status w GSC

| Metryka | Cel | Jak osiągnąć |
|---------|-----|--------------|
| LCP (Largest Contentful Paint) | <2.5s | Astro generuje statyczny HTML, obrazy WebP + lazy loading, fonty self-hosted |
| INP (Interaction to Next Paint) | <200ms | Minimum JS, React tylko w islands |
| CLS (Cumulative Layout Shift) | <0.1 | Width/height na każdym obrazie, font-display: swap, brak skoków |

## 5. Wewnętrzne linkowanie

### Obecnie: prawdopodobnie tylko menu główne

### Po migracji: bogata sieć linków

Każda strona usługi linkuje do:
- 2-3 powiązanych usług ("Może Cię również zainteresować")
- Strony kontaktu (CTA w treści + footer)
- Bloga (gdy będzie)
- FAQ (gdy będzie)

Internal links flow:
```
Home → wszystkie usługi (1 click)
Usługa → powiązane usługi + FAQ + kontakt + opinie
Blog post → 2-3 usługi (link contextual)
FAQ → konkretna usługa odpowiadająca pytaniu
```

## 6. Hreflang (na przyszłość)

Jeśli klient zechce wersję angielską/niemiecką dla emigrantów wracających do PL:

```html
<link rel="alternate" hreflang="pl" href="https://www.motowycena.pl/" />
<link rel="alternate" hreflang="en" href="https://www.motowycena.pl/en/" />
<link rel="alternate" hreflang="de" href="https://www.motowycena.pl/de/" />
<link rel="alternate" hreflang="x-default" href="https://www.motowycena.pl/" />
```

Astro wspiera to natywnie (`@astrojs/i18n`).

## 7. Treść – ekspansja o 30-50%

Obecne strony mają w okolicach 200-400 słów. Nowa wersja:

- **Min. 600 słów** każda strona usługi
- **Naturalne wystąpienia keyword** (1-2% density)
- **Powiązane słowa kluczowe (LSI)** – synonimy, wariacje
- **Listy + tabele** (Google to lubi)
- **Cytaty i case studies** (jeśli klient ma)
- **Sekcja "Jak to działa"** krok po kroku
- **Sekcja "Dla kogo"** (segmentacja klientów)
- **Sekcja "Co zawiera wycena"** (transparentność)
- **Sekcja FAQ** (3-5 pytań na stronie)

## 8. Świeżość treści (Fresh content signal)

Google premiuje świeżą treść. Strategie:
- **Daty `lastmod` w sitemapie** – aktualizowane przy każdej edycji
- **`<time datetime="...">`** widoczny na blogu
- **Blog z 2-4 artykułami miesięcznie** (długoterminowy plan)
- **Aktualizacje przy zmianach prawnych** (np. nowe przepisy o wycenach celno-skarbowych)

## 9. Sitemap XML – rozbudowany

Astro `@astrojs/sitemap` generuje sitemap automatycznie. Możemy dodać:

- **priority** per page (home = 1.0, usługi = 0.9, blog = 0.7)
- **changefreq** per typ strony
- **lastmod** z gita (commit date)
- **Subsitemapy** osobne dla: pages, blog, images
- **Image sitemap** (osobny sitemap dla zdjęć)

## 10. Local SEO – dla emigrantów i kierowców z całej Polski

### Podstrony lokalne (P2 w roadmapie)

```
/rzeczoznawca-poznan/
/rzeczoznawca-wroclaw/
/rzeczoznawca-kalisz/
/rzeczoznawca-warszawa/
/rzeczoznawca-krakow/
/rzeczoznawca-lodz/
/rzeczoznawca-bydgoszcz/
/rzeczoznawca-gdansk/
```

Każda taka strona:
- Title: `Rzeczoznawca samochodowy [Miasto] – Wyceny pojazdów | Motowycena`
- Treść 500+ słów o specyfice miasta (np. komisy, autoryzowane stacje)
- Lista usług + ceny
- Mapa Google z punktem (siedziba lub punkt dojazdu)
- Schema `LocalBusiness` z `areaServed: [Miasto]`
- Linki do home + powiązane usługi

### Google Business Profile

- [ ] Setup/optymalizacja GBP
- [ ] Min. 10 zdjęć (rzeczoznawca w pracy, dokumentacja, siedziba)
- [ ] Wszystkie kategorie biznesu wypełnione
- [ ] Godziny otwarcia
- [ ] Posty 2x w miesiącu
- [ ] Aktywne odpowiadanie na opinie

## 11. Performance budget

Każda strona musi spełniać:

| Zasób | Limit |
|-------|-------|
| HTML | <30 KB |
| CSS | <50 KB |
| JavaScript (krytyczny) | <20 KB |
| JavaScript (lazy) | <80 KB |
| Obrazy (above-fold) | <200 KB total |
| Fonty | <50 KB (2 wagi, woff2) |
| **Total wagę strony** | **<400 KB** |
| Time to First Byte | <600ms |

## 12. Mobile-first design

- Wszystkie elementy testowane na mobile FIRST
- Touch targets ≥ 48x48 px
- Brak hover-only interactions
- Sticky CTA (Zadzwoń / WhatsApp) na mobile
- Responsywne obrazy (`<picture>` z `srcset`)

## 13. RODO compliance (bonus SEO)

Google premiuje strony privacy-friendly:
- Cookie banner z prawdziwym wyborem (nie dark pattern)
- Brak Google Fonts (self-hosted) – mniej zewnętrznych żądań
- Brak Google Analytics (lub min. anonimizacja IP + cookieless mode)
- Cloudflare Web Analytics zamiast GA
- Polityka prywatności aktualna pod RODO + Akt o usługach cyfrowych (DSA)

## 14. Monitoring i pomiary

Po wdrożeniu codziennie sprawdzamy:

- **GSC**: Performance, Coverage, CWV, Mobile Usability, Rich Results
- **PageSpeed Insights**: per-page check
- **Cloudflare Analytics**: ruch, bot traffic, geo
- **UptimeRobot**: uptime 99.9%+
- **Sentry / LogRocket** (opcjonalnie): błędy JS w przeglądarce

---

## Spodziewane wyniki po 3 miesiącach

| Metryka | Przed | Po (cel) | Wzrost |
|---------|-------|----------|--------|
| Pages indexed | 15 | 25-30 (+ blog) | +60-100% |
| Lighthouse Performance | ~60 | 95+ | +58% |
| Average position w Google | ~25 | 12-15 | poprawa 10 pozycji |
| Impressions / mc | baseline | +200% | 2-3x |
| Clicks / mc | baseline | +150% | 2.5x |
| CTR | ~2% | 4-5% | 2x (meta descriptions!) |
| Rich snippets | 0 | 5-10 | +∞ |
| Mobile usability errors | nieznane | 0 | – |
| Core Web Vitals (zielone) | nieznane | 100% | – |

## Spodziewane wyniki po 12 miesiącach (z blogiem)

- **+500% impressions** (baseline → 5x)
- **+300% clicks** (baseline → 4x)
- **TOP 3 pozycje** na main keywords: "rzeczoznawca samochodowy Wielkopolska", "wycena celno-skarbowa", "biegły sądowy techniki samochodowej"
- **DA/DR wzrost** (z budowaniem linków)
- **Brand search +200%** (więcej osób szuka "Motowycena Pelczar")
