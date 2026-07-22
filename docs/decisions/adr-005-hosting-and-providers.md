# ADR-005: Hosting & Providers

- **Status:** akzeptiert (Block 6) — vorbereitet, nicht live angebunden
- **Datum:** 2026-07

## Kontext

Das Produkt braucht ein klares Betriebszielbild (Hosting, DB, Storage, E-Mail,
DNS), das professionell ist, DACH/Schweiz passt und **ohne externe Live-Accounts
vorbereitbar** bleibt (Vorgabe: viel ohne Credentials umsetzbar, kein Chaos).

## Entscheidung

Provider-Zielbild mit gekapselten Adaptern und sicheren Dev-Fallbacks:

- **PostgreSQL → Supabase (Managed Postgres).** Nur `DATABASE_URL`, direkt mit
  dem bestehenden Prisma-Setup kompatibel. Kein DB-Ops-Aufwand. Optionale
  Supabase-Bausteine (Storage/Auth) später nutzbar, ohne Datenmodell-Umbau.
- **Storage → Supabase Storage oder Cloudflare R2**, hinter einem
  `StorageDriver`-Interface. Default `local` (Dateisystem) ohne Credentials.
- **E-Mail → Resend**, als Adapter hinter der bestehenden Notification-
  Abstraktion. Default `console` ohne Credentials; `resend` nur mit Key.
- **DNS/CDN/TLS/Custom-Domains → Cloudflare** (inkl. White-Label pro Tenant).
- **Hosting Web/API:** Next.js-fähige Plattform bzw. Node-Container; beide
  zustandslos. Konkrete Plattform: `TODO INFRA DECISION`.

Auswahl jeweils über ENV; fehlt eine Cloud-Credential, degradiert der Code
sicher (console/local) statt zu crashen.

## Alternativen

- **Alles bei einem Hyperscaler (AWS/GCP):** mächtig, aber mehr Ops/Komplexität
  als im aktuellen Reifegrad nötig.
- **Self-hosted Postgres:** volle Kontrolle, aber Betriebsaufwand; widerspricht
  „kein Infra-Ballast“.
- **SMTP statt Resend:** universell, aber mehr Konfig/Zustellbarkeitsaufwand;
  `smtp` bleibt als reservierte Option.
- **Nur R2 / nur Supabase Storage:** je nach Egress/Nähe zur DB — beide bleiben
  über das Treiber-Interface offen.

## Konsequenzen

- Klares, günstiges, DACH-taugliches Zielbild; früh dokumentiert.
- Code ist **provider-ready**: reale Anbindung = Credentials setzen + (bei
  Storage/Custom-Domain) den jeweiligen Treiber/Client fertig implementieren.
- Kein Lock-in im Kern: DB via Prisma, Storage/E-Mail hinter Interfaces.
- Offene Punkte (`TODO PROVIDER SETUP` / `TODO INFRA DECISION`): konkrete
  Hosting-Plattform, Supabase-Projekte, Cloudflare-Zone/Domains, Resend-Domain,
  Storage-Bucket, CI/CD-Pipeline.
