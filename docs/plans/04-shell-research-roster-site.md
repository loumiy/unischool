# Plan 04 — The shell, research, the roster, and the site

*Planning document only — no gameplay code is changed by this file. Its job is
to take a page of playtest notes and turn it into an ordered sequence of PRs,
each one small enough to land on its own and each one landing in the order that
makes the next one cheaper.*

**Status: Landed.** Four phases, 23 PRs, plus a
named set of deferred directions at the end. Phase 1 (the shell — 1A through
1F), Phase 2 (research, end to end — 2A through 2G), Phase 3 (the roster —
3A through 3E) and Phase 4 (campus art — 4A through 4E) are implemented. Their
PRs are described below as they were
planned, with the places the implementation departed from the plan noted in the
PR that departed: 1E, where `:focus-visible` turned out to be half an answer;
2A, where narrowing each facility's topic pool put more of the catalogue out of
reach than the plan estimated; 2B, which needed a per-topic facility list to
finish the job 2A started; 2F, where reporting every completion cost more of the
modal budget than the cadence allows; 3C, where softening the overload
penalty moved the balance harness's own horizon; 4A, where the new footprints
turned two snapshot-shaped balance assertions red while the schools they
measured were healthier; 4C, where the multi-sport field needed no work of its
own because 4B had already covered it; and 4E, where the spec test's cap on
wall materials had to move to admit the dorms' own brick.

---

## 0. The shape of the notes, and why the order is what it is

The notes read as a list of unrelated fixes. They are not. Sorted by what they
actually touch, they collapse into four groups, and three of the four have a
hard dependency on the group before it.

**The finding that sets the order:** almost every UI note in the list is
downstream of one decision the shell has not yet made — *is a tab a sheet
floating over the map, or is it a screen?* Today it is both (`App.tsx`'s
`FULL_BLEED_TABS` names two tabs; the other six are sheets), and that fork is
what produces four separate complaints:

- the Faculty tab "should be full screen the way we did with curriculum",
- build mode "should never be overlaid on another tab",
- Space "closes the tab instead of pausing" — because the tab you clicked to
  open still holds DOM focus and answers Space itself,
- and the tab re-order, the home button, and the progressive reveal all need
  one authoritative list of what a tab *is* before they can be written once.

So the shell goes first, and it goes first as a *small* phase — nothing in it
touches a system, and the Faculty rework in Phase 3 is maybe half the size once
it lands on a shell that already gives it a full screen.

Second is scholarship, because two of its changes (a research commitment costing
two course slots instead of a whole career; auto-reassignment of orphaned
courses) change what the Faculty and Curriculum tabs have to *display*. Doing
the tabs first would mean designing the roster view against slot arithmetic that
is about to change.

Third is faculty and curriculum, which is where the biggest single UI rewrite
lives, and which wants both of the above already in place.

Fourth is the campus art, which is genuinely independent of all three — it could
run in parallel with any of them, and it is last only because nothing else waits
on it.

### The map, by group

| Note | Touches | Phase |
|---|---|---|
| Satisfaction detail goes full width | `styles.css` one rule | 1 |
| Pause/speed change resets the week clock | `useGame.ts`, `DayTicker.tsx` | 1 |
| All tabs full screen; home button; re-order | `App.tsx`, `TabNav.tsx`, `Toolbar.tsx` | 1 |
| Build ↔ tab mutual exclusion | `App.tsx`, `Toolbar.tsx` | 1 |
| Space always pauses; Esc closes | `StatusHeader.tsx`, `hotkeys.ts` | 1 |
| Hide Research / Athletics / History until usable | `TabNav.tsx` | 1 |
| Research icon: lamp → microscope; "scholarship" retired | `icons.tsx`, `TabNav.tsx` | 1 |
| Admissions log comma inconsistency | `reducer.ts` one line | 1 |
| Projects not linked to their lab | `researchData.ts`, `ResearchTab.tsx` | 2 |
| Far more authored research topics | `researchTopics.ts` | 2 |
| Research costs 2 slots, not a whole load | `techSystem.ts`, `reducer.ts` | 2 |
| Auto-reassign courses research orphans | `reducer.ts` | 2 |
| Research funding too expensive | `researchData.ts` | 2 |
| Research completion interrupt; prizes folded in | `researchSystem.ts`, `InterruptModal.tsx` | 2 |
| Visiting chairs hired from the interrupt | `eventData.ts` | 2 |
| Faculty tab rebuilt as a roster by field | `FacultyTab.tsx`, `Toolbar.tsx` | 3 |
| Curriculum: yellow vs red gate dot | `CurriculumTab.tsx` | 3 |
| Soften the overload penalty | `courseQuality.ts` | 3 |
| "Develop All" ships | `CurriculumTab.tsx` | 3 |
| Hall info panel: grade + jump to courses | `BuildingInfoPanel.tsx` | 3 |
| Odd footprints; Founders Hall on the Quad's axis | `campusMap.ts` | 4 |
| Open ground under construction | `buildingMotifs.tsx`, `CampusMap.tsx` | 4 |
| Diamond redesign; field construction motif | `groundMarkings.tsx` | 4 |
| Library keeps its floors while renovating | `reducer.ts`, `satisfactionSystem.ts`, motifs | 4 |
| Dorm walls; tennis courts; Greek letters | `buildingMotifs.tsx`, `studentLifeData.ts` | 4 |

