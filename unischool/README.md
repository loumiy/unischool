# UniSchool

A turn-based university management sim. You advance week by week over a long
playthrough (target 20–50 in-game years), building an institution from nothing.
The core feeling is the **builder's long arc**: investing time, watching
something grow, and seeing the scale of progress over decades — RollerCoaster
Tycoon or Cities: Skylines applied to building a university. There is no win
condition; it's an indefinite sandbox that naturally tapers once the tech tree
is fully developed and the rankings are topped.

This is a **systems-first MVP with no campus map and no art**. The map is a
deliberately deferred later layer — do not add one. Everything is kept as clean
data and logic that a map could later read from without rework.

## Run it

```bash
npm install
npm run dev
```

Open the printed localhost URL. Pick a speed to start the clock.

## Project structure

- `src/state/` — the shared `GameState` type, initial state, and action definitions
- `src/engine/` — the reducer (game loop) and the React store hook
- `src/systems/` — one folder per system; each exports a pure `tick(state)` function
- `src/data/` — seed content (the 330-course curriculum, rival universities)
- `src/App.tsx` — the dashboard: reads state, dispatches actions

## Architecture — follow these rules strictly

- There is **one central `GameState`** (in `src/state/types.ts`) that all systems
  read and write. It is the single source of truth.
- **Each system is a pure `(state) => void` tick function.** Systems never call
  each other directly — they only read and write shared state, and the engine
  composes them in a fixed order each week.
- The **engine reducer** (`src/engine/reducer.ts`) owns the game loop and
  interprets all actions. UI dispatches actions; systems never dispatch.
- To **add a system**, write a tick function and register it in the `SYSTEMS`
  array in the reducer. To **add content**, edit `src/data/`.
- **All tunable numbers** (costs, rates, bonuses, time scales) go in clearly
  labeled named constants — never scattered magic numbers. Balancing is done by
  feel later, so they must be easy to find and change.

## Content model

The curriculum lives in `src/data/techData.ts` — **330 courses** across 7 schools
and 36 majors (9 courses each) plus a 6-course general-ed core. Courses form a
three-stage climb per major: **tier-1** (entry, no prereqs) → **tier-2** (needs
the tier-1) → **tier-3** (needs all four tier-2s). Faculty are **named
individuals** with attributes; students are **aggregate cohorts**, not individuals.

## Design guardrails

- The scarce resource that paces the whole game is **development capacity** (how
  many courses can be built at once). Sequencing what to build is the core strategy.
- The tech tree is **fully completable** over a long game; the tradeoff is *when
  and at what cost*, never permanent lockout. Do not build permanent forks.
- Keep **finances simple for now**, but structure them so a more sophisticated
  demand-curve model (where prestige shifts the frontier between tuition and
  enrollment volume) can replace the simple version later without touching the
  rest of the system. Don't hardcode in a way that walls this off.
- After making changes, run `npm run build` and confirm it compiles before
  opening a PR. Preserve the pure-tick-function architecture in any refactor.

## Working style for coding agents

Keep changes focused on the task described. If you spot a tension or a decision
the task doesn't specify, **flag it in the PR summary rather than silently
choosing** — surfacing tradeoffs is more useful than smoothing them over.

## Roadmap

**Phase 1 (current MVP):** development-capacity throttle, slot expansion,
milestone prestige bonuses, a simple finance model, faculty hiring pool, and
sandbox-only playtesting scaffolding (auto-develop, fast-forward) to judge pacing.

**Later:** decision-interrupt events that pause the clock and demand a choice;
a richer demand-curve finance model with prestige/scale archetypes; dynamic
rival universities that stay competitive across decades; and — as its own system
reading the same state — the campus map.
