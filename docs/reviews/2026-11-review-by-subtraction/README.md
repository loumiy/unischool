# UniSchool — a review by subtraction, November 2026

Plan 123. Commit read: `5d06ae4` (0.2.0, with Plans 110–122 landed). This is the only file the owner has to read. The five passes hold the evidence, and every card names the findings it rests on.

| Pass | File | Question |
|---|---|---|
| A. The census | [`census.md`](census.md) | What is there, how often is it seen, what decision does it serve? |
| B. The silent run | [`silent-run.md`](silent-run.md) | Can a new player get through the early years with the explanations hidden? |
| C. The juice pass | [`juice.md`](juice.md) | When the player acts, what does the game do back? |
| D. The web | [`web.md`](web.md) | Which systems visibly feed which? Which are islands? |
| E. Cohesion | [`cohesion.md`](cohesion.md) | Does every signal mean one thing, and does the map agree with the tabs? |
| Bugs | [`bugs.md`](bugs.md) | The bugs the passes ran into (one is live: R-1) |
| Data | [`data/`](data/) | Play statistics, the gallery's counts, the goal players, the cut list |

**How to read the judgments.** The reviewers are models, not human players. Feel judgments are labelled as theirs; they rest on silent and hands-on sessions in the production build, measured clips, 47 goal-player runs and the play statistics. The silent sessions reached year 3, not year 5, so the later chapters (teams, research, alumni) are judged from code and the goal players, not from play.

**Raised today: R-1.** On desktop, the *Looking around* chapter asks the player to turn and tilt the view, but those controls exist only as keys (Q/E, Z/X); the buttons are drawn for touch only. The chapter holds back the housing, seats and money chapters. A skimming player never got past it and reached year 2 with 254 of 350 students and satisfaction 29; real players kept it open 150 weeks on average. It is live in 0.2.0 and the fix is an hour (card 1).

## The verdict

A player would describe UniSchool as *a calm game where you grow a campus and a curriculum and watch the students pour in*. The parts that say that best are the map and the summer: placing a building, watching it rise, and the admissions reveal, where price, prestige and applicants move together in one picture. Those parts teach themselves; played with every explanation hidden, they worked.

What is most in the way is **a second game made of words laid over the first**. It is a layer of chapters, walks, coaches, letters, badges, panels and small mechanics, each added to explain or enliven something, which now outweighs what it explains. A newcomer reads about 1,050 words before year 2. One pending decision shows in five places. 75% of the game's causal links can only be read about, never watched. Seven of 21 systems are islands, and goal players who ignore them lose nothing. Meanwhile, the three biggest moments in a run (the specialization, a title, the Final Report) get less feedback than placing a gazebo.

The direction is the owner's: cut the second game and let the first one show itself. Every card below removes more than it adds.

## The headline numbers

| | Now | After the twelve cards (estimated) |
|---|---|---|
| Words read before year 2 (careful newcomer) | ≈1,050 | ≈350 |
| Read-to-act, first 20 minutes | ≈30 words per action | ≈10 |
| Words on the bare map's band at year 15 | 273 | under 100 |
| Systems / islands | 21 / 7 | 18 / about 3 |
| Causal edges seen by the player | 22% | about 45% |
| Juice coverage (verb × beat cells at 2+) | 62% | about 80% |
| Player-facing words in the game | 61,332 | about 50,000 before an events trim |

The estimates sum the net changes the cards state. They are targets for the plans that follow, not measurements.

## The twelve cards

Ranked by players affected × how early × the simplicity gained ÷ effort. Effort: S an hour, M a PR, L a plan. Each card is one player moment.

### 1. The camera stops blocking the game — every desktop player, minute 1, S

