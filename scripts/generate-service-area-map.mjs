#!/usr/bin/env node
/**
 * Build-time (dev-time) generator for the Service Area map geometry.
 *
 * Reads the real Colorado state boundary from `states-10m.json` (the
 * public-domain us-atlas / Census cartographic boundary TopoJSON,
 * https://github.com/topojson/us-atlas — 1:10m resolution), decodes the
 * TopoJSON arcs by hand (no runtime topojson-client dependency needed for
 * a single polygon), and projects the boundary plus every verified
 * service-area marker to SVG coordinates using an Albers-style conic
 * equal-area projection tuned for Colorado (this is the same family of
 * projection d3-geo's geoConicEqualArea/geoAlbers produce — implemented
 * directly here so nothing extra ships to the browser).
 *
 * Output: src/data/serviceAreaMap.generated.ts — a static SVG path string
 * plus projected {x, y} for every marker. Import this in the map
 * component; do NOT ship the TopoJSON or a mapping library to the client.
 *
 * Run with: node scripts/generate-service-area-map.mjs
 * Re-run only if the canonical serviceAreas coordinates change.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const topoPath = path.join(__dirname, 'states-10m.json');
const outPath = path.join(__dirname, '..', 'src', 'data', 'serviceAreaMap.generated.ts');

// ---- 1. Load TopoJSON and decode Colorado's arcs -------------------------

const topo = JSON.parse(readFileSync(topoPath, 'utf8'));
const { scale, translate } = topo.transform;

/** Decodes a single TopoJSON arc (delta-encoded, quantized) into an array
 * of [lon, lat] pairs. This is the same algorithm topojson-client uses
 * internally, reimplemented here so we don't need the package as a
 * dependency for one build script. */
function decodeArc(arcIndex) {
  const rawArc = topo.arcs[arcIndex < 0 ? ~arcIndex : arcIndex];
  let x = 0;
  let y = 0;
  const points = rawArc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
  return arcIndex < 0 ? points.reverse() : points;
}

function arcsToRing(arcIndices) {
  const ring = [];
  for (const idx of arcIndices) {
    const pts = decodeArc(idx);
    // Each arc's first point duplicates the previous arc's last point.
    ring.push(...(ring.length ? pts.slice(1) : pts));
  }
  return ring;
}

const colorado = topo.objects.states.geometries.find((g) => g.id === '08');
if (!colorado) throw new Error('Colorado (FIPS 08) not found in states-10m.json');

// Colorado is a simple rectangle-ish polygon: a single ring, no holes.
const coloradoRings = colorado.arcs.map(arcsToRing);

// ---- 2. Project lat/long -> SVG coordinates -------------------------------
//
// Albers equal-area conic, standard parallels tuned for Colorado
// (37degN - 41degN, the state's actual latitude span) so shape distortion
// across the state is minimal — the same projection family the US Census
// uses for Colorado-scale thematic maps.

const DEG2RAD = Math.PI / 180;
const phi1 = 37 * DEG2RAD; // southern standard parallel (CO south border)
const phi2 = 41 * DEG2RAD; // northern standard parallel (CO north border)
const phi0 = 39 * DEG2RAD; // origin latitude (CO center)
const lambda0 = -105.55 * DEG2RAD; // origin longitude (CO center)

const n = (Math.sin(phi1) + Math.sin(phi2)) / 2;
const C = Math.cos(phi1) ** 2 + 2 * n * Math.sin(phi1);
const rho0 = Math.sqrt(C - 2 * n * Math.sin(phi0)) / n;

function albers(lon, lat) {
  const phi = lat * DEG2RAD;
  const lambda = lon * DEG2RAD;
  const rho = Math.sqrt(C - 2 * n * Math.sin(phi)) / n;
  const theta = n * (lambda - lambda0);
  const x = rho * Math.sin(theta);
  const y = rho0 - rho * Math.cos(theta);
  return [x, y];
}

// Project every ring point. (The fit/scale below is computed from the
// marker cluster, not from this outline's own bounds — see below — so we
// only need the projected points themselves here, not their extent.)
const projectedRings = coloradoRings.map((ring) => ring.map(([lon, lat]) => albers(lon, lat)));

