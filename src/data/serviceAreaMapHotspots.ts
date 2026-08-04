/**
 * Interactive hotspot positions for the illustrated Colorado service-area map
 * (src/assets/images/service-area/colorado-service-area-map.webp).
 *
 * The map artwork is a raster illustration, so marker positions can't be
 * derived from the build-time projection the way the old pure-SVG map's were.
 * Instead these were MEASURED FROM THE ARTWORK ITSELF: the orange marker dots
 * were located programmatically (flood-fill blob detection over a raw RGB dump
 * of the image, filtering for the marker colour and a round, dot-sized blob),
 * and each centroid converted to a percentage of the image's intrinsic size.
 * That keeps every hotspot locked to the pixel it labels at any rendered size,
 * since percentages scale with the image.
 *
 * Percentages are relative to the image's 1024x678 intrinsic size, measured to
 * the centre of each dot (not its text label).
 *
 * NOTE ON CASCADE: the supplied artwork does not draw a marker for Cascade —
 * it sits in the dense cluster immediately west of Colorado Springs, between
 * Manitou Springs and Woodland Park, and the illustration omits it. Rather
 * than inventing a dot position that doesn't correspond to anything visible in
 * the art (which would put a hover target over empty terrain), Cascade has no
 * hotspot. It remains fully present in the canonical dataset, the crawlable
 * "Communities We Serve" list, the footer, and the homepage strip — only the
 * map pin is absent, matching what the artwork actually shows.
 */

export interface MapHotspot {
  slug: string;
  /** Centre of the marker dot, as a % of image width. */
  xPct: number;
  /** Centre of the marker dot, as a % of image height. */
  yPct: number;
}

/** Colorado Springs — the primary market. Drawn larger in the artwork. */
export const primaryHotspot: MapHotspot = {
  slug: 'colorado-springs',
  xPct: 60.89,
  yPct: 58.11
};

/** The surrounding communities that the artwork draws a marker for. */
export const surroundingHotspots: MapHotspot[] = [
  { slug: 'highlands-ranch', xPct: 59.38, yPct: 28.11 },
  { slug: 'parker', xPct: 63.15, yPct: 31.36 },
  { slug: 'castle-rock', xPct: 58.0, yPct: 38.63 },
  { slug: 'monument', xPct: 59.41, yPct: 45.62 },
  { slug: 'black-forest', xPct: 67.42, yPct: 49.55 },
  { slug: 'falcon', xPct: 73.46, yPct: 55.78 },
  { slug: 'manitou-springs', xPct: 52.1, yPct: 58.57 },
  { slug: 'security', xPct: 61.85, yPct: 67.4 },
  { slug: 'widefield', xPct: 61.83, yPct: 70.01 },
  { slug: 'fountain', xPct: 61.52, yPct: 76.53 },
  { slug: 'palmer-lake', xPct: 50.7, yPct: 79.82 },
  { slug: 'peyton', xPct: 70.62, yPct: 83.39 },
  { slug: 'woodland-park', xPct: 52.1, yPct: 89.32 }
];

/** Every hotspot the artwork draws, primary first. */
export const allHotspots: MapHotspot[] = [primaryHotspot, ...surroundingHotspots];

/** Slugs the artwork does NOT draw a marker for — see the note above. */
export const slugsWithoutHotspot = ['cascade'] as const;

/** The artwork's intrinsic pixel size, for aspect-ratio boxing. */
export const MAP_IMAGE_WIDTH = 1024;
export const MAP_IMAGE_HEIGHT = 678;
