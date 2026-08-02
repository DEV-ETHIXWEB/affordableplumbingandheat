import { defineMiddleware } from 'astro:middleware';

// Applies the same security headers as public/_headers to every response
// that actually passes through the Node server (the /api/lead route, and
// any other request the adapter handles directly). Static hosts that read
// public/_headers natively (Netlify, Cloudflare Pages) get identical
// headers from that file for prerendered pages; this middleware is what
// makes the guarantee hold on a bare Node/Docker deployment too, where
// nothing else would apply them.
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  const headers = response.headers;

  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-src 'self' https://maps.google.com https://www.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  );

  return response;
});
