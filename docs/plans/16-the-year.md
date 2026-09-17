# Plan 16 — The year

*Planning document only — no gameplay code is changed by this file. Its job is
to take the September review's usability findings — the first year is one click
and a wait, the summer decision is the best beat in the game and the rankings
report is a good beat in the wrong place, the player cannot see why anything
changed year over year, one modal width serves every interrupt, and the mid-game
runs at a speed a real player has no way to raise — and turn them into an
ordered sequence of PRs around the shape of one in-game year.*

**Status: Proposed.** Independent of Plans 14 and 15 in mechanism. PR B shows
[Plan 15](15-growth-has-a-cost.md)'s report card if it has landed and a plain
year-in-review if it has not; PR F's scripted opening names
[Plan 14](14-curriculum-on-the-map.md)'s first hall if it has landed and the
gen-ed core alone if it has not. Supersedes [Plan 12](12-the-year.md).

---

## 0. The year as the unit of play

The game has one fixed beat a year (summer admissions) and one that lands
mid-year (the U.S. News report at week 26); everything else arrives when it
arrives. The review measured 5–6 interrupts and about 25 discretionary actions
a year, front-loaded into the first decade, at a clock that gives a year 4.3
minutes at real speed. Two conclusions:

1. **The summer should be the year's payoff, all of it.** What the year
   produced, where the school now stands, what to charge and whom to admit, and
   what the students are asking for — four beats, one stop.
2. **The rest of the year needs a way to be noticed, and a higher gear.** A
   toast for the things that happen inside the quiet stretches, and a 4× speed
   for the players who want one.

And the first year, which is the one that decides whether anyone sees the tenth,
gets a script.

**There is no skip button.** An earlier draft of this plan proposed
"advance to the next event". It is cut, deliberately. Waiting to afford
something, and waiting for something to finish, is load-bearing in this genre —
it is where anticipation lives, and a button that teleports past it trades the
best feeling in a builder for convenience. The review's complaint was about
*empty* waiting, and the answer to empty waiting is to put something in the
year, which is what [Plan 14](14-curriculum-on-the-map.md) does by making every
course a decision again. A fourth gear is a speed, not a skip: the player still
watches the clock and can still intervene.

### The map

| PR | Delivers |
|---|---|
| 16A | The summer sequence: one interrupt, four beats; the annual report moves to the boundary |
| 16B | The year in review: the first beat's content, generated from the log and the snapshot |
| 16C | Year over year on the reveal: what moved the pool, and by how much |
| 16D | Time: a fourth gear, and the hotkeys for it |
| 16E | Modal layout: three widths, the report as a page, the milestone burst as cards |
| 16F | The first year: a scripted opening and the toolbar's next step |
| 16G | Toasts for what does not stop the clock |
| 16H | Docs |

A, B and C are one line of work. D, E, F and G are independent of them and of
each other, and **D, E and G are the cheapest player-visible wins in the whole
sequence** — they can land alongside Plan 14 rather than waiting for it.

---

## Open questions, settled before the first PR

**Does the rankings report lose its own moment?** The *first* one keeps it:
`rankings-entry` stays a stop-the-clock interrupt the week the school cracks the
top 50, because entering is the event. The *annual* report becomes beat two of
the summer sequence. `REPORT_WEEK` and the week-26 firing go.

**Is the sequence one interrupt or four?** One `summer` interrupt with a `beat`
index in its payload, resolved by one action per beat, so a save written
mid-summer resumes on the right beat and the clock cannot advance between them.
The club digest, which today rides inside the admissions form, becomes beat
four.

**Can a beat be skipped?** Review and standing are read-and-continue; the
decision and the digest are not. Enter continues the first two.

**How long is a run, and is that right?** Fifty years at 4.3 minutes a year is
about 3.6 hours at 1× and 54 minutes at 4× — three to five sittings for a first
playthrough, which is a healthy shape for a game whose replay value is a
different strategy rather than a different map. The number is fine. What was
never fine is the *density*: 4–14 actions in a late year is dead air at any
speed, and it is [Plan 14](14-curriculum-on-the-map.md) and
[Plan 17](17-the-endpoint.md) that fix it, not the clock.

---

## PR 16A — The summer sequence

- `tickAdmissions` at week 52 raises `{ type: 'summer', payload: { beat: 0 } }`.
  `tickRivals` still drifts the field at week 52 and no longer raises a report.
  `RESOLVE_SUMMER_BEAT` advances `beat`; the last beat dispatches what
  `RESOLVE_ADMISSIONS` does today and advances the clock.
- `InterruptModal.tsx` renders the sequence as one modal with a four-step header
  — **Review · Standing · Admissions · Students** — the current step lit.
- The sim resolves all four beats with its existing defaults.

**Verify.** A save written between beats resumes on that beat with the clock
still halted. `npm run sim` is unchanged in its outputs.

## PR 16B — The year in review

