# Plan 95 — The second game review, worked through

*Planning document only. Its job is to turn the owner's answers on the
[second game review](../reviews/2026-10-game-review-ii/README.md)
([Plan 86](86-second-game-review.md)) into PRs, one area at a time.*

**Status: Proposed.** Every area answered (area 5 is the review's summary,
with no findings of its own). PRs A–Z and AA–AD.

---

## 0. Why the review is re-read first

The review read `4062bfb`. Since then, Plan 87 redrew most of the catalogue,
and Plans 89–94 changed the shell and the build menu. So every finding is
checked against `main` before it is planned. A finding that later work
already fixed is closed here, with the plan that fixed it. It gets no PR.

## Rules for every PR in this plan

- One branch per PR (`plan-95x-subject`), merged once `check` and `slow`
  pass.
- **Balance never moves, except in M, N, R, S, X and AD.** `npm run sim` reads
  the same as `sim/baseline.json` after every other PR. Of those five:
  - M reshapes the course catalog;
  - N lowers the opening prestige;
  - R offers the specialization sooner;
  - S gives the Provost a teaching policy, which the harness players use;
  - X adds a late use for money, if W's measure calls for one.
  - AD makes three events name the professor they mean.
  Each re-baselines with the owner's sign-off, and runs on its own between
  the others' sim runs, so each baseline moves for one reason.
- A visual PR carries screenshots in `docs/reviews/2026-10-review-ii-fixes/`:
  - in more than one vernacular;
  - from more than one camera where the change turns with the camera;
  - on the canvas map and on the SVG fallback (`?map=svg`).
- Presentation never touches the run's random stream. It uses hashes of
  ids, as the dressing and weathering already do.
- Any state-shape change ships a save migration and a version bump.
- Each PR writes an **As implemented** note here.

## The map

