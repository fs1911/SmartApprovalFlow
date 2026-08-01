# Reporting & Insights (Block 13)

Aussagekräftige Kennzahlen, Trends und CSV-Export — alles aus vorhandenen Daten
abgeleitet, kein externes Analytics. Kennzahlen-Logik als reine, unit-getestete
Funktionen (`lib/reporting.ts`); die Route liefert nur Daten hinein.

## Endpoints

```
GET /api/v1/reporting/summary       (reporting:read)   Kennzahlen + Trend
GET /api/v1/reporting/export.csv    (reporting:read)   Fälle des Zeitraums als CSV
```

### Zeitraum-Filter

- Presets: `?period=7d|30d|90d|365d` (Default `30d`).
- Explizit: `?from=YYYY-MM-DD&to=YYYY-MM-DD` (ISO) → `preset: "custom"`.
- Ungültige Eingaben fallen sicher auf den Default zurück.

Alle Kennzahlen sind **tenant-scoped** und beziehen sich auf Fälle, die im
Zeitraum **erstellt** wurden (`createdAt`).

## Kennzahlen-Definitionen

| Kennzahl | Definition |
| --- | --- |
| **Freigabequote** | `(APPROVED + PARTIALLY_APPROVED) / entschiedene Fälle` in %, wobei „entschieden" = approved + partial + declined. `null`, wenn nichts entschieden. |
| **Umsatz (freigegeben)** | **Spanne** min–max der Preisbänder freigegebener Positionen: ganzer Fall `APPROVED` → alle Positionen; `PARTIALLY_APPROVED` → nur Positionen mit `decision = APPROVE`; sonst nichts. Nie eine erfundene Einzelzahl. |
| **Reaktionszeit** | Stunden zwischen `sentAt` und `respondedAt`, als **Median** und **Durchschnitt** (nur Fälle mit beiden Zeitstempeln). |
| **Volumen** | erstellt / gesendet / wartet auf Kunde im Zeitraum. |
| **Status-Verteilung** | Zählung je Status (inkl. `PARTIALLY_APPROVED`). |

## Trends

Zeitreihe der erstellten (und gesendeten) Fälle. Granularität automatisch:
**täglich** bei Spannen ≤ 31 Tagen, sonst **wöchentlich** (`makeBuckets` +
`countIntoBuckets`, rein). Im Web als schlanke Inline-Balken (kein Chart-Framework).

## CSV-Export

`export.csv` liefert eine Zeile pro Fall des Zeitraums mit korrektem
RFC-4180-Escaping (`toCsv`/`csvEscape`), `Content-Type: text/csv` und
`Content-Disposition: attachment; filename="saf-report-<from>_<to>.csv"`.
Spalten: `reference, subject, customer, status, createdAt, sentAt, respondedAt,
responseHours, approvedMinMinor, approvedMaxMinor`.

Im Web lädt ein same-origin Route-Handler (`/reporting/export`) das CSV
serverseitig mit der Session und streamt es an den Browser (die httpOnly-Session
erreicht die API nicht direkt).

## Positionen nach Kategorie (Block 25)

`GET /reporting/summary` liefert zusätzlich `categories`: pro Positions-Kategorie
(`SAFETY|MAINTENANCE|REPAIR|DIAGNOSTIC|OTHER`) die **Anzahl** Positionen und die
summierte **Preisspanne** (`display`). Reine Funktion `itemsByCategory` in
`reporting.ts` (unit-getestet), kanonische Reihenfolge, leere Kategorien werden
weggelassen, unbekannte fallen auf `OTHER`. Die Web-Auswertung zeigt sie als
beschriftete Balkenliste (Label + Anzahl + Preis, Kategorie über Text-Chip, nicht
nur Farbe → a11y).

**CSV bewusst unverändert:** Der Export ist **pro Fall** (eine Zeile je Fall),
Kategorien sind aber **Positions-Ebene** (mehrere pro Fall) — sie passen nicht in
das Fall-Schema. Die Kategorie-Kennzahl steht daher in der JSON-Summary, nicht im
Fall-CSV.

## Datenschutz / Datensparsamkeit

Export enthält nur freigaberelevante Felder (Kundenname, keine Kontaktdaten/
Notizen). RBAC: `reporting:read` (Owner/Admin/Advisor/Viewer; nicht Techniker).

## Grenzen / Deferred

- Kennzahlen beziehen sich auf `createdAt`; alternative Bezugszeitpunkte
  (z. B. „beantwortet im Zeitraum") sind noch nicht getrennt ausgewertet.
- Keine Vergleichszeiträume/Deltas, keine Segmentierung nach Nutzer/Fahrzeug.
- Trend zeigt erstellte/gesendete Fälle; weitere Serien (Umsatz über Zeit) später.
