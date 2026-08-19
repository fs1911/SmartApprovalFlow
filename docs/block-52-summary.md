# Block 52 — Summary (Deploy-Reife für Railway · Launch Phase 1)

Das Repo wird **deploy-fertig** für Railway (ein Projekt: Web + API + Postgres),
damit `nicka.ch` live gehen kann. Rein infrastrukturell/betrieblich — keine
Produktlogik geändert. Dazu der Gesamt-**Masterplan** und eine klick-genaue
Anleitung, damit der (nicht-technische) Betrieb selbst durch die Klicks kommt.

## 1. Was gebaut wurde

### Auf `$PORT` hören (PaaS-Konvention)

- **API** (`apps/api/src/config.ts`): `API_PORT` bevorzugt jetzt `process.env.PORT`
  (Railway spritzt ihn ein), Fallback `API_PORT`/4000 für dev/compose.
- **Web** (`apps/web/package.json`): `start` = `next start` (ohne hartes `-p 3000`)
  → honoriert `$PORT`, lokal weiterhin 3000.
- Beide **Dockerfile-Healthchecks** nutzen jetzt `$PORT` vor dem Default.

### Migrate-on-deploy ohne separaten Schritt

- Neue **letzte** Stage `serve` in `apps/api/Dockerfile` (behält Prisma-CLI +
  tsx): beim Containerstart `prisma migrate deploy` → `bootstrap` → API-Start.
  Bewusst die letzte Stage, damit PaaS-Builder (die kein `--target` kennen) sie
  automatisch bauen. `compose`/CI bauen weiterhin explizit `runtime`/`migrate`
  und sind unberührt.

### Erster Login ohne Demo-Daten, ohne Shell — `bootstrap.ts`

- Neues, **idempotentes** `packages/db/prisma/bootstrap.ts` (+ npm-Script
  `bootstrap`): legt aus `BOOTSTRAP_TENANT_SLUG` / `BOOTSTRAP_OWNER_EMAIL` /
  `BOOTSTRAP_OWNER_PASSWORD` den **ersten echten Workspace + OWNER** an
  (Passwort im selben scrypt-Format wie `seed.ts`/`password.ts`).
- **No-op**, wenn die Variablen fehlen → sicher bei jedem Deploy. Nach dem ersten
  Login soll `BOOTSTRAP_OWNER_PASSWORD` wieder entfernt werden.

### Doku

- **`docs/launch-plan.md`** — der lineare 5-Phasen-Masterplan bis „live, sicher"
  (mit `[DU]`/`[ICH]`-Aufgabenteilung).
- **`docs/deploy-railway.md`** — klick-genaue Anleitung (Projekt → Postgres →
  API → Web → Domain via Infomaniak → Fertig-Check → Troubleshooting) inkl.
  Env-Variablen-Tabellen und „wie erzeuge ich ein sicheres `AUTH_JWT_SECRET`".
- `.env.example`: neue optionale `BOOTSTRAP_*`-Sektion.

## 2. Entscheidungen

- **Ein App-Host statt vieler Provider** — Railway betreibt Web + API + DB in
  einem Projekt und liest die vorhandenen Dockerfiles; wenigste Denklast.
- **Bootstrap statt Prod-Seed** — die Demo-`seed.ts` bleibt für Entwicklung;
  Produktion bekommt einen echten, env-gesteuerten Owner (keine Muster-Daten).
- **Additiv & rückwärtskompatibel** — neue Dockerfile-Stage + `$PORT`-Fallbacks
  ändern lokale/CI-Pfade nicht (compose nutzt weiterhin `runtime`/`migrate`).

## 3. Was Mock/Placeholder blieb (bewusst für Phase 2)

- `EMAIL_PROVIDER=console` (Links werden erzeugt, aber nicht versendet) und
  `STORAGE_DRIVER=local` (Foto-Uploads nicht redeploy-fest). Beide werden in
  Phase 2 (Resend + R2/Supabase) scharf geschaltet.

## 4. Später nötige Credentials/Accounts (durch den Betreiber)

- **Railway**-Konto, **Infomaniak**-DNS-Zugang (beides beim Nutzer).
- Werte, die der Nutzer setzt: `AUTH_JWT_SECRET` (generiert), `BOOTSTRAP_*`.

## 5. Risiken

- Rein infrastrukturell. Typecheck grün, Web-Build grün (24/24 statisch), API
  **189 / 0 Fehler**. `bootstrap.ts` typecheckt gegen das Prisma-Modell; die
  eigentliche DB-Wirkung ist hier ohne DB nicht ausführbar, spiegelt aber exakt
  die geprüften `seed.ts`-Upserts (Tenant/User/Membership, scrypt-Hash).
- Migrationen/Bootstrap laufen beim Start jeder API-Instanz — für den
  Single-Instance-Launch unkritisch; bei späterem Scale-out auf einen separaten
  Release-Schritt umstellen (Notiz für Phase 4).

## 6. Nächster Block / Übergabe

**[DU]** die Schritte in `docs/deploy-railway.md` ausführen (Railway + Infomaniak).
Sobald `www.nicka.ch` lädt und der Login klappt, ist Phase 1 erledigt → weiter
mit **Phase 2** (E-Mail via Resend + Foto-Storage), die ich dann baue.
