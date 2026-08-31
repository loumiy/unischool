# UniSchool — improvement recommendations

Written after reading the codebase and playing a fast-forwarded run to Year 11
(prestige 98, national rank #5). Findings are ordered by impact-per-unit-effort,
not by which axis of the brief they serve. Each one names the file it lives in.

Framing note: the README says the core feeling is **the builder's long arc** —
"investing time, watching something grow, and seeing the scale of progress over
decades." Most of what follows is in service of that sentence, because the
systems currently deliver the *investing* half well and the *watching it grow*
half barely at all.

---

## Tier 0 — Things that are simply broken

These are cheap and they are costing the game more than any missing feature.

### 0.1 The event log is 100% attrition spam

`admissionsSystem.ts`'s `tickAdmissions` writes a log line **every single week**:

```
Attrition: -1 left. Enrolled: 316.
```

With `s.log.length > 50` capping growth in `reducer.ts`, this means the log
holds roughly the last 50 weeks of "-1 left" and *nothing else*. Verified in
play: at Year 4, all 25 visible entries were attrition lines. Every course
completion, every milestone ("Major complete: Finance"), every admissions
summary is written and then buried within a few in-game months.

The log is the game's only narrative channel, and one `unshift` destroys it.

**Fix:** don't log routine attrition at all. Either drop the line, or surface
attrition as an annual roll-up at the admissions boundary ("Attrition cost you
41 students this year"), which is also more legible than a weekly dribble.
Consider raising the cap to ~200 once the log carries real events, and giving
milestone entries a distinct style — `kind: 'good'` already exists and is
already styled green; nothing currently survives long enough to see it.

### 0.2 The admissions outcomes panel renders wrong

`styles.css` has a global `dl { display: grid; grid-template-columns: 1fr auto; }`.
`.admissions-outcomes` is a `<dl>` whose children are `<div>` wrappers, so the
global rule lays those wrappers out in two columns and the labels/values
collide:

> `Incoming quality 48 / Net tuition / student $8,000/yr 100`

This is the modal the player sees once a year, forever — the single most
important screen in the game after the curriculum. Scope the global `dl` rule
(`.panel dl`, or give `.admissions-outcomes` an explicit
`grid-template-columns: 1fr`).

### 0.3 Modal buttons are off-palette

`.modal button` and `.gameover button` are `#3b6ef0` — stock link-blue, in a
game otherwise built entirely from navy / gold / parchment. "Confirm Policy" and
"Dismiss" are the two most-clicked buttons in the game and they look pasted in
from a different application. Use `var(--gold)` on navy, matching
`.startup-begin-btn`.

### 0.4 Dead files

`public/icons.svg` is a Bluesky/social-icon sprite left over from a template.
Nothing references it. Delete.

---

## Tier 1 — Making it understandable

### 1.1 The curriculum pool is an unlabeled wall of codes

This is the biggest comprehension problem in the game. Once the gen-ed core is
done, the pool shows ~36 entry courses as four-letter codes in one undivided
block:

```
FINA 101  ACCT 101  MRKT 101  ECON 101  MGMT 101  SPCO 101
MECH 101  ELEC 101  CHEM 101  CIVE 101  INDE 101  AERO 101  ...
```

They *are* ordered by school (`CurriculumTab.tsx`'s `buildSections` walks
`discoverySchools()` in order) — but nothing says so. A new player cannot tell
that MECH/ELEC/CHEM/CIVE are one school, cannot tell what "SPCO" is, and must
hover 36 tooltips one at a time to find out.

**Fix, and it's nearly free:** the school names are already in the data —
`discoverySchools()` returns `school.name` ("Business", "Engineering", "Arts &
Media", ...). Render the pool as labelled school groups instead of one flat
`CellGrid`. The progressive-discovery design is good and worth keeping; it just
needs headings. Also worth adding: the major's name under or beside each entry
cell, since "Supply Chain & Operations" is more inviting than "SPCO".

### 1.2 Cell state is unreadable without hovering

`.course-cell` has five states (`locked`, `blocked`, `available`, `developing`,
`done`) distinguished only by border style and opacity — `blocked` and `locked`
in particular are near-identical washed-out parchment. The *reason* something is
blocked (no free faculty slot vs. all dev slots busy vs. negative cash) lives
only in a hover tooltip.

**Fix:** a small persistent marker on the cell itself for the faculty gate (a
dot, or the field's initial), plus a one-line legend under the panel head. The
faculty gate is the most interesting constraint in the game and it's currently
invisible until you go looking.

### 1.3 The header omits the two numbers that actually drive the sim

`StatusHeader.tsx` shows Year / Cash / Prestige / Rank. It does **not** show
enrolled students or satisfaction — and those are what tuition revenue, prestige
inputs, and attrition all key off. In my run satisfaction sat at 55 and bled
students for eight straight in-game years while the header cheerfully reported
rising cash and a top-50 rank. Nothing ever told me.

**Fix:** add an Enrollment stat block (`enrolled / capacity`) and a Satisfaction
one, with satisfaction colour-coded and trending. These are persistent-header
material by the header's own stated rule ("state values that stay meaningful no
matter which tab is open").

### 1.4 Treasury shows four numbers and explains nothing

`TreasuryTab.tsx` lists Cash, Endowment, Weekly OpEx, Tuition. Money is
supposedly the game's primary throttle, and the player cannot see where it comes
from or where it goes.

`financeSystem.ts` already computes every component — `weeklySalaries`,
`seatUpkeep`, `facilityUpkeep`, `tuitionRevenue`, `prestigeRevenue`,
`baselineFundingPerWeek`. None are exported and none are shown. Export them and
render a real income statement:

```
INCOME                        EXPENSES
Net tuition      $41,200/wk   Faculty salaries   $12,400/wk
Prestige gifts    $7,500/wk   Seat upkeep         $1,750/wk
State funding         $0/wk   Facility upkeep     $3,100/wk
                  ─────────                       ─────────
                 $48,700/wk                      $17,250/wk
```

This turns the most under-used tab into the tab that teaches the economy.

---

## Tier 2 — The long arc (the biggest gap against the README's own goal)

### 2.1 There is no history, so you cannot see your own arc

`GameState` records **no time series at all**. For a game explicitly about
watching an institution grow over 20–50 years, the player has no way to see
where they were five years ago. Everything is a current-value readout.

**Fix, and I'd rank this the single highest-leverage addition in the document:**
add an annual snapshot array, appended in `RESOLVE_ADMISSIONS` (the existing
annual boundary, so it costs nothing structurally):

```ts
interface YearSnapshot {
  year: number; prestige: number; rank: number; enrolled: number;
  cash: number; coursesDone: number; majorsComplete: number; satisfaction: number;
}
history: YearSnapshot[];   // ~8 numbers x 50 years — trivially serializable
```

Then render it: prestige and enrollment sparklines in the header or Treasury,
and a proper "Institutional History" view. Suddenly Year 30 *feels* like Year 30
instead of like Year 3 with bigger numbers. It also unlocks 2.2 and makes 2.3
worth having.

### 2.2 The annual report is the game's big moment and it's flat

`RankingsReportView` prints "you're ranked #5" and a static list. No movement
arrows, no year-over-year delta, no "Harrowgate passed you", no note of who you
overtook. Rivals have `momentum` in state (`rivalsSystem.ts`) and it's never
surfaced. This is the one interrupt the player gets each year specifically to
feel their standing, and it reads like a database dump.

With 2.1's history in place: show `▲3` next to your rank, mark rivals who moved
more than two places, and call out the schools you passed by name. Same data,
enormously more feeling.

### 2.3 Milestones — the actual payoffs — are invisible

Finishing a major is the culmination of thirteen courses and years of work.
`techSystem.ts`'s `awardMilestone` marks it with... one log line, which per 0.1
is buried within weeks.

The interrupt system exists precisely for "stop the clock and show the player
something." Use it: a major-complete / school-complete interrupt, showing what
was unlocked and what the milestone did to the prestige target. Even a
lightweight toast would be a large improvement over the status quo. Milestones
that fire *and are never seen* are wasted design.

### 2.4 No save/load

The README calls persistence "a near-term priority, not 'eventually'." It is
still absent — `useGame.ts` holds everything in `useReducer` and a refresh
returns you to the startup screen. At the intended 5000ms/week pace, a 50-year
run is ~3.6 hours of unpaused play, all of it destroyed by an accidental reload.

State is already `structuredClone`-able and free of functions/Dates, so a
`localStorage` autosave on the annual boundary plus a load path on mount is
genuinely small work. Do it before adding more content.

### 2.5 The quiet weeks have no texture

The README lists decision-interrupt events (donor offers, faculty scandals,
facilities failures) under "Later." I'd promote them. Between milestones the
week-to-week is: watch a countdown, click develop, watch a countdown. The
interrupt system, the log, and the finance/satisfaction hooks these events would
touch are all already built — 8–10 authored events would be modest work riding
entirely on existing machinery, and they're the difference between a spreadsheet
that advances and a place with a history.

---

## Tier 3 — Play feel

### 3.1 Late game is 330 identical clicks

There are 330 course Buildables. Each is one "develop" click, and the
interesting decision (*which* major to invest in) happens once per major, not
once per course — the other eight are foregone conclusions. With up to 8 slots,
the mid-to-late game is a metronome of identical clicks every few seconds.

**Fix: a development queue.** Let the player click several courses to queue
them; they auto-start in order as slots free. This is not the sandbox
`autoDevelop` toggle — it's the player committing to a *plan* and watching it
execute, which is exactly the fantasy. It converts busywork into strategy and
makes the 8-slot ceiling feel like capacity rather than a click budget.

### 3.2 Speed controls are thin

One real speed (5000ms/week) and a pause button. No keyboard shortcut — spacebar
is the universal pause in this genre and costs one `useEffect`. A 2× real speed
(not the 150ms sandbox one) would help the stretches where you're waiting out a
24-week tier-3 course with nothing to decide.

### 3.3 Money stops being a throttle

By Year 11 I had **$15.7M** idle and nothing worth buying: slots capped at
`MAX_SLOTS = 8`, the facility chains were exhausted, and courses cost $10k–$75k
against a $23k/week surplus. The README's pacing model wants the bottleneck to
*ease* late — it currently *vanishes*, which flattens the back half.

Late-game money sinks worth considering, all of which fit existing systems:
competing on salary to retain or poach faculty; endowment campaigns that convert
cash into the prestige dividend; named gifts; research funding tied to the
already-modelled-but-unused `researchRateBonus`.

### 3.4 Athletics advertises its own emptiness

A permanent nav tab that says "Coming Soon." Every player clicks it once and
learns the game is unfinished. Hide the tab until the system exists — the
`TabId` union makes this a one-line change in `TabNav.tsx`.

---

## Tier 4 — Looking better

The visual language (navy/gold masthead, parchment panels, serif headings,
"Office of the President") is genuinely good and does real work for the fantasy.
The problems are density and flatness, not taste.

### 4.1 Progress is text where it should be visible

A developing Buildable shows `14w left` as a badge. A 28-week school building
shows a number that decrements once every five seconds — the single most
"watching it grow" moment in the game, rendered as static text. Add progress
bars (you have `duration` and the remaining count, so the fraction is free).
Same for catalog completion, currently `15/330 done · 5%` in a monospace
sub-heading; a ring or bar, and per-school completion on each section head,
would give the tab a sense of scale.

### 4.2 Tabs are mostly empty space

At 1400px the Treasury tab is four rows in a strip across the top and ~700px of
navy below it; early Curriculum is one row of six cells. Campus, meanwhile, is a
single tall column of ten groups. A two-column grid for the narrow tabs (and for
Campus's building groups) would fix both problems at once.

### 4.3 Small polish

- The `done` course cell (solid gold) and the `developing` cell (gold pulse
  animation) are close enough to read as the same state at a glance.
- The Campus tab's group heads all say `0 built` / `1 built` in identical
  monospace; the built/available distinction is carried entirely by a 3px left
  border.
- Faculty rows are the nicest-looking thing in the game — the flag, name, field,
  tier chip pattern reads beautifully. That row treatment is worth borrowing for
  Campus buildables.
- There's no founding moment: you name a school, click "Open the Doors," and
  land on a spreadsheet. A short founding interrupt ("Ashcombe University opens
  with 200 students and five faculty") would set the tone for the next four
  hours.

---

## If you only do five things

1. **Stop logging attrition** (0.1) — one line, and it restores the game's
   entire narrative channel.
2. **Label the curriculum pool by school** (1.1) — the data is already there;
   this is the difference between a wall of codes and a curriculum.
3. **Record annual history and draw it** (2.1) — the long arc is the stated
   core feeling and it is currently unobservable.
4. **Save/load** (2.4) — a 3.6-hour game that a refresh deletes.
5. **A development queue** (3.1) — turns the back half from clicking into
   planning.
