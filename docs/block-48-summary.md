# Block 48 — Summary (App-Redesign, „Wow"-Pass Teil 2)

Die eingeloggte App bekommt denselben gehobenen Auftritt wie die Marketing-Site
(Block 47) — aber **ohne Farbwechsel**: Die App behält bewusst ihre vertrauens-
würdige blaue Identität. Dieser Block hebt Typografie und ergänzt zurückhaltende
Micro-Interactions, damit die App wie ein bewusst gestaltetes Produkt wirkt statt
wie ein Standard-Admin-Panel. Rein visuell/präsentativ — keine API-/Schema-/
Vertragsänderung.

## 1. Was gebaut wurde

### Marketing- & App-Typo verbunden — `apps/web/app/globals.css`

Neuer, ans Ende angehängter Abschnitt „App visual polish (Block 48)" (nur additive
Regeln, gewinnen per Reihenfolge über die Basis):

- **Display-Schrift auf App-Headings** (`h1`, `h2`, `.page-header h1`,
  `.sidebar__brand`) — dieselbe Space-Grotesk-Face wie die Website, die Produkt
  und Marketing typografisch verbindet.
- **Sidebar**: aktiver Nav-Eintrag erhält einen Marken-Akzentbalken
  (`.nav-link--active::before`); Logo mit Display-Face + weichem Schatten.
- **Topbar**: `position: sticky` mit dezent mattiertem Backdrop (`blur`).
- **Buttons**: sanftes Press-Feedback (`:active` translateY) + weicher Schatten-
  Lift auf dem primären CTA im Hover.
- **Cards & Fall-Zeilen**: zurückhaltender Hover-Lift signalisiert Interaktivität.
- Voller `prefers-reduced-motion`-Fallback (alle Transitions/Transforms aus).

### App-Shell — `apps/web/app/(app)/layout.tsx`

- Veralteten Sidebar-Footer „MVP · Block 7" durch „Klarwerk · MVP" ersetzt (kein
  Block-Zähler mehr im Produkt-UI).

## 2. Entscheidungen

- **Blau bleibt Primärfarbe der App** — bewusst nicht autonom auf Mint umgestellt.
  Das Marketing ist neu Mint, die App seit jeher Blau; eine Vereinheitlichung auf
  Mint (auch der loginlosen Kundenseite) ist eine Marken-Grundsatzentscheidung und
  gehört dem Kunden. Verbindung wurde stattdessen über die **gemeinsame Display-
  Schrift** hergestellt (offene Frage im Handoff vermerkt).
- **Additiv, kein Umbau** — die App-Struktur/Komponenten bleiben unverändert; nur
  ein Typo-/Interaction-Layer plus eine Textkorrektur.
- **Zurückhaltung** — Micro-Interactions sind subtil (1 px Lift, weiche Schatten),
  passend zu einem Arbeitswerkzeug; kein „verspieltes" Motion-Design.

## 3. Was Mock/Placeholder blieb

- Nichts; keine Provider/Secrets berührt.

## 4. Später nötige Credentials/Accounts

- Keine.

## 5. Risiken

- Rein visuell. Typecheck grün, Web-Build grün (24/24 statisch), API-Suite
  unberührt (**187**: 100 grün / 87 ohne DB übersprungen).
- **Eingeloggte App nicht per Screenshot verifiziert** — das App-Layout leitet
  ohne gültige Session auf `/login` um, und in dieser Umgebung gibt es keine DB/
  API-Session. Bestätigt wurde die geteilte Änderung an der Login-Seite (Display-
  Schrift auf „Anmelden" greift, blaue Identität erhalten). Die Shell-spezifischen
  Regeln (Sidebar-Akzent, sticky Topbar, Row-Hover) sind einfache, build-
  verifizierte CSS-Overrides.
- Prettier-Disziplin: beide Bestandsdateien per config-aufgelöstem Diff geprüft —
  nur eigene Zeilen betroffen; vorbestehende Nicht-Prettier-Zeilen (lange Inline-
  Style-Zeile in `layout.tsx`) bewusst nicht angefasst. CI-Format-Check ist
  informativ/nicht-blockierend.

## 6. Nächster Block

**Block 49 — App-Screens in der gehobenen Sprache** (Dashboard-Statuskarten,
Freigaben-Liste, Detail-Panels, Formulare/Leerzustände): Feinschliff auf
Screen-Ebene, weiter rein präsentativ. Danach **Block 50 — Annahmequote im
Reporting** (reine, test-gedeckte Kennzahl, provider-frei).
