# Game state and persistence

`GameState` (`src/state/types.ts`) is the single source of truth. Every system
reads and writes it; nothing else holds simulation state.

Three records sit beside the central `tech` list rather than as fields on a
Buildable, all keyed by id and all read by **no** system: `placements` (where a
building stands), `pathways` (paved tiles) and `trees`. Keeping them separate
is what lets the single Buildable model stay unforked — see
[buildables.md](buildables.md) and [campus-map.md](campus-map.md).

## Save / load

The game is measured in hours; the annual report and annual admissions make a
full run long, so **a refresh must not destroy a run**. The whole `GameState`
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

An older save is then either **migrated** forward or **discarded**, never
half-loaded. Migrations live in `persistence.ts`'s `MIGRATIONS` table, keyed on
the version they migrate *from*, and the load path walks them one version at a
time; a version with no entry is discarded and the player starts fresh.

### Discarding is the default

**The bump is the whole obligation.** A shape change does not owe the chain a
migration. The game is in development and is not deployed anywhere: there is no
build anyone else is playing, and every save that exists is sitting in a
developer's own browser, so a discarded one costs a single in-progress test run
and nothing else.

Write a migration only when there is a **specific run worth carrying** — a
playtest in the middle of answering something, a long run a balance question
depends on — and write it as the small thing it usually is. Otherwise bump the
version, let the save drop, and start fresh. `sim/balanceSim.ts` reproduces
forty-year runs headlessly, which is what most "but I'd lose the run" instincts
actually want.

The policy this replaces cost more than the code it saved. Under it, every
shape change was migrated as a matter of course, and migration cost started
reaching back into the design: Plan 01 weighed two names for a milestone key
"with the migration cost in mind", and `MIGRATIONS[19]` still writes a field
name nothing else in the codebase uses, because a later entry renames it.
**Save compatibility does not get a vote on what the game is called or how it
is shaped.** Rename the field and drop the save.

What stays non-negotiable is the *other* half: never half-load. An unmigrated
version returns `null` from `loadGame` and the player gets an obviously new
game, not a run quietly missing a slice. That is one branch in the load path,
it is covered by `testRejects` in `test/save-migrations.test.ts`, and it is
what makes discarding safe enough to be the default.

### The chain as it stands (v3 -> v40)

Every version from v3 on has an entry, written under the old policy. They are
kept rather than deleted: they are already paid for, and a save still sitting
in a browser may need them. What follows is a walk through the *shapes* a
migration took — history, not a standard to meet. Migrating made sense when
the old data still described the same game (v3 -> v4 filled in the campus
map's new placement footprints, which were all 1x1 before footprints existed;
v4 -> v5 re-pointed every course's `requiresFaculty` and every hire's `field`
at the re-specialised faculty-field taxonomy, which renamed and split the
departments a run is staffed against without changing the run itself; v5 -> v6
dropped the job-posting state and gave every hire the candidate market's
`weeksListed` clock, changing how faculty are acquired but not the roster,
the economy or the curriculum; v6 -> v7 added the `research` slice, gave
every hire the `acclaim` count the salary curve now multiplies by, and split
the institution's name into the player's half plus a fixed suffix — none of
which changes the school a resumed run describes, so it carries forward and
simply starts producing research the moment it has a lab; v7 -> v8 added the
`orgs` slice — the clubs and Greek chapters the campus has grown, the
petitions waiting on the next summer digest, and the Hellenic Council flags
— empty, and deliberately not reconstructed: a v7 run genuinely had no
student life, so a resumed school starts forming clubs the moment it has a
student center, exactly as a new one does; v8 -> v9 added the student-demand
slice of `events` — the demand queued for the next quiet week, the demand
currently outstanding with its target and expiry, and the week the last one
resolved — filled in empty with the cooldown clear, so an old save resumes
with no demand outstanding and its students free to ask for something the
moment they are unhappy enough; v9 -> v10 reorganised the CURRICULUM itself —
a School of Science, six majors sitting in a different school than they did,
two retired, four added, and the labs moved with them — so every saved course
is re-pointed at the new structure by id off the seed, keeping only its
`status`, which is what lets a decades-in save keep every finished course and
every milestone through a reorg that is not one-to-one. The two retired majors,
Pre-Med and Dentistry, are dropped outright rather than mapped onto a
replacement: marking a major complete whose nine courses the player has never
developed would be a milestone that lies, so a clean retirement is the honest
answer and the small prestige-target dip settles over a couple of years of
drift); v10 -> v11 added the GRADUATE PROGRAMS — six clusters of
higher-tier course Buildables (see
[graduate-programs.md](../design/graduate-programs.md)), spliced in
BY ID off the seed, which is the simplest curriculum migration there is
because nothing existing moved, was renamed or was retired: every node a
v10 save already holds is left completely untouched, and the
twenty-eight new ones arrive locked, revealing the moment their
parent-school gate reads true — which for a decades-in save may be the
very first tick, since the gate is a reading of milestones it already
earned. What does move is the prestige TARGET: graduate work is now the
last 0.15 of curriculum breadth, so a school that had finished the whole
undergraduate catalogue scores 0.85 on that input until it founds some
programs. Prestige itself does not lurch — it is a stock drifting
slowly, week by week — so that reads as a ceiling that moved up rather than
standing taken away); v11 -> v12 added the two PROFESSIONAL-SCHOOL BUILDINGS
(BLDG-MED, BLDG-LAW) and expanded Medicine (6 -> 12) and Law (5 -> 8) —
see [graduate-programs.md](../design/graduate-programs.md)'s "Two of six get
their own building". The same id-splice shape
as v10 -> v11: every seed node the save doesn't already have (the two
buildings, plus nine new courses) is appended locked, and every node it
already holds — including the eleven pre-existing Medicine/Law courses,
whatever their status — is left completely untouched, nothing re-pointed.
The one real edge case: a save that had already FOUNDED Medicine or Law
keeps every one of those courses done, but its new building still arrives
locked and, since the gate it waits on is a milestone reading that save
already satisfies, flips buildable on the very first tick — a real,
honestly-flagged construction bill for a hall the school apparently never
had, not a bug;
and discarding when it didn't (v1 and v2 predate an economy rebalance, so those
runs would be describing a different game).

**The narrative above stops at v12; `SAVE_VERSION` is well past it.** Each
later migration documents itself at its own entry in the `MIGRATIONS` table,
which is the canonical record — this prose is a walk through the *shapes* a
migration can take, not an index, and it is not extended by default. The three
from the academic-core arc are worth naming here because they are the ones a
reader of the design docs will look for: **v30 -> v31** materialises the old
display-only round-robin into real `courseFaculty` assignments, so a resumed
run keeps the instructors it appeared to have rather than waking up with four
hundred orphans; **v31 -> v32** splices in the four new research facilities and
re-points the unbuilt capstones that gate on them; **v32 -> v33** adds the
initiative slices, empty. Each keeps what a resumed run earned, and each is
covered in `test/save-migrations.test.ts`.

Loading also runs **placement hygiene** on the campus map every time: orphaned
ids (or ones that aren't currently `done`/`developing` — see
[buildables.md](buildables.md)), placements whose footprint no longer fits the
grid, and overlapping placements are clamped back inside or dropped. That is
safe precisely because placement is visual-only — a dropped `done` placement
just stops rendering, keeping every effect it already granted; a dropped
`developing` one keeps counting down in `developing` regardless (`tickTech`
never reads `placements`), it just won't render anywhere until it finishes.
