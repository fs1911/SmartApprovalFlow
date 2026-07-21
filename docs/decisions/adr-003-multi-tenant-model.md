# ADR-003: Multi-Tenant Model

- **Status:** akzeptiert (Block 1)
- **Datum:** 2026-07

## Kontext

Jede Garage ist ein eigener Mandant (Workspace). Daten müssen strikt getrennt
sein; gleichzeitig soll der MVP einfach und der Weg zu Gruppen/White-Label offen
bleiben.

## Entscheidung

**Multi-Tenancy „by row" in einer gemeinsamen Datenbank/Schema:**

- Root-Entity **`Tenant`**; (fast) jede Geschäftszeile trägt **`tenantId`**.
- **Alle** Queries filtern nach `tenantId` (Isolation im Application-Layer;
  in der API über den `AuthContext.tenantId`).
- **`Membership`** verbindet `User`↔`Tenant`↔`Role` explizit — obwohl im MVP
  ein User genau einem Tenant angehört. So wird Multi-Workspace später
  bruchfrei möglich.
- `Tenant` trägt Locale/Timezone/Currency/`brandName` → White-Label vorbereitet.

## Alternativen

- **Schema-per-Tenant / DB-per-Tenant:** stärkere Isolation, aber deutlich mehr
  Betriebs-/Migrationsaufwand — für den MVP unangemessen.
- **User direkt am Tenant (ohne Membership):** minimal einfacher jetzt, aber
  teurer Umbau bei Multi-Workspace/Rollen später.

## Konsequenzen

- Einfacher Betrieb, eine Migrationslinie.
- Isolation hängt an disziplinierter `tenantId`-Filterung → als Regel
  dokumentiert und in Reviews/Tests zu prüfen. Optional später Postgres
  Row-Level-Security als zweite Verteidigungslinie.
- Skalierung/Trennung einzelner Grosskunden bleibt später möglich, ohne das
  Datenmodell umzuwerfen.
