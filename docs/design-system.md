# Design System

Kanonische Tokens: `packages/ui/tokens.css`. Dieses Dokument erklärt die
Prinzipien; die Werte leben als CSS-Custom-Properties.

## Designprinzipien

- **Hell, ruhig, hochwertig.** Viel Weissraum, klare Flächen.
- **Vertrauen vor Effekt.** Kein dunkler Sci-Fi-Look, keine AI-Optik, keine
  violette Gradient-Hölle, kein 3-Icon-Startup-Grid.
- **Klare Handlungsführung.** Eine primäre Aktion pro Screen.
- **Status kommunizieren.** Farbe + Text + Form, nie Farbe allein.
- **Mobile-first**, besonders die Kundenseite.

## Farbwelt

- **Brand:** ruhiges, seriöses Blau (`--color-brand-500 #1f5fa8`) — verlässlich,
  nicht „techy".
- **Ink:** abgestufte Grautöne für Text (`--color-ink-900/700/500/300`).
- **Surface:** Weiss auf sehr hellem Grau-Hintergrund (`--color-surface-subtle`).
- **Status:** Grün (Erfolg/Freigabe), Rot (Ablehnung/Gefahr), Amber (Warnung/
  Rückruf), Blau (Info/Gesendet). Jeweils mit hellem Hintergrund-Pendant.

## Typografie

- Font-Stack: **Inter** → System-Sans-Fallback.
- Skala von `--text-xs` (0.75rem) bis `--text-3xl` (2.25rem).
- Gewichte 400/500/600/700; Zeilenhöhe 1.2 (eng) / 1.5 (normal).

## Radius / Spacing / Elevation

- **Spacing:** 4px-Basis (`--space-1..10`).
- **Radius:** `sm 6 / md 10 / lg 14 / full`.
- **Elevation:** drei zurückhaltende Schatten (`--shadow-sm/md/lg`).

## Komponentenprinzipien

- **Buttons:** primär (gefüllt Brand), sekundär (Outline), success/danger für
  Kundenaktionen, ghost für nachrangiges. Grosse Touch-Ziele auf der Kundenseite.
- **Cards:** weisse Fläche, 1px Border, weicher Schatten, `lg`-Radius.
- **Badges:** Status/Urgency als Pill mit Punkt + Text (Tonalität aus
  `STATUS_PRESENTATION` in `@saf/ui`).
- **Fields:** Label + Input + optional Hint/Error; sichtbarer Fokusring.
- **Timeline:** Audit-Trail als vertikale Punkt-Linie.

> Block 2 liefert diese Komponenten als CSS-Klassen in
> `apps/web/app/globals.css` gegen echte Nutzung. Eine extrahierte React-Library
> in `@saf/ui` folgt, sobald sich Muster stabilisiert haben.

## Statusfarben (Mapping)

| Status | Ton |
| --- | --- |
| Entwurf / Abgelaufen / Storniert | neutral |
| Gesendet / Angesehen | info (blau) |
| Freigegeben | success (grün) |
| Abgelehnt | danger (rot) |
| Rückruf gewünscht | warning (amber) |

## Accessibility-Grundlagen

- Kontraste für Text auf hellem Grund geprüft (Status-Farben mit ausreichendem
  Kontrast gewählt).
- **Fokus sichtbar** (`--focus-ring`), Tastaturbedienung.
- Status nie nur über Farbe (immer Label/Icon dazu).
- Semantisches HTML (Labels mit `for`, Buttons statt Div-Klicks).
- Kundenseite: grosse Schrift, grosse Buttons, klare Sprache.
