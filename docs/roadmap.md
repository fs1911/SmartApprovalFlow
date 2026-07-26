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
| **Block 14** | **Benachrichtigungen & Kollaboration** — Aktivitäts-Feed, Fall-Zuweisung, interne Notizen, Notification-Center | geplant |
| **Später** | **Voice Layer** — Voice-Erfassung/-Rapportierung als Erweiterung der Fallerstellung | später |

## Leitplanken über alle Blöcke

- MVP-Fokus halten, keine Feature-Explosion.
- Jede Erweiterung muss integrations- und multi-tenant-fähig bleiben.
- Kundenseite (loginlos, mobil, vertrauenswürdig) ist und bleibt Kernwert.
