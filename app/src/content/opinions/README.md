# Opinie klientów

**⚠️ UWAGA: pliki 01-05 to PLACEHOLDERY (`verified: false`)** — fikcyjne opinie dodane tylko do testów UI komponentu `HeroReviews`. **Przed deployem na produkcję ZASTĄP je realnymi opiniami z Google Maps Rafała.**

## Jak dodać nową opinię

1. Skopiuj którykolwiek plik `.json` z tego folderu jako wzór.
2. Zmień nazwę pliku na format `NN-slug.json` (NN = numer porządkowy).
3. Wypełnij pola:
   - `author` (string, wymagane) — imię + inicjał nazwiska, lub pełne imię i nazwisko jeśli zgoda
   - `role` (string, opcjonalne) — np. "Klient indywidualny", "Sprawa sądowa"
   - `rating` (1-5, wymagane) — liczba gwiazdek
   - `text` (40-800 znaków, wymagane) — treść opinii
   - `relatedService` (string, opcjonalne) — pasujące do `services` w `business.ts`
   - `publishedAt` (ISO date, wymagane) — `"2026-05-01"`
   - `verified` (boolean) — **`true` gdy opinia pochodzi z Google/realnego klienta z jego zgodą**

## Skąd brać opinie

- Google Maps: profil "Motowycena" → zakładka Opinie → kopiuj autora + tekst
- Email/SMS od zadowolonych klientów (poproś o zgodę na publikację)

## Co wyświetla `HeroReviews`

Top 5 opinii sortowanych po `rating` (desc) → `publishedAt` (desc). Komponent renderuje się tylko gdy są opinie; gdy folder jest pusty (poza tym README) hero nie pokazuje karty.
