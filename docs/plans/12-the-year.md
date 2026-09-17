# Plan 12 — The year

*Planning document only — no gameplay code is changed by this file. Its job is
to take the September review's usability findings — the first year is one
click and a wait, the summer decision is the best beat and the rankings report
is a good beat in the wrong place, the player cannot see why anything changed
year over year, one modal width serves every interrupt, and a real player has
no way to skip a quiet stretch — and turn them into an ordered sequence of
PRs around the shape of one in-game year.*

**Status: Proposed.** Independent of Plans 10 and 11 in mechanism; PR B
shows Plan 10's report card if it has landed and a plain year-in-review if it
has not.

---

## 0. The year as the unit of play

The game has one fixed beat a year (summer admissions) and one that lands
mid-year (the U.S. News report at week 26), and everything else arrives when
it arrives. The review measured 5–6 interrupts and about 25 discretionary
actions a year, front-loaded into the first decade, at a clock that gives a
year 4.3 minutes at real speed. Two conclusions:

1. **The summer should be the year's payoff, all of it.** What the year
   produced, where the school now stands, what to charge and whom to admit,
   and what the students are asking for — four beats, one stop.
2. **The rest of the year needs a way to be skipped and a way to be
   noticed.** A 4× speed and an "advance to the next thing" for the quiet
   stretches; a toast for the things that happen inside them.

And the first year, which is the one that decides whether anyone sees the
tenth, gets a script.

### The map

| PR | Delivers |
|---|---|
| 12A | The summer sequence: one interrupt, four beats; the annual report moves to the boundary |
| 12B | The year in review: the first beat's content, generated from the log and the snapshot |
| 12C | Year over year on the reveal: what moved the pool and by how much |
| 12D | Time: 4×, advance-to-next-event, hotkeys |
| 12E | Modal layout: three widths, the report as a page, the milestone burst as cards |
| 12F | The first year: a scripted opening and the toolbar's next step |
| 12G | Toasts for what does not stop the clock |
| 12H | Docs |

A, B and C are one line of work; D, E, F and G are independent of them and
of each other.

---

## Open questions, settled before the first PR

**Does the rankings report lose its own moment?** The *first* one keeps it:
`rankings-entry` stays a stop-the-clock interrupt the week the school cracks
the top 50, because entering is the event. The *annual* report becomes beat
two of the summer sequence. `REPORT_WEEK` and the week-26 firing go.

**Is the sequence one interrupt or four?** One `summer` interrupt with a
`beat` index in its payload, resolved by one action per beat, so a save
written mid-summer resumes on the right beat and the clock cannot advance
between beats. The digest, which today rides inside the admissions form,
becomes beat four.

**Can a beat be skipped?** Review and rankings are read-and-continue; the
decision and the digest are not. Enter continues the first two.

---

## PR 12A — The summer sequence

- `tickAdmissions` at week 52 raises `{ type: 'summer', payload: { beat: 0 } }`.
  `tickRivals` still drifts the field at week 52 and no longer raises a
  report. `RESOLVE_SUMMER_BEAT` advances `beat`; the last beat dispatches what
  `RESOLVE_ADMISSIONS` does today and advances the clock.
- `InterruptModal.tsx` renders the sequence as one modal with a four-step
  header (Review · Standing · Admissions · Students), the current step lit.
- The sim resolves all four beats with its existing defaults.

## PR 12B — The year in review

Beat one. Generated, not authored, from the log and the two snapshots:

- **Built**: courses finished (by school), programs established or
  distinguished, halls and facilities completed.
- **People**: appointments, departures, a prize.
- **Research**: initiatives begun and concluded, publications, breakthroughs,
  grants.
- **Students**: satisfaction's year average against last year's, demands
  raised and met, organisations recognised.
- **Money**: the year's net, cash now against a year ago.
- **Standing**: if Plan 10 has landed, the report card — each input's grade
  and the arrow on prestige; if not, prestige now against a year ago and the
  breadth term's movement from 09C's breakdown.

