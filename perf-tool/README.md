# Własne narzędzie do pomiaru performance

**Pytanie:** Czy potrzebujesz AI do mierzenia szybkości strony?
**Odpowiedź:** NIE. To deterministyczna matematyka, nie ML.

AI może pomóc w *interpretacji* wyników i sugerowaniu fix-ów, ale **sam pomiar** to wywołania publicznych API przeglądarki, Chrome DevTools Protocol, Lighthouse albo CrUX API. Własne narzędzie zrobisz w 50-200 liniach kodu, ale nie oznacza to, że odtworzysz całe PageSpeed Insights 1:1. PageSpeed łączy lab audit Lighthouse z field data z Chrome User Experience Report.

## Truth check

| Teza | Status | Dokładniej |
|------|--------|------------|
| Do mierzenia performance nie potrzebujesz AI | Prawda | LCP, CLS, TTFB, zasoby i long taski da się czytać z browser APIs/CDP. |
| AI pomaga w raportach dla klienta | Prawda | LLM jest dobre do tłumaczenia wyników i priorytetyzacji zaleceń, jeśli dasz mu surowe metryki. |
| Lighthouse/PageSpeed/WebPageTest to "to samo" | Uproszczenie | Mają wspólny fundament: Chrome, CDP, trace, Web Performance APIs. Ale scoring, konfiguracje, field data i heurystyki są różne. |
| Lighthouse mierzy pełne Core Web Vitals | Częściowo | LCP i CLS da się mierzyć w labie. INP wymaga realnych interakcji użytkownika; Lighthouse używa TBT jako proxy responsywności. |
| CLS to prosta suma layout shiftów | Fałsz | Obecny CLS bierze największą session window, czyli największą serię shiftów blisko siebie. Skrypt `02` liczy to już w ten sposób. |
| Jeden run wystarczy | Fałsz | Jeden pomiar jest szumem. Używaj minimum 3-9 runów i patrz na medianę/p75. |

## Co tu jest

| Plik | Co robi | Linie kodu |
|------|---------|-----------|
| `01-simple-lighthouse.mjs` | Lighthouse jako biblioteka – pełny raport JSON+HTML | ~60 |
| `02-puppeteer-custom.mjs` | Puppeteer + PerformanceObserver – LCP/CLS/TBT proxy pod kontrolą | ~190 |
| `03-batch-stats.mjs` | Wiele runów + p50/p75/p95 + ocena Google | ~110 |
| `04-compare-sites.mjs` | Porównanie A/B dwóch URL-i obok siebie | ~110 |
| `05-advanced-audit.mjs` | Zaawansowany audit CLI: lab metrics, zasoby, SEO, security, budżety, JSON/MD/HTML | ~900 |
| `budgets.example.json` | Przykładowy performance budget do CI/CD i kontroli regresji | JSON |

## Najważniejsze narzędzie: advanced audit

To jest wersja produkcyjna do codziennej pracy:

```bash
cd perf-tool

# Jeden URL, 5 runów, mobile slow 4G, raport JSON+MD+HTML
npm run audit -- --url https://www.motowycena.pl

# Lokalny preview po buildzie
npm run audit -- --url http://localhost:4321/ --runs 3 --profile mobile-slow4g

# Desktop, bez throttlingu, szybki smoke test
npm run audit -- --url https://www.motowycena.pl --runs 1 --profile no-throttle

# Budżet + exit code do CI
npm run audit -- --url https://www.motowycena.pl --budget budgets.example.json --fail-on-budget

# Kilka URL-i naraz
npm run audit -- --url https://www.motowycena.pl,https://www.motowycena.pl/kontakt/ --runs 3

# Lista profili
npm run audit -- --list-profiles
```

Najprościej na Windows:

```powershell
cd perf-tool

# lokalny serwer z formularzem w przegladarce
npm run server

# albo dwuklik / terminal
server.bat

# zatrzymanie serwera odpalonego w tle
.\stop-server.ps1

# tryb interaktywny: wpisujesz domene, wybierasz profil, dostajesz raport
.\interactive.ps1

# to samo przez plik .bat
interactive.bat

# szybki tryb bez pytan
.\measure.ps1

# inny adres
.\measure.ps1 -Url https://www.motowycena.pl/kontakt/

# od razu otworz najnowszy raport HTML
.\measure.ps1 -Open

# wersja przez plik .bat
measure.bat -Url https://www.motowycena.pl -Open
```

