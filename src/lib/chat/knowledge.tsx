import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { services, type Service } from '../../data/services';
import { cityPages, type CityPage } from '../../data/cityPages';
import { coupons } from '../../data/coupons';
import { generalFaq } from '../../data/faq';
import { business, surroundingServiceAreas } from '../../data/business';

// Keyword-scored knowledge base built directly from the same content that
// drives the services/, service-area/, and FAQ sections, so chatbot answers
// can never drift out of sync with what the site actually says. No LLM: a
// small rule engine matches on weighted keyword overlap, see
// findBestMatch() below and getSmartReply() in engine.tsx.

export type ReplyContext = {
  /** True the first time this session a visitor lands on this entry's topic.
   * Used to show a smart follow-up question once instead of on every re-ask. */
  isFirstMention: boolean;
};

export type KnowledgeEntry = {
  id: string;
  /** Used for conversation-context tracking, e.g. "service:drain-cleaning-colorado-springs" */
  topic: string;
  keywords: string[];
  weight?: number;
  /** Marks a broad catchall entry (services-overview, areas-overview) whose
   * keywords are common single words ("service", "area") likely to also
   * appear in a more specific entry's match. On a tied score, a catchall
   * entry loses to a non-catchall one instead of winning by array order, see
   * findBestMatch(). Doesn't affect the entry's own raw score/threshold. */
  isCatchall?: boolean;
  reply: (ctx: ReplyContext) => ReactNode;
  /** Short plain-text summary of this answer, used in the lead email transcript (bot replies are rich JSX, not plain strings). */
  logLabel: string;
};

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'is',
  'are',
  'do',
  'does',
  'did',
  'you',
  'your',
  'yours',
  'i',
  'im',
  'my',
  'me',
  'to',
  'for',
  'of',
  'in',
  'on',
  'at',
  'and',
  'or',
  'what',
  'whats',
  'how',
  'can',
  'could',
  'will',
  'would',
  'it',
  'its',
  'that',
  'this',
  'with',
  'about',
  'if',
  'have',
  'has',
  'had',
  'be',
  'been',
  'was',
  'were',
  'there',
  'here',
  'please'
]);

export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ');
}

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

// Levenshtein edit distance, used only for short single-word typo tolerance
// ("watre" -> "water", "drin" -> "drain"). Deliberately not used for phrase
// matching or long words, both accuracy risks and unnecessary cost, see
// fuzzyKeywordHit() below for where the length/distance caps are enforced.
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** How many typo'd characters we'll forgive for a single-word keyword, scaled
 * to word length so short words ("gas", "hot") aren't fuzzy-matched into
 * false positives while longer ones ("plumbing", "installation") tolerate a
 * couple of slipped keys. */
function maxEditDistanceFor(wordLength: number): number {
  if (wordLength <= 4) return 0;
  if (wordLength <= 7) return 1;
  return 2;
}

/** True if any token in the visitor's message is a near-miss (typo) of the
 * given single-word keyword. Only called after an exact-match pass finds
 * nothing for that keyword, see findBestMatch(). */
function fuzzyKeywordHit(keyword: string, tokens: string[]): boolean {
  const maxDist = maxEditDistanceFor(keyword.length);
  if (maxDist === 0) return false;
  for (const token of tokens) {
    if (Math.abs(token.length - keyword.length) > maxDist) continue;
    if (editDistance(token, keyword) <= maxDist) return true;
  }
  return false;
}

