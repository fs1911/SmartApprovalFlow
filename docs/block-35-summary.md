# Block 35 — Summary („Keine Treffer"-Zustand)

Baut auf den Listen-Filtern (Block 26/27/31) und den gespeicherten Ansichten
(Block 28–34) auf. Rein Web-seitig, **keine API-Änderung**: die Freigaben-Liste
unterscheidet jetzt „noch nie ein Fall" von „aktueller Filter/Ansicht trifft
nichts".

## 1. Was gebaut wurde

### Web

- Freigaben-Liste (`approvals/page.tsx`): der Empty-State bei 0 Ergebnissen ist
  jetzt zweigeteilt:
  - **Filter/Ansicht aktiv, 0 Treffer** → „Keine Treffer" mit erklärendem Text
    und **„Alle Filter zurücksetzen"** (Link auf `/approvals?all=1`, das auch die
    persönliche Standard-Ansicht überspringt). Ist eine gespeicherte Ansicht
    exakt aktiv, wird ihr **Name** genannt („Die Ansicht „…" enthält aktuell
    keine Fälle.").
  - **Keine Filter, 0 Fälle** → unveränderter Onboarding-Empty-State („Noch keine
    Freigaben" + „Erste Freigabe erstellen").
  - Die aktive Ansicht wird über `filterHref`-Vergleich der aktiven Filter mit
    den Filtern jeder Ansicht ermittelt (dieselbe Logik wie die Aktiv-Markierung
    der Chips).
- Ansichts-Chips (`approvals/_saved-views.tsx`): Chips mit `matchCount === 0`
  werden **dezent abgeschwächt** (`opacity` + Titel „Keine passenden Fälle"), die
  Zahl bleibt sichtbar und im `aria-label`, sodass leere Ansichten früh auffallen.

### Tests

- **Keine neuen Tests.** Die Änderung ist rein präsentativ (Server-Rendering ohne
  API-Änderung); das Web hat keine Unit-Test-Harness, und die bestehende
  API-Suite ist unberührt (**174 grün**). Bewusst keine künstlichen Tests.

### Doku

- Dieses Summary, Roadmap + README. (Kein `api-design`-Update — API unverändert.)

## 2. Entscheidungen

- **`?all=1` als Reset-Ziel** — setzt nicht nur die Filter zurück, sondern
  überspringt auch die Auto-Anwendung der persönlichen Standard-Ansicht (Block
  29); ohne das würde die Liste sofort wieder in die (womöglich leere) Standard-
  Ansicht springen.
- **Aktive Ansicht namentlich nennen** — konkreter, verständlicher Hinweis statt
  eines generischen „keine Ergebnisse".
- **Leere Chips nur abschwächen, nicht ausblenden** — die Ansicht bleibt
  auffindbar/klickbar; nur der visuelle Fokus sinkt.
- **Server-rendered, kein Client-JS-Zwang** — konsistent mit dem übrigen Filter-
  Flow; der Reset ist ein normaler Link.

## 3. Was Mock/Placeholder blieb

- Nichts Neues; keine Provider/Secrets berührt.

## 4. Später nötige Credentials/Accounts

- Keine.

## 5. Risiken

- Gering (rein visuell). Der Empty-State greift, wenn `hasActiveFilters` wahr ist
  und die API 0 Fälle liefert; bei einem API-Fehler bleibt weiterhin die
  bestehende Fehlermeldung sichtbar (unverändert).

## 6. Nächster Block

Kandidaten: **Provider real aktivieren** (Resend/Storage zuerst, mit
Accounts/Secrets), weiterer **Produkt-Feinschliff** oder **Härtung**.
Vorschlag + Prompt im Handoff.
