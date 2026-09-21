import { business, serviceAreas } from '../../data/business';
import { services, categoryMeta } from '../../data/services';
import { generalFaq } from '../../data/faq';
import { coupons } from '../../data/coupons';
import { financing } from '../../data/financing';
import { cityPages } from '../../data/cityPages';
import type { AssistantKnowledge, KnowledgeArticleSection } from './types';

export type BlogPostInput = { id: string; title: string; body: string };

/** Markdown to plain sentences: headings, emphasis, links, and list markers
 * become readable text. */
function plain(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|\s)[*_]([^*_\n]+)[*_](?=\s|$)/g, '$1$2')
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/gm, (_m, item: string) => (/[.!?:]$/.test(item.trim()) ? item : `${item}.`))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Keeps a section short enough to ship to every visitor, cut at a sentence. */
function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = cut.lastIndexOf('. ');
  return (stop > max * 0.6 ? cut.slice(0, stop + 1) : cut).trim();
}

/** Splits an article at its "##" headings so a question can land on the one
 * section that answers it. */
export function splitArticle(post: BlogPostInput): KnowledgeArticleSection[] {
  const url = `/blog/${post.id}/`;
  const chunks = post.body.split(/^##\s+/m);
  const sections: KnowledgeArticleSection[] = [];
  chunks.forEach((chunk, i) => {
    const lines = chunk.split('\n');
    const heading = i === 0 ? 'Overview' : lines.shift()!.replace(/[#*]/g, '').trim();
    const text = clamp(plain(lines.join('\n')), 1200);
    if (text.length > 60) sections.push({ articleTitle: post.title, heading, text, url });
  });
  return sections;
}

export function buildAssistantKnowledge(posts: BlogPostInput[]): AssistantKnowledge {
  const pagedCities = new Set(cityPages.map((c) => c.slug));
  return {
    business: {
      name: business.name,
      shortName: business.shortName,
      phoneDisplay: business.hotline.display,
      phoneTel: business.hotline.tel,
      email: business.email,
      address: `${business.streetAddress}, ${business.addressLocality}, ${business.addressRegion} ${business.postalCode}`,
      hours: business.hours,
      licenses: { ...business.license },
      facebook: business.social.facebook
    },
    services: services.map((s) => ({
      slug: s.slug,
      title: s.title,
      category: s.category,
      categoryLabel: categoryMeta[s.category].label,
      short: s.short,
      description: s.description,
      bullets: s.bullets,
      url: `/services/${s.slug}/`
    })),
    areas: serviceAreas.map((a) => ({
      name: a.name,
      slug: a.slug,
      primary: a.type === 'primary',
      page: pagedCities.has(a.slug) ? `/service-area/${a.slug}/` : undefined
    })),
    faq: generalFaq.map((f) => ({ question: f.question, answer: f.answer })),
    coupons: coupons.map((c) => ({ ...c })),
    financing: { partner: financing.partner, points: [...financing.points] },
    articles: [...posts].sort((a, b) => a.id.localeCompare(b.id)).flatMap(splitArticle)
  };
}
