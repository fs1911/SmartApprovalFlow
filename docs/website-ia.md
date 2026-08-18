# Website Information Architecture

Öffentlicher Marketing-Auftritt von Klarwerk.

## Platzierungsentscheidung

Der Marketing-Auftritt liegt **im bestehenden Next.js-Projekt** (`apps/web`) als
eigener Route-Group `(marketing)` — getrennt von der authentifizierten App
`(app)` und der loginlosen Kundenseite `/a/[token]`.

**Warum im selben Projekt statt separatem Repo/Site:**
- Ein Deploy, ein Design-System (`@saf/ui` Tokens), ein Betrieb — kein
  zusätzlicher Infrastruktur-Ballast (Blockvorgabe: kein Chaos).
- Klare Trennung über Route-Groups: eigenes Layout (Header/Footer) für Marketing,
  App-Shell bleibt unberührt.
- Nahtlose Übergänge „Anmelden“ → `/dashboard`, CTAs → `/demo`.
- SEO sauber steuerbar (`robots.ts` erlaubt Marketing, sperrt App + `/a/`).

## Seitenbaum

```
/                     Home — Positionierung, Nutzen, So funktioniert es, CTA
/product              Wie es funktioniert (ausführlich), Kundenseite, Team
/for-garages          Zielgruppe & Nutzen im Werkstattalltag (vorher/nachher)
/pricing              Starter / Pro / Multi-Group (Draft-Preise), Fairness-Block
/demo                 Demo & Kontakt — Formular (Placeholder), Early Access
/security             Sicherheit & Vertrauen (keine Fake-Signale)
/faq                  Einwandbehandlung
/legal/imprint        Impressum (Entwurf, TODO LEGAL REVIEW)
/legal/privacy        Datenschutzerklärung (Entwurf)
/legal/terms          Nutzungsbedingungen (Entwurf)
robots.txt, sitemap.xml   generiert (Next metadata routes)
```

Nicht öffentlich/indexiert: `/dashboard`, `/approvals`, `/members`,
`/reporting`, `/settings` (App) und `/a/[token]` (private Kundenlinks).

## Seitentypen & Zweck

| Typ | Seiten | Zweck |
| --- | --- | --- |
| Conversion-Landing | `/` | Erstkontakt → Demo/Pricing |
| Erklärung | `/product`, `/for-garages` | Verständnis + Relevanz |
| Entscheidung | `/pricing` | Paketwahl → CTA |
| Abschluss | `/demo` | Lead-Erfassung |
| Vertrauen | `/security`, `/faq` | Einwände entkräften |
| Recht | `/legal/*` | Pflicht + Seriosität |

## H1/H2 & interne Verlinkung

- Genau **eine H1** pro Seite, danach H2-Sektionen (Eyebrow als Kicker).
- Jede Marketingseite endet mit einem CTA-Block (`FinalCta`) → `/demo` + `/pricing`.
- Footer verlinkt Produkt-, Unternehmens- und Legal-Ebene global.
- Header-Nav: Produkt · Für Garagen · Preise · Sicherheit · FAQ + „Demo anfragen“.

## Content-Platzhalter (später)

- `/resources` oder `/blog` (SEO-Content, Case Studies) — Struktur später.
- Testimonials/Fallbeispiele: Platzhalter-Sektion, **keine erfundenen Signale**.
