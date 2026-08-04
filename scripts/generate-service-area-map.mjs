#!/usr/bin/env node
/**
 * Build-time (dev-time) generator for the Service Area map.
 *
 * Produces a fully code-generated Colorado map from REAL public-domain
 * geographic datasets — no hand-drawn or eyeballed geometry anywhere, and
 * no mapping library, GeoJSON, or TopoJSON shipped to the browser. Only the
 * final simplified SVG path strings land in the generated TS module.
 *
 * ── Datasets (all committed under scripts/, all public domain) ────────────
 *
 *  states-10m.json        us-atlas 3.0.1 — US Census cartographic boundary
 *                         TopoJSON at 1:10m. Source of the Colorado state
 *                         outline. https://github.com/topojson/us-atlas
 *
 *  co-geo.json            Colorado-clipped county boundaries, rivers, lakes
 *                         and highways, produced by
 *                         scripts/extract-colorado-vectors.mjs from:
 *                           • us-atlas 3.0.1 counties-10m (US Census, PD)
 *                           • Natural Earth 10m rivers + lake centerlines
 *                             and the North America rivers supplement (PD)
 *                           • Natural Earth 10m lakes (PD)
 *                           • Natural Earth 10m roads (PD) — carries a
 *                             `level=Interstate` attribute, which is how
 *                             I-25/I-70 are identified. Route geometry is
 *                             the real surveyed alignment, not a straight
 *                             line between cities.
 *
 *  co-elevation-grid.json A 300x190 real elevation grid (metres) covering
 *                         Colorado, sampled from NOAA NCEI's public
 *                         DEM_mosaics/DEM_all ImageServer (US Government
 *                         work, public domain) by
 *                         scripts/fetch-colorado-elevation.mjs. Terrain
 *                         relief is derived from THIS — hypsometric bands
 *                         traced with marching squares, plus a hillshade
 *                         computed from the grid's real slope/aspect. No
 *                         invented "mountain" polygons.
 *
 * ── Projection ───────────────────────────────────────────────────────────
 *
 * Albers equal-area conic, standard parallels 37N/41N (Colorado's actual
 * latitude span), implemented directly so nothing extra ships to the
 * client. Every layer — outline, counties, rivers, roads, contours, markers
 * — goes through this single projection, so they register exactly.
 *
 * Output: src/data/serviceAreaMap.generated.ts
 * Run with: node scripts/generate-service-area-map.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(readFileSync(path.join(__dirname, f), 'utf8'));
const outPath = path.join(__dirname, '..', 'src', 'data', 'serviceAreaMap.generated.ts');

const topo = read('states-10m.json');
const geo = read('co-geo.json');
const dem = read('co-elevation-grid.json');

// ---- 1. Colorado state outline from TopoJSON -----------------------------

const { scale, translate } = topo.transform;

/** Decodes a delta-encoded, quantized TopoJSON arc into [lon, lat] pairs —
 * the same algorithm topojson-client uses, inlined so this stays a
 * zero-dependency build step. */
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
    ring.push(...(ring.length ? pts.slice(1) : pts)); // dedupe shared endpoint
  }
  return ring;
}

const colorado = topo.objects.states.geometries.find((g) => g.id === '08');
if (!colorado) throw new Error('Colorado (FIPS 08) not found in states-10m.json');
const coloradoRings = colorado.arcs.map(arcsToRing);

// ---- 2. Albers equal-area conic projection --------------------------------

const DEG2RAD = Math.PI / 180;
const phi1 = 37 * DEG2RAD;
const phi2 = 41 * DEG2RAD;
const phi0 = 39 * DEG2RAD;
const lambda0 = -105.55 * DEG2RAD;

const n = (Math.sin(phi1) + Math.sin(phi2)) / 2;
const C = Math.cos(phi1) ** 2 + 2 * n * Math.sin(phi1);
const rho0 = Math.sqrt(C - 2 * n * Math.sin(phi0)) / n;