// Handles cases where the site copy uses a different word than a visitor
// would ("no hot water" vs. water heater repair, "AC won't turn on" vs. AC
// repair). Keyed by service slug so it stays attached to the right entry.
const SERVICE_SYNONYMS: Record<string, string[]> = {
  'drain-cleaning-colorado-springs': [
    'drain',
    'drains',
    'clog',
    'clogged',
    'clogged drain',
    'clogged sink',
    'sink not draining',
    'tub not draining',
    'slow drain',
    'backed up',
    'gurgling drain',
    'rooter',
    'snake the drain',
    'roots',
    'root intrusion',
    'main line clog'
  ],
  'hydro-jetting-colorado-springs': ['hydro jet', 'hydro-jetting', 'hydrojetting', 'jetting', 'high pressure line'],
  'water-heater-repair-colorado-springs': [
    'water heater',
    'water heaters',
    'hot water heater',
    'hot water tank',
    'no hot water',
    'water heater leaking',
    'water heater leak',
    'pilot light',
    'water not heating',
    'lukewarm water',
    'gas water heater',
    'electric water heater'
  ],
  'water-heater-replacement-colorado-springs': ['new water heater', 'replace water heater', 'water heater install'],
  'tankless-water-heater-installation-colorado-springs': ['tankless', 'tankless heater', 'on demand hot water'],
  'toilet-repair-colorado-springs': [
    'toilet',
    'running toilet',
    'toilet running',
    'wont flush',
    "won't flush",
    'weak flush',
    'clogged toilet',
    'toilet overflowing',
    'toilet leaking at base',
    'wax ring',
    'toilet wobbles'
  ],
  'toilet-replacement-colorado-springs': ['new toilet', 'replace toilet', 'install a toilet'],
  'garbage-disposal-replacement-colorado-springs': [
    'garbage disposal',
    'disposal',
    'disposal jammed',
    'disposal leaking'
  ],
  'sump-pump-repair-colorado-springs': ['sump pump', 'sump pump not working', 'basement flooding', 'sump pump failed'],
  'sump-pump-installation-colorado-springs': ['new sump pump', 'install sump pump', 'battery backup pump'],
  'water-filtration-colorado-springs': ['water filtration', 'filter', 'water quality', 'water taste'],
  'water-softener-installation-colorado-springs': ['water softener', 'hard water', 'soft water'],
  'water-line-repair-colorado-springs': ['water line', 'main water line', 'water line leak', 'low water pressure'],
  'ac-repair-colorado-springs': [
    'ac',
    'a/c',
    'air conditioner',
    'air conditioning',
    'ac not working',
    'ac wont turn on',
    'ac blowing warm air',
    'ac not cooling',
    'ac broken'
  ],
  'ac-replacement-colorado-springs': ['new ac', 'replace ac', 'new air conditioner'],
  'ac-tune-up-colorado-springs': ['ac tune up', 'ac maintenance', 'ac check up'],
  'cooling-repair-colorado-springs': ['cooling', 'cooling system', 'not cooling'],
  'furnace-repair-colorado-springs': [
    'furnace',
    'furnace not working',
    'furnace wont turn on',
    'no heat',
    'heat not working',
    'furnace making noise',
    'furnace short cycling'
  ],
  'furnace-replacement-colorado-springs': ['new furnace', 'replace furnace', 'furnace install'],
  'furnace-tune-up-colorado-springs': ['furnace tune up', 'furnace maintenance'],
  'heat-pump-installation-colorado-springs': ['heat pump install', 'new heat pump'],
  'heat-pump-repair-colorado-springs': ['heat pump', 'heat pump not working'],
  'heating-repair-colorado-springs': ['heating', 'heater not working', 'house is cold', 'no heat'],
  'boiler-repair-colorado-springs': ['boiler', 'boiler not working', 'boiler leaking', 'boiler pressure'],
  'boiler-replacement-colorado-springs': ['new boiler', 'replace boiler'],
  'mini-split-repair-colorado-springs': ['mini split', 'ductless', 'mini split not working'],
  'mini-split-replacement-colorado-springs': ['new mini split', 'install mini split'],
  'indoor-air-quality-colorado-springs': [
    'air quality',
    'air purifier',
    'allergens',
    'dusty air',
    'dry air',
    'humidity'
  ],
  'commercial-hvac-colorado-springs': ['commercial hvac', 'business hvac', 'office ac', 'rooftop unit'],
  'electrician-colorado-springs': ['electrician', 'electrical', 'electrical problem', 'flickering lights'],
  'electrical-panel-upgrade-colorado-springs': [
    'panel upgrade',
    'electrical panel',
    'breaker panel',
    'circuit breaker',
    'panel is old',
    'not enough power'
  ],
  'electric-vehicle-charger-colorado-springs': ['ev charger', 'electric vehicle', 'car charger', 'tesla charger'],
  'back-up-generator-installation-colorado-springs': [
    'generator',
    'backup generator',
    'standby generator',
    'power outage'
  ],
  'surge-storm-protection-colorado-springs': ['surge protection', 'power surge', 'storm damage', 'lightning'],
  'wiring-rewiring-colorado-springs': ['wiring', 'rewiring', 'rewire', 'old wiring', 'exposed wires'],
  'lighting-installation-colorado-springs': ['lighting', 'light fixture', 'recessed lighting', 'landscape lighting'],
  'ceiling-fan-installation-colorado-springs': ['ceiling fan', 'fan install', 'install a fan'],
  'sewer-repair-colorado-springs': [
    'sewer',
    'sewer line',
    'sewer backup',
    'sewage backup',
    'sewage smell',
    'main sewer line',
    'camera inspection',
    'whole house backup'
  ],
  'trenchless-sewer-repair-colorado-springs': ['trenchless', 'trenchless repair', 'no dig sewer repair'],
  'plumbing-excavation-colorado-springs': ['excavation', 'dig up pipe', 'excavate']
};

