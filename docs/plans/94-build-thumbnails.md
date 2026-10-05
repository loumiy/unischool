# Plan 94 — The build menu shows the buildings

*Planning document only. Its job is to record the owner's ask (October
2026): show the actual assets in the build menu instead of icons.*

**Status: Landed.** One PR, after a scratch mockup in the running game.

**As implemented:**
- A building's tile draws the building on its plan paper
  (`BuildThumb.tsx`), through the map's own `BuildingMotif`, ground props
  and cast shadow, in the college's vernacular. A building going up is
  drawn as the map draws its site. Tools keep their glyphs.
- The drawing is made from the default camera, not the map's, so tiles do
  not turn when the map does. The camera is module-wide
  (`isoProjection.ts`), so the thumbnail swaps it in and puts the map's
  back within one synchronous draw, off screen, from a timer rather than a
  render.
- Each drawing is kept as markup, keyed by what it shows (id, vernacular,
  going up or not, tier, expansions, floors), so a session draws a
  building once however often the menu opens.
- The drawing is fitted to the tile, standing on its foot, but never to a
  box smaller than a fixed size, so a statue reads smaller than a hall.
- The plan paper is 92px, not 60, and the popup 32px taller to match. A
  tile that can't be built fades its drawing as it faded its glyph.
- `test/build-thumb.test.ts` draws every placeable in every vernacular,
  finished and going up.
