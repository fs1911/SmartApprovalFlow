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

## Leitplanken über alle Blöcke

- MVP-Fokus halten, keine Feature-Explosion.
- Jede Erweiterung muss integrations- und multi-tenant-fähig bleiben.
- Kundenseite (loginlos, mobil, vertrauenswürdig) ist und bleibt Kernwert.
