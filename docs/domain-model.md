# Domain Model

Kanonische Quelle im Code: `packages/db/prisma/schema.prisma` (Struktur) und
`packages/types/src/enums.ts` (Status/Enums). Dieses Dokument erklärt das Modell.

## Zentrale Entities

| Entity | Beschreibung |
| --- | --- |
| **Tenant** | Workspace = eine Garage/Gruppe. Wurzel der Mandantentrennung. Trägt Locale/Währung sowie White-Label-Branding: `brandName`, `brandColor`, `contactEmail`, `contactPhone` (auf der Kundenseite genutzt). |
| **User** | Person mit Zugang. Im MVP genau einem Tenant zugeordnet. |
| **Membership** | Verknüpft User↔Tenant mit **Role** (`OWNER`, `ADMIN`, `SERVICE_ADVISOR`=Advisor, `TECHNICIAN`, `VIEWER`). Rollen sind **tenant-scoped**; die Permission-Matrix liegt in `@saf/types`. Siehe `decisions/adr-004`. |
| **Customer** | Fahrzeughalter/Kunde der Garage. |
| **Vehicle** | Fahrzeug, optional einem Customer zugeordnet. |
| **ApprovalCase** | Der Freigabefall (der Wedge): Betreff, Beschreibung, Status, Dringlichkeit, Referenz. |
| **ApprovalItem** | Einzelne empfohlene Arbeit (a.k.a. WorkRecommendation) mit Preisband. |
| **ApprovalAccessLink** | Sicherer, loginloser Token (nur Hash gespeichert) mit Ablauf/Revoke. 1:1 zum Fall. |
| **ApprovalDecision** | Unveränderlicher Kundenentscheid (approve/decline/callback) inkl. Kontext. |
| **Attachment** | Foto/Datei; Bytes extern (Storage-Key), an Fall oder Item. |
| **AuditEvent** | Append-only Ereignis; revisionssicherer Verlauf inkl. loginloser Kundenaktionen. |
| **OutboundMessage** | Ausgehende Nachricht (E-Mail/SMS) mit Status QUEUED→SENT/FAILED; E-Mail-Versand aktiv seit Block 3. |
| **MessageTemplate** | Wiederverwendbare Vorlagen pro Tenant (`{{placeholder}}`). |
| **WebhookEndpoint** | Registrierter Webhook-Empfänger (URL, Secret, Event-Allowlist, aktiv/inaktiv); Zustellung Block 5. |
| **WebhookDelivery** | Einzelne (geplante) Webhook-Zustellung mit Payload/Status; realer HTTP-Call in Block 5. |
| **VerificationToken** | Einmaliger, gehashter, ablaufender Token für Einladung (`INVITE`) und Passwort-Reset (`PASSWORD_RESET`) — Block 10. |
| **ApiKey** | M2M-Schlüssel mit Scopes für Integrationen; aktiv ab Block 5. |

### ApprovalCase — Zeitstempel & Zähler (Block 3)

`sentAt` (erstmals gesendet), `openedAt` (Kunde hat Link erstmals geöffnet),
`lastReminderAt` + `reminderCount` (Erinnerungen), `respondedAt` (finaler
Entscheid), `expiresAt` (Ablauf des Fensters, treibt Lazy-Expiry → `EXPIRED`).

## Wichtige Beziehungen

- `Tenant 1—* User, Membership, Customer, Vehicle, ApprovalCase, Attachment, AuditEvent, OutboundMessage, ApiKey, MessageTemplate`
- `ApprovalCase *—1 Customer`, `*—1 Vehicle`, `*—1 User (createdBy)`
- `ApprovalCase 1—* ApprovalItem`, `1—* ApprovalDecision`, `1—* AuditEvent`, `1—* Attachment`
- `ApprovalCase 1—1 ApprovalAccessLink`
- `ApprovalItem 1—* Attachment`

Fast alle Zeilen tragen `tenantId` für die Isolation (siehe adr-003).

