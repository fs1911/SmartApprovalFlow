# Block 33 — Summary (Ansichten duplizieren)

Baut auf den gespeicherten Ansichten (Block 28/29/32) auf, ohne den bestehenden
Saved-View-/Filter-Flow umzubauen. Eine gespeicherte Ansicht lässt sich als
**Kopie** anlegen, um schnell Varianten zu erstellen.

## 1. Was gebaut wurde

### API

- `POST /saved-views/:id/duplicate` (`cases:create`) — legt eine neue Ansicht an,
  die **Filter und `visibility`** der Quelle übernimmt. Der Name ist
  „`<Name> (Kopie)`", bei Kollision automatisch „`(Kopie 2)`", „`(Kopie 3)`" …
  (eindeutig je Tenant; die Basis wird so gekürzt, dass der Name ≤ 80 Zeichen
  bleibt). Die Kopie landet ans **Ende** der sichtbaren Liste
  (`sortOrder = max + 1`). Visibility-scoped: eine **fremde private** Quelle ist
  unsichtbar ⇒ **404** (kein Existenz-Leak). Kein Request-Body → keine neue
  Zod-Schema nötig. OpenAPI neu exportiert.

### Web

- Freigaben-Liste (`approvals/_saved-views.tsx`): pro Ansicht ein **⧉**-Button
  (Duplizieren, nur `cases:create`) neben ◀▶/✎/✕. Server-Action
  `duplicateSavedView(id)` (`approvals/actions.ts`) ruft den Endpoint auf und
  revalidiert `/approvals`. Fehler werden inline angezeigt.

### Tests

- Integration (`saved-views-duplicate.test.ts`, 5 Tests): Kopie übernimmt Filter
  + `visibility` (SHARED); zweifaches Duplizieren zählt das Suffix hoch
  („(Kopie)" → „(Kopie 2)"); private Kopie bleibt für den Besitzer privat und
  ist für andere unsichtbar; fremde private Quelle ⇒ 404; RBAC (VIEWER ⇒ 403).

### Doku

- `docs/api-design.md` (neue Zeile), dieses Summary, Roadmap + README.

## 2. Entscheidungen

- **Server-seitige Namensvergabe mit Auto-Suffix** — verhindert Kollisionen ohne
  Nutzer-Interaktion; die Schleife versucht aufsteigende Suffixe und verlässt
  sich auf die Unique-Constraint (`tenantId, name`), sodass parallele Duplikate
  race-sicher sind (P2002 ⇒ nächstes Suffix).
- **`visibility` wird übernommen, `createdById = Aufrufer`** — eine Kopie einer
  privaten Ansicht gehört der duplizierenden Person (sie ist per
  `visibilityWhere` die einzige, die die Quelle sehen konnte).
- **Kopie ans Ende** (`sortOrder = max + 1`) — vorhersehbar; die Reihenfolge
  lässt sich danach mit den Block-32-Bedienelementen anpassen.
- **404 statt 403** bei fremden privaten Quellen (konsistent mit Löschen/
  Umbenennen).

## 3. Was Mock/Placeholder blieb

- Keine Auswahl-Dialoge (Sichtbarkeit/Name der Kopie werden automatisch gesetzt;
  Umbenennen/Sichtbarkeit-Ändern erfolgt bei Bedarf über die bestehenden
  Bedienelemente).

## 4. Später nötige Credentials/Accounts

- Keine.

## 5. Risiken

- Bei > 100 gleichnamigen Kopien bricht die Suffix-Schleife mit 409 ab
  (praktisch irrelevant; bewusst begrenzt).

## 6. Nächster Block

Kandidaten: **Provider real aktivieren** (Resend/Storage zuerst, mit
Accounts/Secrets), weiterer **Produkt-Feinschliff** oder **Härtung**.
Vorschlag + Prompt im Handoff.
