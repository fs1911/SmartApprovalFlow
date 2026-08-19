# Block 49 — Summary (App-Screens in der gehobenen Sprache)

Screen-Feinschliff im Anschluss an die globale App-Politur (Block 48): die
großen Kennzahlen auf Dashboard und Auswertung sprechen jetzt **eine gemeinsame
Sprache**, und die Dashboard-Kacheln sind auf einen Blick unterscheidbar. Rein
präsentativ — keine API-/Schema-/Vertragsänderung, keine neue Abfrage.

## 1. Was gebaut wurde

### Geteilte „Stat-Tile"-Sprache — `apps/web/app/globals.css`

Neuer, ans Ende angehängter Abschnitt „App screens polish (Block 49)":

- **`.stat__value`** — große Kennzahlen in der Display-Schrift (Space Grotesk),
  eng gesetzt; ersetzt ad-hoc Inline-Schriftgrößen. Variante `.stat__value--sm`
  für die dichtere KPI-Reihe im Reporting.
- **`.stat-card`** + Ton-Modifier (`--info/--success/--danger/--warning`) — ein
  dünner farbiger Streifen oben an jeder Dashboard-Kachel, damit die vier KPIs
  ohne Lärm unterscheidbar sind.

### Dashboard — `apps/web/app/(app)/dashboard/page.tsx`

- Kennzahl nutzt `.stat__value` statt Inline-`fontSize/fontWeight`.
- Die vier Statuskacheln tragen `stat-card stat-card--{tone}` (Ton-Streifen); die
  verlinkten Kacheln (Block 38) bleiben klickbar.

### Reporting — `apps/web/app/(app)/reporting/page.tsx`

- Die `Kpi`-Kachel nutzt `.stat__value.stat__value--sm` statt Inline-Styles.

## 2. Entscheidungen

- **Zahlen als System** — statt in jeder Datei eigene `fontSize`-Werte zu
  streuen, gibt es jetzt eine geteilte Klasse. Das vereinheitlicht Dashboard +
  Reporting und entfernt Styling aus dem JSX.
- **Ton-Streifen statt Vollfläche** — nur ein 3-px-Akzent oben; die Kacheln
  bleiben ruhig und lesbar (Arbeitswerkzeug, kein Dashboard-Kirmes).
- **Additiv** — reine Klassen-Swaps; Logik, Verlinkung (Block 38) und ARIA-Labels
  unverändert.

## 3. Was Mock/Placeholder blieb

- Nichts; keine Provider/Secrets berührt.

## 4. Später nötige Credentials/Accounts

- Keine.

## 5. Risiken

- Rein visuell. Typecheck grün, Web-Build grün (24/24 statisch), API-Suite
  unberührt (**187**: 100 grün / 87 ohne DB übersprungen).
- Dashboard/Reporting sind daten-/session-gebunden und in dieser Umgebung nicht
  per Screenshot renderbar; die Änderungen sind einfache, build-verifizierte
  Klassen-Swaps. Prettier-Disziplin: alle drei Dateien per config-aufgelöstem
  Diff geprüft — nur eigene, konforme Zeilen.

## 6. Nächster Block

**Block 50 — Annahmequote im Reporting**: eine reine, voll unit-getestete
Kennzahl (`approvalRate` = freigegeben / entschieden) als Pure-Function in der
Reporting-Lib, eingehängt in `GET /reporting/summary`, plus eine KPI-Karte im
Web. Provider-frei, mit node:test-Abdeckung wie Blocks 43/45.
