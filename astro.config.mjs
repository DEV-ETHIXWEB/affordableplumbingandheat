// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import { legacyRedirects } from './src/data/redirects.ts';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.affordableplumbingandheat.com',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), sitemap()],
  redirects: legacyRedirects,
  vite: {
    plugins: [tailwindcss()]
  },
  image: {
    responsiveStyles: true
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport'
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
