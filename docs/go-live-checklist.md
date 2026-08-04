# Go-Live-Checkliste

Alles, was für einen echten Produktivbetrieb aktiviert/gesetzt werden muss —
gebündelt an **einer** Stelle. Lokal & in CI läuft alles ohne diese Schritte
(Mock/Console/Local-Fallbacks); jeder Punkt ist im Code als `TODO PROVIDER SETUP`
markiert und über den Adapter vorbereitet, ohne Kern-Umbau.

> Fail-fast-Schutz: In `NODE_ENV=production` prüft `apps/api/src/config.ts` die
> Konfiguration. Wird ein Provider **ausgewählt** (`*_PROVIDER=…`), aber sein
> Key/Endpoint fehlt, bricht der Start mit klarer Meldung ab. Zusätzlich werden
> unsichere, aber lauffähige Defaults **gewarnt** (Console-E-Mail, Local-Storage,
> Dev-Billing-Secret, `localhost`-Base-URLs).

## 0. Basis (immer nötig in Produktion)

| Was                    | ENV                            | Hinweis                                                                                      |
| ---------------------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| Datenbank              | `DATABASE_URL`                 | Pflicht in Prod (sonst Start-Abbruch). Migrationen: `prisma migrate deploy` (Migrate-Image). |
| JWT-Secret             | `AUTH_JWT_SECRET`              | ≥ 32 Zeichen, **nicht** der Dev-Default (sonst Abbruch).                                     |
| Öffentliche URLs       | `WEB_BASE_URL`, `API_BASE_URL` | Echte Domains — sonst sind Kundenlinks/Upload-URLs unerreichbar (Warnung).                   |
| Billing-Webhook-Secret | `BILLING_WEBHOOK_SECRET`       | Aus dem Dev-Default `whsec_dev_billing` ändern (Warnung).                                    |

## 1. E-Mail (Resend) — Kundenlinks & Reminder

- **Default:** `EMAIL_PROVIDER=console` → E-Mails werden nur geloggt.
- **Aktivieren:** Resend-Account + verifizierter Absender, dann
  `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=re_…`, `EMAIL_FROM=freigabe@<domain>`.
- **Fallback:** ohne Key degradiert der Code sicher auf `console` (nie Crash,
  nie stiller No-Op). In Prod mit `resend` **ohne** Key → Start-Abbruch.
- **Verifizieren:** Fall anlegen → „Senden"; E-Mail beim Kunden prüfen; Reminder
  über `POST /reminders/run`.
- Code: `apps/api/src/lib/notifications.ts` · Doku: `docs/reminders.md`.

## 2. SMS — vorbereitet, noch inaktiv

- **Status:** im Modell vorhanden (`MessageChannel.SMS`), Transport ist ein
  `DisabledSmsProvider` → liefert bewusst `FAILED` mit klarer Meldung.
- **Aktivieren:** echten SMS-Adapter (z. B. Twilio) analog zum E-Mail-Provider
  ergänzen — eigener Ausbau-Block, kein reines ENV-Setzen.
- Code: `apps/api/src/lib/notifications.ts`.

## 3. Storage (Foto-Uploads) — Supabase oder Cloudflare R2

- **Default:** `STORAGE_DRIVER=local` → Bytes auf dem Dateisystem (nicht
  dauerhaft; in Prod nur gewarnt).
- **Aktivieren (Supabase):** `STORAGE_DRIVER=supabase`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.
- **Aktivieren (R2):** `STORAGE_DRIVER=r2`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
- **Fallback:** Cloud-Treiber sind `UnconfiguredCloudDriver` → schlagen laut fehl,
  bis real angebunden. In Prod mit gewähltem Cloud-Treiber ohne Keys →
  Start-Abbruch.
- **Verifizieren:** Foto an einer Position hochladen → Anzeige/Download prüfen.
- Code: `apps/api/src/lib/storage.ts` · Doku: `docs/storage-strategy.md`.

