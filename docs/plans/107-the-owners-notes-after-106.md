# Plan 107 — The owner's notes after Plan 106

*Planning document only. No gameplay code is changed by this file. It
turns the owner's notes from playing the build with Plan 106's chapters
(21 October 2026) into PRs: the walkthrough's first steps, the chapters'
words and buttons, the Curriculum's folding, a prestige panel you can read
at a glance, prestige that moves early, crowding gone, three bugs and one
label.*

**Status: In progress.** The owner took every recommendation in §3 (21
October), and asked for D's panel to be mocked up before it is built: two
variants, meters and rings, at
https://claude.ai/artifact/HqgEg2kaTqmNq2V8EoKp1Z.

---

## 0. The notes

1. **Raise Founders Hall.** The card sits top right, which pulls the eye
   away from the build menu. It should move to the left edge, between the
   build panel and the pennant. "Click a clear stretch of ground" should
   say "click anywhere on the map". "Clear" suggests that trees are in the
   way, and they aren't.
2. **Choose the first program.** The card doesn't need the professors'
   names, and it shouldn't steer the player to English. The Founders Hall
   offer tile reads "with Dr. Grace Bennett" instead of what an offer
   normally shows. Hiring and founding in one step is confusing, so the
   college should open with Bennett, Iyer and Okafor already appointed.
3. **Chapter 3** ("Somewhere to sleep") says "clear ground" too.
4. **Chapter 8** ("A faculty") should ask the player to open the Faculty
   tab. Posting a search should become optional.
5. **The "? Guide", "Show me" and the drawer's other buttons** don't look
   like the game's buttons.
6. **The Curriculum** should have rows open by default. A row folds when
   all its courses are developed, and a school folds when all its
   programs are. The player's own folding is still remembered.
7. **The History tab's prestige breakdown** has too much text and too
   many numbers. "45.2 of 150 → 4.6 of 41.3 points" is four figures for
   one row. It should be simpler and visual.
8. **Bug:** admissions opens at "Admit rate 86%". Drag the slider down and
   back up, and it stops at 62%.
9. **Crowding goes.** It belongs in satisfaction, which already counts
   housing and dining.
10. **Prestige** should start lower and move more easily early on, so a
    player who is doing well can see it.
11. **Things that open a week late:** the Students tab opens in Year 2
    Week 2 instead of Week 1. A venue reaches the build menu the week
    after its team goes varsity, when it should be the same moment.
12. **"Below 78"** in the Courses filter feels arbitrary.

## 1. What stands today

Read against `main` at `e0be96a` (Plan 106 PR I).

- **The coach card's position.** `.opening-coach` (`styles.css`
  ~3728) is fixed `top: 16px; right: …`. The comment says top-left was
  left free for the building panel. During `site-hall` no building panel
  is open, so the left edge is free. The space runs from below the pennant
  (`.pennant`, top-left, about 140px tall) down to the top of the build
  popup (`.build-popup`, full width, `bottom: 76px`, up to 432px tall;
  it folds to a strip while a building is held).
- **The walkthrough's copy.** It lives in `data/openingData.ts`
  `OPENING_STEPS`:
  - `site-hall` (line 126) says "a clear stretch of ground".
  - `appoint` (lines 132–144) lists all three professors via
    `foundingPrograms`, then says "choose English, and appoint Dr. Grace
    Bennett".
  - `found` (145–156) names the program to found.
- **Chapter 3's copy.** `chapterData.ts:93` says "set it down on clear
  ground".
- **The founding faculty.** The college opens with `faculty: []`
  (`actions.ts:420`). Bennett (f3), Iyer (f4) and Okafor (f2) are
  *candidates* (`FOUNDING_MARKET`, `initialCandidatePool`).
  `FOUND_PROGRAM` needs an appointed teacher, so appointing comes first
  (`opening.ts:90–97`: `appoint` is done at `faculty.length > 0`).
- **The offer tile.** In `BuildingInfoPanel.tsx:486–504`, a founding
  program's tile reads `with ${founder.name}` while its professor is
  still a candidate. Every other offer reads `$300k · English` (cost ·
  field). The English tile is ringed (`WALKTHROUGH_PROGRAM`, line 485).
- **Chapter 8.** `a-faculty` (`chapters.ts:163–170`) requires
  `post-a-search` and `every-program-staffed`, with `appoint-a-b`
  optional. Tab-opening objectives use `MARKED_TABS` (`chapters.ts:292`),
  which today holds treasury, students and history.
