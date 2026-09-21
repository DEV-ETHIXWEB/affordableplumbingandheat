import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { leadApiSchema } from '../../lib/contactSchema';
import { business } from '../../data/business';
import { buildCustomerEmail, buildOfficeEmail, createLeadReference } from '../../lib/email/leadEmails';
import { verifyTurnstile } from '../../lib/turnstile';
import { isRateLimited } from '../../lib/rateLimit';
import { isCrossOrigin, json, readLimitedBody } from '../../lib/requestGuards';
import { isProduction } from '../../lib/runtimeEnv';
import { RESEND_API_KEY, LEAD_TO_EMAIL, LEAD_FROM_EMAIL } from 'astro:env/server';

// Server-rendered: everything else on the site is prerendered static HTML,
// this single route needs a real request/response cycle to keep the Resend
// API key server-side and to rate-limit abuse.
export const prerender = false;

/** Largest legitimate payload is a chatbot lead with a full transcript
 * (~8KB); anything far beyond that is abuse, not a customer. */
const MAX_BODY_BYTES = 32 * 1024;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (isCrossOrigin(request)) return json(403, { error: 'Forbidden.' });

  // Counted before parsing, so malformed or invalid payloads still use up the
  // allowance instead of letting a script probe the validator for free.
  if (await isRateLimited(clientAddress ?? 'unknown', { bucket: 'lead', max: 8, windowSeconds: 600 })) {
    return json(429, { error: 'Too many requests. Please call us instead.' });
  }

  const raw = await readLimitedBody(request, MAX_BODY_BYTES);
  if (raw === null) return json(413, { error: 'Request too large.' });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'Invalid request body.' });
  }

  // Honeypot, checked on the raw body BEFORE schema validation: a real
  // visitor never sees or fills this hidden field, but a bot that blindly
  // fills every input populates it. The schema itself rejects a non-empty
  // company field (max length 0), so checking post-validation would never
  // run — this has to happen first, silently accepting (200, so the bot
  // doesn't learn to retry with a different pattern) and dropping the
  // submission before it reaches strict validation.
  if (typeof body === 'object' && body !== null && 'company' in body && (body as { company?: unknown }).company) {
    return json(200, { ok: true });
  }

  const parsed = leadApiSchema.safeParse(body);
  if (!parsed.success) return json(422, { error: 'Invalid submission.' });
  const lead = parsed.data;

  // Every source, the chatbot included, must carry a verified token. An
  // exemption keyed on a client-supplied `source` field is no exemption at
  // all - a bot would simply claim to be the chatbot.
  const turnstile = await verifyTurnstile(lead.turnstileToken, clientAddress);
  if (!turnstile.ok) {
    if (turnstile.reason === 'not_configured') {
      return json(503, { error: 'Submissions are temporarily unavailable. Please call us instead.' });
    }
    return json(403, { error: 'Verification failed. Please try again.' });
  }

  const reference = createLeadReference();
  const receivedAt = new Date();
  const office = buildOfficeEmail({ lead, reference, receivedAt });
  const toEmail = LEAD_TO_EMAIL || business.email;
  const fromEmail = LEAD_FROM_EMAIL || 'leads@notifications.affordableplumbingandheat.com';

  if (!RESEND_API_KEY) {
    if (isProduction()) {
      // Never tell a customer "request received" when nothing will reach the
      // office. The 503 sends the visitor to the phone number instead. (The
      // production build also refuses to run without this key - see
      // astro.config.mjs - so this is a second line of defence.)
      console.error('[api/lead] RESEND_API_KEY is not configured in production - lead NOT delivered');
      return json(503, { error: 'Could not send right now. Please call us instead.' });
    }
    // Local/preview only: log enough to see the flow working. Name and phone
    // are omitted - server logs are not the place for customer PII.
    console.warn(
      `[api/lead] RESEND_API_KEY not configured (${import.meta.env.MODE}) - ${lead.source} lead ${reference} validated, not emailed`
    );
    return json(200, { ok: true, delivered: false, reference });
  }

  const resend = new Resend(RESEND_API_KEY);

  // 1. The office notification is the lead. If it fails, the visitor is told
  //    to call instead of seeing a false "request received".
  try {
    const { error } = await resend.emails.send({
      from: `${business.name} Website <${fromEmail}>`,
      to: toEmail,
      replyTo: lead.email || undefined,
      subject: office.subject,
      html: office.html,
      text: office.text
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error(`[api/lead] office email failed for ${reference}:`, err);
    return json(502, { error: 'Could not send right now. Please call us instead.' });
  }

  // 2. Customer confirmation, only when they gave an email. Its failure never
  //    fails the request: the office already has the lead.
  let confirmationSent = false;
  if (lead.email) {
    try {
      const customer = buildCustomerEmail({ lead, reference, receivedAt });
      const { error } = await resend.emails.send({
        from: `${business.name} <${fromEmail}>`,
        to: lead.email,
        replyTo: toEmail,
        subject: customer.subject,
        html: customer.html,
        text: customer.text
      });
      if (error) throw new Error(error.message);
      confirmationSent = true;
    } catch (err) {
      console.error(`[api/lead] customer confirmation failed for ${reference}:`, err);
    }
  }

  return json(200, { ok: true, delivered: true, confirmationSent, reference });
};
