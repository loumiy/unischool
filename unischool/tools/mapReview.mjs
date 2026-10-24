// The campus map as the review tools read it: `window.__campusMap`
// (src/components/mapProbe.ts's MapReview), so a tool checks the map the
// player sees (the canvas, or the SVG map it falls back to) rather than the
// SVG's DOM. Not part of the game.

// The game's URL with `?view=parcel`: the map opens on the whole parcel at
// its widest opening zoom, as every map did before it framed what stands
// (Plan 115A). The shooting tools set it, so a --zoom/--pan recipe in
// tools/README.md frames the same campus the same way as it always has.
export function parcelView(url) {
  const u = new URL(url);
  u.searchParams.set('view', 'parcel');
  return u.href;
}

// Waits until the map shows its view in full (its drawings made; walkers
// may still move), and returns which map is up: 'canvas' or 'svg'.
export async function waitForMap(page, timeout = 15_000) {
  await page.waitForFunction(() => window.__campusMap?.settled() === true, null, { timeout, polling: 100 })
    .catch(() => console.warn('the map did not settle in time'));
  return page.evaluate(() => window.__campusMap?.renderer() ?? null);
}

// The pan and zoom: { x, y, zoom }.
export function mapView(page) {
  return page.evaluate(() => window.__campusMap?.view() ?? null);
}

// Each placed building: { id, name, x, y }, the middle of its footprint on
// the page.
export function mapBuildings(page) {
  return page.evaluate(() => window.__campusMap?.buildings() ?? []);
}

// The building a click at (x, y) on the page would find.
export function mapBuildingAt(page, x, y) {
  return page.evaluate(([px, py]) => window.__campusMap?.buildingAt(px, py) ?? null, [x, y]);
}

// What the canvas could not draw since the map started, by name ({} when
// everything drew; null on the SVG map).
export function mapMissed(page) {
  return page.evaluate(() => window.__campusMap?.frame()?.unsupported ?? null);
}
