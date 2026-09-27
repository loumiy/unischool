# UniSchool — a full review of the game, October 2026

Plan 73. Commit read: `58fa3fd` (main, with Plan 72 B–I and K landed and 72J not). This file is area 5 of the plan: the executive summary and the ten improvements that matter most, ranked. The areas' own files hold the evidence, and every finding in them carries its source (a screenshot, a save or scenario, a file and line), a severity and an effort.

| Area | File | Findings |
|---|---|---|
| 1. Campus and asset aesthetics | [`1-aesthetics.md`](1-aesthetics.md) | 10 (6 major), each vernacular against its style, repetition, decorations to add |
| 2. UI and text | [`2-ui-and-text.md`](2-ui-and-text.md) + appendices [`2a`](2a-course-descriptions.md) [`2b`](2b-flavor-and-mechanics.md) [`2c`](2c-consistency.md) [`2d`](2d-voice.md) | 8 (3 major), the screen gallery, 431 course descriptions, 1,261 flavor claims |
| 3. Intuitive gameplay | [`3-intuitive-gameplay.md`](3-intuitive-gameplay.md) | 7 (4 major), a new player's first years, nine problems traced, the charter |
| 4. Strategy | [`4-strategy.md`](4-strategy.md) + [`4a`](4a-goal-players.md) | 6 (4 major), seven goal players over 70 games |
| 6. Marketability | [`6-marketability.md`](6-marketability.md) | the studio memo, with sources |
| 7. Bugs | [`7-bugs.md`](7-bugs.md) | 19 entries (5 major, no blocker) |

**How to read the judgments.** The reviewer is a model, not a human player. Judgments of feel ("tedious", "compelling", "looks unfinished") are labelled as the reviewer's in the area files. They rest on what a run asks of a player (idle weeks, repeated actions, words per screen), on renders and screenshots, and on hands-on sessions driven through the real UI. The owner's own playtest (70L) is still the test of feel.

## The summary

**UniSchool is deep, coherent and robust.** Nothing crashed, no save failed to load, and no invariant broke in:
- 130 simulated fifty-year games;
- 366 screen captures;
- the hands-on sessions.

The simulation is rich (431 courses, research, athletics, a league of 100 rivals). The summer, the admissions reveal and the Final Report are the best moments in the game. The prose is mostly good. The art system is consistent, and Founders Hall is a fine building.

**Its problems are about what the player sees and is asked to do, not about what the game computes.** Five run through every area:

1. **The game often doesn't say why.**
   - Year one shows satisfaction falling with nowhere to read the reason.
   - The prestige chip doesn't lead to the explanation that exists.
   - The NEXT line points at the wrong panel.
   - A derelict building reads as dirt.
   - The courses that cap prestige have no list.
2. **Some of the text isn't true.** 109 flavor claims promise what the code doesn't do. The year-two letter every player reads quotes a hall price that went stale with the Plan 71 retune. The Final Report calls surplus-running colleges ones that "never balanced its books".
3. **The player can be stuck, or decided for.**
   - The program-offer queue can't be steered, and can deadlock a new player at the second hall.
   - Events take their default while the player reads a tab.
   - Most weeks ask nothing, and 129–274 modals a run crowd the rest.
4. **Every ambitious run ends as the same college.** Four of seven strategies converge on first place, about 33,000 students and every course, by years 36–39. The late game is swapping instructors card by card.
5. **The campus doesn't yet sell itself.**
   - The chosen architecture restyles only about half of a grown campus.
   - Different buildings share one drawing.
   - The grand landmarks look like placeholders.
   - By year 50 most buildings are derelict at full maintenance funding.

**One bug loses data.** With the college open in two tabs, closing the stale one overwrites the newer game (area 7, G7-1). It needs two tabs to happen, it is small to fix, and it was raised the day it was found.

**Market view.** A niche premium game with a real audience: Academia sold over $1M, and Let's School passed 100,000 players. It is shippable once the picture, replay and AI disclosure are handled. The memo recommends a free web demo, then a Steam page and Next Fest in 2027, at $14.99.

