# Block 51 — Summary (Rebrand → Nicka)

Produktname **Klarwerk → Nicka**. Der Name leitet sich von „nicken" ab — dem
schnellen, menschlichen Ja, das genau die Kernaktion des Produkts ist (die
Kundschaft nickt eine Zusatzarbeit ab). Dazu der Marken-Slogan **„Ein Nicken
genügt."** und die Domain **`nicka.ch`** (frei, im Gegensatz zu den meisten
Klarwerk-Domains). Wie Block 39: nur user-sichtbare Flächen ändern sich,
technische Bezeichner bleiben.

## 1. Was geändert wurde

### Marken-Text (überall `Klarwerk` → `Nicka`)

- **Marketing** (`_content.ts` `BRAND`, alle Seiten, Hero-Mockup, Scroll-Story),
  **Rechtstexte** (Impressum/Datenschutz/AGB via `BRAND.name`), **Auth-Shell +
  Login/Passwort-Seiten**, **App-Shell** (Sidebar-Wortmarke + Footer), **Fehler-/
  404-Seiten**, **Metadaten/Titel** (`layout.tsx`).
- **Kundenseite:** `i18n.ts` `providedVia` in **DE/FR/IT** („Bereitgestellt über
  Nicka" / „Fourni via Nicka" / „Fornito tramite Nicka").
- **API:** OpenAPI-Titel/-Beschreibung (`app.ts` + committetes `openapi.json`),
  Einladungs-Fallback-Name, Webhook-Testnachricht.
- **Paket-Beschreibungen, tsconfig-`display`, ESLint-/Prisma-/Env-/CI-Kommentare.**

### Slogan & Domain

- Neues Feld **`BRAND.slogan = 'Ein Nicken genügt.'`**, prominent im **Hero-
  Eyebrow** platziert (ersetzt die Zielgruppen-Zeile). `BRAND.tagline` bleibt der
  Deskriptor „Digitale Freigaben für Werkstätten" (Titel/Footer).
- **Domain** `smartapprovalflow.ch` → **`nicka.ch`** in `BRAND.domain` (treibt
  `mailto:` auf den Rechtstexten) und im `NEXT_PUBLIC_SITE_URL`-Default
  (`lib/env.ts`, für Canonical/OG/Sitemap).

### Logo & Dateiname

- Logo-Buchstabe **K → N** in allen vier Marken-Lockups (Marketing-Header +
  Footer, Auth-Shell, Login) und der App-Sidebar. Das Mint-Design bleibt 1:1.
- CSV-Export-Dateiname `klarwerk-cases-*.csv` → `nicka-cases-*.csv` (Route +
  Web-Fallback + Test-Regex konsistent).

## 2. Entscheidungen

- **Technische Bezeichner unberührt** — Scope `@saf/*`, Package-_Namen_, Dev-
  Header, Env-_Keys_ bleiben (wie Block 39). Nur _Werte/Anzeigetexte_ ändern sich.
- **Historische Block-Summaries bleiben** als Zeitdokument (u. a. Block 39 „→
  Klarwerk" ist historisch korrekt). Auch die README/Roadmap-Zeile zu Block 39
  bleibt bewusst „Klarwerk".
- **Slogan in den Hero-Eyebrow** — die sichtbarste, risikoärmste Stelle; die
  Zielgruppe trägt weiterhin die Headline/der Rest der Seite.
- **App bleibt blau** — die in Block 48/49 bewusst offen gelassene Mint-
  Vereinheitlichung von App/Kundenseite ist weiterhin eine separate Entscheidung.

## 3. Was Mock/Placeholder blieb

- Nichts Neues; keine Provider/Secrets berührt. `nicka.ch` ist noch nicht
  registriert — nur als Marken-/URL-Referenz gesetzt.

## 4. Später nötige Credentials/Accounts

- **Domain `nicka.ch` registrieren** (Schweizer Registrar) und Nameserver auf
  Cloudflare zeigen; optional `nicka.com`/`nicka.swiss` defensiv sichern.
- Vor hartem Launch: kurze **Marken-/Handelsregister-Prüfung** „Nicka" (CH/DACH).

## 5. Risiken

- Reiner Text-/Marken-Swap. Typecheck grün, Web-Build grün (24/24 statisch), API
  **189 / 0 Fehler** (CSV-Dateiname-Test wandert konsistent mit).
- **Prettier-Disziplin:** sed ersetzt ausschließlich Marken-Tokens (alle
  _kürzer_ → keine neuen Zeilenumbrüche); der **echte** Gesamt-Diff wurde per
  Guard geprüft — jede geänderte Zeile ist ein Marken-/Rebrand-Edit, keine
  Fremdzeile umformatiert. Bestehende Nicht-Prettier-Zeilen wurden nicht angefasst
  (CI-Format-Check ist informativ/nicht-blockierend).

## 6. Nächster Block

Offen. Kandidaten: **Domain live schalten** (`nicka.ch` + Cloudflare), die
**Mint-Vereinheitlichung** von App/Kundenseite (falls gewünscht), weitere
Reporting-/Produkt-Feinschliffe, oder die **Live-Offensive**
(Resend/Storage/Stripe).
