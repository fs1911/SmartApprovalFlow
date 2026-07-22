# Public Link, Token & Domain Strategy

Konsolidiert die bestehende Token-Logik (Block 2/3) und beschreibt die
Domain-Strategie für Kundenlinks inkl. White-Label-Ausblick.

## Token-Logik (bereits umgesetzt)

- Kundenlink-Form: `{WEB_BASE_URL}/a/{token}`.
- Token = 256-bit URL-safe Zufallswert (`randomBytes(32).toString('base64url')`).
- Gespeichert wird **nur der SHA-256-Hash** (`ApprovalAccessLink.tokenHash`) —
  ein DB-Leak exponiert keine funktionierenden Links.
- **Ablauf** (`expiresAt`, Default 14 Tage) und **Revoke** (`revokedAt`);
  Lazy-Expiry setzt abgelaufene Fälle beim Zugriff auf `EXPIRED`.
- **Rotation:** jeder Versand/Reminder erzeugt einen frischen Token (der Hash
  kann nicht zurückgerechnet werden) → die jeweils neueste E-Mail trägt den
  gültigen Link.

## Domain-Strategie

### Standard (heute)
Eine Basisdomain für alle Tenants: `WEB_BASE_URL` global konfiguriert. Kundenlinks
laufen über diese Domain. Ausreichend für Pilot/Marktstart.

### White-Label / Custom-Domain (Ausblick)
Für Partner-/Gruppenkunden soll der Kundenlink unter **deren** Domain laufen
(z. B. `freigabe.muster-garage.ch`). Vorbereitung ohne jetzt zu bauen:

- Optionales Feld am Tenant (später): `publicBaseUrl` / `customDomain`.
- Link-Bau nutzt `tenant.publicBaseUrl ?? WEB_BASE_URL` (heute nur global).
- Domain-Verifikation + TLS über **Cloudflare** (Custom Hostnames / SaaS).
- DNS: `CNAME` der Tenant-Domain auf unseren Edge; Zertifikat automatisch.

**Reihenfolge:** erst globale Domain produktiv (Cloudflare DNS/TLS), dann
Per-Tenant-Custom-Domains, wenn White-Label nachgefragt wird. `TODO INFRA DECISION`.

## Domains im Zielbild

| Host | Zweck |
| --- | --- |
| `www.<domain>` / `<domain>` | Marketing-Website |
| `app.<domain>` | authentifizierte App |
| `api.<domain>` | REST-API |
| `<tenant-domain>` (optional) | White-Label-Kundenlinks |

## Sicherheit / SEO

- Kundenlinks sind privat und unguessbar → in `robots.txt` ist `/a/` gesperrt,
  keine Indexierung.
- Rate-Limiting/Abuse-Schutz für die Public-Endpoints: Block 7.
