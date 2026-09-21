import { extractEntities, extractName, type CityMatch } from './entities';
import { KnowledgeSearch } from './search';
import { joinWithAnd, normalize, pick } from './text';
import type { AssistantKnowledge, BotReply, KnowledgeService, LeadDraft } from './types';

/**
 * The offline website assistant: a conversation manager that understands
 * everyday wording, remembers context across turns, answers from the site's
 * own content, and collects a service request conversationally. Pure and
 * deterministic (no network, no randomness), so every behavior is testable.
 */

export type Expecting = null | 'offer' | 'problem' | 'urgency' | 'city' | 'name' | 'phone' | 'email';

export type ConversationState = {
  turn: number;
  expecting: Expecting;
  leadMode: boolean;
  leadShown: boolean;
  leadSent: boolean;
  offers: number;
  declinedOffer: boolean;
  askedUrgency: boolean;
  askedCity: boolean;
  askedEmail: boolean;
  misunderstood: number;
  topicSlug?: string;
  pageSlug?: string;
  /** The last thing the visitor said about their problem, for "what causes that?" follow-ups. */
  lastTopicText?: string;
  slots: {
    serviceSlug?: string;
    serviceLabel?: string;
    problem?: string;
    city?: string;
    urgent?: boolean;
    name?: string;
    phone?: string;
    email?: string;
    propertyType?: 'Residential' | 'Commercial';
  };
};

export type Assistant = { knowledge: AssistantKnowledge; search: KnowledgeSearch };
export type Env = { now: Date };

export function createAssistant(knowledge: AssistantKnowledge): Assistant {
  return { knowledge, search: new KnowledgeSearch(knowledge) };
}

export function initialState(pagePath?: string): ConversationState {
  const service = pagePath?.match(/^\/services\/([^/]+)\/?$/)?.[1];
  return {
    turn: 0,
    expecting: null,
    leadMode: false,
    leadShown: false,
    leadSent: false,
    offers: 0,
    declinedOffer: false,
    askedUrgency: false,
    askedCity: false,
    askedEmail: false,
    misunderstood: 0,
    topicSlug: service,
    pageSlug: service,
    slots: {}
  };
}

const DEFAULT_QUICK_REPLIES = [
  'Get a free estimate',
  "It's an emergency",
  'What do you fix?',
  'Do you serve my area?',
  'Any coupons?',
  'Talk to a person'
];

function mountainParts(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', hour: 'numeric', hour12: false }).format(now)
  );
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' }).format(now);
  return { hour: hour === 24 ? 0 : hour, date };
}

