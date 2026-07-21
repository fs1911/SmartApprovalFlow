# ADR-001: Foundation Stack

- **Status:** akzeptiert (Block 1)
- **Datum:** 2026-07

## Kontext

Wir bauen ein Vertical-SaaS (Approval Flow für Garagen), das professionell
wirken, integrationsfähig sein und **für einen Nicht-Entwickler mit Claude Code
handhabbar** bleiben muss. TypeScript-first ist gesetzt.

## Entscheidung

- **Monorepo mit npm workspaces** (`apps/*`, `packages/*`). Eingebaut, keine
  Zusatztools (kein pnpm/turbo-Zwang) → weniger, was schiefgehen kann.
- **Next.js 14 (App Router) + React 18** für die Web-App.
- **Fastify + `@fastify/swagger`** für die dedizierte, versionierte REST-API.
- **PostgreSQL + Prisma** für Persistenz und Migrationen.
- **Zod** als geteilte Validierungs-/Contract-Schicht (`@saf/types`).
- **CSS Design-Tokens** (`@saf/ui`) statt schwerem UI-Framework/Build.

## Alternativen

- **Nur Next.js (Route Handlers) ohne separate API:** einfacher im Betrieb,
  aber schwächere, weniger explizite Integrations-API. Siehe adr-002.
- **NestJS statt Fastify:** mehr Struktur, aber mehr Boilerplate/Ballast als im
  MVP nötig.
- **pnpm/Turborepo:** leistungsfähiger, aber zusätzliche Tooling-Hürde für einen
  Nicht-Entwickler.
- **Tailwind statt Tokens:** verbreitet, aber Build-/Konfig-Overhead; Tokens sind
  transparenter und genügen im MVP.

## Konsequenzen

- Zwei Prozesse in der Entwicklung (web + api). Bewusst gering gehalten:
  ein Repo, geteilte Packages, ein `npm run dev`.
- Klare, wiederverwendbare Contracts über `@saf/types`.
- Einfache, anpassbare Optik ohne Build-Magie.
- Wechsel/Umbau einzelner Teile bleibt lokal begrenzt.
