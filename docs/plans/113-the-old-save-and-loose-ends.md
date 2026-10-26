# Plan 113 — The old save, and loose ends

*The owner's choices on the third review's findings (23 October 2026),
the ones left after Plans 110–112: the 0.1.2 save that crashes 0.1.3
(I7-1), an old save on the appointing step (I7-4), the athletics stops
that come before their chapter (I7-2), the athletic director who
renames the teams (C3-10), the admissions note that still talks of
crowding (C3-8, I7-6), three harness gaps (I7-5a, I7-5b, I7-5c) and two
stale records (I7-7). The owner took the recommended fix on each.*

**Status: Landed on the branch (23 October 2026), A–F, shipped in
0.1.4 (26 October 2026).** The owner chose (b) on §2.1: no 0.1.3.1. On §2.2, Guided and the
Completionist appoint the Provost, as recommended.

---

## 0. What stands at f7b2091

- **I7-1, the crash (blocker).** A 0.1.1 or 0.1.2 save on `await-course`,
  `second-course`, `needs`, `site-housing` or `site-dining` crashes on
  Continue, every time. `sanitizeOpening` (`src/state/persistence.ts:1657-1663`)
  still carries only `appoint` to `found`. `OpeningCoach.tsx:33` takes
  `isCoachStage(stage) ? OPENING_STEPS[stage] : null`, and `isCoachStage`
  is `stage !== 'play'` (`openingData.ts:90`), so a retired stage gives
  `undefined` and `step.next` at `:39` throws before any TICK can run
  `settleOpening` (`state/opening.ts:108-110`). Slots (`state/slots.ts:105`)
  and "Load a save file" (`ImportSave.tsx:22`) read through the same
  `readSave`. `test/opening.test.ts:373-383` checks a TICK moves these
  stages on, but never renders the card after a load. 0.1.3 is live on
  itch.io, and 2 of 24 founded 0.1.2 runs stopped on `second-course`
  alone. Main already carries Plan 112, unreleased.
- **I7-4.** A 0.1.2 save on `appoint` loads onto `found` with `faculty: []`.
  `teachableOffers` (`openingData.ts:29-31`) is then empty, so the card
  picks "One is on offer in Founders Hall, and it already has a professor"
  (`:120`) over three offers and a market.
- **I7-2, what is left.** Plan 112B moved the tab, the chapter and the
  ladder's rung to the varsity petition (`state/chapters.ts:245-248`), and the
  AD offer needs a team (`eventSystem.ts:134`), so those now agree. Two stops
  still ignore the gates: `fireMascotBeat` (`eventSystem.ts:117`) fires on
  the first sport club, a year or two before *The teams*, and
  `fireVarsityPetition` (`:154`), a decision event, doesn't check
  `MATTERS_CHAPTER` as `fireTrusteeResponse` and `rollDecisionEvent` do
  (`:173`, `:195`).
- **C3-10.** `AthleticDirectorView` seeds `mascot` from
  `payload.mascotSuggestion` (`InterruptModal.tsx:674`), hides the field
  when a mascot exists (`:704`), and still passes it on every pick and on
  the decline (`:690`, `:720`). `RESOLVE_ATHLETIC_DIRECTOR` writes any
  non-empty mascot (`engine/reducer.ts:697-698`), and the default answer
  sends the suggestion too (`engine/defaultAnswers.ts:108`).
- **C3-8 and I7-6, one line.** `admitRateOpening`
  (`systems/admissions/yearOverYear.ts:88-95`) still appends "Next year's
  students already fill your N beds, so admitting more will crowd them."
  When the opening rate is capped by the room, it still names the founding
  rate even when both read 86%. Nothing on the page says what incoming
  quality feeds (academics' *Student quality* term,
  `prestigeSystem.ts:585`).
- **I7-5a.** No harness player opens a tab, so scenario saves sit on
  *Paying for it* ("Open the Treasury") at any year, and Guided opens its
  briefing over the map on Continue. The tools work around it by setting
  Objectives to Brief (`tools/keyboardCheck.mjs:44`, `touchCheck.mjs`,
  `review/shootViews.mjs`). The marks are `MARKED_TABS`
  (`state/chapters.ts:342`) and `readMark` (`:527`).
- **I7-5b.** `demand` (`tools/scenarios.ts:353-360`) never stops: Lean,
  Selective and Completionist reach year 30 with satisfaction never under
  60. A `mutate` can't help as it stands, since it runs after the run
  (`scenarios.ts:39`, `tools/scenario.ts:126`). `charter`'s description
  (`:364`) says "the week the first lab is at work", but its lab runs no
  project.
