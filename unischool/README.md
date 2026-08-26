# UniSchool — MVP prototype

A no-map university management prototype. Systems-first architecture:
tech tree, admissions, faculty, finance, and dynamic rival rankings, driven
by a weekly game loop with variable speed.

## Run it

```bash
npm install
npm run dev
```

Open the printed localhost URL. Pick a speed (slow/normal/fast) to start the clock.

## How it's structured

- `src/state/` — shared types + initial state + action definitions
- `src/engine/` — the reducer (game loop) and the React store hook
- `src/systems/` — one folder per system; each exports a pure `tick(state)` fn
- `src/data/` — seed content (tech nodes, rivals) — grow the game here
- `src/ui/` / `src/App.tsx` — reads state, dispatches actions

### The core pattern
Systems never call each other. Each is `(state) => void` run in a fixed order
by the engine each week. To add a system, write a tick fn and add it to the
`SYSTEMS` array in `src/engine/reducer.ts`. To add content, edit `src/data/`.

## Where to take it next
- Grow `techData.ts` toward your full tree (majors, schools, path-dependent costs)
- Add a hiring pool + `HIRE_FACULTY` action (the action type is already stubbed)
- Add decision-interrupt events that pause the clock and demand a choice
- When ready: introduce the campus map as its own system reading the same state
