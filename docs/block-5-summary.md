# Block 5 — Summary (Öffentlicher kommerzieller Layer)

Baut auf Block 1–4 auf, ohne Architektur oder Kernflows umzubauen. Ziel: der
marktfähige, verkaufsfähige und rechtlich vorbereitete Produktauftritt.

## 1. Was in Block 5 gebaut wurde

### Marketing-Website (in `apps/web`, Route-Group `(marketing)`)
- **Seiten:** Home (`/`), Produkt (`/product`), Für Garagen (`/for-garages`),
  Preise (`/pricing`), Demo & Kontakt (`/demo`), Sicherheit (`/security`),
  FAQ (`/faq`), Legal (`/legal/imprint|privacy|terms`).
- Eigenes Marketing-Layout (Header/Footer), getrennt von App-Shell und
  Kundenseite. Design hell/ruhig/professionell auf den bestehenden Tokens.
- Zentrale Copy in `(marketing)/_content.ts` (Messaging = eine Quelle).

### Positionierung & Messaging
- Positionierungsformel, Hero (Headline/Subline), 5 Kernnutzen, 4 Schritte,
  FAQ/Einwandbehandlung, Kurz-Pitch für LinkedIn/E-Mail. Siehe
  `messaging-architecture.md`.

### Pricing
- Drei Stufen (Starter/Pro/Multi-Group) mit Zielkunde, Leistungen, Limits, CTA.
- Preise klar als **Draft/Pilotphase** markiert. Begründung in
  `pricing-rationale.md`.

### Legal & Trust
- Impressum, Datenschutz, Nutzungsbedingungen als **professionelle Entwürfe**
  mit `TODO LEGAL REVIEW` (DACH/Schweiz-Perspektive).
- Sicherheits-/Vertrauensseite ohne Fake-Signale.

### Conversion & GTM
- CTA-Flächen in Hero, Sektionen, Pricing, Header, Footer; jede Seite endet mit
  CTA. Demo-/Early-Access-Formular als sauberer Placeholder-Flow.
- Docs: `go-to-market-launch-plan.md`, `website-ia.md`, `conversion-strategy.md`.

### SEO/Meta
- Per-Page `metadata` (Title/Description/canonical/OG), `metadataBase`,
  generierte `robots.txt` (Marketing erlaubt; App + `/a/` gesperrt) und
  `sitemap.xml`. Saubere H1/H2-Hierarchie, interne Verlinkung.

### Billing-Vorbereitung (nur Doku, keine Integration)
- `billing-strategy.md`, `pricing-rationale.md`, `payment-provider-evaluation.md`.

## 2. Marketing-/Website-/Pricing-Entscheidungen

- **Marketing im selben Projekt** (Route-Group) statt separatem Repo/Site — ein
  Deploy, ein Design-System, kein Infra-Ballast (Begründung: `website-ia.md`).
- **Demo-first** statt Self-Service-Trial (passt zur Zielgruppe).
- **Draft-Pricing** transparent gekennzeichnet; Wert-basierte Preislogik.
- **Ehrliche Trust-Elemente**, keine erfundenen Testimonials/Logos/Zertifikate.

## 3. Vorbereitete Legal-Seiten

Impressum, Datenschutzerklärung, Nutzungsbedingungen — Entwürfe, überall
`TODO LEGAL REVIEW`, plus offene Punkte (Aufbewahrungsfristen, DPA, Cookie-/
Tracking-Konzept, Gerichtsstand).

## 4. Bewusst Placeholder geblieben

- Demo-/Kontaktformular ohne Backend-Versand (Bestätigung clientseitig).
- Keine echten Zahlungen, kein Checkout, keine Billing-Tabellen.
- Keine Analytics/Cookies (bewusst schlank in der Pilotphase).
- Testimonials/Case-Studies nur als Struktur, keine erfundenen Inhalte.
- Impressum-Stammdaten (Firma/UID/Adresse) als `TODO`.

## 5. Später anzubindende externe Dienste

- **Zahlungsanbieter** (Stripe/Paddle/…): `TODO PROVIDER DECISION`.
- **Inbound für Formulare** (Postfach/CRM/Resend).
- **Analytics** (mit Cookie-Konzept).
- **Legal-Finalisierung** durch Fachperson.
- **Hosting/Domain/E-Mail-Provider** — Thema von Block 6.

## 6. Nächster Block

**Block 6 — Infrastruktur, Hosting & Provider-Readiness:** Zielbild für
Hosting/Deployment, Rollen von Supabase/Cloudflare/Resend, Storage-/Attachment-
Strategie, Public-Link-/Token-/Domain-Strategie, ENV-/Secrets-/Deployment-Setup
und ein sauberes Dev/Staging/Production-Modell — vorbereitet, ohne sofortige
harte Live-Anbindung. Der vollständige Block-6-Prompt liegt dem Handoff bei.