function albers(lon, lat) {
  const phi = lat * DEG2RAD;
  const lambda = lon * DEG2RAD;
  const rho = Math.sqrt(C - 2 * n * Math.sin(phi)) / n;
  const theta = n * (lambda - lambda0);
  return [rho * Math.sin(theta), rho0 - rho * Math.cos(theta)];
}

// ---- 3. Fit the viewBox to the whole state --------------------------------
//
// The reference artwork frames the ENTIRE state with a small margin, letting
// the western mountains read as context while the Front Range service
// corridor sits right-of-centre. We fit to the projected state bounds so
// that framing falls out of the real geometry rather than being nudged by
// hand.

const VIEW_W = 1024;
const VIEW_H = 678; // matches the reference artwork's 1024x678 aspect

const projectedRings = coloradoRings.map((ring) => ring.map(([lon, lat]) => albers(lon, lat)));
const allStatePoints = projectedRings.flat();
const stateMinX = Math.min(...allStatePoints.map((p) => p[0]));
const stateMaxX = Math.max(...allStatePoints.map((p) => p[0]));
const stateMinY = Math.min(...allStatePoints.map((p) => p[1]));
const stateMaxY = Math.max(...allStatePoints.map((p) => p[1]));

// Framing. Fitting the whole state edge-to-edge leaves the Front Range
// service corridor as a small cluster in a large empty rectangle — the labels
// then collide because every marker is crammed into a fraction of the width.
// The reference artwork instead zooms in so the corridor fills the frame,
// letting the state run off the left/bottom edges.
//
// So: scale up past a plain state fit, then bias the centre toward the marker
// cluster. Both numbers are ratios applied to real projected geometry — the
// geography still drives every coordinate, this only chooses the window onto
// it. Recentring is clamped so the state's north and east edges (the ones the
// reference keeps visible, and which frame the corridor) stay in view.
const MARGIN = 0.035;
const spanX = (stateMaxX - stateMinX) * (1 + MARGIN * 2);
const spanY = (stateMaxY - stateMinY) * (1 + MARGIN * 2);
const stateFitScale = Math.min(VIEW_W / spanX, VIEW_H / spanY);

/** How much tighter than a full-state fit to frame. 1 = whole state visible.
 * Tuned so the corridor fills the frame while the state's north and east
 * borders stay visible as framing edges (see the clamp below). */
const ZOOM = 1.42;
const fitScale = stateFitScale * ZOOM;

// Centre on the midpoint between the state's centre and the marker cluster's
// centre, weighted toward the cluster, then clamp so we never pan past the
// state's north/east edges.
// Bounding lon/lat of the canonical service areas. Declared here (rather
// than reusing the `serviceAreas` array further down) purely because framing
// has to be computed before anything can be projected; the values are the
// min/max of that same list and are asserted against it below.
const MARKER_LON_LAT = [
  [-105.0569, 38.6822], // west-most (Woodland Park) / south-most (Fountain)
  [-104.483, 39.5439] // east-most (Peyton) / north-most (Highlands Ranch)
];
const markerPoints = MARKER_LON_LAT.map(([lon, lat]) => albers(lon, lat));
const clusterMidX = (Math.min(...markerPoints.map((p) => p[0])) + Math.max(...markerPoints.map((p) => p[0]))) / 2;
const clusterMidY = (Math.min(...markerPoints.map((p) => p[1])) + Math.max(...markerPoints.map((p) => p[1]))) / 2;

const stateMidX = (stateMinX + stateMaxX) / 2;
const stateMidY = (stateMinY + stateMaxY) / 2;

const CLUSTER_BIAS = 0.82;
let midX = stateMidX + (clusterMidX - stateMidX) * CLUSTER_BIAS;
let midY = stateMidY + (clusterMidY - stateMidY) * CLUSTER_BIAS;

// Clamp: keep the state's east edge and north edge inside the frame, so the
// border still reads as a border rather than running off every side.
const halfW = VIEW_W / 2 / fitScale;
const halfH = VIEW_H / 2 / fitScale;
const EDGE_GAP = 0.02 * (stateMaxX - stateMinX); // breathing room past the border
midX = Math.min(midX, stateMaxX + EDGE_GAP - halfW);
midY = Math.min(midY, stateMaxY + EDGE_GAP - halfH);

