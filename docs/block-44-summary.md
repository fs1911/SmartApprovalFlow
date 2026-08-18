# Block 44 — Summary (Sortierung der Freigaben-Liste)

Die Freigaben-Liste lässt sich jetzt nach Erstelldatum sortieren — **Neueste**
(Default) oder **Älteste** zuerst. API-getragen (`?sort=`) inkl. korrekter
Cursor-Pagination in beide Richtungen, dazu eine JS-freie GET-Steuerung im Web.
Keine Schema-/Migrations-Änderung (`createdAt` existiert bereits).

## 1. Was gebaut wurde

### Shared

- `listQuerySchema` (@saf/types) erhält `sort: z.enum(['newest','oldest'])`
  mit Default `newest` → ungültige Werte werden von Zod als **422** abgelehnt.

### API — `GET /api/v1/approval-cases`

- Neuer `?sort=`-Parameter. `oldest` dreht **beides**: die `orderBy`-Richtung
  (`createdAt asc, id asc`) **und** den Keyset-Cursor-Vergleich (`gt` statt
  `lt`), damit die Seitenweiterschaltung in dieselbe Richtung wie die Sortierung
  läuft — keine übersprungenen/doppelten Zeilen an Seitengrenzen.
- Swagger-Querystring ohne `enum` (Zod bleibt die Validierungsquelle).
- **CSV-Export** (`/approval-cases/export.csv`) honoriert `?sort=` ebenfalls
  (teilt das Schema) — der Export folgt der gewählten Reihenfolge.

### Web — Freigaben-Liste

- Neue Sortier-Steuerung („Neueste zuerst" / „Älteste zuerst") als zwei
  Filter-Style-Links (`role="group"`, `aria-current`), konsistent mit den
  bestehenden Filtergruppen; funktioniert ohne Client-JS.
- `sort` reist über `filterHref` mit, sodass es **Filterwechsel überlebt**; es
  ist aber kein Filter: aus `hasActiveFilters` und den Ansichts-/Standard-
  Gleichheitsprüfungen ausgenommen (eigene `activeFilters`-Kopie ohne `sort`),
  und es wird **nicht** in gespeicherte Ansichten übernommen.
- `sort` fließt in die Listen-Abfrage und in den CSV-Export-Link ein.

### Tests

- Neue `approval-cases-sort.test.ts` (**5**): Default newest-first (monoton
  fallend), `sort=oldest` oldest-first (monoton steigend), Sortier-Kopf
  gedreht, ungültiger Wert → 422, **Cursor-Pagination oldest-first bleibt über
  Seiten hinweg aufsteigend** (kein Overlap). API-Suite **180 → 185 grün**.

### Doku

- Dieses Summary, Roadmap, README, `api-design.md` (Listen-Zeile).
- `openapi.json` regeneriert.

## 2. Entscheidungen

- **Keyset-Cursor spiegeln statt Offset** — die Liste nutzt bereits
  `(createdAt,id)`-Cursor; die saubere Lösung ist, Ordnung **und** Vergleich zu
  spiegeln, nicht auf Offset-Pagination umzustellen.
- **`sort` ist kein Filter** — es verändert nicht die Treffermenge, daher aus
  `hasActiveFilters`, Ansichts-Matching und gespeicherten Ansichten
  herausgehalten; es reist aber durch die URL mit, damit es beim Filtern nicht
  verloren geht.
- **`newest` als Default** — unveränderte bisherige Reihenfolge; nur `oldest`
  erscheint überhaupt in der URL.

## 3. Was Mock/Placeholder blieb

- Nichts; keine Provider/Secrets berührt.

## 4. Später nötige Credentials/Accounts

- Keine.

## 5. Risiken

- Gering. Cursor-Richtung ist testabgedeckt (inkl. Seitengrenze). Sortierung
  nur nach Erstelldatum (kein Mehrspalten-Sort) — bewusst schlank gehalten.

## 6. Nächster Block

Weiterer **Produkt-Feinschliff**/**Härtung** ohne Provider, oder — sobald der
provider-freie Track ausgeschöpft ist — Start der **Live-Offensive**
(Resend/Storage/Stripe aktivieren). Vorschlag + Prompt im Handoff.
