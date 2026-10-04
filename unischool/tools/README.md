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
npm run scenario -- --player Completionist --year 22 --vernacular gothic \
  --name Blackmoor --clear-modal /tmp/gothic.json    # play 22 years, write a save
npm run shot -- /tmp/gothic.json /tmp/gothic.png --zoom=-2 --pan=-430,320
```

`scenario` fast-forwards one of the harness's players (`sim/harness/archetypes.ts`)
— Completionist is the one that builds essentially the whole catalogue, so every motif is on the map —
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

The harness's players site every building at `firstFreeSpot`, a top-left scan,
so a scenario's campus is a strip along one edge of the grid — fine for a
trajectory, useless for a picture. `layout.ts` re-sites a scenario's buildings
onto a hand-drawn precinct plan, draws the walks, regrows the woodland round the
result and plants the grounds, and writes the save back out:

```sh
npm run scenario -- --player Completionist --year 50 --build-all --clear-modal \
  --name Blackmoor --colors navy-gold node_modules/.tmp/in.json
npm run layout -- node_modules/.tmp/in.json node_modules/.tmp/out.json --ascii
npm run shot -- node_modules/.tmp/out.json docs/images/campus.png --zoom=-1 --pan=60,-10 --scale=2
pngquant --force --skip-if-larger --quality=70-95 --output docs/images/campus.png docs/images/campus.png
```

Placement is visual-only (see `campusMap.ts`), so moving the buildings changes
nothing the simulation computed: the school in the file is still the one the
run produced. The plan is a list of anchors and the walks a list of straight
runs — precincts, the way a real campus is read: the Grand Quad and, on
its axis below it, the capital projects' court with the landmark at its head, the science court and Greek Row to the west, the
union and the residential quarter to the east, a second residential court
and the medical campus to the south-west, and the venues along the north
edge with the stadium anchoring the corner — and the rules are checked
rather than trusted — every footprint on clear
tiles by the reducer's own `footprintIsClear`; both doors the camera can see
(south face, east face) clear of other buildings and on a path; walks one tile
wide and one connected network; no dead end that is not a doorstep. A doorstep
pass adds the shortest run from any unserved door to the nearest path and a
join pass ties up islands, so the checks hold whatever the run happened to
build; a chapter house, whose id an event mints, takes the next lot on Greek Row,
and anything else the plan does not name goes in an overflow block. `--ascii` prints the plan as a tile map, which is how it was
drawn. That is what `docs/images/campus.png` is — a year-50 Completionist run
with `--build-all`, which stands every placeable asset the run did not (but
only the landmark the run chose, since its rivals close), finishes whatever
is still going up and grows every venue to its last stage, so the picture
shows each asset whole — run through `pngquant` afterwards, which takes a
flat-colour render like this one down to a third of its size with nothing to
see for it. The same campus in the other four sets is beside it —
`campus-gothic.png`, `campus-classical.png`, `campus-mission.png` and
`campus-modern.png`, the same command with `--vernacular` — which is the
honest comparison the vernaculars want: one layout, one run, only the
architecture changing.

**Colours.** Every picture in `docs/images` wears a different one of the
eight school colour pairs (`--colors <id>`, `schoolColors.ts`'s
`SCHOOL_COLOR_PAIRS`), so the README shows the choice exists: the campus in
navy and gold, Gothic in crimson and silver, Classical in forest and gold,
Mission in maroon and gold, Modern in purple and gold; the tabs in maroon,
royal blue, forest, navy and orange, black, purple and crimson; the summer
card in royal blue.

### Hand-built campuses

`campuses/` keeps campuses laid out by hand in the game itself (a sandbox
run, every building open and nothing to wait for) and exported as saves.
They are **placement plans**, not pictures: the school in them is a sandbox
at year 1 with nothing earned, so it is never shot as it stands. Its
arrangement is what is kept — where each building sits, the walks between
them, the lamps and benches, and the woodland round them — to be put onto a
real run's buildings the way `layout.ts` puts its own plan onto them. The
architecture is not part of the plan: the same arrangement serves any
vernacular (`scenario --vernacular`) and any colours.

| Save | Holds |
|---|---|
| `tudor-year-1.unischool.json` | Tudor College, save v86: 73 placed buildings (the Grand Quad and the second quad on one axis with the gate between them, the halls, labs, dorms and dining, the capital projects, the venues and the amenities), 1,630 path tiles, 78 lamps and benches, 599 trees |

What such a plan carries, all of it in `state`: `placements` (building id →
top-left `row`/`col`, the footprint `w`/`h` as placed and the `facing`, 0 to
3, whose odd values swap `w`/`h`), `pathways` and `dressing` (`"row,col"` keys) and `trees`.
Nothing else in the file is read.

**Not built yet.** `layout.ts`'s plan is hardcoded (its `PLAN` anchors and
hand-drawn walks); it cannot yet take its plan from one of these saves. The
work is in `BACKLOG.md` under *Named, not sequenced*. Until it lands, keep
these files as exported — do not load and re-save one to "upgrade" it:
the save migrations bring an old version forward on read, and a re-save
rewrites the whole state, not only the layout.

### The tabs and the modals

The same driver photographs the screens laid over the map. `--tab=<id>`
opens one through the toolbar's own button (a `TabNav.tsx` id: `curriculum`,
`faculty`, `research`, `students`, `athletics`, `history`, or `treasury`,
which has no icon and is reached through the funds figure),
`--click=<text>` presses a button by its text and repeats, which is how a
modal the save is holding gets stepped through, `--press=<selector>` clicks
an element once the tab is open (how the Curriculum's first school and two
of its programs are opened, since a finished school folds away), and
`--element=<selector>` crops the PNG to one element. `docs/images/tab-*.png`
are the seven tabs on the same year-50 run as the campus, each from that
run written again with its own `--colors` (a seeded run replays exactly), and `summer-admissions.png` is the summer scenario's admissions
beat, once the price is set and the pool it drew is on screen — in a taller
viewport, since the card is taller than the modal's scroll box. The
presses do nothing but wait: the reveal counts its figures up for some
seconds, and a shot taken at once catches them mid-count:

```sh
for t in faculty research students athletics history treasury; do
  npm run shot -- node_modules/.tmp/out.json docs/images/tab-$t.png --tab=$t --scale=2
