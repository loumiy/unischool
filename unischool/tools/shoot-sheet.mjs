// ---------------------------------------------------------------------
// PHOTOGRAPH A CONTACT SHEET (see tools/sheet.tsx): the whole page, and
// with --cells one PNG per building, named by its cell id.
//
//   npm run sheet:shot -- node_modules/.tmp/sheets/sheet-gothic.html /tmp/gothic --cells --scale=2
//
// Same browser rules as shoot.mjs: playwright-core, no download, CHROME_PATH
// or PLAYWRIGHT_BROWSERS_PATH to find a Chromium.
// ---------------------------------------------------------------------
import { existsSync, mkdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const [html, outDir, ...flags] = process.argv.slice(2);
if (!html || !outDir) {
  console.error('usage: shoot-sheet <sheet.html> <out-dir> [--cells] [--scale=N]');
  process.exit(2);
}
const cells = flags.includes('--cells');
const scale = Number((flags.find((f) => f.startsWith('--scale=')) ?? '--scale=1').slice(8));
const CANDIDATES = [
  process.env.CHROME_PATH,
  `${process.env.PLAYWRIGHT_BROWSERS_PATH ?? ''}/chromium-1194/chrome-linux/chrome`,
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean);
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error(`no Chromium found. Tried:\n  ${CANDIDATES.join('\n  ')}\nSet CHROME_PATH.`);
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 }, deviceScaleFactor: scale });
await page.goto(`file://${resolve(html)}`);
await page.waitForTimeout(300);
const name = basename(html).replace(/\.html$/, '');
await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true });
console.log(`wrote ${join(outDir, `${name}.png`)}`);
if (cells) {
  let n = 0;
  for (const el of await page.locator('.cell').all()) {
    const id = await el.getAttribute('id');
    await el.screenshot({ path: join(outDir, `${id}.png`) });
    n += 1;
  }
  console.log(`wrote ${n} cells`);
}
await browser.close();
