/**
 * Genera iconos PNG para la PWA sin dependencias externas.
 * Uso: node scripts/gen-icons.mjs
 */
import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ── CRC32 ──────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

// ── Pixel-art bitmap font (5×7) ────────────────────────────────────────────
const GLYPHS = {
  F: [
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,1,1,1,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
  ],
  T: [
    [1,1,1,1,1],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
  ],
};

// ── Generador de PNG ───────────────────────────────────────────────────────
function generateIcon(size) {
  const BG  = [0x1B, 0x5E, 0x20]; // #1B5E20
  const FG  = [0xFF, 0xFF, 0xFF]; // blanco

  // Canvas de pixeles (RGB)
  const pixels = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => [...BG])
  );

  // Escala y posición del texto "FT"
  const GW = 5, GH = 7;
  const scale = Math.max(1, Math.floor(size / 16));
  const gap   = Math.max(1, Math.floor(scale * 1.5));
  const totalW = 2 * GW * scale + gap;
  const totalH = GH * scale;
  const ox = Math.floor((size - totalW) / 2);
  const oy = Math.floor((size - totalH) / 2);

  ['F', 'T'].forEach((letter, li) => {
    const glyph = GLYPHS[letter];
    const lx = ox + li * (GW * scale + gap);
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        if (!glyph[gy][gx]) continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = lx + gx * scale + sx;
            const py = oy + gy * scale + sy;
            if (px >= 0 && px < size && py >= 0 && py < size) {
              pixels[py][px] = [...FG];
            }
          }
        }
      }
    }
  });

  // Construir datos crudos (filter byte 0 + RGB por fila)
  const rowBytes = 1 + size * 3;
  const raw = Buffer.alloc(size * rowBytes);
  for (let y = 0; y < size; y++) {
    raw[y * rowBytes] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixels[y][x];
      raw[y * rowBytes + 1 + x * 3]     = r;
      raw[y * rowBytes + 1 + x * 3 + 1] = g;
      raw[y * rowBytes + 1 + x * 3 + 2] = b;
    }
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB

  const PNG_SIG = Buffer.from([137,80,78,71,13,10,26,10]);
  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Main ───────────────────────────────────────────────────────────────────
const publicDir = join(process.cwd(), 'public');

for (const size of [192, 512]) {
  const filename = `pwa-${size}x${size}.png`;
  writeFileSync(join(publicDir, filename), generateIcon(size));
  console.log(`✓ public/${filename}`);
}
console.log('Iconos generados correctamente.');