done
npm run shot -- node_modules/.tmp/out.json docs/images/tab-curriculum.png --tab=curriculum \
  --press=".collapse-toggle" --press=".collapse-toggle >> nth=1" --press=".collapse-toggle >> nth=2" --scale=2
npm run scenario -- summer --name Blackmoor --colors royal-gold node_modules/.tmp/summer.json
npm run shot -- node_modules/.tmp/summer.json docs/images/summer-admissions.png \
  --size=1600,1700 --click="Continue" --click="Set tuition for the year" \
  --press=".cohort-breakdown h3" --press=".cohort-breakdown h3" \
  --press=".cohort-breakdown h3" --press=".cohort-breakdown h3" \
  --element=.modal --scale=2
```

### Phones and tablets

`--phone` and `--tablet` give the driver a 390x844 or 820x1180 touch
viewport (Plan 70G). `npm run phone` (`phoneCheck.mjs`) is the check the
phone pass was fixed against: against a running dev server it opens the
title, the map, every tab, the Treasury, the build tray and the menu at both
sizes as a touch device, taps every `?` on each screen, and reports anything
that runs past the screen's edge (exit 1). A save held at a modal is walked
through the modal's steps instead. `--out=<dir>` keeps a screenshot of every
screen; `docs/reviews/2026-09-phone/` is the set from Plan 70G.

```sh
npm run phone                                   # the launch fixture, year 25
npm run scenario -- --player Guided --year 8 --modal summer node_modules/.tmp/summer.json
npm run phone -- node_modules/.tmp/summer.json --out=node_modules/.tmp/phone
```

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
Cells include the states worth checking as well as the buildings — a turned
footprint, a site, a chapter house wearing its letters. `--facing N` turns
every building N quarters, so the four azimuths at facing 0 show each
building's four sides, and a facing shows that they turn with it.

### Fifty years in thirty seconds

The trailer's opening shot (see `docs/reviews/2026-10-game-review/6-marketability.md`):
one campus from its first week to year 50, the camera fixed, the interface
gone. `timelapse.ts` plays one run and keeps a snapshot every `--every` weeks
(13 by default, four a year); `timelapseShoot.mjs` photographs each and joins
them into a WebM.

```sh
npm run dev                                          # in one shell
npm run timelapse -- --name Blackmoor --colors navy-gold --out node_modules/.tmp/timelapse
npm run timelapse:shoot -- node_modules/.tmp/timelapse --fps=8 --png
```

The frames share one plan: the run's final campus goes through `layout.ts`,
and each frame stands the buildings the run had by then, finished or still
a site, at their final places. That is what keeps a hall from jumping
across the map between frames. The walks grow out from Founders Hall (each
building gets the final network's route back to the founding buildings, so
every walk drawn is connected), and the founding woodland is felled where
buildings and walks arrive. `--vernacular` runs the same college in another
set; since a seeded run replays exactly, the five time-lapses are one campus
in five styles.

The shooter takes `--zoom`, `--pan`, `--size` and `--scale` as `shot` does
(the default framing, `--zoom=-1 --pan=60,-10` at 1920 by 1080, holds the
year-50 campus), captions the year and term unless `--no-caption`, and keeps
a PNG a frame with `--png` for an editor. It turns the map's seasons off
(the Seasons setting, `settings.ts`): at one frame a quarter, one frame a
year lands in the winter white and the video strobes. `--seasons` keeps
them, for a cut that holds a frame per week. `--from=N --to=N` retakes a range;
the video is rebuilt from every shot on disk. The ffmpeg Playwright ships
writes only VP8, so the result is a WebM; convert it for Steam (H.264 MP4)
with any full ffmpeg. Two hundred frames take some fifteen minutes on four
cores.

`docs/images/timelapse.webm` is the first cut: the Completionist run above,
seed 12345, in navy and gold, scaled to 720p at 2 Mb/s so the repository
carries 6 MB rather than 38 (`-vf scale=1280:720 -c:v libvpx -b:v 2M`), with
the seasons off. Re-run the two commands above for the full-quality file.

**It does not download a browser.** The dependency is `playwright-core`, the
browserless package, so installing this repo does not pull several hundred MB
nobody asked for. Point `CHROME_PATH` at any Chromium or Chrome build; failing
that it looks under `PLAYWRIGHT_BROWSERS_PATH` and in the usual system
locations, and tells you what it tried. `CAMPUS_URL` overrides the dev server
address.

## Standing the game up somewhere

`scenario.ts` and `scenarios.ts` are the playtest harness's front door: they
play the real reducer forward under one of the harness's players and write the result as
a save the browser can open, so a change can be looked at in year 8 of a
balanced school, or on the exact week a milestone modal is pending, without
playing there.

```sh
npm run scenario -- --list             # the index: what each named state is for
npm run scenario -- year-8-balanced    # build one, by name
npm run scenario -- --player Guided --year 12 --modal milestone
```

A scenario is a **recipe**, not a file: a player, a year, and an optional
stopping point, built on demand. Nothing generated is committed — a save is a
few hundred KiB and goes stale the next time `SAVE_VERSION` moves, while a
recipe survives it.

See [`docs/architecture/playtesting.md`](../../docs/architecture/playtesting.md)
for the whole harness — the scenarios, the debug flag and panel, and the
report (`npm run sim`).

## Playing it as a newcomer, and timing it

Both drive the real app in a headless Chromium against a running dev server
(`CAMPUS_URL`, default `http://localhost:5173/`).

