# Block 1 — Summary (Foundation)

## 1. Was in Block 1 erstellt wurde

- **Strategische Dokumente:** `product-vision`, `personas`, `mvp-scope`,
  `pricing-and-monetization`, `go-to-market-foundation`, `roadmap`.
- **Architektur & API:** `architecture`, `api-design`, `domain-model` sowie
  ADRs 001–003 (Stack, REST-Strategie, Multi-Tenant).
- **UX & Design:** `design-system`, `information-architecture`, `wireframes`.
- **Repo-Struktur (npm-Monorepo):** `apps/web`, `apps/api`,
  `packages/{types,ui,db,config}`, `docs`.
- **Grundgerüst:** Root-Setup (TypeScript, Prettier, EditorConfig, `.env.example`),
  Fastify-API mit `/api/v1/health`, OpenAPI/Swagger, Fehler-Envelope,
  Auth-Kontext-Stub; Next.js-App-Shell + Token-basiertes Design.
- **Datenmodell:** vollständiges Prisma-Schema inkl. Tenant, User, Membership,
  Customer, Vehicle, ApprovalCase, ApprovalItem, ApprovalAccessLink,
  ApprovalDecision, Attachment, AuditEvent, OutboundMessage, MessageTemplate,
  ApiKey.

## 2. Architekturentscheidungen

- npm-workspaces-Monorepo (kein Extra-Tooling) — handhabbar für Nicht-Entwickler.
- Dedizierte, versionierte REST-API (`/api/v1`) als Source of Truth, OpenAPI aus
  dem Code — für Integrationsfähigkeit (ADR-002).
- Multi-Tenancy „by row" mit expliziter `Membership` (ADR-003).
- Geteilte Contracts über `@saf/types` (Zod + Enums + Envelope).
- CSS-Design-Tokens statt schwerem UI-Framework.

## 3. Getroffene Annahmen

- Start in der Schweiz/DACH, Währung CHF, Sprache Deutsch.
- Ein User gehört im MVP genau einem Tenant an (Membership hält es erweiterbar).
- Kundenseite bleibt strikt loginlos.
- Preise als Minor Units (Rappen) als Preisband.

## 4. Offene Entscheidungen

Siehe `open-questions.md` (SMS-Versand, Einzel-Positionsfreigabe, Foto-Upload-
Zeitpunkt, Auth-Reihenfolge) — alle mit Empfehlung und ohne Build-Blocker.

## 5. Nächster Block

**Block 2 — Approval Case Workflow (End-to-End):** Fall erstellen → Liste →
Detail → sicherer Kundenlink → loginloser Kundenentscheid → Status + Audit-Trail.
(→ in diesem Repository bereits umgesetzt, siehe `block-2-summary.md`.)
