# Pass E: Cohesion

*Plan 123 §3, pass E. Findings only. Nothing in the game was changed.*

- **Commit read:** `5d06ae4` (production build, `vite preview` on :4173, 1440×900).
- **Method:** `npm run review:gallery` on `guided-y2`, `guided-y15` and `guided-y30` (desktop, plus a fresh page). That gave 78 captures, and their word and control counts are in [`data/gallery.md`](data/gallery.md). Three more captures came from `tools/review/drive.mjs` (map tools, a hall panel). I read `styles.css` (tokens and state classes), `Toolbar.tsx`, `CampusMap.tsx` (map marks), `audio/director.ts` with `data/audioData.ts` (cues), `icons.tsx`, `schoolPalette.ts`, and `strings.json` for recurring status words.
- **Limits:** I am a model reviewer, not a player, so every "reads as" below is my judgement. I didn't capture the Final Report, the summer reveal or toasts, so the motion notes rest on CSS and a few stills. I counted the colours on the default maroon-and-gold palette. Seven other palettes exist, and the chosen colours become `--school-primary/secondary`, so some clashes change with the palette (see E-2).

## 1. Signal dictionary

One row per signal, with the places it appears and what it means in each.

| Signal | Where (file:line / capture) | Meaning there |
|---|---|---|
| **Gold fill** `--school-secondary` | open tab, segmented choice, primary button ("New game", "Develop … with Berg"), busy committee seat (`styles.css:1798`), Fall calendar | selected / primary action / busy |
| **Gold text on the dark band** `--ok-on-dark` (`styles.css:106`) | weekly cash delta `+$2.4M/wk` | good |
| **Gold ring** | Distinguished program pip (`styles.css:1698`); full residence, every bed taken (`:1708`); lab project progress (`:1711`); completion ring (`:1476`); "do this" outline, pulsing (`:3973`, `.opening-target`); Build button, always (`:771`) | honour / problem / progress / just finished / do this / an ordinary button |
| **Gold dot** | unread letter (`:3798`, inbox badge dot); active research project (Research tab); **retiring within the year** (`:2520`, Faculty plot) | unread / working / about to leave |
| **Red "!" badge** `.alert-badge` (`:779`) | Curriculum and Build: something unseen (`Toolbar.tsx:28`); Athletics: a staff post open (`Toolbar.tsx:30`); each Build category | new / a problem |
| **Red count badge** `.inbox-badge.urgent` (`:3903`, pulses) | Inbox: a decision in its last week | urgent |
| **Red / danger ink** `#a13a3a` | blocked course edge (`:897`), retiring badge on tile (`:2393`), ▼ trend, rank-down flash (`:4503`), bad toast, "Wind up" button | bad / loss |
| **Maroon** `--school-primary` `#7b1e2b` | the band, section heads ("EXPENSES", "LEVERS…"), NEXT and CHAPTER pills, decision toast edge (`:4428`), research bars (`:2015`), Business school hue `#8b3a3a` (`schoolPalette.ts:16`) | the college / heading / decision / a score / a school |
| **Green** `--ok-on-light` | ▲ trend, good log line, revenue head, surplus, A-grade marks, "FULL MARKS" | good / grade A |
| **Grade inks** A–F | faculty stat bars (`:2378`), circled score marks (`GradeMark.tsx`) | quality band |
| **Silver ring** | Established program pip (`:1697`) | standing |
| **Dashed edge** | locked course (`:875`), locked architecture style (founding), building going up (`:1004`), hall slot pending (`:1050`), committee "Free" seat, sandbox speed (`:585`) | locked / in progress / pending / free / sandbox |
| **Pulse, 1.1 s** | do this (`:3973`), urgent inbox (`:3903`), urgent NEXT (`:3999`), admissions handle (`:4720`) | do this / urgent |
| **Pulse, 1.7–1.8 s** | developing course cell (`:903`), ready committee seat (`:751`) | in progress / ready |
| **Orbiting electron** | lab mark (`CampusMap.tsx:640`) | project running |
| **Crane, scaffold, progress bar** | site going up (`:1487`) | being built |
| **Weathering → hoarding** | `ageMarks.tsx:15` (`conditionBand`) | age and upkeep |
| **Crowds in the stands** | home game week (`mapOccasions.ts:31`) | a game, whatever the result |
| **College banners on lamps** | commencement fortnight (`mapOccasions.ts:44`) | year end |
| **Arrows** ▲▼ → | ▲▼ trend (`TrendFigure.tsx:38`), rank move, "▲ Name" = the team ahead (`AthleticsTab.tsx:396`); → now→potential (faculty), before→after (report card), "go" on links | rising / ahead / becomes / was→is / go |
| **Icons** | 41 SVGs in `icons.tsx`, Lucide or drawn to match; also Unicode ⤓ ⤒ ⌂ + − (`CampusMap.tsx:2751-2762`), school motifs ◆ ⚙ ✦ ❧ ⚗ ✚ ▣ (`schoolPalette.ts:16-22`), ★ for a flagship | |
| **Sounds** (`director.ts:52-84`) | `complete` for building, program, milestone, breakthrough and demand met; `letter` for event, ambition, demand raised **and demand failed**, report card; `tick` for hire **and departure**; `loss` for a lost game and attrition; `fanfare` for a school distinguished, a title and the end; `alarm` for cash going negative or a distress step | |
| **Words** | "Guide": the tab walk button, the Guide chapter and **the ranking publication** ("#48 in the guide", History › The guide); "Full": professor rank, residence full, "Full marks"; "Distinguished": professor rank **and** program standing; "dark": unstaffed course, closed office slot; "waiting": courses awaiting a teacher (Faculty), "Also waiting" (Objectives) | |

