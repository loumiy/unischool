# UniSchool — Backlog archive

*Entries that have left [`BACKLOG.md`](../BACKLOG.md) because they were
delivered, settled or overtaken. Each says where it went. Newest first.
Nothing here is waiting on anyone; if an entry turns out to be open after
all, move it back to the backlog.*

---

## Discarded by the owner on 12 October 2026

*The owner sorted every open entry (fix for 0.1.1, defer, or discard). These
were discarded; the owner's reason is given where one was. The full entries
as they stood are in `BACKLOG.md` at commit `3c82c1f`.*

- **The price is set blind, the other half** (A4-6): last year's price and
  the pool it drew beside the tuition slider. The tolerance on the slider
  (96I) and the summer's *why the pool moved* stand.
- **Size levers** (A4-5): a target enrollment, or staying small on purpose,
  in the summer's admissions beat.
- **Walks that draw straight** (A1-7, B1-4) — *brought back on 13 October:
  now Plan 99's PR E*: edge-joined runs still draw as
  steps.
- **Doors that meet the campus** (A1-8, B1-5). *"Let the player connect
  paths and landscape on their own; no need to automate."*
- **Real slopes on campus** (Plan 81).
- **A smoother turn** (what Plan 83 left).
- **The sim on a worker thread** (after Plan 83; Plan 96G measured that
  rendering less per week is the larger win).
- **Events that reach further:** a prestige input through durable state,
  and an audit of the catalogue for dominant choices.
- **Faculty lifecycle: rival poaching and paid retention.**
- **A school-wide budget, and a CFO to run it.**
- **Per-major mechanical effects.**
- **Founding a team directly**, without the Athletics Development Office.
  *"That's enough"*: the office (Plan 89) is the way.
- **Physical-object tabs** (direction).
- **A board of directors as people**, and the executive seats beyond Plan
  28's (direction).
- **The mix needs ears:** a listening pass on the sound and music
  (direction).
- **Camera polish:** a look at the stands from behind (direction).

## Sequenced on 12 October 2026

*Picked by the owner for 0.1.1 and turned into plans, so they left the
backlog:*

- **Targets against actuals** → Plan 98 (the owner's answer: hide the
  target, show the actual with a direction arrow).
- **No notice when an unlock is earned**, **report tags whose test does not
  read the standing they claim**, **what Plan 76H skipped** (the share
  card), **key rebinding and more than one save slot**, **three slow
  readings still read the old stocks**, **the championships goal player**,
  **the Selective archetype**, **the guided line's lab-project step** →
  Plan 98.
- **Decorative assets:** the gazebo and the door signs, and the Japanese
  Garden moved to a later milestone → Plan 99. The rest stays in the
  backlog under *Later*.
- **Hide other schools' offers in a claimed hall** → Plan 100, reworked by
  the owner into how a hall is claimed.
- **Events that do what they say** → Plan 101.
- **The course catalog's shape** → Plan 102. Most of the entry was
  already done by Plans 95L–M (6 October), which the re-read above missed;
  Plan 102 takes what is left (400-level numbers, the MD's internal
  medicine).

## Taken off on 12 October 2026

*Re-read against the code after Plan 97 (0.1.0 on itch.io).*

- **The second review (Plan 86):** every area answered and sequenced in
  [Plan 95](plans/095-second-review-worked-through.md). What the owner kept
  for later stayed in the backlog under the entry it continues.
- **The owner's second playthrough:** sorted in
  [`reviews/2026-10-owners-playthrough-ii.md`](reviews/2026-10-owners-playthrough-ii.md),
  its four questions answered, and landed as
  [Plan 96](plans/096-the-owners-second-playthrough.md). Only *Targets
  against actuals* stays open.
- **Area 6 of the October review (marketability), the parts that are
  built:**
  - the title screen shows the campus (the quad title art, `assets/campus-quad.webp`);
  - the README's screenshots were re-taken after Plans 80–97 (PR #340,
    10 October 2026), along with the itch.io and share images;
  - choices that exclude each other: Plan 85's specializations;
  - the Credits line "Made with the help of AI tools" (Plan 97C), and the
    store forms' answers drafted in `docs/store/ai-disclosure.md` (Plan 95Z).
- **Whether the playtest or the demo comes first:** the playtest, done
  as Plan 97 (0.1.0 on itch.io, 8 October 2026).
- **70K — analytics:** done as Plan 97E, straight to PostHog's API rather
  than through `posthog-js`, with `VITE_POSTHOG_KEY` from the repository
  secret.
