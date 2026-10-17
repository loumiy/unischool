// ---------------------------------------------------------------------
// THE TRAILER'S WORDS (docs/store/trailer.md): the five headlines, the card
// and the end card, each a transparent 1920x1080 PNG in the game's own
// faces (Bricolage Grotesque for display, Archivo for text), loaded from
// the fontsource packages the game ships with. tools/trailer/compose.py
// lays them over the picture and fades them.
//
//   node tools/trailer/cards.mjs <out dir>       # from unischool/
//
// The logo is a stand-in: the game's own mark (src/components/Logo.tsx)
// until the commissioned one exists. Not part of the game.
// ---------------------------------------------------------------------
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const OUT = process.argv[2] ?? 'node_modules/.tmp/trailer/cards';
mkdirSync(OUT, { recursive: true });
const NM = `${process.cwd()}/node_modules`;
const BRICO = `${NM}/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2`;
const ARCH = (w) => `${NM}/@fontsource/archivo/files/archivo-latin-${w}-normal.woff2`;

// The game's mark (src/components/Logo.tsx's LogoMark), in white.
const MARK = `<svg viewBox="40 30 740 625" width="150" height="127" aria-hidden="true"><g fill="#fff">
<path fill-rule="evenodd" d="M95 190 413 40 730 190V222H95Z M413 113a34 34 0 1 0 0.01 0Z"/>
<path d="M138 250H290V262Q268 266 265 280H165Q162 266 138 262Z M165 278H265V514H165Z M165 512Q162 522 140 526V545H290V526Q268 522 265 512Z"/>
<path d="M538 250H690V262Q668 266 665 280H565Q562 266 538 262Z M565 278H665V514H565Z M565 512Q562 522 540 526V545H690V526Q668 522 665 512Z"/>
<path d="M340 250H490V262Q468 266 465 280H365Q362 266 340 262Z M365 278H465V495A50 50 0 0 1 365 495Z"/>
<path d="M105 562H298Q312 562 322 590H105Z M720 562H530Q516 562 506 590H720Z M45 602H775V650H45Z"/>
</g></svg>`;

const CSS = `
@font-face { font-family: Brico; src: url('file://${BRICO}') format('woff2'); font-weight: 200 800; }
@font-face { font-family: Archivo; src: url('file://${ARCH(500)}') format('woff2'); font-weight: 500; }
@font-face { font-family: Archivo; src: url('file://${ARCH(600)}') format('woff2'); font-weight: 600; }
@font-face { font-family: Archivo; src: url('file://${ARCH(700)}') format('woff2'); font-weight: 700; }
html, body { margin: 0; width: 1920px; height: 1080px; background: transparent; overflow: hidden; }
.frame { position: absolute; inset: 0; }
.shade-top { background: linear-gradient(to bottom, rgba(10,16,28,.70) 0%, rgba(10,16,28,.50) 20%, rgba(10,16,28,.18) 34%, rgba(10,16,28,0) 46%); }
.shade-all { background: radial-gradient(ellipse at 50% 50%, rgba(10,16,28,.38) 0%, rgba(10,16,28,.18) 55%, rgba(10,16,28,0) 100%); }
.shade-end { background: linear-gradient(to bottom, rgba(10,16,28,.66) 0%, rgba(10,16,28,.46) 46%, rgba(10,16,28,.30) 72%, rgba(10,16,28,.55) 100%); }
.headline { position: absolute; left: 0; right: 0; top: 104px; text-align: center; color: #fff; }
.quote { font: 800 68px/1.04 Brico, sans-serif; letter-spacing: -0.012em; max-width: 1820px; margin: 0 auto; white-space: nowrap;
  text-shadow: 0 3px 18px rgba(0,0,0,.45), 0 1px 2px rgba(0,0,0,.35); }
.who { margin-top: 22px; font: 600 25px/1 Archivo, sans-serif; letter-spacing: .16em; text-transform: uppercase;
  color: #f2d27a; text-shadow: 0 2px 10px rgba(0,0,0,.5); }
.card { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; text-align: center;
  font: 800 124px/1 Brico, sans-serif; letter-spacing: .01em; color: #fff; text-transform: uppercase;
  text-shadow: 0 4px 26px rgba(0,0,0,.5), 0 1px 3px rgba(0,0,0,.35); }
.end { position: absolute; left: 0; right: 0; top: 250px; text-align: center; color: #fff; }
.end .name { margin-top: 26px; font: 800 132px/1 Brico, sans-serif; letter-spacing: .03em; text-transform: uppercase;
  text-shadow: 0 4px 26px rgba(0,0,0,.45); }
.end .tag { margin-top: 26px; font: 500 40px/1.2 Archivo, sans-serif; color: #f4efe4; text-shadow: 0 2px 12px rgba(0,0,0,.5); }
.cta { position: absolute; left: 0; right: 0; top: 760px; text-align: center; }
.cta .wish { display: inline-block; padding: 18px 44px; border: 3px solid #e6b84a; border-radius: 6px;
  font: 800 46px/1 Brico, sans-serif; letter-spacing: .08em; color: #e6b84a; text-transform: uppercase;
  background: rgba(10,16,28,.35); }
.credit { position: absolute; left: 0; right: 0; bottom: 54px; text-align: center; font: 500 24px/1 Archivo, sans-serif;
  letter-spacing: .06em; color: rgba(255,255,255,.86); }
`;

const headline = (q, who) => `<div class="frame shade-top"></div><div class="headline"><div class="quote">“${q}”</div><div class="who">${who}</div></div>`;
const CARDS = {
  h1: headline('The football manager of universities', 'Playtester · Reddit'),
  h2: headline('An alarmingly believable university simulator', 'Playtester · Reddit'),
  h3: headline('It feels one of a kind', 'Playtester · We Playtest Games'),
  h4: headline('Deeply impressed by this game', 'Player · itch.io'),
  h5: headline('I’ve been looking for exactly this type of game', 'Playtester'),
  card: `<div class="frame shade-all"></div><div class="card">One college.<br>Fifty years.</div>`,
  end1: `<div class="frame shade-end"></div><div class="end">${MARK}<div class="name">UniSchool</div><div class="tag">Fifty years to build a university.</div></div>`,
  end2: `<div class="cta"><span class="wish">Wishlist on Steam</span></div><div class="credit">Music by Alejandro Tóth &nbsp;·&nbsp; Halifax Games</div>`,
};

const executablePath = [
  process.env.CHROME_PATH,
  `${process.env.PLAYWRIGHT_BROWSERS_PATH ?? ''}/chromium-1194/chrome-linux/chrome`,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean).find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--allow-file-access-from-files'] });
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
for (const [id, body] of Object.entries(CARDS)) {
  const file = `${OUT.startsWith('/') ? OUT : `${process.cwd()}/${OUT}`}/${id}.html`;
  writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>${CSS}</style><body>${body}</body>`);
  await page.goto(`file://${file}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${id}.png`, omitBackground: true });
  console.log('wrote', id);
}
await browser.close();
