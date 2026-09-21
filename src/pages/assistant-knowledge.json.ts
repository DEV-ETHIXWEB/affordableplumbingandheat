import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildAssistantKnowledge } from '../lib/assistant/buildKnowledge';

// Prerendered to a static file at build time. The chat widget fetches it the
// first time a visitor opens the chat, so none of this weighs on page load.
export const prerender = true;

export const GET: APIRoute = async () => {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const knowledge = buildAssistantKnowledge(posts.map((p) => ({ id: p.id, title: p.data.title, body: p.body ?? '' })));
  return new Response(JSON.stringify(knowledge), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
};