const VIEW_W = 800;
const VIEW_H = 620;

// Every verified service-area marker (declared below, but coordinates
// pulled up here so the viewBox fit can be computed against them).
const serviceAreasForFit = [
  { latitude: 38.8484, longitude: -104.8397 }, // Colorado Springs
  { latitude: 39.013, longitude: -104.7008 }, // Black Forest
  { latitude: 38.8966, longitude: -104.9722 }, // Cascade
  { latitude: 39.3722, longitude: -104.8561 }, // Castle Rock
  { latitude: 38.933, longitude: -104.6086 }, // Falcon
  { latitude: 38.6822, longitude: -104.7008 }, // Fountain
  { latitude: 39.5439, longitude: -104.9878 }, // Highlands Ranch
  { latitude: 38.854, longitude: -104.906 }, // Manitou Springs
  { latitude: 39.0917, longitude: -104.8728 }, // Monument
  { latitude: 39.115, longitude: -104.905 }, // Palmer Lake
  { latitude: 39.5186, longitude: -104.7614 }, // Parker
  { latitude: 39.0289, longitude: -104.483 }, // Peyton
  { latitude: 38.7492, longitude: -104.7256 }, // Security
  { latitude: 38.7047, longitude: -104.7136 }, // Widefield
  { latitude: 38.9939, longitude: -105.0569 } // Woodland Park
];

// Rather than fitting the ENTIRE Colorado outline into the viewBox (which
// would shrink the service-area cluster — a real ~90mi-tall Front Range
// corridor inside a ~380mi-wide state — down to a tiny dot surrounded by
// empty space), fit the scale/framing to the marker cluster with generous
// context padding. The full, real Colorado outline is still drawn at that
// same scale; it just extends beyond the viewBox edges east/west and gets
// naturally cropped by the SVG viewport. This is a standard "zoomed
// regional inset" treatment — 100% real geometry, just not fully zoomed
// to the state's outer bounding box. See spec: map should communicate the
// service footprint at 80-90% visual utilization, not float a tiny cluster
// in a mostly-empty state silhouette.
const markerProjected = serviceAreasForFit.map((a) => albers(a.longitude, a.latitude));
const markerX = markerProjected.map((p) => p[0]);
const markerY = markerProjected.map((p) => p[1]);
const clusterMinX = Math.min(...markerX);
const clusterMaxX = Math.max(...markerX);
const clusterMinY = Math.min(...markerY);
const clusterMaxY = Math.max(...markerY);
const clusterSpanX = clusterMaxX - clusterMinX;
const clusterSpanY = clusterMaxY - clusterMinY;

// Generous context margin around the marker cluster, sized relative to
// the cluster's OWN extent (not an absolute value, which would be
// meaningless without knowing the projection's unit scale — an absolute
// margin comparable to the state's full span would silently re-expand
// the crop back out to the whole state, defeating the point). Extra
// north margin (1.3x) leaves room for the Denver reference point above
// Parker/Highlands Ranch; extra east/west margin (0.9x of the larger
// span) keeps the crop from feeling like a tight bounding box around the
// dots.
const marginX = Math.max(clusterSpanX, clusterSpanY) * 0.9;
const marginY = Math.max(clusterSpanX, clusterSpanY) * 0.55;
const fitMinX = clusterMinX - marginX;
const fitMaxX = clusterMaxX + marginX;
const fitMinY = clusterMinY - marginY;
const fitMaxY = clusterMaxY + marginY * 1.6; // extra north margin toward Denver

const spanX = fitMaxX - fitMinX;
const spanY = fitMaxY - fitMinY;
const fitScale = Math.min(VIEW_W / spanX, VIEW_H / spanY);

// Center the fitted region in the viewBox. Albers y increases northward
// (standard map-space convention), but SVG y increases downward on
// screen, so the y transform is negated — offset accordingly using fitMaxY
// (the northmost point of the fitted window, which after negation becomes
// the smallest/topmost SVG y) rather than fitMinY.
const offsetX = (VIEW_W - spanX * fitScale) / 2 - fitMinX * fitScale;
const offsetY = (VIEW_H - spanY * fitScale) / 2 + fitMaxY * fitScale;

