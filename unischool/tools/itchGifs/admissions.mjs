// ---------------------------------------------------------------------
// GIF 3, ADMISSIONS. The summer of Year 6: the price set on its slider and
// locked before anyone applies, the applicants it drew, the admit line
// dragged up the cloud (a smaller, stronger class) and back down until
// the hall is full, and the offers sent: the admitted take their seats.
//
//   npm run dev                                                  # one shell
//   npm run scenario -- summer --name Halifax --colors navy-gold node_modules/.tmp/gif/summer.json
//   node tools/itchGifs/admissions.mjs node_modules/.tmp/gif/summer.json ../docs/store/itch/gifs/3-admissions.gif
//
// The year's review (the summer's first page) is stepped past off camera.
// ---------------------------------------------------------------------
import { args, encodeGif, openRig } from './rig.mjs';

const { positional, flag } = args();
const [savePath, outPath] = positional;
if (!savePath || !outPath) {
  console.error('usage: admissions.mjs <summer save.json> <out.gif> [--width=960]');
  process.exit(2);
}
const fps = Number(flag('fps', 12));

const rig = await openRig({ save: savePath, out: outPath, size: [1280, 820], fps, parcel: false });
const { page } = rig;
await rig.stopClock();
await page.getByRole('button', { name: 'Open the summer' }).click();
await rig.run(1_500);
await page.getByRole('button', { name: /On to admissions/ }).click();
await rig.run(2_000);

// 1. The price: its slider tried higher, then put back where families
// expect it (higher draws fewer applicants and leaves seats empty).
const slider = page.locator('input[type="range"]').first();
const box = await slider.boundingBox();
const value = await slider.evaluate((el) => (Number(el.value) - Number(el.min)) / (Number(el.max) - Number(el.min)));
// The thumb's middle (a range input's thumb travels its width less itself).
const thumb = 16;
const xAt = (t) => box.x + thumb / 2 + t * (box.width - thumb);
const y = box.y + box.height / 2;
await rig.pointerTo(1100, 470);
await rig.hold(0.5);
await rig.glide(xAt(value), y, 0.6);
await rig.dragTo(xAt(value + 0.14), y, 0.8);
await rig.hold(0.3);
await rig.dragTo(xAt(value), y, 0.6);
await rig.hold(0.3);

// 2. Locked: the applicants it drew.
await rig.clickOn('.admissions-lock', 0.5);
await rig.glide(760, 560, 0.5);
await rig.hold(1.6);

// 3. The admit line: up the cloud, then down until the hall is full.
const handle = page.locator('.adm-handle-tab').first();
let hb = await handle.boundingBox();
if (!hb) throw new Error('no admit-line handle found');
const hx = hb.x + hb.width / 2, hy = hb.y + hb.height / 2;
await rig.glide(hx, hy, 0.5);
await rig.dragTo(hx + 190, hy - 190, 1.1);
await rig.hold(0.6);
await rig.dragTo(hx, hy, 1.0);
await rig.hold(0.6);

// 4. The offers sent: the admitted take their seats.
await rig.clickOn(page.getByRole('button', { name: 'Send the offers' }), 0.6);
await rig.glide(1000, 640, 0.4);
await rig.pointerTo(-40, -40, { mouse: false });
// Ends as the last of them sit down, before the page moves on to the
// Students page.
await rig.hold(1.6);

const dir = await rig.close();
encodeGif(dir, outPath, { fps, width: Number(flag('width', 960)), holdLast: 0.8 });
