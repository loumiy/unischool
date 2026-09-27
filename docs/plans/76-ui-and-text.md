# Plan 76 — The screens and the words, from the review's area 2

*Planning document only. Its job is to turn the owner's answer on area 2
of the October review into PRs.*

**Status: Proposed.**

---

## 0. The owner's answer

The review ([Plan 73](73-game-review.md),
[`2-ui-and-text.md`](../reviews/2026-10-game-review/2-ui-and-text.md) and
its four appendices) made eight findings about the screens and the words.
The owner's answer: **do the recommended fixes in area 2.**

| Finding | What | PR |
|---|---|---|
| A2-1 | The Curriculum tab is the heaviest screen, and the one a player must use | B |
| A2-2 | Flavor text promises mechanics the game doesn't have | C (outside the events), D (the events) |
| A2-3 | Money and figures are written several ways | E |
| A2-4 | The voice slips in the places every player reads | F |
| A2-5 | Course descriptions: good overall, with real errors in places | G |
| A2-6 | Buttons and headings have no system | H |
| A2-7 | The phone layout crowds the map and breaks words | I |
| A2-8 | The register is out of date | H |

### What this plan takes from other areas

A false claim is fixed by changing the words or the effect. Four of area
7's bugs are the effect side of an A2-2 claim, so this plan fixes them
where the claim is fixed, and `BACKLOG.md` marks them as taken:

- **G7-4**, the Teaching College and Pressure Cooker attrition point that
  the preview shows and the summer never applies (A2-2's blurbs #1–2): C.
- **G7-5**, the Final Report's athletics axis scaled twice (blurbs #9): C.
- **G7-14**, the stale hall price in "A hall of its own": C.
- **G7-3**, the winter model half a year off, which makes "the heating bill
  for December" arrive in May and three winter events dead: D. Plan 74I's
  `seasons.ts` was written so this fix could reuse its calendar.

### Words or effect: the rule for A2-2

The appendix gives a proposed fix for every false claim, often "change the
words, or build the effect". The rule here:

- **Build the effect** when the game already has the system and the event
  only failed to call it:
  - a named professor leaving (`departs`);
  - a building declared historic;
  - the mascot set;
  - a promise made;
  - a gift paid into the restricted building fund;
  - trees felled or planted;
  - a placeholder pointed at the thing that made the event fire (the
    derelict building, a reunion class, a class twenty years out).
  Also build it when the effect table has a sign or a sum wrong: a cut
  that costs money, boosters who pay the college, a free hire.
- **Change the words** when making them true needs a new system:
  - hires outside the market;
  - closing a program;
  - placing a statue or a path from an event;
  - setting the draw rate;
  - running a campaign from an event;
  - named funds;
  - remembering which answer was chosen.
  These go to `BACKLOG.md`, with the review's list of
  recurrences that a memory of answers would stop.
- **Vague claims** whose fix is a word change are fixed in the same pass.
  Those that need a mechanic go to the backlog with the rest.

### Defaults taken where the review left the owner a choice

Each is written back into the register or Plan 47 in the PR that takes it.
The owner can overturn any of them.

1. **Board confidence** (A2-2) matters almost nowhere: it gates six events
   and one promise. **Default:** say what it does where it is shown (the
   Treasury, the event effect line), and put "confidence that the board
   acts on" in the backlog. Making the rungs read it is a design change.
2. **The mono face** (2c F1). **Default:** keep Azeret Mono for the funds
   counter, and amend the register to three faces with that one use.
   Move the trophy years, priority ranks and crash detail to the display
   face.
3. **The secondary fill** (2c B4). **Default:** one primary action per
   card, not per screen, since the register's own examples (Develop,
   Appoint) are per row. Amend R10.
4. **Starting over** has three names. **Default:** Plan 47's "New game"
   everywhere.
5. **Course sequences** (A2-5). **Default:** the sentences and titles are
   fixed. Missing core courses, no senior capstone, no 300- or 400-level
   work, and the JD's missing Professional Responsibility change the
   catalog's shape and every save's course ids, so they go to the backlog.
   Sequences out of order (CHEN110/130, CIVE110/130, AERO101, the MD's
   clerkships) are fixed by rewriting the two sentences so each level reads
   right. The prerequisites do not move.

