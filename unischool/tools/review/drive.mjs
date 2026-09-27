// ---------------------------------------------------------------------
// DRIVE THE GAME BY HAND, A STEP AT A TIME (Plan 73, areas 2, 3 and 7).
// A persistent Chromium profile, so every call picks the game up where the
// last left it (the game saves itself when the page hides, useGame.ts):
// run a few steps, look at the screenshot, decide the next. This is how the
// review's hands-on sessions were played — the new player's first hours,
// the problem traces, the exploratory bug hunt.
//
//   npm run dev                                     # in one shell
//   node tools/review/drive.mjs <profile> fresh      # wipe the profile: a new visitor
//   node tools/review/drive.mjs <profile> "click=New game" shot=a.png text
//   node tools/review/drive.mjs <profile> resume "key=1" wait=20000 key=Space shot=b.png
//
// Steps, in order (any number):
//   fresh                 clear the profile's storage first
//   load=<save.json>      put a save (a scenario's, say) in the profile and reload
//   resume                press the title screen's Continue if it is showing
//   click=<text>          a button by its accessible name, else any element by text
//   sel=<selector>        click a Playwright selector
//   fill=<selector>|<v>   type into a field
//   key=<key>             a keyboard press (Space, Escape, 1, e, …)
//   mouse=<x>,<y>         click at viewport coordinates
//   move=<x>,<y>          move the pointer there without clicking (a ghost follows it)
//   hover=<selector>      hover (for a tooltip)
//   wait=<ms>             wait (the clock runs if it is running)
//   shot=<path>           screenshot the viewport; shot=<path>@<selector> an element
//   text[=<selector>]     print the visible text (of the top modal, or a selector)
//   buttons               print every enabled button's name
//   eval=<js>             print the value of a page expression
//   size=<w>,<h>          the viewport (default 1440,900); phone for 390,844 touch
// Pauses the clock and closes the profile at the end, which flushes the save.
// ---------------------------------------------------------------------
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { chromium } from 'playwright-core';

const [profile, ...steps] = process.argv.slice(2);
if (!profile) {
  console.error('usage: drive <profile-dir> [fresh] [resume] [click=…] [sel=…] [key=…] [wait=…] [shot=…] [text] …');
  process.exit(2);
}
const URL = process.env.CAMPUS_URL ?? 'http://localhost:5173/';
const CHROME = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const sizeStep = steps.find((s) => s.startsWith('size='));
const phone = sizeStep === 'size=phone';
const [W, H] = phone ? [390, 844] : (sizeStep?.slice(5).split(',').map(Number) ?? [1440, 900]);
if (steps.includes('fresh')) rmSync(profile, { recursive: true, force: true });

const context = await chromium.launchPersistentContext(profile, {
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-background-networking'],
  viewport: { width: W, height: H },
  ...(phone ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
});
const page = context.pages()[0] ?? await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`console.${m.type()}: ${m.text()}`); });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

async function clickText(text) {
  const byRole = page.getByRole('button', { name: text, exact: true });
  if (await byRole.count()) { await byRole.first().click(); return; }
  const loose = page.getByRole('button', { name: text });
  if (await loose.count()) { await loose.first().click(); return; }
  await page.getByText(text, { exact: false }).first().click();
}

async function topText(selector) {
  const target = selector
    ? page.locator(selector).first()
    : (await page.locator('.modal').count()) ? page.locator('.modal').first()
      : (await page.locator('.tab-overlay').count()) ? page.locator('.tab-overlay').first()
        : page.locator('body');
  return (await target.innerText()).replace(/\n{3,}/g, '\n\n');
}

for (const step of steps) {
  const [cmd, ...rest] = step.split('=');
  const arg = rest.join('=');
  try {
    switch (cmd) {
      case 'fresh': case 'size': break;
      case 'load': {
        // Reloading fires pagehide, and a page with a game under way writes
        // it then (useGame.ts), over anything put in storage first. So the
        // save goes in from an init script, which runs on the new page
        // before the game reads storage, after the old page has written.
        const save = readFileSync(arg, 'utf8');
        await context.addInitScript((v) => { localStorage.setItem('unischool.save', v); }, save);
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(800);
        break;
      }
      case 'resume': {
        const cont = page.locator('.title-primary');
        if (await cont.count()) { await cont.first().click(); await page.waitForTimeout(1200); }
        break;
      }
      case 'click': await clickText(arg); await page.waitForTimeout(350); break;
      case 'sel': await page.locator(arg).first().click(); await page.waitForTimeout(350); break;
      case 'fill': { const [sel, value] = arg.split('|'); await page.fill(sel, value); break; }
      case 'key': await page.keyboard.press(arg); await page.waitForTimeout(250); break;
      case 'mouse': { const [x, y] = arg.split(',').map(Number); await page.mouse.click(x, y); await page.waitForTimeout(350); break; }
      case 'move': { const [x, y] = arg.split(',').map(Number); await page.mouse.move(x, y, { steps: 8 }); await page.waitForTimeout(300); break; }
      case 'hover': await page.locator(arg).first().hover(); await page.waitForTimeout(500); break;
      case 'wait': await page.waitForTimeout(Number(arg)); break;
      case 'shot': {
        const [path, sel] = arg.split('@');
        await page.waitForTimeout(250);
        if (sel) await page.locator(sel).first().screenshot({ path });
        else await page.screenshot({ path });
        console.log(`[shot] ${path}`);
        break;
      }
      case 'text': console.log(`[text]\n${(await topText(arg || null)).slice(0, 6000)}\n[/text]`); break;
      case 'buttons': {
        const names = await page.locator('button:not([disabled])').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => (e.getAttribute('aria-label') || e.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean));
        console.log(`[buttons] ${names.join(' | ')}`);
        break;
      }
      case 'eval': console.log(`[eval] ${JSON.stringify(await page.evaluate(arg))}`); break;
      default: console.error(`unknown step ${step}`);
    }
  } catch (e) {
    console.log(`[fail] ${step}: ${String(e).split('\n')[0]}`);
  }
}

// Pause, so the next call finds the clock where this one left it.
await page.getByRole('button', { name: 'Paused', exact: true }).click({ timeout: 1500 }).catch(() => {});
const clockText = await page.locator('body').innerText().then((t) => t.match(/Year \d+ · [^\n]*Week \d+/)?.[0]).catch(() => null);
if (clockText) console.log(`[clock] ${clockText}`);
if (errors.length) console.log(`[errors]\n  ${[...new Set(errors)].join('\n  ')}`);
// Closing a context does not fire pagehide, which is when the game writes
// its save (useGame.ts): fire it, as a closing tab would.
await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); }).catch(() => {});
await page.waitForTimeout(300);
await context.close();
