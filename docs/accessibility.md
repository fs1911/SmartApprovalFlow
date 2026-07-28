# Barrierefreiheit (Accessibility)

Ziel: die Oberflächen – vor allem die **loginlose Kundenseite** – sind mit
Tastatur und Screenreader bedienbar und erfüllen die wesentlichen WCAG-2.1-AA-
Grundlagen. Barrierefreiheit wurde über die Blöcke schrittweise mitgebaut; Block 16
ergänzt den Feinschliff.

## Prinzipien

- **Semantisches HTML zuerst** – echte `<button>`, `<label>`, Überschriften-
  Hierarchie, Landmarks statt `div`-Klick-Attrappen.
- **Tastatur vollständig** – jede Aktion ist per Tab/Enter erreichbar; sichtbarer
  Fokus.
- **Screenreader-Ansagen** – Statuswechsel und Fehler werden angesagt.

## Umgesetzt

### Landmarks & Skip-Link
- Authentifizierte App (`(app)/layout.tsx`) und Marketing (`(marketing)/layout.tsx`)
  haben einen **Skip-Link** („Zum Inhalt springen"), der per Tastatur sichtbar wird
  und auf `#main-content` springt.
- Jeder Bereich hat genau eine `<main>`-Landmark; die Kundenseite nutzt `<main>`
  als Karten-Container.
- Navigationsbereiche tragen `aria-label` (`Hauptnavigation`).

### Fokus & Kontrast
- Globaler, sichtbarer Fokusring über `:focus-visible` (`--focus-ring`).
- Der Skip-Link nutzt Markenfarbe auf Weiß (ausreichender Kontrast).
- `.visually-hidden`-Utility für rein akustische Beschriftungen.

### Kundenseite (`/a/[token]`)
- `lang`-Attribut wird passend zur aufgelösten Sprache gesetzt (`de`/`fr`/`it`) –
  wichtig für die korrekte Screenreader-Aussprache.
- Dringlichkeits-Hinweis als `role="alert"`.
- Die Erfolgsmeldung nach einem Entscheid ist `role="status"` + `aria-live="polite"`,
  wird also angesagt, ohne den Fokus zu stehlen.
- Einzelentscheid-Buttons: `role="group"` mit `aria-label`, `aria-pressed` für den
  gewählten Zustand, sprechende `aria-label` je Position.
- Absenden-Buttons: `aria-busy` während des Sendens.
- Dekorative Emojis/Icons (Logo-Initialen, Trust-Icons, Erfolgs-Icon) sind
  `aria-hidden="true"`, damit sie nicht vorgelesen werden.

### Formulare
- Alle Eingaben haben ein zugeordnetes `<label htmlFor>` (Telefon, Ablehnungs-
  Grund, Login etc.).
- Fehler werden als `role="alert"` gerendert.

### Fehler-/Leerzustände
- Globale `not-found.tsx` und `error.tsx` (App Router) im ruhigen Karten-Stil mit
  klarem Weg zurück (Startseite bzw. „Erneut versuchen") statt einer Sackgasse.
- „Link nicht verfügbar" (abgelaufen/ungültig) ist lokalisiert und erklärt den
  nächsten Schritt.

## Manuelle Prüf-Checkliste

- [ ] Nur mit der Tastatur durch Kundenseite navigieren: alle Aktionen erreichbar,
      Fokus immer sichtbar.
- [ ] Skip-Link erscheint beim ersten Tab und springt zum Inhalt.
- [ ] Screenreader (VoiceOver/NVDA): Überschriften-Struktur, Button-Beschriftungen,
      Statusansage nach Freigabe.
- [ ] Kontrast der Marken-/Statusfarben gegen den Hintergrund (AA).
- [ ] Seite auf 200 % zoomen: kein Inhaltsverlust, kein horizontales Scrollen.

## Bewusst offen (später)

- Kein automatisiertes A11y-Gate in CI (z. B. axe) – die Checkliste ist manuell.
  Ein `@axe-core/playwright`-Smoke ist ein sinnvoller nächster Schritt.
- Keine vollständige AAA-Abdeckung; Ziel ist AA für die Kernpfade.
