# Block 50 — Summary (Rücklaufquote im Reporting)

Eine neue, komplementäre Reporting-Kennzahl: die **Rücklaufquote**
(`responseRate`) misst, wie viele der zugestellten Freigabe-Links vom Kunden
_überhaupt_ beantwortet wurden. Sie ergänzt die bereits vorhandene
**Freigabequote** (`approvalRate`, misst die _Qualität_ der Entscheidungen über
entschiedene Fälle) um die Funnel-Perspektive „hat der Kunde reagiert?".
Provider-frei, als reine Funktion voll unit-getestet.

## 1. Was gebaut wurde

### Pure-Function — `apps/api/src/lib/reporting.ts`

- **`responseRate(statuses)`** → `{ reached, responded, rate }`:
  - **reached** (Nenner): Fälle, die den Kunden erreicht haben und beantwortet
    werden konnten — alle Status außer `DRAFT` (nie gesendet) und `CANCELLED`
    (zurückgezogen). `EXPIRED` zählt als „erreicht, aber nicht beantwortet".
  - **responded** (Zähler): tatsächliche Kundenreaktion — `APPROVED`,
    `PARTIALLY_APPROVED`, `DECLINED` oder `CALLBACK`.
  - **rate**: `responded / reached · 100`, gerundet, oder `null` wenn nichts
    zugestellt wurde.
- Rein deterministisch, kein I/O — testbar wie die anderen Metrik-Helfer.

### Route — `apps/api/src/routes/v1/reporting.ts`

- `GET /reporting/summary` liefert zusätzlich `engagement: { rate, responded,
reached }` (neben dem bestehenden `approvalRate`).

### Web — `apps/web/app/(app)/reporting/page.tsx`

- Neue KPI-Karte **„Rücklaufquote"** neben „Freigabequote", mit Hinweis
  „{responded} von {reached} zugestellt". Nutzt die geteilte `.stat`-Sprache aus
  Block 49; `Summary`-Typ um `engagement` erweitert.

### Tests

- **`apps/api/src/lib/reporting.test.ts`** (reine Unit-Tests, laufen ohne DB):
  - zählt Reaktionen über erreichte Fälle (6 reached, 3 responded → 50 %);
  - `rate` ist `null`, wenn nichts zugestellt wurde.
- **`apps/api/src/test/reporting.test.ts`** (Integrationstest, DB-gated):
  assertion, dass `engagement.{reached,responded,rate}` im Summary vorhanden und
  vom richtigen Typ ist.
- Gesamt **189** Tests, davon **102 grün / 87 ohne DB übersprungen**, 0 Fehler.

## 2. Entscheidungen

- **Neue Kennzahl statt Doppelung** — die zuerst angedachte „Annahmequote" war
  als `approvalRate` bereits vollständig gebaut (Pure-Function + Route + Web).
  Deshalb die komplementäre Rücklaufquote, die eine echte Lücke füllt (Funnel/
  Engagement statt Entscheidungsqualität).
- **`EXPIRED` zählt als erreicht** — ein abgelaufener Fall wurde zugestellt, der
  Kunde hat nur nicht reagiert; er gehört in den Nenner, nicht in den Zähler.
- **`CALLBACK` zählt als Reaktion** — Rückrufwunsch ist eine bewusste
  Kundenaktion (Engagement), auch wenn es keine Ja/Nein-Entscheidung ist.

## 3. Was Mock/Placeholder blieb

- Nichts; keine Provider/Secrets berührt.

## 4. Später nötige Credentials/Accounts

- Keine.

## 5. Risiken

- Additiv: ein neues Response-Feld + eine neue KPI-Karte; bestehende Felder,
  Verlinkungen und Kennzahlen unverändert. Typecheck grün, Web-Build grün, API
  **189 / 0 Fehler**. Prettier-Disziplin: alle 5 geänderten Bestandsdateien per
  config-aufgelöstem Diff geprüft — nur eigene, konforme Zeilen.

## 6. Nächster Block

Offen. Naheliegend provider-frei: weitere Reporting-Kennzahlen (z. B. Anteil
Rückrufwünsche, Ø Positionen je Fall), Detail-/Listen-Feinschliff, oder — sobald
gewünscht — die **Live-Offensive** (Resend-E-Mail / Storage / Stripe). Zudem
offen: die **Marken-/Namensentscheidung** (Klarwerk-Domains knapp) und ob App +
Kundenseite farblich auf Mint vereinheitlicht werden.
