# Game state and persistence

`GameState` (`src/state/types.ts`) is the single source of truth. Every system
reads and writes it; nothing else holds simulation state.

Records of the run's own story sit beside the systems' state (Plan 33): the
`promises` made, kept, missed and declined; the journal the chronicle reads
(the history rows' standing values and endowment, the identity's tag `log`,
the rival's `since`, the catalogue's `letters` and `answered`); and `ending`,
the Final Report written once at the fiftieth summer with the Epilogue's
addenda. All are optional and plain JSON, for the reason below.

Four records sit beside the central `tech` list rather than as fields on a
Buildable, all keyed by id. Three are read by **no** system: `placements`
(where a building stands), `pathways` (paved tiles) and `trees`. The fourth,
`halls` (a hall's program slots — see [curriculum.md](../design/curriculum.md)),
**is** read by systems from Plan 14 on, and is the one side record the loader
treats as simulation state rather than decoration. Keeping them all separate is
what lets the single Buildable model stay unforked — see
[buildables.md](buildables.md) and [campus-map.md](campus-map.md).

## Save / load

The game is measured in hours; a year is four minutes at the real speed and
fifty of them make a run, so **a refresh must not destroy a run**. The whole `GameState`
is JSON-serialized into a single versioned `localStorage` key (see
`src/state/persistence.ts`). It is written at the **annual admissions
boundary** — the one point where a meaningful chunk of progress has just been
committed — when a university is founded, and whenever the player hits
**Save**. On mount, `useGame.ts` resumes a valid save instead of showing the
startup screen; a save that is missing, unreadable, corrupt, or written under a
different `SAVE_VERSION` falls back to a new game rather than crashing. **New
Game** erases the save and returns to the startup screen.

This stays a ten-line module only because **`GameState` is plain data** — no
functions, no `Date`s, no `Map`/`Set`, no references between slices — so every
field survives a JSON round trip untouched and there is no per-field serializer
to keep in sync. Keep it that way; anything added to the state that isn't
JSON-round-trippable breaks save/load silently. State must also stay
reasonably light as it grows: a fresh run is ~165 KiB (the standing
candidate market is ~24 KiB of that — 30 listings with bios), and the per-year
`YearSnapshot` and the capped log are what keep a decades-long run in the low
hundreds of KiB.

`SAVE_VERSION` is the escape hatch for the shape changing. Bump it whenever a
field is added-as-required, renamed, retyped, or given a new meaning. Additive
*optional* fields don't need a bump.

An older save is **discarded**, never half-loaded: `loadGame` returns `null`
for any version but the current one and the player gets an obviously new game,
not a run quietly missing a slice. That is one branch in the load path, it is
covered by `testRejects` in `test/save-load.test.ts`, and it is what makes
discarding safe enough to be the rule.

### Discarding is the rule

**The bump is the whole obligation.** A shape change does not owe anything a
migration. The game is in development and is not deployed anywhere: there is no
build anyone else is playing, and every save that exists is sitting in a
developer's own browser, so a discarded one costs a single in-progress test run
and nothing else. `sim/balanceSim.ts` reproduces forty-year runs headlessly and
`npm run scenario` stands the game up at any named state, which is what most
"but I'd lose the run" instincts actually want.

If a specific run is ever worth carrying across a bump — a playtest in the
middle of answering something — write the few lines that carry it as a one-off
in that PR and delete them in the next. Never a table.

### The chain that was deleted (v3 -> v51)

There used to be a `MIGRATIONS` table in `persistence.ts`, one entry per
version from v3 to v51, written under an earlier policy of migrating every
shape change as a matter of course: 2,870 lines carrying saves forward through
a curriculum reorg, a hundred-school field, three standings and a postseason,
plus a 1,330-line test file of fixtures, for a game nobody was playing yet.
The policy cost more than the code it saved — migration cost started reaching
back into the design (Plan 01 weighed two names for a milestone key "with the
migration cost in mind"), and the September review named the chain the
clearest overdevelopment in the repository.

Plan 14's first PR broke the save shape — halls and their slots — and took
that as the moment to freeze the chain and delete it, along with the three
helpers that existed only to feed it (the frozen faculty round-robin, the
legacy field renames, the pre-gendering sport id map). **Save compatibility
does not get a vote on what the game is called or how it is shaped**, and now
there is no machinery left to offer it one. What the chain's history is still
good for — the *shapes* a migration can take, from filling in a new required
slice to re-pointing a curriculum by id — is in the git log, at the commits
that wrote each entry.

Loading also runs **hall hygiene**: an entry in `halls` that does not name a
standing, placed hall is dropped, one with the wrong number of slots is padded
or trimmed, and a slot naming a program that does not exist or is already
housed elsewhere is emptied. Unlike the map records below this is simulation
state — a program the game believes is housed somewhere it is not would gate
courses on a lie — so the loader corrects it rather than merely dropping it,
and `test/invariants.test.ts` asserts the same three rules of every state the
reducer can reach.

Loading also runs **placement hygiene** on the campus map every time: orphaned
ids (or ones that aren't currently `done`/`developing` — see
[buildables.md](buildables.md)), placements whose footprint no longer fits the
grid, and overlapping placements are clamped back inside or dropped. That is
safe precisely because placement is visual-only — a dropped `done` placement
just stops rendering, keeping every effect it already granted; a dropped
`developing` one keeps counting down in `developing` regardless (`tickTech`
never reads `placements`), it just won't render anywhere until it finishes.
