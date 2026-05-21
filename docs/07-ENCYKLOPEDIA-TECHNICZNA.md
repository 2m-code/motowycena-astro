# Encyklopedia techniczna projektu

Dla każdej rzeczy używanej w tym projekcie:

1. **Po ludzku** – jedno zdanie dla klienta
2. **Definicja techniczna** – nazewnictwo branżowe
3. **Mechanika** – jak to działa pod spodem
4. **Kod** – realny przykład z naszego projektu

---

## A. FRAMEWORK I FRONTEND

### A.1. Astro 5

**Po ludzku:** Astro buduje strony jak gazety – cała treść drukowana na papierze w drukarni, gotowa do czytania. Zero ładowania w głowie czytelnika.

**Definicja techniczna:** Astro to **content-first meta-framework** używający paradygmatu **MPA (Multi-Page Application)** z **Islands Architecture**. Generuje statyczny HTML w build-time (SSG – Static Site Generation), z opcjonalnymi "wyspami" interaktywności dla wybranych komponentów.

**Mechanika pod spodem:**
1. `astro build` parsuje pliki `.astro`, `.mdx`, `.ts` z `src/pages/`
2. Każdy `.astro` to gotowy HTML + (opcjonalnie) hydrowane wyspy
3. Komponenty React/Vue/Svelte używane bez dyrektywy `client:*` renderują się **tylko serwerowo** – zerowy JS w przeglądarce
4. Komponenty z `client:load`/`client:idle`/`client:visible` dostają oddzielne chunki JS ładowane warunkowo

**Kod z projektu:**
```astro
---
// src/pages/index.astro – wszystko poniżej tej linii to PURE HTML w build time
import Hero from '@components/sections/Hero.astro';        // → server only, 0 KB JS
import ContactForm from '@components/forms/ContactForm.tsx'; // React island
---
<html>
  <body>
    <Hero />                                    <!-- statyczny HTML -->
    <ContactForm client:visible />              <!-- React hydruje gdy widoczne -->
  </body>
</html>
```

**Konkurencja:** Next.js (heavier, app-like), Remix (data-driven SSR), 11ty (lighter, no JS framework).

---

### A.2. Islands Architecture

**Po ludzku:** Strona to gazeta z 1-2 interaktywnymi miejscami (formularz, mapa). Reszta to statyczny tekst. Tylko te interaktywne miejsca ładują JavaScript.

**Definicja techniczna:** Architecture pattern (Jason Miller, 2020) gdzie strona to statyczny HTML z **odizolowanymi wyspami hydratacji**. Każda wyspa to niezależny komponent z własnym chunkiem JS, własną hydratacją, niekomunikujący się z innymi wyspami via JS tree.

**Mechanika:**
- Build-time: każdy komponent z `client:*` to osobny bundle `_astro/ContactForm.HASH.js`
- Runtime: Astro wstrzykuje runtime ~3 KB (`@astrojs/runtime`) który orchestruje lazy hydration
- Strategie hydratacji:
  - `client:load` → hydrate on page load
  - `client:idle` → `requestIdleCallback()` – po idle main thread
  - `client:visible` → `IntersectionObserver` – gdy w viewporcie
  - `client:media="(max-width: 768px)"` → tylko gdy matchuje media query
  - `client:only="react"` → zero SSR, tylko client (gdy komponent używa np. `window`)

**Kod z projektu:**
```astro
<!-- src/layouts/BaseLayout.astro -->
<WhatsAppButton client:idle phone={business.contact.whatsapp} />
<!--                ^^^^^^^^^ Hydratacja w bezczynnym czasie main threada
                              Wyspa nie blokuje LCP -->

<!-- src/pages/kontakt.astro -->
<ContactForm client:visible turnstileSiteKey={turnstileSiteKey} />
<!--           ^^^^^^^^^^^^ IntersectionObserver – nie hydruje dopóki klient
                            nie przewinie do formularza -->
```

---

### A.3. SSG vs SSR vs ISR vs CSR

**Po ludzku:**
- **SSG**: gazeta – wydrukowana raz, daje się każdemu klientowi
- **SSR**: gazeta drukowana na życzenie – każdy klient czeka aż się wydrukuje
- **ISR**: gazeta wydrukowana z opcją "odśwież co 5 minut"
- **CSR**: klient dostaje pustą kartkę i pisze sobie sam (czeka długo)

**Definicje techniczne:**

| Skrót | Pełna nazwa | Kiedy generowany HTML |
|-------|-------------|----------------------|
| **SSG** | Static Site Generation | Build time, raz |
| **SSR** | Server-Side Rendering | Per request, na serwerze |
| **ISR** | Incremental Static Regeneration | Build + revalidate co N sekund |
| **CSR** | Client-Side Rendering | W przeglądarce po pobraniu pustego HTML |
| **PPR** | Partial Prerendering (Next.js 16) | SSG dla statycznych części + SSR dla dynamic holes |

**Kod z projektu:**
```js
// astro.config.mjs – domyślnie SSG
export default defineConfig({
  output: 'static',  // wszystkie strony pre-renderowane w build
});

// Per-strona można włączyć SSR:
// src/pages/api/contact.ts
export const prerender = false;  // ta strona nie SSG-uje się, SSR per request
```

---

### A.4. React 19 jako wyspa

**Po ludzku:** Używamy React tylko tam gdzie jest realna interaktywność – formularz, slider, mapa. Reszta strony to "głupi" HTML.

**Definicja techniczna:** React 19 wprowadza **Server Components (RSC)** ale w Astro **nie używamy RSC** – używamy klasycznych client components renderowanych przez Astro server-side raz, hydrowanych w przeglądarce. Nowości React 19 które wykorzystujemy: `use()` hook, ulepszony `useFormStatus`, `useOptimistic`, automatyczny React Compiler.

**Mechanika hydration w Astro:**
1. Astro renderuje React komponent po stronie serwera (przez `react-dom/server`)
2. Wynikowy HTML trafia do strony
3. JS bundle z komponentem ląduje w `<script type="module">`
4. Po spełnieniu dyrektywy `client:*` → `hydrateRoot(element, <Component {...props} />)`

**Kod z projektu:**
```tsx
// src/components/forms/ContactForm.tsx
import { useState, useRef, type FormEvent } from 'react';
import { z } from 'zod';

// Schema walidacji - runtime check (zod nie znika po kompilacji TS)
const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  // ...
});

export default function ContactForm({ turnstileSiteKey }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  // useState to React hook - wymaga client component → potrzebujemy client:*
}
```

```astro
<!-- W .astro: -->
<ContactForm client:visible turnstileSiteKey={import.meta.env.PUBLIC_TURNSTILE_SITE_KEY} />
```

---

### A.5. TypeScript strict mode

**Po ludzku:** Komputer pyta "czy na pewno?" przy każdej operacji. Mniej bugów, więcej wstrząsania głową.

**Definicja techniczna:** Flagi w `tsconfig.json` które wymuszają najściślejsze sprawdzanie typów: `strict: true` aktywuje `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `useUnknownInCatchVariables`, `alwaysStrict`.

**Co to wymusza:**
- `null` i `undefined` muszą być explicit – `Foo | null` zamiast nadmiarowych `?.`
- Każdy parametr funkcji ma typ – żadnych `any` ukrytych
- `catch (e)` daje `e: unknown` zamiast `e: any` – wymusza `instanceof Error` check
- Class properties muszą być inicjowane w konstruktorze lub `!`

**Kod z projektu:**
```json
// app/tsconfig.json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "paths": {
      "@components/*": ["src/components/*"]
    }
  }
}
```

```ts
// app/src/pages/api/contact.ts
async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string | undefined,  // ⭐ explicit "może być undefined"
): Promise<boolean> {
  try {
    // ...
  } catch {
    return false;  // strict: catch bez (e) bo i tak nieużywane
  }
}
```

---

### A.6. Tailwind CSS 4

**Po ludzku:** Zamiast pisać własny CSS dla każdej rzeczy, składamy klasy z gotowych klocków (`bg-blue-500 p-4 rounded-lg`).

**Definicja techniczna:** **Utility-first CSS framework**. Klasy są atomic (jedna klasa = jedna własność CSS). Build używa **JIT (Just-In-Time)** compiler – generuje TYLKO klasy faktycznie użyte w HTML/JSX. Wynikowy CSS bundle bywa 5-20 KB zamiast typowych 100 KB+.

**Mechanika v4:**
- Tailwind v4 używa **CSS Cascade Layers** (`@layer base/components/utilities`)
- Custom theme tokens definiuje się w CSS variable
- Brak `tailwind.config.js` – konfiguracja w CSS

**Kod z projektu:**
```css
/* app/src/styles/global.css */
@import "tailwindcss";