- **The moment.** The second chapter asks the player to pan, turn, tilt and zoom. Turn and tilt are keys only on desktop, and the map tools' button promises them but shows zoom alone. The chapter holds back the three chapters that teach housing, seats and money. ([`img/b-skimmer-year2-stuck-on-turn.png`](img/b-skimmer-year2-stuck-on-turn.png), [`img/b-map-tools-zoom-only.png`](img/b-map-tools-zoom-only.png))
- **What's wrong.** A skimmer's run failed its first summer here (B-2, B-7, B-8). Real players kept the chapter open 150 weeks on average (data). It is the only blocking finding in the review (R-1).
- **Cut.** The *Looking around* chapter, its five objectives and helps, and most of the 280-word map tools help (cut list X1, X2).
- **Connect.** None needed: the camera is learned by using it.
- **Juice.** The turn, tilt and home buttons, which already exist for touch, shown on every device.
- **Net.** −1 chapter, −5 objectives, ≈ −360 words, −1 false promise; +4 existing buttons on desktop.
- **Confidence.** High. Seen in three sessions, in the code, and in the statistics.

### 2. An objective opens when its control lights — every guided player, years 1–3, S

- **The moment.** The second course is asked for while the first is still being written; Elm Hall about 40 weeks before it is affordable; a move into a hall during its 26 weeks of building. Each needs a help text to explain why it can't be done yet. ([`img/b-chapter2-nothing-to-develop.png`](img/b-chapter2-nothing-to-develop.png), [`img/b-elm-hall-unaffordable.png`](img/b-elm-hall-unaffordable.png))
- **What's wrong.** Three of the first ten chapters open on something impossible (B-1, B-9, B-10). And the year-1 chapter *about* paragraphs carried no weight in the silent run: from the fifth chapter, half the briefings are never opened, and the chapters still get done (data).
- **Cut.** The wait-help variants; the year-1 *about* paragraphs (X3, X4).
- **Connect.** One rule: an objective opens only when its control is lit. Where waiting is the lesson, the wait shows on the control: a greyed card that fills as cash approaches its price, or the crane that is already there.
- **Juice.** The fill on the build card is a number that moves toward a goal.
- **Net.** −3 help variants, ≈ −365 words; 0 surfaces.
- **Confidence.** High.

### 3. The walks and the coaches go; the admissions screen stays as it is — every player, first two years, S

- **The moment.** Four guided walks through the Treasury, Students, History and Faculty tabs, a six-tip admissions coach, a handle hint and a summer note. With their text hidden, each walk is a title and *Next* three times; the Treasury walk is 258 words for one click. Played silent, the admissions screen taught itself: the price verdict, the dots, the hall filling, *What this class does*. ([`img/b-students-walk-silent.png`](img/b-students-walk-silent.png), [`img/b-admissions-silent-works.png`](img/b-admissions-silent-works.png))
- **What's wrong.** Nearly two thirds of year 1's reading is in these two places (B-6, B C4).
- **Cut.** The four walks and their objectives, the admissions coach, the handle hint, the first summer's chapter text, the summer call's note, and "the cost of being large" until it applies (X5–X7, X9). With the walks gone, the "Guide" button goes too (E-7).
- **Connect.** Nothing new: the tabs' own labels carried every decision in the silent run.
- **Juice.** A click finishes the admissions animation (about 4 s a summer, about 3.5 min a run), as reduced motion already does.
- **Net.** −4 walks, −1 coach, −4 objectives, −1 button, ≈ −700 words. The summer's read-to-act falls from about 97 words per action to about 20.
- **Confidence.** High for the walks and coach; medium for the summer text, which only one careful session judged.

### 4. The founding lands — every player, minute 1, S–M

