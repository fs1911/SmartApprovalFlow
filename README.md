# Klarwerk für Garagen

Digitale, sichere und **dokumentierte Kundenfreigaben** für Werkstätten — mit
Foto, Klartext und Preisband. Der Kunde entscheidet mobil, **ohne App und ohne
Login**. Alles revisionssicher protokolliert.

> Das Produkt verkauft nicht „Tickets", sondern **Vertrauen, Geschwindigkeit und
> belegbare Freigaben**. Kein DMS-Ersatz — ein wertvoller Layer über bestehender
> Garagensoftware.

**Status:** Block 1 (Foundation) ✅ · Block 2 (Approval Workflow) ✅ ·
Block 3 (Operational Hardening) ✅ · Block 4 (Multi-Tenant-B2B-Reife) ✅ ·
Block 5 (Öffentlicher kommerzieller Layer) ✅ · Block 6 (Infrastruktur &
Provider-Readiness) ✅ · Block 7 (Auth- & Integrations-Härtung) ✅ ·
Block 8 (Portal-Ausbau & Delivery) ✅ · Block 9 (Qualitäts- & Betriebsreife) ✅ ·
Block 10 (Onboarding & Self-Service-Aktivierung) ✅ ·
Block 11 (Billing- & Plan-Enforcement) ✅ ·
Block 12 (Integrations- & API-Ökosystem) ✅ ·
Block 13 (Reporting- & Insights-Ausbau) ✅ ·
Block 14 (Benachrichtigungen & Kollaboration) ✅ ·
Block 15 (Mandantenfähige Skalierung & Datenlebenszyklus) ✅ ·
Block 16 (Barrierefreiheit, Lokalisierung & finaler Produktschliff) ✅ ·
Block 17 (End-to-End-Tests & Release-Härtung) ✅ ·
Block 18 (Deployment- & Launch-Härtung) ✅ ·
Block 19 (Containerisierung) ✅ ·
Block 20 (Container-Release-Pipeline & Container-Smoke) ✅ ·
Block 21 (Voice-Layer) ✅ ·
Block 22 (Voice-Ausbau) ✅ ·
Block 23 (Release-Abschluss) ✅ ·
Block 24 (Produkt-Feinschliff) ✅ ·
Block 25 (Reporting nach Kategorie) ✅ ·
Block 26 (Kategorie-Filter) ✅ ·
Block 27 (Listen-Filter) ✅ ·
Block 28 (Gespeicherte Ansichten) ✅ ·
Block 29 (Private Ansichten & Standard) ✅ ·
Block 30 (Release-Abschluss & Härtung) ✅ ·
Block 31 (Freier Datumsbereich) ✅ ·
Block 32 (Ansichten umbenennen & sortieren) ✅ ·
Block 33 (Ansichten duplizieren) ✅ ·
Block 34 (Fall-Anzahl je Ansicht) ✅ ·
Block 35 („Keine Treffer"-Zustand) ✅ ·
Block 36 (Aktive-Filter-Leiste) ✅ ·
Block 37 (Reporting-Drilldown) ✅ ·
Block 38 (Dashboard-Drilldown) ✅ ·
Block 39 (Rebrand → Klarwerk) ✅ ·
Block 40 (CSV-Export der Freigaben-Liste) ✅ ·
Block 41 (Einheitliche Datums-/Zeitformatierung) ✅ ·
Block 42 (Konsistente Leerzustände) ✅ ·
Block 43 (Reporting nach Dringlichkeit) ✅ ·
Block 44 (Sortierung der Freigaben-Liste) ✅ ·
Block 45 (Antwortzeit-Verteilung im Reporting) ✅ ·
Block 46 (Detailseiten-Politur) ✅ ·
Block 47 (Marketing-Redesign — „Wow"-Pass Teil 1) ✅ ·
Block 48 (App-Redesign — „Wow"-Pass Teil 2) ✅ ·
Block 49 (App-Screens: geteilte Stat-Tile-Sprache) ✅
— siehe [`docs/roadmap.md`](docs/roadmap.md).

---

## Was funktioniert (End-to-End)

Interner Fall erstellen → validieren → speichern → in Liste mit Kennzahlen →
Detailseite → **per E-Mail an den Kunden senden** (oder Link kopieren) →
Kunde reagiert loginlos (Freigeben / Ablehnen / Rückruf) → Entscheid gespeichert
→ Status aktualisiert → **Timeline aus Audit-Events und Versand**.

Dazu (Block 3): **manuelle Reminder**, **editierbare Nachrichtenvorlagen**,
gehärtetes **Statusmodell mit Ablauf-Logik**, eine vertrauenswürdigere
**öffentliche Kundenseite** und eine **Event-/Webhook-Grundlage** für spätere
Integrationen. E-Mail-Versand läuft im Dev-Modus über einen **Console-Provider**
(keine Credentials nötig — Nachrichten werden ins API-Log geschrieben).

Und (Block 4): **tenant-scoped RBAC** mit fünf Rollen (Owner/Admin/Advisor/
Technician/Viewer), gehärtete **Tenant-Isolation**, **Mitglieder-** und
**Workspace-/Branding-Verwaltung** (White-Label-Grundlage) sowie eine
**Auswertungs-Seite** mit operativen Kennzahlen. Rechte sind in App und API
sichtbar wirksam; im Topbar lässt sich die **Demo-Rolle** umschalten.

Und (Block 5): der **öffentliche kommerzielle Layer** — eine Marketing-Website
(`/`, `/product`, `/for-garages`, `/pricing`, `/demo`, `/security`, `/faq`,
`/legal/*`) mit Positionierung, Pricing (Draft), Legal-Entwürfen, Trust-Seite,
Conversion-Flächen und SEO (robots/sitemap/OG). Billing ist als Strategie
dokumentiert, aber noch **ohne** Zahlungsanbieter.

Und (Block 8): **produktive Foto-Uploads** (zweistufig über die Storage-
Abstraktion, lokal ohne Credentials), **mehrere Positionen mit optionaler
Einzelfreigabe** (Kunde entscheidet pro Position → Fallstatus wird zu
`APPROVED`/`PARTIALLY_APPROVED`/`DECLINED`/`CALLBACK` aggregiert) und eine
**automatische Reminder-Policy** (konfigurierbar, mit Obergrenze, per Endpoint
ausgelöst — kein Cron-Zwang). Fotos erscheinen intern und auf der Kundenseite pro
Position.

Und (Block 10): **Self-Service-Onboarding** — Owner/Admin laden Kolleg:innen per
E-Mail ein (sicherer, ablaufender Link → Passwort setzen → Auto-Login),
**Passwort-vergessen/-Reset** (uniform, ohne User-Enumeration), eine geführte
**Onboarding-Checkliste** im Dashboard (aus dem Zustand abgeleitet) und eine
schlanke **Aktivierungsmetrik**. Einladungs-/Reset-Links erscheinen lokal im
API-Log (kein Postfach nötig).

Und (Block 11): **Billing & Plan-Enforcement** — Pläne (Free/Starter/Pro) mit
Limits (Freigaben/Monat, Sitze), **Nutzungszählung** und server-seitiges
Enforcement (`PLAN_LIMIT_REACHED`), Plan-/Nutzungsanzeige mit Upgrade-Pfad in den
Einstellungen und ein **Billing-Provider-Adapter** (Mock-Default, Stripe
vorbereitet) inkl. signaturgeprüftem, idempotentem Webhook — lokal ohne
Zahlungs-Account testbar.

Und (Block 12): das **Integrations-Ökosystem** — **Self-Service-Webhooks**
(Endpoints anlegen/testen/rotieren/löschen, Event-Allowlist, Zustellungshistorie),
**eingehende Integration per API-Key** (Fall-Erstellung mit Scopes, Idempotency,
`whoami`) und ein **Integrations-Guide** mit curl-Rezepten und Signatur-
Verifikation. Alles lokal gegen den Dev-Sink testbar.

Und (Block 13): der **Reporting-Ausbau** — Kennzahlen und Trends (Freigabequote,
Reaktionszeiten inkl. Median, Umsatz als Spanne aus freigegebenen Positionen),
**Zeitraum-Filter**, ein schlankes Dashboard mit Inline-Trend und **CSV-Export**.

Und (Block 14): **Benachrichtigungen & Kollaboration** — In-App-Benachrichtigungen
(Kundenreaktion, Rückruf, Ablauf, Zuweisung, Notiz) mit Topbar-Glocke und
Notification-Center, **Fall-Zuweisung** an Teammitglieder (inkl. „Meine Fälle")
und **interne Notizen** (nie kundenseitig sichtbar).

### Bereiche der Web-App

| Bereich | Pfade | Zweck |
| --- | --- | --- |
| **Marketing** (öffentlich) | `/`, `/product`, `/pricing`, `/demo`, `/legal/*`, … | Website, Verkauf, Trust |
| **App** (Login, RBAC) | `/dashboard`, `/approvals`, `/members`, `/reporting`, `/settings` | Produktnutzung |
| **Kundenseite** (loginlos) | `/a/{token}` | Freigabe durch Endkundschaft |

## Repo-Struktur

```
smart-approval-flow/
├── apps/
│   ├── api/          # Fastify REST API (/api/v1), OpenAPI unter /docs
│   └── web/          # Next.js App Router (interne App + Kundenseite)
├── packages/
│   ├── types/        # Geteilte Contracts: Enums, Zod-Schemas, API-Envelope
│   ├── db/           # Prisma-Schema, Client, Seed
│   ├── ui/           # Design-Tokens (tokens.css) + UI-Helfer
│   └── config/       # Geteiltes TS-/ESLint-/Prettier-Setup
└── docs/             # Produkt-, Architektur-, API-, UX-Dokumente + ADRs
```

## Tech-Stack

TypeScript · Next.js 14 (Web) · Fastify + OpenAPI (API) · PostgreSQL + Prisma ·
Zod (geteilte Validierung) · CSS-Design-Tokens. Begründung:
[`docs/architecture.md`](docs/architecture.md) und die ADRs in `docs/decisions/`.

## Schnellstart

Voraussetzungen: **Node ≥ 20**, **npm ≥ 10**, eine **PostgreSQL**-Datenbank.

```bash
# 1) Abhängigkeiten installieren (Monorepo)
npm install

# 2) Umgebung anlegen
cp .env.example .env
# DATABASE_URL in .env auf deine Postgres-Instanz setzen

# 3) Datenbank aufsetzen + Demo-Daten
npm run db:generate
npm run db:migrate            # legt die Tabellen an
npm run seed --workspace packages/db

# 4) Beide Apps starten (in zwei Terminals oder via npm run dev)
npm run dev:api               # http://localhost:4000  (Docs: /docs)
npm run dev:web               # http://localhost:3000
```

Dann im Browser:

- **Intern:** <http://localhost:3000> → Übersicht, Freigaben, „Neue Freigabe".
- **API-Doku:** <http://localhost:4000/docs> (Swagger UI).
- **Kundenseite:** auf einer Fall-Detailseite „Anfrage an Kunde senden" (oder
  „Kundenlink erzeugen"), die URL öffnen (Form `…/a/{token}`) und Freigeben/
  Ablehnen/Rückruf testen. Die gesendete E-Mail erscheint im API-Log.
- **Vorlagen:** unter „Einstellungen" die Anfrage-/Reminder-Texte bearbeiten.

> **Auth (Block 7):** Echte Anmeldung unter `/login`. Dev-Login:
> `owner@muster-garage.ch` / `password123` (alle Seed-User, via
> `npm run seed`). Im **Development** funktioniert zusätzlich der Dev-Header-Stub
> (`x-saf-tenant`/`x-saf-role`) inkl. Rollenumschalter; in Produktion ist er
> deaktiviert und die Anmeldung ist erforderlich. Integrationen nutzen
> **API-Keys** (`/api/v1/api-keys`) mit Scopes. Details: `docs/api-design.md`.

## Nützliche Skripte

```bash
npm run typecheck --workspaces      # Typprüfung überall
npm run test --workspace apps/api   # API-/Validierungstests (node:test)
npm run openapi:export --workspace apps/api   # openapi.json schreiben
npm run format                      # Prettier
```

## Dokumentation

| Thema | Datei |
| --- | --- |
| Produktvision & Prinzipien | [`docs/product-vision.md`](docs/product-vision.md) |
| Personas | [`docs/personas.md`](docs/personas.md) |
| MVP-Scope & Journeys | [`docs/mvp-scope.md`](docs/mvp-scope.md) |
| Pricing (Hypothese) | [`docs/pricing-and-monetization.md`](docs/pricing-and-monetization.md) |
| Go-to-Market | [`docs/go-to-market-foundation.md`](docs/go-to-market-foundation.md) |
| Roadmap (Blöcke) | [`docs/roadmap.md`](docs/roadmap.md) |
| Architektur | [`docs/architecture.md`](docs/architecture.md) |
| API-Design | [`docs/api-design.md`](docs/api-design.md) |
| Domain-Modell | [`docs/domain-model.md`](docs/domain-model.md) |
| Design-System | [`docs/design-system.md`](docs/design-system.md) |
| Information Architecture | [`docs/information-architecture.md`](docs/information-architecture.md) |
| Wireframes | [`docs/wireframes.md`](docs/wireframes.md) |
| ADRs | [`docs/decisions/`](docs/decisions/) |
| Offene Entscheidungen | [`docs/open-questions.md`](docs/open-questions.md) |
| Marketing / GTM | [`website-ia.md`](docs/website-ia.md) · [`messaging-architecture.md`](docs/messaging-architecture.md) · [`conversion-strategy.md`](docs/conversion-strategy.md) · [`go-to-market-launch-plan.md`](docs/go-to-market-launch-plan.md) |
| Billing (Vorbereitung) | [`billing-strategy.md`](docs/billing-strategy.md) · [`pricing-rationale.md`](docs/pricing-rationale.md) · [`payment-provider-evaluation.md`](docs/payment-provider-evaluation.md) |
| Infrastruktur / Betrieb | [`infrastructure.md`](docs/infrastructure.md) · [`deployment.md`](docs/deployment.md) · [`go-live-checklist.md`](docs/go-live-checklist.md) · [`storage-strategy.md`](docs/storage-strategy.md) · [`link-and-domain-strategy.md`](docs/link-and-domain-strategy.md) · [`env-and-secrets.md`](docs/env-and-secrets.md) |
| Auth / Sicherheit | [`api-design.md`](docs/api-design.md) · [`security.md`](docs/security.md) · [`webhooks.md`](docs/webhooks.md) |
| Portal / Delivery (Block 8) | [`storage-strategy.md`](docs/storage-strategy.md) · [`reminders.md`](docs/reminders.md) |
| Betrieb / Qualität (Block 9) | [`testing-and-ci.md`](docs/testing-and-ci.md) · [`observability.md`](docs/observability.md) · [`retention-and-cleanup.md`](docs/retention-and-cleanup.md) |
| Onboarding (Block 10) | [`onboarding-and-invitations.md`](docs/onboarding-and-invitations.md) |
| Billing (Block 11) | [`billing-and-plans.md`](docs/billing-and-plans.md) |
| Integrationen (Block 12) | [`integrations-guide.md`](docs/integrations-guide.md) · [`webhooks.md`](docs/webhooks.md) |
| Reporting (Block 13) | [`reporting-and-insights.md`](docs/reporting-and-insights.md) |
| Datenlebenszyklus (Block 15) | [`data-lifecycle.md`](docs/data-lifecycle.md) |
| Kollaboration (Block 14) | [`notifications-and-collaboration.md`](docs/notifications-and-collaboration.md) |
| A11y & Lokalisierung (Block 16) | [`accessibility.md`](docs/accessibility.md) · [`i18n-and-localization.md`](docs/i18n-and-localization.md) |
| E2E-Tests (Block 17) | [`e2e-testing.md`](docs/e2e-testing.md) |
| Release & Deployment (Block 18) | [`release-and-deployment-runbook.md`](docs/release-and-deployment-runbook.md) · [`deployment.md`](docs/deployment.md) |
| Containerisierung (Block 19–20) | [`containerization.md`](docs/containerization.md) |
| Voice-Erfassung (Block 21–22) | [`voice-and-capture.md`](docs/voice-and-capture.md) |
| Block-Summaries | [1](docs/block-1-summary.md) · [2](docs/block-2-summary.md) · [3](docs/block-3-summary.md) · [4](docs/block-4-summary.md) · [5](docs/block-5-summary.md) · [6](docs/block-6-summary.md) · [7](docs/block-7-summary.md) · [8](docs/block-8-summary.md) · [9](docs/block-9-summary.md) · [10](docs/block-10-summary.md) · [11](docs/block-11-summary.md) · [12](docs/block-12-summary.md) · [13](docs/block-13-summary.md) · [14](docs/block-14-summary.md) · [15](docs/block-15-summary.md) · [16](docs/block-16-summary.md) · [17](docs/block-17-summary.md) · [18](docs/block-18-summary.md) · [19](docs/block-19-summary.md) · [20](docs/block-20-summary.md) · [21](docs/block-21-summary.md) · [22](docs/block-22-summary.md) · [23](docs/block-23-summary.md) · [24](docs/block-24-summary.md) · [25](docs/block-25-summary.md) · [26](docs/block-26-summary.md) · [27](docs/block-27-summary.md) · [28](docs/block-28-summary.md) · [29](docs/block-29-summary.md) · [30](docs/block-30-summary.md) · [31](docs/block-31-summary.md) · [32](docs/block-32-summary.md) · [33](docs/block-33-summary.md) · [34](docs/block-34-summary.md) · [35](docs/block-35-summary.md) · [36](docs/block-36-summary.md) · [37](docs/block-37-summary.md) · [38](docs/block-38-summary.md) · [39](docs/block-39-summary.md) · [40](docs/block-40-summary.md) · [41](docs/block-41-summary.md) · [42](docs/block-42-summary.md) · [43](docs/block-43-summary.md) · [44](docs/block-44-summary.md) · [45](docs/block-45-summary.md) · [46](docs/block-46-summary.md) |

## Rollen ausprobieren

Nach `/login` (Dev: `owner@muster-garage.ch` / `password123`) im **Development**
oben rechts die **Demo-Rolle** umschalten (Owner/Admin/Advisor/Technician/
Viewer). Beobachten: „Neue Freigabe" und die Versand-Aktionen verschwinden für
Viewer/Technician, „Auswertung"/„Team" nur mit den passenden Rechten. Die
Berechtigungsmatrix steht in [`docs/api-design.md`](docs/api-design.md).

## Provider aktivieren (optional)

Alles läuft ohne externe Credentials (console-E-Mail, local-Storage). Zum
Aktivieren realer Provider: `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` bzw.
`STORAGE_DRIVER=supabase|r2` + deren Keys. Ohne Credentials fällt der Code sicher
zurück. Siehe [`docs/env-and-secrets.md`](docs/env-and-secrets.md).

## Tests & CI

```bash
npm run verify        # typecheck + build + test (alle Workspaces)
```

CI (`.github/workflows/ci.yml`) spiegelt dies mit einem Postgres-Service für die
Integrationstests. Details: [`docs/testing-and-ci.md`](docs/testing-and-ci.md).

## Nächster Block

**Block 16 — Barrierefreiheit, Lokalisierung & finaler Produktschliff:** WCAG-
Feinschliff (Tastatur/Screenreader/Kontrast), Mehrsprachigkeit-Grundlage
(de/fr/it für die Kundenseite), konsistente Leerzustände/Fehlerseiten und ein
End-to-End-Politur-Durchlauf. Details in
[`docs/block-15-summary.md`](docs/block-15-summary.md).
