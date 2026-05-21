# Wybór stacka technologicznego

## Decyzja: **Astro 5 + React 19 (islands)**

Po analizie potrzeb biznesowych klienta i charakterystyki strony, najlepszym wyborem jest **Astro 5 z React-owymi wyspami interaktywności**.

## Dlaczego nie Next.js 16

Next.js 16 to świetny framework, ale dla strony motowycena.pl jest **overkill**:

| Aspekt | Next.js 16 | Astro 5 |
|--------|-----------|---------|
| JavaScript w przeglądarce | 80-120 KB minimum | **0 KB domyślnie** |
| Lighthouse Performance (out-of-box) | 75-90 | **95-100** |
| LCP (Largest Contentful Paint) | 1.5-3s | **<1s** |
| Core Web Vitals (sygnał Google) | Dobre | **Najlepsze** |
| Złożoność dla 15 stron | Wysoka | Niska |
| Czas budowy | Wolniejszy | Szybszy |
| Hosting | Wymaga Node (Vercel) | Statyczny (każdy CDN) |
| Cena hostingu | $0-20/mc | **$0** (Cloudflare Pages) |
| Krzywa uczenia dla utrzymującego | Stroma | Łagodna |
| SEO out-of-the-box | Dobre | **Najlepsze** |

## Dlaczego Astro 5 jest IDEALNY dla tego projektu

### 1. Strona jest w 95% statyczna
Treści typu "Wycena celno-skarbowa", "Pojazdy zabytkowe", "Pomoc prawna" **nie zmieniają się dynamicznie**. Astro generuje czysty HTML w build time → Google to uwielbia.

### 2. Islands Architecture = najlepsze z obu światów
Tylko te elementy które wymagają interaktywności renderują się jako React:
- 🏝️ Kalkulator wyceny (React + react-hook-form)
- 🏝️ Formularz kontaktowy (React + zod validation)
- 🏝️ Pływający przycisk WhatsApp
- 🏝️ Cookie banner
- 🏝️ Slider opinii klientów

Reszta strony to czysty, błyskawiczny HTML/CSS. **Każdy bajt JS jest świadomą decyzją.**

### 3. Najlepsze Core Web Vitals na rynku
Google od 2021 oficjalnie używa Core Web Vitals jako czynnika rankingowego. Astro wygrywa tu z każdym frameworkiem React-based.

### 4. Content Collections – idealne pod blog
Astro ma wbudowane Content Collections (MDX + TypeScript). Gdy klient zechce blog, dodajemy folder `src/content/blog/` i każdy plik `.mdx` to artykuł. Z auto-generowanym sitemap, OG image, schema BlogPosting.

### 5. View Transitions API
Astro 5 wspiera natywnie View Transitions – płynne przejścia między podstronami bez SPA. Wygląda jak nowoczesny app, ale to nadal statyczny HTML (SEO-friendly).

### 6. Można wpinać dowolny framework
Jeśli klient kiedyś zechce panel klienta lub bardziej interaktywne komponenty, można dorzucić **Solid, Svelte, Vue lub React** – Astro obsługuje wszystko.

### 7. Łatwy upgrade do SSR jeśli potrzeba
Astro 5 ma tryb hybrydowy – możesz na 1 stronie włączyć SSR (np. dla strefy klienta z logowaniem), reszta zostaje statyczna.

## Pełny stack

### Frontend
| Warstwa | Technologia | Wersja | Dlaczego |
|---------|-------------|--------|----------|
| Framework | **Astro** | 5.x | Najlepsze SEO/perf dla content-driven |
| UI w islands | **React** | 19 | Najnowszy, klient prosił o "nowszy React" |
| Język | **TypeScript** | 5.x | Type safety, łatwiejsze utrzymanie |
| Styling | **Tailwind CSS** | 4.x | Utility-first, mały bundle |
| Komponenty UI | **shadcn/ui** | latest | Copy-paste komponenty React |
| Ikony | **lucide-react** | latest | Lekkie SVG icons |
| Animacje | **Motion** (dawniej Framer Motion) | latest | Tylko gdzie potrzeba |
| Fonty | **Geist / Inter** (self-hosted) | latest | Bez Google Fonts (RODO + perf) |

### Formularze i walidacja
- **react-hook-form** + **zod** w islands
- Server endpoint w Astro (`src/pages/api/contact.ts`)
- Email: **Resend** (3000 maili/mc darmowo) lub natywny SMTP klienta
- Anti-spam: **Cloudflare Turnstile** (lepszy od reCAPTCHA, darmowy)

### SEO
- **@astrojs/sitemap** – auto-generowany sitemap.xml
- **astro-seo** lub własna implementacja `<SEO />` komponentu
- Schema.org JSON-LD jako komponent astro
- OG images: **@vercel/og** lub generator w Astro

### Optymalizacja obrazów
- **@astrojs/image** – auto WebP/AVIF, lazy loading, responsive
- Lub **Cloudflare Images** ($5/mc, jeśli więcej)

### Analytics i monitoring
- **Cloudflare Web Analytics** (darmowe, bez cookies, RODO-friendly)
- Lub **Plausible** (€9/mc, RODO-friendly)
- **Google Search Console** (must-have do śledzenia migracji)
- ~~Google Analytics~~ – dyskusyjne pod RODO, opcjonalne

### Hosting i deploy
- **Cloudflare Pages** – darmowy plan, unlimited bandwidth, globalny CDN, HTTPS
- Alternatywa: **Vercel** (darmowy hobby plan) lub **Netlify**
- Build z **GitHub Actions** – automatyczne deploye z gita

### Edytowanie treści (CMS) – opcja
Klient w obecnej wersji edytuje przez Elementor. W Astro mamy opcje:

**Opcja A: Markdown w gicie** (najprostsze, bezpłatne)
- Treści w `src/content/*.md` lub `.mdx`
- Edycja przez GitHub web editor lub VS Code
- Wadą: wymaga gita

**Opcja B: TinaCMS** (darmowy do 2 użytkowników)
- Wizualny edytor w przeglądarce
- Backend: GitHub
- Edycja "in-place" jak w Elementor

**Opcja C: Sanity / Strapi / Payload CMS** (headless)
- Pełny panel admina
- Bezpłatny tier dla małych firm
- Trochę więcej konfiguracji

**Rekomendacja:** zaczynamy od **B (TinaCMS)** – klient czuje że "edytuje wizualnie" jak w Elementor.

## Dodatkowe technologie (gdy klient chce więcej)

| Funkcja | Stack |
|---------|-------|
| Kalkulator wyceny | React + react-hook-form + zod + Tailwind |
| Płatności online | Stripe + Przelewy24 (BLIK) |
| Booking online | Cal.com (self-hosted) lub Calendly embed |
| Live chat | Crisp lub Tidio |
| WhatsApp button | Własny komponent (lekki) |
| Strefa klienta | Astro SSR + Clerk/Better Auth |
| Wielojęzyczność | Astro i18n routing |

## Podsumowanie

**Astro 5 + React 19** daje:
- ✅ "Nowszy React" (wersja 19 – najnowsza)
- ✅ Najlepsze możliwe SEO (Core Web Vitals 95+)
- ✅ Najszybsza strona w branży
- ✅ Niski koszt utrzymania (hosting $0)
- ✅ Łatwy do rozbudowy o kalkulator, blog, strefę klienta
- ✅ TypeScript = mniej bugów w przyszłości
- ✅ Modern stack = łatwo znaleźć dev w przyszłości

To nie jest decyzja "modnego frameworka" – to **strategiczny wybór** który optymalizuje pod biznes klienta (więcej leadów z Google).
