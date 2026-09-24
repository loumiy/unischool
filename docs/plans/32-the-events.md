# Plan 32 — The events

*Planning document only. Its job is to turn Phase K of the v2 merge
(events, `loumiy/unischool-v2`'s `docs/MIGRATION_PLAN.md`) into a sequence
of PRs.*

**Status: In progress.**

---

## 0. The finding

This game's events are eighteen authored decisions, each a modal that
stops the clock. v2 has a catalogue of 193, most of them small (answered
inline, with a default if the player looks away) and 23 of them seismic
letters. The owner's decisions (v2's `docs/V1_ADOPTION_LIST.md`):

| # | Decision |
| --- | --- |
| V1-4 | This game's interrupt engine (pacing, a queue, nothing dropped) drives v2's event panel and seismic letters. Only the celebratory interrupts stay modal: milestones, prizes, championships, the rankings. |
| V2 #6, #7, #50 | The catalogue: inline events with a timeout and a default, seismic letters, held back in the first year, cadence scaling with the college's size. |
| V1-26 | This game's own decision events are scrapped for v2's catalogue. |
| V2 #11 | Events add no standing costs. |

## Rules for this plan

- **The catalogue is data.** v2's events are ported into
  `data/eventCatalogue.ts`, dropping those about charters, adjuncts and
  "the loss". Text naming v2's concepts is retargeted at this game's
  (programs, halls, cohorts), in this game's American spelling.
- **One interpreter** reads v2's conditions and effects against this
  game's state.
  - **Money:** v2's fixed dollar sums become weeks of operating cost (at
    v2's $1M a week), so a late-game event costs a late-game sum, as this
    game's events already do.
  - **Standing payroll:** effects that add it are dropped (V2 #11).
- **Seats answer the routine** (Plan 28): an inline event in a covered
  domain is answered by policy.
- **The harness answers as a player who looks away:** an inline event
  takes its default when its time runs out. The slow suites run, and the
  bands the catalogue moves are re-recorded with a note.

## PR 32A — The plan

This document.

## PR 32B — The panel

- **Inline events queue in a panel over the map.** Each has a timeout in
  weeks and a default, and never stops the clock.
- **Seismic letters stay modal.** They are rare, and they are the board
  writing.
- **The cadence:**
  - held back in the first year;
  - a small college sees an event every few months, a large one more
    often;
  - the global and repeat cooldowns carry over from this game's engine.

**As implemented:**
- **The panel** sits at the map's right edge, one card open at a time.
  Each card shows its weeks left and what each answer does, in the sums
  the college will pay: the price scale and the names in the text are
  fixed when the event fires.
- **The cadence** (`catalogueEngine.ts`):
  - an inline event has a 5% chance a week, times up to 2 for a large
    college, at least six weeks apart, with at most three waiting;
  - a letter has a 1.2% chance a week, at least a year apart, and keeps
    the decision events' twenty-week quiet stretch;
  - an event's own `cooldownYears` stands in for the repeat cooldown;
  - v2's identity-tag favours double an event's weight.
- **Seats** answer an inline event in their domain by policy, reading the
  catalogue's own effects: thrifty spends least, thorough most, popular
  pleases most. Anything above four weeks of operating cost, or beyond
  the college's cash, waits for the president.
- **A player cannot choose what the college cannot pay for,** except the
  default, which is always there to take. The clock's default and a
  seat's answer are paid however they can be.

## PR 32C — The interpreter

- **Conditions:** v2's `when` keys read from this game's state, for
  example `enrolledOver`, `alumniOver`, `backlogOver`, `rungAtLeast` and
  `beautyOver`. An event whose condition names something this game
  doesn't have is dropped from the port.
- **Effects:**
  - money (scaled), mood (satisfaction points), confidence (the board's),
    warmth (the alumni's);
  - quality (the incoming class), backlog, endowment, enrollment, trees,
    debt, and the rivalry.

**As implemented:**
- **Prices:** scaled by the college's annual budget against v2's founding
  $15M, between a fifth and twelve times, and rounded to two figures.
  This replaces "weeks of operating cost at $1M a week", which misread
  v2's scale. Sums under $25,000 price a thing, not a size, and stay as
  written. Money thresholds in conditions scale the same way.
- **Two effects are read against v2's founding college:**
  - enrollment is a share of its two thousand students, taken from or
    added to the incoming class with its cohort mix kept;
  - v2's reputation is read on this game's 150-point scale.
- **The rivalry is not an effect:** no surviving event used it.
- **Trees:** events plant and fell them through `systems/estate/woodland.ts`,
  so the estate stays the one module that reads the map.

## PR 32D — The catalogue

- **v2's catalogue, ported.** Each event keeps its id, domain, weight,
  cooldown, text and choices, and its default.
- **This game's eighteen decisions are retired,** with their interrupt
  types kept only so old saves still resolve. The varsity petitions and
  the rival's passing, which are systems rather than texture, stay.

**As implemented:**
- **158 of v2's 193 events are ported** (137 inline, 21 letters). Left
  out: twelve about charters, eight about adjuncts, the two scripted
  beats, the loss, and twelve whose conditions this game cannot read
  (triples, capital projects: Phase L's).
- **Nine texture decisions are retired:** the estate gift, the outside
  offer, the visiting scholar, the roof, the dining inspection, the
  heating plant, the state match, the winter storm and the faculty
  scandal. They are deleted outright rather than kept for old saves: a
  saved interrupt naming one already resolves as "an event has passed".
- **More of this game's table stays than planned:** naming rights (it
  names a school's hall), the Hellenic Council and its two chapter
  events, and the athletic director's three asks. Each moves a system
  the catalogue cannot reach, and all stay modal for now.

## PR 32E — The harness

- **The harness lets inline events time out to their defaults** and answers
  seismic letters by their default.
- **The slow suites run, and the bands are re-recorded** with a note.

**As implemented:** the harness answers as planned, and does one new
thing.
- **Renovation.** It funds maintenance fully, so an event's deferred
  repairs are its only backlog, and it had never renovated: a backlog
  stood forever and compounded. It now renovates a building below half
  condition, from cash above the strategy's buffer. The idle college's
  buffer is infinite, so it lets its founding hall go derelict. It stays
  inside its bands.
- **The cadence, measured:** over fifty years a running college sees
  about 110 to 160 inline events and a dozen or so letters.

## The harness, re-measured

- **Every strategy moves:** the catalogue's draws and effects replace
  the texture events' own. The reference bands are re-recorded.
- **The Balanced builder's year-50 margin ceiling moves from 45% to
  75%,** with a note. The retired texture events were ones the harness
  paid for in full: a roof at a quarter of its building, a boiler, a
  storm. The catalogue's defaults cost little. Cash piles up by year 27
  rather than 39, and the harness's sink moves it into the endowment.
  The payout carries the margin to 69%. This is the third plan running
  to raise the late margin. Phase L's late capital projects are the
  spending the late game lacks, and Phase N owns the number (V1-25).
- **The Overbuilder slides further at the default seed,** and is still
  judged across seeds: at 4242 every figure is inside its bands.
- **One regression claim moves a year, with a note:** the Overbuilder was
  underwater by year 5, and is now by year 6. Its year-5 cash had always
  sat within a few hundred thousand of zero, and the retired events were
  early costs. Year-5 cash now reads $0.2M to $0.6M at all five seeds, and
  year 6 is below zero at four of them, the default among them.
