# The written content review

*10 November 2026, on `cb6fc22` (0.2.0, after Plan 124). The owner asked for
three things: where icons and spacing would carry information better than
text, where the writing reads as machine-made, and whether the voice holds
(friendly candor, a little wry humor, satire of academia). This review
answers each and proposes the fixes. Nothing in the game was changed.*

*Data: `npm run review:strings` found 8,519 player-facing strings and 58,404
words. Names, the debug panel and audio labels are left out below, which
leaves 6,805 strings and 56,439 words. The instructional text (chapters,
letters, help, every tab) was read line by line, and each tab was looked at
in a Year 6 save. The event catalogue and the course descriptions were read
in full by two separate readers, and their counts were spot-checked against
the source. Counts marked "about" are hand-judged.*

## Verdict

The October rewrite held. "You" is now in 43% of the long strings outside the
events and courses (it was 1.1%), and the vocabulary is clean: three
brochure words and eight exclamation marks in 56,000 words, and no "not X
but Y" at all.

What gives the text away now is shape. Each body of text was written to
one mold, and the mold shows by the fifth example. What splits the voice is
that the game has four narrators, and only one of them is funny. The biggest
gain for a reader is neither of those. It is that the game still writes out
numbers in sentences that it already knows how to draw.

## 1. Text that should be display

The interface has the parts already: category icons in the build menu,
bars and arrows on faculty cards, need wheels, `LevelPips`, `BuildThumb`.
These are the places still using sentences. They are in order of how many
times a player meets them.

| # | Where | What the prose carries now | Show it as |
|---|---|---|---|
| 1 | Every event choice. `components/EventChoices.tsx:30–157` joins lowercase phrases with " · ": "costs $900,000 · $900,000 of repairs done · satisfaction +2". The older decisions in `data/eventData.ts` write the same facts as sentences: "Costs nothing." (8 times), "Satisfaction drops N points, and recovers over the following weeks." (7 times). | Money, satisfaction, alumni warmth, intake quality, students, town goodwill, and whether the change is temporary | One effect chip: icon, signed number, red or green, a small clock for "wears off". Used by both files. |
| 2 | Milestone letters, the "now open" list. `data/ladderData.ts:141–338`: "Student Center: somewhere to spend time between classes, and a boost to social life". "And campus beauty" closes four of them. | Which building, and which need it feeds | The building's thumbnail, its name, and the need's icon. The letter in the inbox lists bare names today. |
| 3 | Help popups. `tabs/CurriculumTab.tsx:1455` (172 words), `components/BuildPopup.tsx:949` (164), `tabs/AthleticsTab.tsx:188` (139) and `:279–282`, `tabs/StandingsPanel.tsx:33` (108), `tabs/EndowmentPanel.tsx:36` (107), `tabs/FacultyTab.tsx:498–503` (six paragraphs) | Mostly what each mark on the screen means | A legend: the mark itself, then three to six words. Rules that are not about marks stay as two or three short lines. |
| 4 | Keys and buttons named in prose. `data/chapterData.ts:128`, `:142–146` ("the house button in the map tools", "the double-arrow button"), `components/BuildPopup.tsx:783` ("Hold Shift for a straight line, or Ctrl (⌘ on a Mac) for a rectangle") | A key or a button | Keycap chips, and the button's own icon inline. `CampusMap.tsx:246` already writes "[Right click]". |
| 5 | The hall rule (three programs claim a hall, six found a school), told in `chapterData.ts:230`, `:242`, `:248`, `:249`, `eventData.ts:1289`, `:1312–1314` and the Curriculum help | Two thresholds on one count | Six pips on the hall and on the school's row, with marks at three and six. The letters can then drop the rule. |
| 6 | Stat runs joined by dots. Coaches: "quality 61 · potential 60–72 · age 57 · $90k/yr". Clubs: "founded in Year 2 · 54 members · $183/wk". Build header: "850 beds · 3,590 enrolled · satisfaction 85 · campus 22 of 150 · weakest: decoration". Faculty header: "155 course slots · 51 on offer · 70 open · 325 short of the catalog", which needs a 53-word paragraph (`FacultyTab.tsx:500`) to explain it. | Four or five labeled numbers | Coaches get the faculty card's bar and arrow. The course-slot line becomes one segmented bar. Cost and weeks on build tiles get a coin and a clock. |
| 7 | The athletics subsidy. `AthleticsTab.tsx:280`, `:332`: "staff's pay (×0.75, ×1 or ×1.4) … student life (×0.6, ×1 or ×1.5) … 2, 4 or 6" | A three-by-four table | A small table under the Low / Medium / High switch, with the chosen column lit |
| 8 | The board's scale. `tabs/TreasuryTab.tsx:84–88`, `:224`. The tab shows "rung 1 of 5" as words. | Five rungs and what each costs you | A five-step ladder with your rung lit and one line beside each step |
| 9 | Need weights. "×0.20" on each need card, explained by "(×0.20 is a fifth)" in `tabs/StudentLifeTab.tsx:271` | A share of the whole | One stacked bar across the five needs |
| 10 | The athletics sidebar's 80-word paragraph on the complex and the three routes to the offer (repeated from `data/prestigeWords.ts:92`) | Three conditions, met or not | A checklist with ticks. `data/projectData.ts:157` already has the compact form. |
| 11 | Effects inside flavor lines: reputations (`data/tagData.ts:21–30`, "Alumni give a tenth more each year."), quirks (`data/careerWords.ts:88–103`), facilities (`data/facilitiesData.ts:563–872`, "Social space for N students."), campaigns (`data/campaignData.ts:46–82`), research depth (`data/researchData.ts:320–333`), the Final Report's axes (`data/reportData.ts:106–132`), the chronicle's eras (`data/chronicleData.ts:58–74`) | One signed number each | The chip from row 1. The sentence it frees can be flavor. |

