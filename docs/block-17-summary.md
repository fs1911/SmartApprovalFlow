# Block 17 — Summary (End-to-End-Tests & Release-Härtung der Kundenseite)

Baut auf Block 1–16 auf, ohne Kernflows umzubauen. Ziel: ein schlanker,
lokal lauffähiger Playwright-E2E-Layer für die kritischen loginlosen Kundenpfade
plus ein axe-basierter A11y-Smoke – ohne externe Accounts, ohne die bestehende
`verify`-Pipeline zu destabilisieren.

## 1. Was gebaut wurde

### Neues Workspace `apps/e2e` (`@saf/e2e`)
- `playwright.config.ts`: startet API (`tsx apps/api/src/server.ts`) + Web
  (`next dev`) selbst als `webServer`, seriell/1 Worker; nutzt in diesem
  Container das vorinstallierte Chromium via `PW_CHROMIUM_BIN`.
- `global-setup.ts`: legt pro Lauf **frische** Fälle mit **bekannten** Tokens an
  (Freigabe/Ablehnung/Rückruf/Einzeln/Sprache/Abgelaufen) und schreibt
  `.fixtures.json`. Token-Hashing wie in der API (SHA-256).
- `tests/customer-page.spec.ts` (10 Tests): Laden, Alles-Freigeben,
  Alles-Ablehnen, Rückruf, Einzelentscheid→Teilfreigabe, abgelaufener/ungültiger
  Link, Lokalisierung `?lang=fr`/`it`/Default-Deutsch.
- `tests/accessibility.spec.ts` (2 Tests): axe-Smoke auf Kundenseite + Login –
  keine `serious`/`critical` WCAG-2.1-A/AA-Verstöße.

### Echte A11y-Fixes (vom Smoke aufgedeckt)
- `.public-foot` nutzte den Muted-Token (`ink-300`) bei 12 px → Kontrast 2,39:1.
  Auf `ink-500` angehoben (AA).
- Der grüne Primär-CTA („Alle Arbeiten freigeben") hatte Weiß auf `#1f8a4c` =
  4,37:1. `--color-success-500` auf `#1a7f43` abgedunkelt (~5:1) – verbessert
  zugleich die Status-Badges.

### CI
- Separater, **nicht-blockierender** Job `e2e` (Postgres-Service, Node 22,
  `playwright install --with-deps chromium`, `npm run e2e`, Report-Artefakt).
  Die `node:test`-Suiten in `verify` bleiben das Haupt-Gate.

### Doku
- `docs/e2e-testing.md`, dieses Summary; Roadmap + README aktualisiert.

## 2. Entscheidungen

- **Eigenes Workspace mit Script `e2e` (nicht `test`)** – so greift weder
  `npm run test --workspaces` noch `npm run build --workspaces` auf Playwright zu;
  `verify` bleibt unangetastet. `typecheck` läuft mit (statische Prüfung, kein
  Browser/DB nötig).
- **Frische, pro Lauf geseedete Tokens** statt Wiederverwendung – deterministisch,
  keine Kollision mit terminalen Zuständen, keine Reference-Unique-Konflikte.
- **`next dev` statt Prod-Build** – null Build-Reibung; die Kundenseite ist leicht,
  Timeouts sind großzügig.
- **A11y-Verstöße wurden behoben, nicht wegkonfiguriert** – der Smoke hat zwei
  echte Kontrast-Bugs gefunden; beide sind gefixt.
- **Job zunächst `continue-on-error`** – wie `format:check`, bis die
  Browser-Schicht sich als stabil erweist; danach leicht zum Gate zu machen.

## 3. Was Mock/Placeholder blieb

- Nur Chromium; kein Firefox/WebKit, keine Mobile-Matrix, kein visuelles
  Snapshotting.
- Keine E2E der Auth-geschützten internen Flows (Fokus Kundenseite).

## 4. Später nötige Credentials/Accounts

- Keine – alles lokal (Postgres + vorinstallierter Browser).

## 5. Risiken

- E2E gegen `next dev` kann bei sehr langsamen Runnern in Timeouts laufen;
  Retries (1) und großzügige Timeouts mindern das, der Job ist non-blocking.
- Die Token-Fixtures liegen in `.fixtures.json` (gitignored) – enthalten
  Roh-Tokens für Testfälle; nie committen (durch `.gitignore` abgesichert).

## 6. Nächster Block

Kandidaten: **Deployment-/Launch-Härtung** (Prod-Build-Pfade, Health/Readiness in
CI, Smoke gegen Staging), **E2E ausbauen** (interne Flows, Firefox/Mobile) oder
der zurückgestellte **Voice-Layer**. Vorschlag + Prompt im Handoff.