## Statusmodell ApprovalCase

```
DRAFT ──(Link erzeugt)──▶ SENT ──(Kunde öffnet)──▶ VIEWED
   │                        │                         │
   │                        └───────────┬─────────────┘
   │                                     ▼
   │            APPROVED · PARTIALLY_APPROVED · DECLINED · CALLBACK
   │
   └──(Werkstatt zieht zurück)─▶ CANCELLED
   (Ablauf des Fensters) ─────▶ EXPIRED
```

**Terminal** (kein weiterer Kundenentscheid erwartet): `APPROVED`,
`PARTIALLY_APPROVED`, `DECLINED`, `EXPIRED`, `CANCELLED`. `CALLBACK` ist bewusst
**nicht** terminal — nach dem Rückruf kann noch `APPROVED`/`DECLINED` folgen.

### Einzelfreigabe pro Position (Block 8)

Neben dem „ganzer Fall"-Entscheid kann der Kunde optional **jede Position einzeln**
freigeben oder ablehnen (`POST /public/approvals/:token/respond-items`). Der
Fallstatus wird dann server-seitig aggregiert (reine, getestete Funktion
`aggregateItemDecisions`):

| Positions-Entscheide | Fallstatus |
| --- | --- |
| alle `APPROVE` | `APPROVED` |
| alle `DECLINE` | `DECLINED` |
| gemischt `APPROVE`/`DECLINE` | `PARTIALLY_APPROVED` |
| mindestens ein `CALLBACK` | `CALLBACK` (nicht terminal) |

Jede Position hält ihren Entscheid in `ApprovalItem.decision`/`decidedAt`; jeder
Einzelentscheid erzeugt einen `ApprovalDecision` (mit `approvalItemId`) und ein
`CASE_ITEM_DECIDED`-Audit-Event. `Attachment` verweist optional auf eine Position
(`approvalItemId`); Fotos werden zweistufig hochgeladen und erst nach Byte-Empfang
(`uploadedAt`) angezeigt — siehe `docs/storage-strategy.md`.

### Mapping zu den in Block 2 gewünschten Statusnamen

| Fachlicher Name (Prompt) | Enum im Code |
| --- | --- |
| `draft` | `DRAFT` |
| `pending_customer` | `SENT` / `VIEWED` |
| `approved` | `APPROVED` |
| `declined` | `DECLINED` |
| `callback_requested` | `CALLBACK` |
| `expired` | `EXPIRED` |

Zusätzlich `CANCELLED` für den von der Garage zurückgezogenen Fall.

## Audit-Event-Typen (Auszug)

`CASE_CREATED`, `CASE_SENT`, `CASE_REMINDER_SENT`, `CASE_LINK_VIEWED`,
`CASE_APPROVED`, `CASE_PARTIALLY_APPROVED`, `CASE_DECLINED`,
`CASE_CALLBACK_REQUESTED`, `CASE_EXPIRED`, `CASE_CANCELLED`, `CASE_ITEM_DECIDED`,
`CASE_ATTACHMENT_ADDED`, sowie `MESSAGE_*`. Jeder Statuswechsel schreibt zusätzlich
ein `SYSTEM`-Event mit `metadata.action = "status_changed"` (from → to).

**Audit vs. Domain-Events:** Der `AuditEvent` ist der *interne, revisionssichere*
Nachweis. Davon getrennt gibt es *externe* Domain-Events (`DomainEventType`,
z. B. `approval_case.approved`) als Integrationsvertrag, die über
`WebhookEndpoint`/`WebhookDelivery` zugestellt werden (siehe `api-design.md`).

## Geld & Preisband

Preise als **Minor Units** (Rappen/Cents, `Int`) plus `currency` (ISO 4217,
Default CHF) — vermeidet Float-Rundungsfehler. Ein Item trägt `priceMinMinor`/
`priceMaxMinor`; die Kundenseite summiert zum Gesamt-Preisband.