@theme {
  --color-brand-500: #1e3a8a;
  --color-brand-600: #1e40af;
  --font-sans: 'Inter', system-ui, sans-serif;
}
```

```astro
<!-- Użycie -->
<button class="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg">
  Zadzwoń
</button>
```

Generowany CSS (output):
```css
.bg-brand-600 { background-color: var(--color-brand-600); }
.hover\:bg-brand-700:hover { background-color: var(--color-brand-700); }
.text-white { color: #fff; }
.px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
.py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
.rounded-lg { border-radius: 0.5rem; }
```

---

### A.7. Content Collections + Zod schema

**Po ludzku:** Folder z plikami treści gdzie komputer pilnuje że każdy plik ma wszystkie wymagane pola (tytuł, opis, data).

**Definicja techniczna:** Astro feature dla **typed content management**. Pliki MDX/MD w `src/content/{collection}/` walidowane przez zod schema przy każdym buildzie. Daje **end-to-end type safety** od pliku tekstowego do React props.

**Mechanika:**
1. `defineCollection()` deklaruje strukturę
2. Astro generuje typy TypeScript z schemy (`astro:content`)
3. Build-time: każdy plik MDX musi pasować do schemy lub `astro:build:setup` zwraca error
4. `getCollection('services')` zwraca w pełni typowaną tablicę

**Kod z projektu:**
```ts
// app/src/content/config.ts
import { defineCollection, z } from 'astro:content';

const services = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string().min(3).max(80),
    seo: z.object({
      title: z.string().min(10).max(70),
      description: z.string().min(50).max(170),
      keywords: z.array(z.string()).default([]),
    }),
    benefits: z.array(z.string()).min(2).max(8),
    priceRange: z.object({
      from: z.number().int().positive(),
      to: z.number().int().positive(),
      currency: z.literal('PLN').default('PLN'),
    }).optional(),
    publishedAt: z.coerce.date().optional(),
  }),
});

export const collections = { services };
```

```mdx
---
title: Wycena celno-skarbowa
seo:
  title: Wycena celno-skarbowa pojazdu - Rzeczoznawca
  description: Profesjonalna wycena celno-skarbowa pojazdów z zagranicy...
  keywords: [wycena celno-skarbowa, akcyza]
benefits:
  - Akceptowane w UCS w całej Polsce
  - Termin 24-48h
priceRange:
  from: 300
  to: 600
---

## Czym jest wycena celno-skarbowa?

Treść MDX (Markdown + komponenty React inline)...
```

```ts
// W stronie - fully typed:
import { getCollection } from 'astro:content';
const services = await getCollection('services');
//      ^? CollectionEntry<'services'>[]
services[0].data.benefits;  // string[] - TS wie że to string array
```

---

## B. SEO TECHNICZNE

### B.1. Meta description

**Po ludzku:** Krótki podpis pod tytułem w Google – reklama strony przed kliknięciem.

**Definicja techniczna:** HTML meta tag `<meta name="description" content="...">` w `<head>`. **Nie jest** czynnikiem rankingowym, ALE wpływa na CTR (Click-Through Rate) z SERP-a. Google używa jako snippet gdy treść matchuje zapytanie; w przeciwnym razie generuje własny z body content.

**Reguły:**
- Długość: 140-160 znaków (powyżej Google ucina `...`)
- Język matchujący `<html lang="pl">`
- Słowa kluczowe naturalnie umieszczone (nie keyword stuffing)
- Powinno zawierać CTA (call-to-action)

**Kod z projektu:**
```astro
<!-- app/src/components/seo/SEO.astro -->
<meta name="description" content={description} />
```

```astro
<!-- Użycie w stronie: -->
<BaseLayout
  title="Wycena celno-skarbowa pojazdu - Rzeczoznawca certyfikowany"
  description="Profesjonalna wycena celno-skarbowa pojazdów z zagranicy. Akceptowana w urzędach celno-skarbowych. Certyfikowany rzeczoznawca (RS001771), termin 24-48h."
/>
```

---

### B.2. Schema.org JSON-LD

**Po ludzku:** Strukturalna wizytówka dla Google – mówi "tu jest firma, telefon, adres, godziny". Google wyświetla bogato (gwiazdki, mapy, godziny w SERP).

**Definicja techniczna:** **Structured data** w formacie **JSON-LD (JSON for Linking Data)**. Standardy schema.org (consortium Google + Yahoo + Microsoft + Yandex). Trzy formaty zapisu: JSON-LD (rekomendowane), Microdata, RDFa. Google parsuje JSON-LD przez `<script type="application/ld+json">`.

**Mechanika:**
- Google Crawler parsuje JSON-LD podczas indeksacji
- Walidacja: https://search.google.com/test/rich-results
- Rich snippets w SERP: gwiazdki (Review), godziny (LocalBusiness), FAQ (FAQPage), breadcrumbs (BreadcrumbList)
- Każdy typ Schema ma swój zestaw wymaganych i opcjonalnych pól

**Kod z projektu:**
```astro
<!-- app/src/components/seo/SchemaLocalBusiness.astro -->
---
import { business } from '@data/business';

const schema = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'ProfessionalService'],  // ⭐ multi-type
  '@id': `${business.url}/#business`,                 // ⭐ identyfikator do referowania w innych schemach
  name: business.legalName,
  telephone: business.contact.phone,
  email: business.contact.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: business.address.street,
    addressLocality: business.address.city,
    postalCode: business.address.postalCode,
    addressCountry: business.address.country,
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: business.geo.latitude,
    longitude: business.geo.longitude,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '08:00',
      closes: '18:00',
    },
  ],
  founder: {
    '@type': 'Person',
    name: business.founder.name,
    hasCredential: {
      '@type': 'EducationalOccupationalCredential',
      identifier: business.certificate,
    },
  },
};
---

<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```

**Inne ważne typy schema:**
- `Service` – per podstrona usługi
- `FAQPage` → `mainEntity: [{Question, Answer}]` – generuje accordion w SERP
- `BreadcrumbList` – ścieżka okruszków pod tytułem
- `Article` / `BlogPosting` – dla bloga
- `Product` / `Offer` – dla e-commerce
- `Review` / `AggregateRating` – gwiazdki

---

### B.3. Open Graph + Twitter Cards

**Po ludzku:** Ładny obrazek + tytuł + opis gdy ktoś wkleja link na Facebooku/LinkedIn/WhatsApp/Slack.

**Definicja techniczna:**
- **Open Graph Protocol** (Facebook, 2010) – `<meta property="og:*">`
- **Twitter Cards** (Twitter/X) – `<meta name="twitter:*">`
- Standard używany przez ~wszystkie social media + Slack/Discord/iMessage do previews

**Wymagane og:**
| Tag | Co znaczy |
|-----|-----------|
| `og:title` | Tytuł kartki |
| `og:description` | Opis |
| `og:image` | URL do obrazka (1200×630 px optimal) |
| `og:url` | Canonical URL strony |
| `og:type` | `website` / `article` / `product` |
| `og:locale` | `pl_PL` |

**Kod z projektu:**
```astro
<!-- app/src/components/seo/SEO.astro -->
<meta property="og:type" content={ogType} />
<meta property="og:site_name" content="Motowycena" />
<meta property="og:title" content={fullTitle} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonicalUrl} />
<meta property="og:image" content={fullOgImage} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="pl_PL" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={fullTitle} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={fullOgImage} />
```

**Generowanie OG images programmatycznie:** Satori (Vercel) – renderuje JSX na SVG → PNG. Można zrobić endpoint `/api/og.png?title=...`.

---

### B.4. Canonical URL

**Po ludzku:** Etykieta "to jest oryginalny adres tej strony" – żeby Google nie traktował duplikatów jako konkurencji.

**Definicja techniczna:** `<link rel="canonical" href="...">` deklaruje preferowany URL dla danej zawartości. Rozwiązuje **duplicate content** – np. gdy ta sama treść jest pod:
- `https://example.com/article`
- `https://example.com/article/`
- `https://example.com/article?utm_source=fb`
- `https://www.example.com/article`

