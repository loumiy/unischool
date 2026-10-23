# Plan 115 — The young campus

*The owner's choices on the third review's area 1 findings (23 October
2026): C1-1, C1-2, C1-3, C1-4 and C1-6 as the review recommends, and
C1-7's (a) and (d) only. The theme is the campus a player sees in the
first five years: a camera framed on what stands, a drive at the
founding, an objective that lays a path, walkers who stay near the hall
before there are paths, winter on the newer roofs, an Arena that is not a
shed, and a founding screen that fits a 1280×720 laptop. The review is
[`docs/reviews/2026-10-game-review-iii/1-aesthetics.md`](../reviews/2026-10-game-review-iii/1-aesthetics.md).*

**Status: Proposed.**

---

## 0. What stands today (f7b2091)

- **C1-1, the camera and the ground plan.** The map opens at `DEFAULT_ZOOM = 0.4`
  (`unischool/src/components/CampusMap.tsx:151`). `defaultView` (`:1715–1721`)
  centres on the world's midpoint, whatever stands. It runs once, on mount
  (`:1726–1732`). The map unmounts on the title and founding screens
  (`App.tsx:549`), so a new game and a load each get a fresh mount. No
  objective names a path. `chapterData.ts`'s *Somewhere to sleep* (`:125`)
  asks for a residence hall and a dining hall, and nothing lays a path at
  the founding. Founders Hall is sited in two places: `placeBuildable.ts:34`
  for a guided founding, and `actions.ts:375` (`centredPlacement`,
  `campusMap.ts:274`) for a headless one. Plan 112 did not touch any of it.
- **Plan 112's *Looking around*** (`chapterData.ts:107`, `chapters.ts:122`)
  is required before *Somewhere to sleep*. It asks you to pan, turn, tilt
  and zoom, and Home is optional. Its marks fire only on player input
  (`lookRef`, `CampusMap.tsx:1297–1306`), so a view set by code marks
  nothing. Home's help says "go back to the starting view", but
  `resetCamera` (`:1705–1710`) only resets the angle and the pitch. It
  leaves the pan and the zoom alone.
- **C1-2, walkers.** `pickStop` (`Walkers.tsx:381–390`) goes to the road
  when the pool is empty, and one time in five otherwise (`:383`). With
  Founders Hall alone the pool is always empty. `doors`, `roadsides` and
  `pointStop` are at `walkRoutes.ts:127`, `:146` and `:154`.
- **C1-3, winter.** `snowOnRoofs` is at `buildingMotifs.tsx:268`. `ZINC` and
  `POOL_ROOF` (`:3903–3904`) feed the field house's vault (`:4787`) and the
  natatorium's (`:4843`) directly. `READING_ROOM_SLATE` (`:7513`) goes
  straight into `SLOPE` (`:7768`). `landmarkArt` (`landmarks.tsx:1010`) and
  `Gazebo` (`groundMarkings.tsx:1831`, roof at `:1839`) take no `snow`.
  `seasons.test.ts` checks tokens only, not roofs.
- **C1-4, the Arena.** The arena is drawn in the hangar branch
  (`buildingMotifs.tsx:10079`, arena at `:10168`; the comment is at
  `:3857`). Its only change with expansion is height, one storey per
  expansion (`buildingSpec.ts:439–441`). It has two expansions
  (`facilitiesData.ts:348`).
- **C1-6, the founding screen.** The facade's viewBox is 440×214
  (`StartupScreen.tsx:30–31`). It is drawn at the card's full width
  (`styles.css:3405`), about 200 px tall. No rule in `styles.css` looks at
  the viewport's height for `.startup-card` (`:3388`) or `.title-card`
  (`:396`, `:416`).
- **C1-7 (a).** `clipPath="none"` is still on the sinkhole's floor
  (`ageMarks.tsx:323`), and the canvas counts any `clipPath` as unsupported
  (`canvasPaint.ts:1008`).
- **C1-7 (d).** `PLACE_DRESSING` refuses any tile with an occupant
  (`engine/reducer.ts:495–503`, the test at `:498`), and a quad is an
  occupant. `quadTile` (`components/quadGeometry.ts:37`) already sorts a
  quad's tiles into centrepiece, walk and lawn for the walkers
  (`walkRoutes.ts:73`).

## 1. The PRs

| PR | Findings | What |
|---|---|---|
| A | C1-1 (1) | Frame what stands on mount and on Home. The tools keep the parcel view behind a flag. |
| B | C1-1 (2) | A drive from the road to Founders Hall's front door, laid when the hall is sited. |
| C | C1-2 | While Founders Hall stands alone, walkers mill round a forecourt stop instead of walking to the road. |
| D | C1-1 (3) | *Somewhere to sleep* asks for a path from the residence hall to Founders Hall, with the Paths tool ringed. |
| E | C1-3 | Snow on the field house, the natatorium, the Law School's reading room, the landmarks and the gazebo. |
| F | C1-4 | The Arena gets a front, a sign, lunettes and the college's colours, and a visible part for each expansion. |
| G | C1-6 | The founding card and the title card fit in 720 px. |
| H | C1-7 (a), (d) | The sinkhole's stray `clipPath` goes, and dressing is allowed on a quad's lawn. |
| I | C1-1 (4) | A close year-5 store shot beside the year-32 one, after A, B and D. |

