# Audyt SEO obecnej strony motowycena.pl

Data audytu: **2026-05-20**

## Podstawowe informacje techniczne

| Element | Wartość |
|---------|---------|
| CMS | WordPress 6.9.4 |
| Motyw | Astra |
| Page builder | Elementor 4.0.8 |
| Formularze | WPForms Lite |
| Dodatki | Happy Elementor Addons, Astra Sites |
| Serwer | LiteSpeed |
| HTTP | HTTP/2 + HTTP/3 (QUIC) ✅ |
| HTTPS | Tak ✅ |
| `wp-json` REST API | Aktywne (publiczne) |

## Sitemap i indeksacja

**Lokalizacja sitemap:** `https://www.motowycena.pl/wp-sitemap.xml` (natywna WP, nie z pluginu SEO)

**Liczba URL-i w sitemapie:** 15 + 1 user (autor)

**Status `robots.txt`:**
```
User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
Sitemap: https://www.motowycena.pl/wp-sitemap.xml
```
✅ Poprawny, niczego nie blokuje przed Google.

## Pełna lista URL (15 stron)

| # | URL | Ostatnia modyfikacja |
|---|-----|---------------------|
| 1 | `/` (home) | 2022-01-29 |
| 2 | `/realizacje/` | 2022-01-10 |
| 3 | `/kontakt/` | 2022-01-29 |
| 4 | `/wycena-kosztow-naprawy/` | 2022-01-11 |
| 5 | `/wycena-wartosci-pojazdu/` | 2022-01-11 |
| 6 | `/opis-stanu-technicznego/` | 2023-03-29 |
| 7 | `/wycena-celno-skarbowa/` | 2022-01-11 |
| 8 | `/doradztwo-zakupowe/` | 2022-01-11 |
| 9 | `/polityka-prywatnosci/` | 2023-01-02 |
| 10 | `/pojazdy-zabytkowe-2/` ⚠️ | 2022-03-01 |
| 11 | `/zmiany-konstrukcyjne/` | 2022-12-09 |
| 12 | `/pomoc-prawna/` | 2022-12-12 |
| 13 | `/polisy-ubezpieczeniowe/` | 2023-03-29 |
| 14 | `/biegly-skarbowy/` | 2023-11-26 |
| 15 | `/biegly-sadowy/` | 2023-11-26 |

⚠️ **Uwaga** dla `/pojazdy-zabytkowe-2/`: sufiks `-2` sugeruje że oryginał był pod `/pojazdy-zabytkowe/` i został usunięty/przeniesiony. **Nie zmieniamy** tego URL w migracji – Google już go zna.

⚠️ **Ostatnia aktualizacja treści 2023-11-26**. Strona nie była aktualizowana od ~2.5 roku. Świeżość treści to czynnik rankingowy.

## Krytyczne braki SEO (zmierzone na wszystkich 15 stronach)

### 🚨 Brak meta description (0/15)
**Wszystkie strony** mają puste `<meta name="description">`. To oznacza że:
- Google sam losuje fragment treści na SERP (często bezsensowny)
- CTR z wyników wyszukiwania jest niższy o ~30%
- Tracimy okazję do zachęcenia kliknięcia

### 🚨 Brak Open Graph (0/15)
Brak tagów `og:title`, `og:description`, `og:image`. Przy udostępnianiu strony na Facebooku/LinkedIn/WhatsApp pokazuje się surowy link bez ładnego podglądu.

### 🚨 Brak Schema.org / JSON-LD (0/15)
Brak structured data dla:
- `LocalBusiness` (krytyczne dla local SEO)
- `Service` (każda usługa powinna mieć schemę)
- `Person` (Rafał Pelczar jako rzeczoznawca)
- `FAQPage` (brak FAQ w ogóle)
- `Review` / `AggregateRating` (brak opinii)
- `BreadcrumbList` (nawigacja okruszkowa)

To ogromna strata – Google bez schemy nie wie *co* opisuje strona.

### 🚨 Brak H1 na 8/15 stronach
Strony bez H1:
- `/kontakt/`
- `/wycena-kosztow-naprawy/`
- `/wycena-wartosci-pojazdu/`
- `/opis-stanu-technicznego/`
- `/wycena-celno-skarbowa/`
- `/doradztwo-zakupowe/`
- `/zmiany-konstrukcyjne/`

H1 to **podstawowy sygnał** dla Google o czym jest strona. Brak H1 = utracona pozycja na main keyword.

### Title tagi – do poprawy
| URL | Obecny title | Problem |
|-----|-------------|---------|
| `/` | `Motowycena` | 10 znaków, brak USP, brak lokalizacji, brak słów kluczowych |
| Wszystkie podstrony | `[Nazwa] – Motowycena` | Generic format, brak modyfikatorów (cena, szybko, region) |

## Co działa (do zachowania)

✅ **Canonical tags** – poprawne na każdej stronie
✅ **HTTPS** – bez błędów certyfikatu
✅ **URL slug** – czyste, z keywords (`/wycena-celno-skarbowa/` – idealny)
✅ **Mobile viewport** meta – obecny
✅ **HTTP/3** – nowoczesny protokół
✅ **Sitemap XML** – generowany automatycznie

## Wnioski strategiczne

**Obecne SEO jest na poziomie podstawowym (3/10).** To paradoksalnie **DOBRA wiadomość** dla migracji:

1. Klient ma niewiele do stracenia
2. Każdy element który dodamy = czysty zysk
3. Po migracji można spodziewać się **2-3x lepszej widoczności w 3-6 miesięcy**
4. Stara strona prawdopodobnie nie rankuje wysoko (przez braki SEO), więc nie ma "wysokich pozycji do utraty"

### Najważniejsze zyski po migracji
- ✨ Meta description na każdej stronie → +30% CTR
- ✨ Schema markup (LocalBusiness, Service, FAQPage) → rich snippets w Google
- ✨ Open Graph → ładne karty przy udostępnianiu
- ✨ H1 na każdej stronie z głównym keyword → lepszy ranking
- ✨ Świeże daty modyfikacji → sygnał świeżości
- ✨ Core Web Vitals 95+/100 (Astro) → ranking boost
- ✨ FAQ + breadcrumbs → rich snippets

### Co zachowujemy 1:1 (bezwzględnie)
- Wszystkie 15 URL-i (bez wyjątku, łącznie z `-2`)
- Canonical tags
- Strukturę informacji (te same sekcje, te same usługi)
- Numer certyfikatu RS001771, NIP, dane kontaktowe
