# Block 39 — Summary (Rebrand → Klarwerk)

Der Produktname wechselt von „Smart Approval Flow" zu **Klarwerk** — bodenständig,
werkstattnah, deutsch, gut am Telefon aussprechbar („Alles klar — Klarwerk").
Reiner Branding-Wechsel: **keine funktionale Änderung**, keine API-Vertrags-
Änderung, keine Migration.

## 1. Was gebaut wurde

### Umbenannt (user-sichtbar) — 48 Dateien, „Smart Approval Flow"/„Smart Approval" → „Klarwerk"

- **App:** Sidebar-Brand + Logo-Kürzel (S → **K**), Seitentitel/Metadaten
  (`app/layout.tsx`), Fehler-/Not-Found-Seiten.
- **Marketing:** Header/Footer-Logo (K), Hero-/Content-Texte (`_content.ts`),
  alle Seiten (Produkt, Für Garagen, Preise, Sicherheit, FAQ), Rechtstexte
  (Impressum/Datenschutz/AGB), SEO-Beschreibung.
- **Auth:** Login-/Einladung-/Passwort-Reset-Shell + Logo.
- **Kundenseite (loginlos):** Footer „Bereitgestellt über Klarwerk" in allen drei
  Sprachen (de/fr/it, `@saf/ui` i18n).
- **API:** OpenAPI-/Swagger-Titel („Klarwerk API"), E-Mail-/Test-Zustellungs-
  Texte (Einladungen, Webhook-Test), Default-Workspace-Name.
- **Doku & Meta:** README-Titel, Produkt-/GTM-/IA-Dokumente, Paket-
  *Beschreibungen*, CI-/ESLint-/tsconfig-*Kommentare*.
- `apps/api/openapi.json` **regeneriert** (Titel folgt aus `app.ts`).

### Bewusst NICHT geändert (technische Bezeichner)

- Paketnamen `@saf/api|web|types|ui|db|config|e2e` und der Root-`name`
  `smart-approval-flow` (npm-workspace-Referenzen, 115+ Importe, tsconfig-Pfade).
- Dev-Header `x-saf-tenant`/`x-saf-role`, Session-Cookie, Env-Prefixe, Repo-/
  Ordnername.
- Grund: hohes Umbau-/Bruchrisiko bei null Branding-Mehrwert. Kann später als
  separater technischer Refactor migriert werden.

### Tests

- **Keine neuen Tests** (reiner Text-/Branding-Wechsel). Volle API-Suite
  unverändert **174 grün** — bestätigt, dass kein Test auf einen Marken-String
  brach.

### Doku

- Dieses Summary, Roadmap + README (Status + Block-Index).

## 2. Entscheidungen

- **Klarwerk** gewählt (aus einer Shortlist: Grünlicht / Freigib / Handschlag /
  Klarwerk) — werkstattnah, eigenständig, klarer Klang, `klarwerk.ch/.de`
  plausibel.
- **Brand-only Rebrand**, technische IDs unangetastet (siehe oben).
- **openapi.json regeneriert** statt handeditiert (Single Source: `app.ts`).

## 3. Was Mock/Placeholder blieb

- Keine echten Provider/Secrets berührt. Domain-/Markenverfügbarkeit für
  „Klarwerk" ist **noch zu prüfen** (nicht Teil dieses Blocks).

## 4. Später nötige Credentials/Accounts

- Keine (Branding). Vor Go-Live: Domain `klarwerk.ch`/`.de` registrieren, Marke
  prüfen.

## 5. Risiken

- Gering (Text). Ein optionaler technischer Rename (`@saf/*` → `@klarwerk/*`,
  Header/Env) bleibt als separater, klar abgegrenzter Refactor offen.

## 6. Nächster Block

Weiterer **Produkt-Feinschliff**/**Härtung** ohne Provider, oder Start der
**Live-Offensive** (Resend/Storage/Stripe aktivieren). Vorschlag + Prompt im
Handoff.
