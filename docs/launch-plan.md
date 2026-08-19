# Nicka — Launch-Masterplan

Der eine, lineare Plan von „gebaut" bis „live, funktioniert, sicher". Wir gehen
**Schritt für Schritt**, immer nur den nächsten. `[DU]` = du klickst/erstellst,
`[ICH]` = im Code/Repo erledigt.

**Stack-Entscheidung (bewusst simpel):**

- **Domain/DNS:** Infomaniak (`nicka.ch` gekauft) → zeigt auf den App-Host.
- **App (Web + API) + Datenbank:** **Railway** — ein Projekt hostet beide
  Container + PostgreSQL. Nutzt die vorhandenen Dockerfiles.
- **E-Mail:** Resend (Phase 2). **Foto-Storage:** Phase 2.

---

## Phase 1 · Online schalten → `nicka.ch` lebt

Ziel: Website läuft unter der Domain, Login funktioniert. **← wir sind hier**

- [x] **[ICH]** Repo deploy-fertig: API/Web hören auf `$PORT`, Migrationen laufen
      beim Deploy automatisch (Dockerfile-`serve`-Stage), Healthchecks angepasst.
- [x] **[ICH]** Klick-genaue Anleitung: [`docs/deploy-railway.md`](deploy-railway.md).
- [ ] **[DU]** Railway-Projekt anlegen, PostgreSQL + API + Web nach Anleitung.
- [ ] **[DU]** Env-Secrets setzen (Liste + Erklärung in der Anleitung).
- [ ] **[DU]** Infomaniak-DNS auf Railway zeigen.
- [ ] **[BEIDE]** Verifizieren: Healthchecks grün, `nicka.ch` lädt, Login klappt.

## Phase 2 · Freigaben wirklich versenden

Ziel: echte Kundschaft bekommt echte Links; Fotos werden dauerhaft gespeichert.

- [ ] **[DU]** Resend-Account + Absenderdomain verifizieren (DKIM/SPF bei
      Infomaniak — Records liefere ich).
- [ ] **[ICH]** `EMAIL_PROVIDER=resend` aktivieren, E-Mail-Vorlagen finalisieren.
- [ ] **[DU/ICH]** Foto-Storage (Cloudflare R2 oder Supabase) anschließen
      (`STORAGE_DRIVER`), Keys setzen.

## Phase 3 · Sicherheit härten (cyber-sicher)

- [ ] **[ICH]** Security-Header (CSP/HSTS), Cookie-/CSRF-Härtung, Entropie der
      loginlosen Links prüfen, `npm audit`/Supply-Chain, PII-armes Logging,
      Secret-Scanning.
- [ ] **[DU/extern]** Optionaler externer Security-Check vor dem Skalieren.

## Phase 4 · Betrieb absichern

- [ ] **[ICH]** Error-Tracking (Sentry), Uptime-Alarm.
- [ ] **[DU/ICH]** DB-Backups aktivieren + einen Restore-Test machen.

## Phase 5 · Recht & Beta

- [ ] **[DU + Anwalt]** Rechtstexte/Datenschutz (revDSG/DSGVO) final freigeben.
- [ ] **[DU]** Beta mit **einer** echten Garage — letzte Praxis-Bugs finden.
- [ ] _(optional, später)_ **Stripe** für automatische Verrechnung. Zum Start
      reicht manuelles Verrechnen.

---

## Ehrliche Erwartung

Ich bringe Nicka auf **produktionsreif & gehärtet**. „Cyber-sicher" braucht
zusätzlich eine **externe Prüfung**, „rechtssicher" einen **Anwalt**, und
„einwandfrei" bestätigt sich erst in der **Beta** mit echten Nutzern — kein
Software-Produkt ist je „fertig-bugfrei" auf Knopfdruck.