## Rules for every PR in this plan

- One branch per PR (`plan-76x-subject`), merged once `check` and `slow`
  pass.
- **Balance moves only in C and D.** Everywhere else `npm run sim` reads the
  same as `sim/baseline.json`. C and D measure the move with `npm run sim`,
  re-record the baseline, and write the move down.
- Presentation never touches the run's random stream.
- Any state-shape change ships a save migration and a version bump.
- Every PR that changes player-facing text reruns `npm run review:strings`
  and quotes the house-style counts before and after.
- Each visual PR carries screenshots in
  `docs/reviews/2026-10-ui-fixes/`, at desktop and phone size.
- Each PR writes an **As implemented** note here.

## The map

| PR | Subject | Findings | Moves balance |
|---|---|---|---|
| A | This plan; the backlog notes | — | no |
| B | A Curriculum a player can use | A2-1 | no |
| C | The text made true, outside the events | A2-2 (blurbs, letters, promises, campaigns, seats, ladder, hints); G7-4, G7-5, G7-14 | yes |
| D | The events made true | A2-2 (the event catalogue); G7-3 | yes |
| E | One way to write a number | A2-3; 2c §4.7, C1 | no |
| F | One voice | A2-4; 2d §1–6; 2c §4.6 | no |
| G | The course descriptions | A2-5 | no |
| H | Buttons, headings and the register | A2-6, A2-8; 2c §4.1–4.5, 4.9 | no |
| I | The phone | A2-7 | no |

B, E, G, H and I can land in any order. D lands after C, since both change
effects and each re-records the baseline. F lands after C and D, since it
re-reads the strings they leave.

---

## PR 76A — The plan

- This document, and its row in `docs/plans/README.md`.
- `BACKLOG.md`:
  - the triage entry says area 2 is taken into this plan, and that G7-3,
    G7-4, G7-5 and G7-14 are taken with it;
  - the backlog items this plan names go into *Named, not sequenced*.

## PR 76B — A Curriculum a player can use

*A2-1.* At year 8 the tab is 2,244 words and 282 controls on one scrolling
page, and 3,649 words and 474 controls by year 16.

- **Each program is one line:** the grade, "n/9", the next course, and its
  one action. The line expands on demand to the course cards as today. The
  choice of which lines are open is kept per player (settings, not the
  save).
- **Filters:** "Below A" and "No instructor", beside "Needs attention",
  which today flags only D and F courses.
- **The committee and the offers stay pinned** at the head of the tab.
- **Checks:**
  - the gallery's word and control counts for the tab, quoted before and
    after at years 8, 16 and 25;
  - a test that each filter returns the courses it names.

## PR 76C — The text made true, outside the events

*A2-2, the first two of the appendix's three reports: 43 false claims and
92 vague ones, in the building blurbs, identity tags, quirks, research,
the Final Report, the chronicle, alumni, letters, promises, campaigns,
seats, the ladder, the figure hints and the help hints.*

- **Effects built** (balance moves):
  - The attrition teeth are applied at the summer by the one function the
    preview uses (G7-4).
  - The Jock School's six points reach every team's quality, not only the
    department total.
  - The Final Report reads athletics on its own 0–100 scale (G7-5).
  - Building-fund money pays renovations and library floors, so the
    Restoration and library campaigns can be spent on what they name.
- **Words filled in from the code:**
  - "A hall of its own" reads Elm Hall's cost and weeks from its
    Buildable (G7-14).
  - Promise titles with money in them show the scaled sum the promise is
    judged on.
  - Promise terms read their `years`.
  - Letters name their year gates (the Research Park from Year 12, the
    Graduate College from Year 15), from `PROJECTS`.
- **Words changed:** every other false claim in the two reports, and every
  vague one whose fix is a word, as each row proposes. Some examples:
  - "never balanced its books" becomes "never built an endowment to match
    its size";
  - the chronicle's "the books closed in the red" reads the change in cash
    as a change in cash;
  - the Pilot Study's "Publications" becomes "Rarely a paper";
  - the Multi-Sport Field names its sports;
  - "A facility serves a fixed number of students";
  - the Facilities seat's storms, which reach the President anyway;
  - the seat policies' "Keep the faculty with you", which read student
    mood.
