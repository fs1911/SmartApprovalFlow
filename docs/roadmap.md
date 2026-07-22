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
| **Block 7** | **Auth- & Integrations-Härtung** — echte Auth (JWT + API-Keys/Scopes), Rate-Limiting, echte Webhook-Zustellung (HMAC/Retry), Idempotency persistent | geplant |
| **Block 8** | **Portal-Ausbau & Delivery** — realer E-Mail/SMS-Provider, automatische Reminder-Policy, Foto-Uploads produktiv, Positionen mit Einzelauswahl | geplant |
| **Block 6** | **Voice Layer** — Voice-Erfassung/-Rapportierung als Erweiterung der Fallerstellung | später |

## Leitplanken über alle Blöcke

- MVP-Fokus halten, keine Feature-Explosion.
- Jede Erweiterung muss integrations- und multi-tenant-fähig bleiben.
- Kundenseite (loginlos, mobil, vertrauenswürdig) ist und bleibt Kernwert.
