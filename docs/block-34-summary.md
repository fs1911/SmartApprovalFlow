# Block 34 — Summary (Fall-Anzahl je Ansicht)

Baut auf den gespeicherten Ansichten (Block 28–33) und den Listen-Filtern
(Block 26/27/31) auf, ohne den bestehenden Filter-/Listen-Flow umzubauen. Jede
gespeicherte Ansicht zeigt jetzt, **wie viele Fälle aktuell auf ihre Filter
passen**.

## 1. Was gebaut wurde

### Geteilte Filterlogik (Refactor, keine Duplizierung)

- Neue `apps/api/src/lib/case-filters.ts` mit `createdWithinCutoff`,
  `createdAtRange` und `caseFilterWhere(tenantId, filters, userId)` — der
  tenant-scoped `where`-Builder für die Fall-Filter (Status/Kategorie-Relation/
  Dringlichkeit/`createdWithin`/`createdFrom`-`To`/`assignee`).
- `approval-cases.ts` nutzt jetzt `caseFilterWhere` in der Liste (die lokalen
  Helfer wurden entfernt) — **eine** Quelle der Wahrheit für die Filter-Semantik,
  die Fall-Liste und Ansicht-Zählung teilen sie.

### API

- `GET /saved-views` liefert je Ansicht ein zusätzliches Feld **`matchCount`** —
  die Anzahl der Fälle, die auf die gespeicherten Filter passen (`prisma.
  approvalCase.count` mit `caseFilterWhere`, `assignee: 'me'` relativ zum
  Aufrufer). Die Zählungen laufen **parallel** (`Promise.all`); gespeicherte
  Ansichten sind je Tenant wenige, ein `groupBy` passt nicht (Kategorie ist ein
  Relationsfilter, Datumsbereiche unterscheiden sich je Ansicht).

### Web

- Freigaben-Liste (`approvals/_saved-views.tsx`): dezentes Zähler-Badge am
  Ansichts-Chip (Zahl neben dem Namen). Für Screenreader trägt der Chip ein
  `aria-label` „`<Name> — <n> Fälle`"; das visuelle Badge ist `aria-hidden`, um
  Doppel-Ansage zu vermeiden. `SavedView`-Typ um `matchCount: number` erweitert.

### Tests

- Integration (`saved-views-count.test.ts`, 4 Tests): `matchCount` ist eine Zahl
  und die filterlose Ansicht ≥ eine gefilterte; ein neu angelegter HIGH-Fall
  erhöht die HIGH-Ansicht um genau 1; ein SAFETY-Fall erhöht die Kategorie-
  Ansicht; ein nicht passender (LOW-)Fall lässt die HIGH-Ansicht unverändert.

### Doku

- `docs/api-design.md` (Feld erwähnt), dieses Summary, Roadmap + README.

## 2. Entscheidungen

- **Geteilter `caseFilterWhere`-Helper** statt Filterlogik in `saved-views` zu
  duplizieren — Liste und Zählung können so nie auseinanderdriften.
- **Parallele Einzel-Counts** statt eines gebündelten Aggregats — bei wenigen
  Ansichten je Tenant unkritisch, und die heterogenen Filter (Relations-/
  Datumsfilter) lassen sich nicht in ein einzelnes `groupBy` fassen. Bewusst
  dokumentiert.
- **`matchCount` live berechnet** (kein persistenter Zähler) — immer korrekt,
  keine Invalidierung/Backfill nötig; passt zum ohnehin dynamischen Filter-Flow.
- **`assignee: 'me'` relativ zum Aufrufer** — konsistent mit der Fall-Liste; die
  Zahl bedeutet für jede Person „meine passenden Fälle", wo der Filter das sagt.

## 3. Was Mock/Placeholder blieb

- Keine Zwischenspeicherung/Caching der Counts (Live-Zählung pro Request).

## 4. Später nötige Credentials/Accounts

- Keine.

## 5. Risiken

- Bei sehr vielen gespeicherten Ansichten je Tenant summieren sich die parallelen
  Counts; für den MVP-Umfang (wenige Ansichten) unkritisch, andernfalls später
  cachen/bündeln.

## 6. Nächster Block

Kandidaten: **Provider real aktivieren** (Resend/Storage zuerst, mit
Accounts/Secrets), weiterer **Produkt-Feinschliff** oder **Härtung**.
Vorschlag + Prompt im Handoff.
