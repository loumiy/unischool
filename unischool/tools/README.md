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
in, negative out), `--pan=DX,DY` (a drag, in screen pixels), `--clip=x,y,w,h`.

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