const offsetX = VIEW_W / 2 - midX * fitScale;
const offsetY = VIEW_H / 2 + midY * fitScale;

/** Projected map-space -> SVG space. Albers y increases northward but SVG y
 * increases downward, hence the negation. */
function toSvg([px, py]) {
  return [px * fitScale + offsetX, -py * fitScale + offsetY];
}

const project = (lon, lat) => toSvg(albers(lon, lat));

const fmt = (v) => Math.round(v * 10) / 10;

/** Renders projected points as an SVG polyline path, dropping points that
 * are closer than `minStep` px to the previous kept point. This is the final
 * decimation pass: geometry is simplified in degrees upstream, then again
 * here in device space so the emitted strings stay compact regardless of how
 * dense the source was. */
function pointsToPath(points, { close = false, minStep = 1.1 } = {}) {
  if (points.length < 2) return '';
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const [lx, ly] = out[out.length - 1];
    const [x, y] = points[i];
    if (Math.hypot(x - lx, y - ly) >= minStep || i === points.length - 1) out.push(points[i]);
  }
  if (out.length < 2) return '';
  let d = `M${fmt(out[0][0])},${fmt(out[0][1])}`;
  for (let i = 1; i < out.length; i++) d += `L${fmt(out[i][0])},${fmt(out[i][1])}`;
  return close ? `${d}Z` : d;
}

const projectLine = (coords) => coords.map(([lon, lat]) => project(lon, lat));

/** Clip a projected polyline to the viewBox (with slack), splitting it into
 * the runs that are actually visible. Keeps offscreen geometry out of the
 * emitted path strings entirely. */
function clipToView(points, slack = 40) {
  const inside = ([x, y]) => x >= -slack && x <= VIEW_W + slack && y >= -slack && y <= VIEW_H + slack;
  const runs = [];
  let run = null;
  for (let i = 0; i < points.length; i++) {
    if (inside(points[i])) {
      if (!run) {
        run = [];
        if (i > 0) run.push(points[i - 1]);
      }
      run.push(points[i]);
    } else if (run) {
      run.push(points[i]);
      runs.push(run);
      run = null;
    }
  }
  if (run) runs.push(run);
  return runs.filter((r) => r.length >= 2);
}

const coloradoPath = projectedRings.map((ring) => pointsToPath(ring.map(toSvg), { close: true, minStep: 0.8 })).join(' ');

// ---- 4. Terrain relief from the real elevation grid -----------------------
//
// Two derived layers, both computed from co-elevation-grid.json:
//
//  (a) Hypsometric bands — closed contours traced at fixed elevation
//      thresholds with marching squares. Filled back-to-front, these give
//      the soft green-to-tan altitude tinting the reference shows, with the
//      Rockies genuinely where the Rockies are.
//
//  (b) Hillshade ridges — contour lines at a denser interval, drawn very
//      faintly, which read as relief texture/shading. Derived from the same
//      real surface, so ridge lines follow actual terrain.

const { cols, rows, west, east, south, north, elevations } = dem;

const elevAt = (c, r) => {
  const v = elevations[r * cols + c];
  return v === -9999 ? null : v;
};

/** Grid cell -> geographic coordinate. Row 0 is the northmost row. */
function gridToLonLat(c, r) {
  return [west + ((east - west) * c) / (cols - 1), north - ((north - south) * r) / (rows - 1)];
}

/**
 * Marching squares over the elevation grid, returning closed-ish polylines
 * along a given elevation threshold. Standard implementation: for each cell,
 * classify its four corners as above/below the threshold, look up which cell
 * edges the isoline crosses, and emit a linearly-interpolated segment. The
 * resulting segments are then stitched end-to-end into continuous lines.
 */
