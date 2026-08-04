# Block 29 — Summary (Private Ansichten & persönliche Standard-Ansicht)

Baut auf Block 28 (Gespeicherte Ansichten) auf, ohne den Filter-/Pagination-Flow
umzubauen. Ansichten sind jetzt entweder workspace-weit geteilt oder privat, und
jede:r Nutzer:in kann eine persönliche Standard-Ansicht festlegen, die die
Freigaben-Liste beim Aufruf ohne Filter automatisch anwendet.

## 1. Was gebaut wurde

### Datenmodell

- `SavedView.visibility` (`String`, Default `SHARED`) — SHARED (Workspace) oder
  PRIVATE (nur Ersteller:in).
- Neues Modell `SavedViewDefault` (`saved_view_defaults`): eine Zeile pro Nutzer
  (`userId @unique`), verweist auf die Standard-Ansicht; `onDelete: Cascade` für
  Tenant/User/SavedView. Migration `20260802133259_...` (additiv, Default SHARED
  hält Bestandszeilen kompatibel).

### Shared

- `@saf/types`: `SAVED_VIEW_VISIBILITY` (`['SHARED','PRIVATE']`);
  `createSavedViewSchema` um `visibility` (Default SHARED) erweitert;
  `setDefaultViewSchema` (`savedViewId` UUID).

### API

- `GET /saved-views` (`cases:read`) — liefert die **sichtbaren** Ansichten
  (alle SHARED + eigene PRIVATE) inkl. `visibility` je Ansicht und
  `defaultViewId` (die persönliche Standard-Ansicht der/des Aufrufenden).
- `POST /saved-views` (`cases:create`) — `visibility` wählbar; PRIVATE ohne
  Nutzer-Sitzung ⇒ 422 (private Ansichten brauchen einen konkreten User).
- `DELETE /saved-views/:id` (`cases:create`) — nur sichtbare Ansichten löschbar;
  fremde private Ansicht ⇒ 404 (kein Existenz-Leak).
- `POST /saved-views/default` (`cases:read`) — setzt die persönliche
  Standard-Ansicht (Upsert je `userId`); Ziel muss sichtbar sein (sonst 404);
  ohne Nutzer-Sitzung ⇒ 422.
- `DELETE /saved-views/default` (`cases:read`) — entfernt sie (idempotent).
- Sichtbarkeit zentral über `visibilityWhere(tenantId, userId)` (SHARED oder
  eigene PRIVATE); ohne `userId` (Dev-Header/API-Key) nur SHARED.

### Web

- Freigaben-Liste (`approvals/page.tsx`): lädt Ansichten **vor** der Fallliste
  und wendet bei „nacktem" Aufruf (keine Filter) die persönliche
  Standard-Ansicht automatisch an (Server-Redirect auf ihren Filter-Link).
  Schutz gegen Redirect-Loop: nur wenn die Standard-Ansicht tatsächlich Filter
  trägt. Ein Banner „Standard-Ansicht ‚X' aktiv · Alle anzeigen" mit Opt-out
  (`?all=1`) — kein Zwang.
- `_saved-views.tsx`: Stern-Toggle (★/☆) je Ansicht setzt/entfernt die
  persönliche Standard-Ansicht (`aria-pressed`); privates Schloss-Icon 🔒;
  Checkbox „Nur für mich" im Speichern-Formular. Server-Actions
  `setDefaultView`/`clearDefaultView`/erweitertes `createSavedView`.

### Tests

- Integration (`saved-views-defaults.test.ts`, Session-Tokens für echte
  `userId`): PRIVATE nur für Ersteller:in sichtbar, SHARED für alle; PRIVATE
  ohne Sitzung 422; fremde private Ansicht nicht löschbar (404); Standard
  setzen/lesen/entfernen; Standard ist pro Nutzer; Standard auf nicht sichtbare
  Ansicht 404; Cascade räumt Standard beim Löschen der Ansicht; Standard ohne
  Sitzung 422. Volle API-Suite grün (150 Tests).

### Doku

- `docs/api-design.md` (fünf Saved-View-Endpoints), dieses Summary, Roadmap +
  README (inkl. Block-Summaries-Index).

## 2. Entscheidungen

- **Standard als eigenes Modell** (`SavedViewDefault`, `userId @unique`) statt
  Flag auf `SavedView` — der Default ist pro Nutzer, eine geteilte Ansicht kann
  für die eine Person Standard sein und für andere nicht.
- **PRIVATE braucht `userId`** — private Ansichten werden immer einem konkreten
  User zugeordnet; unter Dev-Header/API-Key (kein User) sind sie sinnlos ⇒ 422.
- **404 statt 403** bei fremden privaten Ansichten — die Sichtbarkeits-Where
  blendet sie aus, sodass ihre Existenz nicht durchsickert.
- **Auto-Apply per Server-Redirect** statt Client-Logik — korrekter URL-/
  Chip-Zustand, mit Loop-Schutz (leere Standard-Filter lösen keinen Redirect
  aus) und klarem Opt-out `?all=1`.

## 3. Was Mock/Placeholder blieb

- Keine Umbenennung/Sortierung von Ansichten; kein Teilen einzelner privater
  Ansichten mit ausgewählten Kolleg:innen (nur SHARED/PRIVATE).

## 4. Später nötige Credentials/Accounts

- Keine.

## 5. Risiken

- Auto-Apply greift nur, wenn die Standard-Ansicht Filter trägt; eine „leere"
  Standard-Ansicht (alle Fälle) ist bewusst ein No-op statt eines Redirects.
- Dev-Header-Betrieb (lokale Demo ohne Login) kann private Ansichten/Standard
  nicht nutzen — im echten Web-App-Betrieb sind Nutzer stets angemeldet.

## 6. Nächster Block

Kandidaten: **Abschluss/Härtung** (Security-Review + Go-Live-Checkliste aller
`TODO PROVIDER SETUP`), **freier Datumsbereich** für Filter, oder
Provider-Aktivierung (Resend/Storage/Stripe/whisper real). Vorschlag + Prompt im
Handoff.
