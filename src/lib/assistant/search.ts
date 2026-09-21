import { correctTokens, stem, STOPWORDS, terms, tokenize } from './text';
import type { AssistantKnowledge } from './types';

/**
 * BM25 search over everything the site says: services, FAQ, and every blog
 * article section. Lets the assistant answer questions it has no hand-written
 * rule for ("why does my toilet run at night?") straight from the site's own
 * content, with a link to read more.
 */

export type SearchDoc = {
  kind: 'service' | 'faq' | 'article';
  title: string;
  /** Short answer shown in chat. */
  answer: string;
  url?: string;
  linkLabel?: string;
  terms: string[];
  /** Title terms count extra: a question that names the topic should find it. */
  titleTerms: Set<string>;
};

const QUERY_SYNONYMS: Record<string, string[]> = {
  ac: ['air', 'condition'],
  hvac: ['heat', 'cool', 'furnace', 'air'],
  heater: ['heat', 'furnace'],
  leak: ['leak', 'drip'],
  clog: ['clog', 'drain', 'block'],
  bill: ['energy', 'cost', 'efficient'],
  pressure: ['pressure', 'flow'],
  freeze: ['frozen', 'winter', 'cold'],
  cheap: ['save', 'cost', 'afford'],
  diy: ['diy', 'yourself', 'professional']
};

function sentences(text: string, max: number): string {
  const parts = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+/g) ?? [text];
  let out = '';
  for (const p of parts) {
    if ((out + p).length > max && out) break;
    out += p;
  }
  return out.trim();
}

export class KnowledgeSearch {
  private docs: SearchDoc[] = [];
  private df = new Map<string, number>();
  private avgLength = 1;
  readonly vocabulary = new Set<string>();

  constructor(knowledge: AssistantKnowledge) {
    for (const s of knowledge.services) {
      this.add({
        kind: 'service',
        title: s.title,
        answer:
          `${s.description} ${s.bullets.length ? `Highlights: ${s.bullets.join(', ').toLowerCase()}.` : ''}`.trim(),
        url: s.url,
        linkLabel: `More about ${s.title.toLowerCase()}`,
        text: `${s.title} ${s.title} ${s.categoryLabel} ${s.short} ${s.description} ${s.bullets.join(' ')}`
      });
    }
    for (const f of knowledge.faq) {
      this.add({ kind: 'faq', title: f.question, answer: f.answer, text: `${f.question} ${f.question} ${f.answer}` });
    }
    for (const a of knowledge.articles) {
      this.add({
        kind: 'article',
        title: `${a.articleTitle} - ${a.heading}`,
        answer: sentences(a.text, 420),
        url: a.url,
        linkLabel: a.articleTitle,
        text: `${a.heading} ${a.heading} ${a.articleTitle} ${a.text}`
      });
    }
    const total = this.docs.reduce((n, d) => n + d.terms.length, 0);
    this.avgLength = total / Math.max(1, this.docs.length);
    for (const d of this.docs) for (const t of new Set(d.terms)) this.df.set(t, (this.df.get(t) ?? 0) + 1);
  }

  private add(input: Omit<SearchDoc, 'terms' | 'titleTerms'> & { text: string }) {
    const docTerms = terms(input.text);
    for (const w of tokenize(input.text))
      if (!STOPWORDS.has(w) && w.length > 3 && !/\d/.test(w)) this.vocabulary.add(w);
    const { text, ...rest } = input;
    void text;
    this.docs.push({ ...rest, terms: docTerms, titleTerms: new Set(terms(input.title)) });
  }

  /** Query terms after typo correction and synonym expansion. */
  queryTerms(query: string): string[] {
    const corrected = correctTokens(
      tokenize(query).filter((t) => !STOPWORDS.has(t)),
      this.vocabulary
    );
    const expanded = new Set<string>();
    for (const t of corrected) {
      const s = stem(t);
      expanded.add(s);
      for (const syn of QUERY_SYNONYMS[t] ?? QUERY_SYNONYMS[s] ?? []) expanded.add(stem(syn));
    }
    return [...expanded].filter((t) => t.length > 1);
  }

  search(query: string, limit = 3): { doc: SearchDoc; score: number; coverage: number }[] {
    const q = this.queryTerms(query);
    if (!q.length) return [];
    const n = this.docs.length;
    const k1 = 1.4;
    const b = 0.7;
    const results: { doc: SearchDoc; score: number; coverage: number }[] = [];
    for (const doc of this.docs) {
      const tf = new Map<string, number>();
      for (const t of doc.terms) tf.set(t, (tf.get(t) ?? 0) + 1);
      let score = 0;
      let matched = 0;
      for (const t of q) {
        const f = tf.get(t);
        if (!f) continue;
        matched++;
        const idf = Math.log(1 + (n - (this.df.get(t) ?? 0) + 0.5) / ((this.df.get(t) ?? 0) + 0.5));
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * doc.terms.length) / this.avgLength)));
        if (doc.titleTerms.has(t)) score += idf * 0.8;
      }
      if (matched) results.push({ doc, score, coverage: matched / q.length });
    }
    return results.sort((a, b2) => b2.score - a.score).slice(0, limit);
  }
}