function marchingSquares(threshold) {
  const segments = [];
  const interp = (p1, p2, v1, v2) => {
    const t = (threshold - v1) / (v2 - v1);
    return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
  };

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const v = [elevAt(c, r), elevAt(c + 1, r), elevAt(c + 1, r + 1), elevAt(c, r + 1)];
      if (v.some((x) => x === null)) continue;
      const p = [gridToLonLat(c, r), gridToLonLat(c + 1, r), gridToLonLat(c + 1, r + 1), gridToLonLat(c, r + 1)];

      let idx = 0;
      if (v[0] >= threshold) idx |= 8;
      if (v[1] >= threshold) idx |= 4;
      if (v[2] >= threshold) idx |= 2;
      if (v[3] >= threshold) idx |= 1;
      if (idx === 0 || idx === 15) continue;

      // Midpoints on the four cell edges: top, right, bottom, left.
      const eTop = () => interp(p[0], p[1], v[0], v[1]);
      const eRight = () => interp(p[1], p[2], v[1], v[2]);
      const eBottom = () => interp(p[3], p[2], v[3], v[2]);
      const eLeft = () => interp(p[0], p[3], v[0], v[3]);

      const push = (a, b) => segments.push([a, b]);
      switch (idx) {
        case 1:
        case 14:
          push(eLeft(), eBottom());
          break;
        case 2:
        case 13:
          push(eBottom(), eRight());
          break;
        case 3:
        case 12:
          push(eLeft(), eRight());
          break;
        case 4:
        case 11:
          push(eTop(), eRight());
          break;
        case 5:
          push(eLeft(), eTop());
          push(eBottom(), eRight());
          break;
        case 6:
        case 9:
          push(eTop(), eBottom());
          break;
        case 7:
        case 8:
          push(eLeft(), eTop());
          break;
        case 10:
          push(eLeft(), eBottom());
          push(eTop(), eRight());
          break;
      }
    }
  }

  // Stitch segments into continuous polylines by matching endpoints.
  const key = ([x, y]) => `${x.toFixed(5)},${y.toFixed(5)}`;
  const startMap = new Map();
  for (const seg of segments) {
    const k = key(seg[0]);
    if (!startMap.has(k)) startMap.set(k, []);
    startMap.get(k).push(seg);
  }

  const used = new Set();
  const lines = [];
  for (const seg of segments) {
    if (used.has(seg)) continue;
    used.add(seg);
    const line = [seg[0], seg[1]];
    // Walk forward while a segment starts where this one ended.
    for (;;) {
      const candidates = startMap.get(key(line[line.length - 1])) ?? [];
      const next = candidates.find((s) => !used.has(s));
      if (!next) break;
      used.add(next);
      line.push(next[1]);
      if (line.length > 6000) break;
    }
    if (line.length >= 4) lines.push(line);
  }
  return lines;
}

/** Ramer-Douglas-Peucker in degree space, iterative to avoid deep recursion
 * on long contour lines. */
