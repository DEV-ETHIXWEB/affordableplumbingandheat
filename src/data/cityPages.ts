import { hubServiceAreas } from './business';

/** Local-SEO landing pages for the five communities that had a dedicated
 * hub page on the existing site (see business.ts serviceAreas for the full
 * coverage list, including areas without their own page). `slug`/`name` are
 * derived from business.ts (the canonical service-area list) so the two
 * never drift; `blurb` here is longer, page-specific hero copy distinct
 * from the one-liner business.ts uses in map/listing contexts. */
export interface CityPage {
  slug: string;
  name: string;
  blurb: string;
}

const blurbs: Record<string, string> = {
  'castle-rock':
    'From The Meadows to Founders Village, we bring the same licensed, 24/7 plumbing, HVAC, and electrical service to Castle Rock that Colorado Springs homeowners already trust.',
  falcon:
    'Falcon homes get fast, background-ready technicians for plumbing, heating, cooling, and electrical work, with no overtime upcharge for nights or weekends.',
  fountain:
    'Whether it’s a furnace that won’t start or a water heater on its way out, Fountain homeowners can count on same-day service and upfront pricing.',
  monument:
    'From Jackson Creek to downtown Monument, our licensed crews handle plumbing, HVAC, and electrical work with the same 24/7 availability as our Colorado Springs base.',
  'woodland-park':
    'Woodland Park’s cold winters are hard on furnaces and pipes. We keep local homes running with fast, reliable plumbing, heating, and electrical service.'
};

export const cityPages: CityPage[] = hubServiceAreas.map((area) => ({
  slug: area.slug,
  name: area.name,
  blurb: blurbs[area.slug]
}));
