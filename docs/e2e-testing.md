# End-to-End- & A11y-Smoke-Tests (Block 17)

Ein schlanker Playwright-Layer sichert die **kritischen loginlosen Kundenpfade**
gegen Regressionen ab und prüft die Barrierefreiheit der wichtigsten öffentlichen
Seiten. Er läuft vollständig lokal – ohne externe Accounts – gegen dieselbe
Postgres/API/Web-Umgebung wie die Integrationstests.

**Wichtig:** Die vorhandenen `node:test`-Suiten (`npm run test`, Teil von
`npm run verify`) bleiben das **Haupt-Gate**. Der E2E-Layer ist ein *eigener*,
bewusst **nicht-blockierender** CI-Job (wie `format:check`), damit die Browser-
Schicht die `verify`-Pipeline nicht destabilisiert.

## Umfang (MVP)

`apps/e2e/tests/customer-page.spec.ts`:
- Anfrage lädt (Werkstatt, Betreff, Kosten sichtbar)
- **Alles freigeben** → Erfolgszustand
- **Alles ablehnen** → „Antwort erhalten"
- **Rückruf** anfordern → „Rückruf angefragt"
- **Einzeln entscheiden** (eine Position ablehnen) → Teilfreigabe
- **abgelaufener** Link → „Link nicht verfügbar" (abgelaufen)
- **ungültiger** Link → „Link nicht verfügbar" (ungültig)
- **Lokalisierung** via `?lang=fr` / `?lang=it` + Default Deutsch (`lang`-Attribut
  + übersetzte Kosten-/Button-Texte)

`apps/e2e/tests/accessibility.spec.ts` (axe-core):
- Kundenseite und Login-Seite: **keine** `serious`/`critical` WCAG-2.1-A/AA-
  Verstöße.

## Architektur

| Datei | Rolle |
| --- | --- |
| `playwright.config.ts` | startet API (`tsx apps/api/src/server.ts`) + Web (`next dev`) als `webServer`, `baseURL` = `http://localhost:3000`, seriell/1 Worker |
| `global-setup.ts` | legt pro Lauf **frische** Fälle mit **bekannten** Tokens an (freigabe/ablehnung/rückruf/einzeln/sprache/abgelaufen) und schreibt `.fixtures.json` |
| `tests/fixtures.ts` | lädt die Tokens in die Specs |

Jeder Entscheid-Test nutzt seinen **eigenen** Fall, damit der terminale Zustand
eines Tests nie in einen anderen leckt. Tokens werden wie in der API gehasht
(SHA-256, nur der Hash landet in der DB).

## Lokal ausführen

Voraussetzung: eine erreichbare Postgres mit angewandten Migrationen + Seed
(gleich wie für die Integrationstests). Beispiel:

```bash
export DATABASE_URL="postgresql://saf:saf@localhost:5432/smart_approval_flow?schema=public"
npm run db:generate
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
npm run seed --workspace packages/db

# In diesem Managed-Container ist Chromium vorinstalliert – daran vorbei zeigen,
# statt `playwright install` auszuführen:
export PW_CHROMIUM_BIN="/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

npm run e2e --workspace @saf/e2e
```

Auf einer normalen Maschine stattdessen einmalig die Browser holen:
`npx playwright install chromium` (dann `PW_CHROMIUM_BIN` weglassen).

Die `webServer`-Konfiguration startet API und Web selbst; laufende Server auf
:4000/:3000 werden lokal wiederverwendet (`reuseExistingServer`).

## CI

Job `e2e` in `.github/workflows/ci.yml` (getrennt von `verify`):
Postgres-Service → `npm ci` → generate/migrate/seed →
`npx playwright install --with-deps chromium` → `npm run e2e`. Der Job ist
`continue-on-error: true` (nicht-blockierend); der HTML-Report wird als Artefakt
hochgeladen. `CI=true` schaltet Retries (1) und frische Server (kein Reuse) ein.

## Bewusst offen

- Nur Chromium (ein Projekt); kein Firefox/WebKit, kein Mobile-Emulation-Matrix.
- Kein visuelles Snapshot-Testing.
- Der Job ist zunächst informativ; sobald er sich als stabil erweist, kann
  `continue-on-error` entfernt werden, um ihn zum echten Gate zu machen.
- Kein Test der internen App-Flows (Auth-geschützt); Fokus bleibt der Kernwert
  Kundenseite.
