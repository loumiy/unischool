# Plan 76 — The screens and the words, from the review's area 2

*Planning document only. Its job is to turn the owner's answer on area 2
of the October review into PRs.*

**Status: Landed.** A to I merged (#221–#226, #228–#230).

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

**As implemented (#222):**
- Every program starts folded to its one line: the grade, the hall, the next
  course's Develop button with its grade, the cost, the milestone and
  "n / 9". A folded line leaves out "choose…" and the batch start; the ▸
  opens the full row and its cells as before.
- The open lines are remembered for the session, as Plan 60's collapsing
  already was. They are not kept in settings.
- "Below A" and "No instructor" sit beside "Needs attention". The filters
  moved to `tabs/curriculumFilter.ts`, and `test/curriculum-filter.test.ts`
  reads them on a guided college at year 8.
- The head (the offers, the committee and the filters) is pinned where the
  screen is at least 900 by 700 px. On a phone it scrolls with the page,
  since pinned it would take most of the screen; PR I is the phone's.
- The tab, measured with the screen gallery's count on guided saves:

  | Save | Before | After |
  |---|---|---|
  | Year 8 | 2,244 words, 282 controls | 885 words, 52 controls |
  | Year 16 | 3,548 words, 473 controls | 991 words, 57 controls |
  | Year 25 | 1,881 words, 254 controls | 830 words, 73 controls |

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

**As implemented (#224):**
- **Effects:**
  - The summer applies the attrition teeth through the preview's own
    `summerAttrition`, passed the year's average it has already read
    (G7-4).
  - The Jock School's six points moved from the department total into
    `teamQuality`, so every team plays them, and the department total
    reads them through the teams.
  - The Final Report reads athletic strength on its own 0–100 scale
    (G7-5).
  - Renovations, stories and library floors take the building fund
    first and cash for the rest (`treasury.ts`'s `payForWorks`). The
    Restoration campaign can now do what it says, and the Library
    campaign's "wing" became a new floor, which the fund can pay for.
    Venue expansions stay cash only.
  - The alumni "deficits" memory reads years the board's scale reached
    Deficit, not years cash fell. Building or sweeping a surplus no
    longer counts as bad news, and the clause reads "there for the lean
    years".
  - The Artsy tag's club test also reads jazz, orchestra, a cappella,
    drama, improv, ceramics, band and ballroom.
  - "Out of the hole" no longer also needs board confidence of 70, which
    no text stated.
  - "Turning people away" is offered below a 50% admit rate, so "admits
    most of those who apply" is true.
- **Promises:**
  - An open promise keeps the price scale of the summer it was made, in
    an optional `scale` on its record. No version bump: the field is
    additive, and a promise made before it reads the live scale.
  - Its sums are judged at that scale and printed at it: `{sum}` in the
    four money titles and their lines.
  - `{years}` fills the four terms that were typed as "a decade" or
    "fifteen years".
- **Words filled in from the code:**
  - "A hall of its own" reads the hall's cost and weeks (G7-14).
  - Every capital project's "Opens…" sentence is built from its gates
    (`projectOpens`), so the Research Park and Graduate College letters
    and descriptions name Year 12 and Year 15, and the Museum its late
    tier.
  - The varsity petition names its weekly running cost.
  - The chair's and the coach's pay are shown at the rate the payroll
    charges.
- **The Treasury** has a Student life line (clubs, chapters, teams and
  their staff at the athletics tier), so its lines add up to Total
  expenses.
- **Words changed:** the false and vague rows of the first two reports,
  as proposed, except these:
  - The Deficit letter's "would like to see a surplus before it sees
    another building" is kept: it states the board's wish, not a rule,
    and the voice appendix names that letter among the best.
  - Seat policy labels now name what the rule reads (the students' mood)
    rather than being reweighted.
  - The research offer card's "~0.4 publications" is left for the voice
    pass.
  - The dead applicant bonuses (the landmarks' 1,500 and the milestones'
    30–60) are code with no text promising them; they are named here
    and left.
  - The report tags whose claimed standing their test does not read
    (commuter, country club, pressure cooker) are left as the review
    found them.
- **The Final Report:**
  - "and a very good one" became "with no glaring weakness", which is
    what the shape tests.
  - The Bargain's phrase is "a bargain college".
  - The finance, experience, academics and athletics weaknesses say
    what their standings read.
- **Also in the strings touched:** the British words the appendices
  list for these files: the dorm blurbs, the quirks, "prospectus", "the
  fee", "the Bursar", "the Clerk", "table" for rankings, "Signalling"
  and "Handover".
- **`test/text-true.test.ts`** (15 checks):
  - the summer's attrition matches the preview's for a Pressure Cooker
    and a Teaching College;
  - a Jock School team plays six points stronger;
  - the building fund pays a renovation, and must cover it with the cash;
  - a promise's title names the sum it is judged on, and the goal holds
    at that scale;
  - "A hall of its own" quotes the hall's price and weeks.
  
  The alumni, chronicle, figures, final-report and promises tests follow
  the new words.
- **`npm run review:strings`:**
  - British spellings 38 → 37;
  - idioms 68 → 67;
  - second person 58 → 56;
  - contractions 4 → 3.
- **Balance** (`npm run sim`, re-recorded):
  - Completionist ends year 50 at prestige 141.7 (−1.4) with $404M
    (−$169M).
  - Guided ends at 143.8 (+1.5).
  - Lean's year-50 median moves most: 4,657 enrolled (−7,577), prestige
    99.5 (−6.2). Lean's enrollment swings by thousands of students within
    two years on either build: with only the attrition fix reverted, one
    seed still ends year 41 at 7,114 after reaching 12,306. The median
    records which of its three runs diverged, not a steady loss.
  - Selective and Idle are unchanged.

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

**As implemented (#228):**
- **Winter** is `state/winter.ts`'s `winterDepth`: it sets in from week
  17, is deepest from week 24 to week 29, and is gone by week 36. The
  events' `winterAtLeast` and the ambience's wind both read it. The
  heating bill arrives in the Fall Term's last weeks. The dark term
  reads a new `springWeekAtMost`, so it is the Spring Term's start.
- **New condition keys:**
  - `springWeekAtMost`;
  - `rankAtMost`, for the rankings-slip and guide events;
  - `titleRecentAtLeast`: the championship run fires on a new title.
- **New effect keys:**
  - `replant`: fell-and-replant plants;
  - `buildingFund`: a gift for a building goes to the restricted fund
    and scales with prices;
  - `historic`: a welcomed listing declares the named building historic.
  
  Each has its line in `EventPanel.tsx`.
- **New fields on a choice:** `promise` makes a promise (a new
  `a-rise-in-the-guide`: a top-20 rank within five years), and `mascot`
  names the teams (the heron became the swan, "the Swans").
- **Named buildings and classes:** `names` on an event picks `{building}`
  and `{class}` from the college without changing the random stream:
  - the derelict building for the derelict letter;
  - the worst-kept roofed building in the repair letters (boiler, pipe,
    roof, slates, buckets, elevator, sinkhole, ivy, asbestos);
  - the oldest building that can be listed, for the listing;
  - Founders Hall for its clock;
  - a reunion class for the reunion gift and the class letter;
  - a class twenty or more years out for a famous graduate.
- **Gates:**
  - Retirements, long-serving trustees and the thirty-one-year secretary
    wait for a year when that is possible.
  - The guidebook's "for the first time" fires once.
  - The all-nighter needs a library.
  - The two dead events: `nothing-to-study` is deleted, and `bad-run`
    reads satisfaction on this game's 0–100 scale, as does `rag-week`'s
    floor, which was always true.
- **Effects corrected** as listed above.
  - The key-card answer no longer clears $80,000 of repairs.
  - Clearing more debt than is owed returns the rest as cash.
  - The rendered line caps a draw at what the endowment holds and
    "repays" only what is owed.
- **Words:**
  - Every false claim whose fix is a word is fixed, along with 81 of the
    107 vague rows; 16 more were already true after the winter and gate
    fixes.
  - Answers are relabeled to what they do: "Pay a retention bonus",
    "Tarp it and wait", "Offer a one-term stipend" and so on.
  - Named officers who are not seats in this game read as offices: the
    facilities office, Student Affairs, Academic Affairs, the Dean's
    office.
  - The British vocabulary is gone from every telling: car park, porter,
    lift, rota, Bursar, prospectus, timetable, first-year, fume cupboard
    and the rest.
- **Left, each needing a memory of answers or a new system** (added to
  the BACKLOG's *Events that do what they say*):
  - five events that recur after an answer settles them;
  - the star lecture and the grant windfall want a faculty member chosen
    by strength;
  - the library acquisition wants a library lever;
  - the booster club's gift wants routing to athletics;
  - the essay ring's enrollment cost wants spreading over the years;
  - repair letters still spread backlog over the whole campus, and the
    sinkhole and the ivy are not drawn.
- **Checks:**
  - `test/event-truth.test.ts`, 1,055 checks, including:
    - every event can fire within fifty years, in a week the catalog
      ticks;
    - the lever test;
    - the named-building and class checks;
    - the new keys.
  - `test/event-catalogue.test.ts` now checks spelling and a list of
    British words across every telling and every letter's title.
- **The sim** is re-recorded. Events now do what they say: winter
  letters arrive, a denied tenure case loses the professor, a bequest for
  a building goes to the building fund, and boosters pay the supplier, not
  the college.
  - Guided still ends first, at prestige 143.8.
  - Completionist and Lean move by run divergence.
  - Idle's early years dip as the winter letters reach a college with
    nothing to spend.
  - Selective falls from rank 14 to 23 at year 50, with prestige −9.6 and
    satisfaction −10.
    - On seed 12345, its academic score drops below the 65 at which it
      builds for its worst need, after professors leave. Nothing on the
      build menu serves academic, so from year 16 it builds nothing more
      and banks the cash.
    - Restoring the tenure case's old effect recovers part of the gap;
      restoring the gifts' cash recovers part of seed 4242's.
    - This is the archetype's blind spot, not the game's: a player
      restaffs. It is recorded in the BACKLOG, not tuned here.

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

**As implemented (#226):**
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

**As implemented (#230):**
- **The glossary** is Plan 47's new §2, with the voice, the one-name list,
  a table of the code's words and what the college says instead, the engine
  words kept out, lists and case.
  - A hall's places are **program slots**, not rooms: the game already said
    "slot" in about twenty strings, and "room" already meant the places
    left for a new class. The walkthrough's and the first-hall letter's
    "rooms" became slots.
  - A professor's capacity is a **course slot**, always qualified.
  - **Seat** is an administration post only. Teaching capacity is
    **places** ("the catalog's places", "+80 places"); **room** is the
    places left for the incoming class. The curriculum committee lost its
    seats: it "writes up to four courses at once".
  - **The guide** is the ranking ("#12 in the guide", "Six rankings, one
    field"); **the board's scale** is the distress ladder; **Stage** is a
    program's standing in the hall panel.
- **Code names:** the wall (Waiting on faculty), housed, the recreation
  chain, flat, cohort signal, varsity-active, initiative (research
  project), revealed and unlocks (open; can be built once), earned, tier
  (Level N; capstone and upper-level courses; subsidy level), the pot (the
  department's fund), chair (a coaching post), ceiling (limit; a coach's
  potential), attribute (need), stock, floored, and "dark" for a program
  moving halls (closed while it moves).
- **The engine out of the prose:** the weekly tick, "the rest of the game",
  the Students beat, "interrupts play", "scrolled off the log", "the
  slider", the Treasury's "Being large" cited by name, the pennant pointer
  in the charter line, "pts/wk" (now "0.85 a week, of the 90 a paper
  takes"), "interdisciplinary bonus" (lift), "No new era of the game
  opens". The speed control reads "game speed 4×" and "Game speed 8× (4)";
  the sandbox gear is "Fastest, for the sandbox (5)". The save-failure
  lines say "the game", not "the run".
- **The rankings and admissions modals:** "The college enters the guide",
  "This year's standings: the college is #12", "The largest moves", "no
  college in the country is ahead", "What will the college charge next
  year?", and the price tags read the college's prestige, not "your
  prestige" ("expect sticker shock"). The admissions cohort's driver and
  the Deans' letter follow. No contractions are left in the game.
- **The American pass:** every row of 2d §4 that PR C or D had not already
  taken: Catalog, sorted, car park, queue ×2, rota, timetable,
  organisational, the academic table and "Six tables", the estate
  (Buildings and grounds, the campus), round, full marks, Welfare
  (Student well-being), the faculty have and the common room, the Bursar
  (the business office), a wood. The quirk names were already American;
  "the dean's" is "the Dean's". "Final mark" and "The mark" on the share
  card are grades.
- **Plan 47's own rules:**
  - The summer review's letters read "{title}, a letter to the President:
    {answer}", and its tally "answered by the President, by the
    administration, left unanswered".
  - "Nw": PR E had done the rest; the demand deadline chip and the
    research card's progress join it.
  - Every armed label names its loss: "Confirm — it can never come down"
    (historic), "Confirm — the site is cleared", "Confirm — {building}
    comes down", "Confirm — $2M never comes back to cash", "Confirm —
    {name} leaves the classroom for good", "Confirm — a salary for good",
    and the menu's "Confirm — erase {college}".
  - Sentence case: the Build menu's groups, Varsity athletics, Basic
    needs, Satisfaction breakdown, "The curriculum" crumb, the Curriculum's
    and the director's buttons (Choose…, All N with…, Waiting on…,
    Another), "An Athletic Director", "Fall term" and "Spring term",
    "Satisfaction" for "Satisf.". "The Final Report" is a name and keeps
    its capitals everywhere, the fiftieth summer's step included.
  - "New game" on the title screen, the Final Report and the hall of fame,
    where they said "Found a new college" and "Found another college".
- **The vague lines** of 2d §6 say what they mean: the attrition hint
  names the line (50) from its constant, the next-step line names what to
  build, the athletics surplus says when it is paid, the board's relief
  letter says its confidence rises, the Students section's empty line
  names what did not happen, the dorm without a bed count shows no line,
  and the rest as the rows propose.
- **Lists** take no serial comma unless one is needed for sense, as most
  of the game already wrote them; the noun lists outside the events that
  had one lost it.
- **The scanner** (`tools/review/strings.ts`):
  - 25 idioms from 2d §4 join the list (the estate, the academic table,
    round, apartment block, biscuits, full marks, bursary, "read a
    subject", dear, welfare, handover, research charity, first-years,
    upper years, the faculty have, common room, proper, consultancy, a
    wood, sporting college, out of the door, prospectus, the Bursar, "lost
    the semi", the lift), and "organisational" the spellings. An idiom can
    carry a pattern that excuses it: an estate beside a bequest is a
    dead man's, not a campus.
  - "sorted by" and a post (a job) no longer flag.
  - A new section, **Engine words in the prose**: tick, the run, beat,
    unlocks, revealed, throttle, pacing, the wall, housed, the recreation
    chain, flat, cohort signal, varsity-active, initiative, stock, floored,
    pts, "of the game", the ladder, the slider, yield step, the pot,
    committee seats. The menu, Settings, the title and founding screens,
    the crash screen and the credits are exempt.
  - Quirk names are read (`SAYING_NAMES`), and a string that is the object
    of a naming call (`[…].filter(…)`, `.join(…)`) is no longer dropped,
    which brings in the summer review's answered-by parts.
- **Left:**
  - The research depth "Landmark Program" keeps its name beside the Grand
    Landmark buildings; renaming it (2d suggests "Signature Programs") is
    the owner's.
  - "One pool for the whole department" (the coaching market) keeps its
    pool: it is labeled where it sits.
  - The event catalogue's "proper" ×5 and the "Monday" and "flat roofs"
    flags are PR D's text and read American.
  - `Credits.tsx` credits "Louis Miyani": for the owner to confirm.
- **Checks:** `npm run check` passes (116 suites). `year-in-review` checks
  the new tally and that the summer's letters are letters to the
  President; `number-format`, `share-card` and `course-quality` read the
  new words. `npm run sim` reads the same as the baseline.
- **`npm run review:strings`** (the new scanner on both trees, so the
  counts compare): British spellings 2 → 0; idioms 41 → 10 (the rest in
  the events and the course descriptions); engine words 68 → 0; second
  person 56 → 40; contractions 3 → 0; exclamation marks 0 → 0; 21 → 22
  repeated sentences (the lapsed-letter fallback now has one title,
  twice). With the old scanner: British spellings 1 → 0, idioms 16 → 8,
  repeated 21 → 22, second person 55 → 40, contractions 3 → 0.

## PR 76G — The course descriptions

*A2-5.* 126 of 431 sentences flagged.

- Every flagged course takes the appendix's proposed sentence, checked
  against the course's place in its sequence. Titles are fixed where the
  appendix fixes them.
- The house test (`test/course-descriptions.test.ts`) gains:
  - the event catalogue's spelling check;
  - a check that a sentence does not restate its title;
  - a cap on "from X to Y" spans per school.

**As implemented (#223):**
- 132 sentences replaced:
  - 123 of the 126 flagged rows;
  - COMP240, the other half of the fix to the operating-systems and
    web-development levels;
  - POLS210, so "the Court" matches LAWS530;
  - SPCO110, "transportation";
  - the appendix's four copyedits (FINA101, MRKT140, ARTF120, CYBR210);
  - GRDS101 and NURS101, two stock-phrase 101s from the appendix's
    patterns.
  ENGL140, ACCT230 and FINA130 keep their sentences, as the appendix says.
- Seven titles changed, in display text only. A save picks up the new names
  on load, so there is no schema bump.
  - Rhetoric & Composition (ENGL140)
  - Introduction to Aerospace Engineering (AERO101)
  - Intermediate Financial Reporting (ACCT220)
  - Cost Accounting (ACCT230)
  - Intermediate Microeconomics (ECON130)
  - Statistical Learning (ARTF140)
  - Gerontological Nursing (NURS230)
- Where the appendix renumbers or swaps courses, the ids stay and the
  sentences are rewritten so each level reads right: CHEN110/130,
  CIVE110/130, COMP130/240 and MGMT140. MATH101 and MED570 are shortened to
  match their neighbors. These swaps and bridges go to the backlog with
  the rest of default 5: FINA130/210, ACCT140/240, MED550/600, the JD's
  540/570, and the ACCT110 and MATH130 bridges.
- American spelling throughout: every "Analyses", and the -ise and -isation
  forms, "signalling", "counselling", "post-war", "take-off" and
  "re-tests". British spellings across the catalog fell from 38 to 5 in
  `npm run review:strings`, none of them in the course descriptions.
- The house test gains three checks over all 431 sentences:
  - the event catalogue's spelling regex, plus the British forms found
    here;
  - a title check: a sentence keeps at least four words of its own, and
    five when it names its whole title;
  - "from X to Y" held to three per program and twelve per school (51
    sentences now, 88 before).
  Against the old file the suite fails 55 checks.

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

**As implemented (#229):**

- **One button base**, drawn once in `styles.css`'s new block "The
  register's parts": 2 px of outline ink, `--shadow-1`, a pill, the display
  face at 800, sentence case. The fill is by role: `.btn-primary` (the
  secondary fill, one per card), cream (`.btn` and the existing pill
  classes), `.btn-quiet` (no fill, the same outline and offset) and
  `.btn-danger` (a red outline; pink once armed). Component rules keep only
  their geometry. A dialog's action row is `.modal-actions`: its bare buttons
  are primary and a classed button keeps its role, so `.modal button` and its
  `!important` overrides are gone. `.save-btn`/`.newgame-btn` became
  `.menu-btn` (+ `.btn-quiet`). One `.segmented` control (Faculty views,
  build categories, subsidy, Settings, species, a seat's policy, the
  sweep): cream pills, the picked one in the secondary fill.
- **One close control**: `.close-btn`, a round ✕ from `icons.tsx`'s
  `CloseIcon`, on every popup, panel, drawer, toast, the Settings, Credits
  and Hall of fame cards, the quad panel, the research card's "Not now" and
  the folded map tools; the tab keeps its "Close ✕" pill.
- **`ConfirmButton` everywhere**: Faculty Dismiss ("Confirm — 6 courses left
  unstaffed"), Found another college (its Stay is now blur or Escape), the
  coach release ("Confirm — release; the post stays open"), the program moves
  ("Confirm — {program} closes {n} weeks") and the import ("Confirm — replace
  {college}"). `ConfirmButton` already disarmed on blur and Escape; it gains
  `ariaLabel` for an icon label.
- **A heading scale**: display tokens `--text-2xl…5xl` (22, 26, 32, 44 px);
  `.heading-screen` (32), `.heading-dialog` (26), `.heading-panel` (17),
  `.section-head` (14), `.eyebrow` (11, capitals, three words or fewer) and
  `.dateline` for longer lines above a title, each grouped over the rules
  that were one-offs. `body` is `--text-base` and controls inherit it.
- **Done**: F1 (mono for the funds counter only; trophy years, priority
  ranks and the crash detail in the display face), F3–F6, S1–S7, C2–C8,
  B1–B11, I1 (close, disclosure, rename, release, remove, the camera turn,
  the map tools, status marks into `icons.tsx`), I2 (✕ is close only; the
  camera turn has its own arc), I3 (Students tab on `StudentsIcon`, redrawn
  as three heads), I4 (→ dropped from in-dialog steps and "Start research"),
  I5 (one done/pending/failed set on the ladder, promises and
  prerequisites), K2, K4, K5, P1–P3 (the scale; both insets on the panels
  and inner cards; the trophy's rem and the ladder's em in px), O1, O2.
- **Skipped**: F2 (the share card's fonts need the woff2 files embedded in
  the SVG; not straightforward). I3's own glyphs for fell, lamps and benches,
  and I5's two sets of rank arrows (new drawings, left for later). The
  Curriculum's collapse chevrons (PR B rewrites those rows). The tilt and
  home glyphs on the touch camera buttons stay Unicode. SVG text in charts
  and the satisfaction dial is sized in the drawing's units, so it stays off
  the type scale. The inline "?" stays flat. `.modal p`'s margin
  `!important`s are not buttons and stay.
- **Register** (`docs/architecture/ui-shell.md`): the tabs (one Students tab,
  four gated), the five gears with 8× on `4` and `5` for the sandbox, the
  toasts (6 s, at most 4), the camera buttons and Map tools, `L` for
  Students; "The register" rewritten as Tokens (the palette as it is, three
  faces, the type and spacing scales), The two rules (R10: one primary
  action per card), Buttons, The close control, Headings, Floating layers,
  Icons, and What this replaces (Plans 18 and 22 left as written).
- **Checks**: `npm run check` passes; `npm run sim` reads the same as the
  baseline; `npm run phone` passes at 390×844 and 820×1180. Screenshots:
  `docs/reviews/2026-10-ui-fixes/buttons-*.jpg` and `headings-*.jpg`.

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

**As implemented (#225):**

- Everything below applies at 560px wide and under (the phone rules in
  `styles.css`), except the pennant's two-line cap, which holds at every
  width.
- **The dock folds.** `App.tsx` sets `dock-folded` on `.app` while a tab,
  the Build menu, the log or the milestones popup is open. On a phone that
  hides the tab row and the clock row. The funds figure and the four stat
  chips stay. Each of those panels has its own close (and Escape), and
  closing it brings the tabs and the clock back. The dock goes from 206px
  to 85px at normal text, and from 218px to 92px at the largest.
  `--toolbar-height` is measured, so the tab screens and popups take the
  room without further rules. `docs/architecture/ui-shell.md` says so.
- **The Build menu** is capped at `min(560px, 100vh − dock − 140px)` on a
  phone instead of 340px, so the room the fold gives goes to its cards,
  which now show whole.
- **The Build button** no longer sits over the tabs. `Toolbar.tsx` wraps
  Home and the tabs in `.toolbar-tab-scroll`, which is `display: contents`
  on wider screens, so desktop is unchanged. On a phone that box scrolls
  sideways beside Build, with a fade at its right edge to show the row
  goes on.
- **The cohort cards** go two to a row on a phone, with the name on top
  and the two counts under it. Four to a row left 60px for a name, too
  narrow for most of the eight in capitals at the largest text. This
  replaces the plan's hyphenate-or-shorten: every name now fits whole, so
  none is shortened. It also stops "last year" running past the card at
  the largest text.
- **The beat headers** put the number over the word on a phone ("2" over
  "ADMISSIONS"), and each beat takes the width its word needs.
- **The pennant** is clamped to two lines with an ellipsis, with the full
  name in its `title`. The name now takes the pointer so the title shows;
  the rest of the pennant stays inert. On a phone it sits 12px from the
  left edge and stops 84px short of the right, clear of the menu and map
  tools.
- **Also from G7-12:** a tab's "Close ✕" wrapped onto two lines at the
  largest text. It no longer wraps, and on a phone the tab's title is set
  smaller to make room.
- `tools/phoneCheck.mjs` closes the Build menu with the menu's own close,
  since the Build button is folded away while the menu is open.
- **Checked:** `npm run phone` (the launch fixture and a summer save) and
  the gallery at 390×844, at text sizes 1 and 1.3, with no page errors.
  Desktop at 1440×900 is unchanged apart from the pennant. `check` passes,
  and `npm run sim` reads the same as the baseline. No player-facing words
  changed, so `review:strings` was not rerun. Screenshots are in
  `docs/reviews/2026-10-ui-fixes/phone-*.jpg`.

## PR 76J — Needs faculty (a follow-up)

*The owner's note after Plan 76 landed: a course blocked on teaching
capacity said "no open slot", and "slot" meant three things (a hall's
program slots, the committee's places, a professor's course slots).*

**As implemented (#231):**
- A course waiting on a professor says **"needs faculty"**: the compact
  tag on its Curriculum row ("· needs faculty"), its gate dot's tooltip,
  the Build menu's reason, the hall panel's next-course line and
  founding note, the "Waiting on faculty" door, the Faculty tab's
  "N waiting on faculty", and the drawer's "Every … professor is teaching
  a full load".
- Every bare "slot" meaning a hall's place now reads "program slot": the
  map's hall tooltip, the hall panel's count, the move buttons, the
  Curriculum's "Found in…" door and the next-step line.
- The Faculty tab's remaining bare "slots" read "course slots".
- The committee already had neither (Plan 76F).
- Plan 47's glossary says so.

## What this plan does not do

- The mechanics that would make a false claim true, where this plan
  changes the words instead (see §0): in `BACKLOG.md`.
- Board confidence that the board acts on, until the owner decides.
- The course catalog's shape (see §0, default 5): in `BACKLOG.md`.
- The review's other areas, which wait for the owner's triage, except the
  four area 7 bugs above.
