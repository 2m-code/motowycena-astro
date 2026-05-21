# Pełna checklista migracji – odhaczaj jak idziesz

## ☐ FAZA 0: Przed dotknięciem czegokolwiek

### Dostępy
- [ ] Google Search Console – dodany jako "Owner" lub min. "Full user"
- [ ] Google Analytics – dostęp (jeśli klient ma)
- [ ] Hosting WordPress – FTP/SFTP/SSH lub cPanel
- [ ] Panel DNS – Cloudflare / OVH / domeny.tv / inny
- [ ] Skrzynka biuro@motowycena.pl – dostęp do odbioru testowych formularzy
- [ ] WordPress wp-admin – dostęp Admin

### Backup
- [ ] Backup plików WP (cały folder public_html) → archiwum lokalne
- [ ] Backup bazy danych WP → plik .sql lokalnie
- [ ] Eksport plików media z `/wp-content/uploads/`
- [ ] Screenshoty wszystkich 15 podstron (Full Page, desktop + mobile)
- [ ] Zrzut konfiguracji DNS (wszystkie rekordy)

### Inwentaryzacja
- [ ] Eksport URL-i z GSC: `Coverage → Valid → Export`
- [ ] Eksport top 100 fraz z GSC: `Performance → Queries → Export`
- [ ] Crawl Screaming Frog – pełny raport (15 URL-i)
- [ ] Test PageSpeed Insights na 5 reprezentatywnych podstronach (baseline)
- [ ] Test Mobile-Friendly na 5 podstronach
- [ ] Eksport backlinków (GSC → Links → External)

### Setup nowego środowiska
- [ ] Konto Cloudflare (jeśli klient nie ma)
- [ ] Cloudflare Pages – nowy projekt
- [ ] Repository git (GitHub/GitLab)
- [ ] Subdomena `staging.motowycena.pl` skierowana na CF Pages
- [ ] Cloudflare Access – Basic Auth na staging
- [ ] `robots.txt` na staging: `User-agent: *\nDisallow: /`
- [ ] Meta noindex globalnie na staging

---

## ☐ FAZA 1: Budowa (Tygodnie 1-2)

### Setup projektu Astro
- [ ] `npm create astro@latest motowycena-new`
- [ ] `npx astro add react tailwind sitemap mdx`
- [ ] `npm install zod react-hook-form lucide-react`
- [ ] Konfiguracja `trailingSlash: 'always'`
- [ ] Konfiguracja `site: 'https://www.motowycena.pl'`
- [ ] TypeScript strict mode
- [ ] Setup shadcn/ui

### SEO foundation
- [ ] Komponent `<SEO>` w `src/components/seo/SEO.astro`
- [ ] Komponent `<SchemaLocalBusiness>` (na każdej stronie)
- [ ] Komponent `<SchemaService>` (na stronach usług)
- [ ] Komponent `<SchemaPerson>` (rzeczoznawca)
- [ ] Komponent `<SchemaFAQ>` (na stronach z FAQ)
- [ ] Komponent `<Breadcrumbs>` + `<SchemaBreadcrumb>`
- [ ] Globalna konfiguracja `manifest.webmanifest` (PWA)
- [ ] Favicon + apple-touch-icon (wszystkie rozmiary)

### Wszystkie 15 stron
- [ ] `/` (home)
- [ ] `/realizacje/`
- [ ] `/kontakt/`
- [ ] `/wycena-kosztow-naprawy/`
- [ ] `/wycena-wartosci-pojazdu/`
- [ ] `/opis-stanu-technicznego/`
- [ ] `/wycena-celno-skarbowa/`
- [ ] `/doradztwo-zakupowe/`
- [ ] `/polityka-prywatnosci/`
- [ ] `/pojazdy-zabytkowe-2/` (URL ZACHOWANY z `-2`)
- [ ] `/zmiany-konstrukcyjne/`
- [ ] `/pomoc-prawna/`
- [ ] `/polisy-ubezpieczeniowe/`
- [ ] `/biegly-skarbowy/`
- [ ] `/biegly-sadowy/`

### Per strona checklist SEO
- [ ] Unikalny `<title>` (max 60 znaków, z keyword)
- [ ] Unikalny `<meta name="description">` (140-160 znaków, z CTA)
- [ ] OG image (1200x630px, JPG/PNG)
- [ ] OG title + description
- [ ] Twitter card (`summary_large_image`)
- [ ] Canonical link (self-referencing)
- [ ] H1 z głównym keyword
- [ ] H2/H3 z related keywords
- [ ] Min. 600 słów treści
- [ ] Min. 3 internal links
- [ ] Wszystkie obrazy z `alt`
- [ ] Wszystkie obrazy w WebP/AVIF + fallback
- [ ] Lazy loading na obrazach poniżej viewport
- [ ] Schema markup (Service/LocalBusiness)
- [ ] FAQ accordion (gdzie pasuje) + Schema FAQPage
- [ ] CTA na końcu strony

### Komponenty interaktywne (React islands)
- [ ] Formularz kontaktowy z walidacją zod
- [ ] Mobile menu (burger)
- [ ] Pływający WhatsApp button
- [ ] Cookie banner (RODO)
- [ ] Slider opinii klientów
- [ ] Kalkulator wstępnej wyceny

