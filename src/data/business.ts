/** Single source of truth for business facts, reused across metadata, schema.org
 * JSON-LD, the navbar, footer, chatbot, and forms so numbers/hours never drift.
 * Facts sourced from the live site scrape (old website data/) and confirmed
 * screenshots — see /old website data for source material. */
export const business = {
  name: 'Affordable Plumbing, Heat & Electrical',
  legalName: 'Affordable Plumbing, Heat, and Electrical',
  shortName: 'Affordable Plumbing & Heat',
  tagline: 'Plumbing, Heating, Cooling & Electrical',
  shortPromise: "Colorado Springs' trusted plumber — available 24/7.",
  url: 'https://www.affordableplumbingandheat.com',
  hotline: { display: '(719) 733-3759', tel: '+17197333759' },
  email: 'contact@aphinc.net',
  priceRange: '$$',
  license: {
    electrical: 'EC.0101034',
    plumbing: 'PC.0001483',
    mechanical: 'MP.03000387'
  },
  social: {
    facebook: 'https://www.facebook.com/AffordablePlumbingAndHeatInc'
  },
  hours: 'Open 24 hours a day, 7 days a week',
  hoursShort: 'Available 24/7',
  streetAddress: '1304 Market St',
  addressLocality: 'Colorado Springs',
  addressRegion: 'CO',
  postalCode: '80904',
  addressCountry: 'US',
  geo: { latitude: 38.8484, longitude: -104.8397 }
} as const;

export const trustPoints = [
  'Available 24/7',
  'Licensed & Insured',
  'Plumbing',
  'HVAC',
  'Electrical',
  'Sewer Repair',
  'Drain Cleaning',
  'Water Heaters'
] as const;

/** Canonical service-area dataset — the single source of truth for every
 * community shown on the Service Area page/map, the homepage strip, the
 * footer, the chatbot, and schema. Verified against the live production
 * site (https://www.affordableplumbingandheat.com/service-area, which
 * lists 14 surrounding communities) plus the old site's redirect map
 * (which confirms which five communities had a dedicated hub page).
 *
 * Colorado Springs is the PRIMARY MARKET (business hub), not a peer
 * "surrounding community" — see `type: 'primary'` below. Security and
 * Widefield are listed separately per the live site (they were previously
 * merged into "Security-Widefield" in this rebuild with no supporting
 * source; that merge has been reverted).
 *
 * "Lone Tree" / "Lonetree" was investigated and intentionally excluded:
 * it appears on the live site only inside the page's rhetorical subheading
 * ("...from Lonetree to Colorado Springs") and nowhere else — not in the
 * live community list, not linked, not referenced on any other page. It
 * does not meet the bar for a verified service-area entry.
 *
 * Coordinates are town-center values sourced from public geographic
 * references (Wikipedia / standard gazetteer coordinates), used for the
 * service-area map projection only — not a claim of business schema
 * boundaries. */
export type ServiceArea = {
  name: string;
  slug: string;
  /** 'primary' = home market (Colorado Springs); 'surrounding' = verified
   * surrounding service community. */
  type: 'primary' | 'surrounding';
  latitude: number;
  longitude: number;
  /** True when a dedicated /service-area/[slug]/ page exists for this
   * community (see src/data/cityPages.ts). */
  hasLocationPage: boolean;
  /** One-line, non-keyword-stuffed description used in the "Communities We
   * Serve" map side panel and similar listings. Kept here on the canonical
   * dataset so no component hardcodes a separate copy of the city list. */
  blurb: string;
};

