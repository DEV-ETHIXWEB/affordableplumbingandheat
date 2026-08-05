// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { legacyRedirects } from './src/data/redirects.ts';

// https://astro.build/config
// Deployed on Vercel: the @astrojs/vercel adapter translates the one SSR
// route (src/pages/api/lead.ts) into a Vercel serverless function while
// every other page stays prerendered static HTML. Vercel does NOT run the
// @astrojs/node "standalone" server binary directly — using that adapter
// here produced a live 404 NOT_FOUND on every route because Vercel had no
// way to invoke it. If this project ever moves off Vercel to a bare
// Node/Docker host or Netlify/Cloudflare Pages, swap this adapter back to
// @astrojs/node (standalone) or the platform-appropriate adapter — see
// README.md "Deployment" for the full compatibility notes.
export default defineConfig({
  site: 'https://www.affordableplumbingandheat.com',
  output: 'static',
  adapter: vercel(),
  integrations: [react(), sitemap()],
  redirects: legacyRedirects,
  // Inline every stylesheet into the HTML instead of Astro's default
  // "only under 4kB". The two sheets this page emits (~19kB combined) were
  // two extra round trips blocking first render — 580ms of it on throttled
  // mobile. Inlined, they cost bytes in an HTML response the browser is
  // already reading, and the render-blocking requests disappear entirely.
  build: {
    inlineStylesheets: 'always'
  },
  vite: {
    plugins: [tailwindcss()]
  },
  image: {
    responsiveStyles: true
  },
  // `prefetchAll` + the 'viewport' strategy fetched every in-view link on
  // load — measured at ~1MB of extra HTML on the homepage at 1440px (blog,
  // service-area, contact, financing, coupons all pulled before a single
  // click), which competes with the hero for bandwidth on mobile data.
  // 'hover' still makes navigation feel instant but only pays for links a
  // visitor actually aims at.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover'
  },
  env: {
    schema: {
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      LEAD_TO_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      LEAD_FROM_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_GA4_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_GTM_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_CALLRAIL_COMPANY_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_CALLRAIL_SCRIPT_ID: envField.string({ context: 'client', access: 'public', optional: true })
    }
  }
});
