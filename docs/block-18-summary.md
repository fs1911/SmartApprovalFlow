# Block 18 — Summary (Deployment- & Launch-Härtung)

Baut auf Block 1–17 auf, ohne Kernflows umzubauen. Ziel: ein **reproduzierbarer,
verifizierter Production-Start-Pfad**, ein Readiness-Smoke und ein
Fail-fast-Config-Guard – alles lokal ohne externe Accounts prüfbar.

## 1. Was gebaut wurde

### Production-Start-Pfad repariert
- **Echter Bug gefunden:** `npm run start --workspace @saf/api` lief `node
  dist/server.js`, was in Produktion **nicht startet** – die geteilten Pakete
  (`@saf/types/db/ui`) werden als TS-Quelle konsumiert (`main → src/index.ts`),
  die reines Node nicht auflösen kann.
- **Fix (minimalinvasiv):** API-`start` läuft jetzt über `tsx src/server.ts`;
  `tsx` von dev- zu **Runtime**-Dependency hochgestuft. Keine Umstellung der
  Paket-Build-Kette (respektiert „keine neue Grundarchitektur"). Web startet
  unverändert via `next start` (transpiliert die Pakete bereits selbst).
- Prod-Build entschlackt: `tsconfig.build.json` schließt `*.test.ts` + `src/test/**`
  vom Emit aus.

### Production-Launch-Guard (fail fast)
- `apps/api/src/config.ts`: in `NODE_ENV=production` bricht der Boot mit klarer,
  gesammelter Meldung ab bei fehlender `DATABASE_URL`, Dev-/zu-kurzem
  `AUTH_JWT_SECRET`, oder einem **aktiv gewählten**, aber unvollständig
  konfigurierten Provider (resend/supabase/r2/stripe/monitoring). Warnungen für
  console-E-Mail, local-Storage, Default-Billing-Secret. In Dev/Test inert.

### Readiness-Smoke
- `apps/api/src/scripts/smoke.ts` + Script `npm run smoke --workspace @saf/api`:
  prüft `/health` + `/health/ready`, Exit ≠ 0 bei ungesund, Retry mit Backoff.
- Health-Probes melden jetzt eine nicht-stale, via `APP_VERSION` überschreibbare
  Version (vorher hartkodiert `1.0.0-block1`).

### CI
- Neuer **gating** Job `release-smoke`: startet die API im **Production-Modus**
  gegen einen Postgres-Service und lässt den Smoke laufen. Fängt genau die Klasse
  Fehler (kaputter Start-Pfad), die `verify` nicht sieht.

### Doku
- `docs/release-and-deployment-runbook.md`, dieses Summary; `.env.example` (Root +
  api) um Prod-Anforderungen + `APP_VERSION` ergänzt; Roadmap + README.

## 2. Entscheidungen

- **`tsx` als Prod-Runtime** statt Pakete vorzukompilieren – kleinster ehrlicher
  Fix, der den Start-Pfad real funktionsfähig macht, ohne Architektur/Exports
  aller Pakete umzubauen. Doku benennt die Vorkompilierung als optionalen
  Folge-Schritt.
- **Guard nur in Production** – lokale Null-Setup-Erfahrung bleibt unangetastet.
- **`release-smoke` gated** (nicht `continue-on-error`) – deterministisch, schnell
  und genau der Wert, den der Block liefern soll.

## 3. Was Mock/Placeholder blieb

- Kein Container-/IaC-Artefakt (Zielbild bleibt in `deployment.md`).
- `e2e`-Job weiterhin gegen `next dev` und non-blocking (Block 17); bewusst nicht
  auf Prod-Build umgestellt, um den Umfang klein zu halten.

## 4. Später nötige Credentials/Accounts

- Keine für den lokalen/CI-Pfad. Für echtes Prod: `DATABASE_URL`, `AUTH_JWT_SECRET`
  und die Provider-Keys, die der Guard einfordert.

## 5. Risiken

- `tsx`-Runtime hat minimalen Start-Overhead und eine zusätzliche Runtime-Dep;
  akzeptabel für den MVP, Vorkompilierung ist der spätere sauberere Weg.
- Der Guard prüft Präsenz, nicht Gültigkeit der Secrets (kein Live-Call zum
  Provider) – er verhindert offensichtliche Fehlkonfiguration, kein Ersatz für
  echten Provider-Test.

## 6. Nächster Block

Kandidaten: **Container-/IaC-Artefakt** (Dockerfiles + compose für den
Runbook-Pfad), **E2E auf Prod-Build** umstellen + zum Gate machen, oder der
zurückgestellte **Voice-Layer**. Vorschlag + Prompt im Handoff.
