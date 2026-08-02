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

/** Communities named on the old site's service-area page. `hasHub` marks the
 * five with a dedicated page on the old site; all are legitimate coverage
 * per the source material — none were fabricated. Coordinates are
 * approximate town-center values used only for map embeds, not schema claims. */
export type ServiceArea = {
  name: string;
  slug: string;
  hasHub: boolean;
};

export const serviceAreas: ServiceArea[] = [
  { name: 'Colorado Springs', slug: 'colorado-springs', hasHub: true },
  { name: 'Black Forest', slug: 'black-forest', hasHub: false },
  { name: 'Cascade', slug: 'cascade', hasHub: false },
  { name: 'Castle Rock', slug: 'castle-rock', hasHub: true },
  { name: 'Falcon', slug: 'falcon', hasHub: true },
  { name: 'Fountain', slug: 'fountain', hasHub: true },
  { name: 'Manitou Springs', slug: 'manitou-springs', hasHub: false },
  { name: 'Monument', slug: 'monument', hasHub: true },
  { name: 'Palmer Lake', slug: 'palmer-lake', hasHub: false },
  { name: 'Peyton', slug: 'peyton', hasHub: false },
  { name: 'Security-Widefield', slug: 'security-widefield', hasHub: false },
  { name: 'Woodland Park', slug: 'woodland-park', hasHub: true }
];

export const hubServiceAreas = serviceAreas.filter((a) => a.hasHub && a.slug !== 'colorado-springs');