export const serviceAreas: ServiceArea[] = [
  {
    name: 'Colorado Springs',
    slug: 'colorado-springs',
    type: 'primary',
    latitude: business.geo.latitude,
    longitude: business.geo.longitude,
    hasLocationPage: false,
    blurb: 'Our home base and primary market.'
  },
  {
    name: 'Black Forest',
    slug: 'black-forest',
    type: 'surrounding',
    latitude: 39.013,
    longitude: -104.7008,
    hasLocationPage: false,
    blurb: 'Proudly serving Black Forest and the surrounding acreages.'
  },
  {
    name: 'Cascade',
    slug: 'cascade',
    type: 'surrounding',
    latitude: 38.8966,
    longitude: -104.9722,
    hasLocationPage: false,
    blurb: 'Plumbing, HVAC & electrical service up the pass in Cascade.'
  },
  {
    name: 'Castle Rock',
    slug: 'castle-rock',
    type: 'surrounding',
    latitude: 39.3722,
    longitude: -104.8561,
    hasLocationPage: true,
    blurb: 'Reliable service for Castle Rock homes and businesses.'
  },
  {
    name: 'Falcon',
    slug: 'falcon',
    type: 'surrounding',
    latitude: 38.933,
    longitude: -104.6086,
    hasLocationPage: true,
    blurb: 'Expert solutions for Falcon residents, day or night.'
  },
  {
    name: 'Fountain',
    slug: 'fountain',
    type: 'surrounding',
    latitude: 38.6822,
    longitude: -104.7008,
    hasLocationPage: true,
    blurb: 'Serving Fountain with quality you can count on.'
  },
  {
    name: 'Highlands Ranch',
    slug: 'highlands-ranch',
    type: 'surrounding',
    latitude: 39.5439,
    longitude: -104.9878,
    hasLocationPage: false,
    blurb: 'Professional home services in Highlands Ranch.'
  },
  {
    name: 'Manitou Springs',
    slug: 'manitou-springs',
    type: 'surrounding',
    latitude: 38.854,
    longitude: -104.906,
    hasLocationPage: false,
    blurb: 'Keeping Manitou Springs comfortable in every season.'
  },
  {
    name: 'Monument',
    slug: 'monument',
    type: 'surrounding',
    latitude: 39.0917,
    longitude: -104.8728,
    hasLocationPage: true,
    blurb: 'Proud to serve the Monument community.'
  },
  {
    name: 'Palmer Lake',
    slug: 'palmer-lake',
    type: 'surrounding',
    latitude: 39.115,
    longitude: -104.905,
    hasLocationPage: false,
    blurb: 'Plumbing, HVAC & electrical service in Palmer Lake.'
  },
  {
    name: 'Parker',
    slug: 'parker',
    type: 'surrounding',
    latitude: 39.5186,
    longitude: -104.7614,
    hasLocationPage: false,
    blurb: 'Trusted home services for Parker families.'
  },
  {
    name: 'Peyton',
    slug: 'peyton',
    type: 'surrounding',
    latitude: 39.0289,
    longitude: -104.483,
    hasLocationPage: false,
    blurb: 'Serving Peyton and the surrounding communities.'
  },
  {
    name: 'Security',
    slug: 'security',
    type: 'surrounding',
    latitude: 38.7492,
    longitude: -104.7256,
    hasLocationPage: false,
    blurb: 'Dependable plumbing, HVAC & electrical service in Security.'
  },
  {
    name: 'Widefield',
    slug: 'widefield',
    type: 'surrounding',
    latitude: 38.7047,
    longitude: -104.7136,
    hasLocationPage: false,
    blurb: 'Serving Widefield with care and expertise.'
  },
  {
    name: 'Woodland Park',
    slug: 'woodland-park',
    type: 'surrounding',
    latitude: 38.9939,
    longitude: -105.0569,
    hasLocationPage: true,
    blurb: 'Quality plumbing, heating & electrical service in beautiful Woodland Park.'
  }
];

/** Colorado Springs alone, as the primary market. */
export const primaryServiceArea = serviceAreas.find((a) => a.type === 'primary')!;

/** Every verified surrounding community (excludes the primary market). */
export const surroundingServiceAreas = serviceAreas.filter((a) => a.type === 'surrounding');

/** Surrounding communities that have a dedicated /service-area/[slug]/ page. */
export const hubServiceAreas = surroundingServiceAreas.filter((a) => a.hasLocationPage);

/** Total count of communities served (primary market + surrounding),
 * derived programmatically so no component hardcodes this number. */
export const serviceAreaCount = serviceAreas.length;

/** Geographic reference points shown on the map for context only — never
 * service locations. Kept visually muted and clearly labeled as reference
 * points, never claimed as coverage. */
export const geographicReferences = [{ name: 'Denver', latitude: 39.7392, longitude: -104.9903 }];
