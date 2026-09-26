# Plan 70 — The launch

*Planning document only. Its job is to take the pre-launch survey that
followed Plan 69 and the owner's answers to it, and turn them into the PRs
that stand between `main` and a public release.*

**Status: Proposed.** PRs A–L. A is this document.

---

## 0. Why this plan exists

After Plan 69 the owner asked what polish, juice, refinement or expansion the
game needs before launch. The survey read the reviews, the backlog, the
latest fifty-year runs, and the code. Its finding was that the biggest gaps
are not feel. The game has never been played by a person, and a few things
would hurt real players on day one:

- **Saves do not survive updates.** `SAVE_VERSION` is 78 and
  `state/persistence.ts` has no migration chain. Any update that changes the
  state's shape sets every player's run aside.
- **The debug tools reach the public build.**
  - A college named "Test" opens the debug panel and the Fast speed.
  - `DebugPanel.tsx` is mounted even on the startup screen.
  - The reducer runs the nine `DEBUG_*` actions without checking the gate.
- **No error boundary.** A render crash leaves a blank page and no way to
  rescue the save.
- **The map is mouse-only.** `CampusMap.tsx` has no pointer or touch
  handling and sets `touch-action: none`.
- **Two balance results read as bugs:**
  - *A $49B college is graded F on Financial strength.* That standing is
    endowment per student, and neither harness player ever moves cash into
    the endowment.
  - *Research is a second economy.* Grants returned 509% of what
    initiatives cost in the natural run ($31.3B on $6.15B), where
    `docs/design/research.md` says a grant "must never become a second
    economy".
- **Many moments are silent.**
  - Sounds for placing and demolishing are defined but never played.
  - No sound for UI clicks, varsity losses, championships, catalogue
    events, the board's distress letters, rank changes, or money going red.
  - No toast system, no modal entrance, nothing when a building is placed.
- **The writing repeats.**
  - Every catalogue event has exactly one text, and 27 of 154 have
    cooldowns of five years or less.
  - Game results use one template per occasion and outcome.
  - Completions use one line each.
- **The end of a run** has no "play again", nothing to share, and nothing
  carried over.
- **Shipping odds and ends:**
  - the Credits read "The UniSchool author";
  - `index.html` has no description or social-preview tags;
  - `package.json` is 0.0.0.

## 1. The owner's answers

| Question | Answer |
|---|---|
| Saves across updates | **Both:** freeze the format at launch with migrations from then on, and export/import a save file. |
| Phones and tablets | **Full touch support.** |
| Financial strength F | **A board nudge and a sweep.** The board writes when cash sits idle, and the Treasury gets a standing sweep into the endowment. The endowment stays a choice. |
| Research grants | **A modest profit:** about 2× what initiatives cost over a run. |
| Debug tools | **Stripped from production.** Dev builds only; the "Test" name does nothing anywhere. |
| Credits | **Louis Miyani**, design and direction. |
| The end of a run | **Play again** on the report and the Hall of Fame, and a **shareable report card** (image download and a copied summary). No unlocks. |
| Analytics | **Page views and run events,** through **PostHog**. |
| Backlog expansions before launch | **None.** Faculty poaching, the event table and the map reading the college stay post-launch. |
| The feel pass | **Every silent moment,** and two or three text variants for every short-cooldown event and for game results. |

## Rules for every PR in this plan

- **No balance change outside PR D.** The pacing scorecard
  (`npm run natural -- --pacing`, 96 of 111 at Plan 69) and `sim/baseline.json`
  must read the same after every other PR.
- **Plan 69's two guarantees hold throughout:** every pacing player is #1
  with nothing left to build at year 50.