### Clashes

**One signal, two or more meanings**

1. **Gold.** It means selected, primary, good (on the band), honour, problem (full residence), progress, unread, working, *retiring*, "do this" and plain Build. Gold carries about ten meanings, so it stops carrying any.
2. **The red "!".** It means "something new to look at" on Curriculum and Build, but "a team is missing staff" on Athletics. On the maroon band, its red fill (`#a13a3a` on `#7b1e2b`) hardly shows, so all four badges read as the same hollow circle as the urgent Inbox count ([e-toolbar-badges](img/e-toolbar-badges.png)).
3. **Rings on the map.** A gold ring is Distinguished on a hall, *full* on a residence, *progress* on a lab, and *just finished* round a new building. The lab ring takes its school's colour, so the Business lab's ring (`#8b3a3a`) looks like a warning ([e-map-marks](img/e-map-marks.png)).
4. **Dashed edges** mean both "locked" and "free to use". In the committee row, the "Free" seat is dashed and the locked "at prestige 70" seat is dotted, side by side ([e-curriculum-y15](img/e-curriculum-y15.png)).
5. **The pulse** means both "do this" and "urgent". A third, slower pulse means "in progress", and three developing course cells pulse all the time on the Curriculum tab.
6. **The word "guide".** The Guide button (a walk through the tab) sits a few pixels from History › *The guide* (the rankings), and the Rank chip's label reads "open History, The guide".
7. **"Distinguished" and "Full"** each name both a professor's rank and something else (a program's standing; a full residence or full marks).
8. **The arrow →** means potential, before→after and "go". **▲** means both rising and "the team ahead".
9. **Sound:** a demand *failed* plays the same `letter` as neutral news, and a departure plays the same `tick` as a hire (`audioData.ts` cues).

**Two signals, one meaning**

10. **Retiring** is a red badge on the faculty card (`:2393`) but a gold dot on the plot (`:2520`) ([e-faculty-plot-gold](img/e-faculty-plot-gold.png)).
11. **Good** is green on cream but gold on the band (`--ok-on-dark`).
12. **A professor's research score** has a grade-coloured bar on Faculty (`:2378`) and a maroon bar on Research (`:2015`). Quality is drawn four ways: a circled grade mark (Curriculum), a grade bar (Faculty), a maroon bar (Research) and plain "quality 70" (Athletics).
13. **One pending decision** appears in five places at once: the ticker's NEXT, the Inbox's red count, the Objectives drawer's "Also waiting", the Inbox row's "This week" pill, and its toast ([e-one-fact-four-places](img/e-one-fact-four-places.png)).
14. **One chapter step**, "Fill every team's staff posts 1/18", shows as the ticker's chapter chip, the drawer row, the Athletics "!" and six "Hire a … →" links on the tab ([e-athletics-y15](img/e-athletics-y15.png)).
15. **Time** is told four times on the band: the calendar card (FALL / 2 / WEEK), "Year 16", the weekday pips with their day bar, and the ticker's `Y16W1`.

