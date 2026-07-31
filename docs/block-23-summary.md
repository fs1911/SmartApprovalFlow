# Block 23 — Summary (MVP-Release-Abschluss: schlankes Image & Registry-Push)

Baut auf Block 19–20 auf, ohne Kernflows umzubauen. Zwei Ziele: ein **schlankes
API-Runtime-Image** (Dev-Dependencies raus, Start-Pfad unverändert) und ein
**aktivierbarer Registry-Push** über einen tag-/dispatch-getriggerten Release-
Workflow. Lokal so weit möglich verifiziert (Docker-Build läuft nur in CI).

## 1. Was gebaut wurde

### Schlankes API-Image + separates Migrate-Image
- `apps/api/Dockerfile`: zwei Targets über gemeinsame `deps`/`build`-Layer:
  - **`runtime`** (→ `saf-api`): `npm prune --omit=dev` entfernt Dev-Deps
    (TypeScript, Prisma-CLI, `@types`, …); behalten: `tsx`, `@prisma/client`,
    `openssl`. Der generierte Prisma-Client (`node_modules/.prisma`) wird aus
    dem `build`-Stage überkopiert, damit ihn ein Prune nie entfernt. Start
    weiterhin via `tsx`.
  - **`migrate`** (→ `saf-migrate`): volle Deps inkl. Prisma-CLI für
    `migrate deploy` + Seed.
- `docker-compose.yml`: `api` baut Target `runtime`, `migrate` baut Target
  `migrate` (eigenes Image `saf-migrate`). Geteilte Layer → kein doppelter
  schwerer Build.

### Release-Workflow mit optionalem Push
- `.github/workflows/release.yml` (neu), Trigger **nur** `push: tags: v*` +
  `workflow_dispatch`: baut die Images (Tag = Tag-Name bzw. SHA via
  `APP_VERSION`). **Push standardmäßig AUS** — läuft nur bei Repo-Variable
  `ENABLE_REGISTRY_PUSH == 'true'` (+ `REGISTRY_HOST`/`_NAMESPACE`,
  Secrets `REGISTRY_USER`/`_TOKEN`). Default-Pfad braucht **kein Secret**.
  Klar als `TODO PROVIDER SETUP` markiert.

### Trigger-/Gate-Einteilung (dokumentiert)
- `ci.yml` → `container-smoke` (jeder Push, non-blocking): bauen→hochfahren→smoken.
- `release.yml` → `images` (Tag/Dispatch): bauen + optional pushen. Kein
  Doppel-Build auf normalen Pushes.

### Doku
- `docs/containerization.md` erweitert (Zwei-Target-Image, Release/Trigger-
  Tabelle, Push-Aktivierung); dieses Summary; Roadmap + README.

## 2. Entscheidungen

- **Zwei Targets statt zwei Dockerfiles** — teure Layer (npm ci, generate)
  werden geteilt; `api` schlank, `migrate` mit CLI.
- **`.prisma` explizit überkopiert** — hedgt gegen ein mögliches Entfernen des
  generierten Clients durch `npm prune`; die Laufzeit-DB-Query bleibt garantiert
  funktionsfähig.
- **Push opt-in per Repo-Variable** statt Secret-Existenz-Check — der Default-
  Pfad ist ohne jedes Secret grün; Aktivierung ist ein bewusster Schritt.
- **Eigener Release-Workflow** statt Push in `container-smoke` — klare Trennung
  „validieren bei jedem Push" vs. „veröffentlichen bei Release".

## 3. Was Mock/Placeholder blieb

- Registry-Push ist nicht gegen eine echte Registry verifiziert (kein Secret).
- Kein Multi-Arch, kein Kubernetes/Helm.

## 4. Später nötige Credentials/Accounts

- Für den Push: Registry (`REGISTRY_HOST`/`_NAMESPACE`) + `REGISTRY_USER`/
  `REGISTRY_TOKEN`, plus `ENABLE_REGISTRY_PUSH=true`.

## 5. Verifikation / Limitierung in dieser Umgebung

- ✅ `docker compose config` valide (Targets `runtime`/`migrate` aufgelöst),
  CI-YAMLs valide, App-Gates unverändert grün (kein App-Code geändert).
- ⚠️ Der eigentliche Image-Build (inkl. `npm prune` + `.prisma`-Overlay) läuft
  wegen der Docker-Hub-Proxy-Blockade nur in CI — der `container-smoke`-Job ist
  die echte Validierung (Migration im `saf-migrate`, API-Start + Readiness im
  schlanken `saf-api`).

## 6. Risiken

- Erste echte Validierung des schlanken Images erfolgt in CI; sollte
  `container-smoke` rot werden (z. B. fehlende Laufzeit-Dep nach Prune), zeigt
  der Readiness-Smoke es sofort und der Fix ist gezielt (Dep behalten / Overlay).

## 7. Nächster Block

Kandidaten: **Registry-Push real verifizieren** (sobald eine Registry bereitsteht),
**Multi-Arch-Images**, oder Produkt-Weiterentwicklung (z. B. Kategorie/
Beschreibung pro Position, whisper gegen echtes Backend). Vorschlag + Prompt im
Handoff.
