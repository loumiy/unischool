# Systems and the game loop

**Follow these rules strictly.**

- There is **one central `GameState`** (in `src/state/types.ts`) that all systems
  read and write. It is the single source of truth — see
  [game-state.md](game-state.md).
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

## The week

One tick is one week. The clock runs while nothing is pending; an interrupt
halts it until the player resolves it (see [interrupts.md](interrupts.md)). The
annual boundaries that matter are the **summer admissions decision** (see
[admissions.md](../design/admissions.md)) and the **U.S. News report** (see
[progression.md](../design/progression.md)).

## Layout

- `src/state/` — the shared `GameState` type, initial state, and action definitions
- `src/engine/` — the reducer (game loop) and the React store hook
- `src/systems/` — one folder per system; each exports a pure `tick(state)` function
- `src/data/` — seed content (the curriculum, buildings, rival universities, and
  the authored decision-event table)
- `src/components/` — the always-on-screen base layer plus shared chrome: the
  campus map (`CampusMap.tsx`), the build rail beside it (`BuildPanel.tsx`),
  the log ticker under it (`LogStrip.tsx`), the frame every other view pops up
  in (`TabOverlay.tsx`), and the persistent header/status bar, interrupt modal,
  tab metadata, and startup screen
- `src/tabs/` — one component per overlay view (Faculty, Curriculum, Research,
  Treasury, Enrollment, Student Life, History, Athletics); each reads the slice
  of `GameState` it needs and dispatches actions, and knows nothing about being
  rendered in an overlay
- `src/App.tsx` — the shell: owns the game loop hook and which view (if any) is
  open over the map, renders the persistent chrome, the map + build rail + log,
  and the active overlay (see [ui-shell.md](ui-shell.md))