## 2. Map against tabs

| Fact a tab states | Map today | Could the map carry it? |
|---|---|---|
| A program's slots and standing (Curriculum; hall panel; five "now an established program" letters in the y15 Inbox) | **Yes**: hall pips in school colours, silver or gold rings | Already does. Cut the celebration letters (see E-5). |
| A research project's progress (Research: "25 of 26 weeks", a bar, "2.5/wk") | **Yes**: lab ring and electron | Already does. The tab needs only the choices: topic, scholar, wind up. |
| Residence full (Students › Housing: "9,390 beds, 5,655 wanted") | **Yes**: the bed mark | Already does. Note that the gold ring reads as an honour (clash 3). |
| Building condition and upkeep (Treasury lever text; the inspector letters) | **Yes**: weathering up to the hoarding (`ageMarks.tsx`) | Already does. But the event about a building (the condemned boiler, "the notice on the door is red") never appears *on* that building. |
| Courses with no teacher ("8 WAITING" on faculty tiles; "dark · unstaffed" in Curriculum, `CurriculumTab.tsx:961`) | No | An unlit hall, the owner's own example: a dark window per course that waits. Then the "waiting" words can go from the tiles. |
| Dining and health needs ("A need since the college passed 1,500 students") | No (walkers are generic) | A queue at the Commons or clinic door when a score is under 100. |
| A team's season (Athletics: "#6 of 100 · LOST THE SEMIFINAL", flagship ★) | Partly: crowds fill on *every* home week, win or lose; college banners appear only at commencement | Crowds and pennants that scale with the team's standing; a title banner on the venue that stays. |
| A team short of staff (Athletics "!", chapter) | No | Leave it to the chapter and the tab. The badge clashes (see E-2). |
| Cash and distress ("The board: Tight") | Sound: the `distress` theme. Map: only through upkeep | Fine as it is. Music is the right channel. |
| Enrolment | Yes: the town ring grows (`district`) | Already does. |

## 3. Findings

**E-1. Gold means about ten things. Give it one.**
*What:* see the dictionary and clash 1. *Where:* `styles.css:106, 771, 1697-1711, 1798, 2520, 3798, 3973`; every capture. *Why:* gold is the school's second colour, and it is also the game's highlight, its "good", its "do this", its unread mark and its retiring mark. A player can't learn from colour what wants them. *Change:* gold means **selected / do this**, and nothing else.
- Unread letters use a plain cream dot.
- A full residence uses the danger ink.
- Lab progress uses cream.
- Good on the band uses a light green, replacing `--ok-on-dark: gold`.
- Retiring uses the red the tile already uses.
- The Build button loses its permanent gold outline (`:771-773`), so the pulsing gold outline is the only "do this" on the band.

*Net:* signals −5 meanings, 0 surfaces, 0 words.

**E-2. Use one badge, for one thing: "this needs you."**
*What:* the red "!" means "unseen" on Curriculum and Build but "a problem" on Athletics (`Toolbar.tsx:28-35`). On the y30 Build menu, seven of eight categories carry it at once ([e-build-badges-y30](img/e-build-badges-y30.png)). The red fill disappears on the maroon band. *Why:* a badge on everything is a badge on nothing, and the same red marks the urgent Inbox. *Change:*
- Cut the "unseen" badges (Curriculum, Build and each Build category). New entries are found by opening the menu, which the chapter already does.
- Keep one badge, for "needs you": the Inbox count, and Athletics while a post is open (the owner asked for that one in 112B).
- Draw it cream-on-red with a dark border, so it reads on any palette.

*Net:* about −9 badges on a y30 screen, signals −1 meaning.

**E-3. One pending item, one place on the band.**
*What:* clashes 13 and 14. A decision shows in five places, and a chapter step in four. *Where:* `LogTicker.tsx` (NEXT), `ObjectivesPanel.tsx` ("Also waiting", `chapterData.ts:418`), `Toolbar.tsx:172-175`, the toast. *Why:* the HUD repeats itself, so the band carries 273–282 words on a bare y15/y30 map (gallery) when it could carry under 100. *Change:*
- Decisions belong to the Inbox badge and NEXT. Cut "Also waiting" from the drawer and the toast for a matter; the badge already counts it.
- Chapter steps belong to the chapter chip. The tab shows the step as the lit target (the gold ring), not as six links.

