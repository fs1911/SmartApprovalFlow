/**
 * Lightweight i18n for the loginless customer page (Block 16).
 *
 * Static, in-repo message catalogs (no translation API). `t` looks a key up in
 * the chosen locale, falls back to German, and interpolates `{var}` placeholders.
 * `resolveLocale` normalises a tenant locale / Accept-Language / ?lang into one
 * of the supported locales. Both are pure → unit-tested.
 *
 * The internal app stays German for now; this covers the customer-facing page,
 * which is the shared, public surface across the DACH/CH region.
 */

export const LOCALES = ['de', 'fr', 'it'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'de';

/** Message keys used by the customer page. */
export interface Messages {
  greeting: string;
  intro: string;
  yourVehicle: string;
  urgent: string;
  costLabel: string;
  costHint: string;
  approveAll: string;
  decideIndividually: string;
  requestCallback: string;
  declineAll: string;
  sending: string;
  decideEachHint: string;
  confirmSelection: string;
  back: string;
  approve: string;
  decline: string;
  phoneLabel: string;
  requestCallbackBtn: string;
  declineReasonLabel: string;
  declineBtn: string;
  unsureHint: string;
  validUntil: string;
  approvalRequest: string;
  successApprovedTitle: string;
  successApprovedBody: string;
  successPartialTitle: string;
  successPartialBody: string;
  successDeclinedTitle: string;
  successDeclinedBody: string;
  successCallbackTitle: string;
  successCallbackBody: string;
  trustSecure: string;
  trustNoLogin: string;
  trustDocumented: string;
  questions: string;
  providedVia: string;
  linkUnavailableTitle: string;
  expiredMsg: string;
  invalidMsg: string;
  contactWorkshop: string;
}

const de: Messages = {
  greeting: 'Guten Tag {name}',
  intro:
    'Bei der Kontrolle Ihres Fahrzeugs haben wir eine empfohlene Arbeit festgestellt. Bitte prüfen Sie kurz und geben Sie uns Bescheid – das dauert weniger als eine Minute.',
  yourVehicle: 'Ihr Fahrzeug: {vehicle}',
  urgent: 'Sicherheitsrelevant — bitte zeitnah entscheiden.',
  costLabel: 'Voraussichtliche Kosten',
  costHint: 'Richtpreis inkl. Teile & Arbeit. Endbetrag kann leicht abweichen.',
  approveAll: '✓ Alle Arbeiten freigeben',
  decideIndividually: 'Einzeln entscheiden',
  requestCallback: '📞 Rückruf wünschen',
  declineAll: 'Alles ablehnen',
  sending: 'Wird gesendet…',
  decideEachHint: 'Entscheiden Sie für jede Position einzeln:',
  confirmSelection: 'Auswahl bestätigen',
  back: 'Zurück',
  approve: 'Freigeben',
  decline: 'Ablehnen',
  phoneLabel: 'Ihre Telefonnummer (optional)',
  requestCallbackBtn: 'Rückruf anfordern',
  declineReasonLabel: 'Möchten Sie uns kurz mitteilen, warum? (optional)',
  declineBtn: 'Arbeiten ablehnen',
  unsureHint: 'Unsicher? Wählen Sie „Rückruf wünschen“ – wir beraten Sie gerne persönlich.',
  validUntil: 'Dieser Link ist bis zum {date} gültig.',
  approvalRequest: 'Freigabeanfrage',
  successApprovedTitle: 'Vielen Dank — freigegeben!',
  successApprovedBody:
    'Wir haben Ihre Freigabe erhalten und starten mit den Arbeiten. Sie hören von uns.',
  successPartialTitle: 'Vielen Dank — Auswahl erhalten!',
  successPartialBody:
    'Wir haben Ihre Auswahl erhalten und führen die freigegebenen Arbeiten aus. Sie hören von uns.',
  successDeclinedTitle: 'Antwort erhalten',
  successDeclinedBody: 'Sie haben die Arbeiten abgelehnt. Ihre Werkstatt wurde informiert.',
  successCallbackTitle: 'Rückruf angefragt',
  successCallbackBody: 'Ihre Werkstatt wird sich in Kürze bei Ihnen melden.',
  trustSecure: '🔒 Sichere Verbindung',
  trustNoLogin: '✓ Kein Login nötig',
  trustDocumented: '📄 Dokumentiert',
  questions: 'Fragen? Kontaktieren Sie {name}',
  providedVia: 'Bereitgestellt über Nicka',
  linkUnavailableTitle: 'Link nicht verfügbar',
  expiredMsg: 'Dieser Link ist abgelaufen. Bitte kontaktieren Sie Ihre Werkstatt.',
  invalidMsg: 'Dieser Link ist ungültig oder wurde bereits zurückgezogen.',
  contactWorkshop:
    'Bitte wenden Sie sich direkt an Ihre Werkstatt – gerne stellen wir Ihnen einen neuen Link aus.',
};

const fr: Messages = {
  greeting: 'Bonjour {name}',
  intro:
    'Lors du contrôle de votre véhicule, nous avons constaté un travail recommandé. Merci de vérifier brièvement et de nous répondre – cela prend moins d’une minute.',
  yourVehicle: 'Votre véhicule : {vehicle}',
  urgent: 'Sécurité concernée — merci de décider rapidement.',
  costLabel: 'Coûts prévus',
  costHint: 'Prix indicatif, pièces et main-d’œuvre comprises. Le montant final peut légèrement varier.',
  approveAll: '✓ Approuver tous les travaux',
  decideIndividually: 'Décider individuellement',
  requestCallback: '📞 Demander un rappel',
  declineAll: 'Tout refuser',
  sending: 'Envoi en cours…',
  decideEachHint: 'Décidez pour chaque position :',
  confirmSelection: 'Confirmer la sélection',
  back: 'Retour',
  approve: 'Approuver',
  decline: 'Refuser',
  phoneLabel: 'Votre numéro de téléphone (facultatif)',
  requestCallbackBtn: 'Demander un rappel',
  declineReasonLabel: 'Souhaitez-vous nous en indiquer brièvement la raison ? (facultatif)',
  declineBtn: 'Refuser les travaux',
  unsureHint: 'Vous hésitez ? Choisissez « Demander un rappel » – nous vous conseillons volontiers.',
  validUntil: 'Ce lien est valable jusqu’au {date}.',
  approvalRequest: 'Demande d’approbation',
  successApprovedTitle: 'Merci — approuvé !',
  successApprovedBody:
    'Nous avons reçu votre approbation et commençons les travaux. Nous vous tiendrons informé.',
  successPartialTitle: 'Merci — sélection reçue !',
  successPartialBody:
    'Nous avons reçu votre sélection et effectuons les travaux approuvés. Nous vous tiendrons informé.',
  successDeclinedTitle: 'Réponse reçue',
  successDeclinedBody: 'Vous avez refusé les travaux. Votre garage a été informé.',
  successCallbackTitle: 'Rappel demandé',
  successCallbackBody: 'Votre garage vous contactera sous peu.',
  trustSecure: '🔒 Connexion sécurisée',
  trustNoLogin: '✓ Sans connexion',
  trustDocumented: '📄 Documenté',
  questions: 'Des questions ? Contactez {name}',
  providedVia: 'Fourni via Nicka',
  linkUnavailableTitle: 'Lien indisponible',
  expiredMsg: 'Ce lien a expiré. Veuillez contacter votre garage.',
  invalidMsg: 'Ce lien est invalide ou a déjà été retiré.',
  contactWorkshop:
    'Veuillez vous adresser directement à votre garage – nous vous établirons volontiers un nouveau lien.',
};

const it: Messages = {
  greeting: 'Buongiorno {name}',
  intro:
    'Durante il controllo del suo veicolo abbiamo riscontrato un lavoro consigliato. La preghiamo di verificare brevemente e di darci un riscontro – richiede meno di un minuto.',
  yourVehicle: 'Il suo veicolo: {vehicle}',
  urgent: 'Rilevante per la sicurezza — decida tempestivamente.',
  costLabel: 'Costi previsti',
  costHint: 'Prezzo indicativo, ricambi e manodopera inclusi. L’importo finale può variare leggermente.',
  approveAll: '✓ Approva tutti i lavori',
  decideIndividually: 'Decidi singolarmente',
  requestCallback: '📞 Richiedi una richiamata',
  declineAll: 'Rifiuta tutto',
  sending: 'Invio in corso…',
  decideEachHint: 'Decida per ogni voce:',
  confirmSelection: 'Conferma la selezione',
  back: 'Indietro',
  approve: 'Approva',
  decline: 'Rifiuta',
  phoneLabel: 'Il suo numero di telefono (facoltativo)',
  requestCallbackBtn: 'Richiedi una richiamata',
  declineReasonLabel: 'Desidera indicarci brevemente il motivo? (facoltativo)',
  declineBtn: 'Rifiuta i lavori',
  unsureHint: 'Ha dei dubbi? Scelga « Richiedi una richiamata » – la consigliamo volentieri.',
  validUntil: 'Questo link è valido fino al {date}.',
  approvalRequest: 'Richiesta di approvazione',
  successApprovedTitle: 'Grazie — approvato!',
  successApprovedBody:
    'Abbiamo ricevuto la sua approvazione e iniziamo i lavori. La terremo informata.',
  successPartialTitle: 'Grazie — selezione ricevuta!',
  successPartialBody:
    'Abbiamo ricevuto la sua selezione ed eseguiamo i lavori approvati. La terremo informata.',
  successDeclinedTitle: 'Risposta ricevuta',
  successDeclinedBody: 'Ha rifiutato i lavori. La sua officina è stata informata.',
  successCallbackTitle: 'Richiamata richiesta',
  successCallbackBody: 'La sua officina la contatterà a breve.',
  trustSecure: '🔒 Connessione sicura',
  trustNoLogin: '✓ Senza login',
  trustDocumented: '📄 Documentato',
  questions: 'Domande? Contatti {name}',
  providedVia: 'Fornito tramite Nicka',
  linkUnavailableTitle: 'Link non disponibile',
  expiredMsg: 'Questo link è scaduto. La preghiamo di contattare la sua officina.',
  invalidMsg: 'Questo link non è valido o è già stato revocato.',
  contactWorkshop:
    'La preghiamo di rivolgersi direttamente alla sua officina – le rilasceremo volentieri un nuovo link.',
};

export const MESSAGES: Record<Locale, Messages> = { de, fr, it };

/** Is this string one of the supported locales? */
export function isLocale(x: string): x is Locale {
  return (LOCALES as readonly string[]).includes(x);
}

/**
 * Resolve a preference into a supported locale. Accepts a tenant locale
 * ("de-CH"), an Accept-Language list ("fr-CH,fr;q=0.9,de;q=0.8"), a bare code,
 * or undefined. Falls back to German.
 */
export function resolveLocale(...prefs: (string | null | undefined)[]): Locale {
  for (const pref of prefs) {
    if (!pref) continue;
    // Split Accept-Language style lists and strip q-weights + region subtags.
    for (const part of pref.split(',')) {
      const code = part.split(';')[0]!.trim().toLowerCase().split('-')[0]!;
      if (isLocale(code)) return code;
    }
  }
  return DEFAULT_LOCALE;
}

/** Translate a key, with fallback to German and `{var}` interpolation. */
export function t(locale: Locale | string, key: keyof Messages, vars?: Record<string, string | number>): string {
  const loc: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const template = MESSAGES[loc][key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? String(key);
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}
