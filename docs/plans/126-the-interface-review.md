# Plan 126 — The interface review, its first ten

*Planning document only — no gameplay code is changed by this file. Its job is
to sequence the ten changes the interface review ranked first
(`docs/reviews/2026-11-ui-review/README.md`, read at `cb6fc22`) into PRs: one
number for a pillar, an admissions button that covers nothing, a subject on
every event, a build menu that folds under a grounds tool, a lighter
Curriculum, Faculty and Research, toasts that keep off a tab, short money on
cards, and map marks that hold a size.*

**Status: Landed (10 November 2026), on `claude/gallant-tesla-g4c36a`.** All
ten PRs, to the defaults in §3. A to F were built in turn on the branch; G, H,
I and J were built in parallel worktrees and merged. `npm run check` passed
after the last merge, 217 suites. Each PR's **As implemented** note follows
its section. Two departures from the defaults: PR A keeps the button stuck to
the foot (Plan 114G's reason) and meets the finding by reordering the cards;
PR D puts a toast over a tab in the tab's header, not under it. Renumbered from 125 when it was merged with `main`, where Plan 125 (the
written content) had landed first. Open for the
owner: the 133 event titles (PR G) to edit; and whether a locked course's
reason (a prerequisite, a capstone's facility) should be a foot on its cell,
since it is only in the tooltip today (PR H).

---

## 0. What this plan is, and is not

- It does the review's ten and nothing else. The other findings (U-2, U-3,
  U-6, U-7, S-4 to S-6, I-3, I-6 to I-8) stay in the review until the owner
  sorts them.
- It changes no rule of the simulation. Every PR is a redraw, a fold, a move
  or a word. No save migration is needed.
- It relitigates nothing Plan 124 decided. Where a change touches something
  the owner kept there (the tab walks, the "Hire a …" links, the date
  readouts), it leaves it alone.

## 1. What stands today