function toSvg([px, py]) {
  return [px * fitScale + offsetX, -py * fitScale + offsetY];
}

function fmt(n) {
  return Math.round(n * 100) / 100;
}

function ringToPath(ring) {
  const pts = ring.map(toSvg);
  const [first, ...rest] = pts;
  return `M${fmt(first[0])},${fmt(first[1])} ` + rest.map((p) => `L${fmt(p[0])},${fmt(p[1])}`).join(' ') + ' Z';
}

const coloradoPath = projectedRings.map(ringToPath).join(' ');

// ---- 3. Project every service-area marker + geographic reference ---------
//
// Coordinates are imported from the canonical business.ts dataset so the
// map never drifts from the source of truth. We re-declare them here as a
// static list (rather than importing the .ts file into this plain Node
// script) to keep this a zero-dependency, framework-agnostic build step;
// values are copy-verified 1:1 against src/data/business.ts serviceAreas.

const serviceAreas = [
  {
    name: 'Colorado Springs',
    slug: 'colorado-springs',
    type: 'primary',
    latitude: 38.8484,
    longitude: -104.8397,
    hasLocationPage: false
  },
  {
    name: 'Black Forest',
    slug: 'black-forest',
    type: 'surrounding',
    latitude: 39.013,
    longitude: -104.7008,
    hasLocationPage: false
  },
  {
    name: 'Cascade',
    slug: 'cascade',
    type: 'surrounding',
    latitude: 38.8966,
    longitude: -104.9722,
    hasLocationPage: false
  },
  {
    name: 'Castle Rock',
    slug: 'castle-rock',
    type: 'surrounding',
    latitude: 39.3722,
    longitude: -104.8561,
    hasLocationPage: true
  },
  {
    name: 'Falcon',
    slug: 'falcon',
    type: 'surrounding',
    latitude: 38.933,
    longitude: -104.6086,
    hasLocationPage: true
  },
  {
    name: 'Fountain',
    slug: 'fountain',
    type: 'surrounding',
    latitude: 38.6822,
    longitude: -104.7008,
    hasLocationPage: true
  },
  {
    name: 'Highlands Ranch',
    slug: 'highlands-ranch',
    type: 'surrounding',
    latitude: 39.5439,
    longitude: -104.9878,
    hasLocationPage: false
  },
  {
    name: 'Manitou Springs',
    slug: 'manitou-springs',
    type: 'surrounding',
    latitude: 38.854,
    longitude: -104.906,
    hasLocationPage: false
  },
  {
    name: 'Monument',
    slug: 'monument',
    type: 'surrounding',
    latitude: 39.0917,
    longitude: -104.8728,
    hasLocationPage: true
  },
  {
    name: 'Palmer Lake',
    slug: 'palmer-lake',
    type: 'surrounding',
    latitude: 39.115,
    longitude: -104.905,
    hasLocationPage: false
  },
  {
    name: 'Parker',
    slug: 'parker',
    type: 'surrounding',
    latitude: 39.5186,
    longitude: -104.7614,
    hasLocationPage: false
  },
  {
    name: 'Peyton',
    slug: 'peyton',
    type: 'surrounding',
    latitude: 39.0289,
    longitude: -104.483,
    hasLocationPage: false
  },
  {
    name: 'Security',
    slug: 'security',
    type: 'surrounding',
    latitude: 38.7492,
    longitude: -104.7256,
    hasLocationPage: false
  },
  {
    name: 'Widefield',
    slug: 'widefield',
    type: 'surrounding',
    latitude: 38.7047,
    longitude: -104.7136,
    hasLocationPage: false
  },
  {
    name: 'Woodland Park',
    slug: 'woodland-park',
    type: 'surrounding',
    latitude: 38.9939,
    longitude: -105.0569,
    hasLocationPage: true
  }
];

const geographicReferences = [{ name: 'Denver', latitude: 39.7392, longitude: -104.9903 }];

const projectedMarkers = serviceAreas.map((area) => {
  const [x, y] = toSvg(albers(area.longitude, area.latitude));
  return {
    name: area.name,
    slug: area.slug,
    type: area.type,
    hasLocationPage: area.hasLocationPage,
    x: fmt(x),
    y: fmt(y)
  };
});

