# Payment Provider Evaluation

Entscheidungsgrundlage für die spätere Anbieterwahl. **Noch keine Integration.**
Kontext: B2B-SaaS-Subscriptions, Schweiz/DACH, CHF, MwSt, geringe Komplexität
gewünscht.

## Kriterien

| Kriterium | Warum wichtig |
| --- | --- |
| CHF + Schweizer MwSt / QR-Rechnung | Primärmarkt Schweiz |
| Subscriptions + Proration | Upgrade/Downgrade sauber |
| Hosted Checkout & Invoices | wenig PCI-/UI-Aufwand |
| Webhooks | Zustandssync ins Produkt |
| Tax-Handling (EU/CH) | Expansion DACH |
| DX / Doku / Test-Modus | schnelle, saubere Integration |
| Kosten | Marge im KMU-Preis |

## Kandidaten (Kurzbewertung)

### Stripe
- **+** Beste DX/Doku, Billing + Tax + Hosted Invoices/Checkout, Proration,
  starke Webhooks, Test-Modus.
- **−** CH-QR-Rechnung nicht nativ; Gebühren.
- **Fazit:** Standard-Default für schnelle, saubere Umsetzung.

### Paddle (Merchant of Record)
- **+** MoR übernimmt Steuern/Compliance global; weniger eigener Aufwand.
- **−** Weniger Kontrolle, Auszahlungszyklen, weniger CH-spezifisch.
- **Fazit:** attraktiv bei internationaler Expansion / minimalem Steueraufwand.

### Lokale/CH-Optionen (z. B. Payrexx, Stripe+CH-Rechnung)
- **+** CH-QR-Rechnung, lokale Zahlarten.
- **−** Subscription-/Proration-Reife, DX variabel.
- **Fazit:** relevant, wenn QR-Rechnung/lokale Zahlarten Pflicht werden.

## Empfehlung (vorläufig)

**Stripe Billing** als Start (Hosted Checkout + Customer Portal + Webhooks) —
schnellster, sauberster Weg mit gutem Test-Modus; CH-Rechnungsspezifika
(QR-Rechnung) separat prüfen. Bei starkem internationalem Fokus **Paddle** als
MoR-Alternative. **Endgültige Wahl: TODO PROVIDER DECISION** (Block 6+), nach
Klärung von QR-Rechnungspflicht und Zielmärkten.

## Integrationsskizze (später)

1. Produkt-Preise/Pläne beim Provider anlegen (Mapping zu `plan`).
2. Checkout/Portal-Links pro Workspace.
3. Webhook-Endpoint (eingehend) → `billingStatus`/`currentPeriodEnd` setzen.
4. Feature-Gating anhand `plan`/`billingStatus`.
5. Test-Modus in Dev/Staging, echte Keys nur in Production (siehe künftige
   ENV-/Secrets-Strategie, Block 6).