- **A pillar's part of prestige.**
  - `components/PillarHead.tsx` draws the bar at the head of Curriculum
    (`CurriculumTab.tsx:1433`), Research (`ResearchTab.tsx:403`), Students
    (`StudentsTab.tsx:28`) and Athletics (`AthleticsTab.tsx:784`), and the
    summer review's bar (`InterruptModal.tsx:152`). Its parts are
    `prestigeSystem.ts`'s `prestigeByPillar` (`:737`): current prestige split
    by each pillar's blend, floor included. Its line prints the target,
    "heading for 71.0".
  - `tabs/PrestigeGlance.tsx`'s `PillarMeter` draws History › Prestige and the
    objectives drawer (`ObjectivesPanel.tsx:58`). Its figure is the pillar's
    `contribution`, above the floor. The target is hidden by design (the
    file's head cites Plan 98B).
  - So at year 16 academics reads 21.7 on Curriculum and +12.7 in History, and
    History's rows sum to 39.0 under a headline of 64.8.
  - `test/pillar-split.test.ts` holds the split; `test/pillar-rule.test.ts`
    the rule's words.
- **The admissions button.** `components/AdmissionsPage.tsx:558`'s
  `.admissions-send-foot` is `position: sticky` at the foot of the right
  column (`styles.css:4816`). The card *What this class does* (`:519`) is the
  last card above it. At 1280×720 the button covers the card from its second
  line; at 1440×900 it cuts the handle's hint.
- **Event subjects.** `data/eventCatalogue.ts` has 159 events, 27 with a
  `title`. The rest take `catalogueEngine.ts:304`'s `firstSentence`, cut at 87
  characters with an ellipsis. `inbox.ts:243`'s `eventSubject` uses it, and
  `afterSubject` (`:247`) is meant to keep the row's preview from repeating
  the subject, but it tests `startsWith` against the cut subject, so a long
  first sentence is printed twice. `test/inbox.test.ts` covers the inbox.
- **The build menu under a tool.** `components/BuildPopup.tsx:926` folds the
  menu to `.build-popup.holding` while a building is in hand. An armed
  grounds tool (`pathTool`, `:847`) leaves the menu at its 432 px
  (`styles.css:842`); `CampusMap.tsx:275`'s `ToolHint` is the strip at the
  top of the map.
- **Curriculum's head.** `CurriculumTab.tsx:1205`'s `CommitteePanel` draws
  one box for every seat the committee can ever have, the locked ones as "at
  prestige N" (`:1228`), and a sentence that repeats the first locked box. An
  undeveloped course's cell carries its price and best teacher; the row's
  Develop line (`:889`) already carries both for the next course.
- **Toasts.** `components/Toasts.tsx` stacks up to four at the bottom left
  (`styles.css:4480`, whose comment says "at the right"), 360 px wide, one
  line each, cut with an ellipsis (`.toast-text`, `:4492`). They are drawn
  over an open tab. `test/toasts.test.ts` covers what raises one.
- **Research's rows.** `ResearchTab.tsx:88`'s running `facility-panel` is a
  head, a tags row, a team row and a progress row: about 170 px a lab. Its
  length is said three times (the status, the depth tag, the bar).
- **Money on cards.** `components/EventChoices.tsx:30-103` builds every
  answer's effects with `money`. `BuildPopup.tsx:934` puts `money` in the
  holding strip. `StudentLifeTab.tsx:91` puts it in a table row.
  `test/number-format.test.ts` holds the number rules.
- **Faculty's head.** `FacultyTab.tsx`: three counts, the payroll meter,
  `FacultyFigures` (`:450`, the course-slot sums) and the typical candidate's
  line, above two switches drawn view-mode first.
- **Map marks.** `CampusMap.tsx`: hall pips (`:564`, `:1189`), `LabMark`
  (`:643`) and the full-residence mark (`:708`) are SVG in the map's own
  units, so they scale with the zoom: about 5 px at a year-15 campus's
  opening view, 80 px four steps in.

## 2. The PRs

Small ones first, so each is on `main` before the larger ones touch the same
files. A to E are an hour each; F to J are a PR's work each.

| PR | Finding | Change |
|---|---|---|
| A | I-4 | The admissions button covers nothing |
| B | I-1 | A grounds tool folds the build menu |
| C | U-5 | Short money on choice cards, the holding strip and a table row |
| D | I-2 | Toasts keep off an open tab; like toasts merge |
| E | S-2 | Faculty's head is one line |
| F | U-1 | One number for a pillar's part of prestige |
| G | U-4 | Every event has a subject |
| H | S-1 | Curriculum: one locked seat, lighter cells, a folded filter |
| I | S-3 | Research: a lab is one line until opened |
| J | I-5 | Map marks hold a size on screen |

### PR A — The admissions button covers nothing (I-4)

- Move *What this class does* above *The standard*'s two paragraphs of prose
  in the right column, so the consequence is read before the method.
- Take `.admissions-send-foot` out of `sticky`: the button sits in the flow,
  under the last card. Where the column is taller than the window, the column
  scrolls and the button is its last item.
- If the owner prefers the button always in view (§3, choice 1), keep it
  sticky but give the column a bottom padding of the foot's height, so
  nothing can sit under it.
- **Check.** `test/admissions-page.test.ts`: at 1280×720 and 1440×900 the
  button's box overlaps no card's box. `npm run review:gallery` on the summer
  scenario at `--sizes desktop,laptop`.

**As implemented:** departed from the default. The button stays stuck to the
foot of the column: Plan 114G put it there so it is in view at 1280×720, and
this plan was written without that in hand. What the finding asked for is met
another way. *What this class does* now sits directly under *The standard*'s
four figures; the standard's prose (the applicants' change, the admit rate's
opening, the honors cut) is a card of its own below it; and a locked price
folds to one line ("1 · The price · locked", the figure a size down, its
sentence as the figure's title). At 1280×720 and 1440×900 the price, the four
figures and the whole of *What this class does* are above the button
(`a-admissions-before.png`, `a-admissions-after.png` beside this file). The
handle's line and the prose card are reached by scrolling the page, as before.
No test was added: the layout is measured in a browser, not in the suite.

### PR B — A grounds tool folds the build menu (I-1)

- While `pathTool` is set, `BuildPopup` renders the folded form it already
  has for a held building: the tool's name, its tray of styles (Paving,
  Cobbles, Brick; the tree species), and "Put it down". Escape and the
  button both return the full menu on Grounds.
- The eraser and the single-tile tools (lamp, bench, bed) fold the same way,
  with no tray.
- `ToolHint` stays where it is; the two strips do not repeat each other.
- **Check.** A test beside the popup's others: with a tool armed the popup
  has `.holding` and the tray's buttons. `ui-shell.md`'s build-menu
  paragraph gains the sentence.

