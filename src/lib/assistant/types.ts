/** Everything the assistant knows, built from the site's own data at build
 * time (see src/pages/assistant-knowledge.json.ts) and loaded when the chat
 * first opens. */
export type AssistantKnowledge = {
  business: {
    name: string;
    shortName: string;
    phoneDisplay: string;
    phoneTel: string;
    email: string;
    address: string;
    hours: string;
    licenses: { electrical: string; plumbing: string; mechanical: string };
    facebook: string;
  };
  services: KnowledgeService[];
  areas: { name: string; slug: string; primary: boolean; page?: string }[];
  faq: { question: string; answer: string }[];
  coupons: { id: string; title: string; description: string; terms: string; expires?: string }[];
  financing: { partner: string; points: string[] };
  articles: KnowledgeArticleSection[];
};

export type KnowledgeService = {
  slug: string;
  title: string;
  category: 'plumbing' | 'hvac' | 'electrical' | 'sewer';
  categoryLabel: string;
  short: string;
  description: string;
  bullets: string[];
  url: string;
};

export type KnowledgeArticleSection = {
  articleTitle: string;
  heading: string;
  text: string;
  url: string;
};

/** A request the visitor reviews and sends from the chat. */
export type LeadDraft = {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  service?: string;
  propertyType?: 'Residential' | 'Commercial';
  details?: string;
  urgent: boolean;
  summary: string;
};

export type BotReply = {
  /** Light markdown: **bold**, "- " lists, [label](/path/) links. */
  text: string;
  /** Suggested one-tap answers for the visitor. */
  quickReplies?: string[];
  /** When present, the widget shows the confirmation card. */
  lead?: LeadDraft;
};