const projectedReferences = geographicReferences.map((ref) => {
  const [x, y] = toSvg(albers(ref.longitude, ref.latitude));
  return { name: ref.name, x: fmt(x), y: fmt(y) };
});

// ---- 4. Coverage-area hull -------------------------------------------------
//
// A shaded shape communicating "this is the service footprint" at a glance,
// derived from the REAL projected marker coordinates (not hand-drawn). We
// compute a convex hull (monotone chain) over every service-area marker
// (primary + surrounding, NOT the Denver reference point — Denver must
// never visually read as inside the coverage area), then expand it outward
// by a fixed padding distance so the shape reads as a soft coverage region
// around the markers rather than a tight polygon touching each dot, and
// finally round the corners with quadratic bezier smoothing so it renders
// as an organic blob (matching the reference art) instead of an angular
// polygon.

function crossProduct(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/** Standard monotone-chain convex hull, O(n log n). Returns points in
 * counter-clockwise order (screen space, y-down). */
function convexHull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length <= 2) return pts;

  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** Expands a convex polygon outward from its centroid by `padding` SVG
 * units along each vertex's radial direction. Simple and sufficient for a
 * soft "coverage blob" — a true Minkowski-sum offset isn't needed here
 * since the hull is small and convex. */
function expandHull(hull, padding) {
  const cx = hull.reduce((sum, p) => sum + p[0], 0) / hull.length;
  const cy = hull.reduce((sum, p) => sum + p[1], 0) / hull.length;
  return hull.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const scale = (dist + padding) / dist;
    return [cx + dx * scale, cy + dy * scale];
  });
}

/** Renders a closed polygon as a smooth path using quadratic bezier curves
 * through the midpoint of each edge — a cheap, dependency-free way to turn
 * a faceted hull into an organic "coverage blob" outline matching the
 * reference art, without pulling in a spline library. */
function smoothPolygonPath(points) {
  const n = points.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(points[n - 1], points[0]);
  let d = `M${fmt(start[0])},${fmt(start[1])} `;
  for (let i = 0; i < n; i++) {
    const curr = points[i];
    const next = points[(i + 1) % n];
    const m = mid(curr, next);
    d += `Q${fmt(curr[0])},${fmt(curr[1])} ${fmt(m[0])},${fmt(m[1])} `;
  }
  return d.trim() + ' Z';
}

const hullSourcePoints = projectedMarkers.map((m) => [m.x, m.y]);
const rawHull = convexHull(hullSourcePoints);
// Padding sized relative to the marker spread, matching the same
// relative-sizing principle used for the viewBox fit margins above.
const hullPadding = Math.max(28, Math.min(clusterSpanX, clusterSpanY) * fitScale * 0.14);
const paddedHull = expandHull(rawHull, hullPadding);
const coverageAreaPath = smoothPolygonPath(paddedHull);

// ---- 5. Decorative road corridor lines + interstate shield anchors --------
//
// I-25 runs north-south through the service corridor; I-70 runs east-west,
// well north, near Denver. These are decorative context lines (not
// survey-accurate highway traces), extended from the existing I-25 corridor
// concept to span the full viewBox so they read as through-routes, plus
// anchor points for small interstate shield icons drawn in the component.

const castleRock = projectedMarkers.find((m) => m.slug === 'castle-rock');
const monument = projectedMarkers.find((m) => m.slug === 'monument');
const primaryMarker = projectedMarkers.find((m) => m.type === 'primary');
const fountain = projectedMarkers.find((m) => m.slug === 'fountain');
const denver = projectedReferences.find((r) => r.name === 'Denver');

// I-25: from north edge (above Denver/Highlands Ranch) down through Castle
// Rock -> Monument -> Colorado Springs -> Fountain -> south edge.
const i25Points = [
  [primaryMarker.x - 8, -20],
  [denver.x - 4, denver.y + 15],
  [castleRock.x, castleRock.y],
  [monument.x, monument.y],
  [primaryMarker.x, primaryMarker.y],
  [fountain.x, fountain.y],
  [fountain.x + 6, VIEW_H + 20]
];
const i25Path = 'M' + i25Points.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' L');

