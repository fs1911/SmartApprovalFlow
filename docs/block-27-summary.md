# Block 27 — Summary (Listen-Filter: Dringlichkeit & Zeitraum)

Baut auf Block 26 auf, ohne bestehende Filter/Pagination umzubauen. Die
Freigaben-Liste lässt sich zusätzlich nach Dringlichkeit und Erstellungszeitraum
filtern; alle Filter sind kombinierbar.

## 1. Was gebaut wurde

### API
- `GET /approval-cases` akzeptiert optional `?urgency=` (`LOW|MEDIUM|HIGH`) und
  `?createdWithin=` (`7d|30d|90d|365d`). `urgency` → `where.urgency`;
  `createdWithin` → `where.createdAt.gte = jetzt − N Tage`
  (`createdWithinCutoff`). Tenant-scoped, cursor-kompatibel, mit
  `status`/`category`/`assignee` kombinierbar.
- Validierung Zod-owned (`listQuerySchema`: `urgency = z.enum(URGENCY)`,
  `createdWithin = z.enum(CREATED_WITHIN)`, beide optional) → ungültige Werte
  ⇒ 422 (Swagger-Querystring ohne `enum`, damit Zod validiert).

### Shared
- `@saf/types`: `CREATED_WITHIN` (`['7d','30d','90d','365d']`) + Typ.

### Web
- Freigaben-Liste (`approvals/page.tsx`): zwei neue Filterzeilen
  „Dringlichkeit" (Chips via `@saf/ui` `URGENCY_PRESENTATION`) und „Zeitraum"
  (7/30/90 Tage, 1 Jahr). `filterHref(active, override)` führt jetzt **alle**
  Filter (Zuständigkeit/Kategorie/Dringlichkeit/Zeitraum) über die URL zusammen,
  sodass sie koexistieren. `aria-current` je aktivem Chip, `role="group"` +
  `aria-label` je Zeile (a11y). Ungültige Query-Werte werden ignoriert.

### Tests
- Integration: `?urgency=HIGH` filtert korrekt; `?createdWithin=7d` enthält einen
  frisch erstellten Fall; ungültige `urgency`/`createdWithin` ⇒ 422. Volle
  API-Suite grün.

### Doku
- `docs/api-design.md` (Query-Params), dieses Summary; Roadmap + README (inkl.
  Block-Summaries-Index).

## 2. Entscheidungen

- **Rolling-Window-Presets** (`createdWithin`) statt freier `from`/`to`-Range —
  MVP-schlank, deckt den Alltagsbedarf; `createdAt.gte` kollidiert nicht mit dem
  Cursor-`OR` (getrennte where-Keys).
- **Zod besitzt die Validierung** (kein Swagger-`enum`) → 422, konsistent.
- **`filterHref(current, override)`** — ein Helper hält alle Filter im URL-State
  zusammen; kein Filter setzt einen anderen zurück.

## 3. Was Mock/Placeholder blieb

- Kein freier Datumsbereich (nur Presets); keine Mehrfachauswahl je Filter.

## 4. Später nötige Credentials/Accounts

- Keine.

## 5. Risiken

- `createdWithin` bezieht sich auf `createdAt` (Erstellung), nicht auf
  Versand/Antwort — bewusst; andere Bezugszeitpunkte wären ein separater Ausbau.

## 6. Nächster Block

Kandidaten: **whisper gegen echtes STT-Backend verifizieren**, **Registry-Push
real** aktivieren, oder **freier Datumsbereich**/gespeicherte Filter. Vorschlag +
Prompt im Handoff.
