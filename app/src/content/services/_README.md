# Treści usług – Content Collection

Każdy plik `.mdx` w tym katalogu to **jedna usługa** prezentowana na stronie.

## Jak dodać nową usługę

1. Stwórz nowy plik `nazwa-uslugi.mdx`
2. Wypełnij frontmatter (YAML między `---`) – Astro waliduje go zod schemą z `src/content/config.ts`
3. Napisz treść w MDX (Markdown + komponenty React/Astro)
4. Zrób commit – Astro automatycznie pokaże nową usługę na stronie

## Pełna lista pól frontmatter

Patrz [`src/content/config.ts`](../config.ts). Wszystkie wymagane pola są walidowane przy buildzie.

## Migracja do CMS w przyszłości

Schema jest agnostyczna. Gdy klient zechce edycję wizualną:

### Opcja A: TinaCMS (zalecane na start)
```bash
npx @tinacms/cli init
```
- Tina czyta te same MDX files i daje GUI do edycji
- Backend: ten sam git repo, klient nie musi nic instalować
- Klient widzi formularz dla każdej usługi z polami z frontmatter
- Live preview w trakcie edycji
- Darmowe do 2 użytkowników

### Opcja B: Sanity (gdy treści rosną)
- Headless CMS z pełnym Studio
- Klient ma dedykowany panel admina
- Astro pobiera treści przez `@sanity/client`
- Migracja MDX → Sanity przez prosty skrypt (kopiuje frontmatter do dokumentów Sanity)

### Opcja C: Decap CMS
- Najprostszy, GitHub-based
- Aktywność projektu ostatnio słaba – rekomendowany tylko jeśli budżet wymaga "tylko darmowe"

**Kluczowe**: schema w `config.ts` zostaje TAKA SAMA przy migracji. Tylko źródło danych się zmienia.