function timeGreeting(now: Date): string {
  const { hour } = mountainParts(now);
  if (hour < 5) return 'Hi there';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function greeting(state: ConversationState, assistant: Assistant, env: Env): BotReply {
  const service = assistant.knowledge.services.find((s) => s.slug === state.pageSlug);
  const opener = `${timeGreeting(env.now)}! I'm the virtual assistant for ${assistant.knowledge.business.name}.`;
  const text = service
    ? `${opener} Looking into ${service.title.toLowerCase()}? Ask me anything about it, or tell me what's going on and I'll help you get it sorted.`
    : `${opener} Tell me what's going on at your place, or ask me anything about plumbing, heating, cooling, or electrical work.`;
  return { text, quickReplies: DEFAULT_QUICK_REPLIES };
}

// ---------------------------------------------------------------------------
// Intent patterns (on normalized text)
// ---------------------------------------------------------------------------

const INTENTS = {
  greeting: /^(hi+|hello+|hey+|heya|hiya|howdy|yo|greetings|good (morning|afternoon|evening|day)|hola|sup)\b/,
  howAreYou:
    /\b(how are you|how are you doing|how is it going|how you doing|how is your day|how are things|what is up|whats up|how have you been)\b/,
  feelingReply:
    /^(i am |im )?(good|great|fine|well|not bad|doing (good|well|great|fine|ok|okay)|pretty good|alright|all right|ok|okay)( thanks| thank you| and you| you)?$/,
  thanks:
    /\b(thanks|thank you|appreciate (it|that|you)|much appreciated|cheers|you are (so )?(helpful|awesome|great|the best))\b/,
  bye: /\b(bye|goodbye|good bye|see you|see ya|talk (to you )?later|have a (good|great|nice) (day|night|one)|that is all|that is it|nothing else|all set|i am done|gotta go|have to go)\b/,
  whoAreYou:
    /\b(who are you|what are you|what is your name|who am i (talking|speaking) (to|with)|are you (a )?(bot|robot|human|real|person|ai|machine|computer)|is this (a )?(bot|robot|real person|human|automated|ai)|am i talking to (a )?(bot|robot|real person|human|person|machine)|real person|chatbot)\b/,
  human:
    /\b(talk to|speak (to|with)|chat with|connect me (to|with)|get me)\s+(a |an |your )?(human|person|someone|somebody|real person|live person|representative|rep|agent|manager|owner|dispatcher|operator|plumber|technician|tech)\b|\b(customer service|live agent|call you|your (phone )?number|phone number|contact (you|info|information)|how (do|can) i (reach|contact|call) (you|someone))\b/,
  hours:
    /\b(hours|opening hours|business hours|are you open|open (today|now|tonight|on|late|24)|when (are|do) you (open|close)|closed|weekends?|saturday|sunday|holidays?|christmas|thanksgiving|24 7|24\/7|247|overnight|late at night|middle of the night|after hours|what time)\b/,
  responseTime:
    /\b(how (soon|fast|quickly|long)|when can (you|someone|a tech|a technician|a plumber)|same day|come (out )?today|today|tonight|this (morning|afternoon|evening|weekend)|right now|how long (until|before) (you|someone|a tech)|eta|arrive|availability|available (today|tomorrow|now))\b/,
  pricing:
    /\b(how much|cost|costs|costing|price|prices|pricing|priced|charge|charges|fee|fees|rates?|expensive|cheap|cheaper|affordable|ballpark|diagnostic|trip charge|service call|flat rate|hourly|per hour|budget|dollars?)\b/,
  freeEstimate:
    /\b(free estimate|estimates? (are |is )?free|charge (for|to) (an |the )?estimate|free quote|quotes? (are |is )?free|cost (for|of) (an |the )?estimate)\b/,
  booking:
    /\b(schedule|book|booking|appointment|set up (a |an )?(visit|appointment|time)|come out|come by|come take a look|send (someone|somebody|a tech|a technician|a plumber|an electrician|out)|someone (to )?come|need (a|an) (plumber|electrician|technician|tech|hvac (tech|company|person)|repair ?man)|can (you|someone|somebody) (come|fix|help|look|check|repair)|call me|callback|call back|contact me|reach out to me|get (a |an )?(quote|estimate)|free estimate|hire|request (a )?service|want (a |an )?(quote|estimate|appointment)|need (a |an )?(quote|estimate|appointment)|need (help|someone|service)|fix it|come fix)\b/,
  area: /\b(service area|serve|serving|service (in|near)|cover|coverage|areas|come to|go to|travel to|work in|do you (come|go|travel|work) (to|in|out)|near me|in my area|my area|my city|my town|what cities|which cities|what areas|which areas|zip code|zip)\b/,
  address:
    /\b(where are you( guys)?( located| based)?|your (address|office|location|shop)|office located|where is your office|physical location|visit your office|come to your office|headquarter)\b/,
  licensing:
    /\b(licen[cs]e[ds]?|licensing|insured|insurance|bonded|certified|certification|credentials|qualified|background check)/,
  financing:
    /\b(financ\w*|payment plans?|monthly payments?|pay (it )?over time|pay monthly|loans?|credit (check|score)|buyfin|momnt|installments?)\b/,
  paymentMethods:
    /\b(do you (take|accept)|accept (credit|debit|cards|cash|checks|payment)|pay (with|by) (card|credit|cash|check)|payment (methods|options)|credit cards?|debit cards?|cash|checks?|venmo|zelle|apple pay|paypal)\b/,
  coupons:
    /\b(coupons?|discounts?|deals?|specials?|promos?|promo codes?|promotions?|savings|save money|senior discount|military discount|veterans? discount|second opinion)\b/,
  careers:
    /\b(jobs?|hiring|careers?|apply|application|employment|work for (you|affordable|your company)|join (your|the) team|apprentice\w*|resume|internships?|positions? open)\b/,
  servicesList:
    /\b(what (services|kind of (work|services)|do you (do|offer|fix|handle|repair))|what can you (do|fix|help with)|list (of )?(your )?services|services (do you|you) (offer|provide)|what do you guys do|all (your )?services|what do you specialize)\b/,
  commercial:
    /\b(do you (do|work on|service|handle) (commercial|businesses|business|offices|restaurants|apartments|rentals)|commercial (work|jobs|properties|clients)|property manag\w*|landlords?)\b/,
  warranty: /\b(warrant(y|ies)|guarantee[ds]?|satisfaction|workmanship|stand behind)\b/,
  reviews:
    /\b(reviews?|reputation|yelp|google reviews|bbb|better business|testimonials?|star rating|your rating|are you (guys )?(any )?good|trustworthy)\b/,
  brands:
    /\b(brands?|carrier|trane|lennox|rheem|ruud|goodman|bradford white|ao smith|a o smith|navien|rinnai|kohler|american standard|york|daikin|mitsubishi|bosch|amana|payne|bryant|state water heaters|moen|delta|insinkerator)\b/,
  howTo:
    /\b(how (do|can|should|would) (i|we|you)|how to|what (causes|could cause|would cause|should i do|do i do|does it mean|is causing)|why (is|does|do|would|does not|is not|will not|am i|are my|my)|is it (safe|normal|bad|dangerous|okay|ok)|should i|can i|tips?|signs?|when (should|do) (i|you)|what is (a|an|the)|what are|difference between|versus|vs|meaning|mean when)\b/,
  duration:
    /\bhow long (does|will|would|should|could) (it|that|this|the (job|work|install|installation|repair|replacement|project)|an? (install|installation|repair|replacement)) (take|last)\b|\bhow many (hours|days) (does|will|would) (it|that|the job) take\b/,
  about:
    /\b(who (owns|runs|started|founded) (the|this|your) (company|business)|who is the owner|owner of (the|this|your) (company|business)|how long have you been (in business|around|doing this)|tell me about (the|your) (company|business)|about (the|your) company|family owned|locally owned)\b/,
  septicPumping:
    /\bseptic (tank )?(pump\w*|clean\w*|service|inspection|install\w*)|\bpump\w* (my |the |a |our )?septic\b/,
  joke: /\b(joke|make me laugh|something funny|funny)\b/,
  weather: /\b(weather|forecast|temperature outside|is it (cold|hot|snowing) outside)\b/,
  frustrated:
    /\b(stupid|useless|dumb|idiot|worst|terrible|horrible|awful|sucks|hate this|annoying|not helpful|you are wrong|this is wrong|wtf|damn|shit|fuck|screw you|ridiculous)\b/,
  test: /^(test|testing|asdf|hello world)$/,
  cancel:
    /^(cancel|never ?mind|nevermind|forget it|stop|start over|restart|scratch that|not anymore|i no longer need)\b|\b(cancel (that|it|the request)|never ?mind)\b/,
  contactEmail: /\b(your email|email address|email you|e-mail you|what is the email|send (you )?an email)\b/,
  emergencyWord: /\b(emergency|urgent|help me|sos|disaster)\b/
};

type IntentName = keyof typeof INTENTS;

function detectIntents(t: string): Set<IntentName> {
  const found = new Set<IntentName>();
  for (const [name, re] of Object.entries(INTENTS) as [IntentName, RegExp][]) if (re.test(t)) found.add(name);
  // "do you offer drain cleaning" is a service question, not the coupon intent
  if (found.has('pricing') && found.has('freeEstimate')) found.delete('pricing');
  return found;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isQuestionText(raw: string, t: string): boolean {
  return (
    /\?\s*$/.test(raw) ||
    INTENTS.howTo.test(t) ||
    /^(do|does|can|could|will|would|is|are|what|how|why|when|where|which|who)\b/.test(t)
  );
}

function clone(state: ConversationState): ConversationState {
  return { ...state, slots: { ...state.slots } };
}

const firstName = (name?: string) => name?.split(' ')[0];

function serviceBySlug(assistant: Assistant, slug?: string): KnowledgeService | undefined {
  return slug ? assistant.knowledge.services.find((s) => s.slug === slug) : undefined;
}

function activeCoupons(assistant: Assistant, env: Env) {
  const today = mountainParts(env.now).date;
  return assistant.knowledge.coupons.filter((c) => !c.expires || today <= c.expires);
}

const CATEGORY_HUB: Record<string, string> = {
  'plumbing-general': '/services/plumbing-contractor-colorado-springs/',
  'hvac-general': '/services/hvac-contractor-colorado-springs/',
  electrician: '/services/electrician-colorado-springs/'
};

const COUPON_FOR_SERVICE: Record<string, string> = {
  'water-heater-repair-colorado-springs': 'water-heater-249',
  'water-heater-replacement-colorado-springs': 'water-heater-249',
  'tankless-water-heater-installation-colorado-springs': 'water-heater-249',
  'drain-cleaning-colorado-springs': 'drain-cleaning-99',
  'hydro-jetting-colorado-springs': 'drain-cleaning-99',
  'sewer-repair-colorado-springs': 'drain-cleaning-99',
  'furnace-tune-up-colorado-springs': 'furnace-tune-up-79',
  'furnace-repair-colorado-springs': 'furnace-tune-up-79',
  'heating-repair-colorado-springs': 'furnace-tune-up-79',
  'furnace-replacement-colorado-springs': 'furnace-400',
  'ac-replacement-colorado-springs': 'ac-furnace-combo-1000'
};

function couponLine(assistant: Assistant, env: Env, slug?: string): string {
  const id = slug ? COUPON_FOR_SERVICE[slug] : undefined;
  const coupon = activeCoupons(assistant, env).find((c) => c.id === id);
  if (!coupon) return '';
  const expiry = coupon.expires
    ? ` (through ${new Date(`${coupon.expires}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })})`
    : '';
  return ` Good timing, too: there's a **${coupon.title}** coupon right now${expiry}. ${coupon.description} [See coupons](/coupons/)`;
}

