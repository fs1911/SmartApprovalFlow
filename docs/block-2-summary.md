# Block 2 — Summary (Approval Case Workflow)

Baut auf der Block-1-Foundation auf (keine neue Architektur, kein Rewrite der
Strategie). Ergebnis: der erste echte End-to-End-Kernworkflow.

## 1. Was in Block 2 gebaut wurde

### API (Fastify, `/api/v1`)
- `POST /approval-cases` — Fall erstellen: Zod-Validierung, Kunde/Fahrzeug/
  Positionen eingebettet angelegt, Referenz `AC-JJJJ-NNNN`, Idempotency-Key,
  Audit-Event `CASE_CREATED` (+ `CASE_SENT` bei „sofort senden").
- `GET /approval-cases` — Liste, Cursor-Pagination, tenant-gefiltert, mit
  Kunde/Fahrzeug/Positionszahl.
- `GET /approval-cases/:id` — Detail inkl. Positionen, Entscheiden, Audit-Trail,
  Access-Link-Status.
- `POST /approval-cases/:id/generate-public-link` — sicheren Token erzeugen/
  rotieren (nur Hash gespeichert, `expiresAt` 14 Tage), Status → `SENT`,
  Audit `approval_link_generated`, gibt einmalig die volle URL zurück.
- `GET /public/approvals/:token` — loginlose, kundensichere Ansicht; erster
  Aufruf setzt `VIEWED` + Audit `CASE_LINK_VIEWED`.
- `POST /public/approvals/:token/respond` — Entscheid approve/decline/callback:
  `ApprovalDecision` schreiben, Status setzen, zwei Audit-Events
  (Kundenaktion + `status_changed`), idempotent.
- OpenAPI aktualisiert (`/docs`), Export-Script `openapi:export`.

### Web (Next.js App Router)
- **Übersicht** `/dashboard` — Status-Kennzahlen + neueste Fälle.
- **Freigaben** `/approvals` — Liste mit Status-/Urgency-Badges,
  professioneller Empty State.
- **Neu** `/approvals/new` — Formular (alle geforderten Felder), Validierung
  über Server Action, Erfolg → Redirect auf Detail.
- **Detail** `/approvals/:id` — Positionen + Preisband, Kunde/Fahrzeug, Meta,
  sichtbarer Audit-Trail, Kundenlink erzeugen + Copy.
- **Kundenseite** `/a/{token}` — mobile-first, gebrandeter Header, einfache
  Sprache, Preisband, Buttons Freigeben/Ablehnen/Rückruf, saubere Success-States,
  klare Fehlerseite bei ungültigem/abgelaufenem Link.

### Sonstiges
- **Seed** (`packages/db/prisma/seed.ts`) legt Demo-Tenant, Nutzer, Kunde,
  Fahrzeug, einen Beispiel-Fall und eine Standardvorlage an.
- **Tests** (`node:test`): Zod-Validierung (Pflichtfelder, Kontakt-Regel,
  Preisband, Decision-Enum) und Cursor-Round-Trip.

## 2. Getroffene Annahmen

- Ein Fall hat im MVP genau eine Hauptposition aus dem Formular; das Datenmodell
  (`ApprovalItem[]`) erlaubt bereits mehrere.
- Der ganze Fall wird als Einheit entschieden (keine Einzel-Positionsfreigabe).
- Versand ist noch manuell (Copy-Link); E-Mail/SMS folgt in Block 4.
- Auth bleibt Dev-Stub (Header `x-saf-tenant`/`x-saf-role`).

## 3. Bewusst einfach gehalten

- Foto-Upload nur als Datenmodell/Pfad, keine Upload-UI (Block 3).
- Idempotency-Store In-Memory (Block 5: persistent).
- Kein Rate-Limiting, keine Webhooks, keine Erinnerungen.
- `EXPIRED`/`CANCELLED` sind modelliert, aber ohne Hintergrund-Job/CTA.

## 4. Risiken / technische Schulden

- **Auth-Stub** darf nicht in Produktion — Block 5 ersetzt nur
  `auth-context.ts`; Endpoints bleiben.
- **Tenant-Isolation** hängt an disziplinierter `tenantId`-Filterung (per Review/
  Test zu sichern; optional später Postgres RLS).
- **In-Memory-Idempotency** überlebt keinen Neustart/Scale-out.
- **Raw-Token nur einmal sichtbar:** nach Reload muss der Link neu erzeugt werden
  (bewusst, da nur der Hash gespeichert wird).
- Web-App braucht laufende API + Postgres; ohne DB zeigen Screens saubere
  Fehlerzustände.

## 5. Nächster Block

**Block 3 — Customer Approval Portal (Ausbau):** produktiver Foto-Upload
(Storage-Treiber), mehrere Positionen mit optionaler Einzelfreigabe, feineres
Kundenerlebnis. Danach Block 4 (Notifications/Templates) und Block 5
(echte Auth, API-Keys, Rate-Limiting, Webhooks, persistente Idempotency).
