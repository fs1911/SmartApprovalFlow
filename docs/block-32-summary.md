# Block 32 — Summary (Ansichten umbenennen & sortieren)

Baut auf den gespeicherten Ansichten (Block 28/29) auf, ohne den bestehenden
Saved-View-/Filter-Flow umzubauen. Gespeicherte Ansichten lassen sich jetzt
**umbenennen** und in eine **manuelle Reihenfolge** bringen.

## 1. Was gebaut wurde

### Datenmodell / Shared

- `SavedView` um `sortOrder Int @default(0)` erweitert (Migration
  `20260817073221_block32_saved_view_sort_order`, additiv: `ADD COLUMN` +
  Index `@@index([tenantId, sortOrder])`). Niedriger = weiter vorne, bei
  Gleichstand entscheidet `createdAt`.
- `@saf/types`: `renameSavedViewSchema` (`{ name: 1..80 }`) und
  `reorderSavedViewsSchema` (`{ orderedIds: UUID[] (1..200) }`).

### API

- `PATCH /saved-views/:id` (`cases:create`) — benennt eine sichtbare Ansicht um.
  Visibility-scoped (`visibilityWhere`): fremde private Ansicht ⇒ **404** (kein
  Existenz-Leak), Namenskollision ⇒ **409**. Liefert die aktualisierte Ansicht.
- `POST /saved-views/reorder` (`cases:create`) — setzt `sortOrder` aus der
  Position in `orderedIds`. Nur für den Aufrufer **sichtbare** IDs wirken; unbe-
  kannte/fremde IDs werden ignoriert (eine Person kann fremde private Ansichten
  nicht umsortieren). Antwort enthält die effektiv angewandte Reihenfolge.
- `GET /saved-views` sortiert jetzt `[{ sortOrder: 'asc' }, { createdAt: 'asc' }]`.
- Beide Routen sind vor den `:id`-Routen registriert (literal path gewinnt),
  Zod-owned Validierung (422), tenant-scoped. OpenAPI neu exportiert.

### Web

- Freigaben-Liste (`approvals/_saved-views.tsx`): pro Ansicht zusätzlich
  **◀ ▶** (nach vorne/hinten verschieben, an den Rändern deaktiviert) und
  **✎** (inline umbenennen mit Speichern/Abbrechen) — neben den bestehenden
  ☆ (Standard) und ✕ (löschen). Alle Bedienelemente sind mit `aria-label`
  beschriftet und nur für Nutzer mit `cases:create` sichtbar.
- Server-Actions `renameSavedView(id, name)` und `reorderSavedViews(orderedIds)`
  (`approvals/actions.ts`), die die neuen Endpoints aufrufen und `/approvals`
  revalidieren. Fehler (409/422) werden inline angezeigt.

### Tests

- Integration (`saved-views-manage.test.ts`, 6 Tests): Umbenennen erfolgreich;
  Namenskollision ⇒ 409; nicht sichtbare/fremde Ansicht ⇒ 404; RBAC (VIEWER ⇒
  403); Reorder schreibt Reihenfolge und `GET` spiegelt sie; Reorder ignoriert
  fremde private IDs (Isolation).

### Doku

- `docs/api-design.md` (zwei neue Zeilen), dieses Summary, Roadmap + README.

## 2. Entscheidungen

- **Manueller `sortOrder` statt Auto-Sort** — Werkstätten arbeiten mit wenigen,
  wiederkehrenden Ansichten; eine feste, selbst gewählte Reihenfolge ist
  vorhersehbarer als Sortierung nach Name/Datum. Ein einzelnes Integer-Feld
  reicht, kein Junction-Table.
- **Ein `sortOrder` je Zeile** — geteilte Ansichten ordnen die Workspace-Liste,
  private die Liste ihrer Besitzer:in. Bewusst einfach: kein per-Nutzer-Ordering
  geteilter Ansichten (wäre Overkill für den MVP).
- **Reorder ist client-getrieben, server-autoritativ** — der Client schickt die
  gewünschte Reihenfolge der ihm sichtbaren IDs; der Server filtert auf die
  tatsächlich sichtbaren, sodass Sichtbarkeits-/Tenant-Grenzen nie umgangen
  werden.
- **404 statt 403** bei fremden privaten Ansichten (konsistent mit Löschen aus
  Block 29 — kein Existenz-Leak).

## 3. Was Mock/Placeholder blieb

- Kein Drag-&-Drop (Verschieben per ◀▶-Buttons, funktioniert ohne komplexes
  Client-JS und bleibt tastaturbedienbar); keine Sortierung geteilter Ansichten
  pro Nutzer.

## 4. Später nötige Credentials/Accounts

- Keine.

## 5. Risiken

- Zwei Nutzer, die geteilte Ansichten gleichzeitig umsortieren, überschreiben
  gegenseitig `sortOrder` (letzter gewinnt). Für die Workspace-weite Anordnung
  unkritisch und bewusst einfach gehalten.

## 6. Nächster Block

Kandidaten: **Provider real aktivieren** (Resend/Storage zuerst, mit
Accounts/Secrets), weiterer **Produkt-Feinschliff** der Freigaben-Liste
(z. B. Ansichten duplizieren, Filter-Chips gruppieren) oder **Härtung**.
Vorschlag + Prompt im Handoff.
