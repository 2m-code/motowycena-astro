# Performance audit: https://www.motowycena.pl

Profile: `no-throttle` (Current machine / no throttling)
Runs: 3/3 OK
Audited at: 2026-05-21T14:03:25.014Z

Important: `TBT*` is a lab proxy for responsiveness. Official Core Web Vitals responsiveness is `INP` from field/user interaction data.

## Po ludzku

Strona dziala, ale sa 6 rzeczy do poprawy w budzecie.

### Wynik w prostych slowach

- LCP p75: 2630 ms (do poprawy)
- CLS p75: 0.057 (dobrze)
- TTFB p75: 1755 ms (do poprawy)
- TBT* p75: 2 ms (dobrze)
- Transfer p75: 882.4 KB
- Requesty p75: 54

### Co jest dobre

- Strona prawie nie skacze podczas ladowania: CLS 0.057.
- Przegladarka nie jest dlugo blokowana JavaScriptem: TBT* 2 ms.

### Co boli

- lcpP75: 2629.5 / limit 2500 - Najwiekszy element pojawia sie za pozno. Uzytkownik za dlugo patrzy na niepelna strone.
- fcpP75: 2629.5 / limit 1800 - Pierwsza tresc pojawia sie za pozno.
- ttfbP75: 1755.4 / limit 800 - Serwer/CDN za dlugo zwleka z pierwsza odpowiedzia.
- totalTransferKBP75: 882.355 / limit 750 - Strona pobiera za duzo danych.
- fontKBP75: 399.297 / limit 120 - Fonty sa za ciezkie.
- requireMetaDescription: false / limit true - Brakuje opisu strony dla Google.
- minMetaDescriptionLength: 0 / limit 70 - Opis dla Google jest za krotki.
- maxImagesMissingAlt: 1 / limit 0 - Czesc obrazow nie ma alt, czyli opisu dla czytnikow i Google.

### Co poprawic najpierw

- Dodaj meta description: to jest opis pod tytulem w Google. Bez tego Google sam zgaduje opis strony.
- Odchudz fonty: teraz ida za duze pliki fontow (399.3 KB). Najczesciej pomaga mniej krojow, mniej wag i font-display: swap.
- Popraw czas odpowiedzi serwera/CDN: TTFB to 1755 ms. To czas zanim przegladarka dostanie pierwszy bajt HTML.
- Dodaj alt do obrazow: pomaga dostepnosci i daje Google lepszy kontekst obrazkow.
- Najwiekszy pojedynczy zasob w tym pomiarze: image, 133.2 KB. URL: https://www.motowycena.pl/wp-content/uploads/2020/06/car-repair-engine-tnfd.jpg

### Mini-slownik

- LCP = kiedy uzytkownik widzi najwiekszy wazny element strony, zwykle hero, naglowek albo duzy obraz.
- CLS = czy strona skacze podczas ladowania. Nisko znaczy stabilnie.
- TTFB = ile czekamy na pierwszy bajt z serwera. Wysoko znaczy problem z hostingiem, backendem albo CDN.
- TBT* = ile JavaScript blokuje przegladarke w labie. To przyblizenie responsywnosci, nie oficjalny INP.
- p75 = wynik, ktory jest lepszy dla 75% pomiarow. Google patrzy podobnie na dane terenowe.


## Metrics

| Metric | p50 | p75 | p95 | Grade |
|--------|-----|-----|-----|-------|
| LCP | 1073 ms | 2630 ms | 2630 ms | needs-work |
| CLS | 0.022 | 0.057 | 0.057 | good |
| FCP | 1073 ms | 2630 ms | 2630 ms | needs-work |
| TTFB | 569 ms | 1755 ms | 1755 ms | needs-work |
| TBT* | 0 ms | 2 ms | 2 ms | good |
| Transfer | 882.4 KB | 882.4 KB | 882.4 KB |  |
| Requests | 54 | 54 | 54 |  |
| JS | 137.2 KB | 137.2 KB | 137.2 KB |  |
| CSS | 79.4 KB | 79.4 KB | 79.4 KB |  |
| Images | 241.3 KB | 244.9 KB | 244.9 KB |  |
| Fonts | 399.3 KB | 399.3 KB | 399.3 KB |  |
| Third-party | 2 KB | 2 KB | 2 KB |  |

## Budget

Status: **FAIL**