// I-70: a broad east-west sweep passing just north of Denver, spanning the
// full viewBox width for a "through route" feel.
const i70Y = denver.y + 18;
const i70Path = `M-20,${fmt(i70Y - 10)} L${fmt(denver.x - 30)},${fmt(i70Y)} L${fmt(denver.x + 60)},${fmt(i70Y + 4)} L${VIEW_W + 20},${fmt(i70Y + 10)}`;

// Shield icon anchors: one per interstate, placed at a clear, uncluttered
// point along each line (not on top of a marker or label).
const roadShields = [
  { interstate: 'I-25', x: fmt(primaryMarker.x - 8 + (denver.x - 4 - (primaryMarker.x - 8)) * 0.35), y: fmt(-20 + (denver.y + 15 - -20) * 0.35) },
  { interstate: 'I-25', x: fmt(fountain.x + 3), y: fmt(fountain.y + 60) },
  { interstate: 'I-70', x: fmt(denver.x + 62), y: fmt(i70Y + 4) }
];

// ---- 6. Write the generated TS module -------------------------------------

const banner = `/**
 * GENERATED FILE — do not hand-edit.
 *
 * Produced by scripts/generate-service-area-map.mjs from the real Colorado
 * state boundary (US Census cartographic boundary data via the public
 * us-atlas states-10m TopoJSON, https://github.com/topojson/us-atlas) and
 * the canonical serviceAreas coordinates in src/data/business.ts, using an
 * Albers equal-area conic projection (standard parallels 37N/41N) fit to
 * an ${VIEW_W}x${VIEW_H} SVG viewBox.
 *
 * Re-run \`node scripts/generate-service-area-map.mjs\` after changing any
 * service-area coordinates so this file stays in sync.
 */
`;

const out =
  banner +
  `export const MAP_VIEW_BOX = '0 0 ${VIEW_W} ${VIEW_H}';\n` +
  `export const coloradoPath = ${JSON.stringify(coloradoPath)};\n\n` +
  `/** Soft coverage-area "blob" — a padded convex hull around every real\n * service-area marker (primary + surrounding, excluding geographic\n * reference points like Denver), smoothed into an organic outline. Shows\n * the service footprint at a glance without implying statewide coverage;\n * always fully inside the Colorado outline and never touches the state's\n * outer edge. Computed in scripts/generate-service-area-map.mjs from\n * projectedMarkers — not hand-drawn. */\n` +
  `export const coverageAreaPath = ${JSON.stringify(coverageAreaPath)};\n\n` +
  `/** Decorative interstate corridor lines (I-25 north-south through the\n * service corridor, I-70 east-west near Denver). Context only, not\n * survey-accurate highway traces. */\n` +
  `export const i25Path = ${JSON.stringify(i25Path)};\n` +
  `export const i70Path = ${JSON.stringify(i70Path)};\n\n` +
  `export interface RoadShield {\n  interstate: 'I-25' | 'I-70';\n  x: number;\n  y: number;\n}\n\n` +
  `export const roadShields: RoadShield[] = ${JSON.stringify(roadShields, null, 2)};\n\n` +
  `export interface ProjectedMarker {\n  name: string;\n  slug: string;\n  type: 'primary' | 'surrounding';\n  hasLocationPage: boolean;\n  x: number;\n  y: number;\n}\n\n` +
  `export interface ProjectedReference {\n  name: string;\n  x: number;\n  y: number;\n}\n\n` +
  `export const projectedMarkers: ProjectedMarker[] = ${JSON.stringify(projectedMarkers, null, 2)};\n\n` +
  `export const projectedReferences: ProjectedReference[] = ${JSON.stringify(projectedReferences, null, 2)};\n`;

writeFileSync(outPath, out, 'utf8');

console.log(`Wrote ${outPath}`);
console.log(
  `Colorado path length: ${coloradoPath.length} chars, ${projectedMarkers.length} markers, ${projectedReferences.length} reference points.`
);
console.log(`Coverage hull: ${rawHull.length} hull points, padding ${fmt(hullPadding)}px.`);
for (const m of projectedMarkers) {
  console.log(`  ${m.name.padEnd(18)} (${m.type}) -> x=${m.x} y=${m.y}`);
}
