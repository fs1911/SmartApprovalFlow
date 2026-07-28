# Block 16 — Summary (Barrierefreiheit, Lokalisierung & finaler Produktschliff)

Baut auf Block 1–15 auf, ohne Kernflows umzubauen. Ziel: eine schlanke
Mehrsprachigkeit für die loginlose Kundenseite (de/fr/it), WCAG-Feinschliff,
konsistente Fehler-/Leerzustände. Weiterhin vollständig lokal ohne externe
Accounts.

## 1. Was gebaut wurde

### Lokalisierung (Kundenseite)
- **`packages/ui/src/i18n.ts`** – reine, server-safe i18n-Grundlage: `LOCALES`
  (`de`/`fr`/`it`), `Messages`-Interface, vollständige Kataloge, `isLocale`,
  `resolveLocale(...prefs)` (Region-Subtags, Accept-Language, sicherer Fallback
  Deutsch) und `t(locale, key, vars?)` (Fallback-Kette + `{var}`-Interpolation).
  Über `@saf/ui` exportiert.
- Kundenseite `/a/[token]` + `_actions-panel.tsx` vollständig über `t(locale, …)`
  lokalisiert. Sprache = `resolveLocale(?lang, workspace.locale)` → **`?lang` je
  Link überschreibt** die Tenant-Default-Sprache.
- API `toPublicView` gibt `tenant.locale` als `workspace.locale` mit aus.

### Barrierefreiheit
- Skip-Link („Zum Inhalt springen") + `#main-content` in App- und Marketing-
  Layout; `.visually-hidden`/`.skip-link`-Utilities in `globals.css`.
- Kundenseite: `<main>`-Landmark, `lang`-Attribut passend zur Sprache,
  `role="alert"` (Dringlichkeit/Fehler), `role="status"`+`aria-live` (Erfolg),
  `aria-pressed`/`aria-busy`, dekorative Icons `aria-hidden`.

### Fehler-/Leerzustände
- Globale `apps/web/app/not-found.tsx` (404) und `apps/web/app/error.tsx`
  (Error-Boundary, Client) im ruhigen Karten-Stil mit Weg zurück.
- Lokalisierter „Link nicht verfügbar"-Zustand (abgelaufen vs. ungültig).

### Tests
- Unit: `apps/api/src/lib/i18n.test.ts` – `resolveLocale`, `t`, Katalog-
  Vollständigkeit (11 Tests). Gesamte Lib-Unit-Suite: 70 Tests grün.
- Typecheck (alle Workspaces) und `@saf/web`-Build grün.

### Doku
- `docs/i18n-and-localization.md`, `docs/accessibility.md`, dieses Summary;
  Roadmap + README aktualisiert.

## 2. Entscheidungen

- **Statische In-Repo-Kataloge** statt TMS/Übersetzungs-API – versioniert,
  offline, ohne Provider. Reicht für drei Sprachen und ändert die Architektur nicht.
- **Nur die Kundenseite mehrsprachig**, interne App + Marketing bleiben Deutsch –
  dort ist der Mehrwert (noch) nicht gegeben.
- **`?lang` vor Tenant-`locale`** – Werkstatt setzt eine Standardsprache, kann sie
  aber pro Link abweichen lassen, ohne Datenmodell-Änderung.
- **A11y über semantisches HTML** – keine ARIA-Bandagen auf div-Attrappen; nutzt
  die in früheren Blöcken schon gelegten Grundlagen.

## 3. Was Mock/Placeholder blieb

- Keine automatische `Accept-Language`-Client-Erkennung (Funktion vorhanden, nicht
  angebunden).
- Kein automatisiertes A11y-Gate in CI (manuelle Checkliste in `accessibility.md`).
- Interne App/Marketing nicht übersetzt.

## 4. Später nötige Credentials/Accounts

- Keine – alles lokal.

## 5. Risiken

- Übersetzungen sind menschlich zu prüfen (fachlich/juristisch), bevor sie
  produktiv gehen – die Kataloge sind Entwürfe in guter Qualität, kein
  Lektorat-Ersatz.
- Ohne CI-A11y-Gate können Regressionen unbemerkt einfließen; die Checkliste
  mindert das nur teilweise.

## 6. Nächster Block

Kandidaten: **E2E-/Regressionstests der Kundenseite** (Playwright inkl. A11y-
Smoke), **Voice-Layer** (bewusst zurückgestellt) oder ein **Deployment-/Launch-
Härtungsblock**. Vorschlag + Prompt im Handoff.
