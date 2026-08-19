# Block 46 — Summary (Detailseiten-Politur)

Feinschliff der Fall-Detailseite (`approvals/[id]`) — reine Präsentation, keine
API-/Schema-/Vertrags-Änderung. Kontext auf einen Blick, konsistenter
Leerzustand für den Verlauf und etwas mehr A11y-Semantik. (Der große Design-/
„Wow"-Pass für Marketing + App ist bewusst separat, siehe Roadmap-Ausblick.)

## 1. Was gebaut wurde

### Web — `approvals/[id]/page.tsx`

- **Kontextzeile unter dem Titel**: Kunde · Fahrzeug · Kennzeichen (nur die
  vorhandenen Teile), damit der Fall ohne Scrollen einzuordnen ist. Nutzt die
  bereits vorhandenen Detaildaten, keine neue Abfrage.
- **Verlauf (Audit Trail)**:
  - Leerzustand über die geteilte `EmptyState`-Komponente (Block 42, `card`-
    Variante), wenn noch keine Ereignisse existieren, statt einer leeren
    Timeline.
  - A11y: die Timeline ist jetzt `role="list"` mit `aria-label`, jedes Ereignis
    `role="listitem"`, der dekorative Punkt `aria-hidden`.
- Datums-/Zeitangaben laufen weiterhin über den geteilten `formatDateTime`
  (Block 41) — unverändert konsistent.

### Tests

- **Keine neuen Tests** — reine Web-Präsentation, kein Web-Test-Harness (wie
  Blocks 35–38, 41, 42). API-Suite unberührt (**187 grün**).

### Doku

- Dieses Summary, Roadmap + README.

## 2. Entscheidungen

- **Bewusst schlank** — die Detailseite war bereits solide (Karten, `dl`-Listen,
  Timeline, geteilte Formatter). Dieser Block ergänzt gezielt Kontext + einen
  konsistenten Leerzustand + A11y, statt umzubauen.
- **Kein Redesign hier** — der eigentliche visuelle „Wow"-Pass (Typografie,
  Farbsystem, Hero, Motion) für Marketing-Site und App ist ein eigener,
  abgestimmter Design-Block (Vorschlag: Block 47 Marketing, Block 48 App), nicht
  Teil dieses Feinschliffs.
- **`EmptyState` wiederverwendet** statt neuer Ad-hoc-Leerzustand.

## 3. Was Mock/Placeholder blieb

- Nichts; keine Provider/Secrets berührt.

## 4. Später nötige Credentials/Accounts

- Keine.

## 5. Risiken

- Minimal (Präsentation). Kontextzeile und Leerzustand sind rein additiv;
  Timeline-Markup unverändert (nur ARIA-Rollen ergänzt).

## 6. Nächster Block

**Design-/„Wow"-Pass** für Marketing-Site und App (eigenständige Typografie via
`next/font`, committete Markenpalette + Dark-Mode, Hero-Craft, Micro-
Interactions, eigene SVG-Visuals) — provider-frei, am besten mit Screenshot-
Abstimmung. Alternativ weiterer Produkt-Feinschliff oder die **Live-Offensive**
(Resend/Storage/Stripe). Vorschlag + Prompt im Handoff.
