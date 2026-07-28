# Internationalisierung & Lokalisierung (Block 16)

Die **loginlose Kundenseite** ist die einzige öffentliche, geteilte Oberfläche –
und im DACH/CH-Raum trifft sie auf Deutsch, Französisch und Italienisch. Block 16
gibt ihr eine schlanke, statische i18n-Grundlage, ohne eine Übersetzungs-
Infrastruktur oder externe Dienste einzuführen.

Die **interne App** (Dashboard, Einstellungen, Team …) bleiben bewusst auf
Deutsch. Sie ist B2B, hat eine gelernte Nutzerschaft und rechtfertigt (noch)
keinen Mehrsprachigkeits-Aufwand.

## Was mehrsprachig ist

- Die Kundenseite unter `/a/[token]` (`apps/web/app/a/[token]/page.tsx`) inkl.
  Aktions-Panel (`_actions-panel.tsx`) und der Fehler-/„Link nicht verfügbar"-
  Zustand.

## Bausteine

Alles lebt in **`packages/ui/src/i18n.ts`** (rein, ohne React, server-safe) und
wird über `@saf/ui` exportiert:

| Export | Zweck |
| --- | --- |
| `LOCALES` (`['de','fr','it']`), `Locale`, `DEFAULT_LOCALE` (`'de'`) | Unterstützte Sprachen |
| `Messages` | Interface aller Nachrichten-Keys der Kundenseite |
| `MESSAGES` | `Record<Locale, Messages>` – die Kataloge (de/fr/it) |
| `isLocale(x)` | Type-Guard |
| `resolveLocale(...prefs)` | Präferenzen → unterstützte Sprache, Fallback Deutsch |
| `t(locale, key, vars?)` | Übersetzung mit Fallback-Kette + `{var}`-Interpolation |

### `resolveLocale(...prefs)`

Nimmt beliebig viele Präferenzen in Prioritätsreihenfolge und liefert die erste,
die passt – sonst Deutsch. Verarbeitet:

- reine Codes (`'fr'`),
- Regions-Subtags (`'fr-CH'` → `fr`),
- Accept-Language-Listen mit q-Gewichten (`'fr-CH,fr;q=0.9,de;q=0.8'` → `fr`),
- `null`/`undefined` (werden übersprungen).

Die Kundenseite ruft `resolveLocale(searchParams.lang, workspace.locale)` auf:
**ein expliziter `?lang=` in der URL gewinnt**, danach die im Tenant hinterlegte
`locale`, zuletzt der sichere Default Deutsch. Damit kann eine Werkstatt ihre
Standardsprache im Workspace setzen und trotzdem pro Link (`?lang=fr`) abweichen.

### `t(locale, key, vars?)`

Schlägt den Key in der gewählten Sprache nach, fällt bei Lücken auf Deutsch und
zuletzt auf den Key-Namen zurück, und interpoliert `{name}`-Platzhalter. Unbekannte
Platzhalter bleiben unverändert stehen (defensive, nie „undefined" im Text).

```ts
t('fr', 'greeting', { name: 'Frau Meier' }); // "Bonjour Frau Meier"
t('de', 'costLabel');                          // "Voraussichtliche Kosten"
```

## Datenfluss der Sprache

```
Tenant.locale  ─┐
                ├─►  GET /public/approvals/:token  ─►  workspace.locale
?lang= (URL)   ─┘                                          │
                                                           ▼
                                   resolveLocale(?lang, workspace.locale) → Locale
                                                           │
                                                           ▼
                                        t(locale, …) rendert die Kundenseite
                                        <div lang={locale}> setzt das HTML-Attribut
```

Die API (`toPublicView` in `apps/api/src/routes/v1/public.ts`) gibt `tenant.locale`
als `workspace.locale` mit aus – sonst nichts Neues.

## Eine Sprache hinzufügen

1. `LOCALES` in `packages/ui/src/i18n.ts` erweitern.
2. Einen vollständigen `Messages`-Katalog ergänzen und in `MESSAGES` eintragen –
   TypeScript erzwingt Vollständigkeit, der Unit-Test prüft zusätzlich, dass kein
   Key leer ist.
3. Für Datums-Formatierung in `page.tsx` das passende `Intl`-Locale ergänzen
   (`localeDate`).

## Tests

`apps/api/src/lib/i18n.test.ts` deckt `resolveLocale` (Region-Subtags, Accept-
Language, Query-vor-Tenant-Priorität, Fallback), `t` (Interpolation, Fallback-
Kette, unbekannte Sprache) und die Vollständigkeit aller Kataloge ab.

## Bewusst nicht enthalten

- Keine Übersetzungs-API / kein TMS, keine Laufzeit-Sprachdateien – die Kataloge
  liegen versioniert im Repo.
- Keine Lokalisierung der internen App und der Marketing-Seiten (Deutsch).
- Keine automatische Browser-Sprach-Erkennung im Client; die Auflösung passiert
  serverseitig aus Tenant-`locale`/`?lang`. (`Accept-Language` wird von
  `resolveLocale` unterstützt und kann später leicht angebunden werden.)
