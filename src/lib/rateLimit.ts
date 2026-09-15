import { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } from 'astro:env/server';

const WINDOW_SECONDS = 10 * 60;
const MAX_REQUESTS = 8;
const MAX_TRACKED_KEYS = 5000;

// Fallback store. On Vercel every serverless instance has its own copy, so
// this alone only blunts abuse that happens to land on one warm instance -
// configure Upstash (below) for a limit that holds across instances.
const memoryHits = new Map<string, number[]>();

function memoryIsLimited(key: string): boolean {
  const now = Date.now();
  const windowMs = WINDOW_SECONDS * 1000;
  if (memoryHits.size > MAX_TRACKED_KEYS) {
    for (const [k, stamps] of memoryHits) {
      if (stamps.every((t) => now - t >= windowMs)) memoryHits.delete(k);
    }
  }
  const timestamps = (memoryHits.get(key) ?? []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  memoryHits.set(key, timestamps);
  return timestamps.length > MAX_REQUESTS;
}

/** Fixed-window counter in Upstash Redis via its REST API (no SDK needed):
 * INCR the per-IP key and start its expiry on first use. */
async function upstashIsLimited(key: string): Promise<boolean> {
  const res = await fetch(`${UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['INCR', `lead-rl:${key}`],
      ['EXPIRE', `lead-rl:${key}`, WINDOW_SECONDS, 'NX']
    ]),
    signal: AbortSignal.timeout(1500)
  });
  if (!res.ok) throw new Error(`Upstash responded ${res.status}`);
  const [incr] = (await res.json()) as [{ result?: number; error?: string }];
  if (typeof incr?.result !== 'number') throw new Error(incr?.error ?? 'Unexpected Upstash response');
  return incr.result > MAX_REQUESTS;
}

export function isSharedRateLimitConfigured(): boolean {
  return Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
}

/** True when this client has exceeded the lead-submission limit. A shared
 * store outage degrades to the in-memory limiter rather than blocking real
 * customers from reaching the business. */
export async function isRateLimited(key: string): Promise<boolean> {
  if (isSharedRateLimitConfigured()) {
    try {
      return await upstashIsLimited(key);
    } catch (err) {
      console.error('[rate-limit] shared store unavailable, using in-memory fallback:', err);
    }
  }
  return memoryIsLimited(key);
}