function simplify(points, epsilon) {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = -1;
    let index = -1;
    const [x1, y1] = points[first];
    const [x2, y2] = points[last];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const norm = Math.hypot(dx, dy) || 1;
    for (let i = first + 1; i < last; i++) {
      const [px, py] = points[i];
      const dist = Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / norm;
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }
    if (maxDist > epsilon && index > 0) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * Hypsometric relief bands. Each threshold yields the contour lines at that
 * elevation; we render them as filled shapes clipped to the state, painted
 * lightest-lowest to darkest-highest, which produces the layered green/tan
 * mountain shading. Thresholds are chosen across Colorado's real 973m-4064m
 * range so each band carries a meaningful amount of land.
 */
const RELIEF_THRESHOLDS = [1500, 1800, 2100, 2400, 2700, 3000, 3300, 3600];

const reliefBands = [];
for (const threshold of RELIEF_THRESHOLDS) {
  const lines = marchingSquares(threshold);
  const paths = [];
  for (const line of lines) {
    const simplified = simplify(line, 0.012);
    if (simplified.length < 4) continue;
    const projected = simplified.map(([lon, lat]) => project(lon, lat));
    // Contour lines from marching squares are already closed loops (or run
    // off the grid edge); closing them makes them fillable.
    const d = pointsToPath(projected, { close: true, minStep: 1.6 });
    if (d) paths.push(d);
  }
  if (paths.length) {
    reliefBands.push({ elevation: threshold, d: paths.join(' ') });
    console.log(`relief band ${threshold}m: ${lines.length} contours -> ${paths.length} paths`);
  }
}

/**
 * Ridge lines: a denser set of contours drawn as hairlines rather than
 * fills. These supply the fine "relief texture" of the reference artwork.
 * Simplified harder than the bands since they're decorative hairlines.
 */
const RIDGE_THRESHOLDS = [2250, 2550, 2850, 3150, 3450];
const ridgePaths = [];
for (const threshold of RIDGE_THRESHOLDS) {
  for (const line of marchingSquares(threshold)) {
    const simplified = simplify(line, 0.02);
    if (simplified.length < 6) continue;
    const projected = simplified.map(([lon, lat]) => project(lon, lat));
    const d = pointsToPath(projected, { minStep: 2.2 });
    if (d) ridgePaths.push(d);
  }
}
const ridgeLinesPath = ridgePaths.join(' ');
console.log(`ridge lines: ${ridgePaths.length} paths`);

// ---- 5. Counties, rivers, lakes, roads ------------------------------------

const countyPath = geo.countyLines
  .map((line) => clipToView(projectLine(line)).map((run) => pointsToPath(run, { minStep: 1.4 })))
  .flat()
  .filter(Boolean)
  .join(' ');

const riverPath = geo.riverLines
  .map((line) => clipToView(projectLine(line)).map((run) => pointsToPath(run, { minStep: 1.4 })))
  .flat()
  .filter(Boolean)
  .join(' ');

const lakePath = geo.lakeRings
  .map((ring) => pointsToPath(projectLine(ring), { close: true, minStep: 1 }))
  .filter(Boolean)
  .join(' ');

/** Merge every segment of a given route into one path string. Natural Earth
 * splits long routes into many features; drawing them as one path keeps the
 * emitted data smaller and the stroke consistent. */
function routePath(predicate, minStep = 1.4) {
  return geo.roads
    .filter(predicate)
    .map((r) => clipToView(projectLine(r.coords)).map((run) => pointsToPath(run, { minStep })))
    .flat()
    .filter(Boolean)
    .join(' ');
}

const i25Path = routePath((r) => r.kind === 'interstate' && r.route === '25');
const i70Path = routePath((r) => r.kind === 'interstate' && r.route === '70');
// Other interstates in-frame (I-76 north-east, I-225/I-270 around Denver)
// drawn slightly lighter as background context.
const otherInterstatePath = routePath(
  (r) => r.kind === 'interstate' && !['25', '70'].includes(r.route)
);
// US routes — the reference shows US-24 running west from Colorado Springs
// through Woodland Park, which is exactly the corridor several service
// communities sit on.
const usRoutePath = routePath((r) => r.kind === 'us', 1.8);

console.log(
  `roads: I-25 ${i25Path.length}ch, I-70 ${i70Path.length}ch, other-I ${otherInterstatePath.length}ch, US ${usRoutePath.length}ch`
);

// ---- 6. Service-area markers ----------------------------------------------
//
// Coordinates are copy-verified 1:1 against src/data/business.ts
// serviceAreas. They are restated here (rather than imported) so this stays
// a plain zero-dependency Node script that doesn't need to parse TypeScript.

const serviceAreas = [
  { name: 'Colorado Springs', slug: 'colorado-springs', type: 'primary', latitude: 38.8484, longitude: -104.8397 },
  { name: 'Black Forest', slug: 'black-forest', type: 'surrounding', latitude: 39.013, longitude: -104.7008 },
  { name: 'Cascade', slug: 'cascade', type: 'surrounding', latitude: 38.8966, longitude: -104.9722 },
  { name: 'Castle Rock', slug: 'castle-rock', type: 'surrounding', latitude: 39.3722, longitude: -104.8561 },
  { name: 'Falcon', slug: 'falcon', type: 'surrounding', latitude: 38.933, longitude: -104.6086 },
  { name: 'Fountain', slug: 'fountain', type: 'surrounding', latitude: 38.6822, longitude: -104.7008 },
  { name: 'Highlands Ranch', slug: 'highlands-ranch', type: 'surrounding', latitude: 39.5439, longitude: -104.9878 },
  { name: 'Manitou Springs', slug: 'manitou-springs', type: 'surrounding', latitude: 38.854, longitude: -104.906 },
  { name: 'Monument', slug: 'monument', type: 'surrounding', latitude: 39.0917, longitude: -104.8728 },
  { name: 'Palmer Lake', slug: 'palmer-lake', type: 'surrounding', latitude: 39.115, longitude: -104.905 },
  { name: 'Parker', slug: 'parker', type: 'surrounding', latitude: 39.5186, longitude: -104.7614 },
  { name: 'Peyton', slug: 'peyton', type: 'surrounding', latitude: 39.0289, longitude: -104.483 },
  { name: 'Security', slug: 'security', type: 'surrounding', latitude: 38.7492, longitude: -104.7256 },
  { name: 'Widefield', slug: 'widefield', type: 'surrounding', latitude: 38.7047, longitude: -104.7136 },
  { name: 'Woodland Park', slug: 'woodland-park', type: 'surrounding', latitude: 38.9939, longitude: -105.0569 }
];

// The five communities with a dedicated landing page (src/data/cityPages.ts).
// Restated for the same zero-dependency reason; the component re-derives
// link targets from cityPages itself, so this only affects nothing but is
// kept in sync for reference.
const PAGED_SLUGS = new Set(['castle-rock', 'falcon', 'fountain', 'monument', 'woodland-park']);

// Guard the framing constants above: if a service area is added, removed or
// moved such that the cluster's extent changes, the hardcoded MARKER_LON_LAT
// bounds would silently mis-frame the map. Fail loudly instead.
{
  const lons = serviceAreas.map((a) => a.longitude);
  const lats = serviceAreas.map((a) => a.latitude);
  const actual = [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)]
  ];
  const expected = MARKER_LON_LAT;
  const same = actual.every((pair, i) => pair.every((v, j) => Math.abs(v - expected[i][j]) < 1e-6));
  if (!same) {
    throw new Error(
      `MARKER_LON_LAT is stale. Update the framing bounds near the top of this file to:\n` +
        `  [[${actual[0][0]}, ${actual[0][1]}], [${actual[1][0]}, ${actual[1][1]}]]`
    );
  }
}

