# Block 10 — Summary (Onboarding & Self-Service-Aktivierung)

Baut auf Block 1–9 auf, ohne Kernflows umzubauen. Ziel: eine Werkstatt kommt
ohne manuelle Hilfe vom Login zum ersten versendeten Fall und lädt Kolleg:innen
selbst ein. Alles lokal ohne externe Accounts (Links im console-Log).

## 1. Was gebaut wurde

### Einladungen (API + Web)
- `POST/GET/DELETE /invitations` (members:manage/read) + loginloses
  `POST /invitations/accept`. Gehashter, einmaliger, ablaufender Token
  (`VerificationToken`, nur SHA-256 gespeichert); Annahme legt Nutzer +
  Mitgliedschaft an und gibt direkt eine **Session** zurück (Auto-Login).
- Web: Einladungs-Panel auf der Team-Seite (E-Mail + Rolle, offene Einladungen
  widerrufen), Annahme-Seite `/invite/[token]`.

### Passwort-Reset (API + Web)
- `POST /auth/forgot-password` (uniform → keine User-Enumeration) und
  `POST /auth/reset-password` (Token-geprüft, einmalig), beide login-rate-limited.
- Web: „Passwort vergessen?" auf der Login-Seite, `/forgot-password` und
  `/reset-password/[token]`.

### Geführtes Onboarding + Aktivierung
- `GET /onboarding` liefert eine **aus dem Zustand abgeleitete** Checkliste
  (Branding, Team, erster Fall, erster Versand, erste Reaktion) + Fortschritt +
  `activated`-Flag (Fall gesendet **und** beantwortet). Reine, getestete
  Funktion `computeOnboarding`.
- `POST /onboarding/sample-case` legt einen risikofreien Beispiel-Fall an.
- Web: Onboarding-Widget im Dashboard (Fortschrittsbalken, Deep-Links,
  verschwindet bei Abschluss).

### Empty-States & A11y
- Dashboard-Empty-State mit CTA; Einladungs-/Reset-Formulare mit `role="alert"`,
  `role="status"`, `aria-busy`; Fortschrittsbalken mit `role="progressbar"`.

### Tests
- Unit: Onboarding-Checklisten-Logik + Token-Gültigkeit (rein).
- Integration (inject): Onboarding-Checkliste; Einladung → Annahme → Login
  (+ Einmaligkeit); VIEWER darf nicht einladen (RBAC); Enumeration-Schutz +
  ungültiger Reset-Token. 53 API-Tests grün.

## 2. Entscheidungen

- **Ein `VerificationToken`-Modell** für Einladung + Reset — ein Sicherheits-
  und Ablaufmechanismus, weniger Migrationsfläche.
- **Onboarding-Fortschritt abgeleitet, nicht gespeichert** — immer korrekt, kein
  Backfill, kein Drift.
- **Auto-Login nach Annahme** — kürzester Weg in die App.
- **Uniforme forgot-password-Antwort** — Enumeration-Schutz als Default.
- **Dev-`acceptUrl`** nur ausserhalb Produktion, damit der Flow ohne Postfach
  testbar ist.

## 3. Was Mock/Placeholder blieb

- E-Mail-Versand über den console-Provider (Default); Resend real anschliessbar.
- **Kein Self-Signup** neuer Werkstätten/Tenants — Einladungen erweitern ein
  bestehendes Workspace; Tenant-Provisionierung bleibt Seed/Betrieb.
- Keine separate E-Mail-Adress-Verifikation ausserhalb des Einladungs-/Reset-Tokens.

## 4. Später nötige Credentials/Accounts

- Für realen Versand der Einladungs-/Reset-Mails: `EMAIL_PROVIDER=resend` +
  `RESEND_API_KEY`.

## 5. Risiken

- Einladungs-/Reset-Mails laufen im Dev nur ins Log — ohne echten Provider
  erreichen sie keine externen Postfächer (bewusst).
- Token-Tabelle wächst; die Retention-Cleanup-Policy aus Block 9 sollte um
  abgelaufene/verbrauchte `VerificationToken` erweitert werden (Deferred).
- Uniforme Antworten erschweren dem legitimen Nutzer die Rückmeldung „E-Mail
  unbekannt" — bewusster Trade-off zugunsten des Enumeration-Schutzes.

## 6. Nächster Block

**Block 11 — Billing- & Plan-Enforcement:** Pläne/Limits (Fälle pro Monat,
Sitze), Nutzungszählung, sanfte Limit-Hinweise und Upgrade-Pfade, Abrechnungs-
vorbereitung über einen Zahlungsanbieter-Adapter (Stripe) mit Dev-/Mock-Fallback
— weiterhin so weit wie möglich ohne externe Live-Accounts. Prompt im Handoff.