*Net:* −1 drawer section, −1 toast type, about −40 words on the map screen.

**E-4. Let the map say what the Faculty and Students tabs say in words.**
*What:* see the §2 table. Unstaffed courses, dining and health needs, and a team's season are told only in words, while the map shows a game week's crowd regardless of the result. *Why:* principle 2. The owner's own examples (an unlit hall, crowds) fit facts the tabs already print. *Change:*
- A dark window per waiting course on its hall.
- A queue at a Commons or clinic below 100.
- Crowds and venue pennants that scale with standing.
- Then cut "N WAITING" from faculty tiles and the satisfaction sub-lines ("A need since…", "9,390 beds, 5,655 wanted"; [e-students-y15](img/e-students-y15.png)).

*Net:* +3 map signals, about −12 words per tile row and −30 on Students. It also connects faculty→campus and athletics→campus visibly (pass D edges).

**E-5. Stop writing letters about what the map already rings.**
*What:* 5 of the 6 letters in the y15 Inbox celebrate "X is now an established program" ([Inbox, gallery y15-04]), and each also earns a silver ring on its hall and a ticker line. *Change:* the ring and the `complete` sound are the event. Drop the letter, or keep one per year as a summary. *Net:* about −5 letters a year mid-game, about −120 words each year.

**E-6. Ring, pulse and dash need a grammar.**
*What:* clashes 3–5. *Change:*
- **Ring** = standing, on a hall (silver or gold), and nothing else.
- **Progress** = an arc that fills, for labs and sites, in cream.
- **Pulse** = do this, only. Urgent becomes a steady red. Developing course cells and the ready committee seat stop pulsing: the lamps' fill already shows progress.
- **Dash** = locked or not yet. A free committee seat becomes a solid empty box.

*Net:* motions −3 standing loops, signals −4 meanings. Reduced motion has less to suppress.

**E-7. "The guide" is a name taken twice.**
*What:* clash 6. Every tab's "Guide" button sits beside data drawn from "the guide" (`statChips.ts:29`, `RankingsPanel.tsx:31`). *Change:* rename the walk button "Show me" (the name Plans 106–112 already use for the act), or cut it if pass B finds the walks unneeded. Leave "the guide" as the rankings. *Net:* 0 surfaces, −1 clash. The same goes for "Distinguished" on professors: use "Chair" or another rank name, and keep Distinguished for programs.