- **The Final Report's shapes:**
  - "and a very good one" is gated at the B line;
  - "the books mostly balanced" reads the distress record;
  - The Bargain's weakness clause attaches to the college, not "its
    region".
- **Checks:**
  - the attrition applied at the summer equals the preview's;
  - a Jock School team plays six points stronger;
  - a department at strength 90 reads 90 on the report;
  - a renovation can draw on the building fund;
  - every promise title with a sum names the sum it is judged on;
  - no letter names a price or a week count that its Buildable
    contradicts.

## PR 76D — The events made true

*A2-2, the third report: 154 events, 112 tellings, 373 choices; 66 false
claims and 107 vague ones.*

- **The winter model** is centered on week 26, the turn of the fall and
  spring terms, reading `seasons.ts`'s calendar (G7-3). The ambience reads
  the same. The winter events that could never fire can fire. "The
  heating bill for December" arrives at the end of the Fall Term.
- **Effect tables corrected:**
  - a cut that costs nothing;
  - boosters and reunion classes who pay the supplier, not the college;
  - free hires and appointments that cost what their sibling events charge;
  - "Put it into the buildings" pays once;
  - the storm fells the limes it names;
  - "Fell and replant" plants.
- **Effects built on systems the game has:**
  - `departs` where a professor resigns or is denied;
  - a building declared historic where a listing is welcomed;
  - the mascot set where the heron is adopted;
  - a promise made where a rise is promised;
  - a gift paid into the restricted building fund where it is given for a
    building;
  - `{building}` is the derelict building in the derelict letter, and the
    worst-kept building in the boiler, pipe, roof and sinkhole letters;
  - `{class}` is a reunion class for a reunion gift, and a class twenty or
    more years out for a famous graduate.
  New effect keys join `EffectKey`, each with its rendered line in
  `EventPanel.tsx`.
- **Gates fixed:**
  - Events that describe a retirement, a long-serving trustee or a
    thirty-one-year secretary wait for a year when that is possible, and
    fire once.
  - The two dead events are deleted or regated, and `bad-run`'s v2 mood
    scale is fixed.
  - `the-championship-run` fires on a new title.
