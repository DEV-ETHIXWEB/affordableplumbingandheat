import { isValidEmailAddress, isValidPhoneNumber } from '../contactSchema';
import {
  AREA_ZIPS,
  COLORADO_SPRINGS_PLACES,
  EMERGENCY_TYPES,
  NEARBY_UNLISTED_TOWNS,
  NOT_URGENT_WORDS,
  OUT_OF_SCOPE_TRADES,
  REPLACE_WORDS,
  SERVICE_FAMILIES,
  TUNE_UP_WORDS,
  URGENT_WORDS,
  LEXICON_WORDS
} from './lexicon';
import { correctTokens, editDistance, hasPhrase, maxTypos } from './text';
import type { AssistantKnowledge } from './types';

export type CityMatch =
  | { kind: 'area'; name: string; slug: string; page?: string }
  | { kind: 'nearby'; name: string }
  | { kind: 'zip'; zip: string; name?: string };

export type ServiceMatch = { familyId: string; slug?: string; label: string; score: number };

export type Entities = {
  phone?: string;
  invalidPhone?: string;
  email?: string;
  name?: string;
  city?: CityMatch;
  urgent?: boolean;
  propertyType?: 'Residential' | 'Commercial';
  service?: ServiceMatch;
  emergency?: string;
  outOfScope?: string;
  affirm: boolean;
  deny: boolean;
  skip: boolean;
};

const PHONE_CANDIDATE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?:\s*(?:x|ext\.?|extension)\s*\d{1,6})?/i;
const LOOSE_DIGITS = /(?:\d[\s().+-]*){7,}/;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

export function extractPhone(raw: string): { phone?: string; invalidPhone?: string } {
  const m = raw.match(PHONE_CANDIDATE);
  if (m && isValidPhoneNumber(m[0])) return { phone: m[0].trim() };
  const loose = raw.match(LOOSE_DIGITS);
  if (loose) {
    const digits = loose[0].replace(/\D/g, '');
    if (digits.length >= 7 && digits.length <= 15 && isValidPhoneNumber(loose[0].trim()))
      return { phone: loose[0].trim() };
    if (digits.length >= 7 && !/^80\d{3}$/.test(digits)) return { invalidPhone: loose[0].trim() };
  }
  return {};
}

export function extractEmail(raw: string): string | undefined {
  const m = raw.match(EMAIL);
  return m && isValidEmailAddress(m[0]) ? m[0] : undefined;
}

// Words that follow "I'm" / "this is" but aren't names.
const NOT_NAMES = new Set(
  (
    'a an the in at on from here there having looking trying wondering calling asking interested not sure just so very ' +
    'good fine great ok okay well new back done ready home away out interested also still getting going thinking ' +
    'homeowner renter landlord tenant owner manager property business worried concerned afraid glad happy sorry ' +
    'hoping needing needs need wanting want in available free busy curious confused frustrated stuck cold hot freezing ' +
    'without with about calling texting emailing reaching writing messaging moving selling buying renting building ' +
    'retired military veteran senior my your our his her their it its is was be cell mobile number phone call text ' +
    'reach contact me him us them best work home office email'
  ).split(' ')
);