```sh
npm run dev                                   # in one shell
npm run newplayer                             # found a college, follow the walkthrough, play year one
npm run scenario -- --player Completionist --year 40 --clear-modal /tmp/y40.json
npm run profile -- /tmp/y40.json --seconds=10 # fps, 95th-percentile frame and long tasks per speed
```

`newplayer` passes the title screen, does only what the walkthrough and the
Next line ask (since Plan 80D: site Founders Hall, appoint Dr. Grace Bennett
from the founding market in the hall's panel, found English), and plays year one at the fastest speed open (2x, since 4x
waits for a Provost). It answers every stop with its last button; a matter
that pauses the clock on arrival it opens from its notice, answers in the
inbox with its last answer, and resumes. It reports each step, each kind of
letter, and any stall: a clock that stopped for 20 seconds with nothing on
screen asking for anything. It writes a screenshot of each stall to
`node_modules/.tmp/` and exits non-zero if it stalled or never reached year 2.

`node tools/touchCheck.mjs [save.json]` (Plan 70F) plays the map by touch in
Chromium with touch emulated: a one-finger pan, a pinch, a tap on a building
the map finds under the finger, and a building picked up, set down with a tap
and built with the touch bar's Place. It exits non-zero on the first failed
check.

`node tools/keyboardCheck.mjs [save.json] [--shot=file.png]` (Plan 83E) plays
the map by keyboard. It checks that:
- Tab reaches the map's hidden list of buildings, one Tab stop;
- the arrow keys walk it in the order the map reads, without panning;
- the focused building is lit on the map;
- Enter inspects it;
- leaving the list puts the light out.