| Status | Category | Check | Actual | Limit | Meaning |
|--------|----------|-------|--------|-------|---------|
| FAIL | metrics | lcpP75 | 2629.5 | 2500 | LCP p75 should stay under the Core Web Vitals good threshold. |
| PASS | metrics | clsP75 | 0.057 | 0.1 | CLS p75 should stay below visible layout shift risk. |
| FAIL | metrics | fcpP75 | 2629.5 | 1800 | FCP p75 controls when users first see content. |
| FAIL | metrics | ttfbP75 | 1755.4 | 800 | TTFB p75 tells whether server/CDN response is slow. |
| PASS | metrics | tbtProxyP75 | 2 | 200 | TBT* p75 is a lab proxy for responsiveness. |
| PASS | metrics | loadP75 | 2408.3 | 5000 | Load event p75 should not drift too high. |
| FAIL | resources | totalTransferKBP75 | 882.355 | 750 | Total transferred KB p75. |
| PASS | resources | scriptKBP75 | 137.182 | 180 | JavaScript transfer KB p75. |
| PASS | resources | stylesheetKBP75 | 79.372 | 100 | CSS transfer KB p75. |
| PASS | resources | imageKBP75 | 244.904 | 450 | Image transfer KB p75. |
| FAIL | resources | fontKBP75 | 399.297 | 120 | Font transfer KB p75. |
| PASS | resources | thirdPartyKBP75 | 2.039 | 250 | Third-party transfer KB p75. |
| PASS | resources | resourceCountP75 | 54 | 70 | Request count p75. |
| PASS | seo | requireTitle | true | true | Document should have a title. |
| PASS | seo | maxTitleLength | 10 | 65 | Title should be concise enough for SERP display. |
| FAIL | seo | requireMetaDescription | false | true | Meta description improves SERP snippet control. |
| WARN | seo | minMetaDescriptionLength | 0 | 70 | Very short descriptions waste SERP space. |
| PASS | seo | maxMetaDescriptionLength | 0 | 170 | Long descriptions may be truncated in SERP. |
| PASS | seo | requireExactlyOneH1 | 1 | 1 | Use exactly one primary H1. |
| PASS | seo | requireCanonical | true | true | Canonical URL helps avoid duplicate indexing. |
| WARN | seo | maxImagesMissingAlt | 1 | 0 | Missing alt hurts accessibility and image SEO. |
| PASS | security | httpsRecommended | true | true | HTTPS recommended. |

## LCP element

```json
{
  "value": 2629.5,
  "renderTime": 2629.5,
  "loadTime": 2171.099999964237,
  "size": 261144,
  "url": "https://www.motowycena.pl/wp-content/uploads/2020/06/black-bmw-m3-coupe-car.png",
  "tagName": "IMG",
  "selector": "div.elementor-widget-wrap.elementor-element-populated > div.elementor-element.elementor-element-880117e:nth-of-type(5) > div.elementor-widget-container > img.attachment-full.size-full",
  "text": null
}
```

## Top resources by transfer

| Type | Size | Duration | Status | URL |
|------|------|----------|--------|-----|
| image | 133.2 KB | 60 ms | 200 | https://www.motowycena.pl/wp-content/uploads/2020/06/car-repair-engine-tnfd.jpg |
| image | 108.1 KB | 248 ms | 200 | https://www.motowycena.pl/wp-content/uploads/2020/06/black-bmw-m3-coupe-car.png |
| font | 80 KB | 139 ms | 200 | https://www.motowycena.pl/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-brands-400.woff2 |
| font | 76.7 KB | 84 ms | 200 | https://www.motowycena.pl/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-solid-900.woff2 |
| font | 39.5 KB | 135 ms | 200 | https://www.motowycena.pl/wp-content/uploads/elementor/google-fonts/fonts/roboto-kfo7cnqeu92fr1me7ksn66agldtyluama3yuba.woff2 |
| script | 29.3 KB | 263 ms | 200 | https://www.motowycena.pl/wp-includes/js/jquery/jquery.min.js?ver=3.7.1 |
| script | 15.4 KB | 426 ms | 200 | https://www.motowycena.pl/wp-content/plugins/elementor/assets/js/frontend-modules.min.js?ver=4.0.9 |
| script | 14.6 KB | 490 ms | 200 | https://www.motowycena.pl/wp-content/plugins/wpforms-lite/assets/js/frontend/wpforms.min.js?ver=1.10.0.5 |
| stylesheet | 12.4 KB | 218 ms | 200 | https://www.motowycena.pl/wp-content/plugins/elementor/assets/lib/font-awesome/css/all.min.css?ver=4.0.9 |
| stylesheet | 12.2 KB | 222 ms | 200 | https://www.motowycena.pl/wp-content/plugins/elementor/assets/lib/font-awesome/css/fontawesome.min.css?ver=5.15.3 |
| script | 10.2 KB | 487 ms | 200 | https://www.motowycena.pl/wp-content/plugins/elementor/assets/js/frontend.min.js?ver=4.0.9 |
| stylesheet | 9.2 KB | 90 ms | 200 | https://www.motowycena.pl/wp-content/themes/astra/assets/css/minified/frontend.min.css?ver=4.13.3 |

## Third-party origins

| Origin | Requests | Transfer |
|--------|----------|----------|
| https://fonts.googleapis.com | 1 | 2 KB |

## SEO snapshot

```json
{
  "finalUrl": "https://www.motowycena.pl/",
  "lang": "pl-PL",
  "title": "Motowycena",
  "titleLength": 10,
  "description": "",
  "descriptionLength": 0,
  "canonical": "https://www.motowycena.pl/",
  "robots": "max-image-preview:large",
  "viewport": "width=device-width, initial-scale=1",
  "h1Count": 1,
  "h1Texts": [
    "Rzeczoznawca Techniki Samochodowej"
  ],
  "imageCount": 1,
  "imagesMissingAlt": 1,
  "internalLinks": 31,
  "externalLinks": 1,
  "jsonLdCount": 0,
  "jsonLdTypes": [],
  "jsonLdErrors": [],
  "domNodes": 353
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
  "permissionsPolicy": true,
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