const projectedMarkers = serviceAreas.map((area) => {
  const [x, y] = project(area.longitude, area.latitude);
  return {
    name: area.name,
    slug: area.slug,
    type: area.type,
    hasLocationPage: PAGED_SLUGS.has(area.slug),
    x: fmt(x),
    y: fmt(y)
  };
});

const projectedReferences = [{ name: 'Denver', latitude: 39.7392, longitude: -104.9903 }].map((ref) => {
  const [x, y] = project(ref.longitude, ref.latitude);
  return { name: ref.name, x: fmt(x), y: fmt(y) };
});

// ---- 7. Coverage-area hull -------------------------------------------------
//
// A padded, smoothed convex hull over the REAL projected markers (excluding
// Denver, which must never read as inside the coverage area). Communicates
// the service footprint without implying statewide coverage.

function crossProduct(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function convexHull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length <= 2) return pts;
  const build = (source) => {
    const chain = [];
    for (const p of source) {
      while (chain.length >= 2 && crossProduct(chain[chain.length - 2], chain[chain.length - 1], p) <= 0) chain.pop();
      chain.push(p);
    }
    chain.pop();
    return chain;
  };
  return build(pts).concat(build([...pts].reverse()));
}

/** Expands a convex polygon outward from its centroid. */
function expandHull(hull, padding) {
  const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p[1], 0) / hull.length;
  return hull.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const k = (dist + padding) / dist;
    return [cx + dx * k, cy + dy * k];
  });
}