Bez canonical → Google rozdziela PageRank między te warianty. Z canonical → cały PageRank trafia do wskazanego URL.

**Self-referencing canonical:** każda strona ma canonical wskazujący SAMĄ SIEBIE. To NIE jest błąd – to standard.

**Kod z projektu:**
```astro
<!-- app/src/components/seo/SEO.astro -->
---
const {
  canonical = Astro.url.href,  // ⭐ self-referencing domyślnie
} = Astro.props;

// Force trailing slash dla zgodności z trailingSlash: 'always'
const canonicalUrl = canonical.endsWith('/') ? canonical : `${canonical}/`;
---

<link rel="canonical" href={canonicalUrl} />
```

---

### B.5. Sitemap XML

**Po ludzku:** Spis treści strony dla Google – listing wszystkich URL-i z datami ostatniej modyfikacji.

**Definicja techniczna:** XML zgodny z sitemaps.org protokół. URL `/sitemap.xml` (lub indeks `/sitemap-index.xml` linkujący do podsitemapów). Pola:
- `<loc>` – pełny URL
- `<lastmod>` – ISO 8601 (`2026-05-21`)
- `<changefreq>` – `always` / `hourly` / `daily` / `weekly` / `monthly` / `yearly` / `never` (Google to ignoruje od ~2022)
- `<priority>` – `0.0` do `1.0` (Google też ignoruje)

Maksimum 50,000 URL i 50 MB per plik. Powyżej – używamy sitemap index.

**Kod z projektu:**
```js
// app/astro.config.mjs
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.motowycena.pl',  // ⭐ wymagane dla sitemap
  integrations: [
    sitemap({
      changefreq: 'monthly',
      priority: 0.7,
      lastmod: new Date(),
      serialize(item) {
        // Per-URL customization
        if (item.url === 'https://www.motowycena.pl/') {
          item.priority = 1.0;
          item.changefreq = 'weekly';
        } else if (item.url.includes('/wycena-')) {
          item.priority = 0.9;
        }
        return item;
      },
    }),
  ],
});
```

