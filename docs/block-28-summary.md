# Block 28 — Summary (Gespeicherte Ansichten / Saved Filter Views)

Baut auf den Listen-Filtern (Block 26/27) auf, ohne den bestehenden Filter-/
Pagination-Flow umzubauen. Häufig genutzte Filterkombinationen lassen sich als
benannte Ansicht speichern und per Klick wieder anwenden.

## 1. Was gebaut wurde

### Datenmodell

- Neues Prisma-Modell `SavedView` (`saved_views`): `tenantId`, optional
  `createdById` (SetNull), `name`, die Filterspalten
  `status/category/urgency/createdWithin/assignee`, `createdAt`. Unique
  `(tenantId, name)`, Index `(tenantId, createdAt)`. Migration
  `20260802120000_block28_saved_views` angewandt.

### Shared

- `@saf/types`: `savedViewFiltersSchema` (nur die erlaubten Filter-Keys,
  Zod-validiert: `status`=`APPROVAL_CASE_STATUS`, `category`=`ITEM_CATEGORY`,
  `urgency`=`URGENCY`, `createdWithin`=`CREATED_WITHIN`, `assignee`=`'me'`) +
  `createSavedViewSchema` (`name` 1–80 Zeichen, `filters` default `{}`).

### API

- `GET /saved-views` (`cases:read`) — Ansichten des Workspaces, aufsteigend.
- `POST /saved-views` (`cases:create`) — Ansicht anlegen; Name eindeutig je
  Tenant (`isUniqueViolation` ⇒ 409 mit freundlicher Meldung); Filter
  Zod-validiert ⇒ ungültige Werte 422.
- `DELETE /saved-views/:id` (`cases:create`) — tenant-scoped (findFirst-Guard,
  sonst 404).
- Filter werden als flache Spalten gespeichert und beim Lesen wieder zum
  `filters`-Objekt zusammengesetzt (Null-Werte fallen weg).

### Web

- Freigaben-Liste (`approvals/page.tsx`): neue Leiste „Ansichten" über der
  Fallliste. Gespeicherte Ansichten sind Ein-Klick-Links, die exakt ihre
  Filterkombination als URL setzen; die aktive Ansicht ist markiert
  (`aria-current`). Client-Komponente `_saved-views.tsx` mit „+ Aktuelle Filter
  speichern" (Name-Formular, nur bei aktiven Filtern aktiv) und Löschen je
  Ansicht; Server-Actions in `approvals/actions.ts`. Schreiben nur mit
  `cases:create`.
- `status` wird jetzt zusätzlich als Filter-Key durch `filterHref`/API geführt,
  damit Ansichten mit Statusfilter voll round-trippen.

### Tests

- Integration (`saved-views.test.ts`): Create→List→Delete-Round-Trip,
  Duplikat-Name 409, ungültiger Filterwert 422, leerer Name 422, VIEWER darf
  listen aber nicht anlegen (403), TECHNICIAN 403, Delete unbekannte id 404,
  Tenant-Isolation. Volle API-Suite grün (141 Tests).

### Doku

- `docs/api-design.md` (drei Endpoints), dieses Summary, Roadmap + README
  (inkl. Block-Summaries-Index).

## 2. Entscheidungen

- **Flache Filterspalten statt JSON-Blob** — die erlaubten Filter-Keys sind
  klein und stabil; einzelne Spalten sind indexierbar und Zod-geprüft, ohne
  freien JSON-Wildwuchs.
- **`cases:create` als Schreibrecht** — wer Fälle anlegt, kuratiert die (geteilte)
  Ansichtsliste; Lesen genügt `cases:read`, damit alle Rollen Ansichten nutzen.
- **Zod besitzt die Validierung** — nur die bekannten Filter-Keys werden
  übernommen; unbekannte Werte ⇒ 422, konsistent mit Block 26/27.

## 3. Was Mock/Placeholder blieb

- Ansichten sind workspace-geteilt (nicht pro Nutzer privat); keine
  Umbenennung/Sortierung, kein Default-View.

## 4. Später nötige Credentials/Accounts

- Keine.

## 5. Risiken

- Gespeicherte Filterwerte sind Momentaufnahmen der erlaubten Enums; entfällt
  künftig ein Enum-Wert, ignoriert die Liste ihn einfach (kein harter Fehler).

## 6. Nächster Block

Kandidaten: **private (pro-Nutzer) Ansichten** oder **Default-View**, **freier
Datumsbereich**, oder Härtung/Provider-Verifikation (whisper-STT, Registry-Push).
Vorschlag + Prompt im Handoff.