Both read the map through `tools/mapReview.mjs`: the map's own report of
what is up (the canvas or its SVG fallback), its view, whether it has
settled, and the building under a point (`window.__campusMap`,
`src/components/mapProbe.ts`). They do not read the SVG's DOM, so they check
the map the player sees.

`profile` loads a save and samples frames at Paused, Play, 2x and 4x. Headless
Chromium draws in software, so compare its numbers with each other (before
and after a change) rather than with a player's machine.

The debug panel (`?debug=1`) also has **+$1B cash** and **export run**, which
downloads the session's start and every action since; `engine/actionLog.ts`'s
`replay` reproduces it exactly.

## Reviewing the whole game

`tools/review/` holds the instruments Plan 73's review was done with
(`docs/reviews/2026-10-game-review/`). Each is a script, not a test: it writes
a table or a set of pictures to `node_modules/.tmp/` for a person to read.

```sh
npm run review:goals                       # seven goal players × 5 seeds × 2 names, 50 years each
npm run review:goals -- --goals prestige,satisfaction --seeds 12345 --years 30
npm run review:strings                     # every player-facing string, by screen, with the house-style checks
npm run review:arrangements -- --list      # the 12 test layouts (a straight walk, a tee, a crowded row …)
npm run review:arrangements                # one save per layout and vernacular
npm run review:views -- node_modules/.tmp/arrangements/*.json --zoom=3   # each save from all four corners
npm run review:doors                       # doors, props and overhangs over those saves
npm run review:probe -- vernacular save.json   # how much of a campus the vernacular restyles; repeated looks
npm run review:probe -- backlog            # the estate's backlog over 50 years at full maintenance
npm run review:gallery -- node_modules/.tmp/sc/*.json   # every tab, menu and held modal, counted, at two sizes
npm run review:sweep -- --seeds 1-10 --years 50   # invariants every week, a save round trip every year
npm run review:sweep -- --fixtures --years 5      # every committed save fixture, loaded and played on
node tools/review/twoTabs.mjs save.json    # four ways two tabs meet one save, each with the week it expects
npm run sheet -- --every                   # every placeable, each school's hall, each venue expansion
```

- **`goalPlayers.ts`** plays the game toward one goal at a time (the most
  revenue, the highest prestige, the happiest students, every asset,
  championships, good-then-big, big-then-good) through the harness's own
  moves, and keeps a journal of what each goal wanted and could not do. It
  runs one child process per core; `--resume` skips finished runs.
- **`strings.ts`** walks `src/` with the TypeScript compiler, keeps the text
  a player can read (literals, templates and JSX text, not ids, class names
  or comparisons), tags each with its screen, and flags British spelling and
  idiom, jargon and marks against the house style. `strings.md` is the
  summary.
- **`sweep.ts`** plays harness games over many seeds, players and odd
  college names (non-Latin, right-to-left, 64 characters), checks the
  invariants every week, and at the start of every year writes the save as
  the player's export does, reads it back through the whole load path and
  compares field by field, then plays four weeks on from both and compares
  again (which catches what JSON drops). `--fixtures` loads each save in
  `test/fixtures/` (the launch save and every version's) and plays it on.
- **`gallery.mjs`** opens each save in a fresh browser at desktop and phone
  size, steps through any modal it holds, opens every tab, the Build menu,
  the main menu, Settings and Founders Hall's panel, and counts the words
  and controls on each (`gallery.md`). `--settings '{"textScale":1.3}'`
  plays with the player's settings set. For a modal that recurs, such as
  a late summer, `npm run scenario` takes `--from-year N`.
- **`arrangements.ts`** lays a finished save's buildings out in a set pattern
  round the middle of the canvas, so `shootViews.mjs` can photograph the same
  layout in every vernacular from every corner; **`doorsAndDepth.ts`** checks
  those layouts for doors onto grass, seams, walls, trees and props, and for
  anything painted out of depth order.
- **`drive.mjs`** plays the running game a few steps at a time from a
  persistent browser profile (`node tools/review/drive.mjs <profile> fresh
  "click=Found a new college" shot=a.png text`); the review's hands-on
  sessions were played with it. `load=<save.json>` starts from a scenario
  save, and `move=x,y` moves the pointer without clicking, which is how a
  building is carried to its site. It fires `pagehide` before closing,
  since that is when the game saves.