function cityFromMatch(match: CityMatch): string {
  if (match.kind === 'zip') return match.name ? `${match.zip} (${match.name})` : match.zip;
  return match.name;
}

function areaAnswer(assistant: Assistant, match?: CityMatch): string {
  const k = assistant.knowledge;
  const phone = k.business.phoneDisplay;
  if (!match) {
    const names = k.areas.filter((a) => !a.primary).map((a) => a.name);
    return `We're based in Colorado Springs and also serve ${joinWithAnd(names)}. Tell me your city or ZIP and I'll check for you. [Service area](/service-area/)`;
  }
  if (match.kind === 'area') {
    return `Yes, we serve ${match.name}!${match.page ? ` [${match.name} service details](${match.page})` : ''}`;
  }
  if (match.kind === 'nearby') {
    return `${match.name} isn't on our standard service list, but we may still be able to help. Give us a quick call at ${phone} and we'll confirm.`;
  }
  if (match.name) return `Yes, ${match.zip} is ${match.name}, and that's in our service area.`;
  return `I'm not sure about ${match.zip} off the top of my head. Call ${phone} and the team will confirm whether we cover it.`;
}

const EMERGENCY_ADVICE: Record<string, string> = {
  gas: "**If you smell gas, please get everyone out of the house right now.** Don't flip light switches or use anything with a flame, and call your gas company or 911 from outside. Once you're safe, call us at",
  co: "**A carbon monoxide alarm is serious: get everyone outside into fresh air right away and call 911.** Don't go back in until it's cleared. After that, we can inspect the equipment - call",
  'electrical-fire':
    "**Sparks, smoke, or a burning smell from electrical is dangerous.** Stay clear of it. If you can reach your breaker panel safely, shut off the power, and call 911 if there's any fire or smoke. Then call our electricians at",
  flood:
    "**Shut off your main water valve right away if you can** - it's usually where the water line enters the house, often in the basement or near the water heater. Move valuables away from the water, then call us now at",
  sewage:
    "**Stop using water in the house (no flushing, showers, or laundry)** so it doesn't get worse, and keep kids and pets away from the backup. Call us right away at",
  'no-heat-freezing':
    '**Frozen pipes can burst, so act quickly.** Open the cabinet doors under sinks, keep a faucet dripping, and never use an open flame to thaw a pipe. Call us at',
  general: 'For an emergency, calling is always fastest - a real person answers 24/7 at'
};

function leadDraft(state: ConversationState): LeadDraft {
  const s = state.slots;
  const service = s.serviceLabel;
  const where = s.city ? ` in ${s.city}` : '';
  const said = s.problem ? ` Customer said: "${s.problem.slice(0, 220)}".` : '';
  const summary =
    `${service ?? 'Service request'}${where}. Wants a call back.${said}${s.urgent ? ' Marked urgent.' : ''}`.slice(
      0,
      1000
    );
  return {
    name: s.name!,
    phone: s.phone!,
    email: s.email,
    city: s.city,
    service,
    propertyType: s.propertyType,
    details: s.problem?.slice(0, 2000),
    urgent: Boolean(s.urgent),
    summary
  };
}

// ---------------------------------------------------------------------------
// The turn
// ---------------------------------------------------------------------------

export type TurnResult = { state: ConversationState; reply: BotReply };

export function markLeadSent(state: ConversationState): ConversationState {
  return { ...clone(state), leadSent: true, leadMode: false, expecting: null };
}