## 4. Billing (Stripe)

- **Default:** `BILLING_PROVIDER=mock` → Planwechsel sofort, keine echten
  Zahlungen.
- **Aktivieren:** `BILLING_PROVIDER=stripe`, `STRIPE_SECRET_KEY=sk_live_…`;
  Checkout-/Billing-Portal-Sessions implementieren (heute laut `fail()`).
- **Webhooks:** eingehende Billing-Events sind HMAC-signaturgeprüft
  (`BILLING_WEBHOOK_SECRET`) und idempotent — echtes Secret setzen.
- **Fallback:** ohne Key fällt der Resolver auf `mock` zurück (mit Warnung); in
  Prod mit `stripe` ohne Key → Start-Abbruch.
- Code: `apps/api/src/lib/billing.ts` · Doku: `docs/billing-and-plans.md`.

## 5. Voice/STT (whisper)

- **Default:** `VOICE_PROVIDER=mock` → nutzt gelieferten Transkript-Text bzw. ein
  deterministisches Beispiel, kein Account.
- **Aktivieren:** `VOICE_PROVIDER=whisper`, `VOICE_PROVIDER_API_KEY=…`, optional
  `VOICE_PROVIDER_URL` (OpenAI-kompatibles `/audio/transcriptions`),
  `VOICE_PROVIDER_MODEL`.
- **Fallback:** ohne Key/Audio klarer Fehler; in Prod mit `whisper` ohne Key →
  Start-Abbruch. Vor Produktivnutzung gegen das gewählte Backend verifizieren.
- Code: `apps/api/src/lib/voice.ts` · Doku: `docs/voice-and-capture.md`.

## 6. Error-Monitoring

- **Default:** `ERROR_MONITORING=none` → No-Op (nur Log).
- **Aktivieren:** `ERROR_MONITORING=sentry|http` + `ERROR_MONITORING_DSN=…`;
  konkrete Payload-Form je Backend noch verdrahten.
- **Fallback:** ohne DSN No-Op; in Prod mit gewähltem Backend ohne DSN →
  Start-Abbruch.
- Code: `apps/api/src/lib/monitoring.ts` · Doku: `docs/observability.md`.

## 7. Container-Registry-Push (Release)

- **Default:** aus. `.github/workflows/release.yml` baut SHA/Tag-gestempelte
  Images, pusht aber nur bei Repo-Variable `ENABLE_REGISTRY_PUSH=true`.
- **Aktivieren:** Variablen `ENABLE_REGISTRY_PUSH=true`, `REGISTRY_HOST`
  (z. B. `ghcr.io`), `REGISTRY_NAMESPACE`; Secrets `REGISTRY_USER`,
  `REGISTRY_TOKEN`.
- Doku: `docs/containerization.md`, `docs/release-and-deployment-runbook.md`.

## 8. Legal / Betrieb (nicht Code)

- `TODO LEGAL REVIEW`: DPA, Hosting-Standort, Zertifizierungen, finale
  Rechtstexte (`docs/security.md`, Marketing-`/legal/**`).
- Domain/DNS, TLS, Security-Header/HSTS/CSP am Edge (Block-6-Zielbild,
  `docs/infrastructure.md`, ADR-005).

---

### Schnell-Reihenfolge für einen ersten Live-Betrieb

1. `DATABASE_URL`, `AUTH_JWT_SECRET`, `WEB_BASE_URL`/`API_BASE_URL` setzen,
   `prisma migrate deploy`.
2. E-Mail (Resend) aktivieren → Kundenlinks kommen an.
3. Storage (Supabase/R2) aktivieren → Fotos sind dauerhaft.
4. Error-Monitoring aktivieren → Fehler werden sichtbar.
5. Optional: Billing (Stripe), Voice (whisper), Registry-Push.
6. Prod-Start beobachten: die Config-Guard-Warnungen im Log abarbeiten.
