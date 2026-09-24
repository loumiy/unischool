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

## PR 32D — The catalogue

- **v2's catalogue, ported.** Each event keeps its id, domain, weight,
  cooldown, text and choices, and its default.
- **This game's eighteen decisions are retired,** with their interrupt
  types kept only so old saves still resolve. The varsity petitions and
  the rival's passing, which are systems rather than texture, stay.

## PR 32E — The harness

- **The harness lets inline events time out to their defaults** and answers
  seismic letters by their default.
- **The slow suites run, and the bands are re-recorded** with a note.