Wynik (`dist/sitemap-0.xml`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.motowycena.pl/</loc>
    <lastmod>2026-05-21T00:00:00Z</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  ...
</urlset>
```

**Submisja:** Google Search Console → Sitemaps → `https://www.motowycena.pl/sitemap-index.xml`

---

### B.6. robots.txt

**Po ludzku:** Drzwi z napisem "tu nie wchodź" dla botów Google.

**Definicja techniczna:** Plain-text plik w root domeny zgodny z **Robots Exclusion Protocol** (RFC 9309 od 2022, wcześniej de-facto standard od 1994). Direktywy dla user-agentów (botów).

**Główne dyrektywy:**
- `User-agent: *` – wszystkie boty
- `User-agent: Googlebot` – tylko Google
- `Disallow: /admin/` – nie indeksuj
- `Allow: /public/` – nadpisuje Disallow
- `Sitemap: https://...` – wskazuje sitemap
- `Crawl-delay: 10` – sekundy między requestami (Google ignoruje)

**Pułapka:** robots.txt blokuje **crawl**, nie indeksację. URL może być w indeksie z pustym snippetem jeśli ktoś go zalinkował. Do blokowania indeksacji → `<meta name="robots" content="noindex">` lub `X-Robots-Tag` HTTP header.

**Kod z projektu:**
```txt
# app/public/robots.txt
User-agent: *
Allow: /

# Blokujemy endpointy API
Disallow: /api/

Sitemap: https://www.motowycena.pl/sitemap-index.xml
```

---

### B.7. Trailing slash & redirect strategy

**Po ludzku:** Ukośnik na końcu adresu (`/kontakt/` vs `/kontakt`) – ważne dla Google, bo to dwa różne URL-e.

**Definicja techniczna:** HTTP traktuje `/kontakt` i `/kontakt/` jako **różne zasoby**. Bez konsystentnej strategii powstaje duplicate content. Dwie szkoły:
1. **Trailing slash always**: `/kontakt/` – konwencja katalogów, klasyczny WordPress
2. **No trailing slash**: `/kontakt` – konwencja stron API/SPA

W każdym wariancie potrzebny jest **301 redirect** drugiego wariantu na pierwszy.

**Kod z projektu:**
```js
// app/astro.config.mjs
export default defineConfig({
  trailingSlash: 'always',  // ⭐ KRYTYCZNE
  build: {
    format: 'directory',  // generuje /kontakt/index.html zamiast /kontakt.html
  },
});
```

**Konsekwencje:**
- `dist/kontakt/index.html` (nie `dist/kontakt.html`)
- Każdy URL musi mieć `/` na końcu w canonical
- Linki wewnętrzne muszą mieć `/`: `<a href="/kontakt/">` (NIE `/kontakt`)
- Niemal każdy serwer (LiteSpeed, nginx, Apache, Cloudflare) auto-redirectuje `/kontakt` → `/kontakt/` z 301

---

### B.8. HTTP redirect codes (301/302/303/307/308)

**Po ludzku:** Różne sposoby powiedzieć "to nie tu, idź gdzie indziej".

**Definicja techniczna:**

| Kod | Nazwa | Cache | Metoda po redirect | Kiedy używać |
|-----|-------|-------|--------------------|--------------|
| **301** | Moved Permanently | Tak | Może zmienić POST→GET | Stała zmiana URL |
| **302** | Found | Nie | Może zmienić POST→GET | Tymczasowo (legacy, unikać) |
| **303** | See Other | Nie | **Zawsze GET** | Po POST → "zobacz wynik tutaj" (PRG pattern) |
| **307** | Temporary Redirect | Nie | Zachowuje metodę | Tymczasowo, force same method |
| **308** | Permanent Redirect | Tak | Zachowuje metodę | Stała zmiana, force same method |

**Kod z projektu:**
```ts
// app/src/pages/api/contact.ts - PRG pattern
function success(wantsJSON: boolean): Response {
  if (wantsJSON) {
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }
  // ⭐ 303 dla no-JS form POST → przekieruj na GET /kontakt/?sent=1
  return new Response(null, {
    status: 303,
    headers: { Location: '/kontakt/?sent=1' },
  });
}
```

**Dlaczego 303 a nie 302:**
- 302 + POST → browser może (legacy) ponowić POST na nowy URL → reload page = duplikat
- 303 → MUSI zmienić na GET → bezpieczny refresh

---

## C. PERFORMANCE & CORE WEB VITALS

### C.1. Largest Contentful Paint (LCP)

**Po ludzku:** Jak szybko ładuje się największa rzecz na ekranie (zwykle hero image lub heading).

**Definicja techniczna:** Czas od `navigationStart` do wyrenderowania największego elementu w viewporcie (image, video, block-level text). Mierzony przez Performance Observer API.

**Cel Google:**
- ✅ Dobre: ≤ 2.5s
- ⚠️ Wymaga poprawy: 2.5s – 4.0s
- ❌ Słabe: > 4.0s

**Co optymalizować:**
1. **Server response time** – TTFB < 600ms (Cloudflare edge to ~50ms)
2. **Render-blocking resources** – inline critical CSS, defer JS
3. **Resource load time** – preload hero image, modern formats (AVIF/WebP)
4. **Client-side rendering** – unikać dużych React trees blokujących main

**Kod z projektu:**
```js
// app/astro.config.mjs
export default defineConfig({
  build: {
    inlineStylesheets: 'auto',  // inline critical CSS dla LCP
  },
  prefetch: {
    prefetchAll: true,           // prefetch wszystkie linki w viewport
    defaultStrategy: 'viewport', // gdy link wejdzie w viewport, prefetch zasobu
  },
  experimental: {
    clientPrerender: true,        // <link rel="speculation"> w Chrome
  },
});
```

```html
<!-- Preload critical resource: -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />
```

---

### C.2. Cumulative Layout Shift (CLS)

**Po ludzku:** Czy elementy strony "skaczą" podczas ładowania (klikasz w jedno, ląduje na innym).

**Definicja techniczna:** Suma wszystkich nieoczekiwanych przesunięć układu (layout shifts) podczas życia strony. Każdy shift to `impact_fraction × distance_fraction`. CLS = suma shiftów.

**Cel:**
- ✅ ≤ 0.1
- ⚠️ 0.1 – 0.25
- ❌ > 0.25

**Główne przyczyny:**
- Brak `width`/`height` na obrazach → image ładuje się i pcha tekst
- Font swap (FOIT/FOUT) – tekst skacze przy zmianie czcionki
- Treść wstawiana dynamicznie (np. cookie banner) bez rezerwacji miejsca
- iframe bez `aspect-ratio`

**Kod z projektu:**
```css
/* app/src/styles/global.css */
img {
  height: auto;
  max-width: 100%;
  /* Zawsze width/height w HTML, ale CSS daje responsive */
}
```

```astro
<!-- Astro <Image /> auto-dodaje width/height -->
<Image src={hero} alt="Hero" width={1200} height={600} />
```

```css
/* Font-display: swap zapobiega FOIT, ale daje FOUT (lekki shift) */
/* Lepsze rozwiązanie - size-adjust matchujący fonty: */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter.woff2') format('woff2');
  font-display: swap;
  size-adjust: 100%;  /* match metric */
}
```

---

### C.3. Interaction to Next Paint (INP)

**Po ludzku:** Jak szybko strona reaguje na kliknięcie/dotyk.

**Definicja techniczna:** Zastąpił FID (First Input Delay) w marcu 2024. Mierzy czas od **input event** (click, tap, keypress) do **next paint** (kolejny render). Bierze pod uwagę WSZYSTKIE interakcje na stronie (nie tylko pierwszą jak FID).

**Cel:**
- ✅ ≤ 200ms
- ⚠️ 200ms – 500ms
- ❌ > 500ms

**Główne przyczyny słabego INP:**
- Duże React trees re-renderujące się po każdej interakcji
- Synchronous JS blokujący main thread (>50ms tasks = Long Tasks)
- Brak `useMemo`/`useCallback` w hot path

**Kod z projektu (jak chronimy INP w Astro):**
```astro
<!-- Wyspy nie renderują się dopóki nie potrzeba -->
<ContactForm client:visible />  <!-- Hydrate dopiero gdy widoczne -->
<WhatsAppButton client:idle />  <!-- Hydrate gdy main thread idle -->
```

```tsx
// React 19 - automatyczny Compiler optymalizuje memoization
// W projekcie używamy uncontrolled inputs (mniej rerenderów):
<input name="email" required />  // <-- bez useState per input
const formData = new FormData(e.currentTarget);  // <-- przy submit
```

---

### C.4. HTTP/2 i HTTP/3 (QUIC)

**Po ludzku:** Nowsze, szybsze protokoły przesyłania danych w internecie.

**Definicja techniczna:**
- **HTTP/1.1** (1997): jedno żądanie per TCP connection, head-of-line blocking
- **HTTP/2** (2015, RFC 7540): multiplexing wielu strumieni na 1 TCP, server push, header compression (HPACK)
- **HTTP/3** (2022, RFC 9114): używa **QUIC** (UDP-based) zamiast TCP – eliminuje head-of-line blocking na warstwie transportowej, szybsze handshake (0-RTT)

**Mechanika QUIC:**
1. Connection migration – ten sam connection mimo zmiany IP (np. WiFi→4G)
2. 0-RTT handshake na drugiej wizycie – pierwszy packet zawiera już request
3. Encryption built-in (zawsze TLS 1.3)
4. Loss recovery per stream – pakiet który zaginie nie blokuje innych strumieni

**Sprawdzenie:**
```bash
curl -I --http3 https://www.motowycena.pl/
# Server: LiteSpeed
# Alt-Svc: h3=":443"; ma=2592000   ← deklaracja HTTP/3 support
```

**Cloudflare Pages**: HTTP/3 włączony domyślnie. Nic do konfiguracji.

---

### C.5. CDN i edge caching

**Po ludzku:** Twoja strona istnieje w kopiach na 200+ serwerach na całym świecie. Klient z Polski dostaje kopię z Warszawy, z USA – z Nowego Jorku.

**Definicja techniczna:** **Content Delivery Network** – sieć geographically distributed reverse proxy. Cloudflare ma ~310 PoP (Points of Presence). Mechanizm:
1. Klient → najbliższy PoP (anycast DNS)
2. PoP sprawdza cache
3. Hit → zwraca z cache (< 50ms)
4. Miss → fetch z origin → cache → serve

**Cache-Control headers:**
- `public, max-age=31536000, immutable` – statyczne zasoby (hashed filenames)
- `public, max-age=3600, must-revalidate` – HTML
- `private, no-cache` – per-user content

**Kod z projektu:**
```txt
# app/public/_headers (Cloudflare Pages syntax)

/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

# Statyczne assets - long cache (immutable - hash w nazwie)
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable
```

**Astro asset hashing:**
```
_astro/index.D5_KbKZ4.js     ← hash = jeśli zmieni się treść, zmieni się hash
_astro/styles.B6Z8aFW2.css   ← long-cache OK, bo URL nigdy się nie zmieni dla danej wersji
```

---

### C.6. Resource hints (preload/prefetch/preconnect)

**Po ludzku:** "Hej przeglądarko, za chwilę będę potrzebował tego pliku – pobierz go już teraz".

**Definicja techniczna:**

| Hint | Kiedy używać | Priorytet |
|------|--------------|-----------|
| `preconnect` | Domena innego origina którą będziemy fetchować (DNS+TCP+TLS handshake) | Mid |
| `dns-prefetch` | Tylko DNS lookup, bez handshake (fallback dla starszych browserów) | Low |
| `preload` | Critical resource potrzebny natychmiast (hero image, główny font) | High |
| `prefetch` | Resource for next navigation (link który user pewnie kliknie) | Low |
| `modulepreload` | JS module który będziemy importować | High |

**Kod z projektu:**
```astro
<!-- Astro auto-generuje prefetch dla linków (config powyżej) -->
<a href="/kontakt/" data-astro-prefetch>Kontakt</a>
<!--                  ^^^^^^^^^^^^^^^^^^ override defaultStrategy per link -->

<!-- Manual hints w SEO.astro: -->
<!-- <link rel="preconnect" href="https://fonts.googleapis.com" /> -->
<!-- Komentarz bo używamy self-hosted fonts - nie potrzeba preconnect -->
```

---

## D. FORMULARZE I BACKEND

### D.1. Progressive Enhancement (PE)

**Po ludzku:** Strona działa bez JavaScript jak zwykła forma POST z 1995 roku. Z JavaScript jest ładniejsza i szybsza.

**Definicja techniczna:** Filozofia projektowania – baseline experience działa na **najsłabszych klientach** (no-JS, screen reader, slow 3G), enhanced experience nadbudowuje dla bogatszych klientów. Przeciwieństwo: **Graceful Degradation** (start od bogatego, degraduj).

**Korzyści PE:**
- Działa dla 1-5% userów z JS off (firmowe firewalls, paranoidalne ustawienia)
- Działa dla **Google crawler** (większość crawlerów nie wykonuje JS dla form submission)
- Działa gdy JS jeszcze nie zhydratował (Time-to-Interactive)
- Działa gdy JS się wywali (network error, ad blocker)
- Lepsza dostępność (screen readers parsują standardowe HTML forms)

**Kod z projektu:**
```tsx
// app/src/components/forms/ContactForm.tsx
export default function ContactForm({ turnstileSiteKey }: Props) {
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();  // ⭐ tylko gdy JS aktywny – bez JS ten handler nie wystartuje
    // ... AJAX submit
  };

  return (
    <form
      action="/api/contact/"   // ⭐ baseline - bez JS ląduje tutaj
      method="POST"            // ⭐ standard HTTP method
      onSubmit={handleSubmit}  // enhanced - tylko z JS
    >
      <input name="email" type="email" required />
      {/* HTML5 required + type validation działa BEZ JS */}
    </form>
  );
}
```

```ts
// Endpoint obsługuje obie ścieżki:
const contentType = request.headers.get('content-type') ?? '';
const wantsJSON = contentType.includes('application/json');

if (wantsJSON) {
  return Response.json({ success: true });  // AJAX
} else {
  return new Response(null, {                // form POST
    status: 303,
    headers: { Location: '/kontakt/?sent=1' },
  });
}
```

---

### D.2. PRG pattern (Post/Redirect/Get)

**Po ludzku:** Po wysłaniu formularza → przekierowanie → strona "Dziękuję". Bez tego, F5 = ponowne wysłanie.

**Definicja techniczna:** Web design pattern (Mike Buffington, 2003) zapobiegający duplicate form submissions. Trzy fazy:
1. **POST** – browser wysyła form data
2. **303 See Other** – serwer redirectuje na URL "wynik"
3. **GET** – browser robi GET nowego URL, pokazuje thank-you

Bez PRG: refresh strony po POST → browser pyta "Confirm Form Resubmission?" i ponawia POST = duplikat.

**Kod z projektu:**
```ts
// app/src/pages/api/contact.ts
function success(wantsJSON: boolean): Response {
  if (wantsJSON) {
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }
  // PRG: 303 → GET /kontakt/?sent=1
  return new Response(null, {
    status: 303,
    headers: { Location: '/kontakt/?sent=1' },
  });
}
```

```astro
<!-- app/src/pages/kontakt.astro -->
---
const sent = Astro.url.searchParams.get('sent') === '1';
---
{sent && (
  <div class="bg-green-50 p-4">
    Dziękuję za wiadomość!
  </div>
)}
```

---

### D.3. MIME types form-data vs JSON

**Po ludzku:** Dwa różne "języki" mówienia z serwerem – jeden dla starych formularzy HTML, drugi dla nowoczesnego AJAX.

**Definicja techniczna:**

| Content-Type | Format ciała | Kto wysyła |
|--------------|--------------|------------|
| `application/x-www-form-urlencoded` | `name=Jan&email=a%40b.pl` | `<form>` POST bez `enctype` |
| `multipart/form-data; boundary=...` | Per-part z `Content-Disposition` | `<form enctype="multipart/form-data">` (uploadowanie plików) |
| `application/json` | `{"name":"Jan","email":"a@b.pl"}` | `fetch()` / `XMLHttpRequest` z JSON body |
| `text/plain` | Plain text | Rzadko, debug |

**Kod z projektu:**
```ts
// app/src/pages/api/contact.ts - obsługa OBYDWU
const contentType = request.headers.get('content-type') ?? '';

let raw: Record<string, unknown>;
if (contentType.includes('application/json')) {
  raw = await request.json();
  // raw = { name: "Jan", email: "a@b.pl", consent: true }
} else {
  const formData = await request.formData();
  raw = Object.fromEntries(formData.entries());
  // raw = { name: "Jan", email: "a@b.pl", consent: "on" }  ← checkbox value
}
```

**Pułapka:** checkbox w form-urlencoded zwraca `"on"`, ale w JSON to `true`. Schema musi obsługiwać oba:
```ts
const schema = z.object({
  consent: z.union([z.literal(true), z.literal('on'), z.literal('true')]),
});
```

---

### D.4. Honeypot anti-bot

**Po ludzku:** Niewidoczne pole formularza. Człowiek go nie widzi, bot wypełnia. Jak wypełnione → bot.

**Definicja techniczna:** Spam detection technique. Field ukryte CSS-em (NIE `display: none` – bo niektóre boty to wykrywają; lepiej **off-screen positioning**). Pole nie ma autocomplete, ma `tabIndex={-1}`, `aria-hidden="true"`. Server odrzuca submit gdy honeypot wypełniony.

**Kod z projektu:**
```tsx
// app/src/components/forms/ContactForm.tsx
<div className="absolute -left-[9999px]" aria-hidden="true">
  <label>
    Strona internetowa
    <input
      type="text"
      name="website"           // ⭐ "website" – nazwa atrakcyjna dla botów
      tabIndex={-1}            // ⭐ klawiatura pominie
      autoComplete="off"       // ⭐ password managers pominą
    />
  </label>
</div>
```

```ts
// Server check
if (data.website) {
  // Bot - udajemy sukces, ale nic nie wysyłamy
  return success(wantsJSON);
}
```

**Schema validation:**
```ts
const schema = z.object({
  // ...
  website: z.string().max(0).optional(),  // ⭐ max 0 znaków = pusty string OR brak
});
```

---

### D.5. Cloudflare Turnstile

**Po ludzku:** Niewidoczny "bramkarz" sprawdzający czy klient to człowiek. Lepszy od reCAPTCHA.

**Definicja techniczna:** **Privacy-first CAPTCHA alternative** od Cloudflare. Używa **Private Access Tokens** (PAT) gdy dostępne (Safari/iOS), fallback do interaktywnego challenge'u. Zero cookies trackingowych. Server-side verification przez API endpoint.

**Mechanika (3-step):**
1. **Client**: `<script src="...turnstile/v0/api.js">` + `<div class="cf-turnstile" data-sitekey="...">`
2. **Submit**: token w form field `cf-turnstile-response`
3. **Server**: POST `https://challenges.cloudflare.com/turnstile/v0/siteverify` z `{secret, response: token, remoteip}`

**Kod z projektu:**
```astro
<!-- app/src/pages/kontakt.astro -->
{turnstileSiteKey && (
  <script
    src="https://challenges.cloudflare.com/turnstile/v0/api.js"
    async
    defer
  />
)}
```

```tsx
// app/src/components/forms/ContactForm.tsx
{turnstileSiteKey && (
  <div
    className="cf-turnstile"
    data-sitekey={turnstileSiteKey}
    data-theme="light"
  />
)}
```

```ts
// app/src/pages/api/contact.ts
async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string | undefined,
): Promise<boolean> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret,
      response: token,
      ...(ip ? { remoteip: ip } : {}),
    }),
  });
  const json = await res.json() as { success: boolean };
  return json.success === true;
}
```

---

### D.6. Zod runtime validation

**Po ludzku:** Sprawdzanie czy dane od użytkownika mają sens, niezależnie od TypeScript (TS znika przy kompilacji).

**Definicja techniczna:** **Schema-first validation library** dla TypeScript. Definiujesz schema → otrzymujesz: 1) walidację runtime, 2) inferowane typy TS. Inspiracja Joi/Yup, ale type-first.

