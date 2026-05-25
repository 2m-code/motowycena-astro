# Motowycena – Nowa strona (Astro 5 + React 19)

Projekt zastępujący WordPress + Elementor obecnej strony `motowycena.pl`. Zoptymalizowany pod SEO, Core Web Vitals i konwersję. **100% statyczny build** + lekkie React islands dla interaktywności + Cloudflare Pages Functions dla formularza i panelu admina.

## Stack

- **Astro 5** – framework (statyczny build + islands architecture)
- **React 19** – komponenty interaktywne (formularz, mobile menu, cookie banner, WhatsApp)
- **TypeScript 5.7** – type safety
- **Tailwind CSS 4** – styling (utility-first, mały bundle)
- **lucide-react** – ikony SVG
- **Cloudflare Pages Functions** – serverless endpoint formularza i panelu admina (poza Astro buildem)

## Wymagania

- Node.js 20+ (zalecane 22)
- npm 10+ lub pnpm 9+

## Uruchomienie lokalnie

```bash
cd app
npm install
npm run dev
# Otwórz http://localhost:4321
```

Panel admina wymaga lokalnie Cloudflare Pages Functions, więc odpalaj go osobno:

```bash
cp .dev.vars.example .dev.vars
npm run dev:admin
# Otwórz http://127.0.0.1:8788/admin/
```

## Build produkcyjny

```bash
npm run build
npm run preview  # podgląd builda
```

Output: `dist/` – statyczne HTML, gotowe do wrzucenia na dowolny CDN.

## Wyniki performance (aktualnie)

- **16 stron** zbudowanych w ~3-4s
- **Cały dist: ~830 KB**
- **HTML gzipped: ~106 KB** (16 stron, średnio 6-7 KB/strona)
- **Bundle JS per island (gzipped):**
  - ContactForm: ~2 KB
  - CookieBanner: ~0.7 KB
  - MobileMenu: ~2.5 KB
  - WhatsAppButton: ~0.8 KB
  - React runtime: ~58 KB (lazy, tylko gdy hydrowany)
- **LCP na home (estimate):** < 0.5s (pure HTML, system fonts = 0 requests do LCP)
- **Lighthouse Performance:** target 95-100

## Struktura projektu

```
app/
├── functions/                    # ⭐ Cloudflare Pages Functions (POZA Astro)
│   └── api/
│       ├── contact.ts            # serverless endpoint formularza
│       └── admin/                # login, zapis treści, uploady
├── src/
│   ├── components/
│   │   ├── seo/                  # SEO.astro + Schema.org JSON-LD
│   │   ├── layout/               # Header, Footer, MobileMenu, CookieBanner, WhatsAppButton
│   │   ├── sections/             # ServicePageTemplate (DRY dla 11 stron usług)
│   │   └── forms/                # ContactForm (React island, bez zod = 5 KB)
│   ├── content/
│   │   └── config.ts             # Content Collections schemas (gotowe pod blog/case studies/opinie)
│   ├── data/
│   │   └── business.ts           # ⭐ POJEDYNCZE ŹRÓDŁO PRAWDY o firmie
│   ├── layouts/
│   │   └── BaseLayout.astro      # Wspólny HTML, head, header, footer, View Transitions
│   ├── pages/                    # 16 stron - jeden plik = jeden URL
│   │   ├── admin.astro           # panel admina pod /admin/
│   │   ├── index.astro
│   │   ├── kontakt.astro
│   │   ├── realizacje.astro
│   │   ├── polityka-prywatnosci.astro
│   │   ├── rzeczoznawca-ostrow-wielkopolski.astro  # local SEO landing
│   │   ├── biegly-sadowy.astro
│   │   ├── biegly-skarbowy.astro
│   │   ├── doradztwo-zakupowe.astro
│   │   ├── opis-stanu-technicznego.astro
│   │   ├── pojazdy-zabytkowe-2.astro   # ⚠ URL z "-2" celowo
│   │   ├── polisy-ubezpieczeniowe.astro
│   │   ├── pomoc-prawna.astro
│   │   ├── wycena-celno-skarbowa.astro
│   │   ├── wycena-kosztow-naprawy.astro
│   │   ├── wycena-wartosci-pojazdu.astro
│   │   └── zmiany-konstrukcyjne.astro
│   └── styles/
│       └── global.css            # Tailwind + system font stack
├── public/                       # Statyczne (SVG favicony, manifest, robots.txt, _headers)
├── astro.config.mjs              # ⭐ trailing slash, sitemap, View Transitions
├── package.json
└── tsconfig.json
```