---

## Decisions — all six settled

Answered before implementation. The reasoning is kept because each one is a
constraint later PRs are written against, not just a preference.

1. **What is the Research tab called?** (1C.) **RESOLVED → "Research"
   everywhere; the word "scholarship" is dropped from the research system.**
   The code already calls the system `research` throughout, and the label now
   matches it. This is slightly more than a `TAB_LABELS` entry: `FacultyTab.tsx`
   heads its research panel "Scholarship", `ResearchTab.tsx` uses the word in
   its copy, and `icons.tsx`, `researchSystem.ts` and `prestigeSystem.ts` all
   carry it in comments. All of it becomes "research" — see 1C for the sweep.

   **The one place "scholarship" stays** is `admissions.scholarshipRate` and the
   admissions interrupt's "Scholarships" slider. That is tuition discounting —
   a genuinely different thing that the word genuinely means, deliberately named
   in the alignment roadmap's PR C, and no longer colliding with anything once
   research stops borrowing it.

2. **When the clock is paused mid-week, what is preserved?** (1B.)
   **RESOLVED → the elapsed *fraction* of the week.** Day 5 stays day 5 at any
   speed, rather than 5/7 of a 5000ms week becoming 1.4 days on a switch to
   2500ms/week. It is what "day 5 of week 3" means to the player, and it makes a
   speed change free rather than a thing to do at a week boundary.

3. **How do grants appear on a weekly income statement?** (Was 2G.)
   **RESOLVED → they do not. The PR is dropped and the Treasury tab is left as
   it is.** A grant is an episodic lump into `finance.cash`, not a weekly flow,
   so every way of putting it on a weekly statement is a compromise: a spot line
   reads $0 for months and then $8m once, and a trailing average reports money
   that has already been spent as though it were income to plan against. The
   lifetime total and count already live in the Treasury tab's research block,
   and each grant already logs when it lands — which is the honest reporting.
   Phase 2 is seven PRs, not eight.

4. **Do footprint changes apply to existing saves?** (4A.) **RESOLVED → new
   games only, no migration.** A `Placement` stores the footprint it was made
   with, so shrinking `SCHOOL_BUILDING_FOOTPRINT` changes only new placements;
   existing campuses keep their 8×6 halls, and Founders Hall — pre-placed at
   founding — keeps its even width forever in an old save. Re-footprinting a
   placed building can collide with whatever was built next to it, and there is
   no good automatic answer to that collision.

5. **What should a Landmark Program actually cost?** (2E.) **RESOLVED → 4 weeks
   of operating expense**, with the lower tiers pulled down proportionally — the
   ladder in 2E is adopted as written. That is ~$115m at the scale the note
   reports, against a grant yield up to ~$50m: still firmly negative on direct
   ROI, which the note explicitly allows.

6. **Does "Develop All" stay unlimited once it ships?** (3D.) **RESOLVED →
   unlimited and unchanged.** It already routes through `canStartDevelopment`,
   so it cannot start anything unaffordable, unstaffable or unrevealed. The
   faculty-slot gate is the real throttle; adding a second one would be
   inventing a constraint the game does not otherwise have.

---

# PHASE 1 — The shell

*Six PRs, none of which touches a system. Everything here is navigation, keys,
and the clock. The phase exists to give Phase 3 a screen to build on.*

## PR 1A — Three paper cuts

Unrelated to each other, and none worth its own PR.

- **Satisfaction detail no longer takes the row.** `styles.css`'s
  `.satisfaction-card.open { grid-column: 1 / -1; }` is the whole of the
  behaviour the note describes. Delete the rule; the open card then grows in
  height within its own column, which is what `grid-auto-flow: row dense` on
  `.satisfaction-cards` is already set up to absorb.
- **The admissions log separator.** `reducer.ts:639` reads
  `${outcome.enrolled} freshmen enrolled, ${graduating.toLocaleString()} graduated`
  — one of the two is formatted. Give `outcome.enrolled` the same
  `toLocaleString()`.
- **The Research icon is a microscope.** `icons.tsx`'s `ResearchIcon` is a
  lamp (its own comment explains the reasoning: a flask reads as "lab" and four
  research facilities are not labs). The note overrules that; draw a microscope
  — arm, stage, eyepiece — in the same 24×24 stroke vocabulary as its neighbours,
  and update the comment so the next reader does not re-derive the lamp. The
  comment also opens with the word "Scholarship", which decision 1 retires; 1C
  does the rest of that sweep, but this one line is here anyway.

**Verification:** by eye. Nothing here has a testable invariant.

## PR 1B — The clock survives a pause

**The bug.** `useGame.ts`'s tick effect is `setInterval(SPEEDS[speed])` keyed on
`[speed, started, interrupted]`. Any change to any of those tears the interval
down and builds a fresh one, discarding however much of the current week had
already elapsed — so pausing on day 5 of week 3 and resuming starts week 3 over.
`DayTicker.tsx` has the same structure independently (its `startRef` resets in an
effect keyed on `[ticking, speed, weekKey]`), so the visible day squares reset
too, which is how the note noticed.

**The fix.** Replace the interval-per-speed with an accumulator that survives
speed changes:

