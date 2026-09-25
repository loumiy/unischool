# Plan 56 — Checks, not numbers

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answers

The owner asked to rebuild the harness and sim suite from scratch, and
answered five questions about it:

1. **Promises:** build it to measure first, then recommend numbers.
2. **Gate or report:** only checks gate a merge; balance numbers are reported.
3. **Archetypes:** Completionist, Selective, Lean, Idle.
4. **Stop the red now:** yes, take the stale bands out of CI first.
5. **Budget:** the slow job may take five minutes.

This plan is answer 4. The rebuild is Plans 57–59 (§2).

## 1. The PR

- **The scorecard is a report.** `test/balance-scorecard.test.ts` becomes
  `sim/scorecard.ts` (`npm run scorecard`). It plays and prints exactly what
  it did: every figure outside its recorded band, every guardrail (stops a
  year, saturation, the Balanced builder's pace, the idle college's rank)
  that does not hold. It exits 0.
- **The endpoint claims are a report.** `test/endpoint.test.ts` becomes
  `sim/endpointClaims.ts` (`npm run endpoint:claims`), every Plan 17 claim
  printed ✓ or ✗, exit 0. `npm run endpoint` still prints the readings
  unjudged.
- **The slow job is `balance-regression` alone** (`test/run.mjs`'s `SLOW`).
  It holds "stall, don't die", the recovery and the payroll lever, and it
  is green; it stays the one slow gate until the rebuild replaces it.
- `docs/architecture/playtesting.md` says so.

**As implemented:** `balance-regression` also holds a few figures that are
balance numbers rather than checks (satisfaction above 60 by year 25 after
the crisis, the idle college's prestige falling eight points). They stay
for now because they pass and the suite goes whole in Plan 59; the rebuild
does not carry them forward as gates.

## 2. The rebuild, as agreed

Four layers, each answering one question:

| Layer | Question | Player | Gates on |
|---|---|---|---|
| Fuzz | Does anything break? | random but legal: chooses among what the game's own `can*` gates accept | state invariants: no NaN, no negative seats, offers and halls consistent, a save round-trips, no interrupt stuck |
| Guided player | Can the intended line of play be followed? | does only what the game says: the letters' asks, the next-step line, the suggested moves, plus plain money sense | it is never stuck; the letters' asks get done |
| Archetypes | Do different plans finish differently? | Completionist, Selective, Lean, Idle | checks only (solvent or stalling, never dead); everything else reported |
| Report | Where do the numbers sit? | the archetypes | nothing: `npm run sim` prints trajectories and a diff against main |

Players are policies over **one vocabulary of moves** that wrap the game's
own actions and readings — found an offer where it belongs, move a program
home (`suggestedMove`), site the next hall, hire for a blocked course, build
for the worst attribute, set tuition — so a rule change updates one move,
not every strategy. The slow job stays under five minutes; a 50-year run is
profiled first, since the sim may be what is slow.

- **Plan 57:** the vocabulary and the fuzz layer.
- **Plan 58:** the guided player; it measures, and recommends the numbers
  (all seven schools founded and Founders Hall empty by Year _N_, and so on)
  for the owner to set.
- **Plan 59:** the archetypes and the report; `sim/balanceSim.ts`,
  `sim/reference.ts` and the old suites go.