The `YearSnapshot` record grows the fields this needs (`net`, `applicants`,
`admitRate`, `incomingQuality`, `satisfactionAverage`, `coursesFinished`) so
the History tab's table can carry them too.

## PR 12C — Year over year on the reveal

Beat three's reveal gains one line under the pool: **"1,609 applicants (+34%)
— prestige +8%, price −3%, word of mouth +21%, beds +2%, new pulls +6%"**. The
funnel already computes every factor (`prestigePool`, `priceFactor`,
`capacityFactor`, `wordOfMouthFactor`, `cohortDemandFactor`); `projectAdmissions`
returns them, and the line is last year's factors against this year's. Word of
mouth stops being deliberately hidden, because the review found the rule it
was hiding was never learned — a player who reads "+21% word of mouth" the
year after building a dining hall has learned it.

The eight cohort squares show last year's count small beneath this year's.

## PR 12D — Time

- `SPEEDS` gains `quad: 1250`; the speed row shows Play · 2× · 4×; `3` maps
  to 4× and the sandbox speed moves to `4`, playtest-gated as before.
- **Advance**: a button beside the speeds (and `N`) that runs the clock at
  the sandbox rate until an interrupt is raised, a Buildable finishes, or a
  petition is filed, then pauses. The three stop conditions are what the
  review's players were waiting for.
- The 5,000 ms real week stays; the docs' "a decision should feel like a
  commitment" holds at 1×, and the player who disagrees now has two faster
  gears and a skip.

## PR 12E — Modal layout

- Three modal widths: `narrow` (decision events, charter, demand), `wide`
  (the summer sequence), `page` (the annual standing beat and the first
  rankings entry, with the top-50 as a real table with a column for last
  year's rank).
- The milestone burst renders one card per milestone in a wrapping grid,
  each with its "now open" list collapsed behind the count, instead of a
  scroll of paragraphs.
- The athletic-director offer and the championship report take the `wide`
  width.

## PR 12F — The first year

A scripted opening of four interrupts, written as letters from the board's
chair, each with one thing to do and a "Done" that reads state:

1. **Week 1 — "The doors open."** Develop the general-education core (the
   Curriculum badge is named; "Develop 6" is pointed at). Done when all six
   are developing.
2. **Week 5 — "Forty-two doors."** The entry courses have opened (grouped by
   school, per Plan 11G or as a pre-Plan-11 grouping of the pool). Choose a
   school and start its entry courses; appoint into its fields. Done when
   three entry courses are developing.
3. **Week 9 — "Somewhere to sleep, somewhere to eat."** Satisfaction is
   falling and the letter says why: 350 commuters, no dining, no library.
   Site a dorm and a dining hall. Done when both are placed.
4. **Week 48 — "Summer is coming."** What the four beats will ask, and the
   one thing to understand before the first price: it locks.

Between letters, the toolbar carries a **next step** line (the letter's ask,
or after year 1, the highest-value revealed thing: a program one course from
established, a facility whose attribute is under 50, an idle lab). The line
is a reading, never a queue.

The script is data in `eventData.ts`, fires through the interrupt system, and
is skippable from the first letter ("I know the way") for the second run.

## PR 12G — Toasts

A small stack above the log ticker for the things that never stop the clock:
a course or building finished, a program established (in addition to its
celebration, which may be queued), a petition filed, a publication, a
candidate listed in a field that is short. Three seconds each, five at most,
click to open the relevant tab. The ticker stays as the last line.

## PR 12H — Docs

`docs/design/admissions.md` describes the four beats; `progression.md` moves
the report; `docs/architecture/interrupts.md` and `ui-shell.md` describe the
sequence, the widths, the speeds and the toasts.

## What this plan does not do

- It does not change what the summer *decides*. Tuition and admit rate stay
  the two levers; Plan 10 changes what they cost.
- It does not add a tutorial beyond the first year. A player who reaches
  summer two has the loop.
- It does not touch the campus map.
