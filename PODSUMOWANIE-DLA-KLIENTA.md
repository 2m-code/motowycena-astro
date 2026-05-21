# Motowycena.pl – Plan przebudowy (executive summary)

**Dla:** Rafał Pelczar, Motowycena
**Cel:** Nowa, szybsza, lepiej widoczna w Google strona – **bez utraty obecnych pozycji**

---

## 🎯 W skrócie (60 sekund czytania)

Twoja obecna strona oparta jest na WordPress + Elementor (Astra theme). Działa, ale ma **poważne braki SEO** (brak meta opisów, brak schema, brak Open Graph) które ograniczają widoczność w Google.

**Nasza propozycja:** przepisanie strony na **Astro 5 + React 19** – nowoczesny, błyskawicznie szybki stack zoptymalizowany pod Google.

**Najważniejsze:**
- ✅ **Wszystkie 15 obecnych adresów URL pozostaje BEZ ZMIAN** → zero ryzyka utraty pozycji
- ✅ **Pełne SEO od zera**: meta tagi, schema markup, Open Graph, FAQ structured data
- ✅ **Strona 5-10x szybsza** (Lighthouse 95+ vs obecnie ~60)
- ✅ **Nowoczesny design** + element konwersyjne (kalkulator, formularze, WhatsApp)
- ✅ **Hosting: 0 zł** (Cloudflare Pages – darmowy, globalny CDN)

---

## 📊 Co konkretnie poprawiamy

| Element | Dziś | Po migracji |
|---------|------|-------------|
| Meta description | brak na 15/15 stron | unikalna na każdej |
| Schema markup | brak | LocalBusiness, Service, FAQ, Person |
| Open Graph (FB/LinkedIn share) | brak | pełny zestaw |
| H1 nagłówki | brak na 8/15 stron | unikalny H1 na każdej |
| Lighthouse Performance | ~60 | 95+ |
| LCP (szybkość ładowania) | ~3-4s | <1s |
| Core Web Vitals | nieznane | zielone |
| Mobile UX | OK | sticky WhatsApp + kalkulator |
| Formularz | tylko email | + walidacja + anti-spam + auto-odpowiedź |
| Hosting | LiteSpeed (Polska) | Cloudflare globalny CDN |

---

## 🔒 Jak zabezpieczamy SEO przed utratą

1. **Zachowujemy 100% adresów URL** – żadnych przekierowań
2. **Budujemy na osobnej subdomenie** (staging) – Google nie widzi w czasie budowy
3. **Backup obecnej strony** przed jakimkolwiek dotknięciem
4. **Wdrożenie w nocy** (2:00) – minimum ruchu
5. **Plan B: rollback w 15 minut** jeśli coś pójdzie nie tak
6. **Monitoring 24/7 przez 30 dni** po wdrożeniu

**Realne ryzyko utraty pozycji: <5%** (znacznie mniejsze niż typowa migracja, bo obecne SEO i tak jest słabe – jest co poprawiać, mało co tracić).

---

## 📅 Timeline

| Tydzień | Co się dzieje | Twoje zaangażowanie |
|---------|---------------|---------------------|
| 0 | Dostępy, backupy, audyt | 30 min – przekazanie haseł |
| 1 | Setup projektu, design systemu | – |
| 2 | Budowa wszystkich 15 podstron | 2-3h – konsultacja treści |
| 3 | Testy, optymalizacja, akceptacja | 2h – akceptacja na staging |
| 3 (noc) | Deployment (przełączenie domeny) | – (śpisz) |
| 4-12 | Monitoring i optymalizacja | – (raport co tydzień) |

**Razem: 3-4 tygodnie do wdrożenia, 90 dni pełnej stabilizacji.**

---

## 💰 Co dostajesz w cenie

- ✅ Pełna analiza i audyt SEO obecnej strony
- ✅ Nowa strona zbudowana od zera (Astro 5 + React 19)
- ✅ Wszystkie 15 obecnych podstron + 5 nowych (`/o-mnie/`, `/faq/`, `/cennik/`, `/opinie/`, `/kalkulator/`)
- ✅ Schema markup na każdej stronie
- ✅ Sitemap.xml + robots.txt + manifest
- ✅ Formularz kontaktowy z anty-spamem (Cloudflare Turnstile)
- ✅ Pływający WhatsApp button
- ✅ Cookie banner zgodny z RODO
- ✅ Setup Cloudflare Pages (hosting darmowy)
- ✅ Setup Cloudflare Web Analytics (darmowe, RODO-friendly)
- ✅ Konfiguracja Google Search Console
- ✅ Submit sitemap do Google + Bing
- ✅ Backup obecnej strony (90 dni archiwum)
- ✅ Dokumentacja jak edytować treści w przyszłości
- ✅ 30 dni wsparcia po wdrożeniu

---

## 🚀 Co możemy dodać później (poza zakresem)

- **Kalkulator szacunkowy** wyceny online (konwersja +30%)
- **Blog SEO** (2-4 artykuły/mc → ruch organiczny w 3-6 mies.)
- **Strefa klienta** (logowanie, pobieranie ekspertyz PDF)
- **Płatności online** (Stripe/Przelewy24 – BLIK)
- **Booking online** (Cal.com – rezerwacja terminu)
- **Wersja angielska/niemiecka** (emigranci wracający z UK/DE)
- **Podstrony lokalne** (Rzeczoznawca Poznań/Wrocław/Warszawa…)

---

## ✅ Decyzja

Mam **dwa pytania** do Ciebie:

1. **Czy ruszamy z tym planem?** Jeśli tak – proszę o dostępy z dokumentu `docs/05-CHECKLIST.md`.

2. **Czy oprócz core'u chcesz dodać coś z listy "później" już teraz?** (kalkulator i blog mocno polecam – to konwersja i ruch).

Po Twoim "tak" – startuję ze scaffoldem projektu i w tydzień masz pierwszą wersję na staging do oglądania.

---

**Pełna dokumentacja** w folderze `docs/`:
- [01-AUDYT-SEO.md](docs/01-AUDYT-SEO.md) – co znalazłem
- [02-STACK-DECYZJA.md](docs/02-STACK-DECYZJA.md) – dlaczego Astro
- [03-URL-MAPPING.md](docs/03-URL-MAPPING.md) – mapa adresów
- [04-PLAN-MIGRACJI.md](docs/04-PLAN-MIGRACJI.md) – dzień po dniu
- [05-CHECKLIST.md](docs/05-CHECKLIST.md) – do odhaczania
- [06-SEO-IMPROVEMENTS.md](docs/06-SEO-IMPROVEMENTS.md) – co poprawiamy w SEO