A comes first because every later visual check is easier with the framed
view. B comes before C and D: C's road walks then follow a path, and D's
objective can count a path that joins the drive. E, F, G and H stand
alone and can land in any order. I comes last, because it photographs
what A, B and D made.

### A. Frame what stands

- A pure `framedView(rect, placements, floor)` goes in `ringLand.ts`, beside
  `clampView` (`:1218`). It centres on the bounding box of every placement
  plus a margin of about six tiles. Its zoom is the fit, held between
  `DEFAULT_ZOOM` (0.4) and 1.0. So a lone Founders Hall opens at 1.0, the
  view widens as the college grows, and a built-out campus opens as it does
  today. It never goes below `zoomFloor()` (`CampusMap.tsx:1546`), which
  keeps `MIN_COVERAGE`. With nothing placed (a guided founding before the
  hall is sited), it centres on the parcel's middle at 1.0. That is where
  `centredPlacement` would put the hall. The result goes through
  `clampView`, and the pan limits don't change. This is how the plan reads
  the review's "floor of about 1.0": the closest the opening view gets
  while the campus is small, not a lower limit on zoom.
- `defaultView` (`:1715`) calls it. The view is framed on mount only, as
  today, so it never moves under the player during play.
- **Home** (`resetCamera`, and the ⌂ button at `:2744`) also restores the
  framed view, so it does what *Looking around*'s help says (§2.1).
- **Looking around.** The framing marks nothing, because it is not a
  player move. At 1.0 there is room to zoom both ways (MAX 2.5, MIN 0.22).
  The quarter turn happens about the canvas's centre, which is now the
  campus. So the chapter's objectives and copy stay as they are.
- **The tools.** `shoot.mjs`, `review/shootViews.mjs`, `timelapseShoot.mjs`,
  `clip.mjs`, `shareImage.mjs` and `itchCover.mjs` all set their framing
  relative to the opening view. A `?view=parcel` query, read on mount,
  keeps today's view, and every tool sets it. That way the documented
  `--zoom`/`--pan` recipes in `tools/README.md` and the store images still
  frame the same way. `shot` gets `--framed` to drop the query.
- **Tests.** A new `test/map-frame.test.ts` checks four cases: the empty
  parcel, a lone hall at 1.0 centred on it, a year-5 Guided layout between
  0.4 and 1.0 with every placement on screen, and a year-40 layout at 0.4
  that `clampView` leaves alone.
- **Visual check.**
  - `npm run scenario -- --player Guided --year 1|3|5 --clear-modal`, then
    `npm run shot -- … --framed` at 1440×900 and 1280×720, against the
    review's `c1-years-georgian.jpg`.
  - `npm run newplayer` still sites the hall and plays year one.
  - `node tools/touchCheck.mjs` and `node tools/keyboardCheck.mjs` still
    pass. The pinch test doubles the zoom, which still fits under 2.5.

### B. The founding drive

- A new `state/drive.ts` with `layDrive(s)`, called wherever Founders Hall
  first gets a placement: `placeBuildable.ts:34`, after the hall is sited,
  and `actions.ts:375` for the headless founding. It starts at the tile in
  front of the middle of the hall's front face, using `walkRoutes.ts`'s
  `entrancesOf` (`:96`), as `systems/estate/paths.ts` already imports
  walkRoutes. A four-way search over land runs from there to the first road
  row (`ROAD_FIRST_ROW`, `campusMap.ts:206`), and the route is paved as
  `pathways` the way `ADD_PATH_TILE` does. With nothing else standing, it is
  a straight drive unless the hall faces away from the road. A hall at the
  parcel's centre stands about 58 rows from the road, so the drive is about
  58 tiles, more than the review's 25. Paths are free.
- It is laid inside the reducer's action, so the action log replays it, and
  no save changes. An older save keeps whatever it has.
- **Balance.** `beauty.ts` reads `pathways`: trees under a path don't count
  toward greenery (`:53`), and the paths shape quad detection (`:44`). Run
  `npm run sim` and `npm run test:slow` (balance-regression) before and
  after, and report the beauty score and applicants at years 5 and 10. If a
  guardrail moves, the drive skips tree tiles where a detour of a tile or
  two allows it.
