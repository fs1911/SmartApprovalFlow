# Block 30 — Summary (Release-Abschluss & Härtung)

Kein neues Feature, sondern Release-Reife: alle Provider-Aktivierungsschritte an
einer Stelle, ein leichter Security-/RBAC-Review und ein kleiner Härtungs-Fix.
Kein Kern-Umbau.

## 1. Was gebaut wurde

### Go-Live-Checkliste (`docs/go-live-checklist.md`)

- Bündelt **alle** `TODO PROVIDER SETUP`-Stellen: E-Mail (Resend), SMS
  (vorbereitet/inaktiv), Storage (Supabase/R2), Billing (Stripe), Voice
  (whisper), Error-Monitoring, Container-Registry-Push — plus Basis (DB,
  JWT-Secret, Base-URLs, Billing-Webhook-Secret) und Legal/Betrieb.
- Je Provider: Default/Fallback-Verhalten, benötigte ENV/Secrets, wie
  verifizieren, Codepfad + vertiefende Doku. Schnell-Reihenfolge für den ersten
  Live-Betrieb. Verlinkt aus README (Infrastruktur/Betrieb) und Roadmap.

### Security-/RBAC-Review (`docs/security.md`, Abschnitt „Review-Ergebnis")

- Alle **75** API-Routen auditiert: jede geschützte Route trägt
  `requirePermission(...)` oder `requireAuth`. Die 14 ungeschützten Routen sind
  bewusst offen und anders abgesichert (loginlose Auth-/Public-/Invite-Flows,
  HMAC-signierter Billing-Webhook, Capability-Key-Uploads, Health, der
  Dev-Webhook-Sink ist **nur** ausserhalb Produktion registriert).
- Tenant-Isolation, Zod-Input-Validierung (422) und Secret-/Prod-Guard bestätigt.
  Keine offene Rechte-Lücke gefunden.

### Härtungs-Fix (`apps/api/src/config.ts`)

- Der Produktions-Config-Guard warnt jetzt zusätzlich, wenn `WEB_BASE_URL` oder
  `API_BASE_URL` noch auf einen lokalen Host (`localhost`/`127.0.0.1`/`0.0.0.0`)
  zeigen — sonst wären Kundenlinks und signierte Upload-/Callback-URLs im
  Live-Betrieb unerreichbar. Neue exportierte Helfer `isLocalUrl` /
  `productionConfigWarnings` sind unit-getestet (`config.test.ts`).

### Tests

- `config.test.ts` (Block 30): `isLocalUrl` erkennt lokale Hosts;
  `productionConfigWarnings` meldet `localhost`-Base-URLs und schweigt bei echten
  Domains. Volle API-Suite grün (153 Tests).

### Doku

- `docs/go-live-checklist.md` (neu), `security.md` (Review-Ergebnis), dieses
  Summary, Roadmap + README (inkl. Block-Summaries-Index und Betrieb-Link).

## 2. Entscheidungen

- **Base-URL-Check als Warnung, nicht Abbruch** — wie die bestehenden
  „lauffähig, aber wahrscheinlich falsch"-Warnungen (Console-E-Mail,
  Local-Storage); blockiert keine legitimen Proxy-Setups, macht den Fehler aber
  im Log sofort sichtbar.
- **Checkliste statt Provider-Aktivierung** — echte Keys/Accounts bleiben
  bewusst aussen vor (keine Secrets im Repo); der Block macht den Weg dorthin
  reproduzierbar.

## 3. Was Mock/Placeholder blieb

- Alle Provider bleiben im Default-Mock/Fallback; die Aktivierung ist jetzt nur
  dokumentiert/geführt, nicht durchgeführt (braucht Accounts/Secrets).

## 4. Später nötige Credentials/Accounts

- Genau die in `docs/go-live-checklist.md` gelisteten (Resend, Supabase/R2,
  Stripe, whisper-Key, Monitoring-DSN, Registry-Credentials).

## 5. Risiken

- Die Checkliste muss gepflegt werden, wenn neue Provider-Seams dazukommen
  (heute Single Source of Truth für Go-Live).

## 6. Nächster Block

Kandidaten: **Provider real aktivieren** (mit deinen Accounts/Secrets, z. B.
Resend + Storage zuerst), **freier Datumsbereich** für Filter, oder weiterer
Produkt-Feinschliff. Vorschlag + Prompt im Handoff.
