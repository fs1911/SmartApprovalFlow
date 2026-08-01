/**
 * Turn a dictated transcript into a structured draft that pre-fills the
 * create-case form (Block 21). Pure + deterministic → unit-tested.
 *
 * This is deliberately a lightweight heuristic parser, not an LLM: it is
 * advisory only. The mechanic reviews and edits every field, and the real
 * `createApprovalCaseSchema` still validates on submit. The goal is to save
 * typing, not to be perfect.
 *
 * Tuned for German (de-CH) workshop dictation, e.g.
 *   "Bremsbeläge hinten ersetzen, kostet zwischen 180 und 240 Franken.
 *    Außerdem Ölwechsel für 120 CHF. Das ist dringend."
 */
import type { VoiceDraft, VoiceDraftItem } from '@saf/types';
import type { ItemCategory, Urgency } from '@saf/types';

export interface ParsedPrice {
  minMinor: number;
  maxMinor: number;
  /** The character range in the segment the price occupied (to strip it out). */
  matchStart: number;
  matchEnd: number;
}

const CURRENCY = 'CHF';

// Words that commonly precede the actual recommendation and add no value to a
// position title. Stripped from the start of a segment.
const LEADING_FILLER =
  /^(?:also|und|ähm|äh|so|dann|bitte|wir (?:müssen|sollten|empfehlen)|man (?:müsste|sollte)|ich (?:empfehle|würde empfehlen)|empfohlen|empfehlung|außerdem|zudem|des weiteren|weiter(?:hin)?|danach|noch|ausserdem)[\s:,-]+/i;

// Pure filler segments we drop entirely.
const NOISE_SEGMENT = /^(?:guten tag|hallo|also|ähm|äh|ok(?:ay)?|so|ja|das (?:ist|wär)s?)\b[\s.!]*$/i;

// Segments that are a priority/urgency remark rather than a task — captured by
// detectUrgency, so they must not become a position title.
const META_STATEMENT =
  /^(?:das|es)\s+(?:ist|eilt|wäre|war)\b|^(?:sehr\s+)?(?:dringend|eilt|sicherheitsrelevant|unkritisch)\b|^(?:bitte\s+)?(?:zeitnah|bald|irgendwann)\b/i;