- **The drawer's buttons.** These classes aren't in the register's button
  selectors (`styles.css:222–267`), so they render close to native
  buttons:
  - `.tab-overlay-guide`
  - `.objectives-door` (Show me, Go, All milestones)
  - `.objectives-back`
  - `.objectives-guide-link`
- **Curriculum folding.** `useCollapse(key, foldedByDefault)` keeps the
  player's overrides in a module map for the session.
  - Program rows default to folded (`CurriculumTab.tsx:921`).
  - School groups already fold by default once complete and fully
    staffed (`:961–984`).
- **The prestige breakdown.** `StandingBreakdown.tsx` lays it out like
  this:
  - Each pillar row reads `target of 150 → worth of max points`.
  - The bars share one scale.
  - Each row has a sentence of detail and a nested "What academics is
    made of".
  - Endowment, condition and crowding rows follow, then an "Instruction
    capacity" reading.
  - Above it are a summer note, a baseline note, the pillar rule, the
    specialization and a forecast.
- **The admit rate.** `InterruptModal.tsx:245` opens the slider's state at
  `payload.admitRate` (0.86 at the founding). The thumb and the commit
  clamp to `maxAdmitRate`, the rate at which the class fills the seats
  left (L259–261, L392, L483). The label (L390), the projection (L256)
  and the opening note (L396) read the raw value instead. The thumb sits
  at 62% from the start, so the first drag can never bring the label
  back to 86%. The college can't actually admit 86%: the room holds 62%.
- **Crowding.** `prestigeSystem.ts:700–757` defines it as the worst of
  housing, dining, health and class seats below 85%, averaged over the
  year, at up to −25 prestige. About −11.5 of that lands in the founding
  year.
  - It also scales the applicant pool (`crowdingPoolFactor`,
    `admissionsSystem.ts:66–77`).
  - Housing, dining and health already score in satisfaction
    (`satisfactionSystem.ts:228–264`), so for those three it is counted
    twice.
  - **Class seats (`instructionCoverage`) are not in satisfaction.**
    Crowding is their only cost besides the intake ceiling and the
    services multiplier.
- **Prestige's pace.**
  - The college opens at 42 (40.5 + Founders Hall's 1.5). Every pillar
    starts at its floor of 32.
  - At the summer the stock moves 20% of the gap up, capped at 2.1, or
    30% of the gap down.
  - The weekly drift is 0.00025 of the gap, which is invisible.
  - The first-year target (~29 with crowding) is below 42, so a new
    college falls before it rises.
- **The Students tab.** It opens with the `commencement` milestone
  (`history.length >= 1`). The milestone is written only by `tickLadder`
  in `TICK`. `RESOLVE_ADMISSIONS` pushes the history and turns the page
  to Y2W1 without running the ladder, so the tab first shows at Y2W2.
- **Varsity venues.** A venue goes `locked → available` only in
  `unlockAvailable`, which runs in the weekly `tickTech`. The
  varsity-petition event's apply (`eventData.ts:974–994`) adds the team
  and `RESOLVE_DECISION_EVENT` turns the page, but the venue stays locked
  until the next tick.
- **"Below 78".** The chip in `CurriculumTab.tsx:1071–1079` is the
  `belowA` filter: courses under `GRADE_A` (78) or unstaffed. The 78
  is written as a literal there, in the title, and in the help text
  (`:1361`). It also appears in the Dean of Academics' copy (`seatData.ts`)
  and in History's "Show the N courses under 78".

## 2. The PRs

### A — The first two steps, and three professors on the payroll

*Notes 1, 2, 3.*

- **The founding faculty is appointed.** `newGame` puts Bennett, Iyer and
  Okafor on `s.faculty`, built the same way `HIRE_FACULTY` would build
  them, and takes them out of `initialCandidatePool`. Their salaries start
  in week 1 (see §3 Q1 for paying for that).
- **The `appoint` step goes.** The opening becomes welcome → `site-hall`
  → `found`. `found` takes the title **Choose the first program**:
  > Programs are what the college teaches. Three are on offer in
  > Founders Hall, each with a professor ready to teach it. Click the
  > ringed slot, pick any one, and found it.
  - No professor names. Founding cost and salary are left to the tile
    and the button.
  - `programToFound` and the English ring go.
  - With the slot open, the ring moves to the three offer tiles.
  - After a pick, it moves to the Found button.
- **The founding chapter** (`chapters.ts:75`) loses
  `appoint-first-professor`.
- **The offer tile reads like any offer.** The `founder` branch in
  `BuildingInfoPanel.tsx:486–504` goes, so every tile reads `$300k ·
  English`. When a founding professor is a candidate again (an old save),
  their name stays in the picker below, where teachers are chosen.
- **"Click anywhere on the map"** replaces "a clear stretch of ground"
  in `site-hall`. Chapter 3's lever becomes "…pick it up and set it down
  anywhere on the map." The refusal reason "not enough clear ground"
  (`reach.ts:145`) stays, because a refusal is the moment that does
  explain what's in the way.
- **The card moves left during `site-hall`.** New class
  `.opening-coach.left`, set while the step is `site-hall`:
  - `left: 16px`.
  - `top` just under the pennant.
  - Width `min(360px, …)`.
  - `max-height` down to the build popup's top, then scroll.
  - While the hall is held the popup folds to a strip, so the card has
    the whole left edge.
  - Below 760px wide, the existing rules apply.

  The later steps keep the top-right card, because the hall panel takes
  the top-left once the hall is placed. See §3 Q2.
- **Old saves:**
  - A save in the middle of `appoint` settles to `found`, through
    `settleOpening`, as it does now for steps already done.
  - A save at `faculty: []` keeps its candidates, which is the old
    flow and still works.
  - No save version bump.
- **Play statistics.** The opening events (Plan 104D) lose the `appoint`
  step. The dashboard's funnel is told in the PR description.
- **Tests:**
  - `opening.test.ts` 245, 280–293, 286, 414–427: the step list, the
    copy, and the banned words, which now apply to `found`.
  - `chapters.test.ts`: the founding chapter's objectives.
  - The harness's founding moves (`guided.ts:123`, `natural.ts:219`,
    `moves.ts`) stop hiring the founding three.
