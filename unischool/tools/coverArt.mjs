// ---------------------------------------------------------------------
// WHAT THE STORE PICTURES SHARE: the itch.io cover (itchCover.mjs) and the
// Steam capsules (steamCapsules.mjs) both lay the title screen's mark and
// name over a bare campus shot. This is the part they have in common: the
// mark read from Logo.tsx, the name's face, the title art's sky, a
// Chromium to draw them in, and a reader for the size of what it wrote.
// ---------------------------------------------------------------------

import { readFileSync, writeFileSync, mkdtempSync, existsSync, openSync, readSync, closeSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// The mark's paths, read from Logo.tsx so a picture never drifts from it.
export function logoMark(className) {
  const logo = readFileSync(join(ROOT, 'src/components/Logo.tsx'), 'utf8');
  const paths = [...logo.matchAll(/<path\s+(?:fillRule="evenodd"\s+)?d="([^"]+)"/g)].map((m, i) => `<path ${i === 0 ? 'fill-rule="evenodd" ' : ''}d="${m[1]}"/>`);
  const viewBox = logo.match(/viewBox="([^"]+)"/)[1];
  return `<svg class="${className}" viewBox="${viewBox}"><g fill="currentColor">${paths.join('')}</g></svg>`;
}

// The name's face: Archivo 800, as styles.css's .logo-name sets it.
export function archivoFace() {
  const font = readFileSync(join(ROOT, 'node_modules/@fontsource/archivo/files/archivo-latin-800-normal.woff2')).toString('base64');
  return `@font-face { font-family: 'Archivo'; font-weight: 800; src: url(data:font/woff2;base64,${font}) format('woff2'); }`;
}

// Vivid (the owner's taste, 11 October): the photo brightened and
// saturated, and the sky band a clearer, more cyan blue.
export const photoFilter = (vivid) => (vivid ? 'filter: brightness(1.22) saturate(1.2) contrast(1.04);' : '');
export const skyStops = (vivid) =>
  vivid
    ? 'rgba(40, 165, 250, 0.95) 0%, rgba(70, 180, 250, 0.8) 45%, rgba(120, 200, 245, 0.35) 75%, rgba(150, 210, 240, 0) 100%'
    : 'rgba(58, 128, 205, 0.92) 0%, rgba(86, 152, 220, 0.78) 45%, rgba(120, 175, 225, 0.35) 75%, rgba(150, 190, 225, 0) 100%';

export function findChromium() {
  const candidates = [process.env.CHROME_PATH, `${process.env.PLAYWRIGHT_BROWSERS_PATH ?? ''}/chromium-1194/chrome-linux/chrome`, '/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) { console.error('no Chromium found; set CHROME_PATH.'); process.exit(2); }
  return found;
}

// Draws each page in one browser: [{ html, width, height, scale, out, selector, type, omitBackground }].
export async function drawPages(pages) {
  const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
  const dir = mkdtempSync(join(tmpdir(), 'cover-'));
  try {
    for (const [i, p] of pages.entries()) {
      const file = join(dir, `page-${i}.html`);
      writeFileSync(file, p.html);
      const tab = await browser.newPage({ viewport: { width: p.width, height: p.height }, deviceScaleFactor: p.scale ?? 1 });
      await tab.goto(`file://${file}`);
      await tab.evaluate(() => document.fonts.ready);
      await tab.locator(p.selector).screenshot({
        path: p.out,
        type: p.type,
        ...(p.type === 'jpeg' ? { quality: p.quality ?? 90 } : {}),
        omitBackground: p.omitBackground ?? false,
      });
      await tab.close();
    }
  } finally {
    await browser.close();
  }
}

// The pixel size of a PNG or a JPEG, from its header.
export function imageSize(path) {
  const fd = openSync(path, 'r');
  const buf = Buffer.alloc(1 << 16);
  const n = readSync(fd, buf, 0, buf.length, 0);
  closeSync(fd);
  if (buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < n) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      // A start-of-frame marker (SOF0 to SOF15, less DHT, JPG and DAC) carries the size.
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  throw new Error(`${path}: not a PNG or JPEG whose size could be read`);
}