**As implemented:** as planned, with the styles as pills on the strip rather
than the tray of picture tiles, which would have made the strip as tall as a
row of the menu. "Put it down" is *All tools*, since nothing is in hand. The
tray (`MiniToolRow`) and its rules are gone: an armed tool never shows the
full menu now. `Esc` puts the tool away before it closes the menu (a new
rung on `App.tsx`'s ladder, after a building in hand). The `P` key with the
menu open folds it the same way. `test/campus-decoration.test.ts`'s Grounds
block was rewritten for the strip; `ui-shell.md`'s build-menu paragraph says
it.

### PR C — Short money where prices are compared (U-5)

- `EventChoices.tsx`: every `money(` in an answer's effect line becomes
  `moneyShort(`. The reading pane's prose keeps `money`.
- `BuildPopup.tsx:934` (the holding strip) and `StudentLifeTab.tsx:91` (the
  weekly cost row) take `moneyShort`.
- **Check.** `test/number-format.test.ts` gains the three surfaces. Read the
  decision and demand scenarios in the gallery: no answer should lose a
  distinction (two answers of $8.40M and $8.44M would both read "$8.4M"; if
  the catalogue has such a pair, that card keeps `money`, and the
  **As implemented** note says which).

**As implemented:** two of the three. An answer's effects
(`EventChoices.tsx`, all sixteen sums) and the strip for a building in hand
take `moneyShort`. The Students tab's weekly cost stays exact: it is a row of
a `<dl>`, which the number rules give the long form, so the review's U-5 was
wrong to list it. No catalogue event has two answers whose sums differ and
read the same in the short form (checked over all 159). An answer's
endowment line keeps `signedMoney`, which has no short form.
`test/number-format.test.ts` holds both surfaces.

**After the merge with Plan 125 (the written content):** that plan, merged
to `main` first, turned an answer's effects into chips
(`systems/events/choiceEffects.ts`) that keep the exact sums, so this PR's
change to `EventChoices.tsx` was dropped in the merge in favour of the chips.
The strip for a building in hand keeps the short form. Whether the chips
should take the short form is the owner's call.

### PR D — Toasts keep off a tab, and like toasts merge (I-2)

- While a tab is open, toasts are drawn at the top right, under the tab's
  header, where no tab puts content a player acts on. On the map they stay
  where they are (§3, choice 2).
- A toast wraps to two lines before it is cut.
- Toasts of one kind raised in the same week merge into one with a count:
  "3 architectures for your next college", "4 courses finished". The merged
  toast's Open goes where the first would have.
- Correct the stylesheet's comment.
- **Check.** `test/toasts.test.ts`: three unlock lines in a week give one
  toast. By hand at 2× with Curriculum open, as the review did.

**As implemented:** the place over a tab changed. The top right under the
header is where Treasury keeps its view switch and Curriculum and Faculty
their summary figures, so a toast there would cover what this PR set out to
uncover. Over a tab the newest toast alone sits in the tab's own header,
between the title and *Show me*, on one line up to 520 px wide; the others
wait and show in turn or when the tab closes (`.toasts.over-tab`, from 900 px
up; a phone keeps the stack at the foot). On the map the stack is where it
was, each toast now up to two lines. Like toasts merge in `mergeLike`: the
first of a kind stands for the rest ("…Tudor architecture, unlocked, and 2
more") and keeps its Open, rather than a count worded per kind, which would
have needed a sentence for every topic. A kind is a log topic or a letter's
sender; a held slip is never merged. `test/toasts.test.ts` covers it;
`ui-shell.md`'s dock section says it.

### PR E — Faculty's head is one line (S-2)

- The head keeps "61 on payroll · 30 on the market · 17 on projects" and its
  help.
- `FacultyFigures` moves to the top of the Departments view, above the bars
  that draw the same sums.
- The typical candidate's line moves to the top of the Market view.
- The payroll meter goes: payroll is a line of the Treasury's statement, and
  a meter at 4% reads as empty. The salary total stays in the head's tooltip.
- The switches change order: Faculty / Market / Departments first, then
  Cards / Table / Plot, drawn only on the views that have it.
- **Check.** The tab walk for Faculty (kept by Plan 124) names the head's
  figures; reread its words against the new head and list what was rewritten
  in the **As implemented** note.

**As implemented:** as planned, with one correction to the plan's reading of
the code. The "payroll meter" was the last line of the *what next* strip
(`FacultyNextUp`), there so the strip was never empty. The strip now shows
only when it has something to do (a listing worth taking, a search, a
retirement, a short-staffed field), and its payroll line only when those
listings would add to it; on a quiet week the head is its three counts, and
the payroll total is the first count's tooltip. `FacultyFigures` sits at the
top of Departments and the typical candidate's line at the top of Market.
The view switch is beside the panel's title on all three views, and the
Cards / Table / Plot switch, or Departments' own buttons, at the right.
Rewritten words: the tab's help ("On Departments, the figures above the bars
count course slots"). The Faculty walk's first step still rings the head and
its words still hold.

### PR F — One number for a pillar's part of prestige (U-1)

- `PillarMeter` reads `prestigeByPillar`'s part where it reads `contribution`
  today, so History › Prestige and the objectives drawer show the figure the
  tab heads show, and the four rows sum to the headline. The meter's length
  stays the most the pillar can hold; its fill becomes part ÷ that.
- Endowment and Upkeep are small signed adjustments that the split already
  spreads across the pillars. They move under Details, as lines, so nothing
  on the face fails to add up.
- Details' per-term lines stay in contribution points and say so: "of which
  earned above the floor: +12.7".
- The target (§3, choice 3). Default: the pillar head drops "heading for
  71.0" and keeps its ghost tick, so the direction is seen and no screen
  prints a figure History hides. The line becomes "21.7 of your 64.8
  prestige".
- The specialization's page and the record keep their own scales (standing
  of 150, rank of 100): they compare with rivals, and the review's U-1 asks
  only that the two "part of prestige" numbers agree.
- **Check.** `test/pillar-split.test.ts`: History's four figures equal the
  heads' and sum to `prestigeFigure(current)` within a rounding step.
  `design/progression.md`'s prestige section and `data/prestigeWords.ts`'s
  rule are reread for "adds".

**As implemented:** as planned. History's four rows and the objectives
drawer's meters read `prestigeByPillar`'s parts (21.7, 16.0, 19.3, 7.7 at
year 16, summing to 64.8 within a rounding step), the figure each tab's head
shows. A meter is as long as the most its part could be (`pillarPartMax`:
every pillar earning in full, at 150) and filled to its part. The heading is
"What it is made of", here and in the drawer, since the rows no longer say
what each adds. Endowment and Upkeep moved under Details, after a sentence
that names the floor every college stands on and introduces the per-pillar
lines as what each has earned above it. The pillar head's line names the
direction ("21.7 of your 64.8 prestige · rising") instead of the target; the
tick stays. Tests: `history-views` (the rows sum to the headline, nothing
adjusts on the face) and `pillar-split` (the head's line).

### PR G — Every event has a subject (U-4)

- **G1, the bug.** `afterSubject` compares against the uncut first sentence,
  so a row never prints its sentence twice. A test in `inbox.test.ts` with a
  first sentence over 90 characters.
- **G2, the subjects.** A `title` on each of the 132 events without one:
  three to six words, the thing and what happened, with the event's own
  variables where it names a building or a person ("{building}: boiler
  condemned", "A roofing bid from a trustee's firm"). Sentence case, no
  final stop.
- `title` becomes required on `CatalogueEvent`, so a new event cannot ship
  without one, and `eventSubject`'s fallback goes.
- The ticker's NEXT and the toast for an arrival take the title, so both stop
  being cut mid-clause.
- This is 132 short strings written by hand (§3, choice 4). They go through
  `npm run review:plain` like any other text.
- **Check.** A test that every catalogue event's filled title is under 50
  characters and holds no unfilled `{`.

**As implemented:**

- **The count was 133, not 132.** `EVENT_CATALOGUE` held 26 titles of its
  159; the 27th the plan counted is `CHARTER_EVENT`'s, which sits outside
  the array. All 133 are written, in `data/eventCatalogue.ts`. They are the
  first draft the owner edits (§3, choice 4).
- **A title is filled by one function.** `catalogue.ts`'s `eventTitle(e,
  vars)` fills the names and raises the first letter, because `rollVars`
  keeps a building's name for mid-sentence ("the Chapel"). Every reader of
  a firing's title goes through it: the inbox's row and its held letter
  (`inbox.ts`), the log's line on an answer (`catalogueEngine.ts`), NEXT
  (`nextStep.ts`) and the letter's dialog (`InterruptModal.tsx`). Before
  this, the inbox and the log printed a title unfilled; no title had a name
  in it, so nothing showed.
- **Which names a title may hold.** `{building}`, `{faculty}`, `{class}` and
  `{sport}` only, and only where every telling of the text names the same.
  `{rival}` runs to 36 characters and `{program}` to 40, so neither fits
  under 50; `{school}` is the player's own. A seismic letter's title names
  nothing, since the chronicle and the year in review read it years later
  without the firing's names. The test holds all three rules.
- **`title` is required** on `CatalogueEvent` (`eventCatalogueTypes.ts`,
  where the type lives, not `catalogue.ts`). `eventSubject` is gone, with
  both fallbacks. `firstSentence` stays, now uncut, for `afterSubject`.
- **G1.** `afterSubject` reads the first sentence whole, so a subject cut
  with an ellipsis still opens it. With every event titled, no catalogue
  row takes that path today; the function and its test stay for a subject
  that is a text's first sentence.
- **NEXT did build its own text**, from the body's first clause cut at 70
  (`nextStep.ts`'s `firstClause`). It now prints the title, and
  `firstClause` is gone.
- **The toast needed no change.** `Toasts.tsx`'s `arrivalsIn` already
  prints the inbox item's `from: subject`. It raises a slip for a letter
  only: a matter to decide has had none since Plan 124 C, so an inline
  event's title reaches the inbox's row, NEXT and the log, not a toast.
- **The check** is in `test/inbox.test.ts`: every event titled (the charter,
  the festival and the board's questions included), under 50 characters as
  written and with the longest building, team and class the data holds,
  nothing unfilled against a real roll, three to six words, a capital
  first, no final stop, no dash.
- `npm run review:plain` passes with its baseline unchanged.

### PR H — Curriculum: one locked seat, lighter cells, a folded filter (S-1)

- **The committee.** The panel draws the earned seats and one stub for the
  next ("next at prestige 70"). The sentence under them goes. The row never
  wraps.
- **The cells.** An undeveloped course's cell shows its code and name. Its
  price and teacher stay in its title and its drawer, and on the row's
  Develop line for the course that is next. A cell keeps a foot only when it
  differs from its row: no teacher, blocked by a prerequisite, a capstone
  waiting for a facility.
- **The filter.** The search, the status select and the three toggles fold
  behind one "Filter" button at the right of the head, open while any filter
  is set.
- **The head.** The 48% ring goes; "200/420 developed" and the grade stay.
- **Check.** At 1280×720 the first course row starts in the upper half of
  the window (it starts at 528 px of 610 today). `curriculum-filter.test.ts`
  and `curriculum-sections.test.ts` still pass. The gallery's year-15 word
  count for the tab falls; record the before and after in the note.

**As implemented:** in `CurriculumTab.tsx` and the tab's own rules in
`styles.css`; nothing outside the tab moved (`PillarHead.tsx` is untouched).

- **The committee.** `committeeSeatRow` (exported, pure) lists the earned
  seats, busy then free, and one `next` stub, "next at prestige 70", which
  is left off once every step is passed. The sentence under the seats and
  its rule (`.committee-note`) are gone. On a screen 1000 px wide or more,
  the label and the count stand at the row's left, the seats in the
  middle, and the (?) at the right, so the panel is one line (61 px tall at
  year 15, 156 before). The seats are a flex row that never wraps. Each is
  an eighth of the row until a ninth narrows them all, so a college at
  prestige 95 with the Office's seat (eight earned and the stub for 100)
  still fits on one line at 1280 and at 900. A phone keeps its grid of
  four. The help's words were already right, since it never described
  the boxes, and it stays as it was. The dock's lamps are unchanged.
- **The cells.** The plan said "a cell keeps a foot only when it differs
  from its row: no teacher, blocked by a prerequisite, a capstone waiting
  for a facility". Reading the code showed that only a course still ahead
  (`available` or `blocked`) ever had a foot. A locked cell (a
  prerequisite, a cross-listing, a capstone's facility) never had one. It
  said why in its title, and still does. A course in development shows
  its bar and teacher chip, not a foot. So the cases that keep a foot,
  exactly, are:
  1. nobody can teach it: "needs faculty";
  2. its price or teacher is not what the row's Develop line says for the
     next course (`aheadFoot`, compared as words). At year 35 the MFA's two
     open courses had different best teachers (Toure 64, Hwang 74). In the
     year-2 and year-15 saves, no row's open courses differed;
  3. the row has no Develop line to say it (every course ahead waits on
     something);
  4. the filters' worklist, where a cell has no row.

  A cell's `title` now reads "FINA 210 · Financial Modeling: $4.0M, 18
  weeks. Dr. Frank Berg would teach it at 82.", with the reason it is held
  after it. The drawer and Choose… are unchanged. At year 15, 163 feet
  went from the rows.
- **The filter.** A cream `panel-action` button, "Filter", stands at the
  right of the head beside the grade, before the (?). It is pressed (the
  secondary fill, as a chip that is on) while the row is open. The row is
  open once the button is pressed, which puts the cursor in the search,
  or whenever a filter is set. A target that brings a filter
  (`targetFilters`: History's "Show the 38 courses below the top band", a
  department, No instructor) opens it with the filter applied, checked in
  the browser. Departure: pressing the button while the row is open folds
  it and clears the filters, so no filter is ever set out of sight. Clear
  inside the row leaves it open. The tab's help gained "Filter opens a
  search and the lists".
- **The head.** The ring went. "200/420 developed" is one line now, with
  the grade, the button and the (?) beside it. On a phone the head wraps so
  they stay on a line of their own under the pillar's bar.
- Two spacing changes, both in the tab's own rules: the committee box's
  padding (6 by 12 px, was 10 by 12) and the pinned head's top padding
  (6 px, was 14).
- **Measured** (1280×720, year 15, `npm run scenario -- --player Guided
  --year 15`). The first course row's cells start at 332 px, the first
  program row at 255 (528 and 451 before), in a window whose overlay runs
  from 59 to 637. At year 2 the cells start at 421 (572 before). The
  gallery at desktop size gives 3,103 words and 536 controls for the tab
  at year 15 (3,626 and 540 before). The controls fall by only four
  because the row's five folded into one button. At year 2 the figures
  are 297 words and 50 controls.
  [`h-curriculum-before.png`](126-the-interface-review/h-curriculum-before.png),
  [`h-curriculum-after.png`](126-the-interface-review/h-curriculum-after.png).
- **Tests.** The new `test/curriculum-head.test.ts` covers the seat row
  through every step (one stub, none at 100), the head without a ring, the
  folded filters, and the cells' feet (none under a matching row; "needs
  faculty"; a foot the row does not say; the worklist's).
  `curriculum-filter`, `curriculum-sections` and `teaching-numbers` pass
  unchanged. The ringed Develop button (`ringedProgram`,
  `.row-action-develop.opening-target`) is untouched. `tabWalkData.ts` has
  no Curriculum walk. No test or tool named a class that was removed
  (`progress-figure`, `committee-note`). `docs/architecture/ui-shell.md`
  describes none of this, so it is unchanged.

### PR I — Research: a lab is one line until opened (S-3)

- A running lab's row: the lab, its topic, the lead scholar and their
  research score, one progress bar with "25/26w", and the output rate.
- The row opens (the disclosure the Curriculum's programs use) to the team,
  the depth, breakthroughs banked and Wind up. A link that lands on a lab
  (`data-lab`, from its map panel) opens it.
- A vacant lab's row is its name and "Start research", as now, and vacant
  labs sort first: an idle lab is what a player comes to the tab for.
- The scholar's score is its number in its grade's ink, as Faculty draws it,
  with no second maroon bar.
- **Check.** Thirteen labs fit a 1440×900 window without a scroll. The
  Research chapter's "Show me" still rings a control that is on screen
  without opening a row.

**As implemented:** `ResearchTab.tsx`'s `RunningPanel` is one line: the
disclosure (`.collapse-toggle`, ▸/▾ with `aria-expanded`, as the Curriculum's
program rows), the lamp, the lab, its topic, the lead scholar's portrait, name
and score, one bar with "25/26w", and "2.5/wk". Opened, it adds the depth
chip, the interdisciplinary tag, breakthroughs banked and published, Wind up,
and the whole team. A `lab:<id>` target opens the row it lands on; `start:<id>`
opens a vacant lab's choices as before. Vacant labs are drawn first, under the
same one heading. The score is `ResearchScore`: the number in its grade's ink
(`facultySort.ts`'s `bandOf`, `--stat-grade`), on the line, in the opened
team, and in the team a vacant lab's offer picks; `.scholar-bar-*` is gone.
At 1440×900 the year-15 save's thirteen labs fit, at 41 px a row
(`126-the-interface-review/i-research-before.png`, `i-research-after.png`,
and `i-research-open.png` with one row open). `test/research-rows.test.ts`
holds the row, the order and the link.

Departures and choices the plan did not make:

- **The lead scholar** is not a stored role; the row names the team's
  strongest researcher (the first named on a tie) and counts the others as
  "+2", their names in its title.
- **The depth chip lost its weeks** ("Pilot Study", not "Pilot Study · 26w"),
  and the status "25 of 26 weeks" is gone, so the length is said once.
- **The count is `count` over `weeksShort`** ("25/26w"); `fraction` gives
  "25/26" with nowhere to put the unit, and `format.ts` was not this PR's to
  add a helper to.
- **A vacant row is one line too**: "Vacant" sits beside the name, not under
  it, and the row is indented to keep its lamp in the running rows' column.
- **A team with nobody left** says so on the line, in the scholar's place,
  rather than behind the closed row.
- **Narrower than 900 px** a running lab's line folds to three (the lab and
  its rate; the topic; the scholar beside the bar), and to four on a phone.
- **Guided play** needed no change. The Research chapter's "Show me" rings
  a lab in the build menu while none is sited (`chapters.ts`'s
  `ringedBuilding`) and otherwise opens the tab, where it rings nothing; the
  control it asks for is a vacant lab's "Start research", which is never
  folded and is now at the top.
- The pillar bar at the tab's head is PR F's and is as it was.
- Rule words rewritten: none. No sentence in `src/` or the guide described
  the row's layout; `docs/architecture/ui-shell.md`'s line on where a lab
  link lands now says the row opens.

### PR J — Map marks hold a size on screen (I-5)

- The hall pips, `LabMark` and the full-residence mark take a scale of
  `clamp(k / zoom)` so each is between about 14 and 28 px on screen at every
  zoom step. Building labels take the same clamp.
- Below the zoom where a hall's row of pips would be wider than its roof,
  the row gives way to one mark for the building: dark if a program has a
  course nobody teaches (Plan 124 L's signal), else the count of programs.
- The marks are memoised on the camera already; the scale is one more value
  in that key.
- **Check.** `npm run review:views` on the year-15 and year-30 saves at
  three zooms, read by eye. `npm run profile` before and after: the marks
  must not add a redraw per frame of a pan.
- This is the one PR with a drawing risk: marks that no longer shrink can
  collide on a dense campus. If they do, the per-building mark's threshold
  rises; say so in the note.

**As implemented:**

- **The scale rule** (`components/markScale.ts`). Each mark is drawn about
  its own anchor (`CampusMap.tsx`'s `markAnchor`, the spot above the label
  where the marks always sat) and scaled there by `heldScale(zoom, band) =
  clamp(zoom, band) / zoom`, the plan's `clamp(k / zoom)` written as a band
  of zooms: the mark is drawn as at the nearest zoom inside its band, so
  inside it the mark grows with the map and outside it stops. The bands:
  pips 0.75 to 1.25 (a pip 9.75 to 16 px, the row's plate 14 to 24 px
  high), the lab's and the full residence's discs 0.6 to 0.85 (19 to 28 px
  and 19 to 26 px), labels 0.55 to 0.75 (a face of 10 to 26 px). Hit
  targets: the row's plate (at least 14 px high), the discs (at least 19
  px), and the one mark a 36-unit circle (at least 26 px).
- **No memo key, and no render on a zoom.** The plan put the scale in the
  layers' memo key; that would have re-rendered every mark on every frame
  of a wheel zoom. Instead `applyView` writes three CSS variables
  (`--k-pip`, `--k-disc`, `--k-label`) on the world group when the zoom
  changes, and `.campus-k-*` in `styles.css` read them, so a zoom touches
  only those and a pan nothing. The one thing a zoom changes in React is
  whether a hall shows its row or one mark: each hall reads the map's
  `ZoomStore` with `useSyncExternalStore` as a boolean, so a hall is drawn
  again only when it changes over. The layers' memo keys are unchanged
  (`camera`, plus the store, which is one object for the map's life).
  This is the layer the production build draws: the marks and labels are
  SVG over the canvas on both renderers; every picture was taken with
  `window.__campusMap.renderer()` reading `canvas`. The electron's
  animation is untouched, so reduced motion is as before.
- **The threshold for one mark is three quarters of the roof, not the
  whole roof** (`HALL_ROW_FIT = 0.75`; the roof's width is the
  footprint's short side in tiles × 64). At 1, a 7x5 hall's row ran 80 px
  on an 82 px roof at the widest zoom a laptop reaches, edge to edge
  against its neighbours' marks, and the one mark was never drawn. At
  0.75 a hall is one mark below a zoom of about 0.33 (0.38 with the
  offer's flag in the row): one step wider than the opening view of a
  built-out campus (0.4), which keeps its rows. The one mark is the dark
  pip, larger, while any program is dark (`darkPips`, Plan 124 L), else
  the count of its programs in a ring, ringed gold while a free slot has a
  program on offer (the flag's meaning, kept); the row's `<title>` and
  `aria-label` are kept on it. Offices are not programs, so Founders Hall
  holding only offices reads "0".
- **Measured on screen** (1440×900, the framed view panned to the
  built-up strip, `y15` and `y30` saves, both the same):

  | Step | Zoom | Pip before → after | Lab disc | Full disc | Label plate |
  |---|---|---|---|---|---|
  | −2 | 0.256 | (3.3) → one mark 20 px | (8.4) → 19.8 | (7.9) → 18.6 | → 16 to 26 |
  | −1 | 0.32 | 4.2 → one mark 20 px | 10.6 → 19.8 | 9.9 → 18.6 | 9 to 15 → 16 to 26 |
  | 0 (opening) | 0.4 | 5.2 → 9.8 | 13.2 → 19.8 | 12.4 → 18.6 | 12 to 19 → 16 to 26 |
  | +2 | 0.625 | 8.1 → 9.8 | 20.6 → 20.6 | 19.4 → 19.4 | 18 to 29 → 18 to 29 |
  | +4 | 0.98 | 12.7 → 12.7 | 32.2 → 28.0 | 30.3 → 26.3 | 28 to 46 → 22 to 35 |
  | +6 | 1.53 | 19.8 → 16.2 | 50.4 → 28.1 | 47.3 → 26.4 | 44 to 72 → 22 to 35 |

  (Bracketed figures are worked out, not measured.) A label's plate
  includes its padding, so the largest plate is 35 px while its face is
  25.5 px. No two marks' boxes overlap at any step on either save (the
  script counts them), and none collide by eye: `j-marks-opening-*.png`
  and `j-marks-close-*.png` (step +6) beside this plan.
- **Profile** (`npm run profile` on the year-30 save, 8 s a speed,
  headless software drawing): before Paused 59.5 fps / Play 52.9 (p95
  33.3 ms, 14 long tasks) / 2× 54.9 / 4× 51.9; after 60.0 / 56.8 (p95
  16.8 ms, 4) / 55.9 / 55.1. The difference is within the tool's noise.
  It does not pan, so a scratch script dragged the map for 240 steps and
  wheeled 30 notches in and out, counting DOM changes inside the marks
  and labels: a pan 0 changes before and after (58 to 60 fps both); a
  zoom 0 before and 88 after, which are the eight halls changing over to
  one mark and back at the threshold, once each way.
- **Departures besides the threshold:** the check used `npm run shot
  --framed` and a scratch script over the same saves rather than `npm run
  review:views`; a lab's news rises from over its mark at the size the
  mark has; `ui-shell.md` says nothing of the marks' size, so only
  `campus-map.md` is updated.

## 3. The owner's choices

Each has a default the PRs above are written to.

1. **The admissions button** (PR A): in the flow under the cards (default),
   or always in view with the column padded.
2. **Toasts on the map** (PR D): stay bottom left (default), or move to the
   top right everywhere, so they have one place.
3. **Prestige's target** (PR F): hidden as a figure everywhere, the tick
   only (default, as Plan 98B decided for History), or printed everywhere,
   History included.
4. **The 132 subjects** (PR G2): written here and sent to the owner as one
   list to edit before they land (default), or written by the owner.

## 4. What is checked at the end

- `npm run check` on every PR.
- `npm run review:gallery` on the review's ten saves at desktop and laptop,
  with the year-15 words and controls for Curriculum, Faculty and Research
  set beside the review's table (3,626 / 540, 1,723 / 180, 770 / 16).
- `docs/architecture/ui-shell.md` updated in the PR that changes what it
  describes: the build menu (B), toasts (D), the number rules' examples (C),
  the map marks (J).
- `docs/store/changelog.md` gets the player-facing lines when the build that
  carries these is cut.
