/**
 * scripts/generate-icons.js
 *
 * Generates the PNG icons for the Injectify Chrome extension.
 * Uses the `jimp` package (pure-JavaScript, no native bindings).
 *
 * Usage:
 *   npm install jimp --save-dev
 *   node scripts/generate-icons.js
 *
 * Output: extension/icons/icon{16,48,128}.png
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const { Jimp } = require('jimp');

const SIZES   = [16, 48, 128];
const OUT_DIR = path.resolve(__dirname, '..', 'extension', 'icons');

// Brand colour: Indigo #4F46E5
const BG_R = 0x4f, BG_G = 0x46, BG_B = 0xe5;

async function generateIcons() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const size of SIZES) {
    const data = Buffer.alloc(size * size * 4);

    // Fill with brand colour (opaque)
    for (let i = 0; i < size * size; i++) {
      data[i * 4 + 0] = BG_R;
      data[i * 4 + 1] = BG_G;
      data[i * 4 + 2] = BG_B;
      data[i * 4 + 3] = 255;
    }

    function setPixel(x, y, r, g, b, a = 255) {
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      const idx = (y * size + x) * 4;
      data[idx] = r; data[idx+1] = g; data[idx+2] = b; data[idx+3] = a;
    }

    // Rounded-rectangle mask
    const radius = Math.round(size * 0.18);
    for (let x = 0; x < radius; x++) {
      for (let y = 0; y < radius; y++) {
        if (Math.sqrt((radius - x) ** 2 + (radius - y) ** 2) > radius) {
          setPixel(x, y, 0, 0, 0, 0);
          setPixel(size - 1 - x, y, 0, 0, 0, 0);
          setPixel(x, size - 1 - y, 0, 0, 0, 0);
          setPixel(size - 1 - x, size - 1 - y, 0, 0, 0, 0);
        }
      }
    }

    // Capital "I" in white
    const barH  = Math.max(2, Math.round(size * 0.12));
    const stemW = Math.max(2, Math.round(size * 0.12));
    const barW  = Math.max(4, Math.round(size * 0.40));
    const mX    = Math.round((size - barW) / 2);
    const sX    = Math.round((size - stemW) / 2);
    const totH  = Math.round(size * 0.60);
    const topY  = Math.round((size - totH) / 2);
    const botY  = topY + totH - barH;

    function fillRect(x, y, w, h) {
      for (let px = x; px < x + w; px++)
        for (let py = y; py < y + h; py++)
          setPixel(px, py, 255, 255, 255);
    }

    fillRect(mX, topY, barW, barH);
    fillRect(mX, botY, barW, barH);
    fillRect(sX, topY + barH, stemW, totH - 2 * barH);

    const img = Jimp.fromBitmap({ width: size, height: size, data });
    const buf = await img.getBuffer('image/png');
    const outPath = path.join(OUT_DIR, `icon${size}.png`);
    fs.writeFileSync(outPath, buf);
    console.log(`✔ Generated ${outPath}`);
  }
}

generateIcons().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
