# tools

Developer scripts. Nothing in `src/` imports any of this, and none of it ships.

## Looking at the campus

The vernaculars (`src/components/buildingSpec.ts`'s `VERNACULARS`) are art, and
art has to be looked at. `npm test` can prove a palette obeys its own rules and
that a shape stays inside its bay; it cannot tell you a roof is too dark to show
its own facets. Plan 07's PR G found four defects this way that the whole suite
passed straight through:

- `.iso-dome` and `.iso-finial` carried hardcoded colours in `styles.css`, and a
  class rule beats a presentation attribute — so the colour the motifs passed
  from the vernacular had never been doing anything.
- A near-black slate left `SLOPE`'s four roof faces barely 40 apart, so a steep
  hip read as one flat plate.
- The hall's roof inset and deck ring are a *parapet* device, and drew a pale
  gutter ring round a building with no parapet.
- A ridge that sounds deep in metres comes out gentle across a 7x5 footprint.

```sh
npm run dev                                          # in one shell
npm run scenario -- --strategy Completionist --year 22 --vernacular gothic \
  --name Blackmoor --clear-modal /tmp/gothic.json    # play 22 years, write a save
npm run shot -- /tmp/gothic.json /tmp/gothic.png --zoom=-2 --pan=-430,320
```

`scenario` fast-forwards a `sim/balanceSim.ts` strategy — Completionist is the
one that builds essentially the whole catalogue, so every motif is on the map —
and writes a save payload. `--vernacular` overrides the campus's architecture,
so the *same* campus can be photographed in each set and compared honestly, and
`--clear-modal` drops whatever interrupt the run was holding (a modal backdrop
swallows the clicks the screenshot driver needs). It replaces the older
`shot:save`, which did exactly this with the strategy, the name and the modal
clearing all hardcoded; see "Standing the game up somewhere" below.

`shot` loads that save into a headless Chromium through `localStorage`, drives
the map's own zoom and pan buttons, and writes a PNG. Flags: `--zoom=N` (positive
in, negative out), `--pan=DX,DY` (a drag, in screen pixels), `--clip=x,y,w,h`,
`--size=W,H` (the viewport, default 1600 by 1000) and `--scale=N` (device pixels
per CSS pixel — 2 for a print-sharp image at the same framing).

### A campus laid out like a campus

The scripted player sites every building at `firstFreeSpot`, a top-left scan,
so a scenario's campus is a strip along one edge of the grid — fine for a
trajectory, useless for a picture. `layout.ts` re-sites a scenario's buildings
onto a hand-drawn precinct plan, draws the walks, regrows the woodland round the
result and plants the grounds, and writes the save back out:

```sh
npm run scenario -- --strategy Completionist --year 50 --clear-modal \
  --name Blackmoor node_modules/.tmp/in.json
npm run layout -- node_modules/.tmp/in.json node_modules/.tmp/out.json --ascii
npm run shot -- node_modules/.tmp/out.json docs/images/campus.png --zoom=-1 --scale=2
```

Placement is visual-only (see `campusMap.ts`), so moving the buildings changes
nothing the simulation computed: the school in the file is still the one the
run produced. The plan is a list of anchors and the walks a list of straight
runs, and the rules are checked rather than trusted — every footprint on clear
tiles by the reducer's own `footprintIsClear`; both doors the camera can see
(south face, east face) clear of other buildings and on a path; walks one tile
wide and one connected network; no dead end that is not a doorstep. A doorstep
pass adds the shortest run from any unserved door to the nearest path and a
join pass ties up islands, so the checks hold whatever the run happened to
build; anything the plan does not name (an event's chapter house) goes in an
overflow block. `--ascii` prints the plan as a tile map, which is how it was
drawn. That is what `docs/images/campus.png` is — run through `pngquant`
afterwards, which takes a flat-colour render like this one down to a third of
its size with nothing to see for it. The same campus in the other four sets
is beside it — `campus-gothic.png`, `campus-classical.png`,
`campus-mission.png` and `campus-modern.png` — which is the honest comparison
the vernaculars want: one layout, one save, only the architecture changing.

### Every motif on one page

The campus renders show the assets together; they cannot show every motif, and
they cannot show the same building in all five sets side by side. `sheet.tsx`
renders every placeable Buildable on its own — through the game's own
`BuildingMotif`, `GroundMarking` and `groundProps`, via `react-dom/server`, so
what it draws is what the map draws — in one or more vernaculars, and writes a
labelled contact sheet per set. It needs no dev server and no save.

```sh
npm run sheet                                        # all five sets, node_modules/.tmp/sheets/
npm run sheet -- --vernacular gothic --scale 2       # one set, closer
npm run sheet -- --only 'hangar|bowl|grounds'        # a regex on the cell labels
npm run sheet -- --azimuth 225 --pitch 30            # the same set from behind
npm run sheet:shot -- node_modules/.tmp/sheets/sheet-gothic.html /tmp/gothic --cells
```

`sheet:shot` photographs the page, and with `--cells` writes one PNG per
building named by its cell id, which is the form the 2026 map-assets review
(`docs/reviews/2026-09-map-assets-visual-review.md`) was done in: 41 cells per
vernacular, each looked at, each defect tied back to the code that draws it.
Cells include the states worth checking as well as the buildings — a rotated
footprint, a site, a chapter house wearing its letters.

**It does not download a browser.** The dependency is `playwright-core`, the
browserless package, so installing this repo does not pull several hundred MB
nobody asked for. Point `CHROME_PATH` at any Chromium or Chrome build; failing
that it looks under `PLAYWRIGHT_BROWSERS_PATH` and in the usual system
locations, and tells you what it tried. `CAMPUS_URL` overrides the dev server
address.

## Standing the game up somewhere

`scenario.ts` and `scenarios.ts` are the playtest harness's front door: they
play the real reducer forward under a scripted strategy and write the result as
a save the browser can open, so a change can be looked at in year 8 of a
balanced school, or on the exact week a milestone modal is pending, without
playing there.

```sh
npm run scenario -- --list             # the index: what each named state is for
npm run scenario -- year-8-balanced    # build one, by name
npm run scenario -- --strategy "Balanced builder" --year 12 --modal milestone
```

A scenario is a **recipe**, not a file: a strategy, a year, and an optional
stopping point, built on demand. Nothing generated is committed — a save is a
few hundred KiB and goes stale the next time `SAVE_VERSION` moves, while a
recipe survives it.

See [`docs/architecture/playtesting.md`](../../docs/architecture/playtesting.md)
for the whole harness — the scenarios, the debug flag and panel, and the sim
scorecard.
