/** Local-SEO landing pages for the five communities that had a dedicated
 * hub page on the existing site (see business.ts serviceAreas for the full
 * coverage list, including areas without their own page). */
export interface CityPage {
  slug: string;
  name: string;
  blurb: string;
}

export const cityPages: CityPage[] = [
  {
    slug: 'castle-rock',
    name: 'Castle Rock',
    blurb:
      'From The Meadows to Founders Village, we bring the same licensed, 24/7 plumbing, HVAC, and electrical service to Castle Rock that Colorado Springs homeowners already trust.'
  },
  {
    slug: 'falcon',
    name: 'Falcon',
    blurb:
      'Falcon homes get fast, background-ready technicians for plumbing, heating, cooling, and electrical work, with no overtime upcharge for nights or weekends.'
  },
  {
    slug: 'fountain',
    name: 'Fountain',
    blurb:
      'Whether it’s a furnace that won’t start or a water heater on its way out, Fountain homeowners can count on same-day service and upfront pricing.'
  },
  {
    slug: 'monument',
    name: 'Monument',
    blurb:
      'From Jackson Creek to downtown Monument, our licensed crews handle plumbing, HVAC, and electrical work with the same 24/7 availability as our Colorado Springs base.'
  },
  {
    slug: 'woodland-park',
    name: 'Woodland Park',
    blurb:
      'Woodland Park’s cold winters are hard on furnaces and pipes. We keep local homes running with fast, reliable plumbing, heating, and electrical service.'
  }
];