// Words that recur across several service slugs are too generic to act as a
// real single-token signal on their own. Full multi-word matches (the
// service title, phrase synonyms) are unaffected.
const GENERIC_DOMAIN_WORDS = new Set([
  'plumbing',
  'plumber',
  'repair',
  'install',
  'installation',
  'replacement',
  'service',
  'services',
  'system',
  'systems',
  'colorado',
  'springs',
  'line',
  'lines'
]);

function serviceKeywords(service: Service): string[] {
  return [
    service.title.toLowerCase(),
    ...service.slug.split('-').filter((w) => !GENERIC_DOMAIN_WORDS.has(w)),
    ...(SERVICE_SYNONYMS[service.slug] ?? [])
  ];
}

// Shown once per session, the first time a visitor asks about that service,
// so the bot feels like it's actually listening instead of reciting the same
// blurb.
const SERVICE_FOLLOWUPS: Record<string, string> = {
  'drain-cleaning-colorado-springs': 'Is this in the kitchen, a bathroom, or the main line outside?',
  'water-heater-repair-colorado-springs': 'Is it a total loss of hot water, or just not as hot as it should be?',
  'toilet-repair-colorado-springs': 'Is it running constantly, clogged, or leaking at the base?',
  'sewer-repair-colorado-springs': 'Is it a single drain backing up, or the whole house?',
  'furnace-repair-colorado-springs': 'Is the furnace not turning on at all, or running but not heating?',
  'ac-repair-colorado-springs': 'Is the AC not turning on, or running but not actually cooling?',
  'electrician-colorado-springs': 'Is this a repair, or a new installation you need quoted?'
};

function buildServiceEntries(): KnowledgeEntry[] {
  return services.map((service) => ({
    id: `service:${service.slug}`,
    topic: `service:${service.slug}`,
    keywords: serviceKeywords(service),
    weight: 2,
    logLabel: `Explained ${service.title}`,
    reply: ({ isFirstMention }) => (
      <>
        <p>{service.short}</p>
        {service.bullets[0] && (
          <p className="mt-2">
            <strong>{service.bullets[0]}</strong>
          </p>
        )}
        <a
          href={`/services/${service.slug}/`}
          className="mt-2 inline-flex items-center gap-1 font-semibold text-orange-600 hover:text-orange-700"
        >
          More on {service.title} <ArrowUpRight className="h-3 w-3" />
        </a>
        {isFirstMention && SERVICE_FOLLOWUPS[service.slug] && <p className="mt-2">{SERVICE_FOLLOWUPS[service.slug]}</p>}
      </>
    )
  }));
}

function buildFaqEntries(): KnowledgeEntry[] {
  return generalFaq.map((faq, index) => ({
    id: `faq:${index}`,
    topic: 'general-faq',
    keywords: tokenize(faq.question),
    weight: 1,
    logLabel: `Answered: "${faq.question}"`,
    reply: () => <p>{faq.answer}</p>
  }));
}

function buildCouponEntries(): KnowledgeEntry[] {
  return coupons.map((coupon) => ({
    id: `coupon:${coupon.code}`,
    topic: 'coupons',
    keywords: [...tokenize(coupon.title), ...tokenize(coupon.description)],
    weight: 1,
    logLabel: `Mentioned coupon ${coupon.code}`,
    reply: () => (
      <>
        <p>
          {coupon.title} — {coupon.description}
        </p>
        <p className="mt-1.5 text-xs">
          Mention code <strong>{coupon.code}</strong> when you schedule.
        </p>
      </>
    )
  }));
}

