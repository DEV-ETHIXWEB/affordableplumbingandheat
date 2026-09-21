import { business } from '../../data/business';
import type { LeadApiPayload } from '../contactSchema';

/**
 * Transactional emails for a new lead: a notification to the office and a
 * confirmation to the customer. Table layout with inline styles only, because
 * that is what Gmail, Outlook, and Apple Mail reliably render. Every value
 * that came from a visitor is HTML-escaped. No remote images: the wordmark is
 * text, so nothing breaks while images are blocked or the domain is moving.
 */

const NAVY = '#0a1830';
const ORANGE = '#d3440a';
const INK = '#1f2733';
const MUTED = '#5b6573';
const BORDER = '#e4e7ec';
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export const SOURCE_LABELS: Record<LeadApiPayload['source'], string> = {
  'contact-form': 'Contact page form',
  'quick-lead': 'Homepage quick request',
  chatbot: 'Website chat assistant'
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const nl2br = (value: string) => escapeHtml(value).replace(/\r?\n/g, '<br>');

/** Short, human-readable reference shared by both emails, e.g. APH-M4K2-7QX. */
export function createLeadReference(now = Date.now()): string {
  const time = now.toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).slice(2, 5).toUpperCase().padEnd(3, '0');
  return `APH-${time}-${random}`;
}

function mountainTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

const telHref = (phone: string) => `tel:${phone.replace(/(?:x|ext\.?|extension).*$/i, '').replace(/[^\d+]/g, '')}`;

function layout({ preheader, title, body }: { preheader: string; title: string; body: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER};">
<tr><td style="background:${NAVY};padding:22px 28px;">
<div style="font-family:${FONT};font-size:22px;font-weight:800;letter-spacing:0.5px;color:${ORANGE};">AFFORDABLE</div>
<div style="font-family:${FONT};font-size:13px;font-weight:600;color:#ffffff;opacity:0.9;">Plumbing, Heat &amp; Electrical</div>
</td></tr>
${body}
<tr><td style="background:#f8f9fb;border-top:1px solid ${BORDER};padding:20px 28px;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED};">
<strong style="color:${INK};">${escapeHtml(business.name)}</strong><br>
${escapeHtml(business.streetAddress)}, ${escapeHtml(business.addressLocality)}, ${business.addressRegion} ${business.postalCode}<br>
<a href="tel:${business.hotline.tel}" style="color:${ORANGE};text-decoration:none;font-weight:600;">${business.hotline.display}</a> &middot; ${escapeHtml(business.hours)}<br>
Licenses: ${business.license.electrical} &middot; ${business.license.plumbing} &middot; ${business.license.mechanical}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function button(href: string, label: string, color = ORANGE): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${color};color:#ffffff;font-family:${FONT};font-size:15px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px;margin:4px 8px 4px 0;">${escapeHtml(label)}</a>`;
}

function detailRows(rows: [string, string | undefined][]): string {
  return rows
    .filter(([, v]) => v && v.trim())
    .map(
      ([label, value]) =>
        `<tr><td style="padding:9px 0;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;color:${MUTED};width:130px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:9px 0;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:15px;color:${INK};vertical-align:top;">${nl2br(value!)}</td></tr>`
    )
    .join('');
}

export type LeadEmailContext = {
  lead: LeadApiPayload;
  reference: string;
  receivedAt: Date;
};