**E-8. Merge the time readouts and the standing chips.**
*What:* clash 15. The band also has both Rank (#48) and Prestige (64.8), each opening History, and Rank follows from Prestige. *Change:*
- Fold "Year 16" into the calendar card (YEAR 16 · FALL · 2).
- Drop the ticker's `Y16W1` stamp on the band; keep it in the log.
- Make one chip, "#48 · 64.8".

*Net:* −1 chip, −2 readouts, about −6 words, −1 control.

**E-9. Outliers in the one hand.**
- *Title backdrop:* a top-down plan view that turns ([e-title-topdown](img/e-title-topdown.png)). The *founding form* shows a flat front elevation ([e-founding-elevation](img/e-founding-elevation.png)). The game itself is isometric, so the player meets three projections in the first minute. Prefer the isometric map, slowly panning, behind the title, and the isometric Founders Hall on the form, the same building that then lands. *Net:* −2 art styles. (Both are well drawn; the issue is cohesion, not quality.)
- *Unicode glyphs among Lucide icons:* the map tools' ⤓ ⤒ ⌂ + − (`CampusMap.tsx:2751-2762`), the school motifs ◆ ⚙ ✦ ❧ ⚗ ✚ ▣ (`schoolPalette.ts:16-22`, the curriculum school headers), ★ and ▲▼. They render at the font's weight and not at the 1.6 stroke. Draw them in `icons.tsx`'s convention, or cut the motifs, since the school's colour already marks it.
- *Actions styled as text links:* Athletics' "Hire a head coach →" are underlined red links, while every other tab uses bordered buttons. The routine "Wind up" on Research wears the danger outline.
- *Stacked segmented controls:* Faculty has two side by side (Cards/Table/Plot and Faculty/Market/Departments), under a 3-figure header and a payroll bar. It is the busiest header in the game.
- *Seven entrance motions* (`popup-rise`, `popup-from-corner`, `modal-in`, `toast-in`, `banner-in`, `spec-rise`, `overlay-fade`; `styles.css:813-4647`), with rises of 10, 12 and 18 px. One rise and one fade would do.

**E-10. The default palette's maroon is the danger red.**
*What:* the band and headings are `#7b1e2b`, danger is `#a13a3a`, and the Business school hue is `#8b3a3a`. "EXPENSES" (bad), "LEVERS FOR NEXT YEAR" (neutral) and a Business lab ring (progress) are the same red family ([Treasury, gallery y15-21]). With a green-and-gold college, the reverse happens: green is both the school and "good". *Change:* derive the state inks against the chosen primary. If a state's hue is within a set distance of the primary, shift it (for example, danger to a vermilion on maroon colleges). Neutral headings use ink, not the primary. *Net:* 0 surfaces, −1 clash per palette.

## 4. Clutter

The worst screens in the gallery, counting the top layer:

| Screen | Words | Controls |
|---|---:|---:|
| Curriculum, y15 | **3,534** | **540** |
| Curriculum, y30 | 1,969 | 286 |
| Faculty › person, y30 | 1,963 | 202 |
| Faculty, y15 (cards) | 1,768 | 180 |
| History › The record, y30 | 1,536 | 12 |
| Faculty › Market, y15 | 1,332 | 147 |
| History › The guide, y15 | 1,067 | 7 |
| Faculty › Market, **y2** | 996 | 108 |

On a bare map, the HUD alone carries 81 words in y2 but 273 in y15. The rise comes from the ticker's three messages, the chapter step, the badges and the chips.

These persistent elements overlap in purpose, with the merge proposed for each:

| Element | Duplicates | Merge |
|---|---|---|
| Ticker NEXT · Inbox badge · drawer "Also waiting" · toast | a pending decision | Inbox badge and NEXT only (E-3) |
| Chapter chip · drawer row · Athletics "!" · tab links | a chapter step | chapter chip and the lit target (E-3) |
| Curriculum "!" · Build "!" · 7 category "!" | "new" | cut (E-2) |
| Committee lamps under Curriculum · Committee panel in the tab | committee seats | keep both: the lamps are the glance, the panel the control. Drop the lamps' breathing (E-6) |
| Calendar card · "Year 16" · weekday pips · `Y16W1` | the date | one calendar (E-8) |
| Rank chip · Prestige chip | standing | one chip (E-8) |
| Weekly delta (gold) · Treasury surplus (green) | cash flow | keep, but in one "good" colour (E-1) |

Curriculum at 540 controls is a catalogue drawn all at once: every course of every department is a button. That belongs to pass A (census). From a cohesion view, its state colours (gold developing, school-hue offered, white available, dashed locked, dotted gated, red-edged blocked) are six states. That is two more than the map's own signals for a hall.

## 5. Keep: already cohesive

- **One panel shape.** Cream panel, 2 px navy rule and the offset maroon shadow (`--shadow-1..3`) on every tab, modal, popup and the Build menu. The game reads as one hand from title card to Treasury.
- **One type system.** Bricolage for headings and figures, Archivo for text and Azeret for ledgers, on one 10–44 px scale (`styles.css:55-66`).
- **The college's colours carry through.** The founding swatch becomes the band, the pennant, the lamp banners at commencement and the hall pips, so the player's choice is visibly *theirs* everywhere.
- **Hall pips.** School hue per program, plus silver and gold for standing: one compact, readable map signal for a whole tab's fact.
- **Weathering tied to upkeep** (`ageMarks.tsx`). Money shows on the map with no words, which is the model for E-4.
- **The sound director** (`director.ts`). Every log topic has a cue, each is played once per week, bad news differs for teams and money, and the fanfare is kept for the three biggest moments.
- **Reduced motion** keeps the information. The lamps hold half-lit, the electron rests on its orbit and the ring collapses.
- **The colour-vision-safe palette** (`styles.css:227-240`) swaps every state ink in one place. It is the right seam for E-10's palette-aware inks.
