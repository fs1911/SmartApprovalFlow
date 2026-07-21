# Architektur

## Gewählter Stack

| Ebene | Wahl | Kurzbegründung |
| --- | --- | --- |
| Sprache | **TypeScript** (überall) | Ein Typensystem von DB bis UI, geteilte Contracts. |
| Monorepo | **npm workspaces** | Eingebaut, kein Extra-Tooling — handhabbar für Nicht-Entwickler. |
| Web-App | **Next.js 14 (App Router), React 18** | Moderne, verbreitete SSR-Web-App; klickbare Flows. |
| Public API | **Fastify + `@fastify/swagger`** | Schlanke, schnelle REST-API; OpenAPI aus dem Code. |
| Datenbank | **PostgreSQL** | Robust, relational, verbreitet. |
| ORM | **Prisma** | Deklaratives Schema, Migrationen, guter DX. |
| Validierung | **Zod** (shared) | Eine Schemaquelle für API-Input und Web-Formulare. |
| Design | **CSS Design-Tokens** (`@saf/ui`) | Kein Build-Zwang, konsistent, leicht anpassbar. |

## Warum getrennte API (`apps/api`) statt nur Next.js Route Handlers?

Das Produkt ist von Anfang an **integrationsfähig** gedacht: bestehende
Garagensoftware und spätere Partner sollen dieselbe REST-API nutzen wie die
eigene Web-App. Eine **dedizierte, versionierte API als Source of Truth** macht
diesen Vertrag explizit und unabhängig vom Web-Rendering. Die Web-App ist damit
nur *einer* von mehreren Clients. Details: `decisions/adr-002-rest-api-strategy.md`.

Der Preis (zwei Prozesse in der Entwicklung) ist bewusst niedrig gehalten:
ein Monorepo, ein `npm run dev`, geteilte Packages — weiterhin gut handhabbar.

## Systemübersicht

```
                +-------------------+        +--------------------+
   Garage  ---> |  apps/web (Next)  | -----> |  apps/api (Fastify)| ---> PostgreSQL
   (intern)     |  SSR + Formulare  |  REST  |  /api/v1 + OpenAPI |      (Prisma)
                +-------------------+        +--------------------+
                                                     ^
   Kunde (loginlos, mobil)  --------- REST ----------|
        /a/{token}  ->  /api/v1/public/approvals/{token}

   Zukunft: Partner-/DMS-Integrationen ---- REST (API-Keys) ----^
            Voice-Layer  ---- erweitert Fallerstellung ---------^

   Shared packages: @saf/types (Contracts/Zod) · @saf/db (Prisma) · @saf/ui (Tokens)
```

## Tenant-Modell

Multi-Tenant **by row**: (fast) jede Geschäftszeile trägt `tenantId`; alle
Queries filtern danach. Ein `Membership` verbindet `User`↔`Tenant`↔`Role`.
Begründung und Alternativen: `decisions/adr-003-multi-tenant-model.md`.

## Kernmodule

- **Identity & Tenancy** — Tenant, User, Membership/Role.
- **Approval Workflow** — ApprovalCase, ApprovalItem, ApprovalAccessLink,
  ApprovalDecision (der Wedge).
- **Attachments** — Foto-/Datei-Anhänge (Storage-Key, Bytes extern).
- **Audit** — append-only AuditEvent (revisionssicher).
- **Messaging** — OutboundMessage, MessageTemplate (vorbereitet, Block 4).
- **Integration** — ApiKey mit Scopes (vorbereitet, Block 5).

## Security-Grundlagen

- **Tenant-Isolation** in jeder Query (`where: { tenantId }`).
- **Loginlose Kundenlinks** über unguessbare Tokens; nur der **SHA-256-Hash**
  wird gespeichert, mit `expiresAt`/`revokedAt`.
- **Konsistentes Fehlerformat**, keine internen Details in Produktion.
- **Idempotency** für kritische Writes (Fall erstellen, Kundenentscheid).
- **Rollen/Scopes** vorbereitet; echte Auth in Block 5.
- **Datenminimierung** auf der Kundenseite (nur kundenrelevante Felder).

## Was ist bewusst noch nicht gebaut?

Echte Authentifizierung (JWT/Sessions, API-Key-Prüfung), produktiver
Nachrichtenversand, persistente Idempotency (aktuell In-Memory), Webhooks,
Rate-Limiting. Alles ist im Datenmodell/der Struktur vorbereitet — siehe
`roadmap.md`.