/** Notification to the office: urgency first, then a tap-to-call button. */
export function buildOfficeEmail({ lead, reference, receivedAt }: LeadEmailContext) {
  const urgent = lead.urgent;
  const service = lead.service || 'Service request';
  const subject = `${urgent ? 'URGENT: ' : ''}New lead - ${lead.name} (${service}) [${reference}]`;
  const replyTo = lead.email
    ? `mailto:${lead.email}?subject=${encodeURIComponent(`Re: your request with ${business.name}`)}`
    : null;

  const body = `
${
  urgent
    ? `<tr><td style="background:#b42318;padding:12px 28px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;">URGENT: customer marked this as an emergency. Call right away.</td></tr>`
    : ''
}
<tr><td style="padding:28px 28px 8px;">
<div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${ORANGE};">New lead &middot; ${escapeHtml(SOURCE_LABELS[lead.source])}</div>
<h1 style="margin:8px 0 4px;font-family:${FONT};font-size:24px;line-height:1.25;color:${INK};">${escapeHtml(lead.name)}</h1>
<div style="font-family:${FONT};font-size:15px;color:${MUTED};">${escapeHtml(service)}${lead.city ? ` &middot; ${escapeHtml(lead.city)}` : ''}</div>
<div style="padding-top:18px;">
${button(telHref(lead.phone), `Call ${lead.phone}`)}
${replyTo ? button(replyTo, 'Reply by email', NAVY) : ''}
</div>
</td></tr>
<tr><td style="padding:12px 28px 4px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${detailRows([
  ['Phone', lead.phone],
  ['Email', lead.email],
  ['City', lead.city],
  ['Service', lead.service],
  ['Property', lead.propertyType],
  ['Priority', urgent ? 'Urgent / emergency' : 'Standard'],
  ['Source', SOURCE_LABELS[lead.source]],
  ['Page', lead.pageUrl],
  ['Received', `${mountainTimestamp(receivedAt)} (Colorado time)`],
  ['Reference', reference]
])}
</table>
</td></tr>
${
  lead.summary
    ? `<tr><td style="padding:18px 28px 0;"><div style="font-family:${FONT};font-size:13px;font-weight:700;color:${INK};">Conversation summary</div><div style="margin-top:6px;padding:14px 16px;background:#fff7f2;border-left:3px solid ${ORANGE};border-radius:8px;font-family:${FONT};font-size:15px;line-height:1.55;color:${INK};">${nl2br(lead.summary)}</div></td></tr>`
    : ''
}
${
  lead.message
    ? `<tr><td style="padding:18px 28px 0;"><div style="font-family:${FONT};font-size:13px;font-weight:700;color:${INK};">Customer's message</div><div style="margin-top:6px;padding:14px 16px;background:#f8f9fb;border-radius:8px;font-family:${FONT};font-size:15px;line-height:1.55;color:${INK};">${nl2br(lead.message)}</div></td></tr>`
    : ''
}
${
  lead.transcript
    ? `<tr><td style="padding:18px 28px 0;"><div style="font-family:${FONT};font-size:13px;font-weight:700;color:${INK};">Chat transcript</div><div style="margin-top:6px;padding:14px 16px;background:#f8f9fb;border-radius:8px;font-family:${FONT};font-size:13px;line-height:1.55;color:${MUTED};">${nl2br(lead.transcript)}</div></td></tr>`
    : ''
}
<tr><td style="padding:22px 28px 26px;font-family:${FONT};font-size:12px;color:${MUTED};">${
    lead.email
      ? 'A confirmation email was sent to the customer with this reference number.'
      : 'The customer did not leave an email address, so no confirmation email was sent. Please call them.'
  }</td></tr>`;

  const text = [
    urgent ? 'URGENT: customer marked this as an emergency. Call right away.' : null,
    `New lead from ${SOURCE_LABELS[lead.source]}`,
    '',
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    lead.email ? `Email: ${lead.email}` : null,
    lead.city ? `City: ${lead.city}` : null,
    lead.service ? `Service: ${lead.service}` : null,
    lead.propertyType ? `Property: ${lead.propertyType}` : null,
    `Priority: ${urgent ? 'Urgent' : 'Standard'}`,
    lead.pageUrl ? `Page: ${lead.pageUrl}` : null,
    `Received: ${mountainTimestamp(receivedAt)} (Colorado time)`,
    `Reference: ${reference}`,
    lead.summary ? `\nSummary:\n${lead.summary}` : null,
    lead.message ? `\nMessage:\n${lead.message}` : null,
    lead.transcript ? `\nChat transcript:\n${lead.transcript}` : null
  ]
    .filter((l) => l !== null)
    .join('\n');

  return {
    subject,
    html: layout({ preheader: `${lead.name} - ${service} - ${lead.phone}`, title: subject, body }),
    text
  };
}

/** Confirmation to the customer. Only facts the customer typed into our own
 * validated fields are echoed back; free-text messages and transcripts are
 * deliberately left out so the form can't be used to mail arbitrary content
 * to someone else's inbox. */
export function buildCustomerEmail({ lead, reference }: LeadEmailContext) {
  const firstName = lead.name.trim().split(/\s+/)[0];
  const subject = `We got your request - ${business.name}`;
  const nextSteps = lead.urgent
    ? `Because you told us this is urgent, please <strong>call us now at <a href="tel:${business.hotline.tel}" style="color:${ORANGE};">${business.hotline.display}</a></strong>. A real person answers 24/7, and calling is the fastest way to get a technician moving.`
    : 'A member of our team will call you at the number below to talk through the problem and set up your free estimate. There is nothing else you need to do.';

  const body = `
<tr><td style="padding:30px 28px 6px;">
<h1 style="margin:0 0 10px;font-family:${FONT};font-size:24px;line-height:1.3;color:${INK};">Thanks, ${escapeHtml(firstName)}. We&rsquo;ve got your request.</h1>
<p style="margin:0;font-family:${FONT};font-size:16px;line-height:1.6;color:${INK};">${nextSteps}</p>
</td></tr>
<tr><td style="padding:18px 28px 4px;">
<div style="font-family:${FONT};font-size:13px;font-weight:700;color:${INK};padding-bottom:4px;">What you sent us</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${detailRows([
  ['Name', lead.name],
  ['Phone', lead.phone],
  ['Service', lead.service],
  ['City', lead.city],
  ['Reference', reference]
])}
</table>
</td></tr>
<tr><td style="padding:22px 28px 6px;">
${button(`tel:${business.hotline.tel}`, `Call ${business.hotline.display}`)}
</td></tr>
<tr><td style="padding:12px 28px 28px;font-family:${FONT};font-size:14px;line-height:1.6;color:${MUTED};">
Something wrong in these details, or did you not make this request? Just reply to this email or call us and mention reference <strong style="color:${INK};">${escapeHtml(reference)}</strong>.
</td></tr>`;

  const text = [
    `Thanks, ${firstName}. We've got your request.`,
    '',
    lead.urgent
      ? `Because you told us this is urgent, please call us now at ${business.hotline.display}. A real person answers 24/7.`
      : 'A member of our team will call you to talk through the problem and set up your free estimate.',
    '',
    'What you sent us:',
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    lead.service ? `Service: ${lead.service}` : null,
    lead.city ? `City: ${lead.city}` : null,
    `Reference: ${reference}`,
    '',
    `Questions, or didn't make this request? Reply to this email or call ${business.hotline.display}.`,
    '',
    business.name,
    `${business.streetAddress}, ${business.addressLocality}, ${business.addressRegion} ${business.postalCode}`
  ]
    .filter((l) => l !== null)
    .join('\n');

  return {
    subject,
    html: layout({
      preheader: `Your reference is ${reference}. ${lead.urgent ? `Urgent? Call ${business.hotline.display}.` : 'We will call you shortly.'}`,
      title: subject,
      body
    }),
    text
  };
}