- `useGame` keeps `weekProgressRef` (0..1, how far through the current week we
  are) and a `lastSampleRef` timestamp. One interval at a fixed short cadence
  (or `requestAnimationFrame`) adds `delta / SPEEDS[speed]` to the progress, and
  dispatches `TICK` when it crosses 1, carrying the remainder forward.
- Pausing stops sampling and leaves the progress where it is. Changing speed
  keeps the progress and changes only the rate it accrues at — which is
  decision 2's "preserve the fraction".
- `useGame` returns `weekProgress` (a ref or a getter, not state — this must not
  re-render the app several times a second). `DayTicker` reads it on its existing
  150ms poll and deletes its own timing entirely.

**Deliberately not in scope:** making the sim itself run on days. The note says
weekly ticks are fine if per-day ticking is significant rewiring, and it is —
every system is a `(state) => void` week function and `WEEKS_PER_YEAR` is load-
bearing throughout. The day squares stay what they already are: a cosmetic
interpolation between two week ticks, now an honest one.

**Test:** `test/` gets a small pure test of the accumulator — feed it a sequence
of (delta, speed) pairs across a speed change and assert both the tick count and
the carried remainder.

## PR 1C — Every tab is a screen, in one order, with a way home

**Full bleed everywhere.** `App.tsx`'s `FULL_BLEED_TABS` goes away and
`TabOverlay` always renders the full-bleed shape. `TabOverlay`'s sheet mode — the
backdrop, the click-to-dismiss, the `mode` string — goes with it, along with the
CSS that draws it. The tab components themselves know nothing about the frame
and do not change.