- **Balance moves:** three salaries from week 1. Re-measure with
  `npm run sim` and rebase `sim/baseline.json`. Founding cash moves to
  match if §3 Q1 says so.

### B — Chapter 8, and the drawer's buttons

*Notes 4, 5.*

- `MARKED_TABS` gains `'faculty'`. Chapter 8 becomes:
  - **Open the Faculty tab**, required.
  - **Every program staffed**, required.
  - Post a search, optional.
  - Appoint a professor who teaches at B or better, optional.

  The briefing's first door is the Faculty tab. The copy for the new
  objective goes in `chapterData.ts`, and the line asking for a search
  says it's one way to find a teacher.
- **The register covers the drawer's buttons.**
  - `.objectives-door` (Show me, Go, All milestones) becomes `.btn`, the
    cream pill. Its local rule keeps only `flex: none` and the small size.
  - `.objectives-back` and `.objectives-guide-link` become `.btn-quiet`.
  - `.tab-overlay-guide` joins `.tab-overlay-close`'s rules, so Guide
    and Close match side by side.
  - The leading "?" goes, or becomes the same `HelpHint` glyph the game
    uses elsewhere.
  - `docs/architecture/ui-shell.md`'s button table names them.
- **Tests:** `chapters.test.ts` 326/350 (objective lists), and the
  `tab-overlay-guide` assertion at 401 keeps its class.

### C — Curriculum rows open until they're done

*Note 6.*

- A program row's default fold becomes "every course developed"
  (`progress.done === progress.total`), so new and in-progress rows open.
- A school's default fold becomes "every program in it fully developed".
  It keeps today's `unstaffedHere === 0`, because a finished school with
  a course nobody teaches still needs the player.
- **The player's choice still wins**, through `useCollapse`'s overrides.
  There is one new rule: when a row *becomes* complete, its override is
  cleared and it folds. Finishing is news, and a row the player opened to
  watch it finish should close behind it. A row the player re-opens after
  that stays open.
- **The Curriculum's "Expand all / Fold all"**, if present, and App's
  `setCollapsed(program, false)` are unchanged.
- **Test:** the fold defaults per state, and an override surviving and
  then clearing on completion.

### D — Prestige at a glance

*Note 7.* This needs the owner's eye before code. §3 Q5 offers a mock-up
first.

The panel answers three questions, in this order, with one number each
and the rest drawn:

1. **Where is prestige, and where is it heading?** One track from 0 to
   150, with a marker at today's value and a ghost marker at the target.
   An arrow between them shows rising or falling. The figure is shown
   once, big. "Next summer: about +2" sits underneath.
2. **What is it made of?** One stacked bar showing the target's sum:
   - a grey baseline segment;
   - a segment per pillar in the pillar's colour, and the endowment's;
   - condition as a hatched bite off the end.

   Hover a segment for one sentence.
3. **Where's the room to grow?** Four pillar meters, each with its icon,
   name and a meter. The track's length is the pillar's weight, so
   Academics' is longest. The fill is how much of it the college has
   earned. The only number is the points earned, "+4.6". One line under
   the four names the pillar with the most room: "Most room to grow:
   Research".