/** Closed polygon -> smooth path via quadratic beziers through edge
 * midpoints, turning the faceted hull into an organic coverage blob. */
function smoothPolygonPath(points) {
  const count = points.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(points[count - 1], points[0]);
  let d = `M${fmt(start[0])},${fmt(start[1])}`;
  for (let i = 0; i < count; i++) {
    const curr = points[i];
    const m = mid(curr, points[(i + 1) % count]);
    d += `Q${fmt(curr[0])},${fmt(curr[1])} ${fmt(m[0])},${fmt(m[1])}`;
  }
  return `${d}Z`;
}

const hullPoints = projectedMarkers.map((m) => [m.x, m.y]);
const rawHull = convexHull(hullPoints);
const coverageAreaPath = smoothPolygonPath(expandHull(rawHull, 26));

// ---- 8. Interstate shield anchors -----------------------------------------
//
// Placed at real points ALONG each projected route (sampled at a fraction of
// the route's own length) rather than at guessed coordinates, so a shield
// always sits on its highway.

/** Returns the point at `t` (0-1) along a route's total length. */
function pointAlongRoute(predicate, t) {
  const segs = geo.roads.filter(predicate).map((r) => clipToView(projectLine(r.coords))).flat();
  if (!segs.length) return null;
  // Use the longest visible run so shields land on the main trunk, not a stub.
  const runLength = (run) => run.reduce((sum, p, i) => (i ? sum + Math.hypot(p[0] - run[i - 1][0], p[1] - run[i - 1][1]) : 0), 0);
  const sorted = segs.sort((a, b) => runLength(b) - runLength(a));
  const run = sorted[0];
  const total = runLength(run);
  let travelled = 0;
  const target = total * t;
  for (let i = 1; i < run.length; i++) {
    const d = Math.hypot(run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1]);
    if (travelled + d >= target) {
      const f = d ? (target - travelled) / d : 0;
      return [run[i - 1][0] + (run[i][0] - run[i - 1][0]) * f, run[i - 1][1] + (run[i][1] - run[i - 1][1]) * f];
    }
    travelled += d;
  }
  return run[run.length - 1];
}

const shieldSpecs = [
  { interstate: 'I-25', predicate: (r) => r.kind === 'interstate' && r.route === '25', t: 0.12 },
  { interstate: 'I-25', predicate: (r) => r.kind === 'interstate' && r.route === '25', t: 0.92 },
  { interstate: 'I-70', predicate: (r) => r.kind === 'interstate' && r.route === '70', t: 0.18 },
  { interstate: 'I-70', predicate: (r) => r.kind === 'interstate' && r.route === '70', t: 0.86 }
];

const roadShields = shieldSpecs
  .map((spec) => {
    const pt = pointAlongRoute(spec.predicate, spec.t);
    return pt ? { interstate: spec.interstate, x: fmt(pt[0]), y: fmt(pt[1]) } : null;
  })
  .filter(Boolean);

// ---- 9. Emit the generated module -----------------------------------------

const banner = `/**
 * GENERATED FILE — do not hand-edit.
 * Run \`node scripts/generate-service-area-map.mjs\` to regenerate.
 *
 * Every path below is projected from a REAL public-domain geographic
 * dataset through an Albers equal-area conic projection (standard parallels
 * 37N/41N) fit to a ${VIEW_W}x${VIEW_H} viewBox:
 *
 *  • State outline  — us-atlas 3.0.1 states-10m (US Census, public domain)
 *  • Counties       — us-atlas 3.0.1 counties-10m (US Census, public domain)
 *  • Rivers / lakes — Natural Earth 10m physical vectors (public domain)
 *  • Highways       — Natural Earth 10m roads (public domain); I-25 and I-70
 *                     are the real surveyed alignments, selected by Natural
 *                     Earth's \`level=Interstate\` attribute
 *  • Terrain relief — hypsometric contour bands + ridge hairlines traced by
 *                     marching squares over a real 300x190 elevation grid
 *                     from NOAA NCEI's DEM_mosaics ImageServer (US
 *                     Government work, public domain)
 *  • Markers        — the canonical serviceAreas lat/lng in
 *                     src/data/business.ts, projected identically
 *
 * No mapping library, GeoJSON or TopoJSON reaches the browser — only these
 * static strings.
 */
`;