Beat one. Generated, not authored, from the log and the two most recent
snapshots:

- **Built** — courses finished (by school), programs founded, established or
  distinguished, halls and facilities completed.
- **People** — appointments, departures, a prize.
- **Research** — initiatives begun and concluded, publications, breakthroughs.
- **Students** — satisfaction's year average against last year's, demands raised
  and met, organisations recognised, **and attrition on its own line** ("340
  students did not return — housing, dining"), which
  [Plan 15](15-growth-has-a-cost.md)'s PR F depends on for its legibility.
- **Money** — the year's net, cash now against a year ago.
- **Standing** — if Plan 15 has landed, the report card: each input's grade and
  the arrow on prestige. If not, prestige now against a year ago plus the
  breadth term's movement from Plan 09's breakdown.

`YearSnapshot` grows the fields this needs (`net`, `applicants`, `admitRate`,
`incomingQuality`, `satisfactionAverage`, `coursesFinished`, `attrition`) so the
History tab's table can carry them too.

## PR 16C — Year over year on the reveal

Beat three's reveal gains one line under the pool:

> **1,609 applicants (+34%)** — prestige +8%, price −3%, word of mouth +21%,
> beds +2%, new pulls +6%

The funnel already computes every factor (`prestigePool`, `priceFactor`,
`capacityFactor`, `wordOfMouthFactor`, `cohortDemandFactor`);
`projectAdmissions` returns them and the line is last year's against this
year's. **Word of mouth stops being deliberately hidden**, because the review
found that the rule it was hiding was never learned — a player who reads "+21%
word of mouth" the year after building a dining hall has learned it.

The eight cohort squares show last year's count small beneath this year's.

## PR 16D — Time

- `SPEEDS` gains `quad: 1250`; the speed row shows **Play · 2× · 4×**; `3` maps
  to 4× and the playtest-gated sandbox speed moves to `4`.
- The 5,000 ms real week stays. The docs' "a decision should feel like a
  commitment" holds at 1×, and the player who disagrees now has two faster
  gears.
- **No advance-to-next-event, and no skip of any kind.** See the note above.

## PR 16E — Modal layout

- Three widths: `narrow` (decision events, charter, demand), `wide` (the summer
  sequence, the athletic-director offer, the championship report), and `page`
  (the annual standing beat and the first rankings entry, with the top 50 as a
  real table with a column for last year's rank).
- The milestone burst renders **one card per milestone in a wrapping grid**,
  each with its "now open" list collapsed behind a count, instead of a scroll of
  identical paragraphs. The review's year-12 modal carried ten of them.

## PR 16F — The first year

A scripted opening of four interrupts, written as letters from the board's
chair, each with one thing to do and a "Done" that reads state:

1. **Week 1 — "The doors open."** Develop the general-education core. Done when
   all six are developing.
2. **Week 5 — "A building of your own."** The core is finishing and three
   programs are waiting for somewhere to be. Site the first academic hall. Done
   when it is placed. *(Pre-Plan-14: the tier-1 pool has opened; start three
   entry courses.)*
3. **Week 9 — "Somewhere to sleep, somewhere to eat."** Satisfaction is falling
   and the letter says why: 350 commuters, no dining, no library. Site a dorm
   and a dining hall. Done when both are placed.
4. **Week 48 — "Summer is coming."** What the four beats will ask, and the one
   thing to understand before the first price: it locks, for that class, for
   four years.

Between letters the toolbar carries a **next step** line — the letter's ask, or
after year 1 the highest-value revealed thing: a hall with a free slot and an
offer waiting, a program one course from established, a facility whose attribute
is under 50, an idle lab. The line is a reading, never a queue.

The script is data in `eventData.ts`, fires through the interrupt system, and is
skippable from the first letter ("I know the way") for the second run.

## PR 16G — Toasts

A small stack above the log ticker for the things that never stop the clock: a
course or building finished, a program founded, a petition filed, a publication,
a candidate listed in a field that is short, **and a research project that
concluded without an output** — which is what
[Plan 15](15-growth-has-a-cost.md)'s PR C demotes from an interrupt and is the
single biggest reduction in modal volume in the whole sequence. Three seconds
each, five at most, click to open the relevant tab. The ticker stays as the last
line.

## PR 16H — Docs

`docs/design/admissions.md` describes the four beats; `progression.md` moves the
report; `docs/architecture/interrupts.md` and `ui-shell.md` describe the
sequence, the widths, the speeds and the toasts.

---

## What this plan does not do

- It does not change what the summer *decides*. Tuition and admit rate stay the
  two levers; [Plan 15](15-growth-has-a-cost.md) changes what they cost and
  [Plan 14](14-curriculum-on-the-map.md) changes what the year between them
  contains.
- It does not add a tutorial beyond the first year. A player who reaches summer
  two has the loop.
- It does not touch the campus map.
- It does not add a skip. That is a decision, not an omission.
