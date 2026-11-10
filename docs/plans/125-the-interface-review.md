# Plan 125 — The interface review, its first ten

*Planning document only — no gameplay code is changed by this file. Its job is
to sequence the ten changes the interface review ranked first
(`docs/reviews/2026-11-ui-review/README.md`, read at `cb6fc22`) into PRs: one
number for a pillar, an admissions button that covers nothing, a subject on
every event, a build menu that folds under a grounds tool, a lighter
Curriculum, Faculty and Research, toasts that keep off a tab, short money on
cards, and map marks that hold a size.*

**Status: Proposed.** Nothing has landed. §3 lists four choices that are the
owner's; each has a default, and the PRs are written to the defaults.

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