- **I7-5c.** No harness player fills a seat, so no scenario save has a
  Provost. 4× stays locked, `npm run profile` skips 4× (`tools/profile.mjs:107`),
  and *Running the college* is never done.
- **I7-7.** `docs/plans/089-the-administration.md:8` still reads "In progress:
  A–G open" (the README's row already says Landed).
  `docs/reviews/playtest-1/findings.md:562-563` still calls the stairs "Not
  yet traced in the code". Plan 99E fixed them in 0.1.1.

## 1. The PRs

| PR | Findings | What |
|---|---|---|
| A | I7-1 | A retired stage loads as `play`, and the card draws nothing for a stage it doesn't know. Shipped as 0.1.3.1 from the 0.1.3 merge, then merged into main. |
| B | I7-4 | The founding card counts the offers and asks for a professor when nobody is on the payroll. |
| C | I7-2, C3-10 | The mascot stop waits for *The teams*, the petition for *Campus life*; a named team keeps its name. |
| D | C3-8, I7-6 | The admit note loses the beds clause and the repeated rate; incoming quality says what it feeds. |
| E | I7-5a, I7-5b, I7-5c | Scenario saves carry the shell's marks; `demand` stops; the harness appoints a Provost. |
| F | I7-7 | Plan 89 reads Landed; the findings log points at 99E. |

A goes first and alone, because players are meeting it now. B reuses A's
fixtures. C and D are independent. E moves the harness's numbers (5c), so
it lands after the game changes and its report covers all of them. F is
docs.

### A. The old save opens (I7-1)

Written so the same commit applies to 0.1.3 and to main: it touches only
`persistence.ts` and `OpeningCoach.tsx`, which Plan 111 and 112 left
alone or nearly (`git diff b1f2114 f7b2091` shows five lines in
`OpeningCoach.tsx`, none near `:32-38`), and adds a new test file and
fixture rather than editing `test/opening.test.ts`, which has changed.

- `sanitizeOpening` carries every stage outside `welcome`, `site-hall`,
  `found` and `play` to `play`, as `settleOpening` does. Export
  `LIVE_STAGES` from `state/opening.ts:102` and read it in both, so the two
  can't drift. `appoint` still goes to `found`, first.
- `OpeningCoach` takes `OPENING_STEPS[stage] ?? null`, so an unknown stage
  renders nothing, and the hotkey guard reads `step?.next` like its handler.
- **Fixture.** `test/fixtures/save-v103-walkthrough.json`: the review's
  `data/c7-v012-needs-save.json`, made by 0.1.2's own reducer (`4f5b83e`).
- **Test**, `test/old-walkthrough-saves.test.ts`. For each of the five
  retired stages: write the stage into the fixture's raw text, `readSave`
  it, assert the stage is `play`, render `OpeningCoach` with
  `renderToStaticMarkup` (as `test/admissions-page.test.ts:79` renders the
  modal) and assert it renders without throwing, then play four TICKs. A
  forged stage the game never had renders nothing. `welcome`, `site-hall`
  and `found` still draw their cards.
- **By hand**, on `npm run build` and `npm run preview`: the fixture as the
  autosave, through a slot, and through "Load a save file", each to
  Continue and a few weeks of play.