**Kluczowa różnica vs TypeScript:**
- TS types **znikają** przy `tsc` – nie istnieją w runtime
- Zod schema **istnieje w runtime** – sprawdza prawdziwe dane przychodzące z user input / API / DB

**API:**
- `schema.parse(data)` – throws na błąd
- `schema.safeParse(data)` – zwraca `{ success: true, data }` lub `{ success: false, error }`
- `z.infer<typeof schema>` – inferowany TS type

**Kod z projektu:**
```ts
// app/src/pages/api/contact.ts
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().trim().toLowerCase(),  // ⭐ chainable transforms
  phone: z.string().min(9).max(20).trim(),
  message: z.string().min(10).max(2000).trim(),
  consent: z.union([z.literal(true), z.literal('on'), z.literal('true')]),
  website: z.string().max(0).optional(),
  'cf-turnstile-response': z.string().optional(),
});

type ContactPayload = z.infer<typeof schema>;
//   ^? { name: string; email: string; phone: string; message: string; consent: true | 'on' | 'true'; website?: string; ... }

const parsed = schema.safeParse(raw);
if (!parsed.success) {
  return fail(wantsJSON, 'Validation failed', 400, parsed.error.format());
}
const data = parsed.data;  // typed!
```

---

### D.7. Resend API

**Po ludzku:** Listonosz dla maili – serwis który przyjmuje twojego maila przez REST API i dostarcza klientowi.

**Definicja techniczna:** **Transactional email API**. Konkurencja: SendGrid, Postmark, Mailgun. Resend wyróżnia się Developer Experience – clean API, React Email templates, fair pricing (3000 free / mc).

**Wymagane DNS records dla custom domain:**
- `SPF` (TXT): `v=spf1 include:amazonses.com ~all`
- `DKIM` (TXT): klucz publiczny ECDSA/RSA do podpisywania
- `DMARC` (TXT): `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com`
- `MX` (opcjonalnie, dla bounce handling)

