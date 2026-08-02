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

| Command              | Action                                              |
| --------------------- | ---------------------------------------------------- |
| `npm run dev`         | Start the local dev server                          |
| `npm run build`       | Type-check content collections and build to `dist/` |
| `npm run preview`     | Preview the production build locally                |
| `npm run check`       | Run `astro check` (TypeScript + template diagnostics) |
| `npm run lint`        | Run ESLint                                           |
| `npm run format`      | Run Prettier (writes changes)                        |
| `npm run format:check`| Run Prettier in check mode (CI-safe, no writes)       |

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
    api/lead.ts       POST endpoint: honeypot + rate limit + Zod validation + Resend email
    services/[slug]/  One page per service (generated from src/data/services.ts)
    service-area/[city]/  One page per city hub (generated from src/data/cityPages.ts)
    blog/[...id]/     One page per blog post (generated from the content collection)
  middleware.ts       Security headers for the server-rendered route(s)
```

### Chatbot

Not an LLM — a small deterministic rule engine (`src/lib/chat/engine.tsx` + `knowledge.tsx`) that keyword-matches
visitor messages against the site's own services/FAQ/coupons/service-area content, so answers can never drift out of
sync with the rest of the site. Handles emergency detection, a guided lead-capture wizard, and hands off to
`POST /api/lead` (with a `mailto:` fallback if the API is unreachable). No external API key required or used.

### Accessibility widget

A persistent settings panel (Alt+A to toggle) covering text size, letter/line spacing, alignment, high contrast,
invert, grayscale, link underline/highlight, heading highlight, dyslexia-friendly font, larger cursor, a reading
guide/mask, pause/reduce animations, hide images, and browser-native read-aloud. Settings persist in
`localStorage` and are layered on top of a site that is already built to be accessible on its own (semantic HTML,
keyboard nav, focus states, skip link, labeled forms) — the panel is a helpful addition, not a substitute.

### Forms & lead capture

Both the contact page form and the chatbot's guided wizard POST to `/api/lead` (`src/pages/api/lead.ts`), which:

- Validates the payload with Zod (`src/lib/contactSchema.ts`)
- Rejects submissions that fill the hidden honeypot field
- Rate-limits by IP (in-memory, 8 requests / 10 minutes — see the code comment for scaling notes)
- Emails the lead via Resend if `RESEND_API_KEY` is configured; otherwise logs to the server console so nothing
  is silently lost during local development or before the key is set up

### SEO / migration

- `src/data/redirects.ts` maps every recoverable old-site URL (service pages, city pages, blog posts, utility
  pages) to its new location. These compile into real HTTP 308 redirects served by the Node adapter — verified
  with `curl` during development, not just configured.
- Every page sets a unique title/description, canonical URL, Open Graph/Twitter tags, and JSON-LD
  (`HVACBusiness` site-wide; `BreadcrumbList`, `Service`, and `FAQPage` where relevant). No fabricated ratings,
  review counts, or awards.
- `robots.txt` and an auto-generated `sitemap-index.xml` / `sitemap-0.xml` (via `@astrojs/sitemap`).

## Environment variables

See `.env.example` for the full list with descriptions. None are required for the site to build or run — every
integration degrades gracefully when its variable is unset (leads log to console instead of emailing, analytics
snippets simply don't render, etc).

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Sends lead emails via Resend. Unset = leads are logged server-side, not emailed. |
| `LEAD_TO_EMAIL` | Inbox that receives lead notifications. Defaults to the business email in `src/data/business.ts`. |
| `LEAD_FROM_EMAIL` | Verified "from" address in your Resend account/domain. |
| `TURNSTILE_SECRET_KEY` / `PUBLIC_TURNSTILE_SITE_KEY` | Optional Cloudflare Turnstile bot protection (not wired into the UI yet — configuration point only). |
| `PUBLIC_GA4_ID`, `PUBLIC_GTM_ID`, `PUBLIC_CALLRAIL_COMPANY_ID`, `PUBLIC_CALLRAIL_SCRIPT_ID` | Analytics/call-tracking configuration points (not wired into the UI yet — see "Manual actions" in the production readiness report). |

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

## Known dependency risk (accepted)

`npm audit` reports a ReDoS advisory in `path-to-regexp`, pulled in transitively via
`@astrojs/vercel` → `@vercel/routing-utils`. npm's suggested fix is downgrading to
`@astrojs/vercel@8.0.4`, which requires `astro: ^5.0.0` — incompatible with this project's Astro 7
and would be a breaking downgrade, not a fix. The vulnerable code path only parses this repo's own
`astro.config.mjs` route definitions at build time; it never touches runtime user input (no user-
controlled string reaches `path-to-regexp` at request time). Risk accepted as build-tool-only until
`@astrojs/vercel` ships an Astro-7-compatible release with the dependency bumped.

## Content

- Business facts (phone, address, licenses, hours, service areas): `src/data/business.ts`
- Services: `src/data/services.ts`
- City hub pages: `src/data/cityPages.ts`
- FAQ: `src/data/faq.ts`
- Coupons: `src/data/coupons.ts`
- Blog posts: `src/content/blog/*.md` (frontmatter schema in `src/content.config.ts`)

Update these files rather than editing pages directly where possible — most pages read from them so facts stay
consistent across the header, footer, chatbot, schema, and forms.