**Shipping** (see §2.1): a `release/0.1.3.1` branch from `b1f2114`, the fix
commit, then a second commit with the version (`unischool/package.json:4`,
`package-lock.json`) and a short `## 0.1.3.1` entry at the top of
`docs/store/changelog.md` ("A run saved on one of 0.1.2's walkthrough
steps no longer stops the game on Continue."). `npm run check`,
`npm run build:itch`, upload. Then merge the branch into main: the
conflicts are the version line and the changelog's head, and main keeps
0.1.3.1 until 0.1.4 sets its own.

**As implemented:** the fix was cherry-picked onto `b1f2114` cleanly, and
a 0.1.3.1 build was made and checked there. It passed `npm run check`, and
the itch build loaded the 0.1.2 save. The version check
(`test/production-build.test.ts`) needed a fourth number allowed. Then the
owner chose (b), that no patch ships: the fix goes out with 0.1.4. The
version, the changelog entry and the version check's change were taken
back out on this branch.

### B. The old appointing step (I7-4)

- In the `found` body (`openingData.ts:117-121`): when `teachableOffers`
  is empty and `s.programOffers` isn't, count `programOffers` and say so,
  in plain words: "Three are on offer in Founders Hall. Click the ringed
  slot, pick one, appoint its professor, and click Found." A new game,
  with the founding faculty, reads as now.
- The copy, not the payroll: putting the founding three on an old save's
  payroll would change its money and roster mid-run. The card is the only
  thing wrong.
- **Fixture**, `test/fixtures/save-v103-appoint.json`, made by the review's
  generator (`data/c7-old-saves-script.ts.txt`) against a `git archive` of
  `4f5b83e`. **Test** in A's file: it loads onto `found`, the card counts
  three and asks for a professor; a fresh founding still says each has
  one. `npm run review:plain` passes.

### C. Athletics in its chapter, and one mascot (I7-2, C3-10)

- `fireMascotBeat` (`eventSystem.ts:117`) returns early, keeping
  `mascotBeatPending`, while `chapterGateOpen(s, ATHLETICS_CHAPTER)` is
  false. The stop then comes on the first quiet week after *The teams*
  opens, which is the petition's week, accepted or declined.
- `fireVarsityPetition` (`:154`) checks `chapterGateOpen(s,
  MATTERS_CHAPTER)`, as `:173` and `:195` do. *The teams* opens on the
  petition, so the chapter, the tab, the mascot stop and the AD offer all
  follow *Campus life* in that order. `fireAthleticDirectorOffer` needs no
  gate: it waits for a team, and a team comes only from the petition.
- `RESOLVE_ATHLETIC_DIRECTOR` (`reducer.ts:697-698`) writes the mascot only
  when `s.self.mascot` is empty, and the log names it only when written.
  That covers the default answer (`defaultAnswers.ts:108`) too.
  `AthleticDirectorView` passes `''` when a mascot exists (`InterruptModal.tsx:690`,
  `:720`), so the view sends what it shows.
- **Tests.** In `test/chapters.test.ts`, the gated year-3 block (`:349-365`)
  gains a sport club past `VARSITY_PETITION_MIN_TENURE_YEARS`. With
  *Campus life* shut, 104 weeks bring no petition and no mascot stop.
  Check `varsityAsked` and the interrupts seen, not `decisionHistory`,
  which the petition never stamps. Opened, the petition comes, then the
  mascot stop. In `test/athletic-director.test.ts`: teams named Bulldogs
  stay Bulldogs through a pick sent with "Miners", and the log doesn't name
  Miners; with no mascot, the pick still names them.
- **Harness.** Headless runs aren't gated (`gates.ts:23-30`), so
  `npm run guided` and `npm run sim` should print the same numbers. Run
  both to show it. The review's "re-run the guided sim" applies to a
  gated run, which the chapters test now covers.

### D. The admit note (C3-8, I7-6)

- `admitRateOpening` drops the beds clause. The panel's own row already
  shows the tightest need (`AdmissionsPage.tsx:502-506`), and it is often
  dining. The `beds` and `studentsNextYear` parameters go, and the call at
  `AdmissionsPage.tsx:480` with them.
- When the rate is capped by the room and both rates show the same
  percentage, the second sentence ("The founding rate was 86%.") goes.
- Under *Incoming quality* (`AdmissionsPage.tsx:472`), a `sub` line as
  *Freshman class* has: "Part of your academics score." It is short like
  that slot's other line ("of 350 places"), and it uses the pillar's name
  from the History tab.
- **Tests.** `test/plain-words.test.ts:82-87`: the two bed cases go; new
  cases for the equal rates and for a capped rate that differs.
  `test/admissions-page.test.ts` checks the quality line renders.
  `npm run review:plain`.

### E. The harness: marks, `demand`, a Provost (I7-5a, b, c)

- **5a.** `tools/scenario.ts`, after the run and any `mutate`, sends
  `MARK_GUIDANCE` through `game.act` for every mark a chapter reads from
  the shell: the four `MARKED_TABS`, `LOOK_MARKS` and `DOUBLE_SPEED_MARK`.
  Then it sends `readMark` for every opened chapter, repeating until a
  settle opens nothing new. A save then sits where a player who opened
  the tabs would be, with no briefing waiting to open. The Brief
  workaround in the three tools stays, as a guard, with its comment
  updated. Check: `npm run scenario -- year-8-balanced` writes a save past
  *Paying for it*; `keyboardCheck.mjs`, `touchCheck.mjs` and
  `review:views` pass.
- **5b.** `Scenario` gains `breakAt?: { year: number; apply: (s) => void }`.
  `scenario.ts` plays to that year, applies it, and plays on
  (`playUntil` counts years from where it stands, `sim/harness/game.ts:178`).
  `demand` drops satisfaction to 55 at year 8, with its year sum as
  `intoCrisis` sets it (`scenarios.ts:67-68`). `charter` reads "the week
  the first lab stands". Check: `npm run scenario -- demand` stops with a
  demand on the clock, well before year 30.
- **5c.** A move in `sim/harness/moves.ts` appoints a Provost from outside
  (`APPOINT_SEAT`, `seatId: 'provost'`, `school: null`) once `canAppoint`
  (`systems/delegation/seats.ts:63`) allows and the week's net still
  covers the $320k salary (`data/seatData.ts:51`) with the player's
  reserve. The Guided player calls it, and so does the Completionist,
  whose year-40 save is the one `npm run profile` documents
  (`tools/profile.mjs:8`). Policy stays the seat's default.
- **5c moves the numbers.** The salary and the Provost's answers change
  the guided and Completionist runs. Report before and after:
  `npm run guided`, `npm run sim`, `npm run natural -- --pacing`.
  `npm run test:slow` (`guided`, `archetypes`) must pass. The numbers are
  reported, not gated (Plan 56). Then `npm run profile` on a year-40 save
  samples 4×.

**As implemented (E):**
- The marks are made by `markAsPlayed` in `tools/scenario.ts`, after the
  run and before `mutate`. A year-8 save then sits on *The teams*, with
  every page read. On the Guided setting it opens with no drawer over the
  map. `keyboardCheck`, `touchCheck` and `review:views` passed on it.
- `demand` stops at Year 8, week 3. `intoUnrest` sits in `scenarios.ts`
  beside `intoCrisis`.
- The Provost comes from year 5 (`PROVOST_FROM_YEAR`), once the week's net
  pays the salary.
- **Before and after**, from `f7b2091` to A–E, three seeds each:
  - Selective, Lean and Idle didn't move at all. That also shows C changes
    nothing in a headless run.
  - The guided runs finish #1 at Year 50 on two seeds of three, against
    one before.
  - Guided in `npm run sim`: Year 50 rank 2 → 1, prestige 113.2 → 114.8,
    cash $2.26B → $1.24B.
  - Completionist: Year 50 rank 4 → 1. Its Year 50 cash goes from $127M to
    $3.2B. This is late money (C4-5), which the owner chose to leave.
  - The pacing scorecard's guided line: both prestige rows move into their
    bands (Y23 → Y24, Y39 → Y40). "Programs: 90% founded" moves out of its
    band (Y32 → Y33).
  - `npm run test:slow` passes.

### F. The records (I7-7)

- `docs/plans/089-the-administration.md:8`: **Status: Landed.**
- `docs/reviews/playtest-1/findings.md:562-563`: "Traced and fixed by
  Plan 99E (13 October), shipped in 0.1.1."

## 2. Decisions to take

1. **How the crash fix ships.** (a) 0.1.3.1, from the 0.1.3 merge
   `b1f2114`, with PR A alone, then merged into main. (b) 0.1.4 now,
   carrying all of Plan 112. **Recommended: (a).** Players are on 0.1.3
   today. Plan 112 changed the drawer, the summer and athletics, and
   hasn't been played outside the harness, so it shouldn't be rushed out
   to fix a crash. The patch is two source files and a test. npm accepts a
   four-part version for a private package, and the itch zip takes its
   name from it (`tools/buildItch.mjs:34`, `:107`).
2. **Which harness players fill a seat (5c).** **Recommended: Guided and
   the Completionist, a Provost only, from outside.** Guided is the one
   the review named. The Completionist makes the late saves `profile`
   samples. Lean, Selective and Idle stay as they are, so the archetypes
   still show a college that never delegates.

## 3. What this plan does not do

- **C3-1**, a real player who never opens the Treasury staying on
  Chapter 5: the owner chose to leave it. PR E fixes only the harness's
  saves.
- **C3-7** (the chair's letters beside the chapter), **C3-3**, **C3-4**,
  **C3-6**; **C1-5**; **C2-5**, **C2-10**; **C4-1, C4-2, C4-3, C4-5,
  C4-7, C4-8, C4-9, C4-10, C4-11, C4-12**; **C6-6**, **C6-10**: the owner
  chose to do nothing.
- **C2-1** and **C2-3** were left to Plan 112. **C2-8**, **I7-3**,
  **I7-5d** and **I7-5e** are already fixed.
- No guard against a confirmed slot load overwriting the live autosave
  (I7-1's second way in). The load was confirmed, and with A the old run
  plays on.
- I7-2's other line, the letter and drawer saying "opens with *The
  teams*", needs nothing now: since 112B the rung, the tab and the chapter
  open together.