**Kod z projektu:**
```ts
// app/src/pages/api/contact.ts
async function sendEmail(data: ContactPayload, ip?: string): Promise<void> {
  const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
  const CONTACT_EMAIL = import.meta.env.CONTACT_EMAIL;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,  // ⭐ Bearer token auth
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Motowycena <noreply@motowycena.pl>',
      to: [CONTACT_EMAIL],
      reply_to: data.email,  // ⭐ klient odpisuje bezpośrednio na maila usera
      subject: `Nowe zapytanie - ${data.name}`,
      html: `<div>...</div>`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend API error ${res.status}`);
  }
}
```

**HTML escaping (zapobiega injection):**
```ts
function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
```

---

## E. BEZPIECZEŃSTWO I PRAWO

### E.1. HTTPS, TLS i certyfikaty

**Po ludzku:** Zielona kłódka w pasku adresu – szyfrowane połączenie.

**Definicja techniczna:** HTTPS = HTTP over TLS (Transport Layer Security). TLS 1.3 (od 2018) – najnowszy standard, 1-RTT handshake. Certyfikat X.509 wystawiany przez **CA (Certificate Authority)**, weryfikowany przez chain of trust do root CA preinstalowanego w OS/browserze.

**Free CA**: Let's Encrypt (od 2015), ZeroSSL, Cloudflare Origin CA.

**Cloudflare Pages**: TLS certyfikat automatycznie z Cloudflare CA. Universal SSL. ECDSA + RSA dual-cert. TLS 1.2 + 1.3.

**Sprawdzenie:**
```bash
openssl s_client -connect motowycena.pl:443 -servername motowycena.pl < /dev/null 2>&1 | head -30
```

---

### E.2. HSTS (Strict-Transport-Security)

**Po ludzku:** Mówi przeglądarce "zawsze łącz się ze mną przez HTTPS, nawet jak ktoś wpisze http://".

**Definicja techniczna:** HTTP header (RFC 6797). Po pierwszym poprawnym połączeniu HTTPS, browser pamięta przez `max-age` sekund i FORCE'uje HTTPS dla wszystkich przyszłych żądań.

**Składnia:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
                                  ↑ rok       ↑ także subdomeny  ↑ Chrome preload list
```

**HSTS Preload list**: hardcoded w Chrome/Firefox/Safari. Domena dodawana jednorazowo przez https://hstspreload.org/. Zaleca się dopiero po stabilnej konfiguracji (usunięcie domeny z preload trwa 6-12 miesięcy).

**Kod z projektu:**
```txt
# app/public/_headers
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

### E.3. Security headers (CSP, X-Frame-Options, etc.)

**Po ludzku:** Lista ograniczeń co przeglądarka MOŻE załadować i wyświetlić.

**Definicja techniczna:** HTTP response headers definiujące polityki bezpieczeństwa.

| Header | Co robi |
|--------|---------|
| `Content-Security-Policy` | Whitelist źródeł: skrypty, style, obrazy, fonty |
| `X-Frame-Options` | `DENY` / `SAMEORIGIN` – clickjacking protection |
| `X-Content-Type-Options: nosniff` | Browser nie zgaduje MIME (XSS prevention) |
| `Referrer-Policy` | Co wysłać w Referer header przy linkach wychodzących |
| `Permissions-Policy` | Wyłączenie API (camera, geolocation, mic) |
| `X-XSS-Protection` | Legacy, ale jeszcze ma efekty w niektórych browserach |

**Kod z projektu:**
```txt
# app/public/_headers
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  X-XSS-Protection: 1; mode=block
```

**CSP (advanced)**:
```
Content-Security-Policy: default-src 'self';
  script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.resend.com;
  frame-src https://challenges.cloudflare.com;
  base-uri 'self';
  form-action 'self';
```

---

### E.4. CORS (Cross-Origin Resource Sharing)

**Po ludzku:** Przeglądarka pyta "czy serwer B pozwala stronie A pobierać od niego dane?". Jak nie pozwala → blocked.

**Definicja techniczna:** Mechanizm browserowy ograniczający fetch między origins. **Same-Origin Policy** to baseline – tylko same protocol + same host + same port mogą się komunikować bez ograniczeń. CORS pozwala server-side wyrazić "OK, ten origin może".

**Preflight request:**
1. Browser robi `OPTIONS /endpoint` z headerami:
   - `Origin: https://example.com`
   - `Access-Control-Request-Method: POST`
   - `Access-Control-Request-Headers: content-type`
2. Server odpowiada:
   - `Access-Control-Allow-Origin: https://example.com`
   - `Access-Control-Allow-Methods: POST, OPTIONS`
   - `Access-Control-Allow-Headers: content-type`
3. Browser robi rzeczywiste POST

**W naszym projekcie**: same-origin (`motowycena.pl` ↔ `motowycena.pl/api/`) – CORS nie potrzebny.

**Gdy potrzebne (np. API publiczne):**
```ts
export const POST: APIRoute = async ({ request }) => {
  return new Response(/* ... */, {
    headers: {
      'Access-Control-Allow-Origin': 'https://allowed-domain.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
};
```

---

### E.5. RODO/GDPR – legal basis i cookies

**Po ludzku:** Europejskie prawo o danych osobowych. Strona musi mieć politykę prywatności, cookies za zgodą, dane bezpiecznie przechowywane.

**Definicja techniczna:** **GDPR (General Data Protection Regulation)** – Regulation (EU) 2016/679, w Polsce **RODO**. Wymagania techniczne dla strony:

1. **Legal basis for processing** (Art. 6) – jedna z:
   - Consent (Art. 6(1)(a)) – świadoma zgoda
   - Contract (Art. 6(1)(b)) – realizacja umowy
   - Legal obligation (Art. 6(1)(c))
   - Vital interests (Art. 6(1)(d))
   - Public task (Art. 6(1)(e))
   - Legitimate interests (Art. 6(1)(f))

2. **Cookies** – PECR / ePrivacy:
   - **Essential cookies** – bez zgody (session, security)
   - **Analytics/Marketing** – wymagana zgoda PRZED ustawieniem

3. **Right to**:
   - Access (Art. 15)
   - Rectification (Art. 16)
   - Erasure / "be forgotten" (Art. 17)
   - Restriction (Art. 18)
   - Portability (Art. 20)
   - Object (Art. 21)

**Co już mamy w projekcie (compliant by design):**
- Cloudflare Web Analytics – **0 cookies**, IP anonimizowany
- Brak Google Analytics (wymagałby cookie consent)
- Brak Google Fonts (self-hosted Inter) – brak cross-origin requests
- Formularz: explicit consent checkbox + polityka prywatności linkowana
- Resend mail nie ustawia tracking pixeli (opcjonalne)

**Kod z projektu:**
```tsx
// Explicit consent checkbox:
<label className="flex items-start gap-2">
  <input type="checkbox" name="consent" required />
  <span>
    Wyrażam zgodę na przetwarzanie moich danych osobowych w celu odpowiedzi
    na zapytanie zgodnie z{' '}
    <a href="/polityka-prywatnosci/">polityką prywatności</a>.
  </span>
</label>
```

---

### E.6. CSRF (Cross-Site Request Forgery)

**Po ludzku:** Atak: złoczyńca podstawia stronę która wysyła POST w Twoim imieniu używając Twoich cookies sesji.

**Definicja techniczna:** Attacker oszukuje user-agent zalogowanego usera do wykonania niechcianej akcji na zaufanym serwisie. **Wymaga**: ofiara zalogowana, akcja wykonalna przez POST (lub GET z side-effectami).

**Czy NASZ formularz jest podatny?** Nie – nie wymaga sesji. Każdy może wysłać POST `/api/contact/`. Honeypot + Turnstile chronią przed botami, ale nie przed CSRF (bo CSRF tutaj nie ma sensu – nie ma zalogowanego usera do oszukania).

**Gdy CSRF ma sens (np. panel admina):**
1. **SameSite cookies**: `Set-Cookie: session=...; SameSite=Lax` – cookies nie wysyłane na cross-site POST
2. **CSRF token**: per-session unique token w form field + cookie. Server porównuje.
3. **Double Submit Cookie**: token w cookie + header X-CSRF-Token. Server porównuje.

**Astro Actions** mają built-in CSRF protection przez origin check.

---

## F. STRATEGIA URL I LINKOWANIE

### F.1. URL slug

**Po ludzku:** Ostatnia część adresu, np. `/wycena-celno-skarbowa/`.

**Definicja techniczna:** Path segment identyfikujący zasób. Konwencje:
- Małe litery
- Myślniki zamiast spacji/podkreślników (Google preferuje `-` nad `_`)
- Bez znaków diakrytycznych (`/wycena-celno-skarbowa/` zamiast `/wycena-celno-skarbówa/`)
- Krótkie ale opisowe – idealne 3-5 słów
- Stabilne – ZMIANA SLUG = utrata pozycji w Google (chyba że 301)

