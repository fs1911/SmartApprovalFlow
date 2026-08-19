# Nicka live schalten auf Railway (Phase 1)

Schritt-für-Schritt-Anleitung, um `nicka.ch` online zu bringen. Du brauchst kein
Vorwissen — folge einfach den Schritten der Reihe nach. Ergebnis: Website läuft
unter deiner Domain, Login funktioniert.

**Der Aufbau:** ein Railway-Projekt mit **drei Bausteinen** — `PostgreSQL`
(Datenbank), `api` (Fastify) und `web` (Next.js). Beide App-Bausteine kommen aus
deinem GitHub-Repo, gebaut über die vorhandenen Dockerfiles.

**Reihenfolge zählt:** Datenbank → API (bekommt eine URL) → Web (braucht die
API-URL). Genau so gehen wir vor.

---

## 0 · Vorbereitung

1. Konto auf **railway.com** erstellen (mit GitHub anmelden ist am einfachsten).
2. Sicheren Wert für `AUTH_JWT_SECRET` erzeugen — im Terminal:
   ```
   openssl rand -base64 48
   ```
   (Alternativ: irgendeine zufällige Zeichenfolge mit **mindestens 32 Zeichen**.)
   Bewahre den Wert kurz auf — du fügst ihn gleich beim API-Baustein ein.

---

## 1 · Projekt + Datenbank

1. Railway → **New Project** → **Deploy from GitHub repo** → wähle
   `fs1911/SmartApprovalFlow`. (Railway legt einen ersten Service an — den
   konfigurieren wir gleich als `api`.)
2. Im Projekt: **+ New** → **Database** → **Add PostgreSQL**.
   → Railway erstellt die DB und stellt automatisch die Variable
   `DATABASE_URL` bereit.

---

## 2 · API-Baustein

Öffne den aus dem Repo erstellten Service (oder **+ New → GitHub Repo** →
dasselbe Repo) und benenne ihn **`api`**. Dann:

**Settings → Build — WICHTIG: auf Dockerfile umstellen**

Railway wählt sonst automatisch seinen eigenen Builder „Railpack" und scheitert
mit _„No start command detected"_ (unser Monorepo hat kein Root-Start-Skript).
Zwing Railway, unser **Dockerfile** zu nutzen — **eine** dieser zwei Varianten:

- **Variante A (empfohlen, aus dem Repo):** Setze bei diesem Service unter
  **Settings → Build** das **Config-Datei-Feld** (heißt „Railway Config File" /
  „Config as code") auf **`apps/api/railway.json`**. Diese Datei pinnt Builder =
  Dockerfile + Pfad + Healthcheck.
- **Variante B (rein im UI):** Setze unter **Settings → Build** das Feld
  **„Dockerfile Path"** auf **`apps/api/Dockerfile`** (schaltet Railpack ab).

In beiden Fällen: **Root Directory = `/`** lassen (das Dockerfile baut vom
Repo-Wurzelverzeichnis). Es baut automatisch die letzte Stage `serve` — die
migriert die DB beim Start, legt den Owner an und startet dann die API. Kein
„Target" nötig.

**Variables** (Tab „Variables" → „New Variable"):

| Variable                   | Wert                         | Hinweis                                         |
| -------------------------- | ---------------------------- | ----------------------------------------------- |
| `NODE_ENV`                 | `production`                 |                                                 |
| `DATABASE_URL`             | `${{Postgres.DATABASE_URL}}` | Referenz auf die DB (genau so tippen)           |
| `AUTH_JWT_SECRET`          | _(dein Wert aus Schritt 0)_  | **geheim**, ≥ 32 Zeichen                        |
| `WEB_BASE_URL`             | `https://www.nicka.ch`       | für die Kunden-Links                            |
| `API_BASE_URL`             | _(die API-URL, siehe unten)_ | trägst du nach „Generate Domain" ein            |
| `EMAIL_PROVIDER`           | `console`                    | Phase 1: E-Mails werden nur geloggt             |
| `STORAGE_DRIVER`           | `local`                      | Phase 1: Fotos noch nicht dauerhaft             |
| `BOOTSTRAP_TENANT_SLUG`    | `nicka`                      | dein erster Workspace (klein, ohne Leerzeichen) |
| `BOOTSTRAP_TENANT_NAME`    | `Nicka`                      | Anzeigename                                     |
| `BOOTSTRAP_OWNER_EMAIL`    | _(deine Login-E-Mail)_       | dein erster Admin-Login                         |
| `BOOTSTRAP_OWNER_PASSWORD` | _(ein starkes Passwort)_     | **geheim**, ≥ 8 Zeichen                         |

> `PORT` **nicht** setzen — Railway spritzt den Port automatisch ein, die App
> liest ihn.

**Settings → Networking → Generate Domain** → du bekommst z. B.
`api-nicka-production.up.railway.app`.
→ Trage genau diese URL (mit `https://`) als **`API_BASE_URL`** oben ein.

Railway baut jetzt neu. Wenn fertig, prüfe im Browser:

- `https://<deine-api-url>/api/v1/health` → sollte `{"status":"ok",...}` zeigen.
- `https://<deine-api-url>/api/v1/health/ready` → `ready: true` (DB erreichbar).

Beim Start hat die API automatisch die Datenbank migriert **und** deinen ersten
Owner-Login angelegt (aus den `BOOTSTRAP_*`-Variablen).

---

## 3 · Web-Baustein

**+ New → GitHub Repo** → dasselbe Repo → benenne ihn **`web`**.

**Settings → Build — auf Dockerfile umstellen** (wie beim API-Baustein):

- **Variante A:** Config-Datei-Feld auf **`apps/web/railway.json`**, oder
- **Variante B:** **„Dockerfile Path"** auf **`apps/web/Dockerfile`**.
- **Root Directory = `/`** lassen.

**Variables:**

| Variable                   | Wert                          | Hinweis                                     |
| -------------------------- | ----------------------------- | ------------------------------------------- |
| `NODE_ENV`                 | `production`                  |                                             |
| `NEXT_PUBLIC_API_BASE_URL` | _(die API-URL aus Schritt 2)_ | **vor** dem Build setzen (wird eingebacken) |
| `NEXT_PUBLIC_SITE_URL`     | `https://www.nicka.ch`        | für Canonical/SEO                           |

**Settings → Networking → Generate Domain** → Test-URL wie
`web-nicka-production.up.railway.app`. Öffne sie — die **Marketing-Seite von
Nicka** sollte erscheinen. 🎉

---

## 4 · Deine Domain `nicka.ch` (Infomaniak)

Ziel: `www.nicka.ch` zeigt auf den `web`-Baustein.

1. Railway → **`web`** → **Settings → Networking → Custom Domain** →
   `www.nicka.ch` eingeben. Railway zeigt dir einen **CNAME-Zielwert** an (etwas
   wie `abcd.up.railway.app`).
2. Infomaniak → **Domains → nicka.ch → DNS-Zone**:
   - Neuer Eintrag: **Typ `CNAME`**, **Name `www`**, **Ziel = der Railway-Wert**.
   - Für die nackte Domain `nicka.ch` (ohne `www`): eine **Weiterleitung**
     `nicka.ch → https://www.nicka.ch` einrichten (Infomaniak: „Weiterleitung"),
     _oder_ falls Infomaniak es anbietet, einen `ALIAS`/`ANAME`-Eintrag von
     `nicka.ch` auf denselben Railway-Wert.
3. 15–60 Min warten (DNS-Verteilung), dann `https://www.nicka.ch` öffnen.
   Railway stellt das TLS-Zertifikat automatisch aus.

---

## 5 · Fertig-Check

- [ ] `…/api/v1/health/ready` zeigt `ready: true`.
- [ ] `https://www.nicka.ch` lädt die Marketing-Seite.
- [ ] `https://www.nicka.ch/login` → mit **`BOOTSTRAP_OWNER_EMAIL` +
      Passwort** anmelden → Dashboard erscheint.

**Danach — Sicherheit:** entferne `BOOTSTRAP_OWNER_PASSWORD` wieder aus den
Variablen des `api`-Bausteins (der Owner existiert ja jetzt). So liegt das
Passwort nicht dauerhaft in der Umgebung.

---

## Wenn etwas klemmt

- **API startet nicht / „Invalid production configuration":** meist fehlt
  `DATABASE_URL` oder `AUTH_JWT_SECRET` ist < 32 Zeichen. Die Logs (Service →
  „Deployments" → „View Logs") nennen die genaue Zeile.
- **Web zeigt Fehler beim Laden von Daten:** `NEXT_PUBLIC_API_BASE_URL` zeigt
  nicht auf die laufende API — Wert prüfen und `web` neu deployen (der Wert wird
  beim **Build** eingebacken).
- **Login schlägt fehl:** Owner wurde nicht angelegt — prüfe, dass alle vier
  `BOOTSTRAP_*`-Variablen gesetzt waren, dann `api` neu deployen.
- **`nicka.ch` lädt nicht, `www` schon:** die Weiterleitung/den ALIAS für die
  nackte Domain in Infomaniak prüfen.

## Was in Phase 1 bewusst noch fehlt (kommt in Phase 2)

- **E-Mail-Versand** (`EMAIL_PROVIDER=console` → Links werden erzeugt, aber nicht
  verschickt). → Resend anschließen.
- **Dauerhafter Foto-Storage** (`STORAGE_DRIVER=local` → Uploads überleben ein
  Redeploy nicht). → R2/Supabase anschließen.

Siehe [`launch-plan.md`](launch-plan.md) für den Gesamtüberblick.
