// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { legacyRedirects } from './src/data/redirects.ts';

/** Keys a production deploy cannot work without. Missing any of them used to
 * degrade silently (leads logged instead of emailed, forms rejecting every
 * submission), which is exactly the failure a launch checklist exists to
 * catch - so a Vercel *production* build now stops with a clear error instead.
 * Preview and local builds are unaffected. */
const REQUIRED_PRODUCTION_ENV = [
  'RESEND_API_KEY',
  'LEAD_FROM_EMAIL',
  'TURNSTILE_SECRET_KEY',
  'PUBLIC_TURNSTILE_SITE_KEY'
];
const RECOMMENDED_PRODUCTION_ENV = [
  ['PUBLIC_GTM_ID', 'PUBLIC_GA4_ID'],
  ['UPSTASH_REDIS_REST_URL'],
  ['UPSTASH_REDIS_REST_TOKEN']
];

/** @returns {import('astro').AstroIntegration} */
function requireProductionEnv() {
  return {
    name: 'require-production-env',
    hooks: {
      'astro:config:setup': ({ command, logger }) => {
        if (command !== 'build' || process.env.VERCEL_ENV !== 'production') return;
        const missing = REQUIRED_PRODUCTION_ENV.filter((key) => !process.env[key]);
        if (missing.length) {
          throw new Error(
            `Production build blocked - missing required environment variables: ${missing.join(', ')}. ` +
              'Set them in the Vercel project settings (Production) and redeploy. See .env.example.'
          );
        }
        for (const group of RECOMMENDED_PRODUCTION_ENV) {
          if (!group.some((key) => process.env[key])) {
            logger.warn(`Production build without ${group.join(' or ')} - see .env.example.`);
          }
        }
      }
    }
  };
}

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
  integrations: [requireProductionEnv(), react(), sitemap()],
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
      UPSTASH_REDIS_REST_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      UPSTASH_REDIS_REST_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_GA4_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_GTM_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_CALLRAIL_COMPANY_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_CALLRAIL_SCRIPT_ID: envField.string({ context: 'client', access: 'public', optional: true })
    }
  }
});
