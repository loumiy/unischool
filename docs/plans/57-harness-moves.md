# Plan 57 — Faster runs, the moves, and fuzz

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answers

Plan 56 set the rebuild's rule (only checks gate a merge) and its budget (the
slow job in five minutes). The owner said go ahead with the first of the
rebuild's plans: profile a run first, then the vocabulary of moves and the
fuzz layer.

## 1. The PR

### Faster runs

A fifty-year Balanced builder run took **44 s**. The profile said the game,
not the harness, was the cost:

| Where | Share | Why |
|---|---|---|
| `structuredClone` in the reducer | 25% | every action copies the whole state |
| the department pot (`departmentPot`) | ~16% | `athleticProgramStrength` read every team's quality, and each team recomputed the pot, which reads every team's gate, which scans the estate: teams × teams × buildings, several times a week |

- **The pot, once per reading** (`studentLifeData.ts`'s `teamQuality` takes
  the pot; `athleticProgramStrength` and `cohorts.ts` compute it once). A
  pure refactor: the game is faster too.
- **`reduceInPlace`** (`engine/reducer.ts`): the reducer without its clone,
  for a headless player that owns its state. Every early `return state` in
  the reducer comes before any write (the debug actions aside), so a refused
  action still changes nothing. The old harness's dispatch uses it.

Checked identical: the Balanced builder, the Earnest completionist and the
Selective college over thirty years give byte-for-byte the same yearly rows
before and after each change. A fifty-year run now takes **21 s**.

### The rebuilt harness, first layer

- `sim/harness/game.ts` — the headless game and its week (answer, act,
  tick); a stuck interrupt is an error; a game may start from a checkpoint.
- `sim/harness/moves.ts` — the vocabulary: found an offer where it belongs
  (`homeFor`: its school's hall, else Founders Hall, else a hall no school
  claims), move a program home (`suggestedMove`), site the next hall,
  develop a course, hire for a blocked field, build for a shortfall, build
  a dorm; `pick` and `reserve` shared.
- `sim/harness/invariants.ts` — `brokenRules(s)`: the rules any state keeps.
- `sim/harness/fuzz.ts` — random but legal play over the moves and the rest
  of what a player can send (relocate anywhere, fire, demolish, cancel,
  renovate, fund research, move money, hire coaches, paths and trees), with
  a random summer.
- `test/fuzz.test.ts` (fast, ~10 s): four foundings, six years each, through
  the cloning reducer; the rules every week, a save round trip each year.
- `test/fuzz-late.test.ts` (slow, ~22 s): three years of fuzz from the
  Balanced builder's college at years 12 and 30, two seeds each.

**As implemented:**

- A random college founded from nothing goes broke and stalls before it
  has a lab or a team, so six years or twenty-five, it never reaches the
  late game. The late suite fuzzes from checkpoints instead; they come from
  the old harness until the archetypes replace it (Plan 59).
- A planted bug — a move that leaves the old slot filled — fails both
  suites on every run, naming it ("MECH is housed in HALL-05 and HALL-07"),
  and the save round trip catches it too.
- The moves are used only by the fuzz player so far; the guided player
  (Plan 58) is their first policy.
