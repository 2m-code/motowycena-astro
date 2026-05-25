# Panel admina bez PHP

Panel jest normalną stroną Astro:

```txt
/admin/
```

Interfejs znajduje się w:

```txt
src/pages/admin.astro
```

Backend panelu działa jako Cloudflare Pages Functions:

```txt
functions/api/admin/*
```

## Wymagane zmienne Cloudflare Pages

Ustaw w Cloudflare Pages → Settings → Environment variables:

```txt
ADMIN_SESSION_SECRET=losowy-ciag-minimum-32-znaki
ADMIN_PASSWORD_SALT=motowycena-admin-v1
ADMIN_PASSWORD_SHA256=hash-hasla
```

## Lokalnie

Zwykłe `npm run dev` uruchamia tylko Astro. Panel się wyrenderuje, ale endpointy `/api/admin/*` nie będą działać, bo siedzą w Cloudflare Pages Functions.

Do lokalnego testu panelu:

```bash
cp .dev.vars.example .dev.vars
npm run dev:admin
```

Panel będzie pod:

```txt
http://127.0.0.1:8788/admin/
```

Ten tryb uruchamia statyczny build przez Wrangler Pages dev i podpina lokalne bindingi:

```txt
ADMIN_CONTENT = lokalny KV
ADMIN_UPLOADS = lokalny R2
```

Lokalny stan KV/R2 zapisuje się w `.wrangler/state`, a tymczasowe pliki Wranglera w `.wrangler-home`.

Aktualne domyślne hasło startowe:

```txt
Motowycena-Admin-2026!
```

Hash nowego hasła można wygenerować lokalnie:

```bash
node -e "crypto.subtle.digest('SHA-256', new TextEncoder().encode('motowycena-admin-v1:NOWE_HASLO')).then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))"
```

## Zapis treści

Utwórz Cloudflare KV namespace i podepnij binding:

```txt
ADMIN_CONTENT
```

Panel zapisuje cały JSON pod kluczem:

```txt
content
```

Publiczna strona ładuje treści z:

```txt
/api/admin/public-content
```

Jeśli KV nie jest jeszcze skonfigurowane, loader użyje fallbacku:

```txt
public/admin/data/content.json
```

## Upload plików

Upload wymaga Cloudflare R2:

```txt
ADMIN_UPLOADS
ADMIN_UPLOADS_PUBLIC_URL=https://publiczny-adres-bucketu
```

Bez R2 można nadal wkleić ręcznie URL obrazka w polu panelu.

## Pola edytowane w panelu

Schemat pól jest w:

```txt
public/admin/schema.json
```

Na stronie używamy atrybutów:

```html
data-admin-text="home.hero.title"
data-admin-html="legal.privacy.body"
data-admin-src="services.shared.heroImage"
```

Loader znajduje się w:

```txt
public/admin/admin-content-loader.js
```
