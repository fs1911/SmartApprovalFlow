# Block 47 — Summary (Marketing-Redesign, „Wow"-Pass Teil 1)

Eigenständiger, hochwertiger Auftritt der öffentlichen Marketing-Site — damit sie
_nicht_ nach generiertem Standard aussieht, sondern nach einem bewusst gestalteten
B2B-Produkt. Design-Sprache angelehnt an Beagle (Better Proposals): Mint/Salbei-
Signatur, bold-Sans + Serifen-Kontrast, und ein **scroll-getriebenes Storytelling**,
das genau das erzählt, was Klarwerk löst. Provider-frei, rein visuell — keine API-,
Schema- oder Vertragsänderung.

Direktion wurde vorab per Screenshot mit dem Kunden abgestimmt und freigegeben
(„Screenshots pro Etappe").

## 1. Was gebaut wurde

### Typografie — `apps/web/app/layout.tsx`

- Drei Schriften via `next/font/google` (Build-Zeit-Fetch über den Agent-Proxy,
  kein Runtime-CDN):
  - **Inter** — Fließtext (`--font-inter`).
  - **Space Grotesk** — Display/Headlines (`--font-display-face`).
  - **Newsreader** (inkl. Italic) — Serifen-Kontrast für Sublines/Story-Text
    (`--font-serif-face`).
- Die `next/font`-Variablen heißen bewusst anders als die Token-Variablen, damit
  in `tokens.css` keine CSS-Selbstreferenz entsteht.

### Design-Tokens — `packages/ui/tokens.css`

- **Mint/Salbei-Palette** (die Marketing-Signatur): `--color-mint-500/400/100`,
  `--color-mint-600/700` (abgedunkelt für AA-Text auf Hell), `--color-mint-ink`
  (tiefes Grün-Schwarz für Text auf Mint / Logo / Geräte-Bar).
- **Warmer Signal-Akzent** `--color-accent-500/600/50` (sparsam).
- Schrift-Stacks: `--font-sans` (Inter), `--font-display` (Space Grotesk),
  `--font-serif` (Newsreader) — je mit robusten Fallbacks.

### Marketing-CSS — `apps/web/app/globals.css`

- **`.mk-root`**: warmes Off-White als Grund; CTA/Logo in Marken-Mint statt
  App-Blau (dunkle Tinte auf Mint für AA-Kontrast).
- **Hero**: zweispaltig (Copy + Geräte-Mockup), Mint/Cream-Verlauf, dezente
  Engineering-Grid-Textur, Serifen-Subline, Mint-Akzentwort mit Pinsel-
  Unterstreichung, Trust-Chips.
- **Scroll-Story** (`.mk-story*`): Mint-Verlauf, gepinntes Phone (`sticky`),
  gedimmte → scharfe Schritte, Fortschritts-Punkte rechts (`.mk-story__dots`),
  Phone-Extras (Notification, Tap-Ring, Beleg-Screen), `@keyframes` + voller
  `prefers-reduced-motion`-Fallback.
- **Feature-Karten**: Hover-Lift + Mint-Rand, Mint-Rauten-Tick vor jeder
  Überschrift.
- **Rest-Blau → Mint** durchgezogen: Schritt-Nummern (`.mk-step__n`),
  Pricing-Highlight-Rand (`.mk-price-card--hl`), „Empfohlen"-Badge.
- Display-Schrift auf allen Marketing-Headings; Mobile-Media-Query kollabiert
  Hero + Story einspaltig, deaktiviert Sticky/Dimmen/Punkte.

### Neue Komponente — `apps/web/app/(marketing)/_scroll-story.tsx` (`'use client'`)

- `ScrollStory`: 4 Erzählschritte (Erhalten → Öffnen → Entscheiden →
  Dokumentiert). Ein gepinntes Phone wechselt via `PhoneScreen({ step })` den
  Bildschirm, während die Schritte vorbeiscrollen.
- Reiner `IntersectionObserver` (`rootMargin: -45% 0 -45% 0`): der Schritt in der
  vertikalen Mitte wird aktiv. Ohne JS bleibt jeder Schritt lesbar; `reduced-
motion` bekommt denselben Inhalt ohne Cross-Fades.
- Fortschritts-Punkte sind klickbar (`scrollIntoView`), `aria-hidden` und
  `tabIndex={-1}` (reine Ergänzung — die Schritte selbst tragen die Semantik).

### Startseite — `apps/web/app/(marketing)/page.tsx`

- Hero in zwei Spalten mit Kunden-Freigabe-Mockup; Headline splittet auf „in
  Minuten" und hebt das Wort als Mint-Akzent hervor.
- Statische „So funktioniert es"-Sektion durch `<ScrollStory />` ersetzt, plus
  dezenter „Ausführlich ansehen →"-Verweis auf `/product`.

## 2. Entscheidungen

- **Beagle-Sprache, Klarwerk-Inhalt** — Storytelling erzählt konkret den
  Klarwerk-Ablauf, statt generischer Marketing-Floskeln.
- **Provider-frei & lokal testbar** — Schriften via `next/font` zur Build-Zeit;
  keine externen Assets, kein Runtime-CDN (CSP-/Proxy-verträglich).
- **Keine Fotos** — externer Bildabruf ist geblockt und es liegen keine
  lizenzierten Bilddateien im Repo; daher gerenderte Produkt-Mockups statt
  Menschen-Fotos. Foto-Kapitel bleiben optional, falls der Kunde Bilder beisteuert.
- **Additiv, kein Umbau** — Inhalts-/Content-Quelle (`_content.ts`) und die
  Seiten-Struktur bleiben unverändert; es ist ein reiner Style-/Typo-Layer plus
  eine neue Präsentationskomponente.

## 3. Was Mock/Placeholder blieb

- Geräte-Mockups (Hero + Story) sind illustrativ (Muster-Garage, AC-2026-0142).
- Keine Provider/Secrets berührt.

## 4. Später nötige Credentials/Accounts

- Keine.

## 5. Risiken

- Rein visuell/präsentativ. Typecheck grün, Web-Build grün, API-Suite unberührt
  (**187**, davon 100 grün / 87 ohne DB übersprungen). Scroll-Story degradiert
  ohne JS und respektiert `prefers-reduced-motion`.
- CI-Format-Check ist informativ/nicht-blockierend; `globals.css` enthält
  vorbestehende Nicht-Prettier-Zeilen (lange Gradient-Umbrüche), die bewusst
  nicht angefasst wurden — nur die eigenen, geänderten Zeilen wurden per config-
  aufgelöstem Diff als konform nachgewiesen.

## 6. Nächster Block

**Block 48 — App-Redesign („Wow"-Pass Teil 2)**: dieselbe Design-Sprache (Typo,
Mint-Akzente, Abstände, Micro-Interactions) auf App-Shell, Dashboard und
Detailseiten übertragen. Alternativ die **Live-Offensive** (Resend/Storage/Stripe)
oder weiterer Produkt-Feinschliff. Vorschlag + Prompt im Handoff.
