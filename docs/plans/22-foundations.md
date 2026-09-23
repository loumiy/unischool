# Plan 22 — Foundations

*Planning document only. Its job is to make this codebase ready to take in
UniSchool v2's systems, and able to measure them: Phase A of the migration
plan (`loumiy/unischool-v2`, `docs/MIGRATION_PLAN.md`), sequenced as PRs.*

**Status: In progress.** PRs A–E are in this branch. F–J are sequenced and
not started.

---

## 0. Why this plan exists

UniSchool v2 was built as a fresh start. After a feature-by-feature
walkthrough of both games, this codebase was chosen as the base and v2's
systems are to be ported into it. v2 is kept for its money model, delegation,
alumni, walkers, catalogue art and event panel. v1 is kept for its structure
and curriculum depth. The two lists of decisions are in v2's
`docs/V1_ADOPTION_LIST.md`.

v2 had four engineering properties this codebase lacks, and a later phase
needs every one of them:

| Property | Why a later phase needs it |
| --- | --- |
| One seeded random stream carried in the state | A balance claim is only checkable if a run is exactly repeatable. |
| An action log and replay | A bug report becomes a file that reproduces it. |
| No side effects in the reducer | Replay and headless runs cannot write to `localStorage`. |
| Content checked at build time | About 190 events and a building catalogue are coming in. |

An audit of this codebase (v2's `docs/V1_CLUTTER_AUDIT.md`) found very little
dead code but a handful of real problems. They are cleaned up first so the
ports land on firm ground:

- tests that no longer match the types;
- no CI;
- a 27-minute test chain that stops at the first failure;
- seven copies of `money()`;
- two dead save fields;
- a retroactive-siting path with one remaining user.

## Rules for every PR in this plan

- **No gameplay change unless the PR says so.** The balance scorecard must
  read the same before and after, except in PR D, whose new random stream
  moves every trajectory. PR D re-records the bands with a note.
- **Saves are discarded on version change**, as now. Migrations start at the
  first public release. `SAVE_VERSION` is bumped whenever the state shape
  changes.
- **Comments say what the code does and why**, not what it used to do. The
  history lives in git and in these plans. New code in this plan follows that
  rule. PR G applies it to the rest.

## The map

| PR | Subject | Changes the save | Changes a trajectory |
| --- | --- | --- | --- |
| A | Test runner, typechecked tests, CI | no | no |
| B | One formatter, one clamp | no | no |
| C | Dead code, dead fields, retroactive siting | yes | no |
| D | A seeded random stream in the state | yes | yes (re-recorded) |
| E | Saving leaves the reducer; the action log and replay | no | no |
| F | Long reducer cases move into their systems | no | no |
| G | The comment trim | no | no |
| H | Content integrity checks | no | no |
| I | The merged balance harness | no | no |
| J | Tooling from v2 | no | no |

A goes first so every later PR is checked. D goes before E because a replay
cannot be exact until the random stream lives in the state. G comes late so
it trims comments in their final shape, not twice.

---

## PR 22A — Test runner, typechecked tests, CI

- **One runner, `test/run.ts`.** It replaces the 55-script `&&` chain.
  - It bundles every suite in one rolldown pass and runs them in parallel
    child processes.
  - It prints every result, lists the failures at the end, and exits
    non-zero if any suite failed.
  - `npm test` runs the fast suites. `npm run test:slow` runs the suites
    that play whole games (the balance, scorecard, endpoint and invariant
    sweeps). `npm run test:all` runs both.
  - `npm test -- week-clock` runs one suite by name.
- **The suites stay standalone scripts.** A move to Vitest was considered and
  rejected. Every suite is already a script that counts its checks and exits
  with a code, so the runner gets all of Vitest's value here (every result,
  parallel runs, a filter) without rewriting 55 files.
- **`test/` is typechecked.** It joins `tsconfig.sim.json`. The 22 errors it
  finds are fixed by asking what each test meant, not by casting.
- **CI.** `.github/workflows/ci.yml` runs `npm ci`, the typecheck, lint, the
  fast suites and the build on every push and PR. The slow suites run as a
  second job in parallel.

## PR 22B — One formatter, one clamp

- `src/format.ts` holds `money`, `signedMoney`, `pct`, `ordinal` and
  `surnameOf`. `src/math.ts` holds `clamp`.
- **Every copy is deleted:** seven copies of `money`, six of `clamp`, two of
  `ordinal`, two of `surnameOf`, three of `pct`.
- **Negative money has one style: `−$5,000`** (a real minus sign, before the
  dollar sign). That is the style the year-in-review already uses. Today the
  Athletics tab and the event modal show `$-5,000` and the Treasury shows
  `-$5,000`.
- `satisfactionSystem.ts`'s private `teachingQualityScore` is renamed
  `teachingSatisfaction`. It measures a different thing from
  `courseQuality.ts`'s export of the same name.

## PR 22C — Dead code, dead fields, retroactive siting

- **Eleven exported symbols with no reader are deleted:**
  - `TreasuryIcon`
  - `getCamera`
  - `gradeFraction`
  - `heritageForId`
  - four research-output constants
  - `describeFinish`
  - `playerSportStrength`
  - `instructorOf`
- **`ResearchState.points` and `SeenState.candidateIds` leave the state.**
  `SAVE_VERSION` is bumped.
