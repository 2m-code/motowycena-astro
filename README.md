# Motowycena.pl – Projekt klonowania i ulepszenia

Klient: **Rafał Pelczar – Rzeczoznawca Techniki Samochodowej** (RS001771)
Domena: https://www.motowycena.pl/
Data analizy: 2026-05-20

## Cel projektu

Przepisać stronę klienta na nowoczesny stack (React-based) **bez utraty pozycji SEO** i z **drastyczną poprawą widoczności w Google**.

## Dokumenty w tym folderze

- [`docs/01-AUDYT-SEO.md`](docs/01-AUDYT-SEO.md) – pełny audyt obecnej strony, co działa, co nie
- [`docs/02-STACK-DECYZJA.md`](docs/02-STACK-DECYZJA.md) – dlaczego Astro 5 + React 19, a nie Next.js
- [`docs/03-URL-MAPPING.md`](docs/03-URL-MAPPING.md) – mapa URL stary → nowy (1:1, zero redirectów)
- [`docs/04-PLAN-MIGRACJI.md`](docs/04-PLAN-MIGRACJI.md) – krok po kroku, dzień po dniu
- [`docs/05-CHECKLIST.md`](docs/05-CHECKLIST.md) – pełna lista zadań przed/po wdrożeniu
- [`docs/06-SEO-IMPROVEMENTS.md`](docs/06-SEO-IMPROVEMENTS.md) – konkretne ulepszenia SEO które wdrożymy

## TL;DR – decyzja

**Stack:** Astro 5 + React 19 (islands) + TypeScript + Tailwind 4 + shadcn/ui
**Strategia URL:** zachowujemy 1:1 (15/15 URL-i bez zmian) → ZERO redirectów = ZERO ryzyka SEO
**Hosting:** Cloudflare Pages (darmowy, globalny CDN, lepszy od obecnego LiteSpeed)
**Czas:** 3-4 tygodnie do wdrożenia
**Ryzyko utraty pozycji:** **<5%** (znikome – obecne SEO jest tak słabe, że tylko poprawiamy)
