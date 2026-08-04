/**
 * Dev-time fetch of a coarse REAL elevation grid covering Colorado, from
 * NOAA NCEI's public DEM_mosaics/DEM_all ImageServer (US Government work,
 * public domain). The service returns an uncompressed 32-bit float GeoTIFF
 * which we decode with a tiny purpose-built reader — no image library and
 * nothing at all ships to the browser; only the derived contour paths do.
 *
 * Output: co-elevation-grid.json
 */
import { writeFileSync } from 'node:fs';

const BB = { west: -109.3, south: 36.8, east: -101.8, north: 41.2 };
const COLS = 300;
const ROWS = 190;

const url =
  `https://gis.ngdc.noaa.gov/arcgis/rest/services/DEM_mosaics/DEM_all/ImageServer/exportImage` +
  `?bbox=${BB.west},${BB.south},${BB.east},${BB.north}` +
  `&bboxSR=4326&imageSR=4326&size=${COLS},${ROWS}&format=tiff&pixelType=F32&noData=-9999&f=image`;

const res = await fetch(url);
if (!res.ok) throw new Error(`DEM request failed: ${res.status}`);
const buf = Buffer.from(await res.arrayBuffer());
console.log(`Fetched ${buf.length} bytes of GeoTIFF`);

/** Minimal baseline-TIFF reader: enough to pull an uncompressed single-band
 * float32 raster out of an ArcGIS exportImage response. */
function readTiff(b) {
  const le = b.toString('ascii', 0, 2) === 'II';
  const u16 = (o) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
  const u32 = (o) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
  const magic = u16(2);
  if (magic !== 42) throw new Error(`Not a baseline TIFF (magic ${magic})`);

  const ifdOffset = u32(4);
  const entryCount = u16(ifdOffset);
  const tags = {};
  for (let i = 0; i < entryCount; i++) {
    const entry = ifdOffset + 2 + i * 12;
    const tag = u16(entry);
    const type = u16(entry + 2);
    const count = u32(entry + 4);
    const typeSize = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 11: 4, 12: 8 }[type] ?? 1;
    const total = typeSize * count;
    const valueOffset = total <= 4 ? entry + 8 : u32(entry + 8);
    const read = (idx) => {
      const o = valueOffset + idx * typeSize;
      if (type === 3) return u16(o);
      if (type === 4) return u32(o);
      if (type === 1) return b.readUInt8(o);
      return u32(o);
    };
    tags[tag] = { type, count, valueOffset, values: Array.from({ length: Math.min(count, 16) }, (_, k) => read(k)) };
  }

  const width = tags[256].values[0];
  const height = tags[257].values[0];
  const bitsPerSample = tags[258]?.values[0] ?? 32;
  const compression = tags[259]?.values[0] ?? 1;
  const sampleFormat = tags[339]?.values[0] ?? 1; // 3 = IEEE float

  if (compression !== 1) throw new Error(`Unsupported TIFF compression ${compression}`);
  if (bitsPerSample !== 32 || sampleFormat !== 3) throw new Error('Expected uncompressed float32 samples');

  const readOffsets = (tag) => {
    const size = tag.type === 3 ? 2 : 4;
    return Array.from({ length: tag.count }, (_, i) =>
      tag.type === 3 ? u16(tag.valueOffset + i * size) : u32(tag.valueOffset + i * size)
    );
  };

  const out = new Float32Array(width * height);
  const readFloat = (o) => (le ? b.readFloatLE(o) : b.readFloatBE(o));

  if (tags[324]) {
    // Tiled layout: ArcGIS returns 128x128 tiles padded to full tile size.
    const tileWidth = tags[322].values[0];
    const tileLength = tags[323].values[0];
    const tileOffsets = readOffsets(tags[324]);
    const tilesAcross = Math.ceil(width / tileWidth);
    console.log(
      `TIFF ${width}x${height} float32, tiled ${tileWidth}x${tileLength}, ${tileOffsets.length} tiles (${tilesAcross} across)`
    );
    for (let t = 0; t < tileOffsets.length; t++) {
      const tileCol = t % tilesAcross;
      const tileRow = Math.floor(t / tilesAcross);
      const base = tileOffsets[t];
      for (let y = 0; y < tileLength; y++) {
        const imgY = tileRow * tileLength + y;
        if (imgY >= height) break;
        for (let x = 0; x < tileWidth; x++) {
          const imgX = tileCol * tileWidth + x;
          if (imgX >= width) continue;
          out[imgY * width + imgX] = readFloat(base + (y * tileWidth + x) * 4);
        }
      }
    }
  } else {
    // Stripped layout.
    const rowsPerStrip = tags[278]?.values[0] ?? height;
    const stripOffsets = readOffsets(tags[273]);
    console.log(`TIFF ${width}x${height} float32, ${stripOffsets.length} strips`);
    let written = 0;
    for (let s = 0; s < stripOffsets.length; s++) {
      const rowsInStrip = Math.min(rowsPerStrip, height - s * rowsPerStrip);
      for (let i = 0; i < rowsInStrip * width; i++) out[written++] = readFloat(stripOffsets[s] + i * 4);
    }
  }
  return { width, height, data: out };
}

const { width, height, data } = readTiff(buf);

const valid = [...data].filter((v) => Number.isFinite(v) && v > -1000 && v < 9000);
console.log(`Decoded ${data.length} samples; ${valid.length} valid; range ${Math.min(...valid)}m - ${Math.max(...valid)}m`);

// Sanity check against known Colorado geography before trusting the grid.
const at = (lat, lon) => {
  const c = Math.round(((lon - BB.west) / (BB.east - BB.west)) * (width - 1));
  const r = Math.round(((BB.north - lat) / (BB.north - BB.south)) * (height - 1));
  return data[r * width + c];
};
console.log('Sanity checks (expected approx):');
console.log(`  Colorado Springs (38.84,-104.82): ${Math.round(at(38.84, -104.82))}m (expect ~1840m)`);
console.log(`  Mt Elbert area   (39.12,-106.45): ${Math.round(at(39.12, -106.45))}m (expect ~4000m+)`);
console.log(`  Eastern plains   (38.50,-102.50): ${Math.round(at(38.5, -102.5))}m (expect ~1100m)`);
console.log(`  Denver           (39.74,-104.99): ${Math.round(at(39.74, -104.99))}m (expect ~1600m)`);

writeFileSync(
  './co-elevation-grid.json',
  JSON.stringify({
    source: 'NOAA NCEI DEM_mosaics/DEM_all ImageServer (US Government, public domain)',
    fetched: new Date().toISOString().slice(0, 10),
    ...BB,
    cols: width,
    rows: height,
    note: 'Row-major, row 0 = northmost. Elevations in metres, rounded.',
    elevations: Array.from(data, (v) => (Number.isFinite(v) ? Math.round(v) : -9999))
  })
);
console.log('Wrote co-elevation-grid.json');
