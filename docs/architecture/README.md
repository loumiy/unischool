# UniSchool — Architecture

Technical documentation for the codebase. What the game *is* lives in
[`docs/design/`](../design/); this folder is how it is built.

| Document | Covers |
|---|---|
| [systems.md](systems.md) | The rules every system follows, the week tick, and where code lives |
| [game-state.md](game-state.md) | `GameState`, the side records beside it, save/load and migrations |
| [buildables.md](buildables.md) | The single abstraction behind courses, buildings, dorms and facilities |
| [campus-map.md](campus-map.md) | Footprints, the tile grid, trees, and the depth-sorted draw |
| [interrupts.md](interrupts.md) | The one pause-the-clock-and-resolve mechanism |
| [ui-shell.md](ui-shell.md) | The shell, full-bleed tabs, tab gates, and keyboard arbitration |
| [playtesting.md](playtesting.md) | Scenarios, the debug flag and panel, the prestige breakdown, and the sim scorecard |

## Working on this codebase

Keep changes focused on the task described. If you spot a tension or a decision
the task doesn't specify, **flag it in the PR summary rather than silently
choosing** — surfacing tradeoffs is more useful than smoothing them over.

After making changes, run `npm run build` (compiles), `npm run lint`, and
`npm test`. `npm test` chains its suites with `&&` — invariants, save/load,
faculty, the curriculum graph, cohorts, admissions pricing,
financial distress, gendered sports, the balance regression gate and the rest —
so **a failure in an early suite silently skips the later ones**; read the tail
of the output, not just the exit line.

- A change that alters save shape bumps `SAVE_VERSION` and stops there: the old
  save is discarded and the player starts fresh, which is the intended outcome
  for a game nobody is playing yet. There is no migration chain any more (Plan
  14 deleted it) — see [game-state.md](game-state.md#discarding-is-the-rule).
  Never let save compatibility decide a name or a shape.
- A change that moves a number the economy depends on should be checked against
  `npm run sim` (40 years × seven scripted strategies) as well, and its result
  quoted in the PR summary. Every table is followed by its **scorecard** — the
  figures that have left the bands `sim/reference.ts` records — and
  `npm run sim -- --compare last.json` will quote the move as a diff rather
  than as the same table pasted twice. See
  [playtesting.md](playtesting.md).
- A change you want to LOOK at is what `npm run scenario` is for: it stands
  the game up at any year under any strategy, or on the exact week a modal is
  pending, and the debug panel (`?debug=1`) loads it. Also in
  [playtesting.md](playtesting.md).
- Preserve the pure-tick-function architecture and the single-Buildable model in
  any refactor.

These documents are the spec, and source comments cite them by name, so they
have to stay true. When a change makes one of them wrong, fix the document in
the same PR.
