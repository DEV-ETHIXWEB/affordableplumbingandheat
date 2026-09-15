# Affordable Plumbing, Heat & Electrical — Website

Marketing and lead-generation website for Affordable Plumbing, Heat & Electrical, a plumbing/HVAC/electrical
company serving Colorado Springs, CO and the surrounding area.

## Tech stack

- **[Astro](https://astro.build)** (static output, per-route SSR opt-out for the lead API) — the site is prerendered
  HTML by default for performance/SEO; only `src/pages/api/lead.ts` runs server-side.
- **React** — used only where a page needs real interactivity (chatbot, accessibility panel, contact form, coupon
  widget), loaded as isolated Astro islands. Everything else ships zero JS.
- **Tailwind CSS v4** — utility CSS, design tokens defined in `src/styles/global.css` under `@theme`.
- **TypeScript** (strict) — all components, data, and the API route are typed.
- **[Resend](https://resend.com)** — transactional email for the contact form and chatbot lead capture.
- **Zod** — request/form validation, both client (react-hook-form resolver) and server (API route).

## Getting started

```sh
npm install
cp .env.example .env   # fill in real values, see "Environment variables" below
npm run dev
```

The dev server runs at `http://localhost:4321`.

## Commands

| Command                | Action                                                |
| ---------------------- | ----------------------------------------------------- |
| `npm run dev`          | Start the local dev server                            |
| `npm run build`        | Type-check content collections and build to `dist/`   |
| `npm run preview`      | Preview the production build locally                  |
| `npm run check`        | Run `astro check` (TypeScript + template diagnostics) |
| `npm run lint`         | Run ESLint                                            |
| `npm run format`       | Run Prettier (writes changes)                         |
| `npm run format:check` | Run Prettier in check mode (CI-safe, no writes)       |

## Architecture overview

```
src/
  components/
    islands/     React components hydrated client-side (chatbot, a11y panel, forms, coupon widget)
    layout/      Navbar, Footer, StickyCallBar (Astro, no client JS beyond a small inline <script>)
    sections/    Reusable page sections (Hero, FAQ, ServicesGrid, PageHero, ContactCTA, ...)
    ui/          Small presentational primitives (Button, Container, IconBadge, SectionHeading, ...)
    shared/      Reveal.astro — the scroll-reveal wrapper used across sections
  content/
    blog/        Markdown blog posts (Astro content collection, schema in src/content.config.ts)
  data/          Single source of truth for business facts, services, service areas, FAQ, coupons, redirects
  lib/
    accessibility/  Accessibility widget state store + settings + read-aloud hook
    chat/            Rule-based chatbot engine + keyword-scored knowledge base (no LLM, no API key)
    contactSchema.ts Zod schemas shared by the contact form and the /api/lead endpoint
    schema.ts        JSON-LD structured-data builders (BreadcrumbList, Service, FAQPage)
  layouts/
    BaseLayout.astro  <head>, JSON-LD, Navbar/Footer/StickyCallBar + the three floating islands
  pages/
    api/lead.ts       POST endpoint: origin check + rate limit + honeypot + Zod + Turnstile + Resend email
    services/[slug]/  One page per service (generated from src/data/services.ts)
    service-area/[city]/  One page per city hub (generated from src/data/cityPages.ts)
    blog/[...id]/     One page per blog post (generated from the content collection)
  middleware.ts       Security headers for the server-rendered route(s)
```

### Chatbot

Not an LLM — a small deterministic rule engine (`src/lib/chat/engine.tsx` + `knowledge.tsx`) that keyword-matches
visitor messages against the site's own services/FAQ/coupons/service-area content, so answers can never drift out of
sync with the rest of the site. Handles emergency detection, a guided lead-capture wizard, and hands off to
`POST /api/lead` after the same Turnstile check as the forms. If sending fails, the chat says so and offers call, retry,
or a visitor-initiated email - it never claims success or navigates away on its own. No LLM or AI API key is used.

### Accessibility widget

A persistent settings panel (Alt+A to toggle) covering text size, letter/line spacing, alignment, high contrast,
invert, grayscale, link underline/highlight, heading highlight, dyslexia-friendly font, larger cursor, a reading
guide/mask, pause/reduce animations, hide images, and browser-native read-aloud. Settings persist in
`localStorage` and are layered on top of a site that is already built to be accessible on its own (semantic HTML,
keyboard nav, focus states, skip link, labeled forms) — the panel is a helpful addition, not a substitute.

### Forms & lead capture

The contact page form, the homepage quick-request form, and the chatbot's wizard all POST to `/api/lead`
(`src/pages/api/lead.ts`), which:

- Rejects cross-origin requests and bodies over 32KB
- Rate-limits by IP, 8 requests / 10 minutes (`src/lib/rateLimit.ts`): Upstash Redis when configured, so the limit
  holds across Vercel's serverless instances; in-memory otherwise
- Silently drops submissions that fill the hidden honeypot field
- Validates with Zod (`src/lib/contactSchema.ts`) - the same rules the forms and chatbot use client-side
- Verifies a Cloudflare Turnstile token for **every** source (fails closed in production)
- Emails the lead via Resend. In production a missing `RESEND_API_KEY` returns 503 so the visitor is sent to the
  phone number instead of seeing a false "request received"; locally it logs a PII-free notice

Conversion events (`generate_lead`, and `phone_call_click` for `tel:` links) are pushed to GTM/GA4 only after the
API confirms success - see `src/lib/analytics.ts`.

### SEO / migration

- `src/data/redirects.ts` maps every recoverable old-site URL (service pages, city pages, blog posts, utility
  pages) to its new location as permanent (301) redirects. The live Squarespace URLs have no `.html` suffix; each
  entry is emitted both with and without it (318 routes). Re-test against the live sitemap before launch.
- Every page sets a unique title/description, canonical URL, Open Graph/Twitter tags, and JSON-LD
  (`Plumber` + `HVACBusiness` + `Electrician` site-wide with every served community; `BreadcrumbList`, `Service`,
  `Article`, and `FAQPage` where relevant). No fabricated ratings,
  review counts, or awards.
- `robots.txt` and an auto-generated `sitemap-index.xml` / `sitemap-0.xml` (via `@astrojs/sitemap`).

## Environment variables

See `.env.example` for the full list with descriptions. Nothing is required for local development or preview
builds. **A Vercel production build fails on purpose** if any required variable below is missing (see
`requireProductionEnv` in `astro.config.mjs`) - a site whose forms can't deliver must not deploy silently.

| Variable                                                   | Production  | Purpose                                                                    |
| ---------------------------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| `RESEND_API_KEY`                                           | Required    | Sends lead emails via Resend.                                              |
| `LEAD_FROM_EMAIL`                                          | Required    | Sender address on a domain verified in Resend.                             |
| `LEAD_TO_EMAIL`                                            | Optional    | Inbox for leads. Defaults to the business email in `src/data/business.ts`. |
| `TURNSTILE_SECRET_KEY` / `PUBLIC_TURNSTILE_SITE_KEY`       | Required    | Cloudflare Turnstile on every lead form and the chatbot.                   |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`      | Recommended | Shared rate-limit store across serverless instances.                       |
| `PUBLIC_GTM_ID` or `PUBLIC_GA4_ID`                         | Recommended | Analytics. Set one, not both (GTM should load GA4 itself).                 |
| `PUBLIC_CALLRAIL_COMPANY_ID` / `PUBLIC_CALLRAIL_SCRIPT_ID` | Optional    | CallRail dynamic number swap.                                              |

Vercel reads `PUBLIC_*` values at **build** time: changing one requires a redeploy, not just a settings edit.

## Deployment

The site is `output: 'static'` with an Astro adapter. `astro build` produces two things: prerendered static HTML
for 126 pages, and a real server for the one SSR route, `POST /api/lead` (`src/pages/api/lead.ts`,
`export const prerender = false`) — the contact form and chatbot lead capture both call it.

**This project is deployed on Vercel**, using `@astrojs/vercel` (see `astro.config.mjs`). That adapter is what
translates `/api/lead` into a Vercel serverless function; every other page ships as static output. Deploy as-is —
no extra Vercel configuration needed beyond what's already in this repo (`vercel.json` carries the security
headers, since Vercel does not read the Netlify-style `public/_headers` file).

⚠️ **A previous deploy attempt used `@astrojs/node` (standalone mode) on Vercel and produced a live
`404: NOT_FOUND` on every route.** Vercel cannot run that adapter's output directly — it's a self-contained Node
server binary meant to be launched with `node dist/server/entry.mjs`, not a Vercel serverless function. If you see
that error again, confirm `astro.config.mjs` still imports `@astrojs/vercel`, not `@astrojs/node`.

If this project ever moves off Vercel:

- **Netlify / Cloudflare Pages**: swap the adapter to `@astrojs/netlify` or `@astrojs/cloudflare` respectively (or
  `@astrojs/node` — both platforms also support running it). Both platforms read `public/_headers` automatically
  for security headers on static routes.
- **Bare Node / Docker**: switch the adapter back to `@astrojs/node` (standalone mode) — kept as a devDependency
  for exactly this — then run `node dist/server/entry.mjs` (respects the `PORT` env var; requires Node ≥22.12.0 per
  `package.json` engines). Put a reverse proxy (nginx/Caddy) in front and mirror the headers from `vercel.json` /
  `public/_headers` there — neither file is read by a bare Node process, though `src/middleware.ts` already applies
  the same headers to the one real SSR route regardless of host.

## Dependency overrides

`package.json` pins `path-to-regexp@6.3.0` under `@vercel/routing-utils` (via `overrides`). That package still
declares the vulnerable `6.1.0` (GHSA-9wv6-86v2-598j); 6.3.0 is the same major version with the fix, and the
generated redirect routes were verified unchanged. Remove the override once `@vercel/routing-utils` updates.
`npm audit` should report 0 vulnerabilities.

## Content

- Business facts (phone, address, licenses, hours, service areas): `src/data/business.ts`
- Services: `src/data/services.ts`
- City hub pages: `src/data/cityPages.ts`
- FAQ: `src/data/faq.ts`
- Coupons: `src/data/coupons.ts` (transcribed from the live coupon artwork; expired offers hide automatically -
  update the list when the client issues new coupons)
- Blog posts: `src/content/blog/*.md` (frontmatter schema in `src/content.config.ts`)

Update these files rather than editing pages directly where possible — most pages read from them so facts stay
consistent across the header, footer, chatbot, schema, and forms.