- **Words changed:**
  - every other false claim, and every vague one whose fix is a word;
  - hires outside the market, program closures, map placements, the draw
    rate, event-run campaigns and named funds are relabeled to what the
    effect does;
  - the British vocabulary in the events (the appendix's pattern 7), with
    the review's American replacements;
  - the rendered effect line stops overstating: "repays" only what is
    owed, and "+1 freshman".
- **The lever test** (the finding's fix): a test fails when a choice's
  label names a lever (hire, close, draw, salary, repair, plant, fell,
  list, promise, campaign) and its effects don't touch it.
- **Checks:**
  - every catalogue event can fire in some year (a sweep over the
    conditions);
  - the named building is the derelict one;
  - the heating bill fires in the Fall Term's last weeks.

## PR 76E — One way to write a number

*A2-3, and 2c §4.7 and C1.*

- **One money rule**, written into the register:
  - `money` in sentences and statements;
  - `moneyShort` on every tile, card, chip and salary tag;
  - one `Intl.NumberFormat('en-US')` under both, so a German browser
    reads the same figures.
- **One precision per figure:**
  - Prestige shows one decimal everywhere, the dock included, so it never
    rounds past an unmet milestone.
  - Satisfaction shows whole numbers everywhere.
  - Deltas are computed from the rounded values.
- **The low-satisfaction chip** is a dark red on cream (`--bad-on-light`),
  and the class that paints it is renamed away from `money-negative`.
- **The rest of §4.7:**
  - a true minus in hand-built signed figures;
  - one fraction form;
  - `pct` for percentages;
  - "×1.54";
  - one `gameDate()` for the dock, the title screen and the letters;
  - "Nw" on chips and buttons, derived from the constants;
  - "/wk" with no space.
- **Checks:**
  - a test that `format.ts`'s helpers read the same under `de-DE`;
  - a scan that no player-facing money bypasses the helpers.

**As implemented** (#TBD):
- **The rules** are the register's new "Numbers" section
  (`docs/architecture/ui-shell.md`). `format.ts` holds one `en-US`
  formatter and the helpers: `count`, `decimal`, `money`, `moneyShort`,
  `signed`, `signedMoney`, `pct(v, digits)`, `signedPct`, `multiplier`,
  `prestigeFigure`, `satisfactionFigure`, `fraction`, `weeksShort`,
  `weeksProse`, `gameDate`, `calendarDate`.
- **Money by surface.** Short on the build tiles (cost and loan note
  alike), the hall panel's course lines and offer tiles, every salary tag
  (the Athletics team row, market and AD; the AD modal; the Faculty
  cards; the administration's seats), event choice chips, research offer
  cards, org and alumni rows, and priced buttons (Renovate, Add a story,
  Found, Commission, Post a search, Appoint). Long in sentences,
  tooltips, the statement and the `<dl>` ledgers: the Faculty tab's
  tooltips move from short to long. The admissions tuition line and the
  campaign log line now go through `money`.
- **Counts.** 134 player-facing `toLocaleString()` calls are `count()`;
  the debug panel keeps its own. The title screen's save date is
  `calendarDate`.
- **Precision.** Prestige is floored to one decimal everywhere: the dock,
  the ticker, the ladder, History, the milestone modal, the review, the
  report-card log line. Flooring, not rounding, is the review's own
  alternative applied at one decimal, since 69.96 rounded still reads
  "70.0". Satisfaction is floored to whole points everywhere, the Students
  tab's effects included; each layer's effect is the move in the target as
  shown, so the lines agree with it. The admissions modal, the milestone
  modal and the summer review build their deltas from the shown figures.
  The dock's prestige chip fits at "68.0" on a phone.
- **The low-satisfaction chip** is `.stat-warn`, `--bad-on-light` on
  cream (5.9:1). Color-safe mode's `--bad-on-light` read 4.3:1 on cream,
  so it deepens from `#b35a00` to `#9a4d00` (5.5:1); that reaches every
  safe-mode use of the token, all of them on paper.
- **The rest of §4.7.** Fractions are tight ("5/9"), since the code did
  not lean either way. Rates of money read one decimal wherever they
  appear; other percentages are whole. The research depth chip, the
  Renovate and Add a story buttons, the Move button, the Endowment's
  "Keep 8w", the board letter's sweep button and both map labels ("8w
  left", construction and research) read "Nw" from their constants; the
  Estate's help text reads `RENOVATION_WEEKS` instead of "eight". The
  research log line and prose say "26 weeks" or "3 years". The event
  panel's own `signed` wrote a hyphen for a loss and is gone. The Hall of
  fame's plaque drops the calendar year and keeps it in a tooltip.
- **One date.** The dock, the title screen, the chair's letter, the letter
  to the President, the board's letters and the demand deadline read
  `gameDate`.
- **Departure.** The chronicle and the final report keep `moneyShort` in
  their sentences: they sum up fifty years, and the register names them as
  the exception.
- **Checks:** `test/number-format.test.ts` (56 checks), with
  `test/fixtures/german-browser.ts` making de-DE the default for every
  unguarded formatter before `format.ts` loads. It reads each helper, the
  precisions and the date, and scans `src/` (less `format.ts` and the
  debug panel) for `toLocaleString`, a "$" written by hand before a
  template or JSX figure, and a short money figure built with `toFixed`.
  Each scan rule carries an example it must catch. With the formatter's
  locale removed, 20 checks fail.
- `npm run sim` reads the same as the baseline.
- `npm run review:strings`: 6,840 strings and 47,122 words before, 6,814
  and 47,083 after (the helpers fold "Year {n}" and "{n}w" fragments into
  calls). House style unchanged: 38 British spellings, 68 idioms, 22
  repeated sentences, 58 second person, 4 contractions, no exclamation
  marks.
- Screenshots: `docs/reviews/2026-10-ui-fixes/numbers-build-and-dock.jpg`,
  `numbers-dock-phone.jpg` (satisfaction set to 40) and
  `numbers-athletics.jpg`.

## PR 76F — One voice

*A2-4, and every row of 2d §1–6 and 2c §4.6.*

- **A glossary in Plan 47**, one word per thing:
  - a hall's places are "rooms";
  - "seat" is an administration post;
  - teaching capacity is "places";
  - "the guide" is the ranking;
  - "the board's scale" is the distress ladder;
  - "Stage" is a program's standing.
  The code names that leak through ("the wall", "housed", "the recreation
  chain", "flat", "cohort signal", "varsity-active", "initiative") get
  their plain words.
- **The engine out of the prose:**
  - "the weekly tick", "the run", "beat", "interrupts play", "unlocks",
    "revealed", "earned", "throttle", "pacing";
  - the game-speed control said as the setting it is.
- **The rankings and admissions modals** in the house voice: no
  contractions, no cheer, "the college" rather than "you".
- **The American pass** outside the events: the 31 rows of 2d §4, and the
  quirk names the scan missed.
- **Plan 47's own rules:**
  - "a letter to the President" in the summer review, not "from the
    board";
  - "Nw";
  - every armed label reads "Confirm — ‹what is lost›";
  - sentence-case headings;
  - "New game" everywhere.
- **The vague lines** of 2d §6 say what they mean.
- **The scanner keeps them caught:** the missed words go into
  `tools/review/strings.ts`'s checks, and the quirk names and the summer
  review's answered-by lines are extracted.

## PR 76G — The course descriptions

*A2-5.* 126 of 431 sentences flagged.

- Every flagged course takes the appendix's proposed sentence, checked
  against the course's place in its sequence. Titles are fixed where the
  appendix fixes them.
- The house test (`test/course-descriptions.test.ts`) gains:
  - the event catalogue's spelling check;
  - a check that a sentence does not restate its title;
  - a cap on "from X to Y" spans per school.

## PR 76H — Buttons, headings and the register

*A2-6 and A2-8, with 2c §4.1–4.5 and §4.9.*

- **One button base:** 2 px of outline ink and `--shadow-1`, with the fill
  by role:
  - secondary for the card's one primary action;
  - cream for the rest;
  - transparent with the outline for "quiet";
  - a red outline for destructive actions, pink when armed.
  The `!important` overrides go, and "Show the rest of the market" gets a
  surface.
- **One close control:** a round ✕ for panels, and the "Close" pill for
  full-bleed tabs.
- **`ConfirmButton` everywhere** a loss is confirmed (Faculty Dismiss,
  "Found another college", coach release, program moves). Each disarms on
  blur and on Escape.
- **A heading scale:** three title levels (screen, dialog, panel), one
  `.eyebrow`, one `.section-head`, display tokens for the large sizes, and
  `body` at `--text-base`.
- **The rest of 2c's departures:**
  - one segmented control;
  - buttons in sentence case;
  - one tooltip look;
  - named elevations;
  - token colors for the grade chips and the cohort bar;
  - no blurred shadows;
  - "Wind up" on one line;
  - the recurring glyphs in `icons.tsx`, with ✕ kept for close.
- **The register** (`docs/architecture/ui-shell.md`) is brought up to date:
  - the tabs, the gears, the toasts;
  - three faces;
  - the palette;
  - the camera buttons and the `L` key;
  - the button, heading, close, number and elevation rules this plan
    writes.
  Plans 18 and 22 are not edited; the register says what replaced their
  claims.

## PR 76I — The phone

*A2-7.*

- The admissions cohort labels hyphenate or shorten ("Pre-prof."), and the
  beat headers wrap.
- The dock collapses to its figures while a panel is open, so the Build
  menu shows its cards.
- The Build button no longer covers the last tab.
- The pennant is capped at two lines with an ellipsis.
- **Checks:** the gallery at 390×844, at normal and at the largest text
  size.

## What this plan does not do

- The mechanics that would make a false claim true, where this plan
  changes the words instead (see §0): in `BACKLOG.md`.
- Board confidence that the board acts on, until the owner decides.
- The course catalog's shape (see §0, default 5): in `BACKLOG.md`.
- The review's other areas, which wait for the owner's triage, except the
  four area 7 bugs above.
