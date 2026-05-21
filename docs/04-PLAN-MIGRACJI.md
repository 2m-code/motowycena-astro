# Plan migracji – krok po kroku

## Założenia

- Czas trwania: **3-4 tygodnie** (zależnie od dostępności klienta do konsultacji treści)
- Downtime: **0 minut** (rolling deployment przez DNS)
- Ryzyko utraty pozycji: **<5%**
- Plan B: pełny rollback w <15 minut

---

## ETAP 0: Przygotowanie (Tydzień 0, dni 1-3)

### Wymagane dostępy od klienta

| Dostęp | Po co | Krytyczność |
|--------|-------|------------|
| Google Search Console (właściciel) | Monitoring migracji | 🔴 MUST |
| Google Analytics (jeśli ma) | Baseline ruchu | 🟠 Mocno zalecane |
| Hosting WordPress (FTP/cPanel) | Backup + 301 fallback | 🔴 MUST |
| DNS (Cloudflare/OVH/inny rejestr) | Przełączenie domeny | 🔴 MUST |
| Logo, zdjęcia, dokumenty firmowe | Treść nowej strony | 🟠 Wymagane |
| Skan certyfikatu RS001771 | Wzmocnienie zaufania | 🟢 Nice to have |

### Inwentaryzacja PRZED jakimkolwiek dotykiem

```
✅ Pełny backup WordPress (pliki + DB)
✅ Eksport z GSC: wszystkie URL-e + top 100 fraz
✅ Crawl Screaming Frog (darmowy do 500 URL, mamy 15)
   → eksport: meta, h1, h2, alt, internal links
✅ Screenshot każdej z 15 podstron (referencja wizualna)
✅ Test obecnej szybkości: PageSpeed Insights
   → notuj LCP, FID, CLS, INP
✅ Test mobile-friendly: Google Mobile-Friendly Test
✅ Eksport backlinków (Ahrefs Free / GSC)
```

### Setup nowego środowiska

```bash
# Repository
git init
npm create astro@latest motowycena-new
cd motowycena-new

# React + Tailwind + integracje
npx astro add react tailwind sitemap mdx

# Dodatkowe
npm install zod react-hook-form lucide-react
npm install -D @types/node
```

### Deploy preview na subdomenę

- Setup: `staging.motowycena.pl` (nowy serwer, np. Cloudflare Pages)
- **OBOWIĄZKOWO**: robots.txt z `Disallow: /` na staging
- **OBOWIĄZKOWO**: `<meta name="robots" content="noindex,nofollow">` na każdej stronie
- **OBOWIĄZKOWO**: Basic Auth (login/hasło) – Cloudflare Access za darmo

Bez tych zabezpieczeń Google zaindeksuje staging i powstanie duplicate content.

---

## ETAP 1: Budowa nowej strony (Tygodnie 1-2)

### Komponenty bazowe (pierwszy tydzień)

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.astro          # nagłówek z menu + CTA WhatsApp
│   │   ├── Footer.astro          # stopka + sitemap + dane firmy
│   │   ├── MobileMenu.tsx        # React island – burger menu
│   │   └── WhatsAppButton.tsx    # React island – pływający button
│   ├── sections/
│   │   ├── Hero.astro            # sekcja hero z CTA
│   │   ├── Services.astro        # grid usług
│   │   ├── Trust.astro           # certyfikaty, liczby
│   │   ├── Testimonials.tsx      # slider opinii (React)
│   │   ├── FAQ.astro             # accordion (CSS-only)
│   │   └── ContactSection.astro  # adres + mapa + form
│   ├── seo/
│   │   ├── SEO.astro             # meta + OG + canonical
│   │   ├── SchemaLocalBusiness.astro
│   │   ├── SchemaService.astro
│   │   ├── SchemaPerson.astro
│   │   └── SchemaFAQ.astro
│   └── forms/
│       ├── ContactForm.tsx       # React island
│       ├── PriceCalculator.tsx   # React island
│       └── BookingForm.tsx       # React island
├── content/
│   ├── services/                 # MDX/MD opisy usług
│   ├── blog/                     # MDX artykuły bloga
│   └── opinions/                 # Opinie klientów
├── layouts/
│   └── BaseLayout.astro          # wspólny layout
├── pages/
│   ├── index.astro
│   ├── kontakt.astro
│   ├── realizacje.astro
│   ├── wycena-kosztow-naprawy.astro
│   ├── wycena-wartosci-pojazdu.astro
│   ├── opis-stanu-technicznego.astro
│   ├── wycena-celno-skarbowa.astro
│   ├── doradztwo-zakupowe.astro
│   ├── pojazdy-zabytkowe-2.astro  # ! zachowujemy URL
│   ├── zmiany-konstrukcyjne.astro
│   ├── pomoc-prawna.astro
│   ├── polisy-ubezpieczeniowe.astro
│   ├── biegly-skarbowy.astro
│   ├── biegly-sadowy.astro
│   ├── polityka-prywatnosci.astro
│   └── api/
│       └── contact.ts            # endpoint formularza
└── styles/
    └── global.css                 # Tailwind base + custom
