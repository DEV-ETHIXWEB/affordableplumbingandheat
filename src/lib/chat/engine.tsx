import type { ReactNode } from 'react';
import { Phone } from 'lucide-react';
import { business } from '../../data/business';
import { findBestMatch } from './knowledge';

// Conversation state carried across turns in a single chat session. Nothing
// here is persisted between sessions, it just lets the bot avoid repeating
// itself and decide *when* it's appropriate to ask for contact info, instead
// of asking on every single message.
export type ChatContext = {
  turns: number;
  topicsDiscussed: string[];
  urgent: boolean;
  substantiveReplies: number;
  leadOffered: boolean;
  leadDeclined: boolean;
  leadSubmitted: boolean;
};

export const initialChatContext: ChatContext = {
  turns: 0,
  topicsDiscussed: [],
  urgent: false,
  substantiveReplies: 0,
  leadOffered: false,
  leadDeclined: false,
  leadSubmitted: false
};

export type SmartReplyResult = {
  content: ReactNode;
  nextContext: ChatContext;
  /** Short plain-text summary for the lead email transcript (bot replies are rich JSX, not plain strings). */
  logLabel: string;
  /** True when this is a good moment to invite the visitor into the lead-capture flow. */
  offerLeadCapture?: boolean;
  /** True when explicit booking/estimate intent was detected: the widget
   * should launch the guided estimate wizard (service -> urgency -> city ->
   * issue -> contact info) instead of the plain name/phone offer. */
  startWizard?: boolean;
};

const EMERGENCY_RE =
  /\b(emergen(cy|c)|urgent|urgant|flood|flooding|flooded|sewage|overflow|overflowing|burst|bursted|busted pipe|broken pipe|pipe broke|gushing|spraying water|water everywhere|water all over|basement flooding|ceiling leak|no heat|no water at all|smell gas|gas smell|sparking|right now|right away|asap|help fast|need (someone|help) now)\b/i;
const GREETING_RE =
  /^\s*(hi+|hello|hey+|yo|sup|howdy|good morning|good afternoon|good evening|morning|afternoon|evening)\b/i;
const THANKS_RE =
  /\b(thank(s|you)?|thank you|thnx|thx|ty|appreciate it|appreciated|much appreciated|awesome thanks)\b/i;
