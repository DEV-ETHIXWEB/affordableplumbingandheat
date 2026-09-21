import { z } from 'zod';

// Zod 4 probes for `new Function` to JIT-compile object parsers. The site's
// CSP (rightly) forbids eval, so every page with a form logged a CSP
// violation in Firefox before Zod fell back. Jitless mode skips the probe.
z.config({ jitless: true });

/** Sentinel `service` value that reveals the free-text "what do you need?" field. */
export const OTHER_SERVICE = 'Something else / Not sure';

/** Field limits shared by the forms, the chatbot, and POST /api/lead, so a
 * value one of them accepts is never rejected by another. */
export const LEAD_LIMITS = {
  name: 120,
  phone: 30,
  email: 200,
  city: 100,
  service: 120,
  propertyType: 40,
  message: 2000,
  topicsDiscussed: 500,
  transcript: 6000,
  summary: 1000,
  pageUrl: 200
} as const;

const PHONE_EXTENSION = /\s*(?:x|ext\.?|extension)\s*\d{1,6}$/i;

/** Accepts the ways people actually type a phone number - "(719) 555-0100",
 * "719.555.0100", "+1 719 555 0100", "719-555-0100 ext 2" - but requires 10
 * to 15 real digits, so "-------" or a 7-digit fragment can't be submitted as
 * a callback number. */
export function isValidPhoneNumber(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > LEAD_LIMITS.phone) return false;
  const main = trimmed.replace(PHONE_EXTENSION, '');
  if (!/^[\d\s().+-]+$/.test(main)) return false;
  const digits = main.replace(/\D/g, '').length;
  return digits >= 10 && digits <= 15;
}

const emailFormat = z.email();

export function isValidEmailAddress(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length <= LEAD_LIMITS.email && emailFormat.safeParse(trimmed).success;
}

const phoneField = (message: string) =>
  z.string().trim().max(LEAD_LIMITS.phone, message).refine(isValidPhoneNumber, message);

const emailField = (message: string) => z.string().trim().max(LEAD_LIMITS.email, message).pipe(z.email(message));

export const contactSchema = z
  .object({
    name: z.string().trim().min(2, 'Please enter your full name.').max(LEAD_LIMITS.name),
    phone: phoneField('Enter a valid phone number, including area code.'),
    email: emailField('Enter a valid email address.'),
    city: z.string().trim().min(2, 'Please enter your city.').max(LEAD_LIMITS.city),
    // The message is attached to the type check as well as `.min(1)`: a radio
    // group with nothing selected yields null, which never reaches `.min()`.
    service: z.string({ message: 'Please select a service.' }).min(1, 'Please select a service.'),
    otherService: z.string().trim().max(80, 'Keep it under 80 characters.').optional(),
    message: z.string().trim().min(10, 'Tell us a bit more about the issue (10+ characters).').max(LEAD_LIMITS.message),
    // Honeypot: real visitors never see or fill this field (hidden via CSS).
    // Bots that auto-fill every input will populate it, letting the server
    // silently discard the submission without a hard error.
    company: z.string().max(0).optional().default('')
  })
  .superRefine((data, ctx) => {
    if (data.service === OTHER_SERVICE && !data.otherService?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['otherService'], message: 'Tell us what you need help with.' });
    }
  });

export type ContactFormValues = z.infer<typeof contactSchema>;

/** Homepage quick-enquiry form: deliberately the shortest set of fields that
 * still lets the office call someone back. Email and the free-text detail are
 * optional here — the full contact form is where we ask for everything. */
export const quickLeadSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(LEAD_LIMITS.name),
  phone: phoneField('Enter a valid phone number, including area code.'),
  service: z.string().min(1, 'Please choose a service.'),
  message: z.string().trim().max(LEAD_LIMITS.message).optional(),
  company: z.string().max(0).optional().default('')
});

export type QuickLeadValues = z.infer<typeof quickLeadSchema>;

const optionalText = (max: number) => z.string().trim().max(max).optional();

/** Shape accepted by POST /api/lead. Covers both the full contact form and
 * the chatbot's shorter lead payload, hence every field but the honeypot is
 * optional except for a bare minimum of name/phone so the office can call
 * back — the chatbot's freeform "no wizard" path doesn't ask for a city or
 * dedicated service selection. */
export const leadApiSchema = z.object({
  source: z.enum(['contact-form', 'quick-lead', 'chatbot']),
  name: z.string().trim().min(2).max(LEAD_LIMITS.name),
  phone: z.string().trim().refine(isValidPhoneNumber),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || isValidEmailAddress(v))
    .optional(),
  city: optionalText(LEAD_LIMITS.city),
  service: optionalText(LEAD_LIMITS.service),
  propertyType: optionalText(LEAD_LIMITS.propertyType),
  message: optionalText(LEAD_LIMITS.message),
  urgent: z.boolean().optional().default(false),
  topicsDiscussed: optionalText(LEAD_LIMITS.topicsDiscussed),
  // A long chat must never cost the lead: keep the most recent part of the
  // conversation instead of rejecting the whole submission. The outer cap
  // still bounds what the server will read.
  transcript: z
    .string()
    .max(LEAD_LIMITS.transcript * 4)
    .optional()
    .transform((v) => v?.trim().slice(-LEAD_LIMITS.transcript)),
  // Chatbot only: the assistant's plain-language summary of the conversation
  // and the page the visitor was on, so the office sees context at a glance.
  summary: optionalText(LEAD_LIMITS.summary),
  pageUrl: z
    .string()
    .trim()
    .max(LEAD_LIMITS.pageUrl)
    .regex(/^\/[\w\-./]*$/)
    .optional(),
  // Honeypot, must always arrive empty.
  company: z.string().max(0).optional().default(''),
  // Cloudflare Turnstile token, verified server-side in api/lead.ts. Nullable
  // because a widget that hasn't issued a token yet reports null; the
  // verifier, not the schema, decides whether a missing token is acceptable.
  turnstileToken: z.string().max(2048).nullish()
});

export type LeadApiPayload = z.infer<typeof leadApiSchema>;
