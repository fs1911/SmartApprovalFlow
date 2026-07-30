# Block 20 — Summary (Container-Release-Pipeline & Container-Smoke)

Baut auf Block 19 auf, ohne Kernflows umzubauen. Ziel: die in Block 19 gebauten
Images nicht nur bauen, sondern **hochfahren und gegen die Container smoken**,
plus versionierte Image-Tags – so weit möglich lokal verifiziert, der Rest in CI.

## 1. Was gebaut wurde

### Versionierung / Tagging
- `docker-compose.yml`: Image-Tags und die von der API gemeldete Version kommen
  aus **`APP_VERSION`** (`saf-api:${APP_VERSION:-dev}` / `saf-web:${…}`), plus
  `APP_VERSION` als Runtime-ENV des `api`-Service. Lokal → `dev`; CI → Commit-SHA.
  `/api/v1/health` meldet damit exakt den laufenden Build.

### Container-Smoke in CI
- `.github/workflows/ci.yml`: Job **`container-smoke`** ersetzt den reinen
  `image-build`. Ablauf: `docker compose build` (Tag = SHA) → `docker compose up
  -d` → auf **Healthy** des API-Containers warten → Readiness-Smoke **im
  API-Container** (`docker compose exec api npm run smoke …`) → prüfen, dass
  `/api/v1/health` die SHA-Version meldet → Web-Startseite laden → bei Fehler
  `docker compose logs`, am Ende `docker compose down -v`. Non-blocking.
- Damit validiert **ein** Job Build **und** Laufzeit der Container (keine doppelte
  Arbeit).

### Registry-Push
- Als **TODO PROVIDER SETUP** dokumentiert (Login + Tag + Push), bewusst **nicht**
  aktiviert – keine echten Credentials im Repo. Die Images tragen dank
  `APP_VERSION` bereits den SHA-Tag.

### Doku
- `docs/containerization.md` erweitert (Versionierung, Container-Smoke,
  Gate-Tabelle, Registry-Push-TODO, aktualisierte Lokal-Limitierung); dieses
  Summary; Roadmap + README.

## 2. Entscheidungen

- **`APP_VERSION` als einzige Quelle** für Tag **und** gemeldete Version –
  ein Wert, überall konsistent, ohne Dockerfile-Änderung (die API las `APP_VERSION`
  schon seit Block 18).
- **`container-smoke` ersetzt `image-build`** – der Smoke baut ohnehin, deckt also
  die Build-Validierung mit ab; kein zweiter langsamer Build.
- **Non-blocking** – Container-Builds sind langsam und in der lokalen Sandbox
  nicht baubar; `release-smoke` bleibt das schnelle Start-Pfad-Gate.
- **Smoke _im_ Container** (`compose exec`) statt vom Host – prüft genau den
  Prozess, den der Container als PID 1 startet, mit dem bestehenden Smoke-Skript.

## 3. Was Mock/Placeholder blieb

- Registry-Push nur als TODO (kein aktiver Push, keine Secrets).
- Kein Kubernetes/Helm; kein Multi-Arch-Build.
- Compose-Seed weiterhin Demo-Daten (nicht für Prod).

## 4. Später nötige Credentials/Accounts

- Für den optionalen Registry-Push: Registry-Namespace + `REGISTRY_USER`/
  `REGISTRY_TOKEN` als CI-Secrets (nie im Repo).

## 5. Verifikation / Limitierung in dieser Umgebung

- ✅ `docker compose config` valide; `APP_VERSION`-Interpolation für `dev` und
  SHA geprüft; CI-YAML valide (4 Jobs); Review von Compose-/CI-Logik; App-Gates
  unverändert grün (typecheck + 104 API-Tests).
- ⚠️ **Kein lokaler `docker build` / `compose up`**: Agent-Proxy blockt die
  Docker-Hub-Registry-CDN (`403`). Der `container-smoke`-Ablauf läuft daher erst
  in CI (Docker Hub auf GitHub-Runnern erreichbar).

## 6. Risiken

- Erste echte Ausführung von `up`/Smoke erfolgt in CI; die Job-Schritte wurden
  defensiv geschrieben (Health-Warteschleife, Logs bei Fehler, Teardown).
- `docker compose exec` erwartet einen laufenden, gesunden API-Container – die
  vorgelagerte Health-Warteschleife stellt das sicher, sonst schlägt der Job (mit
  Logs) fehl.

## 7. Nächster Block

Kandidaten: **Registry-Push aktivieren** (sobald Credentials/Registry stehen) +
`release`-Trigger auf Tags, **Multi-Arch-/schlankes Runtime-Image**, oder der
zurückgestellte **Voice-Layer**. Vorschlag + Prompt im Handoff.
