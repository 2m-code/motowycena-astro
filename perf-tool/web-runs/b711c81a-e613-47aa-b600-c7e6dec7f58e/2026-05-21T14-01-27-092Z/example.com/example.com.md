# Performance audit: https://example.com

Profile: `no-throttle` (Current machine / no throttling)
Runs: 1/1 OK
Audited at: 2026-05-21T14:01:30.441Z

Important: `TBT*` is a lab proxy for responsiveness. Official Core Web Vitals responsiveness is `INP` from field/user interaction data.

## Po ludzku

Strona dziala, ale sa 2 rzeczy do poprawy w budzecie.

### Wynik w prostych slowach

- LCP p75: 988 ms (dobrze)
- CLS p75: 0.000 (dobrze)
- TTFB p75: 25 ms (dobrze)
- TBT* p75: 0 ms (dobrze)
- Transfer p75: 1.2 KB
- Requesty p75: 2

### Co jest dobre

- Najwiekszy widoczny element strony pojawia sie szybko: 988 ms.
- Strona prawie nie skacze podczas ladowania: CLS 0.000.
- Przegladarka nie jest dlugo blokowana JavaScriptem: TBT* 0 ms.
- Calkowity transfer jest jeszcze rozsadny: 1.2 KB.

### Co boli

- requireMetaDescription: false / limit true - Brakuje opisu strony dla Google.
- requireCanonical: false / limit true - Brakuje canonical URL, czyli informacji ktory adres jest glowna wersja strony.
- minMetaDescriptionLength: 0 / limit 70 - Opis dla Google jest za krotki.

### Co poprawic najpierw

- Dodaj meta description: to jest opis pod tytulem w Google. Bez tego Google sam zgaduje opis strony.
- Najwiekszy pojedynczy zasob w tym pomiarze: image, 0.6 KB. URL: https://example.com/favicon.ico

### Mini-slownik

- LCP = kiedy uzytkownik widzi najwiekszy wazny element strony, zwykle hero, naglowek albo duzy obraz.
- CLS = czy strona skacze podczas ladowania. Nisko znaczy stabilnie.
- TTFB = ile czekamy na pierwszy bajt z serwera. Wysoko znaczy problem z hostingiem, backendem albo CDN.
- TBT* = ile JavaScript blokuje przegladarke w labie. To przyblizenie responsywnosci, nie oficjalny INP.
- p75 = wynik, ktory jest lepszy dla 75% pomiarow. Google patrzy podobnie na dane terenowe.


## Metrics

| Metric | p50 | p75 | p95 | Grade |
|--------|-----|-----|-----|-------|
| LCP | 988 ms | 988 ms | 988 ms | good |
| CLS | 0.000 | 0.000 | 0.000 | good |
| FCP | 988 ms | 988 ms | 988 ms | good |
| TTFB | 25 ms | 25 ms | 25 ms | good |
| TBT* | 0 ms | 0 ms | 0 ms | good |
| Transfer | 1.2 KB | 1.2 KB | 1.2 KB |  |
| Requests | 2 | 2 | 2 |  |
| JS | 0 KB | 0 KB | 0 KB |  |
| CSS | 0 KB | 0 KB | 0 KB |  |
| Images | 0.6 KB | 0.6 KB | 0.6 KB |  |
| Fonts | 0 KB | 0 KB | 0 KB |  |
| Third-party | 0 KB | 0 KB | 0 KB |  |

## Budget

Status: **FAIL**

| Status | Category | Check | Actual | Limit | Meaning |
|--------|----------|-------|--------|-------|---------|
| PASS | metrics | lcpP75 | 988.1 | 2500 | LCP p75 should stay under the Core Web Vitals good threshold. |
| PASS | metrics | clsP75 | 0 | 0.1 | CLS p75 should stay below visible layout shift risk. |
| PASS | metrics | fcpP75 | 988.1 | 1800 | FCP p75 controls when users first see content. |
| PASS | metrics | ttfbP75 | 24.8 | 800 | TTFB p75 tells whether server/CDN response is slow. |
| PASS | metrics | tbtProxyP75 | 0 | 200 | TBT* p75 is a lab proxy for responsiveness. |
| PASS | metrics | loadP75 | 158 | 5000 | Load event p75 should not drift too high. |
| PASS | resources | totalTransferKBP75 | 1.168 | 750 | Total transferred KB p75. |
| PASS | resources | scriptKBP75 | 0 | 180 | JavaScript transfer KB p75. |
| PASS | resources | stylesheetKBP75 | 0 | 100 | CSS transfer KB p75. |
| PASS | resources | imageKBP75 | 0.584 | 450 | Image transfer KB p75. |
| PASS | resources | fontKBP75 | 0 | 120 | Font transfer KB p75. |
| PASS | resources | thirdPartyKBP75 | 0 | 250 | Third-party transfer KB p75. |
| PASS | resources | resourceCountP75 | 2 | 70 | Request count p75. |
| PASS | seo | requireTitle | true | true | Document should have a title. |
| PASS | seo | maxTitleLength | 14 | 65 | Title should be concise enough for SERP display. |
| FAIL | seo | requireMetaDescription | false | true | Meta description improves SERP snippet control. |
| WARN | seo | minMetaDescriptionLength | 0 | 70 | Very short descriptions waste SERP space. |
| PASS | seo | maxMetaDescriptionLength | 0 | 170 | Long descriptions may be truncated in SERP. |
| PASS | seo | requireExactlyOneH1 | 1 | 1 | Use exactly one primary H1. |
| FAIL | seo | requireCanonical | false | true | Canonical URL helps avoid duplicate indexing. |
| PASS | seo | maxImagesMissingAlt | 0 | 0 | Missing alt hurts accessibility and image SEO. |
| PASS | security | httpsRecommended | true | true | HTTPS recommended. |

## LCP element

```json
{
  "value": 988.1000000238419,
  "renderTime": 988.1000000238419,
  "loadTime": 0,
  "size": 15644,
  "url": null,
  "tagName": "P",
  "selector": "html > body > div > p:nth-of-type(1)",
  "text": "This domain is for use in documentation examples without needing permission. Avoid use in operations."
}
```

## Top resources by transfer

| Type | Size | Duration | Status | URL |
|------|------|----------|--------|-----|
| image | 0.6 KB | 34 ms | 404 | https://example.com/favicon.ico |

## Third-party origins

| Origin | Requests | Transfer |
|--------|----------|----------|


## SEO snapshot

```json
{
  "finalUrl": "https://example.com/",
  "lang": "en",
  "title": "Example Domain",
  "titleLength": 14,
  "description": "",
  "descriptionLength": 0,
  "canonical": "",
  "robots": "",
  "viewport": "width=device-width, initial-scale=1",
  "h1Count": 1,
  "h1Texts": [
    "Example Domain"
  ],
  "imageCount": 0,
  "imagesMissingAlt": 0,
  "internalLinks": 0,
  "externalLinks": 1,
  "jsonLdCount": 0,
  "jsonLdTypes": [],
  "jsonLdErrors": [],
  "domNodes": 11
}
```

## Security headers

```json
{
  "https": true,
  "hsts": false,
  "csp": false,
  "xContentTypeOptions": false,
  "referrerPolicy": false,
  "permissionsPolicy": false,
  "clickjackingProtection": false,
  "compression": "br",
  "cacheControl": ""
}
```

## CrUX field data

```json
{
  "status": "not requested"
}
```
