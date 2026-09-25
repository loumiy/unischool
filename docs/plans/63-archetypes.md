# Plan 63 — The archetypes and the report

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answers

The harness rebuild's last two layers (Plan 56 §2, which placed them in
Plan 59 before the playthrough plans came first). The owner's answers stand:
the archetypes are **Completionist, Selective, Lean, Idle**; **only checks
gate a merge, balance numbers are reported**; the slow job may take five
minutes.

## 1. The PR

- **The archetypes** (`sim/harness/archetypes.ts`): four policies over the
  harness's moves and the guided player's plain sense.
  - *Completionist* builds and develops everything it can afford, fields
    every team, keeps its labs busy; a four-week reserve.
  - *Selective* stays narrow: twelve programs at most, its own schools'
    offers first, priced at 115% of "fair" and admitting 45%; a
    twelve-week reserve.
  - *Lean* spends only while the week's net is in the black, and builds
    only for an attribute under 40; a sixteen-week reserve.
  - *Idle* does nothing.
- **Checks** (`test/archetypes.test.ts`, slow, ~110 s): each archetype
  fifty years on two seeds — no stuck interrupt, the rules every quarter,
  *stall, don't die* (solvent or climbing out at the end); the
  Completionist finishes above the Idle college; a college broken into
  crisis at year 15 climbs out under the guided player.
- **The report** (`sim/report.ts`, `npm run sim`): the four and the guided
  player, fifty years on three seeds, the median at years 10, 25 and 50 of
  rank, prestige, students, cash, satisfaction, courses, schools and teams,
  with weeks in the red and the lowest cash — each with its change from the
  committed baseline (`sim/baseline.json`; `npm run sim -- --save` writes
  it).
- **The old harness goes:** `sim/balanceSim.ts`, `sim/reference.ts`, the
  scorecard, the endpoint reading and claims, the guardrails and milestones
  reports, and `test/balance-regression.test.ts`. `test/fuzz-late.test.ts`
  takes its checkpoints from the Completionist; `npm run scenario` plays the
  harness's players (`--player`, `--strategy` still accepted), stopping
  inside a year through the harness's new `playUntil`.
  `sim/legacyReading.ts` stays: two unit suites read it.
- The slow job: from 281 s (`balance-regression` alone) to 109 s for all
  three suites.

## 2. What the report says

The baseline, medians of three seeds:

| | Completionist | Selective | Lean | Idle | Guided |
|---|---|---|---|---|---|
| Rank at Y10 / Y25 / Y50 | 27 / 1 / 1 | 51 / 23 / 45 | 53 / 18 / 25 | 62 / 69 / 68 | 32 / 1 / 2 |
| Students at Y50 | 34,400 | 6,080 | 25,760 | 0 | 24,720 |
| Cash at Y50 | $121M | $2.0B | $1.4B | $85M | $85M |
| Weeks in the red | 0 | 0 | 0 | 0 | 0 |

**For the owner:**

- *An idle college ends with no students.* Its faculty all retire by the
  end, nobody restaffs, and since Plan 59 an unstaffed program seats nobody.
  That is the rule working ("everything should crater"), but it is worth
  knowing that doing nothing now empties the college.
- *A narrow college cannot choose its schools.* Offers change only when one
  is founded, so a college that refuses every other school's offer never
  sees its own come round; the Selective archetype had to take what came.
  A player who wants three schools cannot have them.
- *Money piles up with nowhere to go.* The Selective and Lean colleges end
  with $1–2B unspent; a narrow or cautious college runs out of things to
  buy long before it runs out of money.
- *No one goes into the red.* The Completionist dipped into it on one seed
  in the trial runs and recovered; across the baseline's medians nobody
  does. Stall-and-recover is still checked, by the crisis.

**As implemented:** the first Selective kept to three schools outright and
founded nothing after year 1 (the offers finding above); the first Lean
never hired, so it could found nothing. Both were fixed in the policy, not
the game.