/** Normalise a number token: strip Swiss thousands separators, comma → dot. */
function toMinor(numeric: string): number {
  const cleaned = numeric.replace(/['’\s]/g, '').replace(',', '.');
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

const NUM = "\\d[\\d'’\\s]*(?:[.,]\\d{1,2})?";
const CUR = '(?:chf|franken|fr\\.?|rappen|\\.-|–\\s*)';

/**
 * Extract a price (single or range) from a segment. A number only counts as a
 * price when a currency token or a price cue word is nearby — so "2 Schrauben"
 * is not misread as CHF 2.
 */
export function extractPrice(segment: string): ParsedPrice | null {
  // Range: "zwischen 180 und 240 Franken", "180 bis 240 CHF", "180–240.-"
  const range = new RegExp(
    `(?:zwischen\\s+)?(${NUM})\\s*(?:bis|und|-|–|—)\\s*(${NUM})\\s*${CUR}`,
    'i',
  );
  const rm = range.exec(segment);
  if (rm) {
    const a = toMinor(rm[1]!);
    const b = toMinor(rm[2]!);
    return {
      minMinor: Math.min(a, b),
      maxMinor: Math.max(a, b),
      matchStart: rm.index,
      matchEnd: rm.index + rm[0].length,
    };
  }

  // Single with currency AFTER the number: "120 Franken", "120.-", "89 CHF".
  const post = new RegExp(`(${NUM})\\s*${CUR}`, 'i');
  const pm = post.exec(segment);
  if (pm) {
    const v = toMinor(pm[1]!);
    return { minMinor: v, maxMinor: v, matchStart: pm.index, matchEnd: pm.index + pm[0].length };
  }

  // Single with currency BEFORE the number: "CHF 120", "Fr. 89".
  const pre = new RegExp(`${CUR}\\s*(${NUM})`, 'i');
  const prm = pre.exec(segment);
  if (prm) {
    const v = toMinor(prm[1]!);
    return { minMinor: v, maxMinor: v, matchStart: prm.index, matchEnd: prm.index + prm[0].length };
  }

  // Number with an explicit price cue but no currency token: "kostet ca. 200".
  const cue = new RegExp(`(?:kostet|preis|ca\\.?|circa|etwa|ungefähr|rund)\\s*(${NUM})\\b`, 'i');
  const cm = cue.exec(segment);
  if (cm) {
    const v = toMinor(cm[1]!);
    return { minMinor: v, maxMinor: v, matchStart: cm.index, matchEnd: cm.index + cm[0].length };
  }

  return null;
}

/**
 * Guess a position category from its title (advisory; user can change it).
 * Deliberately uses no `\b`/`\w` anchors — those are ASCII-only and fail around
 * German umlauts (e.g. "Ölwechsel"). Substring stems are enough for a heuristic.
 */
export function detectCategory(title: string): ItemCategory {
  if (/brems|sicherheit|reifen|lenkung|airbag|gef[äa]hrlich|verkehrsunsicher|beleuchtung|licht/i.test(title)) {
    return 'SAFETY';
  }
  if (/[öo]lwechsel|service|inspektion|filter|wartung|fl[üu]ssigkeit|z[üu]ndkerze|scheibenwischer/i.test(title)) {
    return 'MAINTENANCE';
  }
  if (/diagnose|fehlersuche|auslesen|pr[üu]f|messen|fehlerspeicher/i.test(title)) {
    return 'DIAGNOSTIC';
  }
  return 'REPAIR';
}

/** Detect urgency from the whole transcript. */
export function detectUrgency(text: string): Urgency {
  if (/\b(?:dringend|sofort|umgehend|sicherheitsrelevant|gef[äa]hrlich|akut|nicht mehr (?:fahren|fahrbar)|verkehrsunsicher)\b/i.test(text)) {
    return 'HIGH';
  }
  if (/\b(?:kann warten|unkritisch|kein[e]? eile|niedrige priorit[äa]t|irgendwann|gelegentlich)\b/i.test(text)) {
    return 'LOW';
  }
  return 'MEDIUM';
}

/** Clean a segment into a position title: strip a price phrase + leading filler. */
function toTitle(segment: string, price: ParsedPrice | null): string {
  let s = segment;
  if (price) s = (s.slice(0, price.matchStart) + ' ' + s.slice(price.matchEnd)).trim();
  // Drop trailing price-cue leftovers like "kostet", "für", "das kostet".
  s = s.replace(/[,;:]?\s*(?:das\s+)?(?:kostet|f[üu]r|preis|zu)\s*$/i, '').trim();
  s = s.replace(LEADING_FILLER, '').trim();
  // Collapse whitespace, trim trailing punctuation.
  s = s.replace(/\s+/g, ' ').replace(/[\s.,;:-]+$/,'').trim();
  return s;
}

/** Split a transcript into candidate segments (one per recommended position). */
function splitSegments(transcript: string): string[] {
  return transcript
    // Primary boundaries: sentence enders, newlines, and explicit "also/außerdem".
    .split(/[.\n;]+|\b(?:außerdem|ausserdem|zudem|des weiteren|weiterhin)\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !NOISE_SEGMENT.test(s));
}

/**
 * Parse a transcript into a draft. Never throws; returns empty-ish fields when
 * nothing usable is found so the form still renders for manual entry.
 */
export function parseVoiceDraft(transcript: string): VoiceDraft {
  const text = (transcript ?? '').trim();
  const urgency = detectUrgency(text);

  const items: VoiceDraftItem[] = [];
  for (const segment of splitSegments(text)) {
    if (META_STATEMENT.test(segment.trim())) continue; // urgency remark, not a task
    const price = extractPrice(segment);
    const title = toTitle(segment, price);
    if (title.length < 2) continue; // skip fragments that carry no real task
    const clipped = title.slice(0, 160);
    const item: VoiceDraftItem = { title: clipped, category: detectCategory(clipped) };
    if (price) {
      item.priceBand = { minMinor: price.minMinor, maxMinor: price.maxMinor, currency: CURRENCY };
    }
    items.push(item);
    if (items.length >= 30) break;
  }

  // Subject: the first position's title (a concise summary), else the first
  // sentence, else empty (the user fills it in).
  const firstSentence = text.split(/[.\n]/)[0]?.trim() ?? '';
  const subject = (items[0]?.title ?? firstSentence).slice(0, 200);

  return {
    subject,
    description: text ? text.slice(0, 4000) : undefined,
    urgency,
    items,
  };
}