- **Tests.** `founding.test.ts` checks three things: a guided siting and a
  headless founding each leave a connected path from a tile next to the
  hall to the road; the drive never crosses the hall; and siting the hall
  again (`MOVE_BUILDABLE`) doesn't lay a second drive. Wherever
  `opening.test.ts` assumes an empty `pathways`, it is updated.
- **Visual check.** `npm run shot -- founding.json --framed` at week 1, and
  `npm run review:doors` on the founding and year-5 saves (the front door
  is on a path). `npm run timelapse` runs one Guided game to year 11 in
  Georgian, so the drive shows from the first frame.

### C. Walkers before paths

- `pickStop` moves out of the `Walkers.tsx` closure into `walkRoutes.ts`, as
  a pure function of the stops, the walker's stop, the random stream, the
  roadsides and a forecourt, so it can be tested.
- A new `forecourt(input, grid)` gives one or two `pointStop`s on the lawn
  three to five tiles out from Founders Hall's front entrance. They sit on
  the drive when there is one, and off it otherwise.
- While fewer than two buildings are done, the pool is the hall plus its
  forecourt, and walkers never go to the road. From two buildings on, the
  road gets its one in five again (`Walkers.tsx:383`). Walkers still arrive
  from the road edge when they spawn (`Walkers.tsx:426`).
- **Tests.** In `walk-routes.test.ts`, with Founders Hall alone, a thousand
  picks never return a roadside and all stay within six tiles of the hall.
  With a dorm done as well, roughly one pick in five goes to the road.
- **Visual check.** `npm run clip -- founding.json walkers.webm
  --focus=BLDG-GENSTUDIES --zoom=3` at week 3, against
  `c1-founding-walkers.jpg`. Most walkers should be in frame near the hall.

### D. A path objective

- *Somewhere to sleep* (`chapters.ts:137`) gets a third required objective,
  `path-to-founders`: "Lay a path from the residence hall to Founders Hall".
  It is met when the paths join a tile next to any sited residence hall to
  a tile next to Founders Hall. A path that joins the drive counts. The
  progress check lives in `state/chapters.ts`, which may read the map.
- Its help: "Open the build menu and click Paths. Drag from the residence
  hall's door to the drive. Paths are free." Show me opens the build menu.
  Once both buildings are sited, `ringedBuilding` (`chapters.ts:352`)
  returns null, so `initialBuildTab` (`BuildPopup.tsx:259`) already opens on
  Grounds. A `ringedTool(s)` beside `ringedBuilding` rings the Paths tile
  (`BuildPopup.tsx:732`) with `opening-target`.
- The chapter's `about` gets one sentence: "Students keep to a path where
  there is one." (Walkers prefer paving, `walkRoutes.ts:33–35`; they don't
  walk faster on it.)
- **Tests.** In `chapters.test.ts`: the objective is unmet with the
  residence hall and the dining hall placed but no path, met with a path
  from the residence hall to the drive, and not met by the drive alone.
  Saves already past the chapter catch up through `settleChapters`.
  `npm run review:plain` and `npm run review:strings` pass the new strings.
- **Visual check.** `npm run newplayer` reaches the objective and lays the
  path through Show me. `npm run review:gallery -- --sizes laptop,desktop`
  on a Guided year-1 save captures the drawer and the ringed Paths tile.

### E. Winter on the newer roofs

- `ZINC` and `POOL_ROOF` are mixed toward `SNOW_COLOR` at the vault's fill
  (`:4787`, `:4843`), at the same weights `snowOnRoofs` uses. The glazed
  rooflight bands take about half that cover. `READING_ROOM_SLATE` goes
  through `snowOnRoofs` before `SLOPE` (`:7768`).
- `landmarkArt` and `Gazebo` take `snow`, as `buildingMassArt` does
  (`:9078`). The snow lies on the Campanile's spire, the Bell Tower's
  cupola, the Gate's roof, the Great Dome and the gazebo's roof.
  `groundMarkings.tsx:1681` passes it through.
- **Tests.** `seasons.test.ts` gets a week-26 block. It renders each of the
  five to static markup at snow 0 and snow 1, and checks that every roof
  fill moves toward `SNOW_COLOR` while the wall fills stay put.
- **Visual check.** `sheet.tsx` gets `--snow N`. Then run
  `npm run sheet -- --every --snow 1 --only
  'LANDMARK|BELLTOWER|GAZEBO|FIELDHOUSE|NATATORIUM|PROJ-LAW'` and `sheet:shot --cells`
  in Georgian and Gothic, against `c1-winter-misses.jpg`.
  `npm run gallery:assets` at snow 0 is unchanged.

### F. The Arena

- **S, in the arena branch (`:10168`).** A glazed entrance hall on the long
  front, with a scoreboard sign over its doors. The field house's lunette
  goes on both end walls. A fascia band under the eaves carries the
  college's primary and secondary colours. It stays one drawing in every
  set, as the sport sheds are, with the set's wall and stone.