function buildLocationEntries(): KnowledgeEntry[] {
  return cityPages.map((city: CityPage) => ({
    id: `location:${city.slug}`,
    topic: `location:${city.slug}`,
    keywords: [city.name.toLowerCase()],
    weight: 3,
    logLabel: `Confirmed service area: ${city.name}`,
    reply: () => (
      <>
        <p>
          Yes, we serve {city.name}. {city.blurb}
        </p>
        <a
          href={`/service-area/${city.slug}/`}
          className="mt-2 inline-flex items-center gap-1 font-semibold text-orange-600 hover:text-orange-700"
        >
          {city.name} service details <ArrowUpRight className="h-3 w-3" />
        </a>
      </>
    )
  }));
}

// Areas in the broader coverage list that don't have their own landing page
// yet, matched loosely so "do you serve Cascade" still gets a confident yes.
function buildBroadServiceAreaEntries(): KnowledgeEntry[] {
  const pagedSlugs = new Set(cityPages.map((c) => c.slug));
  return surroundingServiceAreas
    .filter((area) => !pagedSlugs.has(area.slug))
    .map((area) => ({
      id: `area:${area.slug}`,
      topic: 'areas-overview',
      keywords: [area.name.toLowerCase()],
      weight: 3,
      logLabel: `Confirmed service area: ${area.name}`,
      reply: () => (
        <>
          Yes, {area.name} is inside our service area.{' '}
          <a href="/service-area/" className="font-semibold text-orange-600 hover:text-orange-700">
            See full coverage
          </a>
        </>
      )
    }));
}

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return items.join(' and ');
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

