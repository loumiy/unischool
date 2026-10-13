# UniSchool — Backlog

*The work that has been named but not yet planned. Nothing here is sequenced
into PRs; turning one of these into a sequence is what writing the next plan
does (see `docs/plans/README.md` for how that is done and named).*

**This is the one forward-looking document in the repository.** The docs in
`docs/design/` and `docs/architecture/` describe the game as it is; the plans
in `docs/plans/` are closed records of work that has landed. If something is
going to happen but has not, it belongs here. What has come off, and where
it went, is in [`docs/backlog-archive.md`](docs/backlog-archive.md).

*Re-read against the code on 12 October 2026, after Plan 97 (0.1.0 on
itch.io), and sorted by the owner the same day: what goes into 0.1.1 is
sequenced in Plans 98–102, what was discarded is in the archive, and what
is left here waits for later.*

---

## Planned for 0.1.1

*Sorted by the owner on 12 October 2026 and sequenced, so they are no longer
backlog: see the plans for each.*

- [Plan 98](docs/plans/098-version-0-1-1.md): actuals with an arrow in place
  of targets, a notice when a bonus style unlocks, the Final Report's tags
  and the share card, save slots, the three readings of the old stocks,
  the harness's three players, and the 0.1.1 release.
- [Plan 99](docs/plans/099-a-gazebo-and-door-signs.md): a gazebo, door
  signs, and the Japanese Garden at a later milestone.
- [Plan 100](docs/plans/100-halls-claimed-by-three.md): a hall is claimed
  by a school only once it holds three of that school's programs.
- [Plan 101](docs/plans/101-events-that-do-what-they-say.md): the events'
  choices backed by real systems, and a memory of answers.
- [Plan 102](docs/plans/102-the-course-catalog.md): what Plans 95L–M left
  of the course catalog's shape, at its present size.

## Launch: toward Next Fest and 1.0

*The timeline is decided (the second review's B6-4, Plan 95): Next Fest in
June 2027 (registration closes 25 April 2027). The Steam page goes live by
January 2027 so wishlists build before the fest, the demo goes live in
February–March, and the game launches in late summer.*

- **The playtest's findings** (B6-5). 0.1.0 is public on itch.io (Plan 97)
  and measures a first run's real length and whether players reach year 30.
  Monitoring is in progress (October 2026); read the numbers and decide
  what they change.
- **The Steam page.** The store forms' AI-disclosure answers are drafted in
  `docs/store/ai-disclosure.md`; nothing is on a store page yet. The price
  is undecided ($14.99 was recommended in the October review's area 6).
- **The owner's own tasks** (B6-3):
  - a human edit of the most-read text: the founding letters, the summer,
    the specialization letter and the Final Report;
  - a devlog started from the plans' quotes;
  - the capsule art and the logo, commissioned.
- **Held from Plan 97.** Moved out of the itch.io playtest by the owner
  (8 October 2026); both come back with the demo launch and its marketing
  push. Their specs stand in [Plan 97](docs/plans/097-the-itch-playtest.md);
  the build flags they need (`VITE_EDITION=demo`, `VITE_PLATFORM=desktop`)
  already exist (97B), and the feedback module already lists the demo's
  end as a place its link opens from (97F).
  - **97G — the ten-year demo.** `VITE_EDITION=demo` ends the run after
    the tenth summer, on an end screen that shows what is ahead; sandbox
    hidden; demo saves carry into the full game, one way.
  - **97H — the desktop build.** Electron in `desktop/`, loading the built
    game through `app://`; Windows, macOS and Linux packages from the
    release workflow; unsigned until the Steam plan signs them.
- **1.0.0** (what Plan 70L kept for launch). `package.json` to 1.0.0 (it
  is 0.1.0), `LAUNCH_SAVE_VERSION` confirmed as the public build's (78
  today), and this file updated with what launch leaves for later.

## Later

*Kept by the owner (12 October 2026) for after 0.1.1. Each is a real piece
of work with a known shape; none is sequenced.*

- **A full endowment can still carry an unspecialized college to first**
  (accepted by the owner in Plan 85I, "worth watching"). Watch it in the
  playtest's runs.
- **Hand-built campuses as layout plans** (the owner, September 2026).
  `tools/campuses/` holds campuses the owner laid out by hand in a sandbox
  run and exported (`tudor-year-1.unischool.json` first); see
  `tools/README.md`, *Hand-built campuses*. They are meant to replace
  `tools/layout.ts`'s hardcoded plan for screenshots, sample builds and
  marketing, on a real (non-sandbox) scenario run's buildings:
  - `layout.ts` takes `--plan <save>` and reads `placements`, `pathways`,
    `dressing` and `trees` from it in place of its own `PLAN` and walks;
  - each building the run built goes to the plan's site for the same id,
    keeping the plan's `w`/`h` (a rotation); ids the plan names that the
    run did not build stay empty ground (and their doorstep walks are
    dropped), and ids the run built that the plan does not name
    (chapter houses, whatever the plan left out) go to the overflow block
    as now;
  - the existing rules still run over the result — clear footprints, every
    visible door on a path, one connected walk network — so a plan drawn
    against an older catalogue fails loudly rather than drawing through a
    building;
  - the run's own vernacular, colours and name are kept; the plan's
    `self`, finances and everything else in its `state` are ignored, which
    is what lets one plan be shot in every vernacular.
- **The rest of the decorative assets** (the October review's area 1
  list; the gazebo and door signs went to Plan 99):
  1. water: a pond or a lake edge with a boathouse (a place for rowing,
     and bridges for the paths), a new tile kind beside the road. Rowing,
     the one sport still wanted, waits on it;
  2. walls and gates along the road, so the campus has a front;
  3. sculpture of several kinds, picked by a hash of the tile;
  4. parking beside the road, a grounds lot with stall markings.
- **Half-step camera views (45°)** (the owner, Plan 80). A turn of 45°
  lands on straight-on angles, where every building shows a single wall;
  the art assumes two (doors, steps, corner towers, window bays), so each
  motif needs a one-wall view. The projection and depth sort already work
  at any angle.
- **Switching or mixing architectures.** Decided for now (the owner,
  10 October 2026): the architecture stays chosen at the founding and kept
  for the run, because a campus in one style looks better than a mix, and
  because each style is a reason to play again (a player doesn't see the
  Gothic library until they found a Gothic college). Kept in mind, not
  ruled out; a player asked for switching (R6–R7 in
  `docs/reviews/playtest-1/findings.md`). If the styles multiply, the
  chooser may need pinned favourites, search or a random pick.