- **The moment.** The founding form shows a live elevation of the hall as the player picks its style and colours: the game's best anticipation. Then *Open the doors* cuts to bare woods under a 70-word letter, the hall pops in at full size, and two text panels open in the same frame. The title screen, the founding form and the game use three different projections. ([`img/c-found.png`](img/c-found.png), [`img/e-title-topdown.png`](img/e-title-topdown.png), [`img/e-founding-elevation.png`](img/e-founding-elevation.png))
- **What's wrong.** The first payoff of the game, the building the player just designed, is covered by text (C-3, E-9). A third of founded runs still end before year 1 (data).
- **Cut.** The *doors open* letter, the second panel, three redundant lines; the title's top-down backdrop and the form's flat elevation in favour of the isometric map and hall (X10, X11, S7).
- **Connect.** The hall on the form is the hall that lands.
- **Juice.** On placement the hall rises into its footprint (about 400 ms, the completion ring's easing) with `place` then `complete`. The next step waits for that to play, then shows one panel. The Build panel stays down a second after any placement, so the plot, the dust and the thud read as one beat (C-8, R-5).
- **Net.** −1 letter, −1 panel, ≈ −110 words, −2 art projections; +1 motion.
- **Confidence.** Medium. The drop-off has many causes; this is the one in the first minute.

### 5. The growth lever is in the picture — every player, from the first summer, M

- **The moment.** Enrollment is capped by class places, and each course adds 80. The player learns this only from the *Seats* chapter's words. At the summer, "the hall is full" with no sign of why or what would fix it. A path one tile short of Founders Hall gives no feedback. ([`img/b-hall-full-at-admissions.png`](img/b-hall-full-at-admissions.png), [`img/b-path-short-no-feedback.png`](img/b-path-short-no-feedback.png))
- **What's wrong.** The most important lever in the game is told, never shown (B-7, B-12, B-4). From about year 10, every growth strategy is bound by seats, so most applicant-pool factors never bind (D-8).
- **Cut.** The *Seats* chapter's *about* and help, the path help; the applicant factors that never bind (beauty, tags, the honors cut, office pulls: see cards 9 and 11).
- **Connect.** Curriculum and admissions become one picture: the admissions hall drawn as rows of seats, one row per course; the next *Develop* labelled "+80 places".
- **Juice.** With the path tool armed, the network joined to Founders Hall is tinted, and a doorstep lights when the network reaches it.
- **Net.** ≈ −110 words, −4 reveal factors; 0 surfaces (two existing views redrawn).
- **Confidence.** High that the lever is hidden; medium on the drawing, which needs a mock-up.

### 6. One fact, one place on the band — every player, all game, S–M

- **The moment.** At year 15 the bare map's band carries 273 words. One pending decision shows in five places: the ticker's NEXT, the Inbox count, the drawer's *Also waiting*, the row's pill and a toast. A chapter step shows in four. The date is shown four ways. Seven of eight Build categories wear a red "!" for "unseen", the same badge that means a real problem on Athletics. ([`img/e-one-fact-four-places.png`](img/e-one-fact-four-places.png), [`img/e-build-badges-y30.png`](img/e-build-badges-y30.png))
- **What's wrong.** The band repeats itself, so nothing on it stands out (E-2, E-3, E-8).
- **Cut.** The "unseen" badges; *Also waiting* and the matter toast; Athletics' six "Hire a …" links; two date readouts; one of the Rank and Prestige chips (H1–H5).
- **Connect.** Each fact has one home: decisions the Inbox badge and NEXT; chapter steps the chip and the lit target; standing one chip.
- **Juice.** The one remaining badge means "needs you", drawn cream-on-red with a dark border so it reads on any palette.
- **Net.** ≈ −9 badges, −1 drawer section, −1 toast type, −2 readouts, −1 chip, −6 links; the band under 100 words.
- **Confidence.** High.

### 7. Prestige is a figure, not a paragraph — every player, every summer, M

- **The moment.** The core loop's strongest links into prestige (the curriculum's breadth, teaching, research) show only as text lines in the summer review and History's breakdown. History is opened about once in two years, Curriculum almost four times a year. Prestige moves only at the summer, so no player watches a course or a hire move it. Its target can run up to 14 points ahead, unseen.
- **What's wrong.** The game's spine is told, not seen (D-1, D-9).
- **Cut.** The summer review's standing lines and pillar sentences, the Standing breakdown's prose, the separate Rank chip (X8, H5).
- **Connect.** Four pillar bars as one figure: on the prestige chip, and at the head of the tab that feeds each pillar (Curriculum for academics, Research, Students for student life, Athletics). A ghost tick marks the target.
- **Juice.** At the summer the bars fill instead of a list of "+1.4"s.
- **Net.** −1 text breakdown, ≈ −400 words; +1 figure used in five places; 3 strong edges and 1 hidden edge become seen.
- **Confidence.** Medium–high; needs a design pass on the chip's size.

