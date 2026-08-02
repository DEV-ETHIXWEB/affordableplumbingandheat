/** Old Squarespace URL (path only, no leading domain) -> new site path.
 * Preserves SEO equity from the previous site. Source: the HTTrack scrape
 * at `old website data/`. Old URLs used a flat `.html` structure with no
 * trailing slash; the new site uses trailing-slash directory routes. */
export const legacyRedirects: Record<string, string> = {
  // Core / homepage-equivalent pages
  //
  // NOTE: '/index.html' is intentionally NOT listed here. The static file
  // that serves '/' is literally named index.html on disk, so a request for
  // the exact path '/index.html' is served directly by the static file
  // handler before the redirect manifest ever runs — an entry here would be
  // permanently unreachable dead code. This is standard static-site-hosting
  // behavior, not specific to this build. Mitigated instead by the
  // self-referencing <link rel="canonical" href=".../"> on the homepage
  // (see BaseLayout.astro), which tells search engines the canonical URL is
  // '/' regardless of which literal path served the file.
  '/plumber-colorado-springs.html': '/',
  '/plumbing-contractor-colorado-springs.html': '/services/',
  '/hvac-contractor-colorado-springs.html': '/services/',
  '/electrician-colorado-springs-colorado.html': '/services/electrician-colorado-springs/',
  '/local-electrician-colorado-springs-colorado.html': '/services/electrician-colorado-springs/',

  // Plumbing services
  '/drain-cleaning-colorado-springs.html': '/services/drain-cleaning-colorado-springs/',
  '/hydro-jetting-colorad-springs.html': '/services/hydro-jetting-colorado-springs/',
  '/sewer-repair.html': '/services/sewer-repair-colorado-springs/',
  '/sewer-repair-colorado-springs.html': '/services/sewer-repair-colorado-springs/',
  '/trenchless-sewer-repair-colorado-springs.html': '/services/trenchless-sewer-repair-colorado-springs/',
  '/plumbing-excavation-colorado-springs.html': '/services/plumbing-excavation-colorado-springs/',
  '/water-line-repair-colorado-springs.html': '/services/water-line-repair-colorado-springs/',
  '/water-heater-repair-colorado-springs.html': '/services/water-heater-repair-colorado-springs/',
  '/water-heater-replacement-colorado-springs-colorado.html': '/services/water-heater-replacement-colorado-springs/',
  '/tankless-water-heater-installation-colorado-springs.html':
    '/services/tankless-water-heater-installation-colorado-springs/',
  '/toilet-repair-colorado-springs.html': '/services/toilet-repair-colorado-springs/',
  '/toilet-replacement-colorado-springs.html': '/services/toilet-replacement-colorado-springs/',
  '/garbage-disposal-replacement-colorado-springs.html': '/services/garbage-disposal-replacement-colorado-springs/',
  '/sump-pump-repair-colorado-springs.html': '/services/sump-pump-repair-colorado-springs/',
  '/sump-pump-installation-colorado-springs.html': '/services/sump-pump-installation-colorado-springs/',
  '/water-filtration-colorado-springs.html': '/services/water-filtration-colorado-springs/',
  '/water-softener-installation-colorado-springs.html': '/services/water-softener-installation-colorado-springs/',

  // HVAC services
  '/ac-repair-colorado-springs.html': '/services/ac-repair-colorado-springs/',
  '/ac-replacement-colorado-springs.html': '/services/ac-replacement-colorado-springs/',
  '/ac-tune-up-colorado-springs-colorado.html': '/services/ac-tune-up-colorado-springs/',
  '/cooling-repair-colorado-springs.html': '/services/cooling-repair-colorado-springs/',
  '/furnace-repair.html': '/services/furnace-repair-colorado-springs/',
  '/furnace-replacement-colorado-springs-colorado.html': '/services/furnace-replacement-colorado-springs/',
  '/furnace-tune-up-colorado-springs.html': '/services/furnace-tune-up-colorado-springs/',
  '/heat-pump-repair-colorado-springs.html': '/services/heat-pump-repair-colorado-springs/',
  '/heat-pump-installation-colorado-springs.html': '/services/heat-pump-installation-colorado-springs/',
  '/heating-repair-colorado-springs.html': '/services/heating-repair-colorado-springs/',
  '/mini-split-repair-colorado-springs.html': '/services/mini-split-repair-colorado-springs/',
  '/mini-split-replacement-colorado-springs.html': '/services/mini-split-replacement-colorado-springs/',
  '/boiler-repair-colorado-springs-colorado.html': '/services/boiler-repair-colorado-springs/',
  '/boiler-replacement-colorado-springs-colorado.html': '/services/boiler-replacement-colorado-springs/',
  '/indoor-air-quality-colorado-springs-colorado.html': '/services/indoor-air-quality-colorado-springs/',
  '/commercial-hvac.html': '/services/commercial-hvac-colorado-springs/',

  // Electrical services
  '/electrical-panel-upgrade-colorado-springs-colorado.html': '/services/electrical-panel-upgrade-colorado-springs/',
  '/electric-vehicle-charger-colorado-springs.html': '/services/electric-vehicle-charger-colorado-springs/',
  '/back-up-generator-installation-colorado-springs.html':
    '/services/back-up-generator-installation-colorado-springs/',
  '/surge-storm-protection-colorado-springs.html': '/services/surge-storm-protection-colorado-springs/',
  '/wiring-rewiring-colorado-springs.html': '/services/wiring-rewiring-colorado-springs/',
  '/lighting-installation-colorado-springs.html': '/services/lighting-installation-colorado-springs/',
  '/ceiling-fan-installation-colorado-springs.html': '/services/ceiling-fan-installation-colorado-springs/',

  // City hub pages
  '/castle-rock-plumber.html': '/service-area/castle-rock/',
  '/plumbing-hvac-electrical-falcon.html': '/service-area/falcon/',
  '/plumbing-hvac-electrical-fountain.html': '/service-area/fountain/',
  '/plumbing-hvac-electrical-monument.html': '/service-area/monument/',
  '/plumbing-hvac-electrical-woodland-park.html': '/service-area/woodland-park/',

  // Service x city combinations -> nearest matching new service page
  // (dedicated per-city service pages were not rebuilt; each old
  // combination page maps to that service's Colorado Springs page, which
  // itself links back to the relevant city hub)
  '/drain-cleaning-falcon.html': '/services/drain-cleaning-colorado-springs/',
  '/drain-cleaning-fountain.html': '/services/drain-cleaning-colorado-springs/',
  '/drain-cleaning-monument.html': '/services/drain-cleaning-colorado-springs/',
  '/drain-cleaning-woodland-park.html': '/services/drain-cleaning-colorado-springs/',
  '/furnace-repair-falcon.html': '/services/furnace-repair-colorado-springs/',
  '/furnace-repair-fountain.html': '/services/furnace-repair-colorado-springs/',
  '/furnace-repair-monument.html': '/services/furnace-repair-colorado-springs/',
  '/furnace-repair-woodland-park.html': '/services/furnace-repair-colorado-springs/',
  '/furnace-replacement-monument.html': '/services/furnace-replacement-colorado-springs/',
  '/furnace-replacement-woodland-park.html': '/services/furnace-replacement-colorado-springs/',
  '/water-heater-repair-fountain.html': '/services/water-heater-repair-colorado-springs/',
  '/water-heater-repair-monument.html': '/services/water-heater-repair-colorado-springs/',
  '/water-heater-replacement-fountain.html': '/services/water-heater-replacement-colorado-springs/',
  '/water-heater-replacement-monument.html': '/services/water-heater-replacement-colorado-springs/',
  '/electrician-monument.html': '/services/electrician-colorado-springs/',
  '/electrician-woodland-park.html': '/services/electrician-colorado-springs/',
  '/ev-charger-installation-falcon.html': '/services/electric-vehicle-charger-colorado-springs/',
  '/ev-charger-installation-fountain.html': '/services/electric-vehicle-charger-colorado-springs/',
  '/ev-charger-installation-woodland-park.html': '/services/electric-vehicle-charger-colorado-springs/',
  '/hydro-jetting-monument.html': '/services/hydro-jetting-colorado-springs/',

  // Utility / info pages
  '/contact-us.html': '/contact-us/',
  '/service-area.html': '/service-area/',
  '/financing.html': '/financing/',
  '/careers.html': '/careers/',
  '/coupons.html': '/coupons/',
  '/privacy-policy.html': '/privacy-policy/',
  '/recent-work.html': '/about-us/',
  '/onlinesubmission.html': '/contact-us/',
  '/free-sticker-giveaway.html': '/contact-us/',
  '/affordable-plumbing-heat-and-electrical-blog.html': '/blog/',

  // Blog posts. Several old slugs map to the same new slug where two or
  // three near-duplicate posts were merged into one during migration (see
  // src/content/blog/*.md frontmatter `oldSlugs` for the authoritative
  // merge list).
  '/affordable-plumbing-heat-and-electrical-blog/5-ac-fixes-you-can-try-before-calling-a-technician.html':
    '/blog/5-ac-fixes-you-can-try-before-calling-a-technician/',
  '/affordable-plumbing-heat-and-electrical-blog/5-tips-for-affordable-plumbing-maintenance-in-colorado-springs.html':
    '/blog/5-tips-for-affordable-plumbing-maintenance-in-colorado-springs/',
  '/affordable-plumbing-heat-and-electrical-blog/affordable-home-upgrades-for-colorados-unique-climate.html':
    '/blog/affordable-home-upgrades-for-colorados-unique-climate/',
  '/affordable-plumbing-heat-and-electrical-blog/affordable-ways-to-improve-your-homes-indoor-air-quality.html':
    '/blog/affordable-ways-to-improve-your-homes-indoor-air-quality/',
  '/affordable-plumbing-heat-and-electrical-blog/best-energy-saving-tips-for-colorado-springs-homeowners.html':
    '/blog/best-energy-saving-tips-for-colorado-springs-homeowners/',
  '/affordable-plumbing-heat-and-electrical-blog/best-ways-to-reduce-allergens-in-your-home.html':
    '/blog/best-ways-to-reduce-allergens-in-your-home/',
  '/affordable-plumbing-heat-and-electrical-blog/common-ac-problems-in-colorados-dry-climate.html':
    '/blog/common-ac-problems-in-colorados-dry-climate/',
  '/affordable-plumbing-heat-and-electrical-blog/common-boiler-problems-and-how-to-solve-them.html':
    '/blog/common-boiler-problems-and-how-to-solve-them/',
  '/affordable-plumbing-heat-and-electrical-blog/common-causes-of-low-water-pressure.html':
    '/blog/common-causes-of-low-water-pressure/',
  '/affordable-plumbing-heat-and-electrical-blog/common-summer-plumbing-problems-and-how-to-avoid-them.html':
    '/blog/common-summer-plumbing-problems-and-how-to-avoid-them/',
  '/affordable-plumbing-heat-and-electrical-blog/dealing-with-a-sewer-backup-essential-step.html':
    '/blog/dealing-with-a-sewer-backup-essential-step/',
  '/affordable-plumbing-heat-and-electrical-blog/debunking-the-myth-will-a-frozen-ac-fix-itself.html':
    '/blog/debunking-the-myth-will-a-frozen-ac-fix-itself/',
  '/affordable-plumbing-heat-and-electrical-blog/diy-plumbing-or-professional-plumber-a-guide-for-colorado-springs-homeowners.html':
    '/blog/diy-plumbing-or-professional-plumber-a-guide-for-colorado-springs-homeowners/',
  '/affordable-plumbing-heat-and-electrical-blog/diy-vs-professional-services-when-to-call-in-the-experts.html':
    '/blog/diy-vs-professional-services-when-to-call-in-the-experts/',
  '/affordable-plumbing-heat-and-electrical-blog/eco-friendly-plumbing-upgrades-for-your-colorado-home.html':
    '/blog/eco-friendly-plumbing-upgrades-for-your-colorado-home/',
  '/affordable-plumbing-heat-and-electrical-blog/electrical-safety-tips-for-families-in-colorado.html':
    '/blog/electrical-safety-tips-for-families-in-colorado/',
  '/affordable-plumbing-heat-and-electrical-blog/emergency-furnace-repair-in-colorado-springs-what-to-do-when-your-heat-goes-out.html':
    '/blog/emergency-furnace-repair-what-to-do-when-your-heat-goes-out/',
  '/affordable-plumbing-heat-and-electrical-blog/emergency-furnace-repair-in-fountain-what-to-do-when-the-heat-goes-out.html':
    '/blog/emergency-furnace-repair-what-to-do-when-your-heat-goes-out/',
  '/affordable-plumbing-heat-and-electrical-blog/emergency-plumbing-what-to-do-when-you-have-a-burst-pipe.html':
    '/blog/emergency-plumbing-what-to-do-when-you-have-a-burst-pipe/',
  '/affordable-plumbing-heat-and-electrical-blog/energy-efficient-cooling-tips-for-colorado-homes.html':
    '/blog/energy-efficient-cooling-tips-to-lower-your-ac-costs/',
  '/affordable-plumbing-heat-and-electrical-blog/home-energy-efficiency-tips-for-hot-colorado-summers.html':
    '/blog/energy-efficient-cooling-tips-to-lower-your-ac-costs/',
  '/affordable-plumbing-heat-and-electrical-blog/how-to-reduce-your-air-conditioning-costs-this-summer.html':
    '/blog/energy-efficient-cooling-tips-to-lower-your-ac-costs/',
  '/affordable-plumbing-heat-and-electrical-blog/energy-efficient-heating-solutions-for-a-budget-friendly-home.html':
    '/blog/energy-efficient-heating-solutions-for-colorado-homes/',
  '/affordable-plumbing-heat-and-electrical-blog/energy-efficient-heating-solutions-for-colorado-homes.html':
    '/blog/energy-efficient-heating-solutions-for-colorado-homes/',
  '/affordable-plumbing-heat-and-electrical-blog/essential-spring-maintenance-tips-for-your-air-conditioner.html':
    '/blog/essential-spring-maintenance-tips-for-your-air-conditioner/',
  '/affordable-plumbing-heat-and-electrical-blog/furnace-vs-heat-pump-which-heating-system-is-right-for-colorado-springs.html':
    '/blog/furnace-vs-heat-pump-which-heating-system-is-right-for-your-colorado-home/',
  '/affordable-plumbing-heat-and-electrical-blog/heat-pump-vs-furnace-which-is-right-for-your-colorado-home.html':
    '/blog/furnace-vs-heat-pump-which-heating-system-is-right-for-your-colorado-home/',
  '/affordable-plumbing-heat-and-electrical-blog/green-home-improvements-sustainable-plumbing-heating-and-electrical-solutions.html':
    '/blog/green-home-improvements-sustainable-plumbing-heating-and-electrical-solutions/',
  '/affordable-plumbing-heat-and-electrical-blog/home-energy-audits-are-you-losing-money-on-utilities.html':
    '/blog/home-energy-audits-are-you-losing-money-on-utilities/',
  '/affordable-plumbing-heat-and-electrical-blog/how-to-know-when-its-time-to-upgrade-your-electrical-panel.html':
    '/blog/how-to-know-when-its-time-to-upgrade-your-electrical-panel/',
  '/affordable-plumbing-heat-and-electrical-blog/how-to-prep-your-ac-system-for-a-colorado-springs-summer.html':
    '/blog/how-to-prep-your-ac-system-for-a-colorado-springs-summer/',
  '/affordable-plumbing-heat-and-electrical-blog/how-to-prepare-your-pipes-for-colorado-winters.html':
    '/blog/how-to-prepare-your-pipes-for-colorado-winters/',
  '/affordable-plumbing-heat-and-electrical-blog/how-to-prevent-electrical-fires-in-winter-essential-tips-from-affordable-plumbing-heat-amp-electrical.html':
    '/blog/how-to-prevent-electrical-fires-in-your-home/',
  '/affordable-plumbing-heat-and-electrical-blog/how-to-prevent-electrical-fires-in-your-home.html':
    '/blog/how-to-prevent-electrical-fires-in-your-home/',
  '/affordable-plumbing-heat-and-electrical-blog/how-to-safely-install-and-use-a-home-generator.html':
    '/blog/how-to-safely-install-and-use-a-home-generator/',
  '/affordable-plumbing-heat-and-electrical-blog/how-to-unclog-a-drain-without-damaging-your-pipes.html':
    '/blog/how-to-unclog-a-drain-without-damaging-your-pipes/',
  '/affordable-plumbing-heat-and-electrical-blog/tips-from-plumbing-experts-how-to-unclog-a-drain.html':
    '/blog/how-to-unclog-a-drain-without-damaging-your-pipes/',
  '/affordable-plumbing-heat-and-electrical-blog/hydrojetting-the-efficient-solution-for-clearing-tree-roots-in-sewer-lines.html':
    '/blog/hydrojetting-the-efficient-solution-for-clearing-tree-roots-in-sewer-lines/',
  '/affordable-plumbing-heat-and-electrical-blog/keep-warm-this-winter-furnace-maintenance-tips-for-colorado-springs.html':
    '/blog/keep-warm-this-winter-furnace-maintenance-tips-for-colorado-springs/',
  '/affordable-plumbing-heat-and-electrical-blog/keeping-the-flow-preventing-tankless-water-heater-freezing.html':
    '/blog/keeping-the-flow-preventing-tankless-water-heater-freezing/',
  '/affordable-plumbing-heat-and-electrical-blog/lower-your-heating-bill-5-energy-saving-tips-for-your-colorado-springs-furnace.html':
    '/blog/lower-your-heating-bill-5-energy-saving-tips-for-your-colorado-springs-furnace/',
  '/affordable-plumbing-heat-and-electrical-blog/navigating-colorado-springs-electrical-code-what-homeowners-need-to-know.html':
    '/blog/navigating-colorado-springs-electrical-code-what-homeowners-need-to-know/',
  '/affordable-plumbing-heat-and-electrical-blog/navigating-power-outages-essential-steps-for-homeowners.html':
    '/blog/navigating-power-outages-essential-steps-for-homeowners/',
  '/affordable-plumbing-heat-and-electrical-blog/no-heat-first-steps-to-take-before-calling-for-emergency-furnace-repair.html':
    '/blog/no-heat-first-steps-to-take-before-calling-for-emergency-furnace-repair/',
  '/affordable-plumbing-heat-and-electrical-blog/preparing-your-furnace-for-woodland-parks-cold-winters.html':
    '/blog/preparing-your-furnace-for-woodland-parks-cold-winters/',
  '/affordable-plumbing-heat-and-electrical-blog/protecting-your-basement-from-flooding-the-role-of-sump-pumps.html':
    '/blog/protecting-your-basement-from-flooding-the-role-of-sump-pumps/',
  '/affordable-plumbing-heat-and-electrical-blog/signs-its-time-to-replace-your-old-air-conditioner.html':
    '/blog/signs-its-time-to-replace-your-old-air-conditioner/',
  '/affordable-plumbing-heat-and-electrical-blog/signs-your-air-conditioner-needs-attention-dont-ignore-the-warning-signals.html':
    '/blog/signs-your-air-conditioner-needs-a-tune-up-or-repair/',
  '/affordable-plumbing-heat-and-electrical-blog/is-it-time-for-an-air-conditioner-tune-up.html':
    '/blog/signs-your-air-conditioner-needs-a-tune-up-or-repair/',
  '/affordable-plumbing-heat-and-electrical-blog/signs-your-boiler-needs-repair-dont-wait-until-its-too-late.html':
    '/blog/signs-your-boiler-needs-repair-dont-wait-until-its-too-late/',
  '/affordable-plumbing-heat-and-electrical-blog/signs-your-furnace-needs-a-tune-up-or-replacement.html':
    '/blog/signs-your-furnace-needs-a-tune-up-or-replacement/',
  '/affordable-plumbing-heat-and-electrical-blog/signs-your-water-heater-is-about-to-fail.html':
    '/blog/signs-your-water-heater-needs-repair-or-replacement/',
  '/affordable-plumbing-heat-and-electrical-blog/signs-your-water-heater-needs-repair-or-replacement.html':
    '/blog/signs-your-water-heater-needs-repair-or-replacement/',
  '/affordable-plumbing-heat-and-electrical-blog/spring-home-renovations-dont-forget-electrical-safety-and-upgrades.html':
    '/blog/spring-home-renovations-dont-forget-electrical-safety-and-upgrades/',
  '/affordable-plumbing-heat-and-electrical-blog/tank-vs-tankless-water-heaters-whats-best-for-your-home.html':
    '/blog/tank-vs-tankless-water-heaters-which-is-right-for-your-home/',
  '/affordable-plumbing-heat-and-electrical-blog/tankless-water-heaters-vs-traditional-water-heaters-which-is-right-for-you.html':
    '/blog/tank-vs-tankless-water-heaters-which-is-right-for-your-home/',
  '/affordable-plumbing-heat-and-electrical-blog/the-benefits-of-upgrading-to-a-programmable-thermostat.html':
    '/blog/the-benefits-of-upgrading-to-a-programmable-thermostat/',
  '/affordable-plumbing-heat-and-electrical-blog/the-dangers-of-carbon-monoxide-amp-how-to-keep-your-home-safe.html':
    '/blog/the-dangers-of-carbon-monoxide-and-how-to-keep-your-home-safe/',
  '/affordable-plumbing-heat-and-electrical-blog/the-hidden-dangers-of-hard-water-and-how-to-solve-them.html':
    '/blog/the-hidden-dangers-of-hard-water-and-how-to-solve-them/',
  '/affordable-plumbing-heat-and-electrical-blog/the-importance-of-professional-water-heater-installation.html':
    '/blog/the-importance-of-professional-water-heater-installation/',
  '/affordable-plumbing-heat-and-electrical-blog/the-pros-and-cons-of-diy-vs-professional-furnace-installation-in-colorado-springs.html':
    '/blog/the-pros-and-cons-of-diy-vs-professional-furnace-installation-in-colorado-springs/',
  '/affordable-plumbing-heat-and-electrical-blog/the-truth-about-chemical-drain-cleaners-are-they-safe.html':
    '/blog/the-truth-about-chemical-drain-cleaners-are-they-safe/',
  '/affordable-plumbing-heat-and-electrical-blog/the-ultimate-guide-to-choosing-the-right-ev-charger-for-your-home.html':
    '/blog/the-ultimate-guide-to-choosing-the-right-ev-charger-for-your-home/',
  '/affordable-plumbing-heat-and-electrical-blog/top-10-plumbing-issues-every-homeowner-should-know-about.html':
    '/blog/top-10-plumbing-issues-every-homeowner-should-know-about/',
  '/affordable-plumbing-heat-and-electrical-blog/top-5-plumbing-issues-in-colorado-springs-homes-and-how-to-prevent-them.html':
    '/blog/top-5-plumbing-issues-in-colorado-springs-homes-and-how-to-prevent-them/',
  '/affordable-plumbing-heat-and-electrical-blog/top-5-plumbing-myths-debunked.html': '/blog/top-5-plumbing-myths-debunked/',
  '/affordable-plumbing-heat-and-electrical-blog/troubleshooting-guide-what-to-do-if-your-thermostat-isnt-turning-on.html':
    '/blog/troubleshooting-guide-what-to-do-if-your-thermostat-isnt-turning-on/',
  '/affordable-plumbing-heat-and-electrical-blog/understanding-plumbing-codes-in-colorado-what-homeowners-need-to-know.html':
    '/blog/understanding-plumbing-codes-in-colorado-what-homeowners-need-to-know/',
  '/affordable-plumbing-heat-and-electrical-blog/understanding-the-crucial-differences-between-circuit-breakers-and-gfcis.html':
    '/blog/understanding-the-crucial-differences-between-circuit-breakers-and-gfcis/',
  '/affordable-plumbing-heat-and-electrical-blog/understanding-your-homes-electrical-panel.html':
    '/blog/understanding-your-homes-electrical-panel/',
  '/affordable-plumbing-heat-and-electrical-blog/sewer-line-problems-warning-signs-amp-solutions.html':
    '/blog/warning-signs-of-sewer-line-damage/',
  '/affordable-plumbing-heat-and-electrical-blog/common-signs-of-sewer-line-damage.html': '/blog/warning-signs-of-sewer-line-damage/',
  '/affordable-plumbing-heat-and-electrical-blog/what-is-a-seer-rating-and-why-should-you-care.html':
    '/blog/what-is-a-seer-rating-and-why-should-you-care/',
  '/affordable-plumbing-heat-and-electrical-blog/what-is-a-tankless-water-heater-and-how-does-it-work.html':
    '/blog/what-is-a-tankless-water-heater-and-how-does-it-work/',
  '/affordable-plumbing-heat-and-electrical-blog/what-not-to-flush-your-toilet-and-septic-systems-worst-enemies.html':
    '/blog/what-not-to-flush-your-toilet-and-septic-systems-worst-enemies/',
  '/affordable-plumbing-heat-and-electrical-blog/what-to-do-if-all-the-drains-in-your-house-are-clogged.html':
    '/blog/what-to-do-if-all-the-drains-in-your-house-are-clogged/',
  '/affordable-plumbing-heat-and-electrical-blog/why-does-my-furnace-keep-short-cycling-troubleshooting-tips-from-the-experts.html':
    '/blog/why-does-my-furnace-keep-short-cycling-troubleshooting-tips-from-the-experts/',
  '/affordable-plumbing-heat-and-electrical-blog/how-hard-water-affects-your-plumbing-system.html':
    '/blog/why-is-my-air-conditioner-blowing-warm-air/',
  '/affordable-plumbing-heat-and-electrical-blog/why-is-my-air-conditioner-blowing-warm-air.html':
    '/blog/why-is-my-air-conditioner-blowing-warm-air/',
  '/affordable-plumbing-heat-and-electrical-blog/why-you-need-a-backflow-prevention-device.html':
    '/blog/why-you-need-a-backflow-prevention-device/',
  '/affordable-plumbing-heat-and-electrical-blog/why-you-should-upgrade-to-led-lighting-in-your-home.html':
    '/blog/why-you-should-upgrade-to-led-lighting-in-your-home/',
  '/affordable-plumbing-heat-and-electrical-blog/winter-plumbing-prep-how-to-avoid-frozen-pipes-in-colorado-springs.html':
    '/blog/winter-plumbing-prep-how-to-avoid-frozen-pipes-in-colorado-springs/'
};
