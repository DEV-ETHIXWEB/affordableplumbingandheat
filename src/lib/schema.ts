import { business } from '../data/business';

export interface BreadcrumbSegment {
  name: string;
  /** Path relative to the site root, e.g. "/services/" or "/services/drain-cleaning-colorado-springs/". */
  path: string;
}

/** Builds a BreadcrumbList JSON-LD object from page-root-relative paths, so
 * every page's breadcrumb schema is generated the same way instead of
 * hand-built inline. */
export function buildBreadcrumbSchema(segments: BreadcrumbSegment[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: segments.map((segment, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: segment.name,
      item: `${business.url}${segment.path}`
    }))
  };
}

export function buildFaqSchema(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  };
}

export function buildServiceSchema(opts: { name: string; description: string; path: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: opts.name,
    name: opts.name,
    description: opts.description,
    url: `${business.url}${opts.path}`,
    provider: { '@type': 'LocalBusiness', name: business.name, '@id': `${business.url}/#business` },
    areaServed: { '@type': 'City', name: business.addressLocality }
  };
}
