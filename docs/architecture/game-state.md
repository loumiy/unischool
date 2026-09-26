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
`SAVE_VERSION` the migration chain cannot reach falls back to a new game rather
than crashing. **New Game** erases the save and returns to the startup screen.
The main menu can also **download the run as a file** and **load a save file**
(Plan 70B), through the same path as the boot load.

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

### Migrating is the rule, from launch

**From launch on (Plan 70B), every bump ships a migration.** A public build has
players with runs in progress, and a run is an evening; an update must not end
it. `persistence.ts` holds the chain:

- `LAUNCH_SAVE_VERSION` is the version the public build first shipped with.
- `MIGRATIONS[v]` takes a version-v state to v+1, in place, assuming only what
  version v wrote. `readSave` walks a save up the chain, then runs the
  sanitizers below, and is the one path for the boot load and an imported
  file.
- A save older than the chain (a pre-launch run) or from a newer build is not
  loaded. It is **set aside**, not erased: the title screen names it and
  offers it as a download.
- **Every link has a fixture.** `test/fixtures/save-launch.json` is a year-25
  run written at launch; each later link adds `save-vN.json`, written by
  version N before the bump. `test/save-migrations.test.ts` fails if a
  version since launch has no link or no fixture, and checks every fixture
  loads, holds the rules (`sim/harness/invariants.ts`), and (the launch one)
  plays a year on.

Before launch the rule was the opposite: discarding was the rule, because every
save in existence sat in a developer's browser. The paragraph below is why the
old chain was deleted; what it cost is the reason the new one starts at launch,
not before, and asks only for what a real player's run needs.

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
