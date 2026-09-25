# Plan 49 — Any name

*Planning document only. Its job is to turn the owner's answer into a PR.*

**Status: Landed.**

---

## 0. The answer, and what was found

[The consistency review](../reviews/2026-09-consistency-review.md)'s Q16:
the harness's strategies hang on the college's name.
- Program offers are seeded from the name (`programOffers.ts`).
- Founding as "Test" instead of "Test University" took the Balanced
  builder from 13,280 students at Year 12 to 1,348.

The recommendation was to run the scorecard over a few founding names as
well as seeds, and to make the strategies take whatever offer fits. The
owner said yes, and asked for this plan to go last so it re-fits the bands
after Plans 46–48.

**Why "Test" stalled.** Played again on this branch, before the fix:
- At founding, Founders Hall held three Social Sciences & Humanities
  programs and had three slots free.
- All three offers came from other schools (Science, Computer Science,
  Arts & Media).
- The harness never mixes schools in a hall, so it founded nothing. Offers
  stand until one is taken, so the same three stood for a decade.
- The harness sites a new hall only when it is not saving. With no new
  programs, the college's income levelled off (cash stuck at $3M). It was
  always saving for a facility it could not reach, so the $0.8M hall that
  would have fed it was never built.
- The result was 1,239 students at Year 12 and 2,456 at Year 20.

The default name escaped only because its first offers included a
Social Sciences program.

## 1. The PR

- **The strategies take what fits** (`sim/balanceSim.ts`).
  - **The hall comes first.** When slots are free but nothing on offer
    fits a hall the strategy would use, it sites the next hall even while
    saving. Seats are the income the saving waits on. A full campus still
    waits for the saving, as before.
  - **Mixing as a last resort.** Once every hall is built, an offer that
    fits no single-school hall goes into any free slot, where before the
    strategy waited forever.
  - Before that, a strategy still keeps its halls single-school, as before.
- **The name is a second stream.**
  - `play()` takes a founding name, and `playRun()` plays one of the
    reference's runs.
  - `REFERENCE_EXTRA_NAMES` adds "Harrow College" at the default seed, and
    `REFERENCE_RUNS` lists every run: the default, seeds 4242 and 777, and
    Harrow College.
  - `--write-reference` records each generated band as the envelope of
    those four runs.
- **The scorecard is judged across runs** (`balance-scorecard.test.ts`).
  - **Hand-written targets** (the Balanced builder and the Overbuilder): a
    figure is out only when it is out in most of the four runs. This
    replaces the Overbuilder's own seed rule.
  - **Pace guardrails:** read as the lower median of the four runs, figure
    by figure. The numbers are unchanged.
  - **New guardrail:** the Balanced builder has at least 4,000 students at
    Year 12 in every run, and also on "Test", played to Year 12.
- **One regression claim is judged across seeds.** "The discount-heavy
  strategy has recovered from its trough" now goes through `holds`, as the
  claim beside it already did.
- **The bands are re-recorded** on the fixed harness, after Plans 43–48.

**As implemented:** as above. The figures below are from this branch.

- **No name stalls now.** Balanced builder, students at Year 12:

  | Name | Default seed | Seed 4242 | Seed 777 |
  |---|---|---|---|
  | Test University | 9,360 | 15,680 | 13,200 |
  | Test | 8,880 | 5,920 | 13,440 |
  | Harrow College | 7,178 | 7,760 | 5,920 |
  | Ellery University | 9,339 | 11,440 | 5,360 |
  | Northfield College | 9,920 | 13,440 | 12,320 |

  Before the fix, "Test" had 1,239 students at Year 12 on the default seed.
- **The same stall slowed every name, later in the run.** On the old
  harness the Balanced builder's default run went from 10,800 students at
  Year 12 to only 12,560 at Year 20. Seeds 4242 and 777 went from about
  15,000 to 16,880. Each waited years with offers that fit no hall it
  would build.
- **The pace guardrails were set on that stall** (Plan 36: first place no
  earlier than Year 25, 20,000 students no earlier than Year 20). With the
  stall gone, the Balanced builder's median run reaches first place in
  Year 20 and 20,000 students in Year 16. The four runs:

  | Run | First place | 20,000 students | Four-fifths of the catalog |
  |---|---|---|---|
  | Default | Year 20 | Year 18 | Year 33 |
  | Seed 4242 | Year 23 | Year 21 | Year 22 |
  | Seed 777 | Year 19 | Year 15 | Year 24 |
  | Harrow College | Year 23 | Year 16 | Year 22 |

  Those two guardrails now fail, and so does one hand-written target:
  Year 20 cash is −$6.6M against a floor of −$5M, in most of the four runs.
  A faster builder spends ahead of its income in the build era. These are
  the design's numbers, so this PR leaves them as they are. **Owner's call:** either the game is meant to
  be this fast for a player who does not stall, and the guardrails move,
  or the game is too fast and a balancing plan slows it.
- **The Earnest completionist depends on the path it takes.** On seed
  4242:
  - From Year 9 to Year 29 it held 173 courses with the same three offers.
  - Two of them fit no hall. The third fit a hall but cost $6M.
  - The next hall cost $2.1M, but its reserve is four weeks of running
    costs, about $33M at that size, so it could afford neither.

  This is the strategy's reserve rule meeting a large college, not an
  offer deadlock. The old harness passed these seeds on a different path.
  On this branch it finishes 91%, 65% and 78% of its catalog on the three
  seeds, so the endpoint suite's completionist claims fail (85% of the
  catalog, every school, breadth). **Owner's call:** as above; it belongs
  with the balancing of the late game, not with the harness.
- **Everything else passes.** Every strategy is inside its re-recorded
  bands, and the regression suite passes, including the discount
  strategy's trough claim, now judged across seeds.
- **The slow CI is not green** because of those two findings. The owner
  chose to merge on a green `check`.