const out =
  banner +
  `export const MAP_VIEW_BOX = '0 0 ${VIEW_W} ${VIEW_H}';\n` +
  `export const MAP_WIDTH = ${VIEW_W};\n` +
  `export const MAP_HEIGHT = ${VIEW_H};\n\n` +
  `/** Colorado's state boundary. */\n` +
  `export const coloradoPath = ${JSON.stringify(coloradoPath)};\n\n` +
  `/** Hypsometric relief bands, ascending by elevation (metres). Fill these\n * back-to-front — each band is the land at or above its elevation. */\n` +
  `export interface ReliefBand {\n  elevation: number;\n  d: string;\n}\n` +
  `export const reliefBands: ReliefBand[] = ${JSON.stringify(reliefBands, null, 2)};\n\n` +
  `/** Fine contour hairlines that read as terrain texture. */\n` +
  `export const ridgeLinesPath = ${JSON.stringify(ridgeLinesPath)};\n\n` +
  `/** County boundaries, drawn once per shared edge (not per polygon). */\n` +
  `export const countyPath = ${JSON.stringify(countyPath)};\n\n` +
  `/** Rivers and lakes. */\n` +
  `export const riverPath = ${JSON.stringify(riverPath)};\n` +
  `export const lakePath = ${JSON.stringify(lakePath)};\n\n` +
  `/** Real interstate/US route alignments. */\n` +
  `export const i25Path = ${JSON.stringify(i25Path)};\n` +
  `export const i70Path = ${JSON.stringify(i70Path)};\n` +
  `export const otherInterstatePath = ${JSON.stringify(otherInterstatePath)};\n` +
  `export const usRoutePath = ${JSON.stringify(usRoutePath)};\n\n` +
  `/** Soft coverage-area blob: a padded, smoothed convex hull around the\n * real projected service markers only (never Denver), so it can never\n * imply statewide service. */\n` +
  `export const coverageAreaPath = ${JSON.stringify(coverageAreaPath)};\n\n` +
  `export interface RoadShield {\n  interstate: string;\n  x: number;\n  y: number;\n}\n` +
  `/** Shield anchors sampled at real points along each projected route. */\n` +
  `export const roadShields: RoadShield[] = ${JSON.stringify(roadShields, null, 2)};\n\n` +
  `export interface ProjectedMarker {\n  name: string;\n  slug: string;\n  type: 'primary' | 'surrounding';\n  hasLocationPage: boolean;\n  x: number;\n  y: number;\n}\n\n` +
  `export interface ProjectedReference {\n  name: string;\n  x: number;\n  y: number;\n}\n\n` +
  `export const projectedMarkers: ProjectedMarker[] = ${JSON.stringify(projectedMarkers, null, 2)};\n\n` +
  `export const projectedReferences: ProjectedReference[] = ${JSON.stringify(projectedReferences, null, 2)};\n`;

writeFileSync(outPath, out, 'utf8');

const kb = (s) => `${(s.length / 1024).toFixed(1)}KB`;
console.log(`\nWrote ${outPath}`);
console.log(`  total file        ${kb(out)}`);
console.log(`  state outline     ${kb(coloradoPath)}`);
console.log(`  relief bands      ${kb(reliefBands.map((b) => b.d).join(''))} (${reliefBands.length} bands)`);
console.log(`  ridge lines       ${kb(ridgeLinesPath)}`);
console.log(`  counties          ${kb(countyPath)}`);
console.log(`  rivers            ${kb(riverPath)}`);
console.log(`  roads             ${kb(i25Path + i70Path + otherInterstatePath + usRoutePath)}`);
console.log(`  ${projectedMarkers.length} markers, ${roadShields.length} shields`);
for (const m of projectedMarkers) {
  console.log(`    ${m.name.padEnd(18)} (${m.type}) -> x=${m.x} y=${m.y}`);
}
