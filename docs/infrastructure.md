# Infrastructure — Target Picture

Zielbild für Betrieb, Hosting und Provider. In Block 6 **vorbereitet**, nicht
live angebunden: alles läuft lokal ohne externe Credentials; Cloud-Provider sind
opt-in (siehe `env-and-secrets.md`). Entscheidungen: `decisions/adr-005-...`.

## Komponenten

| Komponente | Rolle | Provider (Ziel) | Dev-Fallback |
| --- | --- | --- | --- |
| `apps/web` (Next.js) | Marketing-Site + App-UI + Kundenseite | Hosting-Plattform / Container | `next start` lokal |
| `apps/api` (Fastify) | REST-API, OpenAPI, Business-Logik | Container/Runtime | `tsx` lokal |
| PostgreSQL | Persistenz (Prisma) | **Supabase** (Managed Postgres) | lokales Postgres |
| Storage | Foto-/Datei-Anhänge | **Supabase Storage** oder **Cloudflare R2** | `local`-Treiber (Dateisystem) |
| E-Mail | Freigabe-/Reminder-Versand | **Resend** | `console`-Provider (Log) |
| DNS / CDN / TLS | Domains, Edge, Zertifikate, White-Label-Domains | **Cloudflare** | — |

## Datenfluss (Ziel)

```
                         Cloudflare (DNS · CDN · TLS · Custom Domains)
                                        │
              ┌─────────────────────────┼──────────────────────────┐
              ▼                          ▼                          ▼
      app.<domain>              api.<domain>                <tenant-domain>/a/{token}
      apps/web (Next)   ──REST──▶ apps/api (Fastify) ──Prisma──▶ Supabase Postgres
              │                          │
              │                          ├─ E-Mail ──▶ Resend  (EMAIL_PROVIDER=resend)
              │                          └─ Storage ─▶ Supabase Storage / R2 (STORAGE_DRIVER)
              │
   Marketing (/) + App (/dashboard…) + Kundenseite (/a/{token})

  Dev/ohne Credentials:  Postgres lokal · E-Mail=console · Storage=local
```

## Warum diese Provider (kurz)

- **Supabase** = Managed Postgres ohne DB-Ops; passt direkt zu Prisma über
  `DATABASE_URL`. Optionale Storage-/Auth-Bausteine später nutzbar, ohne dass
  wir das Datenmodell ändern.
- **Cloudflare** = DNS, CDN, TLS und – zentral für White-Label – **Custom
  Domains pro Tenant**; optional R2 als S3-kompatibler Objektspeicher.
- **Resend** = schlanker, entwicklerfreundlicher E-Mail-Versand hinter unserer
  bestehenden Notification-Abstraktion (nur Adapter, kein Umbau).

Details/Alternativen: `decisions/adr-005-hosting-and-providers.md`.

## Provider-Readiness im Code (heute)

- **E-Mail:** `apps/api/src/lib/notifications.ts` — `ConsoleProvider` (default)
  und `ResendProvider` (aktiv ab `EMAIL_PROVIDER=resend` + `RESEND_API_KEY`).
  Ohne Key → console, nie ein stiller No-Op.
- **Storage:** `apps/api/src/lib/storage.ts` — `StorageDriver`-Interface,
  `LocalStorageDriver` (dev), Cloud-Platzhalter (`supabase`/`r2`), Auswahl über
  `STORAGE_DRIVER`; ohne Credentials → `local`.
- **Config:** `apps/api/src/config.ts` (Zod, Boot-Validierung),
  `apps/web/lib/env.ts` (schlanke Web-Validierung).

## Nicht in diesem Block

Keine echten Cloud-Deployments, keine Live-Zahlungen, kein Auth-Overhaul, keine
echte Webhook-Zustellung. Diese bauen auf dieser Vorbereitung auf (Block 7/8).