export function respond(previous: ConversationState, input: string, assistant: Assistant, env: Env): TurnResult {
  const state = clone(previous);
  state.turn += 1;
  const k = assistant.knowledge;
  const phone = k.business.phoneDisplay;
  const raw = input.trim().slice(0, 600);
  const t = normalize(raw);
  const seed = state.turn * 31 + t.length;
  const expecting = state.expecting;
  state.expecting = null;

  if (!t)
    return {
      state,
      reply: { text: "I'm here whenever you're ready. What can I help with?", quickReplies: DEFAULT_QUICK_REPLIES }
    };

  const e = extractEntities(raw, t, k, expecting);
  const intents = detectIntents(t);
  const parts: string[] = [];
  let quickReplies: string[] | undefined;
  const ack: string[] = [];
  let slotsChanged = false;

  // A name typed next to a phone number: "Jordan Lee, 719-555-0100".
  if (!e.name && e.phone && !state.slots.name) {
    const beforePhone = raw
      .split(e.phone)[0]
      .split(/[,;\n]| and /i)
      .map((x) => x.trim())
      .filter(Boolean);
    for (const segment of beforePhone.reverse()) {
      const candidate = extractName(segment, true);
      if (candidate && !(e.city && candidate.toLowerCase() === cityFromMatch(e.city).toLowerCase())) {
        e.name = candidate;
        break;
      }
    }
  }

  // ---- 1. Remember what the visitor told us --------------------------------
  const isQuestion = isQuestionText(raw, t);

  const GENERAL_FAMILY_CATEGORY: Record<string, string> = {
    cooling: 'hvac',
    heating: 'hvac',
    'hvac-general': 'hvac',
    'plumbing-general': 'plumbing',
    electrician: 'electrical'
  };
  const previousService = serviceBySlug(assistant, state.slots.serviceSlug ?? state.topicSlug);
  if (
    e.service &&
    previousService &&
    GENERAL_FAMILY_CATEGORY[e.service.familyId] === previousService.category &&
    e.service.slug !== previousService.slug
  ) {
    e.service = { ...e.service, slug: previousService.slug, label: previousService.title };
  }
  const sameServiceAsBefore = Boolean(e.service && previousService && e.service.slug === previousService.slug);
  if (e.service && !isQuestionText(raw, t)) state.lastTopicText = raw.slice(0, 200);

  if (e.service) {
    const changedService = e.service.label !== state.slots.serviceLabel;
    state.topicSlug = e.service.slug ?? state.topicSlug;
    if (!isQuestion || state.leadMode || !state.slots.serviceLabel) {
      if (changedService) slotsChanged = true;
      state.slots.serviceLabel = e.service.label;
      state.slots.serviceSlug = e.service.slug;
    }
    if (!isQuestion && raw.split(/\s+/).length >= 3 && !e.phone && !e.email) {
      state.slots.problem =
        state.slots.problem && state.slots.problem !== raw ? `${state.slots.problem} ${raw}`.slice(-600) : raw;
    }
  } else if (expecting === 'problem' && raw.split(/\s+/).length >= 2 && !e.affirm && !e.deny) {
    state.slots.problem = raw;
    state.slots.serviceLabel ??= 'Service request';
    slotsChanged = true;
  }

  if (e.phone && e.phone !== state.slots.phone) {
    if (state.slots.phone) ack.push(`Updated your number to ${e.phone}.`);
    state.slots.phone = e.phone;
    slotsChanged = true;
  }
  if (e.email && e.email !== state.slots.email) {
    if (state.slots.email) ack.push(`Updated your email to ${e.email}.`);
    else if (expecting !== 'email') ack.push("Thanks, I've noted your email.");
    state.slots.email = e.email;
    slotsChanged = true;
  }
  if (
    e.name &&
    e.name !== state.slots.name &&
    (expecting === 'name' || !state.slots.name || /\b(my name is|name is|call me)\b/i.test(raw))
  ) {
    const wasSet = Boolean(state.slots.name);
    state.slots.name = e.name;
    slotsChanged = true;
    ack.push(
      wasSet
        ? `Got it, I'll put ${e.name}.`
        : pick(
            [
              `Nice to meet you, ${firstName(e.name)}!`,
              `Thanks, ${firstName(e.name)}!`,
              `Great, thanks ${firstName(e.name)}.`
            ],
            seed
          )
    );
  }
  if (e.city) {
    const city = cityFromMatch(e.city);
    if (city !== state.slots.city) {
      state.slots.city = city;
      slotsChanged = true;
      if (expecting === 'city' || (state.leadMode && !intents.has('area'))) {
        ack.push(
          e.city.kind === 'nearby' || (e.city.kind === 'zip' && !e.city.name)
            ? `${city} - I'll note that, and the team will confirm it's in our area.`
            : pick(
                [
                  `${city}, perfect - that's in our area.`,
                  `Great, we serve ${e.city.kind === 'zip' ? e.city.name : city}.`
                ],
                seed
              )
        );
      }
    }
  } else if (
    expecting === 'city' &&
    !e.affirm &&
    !e.deny &&
    !/\d{4,}/.test(t) &&
    t.split(' ').length <= 4 &&
    !e.service
  ) {
    state.slots.city = raw.replace(/[.!?]+$/, '').replace(/\b\w/g, (c) => c.toUpperCase());
    slotsChanged = true;
  }
  if (e.propertyType) state.slots.propertyType = e.propertyType;
  if (e.urgent !== undefined) state.slots.urgent = e.urgent;
  if (expecting === 'urgency' && e.urgent === undefined) {
    if (e.affirm || /\bemergency\b/.test(t)) state.slots.urgent = true;
    else if (e.deny || /\b(wait|later|scheduled|schedule)\b/.test(t)) state.slots.urgent = false;
  }
  if (expecting === 'email' && !e.email && (e.skip || e.deny)) state.askedEmail = true;

  // ---- Cancel / start over ---------------------------------------------------
  const cancelled =
    intents.has('cancel') &&
    (state.leadMode || Boolean(expecting) || /\b(start over|restart)\b/.test(t)) &&
    !e.phone &&
    !e.service;
  if (cancelled) {
    const restart = /\b(start over|restart)\b/.test(t);
    state.leadMode = false;
    state.leadShown = false;
    if (restart) {
      Object.assign(state, initialState(), {
        turn: state.turn,
        pageSlug: state.pageSlug,
        topicSlug: state.pageSlug,
        leadSent: state.leadSent
      });
    } else {
      state.declinedOffer = true;
    }
    parts.push(
      restart
        ? "No problem, let's start fresh. What can I help you with?"
        : "No problem, I've cancelled that. Anything else I can help with?"
    );
  }

  // ---- 2. Emergencies first ------------------------------------------------
  if (e.emergency || (intents.has('emergencyWord') && !e.service && !state.leadMode && t.split(' ').length <= 6)) {
    const type = e.emergency ?? 'general';
    state.slots.urgent = true;
    parts.push(`${EMERGENCY_ADVICE[type]} **${phone}**.`);
    if (!state.leadMode && !state.leadSent) {
      parts.push("If you can't call right now, I can take your details and have someone call you back.");
      state.expecting = 'offer';
      state.offers += 1;
      quickReplies = ['Have someone call me'];
    }
  }

  // ---- 3. Wanting service turns on lead collection -------------------------
  if (expecting === 'offer') {
    if (
      !cancelled &&
      (e.affirm || e.phone || e.name || intents.has('booking') || e.urgent !== undefined || (e.city && !isQuestion))
    )
      state.leadMode = true;
    else if (e.deny) {
      state.declinedOffer = true;
      parts.push(
        pick(
          [
            "No problem at all. I'm happy to just answer questions.",
            'Sure thing, no pressure. What else would you like to know?'
          ],
          seed
        )
      );
    }
  }
  if (
    !state.leadSent &&
    !intents.has('cancel') &&
    (intents.has('booking') ||
      (e.phone && !state.leadMode) ||
      /\b(have someone call me|yes call me|call me back)\b/.test(t))
  ) {
    state.leadMode = true;
  }
  if (state.leadMode && !state.slots.serviceLabel) {
    const known = serviceBySlug(assistant, state.topicSlug);
    if (known) {
      state.slots.serviceLabel = known.title;
      state.slots.serviceSlug = known.slug;
    }
  }
  if (
    expecting === 'offer' &&
    !state.leadMode &&
    !state.declinedOffer &&
    !e.affirm &&
    !e.deny &&
    t.split(' ').length <= 2 &&
    !intents.size &&
    !e.service &&
    !e.city
  ) {
    parts.push('Sorry, just to check - would you like someone to give you a call? (Yes or no is fine.)');
    state.expecting = 'offer';
    quickReplies = ['Yes, call me', 'No thanks'];
  }

  // ---- 4. Answer what they asked --------------------------------------------
  const answered = new Set<string>();
  const topic = serviceBySlug(assistant, e.service?.slug ?? state.topicSlug);
  const pureSmallTalk = !e.service && !e.city && !e.phone && !e.email && !e.emergency;

  if (!e.emergency) {
    if (intents.has('greeting') && state.turn <= 2 && parts.length === 0) {
      answered.add('greeting');
      const nameAck = e.name && ack.length === 1 && !previous.slots.name && state.slots.name === e.name;
      if (nameAck && (pureSmallTalk || !e.service) && !intents.has('howAreYou') && !state.leadMode) {
        ack.length = 0;
        parts.push(
          pick(
            [
              `Hi ${firstName(e.name)}, nice to meet you! What's going on at your place today?`,
              `Hey ${firstName(e.name)}, great to meet you! What can I help you with?`
            ],
            seed
          )
        );
      } else if (pureSmallTalk && t.split(' ').length <= 4 && !intents.has('howAreYou')) {
        parts.push(
          pick(
            [
              "Hey there! 👋 What's going on at your place today?",
              'Hi! Good to hear from you. What can I help you with?',
              'Hello! How can I help today - something need fixing?'
            ],
            seed
          )
        );
      } else {
        parts.push(pick(['Hi there!', 'Hey!', 'Hello!'], seed));
      }
    }
    if (intents.has('howAreYou')) {
      answered.add('howAreYou');
      parts.push(
        pick(
          [
            "I'm doing great, thanks for asking! How about you - anything giving you trouble at home?",
            'Doing well, thank you! What can I help you with today?',
            "Can't complain! I'm here and ready to help. What's going on?"
          ],
          seed
        )
      );
    } else if (intents.has('feelingReply') && pureSmallTalk && !state.leadMode) {
      answered.add('feeling');
      parts.push(
        pick(
          ['Glad to hear it! Is there anything I can help you with today?', 'Good to hear. What can I do for you?'],
          seed
        )
      );
    }
    if (intents.has('whoAreYou')) {
      answered.add('who');
      parts.push(
        `I'm ${k.business.shortName}'s virtual assistant, not a person, but I know our services, service area, coupons, and a lot of home-repair tips. For a real person, call **${phone}** anytime - someone answers 24/7.`
      );
    }
    if (intents.has('human') && !intents.has('whoAreYou')) {
      answered.add('human');
      parts.push(
        `Of course. You can reach a real person any time at **${phone}**, day or night.${state.leadSent ? '' : ' Or I can take your name and number and have someone call you.'}`
      );
      if (!state.leadMode && !state.leadSent) {
        state.expecting = 'offer';
        state.offers += 1;
        quickReplies = ['Have someone call me', "I'll call"];
      }
    }
    if (intents.has('frustrated')) {
      answered.add('frustrated');
      parts.push(
        `I'm sorry about that - I'm still just a website assistant. The fastest way to get real help is to call **${phone}**, and a person will pick up.`
      );
    }
    if (intents.has('contactEmail')) {
      answered.add('contactEmail');
      parts.push(
        `You can email us at [${k.business.email}](mailto:${k.business.email}). For anything urgent, calling **${phone}** is faster.`
      );
    }
    if (intents.has('about')) {
      answered.add('about');
      parts.push(
        `${k.business.name} is a local, licensed plumbing, HVAC, and electrical company based in Colorado Springs, serving the Pikes Peak region 24/7. I don't have details about ownership in this chat, but the team is happy to tell you more at **${phone}**. [About us](/about-us/)`
      );
    }
    if (intents.has('duration')) {
      answered.add('duration');
      parts.push(
        `It depends on the job. Many repairs are wrapped up in a single visit, while bigger projects${topic ? ` like ${topic.title.toLowerCase()}` : ' like a full system install'} can take longer. Your technician will give you a clear timeline along with the free quote.`
      );
    }
    if (intents.has('septicPumping')) {
      answered.add('septic');
      parts.push(
        "We don't pump or service septic tanks, sorry. What we do handle is the plumbing side - clogged drains, sewer and main lines, and camera inspections of the line to your tank. [Sewer repair](/services/sewer-repair-colorado-springs/)"
      );
    }
    if (intents.has('address')) {
      answered.add('address');
      parts.push(
        `Our office is at ${k.business.address}. Most work happens at your home or business, though - we come to you.`
      );
    }
    if (intents.has('hours')) {
      answered.add('hours');
      parts.push(
        pick(
          [
            `We're open 24 hours a day, 7 days a week - nights, weekends, and holidays too - and a real person answers at ${phone}.`,
            `Anytime! We're available 24/7, including weekends and holidays. Just call ${phone}.`
          ],
          seed
        )
      );
    }
    if (intents.has('responseTime') && !answered.has('hours') && !intents.has('duration')) {
      answered.add('responseTime');
      parts.push(
        `We're available around the clock. Exact timing depends on the schedule, so I don't want to promise a time here - the quickest way to find out is to call **${phone}**.${state.slots.urgent ? " Since it's urgent, please call now." : ''}`
      );
    }
    if (intents.has('freeEstimate')) {
      answered.add('freeEstimate');
      parts.push(
        "Yes, estimates are free and there's no obligation. We'll explain the cost clearly before any work begins."
      );
    } else if (intents.has('pricing')) {
      answered.add('pricing');
      const name = topic ? topic.title.toLowerCase() : 'a job';
      parts.push(
        `Honestly, the price for ${name} depends on what's actually wrong, so I can't give an accurate number in chat. What I can promise is a **free, upfront quote before any work starts** - no surprises.${couponLine(assistant, env, topic?.slug)}`
      );
      if (!state.leadMode && !state.leadSent && state.offers < 2) {
        parts.push('Want me to have someone call you with a quote?');
        state.expecting = 'offer';
        state.offers += 1;
        quickReplies = ['Yes, get me a quote', 'Not right now'];
      }
    }
    if (
      intents.has('area') ||
      (e.city && !state.leadMode && pureSmallTalk === false && !e.service && !e.phone && expecting !== 'city')
    ) {
      answered.add('area');
      parts.push(areaAnswer(assistant, e.city));
    }
    if (intents.has('licensing')) {
      answered.add('licensing');
      parts.push(
        `Yes, we're fully licensed and insured: electrical ${k.business.licenses.electrical}, plumbing ${k.business.licenses.plumbing}, and mechanical ${k.business.licenses.mechanical}.`
      );
    }
    if (intents.has('financing')) {
      answered.add('financing');
      parts.push(
        `Yes! We offer financing through ${k.financing.partner} - projects up to $55,000, a quick digital application, and checking your offers is a soft credit pull that won't affect your score. [Financing details](/financing/)`
      );
    }
    if (intents.has('paymentMethods') && !answered.has('financing')) {
      answered.add('payment');
      parts.push(
        `I don't have the list of payment methods in front of me, so please ask the team when you call ${phone}. Financing is also available if that helps. [Financing](/financing/)`
      );
    }
    if (intents.has('coupons')) {
      answered.add('coupons');
      const list = activeCoupons(assistant, env);
      const specific = /\b(senior|seniors|military|veteran|veterans|second opinion)\b/.test(t)
        ? list.filter((c) => (/second opinion/.test(t) ? /second opinion/i : /senior|military/i).test(c.title))
        : [];
      if (specific.length) {
        parts.push(
          `Yes! ${specific.map((c) => `**${c.title}** - ${c.description}`).join(' ')} Just mention it to your technician. [See all coupons](/coupons/)`
        );
      } else if (list.length) {
        parts.push(
          `Here's what's running right now:\n${list.map((c) => `- **${c.title}** - ${c.description}`).join('\n')}\n\nJust show the coupon to your technician at the time of service. [See all coupons](/coupons/)`
        );
      } else {
        parts.push(
          `There aren't any printed coupons running at the moment, but ask about current specials when you call ${phone}.`
        );
      }
    }
    if (intents.has('careers')) {
      answered.add('careers');
      parts.push(
        `We're hiring! We're looking for certified HVAC technicians, electricians, experienced plumbers, and apprentices, with benefits like paid time off, health and dental insurance, and a 401(k). Stop by the office or email your resume to ${k.business.email}. [Careers](/careers/)`
      );
    }
    if (intents.has('commercial')) {
      answered.add('commercial');
      parts.push(
        'Yes, we work on both homes and businesses, including commercial HVAC. [Commercial HVAC](/services/commercial-hvac-colorado-springs/)'
      );
    }
    if (intents.has('warranty')) {
      answered.add('warranty');
      parts.push(
        `We stand behind our work with a 100% satisfaction guarantee. Warranty details depend on the job and the equipment, so the team will walk you through them with your quote.`
      );
    }
    if (intents.has('reviews')) {
      answered.add('reviews');
      parts.push(
        `I can't pull up reviews in this chat, but you can see what neighbors say on our [Facebook page](${k.business.facebook}) - and we back every job with a satisfaction guarantee.`
      );
    }
    if (intents.has('brands') && !answered.has('pricing')) {
      answered.add('brands');
      parts.push(
        "Our technicians work on all the major brands. If you're asking about a specific brand or model, mention it when you call and the team will confirm."
      );
    }
    if (intents.has('servicesList')) {
      answered.add('services');
      parts.push(
        'We do it all under one roof:\n- **Plumbing** - leaks, drains, water heaters, toilets, water lines\n- **Heating & cooling** - furnaces, AC, heat pumps, boilers, mini splits\n- **Electrical** - repairs, panel upgrades, EV chargers, generators, lighting\n- **Sewer & drain** - sewer repair, hydro jetting, trenchless repair\n\n[See all services](/services/)'
      );
    }
    if (e.outOfScope && !answered.size) {
      answered.add('outOfScope');
      parts.push(
        `We don't do ${e.outOfScope}, unfortunately - we stick to plumbing, heating, cooling, electrical, and sewer work. If anything in those areas comes up, I'm happy to help!`
      );
    }
    if (intents.has('joke') && !answered.size) {
      answered.add('joke');
      parts.push(
        pick(
          [
            'Why did the plumber break up with the toilet? It was a relationship that just went down the drain. 😄 Anything I can actually help with?',
            "What do you call a plumber who's also a magician? A drain-illusionist. 🙂 Now, anything need fixing?"
          ],
          seed
        )
      );
    }
    if (intents.has('weather') && !answered.size) {
      answered.add('weather');
      parts.push(
        "I can't check the forecast from here, but Colorado weather keeps our furnaces and ACs busy either way! Anything at home you're worried about?"
      );
    }
    if (
      intents.has('thanks') &&
      !answered.has('feeling') &&
      !intents.has('bye') &&
      !e.deny &&
      !(expecting === 'offer')
    ) {
      answered.add('thanks');
      parts.push(
        pick(
          [
            "You're very welcome! Anything else I can help with?",
            'Happy to help! Let me know if anything else comes up.',
            'Anytime!'
          ],
          seed
        )
      );
    }
    if (intents.has('bye') && !state.leadMode) {
      answered.add('bye');
      const thanked = intents.has('thanks') ? 'You bet! ' : '';
      parts.push(
        thanked +
          pick(
            [
              `Take care! If anything comes up, we're here 24/7 at ${phone}.`,
              `Have a great day! Call ${phone} anytime.`
            ],
            seed
          )
      );
    }
    if (intents.has('test') && !answered.size) {
      answered.add('test');
      parts.push("Test received loud and clear! 🙂 I'm here - what can I help with?");
    }
  }

  // ---- 5. A described problem or a service question -------------------------
  if (!e.emergency && e.service && !answered.has('pricing') && !answered.has('freeEstimate')) {
    const svc = serviceBySlug(assistant, e.service.slug);
    if (isQuestion && !intents.has('howTo')) {
      answered.add('serviceQuestion');
      parts.push(
        svc
          ? `Yes, we do ${svc.title.toLowerCase()}! ${svc.description} [${svc.title}](${svc.url})`
          : `Yes, that's something we handle. [See our services](/services/)`
      );
    } else if (!isQuestion && !state.leadMode) {
      answered.add('problem');
      const empathy =
        /\b(leak\w*|flood\w*|burst\w*|no heat|no hot water|not working|broke\w*|will not|stopped|clog\w*|backed up|smell\w*|nois\w*|tripp\w*|freezing|cold|hot|dripp\w*|overflow\w*)\b/.test(
          t
        )
          ? pick(
              [
                "Oh no, sorry you're dealing with that.",
                "Ugh, that's no fun - let's get it taken care of.",
                "That sounds frustrating. You're in the right place."
              ],
              seed
            )
          : pick(['Got it.', 'Okay, we can help with that.'], seed);
      if (sameServiceAsBefore && previous.slots.serviceLabel) {
        parts.push(`${empathy} Thanks for the extra detail - that helps the technician come prepared.`);
      } else
        parts.push(
          `${empathy} ${svc ? `That's our **${svc.title.toLowerCase()}** team's specialty. [${svc.title}](${svc.url})` : `That's right up our ${e.service.label.toLowerCase()} team's alley. [${e.service.label}](${CATEGORY_HUB[e.service.familyId] ?? '/services/'})`}`
        );
    }
    if (answered.has('serviceQuestion') && e.city && !answered.has('area')) {
      answered.add('area');
      parts.push(
        e.city.kind === 'area' || (e.city.kind === 'zip' && e.city.name)
          ? `And yes, we serve ${e.city.kind === 'zip' ? e.city.name : e.city.name}.`
          : areaAnswer(assistant, e.city)
      );
    }
    if (
      (answered.has('serviceQuestion') || answered.has('problem')) &&
      !state.leadMode &&
      !state.leadSent &&
      !state.declinedOffer &&
      state.offers < 2 &&
      !state.expecting
    ) {
      parts.push(
        state.slots.urgent
          ? `Since it's urgent, calling **${phone}** is fastest. Or want me to have someone call you?`
          : previous.expecting === 'offer'
            ? 'Would you like a technician to come check it out?'
            : 'Want me to have someone give you a call to take a look?'
      );
      state.expecting = 'offer';
      state.offers += 1;
      quickReplies = ['Yes, call me', 'I just have questions'];
    }
  }

  if (
    !e.emergency &&
    e.service &&
    state.leadMode &&
    !isQuestion &&
    !answered.has('problem') &&
    previous.slots.serviceLabel !== state.slots.serviceLabel
  ) {
    const svc = serviceBySlug(assistant, e.service.slug);
    ack.push(
      /\b(no heat|freezing|cold)\b/.test(t)
        ? "Sorry you're without heat - let's get someone headed your way."
        : /\b(leak\w*|flood\w*|burst\w*)\b/.test(t)
          ? "Sorry about the leak - let's get it handled."
          : `Got it, ${svc ? svc.title.toLowerCase() : e.service.label.toLowerCase()}.`
    );
  }

  // ---- 6. How-to and anything else: search the site's content -------------
  const needsSearch =
    !state.leadMode &&
    (intents.has('howTo') || (answered.size === 0 && !e.city && !e.phone && !e.name && expecting !== 'city'));
  if (needsSearch && !e.emergency && !answered.has('serviceQuestion')) {
    const followUp = Boolean(state.lastTopicText) && !e.service && /\b(that|this|it|they|those|them)\b/.test(t);
    const query = followUp ? `${state.lastTopicText} ${raw}` : raw;
    const hits = assistant.search.search(query, 2);
    const top = hits[0];
    const queryTermCount = assistant.search.queryTerms(query).length;
    const confident =
      top &&
      (queryTermCount >= 3
        ? top.coverage >= 0.5 && top.score >= 5
        : queryTermCount === 2
          ? top.coverage === 1 && top.score >= 5
          : top.coverage === 1 && top.score >= 9);
    if (top && confident) {
      answered.add('search');
      const { doc } = top;
      const lead =
        doc.kind === 'article'
          ? pick(['Good question.', "Here's what our techs usually say:", 'Great question!'], seed)
          : '';
      const link = doc.url
        ? ` [${doc.kind === 'article' ? `Read more: ${doc.linkLabel}` : doc.linkLabel}](${doc.url})`
        : '';
      // For "how do I..." questions landing on an article's intro, the useful
      // answer is the article's steps, so list its section headings.
      const steps =
        doc.kind === 'article' && /\b(how|tips|steps|ways|prepare|prevent|what should)\b/.test(t)
          ? assistant.knowledge.articles
              .filter((a) => a.url === doc.url && a.heading !== 'Overview')
              .map((a) => a.heading.replace(/^\d+[.)]\s*/, ''))
          : [];
      if (steps.length >= 3 && doc.title.endsWith('Overview')) {
        parts.push(
          `${doc.kind === 'article' ? 'Good question!' : ''} Here are the main things our guide covers:\n${steps
            .slice(0, 6)
            .map((h) => `- ${h}`)
            .join('\n')}${link ? `\n\n${link.trim()}` : ''}`.trim()
        );
      } else {
        parts.push(`${lead} ${doc.answer}${link}`.trim());
      }
      if (/\b(gas|electrical panel|wiring|breaker|refrigerant|sewer line)\b/.test(t)) {
        parts.push(
          "For anything involving gas, wiring, or the electrical panel, please leave it to a licensed pro - it's not worth the risk."
        );
      }
      if (!state.leadSent && !state.declinedOffer && state.offers < 2 && doc.kind !== 'faq' && !state.expecting) {
        parts.push('If you want, I can have a technician take a look.');
        state.expecting = 'offer';
        state.offers += 1;
        quickReplies = ['Yes, have someone call', 'No thanks'];
      }
    }
  }

  if (!state.leadMode && !parts.length && e.urgent === true && !answered.size && t.split(' ').length <= 4) {
    answered.add('urgent');
    parts.push(
      `Understood, it's urgent. The fastest way to get help is to call **${phone}** right now - a real person answers 24/7. I can also take your details for a callback.`
    );
    state.expecting = 'offer';
    state.offers += 1;
    quickReplies = ['Have someone call me'];
  }

  // ---- 7. Collect details for a service request ----------------------------
  let lead: LeadDraft | undefined;
  if (state.leadMode && !state.leadSent) {
    const s = state.slots;
    if (e.invalidPhone && !e.phone) {
      parts.push("Hmm, that phone number doesn't look complete. Could you send it again with the area code?");
      state.expecting = 'phone';
    } else if (expecting === 'phone' && !s.phone && !e.phone) {
      parts.push(
        `I'll need a phone number so the team can reach you - area code included. (Or you can call us at ${phone}.)`
      );
      state.expecting = 'phone';
    } else if (!s.serviceLabel && !s.problem) {
      parts.push(
        pick(
          [
            "Happy to set that up. What's going on - what do you need help with?",
            "Let's get you on the schedule. What's the problem you're running into?"
          ],
          seed
        )
      );
      state.expecting = 'problem';
      quickReplies = ['Plumbing', 'Heating or AC', 'Electrical', 'Drain or sewer'];
    } else if (s.urgent === undefined && !state.askedUrgency) {
      state.askedUrgency = true;
      const intro =
        !previous.leadMode && !parts.length && !ack.length
          ? `${pick(['Happy to set that up!', "Sure, let's get you taken care of."], seed)} `
          : '';
      parts.push(`${intro}Is this an emergency, or can it wait for a scheduled visit?`);
      state.expecting = 'urgency';
      quickReplies = ["It's an emergency", 'It can wait'];
    } else if (!s.city && !state.askedCity) {
      state.askedCity = true;
      parts.push(pick(['What city or ZIP code is the job in?', 'And where is the job - what city or ZIP?'], seed));
      state.expecting = 'city';
    } else if (!s.name) {
      parts.push(pick(["What's your name?", 'Who should the technician ask for?', 'And your name?'], seed));
      state.expecting = 'name';
    } else if (!s.phone) {
      parts.push(`What's the best phone number to reach you, ${firstName(s.name)}?`);
      state.expecting = 'phone';
    } else if (!s.email && !state.askedEmail) {
      state.askedEmail = true;
      parts.push('Want a confirmation by email? Send your email address, or tap skip.');
      state.expecting = 'email';
      quickReplies = ['Skip'];
    } else if (!state.leadShown || slotsChanged) {
      lead = leadDraft(state);
      state.leadShown = true;
      parts.push(
        s.urgent
          ? `Here's everything I've got. Tap **Send** and the team gets it right away - and since it's urgent, calling **${phone}** is the fastest way to reach someone.`
          : "Here's everything I've got. Give it a quick look and tap **Send**, and the team will call you."
      );
    } else if (!answered.size) {
      parts.push(
        "Your details are in the card above - just tap **Send** when you're ready. If anything's wrong, tell me what to change."
      );
    }
  }

  // ---- 8. Nothing matched --------------------------------------------------
  if (ack.length) parts.unshift(ack.join(' '));
  if (parts.length > 1 && /^(Hi there!|Hey!|Hello!)$/.test(parts[0])) parts.splice(0, 2, `${parts[0]} ${parts[1]}`);
  if (parts.length === 0) {
    state.misunderstood += 1;
    if (e.city) parts.push(areaAnswer(assistant, e.city));
    else if (state.misunderstood >= 2) {
      parts.push(
        `I'm sorry, I'm not sure I'm getting it. A real person can definitely help at **${phone}** (24/7). Or try asking about a specific problem, like "my water heater is leaking" or "do you install EV chargers?"`
      );
    } else {
      parts.push(
        pick(
          [
            "Hmm, I'm not quite sure what you mean. Could you tell me a bit more about what's going on?",
            "Sorry, I didn't quite catch that. Is this about plumbing, heating and cooling, electrical, or something else?"
          ],
          seed
        )
      );
      quickReplies = ['Plumbing', 'Heating or AC', 'Electrical', 'Talk to a person'];
    }
  } else {
    state.misunderstood = 0;
  }

  if (!quickReplies && !state.expecting && !lead)
    quickReplies = state.leadSent ? ['Any coupons?', 'Your hours', 'Talk to a person'] : DEFAULT_QUICK_REPLIES;

  return {
    state,
    reply: {
      text: parts
        .join('\n\n')
        .replace(/[ \t]+\n/g, '\n')
        .trim(),
      quickReplies,
      lead
    }
  };
}
