/**
 * Dev-time extraction step: reduce the large upstream geodata downloads to
 * small, Colorado-only GeoJSON files that can be committed under scripts/.
 *
 * Inputs (downloaded to the scratchpad, never committed — they are 8-50MB):
 *   counties-10m.json    us-atlas 3.0.1 (US Census cartographic boundaries)
 *   ne_rivers_na.geojson Natural Earth 10m rivers, North America supplement
 *   ne_rivers.geojson    Natural Earth 10m rivers + lake centerlines
 *   ne_lakes.geojson     Natural Earth 10m lakes
 *   ne_roads.geojson     Natural Earth 10m roads
 *
 * Output: co-geo.json — everything clipped to a Colorado bounding box and
 * simplified with Ramer-Douglas-Peucker, small enough to commit.
 */
import { readFileSync, writeFileSync } from 'node:fs';

// Colorado's true extent is [-109.06, 37.0] to [-102.04, 41.0]. We clip to a
// slightly larger window so lines that leave and re-enter the state, and any
// context just past the border, are retained rather than snipped at the edge.
const BB = { west: -109.6, south: 36.6, east: -101.5, north: 41.4 };

const inBB = ([lon, lat]) => lon >= BB.west && lon <= BB.east && lat >= BB.south && lat <= BB.north;

/** Ramer-Douglas-Peucker line simplification, operating in degrees. */
function rdp(points, epsilon) {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  const [x1, y1] = points[0];
  const [x2, y2] = points[points.length - 1];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const norm = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    const dist = Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / norm;
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }
  if (maxDist <= epsilon) return [points[0], points[points.length - 1]];
  return [...rdp(points.slice(0, index + 1), epsilon).slice(0, -1), ...rdp(points.slice(index), epsilon)];
}

/** Splits a line into the runs of consecutive points that fall inside the
 * bounding box, so a river crossing the window yields only its in-window
 * segments (plus one point of overshoot each side so it reaches the edge). */
function clipLine(coords) {
  const runs = [];
  let run = null;
  for (let i = 0; i < coords.length; i++) {
    if (inBB(coords[i])) {
      if (!run) {
        run = [];
        if (i > 0) run.push(coords[i - 1]); // overshoot so the line meets the edge
      }
      run.push(coords[i]);
    } else if (run) {
      run.push(coords[i]);
      runs.push(run);
      run = null;
    }
  }
  if (run) runs.push(run);
  return runs.filter((r) => r.length >= 2);
}

function lineStrings(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return [geometry.coordinates];
  if (geometry.type === 'MultiLineString') return geometry.coordinates;
  return [];
}

const round = (v) => Math.round(v * 10000) / 10000;
const roundLine = (l) => l.map(([x, y]) => [round(x), round(y)]);

// ---------------------------------------------------------------- counties
const countiesTopo = JSON.parse(readFileSync('./counties-10m.json', 'utf8'));
const { scale: cScale, translate: cTranslate } = countiesTopo.transform;

function decodeCountyArc(index) {
  const raw = countiesTopo.arcs[index < 0 ? ~index : index];
  let x = 0;
  let y = 0;
  const pts = raw.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * cScale[0] + cTranslate[0], y * cScale[1] + cTranslate[1]];
  });
  return index < 0 ? pts.reverse() : pts;
}

// Colorado county interior boundaries. Rather than emitting 64 closed
// polygons (which would draw every shared border twice), we collect the
// distinct ARC indices used by Colorado counties and draw each arc once as
// an open line. That halves the path data and avoids double-stroked lines.
const coCounties = countiesTopo.objects.counties.geometries.filter((g) => String(g.id).startsWith('08'));
const countyArcIds = new Set();
for (const geom of coCounties) {
  const rings = geom.type === 'Polygon' ? geom.arcs : geom.arcs.flat();
  for (const ring of rings) for (const a of ring) countyArcIds.add(a < 0 ? ~a : a);
}
const countyLines = [...countyArcIds]
  .map((i) => decodeCountyArc(i))
  .map((line) => rdp(line, 0.008))
  .filter((l) => l.length >= 2)
  .map(roundLine);

console.log(`counties: ${coCounties.length} counties -> ${countyLines.length} unique boundary arcs`);

// ------------------------------------------------------------------ rivers
const riverFeatures = [];
for (const file of ['./ne_rivers_na.geojson', './ne_rivers.geojson']) {
  const fc = JSON.parse(readFileSync(file, 'utf8'));
  for (const f of fc.features) {
    for (const line of lineStrings(f.geometry)) {
      for (const run of clipLine(line)) {
        riverFeatures.push({ name: f.properties.name ?? null, coords: run });
      }
    }
  }
}
// De-duplicate: the two Natural Earth files overlap for major rivers.
const seenRiver = new Set();
const riverLines = [];
for (const r of riverFeatures) {
  const simplified = rdp(r.coords, 0.006);
  if (simplified.length < 2) continue;
  const key = simplified
    .slice(0, 3)
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join('|');
  if (seenRiver.has(key)) continue;
  seenRiver.add(key);
  riverLines.push(roundLine(simplified));
}
console.log(`rivers: ${riverLines.length} clipped+simplified segments`);

// ------------------------------------------------------------------- lakes
const lakesFc = JSON.parse(readFileSync('./ne_lakes.geojson', 'utf8'));
const lakeRings = [];
for (const f of lakesFc.features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys) {
    const outer = poly[0];
    if (!outer.some(inBB)) continue;
    const simplified = rdp(outer, 0.004);
    if (simplified.length >= 4) lakeRings.push(roundLine(simplified));
  }
}
console.log(`lakes: ${lakeRings.length} rings`);

// ------------------------------------------------------------------- roads
const roadsFc = JSON.parse(readFileSync('./ne_roads.geojson', 'utf8'));
const roads = [];
for (const f of roadsFc.features) {
  const p = f.properties;
  const isInterstate = p.level === 'Interstate';
  const isUsRoute = p.level === 'Federal';
  if (!isInterstate && !isUsRoute) continue;
  for (const line of lineStrings(f.geometry)) {
    for (const run of clipLine(line)) {
      const simplified = rdp(run, 0.004);
      if (simplified.length < 2) continue;
      roads.push({
        route: p.name ?? null,
        kind: isInterstate ? 'interstate' : 'us',
        coords: roundLine(simplified)
      });
    }
  }
}
const roadCounts = {};
for (const r of roads) roadCounts[`${r.kind}-${r.route}`] = (roadCounts[`${r.kind}-${r.route}`] || 0) + 1;
console.log('roads:', roads.length, 'segments;', JSON.stringify(roadCounts));

// ------------------------------------------------------------------ output
const out = {
  source: {
    counties: 'us-atlas 3.0.1 counties-10m (US Census cartographic boundaries, public domain)',
    rivers: 'Natural Earth 10m rivers (lake centerlines + North America supplement), public domain',
    lakes: 'Natural Earth 10m lakes, public domain',
    roads: 'Natural Earth 10m roads, public domain'
  },
  bbox: BB,
  countyLines,
  riverLines,
  lakeRings,
  roads
};
writeFileSync('./co-geo.json', JSON.stringify(out));
const bytes = readFileSync('./co-geo.json').length;
console.log(`Wrote co-geo.json (${(bytes / 1024).toFixed(0)} KB)`);