## The ten improvements that matter most

Every finding from areas 2, 3 and 4 was grouped by the player problem underneath it. Related findings from areas 1 and 7 join a group when they share the same problem. Each group is ranked by:
- how many players it hits;
- how early in a run;
- how badly;
- the effort.

Effort: S an hour, M a PR, L a plan.

### 1. Make the first year explain itself — every player, the first 20 minutes, M

- **Findings:** A3-4 (no NEXT line in year one, and satisfaction falls with the Students tab locked until the first commencement); A3-5 (chips don't lead to their explanations); A3-6 (jargon in minute two: "4 weeks dark", "the last school sorted keeps this one", "0 of 4 seats"); A3-7 (the coach card covers the building, notes overflow the dock, a greyed course says nothing, the first hire's salary is hidden, the founding form drops "University" silently).
- **Fix:**
  - Open the Students breakdown from the first week.
  - Let the NEXT line fall back to the shortfall rule in year one.
  - Make the prestige, rank and satisfaction chips open the screen that explains them.
  - A plain-words pass over the walkthrough and Founders Hall's panel.
  - Label the chips.
  - Caption the founding facade.

### 2. Unstick the move to school halls — every player who builds a second school, years 2–5, M

- **Findings:** A3-1 (offers can't serve the letter's ask, refill only on founding and can't be declined; the claimed hall offers other schools' programs without a warning); A3-2 (the NEXT line opens the claimed hall, where nothing can be done); A4-5 (*stay small on purpose* and *decline an offer*, wanted in every good-then-big run).
- **Fix:**
  - A claimed hall's "+" offers its own school's revealed programs.
  - Allow one declined offer a year.
  - Confirm before a program takes another school's room.
  - When the step is a move, the NEXT line names the program and opens its hall.

### 3. Stop decisions happening without the player — every player, from year 2, M

- **Findings:** A3-3 (inline events default in 10–15 seconds at 1×, and the panel steps aside while a tab is open: two of four events in the session defaulted unseen); A4-3 (60–85% of weeks ask nothing, while milestone notes, up to 85 a run, and research reports, up to 52, interrupt as modals); area 7's "0 weeks to answer".
- **Fix:**
  - Hold an event's countdown while a tab is open.
  - Give each event a minimum real-time window.
  - Fold milestone notes and research reports into the summer or a digest.
  - Keep modals for choices only.

### 4. Make the text true — every player, throughout, M

- **Findings:**
  - A2-2: 109 false claims, including the stale hall price, choices that contradict their labels, placeholders that name the wrong building, money-promise titles off by up to 12×, and campaign money that funds any building.
  - A2-5: 126 of 431 course descriptions flagged, 24 of them for accuracy (the MD without internal medicine, a JD without Professional Responsibility, three wrong closing phrases in Science).
  - Area 7: the Teaching College's attrition point (G7-4); the landmark's applicant lift (G7-7); the winter model half a year off (G7-3), which mistimes eight events and kills three.
- **Fix:**
  - Work through the appendices' tables, each false claim with its proposed rewrite or code change.
  - Add a test that fails when a choice's label names a lever its effects don't touch.

### 5. Give the late game a worklist and a lever — every player past year 15, M

- **Findings:** A4-2 (the teaching standard caps prestige; *train the faculty* wanted in 28 of 30 ambitious runs; up to 99 instructor swaps in a year; "Needs attention" lists only D and F courses); A2-1 (the Curriculum has no grade filter).
- **Fix:**
  - A "below A" worklist, linked from History › Standing.
  - A Provost policy that seats the best free instructor automatically.
  - A faculty-development lever (sabbaticals, a teaching centre, mentoring) that raises teaching over time for money.

### 6. Make the Curriculum usable at size — every player from year 3, M

- **Findings:** A2-1 (2,244 words and 282 controls at year 8, 3,649 and 474 by year 16, on one scrolling page).
- **Fix:**
  - One line per program: the grade, n/9, the next course and its action. Expand on demand.
  - Grade and staffing filters.
  - The committee and offers pinned at the top.