Raport ma sekcję **Po ludzku**. Tam dostajesz zwykłe wyjaśnienie:
- co jest dobre,
- co boli,
- co poprawić najpierw,
- mini-słownik typu `LCP`, `CLS`, `TTFB`, `p75`.

Output ląduje w `reports/<timestamp>/<host>/`:

| Plik | Do czego |
|------|----------|
| `.json` | surowe dane do dalszego przetwarzania, CI, dashboardów |
| `.md` | raport techniczny do przeczytania w repo |
| `.html` | czytelny raport dla klienta/dev teamu |
| `summary.json` | zbiorczy wynik dla wszystkich URL-i |

### Co mierzy `05-advanced-audit.mjs`

| Obszar | Nazwy w kodzie | Skąd dane |
|--------|----------------|-----------|
| Core/lab metrics | `lcp`, `cls`, `fcp`, `ttfb`, `tbtProxy` | `PerformanceObserver`, Navigation Timing, Long Tasks |
| Percentyle | `p50`, `p75`, `p95` | statystyka z wielu runów |
| Sieć | `Network.emulateNetworkConditions` | Chrome DevTools Protocol |
| CPU | `Emulation.setCPUThrottlingRate` | Chrome DevTools Protocol |
| Zasoby | `resources`, `scriptKB`, `imageKB`, `thirdPartyKB` | Resource Timing + CDP `encodedDataLength` |
| LCP element | `lcpElement.selector`, `lcpElement.url` | `largest-contentful-paint` entry |
| CLS źródła | `clsShifts.sources` | `layout-shift` entry sources |
| Długie taski | `longTasks`, `tbtProxy` | Long Tasks API |
| SEO | `title`, `description`, `h1Count`, `canonical`, `jsonLdTypes` | DOM query |
| Security | `hsts`, `csp`, `xContentTypeOptions`, `referrerPolicy` | HTTP response headers |
| Field data | `crux` | opcjonalnie CrUX API, gdy podasz `CRUX_API_KEY` |

### Performance budget

`budgets.example.json` mówi narzędziu: "jeśli p75 LCP przekracza 2500 ms albo JS ma więcej niż 180 KB, traktuj to jako regresję".

Najważniejsze pola:

```json
{
  "metrics": {
    "lcpP75": 2500,
    "clsP75": 0.1,
    "tbtProxyP75": 200
  },
  "resources": {
    "totalTransferKBP75": 750,
    "scriptKBP75": 180,
    "thirdPartyKBP75": 250
  }
}
```

Do pipeline'u:

```bash
npm run audit -- --url https://www.motowycena.pl --budget budgets.example.json --fail-on-budget
```

Jeśli budżet nie przejdzie, proces kończy się kodem `1`, więc GitHub Actions / CI może zablokować deploy.

## Instalacja

```bash
cd perf-tool
npm install     # ~ 1-2 minuty (Chromium pobiera się jako dependency Puppeteera)
```

Puppeteer pobiera własną wersję Chromium (~150 MB) – nie używa twojego Chrome. Dzięki temu wyniki są reprodukowalne (zawsze ta sama wersja).

## Uruchomienie

```bash
# 1. Najprostsze – pełny raport Lighthouse
node 01-simple-lighthouse.mjs https://www.motowycena.pl mobile
# → tworzy report-2026-05-21.html – otwórz w przeglądarce

# 2. Custom metrics z PerformanceObserver
node 02-puppeteer-custom.mjs https://www.motowycena.pl slow4g
# → wypisuje LCP/CLS + TBT proxy + długie zasoby + long tasks

# 3. Statystyki z 9 runów (p50/p75/p95)
node 03-batch-stats.mjs https://www.motowycena.pl 9

# 4. Porównanie stara vs nowa
node 04-compare-sites.mjs https://www.motowycena.pl http://localhost:4321/ 3
```

## Jak to działa – mechanika pod spodem

### Co to jest CDP (Chrome DevTools Protocol)

Chrome ma wbudowany serwer WebSocket który eksponuje **całą funkcjonalność DevTools** jako JSON-RPC API. To fundament automatyzacji i diagnostyki, którego używają między innymi:
- Chrome DevTools (F12)
- Lighthouse / część labowa PageSpeed Insights
- Puppeteer / Playwright
- WebPageTest w scenariuszach opartych o Chrome

Puppeteer to wrapper na CDP. Wszystko co robi Puppeteer, można zrobić surowym CDP.

```js
// Przykład surowego CDP:
const ws = new WebSocket('ws://localhost:9222/devtools/page/ABC123');
ws.send(JSON.stringify({
  id: 1,
  method: 'Network.emulateNetworkConditions',
  params: { offline: false, latency: 400, ... }
}));
```