- **Retroactive siting goes.**
  - The one remaining user is Founders Hall in the guided opening, which
    leaves the hall unsited so that placing it is the walkthrough's first
    step.
  - It becomes an ordinary placement with a zero fee, handled where the
    opening already handles it.
  - `needsSiting`, `sitingFeeOf`, `canSiteRetroactively`,
    `RETROACTIVE_SITING_COST` and their branches in the build menu, the map
    and the reducer are removed.

## PR 22D — A seeded random stream in the state

- `GameState.rng` holds the stream's position: one 32-bit integer.
  `src/engine/random.ts` exposes `random()`, `randomInt(n)`, `pick(list)` and
  `newId(prefix)`.
- **The reducer binds the stream for the length of one action.**
  - `random()` draws from the state being reduced and advances it.
  - A draw with no state bound throws. A stray call is found by the first
    test that reaches it, not by a balance run that drifts.
  - The binding is ambient rather than passed as an argument. That keeps the
    change to one call per site (about 65 of them), not a new parameter
    through thirty signatures.
- **`crypto.randomUUID` becomes `newId`**, which draws from the same stream.
  Building a candidate is then repeatable too.
- **`createInitialState(seed)` takes a seed.** A new game picks one from the
  clock, which is the only use of time in the sim.
- **Rendering never draws from the game's stream.** `groundMarkings.tsx`
  uses a per-tile hash.
- **The monkey-patches of `Math.random` in the harness and the invariants
  test are deleted.** `SIM_SEED` now seeds the state instead.
- **Every trajectory moves**, because the draw order changes. The scorecard's
  bands are re-read over several seeds. Any band that moves beyond seed
  noise is called out in an **As implemented** note.

## PR 22E — Saving leaves the reducer; the action log and replay

- **`saveGame` is called only by `useGame`.** It saves after an action that
  should save (`SAVE_GAME`, and the autosave at `RESOLVE_ADMISSIONS`).
  - If the save fails, the hook dispatches `SAVE_FAILED`, which writes the
    same log line the reducer writes today.
  - `NEW_GAME`'s `clearSave` moves the same way.
- **The action log.**
  - `src/engine/actionLog.ts` records the seed and every dispatched action
    in order, `TICK`s included, in memory.
  - A run is `{ seed, actions }`.
  - `replay(run)` folds the reducer over the actions and returns the final
    state.
  - The debug panel can export the current run as JSON.
- **A replay test.**
  - It plays a scripted run of several years through the reducer: builds,
    hires, admissions decisions and event answers.
  - It replays the recorded run from the seed.
  - It asserts the two final states are deep-equal.
  - It also asserts that running the same seed twice gives the same state.

## PR 22F — Long reducer cases move into their systems

- `RESOLVE_ADMISSIONS` (205 lines), `START_INITIATIVE` (77),
  `PLACE_BUILDABLE` (66), `FIRE_FACULTY` (47) and `HIRE_FACULTY` (40) each
  become a named function in their own system's file.
- The reducer case becomes one call.
- There is no behaviour change. PR E's replay test and the scorecard prove
  it.

## PR 22G — The comment trim

- File by file, with the state types first and then each system, each
  comment is cut to what the code does now and why. The target is about a
  tenth of lines as comments (v2's density), down from 38%.
- **The history goes:** plan and PR citations, "used to", "no longer", and
  explanations of removed inputs.
- **It lives in git and in these plans already.** The design and
  architecture docs keep the reasoning a reader needs.
- **This is several commits.** Each touches only comments and whitespace.
  Each is checked by the typecheck and by a token-level diff that ignores
  comments.

## PR 22H — Content integrity checks

- The TypeScript data files already get their shape from the type system.
- **What nothing checks today is what the data means:**
  - ids unique within each table;
  - every id a row references exists (prereqs, hall chains, research
    topics' hosting facilities, event follow-ups, founding programs);
  - every string a player reads is non-empty and has no leftover template
    token.
- `test/content.test.ts` checks all of it across every table, so a content
  PR that breaks a reference fails CI.
- **v2's validated JSON content arrives with its own loader in the phase
  that ports it (Phase K).** Its checks join this suite.

## PR 22I — The merged balance harness

- **`sim/balanceSim.ts` keeps its seven strategies, reference bands,
  scorecard and `--compare`.** It gains v2's guardrails:
  - several seeds per strategy, with a band read across them;
  - the stops per year a player would see;
  - how often the same event repeats;
  - a saturation check (whether spending more still buys anything);
  - the idle case, a do-nothing strategy that must not win.
- The guardrails report rather than fail until Phase N re-derives the bands
  for the merged economy.

## PR 22J — Tooling from v2

The debug panel (`?debug=1`) gains:

- **+$1B**;
- **fire any event** by id;
- **export the action log** (from PR E).

Next to the existing scenario and screenshot tools:

- **`tools/newPlayer.ts`**: a scripted new-player run that clicks through the
  first year in a headless browser and reports where it stalled.
- **`tools/profile.mjs`**: a map frame-time profile at each speed, which
  Phase C's performance rule needs.

## What this plan does not do

- **It changes no design.** Everything the game does, it still does. The one
  measurable shift is PR D's new random stream.
- **It ports none of v2's systems.** That starts in Phase B (the unlock
  track).
- **It does not split the large rendering files** (`buildingMotifs.tsx`,
  `CampusMap.tsx`). Phases C and D replace much of them.