### 7. Make the ambitious strategies end in different colleges — every player who plays twice, L

- **Findings:** A4-1 (prestige, every asset, good-then-big and big-then-good converge; first place by years 36–39 whatever the path; money stops mattering: $13.4B cash in one year-51 save); A4-5 (athletics and size have too few levers); area 1's A1-1 (the campus also converges visually).
- **Fix.** A plan for the owner. The options:
  - lasting scarcity: a college great at four schools, not seven;
  - identity tags that weigh the grade toward what the college chose;
  - an ending that grades the college against its own path.

  This is the change that decides replay value, and so the price (area 6).

### 8. Make the Final Report fair — every player, at the end, S

- **Findings:** A4-4 ("never balanced its books" reads endowment per student and goes to colleges running surpluses; "never opened its doors very wide" goes to the largest; the happiest college is graded D, since satisfaction is no axis); G7-5 (athletics can't reach an A because it is scaled twice).
- **Fix:**
  - Rename the two phrases to what the axes measure.
  - Add the student experience to the axes.
  - Scale athletics once.

### 9. One way to write a number, and a warning that warns — every player, S

- **Findings:** A2-3 ("$3,000,000" against "$2.7M"; prestige "68" in the dock against "68.1/70.0" in the ticker; the low-satisfaction figure at 1.57:1 contrast); A2-6 (39 button looks; "quiet" buttons that read as disabled; six close controls).
- **Fix:**
  - One money helper and one precision per figure.
  - A dark red for the warning.
  - A button base, one close control, `ConfirmButton` everywhere.

### 10. Make the campus worth a screenshot — every player, and every store visitor, M to L

- **Findings:**
  - A1-6: the late campus looks derelict at full funding, from event backlog that compounds (G7-2), and the derelict look itself is too faint.
  - A1-1: the vernacular restyles about half of a grown campus.
  - A1-2: seven buildings in three shapes.
  - A1-3, A1-4: the Great Dome draws itself cut in half, and the landmarks are placeholders.
  - A1-5: the stadium opens as a bare field.
  - A1-10: no seasons.
  - Area 6: the store page lives on its first screenshot.
- **Fix, in order:**
  - Stop backlog compounding at full funding (M).
  - The dome and the stadium (S each).
  - Give the invariant buildings the vernacular's surface (M).
  - One signifier per building (M).
  - A detail pass on the landmarks (M).
  - Seasons (L, and the best marketing screenshot the game could have).

### Fix first, whatever the ranking

Small and certain, and each either loses data or makes the game contradict itself. They belong in Plan 74's first PR:
- **G7-1: two tabs on one save.** Refuse to write an older save over a newer one, and add a banner in the second tab.
- **G7-3: the winter model.** Centre winter on week 26.
- **G7-4: tag teeth.** One attrition function for the preview and the summer.
- **G7-5: the athletics axis.** Scale it once.
- **G7-14: the stale hall price** in the letter every player reads.
- **G7-17a: the committed `node_modules` symlink.** Already done on the review branch, the one fix the review made.

## The tools the review added

Each writes to `node_modules/.tmp/` and can be rerun after a fix to see whether the finding moved. `tools/README.md` has usage notes for all of them.

| Tool | What it does |
|---|---|
| `npm run review:goals` | Seven goal-directed players, with a journal of what each wanted and couldn't do |
| `npm run review:strings` | Every player-facing string, by screen, with the house style's checks |
| `npm run review:arrangements` | Test layouts in every vernacular |
| `npm run review:views` | Photographs each layout from four corners |
| `npm run review:doors` | Doors, props, overhangs and depth order |
| `npm run review:gallery` | Every screen counted at two sizes |
| `npm run review:sweep` | Invariants and save round trips over many seeds and names |
| `npm run review:probe` | The small tables area 1 quotes |
| `npm run sheet -- --every` | Every placeable, each school's hall and each venue stage |
| `tools/review/drive.mjs` | Hands-on play, a few steps at a time |
| `tools/review/twoTabs.mjs` | The two-tab repro |

`npm run scenario` also gained `--from-year`.
