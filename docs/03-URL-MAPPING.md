# Mapa URL – strategia 1:1 (zero ryzyka SEO)

## Zasada główna

**ZACHOWUJEMY WSZYSTKIE 15 URL-i DOKŁADNIE TAKIE JAKIE SĄ.**

To najbezpieczniejsza strategia migracji. Skoro Google już zna te URL-e (z lastmod sprzed 2-4 lat), zmiana czegokolwiek = ryzyko utraty pozycji.

## Tabela mapowania (stary URL → nowy URL)

| Stary URL (WordPress) | Nowy URL (Astro) | Zmiana | Komentarz |
|----------------------|------------------|--------|-----------|
| `/` | `/` | – | Strona główna |
| `/realizacje/` | `/realizacje/` | – | Z trailing slash |
| `/kontakt/` | `/kontakt/` | – | |
| `/wycena-kosztow-naprawy/` | `/wycena-kosztow-naprawy/` | – | Główna usługa |
| `/wycena-wartosci-pojazdu/` | `/wycena-wartosci-pojazdu/` | – | Główna usługa |
| `/opis-stanu-technicznego/` | `/opis-stanu-technicznego/` | – | Główna usługa |
| `/wycena-celno-skarbowa/` | `/wycena-celno-skarbowa/` | – | Główna usługa |
| `/doradztwo-zakupowe/` | `/doradztwo-zakupowe/` | – | Główna usługa |
| `/polityka-prywatnosci/` | `/polityka-prywatnosci/` | – | |
| `/pojazdy-zabytkowe-2/` ⚠️ | `/pojazdy-zabytkowe-2/` | – | **NIE ruszamy** mimo brzydkiego `-2` |
| `/zmiany-konstrukcyjne/` | `/zmiany-konstrukcyjne/` | – | |
| `/pomoc-prawna/` | `/pomoc-prawna/` | – | |
| `/polisy-ubezpieczeniowe/` | `/polisy-ubezpieczeniowe/` | – | |
| `/biegly-skarbowy/` | `/biegly-skarbowy/` | – | Dochodowa nisza |
| `/biegly-sadowy/` | `/biegly-sadowy/` | – | Dochodowa nisza |

**Zmian: 0**
**Redirectów 301 wymaganych: 0**
**Ryzyko utraty pozycji z powodu URL: 0%**

## Konfiguracja Astro pod trailing slash

WordPress używa **trailing slash** (`/kontakt/` z `/` na końcu). Musimy to zachować w Astro:

### `astro.config.mjs`
```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.motowycena.pl',
  trailingSlash: 'always',           // <-- KRYTYCZNE!
  build: {
    format: 'directory',              // generuje /kontakt/index.html zamiast /kontakt.html
  },
});
```

Bez tej konfiguracji Astro wygeneruje `/kontakt` (bez slasha) → Google dostanie 301 z `/kontakt/` → `/kontakt` → utrata sygnałów rankingowych.

## Dodatkowe URL-e do dodania (nowe, bez wpływu na SEO)

Po migracji warto dodać te strony (Google je zaindeksuje jako nowe, nie konkurują ze starymi):

| Nowy URL | Cel | Priorytet |
|----------|-----|-----------|
| `/blog/` | Index bloga (SEO-driven content marketing) | P1 |
| `/blog/[slug]/` | Pojedyncze artykuły | P1 |
| `/faq/` | Często zadawane pytania (rich snippet) | P1 |
| `/cennik/` | Cennik usług (frazy "ile kosztuje wycena") | P1 |
| `/o-mnie/` | Strona o rzeczoznawcy | P0 |
| `/opinie/` | Opinie klientów (social proof + schema) | P1 |
| `/rzeczoznawca-poznan/` | Local SEO | P2 |
| `/rzeczoznawca-wroclaw/` | Local SEO | P2 |
| `/rzeczoznawca-warszawa/` | Local SEO | P2 |
| `/rzeczoznawca-krakow/` | Local SEO | P2 |
| `/kalkulator-wyceny/` | Kalkulator online (conversion booster) | P0 |

## Trailing slash – test po wdrożeniu

Po deployu **MUSI** zwracać 200 OK (nie 301):

```bash
# Test każdego URL-a
curl -sI https://www.motowycena.pl/kontakt/ | grep -i "HTTP/"
# Oczekiwane: HTTP/2 200

# Test bez slash → powinien 301 NA wersję z slash
curl -sI https://www.motowycena.pl/kontakt | grep -i -E "HTTP|location"
# Oczekiwane: HTTP/2 301 + Location: /kontakt/
```

## Backlinki – sprawdź przed migracją

Przed deployem zrób eksport backlinków z:
- Google Search Console → Linki → Top linkujące witryny
- Ahrefs Free Backlink Checker (3 linki za darmo)
- Semrush Backlink Analytics (trial)

Każdy URL który ma backlinki MUSI nadal działać. Jeśli zachowujemy 1:1 – ten warunek jest spełniony automatycznie.

## Co z `wp-admin`, `wp-login`, feed?

Te URL-e WordPress są specyficzne dla CMS i Google ich nie indeksuje (robots.txt blokuje). Po migracji **przestają istnieć** – to bezpieczne, nie wpływa na SEO.

Stare URL-e do **bezpiecznego usunięcia** (Google ich nie zna):
- `/wp-admin/`
- `/wp-login.php`
- `/feed/`
- `/wp-json/*`
- `/?p=123` (numeryczne ID postów – nikt nie linkuje)

## Final sitemap dla nowej strony

Po migracji wygenerujemy nowy sitemap zawierający:
- 15 starych URL-i (z aktualizowanym `lastmod`)
- ~10 nowych URL-i (blog, FAQ, cennik, lokalne)

Plik: `https://www.motowycena.pl/sitemap-index.xml` (auto przez `@astrojs/sitemap`)

Po deployu zgłaszamy w GSC: **Sitemaps → Add new sitemap → sitemap-index.xml**
