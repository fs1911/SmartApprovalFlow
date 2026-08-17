# Block 36 — Summary (Aktive-Filter-Leiste)

Baut auf den Listen-Filtern (Block 26/27/31) und den gespeicherten Ansichten
(Block 28–35) auf. Rein Web-seitig, **keine API-Änderung**: über der Freigaben-
Liste erscheint eine kompakte Zusammenfassung der aktuell wirkenden Filter,
jeweils einzeln entfernbar.

## 1. Was gebaut wurde

### Web

- Freigaben-Liste (`approvals/page.tsx`): eine **„Aktive Filter"-Leiste**, die nur
  bei `hasActiveFilters` erscheint. Je aktivem Filter ein Chip mit lesbarem Label
  und **✕**, das genau diesen Filter über `filterHref(active, { <key>: undefined })`
  entfernt:
  - „Meine Fälle" (assignee), „Kategorie: …", „Dringlichkeit: …",
    „Zeitraum: 7/30/90 Tage · 1 Jahr" (Preset) **oder** „Zeitraum: Von – Bis"
    (freier Bereich, als **ein** Chip, der beide Grenzen löscht), „Status: …".
  - Preset-Fenster und freier Bereich schließen sich aus (`rangeActive` verdrängt
    `effectiveWithin`), daher erscheint höchstens **ein** Zeitraum-Chip.
  - Labels aus den vorhandenen Maps: `ITEM_CATEGORY_LABELS`,
    `URGENCY_PRESENTATION`, `STATUS_PRESENTATION` (@saf/ui), lokale
    `WITHIN_LABELS`.
  - Zusätzlich ein **„Alle zurücksetzen"**-Link (`/approvals?all=1`, überspringt
    auch die persönliche Standard-Ansicht).
- A11y: jeder Chip trägt `aria-label` „Filter „…" entfernen"; das ✕ ist
  `aria-hidden`. Server-rendered, kein Client-JS.

### Tests

- **Keine neuen Tests.** Rein präsentativ, kein Web-Test-Harness; die bestehende
  API-Suite ist unberührt (**174 grün**). Bewusst keine künstlichen Tests.

### Doku

- Dieses Summary, Roadmap + README. (Kein `api-design`-Update — API unverändert.)

## 2. Entscheidungen

- **Wiederverwendung von `filterHref`** — dieselbe URL-Logik wie die Filter-Chips
  und gespeicherten Ansichten; das Entfernen eines Filters ist einfach ein Link
  mit diesem Schlüssel auf `undefined`, kein neuer Zustand.
- **Datumsbereich als ein Chip** — `createdFrom`/`createdTo` gehören fachlich
  zusammen; ein Chip, der beide Grenzen löscht, ist klarer als zwei.
- **Vorhandene Label-Maps** statt neuer Übersetzungen — keine Drift zwischen
  Filter-Chips, Badges und der neuen Leiste.
- **Server-rendered** — konsistent mit dem übrigen Filter-Flow; funktioniert ohne
  Client-JS.

## 3. Was Mock/Placeholder blieb

- Nichts Neues; keine Provider/Secrets berührt.

## 4. Später nötige Credentials/Accounts

- Keine.

## 5. Risiken

- Gering (rein visuell/navigatorisch). Die Leiste spiegelt exakt die bereits
  angewandten Filter; das Entfernen nutzt die bestehende, getestete
  `filterHref`-Logik.

## 6. Nächster Block

Kandidaten: **Provider real aktivieren** (Resend/Storage zuerst, mit
Accounts/Secrets), weiterer **Produkt-Feinschliff** oder **Härtung**.
Vorschlag + Prompt im Handoff.
