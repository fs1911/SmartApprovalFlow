# ADR-002: REST API Strategy

- **Status:** akzeptiert (Block 1), umgesetzt (Block 2)
- **Datum:** 2026-07

## Kontext

Das Produkt soll später in bestehende Garagensoftware integrierbar und als
White-Label/Partnerlösung denkbar sein. Die API darf also nicht nur „Backend
für die eigene UI" sein.

## Entscheidung

- **Dedizierte, versionierte REST-API** unter `/api/v1` als **Source of Truth**
  für alle Clients (eigene Web-App + spätere Integrationen).
- **OpenAPI aus dem Code** (`@fastify/swagger`), interaktiv unter `/docs`,
  exportierbar als `openapi.json`.
- **Konsistente JSON-Hüllen:** Erfolg `{ data, meta? }`, Fehler
  `{ error: { code, message, details?, requestId } }`.
- **REST-Konventionen:** Nomen-URLs, passende Statuscodes, `GET`/`POST`-Semantik.
- **Cursor-Pagination** (stabil bei Inserts) statt Offset.
- **Idempotency-Key** für kritische Writes (Fall erstellen, Kundenentscheid).
- **Zwei Auth-Wege, ein Kontext:** JWT (Nutzer) und API-Keys mit Scopes
  (Integrationen); Kundenseite loginlos über Token. Echte Umsetzung Block 5.
- **Versionsstrategie:** additive Änderungen in `v1`; Breaking → `v2`.

## Alternativen

- **API nur via Next.js Route Handlers:** weniger Prozesse, aber der
  Integrationsvertrag wäre an das Web-Rendering gekoppelt und weniger explizit.
- **GraphQL:** flexibel, aber für einen klaren, integrationsfreundlichen
  MVP-Vertrag mehr Komplexität als Nutzen.
- **Offset-Pagination:** einfacher, aber instabil bei gleichzeitigen Inserts.

## Konsequenzen

- Klarer, dokumentierter Vertrag; Partner können früh andocken.
- Web-App ist „nur ein Client" → sauberere Trennung.
- Etwas mehr Initialaufwand (eigener API-Prozess, Envelope, Fehlercodes),
  der sich mit der Integrationsstrategie auszahlt.