### PerformanceObserver – źródło wszystkich metryk

Standard W3C. Pozwala nasłuchiwać na zdarzenia performance w przeglądarce:

```js
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(entry.startTime, entry.duration);
  }
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

Duża część metryk opiera się o te same źródła danych: Navigation Timing, Paint Timing, Largest Contentful Paint, Layout Instability, Long Tasks i Event Timing. Lighthouse, web-vitals.js i nasze skrypty czytają z podobnych browser APIs, ale nie zawsze liczą wynik identycznie.

### INP vs TBT – ważny haczyk

Aktualne Core Web Vitals to **LCP, INP i CLS**.

- **LCP**: da się sensownie mierzyć w labie.
- **CLS**: da się mierzyć w labie, ale trzeba liczyć session windows.
- **INP**: w pełni sensowny jest z danych użytkowników, bo wymaga prawdziwych kliknięć, tapnięć i klawiatury.
- **TBT**: metryka labowa z Lighthouse, używana jako proxy dla responsywności. Jeśli TBT spada, często poprawia się też INP, ale to nie jest to samo.

### Throttling – dlaczego ważne

Mierzysz na M2 MacBook Pro z 1 Gbps? **Twoi klienci mają Motorolę za 600 zł i Slow 4G.** Stąd wymuszamy:
- **CPU throttling 4x** – udajemy słabszy procesor (Moto G4)
- **Network throttling Slow 4G** – 1.6 Mbps download, 400ms latency

Bez throttlingu twoja "świetna" strona może bombardować klienta z LCP 8 sekund.

### Dlaczego p75 (a nie średnia)

Google ocenia Core Web Vitals na poziomie **75 percentyla** wizyt/odsłon. Powód:
- Średnia jest podatna na outliers (jeden zły run psuje średnią)
- p75 = "75% userów ma lepiej niż to" – dobra konsumencka metryka
- p95 = "tylko 5% userów ma gorzej" – do alarmów

CrUX (Chrome User Experience Report) – publiczna baza Google z **prawdziwych** danych użytkowników. Możesz odpytać:

```bash
curl -X POST "https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.motowycena.pl","metrics":["largest_contentful_paint"]}'
```

## Kiedy AI faktycznie ma sens

| Zastosowanie | Czy AI? | Co używać |
|--------------|---------|-----------|
| **Pomiar metryk** | ❌ NIE | Browser API + PerformanceObserver |
| **Klasyfikacja wyniku** | ❌ NIE | Statyczne progi Google |
| **Generowanie rekomendacji** | ✅ Może | LLM (np. Claude API z kontekstem metryk) |
| **Wykrywanie wzorców trendów** | ✅ Tak | Time-series anomaly detection (np. Prophet) |
| **Tłumaczenie raportu na "po ludzku"** | ✅ Tak | LLM |
| **Predykcja co poprawić** | ⚠️ Mieszane | Lighthouse już to robi rule-based, lepiej |

**Praktyczne podejście**: zbieraj metryki tradycyjnie, a LLM użyj na końcu do napisania ładnego podsumowania dla klienta.

```js
// Pseudokod:
const metrics = await measurePerformance(url);
const recommendations = await claude.complete({
  prompt: `Strona ma LCP=${metrics.lcp}ms, CLS=${metrics.cls}.
           Napisz dla klienta nietechnicznego co to znaczy i co robić.`,
});
```

## Dalsze kroki – rozbuduj sam

1. **Cron job** – uruchamiaj codziennie, zapisuj do CSV / SQLite / Postgres
2. **Webhook po deploy** – mierz po każdym push do main, porównuj z baseline
3. **Slack/Discord alert** – `if p75_lcp > 2500: notify()`
4. **Grafana dashboard** – wykres metryk w czasie (np. trace przez Cloudflare Tunnel + Grafana)
5. **Lighthouse CI** – istniejące rozwiązanie do CI/CD: https://github.com/GoogleChrome/lighthouse-ci

## Co czytać dalej

- [web.dev/metrics](https://web.dev/articles/metrics) – każda metryka osobno
- [Chrome DevTools Protocol docs](https://chromedevtools.github.io/devtools-protocol/) – CDP API reference
- [Puppeteer API](https://pptr.dev/) – wszystkie metody Puppeteera
- [Lighthouse source](https://github.com/GoogleChrome/lighthouse) – jak robi to Google
- [web-vitals.js](https://github.com/GoogleChrome/web-vitals) – biblioteka do RUM (real-user monitoring) na produkcji
