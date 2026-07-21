# Smart Approval Flow für Garagen

Digitale, sichere und **dokumentierte Kundenfreigaben** für Werkstätten — mit
Foto, Klartext und Preisband. Der Kunde entscheidet mobil, **ohne App und ohne
Login**. Alles revisionssicher protokolliert.

> Das Produkt verkauft nicht „Tickets", sondern **Vertrauen, Geschwindigkeit und
> belegbare Freigaben**. Kein DMS-Ersatz — ein wertvoller Layer über bestehender
> Garagensoftware.

**Status:** Block 1 (Foundation) ✅ · Block 2 (Approval Workflow) ✅ ·
Block 3 (Operational Hardening) ✅ · Block 4 (Multi-Tenant-B2B-Reife) ✅ —
siehe [`docs/roadmap.md`](docs/roadmap.md).

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
sichtbar wirksam; im Topbar lässt sich die **Demo-Rolle** umschalten, um RBAC
zu erleben (bis echte Auth in Block 5 folgt).

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

> **Auth im aktuellen Stand:** Ein Dev-Stub setzt Tenant/Rolle über Header
> (`x-saf-tenant`, `x-saf-role`). Echte Authentifizierung folgt in Block 5 —
> es wird nur `apps/api/src/plugins/auth-context.ts` ausgetauscht.

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
| Block-Summaries | [1](docs/block-1-summary.md) · [2](docs/block-2-summary.md) · [3](docs/block-3-summary.md) · [4](docs/block-4-summary.md) |

## Rollen ausprobieren

Im laufenden Dev-Setup oben rechts die **Demo-Rolle** umschalten
(Owner/Admin/Advisor/Technician/Viewer). Beobachten: „Neue Freigabe" und die
Versand-Aktionen verschwinden für Viewer/Technician, „Auswertung"/„Team" nur mit
den passenden Rechten. Die Berechtigungsmatrix steht in
[`docs/api-design.md`](docs/api-design.md).

## Nächster Block

**Block 5 — Auth- & Integrations-Härtung:** echte Authentifizierung
(JWT + API-Keys/Scopes), Rate-Limiting, persistente Idempotency und echte
Webhook-Zustellung (HMAC/Retry). Details in
[`docs/block-4-summary.md`](docs/block-4-summary.md).
