import type { ReactNode } from 'react';
import { business } from '../../data/business';

/**
 * Renders the assistant's replies. Model output is untrusted text, so this is
 * deliberately tiny: paragraphs, "- " / "1. " lists, **bold**, and links -
 * never raw HTML. Links are allowed only to this site's own pages and the
 * business's phone and email; anything else renders as its label text.
 */

const TOKEN = /(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\s]+\))/g;
const PHONE_DISPLAY = business.hotline.display;

function safeHref(href: string): string | null {
  if (href.startsWith('/') && !href.startsWith('//') && /^\/[\w\-./#?=&]*$/.test(href)) return href;
  if (href === `tel:${business.hotline.tel}`) return href;
  if (href === `mailto:${business.email}`) return href;
  return null;
}

const linkClass =
  'font-semibold text-orange-600 underline decoration-orange-600/40 underline-offset-2 hover:text-orange-700';

function renderPhoneLinks(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(PHONE_DISPLAY);
  return parts.flatMap((part, i) =>
    i === 0
      ? [part]
      : [
          <a key={`${keyPrefix}-tel-${i}`} href={`tel:${business.hotline.tel}`} className={linkClass}>
            {PHONE_DISPLAY}
          </a>,
          part
        ]
  );
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(TOKEN).flatMap((piece, i): ReactNode[] => {
    const key = `${keyPrefix}-${i}`;
    if (!piece) return [];
    if (piece.startsWith('**') && piece.endsWith('**') && piece.length > 4) {
      return [
        <strong key={key} className="text-ink-900 font-semibold">
          {renderPhoneLinks(piece.slice(2, -2), key)}
        </strong>
      ];
    }
    const link = piece.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      return href
        ? [
            <a key={key} href={href} className={linkClass}>
              {link[1]}
            </a>
          ]
        : [link[1]];
    }
    return renderPhoneLinks(piece, key);
  });
}

export function renderChatMarkdown(text: string): ReactNode {
  const blocks = text.trim().split(/\n{2,}/);
  return blocks.map((block, b) => {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    const bullet = lines.length > 0 && lines.every((l) => /^\s*[-*•]\s+/.test(l));
    const numbered = lines.length > 0 && lines.every((l) => /^\s*\d+[.)]\s+/.test(l));
    if (bullet || numbered) {
      const items = lines.map((l, i) => (
        <li key={i}>{renderInline(l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ''), `b${b}-li${i}`)}</li>
      ));
      return numbered ? (
        <ol key={b} className="mt-1.5 list-decimal space-y-1 pl-5 first:mt-0">
          {items}
        </ol>
      ) : (
        <ul key={b} className="mt-1.5 list-disc space-y-1 pl-5 first:mt-0">
          {items}
        </ul>
      );
    }
    return (
      <p key={b} className="mt-2 first:mt-0">
        {lines.map((l, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {renderInline(l, `b${b}-l${i}`)}
          </span>
        ))}
      </p>
    );
  });
}

/** Plain-text form of an assistant reply, for the lead email transcript. */
export function chatMarkdownToPlainText(text: string): string {
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) =>
      href.startsWith('/') ? `${label} (${href})` : label
    )
    .trim();
}