const NAME_WORD = /^[a-z][a-z'-]{0,24}$/i;

function titleCase(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

/** "My name is Jordan Lee", "I'm Jordan", "this is Jordan", "call me Jo", or -
 * when the assistant just asked for a name - a bare "Jordan Lee". */
export function extractName(raw: string, expectingName: boolean): string | undefined {
  const cleaned = raw
    .replace(/[,.!?;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const explicit = cleaned.match(
    /\b(?:my name is|my name's|name is|name's|this is|call me|i am|i'm|im)\s+([a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,2})/i
  );
  if (explicit) {
    const words = explicit[1].split(' ');
    const kept: string[] = [];
    for (const w of words) {
      if (NOT_NAMES.has(w.toLowerCase()) || !NAME_WORD.test(w) || /(ing|ed)$/i.test(w)) break;
      // stop at words that begin a new clause ("I'm Jordan and ...")
      if (/^(and|but|my|number|phone|from|in|at|i|we|the|here|calling|with)$/i.test(w)) break;
      kept.push(w);
    }
    const isIntro = /\b(my name is|my name's|name is|name's|call me)\b/i.test(explicit[0]);
    // "I'm Jordan" only counts when the word looks like a name (capitalized or expecting one)
    if (kept.length && (isIntro || expectingName || /^[A-Z]/.test(kept[0])))
      return titleCase(kept.slice(0, 3).join(' '));
  }
  if (expectingName) {
    const words = cleaned.split(' ').filter(Boolean);
    const withoutContact = words.filter((w) => !/\d/.test(w) && !w.includes('@'));
    if (
      withoutContact.length >= 1 &&
      withoutContact.length <= 3 &&
      withoutContact.every(
        (w) => NAME_WORD.test(w) && !NOT_NAMES.has(w.toLowerCase()) && !/(ing|ed|'s|'re|'m|n't)$/i.test(w)
      )
    ) {
      const joined = withoutContact.join(' ');
      if (!/^(yes|yeah|yep|no|nope|skip|ok|okay|sure|hi|hello|hey|thanks|thank you|none|na|n\/a)$/i.test(joined)) {
        return titleCase(joined);
      }
    }
  }
  return undefined;
}

function fuzzyPlace(text: string, place: string): boolean {
  if (hasPhrase(text, place)) return true;
  const words = text.split(' ');
  const placeWords = place.split(' ');
  if (place.length < 6) return false;
  for (let i = 0; i + placeWords.length <= words.length; i++) {
    const candidate = words.slice(i, i + placeWords.length).join(' ');
    if (
      Math.abs(candidate.length - place.length) <= 2 &&
      editDistance(candidate, place) <= maxTypos(place.length) - 1
    ) {
      return true;
    }
  }
  return false;
}

export function extractCity(text: string, knowledge: AssistantKnowledge): CityMatch | undefined {
  const zip = text.match(/\b(8[01]\d{3})\b/);
  // Longest names first so "manitou springs" wins over "springs".
  const areas = [...knowledge.areas].sort((a, b) => b.name.length - a.name.length);
  for (const area of areas) {
    const name = area.name.toLowerCase();
    if (fuzzyPlace(text, name) || (area.slug === 'security' && hasPhrase(text, 'security widefield'))) {
      return { kind: 'area', name: area.name, slug: area.slug, page: area.page };
    }
  }
  for (const place of COLORADO_SPRINGS_PLACES) {
    if (hasPhrase(text, place)) {
      const primary = knowledge.areas.find((a) => a.primary)!;
      return { kind: 'area', name: primary.name, slug: primary.slug, page: primary.page };
    }
  }
  for (const town of [...NEARBY_UNLISTED_TOWNS].sort((x, y) => y.length - x.length)) {
    if (hasPhrase(text, town)) return { kind: 'nearby', name: titleCase(town) };
  }
  if (zip) {
    const code = zip[1];
    if (AREA_ZIPS[code]) return { kind: 'zip', zip: code, name: AREA_ZIPS[code] };
    if (code.startsWith('809')) return { kind: 'zip', zip: code, name: 'Colorado Springs' };
    return { kind: 'zip', zip: code };
  }
  return undefined;
}

function detectFamilies(text: string): { familyId: string; score: number }[] {
  const found: { familyId: string; score: number }[] = [];
  for (const family of SERVICE_FAMILIES) {
    let best = 0;
    for (const phrase of family.phrases) {
      if (hasPhrase(text, phrase)) best = Math.max(best, phrase.split(' ').length * 2 + phrase.length / 20);
    }
    if (best > 0) found.push({ familyId: family.id, score: best });
  }
  return found.sort((a, b) => b.score - a.score);
}

/** Fixes typos in trade words ("furnce", "watre heatr") without touching
 * names or places, so service detection still works on messy typing. */
export function correctTradeTypos(text: string): string {
  return text
    .split(' ')
    .map((word) =>
      // Only longer, unfamiliar words are candidates: "sure" must never
      // become "surge", or "wait" become "water".
      word.length < 5 || COMMON_WORDS.has(word) || LEXICON_WORDS.has(word)
        ? word
        : correctTokens([word], LEXICON_WORDS)[0]
    )
    .join(' ');
}

const COMMON_WORDS = new Set(
  (
    'about above after again against being below between could doing during every first found great having house ' +
    'maybe might never other right shall should since still their there these thing think those three through today ' +
    'under until where which while would yours sure super thanks please hello there again later little money month ' +
    'morning night place quick quote really start still sorry stuff times tomorrow touch water week weekend works ' +
    'worse wrong years young yeah okay alright could sounds great lemme gonna wanna kinda sorta totally honestly ' +
    'actually basically probably usually friend family garage kitchen bathroom basement upstairs downstairs outside ' +
    'inside inspect looking wanted called calling phone email number street drive broken leaking smells sound sounds ' +
    'noisy loud hours cheap price prices costs dollars'
  ).split(' ')
);

export function extractService(rawText: string, knowledge: AssistantKnowledge): ServiceMatch | undefined {
  const text = correctTradeTypos(rawText);
  const families = detectFamilies(text);
  if (!families.length) return undefined;
  // Specific families outrank general ones, and a named appliance outranks a
  // symptom ("furnace" + "no heat" is the furnace).
  const general = new Set(['plumbing-general', 'hvac-general', 'heating', 'cooling', 'electrician']);
  const specific = families.filter((f) => !general.has(f.familyId));
  const chosen = specific[0] ?? families[0];
  const family = SERVICE_FAMILIES.find((f) => f.id === chosen.familyId)!;

  const wantsReplace = REPLACE_WORDS.some((w) => hasPhrase(text, w));
  const wantsTuneUp = TUNE_UP_WORDS.some((w) => hasPhrase(text, w));
  const slug =
    family.only ??
    (wantsTuneUp && family.tuneUp ? family.tuneUp : wantsReplace && family.replace ? family.replace : family.repair);
  const service = slug ? knowledge.services.find((s) => s.slug === slug) : undefined;
  return {
    familyId: family.id,
    slug: service?.slug,
    label: service?.title ?? family.label ?? 'Service',
    score: chosen.score
  };
}

export function extractEntities(
  raw: string,
  text: string,
  knowledge: AssistantKnowledge,
  expecting: string | null
): Entities {
  const entities: Entities = {
    affirm:
      /^(yes|yeah|yea|ya|yah|yas|yep|yup|sure|sure thing|ok|okay|k|kk|alright|all right|aight|bet|please|please do|sounds good|that works|correct|right|absolutely|definitely|of course|go ahead|do it|let us do it|yes please|y)\b/.test(
        text
      ),
    deny: /^(no|nope|nah|not now|no thanks|no thank you|not really|maybe later|n)\b/.test(text),
    skip: /^(skip|no email|none|no thanks|nope|n\/a|na|i do not have one|do not have one|rather not|pass)\b/.test(text)
  };

  Object.assign(entities, extractPhone(raw));
  entities.email = extractEmail(raw);
  entities.name = extractName(raw, expecting === 'name');
  entities.city = extractCity(text, knowledge);
  entities.service = extractService(text, knowledge);

  for (const type of EMERGENCY_TYPES) {
    if (type.phrases.some((p) => hasPhrase(text, p))) {
      entities.emergency = type.id;
      break;
    }
  }
  if (NOT_URGENT_WORDS.some((w) => hasPhrase(text, w))) entities.urgent = false;
  else if (entities.emergency || URGENT_WORDS.some((w) => hasPhrase(text, w))) entities.urgent = true;

  if (
    /\b(business|commercial|office|restaurant|store|shop|warehouse|church|school|building i manage|property management|apartment complex|hotel|clinic|facility)\b/.test(
      text
    )
  ) {
    entities.propertyType = 'Commercial';
  } else if (
    /\b(home|house|my place|apartment|condo|townhome|townhouse|rental|duplex|residential|mobile home)\b/.test(text)
  ) {
    entities.propertyType = 'Residential';
  }

  if (!entities.service) {
    for (const [phrase, label] of OUT_OF_SCOPE_TRADES) {
      if (hasPhrase(text, phrase)) {
        entities.outOfScope = label;
        break;
      }
    }
  }
  return entities;
}