- **70L — the owner's pass:** done as Plan 97J. What it kept for 1.0.0 stays
  in the backlog under *Launch*.
- **A digest for the stops that ask nothing** (A4-3): milestone notes and
  research reports are letters now and no longer stop the clock, with a
  *Pause for news* setting for players who want the stop; the summer
  Review names the matters left unanswered and the answer each took
  (Plan 95T).
- **The Final Report's access weakness:** reads "stayed hard to get into"
  (`data/reportData.ts`).
- **A link to the *Below A* filter from the Prestige panel's teaching
  line:** built (`tabs/HistoryTab.tsx`, `BelowALink`).
- **The dead `comingNote` string** in `data/specializationData.ts`: gone.
- **Disbanding a team:** built (Plan 95V). *Cut the program* on a
  program's card, never for a flagship in season; the alumni give less for
  five years and the rivalry ends.
- **Match simulation and a fixture list:** stay out, by the argument at
  the head of `systems/athletics/season.ts`. Golf stays declined.

## Taken off in October 2026

*Delivered or settled since the September re-read.*

- **The October review's fix-first list:** all six (G7-1 in 79B; G7-3,
  G7-4, G7-5 and G7-14 in 76C–D; the `node_modules` symlink on the review
  branch).
- **The October review's ranked improvements:** the first year explains
  itself, the move to school halls unstuck, the text made true, a usable
  Curriculum, one way to write a number, and a campus worth a screenshot
  (Plans 74–79); strategies that end in different colleges (Plan 85).
- **Area 4 of the review:** A4-1 (Plan 85), A4-2 (the *Below A* filter in
  76B, the training program in 85E; the Provost's auto-fill declined by
  the owner in Plan 80), A4-4 (76C and 85I: athletics scaled once, the
  finance phrase, the student-life pillar on the experience axis), and
  A4-5's decline and recruiting (78D, 80G).
- **Plan 72's list** (the owner's answers on the September backlog):
  landed, A–M.
- **The Faculty tab, and a person page:** Plan 84.
- **A faster map:** Plan 83, the canvas, with the SVG map kept as its
  fallback. Its prototype missed the 30 ms bar and the owner went ahead
  anyway; what is left is *A smoother turn*, in the backlog.
- **A narrow college choosing which schools it founds:** a claimed hall
  offers its own school's programs, and one offer a year can be declined
  (Plan 78D).
- **Research and campus life as inputs rather than ranked axes:** reversed
  by Plan 85, which made prestige a blend of four pillars (academics 35%,
  research 25%, student life 25%, athletics 15%).
- **Seasons on the map:** built (Plan 74I). Only night stays declined.
- **Board confidence:** removed (Plan 80C).
- **Athletics deferrals:** capped flagships, recruiting, the college's
  pull and a coach market that always offers someone solid (Plan 80G),
  and the athletic performance complex's extra flagship slots (85G).

## Taken off in September 2026

*Delivered or settled before the October review; each now lives in the
plan named and in `docs/design/` or `docs/architecture/`.*

- **Research grants after the hosting rule:** re-fitted per depth in Plan
  70D (`GRANT_DEPTH_SCALE`), now about 2× their cost and inside the
  scorecard's band.
- **A richer demand curve:** the frontier bites now, with price tolerance
  rising with prestige, an overreach penalty, a crowding factor and an
  applicant trickle (Plan 71).
- **Campus map feedback:** beauty feeding the pool and prestige, and capped
  pairing bumps (Plan 26).
- **More authored events:** the catalogue (Plan 32), three tellings each
  for the frequent ones (Plan 70I). What is left is reach, in the backlog.
- **The old event table (H4):** replaced by the catalogue (Plan 32).
- **The tutorial:** the opening walkthrough, the board's letters, the
  school letters and the next-step line (Plans 16, 55, 58), and Plan 78.
- **The startup screen and the mascot:** Plans 07, 08 and 21.
- **The dead `prize` row:** deleted with its table (Plan 22C).
- **Camera rotation and tilt, moving pedestrians, the README screenshots,
  sound and music:** Plans 24, 34, 37, 38, 44, 48, 62, 64 and 70H.
- **The consistency review's questions:** all sixteen answered (Plans
  46–51, 59, 70C).
- **The quiet founding years:** declined by the owner (September 2026).
  The founding years are the tutorial by design, with the board's letters
  and Plan 70I's notes.
- **The rest of the map reading the college:** walkers by enrollment, the
  crane, labs at work, crowds, banners and weathering are built; a full
  residence's mark is Plan 72G.
