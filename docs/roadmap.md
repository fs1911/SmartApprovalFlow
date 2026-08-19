# Roadmap (blockweise)

Wir bauen blockweise: fokussiert, baubar, professionell — statt „perfekt, aber
riesig".

| Block | Thema | Status |
| --- | --- | --- |
| **Block 1** | **Foundation** — Produktlogik, Architektur, API-Strategie, Datenmodell, Design-Fundament, Repo-Struktur, Grundgerüst | ✅ abgeschlossen |
| **Block 2** | **Approval Case Workflow** — End-to-End: Fall erstellen → Liste → Detail → Kundenlink → Kundenentscheid → Status + Audit-Trail | ✅ abgeschlossen |
| **Block 3** | **Operational Hardening** — E-Mail-Versand + Reminder, Nachrichtenvorlagen, State-Machine + Expiry, Timeline, bessere Kundenseite, Event-/Webhook-Grundlage | ✅ abgeschlossen |
| **Block 4** | **Multi-Tenant-B2B-Reife** — tenant-scoped RBAC (5 Rollen), Isolation-Härtung, Mitglieder-/Workspace-Verwaltung, White-Label-Branding, operatives Reporting | ✅ abgeschlossen |
| **Block 5** | **Öffentlicher kommerzieller Layer** — Marketing-Website, Positionierung/Messaging, Pricing, Billing-Vorbereitung (Doku), Legal-Entwürfe, Trust, Conversion, SEO | ✅ abgeschlossen |
| **Block 6** | **Infrastruktur & Provider-Readiness** — Hosting/Deployment-Zielbild, Supabase/Cloudflare/Resend-Rollen (Adapter + Dev-Fallback), Storage-Abstraktion, Token-/Domain-Strategie, ENV/Secrets, Dev/Staging/Prod | ✅ abgeschlossen |
| **Block 7** | **Auth- & Integrations-Härtung** — echte Auth (JWT + API-Keys/Scopes), Rate-Limiting, echte Webhook-Zustellung (HMAC/Retry), persistente Idempotency | ✅ abgeschlossen |
| **Block 8** | **Portal-Ausbau & Delivery** — produktive Foto-Uploads (Storage-Abstraktion), Positionen mit optionaler Einzelfreigabe, automatische Reminder-Policy, realer E-Mail-Versand (SMS vorbereitet) | ✅ abgeschlossen |
| **Block 9** | **Qualitäts- & Betriebsreife** — Integrationstests + CI, Observability (Logging/Redaction/Monitoring-Seam/Readiness), Retention-/Cleanup-Jobs, A11y/UX-Polish | ✅ abgeschlossen |
| **Block 10** | **Onboarding & Self-Service-Aktivierung** — geführtes Onboarding, Einladungen + Passwort-Reset, Empty-States/Guidance, Aktivierungsmetrik | ✅ abgeschlossen |
| **Block 11** | **Billing- & Plan-Enforcement** — Pläne/Limits, Nutzungszählung, Limit-Hinweise/Upgrade-Pfade, Zahlungsanbieter-Adapter (Stripe) mit Dev-Fallback | ✅ abgeschlossen |
| **Block 12** | **Integrations- & API-Ökosystem** — API-Doku/DX, Self-Service-Webhooks, eingehende Integration (API-Key), Beispiel-Rezepte | ✅ abgeschlossen |
| **Block 13** | **Reporting- & Insights-Ausbau** — Kennzahlen/Trends, Zeitraum-Filter, CSV-Export, verständliches Dashboard | ✅ abgeschlossen |
| **Block 14** | **Benachrichtigungen & Kollaboration** — In-App-Benachrichtigungen, Fall-Zuweisung, interne Notizen, Notification-Center | ✅ abgeschlossen |
| **Block 15** | **Mandantenfähige Skalierung & Datenlebenszyklus** — Workspace-Verwaltung, DSGVO-Exporte/-Löschung, Aufbewahrung, Admin-Überblick | ✅ abgeschlossen |
| **Block 16** | **Barrierefreiheit, Lokalisierung & finaler Produktschliff** — WCAG-Feinschliff, Mehrsprachigkeit (Kundenseite de/fr/it), Leerzustände/Fehlerseiten, E2E-Politur | ✅ abgeschlossen |
| **Block 17** | **End-to-End-Tests & Release-Härtung** — Playwright-E2E der loginlosen Kundenpfade + axe-A11y-Smoke, eigener nicht-blockierender CI-Job | ✅ abgeschlossen |
| **Block 18** | **Deployment- & Launch-Härtung** — reproduzierbarer Prod-Start (API via tsx), Fail-fast-Config-Guard, Readiness-Smoke + gatender CI-Job | ✅ abgeschlossen |
| **Block 19** | **Containerisierung** — Multi-Stage-Dockerfiles (API/Web), docker-compose (db+migrate+api+web), nicht-blockierender CI-Image-Build | ✅ abgeschlossen |
| **Block 20** | **Container-Release-Pipeline & Container-Smoke** — SHA-getaggte Images, `container-smoke`-CI-Job (build→up→smoke→teardown), Registry-Push als TODO | ✅ abgeschlossen |
| **Block 21** | **Voice-Layer** — Sprach-Erfassung der Fallerstellung: Transkriptions-Adapter (mock/whisper), Draft-Parser, `POST /voice/transcribe`, Formular-Vorbefüllung | ✅ abgeschlossen |
| **Block 22** | **Voice-Ausbau** — dynamische Mehr-Positionen-UI im Fall-Formular, echter (deaktivierter) whisper-STT-Adapter | ✅ abgeschlossen |
| **Block 23** | **Release-Abschluss** — schlankes API-Runtime-Image (+ separates Migrate-Image), tag-getriggerter Release-Workflow mit optionalem Registry-Push | ✅ abgeschlossen |
| **Block 24** | **Produkt-Feinschliff** — Kategorie & Beschreibung pro Position im Fall-Formular + Kategorie-Label auf der Kundenseite, Voice-Kategorie-Heuristik | ✅ abgeschlossen |
| **Block 25** | **Reporting nach Kategorie** — `itemsByCategory`-Kennzahl, Kategorie-Verteilung in `GET /reporting/summary` + Web-Auswertung | ✅ abgeschlossen |
| **Block 26** | **Kategorie-Filter** — `GET /approval-cases?category=` (Relationsfilter) + Kategorie-Filterchips in der Freigaben-Liste | ✅ abgeschlossen |
| **Block 27** | **Listen-Filter** — `?urgency=` + `?createdWithin=` (Dringlichkeit/Zeitraum), kombinierbare Filterchips in der Freigaben-Liste | ✅ abgeschlossen |
| **Block 28** | **Gespeicherte Ansichten** — benannte Filterkombinationen (`/saved-views` CRUD, tenant-scoped) als Ein-Klick-Ansichten in der Freigaben-Liste | ✅ abgeschlossen |
| **Block 29** | **Private Ansichten & Standard-Ansicht** — SHARED/PRIVATE-Sichtbarkeit je Ansicht + persönliche Standard-Ansicht (pro Nutzer), die die Freigaben-Liste ohne Filter automatisch anwendet | ✅ abgeschlossen |
| **Block 30** | **Release-Abschluss & Härtung** — Go-Live-Checkliste (alle `TODO PROVIDER SETUP` gebündelt), leichter Security-/RBAC-Review, Config-Guard-Warnung für `localhost`-Base-URLs | ✅ abgeschlossen |
| **Block 31** | **Freier Datumsbereich** — `?createdFrom=`/`?createdTo=` (ISO-Datum) auf der Freigaben-Liste, hat Vorrang vor `?createdWithin=`; Datumsfelder in der Liste, in gespeicherten Ansichten mitspeicherbar | ✅ abgeschlossen |
| **Block 32** | **Ansichten umbenennen & sortieren** — gespeicherte Ansichten inline umbenennen (`PATCH /saved-views/:id`) und per manueller Reihenfolge sortieren (`POST /saved-views/reorder`, `sortOrder`); ◀▶/✎-Bedienelemente in der Freigaben-Liste | ✅ abgeschlossen |
| **Block 33** | **Ansichten duplizieren** — gespeicherte Ansicht als Kopie anlegen (`POST /saved-views/:id/duplicate`, übernimmt Filter + Sichtbarkeit, Name „… (Kopie)" mit Auto-Suffix); ⧉-Button in der Freigaben-Liste | ✅ abgeschlossen |
| **Block 34** | **Fall-Anzahl je Ansicht** — `GET /saved-views` liefert je Ansicht `matchCount` (passende Fälle) über die geteilte Fall-Filterlogik; Zähler-Badge am Ansichts-Chip in der Freigaben-Liste | ✅ abgeschlossen |
| **Block 35** | **„Keine Treffer"-Zustand** — eigener Empty-State bei aktiven Filtern/Ansichten mit 0 Fällen (Name der aktiven Ansicht + „Filter zurücksetzen"); leere Ansichts-Chips abgeschwächt | ✅ abgeschlossen |
| **Block 36** | **Aktive-Filter-Leiste** — kompakte Zusammenfassung der wirkenden Filter über der Liste, jeder Filter einzeln per ✕ entfernbar (Datumsbereich als ein Chip) + „Alle zurücksetzen" | ✅ abgeschlossen |
| **Block 37** | **Reporting-Drilldown** — Kennzahlen der Auswertung verlinken in die gefilterte Freigaben-Liste (Kategorie- und Status-Zeilen → `?category=`/`?status=` + `createdWithin`); aggregiertes „Wartet auf Kunde" bleibt Nicht-Link | ✅ abgeschlossen |
| **Block 38** | **Dashboard-Drilldown** — Kennzahl-Kacheln der Übersicht verlinken in die gefilterte Liste (Freigegeben/Abgelehnt → `?status=`); Aggregat-Kacheln (Wartet auf Kunde, Heute beantwortet) bleiben Nicht-Link | ✅ abgeschlossen |
| **Block 39** | **Rebrand → Klarwerk** — Produktname „Smart Approval Flow" → **Klarwerk** in allen user-sichtbaren Flächen (App, Marketing, Rechtstexte, Kundenseite, E-Mails, Metadaten, Logo K); technische Bezeichner (`@saf/*`, Header, Env) unverändert | ✅ abgeschlossen |
| **Block 40** | **CSV-Export der Freigaben-Liste** — `GET /approval-cases/export.csv` exportiert die gefilterte Fall-Liste (geteilte `caseFilterWhere`-Logik, gedeckelt) als CSV; „CSV-Export"-Button im Listenkopf über eine Same-Origin-Proxy-Route | ✅ abgeschlossen |
| **Block 41** | **Einheitliche Datums-/Zeitformatierung** — geteilter `formatDateTime`/`formatDate`-Helper (`de-CH`) im internen UI ersetzt drei kopierte Formatierer + zwei Inline-Aufrufe; Ablaufdaten im mittleren Datumsstil, Kundenseite (i18n) unverändert | ✅ abgeschlossen |
| **Block 42** | **Konsistente Leerzustände** — wiederverwendbare `EmptyState`-Komponente (Varianten `page`/`card`) ersetzt drei handgebaute Leerzustände (Freigaben-Liste, Dashboard, Benachrichtigungen); einheitliches Icon-/A11y-Handling | ✅ abgeschlossen |
| **Block 43** | **Reporting nach Dringlichkeit** — `casesByUrgency`-Kennzahl + `urgencies` in `GET /reporting/summary`, Web-Karte „Fälle nach Dringlichkeit" mit Drilldown (`?urgency=`) | ✅ abgeschlossen |
| **Block 44** | **Sortierung der Freigaben-Liste** — `?sort=newest\|oldest` auf `GET /approval-cases` (spiegelt Order + Keyset-Cursor korrekt), CSV-Export folgt der Sortierung; JS-freie „Neueste/Älteste zuerst"-Steuerung, `sort` überlebt Filterwechsel, ist aber kein Filter | ✅ abgeschlossen |
| **Block 45** | **Antwortzeit-Verteilung im Reporting** — `responseTimeBuckets` (4 Bins: <1h/1–24h/1–3d/>3d) + `responseBuckets` in `GET /reporting/summary`, Web-Balkenkarte „Antwortzeit-Verteilung" (Anteil je Bin, kein Drilldown) | ✅ abgeschlossen |
| **Block 46** | **Detailseiten-Politur** — Kontextzeile (Kunde · Fahrzeug · Kennzeichen) unter dem Titel, `EmptyState` für den leeren Verlauf, A11y-Rollen der Timeline (`list`/`listitem`); reine Präsentation | ✅ abgeschlossen |
| **Block 47** | **Marketing-Redesign („Wow"-Pass, Teil 1)** — eigenständige Typografie via `next/font` (Inter · Space Grotesk · Newsreader-Serif), committete Mint/Salbei-Markenpalette, überarbeiteter Hero (Serif-Subline, Akzent-Unterstreichung, Geräte-Mockup), scroll-getriebenes Storytelling (`ScrollStory`: gepinntes Phone + IntersectionObserver + Fortschritts-Punkte, `reduced-motion`/No-JS-Fallback), veredelte Feature-Karten; provider-frei, rein visuell | ✅ abgeschlossen |
| **Block 48** | **App-Redesign („Wow"-Pass, Teil 2)** — Display-Schrift auf App-Headings (verbindet Produkt + Marketing), Sidebar-Aktiv-Akzent, sticky Topbar mit Frosted-Backdrop, zurückhaltende Micro-Interactions (Button-Press, Card/Row-Hover), `reduced-motion`-Fallback; App behält bewusst ihre blaue Identität | ✅ abgeschlossen |
| **Block 49** | **App-Screens in der gehobenen Sprache** — geteilte „Stat-Tile"-Sprache (`.stat__value` in Display-Schrift) auf Dashboard + Reporting, farbige Ton-Streifen auf den Dashboard-Kacheln (`.stat-card--{tone}`); Inline-Styles entfernt, rein präsentativ | ✅ abgeschlossen |
| **Block 50** | **Rücklaufquote im Reporting** — neue, unit-getestete Pure-Function `responseRate` (beantwortet ÷ zugestellt; `EXPIRED` zählt als erreicht, `CALLBACK` als Reaktion) in `GET /reporting/summary` (`engagement`) + Web-KPI „Rücklaufquote"; komplementär zur bereits vorhandenen `approvalRate`; provider-frei | ✅ abgeschlossen |
| **Block 52** | **Deploy-Reife für Railway (Phase 1)** — API/Web hören auf `$PORT`, neue Dockerfile-`serve`-Stage (migrate + bootstrap + start), Healthchecks $PORT-fähig, env-gesteuertes idempotentes **Bootstrap** (erster Workspace + Owner-Login ohne Demo-Daten/CLI), Masterplan `launch-plan.md` + klick-genaue `deploy-railway.md`; provider-frei | ✅ abgeschlossen |
| **Block 51** | **Rebrand → Nicka** — Produktname **Klarwerk → Nicka** (von „nicken" = das schnelle Ja) in allen user-sichtbaren Flächen (App, Marketing, Rechtstexte, Kundenseite via `providedVia`, E-Mails, Metadaten, Logo K→N, CSV-Dateiname, OpenAPI), Slogan **„Ein Nicken genügt."** (Hero-Eyebrow), Domain → `nicka.ch`; technische Bezeichner (`@saf/*`, Header, Env-Keys) unverändert; historische Block-Summaries bleiben als Zeitdokument | ✅ abgeschlossen |

## Leitplanken über alle Blöcke

- MVP-Fokus halten, keine Feature-Explosion.
- Jede Erweiterung muss integrations- und multi-tenant-fähig bleiben.
- Kundenseite (loginlos, mobil, vertrauenswürdig) ist und bleibt Kernwert.