### Backend / API
- [ ] Endpoint `POST /api/contact` (Astro endpoint)
- [ ] Integracja Resend (lub SMTP klienta)
- [ ] Cloudflare Turnstile (anti-spam)
- [ ] Rate limiting (5 req/min/IP)
- [ ] Honeypot field (anti-bot)
- [ ] Walidacja serwerowa (zod)
- [ ] Log każdego zapytania (do CSV/DB)

---

## ☐ FAZA 2: Pre-deploy testy (Tydzień 3)

### Performance
- [ ] Lighthouse Performance ≥ 95 na każdej stronie
- [ ] LCP < 2.5s na 3G
- [ ] CLS < 0.1
- [ ] INP < 200ms
- [ ] First Contentful Paint < 1.5s
- [ ] Total bundle JS < 100 KB (gzip) na większości stron
- [ ] Brak render-blocking scripts

### SEO
- [ ] Lighthouse SEO = 100 na każdej stronie
- [ ] Wszystkie meta description unikalne
- [ ] Wszystkie title tags unikalne
- [ ] Każda strona ma jeden i tylko jeden H1
- [ ] Schema validuje się w Rich Results Test
- [ ] Sitemap.xml generuje się i listuje wszystkie strony
- [ ] robots.txt na produkcję (`Allow: /`, sitemap)

### Dostępność
- [ ] Lighthouse Accessibility ≥ 95
- [ ] Kontrast tekstu ≥ 4.5:1
- [ ] Wszystkie obrazy z alt
- [ ] Formularze z label
- [ ] Nawigacja klawiaturą działa
- [ ] Focus states widoczne

### Cross-browser
- [ ] Chrome (desktop + mobile)
- [ ] Firefox
- [ ] Safari (macOS + iOS)
- [ ] Edge
- [ ] Samsung Internet (Android)

### Funkcjonalność
- [ ] Formularz wysyła testowy mail
- [ ] WhatsApp button otwiera czat
- [ ] Telefon (`tel:`) działa na mobile
- [ ] Mail (`mailto:`) działa
- [ ] Wszystkie linki wewnętrzne 200 OK
- [ ] Brak linków na 404
- [ ] Hreflang (jeśli używamy multilang)

---

## ☐ FAZA 3: D-Day deployment

### Pre-deploy (15 min)
- [ ] Finalny backup WP
- [ ] DNS TTL → 300s
- [ ] Klient powiadomiony o oknie wdrożenia

### Deploy (30 min)
- [ ] Production build Astro: `astro build`
- [ ] Deploy na Cloudflare Pages (production environment)
- [ ] Test wszystkich 15 URL-i przez Cloudflare Pages URL
- [ ] Status każdego URL: 200 OK
- [ ] Test schema na Rich Results Test (3 reprezentatywne strony)

### DNS switch (10 min)
- [ ] Backup DNS records (kopia tekstowa)
- [ ] Zmiana `A` record `motowycena.pl` → CF Pages
- [ ] Zmiana `CNAME` `www.motowycena.pl` → CF Pages
- [ ] Test propagacji DNS (dnschecker.org)
- [ ] Test z 5 lokalizacji geograficznych

### Post-deploy (45 min)
- [ ] Cloudflare WAF aktywny
- [ ] HTTPS certyfikat aktywny (CF Universal SSL)
- [ ] HSTS włączony
- [ ] Cache rules ustawione (static assets na 1 rok)
- [ ] Robots.txt usuwa `Disallow: /`
- [ ] Meta noindex usunięte ze wszystkich stron
- [ ] Submit sitemap do GSC
- [ ] URL Inspection top 10 stron → "Request Indexing"
- [ ] Bing Webmaster Tools – submit sitemap
- [ ] Email do klienta: "wdrożone"

---

## ☐ FAZA 4: Monitoring post-deploy

### Codziennie (pierwszy tydzień)
- [ ] GSC Coverage: czy nowe strony są indexed
- [ ] GSC Performance: clicks + impressions trend
- [ ] Uptime (UptimeRobot, BetterStack)
- [ ] Cloudflare Analytics: ruch ogólny
- [ ] Email box: testowe formularze działają
- [ ] Top 5 fraz: pozycja w Google (ręcznie)

### Co tydzień (tygodnie 2-12)
- [ ] Raport pozycji top 20 fraz
- [ ] Raport ruchu organic
- [ ] Raport konwersji (form submissions)
- [ ] Core Web Vitals (GSC + PageSpeed Insights)
- [ ] Crawl errors w GSC

### Po 30 dniach
- [ ] Pełny crawl Screaming Frog (porównanie z baseline)
- [ ] Audyt linków przychodzących (broken backlinks?)
- [ ] Optymalizacja stron które mają najgorszy CTR
- [ ] Update treści które tracą pozycję

### Po 90 dniach
- [ ] Pełny raport ROI dla klienta
- [ ] Porównanie metryk: przed/po
- [ ] Plan rozwoju (blog, content marketing, link building)