Everything else goes into one **Details** disclosure, closed by default:
- the terms each pillar is made of;
- the summer note;
- the specialization line;
- the forecast;
- the endowment and condition sentences.

"Instruction capacity" leaves this panel. It isn't part of prestige, and
the Curriculum and Students tabs already talk about seats. The Standing
chapter's live readout (`ObjectivesPanel.tsx:33–56`) uses the same
meters, smaller.

- **Tests:** `standing-readings.test.ts` keeps reading
  `prestigeBreakdown`. The model is unchanged. Rendering tests check the
  three parts and that each pillar row shows one figure.

### E — Crowding goes

*Note 9.*

- **Out of prestige:**
  - The `crowding` penalty (`prestigeSystem.ts:643–649`) and
    `CROWDING_PENALTY` go.
  - `consequences.ts`' crowding projection goes.
  - The modal's "Crowding" figure and `crowdingSentence` go.
  - `HistoryTab`'s hint, `figureHints.ts` 25/59 and `chapterData.ts`
    100/117/170 go.
  - `docs/design/progression.md` §Prestige is updated.
- **Out of admissions (recommended, §3 Q3):** `crowdingPoolFactor` and
  the year-over-year "crowding eased/grew" label go. Satisfaction already
  shrinks the pool through word of mouth (`WORD_OF_MOUTH_STRENGTH`), so a
  campus that can't house or feed its students still hears about it,
  once.
- **Class seats join satisfaction (recommended, §3 Q4).** Seats aren't
  in satisfaction today. Without crowding, over-enrolling past the
  catalog would cost nothing but the services bill.
  - `instructionCoverage` becomes a term of the **academic** need, at
    the same curve as dining.
  - "What pulls satisfaction down" (Plan 104I) can then say "Class
    seats 71%".
- **What stays:**
  - `crowdingCoverages` and `CROWDING_GRACE`, renamed `needCoverages` and
    `NEED_GRACE`. NEXT's "Dining at 84%; a dining hall would raise it"
    and the harness's `relieveCrowding` still use them.
  - The accumulators `crowdingYearSum/Weeks` are dropped on load. Saves
    still carry the fields harmlessly, and `ReportCard.grades.crowding`
    on old cards is ignored.
- **Tests:**
  - `crowding-cost.test.ts` and `crowding-pool.test.ts` go.
  - `standing-readings.test.ts` 85–90 and 182–229 change.
  - `report-card.test.ts` 141, 145–155, 167, 185–215 change.
  - `plan96-fixes.test.ts:45` and `plain-words.test.ts` 69–82 change.
  - New tests: seats in academic satisfaction, and the
    pull-down list naming them.
- **Balance moves.** E and F are measured together (see F).

### F — Prestige that moves early

*Note 10.* It lands right after E, because removing crowding raises
every early target and the two are fitted once.

The aim is a college that starts low and rises every summer of its first
five years if the player is doing the obvious things. The rise should
show during the year, not only at the summer. The late game keeps
today's pace.

- **A lower start.** `startingReputation` goes from 40.5 to about 20,
  below the pillar baseline of 32, so the first target sits above it.
  `FOUNDING_ADMIT_PRESTIGE` already decouples the first class's admit
  rate from this. The year-2 pool reads the real prestige, so it is
  re-measured.
- **An easier climb low down.** The summer step's rise rate and cap
  scale with how low the stock is:
  - The rate is 0.45 and the cap +6 below 40.
  - Both taper linearly to today's 0.20 and +2.1 by 70.

  The fall rate is unchanged.
- **Movement you can see.** Part of the summer's rise becomes a weekly
  drift toward the target while the stock is below 70: about a third of
  the expected step, spread over the year. The header's arrow and
  StandingFigure move in the first year. The summer grade takes the rest,
  so the report card still matters.
- **Re-fit:**
  - `sim/pacing.ts` `CHECKPOINTS` and `WHEN` move for Y10. Y20 onward
    should land in today's bands, which is the check that the late game
    is untouched.
  - The specialization milestone timing comments (`prestigeSystem.ts`
    109–130) are re-checked.
  - `sim/baseline.json` is rebased.
  - `balance.test.ts:82` (42) and `report-card.test.ts` (rates) get the
    new values.
  - `docs/design/progression.md` loses its stale "founding's low
    fifties".
- **Numbers are a starting point.** The PR reports the first-five-year
  prestige curve from `npm run natural -- --pacing` for the owner to
  judge. See §3 Q6.

### G — Bugs: the admit rate, and things that open a week late

*Notes 8, 11.*

