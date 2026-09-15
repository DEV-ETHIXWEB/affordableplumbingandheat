import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { leadApiSchema, type LeadApiPayload } from '../../lib/contactSchema';
import { business } from '../../data/business';
import { verifyTurnstile } from '../../lib/turnstile';
import { isRateLimited } from '../../lib/rateLimit';
import { isProduction } from '../../lib/runtimeEnv';
import { RESEND_API_KEY, LEAD_TO_EMAIL, LEAD_FROM_EMAIL } from 'astro:env/server';

// Server-rendered: everything else on the site is prerendered static HTML,
// this single route needs a real request/response cycle to keep the Resend
// API key server-side and to rate-limit abuse.
export const prerender = false;

/** Largest legitimate payload is a chatbot lead with a full transcript
 * (~8KB); anything far beyond that is abuse, not a customer. */
const MAX_BODY_BYTES = 32 * 1024;

const SOURCE_LABELS: Record<LeadApiPayload['source'], string> = {
  'contact-form': 'Contact form',
  'quick-lead': 'Homepage quick request',
  chatbot: 'Chatbot'
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Browsers always send Origin on a cross-site POST. A mismatch means another
 * site is scripting submissions through a visitor's browser. The request's
 * own host is compared alongside x-forwarded-host/host, because behind a
 * proxy or platform router (Vercel) the URL a function sees may carry an
 * internal host rather than the domain the visitor actually used. */
function isCrossOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return true;
  }
  const allowedHosts = [
    new URL(request.url).host,
    ...(request.headers.get('x-forwarded-host') ?? '').split(','),
    request.headers.get('host') ?? ''
  ]
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return !allowedHosts.includes(originHost.toLowerCase());
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (isCrossOrigin(request)) return json(403, { error: 'Forbidden.' });

  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return json(413, { error: 'Request too large.' });

  // Counted before parsing, so malformed or invalid payloads still use up the
  // allowance instead of letting a script probe the validator for free.
  if (await isRateLimited(clientAddress ?? 'unknown')) {
    return json(429, { error: 'Too many requests. Please call us instead.' });
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json(413, { error: 'Request too large.' });
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

  const subjectPrefix = lead.urgent ? 'URGENT - ' : '';
  const subject = `${subjectPrefix}New ${lead.source === 'chatbot' ? 'chatbot' : 'website'} lead: ${lead.name}${lead.service ? ` (${lead.service})` : ''}`;

  const rows: [string, string][] = [
    ['Source', SOURCE_LABELS[lead.source]],
    ['Name', lead.name],
    ['Phone', lead.phone],
    ['Email', lead.email || ' - '],
    ['City', lead.city || ' - '],
    ['Service', lead.service || ' - '],
    ['Property type', lead.propertyType || ' - '],
    ['Urgent', lead.urgent ? 'Yes' : 'No']
  ];
  const html = `
    <h2>${escapeHtml(subject)}</h2>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse">
      ${rows
        .map(
          ([label, value]) =>
            `<tr><td style="font-weight:600;border:1px solid #ddd">${escapeHtml(label)}</td><td style="border:1px solid #ddd">${escapeHtml(value)}</td></tr>`
        )
        .join('')}
    </table>
    ${lead.message ? `<p><strong>Message:</strong><br>${escapeHtml(lead.message).replace(/\n/g, '<br>')}</p>` : ''}
    ${lead.topicsDiscussed ? `<p><strong>Topics discussed:</strong> ${escapeHtml(lead.topicsDiscussed)}</p>` : ''}
    ${lead.transcript ? `<p><strong>Chat transcript:</strong></p><pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(lead.transcript)}</pre>` : ''}
  `;

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
      `[api/lead] RESEND_API_KEY not configured (${import.meta.env.MODE}) - ${lead.source} lead validated, not emailed`
    );
    return json(200, { ok: true, delivered: false });
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: lead.email || undefined,
      subject,
      html
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error('[api/lead] Resend send failed:', err);
    return json(502, { error: 'Could not send right now. Please call us instead.' });
  }

  return json(200, { ok: true, delivered: true });
};