The module comment in `App.tsx` currently argues *for* the split ("Treasury,
Admissions and History are read-and-leave pages where a full screen would only
make a short page look empty"). That argument loses to the one the notes make —
a consistent shell is worth more than a per-tab fit — and the comment should be
rewritten to say so rather than deleted, so the reasoning is not re-litigated.

**A home button.** A new leading button in `Toolbar`'s icon row that sets
`overlay` to `null`. It is the only toolbar control that is *not* a `TabId`,
alongside Build, and both should be modelled that way rather than smuggled into
`TabId`.

**The order.** `TabNav.tsx`'s `TABS` is re-sorted to the notes' order, and the
toolbar renders: `home · curriculum · faculty · research · student life ·
athletics · admissions · history · build`. Treasury is deliberately absent from
that row — it already has a permanent entry point in the funds figure at the
left of the toolbar (`StatusHeader.tsx`'s `FundsAndStats`), which is also why the
notes' list omits it. `ICON_TAB_ORDER` keeps filtering it out.

**The naming sweep** decision 1 settles lands here, since this PR is already
rewriting the tab metadata. "Scholarship" is retired as a name for the research
system wherever a player can read it or a developer can be misled by it:
`TAB_LABELS.research` is "Research"; `FacultyTab.tsx`'s `<h2>Scholarship</h2>`
becomes "Research" (and is then deleted outright by 3A, which folds that panel
into the roster cards — so this is a one-line stopgap, not wasted work);
`ResearchTab.tsx`'s copy follows; and the comments in `icons.tsx`,
`researchSystem.ts`, `researchData.ts` and `prestigeSystem.ts` that call the
system "scholarship" are corrected as they are touched.

`admissions.scholarshipRate` and the admissions interrupt's "Scholarships"
slider are **not** in the sweep — that is tuition discounting, which is what the
word actually means there. Grep for `scholarship` before finishing this PR and
confirm every surviving hit is on the admissions side.

**Also here:** the `TAB_HOTKEYS` map (C/F/L) keeps working unchanged, and the
help text in `CampusMap.tsx` that enumerates the keys gets its one-line update.

## PR 1D — Build and a tab are the same slot

Build mode only means anything while you are looking at the map, so the two
states are mutually exclusive by construction:

- `buildOpen` moves out of `Toolbar`'s local state and up to `App`, next to
  `overlay`, which is the nearest common ancestor and already owns `placingId`
  and `pathTool` for the same reason.
- Opening the build popup sets `overlay` to `null`. Opening any tab closes the
  build popup — and drops whatever path tool or placement it had armed, exactly
  as `Toolbar`'s existing `closeBuild()` already does.
- Clicking Build from inside a tab therefore reads as one action: the tab closes,
  the map is there, the build menu is open over it. That is the note verbatim.

The rule is worth stating once in `App.tsx`'s module comment beside the existing
"only one of build-pickup and path-tool is ever live" rule, since it is the same
kind of invariant one layer up.

## PR 1E — Space always pauses; Escape always backs out

**The bug.** `StatusHeader.tsx`'s Space handler defers to
`isActivationTarget(e.target)` — true for any focused `<button>` — so that a
Tab-focused button's native Space activation is not doubled. But a button that
was *clicked* is also focused, so after clicking a tab icon, Space re-clicks that
icon and closes the tab. The guard is right about keyboard focus and wrong about
mouse focus, and it cannot tell them apart because it is not asking.

**The fix.** Ask. `isActivationTarget` becomes a check on `:focus-visible`:

```
el.matches(':focus-visible')
```

which is exactly the browser's own "this element is focused *and* the user is
driving by keyboard" heuristic. A keyboard user tabbing to the Play button still
gets native Space activation; a mouse user who clicked a tab gets the pause. The
same narrowing applies to Enter in `InterruptModal`.

**As implemented: `:focus-visible` is half of it.** Probed directly in
Chromium, an already-focused button flips to `:focus-visible` on the FIRST
keypress after a mouse click — and that keypress is the Space being
arbitrated, so `matches(':focus-visible')` reads true inside the very handler
that needs it to read false. The browser's heuristic cannot answer a question
asked during the key it is about. So `hotkeys.ts` also tracks the input
modality itself, settled BEFORE the key by the interaction that chose the
device: a pointer press means mouse, `Tab` means keyboard, and neither Space
and Enter (the keys under arbitration) nor the arrows (they pan the campus)
get a vote. `isActivationTarget` requires the modality AND `:focus-visible`,
so it never claims a native activation the browser will not perform.

**Escape.** One ladder, top down: an open build popup closes first, then an open
tab, then the map's own back-out (drop a path tool, drop a placement). Today
`TabOverlay` and `CampusMap` each bind Escape and `App` arbitrates by disabling
the map's hotkeys whenever an overlay is open — which is correct as far as it
goes but does not cover the build popup, now that 1D has lifted it to `App`.
Fold the arbitration into one handler in `App` rather than three components each
guessing.

## PR 1F — A tab appears when it becomes usable

Replace `TabNav.tsx`'s (currently empty) `HIDDEN_TABS` constant with a predicate,
since every one of these gates reads game state:

```
tabAvailable(s, id): boolean
```

- `research` — any facility with `facilityType === 'lab'` at status `done`. This
  is the same gate research itself hangs off (`researchData.ts`'s
  "no lab, no research"), so it is a reuse, not a second rule.
- `athletics` — `s.orgs.teams.length > 0`.
- `history` — `s.clock.year >= 2`.
- everything else — always.

`Toolbar` filters its icon row through it, `App` refuses to open an unavailable
tab (so a stale `overlay` or a hotkey cannot route to one), and `TAB_HOTKEYS`
respects it for the same reason.

**Worth adding while here:** when a gate first opens, a log line
("The Research view is now available") — a tab that silently appears in a
nine-icon row is a tab nobody notices. `s.seen` already exists for exactly this
kind of first-time bookkeeping.

**Test:** the predicate, against a fresh state and a state with one lab / one
team / year 2.

---

# PHASE 2 — Research, end to end

*Seven PRs. This is where the notes are densest, and they describe one coherent
complaint: research costs too much, resolves invisibly, and does not appear to
know where it is happening.*

## PR 2A — A project belongs to its lab

**The bug the note found.** "Acoustics of Performance Spaces in the Aerospace
Engineering Lab." The lab is the slot — `research.initiatives` is keyed by
facility id, which is a good invariant — but the *topic pool* is not the lab's.
`ResearchTab.tsx:284` hands every lab in a school the same `school.fields`, and
`initiativeOffers` then keeps any topic where **some** field overlaps that whole
school-wide set. A school with a dozen labs offers each of them the same pool.

**The fix.**

- A lab knows its own field. The lab ids are derived per lab-gated major
  (`techData.ts`'s `labId(major.prefix)`), so the mapping already exists —
  surface it as `labFields(labId): string[]` beside `facilitySchool`.
- `initiativeOffers` takes the *lab's* fields and requires the lab's field to be
  **among** `topic.fields`, not merely overlapping the school's. A cross-
  disciplinary topic is then offerable in either of the labs it names, and in no
  others.
- `facilitySchool` stays as it is — it answers a different question (which
  discipline's vocabulary the log lines use) and answers it correctly.

**Test:** for every lab and every depth tier, assert that every offered topic
names that lab's field.

**As implemented: the narrowing costs more than this estimates.** Only 11 of
the 29 faculty fields have a facility, so requiring the lab's own field put 42
of the catalogue's 76 topics out of reach at once — every departmental topic in
the other 18 fields, plus six interdisciplinary ones that named no equipped
field at all. 2B absorbs that (six per field, and every interdisciplinary topic
re-anchored on a field that has a facility), and the route into research for an
unequipped department is the interdisciplinary tier rather than a topic of its
own.

## PR 2B — Enough topics that they stop repeating

`researchTopics.ts` holds 60 single-field topics (exactly two per field) and 18
cross-disciplinary ones. With one offer per depth tier per lab, on a fixed
6-month epoch, a mature campus sees the same four names constantly — which is
the note's "a lot of repeat research project names".

2A makes this *worse* before it makes it better: narrowing each lab's pool from
its school's fields to its own field cuts a typical pool from dozens to two. So
this PR is not optional polish, it is the other half of 2A.

**Target: six per field** (60 → ~180) **and ~50 cross-disciplinary** (18 → 50).
That takes a lab's single-field pool from 2 to 6 and gives the cross-
disciplinary tiers real variety. Pure authoring — no engine change, no save
concern, and the file's existing two-table shape absorbs it unchanged.

**Test:** every field in `FACULTY_FIELDS` has at least six topics; every field
named by a cross-disciplinary topic is a real field; no duplicate ids; no
duplicate names.

**As implemented: one mechanism came with the authoring.** Two pairs of
facilities share a field — chemistry / chemical engineering, and physics /
aerospace — so 2A's rule alone still offers "Acoustics of Performance Spaces"
to an aerospace lab, which is the complaint that started the pass. A topic may
now name the facilities it belongs in (`ResearchTopic.labs`), set only for
those twins and exhaustive when set. Final counts: 238 topics, 176
departmental (eight for each of the two split fields) and 62
interdisciplinary.

## PR 2C — A research commitment costs two courses, not a career

**Today.** `techSystem.ts`'s `effectiveCourseSlots` returns **0** for anyone
committed to an initiative, and `reducer.ts`'s `START_INITIATIVE` deletes *every*
`courseFaculty` entry naming a team member. A five-year Landmark Program
therefore strips four professors' entire teaching capacity and orphans every
course they held.

That was a deliberate design choice — the module comment calls it "the keystone
constraint … an initiative is paid for twice" — and the note overrules it. The
constraint survives, just priced at two slots instead of all of them.

**The change.**

```
RESEARCH_COMMITMENT_SLOTS = 2
effectiveCourseSlots(s, f) = isCommitted(s, f.id)
  ? Math.max(0, f.courseSlots - RESEARCH_COMMITMENT_SLOTS)
  : f.courseSlots
```

Every capacity read already routes through this one function, which is why the
change is one expression.

**And the orphaning follows it.** `START_INITIATIVE` currently orphans
unconditionally. It should orphan only the *excess* — the courses beyond the
committed member's new effective slot count — and pick which ones deterministically
(lowest tier first, so a star keeps the capstone).

## PR 2D — And it auto-covers what it can

The note: "when assigning research leaves a course without a professor, if
another professor is already staffed and available, auto-assign them."

For each course 2C orphans, before leaving it unstaffed, run the same
`eligibleInstructors(s, course)` the Curriculum tab's assignment panel uses and
take its first entry if there is one — that list is already sorted
strongest-teacher-first and already filtered on `hasFreeSlot`, so this is a reuse
of the existing auto-pick rather than a second assignment rule.

The log line then reports honestly: how many courses were re-covered, and how
many are genuinely without an instructor. Those are different facts and the
player can act on each.

**Test:** commit a 3-slot professor teaching 3 courses with one idle colleague in
field; assert one course stays with them, one moves to the colleague, one is
unstaffed.

## PR 2E — Funding a school can afford

`INITIATIVE_DEPTHS.fundingWeeks` is denominated in weeks of operating expense,
which is the right scaling device (it holds across four orders of magnitude of
budget) — the ladder on it is simply too steep. Proposed:

| Depth | Today | Proposed |
|---|---|---|
| Pilot Study | 0.5 | 0.4 |
| Funded Project | 1.6 | 1.0 |
| Major Program | 4 | 2.2 |
| Landmark Program | 9 | 4.0 |

At the scale the note reports ($260m ≈ 9 weeks), Landmark lands near $115m
against a grant yield up to ~$50m. That is still firmly negative on direct ROI,
which the note explicitly allows — prestige, breakthroughs and the award are
what pay for the rest.

**Tune this together with 2C, not after it.** 2C already cut the *real* price of
an initiative (the teaching load), and these two compound. Run `npm run sim` on
the pair and check that a mid-game school can run two or three projects without
the catalogue visibly degrading — if it can run eight, the money came down too
far.

## PR 2F — Research ends with a report, and the prize is part of it

**Today** a five-year program concludes into a *log line*, and the prize — if one
is won — arrives later as its own `research-prize` interrupt via
`s.research.pendingPrizes`. So the modal that stops the clock is the one for the
trophy, and the work itself passes silently. The note asks for the inverse, and
is right: the completion is the event, and the prize is one of its results.

**The change.**

- A new interrupt kind, `research-complete`, queued from `concludeInitiative`
  exactly as prizes are queued today, and for the same stated reason (the week a
  project ends may already belong to summer admissions or the U.S. News report;
  only one interrupt is pending at a time). The queue mechanism is reused
  verbatim — only the payload grows.
- The payload carries the whole conclusion: topic, lab, team, years elapsed,
  publications, breakthroughs, grant income banked, and the award if one was won.
- `research-prize` and `pendingPrizes` are removed. The award's *effects*
  (`winner.acclaim += 1`, the salary and output premium) keep applying the week
  they are won, as they do now — the modal remains a report on something that
  already happened, so a delayed interrupt never delays an effect.
- A **cancelled** initiative does not queue one. Cancelling is the player's own
  action and already logs; a modal confirming what they just did is noise.

**Save migration** (`SAVE_VERSION` 33 → 34): any `pendingPrizes` in a loaded save
have no completion record to attach to. Drop them, and log one line on load —
these are already-applied effects with only their celebration outstanding, so
nothing mechanical is lost.

**Test:** a concluded initiative queues exactly one interrupt carrying its
award; a cancelled one queues none.

**As implemented: two cadence deviations.** The queue drains ONE report per
quiet week rather than the whole thing into one modal the way milestones do — a
milestone is a headline and several read as one page, while a completion report
is a page about one project. And a QUIET PILOT STUDY does not report at all:
reporting every completion took the balance sim's texture count from 1.7 to 3.0
modals a year, nearly all of it six-month pilots concluding with a couple of
papers. A pilot reports only if it won an award or produced a breakthrough;
Funded Project depth and deeper always report. That lands the cadence at
1.8/yr.

## PR 2G — A visiting chair is appointed from the interrupt

`eventData.ts`'s `visiting-scholar` charges the funding and then pushes the
generated candidate into `s.candidates`, leaving the player to find them in the
pool and appoint them separately. The note is right that there is no decision in
that second step: you have already paid.

**The change.** The `fund` choice appoints them directly — same code path the
reducer's hire uses (payroll, `courseSlots`, the roster entry), reused rather
than duplicated, so nothing about an appointed visitor differs from any other
hire. The choice's `describe` shows their salary up front, since that is now the
ongoing commitment the player is agreeing to rather than a later one.

**As implemented: the person is rolled at fire time, and the gift comes down.**
The candidate is rolled into the event's context when the event fires rather
than inside `apply`, so the modal can quote the name, salary and stats of
exactly the person who will be appointed — two rolls would be two different
people, one of them fictional. And `VISITING_SCHOLAR_COST_WEEKS` drops from 3
to 1.5: the choice now buys an appointment rather than a name on a list, so the
salary is part of the price. Without that, the balance harness — whose scripted
player takes the first affordable choice — was buying six unbudgeted permanent
salaries a run, and `test:balance` went red at its default seed.

The `pass` branch is unchanged.

---

# PHASE 3 — The roster, and what the curriculum tells you

*Five PRs. The Faculty tab rebuild is the largest single piece of UI work in
this plan; everything else here is small and shares its subject.*

## PR 3A — Faculty is a roster by field

The note's diagnosis is worth restating because it explains every part of the
redesign: hiring from the Curriculum tab replaced the old loop (develop
everything → appoint everyone tagged "needed" → repeat), which was tedious and
contained no decisions. The Faculty tab is still built for that dead loop. It
should become a **place you look at your faculty**, not a place you hire from.

**What goes.**

- The alert badge. `Toolbar.tsx`'s `TAB_ALERT.faculty` (unseen candidates in
  needed fields) is a prompt to go do the old loop. Delete the entry; the badge
  machinery stays for Curriculum and Build.
- The **On the Market** section. Candidates move into their field's section,
  marked as on the market.
- The **Course Slots by Field** section. Every field now *has* a section, so the
  slot figures live in their headers where they describe something adjacent.

**What the tab becomes.** Full screen (free from 1C). One section per field, each
with:

- a header carrying the field name and its slot arithmetic —
  `usedFacultySlots(s, field)` of `totalFacultySlots(s, field)`, both of which
  already exist and now correctly account for research commitments after 2C;
- a **tooltip on the header naming which courses pull from this field**, built
  from `s.tech.filter(t => t.requiresFaculty === field)` grouped by major. This
  is the answer to "why do I need a Kinesiologist", which the tab has never
  answered;
- the hired faculty as cards, each now showing **what they are working on** —
  their courses as today, plus their initiative (topic, lab, weeks remaining)
  where they have one, which retires the separate research panel;
- the candidates in that field below them, visually separated, each still
  appointable from here (the affordance stays; it is just no longer the primary
  way to hire).

**Ordering and emptiness.** Fields sort by the `FACULTY_FIELDS` grouping the rest
of the game uses (humanities, social sciences, sciences, health, computing,
engineering, business, law), not alphabetically. A field with no faculty, no
candidates and no courses is not rendered; a field with courses but nobody is
rendered and reads as the vacancy it is.

**Not in scope:** any change to hiring *mechanics*. This PR moves and regroups a
view. If it ends up changing what an appointment does, something has gone wrong.

## PR 3B — The curriculum says whether waiting will help

Today a course blocked on faculty capacity gets one gate dot
(`CurriculumTab.tsx`'s `showGateDot`), whatever the reason. The note wants two
states distinguished, because they call for opposite actions:

- **red** — no free slot in the field, and **nobody on the market** to hire.
  Nothing to do but grow the department over time.
- **yellow** — no free slot, but a candidate in that field **is** available.
  Go appoint them.

Both facts are already computed elsewhere: slot shortfall from
`usedFacultySlots`/`totalFacultySlots`, market availability from
`s.candidates.some(c => c.field === field)`. This is one predicate and one CSS
class.

**Test:** the predicate against three states — free slot, no slot with a
candidate, no slot with an empty market.

## PR 3C — Overload is a cost, not a cliff

`courseQuality.ts`'s `LOAD_PENALTY_MAX` is 12 points, scaling to 18 at the
1.5× overrun cap — against grade bands 16–18 points wide, so a full load is
reliably a whole letter grade and an over-full one is nearly two.

**Proposed: 12 → 7**, overrun cap unchanged.

The module's own comment pins the invariant any retune must preserve, and it is
the right acceptance criterion: *"D on a NEW department's course is the system
working; D on a VETERAN's course means the player overloaded them. Those must
stay distinguishable."* Check it explicitly at the new value — a matured
instructor (teaching ~71) on a tier-3 course at a full load should still visibly
drop, just not two bands.

**Why it lands here and not in Phase 2:** 2C cut research's slot cost to two,
which means more professors carrying a partial load alongside a project, which
means the overload penalty fires more often. The two changes push the same
number in the same direction and should be balanced against each other —
`npm run sim` after both.

**As implemented: the sim says the pair compounds, and the harness moved.**
The invariant holds at 7 (a veteran on a capstone still drops B to C at a full
load; a veteran teaching one course never reads D or F at any tier), and
`test/course-quality.test.ts` pins it. But softer grades lift satisfaction and
prestige, which widen the applicant pool, which makes the two DELIBERATE
MISTAKE strategies overreach harder and for longer: Curriculum rush ends year 20
at -11.8M where it used to end at +2.9M, and year 40 at +3.69B where it used to
end at +1.49B. "Stall, don't die" still holds, over a longer arc — so
`test/balance-regression.test.ts` judges those two strategies (and only those
two) at a 40-year horizon, and retires one bar that measured dip depth rather
than health. Every other strategy is still judged at year 20.

## PR 3D — "Develop All" ships

`CurriculumTab.tsx`'s Develop All button is gated behind a university named
"test" (`StatusHeader.tsx`'s sandbox check), alongside the +$1B grant and the
Fast speed. Move it out of that gate; leave the other two sandboxed.

It routes through `DEVELOP_ALL_AVAILABLE_COURSES`, which starts each course
through the same `canStartDevelopment` every manual click uses — so it cannot
start anything unaffordable, unstaffable or unrevealed, and charges normally for
everything it does start. Per decision 6 it ships unlimited.

**Worth doing while here:** the button should say what it is about to do — how
many courses and at what total cost — because at a large catalogue the cost is
substantial and currently invisible until it has been spent.

**As implemented:** the count is not "everything that passes
`canStartDevelopment` right now", because each start spends cash and takes a
faculty slot out from under the courses later in the sweep. `developAllPlan`
walks the catalogue carrying both, and the reducer runs that plan, so the quote
and the bill cannot drift apart.

## PR 3E — A hall says how it is doing

`BuildingInfoPanel.tsx` is a read-only popover over a placed building and already
reaches into `CurriculumTab`'s `discoverySections` for the school/major mapping.
For an academic building, add:

- the school's **average course grade** — `averageCourseQuality(s, ids)` over
  that school's course ids, rendered with the same letter and colour ramp the
  course cells use, so a B on a hall and a B on a cell mean the same thing;
- a button that opens the Curriculum tab **scrolled to that school**.

The second needs a tab-open-with-a-target channel. `CurriculumTab` already has
one for jumping to a course from a search result or a bridge badge; extend that
rather than adding a second mechanism, and thread the target through `App`'s
`overlay` state as `{ tab, target }`.

---

# PHASE 4 — The campus, and the campus under construction

*Five PRs. Independent of Phases 1–3 and of each other; could run in parallel
with any of them. 4A first within the phase, because it is the one with a save
consequence.*

## PR 4A — Odd footprints, so the door lands on a tile

**The rule to establish:** *any footprint whose motif draws a centred door has an
odd width.* An 8-wide building centres its door on the seam between two tiles; a
7-wide one centres it on a tile, which is what a path can actually arrive at and
what lets a hall line up with a quad.

`campusMap.ts` today:

- `SCHOOL_BUILDING_FOOTPRINT` is **8×6** — this is Founders Hall, and the note's
  key example. → **7×5**.
- `PROFESSIONAL_SCHOOL_FOOTPRINT` is 9×7 — already odd, unchanged.
- `DORM_FOOTPRINTS` runs 8×3 / 9×4 / 10×5 / 12×10 / 7×7 → odd widths throughout.
- `FACILITY_FOOTPRINTS` and the served-population ladders get the same pass,
  **for the entries whose motif has a centred door only**. Open ground (quad,
  courts, field, diamond, pool) has no door and is exempt — the quad ladder is
  already 9×9 / 13×13, which is why an odd hall can align with it at all.

**Saves.** Per decision 4, new games only: a `Placement` carries the footprint it
was made with, so existing campuses are untouched. Founders Hall is pre-placed at
founding (`actions.ts`), so an existing save keeps its 8-wide hall permanently.
Say so in the PR rather than discovering it in testing.

**Test:** extend `test/building-spec.test.ts` — for every footprint whose motif
draws a centred door, assert `w % 2 === 1`.

**As implemented: the balance harness moved, and the schools did not.** The
new footprints turned three checks red at the default seed only. The sim said
both affected strategies were HEALTHIER after the change — Completionist
finished year 40 at +1.44B, Discount volume spent 131 weeks in the red instead
of 267 — and what had gone red were two assertions that read a single week's
cash as if it were a trend. Both were replaced with robust forms: solvency now
accepts an overdrawn snapshot when the weekly net is positive and under 10% of
the run has been spent in the red, and the discount strategy's upward-trend
check compares decade AVERAGES rather than year 40 against year 30. Both loosen
what the suite will accept, which is why they are recorded here as well as in
the file.

## PR 4B — Open ground under construction

**The bug.** `buildingMotifs.tsx`'s `BuildingMotif` returns early for
`motif === 'grounds'` *before* it consults `developing`, and `CampusMap.tsx`'s
scene builder emits `groundProps` for a ground plate unconditionally. So a quad
under construction is drawn complete — lawn, walks, fountain, trees — with a
progress bar sitting on top of it. The note noticed this on quads; it is true of
the diamond, the multi-sport field, the courts and the pool deck too.

**The fix.** A developing state for open ground, shared across every `grounds`
motif: graded earth in place of the markings, a site hoarding around the
perimeter, and no props at all — `groundProps` returns `[]` for a developing
plate. The progress bar already draws.

The existing comment ("Open ground has no mass at all — and no construction
state worth drawing either, since there is nothing to raise") is the thing being
corrected; the mass is not what makes construction legible, the absence of the
finished surface is.

## PR 4C — The diamond, redrawn; the field, under construction

Two notes, one file (`groundMarkings.tsx`), and they want looking at together.

- **The diamond's stands.** `diamondProps`' seating wraps home plate along the
  arc at radius `R`, and the note reports it reads wrong. Redesign: stands as
  discrete raked sections behind the plate and down each foul line rather than
  one continuous arc, each entering the depth sort on the ground it covers, as
  props already do.
- **The multi-sport field** (`athleticsField`, 20×11, carrying a 400m track)
  gets the construction treatment from 4B, which for a plate this large is most
  of what the note is asking for.

Both are drawing work with no state behind them, which is why they are one PR:
the diamond is being re-drawn anyway, and the two share every helper.

**As implemented: the field needed nothing.** 4B's `GroundSite` covers every
plate drawn with the `grounds` motif, the 20x11 multi-sport field included, so
the second half of this PR was already done when it started — verified in a
browser rather than assumed. What was left was the diamond, and the redesign
went one step further than "discrete sections": the banks TAPER away from home
plate, because five identical wedges read as a fan of petals, which is the
continuous arc's own fault repeated five times. A backstop screen was added
too — without it the seating could be looking at anything.

## PR 4D — A library that keeps the floors it has

**Today.** `RENOVATE_LIBRARY` puts the *same* node back to `developing` in place
— a good model, and the reason the note is about appearance rather than
mechanics. But two things follow from `developing` that should not:

1. **It goes offline.** `satisfactionSystem.ts` sums `servesPopulation` across
   `done` facilities only, so a library adding its fourth floor serves **zero**
   study seats for the whole renovation. The reducer's own comment acknowledges
   this ("the library reads as fully offline for the whole renovation") as an
   accepted consequence. The note overrules it: the floors that exist should keep
   working.
2. **It is drawn as a building site.** `drawnHeightOf` collapses it to 16% of
   full height under scaffold, so three built floors visually disappear.

**The fix, both halves:**

- Record the pre-renovation figure (`renovatingFrom?: number` on the Buildable,
  additive and optional, defaulted on load — no transform migration) and have the
  facility sum count a renovating node at that figure. A renovation then *adds*
  capacity when it completes instead of removing it and giving it back.
- Draw the existing storeys at full height, with the **roof** carrying the
  scaffold pattern and the scaffolding rising only above the finished floors.
  `drawnHeightOf` takes the renovation case: height from `storeysOf` minus the
  floors being added, rather than the flat 16%.

**Test:** a renovating library contributes its pre-renovation `servesPopulation`
to the satisfaction sum, and its post-renovation figure once done.

## PR 4E — Dorms, courts, and Greek letters

Three appearance notes, none big enough alone.

- **Dorms stop looking like barns.** A wall colour of their own in the material
  table (`buildingMotifs.tsx`'s palette), plus enough detail to be worth looking
  at — an entry canopy at the door, banded storeys, a varied roofline across the
  ladder so the founding hall and the residential tower do not read as the same
  building at two sizes.
- **Tennis is several courts.** `FACILITY_FOOTPRINTS.tennisCourts` is 12×4 —
  correctly ~110m × 36m for *six* courts, per its own comment — but
  `groundMarkings.tsx`'s `Courts` draws **one** court stretched across the whole
  plot, which is why it reads as enormous. Keep the footprint; draw six courts in
  a row with real dimensions and the alleys between them.
- **Greek houses wear their letters.** `studentLifeData.ts` already names a
  chapter by drawing three from `GREEK_LETTERS` (`"Alpha Beta Gamma"`), so the
  letters exist — they are just stored as English words. Store the glyphs
  (`ΑΒΓ`) on the `GreekChapter` alongside the name, derived from the existing
  name for saves that predate the field, and draw them on the chapter house's
  pediment in the motif.

**As implemented: one bar moved, and the bands were already there.** Two
notes. The "banded storeys" the dorms wanted turned out to be drawn already —
floor courses go on every wall — and invisible, because a 22%-white band on red
brick is nothing; giving the dorms a DARK brick is what made them read, so no
banding code was written. And the spec test's cap of six wall materials had to
become seven to admit that brick. The cap was moved rather than worked around,
and the pairwise-distance check it is really guarding — no two materials within
an RGB distance of 35 — was left alone. The same test also caught a real
mistake before a browser could: dark brick under the campus's dark slate failed
the wall-versus-roof check at 49.4 against a bar of 60, so the residence halls
wear the light roof instead.

---

---

## What came after this plan

The two sections this document used to end with — deferred efforts, and
undirected direction — were lifted out to `BACKLOG.md` at the repository root
when the plans were archived. They were the only forward-looking content in
any of the four plans, and a backlog filed inside a document whose status line
reads "Landed" is a backlog nobody will find.