```

### Migracja treści (drugi tydzień)

Treści **przepisujemy z poprawkami**, nie kopiujemy 1:1. Cel: dłuższe, bogatsze treści (+30-50% słów), z naturalnym keyword research.

Per strona:
- **Min. 600-800 słów** unikalnej treści
- **H1** z głównym keyword
- **H2/H3** ze wsparciem (related keywords)
- **Listy + tabele** (Google to lubi)
- **Internal links** do powiązanych usług (3-5 na stronie)
- **CTA** (przycisk kontaktu) na końcu + sticky
- **FAQ accordion** z 3-5 pytaniami na stronie usługi

### SEO foundation per strona

Każda strona dostaje:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import SchemaService from '../components/seo/SchemaService.astro';

const meta = {
  title: 'Wycena celno-skarbowa pojazdu – Rzeczoznawca certyfikowany | Motowycena',
  description: 'Profesjonalna wycena celno-skarbowa pojazdów sprowadzanych z zagranicy. Certyfikowany rzeczoznawca, akceptacja w US, szybki termin. Sprawdź ofertę.',
  ogImage: '/og/wycena-celno-skarbowa.jpg',
  canonical: 'https://www.motowycena.pl/wycena-celno-skarbowa/',
};
---
<BaseLayout meta={meta}>
  <SchemaService
    name="Wycena celno-skarbowa pojazdu"
    description="..."
    provider="Motowycena - Rafał Pelczar"
    areaServed="PL"
  />
  <!-- treść strony -->
</BaseLayout>
```

---

## ETAP 2: Testowanie (Tydzień 3, dni 1-3)

### Checklist pre-deploy

```
✅ Lighthouse Performance ≥ 95 (każda strona)
✅ Lighthouse SEO = 100 (każda strona)
✅ Lighthouse Accessibility ≥ 95
✅ Lighthouse Best Practices ≥ 95
✅ Mobile-Friendly Test ✓ (Google)
✅ Rich Results Test ✓ (schema markup waliduje się)
✅ Cross-browser: Chrome, Firefox, Safari, Edge
✅ Mobile: iPhone, Android (przynajmniej 2 urządzenia)
✅ Wszystkie linki wewnętrzne działają (Screaming Frog)
✅ Wszystkie obrazy ładują się + mają alt
✅ Formularz kontaktowy → testowe wysłanie → mail dochodzi
✅ Formularz – test spam (Cloudflare Turnstile blokuje boty)
✅ WhatsApp button → otwiera czat
✅ Sitemap.xml generuje się poprawnie
✅ robots.txt allows all (po przeniesieniu z stagingu!)
✅ Wszystkie 15 starych URL-i odpowiadają 200 OK
✅ HTTPS bez błędów certyfikatu
✅ Brak konsoli błędów JS w przeglądarce
✅ Web Vitals real-user: CLS<0.1, LCP<2.5s, INP<200ms
```

### Akceptacja klienta

Klient akceptuje:
- Treść każdej strony
- Wygląd (designt)
- Dane kontaktowe (telefon, mail, adres)
- Logo, zdjęcia
- Politykę prywatności (aktualizacja pod RODO)

---

## ETAP 3: Wdrożenie (Tydzień 3, dzień 4 – D-Day)

### Plan godzinowy D-Day

**Wykonujemy w nocy (np. 02:00-04:00)** – wtedy ruch jest minimalny.

