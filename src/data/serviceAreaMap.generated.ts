/**
 * GENERATED FILE — do not hand-edit.
 *
 * Produced by scripts/generate-service-area-map.mjs from the real Colorado
 * state boundary (US Census cartographic boundary data via the public
 * us-atlas states-10m TopoJSON, https://github.com/topojson/us-atlas) and
 * the canonical serviceAreas coordinates in src/data/business.ts, using an
 * Albers equal-area conic projection (standard parallels 37N/41N) fit to
 * an 800x620 SVG viewBox.
 *
 * Re-run `node scripts/generate-service-area-map.mjs` after changing any
 * service-area coordinates so this file stays in sync.
 */
export const MAP_VIEW_BOX = '0 0 800 620';
export const coloradoPath = "M-562.3,-222.09 L-368.03,-215.56 L-244.36,-212.87 L18.25,-208.58 L71.25,-206.84 L181.3,-206.08 L375.69,-206.89 L381.3,-207.44 L555.59,-210.07 L782.03,-215.31 L890.41,-218.59 L1002.79,-222.59 L1014.16,73.51 L1018.71,170.51 L1022.96,281.05 L1025.67,330.17 L1038.12,653.62 L1040.3,688.47 L1050.98,965.73 L895.49,970.39 L876.76,969.7 L824.08,970.98 L650.75,975.9 L507.13,979.56 L350.73,981.07 L321.83,980.72 L65.97,980.66 L-92.14,979.46 L-93.81,977.14 L-222.99,975.13 L-418.43,970.48 L-607.02,964.07 L-601.32,815.65 L-600.13,806.51 L-592.92,618.59 L-595.84,585.58 L-590.76,453.91 L-586.99,398.96 L-568.8,-73.96 L-567.54,-85.64 L-562.3,-222.09 Z";

/** Soft coverage-area "blob" — a padded convex hull around every real
 * service-area marker (primary + surrounding, excluding geographic
 * reference points like Denver), smoothed into an organic outline. Shows
 * the service footprint at a glance without implying statewide coverage;
 * always fully inside the Colorado outline and never touches the state's
 * outer edge. Computed in scripts/generate-service-area-map.mjs from
 * projectedMarkers — not hand-drawn. */
export const coverageAreaPath = "M325.72,422.36 Q310.66,403.31 325.81,300.49 Q340.96,197.67 372.43,200.75 Q403.9,203.84 448.39,294.04 Q492.87,384.24 458.1,445.58 Q423.33,506.91 382.06,474.16 Q340.79,441.42 325.72,422.36 Z";

/** Decorative interstate corridor lines (I-25 north-south through the
 * service corridor, I-70 east-west near Denver). Context only, not
 * survey-accurate highway traces. */
export const i25Path = "M376.33,-20 L343.95,181.59 L379.37,275.26 L376.16,358.51 L384.33,430.64 L416.85,479.67 L422.85,640";
export const i70Path = "M-20,174.59 L317.95,184.59 L407.95,188.59 L820,194.59";

export interface RoadShield {
  interstate: 'I-25' | 'I-70';
  x: number;
  y: number;
}

export const roadShields: RoadShield[] = [
  {
    "interstate": "I-25",
    "x": 365,
    "y": 50.56
  },
  {
    "interstate": "I-25",
    "x": 419.85,
    "y": 539.67
  },
  {
    "interstate": "I-70",
    "x": 409.95,
    "y": 188.59
  }
];

export interface ProjectedMarker {
  name: string;
  slug: string;
  type: 'primary' | 'surrounding';
  hasLocationPage: boolean;
  x: number;
  y: number;
}

export interface ProjectedReference {
  name: string;
  x: number;
  y: number;
}

export const projectedMarkers: ProjectedMarker[] = [
  {
    "name": "Colorado Springs",
    "slug": "colorado-springs",
    "type": "primary",
    "hasLocationPage": false,
    "x": 384.33,
    "y": 430.64
  },
  {
    "name": "Black Forest",
    "slug": "black-forest",
    "type": "surrounding",
    "hasLocationPage": false,
    "x": 415.93,
    "y": 381.53
  },
  {
    "name": "Cascade",
    "slug": "cascade",
    "type": "surrounding",
    "hasLocationPage": false,
    "x": 353.66,
    "y": 416.55
  },
  {
    "name": "Castle Rock",
    "slug": "castle-rock",
    "type": "surrounding",
    "hasLocationPage": true,
    "x": 379.37,
    "y": 275.26
  },
  {
    "name": "Falcon",
    "slug": "falcon",
    "type": "surrounding",
    "hasLocationPage": true,
    "x": 437.41,
    "y": 405.05
  },
  {
    "name": "Fountain",
    "slug": "fountain",
    "type": "surrounding",
    "hasLocationPage": true,
    "x": 416.85,
    "y": 479.67
  },
  {
    "name": "Highlands Ranch",
    "slug": "highlands-ranch",
    "type": "surrounding",
    "hasLocationPage": false,
    "x": 348.88,
    "y": 224.53
  },
  {
    "name": "Manitou Springs",
    "slug": "manitou-springs",
    "type": "surrounding",
    "hasLocationPage": false,
    "x": 369.02,
    "y": 429.09
  },
  {
    "name": "Monument",
    "slug": "monument",
    "type": "surrounding",
    "hasLocationPage": true,
    "x": 376.16,
    "y": 358.51
  },
  {
    "name": "Palmer Lake",
    "slug": "palmer-lake",
    "type": "surrounding",
    "hasLocationPage": false,
    "x": 368.7,
    "y": 351.65
  },
  {
    "name": "Parker",
    "slug": "parker",
    "type": "surrounding",
    "hasLocationPage": false,
    "x": 400.68,
    "y": 231.65
  },
  {
    "name": "Peyton",
    "slug": "peyton",
    "type": "surrounding",
    "hasLocationPage": false,
    "x": 466.03,
    "y": 376.28
  },
  {
    "name": "Security",
    "slug": "security",
    "type": "surrounding",
    "hasLocationPage": false,
    "x": 410.93,
    "y": 459.85
  },
  {
    "name": "Widefield",
    "slug": "widefield",
    "type": "surrounding",
    "hasLocationPage": false,
    "x": 413.83,
    "y": 473.02
  },
  {
    "name": "Woodland Park",
    "slug": "woodland-park",
    "type": "surrounding",
    "hasLocationPage": true,
    "x": 333.97,
    "y": 387.8
  }
];

export const projectedReferences: ProjectedReference[] = [
  {
    "name": "Denver",
    "x": 347.95,
    "y": 166.59
  }
];