### 8. The map carries what the tabs say — every player, years 2–50, M–L

- **The map already shows** program standing (hall pips and rings), lab progress, full residences and building wear. Yet five of six letters in the year-15 Inbox announce "X is now an established program", which the ring has already shown.
- **It doesn't show** courses waiting for a teacher, students' dining and health needs, or whether the year is good or bad. Those live in words on Faculty and Students (E-4, E-5, C-10).
- **Cut.** The established-program letters; faculty tiles' "N WAITING"; the satisfaction sub-lines (M1, M2).
- **Connect.** Faculty → campus and satisfaction → campus become seen: a dark window on a hall for each course with no teacher; a queue at the Commons or clinic door when that need is short. One good-or-bad-year tell, not more: walkers gather on the quads only while satisfaction is high.
- **Juice.** The aftermath of hiring is a window lighting.
- **Net.** ≈ −5 letters a year, ≈ −150 words a year, −2 lines of tile and tab text; +3 map signals.
- **Confidence.** Medium; the map work is the largest art cost in the review.

### 9. The letters layer becomes events that land — every player, years 3–50, L

- **The moment.** Events, promises, demands, identity's effects, the board's question and the Founders Hall offices carry about 20,000 of the game's 61,000 words. Each effect is a weak one-off nudge, and none of them is a link that matters to another system.
- **What's wrong.** Five islands of words (D-2, D-3, D-10). No goal player opened an office in 47 runs; blocking them changed nothing. The championships player takes no promise and finishes 14th.
- **Cut (mechanics).** Promises; demands, with their deadline folded into satisfaction's drag that the header already names; identity's effects (the tags stay as words); the twelve offices (seats stay); the negligible edges (quirks' morale, building pairing and three more); the board's question unless it becomes a choice the map shows (M3–M9).
- **Connect.** Keep the events whose effect lands on the map or moves a figure the player watches: a tree, ivy, a sinkhole, a building, the class.
- **Juice.** A building event shows on that building (the condemned boiler's red notice on its door).
- **Net.** −3 systems, −2 panels, −2 actions, −7 levers, ≈ −3,000 words before the events trim.
- **Confidence.** High that these are islands; the cut is the owner's call (allowed by §8).

### 10. The big moments land on the map — every player who gets there, M

- **The moment.** The specialization's room is the best ceremony in the game; Confirm then cuts silently to a corner of the map and one ticker line. A national title plays a fanfare and stops the clock on a page of text, then is a number in a tab. The Final Report arrives all at once as static text, and its fanfare plays after it has been read. ([`img/c-specialization.png`](img/c-specialization.png), [`img/c-title.png`](img/c-title.png), [`img/c-final.png`](img/c-final.png))
- **What's wrong.** Celebration is out of proportion downward (C-1, C-2, C-9).
- **Cut.** The specialization's ticker line and letter; the title page that stops the clock (A2); the year-50 summer card's generic copy.
- **Connect.** Athletics → campus becomes seen: a pennant on the venue for each title, stacking.
- **Juice.** The specialization moves the camera to the pillar's capital project and stakes its plot in the pillar's colour, with the fanfare. A title is a banner over the map, as a school distinguished already is. The Final Report opens over the campus, stamps its six grades one by one and ends on the fanfare.
- **Net.** −1 stopping surface, −1 letter, −2 lines; +1 permanent map mark, +2 sequences.
- **Confidence.** High.

### 11. Athletics, money and alumni each do one visible thing — players years 5–50, L

- **The moment.** Running no athletics department at all costs 0–6.5 target points; the championships player spends 176 coach actions on it. Blocking every Treasury lever costs 0–5 points while cash piles to $1.7–2.2 billion. Alumni read six systems and give back $220 an alum a year. No goal player held a reunion or decorated, and the big-then-good player still finished first.
- **What's wrong.** Busywork and a dead end (D-4, D-5, D-6, D-7).
- **Cut (mechanics).** Coach management, team order and athletic scholarships, keeping the budget tier. The prestige dividend, the draw-rate slider and the sweep. Reunions, and the Alumni panel down to one line. One of the two scores for the campus's looks (A1, A3–A5).
- **Connect.** Alumni warmth feeds word of mouth, shown on the reveal's existing line, so a happy decade pays twice, visibly, every summer. Late money buys endowed chairs that lift the hiring market, shown on the Faculty market's line.
- **Juice.** None needed beyond card 10's banners.
- **Net.** −4 athletics actions (the Athletics tab, the wordiest, roughly halved), −2 Treasury controls, −1 action, −1 score; two weak edges become moderate, seen ones.
- **Confidence.** Medium. Three ablation runs per system is a small sample; the cuts are measured, the new links are proposals.

### 12. One signal, one meaning — every player, all game, M

- **The moment.** Gold means about ten things: selected, primary, good, Distinguished, a full residence, lab progress, unread, an active project, *retiring* and "do this". A ring, a pulse and a dash each carry three to five meanings. One chime plays for a building, a program, a milestone, a breakthrough and a met demand; one tick for nine topics, including both a hire and a departure. The default maroon is close to the danger red. ([`img/e-faculty-plot-gold.png`](img/e-faculty-plot-gold.png), [`img/e-map-marks.png`](img/e-map-marks.png))
- **What's wrong.** When a colour, shape or sound means everything, it means nothing (E-1, E-6, E-10, C-5).
- **Cut.** Gold's five extra meanings, three standing pulses, five background cue mappings, two name clashes, the Unicode glyphs among the icons, five of seven entrance motions (S1–S6).
- **Connect.** A grammar the player can learn by seeing it twice: gold is "selected / do this"; a ring is standing; an arc that fills is progress; a pulse is "do this"; a dash is "not yet"; danger ink is derived against the college's own colour.
- **Juice.** The finished building gets its own cue, and spending gets one quiet "spend" cue (C-6).
- **Net.** ≈ −15 meanings, −5 cue mappings, −5 motions; +2 cues.
- **Confidence.** High.

## The cut list

Every *cut*, *trim* and *merge* from the passes, one line each, is in [`data/cut-list.json`](data/cut-list.json) (38 rows), each tied to its card. The owner decides each row on the review page, with *keep*, *trim* or *cut*. The decisions are read back from the page into the plans that follow.

## Keep

What works, and must survive the cuts:

- **The admissions reveal.** The applicants rain in, the admit line draws, the class pours into the hall; the price slider moves the cloud; "families expect about $X" ties price to prestige. The best seen link and the best motion in the game, and it teaches itself (B, C, D).
- **Building on the map.** The `place` thud with the cash counting down; graded plot, hoarding, scaffold, shell, building; the gold ring at completion (C).
- **The founding elevation and the specialization room.** Anticipation done right; only the payoff is missing (C).
- **Status lines that name a blocker.** "1 in development · next finishes in 4 weeks", "Needs Operations Research faculty" with the candidates inline, "$2.1M short · you can borrow up to $920k". The best words in the game: short, specific and next to the control (B).
- **Hall pips and weathering.** A whole tab's fact in a mark on the map; money shown as upkeep with no words (E).
- **Teacher → grade, prestige → committee seats, the ladder's unlocks.** Links the player can see (D).
- **Research.** The one optional system all three ablations say pays (D).
- **One panel shape, one type system, the college's colours carried everywhere, the colour-vision palette, reduced motion that keeps the information** (E, C).
- **The sound director's discipline.** Every topic has a cue, each plays once a week, and the fanfare is kept for the biggest moments (E).

## What this review did not do

- It did not change the game.
- The silent sessions reached year 3, not year 5.
- The status of the third review's findings, planned for this PR (Plan 123 §6 E), was not written. Its findings are listed in `docs/reviews/2026-10-game-review-iii/` and still await the owner's triage.
- The estimates in the headline table are sums of the cards' stated changes, to be measured again after the plans that follow.
