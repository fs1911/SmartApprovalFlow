# Billing Strategy

Vorbereitung der Abrechnung **ohne** echte Zahlungsanbieter-Integration in
Block 5. Ziel: Wenn später ein Anbieter gewählt wird, steht die Produkt- und
Entscheidungslogik bereits. Anbieterauswahl: siehe
`payment-provider-evaluation.md`.

## Modell

- **Subscription pro Workspace** (Tenant), Stufen Starter/Pro/Group.
- **Abrechnungsintervall:** monatlich oder jährlich (Rabatt).
- **Setup-Fee:** optional einmalig für Pro/Group. <span>TODO PROVIDER DECISION</span>
- **Trial vs. Demo-first:** in der Pilotphase **Demo-first** (persönlicher
  Kontakt, Early Access) statt Self-Service-Trial. Self-Service-Trial später.

## Subscription-Zustände (Produktlogik)

Diese Zustände braucht das Produkt später am Tenant (heute noch nicht gebaut):

```
trialing  → active  → past_due → canceled
                   ↘ paused (optional)
active/past_due → (Zahlung ok) → active
past_due (Frist abgelaufen) → suspended → canceled
```

- **active:** voller Funktionsumfang.
- **past_due:** Zahlung fehlgeschlagen, Kulanzfrist, Hinweise im UI.
- **suspended:** Schreibaktionen gesperrt, Lesen/Export bleibt möglich.
- **canceled:** Ende der Laufzeit, Datenexport-Fenster.

Vorgesehene Felder am Tenant (Block 6+): `plan`, `billingStatus`,
`currentPeriodEnd`, `trialEndsAt`, `externalCustomerId`, `externalSubscriptionId`.

## Upgrade / Downgrade / Kündigung

- **Upgrade:** sofort wirksam, anteilige Verrechnung (Proration) über Provider.
- **Downgrade:** zum Periodenende; Feature-Gates greifen ab neuem Zeitraum.
- **Kündigung:** zum Periodenende; Datenexport + Löschfrist gemäss Terms.

## Rechnung / Zahlungsstatus

Rechnungsstellung und Belege übernimmt der spätere Provider (Hosted Invoices).
Das Produkt speichert nur Referenz-IDs + abgeleiteten `billingStatus`, keine
Kartendaten (PCI-Scope beim Provider).

## Benötigte Webhook-Ereignisse (später)

Vom Provider zu verarbeiten (Namensgebung provider-neutral):
`subscription.created/updated/canceled`, `invoice.paid`,
`invoice.payment_failed`, `trial.will_end`, `customer.updated`.
→ setzen `billingStatus`/`currentPeriodEnd` am Tenant. Diese Struktur passt zur
bereits vorhandenen Webhook-Grundlage aus Block 3 (`WebhookEndpoint`/
`WebhookDelivery`) — allerdings **eingehend** (Provider → uns) statt ausgehend.

## Bewusst noch nicht gebaut

- Keine Checkout-Seite, kein Provider-SDK, keine echten Zahlungen.
- Keine Billing-Tabellen am Datenmodell (folgt mit der Anbieterwahl in Block 6+).