const BYE_RE =
  /\b(bye|goodbye|good bye|see ya|see you|later|talk later|gotta go|have to go|im (done|good|all set)|that'?s all|nothing else|no more questions)\b/i;
const HUMAN_RE =
  /\b(real person|real human|human|actual person|talk to someone|speak to someone|speak with someone|representative|rep\b|agent|dispatcher|call you|your number|phone number|contact info|talk to a manager|customer service)\b/i;
const BOOKING_RE =
  /free estimate|get an? (estimate|quote)|\bquote\b|\bschedule\b|\bscheduel\b|\bbook\b|\bbooking\b|callback|call me back|come out|come take a look|send (someone|a tech|a technician)|set up an appointment|make an appointment|need an appointment|how much (will|does) (it|this|that) cost|sign me up|i(?:'|)?d like (to|a) (schedule|book|estimate)|can someone come/i;

const PHONE_RE = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

/** Picks a phone number or email address a visitor typed unprompted, so the bot can react without being asked. */
export function detectContactInfo(text: string): { phone?: string; email?: string } {
  const phoneMatch = text.match(PHONE_RE);
  const emailMatch = text.match(EMAIL_RE);
  return {
    phone: phoneMatch?.[0]?.trim(),
    email: emailMatch?.[0]?.trim()
  };
}

export function isValidName(value: string): boolean {
  return value.trim().length >= 2;
}
export function isValidPhone(value: string): boolean {
  return value.replace(/\D/g, '').length >= 7;
}
export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

function emergencyReply(): ReactNode {
  return (
    <>
      <p>
        Got it, that sounds urgent. Call our 24/7 emergency line right now, a live person answers around the clock.
      </p>
      <a
        href={`tel:${business.hotline.tel}`}
        className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-orange-600 px-4 py-2 text-sm font-bold text-white"
      >
        <Phone className="h-3.5 w-3.5" /> {business.hotline.display}
      </a>
    </>
  );
}

function humanReply(): ReactNode {
  return (
    <>
      Of course. Call {business.hotline.display} any time, a real person picks up, not a robot. Or I can grab your
      info right here and have someone call you back.
    </>
  );
}

function bookingReply(): ReactNode {
  return (
    <>
      Happy to help, let&rsquo;s get you an estimate. I&rsquo;ll ask a few quick questions and pass everything to our
      team, or if you&rsquo;d rather,{' '}
      <a href="/contact-us/" className="font-semibold text-orange-600 hover:text-orange-700">
        open the full request form
      </a>{' '}
      instead.
    </>
  );
}

function fallbackReply(): ReactNode {
  return (
    <>
      I&rsquo;m not sure I have a good answer for that one, best to ask a real person. Call {business.hotline.display}
      , or I can take your name and number and have someone follow up.
    </>
  );
}

export function getGreetingSmalltalkReply(): ReactNode {
  return <>Hey! What can I help with, a service question, your area, pricing, or connecting you to a person?</>;
}

// Small reply pools for high-frequency smalltalk intents, picked by turn
// count so a visitor who says "thanks" twice in one session doesn't see the
// exact same sentence twice.
const THANKS_REPLIES: ReactNode[] = [
  <>You&rsquo;re welcome! Anything else I can help with?</>,
  <>Anytime! Let me know if anything else comes up.</>,
  <>Happy to help. Anything else on your mind?</>
];

function byeReplies(): ReactNode[] {
  return [
    <>Take care! Call {business.hotline.display} any time if something comes up.</>,
    <>Sounds good, have a great one. We&rsquo;re here 24/7 at {business.hotline.display} if you need us.</>,
    <>Talk soon! {business.hotline.display} if anything comes up, day or night.</>
  ];
}

function pick<T>(pool: T[], turns: number): T {
  return pool[turns % pool.length];
}

/**
 * Core reply function. Not an LLM: a small rule engine that checks
 * safety-critical intents first (emergency, human handoff, booking), then
 * falls back to the keyword-scored knowledge base built from the site's own
 * service, FAQ, coupon, and service-area content. `offerLeadCapture` tells
 * the widget it's a good moment to invite the visitor into the guided lead
 * form: it fires on explicit booking intent right away, or organically
 * after a few real answers, and never more than once per session unless the
 * visitor re-asks.
 */
export function getSmartReply(
  text: string,
  ctx: ChatContext,
  pageContextTopic: string | null = null
): SmartReplyResult {
  const nextContext: ChatContext = { ...ctx, turns: ctx.turns + 1 };
  const canOfferExplicit = !ctx.leadSubmitted;
  const canOfferOrganic = !ctx.leadOffered && !ctx.leadDeclined && !ctx.leadSubmitted;

  if (EMERGENCY_RE.test(text)) {
    nextContext.urgent = true;
    nextContext.substantiveReplies += 1;
    return { content: emergencyReply(), nextContext, logLabel: 'Gave emergency call-now instructions' };
  }

  if (ctx.turns === 0 && GREETING_RE.test(text) && text.trim().split(/\s+/).length <= 4) {
    return { content: getGreetingSmalltalkReply(), nextContext, logLabel: 'Greeted the visitor' };
  }
  if (THANKS_RE.test(text)) {
    return {
      content: pick(THANKS_REPLIES, ctx.turns),
      nextContext,
      logLabel: 'Acknowledged thanks'
    };
  }
  if (BYE_RE.test(text)) {
    return {
      content: pick(byeReplies(), ctx.turns),
      nextContext,
      logLabel: 'Said goodbye'
    };
  }

  if (BOOKING_RE.test(text)) {
    nextContext.substantiveReplies += 1;
    return {
      content: bookingReply(),
      nextContext,
      logLabel: 'Offered the guided estimate wizard',
      startWizard: canOfferExplicit
    };
  }

  if (HUMAN_RE.test(text)) {
    nextContext.substantiveReplies += 1;
    return {
      content: humanReply(),
      nextContext,
      logLabel: 'Gave phone contact info',
      offerLeadCapture: canOfferExplicit
    };
  }

  const match = findBestMatch(text, undefined, pageContextTopic);
  if (match) {
    nextContext.substantiveReplies += 1;
    const isFirstMention = !ctx.topicsDiscussed.includes(match.topic);
    if (isFirstMention) {
      nextContext.topicsDiscussed = [...nextContext.topicsDiscussed, match.topic];
    }
    const shouldOffer = canOfferOrganic && nextContext.substantiveReplies >= 3;
    return {
      content: match.reply({ isFirstMention }),
      nextContext,
      logLabel: match.logLabel,
      offerLeadCapture: shouldOffer
    };
  }

  return { content: fallbackReply(), nextContext, logLabel: "Didn't have a direct answer, suggested calling" };
}