| Godzina | Co | Kto | Czas |
|---------|-----|-----|------|
| 01:30 | Finalny backup starej WP (pliki + DB) | Dev | 15 min |
| 01:45 | Snapshot DNS records (zrzut ekranu) | Dev | 5 min |
| 02:00 | DNS TTL → 300s (z domyślnych 3600s) | Dev | 5 min |
| 02:05 | Czekamy 60 min aż TTL spadnie globalnie | – | 60 min |
| 03:05 | Deploy production build Astro do Cloudflare Pages | Dev | 10 min |
| 03:15 | Test wszystkich 15 URL-i: 200 OK | Dev | 10 min |
| 03:25 | Przełączenie DNS: A/CNAME → Cloudflare Pages | Dev | 5 min |
| 03:30 | DNS propagacja: test z różnych lokalizacji (dnschecker.org) | Dev | 10 min |
| 03:40 | Wgrywam fallback `.htaccess` na starym hostingu z 301 wszystkim do nowej domeny – **na wypadek gdyby DNS nie wyłączył starego serwera** | Dev | 10 min |
| 03:50 | Aktywuję Cloudflare WAF + DDoS protection | Dev | 5 min |
| 03:55 | Usuwam Basic Auth ze stagingu | Dev | 2 min |
| 03:57 | Usuwam meta noindex ze stagingu | Dev | 3 min |
| 04:00 | Submit nowego sitemap do Google Search Console | Dev | 5 min |
| 04:05 | URL Inspection top 5 stron → "Request Indexing" | Dev | 15 min |
| 04:20 | Submit do Bing Webmaster Tools | Dev | 10 min |
| 04:30 | Smoke test: home + kontakt + 3 losowe usługi | Dev | 15 min |
| 04:45 | Email do klienta: "wdrożone, sprawdź" | – | – |

### Procedura rollback (gdyby coś poszło źle)

```
1. DNS rollback: przełączenie A/CNAME spowrotem na stary hosting
   → propagacja w 5-10 min (bo TTL=300s)
2. Stara strona WP nadal istnieje (nic nie usuwaliśmy)
3. Klient ma mail "rollback wykonany, analizujemy problem"
```

---

## ETAP 4: Post-mortem i monitoring (Tygodnie 4-12)

### Tydzień 4 (D+1 do D+7)

**Codzienna kontrola:**

```
🕗 Rano:
   - GSC → Coverage → Indexed pages (czy rosną?)
   - GSC → Performance → Clicks/Impressions (vs baseline)
   - GSC → Core Web Vitals → status
   - Cloudflare Analytics → ruch ogólny
   - Uptimerobot → uptime 100%

🕖 Wieczorem:
   - Ręczna kontrola top 10 fraz w Google (czy strona widoczna)
   - Sprawdzenie mailboxa biuro@motowycena.pl (czy formularze działają)
```

### Tydzień 4-8 – stabilizacja

- **NORMA**: 10-20% spadek ruchu w pierwszych 2-3 tygodniach (Google przeindeksowuje)
- **OK**: wahania pozycji top 20 fraz o ±5 pozycji
- **ALARM**: spadek >30% ruchu przez >2 tygodnie → analiza

### Tydzień 8-12 – beneficja

W tym okresie powinno być widać efekty:
- ↑ Impressions w GSC (więcej wyświetleń w wynikach)
- ↑ Average position (lepsze pozycje)
- ↑ CTR (dzięki meta descriptions)
- ↑ Pages per session (lepsza nawigacja)
- ↓ Bounce rate (lepszy design)

---

## Komunikacja z klientem

### Co klient widzi

- **Tydzień 0**: prezentacja planu (ten dokument)
- **Tydzień 2**: pierwsza wersja na staging (do uwag)
- **Tydzień 3**: druga wersja na staging (do akceptacji)
- **Tydzień 3 D-Day**: deployment
- **Tydzień 4-8**: raport tygodniowy (PDF z metrykami)
- **Tydzień 12**: raport końcowy z porównaniem przed/po

### Co klient ma robić

- Tydzień 0: dostarczyć dostępy + dane firmy
- Tydzień 1-2: dostarczyć treści/zdjęcia (jeśli chce nowe)
- Tydzień 2-3: akceptacja designu + treści
- Tydzień 4+: zbieranie opinii klientów (do osadzenia na stronie)