**Kod z projektu:**
```
src/pages/wycena-celno-skarbowa.astro
            └─────────────────────┘
                  to jest slug
URL → /wycena-celno-skarbowa/  (trailing slash bo config)
```

---

### F.2. Internal linking & PageRank flow

**Po ludzku:** Każdy link z jednej strony na drugą przekazuje trochę "siły" SEO.

**Definicja techniczna:** **Internal links** dystrybuują **link equity / link juice** (potoczne nazwy PageRanku). Strony bliżej home (mniej kliknięć) zwykle dziedziczą więcej equity. Strategia:

1. **Hub & Spoke** – główna strona (`hub`) linkuje do specialistycznych (`spokes`), spokes linkują do hub i siebie nawzajem
2. **Topic clusters** – grupy related contentu cross-linkujące
3. **Breadcrumbs** – każda podstrona ma link do parents (also good UX)

**Kod z projektu:**
```astro
<!-- app/src/components/sections/ServicePageTemplate.astro -->
<!-- "Może Cię również zainteresować" - cross-linking między usługami -->
<section>
  <h2>Może Cię również zainteresować</h2>
  {otherServices.map((s) => (
    <a href={serviceUrl(s.slug)}>
      <h3>{s.name}</h3>
      <p>{s.shortDesc}</p>
    </a>
  ))}
</section>
```

```ts
// app/src/data/business.ts - centralna lista linków
export const services = [...] as const;
export function serviceUrl(slug: string): string {
  return `/${slug}/`;
}
```

---

### F.3. Hreflang (multi-language)

**Po ludzku:** Mówi Google "ta strona jest po polsku, jest też wersja po angielsku tu, niemiecku tu".

**Definicja techniczna:** `<link rel="alternate" hreflang="...">` w `<head>` lub w sitemap. Format: `language-region` (ISO 639-1 + ISO 3166-1 alpha-2).

**Reguły:**
- Każda strona musi linkować do SIEBIE (self-referencing hreflang)
- Wszystkie wersje muszą wzajemnie się linkować (bi-directional)
- `x-default` – fallback dla nieznanych języków

**Kod (gdy dodamy EN/DE):**
```astro
<link rel="alternate" hreflang="pl" href="https://www.motowycena.pl/wycena-celno-skarbowa/" />
<link rel="alternate" hreflang="en" href="https://www.motowycena.pl/en/customs-valuation/" />
<link rel="alternate" hreflang="de" href="https://www.motowycena.pl/de/zollbewertung/" />
<link rel="alternate" hreflang="x-default" href="https://www.motowycena.pl/wycena-celno-skarbowa/" />
```

Astro support: `@astrojs/i18n` integration + routing.

---

## G. HOSTING I DEPLOY

### G.1. DNS i propagacja

**Po ludzku:** System tłumaczący `motowycena.pl` na adres IP serwera. Zmiany potrzebują czasu by dotrzeć do wszystkich.

**Definicja techniczna:** **Domain Name System** – hierarchiczna distributed database. Rekord DNS ma **TTL (Time To Live)** w sekundach – jak długo resolver pamięta odpowiedź.

**Główne typy rekordów:**
| Type | Co znaczy |
|------|-----------|
| `A` | IPv4 address |
| `AAAA` | IPv6 address |
| `CNAME` | Alias do innej domeny |
| `MX` | Mail exchange |
| `TXT` | Tekst (SPF, DMARC, weryfikacja) |
| `NS` | Nameservers |
| `CAA` | Które CA mogą wystawić cert |

**Strategia podczas migracji:**
1. **Przed**: TTL 3600 (godzina)
2. **24h przed migracją**: obniżamy TTL do 300 (5 min)
3. **Migration day**: zmieniamy A/CNAME na nowy serwer
4. **Po stabilizacji** (kilka dni): TTL z powrotem na 3600+

**Sprawdzenie:**
```bash
dig motowycena.pl A
# motowycena.pl. 3600 IN A 192.0.2.1
#                 ↑ TTL

# Propagacja globalnie:
# https://dnschecker.org/#A/motowycena.pl
```

---

### G.2. Cloudflare Pages – deploy

**Po ludzku:** Wrzucasz kod do GitHuba, Cloudflare automatycznie buduje i wystawia stronę na 310 serwerach świata.

**Definicja techniczna:** **JAMstack hosting platform** od Cloudflare. Workflow:
1. Connect GitHub repo
2. Cloudflare clone'uje repo
3. Run build command (`npm run build`)
4. Upload `dist/` do Cloudflare edge cache (anycast network)
5. URL `<project>.pages.dev` + custom domain

**Build config:**
```yaml
# Build settings w Cloudflare dashboard
Build command: npm run build
Build output directory: dist
Root directory: app
Environment variables:
  RESEND_API_KEY: ${SECRET}
  CONTACT_EMAIL: biuro@motowycena.pl
```

**Pages Functions** (serverless):
- Endpointy `/api/*` runują na **Cloudflare Workers** (V8 isolates, nie Node.js)
- Cold start: < 5ms (V8 isolates są lżejsze od Lambda containers)
- Limity: 50ms CPU per request (Free), 30s (Paid)
- API: Web Standard (`Request`, `Response`, `fetch`)

**Dla naszego endpointu**: potrzebujemy `@astrojs/cloudflare` adapter:
```bash
npm install @astrojs/cloudflare
```

```js
// astro.config.mjs
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'static',  // domyślnie SSG
  adapter: cloudflare({
    mode: 'directory',  // /functions/* są Workers
  }),
});
```

---

### G.3. Edge runtime vs Node.js runtime

**Po ludzku:** Dwa różne "języki" runtime dla backendowych funkcji. Edge jest szybszy ale ma mniej feature'ów.

**Definicja techniczna:**

| Cecha | Node.js | Edge (V8 isolates) |
|-------|---------|-------------------|
| Implementacja | Node.js (libuv + V8) | V8 isolates (Cloudflare Workers, Deno Deploy) |
| Cold start | 100-500ms | < 5ms |
| Memory | 128 MB - 10 GB | 128 MB |
| CPU time limit | 30s+ | 10-50ms (free), 30s (paid) |
| Node APIs | `fs`, `crypto`, `http`, native modules | TYLKO web standards |
| Globals | `process`, `Buffer`, `__dirname` | `fetch`, `Request`, `Response`, `crypto.subtle` |
| Pakage compat | Wszystko z npm | Tylko isomorphic (no native deps) |

**Kod z projektu działa na Edge** (sprawdź!):
```ts
// app/src/pages/api/contact.ts
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const data = await request.json();              // ✅ web standard
  const res = await fetch('https://api.resend.com/emails', { /* */ });  // ✅
  return new Response(JSON.stringify({...}), {     // ✅
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

**Pułapki Edge:**
- ❌ `import nodemailer` – używa Node `net` socket
- ❌ `import fs` – brak filesystem
- ❌ `process.env.X` – używaj `import.meta.env.X` lub `context.env.X`
- ✅ `fetch()`, `crypto.subtle`, `URL`, `URLSearchParams`, `Headers`, `FormData`

---

### G.4. CI/CD przy migracji

**Po ludzku:** Automatyczna pipeline – commit do gita → build → test → deploy.

**Definicja techniczna:** **Continuous Integration / Continuous Deployment**. W projekcie używamy **Cloudflare Pages Git integration** (zero-config CI). Alternatywy: GitHub Actions, GitLab CI, Vercel.

**Typowy workflow:**
```yaml
# .github/workflows/deploy.yml (jeśli używamy GHA zamiast CF built-in)
name: Deploy

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run check        # tsc + astro check
      - run: npm run build
      - run: npm test              # gdy mamy testy
      # Deploy
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: motowycena
          directory: dist
