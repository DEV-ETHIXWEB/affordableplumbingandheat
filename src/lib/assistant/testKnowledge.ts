import fs from 'node:fs';
import path from 'node:path';
import { buildAssistantKnowledge } from './buildKnowledge';

/** Test helper: builds the assistant knowledge from the real blog markdown on
 * disk (the site build uses the content collection instead). */
export function loadKnowledgeForTests() {
  const dir = path.resolve('src/content/blog');
  const posts = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const source = fs.readFileSync(path.join(dir, file), 'utf8');
      const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      const front = match?.[1] ?? '';
      const title = front.match(/^title:\s*['"]?(.*?)['"]?\s*$/m)?.[1] ?? file;
      return { id: file.replace(/\.md$/, ''), title, body: match?.[2] ?? source };
    });
  return buildAssistantKnowledge(posts);
}