- **Randomness for presentation never touches the run's stream.** A text
  variant, a toast or a sound picks from a hash of what it describes (the
  event's id and the year, say), as trees and promises already do, so
  replays stay exact and balance does not move.
- **Reduced motion and the volume settings govern everything new** in PRs
  H and J.
- **From PR B on, a state-shape change ships a migration,** not just a
  version bump.

## The map

| PR | Subject | Depends on |
|---|---|---|
| A | This plan | — |
| B | Saves that survive updates | — |
| C | The production build | B (the crash screen offers the save) |
| D | Money that means something | — |
| E | The merge review's leftovers | — |
| F | Touch I: the map | — |
| G | Touch II: the screens at phone width | F |
| H | The feel pass: sound and motion | — |
| I | Words that don't repeat | — |
| J | The end of a run | B (play again), H (the card's fanfare) |
| K | Analytics | C (production only) |
| L | Launch: the owner plays, then 1.0 | all |

Each PR has its own branch (`plan-70x-subject`) and merges once `check` and
`slow` pass.

---

## PR 70B — Saves that survive updates

- **Freeze the format.** Record the current `SAVE_VERSION` as
  `LAUNCH_SAVE_VERSION`. From here on a version bump is a step in a chain:
  `MIGRATIONS[v]` takes a version-v state to v+1.
- **Load runs the chain.** A save from any version at or after launch loads
  after every migration from its version up. A save from before launch is
  set aside as now, and the title screen says so.
- **A frozen fixture.** Add `test/fixtures/save-launch.json`, a year-25 save
  written at launch. It must load at every future version, run a year
  without error, and pass the rules check (`test/save-migrations.test.ts`).
  Each migration adds its own fixture from the version before it.
- **Export and import.**
  - The main menu gets *Download save*. The file is the save payload, named
    for the college and the year.
  - It also gets *Load a save file*. Import checks the payload, migrates
    it, confirms before replacing the current run, and says plainly why it
    refused a file.
  - A set-aside save can also be downloaded from the title screen, so a
    pre-launch run is not lost silently.
- **Docs:** `docs/architecture/` gets the migration rule and the fixture
  rule.

## PR 70C — The production build

- **Debug in dev builds only.**
  - `components/playtest.ts` reads `import.meta.env.DEV`. In production the
    gate is always closed, and `?debug=1`, the storage key and the "Test"
    name do nothing.
  - The "Test" name trigger goes in dev too; `?debug=1` is enough.
  - `DebugPanel.tsx` and `AudioBench` are lazy-imported behind the gate, so
    they are not in the production bundle.
  - The reducer ignores `DEBUG_*` actions unless state carries a dev flag,
    which the tests and harness set.
- **A crash screen.** An error boundary around the app. It shows what
  happened in the game's voice and offers three things:
  - *Download save* (PR B);
  - *Download a bug report*: the run log from `engine/actionLog.ts`,
    which replays the crash exactly;
  - *Reload*.
- **Credits:** "Design and direction: Louis Miyani".
- **`index.html`:** a description, Open Graph and Twitter tags, a preview
  image (the year-51 campus from `docs/images/`), and the theme color.
- **Checks:** a test that the production bundle holds no `DebugPanel`
  string, and a test that the error boundary renders its fallback.

## PR 70D — Money that means something

**The endowment sweep.**
- The Treasury gets a standing setting: *keep N weeks of expenses in cash
  and move the rest into the endowment*, checked each quarter. It is off
  by default. N is chosen from a few steps (13, 26, 52 weeks).
- The board writes the first time cash has stayed above a year of expenses
  for a full year. Its letter explains that idle cash earns nothing and
  counts for nothing in Financial strength. The ask, on the next-step line,
  is to set the sweep; its button sets 26 weeks.
- A note repeats at most once a decade while the sweep is off and cash
  stays idle.

**Grants to a modest profit.**
- Re-fit `GRANT_PER_PUBLICATION_CHANCE` and `GRANT_MIN_WEEKS` /
  `GRANT_MAX_WEEKS` in `data/researchData.ts`, or cap grants per lab per
  year if the constants cannot hold the band on every seed.
- Target: over a fifty-year run, lifetime grants are **1.7–2.3×** lifetime
  initiative funding, on the natural line's median.

**The harness and the scorecard.**
- The guided and natural players carry the board's ask. The natural line
  takes the letter's default, so its final Financial strength should rise
  from F.
- `sim/pacing.ts` gets two rows:
  - grants over funding, counted (1.7–2.3×);
  - final Financial strength per player, watched.
- The natural report prints both.
- **The risk:** the fair-price players' net is flat, and grants may be part
  of what lets the guided player finish by year 50. If the cut breaks
  Plan 69's two guarantees, the PR stops and reports before retuning
  anything else.
- `sim/baseline.json` is re-saved. `docs/design/research.md` and
  `economy.md` carry the new rules.

## PR 70E — The merge review's leftovers

The merge review's "still open" list. Check each against `main`, and fix
what remains:
- the milestone chip's percentage never moves early and has no hover;
- milestone notes arrive weeks after what they celebrate;
- "Worth taking" lists D- and F-grade candidates;
- a locked speed key does nothing, silently (it should say why);
- the tuition field reads "in line with your prestige" across $15k–21k;
- developer phrasing reaches the player ("a Buildable's cost", "the model's
  neutral mix"). Sweep all player-facing text for code words;
- clipped labels in Faculty and the Build tray, and dining labels with no
  plate.

**As implemented** (PR E), item by item against `main`:
- **The milestone chip** shows the count, not a percentage (51.6/55.0
  prestige, 12/13 courses), and its hover states the condition and the
  count so far. A percentage near the top barely moved for years.
- **Milestone notes arriving late:** no longer reproduces. A milestone is
  queued the week it is reached (`tickLadder`) and its note shows at once
  unless an interrupt, a tab or a building's panel covers the map, when
  the ticker's NEXT points to it.
  - The check found a real overlap instead: a note sat over the build
    tray's header. Notes now step aside while the tray is open, as they
    already did for a building's panel.
- **"Worth taking"** leaves out a listing that would teach its waiting
  course at a D or an F (the department row still offers it).
  `test/worth-taking.test.ts` reads it on the launch fixture.
- **A locked speed key** now shows why for a few seconds (for example,
  "Appoint a Provost and the Deans of 3 founded schools to run the year at
  eight times").
- **The tuition tag** in "fair" says where in the band the price sits: on
  the gentle side, or at the top of it.
- **Developer phrasing:**
  - "the model's neutral mix" (the Enrollment tab) now reads "an even mix
    of every kind of student".
  - A sweep of every tab's rendered text, titles and labels on the year-25
    fixture found no other code words.
  - "a Buildable's cost" was already gone.
- **Clipped labels:**
  - None found in Faculty or the build tray at 1280×800.
  - Every building's label draws its plate, dining halls included.
  - Phone and tablet widths are PR G's.

The admit rate's early slope stays in the backlog. It is a balance change,
and the balance was just tuned in Plans 67–69.

## PR 70F — Touch I: the map

- **Pointer events,** not mouse events, on the map. Mouse behavior stays
  exactly as it is.
- **One finger drags to pan; two fingers pinch to zoom.** Pinch steps
  through the same zoom levels as Z/X, with a threshold so a pan does not
  zoom.
- **A tap selects** what the mouse's click selects.
- **Placing on touch.**
  - A tap on the ground drops the ghost there, and dragging moves it.
  - A small floating bar offers *Rotate* (R), *Place*, and *Cancel*
    (Escape).
  - Nothing is placed without the explicit *Place*.
- **The camera turn** (Q/E) and **pitch** get on-screen buttons on touch
  screens.
- **Walker and hover-only reads** (a building's name on hover) show on tap.
- **Checks:** a Playwright test on a touch-emulated viewport that pans,
  pinches, selects a building, and places one.

## PR 70G — Touch II: the screens at phone width

- **Every tab, modal, and the dock at 390×844 and 820×1180**, fixed until
  nothing clips or scrolls sideways.
- **Every hover-only hint works on tap:**
  - `HelpHint`;
  - `title=` tooltips, which move to a tappable hint wherever they carry
    meaning;
  - the `Figure` hints.
- **The toolbar's keyboard-only controls** (speed keys 1–4, Space) are
  already buttons. Check that every hotkey-only action has a button.
- **Checks:**
  - `npm run shot` gains phone and tablet viewports;
  - a screenshot set of every tab at both sizes goes in the PR;
  - a Playwright check that no page scrolls sideways.

## PR 70H — The feel pass: sound and motion

**Sound, for every moment the audit found silent.**
- Placing and breaking ground (`place`, defined and never played) and
  demolishing (`demolish`).
- UI clicks (`click`) on buttons and tabs, quiet by default.
- A varsity loss, a championship (a bigger cue than a win), and a rank
  change (up and down).
- Money going red, and the board's distress letters.
- Catalogue events and letters, by giving their log lines topics
  (`systems/events/catalogueEngine.ts:159`).
- Publications, club decisions, attrition, the report card, and the Final
  Report (a fanfare, not only the ceremonial theme).

**Motion.**
- **A toast system:** short, stacked, dismissable, one line each, never for
  anything an interrupt already says. It is used for a program or school
  founded, a rank change, a building finished off-screen, and cash going
  red.
- **Placing** a building: a thump and a dust puff at the footprint.
- **Modals** get an entrance (a rise and fade, about 150 ms).
- **The header's rank** animates when it changes, with an up or down
  flash.
- **A school distinguished** gets a moment: a banner across the map, the
  school's colors, and the cue.
- **Cash going red** pulses once, then stays red.
- Everything respects reduced motion and the volume settings; a toast
  under reduced motion appears without sliding.
- **Checks:** a test that every log topic maps to a cue or is listed as
  deliberately silent, so a new topic cannot be silent by accident.

## PR 70I — Words that don't repeat

- **Catalogue events:** each of the 27 with a cooldown of five years or
  less gets two more texts (three in all), in the same voice and with the
  same placeholders.
- **Game results:** three templates per occasion and outcome.
- **Completions:** three lines each for building, course and program.
- **The pick:** a hash of the event's id and the year (see the rules above),
  never the run's stream, and never the same text twice running.
- **Content checks** (`test/content*.test.ts`): every variant uses the same
  placeholders as its first text, and none is empty or duplicated.
- **The two quiet founding years:** one or two letters or notes in years
  1–2 that read the college's state (its first program, its first
  residence), so the opening is not "a quiet year" twice. They are new
  content, not new mechanics.

## PR 70J — The end of a run

- **Play again.** *Found another college* on the Final Report and in the
  Hall of Fame. It confirms first, because continuing into the Epilogue is
  also an option, then goes to the startup screen. The finished run is
  already hung in the hall.
- **The report card.**
  - A single card drawn as SVG and rendered to PNG in the browser, with no
    upload. It holds:
    - the college's name, crest and colors;
    - the title ("Blackmoor University: a jock school…");
    - the mark and the six grades;
    - the final rank, and one line from the chronicle.
  - *Download card* saves the PNG.
  - *Copy summary* copies one line, e.g. "Blackmoor University — B · 68,
    #1 of 100 after fifty years. UniSchool", with the site's URL.
  - The Hall of Fame can download the card of any run it holds.
- **Checks:**
  - a test that the card renders for a year-50 save with every grade band;
  - a snapshot of the SVG's text.

## PR 70K — Analytics

- **PostHog,** through `posthog-js`.
  - Active only in production builds, and only when `VITE_POSTHOG_KEY` is
    set. The key is the public project key, set in Vercel's environment
    for production.
  - Memory persistence, no cookies, so no consent banner.
  - Autocapture off.
- **Page views,** and these run events only:
  - `run_started`: the vernacular only. No college name, which is free
    text.
  - `year_reached`: at each fifth summer, with rank, prestige and
    enrollment bands.
  - `run_finished`: the mark, the rank, and whether the player continued
    into the Epilogue.
  - `report_shared`: download or copy.
  - `save_exported` and `save_imported`.
  - `crashed`: the error's message, with no state.
- **Settings** get *Share anonymous play statistics*, on by default, and
  honored before any event is sent.
- **The Credits** say what is collected, in two sentences.
- **Checks:** a test that no event carries a free-text field, and that
  nothing is sent when the setting is off or the key is unset.

## PR 70L — Launch

- **The owner plays.** A person plays a full run on a fresh browser, and a
  second session on a tablet. `docs/reviews/` gets a short checklist to play
  against:
  - the first hour;
  - the first school;
  - the first summer;
  - a save exported and re-imported;
  - a rank change;
  - the Final Report;
  - play again.

  What they find is fixed in this PR if it is small, or goes to the backlog
  if it is not.
- **1.0.0:**
  - `package.json` becomes 1.0.0;
  - `LAUNCH_SAVE_VERSION` is confirmed as the version the public build
    ships with;
  - the README is re-shot at the final look;
  - `BACKLOG.md` says what launch left for later.

## What this plan does not do

- **The backlog's expansions** (the owner's call, §1):
  - faculty poaching and retention;
  - the event table's dominant choices;
  - the map reading the college;
  - a school-wide budget and a CFO.
- **Unlocks that carry across runs.**
- **The admit rate's early slope,** and any other retuning beyond PR D.
- **Key rebinding and multiple save slots.** One run, exportable, is enough
  for launch.