```

**Preview deploys:**
- Każdy PR → preview URL `<pr-id>.motowycena.pages.dev`
- Main branch → production `motowycena.pl`
- Atomic deploys – rollback jednym klikiem na poprzednią wersję

---

## H. NARZĘDZIA POMIAROWE

### H.1. Lighthouse audit

**Po ludzku:** Google sprawdza Twoją stronę pod 4 kątami: szybkość, dostępność, SEO, "best practices".

**Definicja techniczna:** Open-source tool (Chrome DevTools, CLI, GitHub Action). Symuluje load na Slow 4G + Moto G4 device. Cztery kategorie:

1. **Performance** (40+ metrics): LCP, FCP, TBT, CLS, INP, Speed Index, Time to Interactive
2. **Accessibility**: ARIA, kontrast, alt texts, semantic HTML
3. **Best Practices**: HTTPS, console errors, deprecated APIs
4. **SEO**: meta, robots, structured data, mobile-friendly

**CLI:**
```bash
npm install -g lighthouse
lighthouse https://www.motowycena.pl --view --preset=desktop
```

**CI integration:**
```yaml
- uses: treosh/lighthouse-ci-action@v11
  with:
    urls: |
      https://motowycena.pages.dev/
      https://motowycena.pages.dev/kontakt/
    budgetPath: ./lighthouse-budget.json
```

```json
// lighthouse-budget.json
[{
  "path": "/*",
  "resourceSizes": [
    {"resourceType": "script", "budget": 100},
    {"resourceType": "total", "budget": 400}
  ],
  "timings": [
    {"metric": "interactive", "budget": 3000},
    {"metric": "largest-contentful-paint", "budget": 2500}
  ]
}]
```

---

### H.2. Real User Monitoring (RUM) vs Lab data

**Po ludzku:** Lab = test w sztucznych warunkach. RUM = prawdziwe dane od prawdziwych użytkowników.

**Definicja techniczna:**

| | Lab Data | RUM |
|--|----------|-----|
| Pomiar | Synthetic test (Lighthouse, WebPageTest) | Real users (Performance API) |
| Warunki | Kontrolowane (Slow 4G, fixed device) | Realne (wszystkie devices, sieci) |
| Próba | 1 test | Tysiące userów |
| Reproducible | Tak | Nie |
| Quick feedback | Tak | Wymaga ruchu |

**Google używa RUM przez Chrome User Experience Report (CrUX)** do rankingu Core Web Vitals.

**Cloudflare Web Analytics** (free RUM):
```astro
<!-- app/src/layouts/BaseLayout.astro -->
{cfAnalyticsToken && (
  <script
    defer
    src="https://static.cloudflareinsights.com/beacon.min.js"
    data-cf-beacon={`{"token": "${cfAnalyticsToken}"}`}
  />
)}
```

Mierzy:
- Page views, unique visitors (without cookies)
- Web Vitals (LCP, CLS, INP) per page
- Country, browser, device
- Top pages, top referrers

**Alternatywy RUM**: Plausible, Fathom, Umami, PostHog.

---

## I. CONTENT MANAGEMENT

### I.1. Markdown / MDX

**Po ludzku:** Prosty format pisania tekstu jak w notatniku, ale z formatowaniem.

**Definicja techniczna:**
- **Markdown** – lightweight markup (John Gruber, 2004). Sumarycznie text-to-HTML converter.
- **MDX** – Markdown + JSX. Możesz osadzać React/Astro komponenty w treści.
- **GFM (GitHub Flavored Markdown)** – rozszerzenie: tables, task lists, strikethrough, autolinks

**Astro processing:**
- `.md` → parsowane przez `remark`/`rehype` plugins → HTML
- `.mdx` → to samo + JSX rendering

**Kod z projektu:**
```mdx
---
title: Wycena celno-skarbowa
---

## Czym jest wycena celno-skarbowa?

Wycena to **dokument niezbędny** przy rejestracji pojazdu z zagranicy.

Możesz osadzać komponenty:

import CallToAction from '../../components/CTA.astro';
<CallToAction phone="509146666" />

Albo nawet React islands:

import Counter from '../../components/Counter.tsx';
<Counter client:visible initialValue={0} />
```

---

### I.2. Headless CMS

**Po ludzku:** Panel administracyjny do edycji treści (jak w WordPressie), ale frontend jest osobno.

**Definicja techniczna:** CMS bez wbudowanego frontendu. Treść w content database/files, eksponowana przez API (REST, GraphQL). Frontend pobiera i renderuje.

**Architektury:**
- **Git-based** (TinaCMS, Decap CMS): treści w git, edycja przez UI → commit
- **API-first** (Sanity, Strapi, Payload, Contentful, Hygraph): treści w DB, API
- **Hybrid** (Sanity z GROQ + frontend pobiera at build): build-time SSG z dynamic update

**Porównanie dla motowycena:**

| Opcja | Pro | Con | Cena |
|-------|-----|-----|------|
| **MDX w gicie** | Free, simple, dev-friendly | Klient musi umieć Markdown/git | $0 |
| **TinaCMS** | Visual editing, git-based | Mniej feature'ów niż Sanity | $0 / $39+ mc |
| **Sanity** | Pro-grade, kolaboracja | Cloud-hosted treści | $0 / $99+ mc |
| **Strapi** | Self-hosted, full control | Wymaga utrzymania serwera | $0 (hosting) |
| **Decap CMS** | Free, git-based | Słaby maintenance | $0 |

**Co mamy w projekcie:**
- Content Collections (MDX w gicie) – baseline
- Schema zod definiuje strukturę – CMS-agnostic
- Można podpiąć Tina/Sanity bez przepisywania komponentów

---

## J. NOTACJA SEMVER I ZALEŻNOŚCI

### J.1. Semantic Versioning (SemVer)

**Po ludzku:** Numerowanie wersji "MAJOR.MINOR.PATCH" mówiące co się zmieniło.

**Definicja techniczna:** Semantic Versioning 2.0.0 (semver.org). Format `X.Y.Z`:
- **MAJOR (X)**: breaking changes
- **MINOR (Y)**: new features, backward-compatible
- **PATCH (Z)**: bug fixes, backward-compatible

**Pre-release**: `1.0.0-rc.1`, `1.0.0-beta.2`, `1.0.0-alpha.3`
**Build metadata**: `1.0.0+20130313144700`

**npm version ranges:**
```json
{
  "dependencies": {
    "astro": "^5.0.0",        // ^X.Y.Z = compatible with X (>=5.0.0 <6.0.0)
    "react": "~19.0.0",       // ~X.Y.Z = compatible with X.Y (>=19.0.0 <19.1.0)
    "zod": "3.24.0",          // exact
    "tailwindcss": ">=4.0.0", // any newer
    "typescript": "*"          // any (NIE używaj na produkcji)
  }
}
```

**`package-lock.json`** zamraża dokładne wersje wszystkich tranzytywnych zależności.

---

### J.2. npm vs pnpm vs yarn

**Po ludzku:** Trzy różne narzędzia do tego samego – instalowania paczek.

**Definicja techniczna:**

| | npm | pnpm | yarn 4 (Berry) |
|--|-----|------|----------------|
| Strategia store | `node_modules/` per project | Global store + hardlinks/symlinks | `.yarn/cache` (zero-installs) |
| Disk usage | Wysoka (duplikacja) | Niska (shared store) | Niska |
| Speed | Najwolniejszy | Najszybszy | Pomiędzy |
| Workspaces | Tak (v7+) | Tak (świetne) | Tak (świetne) |
| Lock file | `package-lock.json` | `pnpm-lock.yaml` | `yarn.lock` |

**Projekt używa npm** (zero-config, każdy zna).

---

## Ściągawka – cheatsheet komend

```bash
# Astro dev/build
npm run dev               # localhost:4321
npm run build             # buduje do dist/
npm run preview           # serwuje dist/ lokalnie
npm run check             # tsc + astro check (type-check)

# Astro generate types po zmianie collections
npm run astro sync

# Astro upgrade
npx @astrojs/upgrade

# Test sitemap
curl https://www.motowycena.pl/sitemap-index.xml

# Test schema markup
# https://search.google.com/test/rich-results

# Test PageSpeed
npx lighthouse https://www.motowycena.pl --view

# Sprawdzanie nagłówków
curl -I https://www.motowycena.pl/

# Test edge function (po deploy)
curl -X POST https://www.motowycena.pl/api/contact/ \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","phone":"509000000","message":"Test wiadomosc","consent":true}'

# DNS lookup
dig motowycena.pl A
dig motowycena.pl AAAA
nslookup motowycena.pl

# SSL/TLS test
openssl s_client -connect motowycena.pl:443 -servername motowycena.pl < /dev/null
# Albo: https://www.ssllabs.com/ssltest/

# Sprawdzenie HTTP/3
curl --http3 -I https://www.motowycena.pl/
```
