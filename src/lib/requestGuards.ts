/** Browsers always send Origin on a cross-site POST. A mismatch means another
 * site is scripting requests through a visitor's browser. The request's own
 * host is compared alongside x-forwarded-host/host, because behind a proxy or
 * platform router (Vercel) the URL a function sees may carry an internal host
 * rather than the domain the visitor actually used. */
export function isCrossOrigin(request: Request): boolean {
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

export function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

/** Reads a request body as text, refusing anything larger than `maxBytes`
 * (checked against Content-Length first, then the actual body). */
export async function readLimitedBody(request: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > maxBytes) return null;
  const raw = await request.text();
  return raw.length > maxBytes ? null : raw;
}