const STATIC_ENTRIES: KnowledgeEntry[] = [
  {
    id: 'services-overview',
    topic: 'services-overview',
    keywords: [
      'service',
      'services',
      'offer',
      'offerings',
      'provide',
      'help with',
      'do you do',
      'what do you do',
      'what do you fix',
      'what can you fix',
      'types of service',
      'list of services',
      'everything you do',
      'full list'
    ],
    weight: 2,
    isCatchall: true,
    logLabel: 'Listed service categories',
    reply: () => (
      <>
        We handle plumbing, heating & cooling (HVAC), electrical, and sewer & drain work, everything from a leaky faucet
        to a full panel upgrade.{' '}
        <a href="/services/" className="font-semibold text-orange-600 hover:text-orange-700">
          See all services
        </a>
      </>
    )
  },
  {
    id: 'areas-overview',
    topic: 'areas-overview',
    keywords: [
      'area',
      'areas',
      'location',
      'locations',
      'city',
      'cities',
      'region',
      'where',
      'serve',
      'coverage',
      'service area',
      'do you come to',
      'do you come out',
      'do you travel',
      'travel to',
      'zip code',
      'where are you located',
      'where are you based',
      'what cities',
      'near me'
    ],
    weight: 2,
    isCatchall: true,
    logLabel: 'Listed service area coverage',
    reply: () => (
      <>
        We&rsquo;re based in {business.addressLocality} and serve {surroundingServiceAreas.length}+ surrounding
        communities across the Pikes Peak region, including {joinWithAnd(cityPages.map((c) => c.name))}.{' '}
        <a href="/service-area/" className="font-semibold text-orange-600 hover:text-orange-700">
          Check your city
        </a>
      </>
    )
  },
  {
    id: 'hours',
    topic: 'hours',
    keywords: [
      'hour',
      'hours',
      'open',
      'open now',
      'are you open',
      '24',
      '247',
      '24 7',
      '24/7',
      'time',
      'what time',
      'weekend',
      'weekends',
      'saturday',
      'sunday',
      'holiday',
      'holidays',
      'closed',
      'late night',
      'middle of the night',
      'overnight'
    ],
    weight: 2,
    logLabel: 'Answered a question about hours',
    reply: () => <>{business.hours}, including nights, weekends, and holidays.</>
  },
  {
    id: 'pricing-philosophy',
    topic: 'pricing',
    keywords: [
      'price',
      'prices',
      'pricing',
      'cost',
      'costs',
      'expensive',
      'cheap',
      'cheapest',
      'affordable',
      'afford',
      'budget',
      'estimate',
      'quote',
      'ballpark',
      'how much is it',
      'how much would it be',
      'what will it cost',
      'flat rate',
      'upfront pricing',
      'hidden fees',
      'diagnostic fee'
    ],
    weight: 2,
    logLabel: 'Explained pricing philosophy',
    reply: () => (
      <>
        Every job gets a clear, upfront quote before any work begins, no surprises when the invoice comes.{' '}
        <a href="/contact-us/" className="font-semibold text-orange-600 hover:text-orange-700">
          Get a free estimate
        </a>
      </>
    )
  },
  {
    id: 'insurance-licensing',
    topic: 'permits',
    keywords: [
      'permit',
      'permits',
      'licensed',
      'licence',
      'license',
      'licensing',
      'insured',
      'insurance',
      'bonded',
      'bonded and insured',
      'certified',
      'qualifications',
      'credentials',
      'are your technicians licensed',
      'license number'
    ],
    weight: 2,
    logLabel: 'Answered a question about licensing/insurance',
    reply: () => (
      <>
        We&rsquo;re fully licensed and insured, electrical (#{business.license.electrical}), plumbing (#
        {business.license.plumbing}), and mechanical (#{business.license.mechanical}). Every technician is trained and
        experienced before they&rsquo;re sent to your home.
      </>
    )
  },
  {
    id: 'why-choose-us',
    topic: 'why-choose-us',
    keywords: [
      'why choose',
      'why should i',
      'why you',
      'different',
      'stand out',
      'better than',
      'best plumber',
      'best hvac company',
      'trust you',
      'experience',
      'experienced',
      'how long have you',
      'how long in business',
      'years in business',
      'established',
      'locally owned',
      'reputable'
    ],
    weight: 2,
    logLabel: 'Explained why customers choose us',
    reply: () => (
      <>
        Colorado Springs homeowners choose us because we&rsquo;re licensed, available 24/7, and quote every job upfront
        before work begins.{' '}
        <a href="/about-us/" className="font-semibold text-orange-600 hover:text-orange-700">
          More about us
        </a>
      </>
    )
  },
  {
    id: 'commercial-residential',
    topic: 'commercial-residential',
    keywords: [
      'commercial',
      'residential',
      'business plumbing',
      'office building',
      'office',
      'apartment',
      'property manager',
      'landlord',
      'tenant',
      'home or business',
      'my house',
      'my home'
    ],
    weight: 3,
    logLabel: 'Confirmed residential and commercial service',
    reply: () => (
      <>
        We handle both residential homes and commercial properties, including commercial HVAC.{' '}
        <a href="/contact-us/" className="font-semibold text-orange-600 hover:text-orange-700">
          Get a free estimate
        </a>
      </>
    )
  },
  {
    id: 'financing',
    topic: 'financing',
    keywords: [
      'financing',
      'finance',
      'payment plan',
      'payment plans',
      'payment',
      'payments',
      'loan',
      'loans',
      'pay over time',
      'pay monthly',
      'monthly payments',
      'credit',
      'soft credit check',
      "can't afford it all at once",
      'installments',
      'buyfin',
      'momnt'
    ],
    weight: 3,
    logLabel: 'Answered a question about financing',
    reply: () => (
      <>
        Yes. We partner with BuyFin (powered by Momnt) for financing up to $55,000, with a soft credit check that
        won&rsquo;t affect your score.{' '}
        <a href="/financing/" className="font-semibold text-orange-600 hover:text-orange-700">
          See financing options
        </a>
      </>
    )
  },
  {
    id: 'coupons-overview',
    topic: 'coupons',
    keywords: [
      'coupon',
      'coupons',
      'discount',
      'discounts',
      'deal',
      'deals',
      'offer',
      'offers',
      'savings',
      'save money',
      'promo',
      'promo code',
      'promotion',
      'promotions',
      'special',
      'specials',
      'sale',
      'any deals',
      'money off',
      'senior discount',
      'military discount'
    ],
    weight: 2,
    logLabel: 'Pointed to current coupons',
    reply: () => (
      <>
        We&rsquo;ve got {coupons.length} current offers, including savings on AC, furnace/AC installs, and water
        heaters.{' '}
        <a href="/coupons/" className="font-semibold text-orange-600 hover:text-orange-700">
          See current coupons
        </a>
      </>
    )
  }
];

let cachedKnowledgeBase: KnowledgeEntry[] | null = null;

export function getKnowledgeBase(): KnowledgeEntry[] {
  if (!cachedKnowledgeBase) {
    cachedKnowledgeBase = [
      ...STATIC_ENTRIES,
      ...buildServiceEntries(),
      ...buildFaqEntries(),
      ...buildCouponEntries(),
      ...buildLocationEntries(),
      ...buildBroadServiceAreaEntries()
    ];
  }
  return cachedKnowledgeBase;
}

/** Turns a "service:drain-cleaning-colorado-springs" / "location:monument"
 * topic id back into a human label for the lead email transcript. */
export function topicLabel(topic: string): string {
  if (topic.startsWith('service:')) {
    const slug = topic.slice('service:'.length);
    return services.find((s) => s.slug === slug)?.title ?? slug;
  }
  if (topic.startsWith('location:')) {
    const slug = topic.slice('location:'.length);
    return cityPages.find((c) => c.slug === slug)?.name ?? slug;
  }
  return topic.replace(/-/g, ' ');
}

/** Maps the current page path to a knowledge-base topic id, so a visitor
 * chatting from that page gets a small relevance boost toward what they're
 * already looking at. Returns null on pages with no obvious single topic. */
export function getPageContextTopic(pathname: string): string | null {
  const serviceMatch = pathname.match(/^\/services\/([^/]+)\/?$/);
  if (serviceMatch && services.some((s) => s.slug === serviceMatch[1])) {
    return `service:${serviceMatch[1]}`;
  }
  const cityMatch = pathname.match(/^\/service-area\/([^/]+)\/?$/);
  if (cityMatch && cityPages.some((c) => c.slug === cityMatch[1])) {
    return `location:${cityMatch[1]}`;
  }
  return null;
}

export function findBestMatch(
  input: string,
  entries: KnowledgeEntry[] = getKnowledgeBase(),
  contextTopic: string | null = null
): KnowledgeEntry | null {
  const normalizedInput = normalizeText(input);
  const tokens = new Set(tokenize(input));
  if (tokens.size === 0) return null;

  let best: { entry: KnowledgeEntry; score: number } | null = null;
  for (const entry of entries) {
    let score = 0;
    // Tokens that already scored an exact hit on *some* keyword in this
    // entry are excluded from that same entry's fuzzy pass, so e.g. the
    // token "service" can't score both an exact hit on keyword "service"
    // and a second, fuzzy hit on the near-duplicate keyword "services" in
    // the same entry, inflating one entry's total past a genuinely
    // different topic that matched a single, real keyword.
    const exactlyMatchedTokens = new Set(entry.keywords.filter((k) => !k.includes(' ') && tokens.has(k)));
    const fuzzyCandidateTokens = Array.from(tokens).filter((t) => !exactlyMatchedTokens.has(t));
    for (const keyword of entry.keywords) {
      if (keyword.includes(' ')) {
        if (normalizedInput.includes(keyword)) score += 3 * (entry.weight ?? 1);
      } else if (tokens.has(keyword)) {
        score += entry.weight ?? 1;
      } else if (fuzzyKeywordHit(keyword, fuzzyCandidateTokens)) {
        // Typo tolerance ("watre heater", "drin clog"): counts for less than
        // an exact hit so a real match elsewhere always outranks a guess.
        score += Math.max(1, (entry.weight ?? 1) - 1);
      }
    }
    // Small nudge (not a hard override) so a genuinely ambiguous question
    // ("how much does it cost") leans toward the service/city the visitor
    // is already reading about, without letting page context beat a clear,
    // differently-scored match.
    if (score > 0 && contextTopic && entry.topic === contextTopic) {
      score += 1;
    }
    if (score > 0 && best) {
      // On a tied score, a broad catchall entry loses to a specific one
      // (see isCatchall doc comment) instead of silently winning just for
      // appearing earlier in the array.
      const winsOnTie = score === best.score && best.entry.isCatchall && !entry.isCatchall;
      if (score > best.score || winsOnTie) best = { entry, score };
    } else if (score > 0) {
      best = { entry, score };
    }
  }

  return best && best.score >= 2 ? best.entry : null;
}
