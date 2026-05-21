# Cloudflare Turnstile + Resend – setup

Endpoint `/api/contact` ma już całą logikę. Wystarczy uzupełnić zmienne środowiskowe.

## 1. Resend (wysyłka maili)

### Setup
1. Załóż konto: https://resend.com (darmowe 3000 maili/mc, 100/dzień)
2. Dashboard → API Keys → Create API Key (uprawnienia: Sending access)
3. Skopiuj klucz `re_xxxxxxxxxxxxx`
4. Domena – dwie opcje:
   - **Testowo**: użyj domeny resend.dev (gotowa do testów, bez konfiguracji DNS)
   - **Produkcyjnie**: Dashboard → Domains → Add Domain → motowycena.pl, ustaw rekordy DNS (SPF, DKIM)

### Zmienne (`.env` lokalnie, Cloudflare Pages na produkcji)
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
CONTACT_EMAIL=biuro@motowycena.pl
MAIL_FROM=Motowycena <noreply@motowycena.pl>  # po weryfikacji domeny
# Lub na testy:
# MAIL_FROM=onboarding@resend.dev
```

### Bez Resend (tryb dev)
Endpoint **nie wywali błędu** – po prostu zaloguje payload do konsoli zamiast wysłać.
Idealne do testów lokalnych.

## 2. Cloudflare Turnstile (anti-spam)

### Dlaczego nie reCAPTCHA?
- Darmowy, brak limitów
- Bez Google (RODO-friendly)
- Niewidzialny dla większości użytkowników
- Mniejszy bundle JS (~40KB vs ~80KB w reCAPTCHA)

### Setup
1. https://dash.cloudflare.com → Turnstile → Add site
2. Widget name: `motowycena.pl`
3. Hostname: `motowycena.pl` (i `staging.motowycena.pl` jeśli chcesz)
4. Widget mode: **Managed** (automatyczna detekcja botów)
5. Skopiuj:
   - **Site Key** (publiczny) → `PUBLIC_TURNSTILE_SITE_KEY`
   - **Secret Key** (server-side) → `TURNSTILE_SECRET_KEY`

### Zmienne
```bash
PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAAxxxxxxxxxxxxx
TURNSTILE_SECRET_KEY=0x4AAAAAAAxxxxxxxxxxxxx
```

### Jak to działa
- Widget pojawia się w formularzu (jeśli `PUBLIC_TURNSTILE_SITE_KEY` jest ustawione)
- Po submit, frontend wysyła token w polu `cf-turnstile-response`
- Endpoint weryfikuje token z Cloudflare (`/turnstile/v0/siteverify`)
- Jeśli weryfikacja nieudana → odrzucamy zapytanie

### Bez Turnstile
Jeśli zmienne nie są ustawione – endpoint **pomija weryfikację** (tryb dev).
Honeypot dalej działa jako podstawowa ochrona.

## 3. Cloudflare Pages – Environment Variables

Dashboard → Pages → motowycena → Settings → Environment Variables:

| Variable | Type | Value |
|----------|------|-------|
| `RESEND_API_KEY` | Secret | `re_xxxxx` |
| `CONTACT_EMAIL` | Plain | `biuro@motowycena.pl` |
| `MAIL_FROM` | Plain | `Motowycena <noreply@motowycena.pl>` |
| `PUBLIC_TURNSTILE_SITE_KEY` | Plain | `0x4AAAAA...` |
| `TURNSTILE_SECRET_KEY` | Secret | `0x4AAAAA...` |
| `PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` | Plain | `tokenz cf analytics` |

**Wszystkie zmienne z `PUBLIC_` prefiksem** są bundlowane do frontu – nie wrzucaj tam sekretów.

## 4. Test po setupie

```bash
# Lokalnie
cd app
cp .env.example .env
# uzupełnij wartości w .env
npm run dev
# otwórz http://localhost:4321/kontakt/
# wyślij testowy formularz - mail powinien dojść na CONTACT_EMAIL
```

## 5. Plan B – SMTP klienta

Jeśli klient woli wysyłać przez własny SMTP (np. m.biuro@motowycena.pl ze swojego hostingu):

```ts
// W endpoint contact.ts zamiast Resend API:
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.klient.pl',
  port: 587,
  secure: false,
  auth: {
    user: import.meta.env.SMTP_USER,
    pass: import.meta.env.SMTP_PASS,
  },
});

await transporter.sendMail({
  from: FROM,
  to: CONTACT_EMAIL,
  replyTo: data.email,
  subject,
  html,
});
```

Wadą tej opcji: nodemailer to ~500 KB więcej w bundle (vs ~5 KB dla fetch do Resend),
więc Resend jest lepszym wyborem dla statycznej strony na Cloudflare Pages.
