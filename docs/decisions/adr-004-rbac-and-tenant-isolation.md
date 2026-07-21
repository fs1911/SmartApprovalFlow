# ADR-004: RBAC & Tenant Isolation

- **Status:** akzeptiert (Block 4)
- **Datum:** 2026-07

## Kontext

Für echten Multi-Tenant-B2B-Betrieb müssen Rechte **wirksam** (nicht nur
dokumentiert) und **tenant-spezifisch** sein. Globale Rollen ohne Tenant-Kontext
sind ein häufiger Architekturfehler; Zugriffe müssen Membership **und**
Ressourcenzugehörigkeit prüfen.

## Entscheidung

- **Kontrolliertes Rollenmodell** (keine frei definierbaren Custom Roles):
  `OWNER`, `ADMIN`, `SERVICE_ADVISOR` (Produktbegriff „Advisor"), `TECHNICIAN`,
  `VIEWER`. `SERVICE_ADVISOR` bleibt als Enum-Wert erhalten (Kompatibilität mit
  bestehenden Daten) — Umbenennungen von Enum-Werten wären unnötiger Umbau.
- **Rollen sind tenant-scoped** über `Membership (User ↔ Tenant ↔ Role)`.
- **Feste Permission-Matrix** in `@saf/types` (`ROLE_PERMISSIONS`), geteilt von
  API (Durchsetzung) und Web (Anzeige/Gating) — eine Quelle, kein Drift.
- **Durchsetzung an der API:** `requirePermission(permission)` als Fastify
  preHandler an jeder mutierenden/lesenden Route. `/me` liefert Rolle +
  Permissions an das Frontend.
- **Membership-aware Auth:** Der Auth-Kontext löst die Rolle aus der Membership
  im **aktuellen Tenant** auf (im Dev-Stub via `x-saf-user`); ohne Mitgliedschaft
  → `403`.
- **Tenant-Isolation:** Jede Query filtert nach `tenantId` (aus dem
  Auth-Kontext, nie aus der URL). Ressourcen-Lookups sind
  `findFirst({ where: { id, tenantId } })` → Cross-Tenant-Zugriff per
  URL-Manipulation ergibt `404`, nicht Fremddaten.
- **Owner-Guardrails:** Nur `OWNER` darf die Rolle `OWNER` vergeben; der
  **letzte Owner** kann nicht herabgestuft werden.

## Alternativen

- **Frei definierbare Rollen/Policies:** mächtiger, aber für den MVP zu komplex
  und fehleranfällig.
- **Nur Auth ohne Permission-Layer:** unzureichend — Rechte wären unscharf.
- **Postgres Row-Level-Security:** starke zweite Verteidigungslinie, aber
  Betriebs-Overhead; als spätere Ergänzung offen gehalten.
- **Enum-Rename `SERVICE_ADVISOR`→`ADVISOR`:** verworfen (Dat/ Code-Churn ohne
  fachlichen Mehrwert; Anzeigename löst das).

## Konsequenzen

- Rechte sind in App und API sichtbar wirksam (z. B. VIEWER kann nichts anlegen,
  TECHNICIAN sieht keine Auswertung).
- Der Weg zu Multi-Workspace-Usern bleibt offen (Membership bereits explizit).
- Der Dev-Auth-Stub bleibt bis Block 5; **nur** `auth-context.ts` wird dann
  gegen echte JWT-/API-Key-Prüfung getauscht. Die Permission-Matrix bleibt.
- Isolation hängt weiter an disziplinierter `tenantId`-Filterung (per Review/Test
  gesichert; optional später RLS).