Row 1 and row 11 are one component. Building it once pays for most of this
table.

## 2. Patterns that read as machine-written

No single line is the problem. Frequency is.

**The events** (`data/eventCatalogue.ts`, `eventVariants.ts`; 287 letters).
Line by line this is the best writing in the game. The mold:

- **One skeleton.** 173 of 287 letters open in the present perfect ("The
  bank has written…"), and 412 of 836 sentences start with "The". 81 of the
  141 short letters are exactly two sentences: the incident, then a dry
  detail.
- **A button on almost every one.** About nine letters in ten close on a
  deadpan last line. A third would land harder.
- **"Would like"**, in 68 strings. The board, Facilities, the Registrar and
  the donors all would like something.
- **The trailing ", which…" aside**, in 54 strings. "Which is worse" appears
  twice (`eventCatalogue.ts:235`, `eventVariants.ts:99`).
- **Exact numbers as the joke.** "Forty" 28 times, "eleven" 16. Page, line
  and sentence counts in about 39 letters.
- **Documents with manners.** About 63 letters describe a letter or report
  by its length or tone. "The letter is courteous" three times.
- **Repeated jokes.** A committee about committees (`:44`, `:2382`), calm
  being worse than anger (six times), a dog as the punchline (four events).

Em dashes, semicolons and "rather than" were suspected here and are not
there: zero, zero and one.

**The courses** (`data/courseDescriptions.ts`; 473 lines).

- All 473 are one sentence that opens on a verb with no subject. Six verbs
  open 145 of them (Covers, Designs, Examines, Reads, Builds, Writes).
- 358 (76%) are built on a list. 302 (64%) close on ", and …", and 118 of
  those are "A, B, and C, and D", which trips when read aloud (`:333`).
- About 70 end on a stock tail: "the X that every Y needs" (`:224`, `:552`).
- "Real" as an intensifier in 21 lines ("on real hardware").
- 25 lines have em dashes, which is 40% of all the em dashes in the game.
- The implied subject changes between the course and the student (`:408`
  "Cares for infants", `:546` "Teaches students to read a trial").

**The instructions and help.** Plain and clear. Smaller habits:

- The definition formula "X, which Y" in the figure hints
  (`data/figureHints.ts:22`, `:23`, `:39`, `:41`, `:48`).
- Eight of the eighteen milestone letters turn on "now" ("You teach four
  programs now.", "Scholars at other colleges know your name now.").
- "Somewhere to…" twelve times. "For good" thirty times.
- "A short walk through…" four times across three chapters
  (`chapterData.ts:180`, `:202`, `:203`, `:219`). One sentence appears word
  for word in two objectives (`:248`, `:249`).

**Left over from the old style.** These missed the October pass:
`tabs/AlumniPanel.tsx:24` and `tabs/RankingsPanel.tsx:26` (semicolons,
colon reveals, "the college"), `tabs/TreasuryCashChart.tsx:65`,
`data/facultyData.ts:562`, and 37 em dashes outside the courses, most of
them in log lines (`engine/reducer.ts:985`, `systems/techtree/techSystem.ts:588`,
`:760`) and the Treasury's line notes (`tabs/TreasuryTab.tsx:154–155`).

**British usage under American spelling.** `data/officeData.ts:14`
"Enrolment" is a label players see. In the events: "Grounds have" (`:296`),
"The press have" (`:859`), "leavers" (`:986`), "costed" (`:2094`),
"three-yearly" (`:1784`), "the porters" (`:1320`), "lecture theater".

## 3. Voice

**Where it is already right.** Faculty quirks (40 of 40), reputation blurbs,
campaign letters, student demands, most milestone letters and the short
decision letters. This is the target, and it is fond, not sneering:

- "Has a feud with a rival department that predates the rival department."
  (`data/quirkData.ts:40`)
- "The hours are posted every term. The office, on the evidence, is not."
  (`:41`)
- "A good degree at a price a family can say out loud." (`data/tagData.ts:29`)
- "Greek life would bring a great deal of student life with it, and a great
  deal of everything that comes with student life." (`data/eventData.ts:514`)
- "The board thanks her, and hopes not to need her again."
  (`data/boardData.ts:40`)
- "…has approved the minutes of all eleven meetings and nothing else."
  (`data/eventCatalogue.ts:1430`)
- "The Communications Office has chosen a window." (`:2242`)
- "…a shoebox labeled 'minutes (some)'." (`:2444`)

**Where it splits.** There are four narrators.

1. **The wry one**, above.
2. **The manual**: chapters, help and tabs. Candid and friendly, and it has
   no jokes in about 9,000 words. That is correct inside an instruction. But
   the slots around instructions are empty too: empty states ("No
   outstanding demands."), panel subtitles, the summer's headings.
3. **The catalogue.** About 36 of 473 course lines have a wink (8%), and
   Computing has eleven of them. Health, MD, Law, MBA and MFA have none in
   89 lines. The twelve Founders Hall offices have none (`officeData.ts:56–100`
   is effect text only), and a college's administrative offices are the best
   target for satire in the game. The 21 facilities, the 249 research topics
   and the chronicle's era bodies have none either. The eras have good names
   ("The Long Afternoon") over ten flat sentences of statistics.
4. **The old formal voice.** The base event letters use contractions in 11 of
   160 strings and the variants in 35 of 116, so one event can arrive in two
   registers. Some letters still talk about "the college" beside "your
   college" (`eventCatalogue.ts:876`, `:2164`), and `:2607` is in the third
   person throughout ("unless the President prefers").

**Tone slips.** `quirkData.ts:37` ("Everyone leaves happy, and nobody knows
anything.") is contempt where the rest is affection. The label at
`eventCatalogue.ts:2569` ("Decline, since the walk does them good") aims at
students, not at the institution.

**Real names in courses.** The courses name real institutions
(`courseDescriptions.ts:445`, the American College of Sports Medicine;
`:162`, the FAA), real statutes (`:372`, `:398`) and canonical authors
throughout. Plan 47's rule against real names covers what the game invents
things about (trophies, rivals, mascots, funders). It does not cover
subject matter a course refers to, so these are not breaks of it. The owner
has ruled that they all stay (see the decisions below).

**Labels.** The 389 event labels are consistent: 388 are imperatives with no
period. A few don't say what happens (`:1004` "Do something generous and
unasked-for", `:989` "Put money behind whatever it is"), and one reads
against its effect (`:1075` "Turn every thermostat down two degrees" costs
$150,000).

## Proposed fixes, in order

Each is about one pull request.

**A. Effect chips.** One component for a signed effect. Use it in the event
choices and the decision letters first (table row 1), then reputations,
quirks, offices and facilities (row 11), then the milestone "now open" list
with thumbnails (row 2).

**B. Legends, keys and pips.** Turn the six longest help popups into
legends (row 3). Add keycaps and inline button icons to the chapters and the
build tools (row 4). Draw the hall rule as pips and cut it from the letters
(row 5). Add the subsidy table and the board's ladder (rows 7, 8). Replace
the dot-joined stat runs (row 6).

**C. The events, thinned to budgets.** Keep the wit and cut how often each
device appears. Proposed budgets across the 287 letters: a closing button on
one in three; "would like" under 15; the trailing ", which" under 15; one
measurement per letter; "eleven" and "forty" five times each; one event per
repeated joke. Put every letter in the second person, bring the base
letters to the variants' register, fix the British usage and the vague
labels. Sample rewrites:

- `:433` "…is three lines long, which is two lines longer than it needed to
  be and one line shorter than a letter that meant it." → "The letter runs
  three lines and blames pressure of work. A letter that meant it would have
  run longer."
- `:1032` "Facilities would like it noted that they said so first." →
  "Facilities said so first, and has kept the memo."
- `:2164` "The letter is courteous and long, and its appendix lists…" → "Its
  appendix lists…"
- `:876` "a year the college would rather not dwell on" → "a year you would
  sooner forget"

**D. The courses, out of the mold.** Recast about a third so that length and
shape vary: some as two short sentences, some with the student as the
subject, some without a list. Bring Health, MD, Law, MBA and MFA up to the
rate Computing has. Remove "real" as an intensifier and the em dashes.
Samples:

- `:333` "Grows, stains, and identifies bacteria in the lab, and covers
  archaea, viruses, fungi, pathogenesis, and how antibiotics work and fail."
  → "Grows, stains, and identifies bacteria in the lab. Lectures add archaea,
  viruses, fungi, and pathogenesis, and how antibiotics work and fail."
- `:402` "…and the hand hygiene, vital signs, and charting that every shift
  begins with." → "…then hand hygiene, vital signs, and charting. Charting
  takes the longest to learn."
- `:237` "…writes an artist's statement for it, and hangs it in the college
  gallery for public critique." → "…hangs it in the college gallery for
  public critique, and writes the artist's statement last, under protest."

**E. The flat bodies.** One line of flavor each for the twelve offices and
the 21 facilities, once the chips carry their numbers. Rewrite the faculty
bio, the chronicle's era bodies and the reputation "why" lines. Fill the
empty states. Samples:

- `officeData.ts:100` → "Counts everything the college does, then counts it
  again."
- `facilitiesData.ts:911` "A green centerpiece for campus life." → "A lawn at
  the middle of campus, crossed on the diagonal by everyone who is late."
- `facultyData.ts:562` → "Took a doctorate in {field} at {institution} and has
  worked on {interest} ever since."
- `quirkData.ts:37` → "Everyone leaves happy. What they leave knowing is
  harder to establish."

**F. The leftovers, and a check that keeps them out.** Rewrite the strings
listed under "Left over from the old style". Then extend
`tools/review/plainChecks.ts`: an em dash rule, a British word list, and
frequency budgets for the events and courses ("would like", trailing
", which", the opening verbs), each with its own baseline so the counts can
only fall.

**G. A voice note.** Half a page in `docs/design/` that names the narrator
and where jokes may go. A proposal: the narrator is your chief of staff, who
has been at the college longer than you, likes you, and tells you the truth.
Jokes live in flavor slots (blurbs, quirks, the first line of a letter,
empty states, titles) and never inside an instruction. The target of a joke
is the institution, never a student or a named person.

## Decisions for the owner

1. **Jokes near instructions.** Keep the chapters and help entirely
   straight, or allow one dry line in their titles and empty states?
   This review assumes the second.
2. **The events' closing line.** One in three is this review's guess. The
   number is a matter of taste.
3. **Real names in courses.** Decided, 10 November 2026: keep them all. A
   course refers to real institutions, statutes and authors without making
   anything up about them, and they make the catalogue read as a real one.
   The line stays where Plan 47 drew it: no real names on anything the game
   invents a story about (rivals, funders, trophies, events, quirks).
4. **Order.** A and B change what players see most. C and D are the largest
   rewrites. This review would do A, B, F, then C, D, E.

## What was not checked

The specialization page and the Final Report were read as text but not
looked at on screen: the gallery run timed out on the Year 34 save. The
phone layout was not looked at. Name pools were not read. The readers'
frequency counts for the events and courses were spot-checked, not
recounted in full.
