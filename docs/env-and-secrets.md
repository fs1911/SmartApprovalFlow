# Environment & Secrets

Wie Konfiguration und Geheimnisse über Umgebungen verwaltet werden.

## Single Source

Die Wurzel-`/.env.example` ist die **Referenzquelle** aller Variablen. Jede App
hält eine schlanke Teilmenge:

- `apps/api/.env.example` — DB, API, E-Mail, Storage.
- `apps/web/.env.example` — API-URL, Site-URL.

Alles läuft mit den Defaults **ohne externe Credentials** (console-E-Mail,
local-Storage, Dev-Auth).

## Boot-Validierung

- **API:** `apps/api/src/config.ts` validiert die ENV per **Zod** beim Start und
  bricht bei ungültiger Konfiguration mit klarer Meldung ab (fail fast).
- **Web:** `apps/web/lib/env.ts` prüft die wenigen `NEXT_PUBLIC_*`-Werte schlank,
  warnt bei ungültigen URLs und fällt auf Defaults zurück (kein harter Absturz
  im Web-Runtime). Zugriff nur über `webEnv`, nicht direkt über `process.env`.

## Variablen-Überblick

| Variable | Bereich | Default | Secret? |
| --- | --- | --- | --- |
| `NODE_ENV` | shared | development | nein |
| `DATABASE_URL` | api/db | lokal Postgres | **ja** |
| `API_BASE_URL` / `WEB_BASE_URL` | api | localhost | nein |
| `AUTH_JWT_SECRET` | api | dev-Wert | **ja** (Prod) |
| `EMAIL_PROVIDER` / `EMAIL_FROM` | api | console | nein |
| `RESEND_API_KEY` | api | – | **ja** |
| `STORAGE_DRIVER` / `STORAGE_LOCAL_DIR` | api | local | nein |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | api | – | **ja** |
| `R2_*` | api | – | **ja** |
| `NEXT_PUBLIC_API_BASE_URL` | web | localhost | nein |
| `NEXT_PUBLIC_SITE_URL` | web | Prod-Domain | nein |

`NEXT_PUBLIC_*` wird in das Client-Bundle eingebettet → **niemals** Secrets mit
diesem Präfix.

## Secrets pro Umgebung

- **Development:** lokale `.env` (git-ignoriert). Nur Dev-Werte.
- **Staging/Production:** Secrets über die **Plattform-Secret-Verwaltung**
  (Hosting-Provider / CI), nicht im Repo. Rotierbar.
- Prinzip der **geringsten Rechte**: z. B. Storage-Service-Keys nur serverseitig
  in der API, nie im Web-Bundle.

## Aktivierungs-Matrix

| Feature | Dev-Default | Aktivieren mit |
| --- | --- | --- |
| Echter E-Mail-Versand | aus (console) | `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` |
| Cloud-Storage | aus (local) | `STORAGE_DRIVER=supabase|r2` + Credentials |
| Managed Postgres | aus (lokal) | `DATABASE_URL` auf Supabase zeigen |

Fehlt eine Credential bei aktiviertem Cloud-Feature, degradiert der Code sicher
(console/local) und warnt — er stürzt nicht ab.

## TODO PROVIDER SETUP

Vor Live-Betrieb einzurichten: Resend-Key + verifizierte Domain, Supabase-
Projekt(e) + Connection-String, Storage-Bucket, Cloudflare-Zone/Domains, sowie
ein sicheres `AUTH_JWT_SECRET` (für die echte Auth in Block 7).
