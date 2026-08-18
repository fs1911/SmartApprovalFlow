# Block 41 — Summary (Einheitliche Datums-/Zeitformatierung)

Zieht die im internen (Mitarbeiter-)UI mehrfach kopierte `de-CH`-Datums-/Zeit-
Formatierung in **einen** geteilten Helper zusammen. Rein Web-seitig, keine API-,
Schema- oder Vertrags-Änderung. Ziel: konsistente Darstellung + eine einzige
Stelle für spätere Anpassungen.

## 1. Was gebaut wurde

### Web

- Neuer Helper `apps/web/lib/format.ts`:
  - `formatDateTime(value)` → mittleres Datum + kurze Zeit (`de-CH`,
    z. B. „18. Aug. 2026, 14:05").
  - `formatDate(value)` → nur mittleres Datum (z. B. „18. Aug. 2026") — bewusst
    im selben `dateStyle: 'medium'` wie der Datumsteil von `formatDateTime`.
  - Beide akzeptieren `string | Date | null | undefined`; ungültige/leere Werte
    → leerer String (kein „Invalid Date").
- **Fünf** Aufrufstellen auf den Helper umgestellt, drei lokale Duplikate
  entfernt:
  - `approvals/[id]/page.tsx` — lokale `fmtDate`-Funktion entfernt, 6 Aufrufe
    (Audit-Trail, Erstellt/Gesendet/Geöffnet/Erinnerung/Beantwortet).
  - `approvals/[id]/_collab-panel.tsx` — lokale `fmt`-Funktion entfernt (Notiz-
    Zeitstempel).
  - `notifications/_list.tsx` — lokale `fmt`-Funktion entfernt (Benachrichtigungs-
    Zeitstempel).
  - `approvals/[id]/_link-panel.tsx` — inline `toLocaleDateString` → `formatDate`
    (Link-Ablaufdatum).
  - `members/_invite-panel.tsx` — inline `toLocaleDateString` → `formatDate`
    (Einladungs-Ablaufdatum).

### Sichtbare Änderung

- Ablaufdaten (Link/Einladung) zeigen jetzt „18. Aug. 2026" statt „18.08.2026"
  — angeglichen an den bereits verwendeten mittleren Datumsstil. Alle Datum+Zeit-
  Stellen bleiben unverändert.

### Bewusst NICHT geändert

- Die **loginlose Kundenseite** (`a/[token]/page.tsx`) formatiert weiter über
  ihren eigenen de/fr/it-i18n-Helper — sie ist mehrsprachig, das interne UI ist
  durchgehend Schweizer Deutsch.

### Tests

- **Keine neuen Tests** — reine Web-Präsentation, kein Web-Test-Harness (wie
  Blocks 35–38). Der Helper ist pure, seiteneffektfrei. API-Suite unberührt
  (**178 grün**).

### Doku

- Dieses Summary, Roadmap + README. (Kein `api-design`/`openapi`-Update — API
  unverändert.)

## 2. Entscheidungen

- **Helper in web-lib, nicht in `@saf/ui`** — die Formatierung ist an das
  einsprachige interne UI gebunden; `@saf/ui` mit Web-Locale-Politik zu belasten
  wäre falsch verortet. Die Kundenseite hat ihre eigene i18n-Formatierung.
- **`formatDate` auf `dateStyle: 'medium'`** statt des vorherigen Standard-
  Numerikformats — vereinheitlicht bewusst mit dem Datumsteil von
  `formatDateTime` (der eigentliche Zweck des Blocks: Konsistenz).
- **`string | Date`-Eingabe + leerer Fallback** — robust gegen `null`/ungültige
  Werte, gibt nie „Invalid Date" aus.

## 3. Was Mock/Placeholder blieb

- Nichts; keine Provider/Secrets berührt.

## 4. Später nötige Credentials/Accounts

- Keine.

## 5. Risiken

- Minimal (Präsentation). Einzige sichtbare Änderung: Ablaufdaten im mittleren
  Datumsstil. Kein Verhaltens-/Vertragsrisiko.

## 6. Nächster Block

Weiterer **Produkt-Feinschliff**/**Härtung** ohne Provider (z. B. Detailseiten-
Politik, konsistente Leerzustände, kleinere A11y-Runde), oder — sobald der
provider-freie Track ausgeschöpft ist — Start der **Live-Offensive**
(Resend/Storage/Stripe aktivieren). Vorschlag + Prompt im Handoff.