- **The admit rate.** One `effective = min(choice, maxAdmitRate)` feeds
  the label, the projection, the opening note and the commit. The state
  also opens at the clamped value.
  - The thumb's `max` and `value` use the same rounded max.
  - When the founding or last year's rate was clipped, the opening note
    says so: "Opens at 62%, the most the seats left will hold (the
    founding rate is 86%)."
  - Test: open with `payload.admitRate` above the cap. The label,
    projection and commit all read the cap. Dragging to max returns
    to it.
- **The reducer settles derived state after every player action.** A
  `settleDerived(s)` runs `tickLadder` and `unlockAvailable` at the end
  of every non-`TICK` action (after any `advanceClock`). It fixes the
  whole class of bug, not just these two:
  - The Students tab and `history.record` open on Y2W1, the moment the
    first class is set.
  - A venue is in the build menu as soon as the petition is granted.
  - Any other milestone reached by an action (a founded program, a
    built hall) opens on the spot too.
  - Both functions are idempotent, and `tickLadder` stamps `reachedWeek`
    with the clock it sees. Their notices (`ladder.unread`, the "now
    available" log line) are checked for duplicates. If one isn't safe to
    run per action, the PR falls back to calling it in the two actions
    named.
  - Tests:
    - After `RESOLVE_ADMISSIONS` the Students tab is available at Y2W1.
    - After the varsity petition's establish choice the venue's status is
      `available`.
    - A replay of the action log gives the same state.
- **Balance:** none, except unlocks landing a week earlier. `npm run sim`
  should read the same within noise.

### H — Say what "78" is

*Note 12.*

The number isn't wrong. It's the top band, `GRADE_A`. It reads as
arbitrary because nothing on screen says 78 is a line. Recommended (§3
Q7):

- The chip reads **Below top band**, with a swatch of the top band's
  colour (`ScoreMark`'s A hue) so it matches the course figures it
  filters. The title says "Courses scoring under 78, the top band, or
  unstaffed."
- Every literal "78" in copy reads from `GRADE_A`:
  - the chip;
  - the help text;
  - History's "Show the N courses below the top band";
  - the Dean of Academics' seat copy.
- **Test:** no player-facing string contains a literal grade threshold,
  checked against `GRADE_A`.

## 3. Decisions, settled by the owner (21 October)

| # | Question | Decided |
|---|---|---|
| 1 | Three salaries from week 1 cost the founding year roughly a full year of two extra professors. Should founding cash rise to cover it? | **Yes: raise `startingCash` by the first year of Iyer's and Okafor's pay**, so the opening's economy stays where Plan 95N set it. |
| 2 | Does the card move left only for "Raise Founders Hall", or for every walkthrough step? | **Only that step.** Once the hall is placed, its panel takes the top-left, 440px wide. |
| 3 | "Get rid of crowding altogether": does that include the applicant-pool penalty for an over-full campus? | **Yes.** Word of mouth from satisfaction already shrinks the pool. |
| 4 | Class seats aren't in satisfaction today. Add them to the academic need, so over-enrolling still costs something? | **Yes**, at the dining curve. |
| 5 | The prestige panel (D): mock up first, or build straight from §2 D? | **A mock-up first**, an artifact with two variants, as for the Curriculum in Plan 105. |
| 6 | How low should prestige start, and how fast should it rise early? | **Start ~20.** Every summer of years 1–5 should rise by 3–6 when the player does the chapters. Year 10 lands at the low edge of today's band, Year 20+ unchanged. |
| 7 | "Below 78" → which? (a) **Below top band** with a colour swatch; (b) **Weakest courses**, the bottom third; (c) a threshold the player sets. | **(a)**: one fixed line, named, the same colour as the numbers it filters. |

## Rules for every PR in this plan

- **Balance moves only in A, E and F,** each rebasing `sim/baseline.json`
  with the before and after in its description. B, C, D, G and H leave
  `npm run sim` reading the same.
- **No save version change.** Old saves load, with fields that are no
  longer read left in place.
- **Each PR runs `npm run check` and `npm run test:slow`,** and is checked
  in the browser at 1440 wide (A also at 1280×720, for the card's room
  between the pennant and the build menu).

## The map

| PR | Subject | Depends on |
|---|---|---|
| A | The first two steps, and three professors on the payroll | — |
| B | Chapter 8, and the drawer's buttons | — |
| C | Curriculum rows open until they're done | — |
| G | The admit rate, and things that open a week late | — |
| H | Say what "78" is | — |
| E | Crowding goes | — |
| F | Prestige that moves early | E (fitted together) |
| D | Prestige at a glance | E (no crowding row), Q5's mock-up |