| PR | Subject | Findings | Moves balance |
|---|---|---|---|
| A | This plan; the backlog notes | — | no |
| B | Seasons reach the open ground | B1-2 | no |
| C | The downtown in daylight, and a look at it | B1-7 | no |
| D | The render wall, measured, and the rest of it if it shows | B1-3 | no |
| E | True notes, and the pillar rule in one place | B2-2, B2-4 | no |
| F | The specialization choice, in prestige points | B2-3 | no |
| G | Faculty, lighter | B2-1 | no |
| H | History in three views | B2-1, B2-3 (the one-scale row), B2-4 (the rule's home) | no |
| I | Athletics folded, and the summer Review capped | B2-1 | no |
| J | The glossary's last mile, and the 101s | B2-5, B2-6 (the 101s) | no |
| K | The inbox and the phone | B2-7 | no |
| L | The course catalog's shape: the table, for the owner | B2-6 (the shape) | no |
| M | The course catalog's shape: the data and the migration | B2-6 (the shape) | **yes** |
| N | The college opens at the prestige it can earn | B3-1 | **yes** |
| O | NEXT: the building going up, and the step toward a school | B3-3, B3-4 | no |
| P | Crowding, at the admissions decision and on NEXT | B3-5 | no |
| Q | Labs, unfounded schools and the build tiles, said plainly | B3-7, B3-8, B3-10 | no |
| R | The specialization, offered sooner and by a pillar | B4-1, B4-2, B4-3 | **yes** |
| S | Teaching: the line that opens *Below A*, and the Provost's policy | B4-5 | **yes** |
| T | News that does not stop the clock | B4-6 | no |
| U | The Final Report reads the path | B4-7 | no |
| V | Cutting a varsity team | B4-8 | no |
| W | Money measured, and the scorecard re-based | B4-10, B4-11 | no |
| X | A late use for money (only if W calls for it) | B4-10 | **yes** |
| Y | The shop window: the share image and the README's words | B6-1, B6-5 | no |
| Z | The AI disclosure and the store page, drafted | B6-3, B6-5 | no |
| AA | The save and the clock: Landmark weeks, two tabs, opened matters | H7-1, H7-3, H7-4 | no |
| AB | The map and the money: the wheel, the short form, the scaffold on the canvas | H7-2, H7-6, H7-8c | no |
| AC | Names: the form says how a name will read; the harness's college | H7-7, H7-8b | no |
| AD | Three events name the professor they mean | H7-9 | **yes** |

B, C and D touch different files (`seasons.ts` and the grounds;
`downtownData.ts`, `Surroundings.tsx` and the camera; `buildingSpec.ts`), so
they can be done side by side.

Area 2's order:
- E lands before F and H. E fixes the text that F and H then move, so they
  move true text.
- G, I, J and K can go side by side with F.
- H lands after E and F, because History › Prestige's head is where E's
  rule goes and where F's one-scale row is drawn.
- L is a document. M waits on the owner's answer to it, and lands last.

Area 3's order:
- N lands on its own, between other PRs' sim runs, so its re-baseline is
  the only move in it.
- O and P both add NEXT readings (`nextStep.ts`). Land O first; P adds its
  reading to the order O leaves.
- Q can go side by side with any of them.
- F (area 2) also takes B3-6's line.

Area 4's order:
- W lands first. Its re-based scorecard is what R, S and X are read
  against.
- R before S. The choice's timing moves every later pillar reading.
- X waits for W's numbers, and on R and S, since both change what a late
  college spends on.
- T, U and V can go side by side with any of them.

Area 6's order: Y and Z are documents and pictures, and can land any time.
Y's README words name the pillars and the specialization as R leaves them,
so if R lands first Y says "the top 30 or a pillar's top 10".

Area 7's order:
- AA, AB and AC are small and independent, and can land any time.
- AC changes the harness's college name, which every scenario save and
  screenshot carries. Land it before the PRs that take screenshots from
  scenarios, so none of them reads "Test University University".
- AD moves balance, and runs on its own, as the other re-baselines do.

## The order to work in

The per-area notes above say what must come before what. This section puts
all thirty PRs in one order. It is built on four constraints:

- **One sim move at a time.** M, N, R, S, X and AD each re-baseline
  `sim/baseline.json`. Run them one after another, never side by side, so
  each baseline moves for one reason. Every other PR checks against
  whatever baseline is current, so a branch opened before a re-baseline
  merges `main` before its sim check.
- **One save version at a time.** K, M and possibly V each bump
  `SAVE_VERSION` with a migration. Two open at once fight over the number
  and the fixtures, so land them in the order K, V, M.
- **Shared files go in sequence.** These pairs edit the same code:
  - AB then C: `CampusMap.tsx`'s wheel, then its camera;
  - O then P: `nextStep.ts`;
  - J then T: the inbox's "left unanswered";
  - I then T: the summer Review's grouped lists;
  - E then F then H: History › Prestige and the pillar rule;
  - H then S: the teaching line S links from.
- **How the run is worked** (the owner's answers before it began):
  - each PR is merged once `check` and `slow` pass;
  - balance PRs re-baseline and report their numbers in the PR, stopping
    only if a goal player collapses;
  - a stage's side-by-side PRs are worked by parallel agents, each in its
    own worktree;
  - L's structure question is answered: a fourth tier.
- **The owner's answers are slow, so ask early.** L (the catalog table)
  and W (the money measure, which decides X) go out first. M and X wait on
  them while everything else lands.

### Stage 0 — Ground (one at a time, quick)

1. **A**, the plan and the backlog notes.
2. **AC**: the harness's college becomes "Test". Every later scenario
   screenshot and save then reads right. The sim must not move.
3. **W**: money measured and the scorecard re-based. Every balance PR is
   read against this card, and its numbers decide X.
4. **L**: the catalog table goes to the owner. It is a document, and the
   answer can take as long as the stages below.

### Stage 1 — Independent fixes (side by side)

Nothing here depends on anything but Stage 0, and no two touch the same
files:

- **E**: true notes, and the pillar rule in one place;
- **J**: the glossary and the 101s;
- **O**: NEXT names the building and the step;
- **G**: Faculty, lighter;
- **I**: Athletics folded, the Review capped;
- **U**: the Final Report;
- **AA**: Landmark weeks, two tabs, opened matters;
- **AB**: the wheel, the short form, the scaffold;
- **B**: seasons on the open ground;
- **D**: the render wall, measured.

**The balance chain starts here, alongside:** **N** (the opening prestige).
It touches only `actions.ts` and the founding preset, so it does not
collide with the fixes above. Each fix merges `main` after N's
re-baseline.

### Stage 2 — What Stage 1 unblocks (side by side)

- **F**, after E: the specialization choice in prestige points.
- **P**, after O: crowding at the decision and on NEXT.
- **T**, after J and I: news that does not stop the clock.
- **C**, after AB: the downtown in daylight, and the camera's one look.
- **Q**: the lab, the unfounded school and the build tiles.
- **K**: the inbox and the phone. **The first save migration.**

**The balance chain:** **R** (the specialization offered sooner), after N.
R rewrites the rule's words through E's function, so it lands after E.

### Stage 3 — The second wave

- **H**, after E and F: History in three views.
- **V**, after K: cutting a varsity team. **The second migration**, if it
  needs one.
- **Y** and **Z**, after R: the share image, the README's words, and the
  store drafts. They describe the specialization as R leaves it.

**The balance chain:** **AD** (events name the professor they mean). It is
independent of everything but the sim, so it fills the gap while H lands.

### Stage 4 — The balance chain's tail (one at a time)

1. **S**, after R and H: the teaching line and the Provost's policy.
2. **M**, after L is answered and after K and V: the course catalog and its
   migration. **The last migration.**
3. **X**, last, and only if W called for it: a late use for money. It is
   measured against a college that already has the earlier specialization
   (R), the Provost (S) and the new catalog (M).

### The order at a glance

| Stage | Side by side | The balance chain, one at a time |
|---|---|---|
| 0 | A → AC → W → L (sent to the owner) | — |
| 1 | E, J, O, G, I, U, AA, AB, B, D | N |
| 2 | F, P, T, C, Q, K | R |
| 3 | H, V, Y, Z | AD |
| 4 | — | S → M → X |

Three things set the critical path:
- the six balance PRs in their single file (N → R → AD → S → M → X);
- the owner's answers on L and on W's numbers;
- the migration order (K → V → M).

Everything else fits around them.

---

## Area 1 — Aesthetics

### The owner's answer

| Finding | What | On `main` | Answer |
|---|---|---|---|
| B1-1 | The Research Park reads as a warehouse | Fixed by Plan 87B (lab pavilions round a court, a glazed link, a sign at the gate) | Close |
| B1-2 | Seasons stop at the open ground | Open: `.ground-turf`, `.ground-water` and `.jg-sakura` are fixed fills. Only 87K's beds and hedges follow the season | **PR B** |
| B1-3 | The vernacular stops at the walls of the invariant half | Mostly fixed by Plan 87E (the signature halls wear the vernacular's wall; Science has fume hoods and a greenhouse). The render wall `#b0a992` remains in every set | **PR D**: measure, then decide |
| B1-4 | Diagonal and curved walks draw as staircases | Open | Backlog |
| B1-5 | Doors open onto lawn, seams, trees and racks | Open | Backlog |
| B1-6 | The committed asset gallery is stale | Regenerated by Plan 87 (`64760ce`). No map art has changed since. Construction cells still show only the footings | Close as is |
| B1-7 | The downtown's lights burn at noon, and the district is off the opening view | Open: `districtLit` unchanged | **PR C**: bunting and crowds, and one camera move |
| B1-8 | Identical towers and chapter houses | Fixed by Plan 87H (a crown per tower). Each chapter house carries its own letters (`ChapterPediment`) | Close |
| B1-9 | Small slips on Plan 85's buildings | Fixed by Plan 87: a rooflight on the flat Modern roof in place of the cupola; the Athletics Complex renamed the Sports & Recreation Complex; the park redrawn | Close |

### PR 95A — The plan

- This file, and its row in `docs/plans/README.md`.
- `BACKLOG.md`:
  - "Walks that draw straight" and "Doors that meet the campus" name B1-4
    and B1-5 beside A1-7 and A1-8.
  - The door entry adds the review's count on three year-51 campuses: 814
    doors onto lawn on 187 buildings
    (`docs/reviews/2026-10-game-review-ii/data/b1-doors-grown.md`).
  - The launch section (area 6):
    - **The timeline is decided (B6-4):** Next Fest June 2027
      (registration closes 25 April 2027). The Steam page goes live by
      January 2027, so wishlists build before the fest, with the demo
      live in February–March and launch in late summer. This replaces
      "Next Fest (February or June 2027)".
    - **The owner's own tasks (B6-3):**
      - a human edit of the most-read text: the founding letters, the
        summer, the specialization letter and the Final Report;
      - a devlog started from the plans' quotes;
      - the capsule art and the logo, commissioned.
    - **The playtest (70L)** measures a first run's real length, and
      whether players reach year 30 (B6-5).

### PR 95B — Seasons reach the open ground (B1-2)

At week 26 the campus is white, but its pitches, pool and garden stay in
summer. Each gets a token that `seasonStyle` (`seasons.ts`) sets, as the
fields in the ring already do.

- **Turf.** A `--turf` token for `.ground-turf`, the soccer field, the
  stadium's field, the rooftop track's infield and the quads' parterres.
  It dulls toward straw through the Fall Term and takes less snow than
  `--lawn` does, because pitches are kept clear (about half the cover). The
  pitch lines stay white, so they still read on it.
- **Courts** (`.ground-court`) take the same cover as turf. Their play
  surface (`.ground-court-play`) stays as it is.
- **Open water.** A `--water` token for `.ground-water`: a cover colour
  while snow lies (pools are covered for the winter), the summer blue
  otherwise. The Japanese garden's pond and stream are water, not a pool,
  so they freeze to a pale grey-blue instead.
- **The cherry trees.** `.jg-sakura` reads tokens in place of its literal
  pinks:
  - blossom in spring only, while `bud` is up (weeks 34–44);
  - the canopy's green in summer;
  - the ornamental leaf tokens (rust, then bare) through the fall and the
    winter.
- **Sweep the literals.** Grep `groundMarkings.tsx` and the ground rules
  in `styles.css` for any other green or blue fill that should follow the
  season, and route each through a token or leave a comment saying why it
  stays (painted courts, the track's surface).
- With seasons off in the settings, the map stays at `SUMMER_GREEN_WEEK`,
  and every new token reads its summer value there.
- **Checks:**
  - `seasons.test` covers each new token at weeks 2, 12, 26 and 40, and
    its summer value at `SUMMER_GREEN_WEEK`.
  - Screenshots: one year-51 campus at weeks 12, 26 and 40, on the canvas
    and the SVG. The shot to beat is `img/b1-winter-grounds.jpg`.
  - The canvas reads CSS variables the way the SVG does. Confirm the new
    tokens reach `mapCanvas.ts`'s style lookup.

**As implemented.** Presentation only: nothing under `systems`, `state`,
`data` or `sim` changed, so the sim was not run.

- **Tokens.** `seasonStyle` sets, beside the old ones:
  - `--turf` and `--turf-deep` (`.ground-turf`, `.ground-endzone`): the
    pitch, the diamond's outfield, the gridiron and the stadium's field.
    They dry toward straw with the lawn and take 0.42 of the snow (the
    lawn's 0.85, halved). At week 26 the turf is `#b3be9c` against the
    lawn's `#e2e7df`: a kept pitch, pale, still read as a pitch, the lines
    white on it.
  - `--court` (`.ground-court`): the same snow, no straw (it is paint).
    `.ground-court-play` stays.
  - `--water` (`.ground-water`, the pool): the summer blue to a grey-green
    cover `#7d8b88` as the snow lies. The lanes (now `.ground-pool-lane`;
    the running track keeps `.ground-lane`) and the deep end go under the
    cover by `--under-ice-opacity`.
  - `--pond` on a new `.ground-pond` for the Japanese garden: it freezes
    to `#c4d3da`, the koi under the ice (`--under-ice-opacity`), the
    lilies gone with the beds' blooms (`--bloom-opacity`).
  - `--sakura` and `--sakura-top` (`.jg-sakura`): the ornamental leaf
    (green, rust, bare twigs, bud) mixed to the blossom's pinks by `bud`,
    so the cherries are pink only while the trees bud (pure blossom at
    weeks 38–40, none outside 34–44); their petals on the ground show by
    `--petal-opacity` (the same `bud`).
  - `--garden-grass` and `--moss`: the garden's ground under the snow as
    the lawn is.
- **The sweep.** Every literal fill in the ground rules and
  `groundMarkings.tsx` is a token now or carries a comment saying why it
  stays: the track, the infield's skin, the paving and the courts' play
  surface (kept clear, or not living), the fountains' water (a quad's
  centrepiece; a drained basin reads as broken), the hedges' sides and
  the green azalea (evergreen; their tops already take `--hedge-top`'s
  snow), the batter's eye (a painted wall). The garden's pink and magenta
  azaleas take `--azalea*` tokens: in flower but for the fall and winter,
  green leaves then, the tops under snow. The quads' panels were already
  `.ground-lawn`.
- **The canvas.** `canvasPaint.ts`'s `StyleResolver` probes each class
  inside the map's host, where `seasonStyle`'s variables are set, and
  `mapCanvas.ts` resets every rule when the season changes, so the new
  tokens reach the canvas with no change to either file. The roof track's
  literal infield fill became a class for that reason.
- **Tests.** `test/seasons.test.ts` checks each new token's summer value
  at `SUMMER_GREEN_WEEK` and week 2, and its behaviour at weeks 12, 26
  and 40, and that no week without `bud` shows blossom (236 checks).
- **Screenshots** in `docs/reviews/2026-10-review-ii-fixes/`: the
  Completionist's year-51 campus (laid out) at weeks 12, 26 and 40 on the
  canvas and the SVG (`95b-week{12,26,40}-{canvas,svg}.jpg`), the grounds
  at the three weeks (`95b-grounds-weeks-12-26-40.jpg`) and the garden
  close up, canvas and SVG side by side (`95b-garden-weeks-12-26-40.jpg`).

**Deviations.**

- **The roof track's infield takes the lawn's full snow** (`--turf-roof`
  via the lawn's curve), not the pitches' half. At half cover it was the
  greenest thing on a white campus at week 26: a roof is not swept.
- **The cherries with seasons off are green, not pink.** The spec's
  "the canopy's green in summer" and "every token reads its summer value
  at `SUMMER_GREEN_WEEK`" together mean the seasons-off garden loses its
  blossom (and its petals). The azaleas keep their flowers in summer, so
  the garden keeps some pink.
- **The cherries wear the ornamental leaf in every season**, the
  ornamental green in summer rather than the canopy's, so one species
  reads as one tree whichever crown the garden drew.
- **The azaleas, the lilies, the koi and the petals** were not named in
  the spec; they were pink, green or orange in midwinter, so the sweep
  took them.

### PR 95C — The downtown in daylight, and a look at it (B1-7)

The student-life district (Plan 85H) is "lit" through a festival's weeks
and the snow weeks. The map has no night, so the light is drawn at noon,
and the pools on the road read as yellow paint. The backlog declines night,
so the light goes.

- **No light by day.** `Surroundings.tsx` stops drawing the pools of light
  (`sprite.pool`), and the bulbs stay off.
- **The winter.** Through the snow weeks the shop windows and signs keep
  their warm colour (`litWindows`, `sign`, `glass`), which reads as a lit
  interior on a grey day. That is the only light the district keeps.
- **The festival.** From a festival's week for `FESTIVAL_LIT_WEEKS`, the
  district dresses for it:
  - bunting in the college's colours on the existing strings
    (`district.strings`) in place of the bulbs;
  - a crowd on the pavements, drawn as the stands draw a game-day crowd
    (dots in the depth order). A bigger festival (`scale`) brings a bigger
    crowd.
- `districtLit` splits into `districtFestive` (the festival's weeks) and
  `districtWinterLit` (the snow weeks), so each look reads its own
  condition. `RingFront` and `RingBack` take both.
- **One look at it.** The district sits in the ring along the road, outside
  the opening view. The camera eases to it once, the way `focusBuilding`
  brings a building into view:
  - when the player chooses the student-life specialization;
  - when the district first grows from step 0 to step 1 (a ref on
    `districtStep` within the session, so loading a save never pans).
  - It needs no state: both are edges seen in the session. Under reduced
    motion the view jumps instead of easing. A player who is placing a
    building or drawing a path is not panned.
  - Check that the view's pan limits reach the ring at the road. If they
    clamp to the parcel, widen them only for this move.
- **Checks:**
  - Tests for `districtFestive` and `districtWinterLit`, and for the pan
    firing once on each edge and never on load.
  - Screenshots of the district at noon in the summer, in a festival week
    and in a snow week, on the canvas and the SVG. The shot to beat is
    `docs/reviews/2026-10-pillars/85h-district-lit.jpg`.

**As implemented.**
- `districtLit` is gone. `districtFestive(s)` returns the festival's scale
  from its week for `FESTIVAL_LIT_WEEKS` (null otherwise, and at step 0 or
  a spring without one); `districtWinterLit(s, snow)` is snow at
  `WINTER_LIT_SNOW` or deeper. Only the map read `districtLit`, so the sim
  was not run: nothing in `systems`, `state` or `sim` reads either.
- `ringView` takes `winterLit` and `festive` (0, or 1 to 4 by scale) in
  place of `lit`, both in its cache key; `RingBack` and `RingFront` take
  both and the college's colours, and the canvas scene's signatures carry
  all three. The pools of light (`sprite.pool`), the bulbs' halos and the
  shopfronts' spill of light on the pavement (`glow`) are gone; the bulbs
  are always the small unlit ones. The snow weeks keep the warm windows,
  signs and glass.
- A festival hangs bunting on `district.strings` in place of the bulbs:
  two pennants to a bulb, alternating the college's primary and secondary
  colours. Its crowd stands on the pavement in front of each shopfront,
  1.4, 2.2, 3.2 and 4.4 people a tile of frontage for the weekend, the fair,
  the headline act and the gala: a coat in the stands' crowd's six colours
  and a head each, placed by a hash of the shop and the person, drawn back
  to front with the shopfront (over the walls when it faces the camera).
  People are drawn larger than life, as the map's trees are, or the crowd
  did not read at the opening zoom. No pattern or gradient was added, so
  nothing new goes through `CanvasScene.defs`.
- The look: `districtLook.ts`'s `districtSeen` and `districtLookDue` (the
  same college, at the same week or the next, choosing student life or
  growing from step 0 to 1; nothing before the first sighting). CampusMap
  keeps the last sighting in a ref and eases the view, at its zoom, over
  900 ms to `ringLand.ts`'s `districtCentre` (the middle of the shopfronts
  standing, or of step 1's before it); reduced motion jumps; not while
  placing, drawing a path or turning; a pan or zoom by the player stops the
  ease. The wheel's native listener is untouched. The pan limits already
  reach it (the town is at most 60 tiles long, `CENTRE_REACH` is 70), so
  nothing is widened; a test pins that `clampView` leaves a view centred on
  the district alone at three zooms and three steps. Checked in Chromium: a
  save loaded at step 0 does not move, and the week the district grows
  pans to its first shops (`95c-district-first-step-look.jpg`).
- Tests (`test/downtown.test.ts`): the two conditions and their edges, no
  light by day, warm windows only in the snow, bunting and a crowd growing
  with the scale, and the look firing once on each edge and never on a
  load, a jump in time, another college or a step back.
- Screenshots in `docs/reviews/2026-10-review-ii-fixes/`, the `downtown`
  scenario (Blackmoor, Georgian, Year 38) at week 46, week 32 after a gala
  in week 31, and week 26, canvas and SVG: `95c-district-{summer,festival,
  snow}-{canvas,svg}.jpg`, and `95c-district-festival-detail-canvas.jpg`.
- **Deviations.** One vernacular only: the change is to the ring's town,
  whose shops take the district's own paint and awnings, not the
  vernacular's forms. The shopfronts' spill of light (`glow`) went with the
  pools, as the same yellow paint on the pavement.

### PR 95D — The render wall, measured (B1-3)

Plan 87E gave the school signature halls their vernacular's wall, which was
the part of B1-3 a player saw most. The buff render wall `#b0a992` is still
in every set (`buildingSpec.ts`), so some block and works forms still wear
it in every vernacular. This PR measures first.

- **Measure.** Run `npm run review:probe -- vernacular` and `-- catalogue`
  on the review's three year-51 campuses (Completionist with
  `--build-all`, Natural and Guided, seed 12345). Record, per campus:
  - the share of buildings, and of building area, whose wall is the
    render wall in a vernacular other than Modern or Art Deco;
  - which placeables those are.
  Write the table into this PR's **As implemented** note and set it beside
  the review's (55% / 49% of area followed the vernacular's massing and
  walls).
- **Decide by the numbers.**
  - **Under 10% of building area on every campus:** close B1-3. No art
    changes.
  - **Otherwise:** the forms that remain take the vernacular's wall,
    massing unchanged. Brick for Georgian and Tudor, ashlar for Gothic,
    limestone for Classical and Second Empire, stucco for Mission, and
    the set's own wall for Italianate. Render stays in Modern and Art
    Deco. Follow 87I's `VERNACULAR_WALL_LABS` pattern rather than changing
    each spec by hand. `catalogue.test.ts` compares motif and material, so
    rerun it.
- If art changed: rerun `npm run gallery:assets`, and take screenshots of
  each changed form in Georgian, Gothic, Classical and Mission.

**As implemented.** Art only: `materialOf` feeds the drawing and nothing
under `systems`, `state`, `data` or `sim` reads it, so the sim was not run.

- **Measured.** The three campuses were made as the review made them:
  `npm run scenario -- --player <P> --year 50 --seed 12345 --clear-modal`
  (Completionist with `--build-all`), which writes year 51 week 2. All
  three found in Georgian. `review:probe -- vernacular` now ends each
  campus with a line per set (Modern and Art Deco left out) giving the
  buildings and footprint area in the render wall, and which ones. The
  share is the same in all seven sets, because the render forms were the
  same in each:

  | Campus (year 51) | Buildings | Render wall, before | Area, before | After |
  |---|---:|---:|---:|---:|
  | Completionist, every asset stood | 77 | 21 (27%) | 31% | 0 |
  | Natural, seed 12345 | 68 | 20 (29%) | 37% | 0 |
  | Guided, seed 12345 | 62 | 21 (34%) | 36% | 0 |

  Beside the review's figures, massing and walls following the
  vernacular: 56% / 49% of area (Completionist), 59% / 50% (Natural), 50%
  / 45% (Guided); the review had 55% / 49%, 58% / 50%, 51% / 46%. Plan 87
  did not change the render forms, so on `main` a third of the campus was
  still render.

  The render forms (`-- catalogue`: 21 of 81 placeables, in all five
  founding sets): the works labs (Biology, Chemistry, Physics, Electrical,
  Chemical Engineering) and the Research Park; the test halls and studio
  (Mechanical, Civil, Aerospace, Film); Computing; the Humanities Research
  Institute and Experimental Economics (a portico and a pavilion, in
  render because they are labs); the Recreation Center, the gym, the
  Sports & Recreation Complex, the Arena and the Field House; the two
  apartment rungs (DORM-05, DORM-07); and the Football Stadium. The
  stadium alone is 14–17% of the area.
- **Decided: over 10% on every campus, so the walls changed.**
  `renderOutOfPlace` (`buildingSpec.ts`) turns render into the set's
  academic wall (`brickRed`) under the labs' flat deck everywhere but
  Modern and Art Deco (`RENDER_VERNACULARS`): brick in Georgian and Tudor,
  ashlar in Gothic (keeping its slate, as 87I's labs did), limestone in
  Classical and Second Empire, stucco in Mission, ochre in Italianate. It
  is 87I's rule made general: the Neuroscience Labs' wall
  (`vernacularWallOf`, one stable object per set) is now the one every
  render form takes, and `VERNACULAR_WALL_LABS` keeps only the Labs' own
  exception (the wall in Modern too). Massing unchanged. After it,
  `-- catalogue` lists no render wall in Georgian, Gothic, Classical or
  Mission, and Modern keeps its 21.
- **The stadium.** Its stands were tinted by the wall, so the change
  would have made the seating brick. The stands' walls take the set's
  wall and the seating, concourse and fascia stay concrete (the render
  color), Franklin Field's way; in Modern and Art Deco it draws exactly as
  before.
- **Tests.** `building-spec.test.ts`'s invariant-materials rule now reads
  against Modern: an invariant building in render there wears the set's
  academic wall elsewhere, the rest stay as they were, and nothing but
  open ground wears render outside Modern and Art Deco. Every roof still
  reads against its wall (Mission's stucco, Gothic's ashlar and the bonus
  sets included). `catalogue.test.ts` passes unchanged.
- **Pictures.** `npm run gallery:assets` rerun (`docs/assets/`; it also
  picks up Walnut Hall, missing since an earlier plan). Each changed form
  in Georgian, Gothic, Classical and Mission (rows), from `npm run sheet`:
  `docs/reviews/2026-10-review-ii-fixes/95d-works-labs.jpg`,
  `95d-test-halls-and-institutes.jpg`, `95d-sport-and-apartments.jpg` and
  `95d-stadium.jpg` (the full bowl).
- **Deviations.**
  - The apartment blocks, the gyms and the stadium changed as well as the
    labs. The PR said "the forms that remain"; those are what remained,
    and without them the stadium alone kept every campus over 10%.
  - The stadium keeps concrete seating, so only its walls follow the set.
  - Open ground keeps render for its props: it is left out of the measure,
    and its props are not walls.
  - The note gives year 51 week 2, the year `scenario --year 50` writes,
    as the review's year-51 campuses were.

### What area 1 does not do

- B1-4 (diagonal walks) and B1-5 (doors) stay in the backlog.
- B1-6's construction-stage cells: the gallery still shows only the
  footings. Closed by the owner as not worth a change.
- The area's ranked list of decorative assets stays in the backlog as it
  is.

---

## Area 2 — UI and text

### The owner's answer

Plans 89–94 restyled these screens (staff ID cards, scoreboards, sliding
switches, Lucide icons) but cut no words and changed none of the strings
the review named. Every finding is open on `main`.

| Finding | What | On `main` | Answer |
|---|---|---|---|
| B2-1 | The load moved to Faculty, History and Athletics | Open. Each faculty card still carries More, Train and Dismiss (`tabs/FacultyTile.tsx`), and the summary prose still opens the tab. History is one page. Plan 90F restyled Athletics but did not fold it | **G, H, I**: all four screens |
| B2-2 | Later plans left four claims false | Open, all four verbatim (`HistoryTab.tsx:236, 244, 268`; `EndowmentPanel.tsx:36, 55`). A fifth: the Rank hint, `figureHints.ts:24`, says "the guide's academic ranking" too | **E**, and the habit |
| B2-3 | The specialization choice: 681 words and a misleading figure | Open: "worth {weight} points" (`specializationData.ts:263, 290`) | **F** and **H**: the full fix |
| B2-4 | Plan 85's rule restated six times; "term" means two things | Open (`HistoryTab.tsx:49`, `StandingsPanel.tsx:32` and the rest) | **E**, with the rule's home in **H** |
| B2-5 | The glossary's last mile | Open, every item | **J**, and checks in `strings.ts` |
| B2-6 | The catalog's shape, and a bland entry tier | Open. `courseDescriptions.ts` is unchanged since the review | **J** for the 101s; **L** and **M** for the shape |
| B2-7 | Small phone and inbox details | Open (`inbox.ts:214` `week: now`; `TabOverlay.tsx:31`; `--mono` on the funds) | **K**, all four |

### Before the area-2 PRs: measure again

The review's word and control counts were taken on `4062bfb`. Plans 89 and
90 added Founders Hall's offices, the twelve effects and the restyled
cards, so the counts have moved. G, H and I each open by rerunning
`npm run review:sweep` at years 8, 30 and 40 on their screen. They record
the before and after counts in their **As implemented** note.

### PR 95E — True notes, and the pillar rule in one place (B2-2, B2-4)

- **The false claims**, each rewritten from the rule as it is:
  - "Place in the guide, by year": "Of {n} colleges, by prestige; #1 is
    the top." (`HistoryTab.tsx:244`). The Rank hint
    (`figureHints.ts:24`) takes the same words.
  - The Prestige chart's note (`:236`) names the four pillars and their
    weights from `PILLAR_WEIGHTS`, with the endowment added and neglect and
    crowding taken off, as History's own help does.
  - The Catalog chart's note (`:268`): breadth is one term of the academics
    pillar. Say that and drop "lifts the prestige limit".
  - The endowment's help (`EndowmentPanel.tsx:36, 55`): drop the board's
    worry. Above the prudent rate, say what a high draw costs: the fund
    grows slower than its return, and so does next year's draw.
    `DRAW_RATE_PRUDENT` stays as the line where the note appears.
- **The pillar rule, once.** "Each pillar holds a share only its own
  specialization fills" is written once, as a sentence built from
  `PILLAR_WEIGHTS` and `SPECIALIZATION_TERM_WEIGHTS` in one function
  (`prestigeWords.ts` or beside `PILLAR_WEIGHTS`). The six places that say
  it now (History's help, the standings' help, the guide's help, the
  choice's intro, the notice and the status line) either:
  - call that function, where the rule is the point of the text; or
  - point to History › Prestige ("see History › Prestige"), where it is an
    aside.
  No help text types "35%" by hand again. A test greps `src/` for the
  literal weights outside `prestigeSystem.ts`.
- **"Share", not "term".** A pillar's part is a *share* in every string
  the player reads: the History rows, the status line, the three
  programs' lines ("The share is full from 12."), and the Faculty
  training bar. "Term" is the calendar's. Code names
  (`SPECIALIZATION_TERM_WEIGHTS`) may stay. Only the words change.
- **The habit.** `docs/plans/README.md` gains one line under how a plan is
  written: a plan that changes a rule greps `src/` for that rule's words
  and lists what it rewrote in its **As implemented** note.
- **Checks:** `npm run review:strings` is clean. The tests that pin these
  strings are updated.

**As implemented.** Words only; nothing the simulation reads changed, so
the sim was not run (the one file under `systems/` touched,
`finance/distress.ts`, changed a comment).

- **The rule's home** is `src/data/prestigeWords.ts`, a small words
  module: `pillarWeightsWords()` ("academics 35%, research 25%, student
  life 25% and athletics 15%", from `PILLAR_WEIGHTS`), `pillarShareRule()`
  ("Each pillar holds a share only its own specialization fills, worth up
  to 9.8 points of prestige in academics, 7.0 in research, 8.5 in student
  life and 5.1 in athletics, so without one no pillar reaches the top."),
  `pillarRule()` (the two together), `specializationShareWorth(pillar)`
  (`SPECIALIZATION_TERM_WEIGHTS` × `PILLAR_WEIGHTS`, the share in points
  of prestige, B2-3's figures) and `PILLAR_RULE_HOME` ("History ›
  Prestige"). `test/pillar-rule.test.ts` scans every `.ts`/`.tsx` in
  `src/` but `prestigeSystem.ts` for a pillar typed beside its weight or
  the four weights in a row, and checks that each pattern catches its
  sample, so the scan cannot go quiet.
- **What it rewrote** (the habit, applied to itself: grepped for "only its
  own specialization", "35%", "academic ranking", "prudent", "the term"):
  - History's help (`HistoryTab.tsx`): the weights and the share rule
    from the functions. The Prestige chart's note: the four pillars at
    their weights, the endowment added, neglect and crowding taken off.
    The guide chart's note: "Of {n} colleges, by prestige; #1 is the top."
    The Catalog note: "Breadth counts toward prestige as one part of the
    academics pillar, Curriculum breadth."
  - The standings' help: the weights and the rule dropped for a pointer
    to History › Prestige; the readings note under the four pillars takes
    `pillarWeightsWords()`.
  - The guide's help (`RankingsPanel.tsx`): the weights from the
    function, the rule as a pointer.
  - The choice's intro and the board's notice: `pillarShareRule()`,
    passed in as an argument (`CHOICE_WORDS.intro`'s `rule`,
    `specializationNotice`'s third), so `specializationData.ts`, which
    `prestigeSystem.ts` imports, does not import back.
  - The status line (`specializationStatus`): "specialization share".
  - "Share" for "term" in the four programs' rows (training, the park,
    the complex, the downtown: "The share is full from 12.", "fills the
    share", "half the share") and on the Faculty training bar.
  - The Rank hint: "Of {n} colleges, by prestige; #1 is the top; the rank
    follows prestige, …" (one sentence, as `test/figures.test.ts` asks).
  - The endowment: the board's worry gone. The help says "Above 5.0% the
    draw takes most of the return: the fund grows little or shrinks, and
    next year's draw with it"; the Grows line adds "so next year's draw
    grows as little" (or "and next year's draw shrinks with it").
    `DRAW_RATE_PRUDENT` still marks the line; its comment says so.
  - `docs/plans/README.md`: the habit, as a third rule.
- **Deviations.**
  - The Prestige *figure* hint (`figureHints.ts`'s `prestige`) carried the
    same false list as the chart's note (no athletics); it now takes
    `pillarWeightsWords()` too. Not in the section; the same claim.
  - The spec names three programs' lines; there are four (student life's
    downtown says "term" too), and all four say "share".
  - The share rule gives each share in points of prestige (9.8, 7.0, 8.5,
    5.1), since it is built from both weights. The choice's cards and the
    notice's list still say the pillar points ("worth 28 points"): F's to
    change, and F can read `specializationShareWorth`.
  - The status line keeps its own sentence (with "share"), not a pointer:
    it sits in History › Prestige itself, and in the standings under it.
  - The README's heading reads "Three rules" now that it holds three.

### PR 95F — The specialization choice, in prestige points (B2-3)

- **The figure.** Each card says its share in points of prestige: "up to
  9.8 points of prestige". The value comes from the pillar's weight times
  the share's points (`prestigeSystem.ts`), never typed. The pillar points
  ("34 of the pillar's 150") move into the card's detail.
- **Three lines a card**:
  1. what it is (the building or the district, in a clause);
  2. what it adds now;
  3. how its share fills, cut to its measure ("full at 10 points of
     festivals in ten years").
  The rest (the rivals in it, the standing in the pillar, the long
  version of the fill rule) goes behind "More", as on the faculty card.
- **One line to compare.** Each card ends with what the college would be if
  that share were full today: "Prestige 61.4 → 70.2, #17 → #11". It is
  computed by the same function the guide ranks with, on a copy of the
  state with that share full. Present the rank against today's rivals.
- **The intro** shrinks to two sentences. The rule itself is E's function.
- **The college's strongest pillar, first** (B3-6). One line above the
  cards: "The college's strongest pillar is student life (#4). 35 rivals
  specialize in academics, 19 in student life." It is read from the
  standings and the rivals' specializations.
- On a phone the four cards stay stacked, and each fits in about one
  screen.
- **Checks:**
  - A test that the four "up to" figures equal the pillar weights times the
    share points.
  - A test that the comparison line's prestige matches
    `prestigeSystem` run on the filled copy.
  - The choice's word count before and after (the review's 681).
  - Screenshots at desktop and at 390×844 at the largest text.

**As implemented.** Words and a read-only projection; no rule the
simulation reads changed. `npm run sim` was run all the same (a hook was
added beside the share's reading in `specializationData.ts`) and reads as
the baseline.

- **The figure.** Each card heads with "Up to 9.8 points of prestige"
  (7.0, 8.5, 5.1), from `prestigeWords.ts`'s `specializationShareWorth`.
  The pillar points moved into the card's detail ("28 of the pillar's 150
  points", `opensLine`). The board's notice drops its four "which opens 28
  points of it": `pillarShareRule()` in the same letter already gives each
  share in points of prestige, so the list names the four and no figure
  (`specializationNotice(milestone, rule)` lost its `weights` argument).
- **Three lines a card**, new fields on `SPECIALIZATION_CARDS`: `what`
  ("The Research Park, home of the Landmark Programs."), `adds` ("While the
  park stands, every lab's output is 15% higher.") and `fillsShort` ("The
  share fills with the festivals, full at 10 points of them in 10
  years."), each built from the mechanic's constants. Behind More (the
  faculty card's disclosure button): the long fill rule in pillar points,
  athletics' lift, the mechanics, a standing park's note (85F), the
  college's place in the pillar and its rivals.
- **The comparison line**, `milestone.ts`'s `shareFullProjection`: "Full
  today: prestige 94.7 → 104.5, #19 → #5." The target is
  `computePrestigeTarget` on a copy with that share read full
  (`specializationData.ts`'s `withShareFull`, which marks a copy in a
  `WeakMap` that `specializationTerm` reads); prestige moves by what that
  adds to today's target, so the teaching standard's limit holds as it
  would; the rank is `playerRank` on a copy at that prestige, against
  today's rivals.
- **The strongest pillar, first** (`strongestStanding`): "The college's
  strongest pillar is student life (#7). Of the rivals, 35 specialize in
  academics, 23 in research, 19 in student life and 22 in athletics."
- **The intro**: two sentences, the second `pillarShareRule()`.
- **Measured** (`npm run review:gallery`, the `specialization` scenario,
  Year 36): the choice's top layer **709 → 378 words**, 5 → 9 controls
  (the four More buttons); 709 is this save's count of the review's 681.
  At 390×844 and the largest text each card is 406–472 px tall, half a
  screen. Screenshots: `docs/reviews/2026-10-review-ii-fixes/95f-choice-*.jpg`.
- **Tests** (`test/specialization-choice.test.ts`): each "up to" figure is
  the pillar's weight times the share's points, and the card prints it;
  the comparison's prestige is `computePrestigeTarget` on the filled copy
  (and equals the share's worth unless the teaching standard holds it);
  the rank is `playerRank`'s; the state itself is untouched; the strongest
  pillar is the best-ranked; the intro is two sentences.
- **Deviations.**
  - "A copy of the state with that share full" is a shallow copy marked
    full, not a `structuredClone` with the mechanic's records set: a full
    share is a different record per pillar (trained professors, Landmark
    years, festivals with the downtown grown and goodwill high, deep
    runs), and writing those would move other terms too (the downtown's
    growth meets students' needs, a deep run is a title). The mark moves
    the share alone, and nothing writes to the copy.
  - The comparison's "before" is today's prestige (the stock the guide
    ranks), and "after" adds the full share's lift to it, rather than
    printing the target itself, which differs from today's prestige by
    the year's drift.
  - The strongest pillar is the best *rank* in the standings (the higher
    value on a tie), as the review's example reads ("student life (#4)");
    the harness's rule (`strongestOf`, by value) is unchanged.
  - The line lists the rivals in all four pillars, not the two the
    example names.
  - "Still to come" is gone from the card: since Plan 85H every mechanic
    is ready, so it never showed.

### PR 95G — Faculty, lighter (B2-1)

- **The card's face** keeps More and its chips. **Train** and **Dismiss**
  move into the person page that More opens, where the training outcome
  and the dismissal's cost are already said. A year-40 grid loses about
  80 Dismiss buttons. This also settles B2-5's fifth button role, since
  Train leaves the face.
- **The summary** (the course-slot sums and the market's standing, about
  140 words) becomes one row of figures: "440 course slots · 284 taught ·
  61 short". The prose moves into the tab's help hint. The market's
  standing keeps one line under the row.
- **The filter** the player last used is remembered for the session
  (React state lifted to the tab's parent, not the save).
- **Phone:** at the largest text, the first screen now shows the figure
  row and the first faces.
- **Checks:** the sweep's counts at years 8, 30 and 40. The tests for
  training and dismissal drive the person page. Screenshots at desktop
  and phone.

**As implemented.**

- **The face.** `FacultyTile.tsx` draws the face twice over: in the grid
  without Train and Dismiss, and opened (in place on a wide screen, in the
  sheet on a phone) with them, from a new `FacultyActions`. Both keep
  their ask-first, Train's outcome as its tooltip, its refusal ("this
  year", "no picks") and no Train for an A. A candidate's Appoint stays on
  the face. The ID card is unchanged.
- **The summary** is `FacultyFigures`: "738 course slots · 431 on
  offer · the whole catalog covered" at year 40; where courses wait and
  the catalog outruns the faculty it reads "· 12 open · 61 short of the
  catalog". Each figure's old sentence is its tooltip. The market's
  standing is one sentence: "A typical candidate's potential
  now: about 66 for teaching, 69 for research." The two paragraphs' rest
  is in the tab's help (`FACULTY_HELP`), which also says that More opens
  Train and Dismiss.
- **The view, sort and filters** are held in `App.tsx`
  (`FacultyViewMemory`), cleared by New Game. They were already kept for
  the session in module state, which also outlived New Game.
- **Phone.** At the largest text the first screen now reaches the
  figure row and the first faces at year 40 and at the training college.
  The figures alone were not enough, so on a phone (≤520px) the filter bar
  folds behind "Sort and filter · 85", the "On the faculty" heading goes
  (the view switch names the view), and the training bar's note moves
  behind a '?'. Desktop is unchanged by these.
- **Counts**, desktop, the gallery's top layer, before → after:

  | Save | Grid | Person open |
  |---|---|---|
  | y8 (year 9) | 1,107 w / 135 c → 973 / 102 | 1,301 / 136 → 1,168 / 104 |
  | summer30 (year 30) | 1,946 / 282 → 1,771 / 208 | 2,147 / 283 → 1,973 / 210 |
  | y40 (year 41) | 2,027 / 313 → 1,867 / 228 | 2,319 / 314 → 2,160 / 230 |
  | training (year 38) | 2,317 / 353 → 2,129 / 240 | 2,514 / 354 → 2,327 / 242 |

  The year-40 grid loses 85 Dismiss buttons; the training college's, 91
  Dismiss and 22 Train. The market and the departments lose the
  summary's 75–100 words.
- **Tests:** `test/faculty-tile.test.ts` renders every face of the launch
  college (no Train, no Dismiss, More kept), the person page's actions
  (Train, Dismiss, the refusal with the picks spent, no Train for an A or
  without the institute), a candidate's Appoint, and the figure row.
- **Screenshots** in `docs/reviews/2026-10-review-ii-fixes/95g-*.jpg`:
  desktop before and after at the training college, a person opened with
  Train and Dismiss, and the phone at the largest text before and after
  at year 40, at the training college, and a person's sheet.
- **Balance:** UI only; no sim run.

Deviations:

- **The measure** is `npm run review:gallery` (`--sizes desktop
  --no-shots`), not `review:sweep`: the sweep is the bug sweep and
  counts nothing. The saves are the review's (`year-8-balanced`,
  Completionist's year-30 summer, `year-40-done`) plus `training`.
- **The figure row** says "on offer", not "taught": the slots are taken
  by every course offered, staffed or not, so "taught" would be a new
  false claim (B2-2). It keeps "open" when courses wait to be developed.
- **The phone needed more than the figure row** (above): the filter fold,
  the heading and the training note. `tools/shoot.mjs` gained
  `--settings=<json>` to shoot at the largest text.
- **Train's school-coloured outline** (B2-5's fifth role) is kept, on the
  person page only, as the plan says; it is no longer on the grid.
- The "before" desktop screenshot is at 1600×1000, the "after" at
  1440×900.

### PR 95H — History in three views (B2-1, with B2-3 and B2-4)

- **Three views** on the sliding switch (`segmentedSwitch.ts`), as Faculty
  has:
  - **Prestige**: the four pillars and their terms, the endowment and the
    penalties, the teaching standard, and the prestige and place charts;
  - **The record**: the Final Report's draft, the promises, the chronicle
    and the other charts;
  - **The guide**.
  It opens on Prestige. The view is remembered for the session.
- **Prestige's head** is where E's rule lives, said once, with the weights.
- **One scale per pillar row** (B2-3): "Academics 89.8 of 150 → 20.2 of
  41.3 points of prestige". The arrow goes when current and target agree.
- **The teaching standard** is named by its own measure: "courses average
  a B−: standing can reach 127" (`prestigeSystem.ts:471` reads mean grade
  points, not the A share the line names now).
- **Checks:** the sweep's counts at years 8 and 40 (the review's 2,054
  and 3,296), per view. Every chart still has a home, and a test lists
  them. Screenshots of each view.

**As implemented.** Words and layout; nothing the simulation reads
changed. Two files under `src/` outside the tabs moved: the teaching
standard's sentence (`prestigeSystem.ts`'s `teachingCeiling`) and a new
words function beside the grade points (`courseQuality.ts`). `npm run sim` was run all the same and reads as
the baseline.

- **Three views** on the sliding switch, at the head of the tab
  (`HistoryTab.tsx`'s `HistoryView`):
  - **Prestige**: the breakdown (the four pillars, the endowment, the two
    penalties, the teaching standard, the readings), then "By year", the
    Prestige and "Place in the guide" charts;
  - **The record**: the Final Report's draft, the promises, the
    chronicle, "Institutional history" (Enrolled, Operating funds and
    Catalog), the alumni and the year-by-year table;
  - **The guide**: the guide's table and the standings.
  It opens on Prestige. The view is held in `App.tsx` beside Faculty's
  (`historyView`) and cleared by New Game. A link's section opens its
  view before the first paint (the Prestige chip Prestige, the Rank chip
  the guide; `history.record` now has an anchor too).
- **Prestige's head** says `pillarRule()` once, as a line under the
  heading; the help hint no longer carries the weights or the share rule,
  and the Prestige chart's note, now on the same view, drops the weights.
- **One scale per pillar row** (`StandingBreakdown.tsx`): "Academics
  113.0 of 150 → 28.4 of 41.3 points of prestige". The line under it is
  "It counts for 35% of prestige.", then the specialization's sentence,
  then "Last summer graded it 28.3." only when last summer's grade differs
  from today's. On the other rows (the endowment, the penalties) last
  summer's "+a → " shows only when it differs: the arrow goes when the two
  agree. On a phone the figure wraps under the label, to the right.
- **The teaching standard**: "courses average a B+: standing can reach
  139. A campus of B's reaches 128; only A's everywhere reach 150."
  (`meanGradeLetter`: the mean grade points to the nearest third-step
  letter, B, B+, A−, A, as a transcript reads them; "no course is graded
  yet" with none).
- **Measured** (`npm run review:gallery --sizes desktop`, whole page; the
  gallery now steps History's views as it does Faculty's):

  | Save | One page (before) | Prestige | The record | The guide |
  |---|---|---|---|---|
  | `year-8-balanced` (year 9) | 2,117 w / 9 c | 393 / 5 | 693 / 9 | 1,081 / 6 |
  | `year-40-done` (year 41) | 3,320 / 11 | 391 / 5 | 1,926 / 11 | 1,057 / 6 |

  The review's 2,054 and 3,296 are these saves' 2,117 and 3,320 on
  `main` before this PR. The phone's counts are the same.
- **Tests** (`test/history-views.test.ts`): each view draws exactly the
  charts its list names, thirteen in all, as the one page drew; the tab
  opens on Prestige, a held view is drawn, a section opens its view; the
  rule is said once, in Prestige's head; each pillar row reads its
  standing then its points of prestige; the teaching standard names the
  mean grade, and `meanGradeLetter` reads whole grades and thirds.
- **Screenshots** in `docs/reviews/2026-10-review-ii-fixes/95h-*.jpg`:
  Prestige at year 8 (the whole view, with its charts) and year 40, the
  record and the guide at year 40, and Prestige on a phone at year 40.
- **Deviations.**
  - **The standings** (the seven rankings and their rank charts) are in
    the guide's view, not the record's "other charts": they are rankings,
    and the guide's help already sends the reader to them.
  - **The one-scale row's arrow** joins the pillar's two scales, as the
    spec's example reads; the arrow the review asked to drop (last
    summer's grade → today's) is gone from the pillar rows, its figure
    said in the line under the row when it differs, and kept on the other
    rows only when it differs.
  - **The teaching standard's letter** is the nearest third-step, so the
    review's 127 reads "a B" (mean 0.63 points, nearest B at 0.65), not
    the example's "B−" (0.55).
  - **The measure** is `review:gallery`, not `review:sweep`, as in 95G.

### PR 95I — Athletics folded, and the summer Review capped (B2-1)

- **Athletics.** Each program folds to one line: its scoreboard (Plan
  90F's rank and last result), its grade, its band and its next action.
  It opens in place for the rest, as Plan 76B did for the Curriculum's
  programs. The flagship's gold stays on the folded line.
- **The summer Review.** Like lines group, as "13 courses finished: …"
  already does: appointments, programs, buildings. Each list stops at
  five, with "and N more" opening the rest in place.
- **Checks:** the sweep's counts (Athletics at years 25 and 40, the
  review's 1,858 and 2,252; the Review at year 30, the review's 618).
  Screenshots.

**As implemented.**

- **Athletics.** Every program card starts folded to its one line
  (`AthleticsTab.tsx`'s `TeamCard`): the arrow, its place in the order, the
  name, the band's tag (or the flagship's gold corner, which stays), a
  small scoreboard with the rank and last season's result (`SportScore`,
  in 90F's navy and gold, the neighbours in its tooltip), its quality and
  its next action (`NextAction`: the first open chair as "Hire a head
  coach →" to the market, else the venue it waits on or its postseason
  ban, else nothing). The arrow opens the full card in place. The fold is
  76B's own: its `useCollapse` moved out of `CurriculumTab.tsx` into
  `components/useCollapse.ts`, and both tabs use it, keys namespaced
  (`team:`), the override kept for the session.
- **The summer Review.** `state/yearInReview.ts`'s `reviewGroup` makes
  every list: one like line is said in full as before; two or more become
  one head ("4 professors appointed") over their short forms (the
  professor and field, the program's name, the building's name, the
  school's count). Courses, programs founded, milestones, buildings,
  appointments, departures and prizes all go through it. `ReviewLine`
  gains `items`; `InterruptModal.tsx`'s `ReviewLineView` shows the first
  `REVIEW_LIST_CAP` (five) and "and N more", which opens the rest in place.
  T's "matters left unanswered" is one more `reviewGroup` call in
  `events()`.
- **Counts** (`npm run review:gallery`, desktop, against `main` before and
  this branch after; the review's own figures in brackets):

  | Screen | Before | After |
  |---|---:|---:|
  | Athletics, `year-25-rich` (year 26) | 2,095 w / 196 c (1,858 / 107) | 1,524 / 167 |
  | Athletics, `summer30` (year 30) | 2,204 / 181 (2,167 / 123) | 1,551 / 149 |
  | Athletics, `year-40-done` (year 41) | 1,539 / 86 (2,252 / 156) | 354 / 28 |
  | The Review, `summer30` | 518 / 2 (618) | 493 / 2 |

  What is left on Athletics at years 26 and 30 is mostly the market below
  the programs (a candidate per open chair, each with its Hire buttons), at
  colleges with most chairs empty; at year 41, every chair filled, the tab
  is the department and twenty lines. The year-30 Review had no list past
  five that year, so the cap shows at year 10 (Completionist): 16 courses
  in six schools and six programs founded, each "and 1 more".
- **Tests.** `test/year-in-review.test.ts`: the schools are the courses'
  members; seven appointments are one line with all seven kept, a
  professor still on the faculty named with the field, one gone keeping
  the log's line; a group of one is its sentence and of none no line;
  three buildings are one line. No test pinned the Athletics cards.
- **Checks.** `npm run check` passes. No sim: nothing the simulation or
  the harness runs reads `yearInReview.ts` or the tab.
- Screenshots in `docs/reviews/2026-10-review-ii-fixes/`: `95i-athletics-*`
  (years 26 and 41, folded, one open, a phone) and `95i-review-*` (year
  10, capped, and one list opened).

**Deviations.**

- **Measured with `review:gallery`, not `review:sweep`.** The sweep is the
  bug sweep (saves and invariants); the words and controls are the
  gallery's, as the review took them. The baselines moved since the
  review (the Review is 518 words at year 30 on `main`, not 618), so both
  columns above are taken now.
- **Quality for "grade".** A program has no letter grade; its figure is
  its quality, and the folded line shows that.
- **One card to a row.** The cards were an auto-fill grid (290 px tracks);
  a folded line needs the row's width, so the list is one column, as the
  Curriculum's programs are. An opened card takes the row.
- **More lists than named.** Milestones, departures and prizes group too,
  through the same function, so no list in the Review runs long. A group
  of one keeps the full sentence; the courses' per-school lines became
  the group's members, and so are capped.
- **"Hire an assistant coach".** The open seat's screen-reader label read
  "a assistant coach"; it takes the new line's article.

### PR 95J — The glossary's last mile, and the 101s (B2-5, B2-6)

- **The words**, with `2c` and `2d`'s wording:
  - "slots" on a faculty card reads "course slots" ("9/10 course slots",
    `FacultyTile.tsx:232`). The suggested move's tooltip reads "program
    slot" (`BuildingInfoPanel.tsx:285`).
  - The armed labels follow the rule "Confirm — ‹what is lost›": the
    specialization's says what is given up ("Confirm — the other three
    shares stay closed"); training's says what the course loses ("Confirm
    — {course} moves to …").
  - "took its default" becomes "was left unanswered, so …"
    (`InboxTab.tsx:464`).
  - "the Spring Term's fourth week" becomes "the fourth week of the Spring
    term" (`downtownData.ts:240`).
  - One count of rankings everywhere. The standings have seven rows, and
    the Final Report charts six of them. Say "seven rankings" in the
    standings and the glossary, and say which six the report draws and why.
  - "Distinguished": the professor's rank keeps it; the program's stage
    takes the glossary's other word.
  - The 15 help hints in the second person say "the college".
  - The inbox's hand-built "Y31W1" uses the game's date formatter.
- **The checks that keep it.** `tools/review/strings.ts` flags a bare
  "slots", "default" and "Spring Term" in player text.
- **The 101s.** The 16 entry sentences flagged in `2a` take its proposed
  sentences (`courseDescriptions.ts`), so none restates its title.
- **Checks:** `npm run review:strings` clean, and its new rules tested.

**As implemented.** Text only; no logic moved, so the sim was not run.

- **The words.** The tile's load reads "9/10 course slots" (one string in
  `FacultyTile.tsx`); the suggested move's tooltip "program slot 2". The
  armed labels: "Confirm — the other three shares stay empty for good" and
  "Confirm — {course} loses its teacher for a term". The Answered pane:
  "It was left unanswered, so it settled the way it does when nobody
  answers." The downtown's two lines say "Spring term".
- **Rankings.** The standings' help keeps "Seven rankings" and adds that
  the Final Report grades the six beside prestige. The report's head reads
  "Six of the seven standings, graded over the arc", with a note under it:
  prestige is the blend of four of the six and counts once, as the guide's
  last word. Its chart draws all seven (it always did: `STANDINGS` holds
  prestige), so its title is now "The seven standings, year by year".
  Plan 47's glossary and `progression.md` say seven.
- **Dates.** The inbox's list rows, the Answered rows included (a second
  hand-built "Y31W50" the review did not name), use `gameDateOfWeek` /
  `gameDate`; a milestone row reads "Year 8". The long form fits the list
  pane at 1600 px and on a 390 px phone
  (`docs/reviews/2026-10-review-ii-fixes/95j-inbox-dates*.jpg`,
  `95j-faculty-course-slots.jpg`).
- **Second person.** 19 help hints, notes, tooltips and two decision
  answers say "the college" or "the President" (the scanner's "you" count
  40 → 21). What is left is letters to the President, the events, the
  crash screen and the credits, which the rule allows.
- **The checks.** `tools/review/glossaryChecks.ts` holds four rules (bare
  "slots", a numbered "slot", "default", "Spring/Fall Term");
  `strings.ts` reports them in a section of their own and prints the count
  ("none found"). `test/glossary-checks.test.ts` catches the review's
  strings as written and passes the glossary's words.
- **The 101s.** All 16 took `2a`'s sentence.

Deviations:
- **"Distinguished".** The glossary has no second word for a program's
  stage, and the stage's "distinguished" runs through the milestones, the
  toasts, the curriculum and PR M's plan. So the stage keeps its word, and
  the one place it meets the rank, the person page's Recognition, says
  what it means: "Taught in Political Science, a program complete since
  Year 12". The glossary's Stage entry records this.
- **Training's armed label** does not name the course's new teacher: the
  label takes the course alone so the call site in `FacultyTile.tsx`
  (which PR G moves) is untouched, and the warning beneath it already
  names the taker or says nobody can take it.
- **NUTR101** reads "…line by line: the calories and protein first, then
  the vitamins…": `2a`'s "from … to …" put Health Science at 13 of the
  test's 12.
- `FacultyTab.tsx`'s summary line ("fewer if you keep them") was
  rewritten here, then PR G's merge took the paragraph out; G's figure
  row stands.

### PR 95K — The inbox and the phone (B2-7)

- **The board's letter keeps its arrival week.** The queue stores the
  week a letter came, and `inbox.ts:214` reads that in place of `now`. A
  save's existing letter takes its matter's own week where one is known,
  else the save's week. That is a migration and a version bump. The
  specialization notice dates from the choice.
- **The Answered list's empty line** says what it keeps: "Nothing answered
  yet. The matters settled lately are kept here." That matches the log's
  200 lines.
- **"Answer to go on"** is set flat, as a note, not a dashed pill in the
  Close button's place (`TabOverlay.tsx:31`).
- **The funds figure** moves to the display face with tabular numerals,
  so the commas sit close. `--mono` loses its one use, and is removed if
  nothing else reads it.
- **Phone:** the ticker's date keeps the year at the largest text
  ("Y31", not "Y.").
- **Checks:**
  - A migration test from `save-v94`.
  - An inbox test that a letter from week 5 still reads week 5 at week 30.
  - Screenshots of the toolbar at each text size.

**As implemented.** Save version 95.

- **The board's letter.** `Distress` gains `letterWeeks`, the absolute
  week each queued letter came, beside `letters`. Four helpers in
  `distress.ts` keep the two in step: `postBoardLetter` (the ladder, the
  idle-cash watch and the specialization notice all post through it),
  `shiftBoardLetter` ("Noted"), `dropBoardLetters` (the sweep's answer)
  and `clearBoardLetters` (the three tools that clear the queue for a
  photograph). The inbox's board item takes `letterWeeks[0]`, so it sorts
  among the letters by its own week, and the reading pane's head reads
  the same date (it too read this week).
- **The migration** (`boardLetterWeeks`, 94 → 95): the specialization
  notice is dated week 1 of `specializationNotice`'s year, the idle-cash
  letters week 1 of `idleLetterYear`'s, and a ladder letter the save's
  week, as it read before. `sanitizeDistress` keeps each week with its
  letter when it drops one the game no longer has, and a week missing,
  malformed or after the save's reads as the save's.
- **The fixture** `test/fixtures/save-v94.json` is the
  `specialization-notice` scenario (year 29, the notice queued), written
  at 94. `save-migrations` checks it loads dated to Y29W1, that moved on
  four years it still does while a ladder letter added reads the save's
  week, and that a malformed week reads as the save's. `inbox.test.ts`
  checks a letter from week 5 reads week 5 at week 30, and that "Noted"
  leaves the next letter its own week.
- **The Answered list's empty line** reads "Nothing answered yet. The
  matters settled lately are kept here."
- **"Answer to go on"** is a flat note in the muted ink, in italic, where
  the Close button stands; no border, no pill.
- **The funds figure** is the display face with tabular numerals
  ("$46,290,839", the commas close).
- **The phone's ticker:** the date stands beside the line, not in it, and
  does not shrink, so the message gives way and the year stays ("Y29W1"
  at the largest text, where it read "Y").
- **Checks:** `check` and `test:slow` pass; `npm run sim` shows no change
  against the baseline. Screenshots in `docs/reviews/2026-10-review-ii-fixes/`:
  `95k-toolbar-text-sizes.jpg` (1×, 1.15×, 1.3×),
  `95k-phone-ticker-largest-text-before-after.jpg`,
  `95k-inbox-board-letter-week.jpg` and `95k-inbox-held-note.jpg`.

Deviations:
- **`--mono` stays.** The funds figure was not its one use: the dock's
  weekly net, the faculty card's facts, the scoreboard, the build stamp,
  the cohort change, the park's tally and the debug panel read it (Plan
  90). The net beside the funds keeps the mono, as those records do.
- **The ladder's letters** have no week in an old save (`closedAt` is
  only the last term closed, which may come after the letter), so they
  take the save's week.
- **The screenshots** are the canvas map only, in one vernacular: nothing
  here touches the map.

### PR 95L — The course catalog's shape: the table, for the owner (B2-6)

The shape has waited since Plan 76G because each change moves course ids in
every save. This PR writes the change as a table and changes no code.

- **The structure question first.** Undergraduate majors are nine courses
  in three tiers (`techData.ts`'s `NUMS`: 101; 110–140; 210–240). A
  senior seminar or capstone in every major means one of these:
  - **a fourth tier** (a 300 capstone requiring all of tier 3): ten
    courses a major, a longer climb to each program, and balance moves;
  - **the 240 becomes the capstone** (renamed and redescribed, prereqs
    unchanged): nine courses, ids unchanged, balance unchanged, but no
    course above 200;
  - **renumber the tiers** to 101 / 200s / 300s (with the 340 as the
    capstone): nine courses, every undergraduate id moves, balance
    unchanged.
  **The owner's answer (before work began): a fourth tier.** Each major
  gains a 300 capstone requiring all of tier 3, ten courses a major. So M
  moves balance.
- **Each item** from `2a`'s table, with its course ids before and after,
  title, sentence and prereqs:
  - JD: Professional Responsibility added or swapped in; LAWS540's clinic
    after the seven; LAWS530 retitled;
  - MD: MED550's residency preparation moved after the preclinical
    courses (550 ↔ 600);
  - ACCT140/240 and FINA130/210 swapped; MGMT140's level;
  - the bridges before ACCT110 and MATH130;
  - the missing core courses in five Social Sciences and Humanities
    majors: statistics, methods, anthropological theory, modern
    philosophy, non-Western history. Each is a swap for the weakest
    elective, so course counts hold;
  - Nursing: medical-surgical, maternity and mental-health nursing, in
    place of three of its current courses.
- **What moves in a save:** every place a course id lives. `state.tech`,
  teaching assignments, faculty careers (`career.courses`),
  `seen.courseIds`, the curriculum's history, programs, the Final
  Report's records, and the inbox.
- The table lands in `docs/reviews/2026-10-review-ii-fixes/catalog-shape.md`
  for the owner's answer. M follows that answer.

**As implemented:** [`catalog-shape.md`](../reviews/2026-10-review-ii-fixes/catalog-shape.md)
is M's whole specification. No code changed.

- **The fourth tier** is 310: 28 weeks, $3.0M, $2,400 a week, tier
  penalty 6, requiring the four tier-3 courses and inheriting their gates.
  Established is unchanged (tier 2); distinguished now needs the capstone;
  the graduate gate takes the capstones in through `NUMS`. The doc lists
  every file and line that assumes nine courses or three tiers, and the
  player text that calls tier 3 "capstones", which becomes "advanced".
- **Forty-two capstones**, one a major, with titles and sentences. Forty are
  new.
- **Every item of `2a`'s table**, before and after. The JD swaps
  Comparative & International Law for Professional Responsibility and puts
  the clinic last (570). MED550 ↔ MED600. ACCT140 ↔ ACCT240, FINA130 ↔
  FINA210. New bridges: Financial Modeling to ACCT110, COMP120 to MATH130.
  Sociology gains Social Statistics (Urban Sociology goes); Political
  Science, Research Methods (Political Campaigns goes); Anthropology, the
  history of its theory (Museum & Heritage Studies goes); Philosophy, Early
  Modern Philosophy (Aesthetics goes); History, Modern East Asia
  (Historical Archaeology goes). Nursing gains medical-surgical, maternal
  and newborn, and psychiatric nursing (Critical Care and Gerontological
  Nursing go).
- **The id map**: 11 ids move, 8 courses go, 50 are new. The catalog is
  420 undergraduate and 53 graduate courses, 473 in all.
- **Where ids live in a save**: `tech` (with its saved prereqs), `developing`,
  `courseFaculty`, the career spans, `seen.courseIds` and the log's
  `subject`. The programs, milestones, history, Final Report, inbox,
  research and events hold none.

Where it departs from the text above, and why:

- **Strategic Management becomes Management's capstone (MGMT310)**, not a
  swap with 230. It is the usual last course of a US business degree, and
  the October review's swap predates a fourth tier. Organizational
  Behavior, a standard requirement the major lacked, takes 140.
- **Nursing's Clinical Practicum II becomes its capstone (NURS310).** The
  three new courses take the slots of Critical Care, Gerontological Nursing
  and the practicum, but the practicum moves rather than goes. Two courses
  are removed, not three.
- **MED600 is retitled "Transition to Clerkships".** At 600 it still comes
  before the clerkship year, so "Residency Preparation" stayed wrong; the
  title follows `2a`'s sentence, which stops at the wards.
- **The migration's rules go a step past "carries its state".** A moved
  course that is merely available goes back to locked when its new
  prereqs are unmet; a developing or done one stays. A removed course's
  career spans are dropped, because new courses reuse the freed ids.
  Prereqs are rebuilt from the catalog, since `refreshAuthoredText` leaves
  them as saved.

### PR 95M — The course catalog's shape: the data and the migration (B2-6)

- `techData.ts` and `courseDescriptions.ts` follow L's answered table.
- **The migration.** One map from old id to new id, applied to every place
  L listed:
  - a course that is swapped carries its state (researched, quality,
    teacher) to its new id;
  - a course that is new arrives unresearched;
  - a course that goes is dropped, and its teacher is freed, as when a
    professor's course is orphaned.
  `SAVE_VERSION` steps up, and the fixtures in `test/fixtures/` gain one
  from before the change.
- **Balance.** The owner chose a fourth tier, so `npm run sim` moves. The
  PR re-baselines `sim/baseline.json`, and shows the goal players' years
  to the first program and to the end against the baseline, for the
  owner.
- **Checks:**
  - `save-migrations.test.ts` loads every fixture and finds no course id
    that the catalog does not hold.
  - A year-30 save migrated and played on a year shows no orphaned
    assignment.
  - `npm run review:strings` is clean over the new sentences.

**As implemented.** L's table, in code. The sim and the re-baseline wait
their turn: balance PRs run one at a time.

- **The fourth tier.** `NUMS` gains 310 and `TIERS` 4: 28 weeks, $3.0M,
  $2,400 a week, tier penalty 6, requiring the four tier-3 courses alone.
  `MilestoneMajor` and `DiscoveryMajor` carry a `capstoneId`; distinguished
  needs the quartet and the capstone; `TIER_RANK` puts the capstone between
  tier 3 and graduate. 420 undergraduate courses, 53 graduate, 473 in all.
- **The catalog.** Forty-two capstones with L's titles and sentences (PR J's
  101s kept). Every swap, move, removal and new course of L's section 3,
  the two new bridges (FINA210 to ACCT110, COMP120 to MATH130), the moved
  bridges (ACCT140, POLS220), the JD's clinic last at 570, MED550 ↔ MED600.
  Player text calls tier 3 "advanced" and the 310 "the capstone"
  (BuildPopup, the hall panel, the milestone letters, the gallery, the lab
  line, the course drawer's tier factor).
- **The migration, 97 → 98** (`catalogShape`, `COURSE_ID_MAP_95M` in
  `persistence.ts`), applied in one pass from a copy. Every course is
  rebuilt from `initialTech()` by its new id, prereqs included; a moved
  course carries its status, price and weeks (under way or taught), weeks
  left, teacher, career spans and seen flag; an available course whose new
  prereqs are unmet goes back to locked; a removed course is dropped
  everywhere, its teacher freed and its spans gone; a log line naming one
  loses its subject. New courses arrive locked, each after the catalog
  course before it, so a migrated save's `tech` keeps the new run's order.
  `programProgress` reads an awarded milestone as reached (L's rule 7).
- **The fixture** `save-v97.json` is a Guided run to Year 31 written at
  version 97 on main (after 95V's 96 → 97): Strategic Management, Clinical
  Practicum II and the swapped Finance and Accounting courses all taught. `save-migrations`
  loads every fixture and finds no course id the catalog does not hold, and
  every catalog course; the year-30 save moves each course with its
  teacher, frees the removed courses' teachers, drops their spans, keeps a
  building's weeks, and played a year on has no orphaned assignment.
- **The Curriculum.** A program row is ten cells with a third rule before
  the capstone (the grid's tracks, `tierBands`); on a phone the capstone
  takes a row of its own. Screenshots:
  [Business](../reviews/2026-10-review-ii-fixes/95m-curriculum-business-ten-courses.jpg),
  [Sociology and Political Science](../reviews/2026-10-review-ii-fixes/95m-curriculum-sociology-politics.jpg),
  [a phone](../reviews/2026-10-review-ii-fixes/95m-curriculum-phone-management.jpg).
- **Checks.** `check` and `slow` pass; `review:strings` is clean. Tests
  gained: the capstone's prereqs and no bridge touching one
  (`curriculum-graph`), the capstone's unlock (`invariants`), its tier
  factor (`course-quality`), its weeks (`committee`).

Where it departs from the text above and from L's table, and why:

- **LAWS530 is "American Constitutional Law"**, not "Constitutional Law".
  L wrote that no test requires unique titles; `curriculum-graph`'s check 6
  does (Plan 20 renamed Cybersecurity's Risk Management for it), and POLS210
  is already "Constitutional Law".
- **Rule 3 (back to locked) applies to every available course**, not only
  the moved ones: COMP120 and Financial Modeling gained a bridge, and an
  available course behind an unmet prereq is the same state either way.
- **`split-school` waits three years for the second school, not two.** The
  replayed version-79 save reaches it in Year 6 from Year 3, a year later,
  with no stall; the new catalog reshuffles the run's random stream and
  money. The bound moves with the balance.
- **One thing for the owner:** the catalogue's growth prices a capstone
  at a full catalogue near $9.6M (a Year-31 Guided run), above a
  professional course's flat $9M, and that run had 32 capstones available
  and only 3 taught.

**The re-baseline** (after 95AD's baseline, merged on main at `5b4a3587`;
medians of three seeds, before → after). Nobody collapses: Guided is first
at Year 50 in every variant, and no player spends a week in the red.

| Player | Rank Y10 / Y25 / Y50 | Prestige Y10 / Y25 / Y50 | Courses Y25 / Y50 | Schools Y10 / Y25 | Cash Y50 |
|---|---|---|---|---|---|
| Guided | 58 / 35 / 1 → 57 / 34 / 1 | 47.2 / 78.7 / 117.6 → 47.8 / 77.2 / 118.7 | 298 / 431 → 276 / 473 | 4 / 7 → 5 / 7 | $292M → $1,202M |
| Completionist | 56 / 35 / 1 → 57 / 38 / 2 | 47.3 / 75.9 / 112.2 → 46.8 / 75.9 / 112.9 | 259 / 431 → 261 / 473 | 1 / 7 → 2 / 7 | $174M → $120M |
| Selective | 62 / 59 / 63 → 61 / 61 / 63 | 42.6 / 49.3 / 51.1 → 42.6 / 48.5 / 51.5 | 100 / 102 → 99 / 100 | 0 / 2 → 0 / 1 | $482M → $586M |
| Lean | 71 / 70 / 76 → 70 / 67 / 71 | 36.5 / 41.6 / 42.9 → 37.8 / 41.5 / 42.6 | 166 / 286 → 182 / 271 | 0 / 3 → 1 / 4 | $24.5M → $25.1M |

- **As L expected:** the endpoint holds, the catalogue is 42 courses
  longer (Y50 473), and a quarter-way college teaches fewer courses
  (Guided Y25 276, from 298) as the capstones take committee seats and
  money. Enrollment at a full catalogue rises 3,360 (the capstones'
  seats). Guided's Year-25 research rank improves from 29th to 7th and its
  academics rank slips from 26th to 47th: the order courses are taught in
  moved. Year-50 cash is the noisiest figure (Guided up $909M, Guided
  with research down $4.8B, Completionist down $53M).
- **The goal players** (`npm run review:goals`, seven goals, seeds 12345,
  4242 and 777, main against this branch): every school founded in the
  same year within one (prestige 16 → 16, assets 15 → 16, big-then-good
  18 → 17); Year-50 rank 4 → 4 (prestige), 3 → 3 (assets), 42 → 41
  (championships), 13 → 14 (good-then-big), 1 → 1 (big-then-good, whose
  first place now comes in two runs of three, Year 51, from three in
  Year 50); prestige at Year 50 within three points everywhere. Neither
  the sim nor the goal report reads the year of the first distinguished
  program or graduate program, so those are not measured here.

### What area 2 does not do

- No new screens. Every change moves, folds or rewords what is there.
- Plan 90's styling stays: the ID cards, the scoreboards and the switches.

---

## Area 3 — Intuitive gameplay

### The owner's answer

Since the review, Plan 89 changed one line each in `nextStep.ts`,
`establish.ts` and `seating.ts` (a slot taken by an office is not free).
Nothing else in guidance or prestige moved. Plan 91's committee lamps now
signal an idle committee under the Curriculum tab.

| Finding | What | On `main` | Answer |
|---|---|---|---|
| B3-1 | The first summers mark every college down, and nothing says why | Open: the college opens at `startingReputation + FOUNDERS_HALL_REPUTATION_BONUS` (51.5) and grades about 29 | **N**: open at about 42. No words added |
| B3-2 | Prestige's panel can't answer "how do I raise it?" | Open | **H**'s one scale is enough. No more |
| B3-3 | NEXT asks for a building that is already going up | Open: `shortfall()` reads only the satisfaction breakdown | **O**: name the building |
| B3-4 | "Establish a school" names the goal, not the step | Open: `establishText` names only the count. A program in transit counts in neither hall | **O** |
| B3-5 | Admissions hides what a big class costs in prestige | Open | **P**: the projection and a NEXT reading |
| B3-6 | The specialization says when, not why | Mostly covered by F | **F** gains the strongest-pillar line |
| B3-7 | The first lab doesn't say it starts research | Open (`BuildPopup.tsx:307`) | **Q** |
| B3-8 | The Curriculum won't name a school the letters name | Open (`CurriculumTab.tsx:993`) | **Q** |
| B3-9 | Nothing points at an idle committee | The lamps (Plan 91) breathe while a free seat could take a course | Close: the lamps are enough |
| B3-10 | Smaller doubts | Open, all six | **Q**: all but the search price's tooltip |

### PR 95N — The college opens at the prestige it can earn (B3-1)

A college opens at 51.5, and the first summer grades it 29. So prestige
falls for three or four summers, and the rank stands still for a decade.
The owner's answer: open near the first years' grade, with no words added.

- **The opening.** `foundingReputation` (`actions.ts`) opens at about 42.
  Set the exact figure from the harness: the mean of the Natural and
  Guided players' Year 2 grade over three seeds, rounded to a half. The
  aim is a first summer that holds or rises slightly. Change
  `startingReputation` in `FOUNDING_PRESET`, or the hall's bonus, whichever
  keeps their comments true.
- **What reads the opening.** The same figure seeds the admit rate, and the
  faculty market's standing reads reputation (`marketStandingOf`). The
  rank chip reads it too, and so do the rivals' place against the college.
  For each, decide and record whether it should follow the lower opening:
  - the admit rate keeps its opening value, so the first class does not
    shrink: seed it from the old figure, named
    `FOUNDING_ADMIT_REPUTATION`;
  - the market and the rank follow the new figure, since they read
    standing.
- **No words.** The first summer's Review and History keep their lines.
- **Balance.** `npm run sim` moves. The PR:
  - re-baselines `sim/baseline.json`;
  - shows, for the owner, the goal players' prestige at Years 2–10, the
    year they reach the top 20, and their year-50 rank, against the old
    baseline;
  - updates `docs/reviews/2026-10-game-review-ii/data/b3-opening-prestige.md`'s
    table as an after.
  A save in progress keeps its prestige. No migration.
- **Text that names the opening:** the stat chip's accessible-name comment
  (`statChips.ts:47`), the design docs, and any tutorial or letter that
  states 51.5. Grep for it.

**As implemented.**
- `FOUNDING_PRESET.startingReputation` is 40.5, so with Founders Hall's
  1.5 the college opens at 42.0.
- The founding admit rate is seeded from `FOUNDING_ADMIT_PRESTIGE` (51.5,
  `actions.ts`), so the first class does not shrink.
- The faculty market's founding anchor stays at 50 (`facultyData.ts`). A
  college at or below it draws the founding pool, as before; only the
  comment changed.
- **Deviation: the figure is the owner's 42, not the harness's Year 2
  grade.** Measured over three seeds, the Year 2 grade is 45.4–47.3 (mean
  46.0). But no opening makes the first summer hold: Year 1 grades 29–37,
  because a new college has no beds until week 25. At 46 the first summer
  would fall about 5. At 42 it falls about 2.5, and from Year 2 prestige
  rises every summer (the after-table is in
  `docs/reviews/2026-10-game-review-ii/data/b3-opening-prestige.md`).
- **The sim moved** (re-baselined, three seeds, medians):

  | Player | Y10 prestige | Y25 rank | Y50 rank | Y50 prestige | Top 20 |
  |---|---|---|---|---|---|
  | Guided | 47.4 (−0.2) | 31 (−4) | 1 | 118.8 (+2.8) | Y31 (was Y34–35) |
  | Guided, unspecialized | 47.4 | 31 | 2 (−4) | 111.1 (+1.8) | Y31 |
  | Completionist | 47.1 (−2.4) | 39 (+3) | 6 (+5) | 108.5 (−6.6) | Y40–43 |
  | Selective | 42.6 (+0.3) | 61 (+4) | 63 (−1) | 52.2 (+0.6) | never |
  | Lean | 37.3 (−1.4) | 67 (+1) | 73 (+4) | 42.2 (−0.4) | never |

  Guided reaches the top 20 three or four years sooner, because a college
  that never falls keeps climbing. The Completionist, which spends its
  first decade building, ends lower.
- **For W and X:** Guided-research's Y50 cash rose from $565M to $5.5B. The
  earlier specialization (Y30–32) gives the park's labs more years.
- `sim/report.ts` gains `--from-runs`, which saves a baseline from the last
  run's rows without playing again. A full run took 80 minutes here on a
  shared machine.

### PR 95O — NEXT: the building going up, and the step toward a school (B3-3, B3-4)

- **The building going up** (`nextStep.ts`'s `shortfall`).
  - When the worst need has a building under construction that serves it,
    the line names that building and when it opens: "Housing is at 12 —
    Meadow House opens in 9 weeks".
  - If two serve it, name the one that opens first.
  - It does not send the player to the build menu (`go` is the building's
    site on the map).
  - When the building opens, the line reads the need afresh.
  - The guided player's `build-for` intent skips a need with a building
    under construction. The harness must not build twice either.
- **The step toward a school** (`establish.ts`).
  - `establishText` keeps the goal and adds the step from `establishIntent`:
    - "Establish Social Sciences & Humanities (3 of 6): move Anthropology
      into Elm Hall";
    - "…: found History in Elm Hall";
    - "…: post a search for Marketing";
    - while the intent is `wait`, the line says what it waits on: "…:
      Anthropology arrives in 4 weeks".
  - A program in transit counts toward the hall it is moving to, so the
    count never falls mid-move. `SchoolProgress`'s `housed` reads it, and
    `programProgress.ts`'s `inTransit` is the source.
  - When the step is a move, `go` opens the program's tile in the hall it
    is moving from, not the target hall.
- **Checks:**
  - nextStep tests for a need with a hall under construction, and for one
    with none.
  - establish tests for each kind of step, and a count that holds through
    a move.
  - The guided player's run reads the same in `npm run sim`. If it does
    not, find out why before landing.

**As implemented.**

- **The building going up.** `nextStep.ts`'s `comingFor` finds what is
  going up for a need: a building under construction (`s.developing`),
  or a story being added to a standing one (`extensionWeeks`), the first
  to open if several. A building serves housing by its beds, and any
  other need by the need it is built for; a residence hall's shop does
  not count as dining. `shortfall` then reads "Housing is at 12 —
  Meadow House opens in 9 weeks" (or "…'s new story opens in …"), `go`
  is `'hall'` with the building's id (the map pans to it and opens its
  panel, which shows the construction), and the intent is `wait`. When
  it opens, the line reads the need afresh.
- **The guided player** reads that `wait` and builds nothing for the
  line. After year one a waiting shortfall gives way to an idle lab and
  is shown only when nothing else speaks, as a waiting letter already
  does.
- **The step toward a school.** `establishText` keeps the goal and adds
  the step from `establishIntent`: "Establish Science (2 of 6): move
  Mathematics into Elm Hall", "…: found Physics in Founders Hall",
  "…: post a search in Physics" (nobody on the payroll or the market can
  teach the entry course), "…: the search in Physics has 4 weeks to run",
  "…: move English to Elm Hall to make room" (another school's program
  out of a full hall), and, while waiting, "…: Anthropology arrives in 4
  weeks", "…: no Science program is on offer" or "…: Elm Hall is full,
  and no other hall has room". The second school reads "Establish
  another school, Business (3 of 6): …". A move's `go` opens the
  program's tile in the hall it moves from.
- **Tests:** `first-year.test.ts` (a need with nothing going up, two
  residence halls going up and the first to open named, a building that
  serves another need, the line after both open); `sorting.test.ts`
  (each step, the move's tile, the count 2 → 3 → 4 through two moves and
  on arrival); the existing wordings in `sorting` and `split-school`
  updated.
- **Balance:** `npm run sim` reads the same as `sim/baseline.json`; no
  figure moved.

**Deviations.**

- **The count in transit needed no code.** A move takes its new slot the
  week it leaves (`techSystem.ts`'s `relocateProgram`), and
  `closestSchool` already counts a program in transit in that hall. The
  fall the review saw came from the school being split between Founders
  Hall and Elm Hall while the line counted Founders Hall. Since Plan 89G
  a hall with an office is passed over, and the line's moves are always
  into the hall it counts, so its count only rises. The test pins it.
- **"Post a search in Marketing"**, not "for": the Curriculum's button
  and the log say "a search in {field}" (B2's consistency).
- **A move out of a full hall** to make room says so ("to make room"):
  "move English into Elm Hall" toward Science read as the wrong school.
- **`go` reuses `'hall'`** for any building's panel, rather than a new
  target: the map's inspect already opens any placed building.

### PR 95P — Crowding, at the admissions decision and on NEXT (B3-5)

- **At the decision** (`InterruptModal.tsx`, beside the projections of
  weekly net, satisfaction and the tightest need).
  - A line for crowding: "Crowding: −14.5 of prestige's grade (dining
    36%)". It is computed by `crowdingScore` on the consequence projection's
    enrolled body, with the coverages the projection already has.
  - It shows nothing while every coverage is 85% or better.
  - It moves with the admit rate as the other projections do.
- **On NEXT.** A reading for crowding when any need's coverage is under 85%:
  "Dining serves 36% — crowding is costing prestige; a dining hall would
  raise it". It sits before `shortfall`, since crowding costs prestige
  directly. When a building under construction will serve the need, it
  names the building (O's rule).
- **Checks:**
  - A test that the projection's crowding equals the grade's crowding
    term after the class enrols, on the review's Year 2 case (a class of
    603 for 350 beds).
  - A nextStep test for coverage at 84% and at 86%.
  - The guided player's reading order is unchanged in the sim. Crowding
    is a line, not an intent, so no new intent is added.

**As implemented.**

- **At the decision.** `consequences.ts`'s `projectConsequences` gains
  `crowding` (points) and `crowdingWorst` (the need and its coverage). It
  reads the projected body with the year's crowding average started
  afresh, as `resolveAdmissions.ts` starts it, through
  `prestigeSystem.ts`'s new `crowdingPoints` (the penalty × `crowdingScore`)
  and `crowdingCoverages`. `InterruptModal.tsx` shows "Crowding −14.5 of
  prestige's grade (dining 36%)" under the tightest need, only while it is
  above zero, so nothing shows while every coverage is 85% or better. It
  moves with the admit rate, as the others do.
- **On NEXT** (`nextStep.ts`): a new reading, `crowding(s, rest)`, placed
  after `nearlyEstablished` and before the shortfall. When a crowded need
  (beds, dining, health) is under `CROWDING_GRACE` it reads "Dining serves
  36% — crowding is costing prestige; a dining hall would raise it" and
  opens the build menu. When something that serves the need is going up,
  it uses O's `comingFor`: "…; Union Square Eatery opens in 9 weeks", `go`
  the building's site. It then gives way, under O's rule, to a step the
  player can act on.
- **A line, not an intent.** The crowding line carries the intent of the
  reading it stands before (the shortfall, the idle lab or the waiting
  letter), so the guided player does what it did without the line. It
  already relieves crowding first by its own rule
  (`moves.ts`'s `relieveCrowding`).
- **Tests:** `crowding-cost.test.ts`. The review's Year 2, built directly:
  the founding halls (350 beds, dining for 350), a catalog that seats the
  class, 379 staying on, and the admit rate that makes 603. The projection
  reads 982 students and −14.5 (dining 36%), as the review measured, and
  equals the grade's crowding term after `RESOLVE_ADMISSIONS`. A smaller
  class costs less, and a roomy body costs nothing. NEXT is tested at 84%
  (crowding speaks) and at 86% (it doesn't), with a building going up, and
  giving way to an idle lab. `opening.test.ts`'s year-2 reading now stands
  the founding halls: its bare campus was crowded.
- **Screenshot:**
  [`95p-admissions-crowding.jpg`](../reviews/2026-10-review-ii-fixes/95p-admissions-crowding.jpg)
  (the summer scenario with its continuing classes raised, so the body
  overruns health).
- **Balance:** `npm run sim` (merged with O) reads the same as
  `sim/baseline.json`: no figure moved. `check` and `test:slow` pass.

**Deviations.**

- **Year one is unchanged.** Its line stays letter, seating, shortfall.
  A new college has no beds, so between letters the crowding line would
  ask for a residence hall before the week-9 letter does, and Plan 78B's
  rule is that the letters' order is not contradicted.
- **Instruction is not named.** The grade's crowding also reads class
  seats, but the students short of places already have their reading
  (`seating`), earlier on the line. NEXT names the worst of beds, dining
  and health. The decision's figure names whatever the grade reads,
  instruction included.
- **The need's words:** "Housing", "Dining", "Health care" serve n%.
- **No NEXT screenshot.** On the harness's saves an earlier reading
  always spoke. The words are pinned by the test.

### PR 95Q — Labs, unfounded schools and the build tiles, said plainly (B3-7, B3-8, B3-10)

- **The lab** (B3-7).
  - Its build tile leads with research: "starts research · a lab's work
    lifts research, 25% of prestige". "Required for capstone courses" goes
    second (`BuildPopup.tsx:307`). The 25% is read from `PILLAR_WEIGHTS`.
  - History's empty research row: "a school's founding opens its lab".
- **The unfounded school** (B3-8). The Curriculum's section is headed with
  the school's name: "Business · 3 programs, not yet founded"
  (`CurriculumTab.tsx:993`). The founding letter's "a color with no name"
  stays. The school still has no colour until it is founded.
- **The smaller doubts** (B3-10):
  - **Cancel.** The placing button reads "Cancel" and the hint "Esc
    cancels" (`buildWords.ts`'s `putDown` and `holdingKeys`, and the
    comment in `BuildPopup.tsx:778`).
  - **The Library's cost.** Its build tile says what it serves and when it
    costs more: "serves 1,200 · past 120% of need it costs six times as
    much to keep". Every figure is read from the upkeep rule, never typed.
    "Study space" in the excess line reads "academic space", as the need is
    named.
  - **A greyed tile says why on its face.** The reason is set on the tile
    as Elm Hall's loan line is, not only in its `title`. Where no loan is
    offered, it says which of `loanFor`'s conditions stopped it
    (`treasury.ts`). In the session, Lakeside House's $2.1M shortfall was
    larger than the borrowing room. The building type was not the reason.
    So: "$2.1M short · the college can borrow up to $1.4M".
  - **The charter.** "With research under way" becomes "With its first
    laboratory open" in `charter.ts:31-32` and `eventCatalogue.ts:2559`.
    The charter fires when a lab opens, before any project is commissioned.
  - **The satisfaction target** (the target and today's figure) moves from
    the clubs' panel to the head of the needs breakdown on the Student
    Life tab (`StudentLifeTab.tsx:89`).
- **Checks:**
  - `npm run review:strings` is clean.
  - Tests that pin these strings are updated.
  - Screenshots of the lab, Library and greyed tiles.

**As implemented.** Words and display only. Under `systems/`, the charter's
log line and the research row's text changed, and `treasury.ts` gained
`loanBar`, which only the build menu reads, so the sim was not run.

- **The lab.** The tile reads "starts research, 25% of prestige" while no
  lab stands or is going up, "lifts research, 25% of prestige" after, and
  "required for capstone courses" second. The 25% comes from
  `prestigeWords.ts`'s new `pillarWorthWords('research')`, which reads
  `PILLAR_WEIGHTS` (`test/pillar-rule.test.ts` pins it). History's breadth
  row, with no lab, adds "A school's founding opens its lab." A lab is
  gated on its school's founding (`schoolGate`), so the line is true.
- **The unfounded school.** "Business · 5 programs, not yet founded": the
  name in the heading's ink, the rest muted as before.
- **Cancel.** The button reads "Cancel", the hint "Esc cancels", and the
  comment says the same.
- **The Library.** The tile reads "serves 3,200" and "past 120% of need,
  six times the upkeep". Both figures come from `BEYOND_NEED_FROM` and
  `BEYOND_NEED_UPKEEP` (six in words through `countWord`).
  `NEED_SPACE.academic` is now "Academic space", so the Treasury's excess
  line and the building panel say it the same way. The attrition reasons
  still say "study space", because that is what a student who left would
  name.
- **A greyed tile says why.** Under its foot, in the loan line's place:
  "$2.1M short · the college can borrow up to $1.0M" (the screenshot's
  labs). `loanBar` gives `loanFor`'s conditions in its own order: the
  board's freeze ("the board has frozen borrowing"), no cash in hand
  ("with no cash in hand, the college cannot borrow"), or the room. Past
  the room the tile reads "can borrow up to $X", or "has no borrowing room
  left" when the room is nothing. A board freeze on construction reads
  "construction frozen". A venue's greyed expansion shows its shortfall
  too. The `title` carries the same reason in full. `test/treasury.test.ts`
  checks that `loanBar` names a reason exactly when `loanFor` offers no
  loan for a shortfall.
- **The charter.** "With its first laboratory open" in the letter and in
  both log lines. `test/charter.test.ts` is updated.
- **The satisfaction target.** "Satisfaction target" (now the whole target,
  84) and "Satisfaction today" head the needs breakdown. The clubs' panel
  keeps each source's share and the cost. The target's hint reads "the
  five needs below, weighted, as the campus stands this week".
- **Screenshots** in `docs/reviews/2026-10-review-ii-fixes/`:
  `95q-lab-and-library-tiles.jpg` (Georgian), `95q-greyed-tiles-gothic.jpg`
  (Gothic, cash cut to $900k), `95q-curriculum-unfounded.jpg` and
  `95q-satisfaction-target.jpg`. Map-free, so no SVG fallback or second
  camera.
- `npm run review:strings` is clean.

**Deviations.**
- The lab's line is shorter than the spec's. "starts research · a lab's
  work lifts research, 25% of prestige" ran to four lines on the 132px
  tile and pushed its foot out of the menu. It reads "starts research, 25%
  of prestige".
- The Library's line reads "past 120% of need, six times the upkeep", not
  "...it costs six times as much to keep", for the same reason. "· academic"
  is dropped after "serves", as the spec's own wording drops it.
- The build menu's height cap rises from 372px to 432px. The longer lines
  and a greyed tile's reason overflowed the old cap at 1440×900. A tab of
  short tiles stays as short as it was.
- The target's "without student life → with" arrow is gone. At the head
  of the needs it showed two numbers that read as one ("79 → 79"). The
  clubs' panel already gives each source's share.

### What area 3 does not do

- B3-1's words: the fall is fixed at its source, so nothing explains it.
- B3-2 beyond H: no "most room" line in the Review, and no "Opens later"
  fold.
- B3-9: no NEXT reading for the committee. The lamps are the signal.
- B3-10's search price: its tooltip stays as it is.

---

## Area 4 — Strategy

### The owner's answer

Plan 89 (the administration) landed after the review. Three of its offices
touch this area:
- the **Athletics Development Office** founds a varsity team without a
  club's petition;
- the **Admissions Office** shows a range for the pool before the price is
  set;
- every office has a **staff budget**: Guided's cash at Y25 fell from
  $164.7M to $47.0M.

Plan 89's own measure also shows small colleges earn little of it:
Selective and Lean never reach prestige 70 or the top 25.

| Finding | What | On `main` | Answer |
|---|---|---|---|
| B4-1 | The ambitious paths still build one college | Open | Only through **R** (an earlier choice). The specialization shaping the build is not planned |
| B4-2 | The specialization is out of reach for the strategies that differ | Open: `SPECIALIZATION_MILESTONE_RANK = 20`, overall rank only (`milestone.ts`) | **R**: a pillar's top 10, or the overall bar |
| B4-3 | The choice comes at years 39–47 | Open | **R**: the overall bar moves to the top 30 |
| B4-4 | Small is a trap | Open: `ADMISSIONS_SCALE_FOR_FULL_CREDIT = 6_000` | Leave it: small stays hard on purpose |
| B4-5 | The teaching cap is gone, and instructor swaps doubled | Open | **S**: the link and a Provost policy |
| B4-6 | Most weeks ask nothing, and the stops grew | Open: a milestone and a research report each set `pendingInterrupt` (`eventSystem.ts:47, 59`) | **T** |
| B4-7 | The Final Report misreads the strategies that differ | Open (`reportData.ts:26, 73`) | **U**: all three |
| B4-8 | Athletics and size have too few levers | Founding a team directly: done (Plan 89's office) | **V**: cutting a team. No target enrolment, no decline that leaves a gap |
| B4-9 | The price is set blind | Fixed by Plan 89's Admissions Office | Close. Seeing the pool is the office's advantage |
| B4-10 | Money stops mattering | Unmeasured since Plan 89 | **W** measures; **X** adds a late use if the measure calls for one |
| B4-11 | The pacing scorecard measures October's prestige | Open: `prestigeY50: { min: 149.5 }` (`sim/pacing.ts:182`) | **W** |

### PR 95R — The specialization, offered sooner and by a pillar (B4-1, B4-2, B4-3)

- **Two routes to the offer** (`milestone.ts`'s `tickSpecialization`). The
  offer comes at a summer when either holds:
  - the college stands in the overall top 30 (`SPECIALIZATION_MILESTONE_RANK`
    from 20 to 30);
  - the college stands in the top 10 of any one pillar
    (`SPECIALIZATION_PILLAR_RANK = 10`), read from the standings, as the
    choice's cards already read it.
  The notice comes `SPECIALIZATION_NOTICE_PLACES` ahead on either route,
  overall or in the pillar.
- **The choice stays open to all four.** A college that came in through
  athletics may still choose academics. The cards already show its
  standing in each pillar (F's strongest-pillar line now has a reason).
- **Words.** Every string that says "the first summer the college stands in
  the guide's top 20" is rewritten to name both routes: History, the
  notice, the status line, the guide's help. E's single rule sentence holds
  the routes.
- **Balance.** `npm run sim` moves. The PR:
  - re-baselines;
  - shows, for the owner, from the goal players (`npm run review:goals`,
    ten seeds):
    - the year each goal is offered the choice (the review: never for
      revenue, satisfaction and championships; Y39–47 for the rest);
    - which it takes;
    - championships' titles a run (the review: one).
  The aim is a choice around Y25–35 for the goals that reach it, and an
  offer for each of the three that never had one.
- **The rivals.** Rivals specialize by their own rule. Check that a field in
  which the college can specialize earlier still has 35-odd rivals per
  pillar, and that the targets of Plan 85D's table still read.
- **Checks:**
  - milestone tests for each route, and for the notice on each;
  - a save mid-run where the college already stands in a pillar's top 10
    is offered at its next summer, not at once.

**As implemented.**
- **The rule.** Two routes to the offer (`prestigeSystem.ts`):
  - `SPECIALIZATION_MILESTONE_RANK` is 30 (was 20): the overall route.
  - From Year 20 (`SPECIALIZATION_PILLAR_YEAR`), the top 10 of any one
    pillar's standing (`SPECIALIZATION_PILLAR_RANK`): the pillar route.

  `tickSpecialization` reads the overall rank and the best of the four
  pillar ranks (`milestone.ts`'s `bestPillarStanding`: the standings' own
  `rankBy`). The notice comes 4 places ahead on either route. On the
  pillar route it comes no sooner than Year 18
  (`SPECIALIZATION_NOTICE_YEARS = 2`). The offer's log line names the
  route: "#30 in the guide", or "#10 in research in the standings" when
  only the pillar brought it. All four choices stay open whichever route
  brought the offer.
- **Why Year 20 (the deviation from the PR section).** The plain top 10
  was too early. A young college stands about #10–13 in student life
  within its first decade, so the goal players were offered the choice at
  Y9–21 and the Completionist at Y6–10. The top 5 lost the championships
  player its offer and still offered assets at Y11. With Year 20 as the
  pillar route's start, every goal but satisfaction gets the offer in
  Y20–43. Of the coordinator's two options (Year 20, or from the overall
  top 50) the year is the simpler for a player to read. It also keeps
  revenue's offer: that player stands about #55 overall all run, so the
  top 50 would have lost it.
- **Words.** `prestigeWords.ts` gains `specializationOfferWhen` and
  `specializationOfferRule`: "The board offers the choice of a
  specialization at the first summer the college stands in the guide's top
  30 or, from Year 20, in the top 10 of any one pillar's standing."
  - The status line (History, the standings), the closed-building line in
    the build menu, and the Research Park and complex lines all use it.
    After the merge with 95H, History › Prestige's help no longer states
    the rule (95H moved it to its own line); the status line under it does.
  - The notice is now titled "Within reach of a specialization" and names
    both routes.
  - The choice's intro names the route: the guide's rank if the college
    is in the top 30, else its pillar ("#6 in athletics, in the top 10 of
    a pillar's standing").
  - `test/pillar-rule.test.ts` now fails if any file but `prestigeWords.ts`
    types the offer's rank into a string.
- **Tests** (`specialization-choice.test.ts`):
  - first in research in Year 17: no notice and no offer; in Year 19: the
    notice and no offer;
  - the notice and the offer through the pillar alone, with the college at
    #60 overall; one place short in the pillar gives the notice and no
    offer;
  - a save written mid-year in research's top 10 gets the notice at once,
    no offer until that year's summer, then the choice at its close, and
    may choose athletics.
- **The goal players** (`review:goals`, seeds 12345, 4242 and 777, name
  Blackmoor; the goal report gains an *Offered* column):

  | Goal | Offered: review → plain top 10 → **Year 20** | Takes | Titles a run | Y50 rank |
  |---|---|---|---|---|
  | revenue | never → Y19 → **Y20** (20–21) | research ×3 | 0 | 55 |
  | prestige | Y41 → Y19 → **Y20** (20–20) | academics ×3 | 0 | 2 |
  | satisfaction | never → never → **never** | — | 0 | 60 |
  | assets | Y39 → Y9 → **Y20** (20–20) | research ×3 | 1 | 2 |
  | championships | never → Y12 → **Y20** (20–30) | athletics ×3 | **57** (review: 0, ten in all) | 42 |
  | good-then-big | Y47 → Y41 → **Y41** (30–43) | academics ×3 | 0 | 10 |
  | big-then-good | Y43 → Y14 → **Y20** (20–23) | student life ×3 | 1 | 1 |

  The top 5 alone (measured, then dropped) gave revenue Y20, prestige Y20,
  assets Y11, big-then-good Y28, good-then-big Y43, and **never** for
  championships or satisfaction. Satisfaction is still never offered: its
  student life stands about #26 and it is about #55 overall. Each goal
  takes its offer in the year it comes.
- **The sim moved.** Re-baselined; three seeds, medians; change from
  main's baseline (95N) in brackets:

  | Player | Y10 prestige | Y25 rank / prestige | Y50 rank / prestige | Offered and chosen | Top 20 |
  |---|---|---|---|---|---|
  | Guided | 47.4 | 31 / 79.4 (+0.2) | 1 / 119.8 (+1.0) | research Y25, Y26, Y20 (was Y30–32) | Y30, Y32, Y30 |
  | Guided, academics | 47.4 | 31 / 79.5 (+0.3) | 1 / 120.3 (−1.0) | Y25, Y26, Y20 | Y29, Y32, Y31 |
  | Guided, research | 47.4 | 31 / 79.4 (+0.2) | 1 / 119.8 (+1.0) | Y25, Y26, Y20 | Y30, Y32, Y30 |
  | Guided, student life | 47.4 | 31 / 79.5 (+0.2) | 1 / 117.9 (−0.9) | Y25, Y26, Y20 | Y31, Y32, Y29 |
  | Guided, athletics | 47.4 | 31 / 79.5 (+0.2) | 1 / 120.8 (+0.8) | Y25, Y26, Y20 | Y30, Y32, Y30 |
  | Guided, unspecialized | 47.4 | 31 / 79.4 (+0.1) | 3 (+1) / 111.6 (+0.5) | offered with Guided | Y30, Y33, Y30 |
  | Completionist | 47.1 | 35 (−4) / 76.4 (+2.5) | 3 (−3) / 112.3 (+3.8) | student life Y20 ×3 (was Y40–43) | Y31, Y37, Y33 (was Y40–43) |
  | Selective, Lean, Idle | unchanged | unchanged | unchanged | never | never |

  No player collapses. Guided is first on every seed from Y41–43. The
  Completionist reaches first on one seed (Y48). Its one week in the red is
  as before; no other run goes into the red.
- **Plan 85I's targets** (Plan 85D's table, as 85I restated it):
  - Each specialist is first by Year 50 on every seed: met.
  - Its pillar is first by 5 or more for academics (8.2–8.6), research
    (9.8–9.9) and athletics (12.6–13.0): met. Student life misses on all
    three seeds (+4.7, #3 at −2.9, +0.3; before: 3.9, 7.0, 5.7).
  - Unspecialized play is in the top 10 and never first (3rd; best 2, 5,
    3): met.
  - The milestone falls in the owner's 25–40 for Guided on two seeds of
    three (Y25, Y26), and at Y20 on 777.
- **The rivals** are untouched: each is dealt its pillar off its id
  (`rivalData.ts`): 35 academics, 23 research, 19 student life and 22
  athletics of 99. "35-odd per pillar" holds only for academics, as it did
  before this PR.
- **Deviations:**
  - The pillar route starts in Year 20 (see "Why Year 20" above).
  - The notice on the pillar route waits until Year 18, so the board does
    not write a decade ahead.
  - The goal players ran on three seeds and one name, not ten seeds (the
    brief allowed three); each run takes 5–15 minutes on a shared machine.
  - Most goals are offered at exactly Y20, the low edge of the plan's
    Y25–35 window.
  - Satisfaction still never gets an offer.
  - Championships wins about 57 titles a run with athletics from Y20. That
    is far above the review's one; 95U and 95V should read against it.

### PR 95S — Teaching: the line that opens *Below A*, and the Provost's policy (B4-5)

- **The link.** History › Prestige's teaching line ("11% of courses graded
  A: standing can reach …"; H gives it its own measure) gains "Show the 71
  courses below A". It opens the Curriculum with Plan 80B's *Below A*
  filter on.
- **The Provost's teaching policy** (`seatData.ts`, the `provost` seat's
  policies).
  - A new policy, *Staff for the A*: each week, for each course below A,
    the Provost puts on the best free instructor in its field when that
    instructor would teach it better.
  - "Free" means teaching under their course slots.
  - It makes a swap only when the course would gain a full letter or
    more, so the seat does not churn.
  - It uses the seat system's routine and its log line ("The Provost moved
    Dr. X onto ECON 210"). It never hires and never dismisses.
  - The Dean of a school takes the policy for that school when there is no
    Provost, as Deans take the academic routine now.
- **The harness.** The goal players and the Guided player that hold a
  Provost take the policy, and stop their own `tend-teaching` swaps for
  courses it covers. The review counts swaps a run: 495–839. Measure the
  player's own swaps after and report both.
- **Balance.** If the harness's teaching grades move, `npm run sim` moves:
  re-baseline, and show prestige at Y25 and Y50 against the baseline.
- **Checks:**
  - seat-policy tests: the full-letter rule, never past the course slots,
    and one swap per course a week;
  - the link opens the filter.

**As implemented.**
- **The policy.** *Staff for the A* (`STAFFING_POLICY`) is a fourth policy
  on the Provost's and the Deans' seats. `seats.ts`'s `staffForTheA` runs
  each week as `tickStaffing`, right after `tickFaculty`.
  - It takes the courses below A weakest first, and moves each to the best
    free instructor in its field. Free means teaching under their slots.
  - It moves a course only for a full letter or more (`lettersBetter` in
    `courseQuality.ts`), at most once a week, and never hires or dismisses.
  - A course in a program between halls keeps its instructor.
  - It logs one line per seat per week ("Provost X moved Dr. Y onto
    ECON 210 (C to B)…"), naming three moves and counting the rest.
  - With no Provost, each Dean on the policy staffs its own school. A
    Provost on any policy stands the Deans down.
- **The link.** The teaching standard's line in History › Prestige, and in
  the guide's standings, ends "Show the N courses below A". It opens the
  Curriculum with Below A on. The count is `belowACount`, the filter's own
  count. The Curriculum's link targets now go through `targetFilters`.
- **The harness.** `tendTeaching` leaves step 1 (the swap) to a seat that
  covers the course; it still hires and dismisses. The goal players put a
  Provost they hold on the policy. Their runs now record the player's own
  swaps (`playerSwaps`) and the seat's (`seatSwaps`). The seat's count also
  takes in a departure's colleague cover.
- **Measured** (`npm run review:goals`, five goals, seeds 12345, 4242 and
  777, one name). `tend-teaching` actions a run, origin/main → this PR, with
  the Provost's swaps after:

  | Goal, seed | Before | After | Provost's swaps | Prestige Y50, before → after |
  |---|---:|---:|---:|---|
  | Prestige, 12345 | 767 | 158 | 603 | 101.4 → 101.0 |
  | Prestige, 4242 | 803 | 142 | 635 | 103.3 → 105.5 |
  | Prestige, 777 | — | 166 | 681 | — → 100.6 |
  | Every asset, 12345 | 801 | 170 | 726 | 111.4 → 109.8 |

  The goal players appoint a Provost in year 1, so after this PR they make
  no instructor swaps of their own (`playerSwaps` 0). What is left of
  `tend-teaching` is hires and dismissals. The review's 495–839 falls to
  about 140–170. The other runs (championships, good-then-big and
  big-then-good, and the remaining seeds) were still running when this was
  written. They land in the scratch reports and go in a follow-up.
- **Balance.** No player in `npm run sim` holds a Provost: Guided, Natural
  and the archetypes never appoint a seat. The new system does nothing
  without a seat on the policy and uses no randomness, so the sim is not
  expected to move. The coordinator agreed, and there is no re-baseline.
  The full sim was not run.
- **Deviations.**
  - The policy is a fourth radio choice, not a separate switch. It answers
    the routine as the default (*Keep the students on side*) does, and
    staffs as well. The seat's `policy` string carries it, so the save shape
    does not change: no migration, no version bump.
  - The log line names the seat's holder ("Provost X moved…"), as
    `delegate`'s lines do, and is one line a week, not one per swap.
  - The Guided player holds no Provost, so only the goal players take the
    policy. Giving Guided a Provost would move balance through the salary,
    which is not this PR's subject.

### PR 95T — News that does not stop the clock (B4-6)

- **Milestones and research reports become letters.** `eventSystem.ts`
  stops raising `pendingInterrupt` for `milestone` (`:47`) and
  `research-complete` (`:59`).
  - Each arrives as an inbox letter (`tier: 'letter'`), with its toast as
    letters have now.
  - A milestone's effects apply the week it is reached, as now; only the
    stop goes.
  - The research report's pane is the letter's reading pane.
  - The specialization's choice, the summer and every `decide` matter keep
    stopping.
- **For the player who wants the stop.** A setting, *Pause for news*, off
  by default, beside *Pause on arrival*. `unseen.ts` reads it for `letter`
  items of these two kinds.
- **The year's defaults in the summer Review.** A matter left unanswered
  takes its default (`InboxTab.tsx`'s "left unanswered" after J). The
  summer Review lists them, grouped as I groups the rest ("3 matters left
  unanswered: …").
- **The opening's letters** (the founding years) are unchanged.
- **A save** with a milestone or report pending as an interrupt shows it
  once as now, then the new rule holds. No migration, unless the pending
  interrupt's type is read elsewhere.
- **Checks:**
  - The harness's stops a run, before and after. The review: 129–298; 87–93
    of them milestone notes, up to 83 research reports.
  - Idle weeks are unchanged. This removes stops, not weeks.
  - Tests for the setting.

**As implemented.**

- **The letters.** `eventSystem.ts` files the celebration and the report
  as a `NewsLetter` in `s.events.news` (oldest first, kept a year) instead
  of raising the stop; `inbox.ts` lists each as a `news` item in the
  letter tier ("A celebration" or "Research", its headline, a first line),
  unread until opened (`READ_NEWS`). The reading pane shows the card the
  stop showed (`MilestoneCelebrationView`, `ResearchReportView`, now
  exported), under a Letter tag and its date, without Continue. The slip
  is a letter's. The specialization, the summer, the opening letters and
  every `decide` matter are unchanged.
- **The week stays claimed.** A filed letter returns `true` as the stop
  did, so the cadence below it in `tickEvents` stands down that week. The
  demand runs after the events and read only `pendingInterrupt`, so
  `announceDemand` also waits on a letter filed that week. Without it one
  goal run (revenue, seed 777) moved from year 43: a demand arrived a
  week early. With it, a full-state hash of that run is identical every
  week for 50 years between the old stop and the new letter.
- **Pause for news** (`settings.ts`, off by default and for a browser
  without the key) sits under *Pause when a matter arrives*.
  `unseen.ts` pauses the clock for a new `news` item while it is on
  (reason `'news'`), whatever the other setting says, and never under a
  stop or on a load; the slip then waits with the clock.
- **The Review** (`yearInReview.ts`'s `events()`): the year's matters the
  clock answered, from their log lines, as one `reviewGroup` — "3 matters
  left unanswered" over "Title (the answer it took)", or one line in full.
- **Saves.** A save holding a celebration or a report as a stop shows it
  once, as before (the stop's handlers and `defaultAnswers` stay), then
  the new rule holds. The news needs a place in the save: version 96 (after 95K's 95),
  `noNewsYet` (fixture `save-v95.json`, the year-8 scenario with 95K's field added).
- **Measured** with `npm run review:goals` (seven goals, seeds 12345, 4242
  and 777, Blackmoor, 50 years), stops a run before → after, medians:

  | Goal | Stops | celebrations | research reports | Idle weeks | Answer-only weeks |
  |---|---|---|---|---|---|
  | prestige | 299 → 126 | 89 → 0 | 82 → 0 | 1,466 → 1,507 | 108 → 74 |
  | big-then-good | 277 → 134 | 93 → 0 | 45 → 0 | 1,403 → 1,454 | 117 → 70 |
  | assets | 262 → 142 | 92 → 0 | 27 → 0 | 1,315 → 1,340 | 88 → 62 |
  | good-then-big | 234 → 123 | 87 → 0 | 19 → 0 | 1,578 → 1,617 | 104 → 67 |
  | championships | 206 → 133 | 72 → 0 | 0 → 0 | 1,722 → 1,749 | 107 → 80 |
  | satisfaction | 156 → 108 | 47 → 0 | 0 → 0 | 2,091 → 2,129 | 122 → 85 |
  | revenue | 153 → 79 | 11 → 0 | 61 → 0 | 2,150 → 2,159 | 74 → 60 |

  Every run: 127–308 stops before, 77–151 after. Every goal player's
  decisions are identical, week for week, before and after.
- **The sim** reads the same as `sim/baseline.json` (no change in any
  row).
- **Tests:** `unseen.test.ts` (the setting's default and normalising, the
  news pausing only with it on, not twice, not under a stop or on a
  load, a ladder milestone not news), `inbox.test.ts` (a celebration
  filed by a `TICK` as a letter, its slip, read, gone after a year),
  `research-completion.test.ts` (reports filed one a week, read, an old
  stop still answers), `demand-note.test.ts` (a demand waits out the
  letter's week), `year-in-review.test.ts` (the unanswered, one and two).
- **Screenshots** in `docs/reviews/2026-10-review-ii-fixes/`:
  `95t-research-letter.jpg`, `95t-celebration-letter.jpg` (the inbox at
  the Completionist's year 12, the clock running) and
  `95t-pause-for-news.jpg`.
- **Deviations.**
  - *Idle weeks are not unchanged by the review's measure* (a week with
    nothing done and nothing asked): a week that only answered a
    celebration now asks nothing, so 9–51 more weeks a run read idle. The
    weeks the players act in are unchanged (their decisions are
    identical); only the stop is gone, as the spec meant.
  - *Stored, not derived.* The celebration had no letter of its own (the
    ladder's milestone letters are a different set), and a report is
    not kept anywhere after it fires, so the letters are kept in the save
    (`s.events.news`), with a save version.
  - *Reading a letter no longer reads the next.* The pane fell back to the
    newest unread letter whenever nothing was picked, so opening the
    inbox read every unread letter in a cascade. The pane now holds
    whatever it showed. This was there before for the ladder's letters;
    the news made it plain.

### PR 95U — The Final Report reads the path (B4-7)

- **Access** (`reportData.ts:73`): "never opened its doors very wide" becomes
  "stayed hard to get into". The access axis is half admit rate and half
  price. The phrase now names what it measures, not the size of the
  college.
- **Experience** weighs satisfaction more for a college whose satisfaction
  leads the field. When the college's satisfaction ranks first among the
  rivals for most of the arc (read from the standings' history), the axis
  takes satisfaction at a higher share. The satisfaction goal, graded F in
  every run, should earn its axis.
- **The title's tag** (`reportData.ts:24-33`) prefers a tag the college
  *earned* over one its standing implies. A college with final fours or
  titles, or an athletics pillar in the top 10, is "an athletics school"
  (`jock-school`) before "a party school". Each tag gets an earned test
  (titles, a pillar's rank, research awards), and an earned tag wins over
  an implied one.
- **Checks:** the goal players' report titles and grades, ten seeds each,
  before and after. Satisfaction should no longer be F ×10. Championships
  should no longer be "a party school". Big-then-good should not "never
  open its doors". `report.test` covers each rule.

**As implemented.** All three, in `data/reportData.ts` and
`state/finalReport.ts`:
- **Access**: `WEAKNESSES.access` reads "stayed hard to get into".
- **Experience**: `satisfactionLeads(s)` holds when the year's average
  satisfaction (the history rows' `satisfactionAverage`) is at
  `SATISFACTION_LEADS_AT = 85` or over in more than half the arc's rows;
  `gradeAxes` then reads the experience axis as half the campus-life
  standing and half that year's satisfaction (`SATISFACTION_LEAD_SHARE =
  0.5`). No other axis moves.
- **The title's tag**: `titleTag(s, grades)` picks the guidebooks' first
  tag that is *earned* (`EARNED_TAGS`), else an earned tag the guidebooks
  have not caught up with (the one on the highest-graded standing), else
  the guidebooks' first tag as before. The tests: `jock-school` — a title,
  a final four (the last season's, or the Complex's record), or athletics
  in the top 10 in any year of the arc (the history's `standings` ranks)
  or now; `research-powerhouse` — a research prize, or research in the top
  10; `teaching-college` — academics in the top 10; `old-money` —
  financial strength in the top 10. Party school, country club, commuter,
  pressure cooker, bargain and artsy have no test: they are only ever
  implied. A specialization still names the college before any tag.
- `test/final-report.test.ts` covers each rule (16 new checks).

**Balance.** No sim run. The report is a read-out: `finalReport` is called
only by `resolveAdmissions` at the fiftieth summer, which stores it on
`s.ending` and writes one log line; nothing in `src/systems` or `sim/`
reads `s.ending.report`, its grades or its title back (`sim/natural.ts`
only prints it), and the new code draws no random numbers.

**Measured.** The goal players, **three seeds each** (12345, 4242, 777;
one name, Blackmoor), not ten: the machine was shared with several other
agents' runs. One play-through per run; the year-50 state the report was
written from was saved, and the new report read off the same state, so
before and after differ only by the report. Marks (score), before → after:

| Goal | Marks before | Marks after | Experience axis (score) | Title before → after |
|---|---|---|---|---|
| revenue | D, D, D (47, 43, 43) | unchanged | 35 D, not led | "a research powerhouse that never fielded a team…" ×3, unchanged |
| prestige | C ×3 (58, 59, 59) | C ×3 (58, 60, 59) | 62–64 → 62–73 (led in 1 of 3) | "known first for its teaching…" ×3, unchanged |
| satisfaction | **F ×3** (30, 31, 30) | **F ×3** (31, 32, 32) | 51–54 C → 66–67 **B** (led in 3 of 3: 38–42 of 49 years at 85+) | "a campus life to envy…" ×2, "a teaching college…" ×1, unchanged |
| assets | B ×3 (63, 65, 65) | B ×3 (63, 65, 65) | 75–77 (led in 1 of 3) | "…what its laboratories find…" ×3, unchanged |
| championships | D ×3 (45, 46, 46) | D ×3 (46, 47, 47) | 60–61 → 72–73 B (led 3 of 3) | **"a party school…" ×3 → "an athletics school that never built an endowment to match its size" ×3** |
| good-then-big | C ×3 (56, 59, 57) | C ×3 (57, 59, 58) | 61–66 → 70–73 B (led 3 of 3) | "an athletics school…" ×2, "known first for its teaching…" ×1, unchanged |
| big-then-good | B ×3 (62, 67, 67) | unchanged | 66–77, not led (16–22 of 49 years) | **"…that never opened its doors very wide" ×3 → "…that stayed hard to get into" ×3** |

**Deviations.**
- *Satisfaction "leads the field" is a bar, not a rank.* The rivals carry
  no satisfaction (`rivalsSystem.ts`), and the history's `standings` rank
  only the six standings, where the satisfaction goal's campus life is
  about 23rd. The closest reading: the year's average satisfaction at 85 or
  over for most of the arc. It is not unique to the satisfaction goal (the
  championships and good-then-big players keep 85+ for 30–37 years too),
  but the satisfaction goal leads it most (38–42 of 49) and the revenue
  player (62) never does.
- *The satisfaction goal is still F ×3* (31–32, against 34 for a D). Its
  experience axis now earns a B, which lifts the mark about 1.7 points;
  the rest is athletics at 10 (no teams), financial strength at 11–24 and
  a rank near 60, which a heavier satisfaction share cannot reach (even all
  satisfaction would leave the mark at about 34). That is B4-4's small
  college, which the owner left hard on purpose; moving the mark further
  would mean re-weighting the mark itself, outside this PR.
- Three seeds per goal, not ten (above).

### PR 95V — Cutting a varsity team (B4-8)

The backlog's *Disbanding a team*: unbuilt, and with a question open about
the venue.

- **The action.** On a varsity program's card (Athletics), *Cut the
  program*, behind the armed label "Confirm — {sport} ends; its alumni
  will give less". It never cuts a flagship mid-season. A flagship is
  unflagged first.
- **The cost.**
  - The program's alumni give less: the athletics share of giving for that
    sport stops, and alumni giving as a whole dips for a few years
    (`giving.ts`).
  - A letter from the alumni says so, and the rivalry ends.
  - Its scholarships and coach's pay stop at the end of the season.
- **The venue** stays. It returns to recreation: the sport's club may
  form again, through the usual petition or the Athletics Development
  Office, and the venue serves its recreation need as it would without a
  team.
- **The harness.** The goal players that wanted to cut a program (6 of 10)
  may cut one by their rule. Report how many do. Balance must not move
  for the players that never cut (the Guided player and `npm run sim`).
- **A save** needs no migration if a cut program is removed from the
  athletics state outright. Otherwise, add a `cutYear` and a migration.
- **Checks:** reducer tests for the cut and its costs; the venue returns
  to recreation; a flagship cannot be cut in season.

**As implemented.** `systems/athletics/cut.ts`, the `CUT_TEAM` action, and
*Cut the program* at the foot of the opened card (`AthleticsTab.tsx`), armed
as "Confirm — {sport} ends; its alumni will give less".
- **The cut** removes the team outright: from `teams`, the priority list,
  its season and its rivalry. Titles, last season and the complex's deep
  runs stay as record.
- **In season** runs from the opener (week 8) to the postseason (week 47).
  A flagship is refused there, and the button says why; moved below the
  line (the existing reorder, with its head coach's risk), or after the
  postseason, it may go, and the next program moves up.
- **The costs.** The alumni give 6% less the year of a cut, easing back
  to nothing over five years; cuts add, to at most 20%
  (`giving.ts`'s `cutGivingDip`; with no cut the factor is exactly 1, and
  the Alumni panel says the dip while it lasts). A program cut in season
  pays its staff, and a flagship's scholarships, to the season's end at
  once; out of season nothing is owed. The alumni's letter goes through
  `postBoardLetter` as `program-cut:{sport}`, read by
  `inbox.ts`'s `boardLetterFor`, signed "From the alumni", naming the rival
  and the trophy the rivalry ends with, with an *Open Athletics* button.
- **The venue** stays and serves its social places, team or none (it
  always did: a venue's capacity never read its team). The sport is free
  for a club again, so the usual petition or the Athletics Development
  Office can bring it back. A venue not yet started hides again, as one
  does before its first team.
- **The save:** `orgs.cutPrograms` (sport and year). `SAVE_VERSION` 97,
  with `MIGRATIONS[96]` (`noCutsYet`), the fixture `save-v96.json` (the
  year-29 college of `save-v94.json`, twenty programs fielded), and a
  sanitizer on load; a letter about a sport the game does not know is
  dropped.
- **The harness.** The championships player now acts on the rule that
  wanted it (week 40, its weakest program, five postseasons missed, not a
  flagship in season). Over three seeds, six runs: **2 of 6 cut a
  program** (Women's Basketball in year 33, Men's Lacrosse in year 34).
  No other goal player and no `sim/` player cuts.
- **Balance:** `npm run sim` reads the same as `sim/baseline.json` (no
  change in any figure): no `sim/` player cuts, and with no cut the
  giving factor is exactly 1.
- **Checks:** `test/cut-team.test.ts` (the cut and its costs, the dip
  easing, the letter, the flagship refused in season and allowed below the
  line or after the postseason, the venue standing with the same social
  places, the club free to form again, the save round trip and a malformed
  record dropped); `save-migrations` loads the new fixture with none cut.
- Screenshots: `docs/reviews/2026-10-review-ii-fixes/95v-*.jpg`.

Deviations:
- **No per-sport giving to stop.** The game has no athletics share of
  giving by sport: the annual fund is by class (`givingOf`). The sport's
  own money that does stop is its gate. The dip on the whole fund stands
  for both halves of the spec's cost.
- **Pay to the season's end is settled at once**, not by keeping the team
  until then, so the program leaves the state outright and nothing waits
  on a later week.
- **A record of cuts, so a migration.** The dip needs the year of the cut,
  so the save keeps `cutPrograms` (the spec's "otherwise, add a cutYear").
- **Three seeds, not five.** The review's 6 of 10 wanted a cut over five
  seeds; three seeds here (the brief's allowance) give 2 of 6 runs that
  cut. The rule is the one that raised the want, unchanged.

### PR 95W — Money measured, and the scorecard re-based (B4-10, B4-11)

- **Measure.** With Plan 89's offices in play, record cash, endowment and net
  a week at Y30, Y40 and Y50 for:
  - Natural (`npm run natural`, seed 12345);
  - Guided (`npm run sim`, median);
  - the seven goal players.
  Set them beside the review's table (Natural $20.9B, the goals $1.2–5.7B).
- **The scorecard** (`sim/pacing.ts`):
  - prestige and rank targets re-based on Plan 85's scale: the top of the
    field at about 118–121 (`prestigeY50`, first place, the top 25), and
    the years read from the current baseline's best runs;
  - a new absolute row: **natural Y40 cash** under a bound in dollars,
    named in the PR, with its reason. The relative "decades of opex" row
    stays beside it.
  - The scorecards in `docs/reviews/` are history and are not rewritten.
    The PR writes a new one, `2026-10-pacing-rebased.md`.
- **The call for X.** If Natural's Y40 cash is still above about ten years
  of operating cost, or above $1B, X goes ahead. Otherwise X is closed here
  with the numbers.

**As implemented.**
- **The measure.** Cash / endowment / net a week, as each year closes.
  Natural is `npm run natural`, seed 12345, and its net is the year's
  average. Guided is the median of `npm run sim`'s three seeds. The goals
  are the medians of `npm run review:goals -- --seeds 12345,4242,777
  --names Blackmoor`. For Guided and the goals, net is the week's figure as
  the next year opens.

  | Player | Y30 | Y40 | Y50 | The review, Y50 |
  |---|---|---|---|---|
  | Natural | $2.56B / $1.67B / $9.8M | **$10.07B** / $2.77B / $15.5M | $21.39B / $3.40B / $17.4M | $20.9B / — / $17.9M |
  | Guided | $61M / $26M / $3.1M | $103M / $33M / $2.6M | $558M / $1.34B / $3.4M | $645M |
  | Prestige goal | $257M / $1.31B / $4.2M | $1.35B / $2.77B / $6.0M | $5.47B / $3.22B / $6.0M | $5.7B / $3.2B / $6.0M |
  | Championships goal | $597M / $22M / $3.2M | $2.39B / $39M / $3.5M | $4.48B / $64M / $4.1M | $4.5B / $64M / $4.0M |
  | Revenue goal | $1.36B / $384M / $2.4M | $2.63B / $384M / $2.4M | $3.96B / $383M / $2.4M | $4.0B / $384M / $2.7M |
  | Every asset goal | $40M / $41M / $3.0M | $112M / $55M / $3.2M | $924M / $67M / $2.2M | $1.7B / $79M / $2.1M |
  | Big-then-good goal | $23M / $206M / $1.2M | $281M / $452M / $3.1M | $879M / $2.79B / $4.8M | $1.2B / $2.8B / $4.8M |
  | Good-then-big goal | $31M / $37M / $2.2M | $54M / $47M / $3.2M | $94M / $55M / $3.0M | under $100M |
  | Satisfaction goal | $2.1M / $5.4M / $0.1M | $3.3M / $7.0M / $0.2M | $7.3M / $17M / $0.3M | — |

  Plan 89's offices did not change the picture. The Natural run reads
  within 4% of the review. Guided spends its money, and the three goals
  that grow pile up billions by year 40.
- **Deviation: three seeds and one name per goal, not ten runs.** The goal
  players ran 3 seeds × 1 name, 21 runs, because this shared 4-core machine
  took 70 minutes for those. Each median sits within a few percent of the
  review's ten-run medians, except two goals' cash at year 50: every asset
  ($924M against $1.7B) and big-then-good ($879M against $1.2B). Their
  late cash spreads widely from run to run.
- **The call for X: X goes ahead.** Natural's Y40 cash is $10.07B. That is
  ten times $1B. Against operating cost it reads 9.0 years ($21.6M a week),
  just under ten, so the relative test alone would not have called it. The
  dollar test does. Measured on seeds 4242 and 777 instead, Natural's Y40
  cash is $9.14B and $7.26B.
- **The scorecard** (`sim/pacing.ts`). The prestige and rank targets were
  re-based on Plan 85's scale. The new bands are read from the pacing card's
  runs and the baseline's (`node_modules/.tmp/report-runs.json`), as wide as
  the bands they replace. The old values stay in the comments.
  - `COAST.prestigeY50`: ≥ 149.5 became ≥ 116 (Natural reads 117.3–118.5,
    first place, against the field's top of 118–121).
  - `CHECKPOINTS` prestige: 72–82, 96–106, 120–130 and ≥ 145 became 48–58,
    71–81, 87–97 and ≥ 105. Rank: 25–40, 8–15, 2–5 and first became 50–60,
    28–38, 15–25 and ≤ 5.
  - `WHEN`, by price (high, then fair):
    - prestige's half: Y22–26 and Y24–30;
    - prestige's 90%: Y38–42 and Y40–46;
    - the top 25: Y24–30 and Y26–32;
    - the top 10: Y33–39 and Y37–45;
    - first: Y38–46 and Y43–49.
- **The new row: "Money: natural Y40 cash", ≤ $1B**, counted
  (`NATURAL_CASH_Y40`). $1B is about a year of the late college's
  operating cost (some $20M a week at year 40). A year in reserve is
  prudence; beyond it the money has nothing to buy. The watched "decades of
  opex" row stays beside it and passes at 0.8. The new row fails at $9.1B
  (median), as it should until X lands.
- **The count.** `npm run natural -- --pacing` met 62 of 114 before. The
  review counted 63, before later baseline moves. It meets 85 of 115 after,
  in [`2026-10-pacing-rebased.md`](../reviews/2026-10-pacing-rebased.md).
  The older scorecards in `docs/reviews/` are untouched. Every prestige and
  rank row now passes, except "Prestige: growth in years 1–10" (10%
  against 15–35%). That row is set by the opening prestige, which PR N
  moves, so it is left for N to read. The other 29 misses are October's
  catalogue, enrollment and net timing, outside this PR.
- **Tooling only.** `npm run natural -- --pacing` also writes every run's
  years to `node_modules/.tmp/pacing-runs.json`. The sim's guided rows now
  carry the endowment (`ArchetypeYear.endowment`), so `report-runs.json`
  has it. No test pins the scorecard's targets or its row count.
  `npm run sim` reads the same as `sim/baseline.json` (no change).

### PR 95X — A late use for money (B4-10, only if W calls for it)

The owner's pick: specialization shares bought faster with money.

- **What money buys.** Each specialization gets one purchase, open once its
  share is opened, priced to matter at a late college's net a week:
  - **academics:** a second training class at the institute, so more
    faculty are trained a year;
  - **research:** a second park wing, so its labs reach full sooner;
  - **student life:** a headline festival every year, not only when the
    roll allows, and the downtown's growth step bought;
  - **athletics:** the complex's second phase, so the athletics share's
    deep reading fills faster.
  Each speeds a share's fill. None raises its ceiling, so money buys time,
  not standing the college could not reach.
- **Repeatable** where the share allows: a festival a year, a training
  class a year. The cost scales with `moneyScale.ts`, so it stays a real
  choice at $1B as it was at $100M.
- **Balance.** `npm run sim` moves. Re-baseline. Show Natural's Y40 and Y50
  cash after, against W's numbers, and the year each goal's share fills.
- **Checks:** a test per purchase; the share's fill rate before and after.

**As implemented.**
- **The purchases** (`systems/prestige/speedUps.ts`, the numbers and words in
  `data/speedUpData.ts`, saved as `GameState.bought`; the reducer's
  `BUY_SPEED_UP`). Each is open only to its own specialization, and the
  building ones only once their building stands. The price is weeks of
  operating cost (`moneyScale.ts`'s `weeksOfOpEx`), a proposal for the
  owner's review:
  - **academics, a second training class** (13 weeks, once a year): the
    year's picks twice over (`training.ts`'s `trainingPicks`);
  - **research, the park's second wing** (26 weeks, once): five Landmark
    Programs count at once toward the share, not three
    (`researchParkData.ts`'s `landmarksCounted`);
  - **student life, an autumn festival** (8 weeks, once a year): a second
    festival with a headline act, worth a point toward the share
    (`downtownData.ts`'s `festivalPoints`) and 6 of the town's goodwill;
    and **the downtown's next block** (13 weeks, until grown): a sixth of
    the district's growth at once;
  - **athletics, the complex's second phase** (26 weeks, once): a deep run
    made with it standing counts half again (`ComplexRun.phase`,
    `athleticsComplexData.ts`'s `runPoints`).
  Every reading is still capped at 1, so none raises a ceiling.
- **Where.** On each specialization's own panel, under "What money can
  speed" (`components/SpeedUpOffers.tsx`): the Faculty tab's training bar,
  the Research Park under the labs, the downtown in the Students tab, the
  complex under the athletics department. A purchase spent for the year or
  for good says so in place of its button; one refused is off and says why.
  The price shows short (`moneyShort`). Pictures:
  `docs/reviews/2026-10-review-ii-fixes/95x-downtown.jpg` (and `-phone`),
  `95x-complex.jpg`.
- **The save.** `nothingBoughtYet`; `sanitizeBought` on every load (whole
  years, once each, none later than the save's). Written before 95M merged,
  it stands as 97 → 98 on the branch; it becomes 98 → 99 behind 95M's
  catalog migration, with a `save-v98.json` fixture.
- **The harness** (`sim/harness/speedUps.ts`, `Player.buys`). Every player
  buys its specialization's purchases while the share is short of full,
  once the price leaves a quarter's expenses (13 weeks) in cash; a full share
  takes nothing more. The fuzz layer sends any purchase.
- **Tests** (`test/speedUps.test.ts`), one per purchase, the share's fill
  before and after: the class doubles a year's picks and the trained share
  with them; the wing fills a year of five Landmark Programs at 5/3 the rate;
  the autumn festival adds its point and the step its sixth; the phase counts
  a season's deep runs at 1.5. Each still reads full at 1.
- **Measured** (`npm run natural`, seed 12345; the same run before and after
  on this branch). Natural specializes in research in Year 20. Its share
  filled in Year 28; with the wing, bought in Year 25, it fills in Year 27.
  Its cash:

  | | Y28 | Y30 | Y40 | Y50 |
  |---|---|---|---|---|
  | Before | $880M | $1.25B | $7.85B | $20.61B |
  | After | $721M | $1.06B | $7.42B | $19.75B |

  (W's $10.07B at Y40 was measured before 95N and 95R.) **"Money: natural
  Y40 cash ≤ $1B" still fails**, by about seven times. The reason is the
  design, not the prices: each purchase only speeds a share's fill, and
  Natural's share is full twelve years before Y40, while its cash is still
  under $1B. From then on the money has nothing it may buy. A price ten
  times higher would only delay the wing. To spend the late billions, the
  money needs a use that does not end when the share is full. B4-10's
  other two fixes are still open for that: rivals that bid for the
  college's stars, or a reinvestment rule above a reserve.

### What area 4 does not do

- B4-1's deeper half: no specialization changes what the college builds,
  and none lets it skip a school.
- B4-4: small stays hard. No change to the 6,000, and no selective bonus.
- B4-8: no target enrolment, and no decline that leaves a gap.
- B4-9: no price line for players without the Admissions Office.

---

## Area 6 — Marketability

### The owner's answer

Since the review, every picture in `docs/images` was taken again after
Plan 89 (`24dc748`), and so was the time-lapse (`85bc1d3`). The share image
was not.

| Finding | What | On `main` | Answer |
|---|---|---|---|
| B6-1 | The shop window shows the September game | Partly fixed: the README's pictures and the time-lapse are new. The README's words still describe the old Faculty tab, with no pillars or specialization. `public/og-image.jpg` is from 28 September. The title screen is a white card | **Y**: the share image and the README's words. The title screen stays as it is |
| B6-2 | Only two of four specialists top their own pillar, and the choice comes late | The ranking half was fixed before the review read the code: `rivalsSystem.ts`'s `selfValue` ranks research and student life on their pillar values (Plan 85I, `c9ce59e`). The timing is R's | Close |
| B6-3 | AI disclosure is nowhere a buyer looks | Open: only the Credits line | **Z** drafts it. The human edit, the devlog and the commissions go to the backlog as the owner's (**A**) |
| B6-4 | February's Next Fest is no longer realistic | A decision | June 2027, recorded in the backlog (**A**) |
| B6-5 | A first run ends near the refund line, and the sandbox and the Epilogue go unsaid | Open: one README clause | **Y** and **Z** say it. The playtest measures the first run (**A**) |
| B6-6 | Three of the October memo's facts need correcting | The review itself holds the corrected figures. No other doc repeats the old ones | Close |

### PR 95Y — The shop window: the share image and the README's words (B6-1, B6-5)

- **The share image** (`public/og-image.jpg`), taken again on the production
  build with the canvas map:
  - a year-30-or-later campus in its ring of land, with the hills and the
    haze;
  - in the fall (weeks 10–14), when the seasons are at their best;
  - at the size the meta tags declare.
  The tools README gains its recipe beside the other pictures', so the
  next retake is one command.
- **The README's words:**
  - the Faculty caption describes the grid of people Plan 84 made, not
    "payroll, the market, and each department's roster" (`README.md:115-116`);
  - a paragraph on the four pillars and the specialization, in the README's
    own register: "excellent at all four, the very best at one". It reads
    the routes from R if R has landed;
  - the features name **Sandbox mode** (from the title screen: unlimited
    funds, instant building) and **playing on after the Final Report**,
    in place of the one clause at `README.md:15`;
  - every other caption is checked against its retaken picture.
- **Checks:** the share image at the declared size; the README's links and
  images resolve.

**As implemented.** Pictures, words and tools; nothing under `src/`
changed, so no sim.
- **The share image**, 1200×630 as `index.html` declares, 132 KB: the
  Completionist's campus in week 14 of Year 32, laid out, on `vite
  preview` (the canvas map, as the shot reports), the chrome hidden, the
  view two steps flatter so the farmland, the road and its town, the hills
  and the haze ring the campus, and the trees in their autumn colours. The
  `og:image:alt` says so now ("dormitory towers" and "a stadium" were not in
  it).
- **One command:** `CAMPUS_URL=… npm run share-image`
  (`tools/shareImage.mjs`: scenario, layout, shot). Its recipe is in the
  tools README beside the others'. The tools gained what it needed:
  `scenario --week N` (stop in week N of the year asked), and `shot`'s
  `--bare` (the time-lapse's chrome list), `--tilt=N`, JPEG out by
  extension (`--quality`), and the map that drew named in its last line.
  Drawn in a 1600×840 viewport at scale 0.75, so the campus is sharper than
  a 1200-wide viewport draws it.
- **The README:** the one clause at :15 is gone; *What you do* gains
  **Play on after the Final Report** (into the Epilogue, a decade added each
  tenth summer) and **Sandbox mode** (title screen: unlimited funds, instant
  building, every building open). The prestige bullet names the four
  pillars and the one choice, not the old six inputs. A new section, *Four
  pillars, one specialization*, after the summer card, in the README's
  register ("excellent at all four, … the very best at only one"), with
  R's rule as `specializationOfferWhen()` says it: the guide's top 30, or
  from Year 20 the top 10 of any one pillar. *Current state* lists the
  pillars and the specialization.
- **Captions:** Faculty, Athletics and History changed after the 4 October
  pictures (95G, 95I, 95H), so those three pictures are taken again with
  the tools README's own recipe (year-50 `--build-all` run, each tab in its
  colours), and their captions and alt text describe them: Faculty's grid
  of faces under its figure row, Athletics' one-line programs, History's
  three views on Prestige. Curriculum, Research, Students and Treasury
  still match their pictures (95M has not landed) and are unchanged.
- **The store page:** the specialization's offer reads R's exact rule in
  the long description and the features, and screenshot 5's note no longer
  says `tab-history.png` shows the report's heading.
- **Checks:** the share image is 1200×630 JPEG; every link and image in
  the README resolves; `npm run check` passes.

Deviations:
- **Three README pictures retaken**, not only their captions checked: a
  caption fitted to the 4 October pictures would describe screens the
  game no longer has. Their toolbar now wears the new icons, so they differ
  from the four untouched tabs' in that strip. They are quantized to 256
  colours with Pillow (`pngquant` is not on this machine), 170–220 KB.
- **Week 14, not 12:** both are in the window; at 14 the leaves have turned
  further (`seasons.ts`: 0.8 against 0.6) and none are down.

### PR 95Z — The AI disclosure and the store page, drafted (B6-3, B6-5)

Drafts for the owner to edit. Nothing is published.

- **The disclosure** (`docs/store/ai-disclosure.md`), worded for Steam's
  form and for itch.io. It follows the review's §7: what was generated
  (code, text, the campus art drawn in code), what the owner directed and
  chose (every plan, every pick between mockups, every review answered),
  and what is commissioned (the capsule art and the logo, once they are).
  It is plain and specific. Vague wording is what the market punishes.
- **The README** carries a short form of it under its own heading, and
  links to the full text.
- **The store page** (`docs/store/steam-page.md`), drafted:
  - the short description and the long one;
  - the feature list, with *Sandbox mode* and *Play on after the Final
    Report* named (B6-5), and the pillars and the specialization;
  - the five screenshots the review's §4 lists, as captions with the
    picture each wants, from `docs/images`.
- **Checks:** none in code. The owner reads both drafts.

**As implemented.** Docs only: no code, no sim.
- `docs/store/ai-disclosure.md`: the facts it rests on, Steam's
  pre-generated and live-generated answers, itch.io's part by part, a short
  form, and what to keep out of any copy. The game makes no runtime AI or
  network calls: `unischool/src` holds no `fetch`, `XMLHttpRequest`,
  `WebSocket` or `sendBeacon`, and its runtime dependencies are React and
  three font packages. The live-generated answer says so.
- `README.md` gains one section, *How UniSchool is made*, after
  *Development*, with the short form and a link to the full text. No other
  section is touched, for 95Y.
- `docs/store/steam-page.md`: a short description (220 of Steam's 300
  characters), the long one, twelve features with *Sandbox mode* and *Play
  on after the Final Report* among them, and the five screenshots as
  captions. The specialization's offer reads "once the college stands high
  enough, overall or in one pillar", since R's rule is still being tuned.

Deviations:
- **The review's suggested Steam text says the text was "edited by the
  developer".** The draft leaves that out until the human edit (the owner's,
  in the backlog) is done, and marks where it goes back in. Likewise the
  line naming a human artist waits for the commissions.
- **Only one of the five screenshots is in `docs/images` as it should be**
  (the Faculty grid). The campus was taken in week 2, before the trees
  turn; the admissions card is cropped to portrait; the specialization
  choice and the Final Report have no picture there. The table says which
  to retake and points at the 85D shots of the frames wanted. All need
  retaking at 16:9 for Steam in any case: `docs/images` is 16:10.
- **itch.io's graphics answer is left to the owner**, with *yes, with the
  note* recommended: no image generator, but the drawing code was written
  with the assistant.

### What area 6 does not do

- B6-1's title screen: it stays a card with no campus behind it.
- B6-2's signposting: no founding letter about the pillars.
- B6-5's pause-on-arrival default stays on. T's *Pause for news* is a
  separate setting, off.
- Nothing is published: no Steam page, no itch.io page, no devlog.

---

## Area 7 — Bugs

### The owner's answer

No code the bugs name has changed since the review, except the `training`
scenario, which the review itself fixed (H7-8a).

| Bug | What | On `main` | Answer |
|---|---|---|---|
| H7-1 | A pre-85F save counts more than three Landmark Programs a week | Open (`persistence.ts`, `researchParkGate`: the cap is on the year only) | **AA** |
| H7-2 | The map's wheel zoom can't stop the browser's | Open (`CampusMap.tsx:1908, 2249`, a passive React `onWheel`) | **AB** |
| H7-3 | A second tab's Continue drops the first tab's unsaved weeks | Open (`engine/useGame.ts:71`) | **AA**: save before losing |
| H7-4 | A matter opened before a reload pauses the clock again | Open (`App.tsx:128`) | **AA**: `sessionStorage` |
| H7-5 | A board letter is always dated this week | Open | Close here: **K** fixes it (B2-7) |
| H7-6 | Short money rounds past its unit | Open (`format.ts`'s `moneyShort`) | **AB** |
| H7-7 | "University of Ashford College" | Open (`bareSchoolName` strips a trailing word only) | **AC**: say it on the form. No rule change |
| H7-8 | Tooling | a: `training` fixed by the review; `demand` still runs out. b: `DEFAULT_NAME = 'Test University'`. c: the canvas reports `url(#campus-scaffold)` | **AB** for c, **AC** for b. a's `demand` is left |
| H7-9 | Three events still name anyone | Open: `star-poached`, `tenure-case` and `two-body` have no `names.faculty` | **AD**, and re-baseline |

### PR 95AA — The save and the clock (H7-1, H7-3, H7-4)

- **Landmark weeks, counted per week** (H7-1). `researchParkGate`
  (`persistence.ts`) builds a count per absolute week, caps each week at
  `LANDMARKS_COUNTED`, and only then sums by year, capping the year as now.
  The comment already says this is the rule.
  - `test/fixtures/save-v81-recruiting.json` joins the migration test,
    with the invariant (`invariants.ts:186`) checked after it is read and
    after a year of play.
  - Saves already migrated keep their overcount. It fades from the
    ten-year window, and the invariant is not run against old years. Say
    so in the PR.
- **A tab saves before it gives up the college** (H7-3). On the `storage`
  event that takes the claim (`useGame.ts:71`):
  - a tab whose game is ahead of the stored one (a later week than the
    save it read) saves first, then calls `lose()`;
  - the claiming tab meets the newer save at its next write and shows the
    banner, as Plan 79B's guard does;
  - "Open it here" then loads the newer game.
  - `tools/review/twoTabs.mjs`'s case 4 reads the first tab's weeks kept.
- **Opened matters survive a reload** (H7-4). `App.tsx`'s `opened` set is
  kept in `sessionStorage` under the run's id, read on load, and cleared
  on a new game. `unseen.ts` takes the opened set as now. Reads and writes
  sit in try/catch, so a blocked storage only loses the convenience.
- **Checks:**
  - the migration test above;
  - a two-tabs test that the first tab's weeks are kept;
  - a test that an opened matter in its final week does not pause after a
    reload.

**As implemented.**

- **H7-1.** `researchParkGate` counts each absolute week first, caps the
  week at `LANDMARKS_COUNTED`, then sums by year under the yearly cap. The
  recruiting fixture (eight Landmark Programs, Year 21, week 2) now reads
  back Year 21 at 3 weeks, not 16, and holds every rule after a year of
  the guided player (it ended Year 21 at 159 with the per-week cap alone).
  `test/save-migrations.test.ts`'s `testLandmarkWeeks` checks both, and
  that the fixture runs more than three. Saves already migrated keep their
  overcount: it leaves the ten-year window, and the invariant is not run
  against old years. No `SAVE_VERSION` bump.
- **H7-3.** `persistence.ts` keeps the week of the save a tab last loaded
  or wrote; `saveBeforeLosing` writes the tab's game when it is further on
  and no tab has saved since (the guard stands). `useGame.ts`'s `storage`
  handler calls it, then `lose()`. `test/two-tabs.test.ts` covers it.
  `twoTabs.mjs` case 4, on `save-v93.json`: A played Year 9, week 2 → 7
  unsaved, B continued at week 2; the save then read week 7, B showed the
  banner once it went to write, and a fresh tab continued at week 7. All
  four cases pass.
- **H7-4.** `unseen.ts` gains `readOpened`, `keepOpened` and
  `forgetOpened` over `sessionStorage` (each in try/catch); `App.tsx`
  reads the set on load, keeps it on each change, and forgets it on a new
  game. `test/unseen.test.ts`: a matter opened before a reload does not
  pause in its final week; read back empty, it does.
- **Checks:** `check` and `test:slow` pass. No sim run: nothing a new run
  reads changed (the migration runs only on a version-90 save, and the
  rest is the browser's shell).
- **Deviations.**
  - The migration's `now` was a week late too: the clock's week is the one
    about to be played, so the weeks a program has run end at the week
    before it. With the per-week cap alone the fixture still broke the
    invariant (159 of 156); with both it holds.
  - The game has no run id. The opened set is kept under the college's
    name, as `App.tsx` already tells runs apart for the unseen memory, and
    forgotten on a new game.
  - `twoTabs.mjs` read the date off the page's text, which the toolbar no
    longer draws in one piece (it is the calendar's label); it now reads
    the label, and case 4 expects A's week.

### PR 95AB — The map and the money (H7-2, H7-6, H7-8c)

- **The wheel** (H7-2). The map's wheel handler is attached natively in an
  effect, `addEventListener('wheel', …, { passive: false })`, on the
  map's element, in place of React's `onWheel` (`CampusMap.tsx:2249`).
  `preventDefault` then holds, so a trackpad pinch zooms the map, not the
  page. Both maps take it, the canvas and the SVG fallback.
- **The short form** (H7-6). `moneyShort` rounds to the unit's shown
  precision first, then picks the unit:
  - 999,500 reads "$1.0M";
  - 9,950,000 reads "$10M";
  - 999,950,000 reads "$1.0B".
  Tests at each boundary, either side.
- **The scaffold on the canvas** (H7-8c). The canvas misses
  `url(#campus-scaffold)` because the pattern's def is not yet seen when
  the element is recorded (`canvasPaint.ts:1090`). Register
  `SCAFFOLD_PATTERN_ID`'s pattern with the canvas's defs before the scene
  records, or draw the hatch as lines. Check that a site's hatched shell
  shows the same on both maps at each construction stage, and that the
  map's probe reports nothing it cannot draw.
- **Checks:** a console free of the passive-listener error over a map
  session; the probe's miss count at zero over the review's saves.

**As implemented.**
- **The wheel.** `CampusMap.tsx`'s zoom-to-cursor handler moved into an
  effect that adds it to the map's `<svg>` with `{ passive: false }` and
  removes it on unmount; `onWheel={onWheel}` is gone. The one `<svg>` sits
  over both maps and takes their pointer, so one listener serves the
  canvas and the SVG fallback. The zoom itself is unchanged.
- **The short form.** `moneyShort` walks a small table of units. It rounds
  at the unit's grain (tenths of a million or billion under ten, whole
  units otherwise, in whole tenths so 9,950,000 is a hundred of them) and
  steps up a unit when the rounded figure reaches 1,000. The same applies
  below a thousand: 999.5 reads "$1k", not "$1,000".
  `test/number-format.test.ts` checks each boundary, either side:
  $999 / $1k, $999k / $1.0M, $9.9M / $10M, $999M / $1.0B (at 999,500,000
  and 999,950,000), $9.9B / $10B, and a negative.
- **The scaffold.** Why the canvas missed it: `mapCanvas.ts` records the
  scene's entries before the ground, and only the ground carries
  `<defs><ScaffoldPattern/></defs>`. So the first frame's sites resolved
  `url(#campus-scaffold)` to nothing, and kept that until their signature
  changed. `Recorder.declare(node)` now takes in defs ahead of any
  recording. The scene has a `defs` field, which `canvasSceneOf` fills with
  one module-level `<ScaffoldPattern />` (one element, so the pattern's
  tile is kept). `MapCanvas` declares it whenever it changes, before it
  records anything. `test/canvas-scene.test.ts` records the sites before
  the ground both ways. Without the defs the hatch is missed, and with
  them nothing is.
- **Measured** (Chromium, dev build, 1440×900; a Completionist year-8 save
  with eight more buildings set under way at stages from excavation to
  shell, alongside its own three sites). The session dragged, turned
  (Q, E), tilted (Z, X), and zoomed by wheel with and without Ctrl, then
  zoomed in on six sites. On both maps, every wheel event arrived
  cancelable and was default-prevented (Ctrl included), the page's zoom
  stayed 1, and the console held no error or warning. The canvas probe's
  `unsupported` was `{}`. The same six sites on both maps:
  `docs/reviews/2026-10-review-ii-fixes/95ab-scaffold-canvas-vs-svg.jpg`.
  The hatching matches at each stage.
- **Deviations.** The visual check is one save, in one vernacular
  (georgian), from the opening camera, not every review save. The hatch
  is the same pattern in every vernacular and is drawn in screen space.
  The probe was read over that one session. The fix is the order of
  recording, which the unit test holds for any save. Balance: no
  simulation code touched, so no sim run.

### PR 95AC — Names (H7-7, H7-8b)

- **The form says how the name will read** (H7-7). On the founding form,
  a name that begins "University of" or "College of" shows a caption
  under the facade, as a trailing "University" already does
  (`UNIVERSITY_CAPTION`, `StartupScreen.tsx:636`). It shows the name as
  the pennant will carry it, "University of Ashford College", and says
  that typing "Ashford" gives "Ashford College". `bareSchoolName` is
  unchanged.
- **The harness's college** (H7-8b). `DEFAULT_NAME` (`sim/harness/game.ts:44`)
  becomes "Test", so a save reads "Test College", and after the charter
  "Test University". Rename only. The run's random stream does not read
  the name, so the sim reads the same. Check that it does. (It did not:
  see As implemented.)
- **Checks:** a test for the new caption, and `npm run sim` unchanged.

**As implemented.**
- The founding form's caption for a name that opens "University of" or
  "College of" is `foundingData.ts`'s `prefixedCaption`, shown when
  `types.ts`'s new `typedPrefixed` holds. It takes the place of the
  "University" caption, so the two never show together. `charter.test`
  covers `typedPrefixed`.
- The harness's college is "Test" (`DEFAULT_NAME`). Its saves read "Test
  College", and "Test University" after the charter.
- **Deviation: the sim moved, and the baseline was re-recorded.** The plan
  said the random stream does not read the name. It does: the name seeds
  the program offers' roll (`programOffers.ts:186`), the promises
  (`promises.ts:66`) and the chronicle (`chronicle.ts:338`). Renaming the
  harness's college reshuffles all three. No rule changed. The shift is the
  noise of a new draw:

  | Player | Y50 rank | Y50 prestige |
  |---|---|---|
  | Completionist | 1 (−2) | 115.1 (+1.3) |
  | Selective | 64 (+2) | 51.6 (+0.2) |
  | Lean | 69 (−6) | 42.6 (−0.4) |
  | Guided | 1 | 116.0 (−1.1) |
  | Guided, unspecialized | 6 | 109.4 (−1.7) |

  So AC is a seventh baseline move, made on its own as the plan's rule
  asks. Every later PR is read against it.

### PR 95AD — Three events name the professor they mean (H7-9)

Plan 79D's mechanism (`catalogue.ts`'s `namedFaculty`, and an event's
`names.faculty`) already lets an event name someone by kind. The draw
still happens, so the random stream reads the same.

- **New kinds** for `names.faculty`:
  - `'tenure-track'`: the professor nearest tenure, the shortest-serving
    with at least `TENURE_CASE_MIN_YEARS` (about four) at the college;
  - `'recent'`: the most recent hire with a year at the college.
- **The three events** (`eventCatalogue.ts`):
  - `star-poached` names `'researcher'`, the strongest researcher. Their
    departure is the one that costs;
  - `tenure-case` names `'tenure-track'`. A case never names a
    professor of twenty-five years;
  - `two-body` names `'recent'`.
- An event whose kind finds nobody (no one in the tenure window) does not
  fire that week, rather than falling back to the drawn name.
- **Balance.** Who leaves changes, so `npm run sim` moves. Re-baseline, and
  show the faculty's mean research and teaching at Y25 and Y50, and
  prestige, against the baseline.
- `BACKLOG.md`'s entry for the offer and the tenure case is removed.
- **Checks:** a test per kind (ties to the id, as now); a test that the
  random stream is unchanged by the naming.

**As implemented.** `namedFaculty` (`catalogue.ts`) has the two new kinds,
both read and tied to the id: `'tenure-track'` is the shortest-serving
professor with `TENURE_CASE_MIN_YEARS` (4) to `TENURE_CASE_MAX_YEARS` (10)
years at the college, and `'recent'` the shortest-serving with at least a
year. `star-poached` names `'researcher'`, `tenure-case` `'tenure-track'`
and `two-body` `'recent'`. `eligible()` now also asks that an event's
professor kind finds someone, so a kind that finds nobody takes the event
out of that week's pool; it is read, so the pool's one draw is still the
only one. `rollVars` still draws `{faculty}` first. `event-truth` checks
each kind against a roster built for it (ties to the id), that each event
cannot fire with nobody to name, that naming and the eligibility check
leave the stream as it was, and, in place of Plan 79D's test that no
leaving event names by kind, that every event that lets its professor go
does. `BACKLOG.md`'s entry is gone.
- **Deviation:** the tenure window has an upper end (ten years). The
  shortest-serving with at least four years can still be a professor of
  twenty-five at a college that has hired nobody since; with the upper end
  the tenure case never names them, as the section says, and the event
  waits instead.
- **Balance** (re-baselined on PR 95R's baseline; 30 runs, three seeds).
  Prestige moves little: Guided Y25 78.7 (−0.7), Y50 117.6 (−2.2); its
  specialized variants Y50 −0.2 to −2.2; Completionist Y50 −0.2, Selective
  −1.1, Lean +0.7; Idle does not move. Every Guided run is still first at
  Y50 and never in the red. The faculty's means (Guided, the mean of the
  three seeds, measured with the harness; "before" is this branch with the
  three events' `names` taken off, which reproduces the old baseline's
  prestige and cash):

  | | Before | After |
  |---|---|---|
  | Research, Y25 | 53.1 | 53.9 |
  | Teaching, Y25 | 67.7 | 70.0 |
  | Research, Y50 | 66.3 | 63.9 |
  | Teaching, Y50 | 84.6 | 84.1 |

  **What moves most is the late money.** Guided's Y50 cash falls from
  $6.4B to $0.3B (median), its endowment from about $3B to under $0.1B,
  and its Y50 research rank from 1 to 8. On the old baseline all three
  seeds' research grants snowballed after year 34 (seed 4242: $12.8B of
  grants by Y50, against $1.5B now), and the money swept into the
  endowment from year 42. Now no seed's does. Taking the names off one
  event at a time (seeds 4242 and 12345) places it mostly in the tenure
  case and the two-body problem rather than the offer, but which run takes
  off is a threshold, not a slope. The second review's area 7 had already
  called the year-50 surplus a question of balance for area 4. The
  research variant still takes off ($6.8B, +$0.4B).

### What area 7 does not do

- H7-7's rule: a name beginning "University of" still takes the suffix.
  The form only says so.
- H7-8a's `demand` scenario still runs out at year 30.
- H7-5 is K's.