- **M, the expansions.** The first expansion adds a second concourse tier,
  a glazed band above the first. The second adds a practice annex, a low
  box with its own shallow vault on one short end, inside the 11×9
  footprint (the vault shortens to make room). The storey each expansion
  adds (`buildingSpec.ts:439`) stays, so heights, doors and seats are as
  they were. The review asks for a part "rather than wall height alone".
- The comment at `:3857` is corrected.
- **Tests.** `venue-stages.test.ts` renders ATH-ARENA at expansions 0, 1 and
  2 and checks that each draws a part the one before lacks (by class:
  `arena-entrance`, `arena-tier`, `arena-annex`). It also checks that the
  sign and the fascia read `s.self.colors`.
- **Visual check.** Run `npm run sheet -- --every --only '^ATH-ARENA'` in all
  nine sets at four azimuths, then `npm run gallery:assets` to regenerate
  `docs/assets/`. `npm run review:arrangements` and `review:doors` cover the
  sport street, to check the new front's door and steps. Compare against
  `c1-arena.jpg`.

### G. The founding screen at 1280×720

- `@media (max-height: 800px)`: `.startup-facade-svg` is capped at about
  120 px tall, centred, with its width following, and `.startup-facade`'s
  margins and the card's padding shrink. *Open the doors* then sits inside
  720 px. The title card gets the same treatment (§2.4).
- **Visual check.** `npm run review:gallery -- --sizes laptop,desktop` on a
  fresh page captures the title and the founding at 1280×720 and 1440×900.
  Its fresh pass gets one line that reports any founding or title primary
  button whose bottom falls below the viewport. `npm run phone` is
  unchanged, since the rule is height-only and a phone is taller than
  800 px.

### H. Two small slips

- **(a)** `clipPath="none"` comes off the sinkhole floor
  (`ageMarks.tsx:323`). `canvas-scene.test.ts` (`:86`) gets a scene with a
  fenced sinkhole, and expects nothing unsupported.
- **(d)** `quadGeometry.ts` is pure numbers, so it moves to `state/`, with a
  re-export left in `components/`. `PLACE_DRESSING` then allows a tile
  whose only occupant is a quad when `quadTile` calls the tile `'lawn'`.
  It still refuses the walks, the centrepiece and every other building.
  The Grand Quad has no `'lawn'` tiles, because its panels are hedged and
  planted (§2.3). In `dressing.test.ts`, a bench on a first-tier quad's
  lawn is placed, and the same quad's walk, its centre and every Grand Quad
  tile are refused.
- **Visual check.** `npm run review:views` on an arrangement save with a
  sinkhole and a bench on a quad shows no `clip-path` in `unsupported`.
  `review:doors`' props check finds the bench drawn in depth order on the
  quad.

### I. The year-5 store shot

- After A, B and D: a Guided year-5 save with its paths, shot close at
  1920×1080 with `npm run shot -- … --framed --bare --scale=1`. It goes
  beside the year-32 shot in `docs/store/itch/`, as one of the set Plan 117
  retakes for C6-7. If Plan 117 lands first, this PR adds the shot to its
  set and its recipe.

## 2. Decisions to take

1. **Should Home re-frame the view as well as reset the angle?**
   Recommended: yes. Its help already says "the starting view", and it is
   the one way back once you have panned away.
2. **Should the path objective be required?** Recommended: yes, like
   *Looking around*'s moves. The tool is free, and Show me rings it. The
   risk is that a skimmer is held at *Somewhere to sleep* (C3-1's pattern).
   If that is a worry, make it optional.
3. **Dressing on the Grand Quad.** Recommended: no. Only the first tier's
   plain lawn takes dressing. The Grand Quad's panels are hedged and
   planted, and it already has four benches round the plaza.
4. **The title card at 720 px.** The finding notes that the title card
   scrolls inside itself, which cuts off the hall of fame. The fix only
   names the founding card. Recommended: give the title card the same
   height rule in G. Reviving the code-drawn title art is C6-1's, not this
   plan's.

## 3. What this plan does not do

- **C1-5** (every new hall of the first decade is one drawing). The owner
  chose nothing, though the review's improvement #4 bundles it with this
  work.
- **C1-7 (b)** (the sinkhole over a flower bed) and **(c)** (a grant's green
  on green). The owner chose nothing for either.
- The other findings the owner chose not to act on: C2-5, C2-10, C3-1, C3-3,
  C3-4, C3-6, C3-7, C4-1, C4-2, C4-3, C4-5, C4-7 to C4-12, C6-6 and C6-10.
  C2-1 and C2-3 were left to Plan 112. C2-8, I7-3, I7-5d and I7-5e are
  already fixed.
- The title painting (C6-1) and the store retakes (C6-7) are Plan 117's.
  I only adds one shot to that set.