## ⭐ Krytyczne ustawienia (NIE ZMIENIAJ bez powodu)

### `astro.config.mjs` – trailing slash

```js
trailingSlash: 'always',
build: { format: 'directory' }
```

To zapewnia że URL `/kontakt/` (z ukośnikiem na końcu) działa **bezpośrednio**, bez 301. Tak samo jak obecna strona WordPress. **Zmiana = utrata pozycji w Google.**

### URL-e w `src/pages/`

16 stron odpowiada 1:1 obecnym URL-om motowycena.pl + dodatkowo `rzeczoznawca-ostrow-wielkopolski` jako local SEO landing. **Nie zmieniaj nazw plików** – każda zmiana to nowy URL = utracone pozycje.

Jedyny "brzydki" URL: `pojazdy-zabytkowe-2.astro` (z sufiksem `-2`). Tak jest w obecnej stronie i tak zostaje.

### `functions/api/contact.ts` i `functions/api/admin/*` – Cloudflare Pages Functions

Endpoint formularza i backend panelu admina działają **poza Astro buildem** jako Cloudflare Pages Functions. Dzięki temu Astro pozostaje **100% statyczny** (brak adaptera SSR), a formularz oraz `/admin/` działają serverless.

## Zmienne środowiskowe

Skopiuj `.env.example` do `.env` (dla local dev) lub ustaw w **Cloudflare Pages → Settings → Environment variables** (dla produkcji):

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx       # wysyłka maila (SECRET)
CONTACT_EMAIL=biuro@motowycena.pl     # odbiorca
MAIL_FROM=Formularz <noreply@motowycena.pl>
TURNSTILE_SECRET_KEY=                 # CF anti-spam (SECRET, opcjonalne)
PUBLIC_TURNSTILE_SITE_KEY=            # public, dla widgeta
PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN=    # public, RODO-friendly analytics
ADMIN_SESSION_SECRET=                 # SECRET, min. 32 znaki dla /admin/
ADMIN_PASSWORD_SHA256=                # hash hasła panelu
ADMIN_UPLOADS_PUBLIC_URL=             # publiczny URL R2 dla uploadów
```

**Bez RESEND_API_KEY** endpoint loguje wiadomość do konsoli (tryb dev). To bezpieczny domyślny stan – nie wysyła maili bez konfiguracji.

Panel admina wymaga także bindingów Cloudflare: `ADMIN_CONTENT` jako KV namespace oraz opcjonalnie `ADMIN_UPLOADS` jako R2 bucket. Szczegóły: [docs/ADMIN-CLOUDFLARE.md](docs/ADMIN-CLOUDFLARE.md).

## Deploy na Cloudflare Pages

1. Wrzuć kod do GitHuba/GitLaba.
2. Cloudflare Dashboard → Pages → Create project → Connect to Git.
3. Konfiguracja build:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `app`
4. Environment variables – dodaj `RESEND_API_KEY`, `CONTACT_EMAIL`, `ADMIN_SESSION_SECRET`, `ADMIN_PASSWORD_SHA256`, etc.
5. Custom domain – po wstępnym teście podpiąć `www.motowycena.pl`.
6. **WAŻNE:** Cloudflare automatycznie znajdzie `functions/api/contact.ts` oraz `functions/api/admin/*` i wdroży je jako workers.

## Edycja treści

### Dane firmy (kontakt, adres, certyfikat)
→ `src/data/business.ts` – **jedno miejsce**, zmiany propagują się do Header, Footer, Schema.org, kontakt, hero.

### Strony usług
→ `src/pages/<slug>.astro` – używają `ServicePageTemplate` z propami:
- `heroLead`, `introParagraph` – tekst hero i intro
- `benefits[]` – lista korzyści
- `processSteps[]` – kroki "Jak to działa" (opc.)
- `faq[]` – pytania i odpowiedzi (opc., generuje schema FAQ)
- `priceRange` – widełki cenowe

### Treści blog/case studies/opinie
→ `src/content/blog/*.mdx`, `src/content/cases/*.mdx`, `src/content/opinions/*.json` – schemas już zdefiniowane w `src/content/config.ts`.

### Panel admina
→ `/admin/` – normalna strona Astro do edycji pól oznaczonych `data-admin-*`. Zapis idzie do Cloudflare KV, a publiczny loader podmienia treści po stronie przeglądarki.

## Performance – co optymalizujemy

| Technika | Status | Korzyść |
|----------|--------|---------|
| Statyczny HTML (zero SSR) | ✅ | LCP < 0.5s |
| System font stack (bez Google Fonts) | ✅ | Zero requests, zero CLS |
| Inline CSS (Astro `inlineStylesheets: auto`) | ✅ | -1 RTT |
| Islands architecture | ✅ | JS tylko gdy potrzeba |
| `client:idle` / `client:visible` | ✅ | Hydratacja po LCP |
| Prefetch viewport links | ✅ | Następna strona w cache |
| View Transitions | ✅ | Smooth nawigacja bez SPA |
| SVG favicony/OG zamiast PNG | ✅ | <500B każdy, bez wielu rozmiarów |
| DNS prefetch Cloudflare | ✅ | -1 RTT na Turnstile |
| `_headers` z immutable cache | ✅ | Powtórne wizyty 0 requests |
| `prefers-reduced-motion` | ✅ | A11y + brak animacji na słabym CPU |

## Checklist przed deploy na produkcję

- [ ] Wszystkie meta description uzupełnione (✅ done)
- [ ] OG images per strona (✅ default SVG, można dodać per-page)
- [ ] Favicon + apple-touch-icon (✅ done jako SVG)
- [ ] Logo SVG w `/public/logo.svg` (✅ placeholder, klient może podmienić)
- [ ] Treści finalne na każdej stronie usługi (✅ szkielet z FAQ + processSteps, klient uzupełnia)
- [ ] Polityka prywatności zatwierdzona przez radcę prawnego (⚠ szablon czeka na akceptację)
- [ ] Test formularza kontaktowego (mail dochodzi) → wymaga RESEND_API_KEY
- [ ] Panel admina: `ADMIN_SESSION_SECRET`, `ADMIN_CONTENT` KV i opcjonalnie `ADMIN_UPLOADS` R2
- [ ] Lighthouse 95+ na każdej stronie
- [ ] Test mobile (iPhone, Android)
- [ ] Cloudflare Turnstile aktywny
- [ ] Wszystkie 16 URL-i zwraca 200 OK

## Status obecny

✅ **Gotowe:**
- Konfiguracja Astro + React + Tailwind + View Transitions
- 16 stron z URL 1:1 z obecnej + local SEO landing Ostrów Wlkp
- Komponenty SEO (meta, OG, Schema LocalBusiness/Service/FAQ/Breadcrumb)
- Layout, Header z menu, Footer
- MobileMenu (React island, client:idle)
- CookieBanner RODO (React island, client:idle)
- Formularz kontaktowy z walidacją (5 KB bundle, bez zod)
- Pływający WhatsApp button
- Endpoint Cloudflare Pages Function (Resend + Turnstile)
- Panel admina pod `/admin/` bez PHP (Astro + Cloudflare Pages Functions)
- Sitemap auto-generowany (priority, changefreq, lastmod)
- robots.txt, manifest, _headers, _redirects
- SVG assety (favicon, logo, OG, apple-touch-icon, icon-192/512)
- System fonts (zero requests)
- Schema FAQ na 9 stronach usług (rich snippets w Google)
- Content Collections (gotowe pod blog/case studies/opinie)

⚠️ **Wymaga uzupełnienia (po wywiadzie z klientem):**
- Finalne treści podstron (obecnie pełnowartościowy szkielet z FAQ)
- Logo i grafiki klienta (zamiast placeholder SVG)
- Realne case studies w `/realizacje/`
- OG images per strona (opcjonalne)
- Integracja Resend (RESEND_API_KEY w Cloudflare)
- Konfiguracja panelu admina w Cloudflare (`ADMIN_SESSION_SECRET`, KV, opcjonalnie R2)
- Polityka prywatności (finalizacja przez radcę prawnego)

📋 **Roadmapa po MVP:**
- Blog (`src/content/blog/*.mdx` + page `/blog/`)
- Kalkulator wyceny (React island)
- FAQ globalne (`/faq/`)
- Cennik (`/cennik/`)
- Kolejne podstrony lokalne (Poznań, Wrocław, Warszawa, Kraków)
- Wersja angielska/niemiecka (Astro i18n routing)

## Dokumentacja strategii

Pełna dokumentacja w `../docs/`:
- [01-AUDYT-SEO.md](../docs/01-AUDYT-SEO.md)
- [02-STACK-DECYZJA.md](../docs/02-STACK-DECYZJA.md)
- [03-URL-MAPPING.md](../docs/03-URL-MAPPING.md)
- [04-PLAN-MIGRACJI.md](../docs/04-PLAN-MIGRACJI.md)
- [05-CHECKLIST.md](../docs/05-CHECKLIST.md)
- [06-SEO-IMPROVEMENTS.md](../docs/06-SEO-IMPROVEMENTS.md)
