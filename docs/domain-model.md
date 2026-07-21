# Domain Model

Kanonische Quelle im Code: `packages/db/prisma/schema.prisma` (Struktur) und
`packages/types/src/enums.ts` (Status/Enums). Dieses Dokument erklärt das Modell.

## Zentrale Entities

| Entity | Beschreibung |
| --- | --- |
| **Tenant** | Workspace = eine Garage/Gruppe. Wurzel der Mandantentrennung. Trägt Locale/Währung/Branding (White-Label vorbereitet). |
| **User** | Person mit Zugang. Im MVP genau einem Tenant zugeordnet. |
| **Membership** | Verknüpft User↔Tenant mit **Role**. Explizit modelliert, damit Multi-Workspace später bruchfrei möglich ist. |
| **Customer** | Fahrzeughalter/Kunde der Garage. |
| **Vehicle** | Fahrzeug, optional einem Customer zugeordnet. |
| **ApprovalCase** | Der Freigabefall (der Wedge): Betreff, Beschreibung, Status, Dringlichkeit, Referenz. |
| **ApprovalItem** | Einzelne empfohlene Arbeit (a.k.a. WorkRecommendation) mit Preisband. |
| **ApprovalAccessLink** | Sicherer, loginloser Token (nur Hash gespeichert) mit Ablauf/Revoke. 1:1 zum Fall. |
| **ApprovalDecision** | Unveränderlicher Kundenentscheid (approve/decline/callback) inkl. Kontext. |
| **Attachment** | Foto/Datei; Bytes extern (Storage-Key), an Fall oder Item. |
| **AuditEvent** | Append-only Ereignis; revisionssicherer Verlauf inkl. loginloser Kundenaktionen. |
| **OutboundMessage** | Ausgehende Nachricht (E-Mail/SMS); Versand produktiv in Block 4. |
| **MessageTemplate** | Wiederverwendbare Vorlagen pro Tenant. |
| **ApiKey** | M2M-Schlüssel mit Scopes für Integrationen; aktiv ab Block 5. |

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
   │                        APPROVED · DECLINED · CALLBACK
   │
   └──(Werkstatt zieht zurück)─▶ CANCELLED
   (Ablauf des Fensters) ─────▶ EXPIRED
```

**Terminal** (kein weiterer Kundenentscheid erwartet): `APPROVED`, `DECLINED`,
`EXPIRED`, `CANCELLED`. `CALLBACK` ist bewusst **nicht** terminal — nach dem
Rückruf kann noch `APPROVED`/`DECLINED` folgen.

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

`CASE_CREATED`, `CASE_SENT` (Link erzeugt), `CASE_LINK_VIEWED`,
`CASE_APPROVED`, `CASE_DECLINED`, `CASE_CALLBACK_REQUESTED`, `CASE_EXPIRED`,
`CASE_CANCELLED`, sowie `MESSAGE_*`. Jeder Statuswechsel schreibt zusätzlich ein
`SYSTEM`-Event mit `metadata.action = "status_changed"` (from → to).

## Geld & Preisband

Preise als **Minor Units** (Rappen/Cents, `Int`) plus `currency` (ISO 4217,
Default CHF) — vermeidet Float-Rundungsfehler. Ein Item trägt `priceMinMinor`/
`priceMaxMinor`; die Kundenseite summiert zum Gesamt-Preisband.
