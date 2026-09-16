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
npm run shot:save -- /tmp/gothic.json 22 gothic      # play 22 years, write a save
npm run shot -- /tmp/gothic.json /tmp/gothic.png --zoom=-2 --pan=-430,320
```

`shot:save` fast-forwards `sim/balanceSim.ts`'s Completionist strategy — the one
that builds essentially the whole catalogue, so every motif is on the map — and
writes a save payload. Its third argument overrides the campus's vernacular, so
the *same* campus can be photographed in each set and compared honestly.

`shot` loads that save into a headless Chromium through `localStorage`, drives
the map's own zoom and pan buttons, and writes a PNG. Flags: `--zoom=N` (positive
in, negative out), `--pan=DX,DY` (a drag, in screen pixels), `--clip=x,y,w,h`.

**It does not download a browser.** The dependency is `playwright-core`, the
browserless package, so installing this repo does not pull several hundred MB
nobody asked for. Point `CHROME_PATH` at any Chromium or Chrome build; failing
that it looks under `PLAYWRIGHT_BROWSERS_PATH` and in the usual system
locations, and tells you what it tried. `CAMPUS_URL` overrides the dev server
address.
