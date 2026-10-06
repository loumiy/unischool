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

### What area 7 does not do

- H7-7's rule: a name beginning "University of" still takes the suffix.
  The form only says so.
- H7-8a's `demand` scenario still runs out at year 30.
- H7-5 is K's.
