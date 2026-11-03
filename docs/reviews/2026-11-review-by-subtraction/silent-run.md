# Pass B — The silent run

*Review by subtraction (Plan 123 §3, pass B). Findings only; no game code changed.*

**Build read:** commit `5d06ae4`, production build (`vite preview`), 1440×900.

## Method and its limits

- Driven with `tools/review/drive.mjs` and its `silent` step. Silent hides letter
  and coach bodies, chapter *about*, (?) help, figure hints, tooltips and walk prose.
  Titles, labels, numbers and buttons stay.
- **Gap in the harness:** `silent` does not hide the opening walkthrough's prose
  (`.opening-coach p`, `OpeningCoach.tsx`). I added that rule per call in my own
  wrapper. Pass owners who reuse the tool should add it to `SILENT_CSS`.
- I played three silent sessions from a fresh profile:
  - **A, careful:** to Y3W41.
  - **B, skimmer** (click the lit thing, close drawers): to Y2W1. The run was broken by then (B-2 below).
  - **C, goal, grow enrollment:** to Y3W1.

  None reached year 5 within the budget. Every stall below came from years 1–3, so
  the later chapters (teams, research, alumni) are **not covered** by this pass.
- One non-silent session (careful newcomer, through to Y2W1) for the word count.
  - **Counting rule:** every new on-screen line of five or more words, de-duplicated.
  - **"Prose"** means sentence-length explanation: letters, coach and walk cards,
    chapter *about*, help, and the summer review. It excludes status lines such as
    "Places for 240 of 350…".
  - I opened about a quarter of the (?) helps, as a careful player might.
- **The player is a model, not a human.** I knew keyboard conventions (Q/E, Z/X)
  that a newcomer might not, so stall B-2 is if anything understated. Lines marked
  *(my judgment)* are feel calls, not measurements.
- Each drive call reloads the page, which re-shows some cards (for example "Open
  admissions" mid-summer). I have not counted those as stalls.

## Headline numbers

| | |
|---|---|
| Stalls, session A (careful) | **7** (0 block, 5 slow, 2 confuse) |
| Stalls, session B (skimmer) | **4**, 2 of them **blocking**: the run reached year 2 with 254 students (from 350) and satisfaction 29 |
| Stalls, session C (goal) | **6** (0 block, 5 slow, 1 confuse) |
| Words of prose read before year 2 | **≈1,050**. About 1,300 if every year-1 (?) is opened. Previous review: about 1,340 |
| All sentence-length lines on screen before year 2 | ≈2,080 |
| Meaningful actions in year 1 + first summer | 35 |
| **Read-to-act ratio, first ~20 min** | **≈30 words of prose per action** (≈59 counting every sentence-length line) |

The first 20 minutes of a careful newcomer is about year 1 plus the first summer.
That estimate is about 5 minutes reading at 200 wpm, about 35 actions, and the
clock at 2× (about 2.5 minutes a year).

### Read-to-act by phase (non-silent run)

| Phase | In-game | Prose words | Actions | Words/action |
|---|---|---:|---:|---:|
| Title, welcome letter, walkthrough (Founders Hall, first program) | Y1W1 | 174 | 8 | 22 |
| Chapters 2–3: second course, camera, two more programs | W1–W10 | 120 | 12 | 10 |
| Somewhere to sleep: dorm, dining, path | W10–W16 | 31 | 6 | 5 |
| Seats: develop courses | W16–W27 | 78 | 4 | 20 |
| Founding letter + **Treasury walk** | W27–W30 | 258 | 1 | **258** |
| **First summer** (call, review, 6 admissions tips, students) | W52 | 386 | 4 | **97** |
| **Total** | | **1,047** | **35** | **30** |

Where the words sit:

- The early game is close to "learn by doing": 5–22 words an action.
- Almost two thirds of year-1 reading sits in two places: the Treasury walk and
  the first summer.
- In the silent run, neither place needed its words (B-6, and "text that carried
  no weight" below).

## Stalls

Severity: **blocks** = the run goes wrong or cannot go on; **slows** = time lost
but recoverable; **confuses** = a wrong belief or a dead click.

| ID | Date | Screen | Trying to | Hidden text that would solve it | What the game could show instead | Sev. | Seen in |
|---|---|---|---|---|---|---|---|
| B-1 | Y1W1 | Curriculum (ch. 2 "Start a program's second course") | Start the second course. No Develop exists: ECON 110 waits on ECON 101 for 4 weeks. Clicking the greyed card opens ECON 101's detail. | (?) "ECON 101 is still being written, with 4 weeks to go…" (`state/chapters.ts` wait help). The status line "1 in development · next finishes in 4 weeks" does show in silent. | Don't open the objective until a Develop button exists. The lit button is the lesson. | slows | A, B |
| B-2 | Y1W1 → Y2W1 | Map, ch. 3 "Turn the view" / "Tilt the view" | Meet the camera chapter. Turn and tilt are keyboard-only on desktop, and nothing on screen offers them. The chain then holds back Somewhere to sleep, Seats and Paying for it. | Help "Turn the view with Q and E…", "Tilt the view with Z and X" (`data/chapterData.ts:170-171`) | Cut the chapter from the chain (see C1). Or un-gate the turn/tilt/home buttons that already exist for touch (`CampusMap.tsx:2756`). | **blocks** | B (stuck all year), A, C |
| B-3 | Y1W4 | Map tools pop-up | Find turn/tilt. The button's tooltip promises "zoom, turn, tilt and help", but desktop shows only + and −. | Tooltip `CampusMap.tsx:2740` | Same fix as B-2: show the buttons, then delete the tooltip's promise. | confuses | A |
| B-4 | Y1W10 | Build › Grounds › Paths | Join the dorm to Founders Hall. You pick Paths, then a material, then drag. A drag that stops one tile short shows nothing, and the objective just stays open. | Help "Drag a path from the residence hall to Founders Hall" (`chapterData.ts:189`) | With the path tool armed, tint the tiles that touch Founders Hall's network. Light the dorm's doorstep when the network reaches it. | slows | A, C |
| B-5 | Y1W3–W10 | Map with Build panel | Pan or place after building. The Build panel stays open after a placement and covers the lower half of the map. A drag there pans nothing. | none | Close the panel on placement (the building rising is the feedback). Or shrink it to the category row. | slows | C |
| B-6 | Y1W30, Y2W1, Y2W24 | Treasury / Students / History / Faculty walks | Meet "Walk through the X tab". In silent, each card is a title and **Next**. Three Nexts meet the objective, and nothing on screen changes. | Walk prose (`data/tabWalkData.ts:24-40`) | Nothing. The tabs' own labels carried every decision I made. Cut the walks and their objectives (see C3). | confuses | A, C |
| B-7 | Y1W52 | Admissions (skimmer) | Admit a class. Hall: "Room for 0 new students", admit rate 1%, class 0. The cause (3 courses = 240 seats for 350 students, no beds) was never lit, because the chapters that ask for it were held behind B-2. | Seats chapter *about* and help (`chapterData.ts:194-199`) | Draw the hall as rows of seats, one row per course (+80 each). A full hall glows and links to Curriculum. The cause sits beside the effect. | **blocks** | B |
| B-8 | Y2W1 | Map (skimmer) | Recover. Enrolled 254, satisfaction 29 in red, and the chapter strip still says "Turn the view". Nothing is lit that would raise either number. | Students walk; Standing help | Once satisfaction is red, ring its tightest need's build category ("Housing !" exists in the build menu, but only there). | **blocks** | B |
| B-9 | Y2W24 → Y3W11 | Build › Academic, ch. 10 "Place an academic hall" | Place Elm Hall. The card is greyed, "$2.5M · $2.1M short · you can borrow up to $920k". The objective sat impossible for about 40 weeks. | `HALL_LOCKED_HELP` / build help | Fill the greyed card from the bottom as cash approaches $2.5M (a number that moves). Open the objective when the card lights. | slows | A |
| B-10 | Y3W13 → W39 | Elm Hall panel, ch. 10 "Move a program into it" | Move a program. The hall is under construction for 26 weeks. The panel says so plainly ("25 of 26 weeks left"). | — | Same rule as B-1: no objective before it can be acted on. The crane already shows "not yet". | slows | A, C |
| B-11 | Y1W1 | Curriculum committee | Click a lit committee seat to start something. Nothing happens. | — | A free seat that breathes should be a button to the next Develop, or should not breathe. | confuses | B |
| B-12 | Y2 summer | Admissions (goal) | Grow. "The hall is full" at 359 with 427 applicants. The growth lever (each course adds 80 places) is only told, in Seats' *about*. | `chapterData.ts:194` | Same as B-7: rows per course, "+80" on the next Develop, so the lever and the cap share one picture. | slows | C |

Not stalls, and worth recording:

- **Founding.** Founders Hall card, ringed slot, Found button: no stall.
- **Hiring through a hall slot.** "Needs Operations Research faculty" appears with
  Appoint buttons inline: no stall.
- **The admissions screen,** played silent.

All three taught themselves.

## Text that carried no weight

With it switched back on, I found nothing in these lines that the screen had not
already shown me. Words are per instance.

| Text | Where | Words | Why no weight |
|---|---|---:|---|
| Six admissions coach tips | `components/AdmissionsCoach.tsx:42-71` | ≈195 | Silent, I set price and line correctly from the price verdict ("in line with your prestige — near the top"), the dots, the hall and the "What this class does" panel. |
| Handle hint "Drag the handle up to raise the bar…" | `components/AdmissionsPage.tsx:531` | 25 | Duplicates coach tip 4. The handle has a grip and moves. |
| Treasury walk, 3 cards | `data/tabWalkData.ts:24-34` | 93 | Restates the Treasury's own headings. It is met by pressing Next. |
| Students, History, Faculty walks | `data/tabWalkData.ts` (from :40) | ≈250 | Same as the Treasury walk. Card titles only were enough. |
| Chapter *about* paragraphs for year 1 (next course, looking around, sleep, seats, paying, first summer, standing) | `data/chapterData.ts:148, 160, 178, 194, 204, 216, 226` | ≈275 | The objective line beside each carried the run. The *about* text is rules-explaining (four weeks per course, capstone 28) that the committee bar shows as it fills. |
| "The clock has stopped for the summer… note at the bottom left…" | `chapterData.ts:216` | 53 | The note is already on screen, with a sun and one button. |
| "The cost of being large" note, shown at 350 students | `tabs/TreasuryTab.tsx:311` | 36 | It is about 1,500+ students. It carries no decision in year 1. |
| Summer review: "Satisfaction is how happy your students are, out of 100. From now on…" | `state/yearInReview.ts:183` | 30 | The number appears in the HUD the next moment, with its own chip. |
| The four "X stands at N of 150, and counts for Y%" lines | year-in-review prestige rows | 49 | The report card bars show them. *(my judgment: a newcomer does not act on 150-scale pillar numbers in year 1)* |
| "A run lasts 50 years. At the end of Year 50 the board writes your Final Report…" | `data/openingData.ts:106` | 25 | The title screen already says "Fifty years to build a university." |
| "The walkthrough has two steps." | `data/openingData.ts:142` | 5 | The card's "Step one" / "Step two" eyebrow says it. |
| "Time is paused until you do this" | `components/OpeningCoach.tsx:97` | 7 | The clock is visibly paused, and the pause button is lit. |

The total is about **1,040 words**. Across the year-1 instances, about 600 of
those reach a careful newcomer.

## Text that earned its place (keep, shorter if possible)

- **Objective lines** ("Lay a path from the residence hall to Founders Hall",
  "Turn the view"). Silent, they were the only guidance, and enough wherever an
  on-screen route existed.
- **Status lines that name a blocker:**
  - "1 in development · next finishes in 4 weeks. ENGL 110 needs ENGL 101."
  - "Needs Operations Research faculty" with the candidates inline.
  - "$2.1M short · you can borrow up to $920k".

  These are the best words in the game: short, specific, and next to the control.
- **The price verdict** ("in line with your prestige — near the top") and the
  consequence rows ("9 students won't come back. They want more housing and
  dining"). They show cost before the choice.
- **Turn/tilt key help** (`chapterData.ts:170-171`). It is the only route today,
  so it earns its place until buttons replace it (C1).
- **The help that explains why an objective cannot be met** (B-1, B-9). It is
  load-bearing only because the objective opens too early. Fix the gating and it
  can go.
- **Letters with flavour** ("Somebody lives here now", 47 words): *(my judgment)*
  charm, not instruction. Keep one per milestone at most. It cost nothing in the
  silent run because it never blocked.

## Conclusions

**C1. Take the camera out of the chapter chain.** This is the one blocking finding.
"Looking around" asks for four keyboard moves. On desktop, two of them (turn and
tilt) have no on-screen control. A player who doesn't find them never sees the
housing, seats or money chapters, and fails the first summer (B-2, B-7, B-8).

- Cut the chapter.
- Un-gate the turn/tilt/home buttons that `CampusMap.tsx` already draws for
  touch, so the camera is learned by doing.
- **Net:** −1 chapter, −5 objectives, −5 help strings, −1 about (≈ −130 words),
  −1 false tooltip promise. +4 existing icon buttons shown on desktop.

**C2. One rule for every objective: it opens only when its control is lit.**

- Today, 3 of the first 10 chapters open on something impossible: the second
  course before the first is written, Elm Hall a year before it is affordable,
  and the move into a hall still building (B-1, B-9, B-10).
- With this rule, the wait-help variants can go (the chapter-2 wait text,
  `HALL_LOCKED_HELP`, `labRisingHelp`).
- Where waiting is the lesson, show the wait on the control: a cash fill on the
  greyed card, or the crane already there.
- **Net:** −3 help variants (≈ −90 words). No new surfaces; the build card's fill is
  a style.

**C3. Cut the four tab walks and their "Walk through…" objectives.** In silent
they are a title and Next ×3. With text on, the Treasury walk alone is 258 words
for one action, the worst ratio of year 1. Every Treasury, Students and Faculty
decision I made came from those screens' own labels.

- **Net:** −4 walks (≈ −340 words), −4 objectives. The chapters they sit in keep
  their real goals (staff every program, earn a surplus).

**C4. Let admissions teach itself, and protect it.** The admissions screen played
perfectly silent: the reveal, the dots, the hall filling, and money and mood moving
under the line. It is the game's best teaching surface.

- Cut the 6-tip coach, the handle hint, and the first-summer chapter's
  *about* + help.
- Keep "Lock the price" as the only lit control until it is pressed, as now.
- **Net:** −7 cards/lines, ≈ −320 words. The read-to-act ratio for the summer falls
  from about 97 to about 20.

**C5. Put the growth lever in the picture where the cap bites.**

- Enrollment growth is capped by class places, and places come from courses
  (+80 each). The player learns this only from the Seats chapter's words (B-7, B-12).
- Draw the admissions hall as rows by course, and label the next Develop "+80
  places". Then the cap and the lever are one picture, and the Seats chapter's
  *about* + help can go.
- Do the same for paths (B-4): with the path tool armed, light the network joined
  to Founders Hall, and cut the path help.
- **Net:** −2 abouts/helps (≈ −110 words). A visual change to two existing views;
  no new surface.

**C6. Drop the remaining year-1 chapter *about* paragraphs.** None was needed in
the silent run (≈ −275 words).

**Taken together (C1–C6):**

- Year-1 prose read by a careful newcomer falls from about 1,050 to roughly **350**.
- The year-1 read-to-act ratio falls from about 30 to about **10** words per action.
- Year 1 sheds 1 chapter, about 9 objectives, 4 walks and 1 coach.
- What stays: the objective lines, the blocker status lines, the price verdict,
  and the consequence rows. Silent, those were what carried the game.

## Evidence

Screenshots are in `img/` (uncompressed; `pngquant` was not installed):

- `b-skimmer-year2-stuck-on-turn.png` (B-2, B-8)
- `b-skimmer-admissions-no-room.png` (B-7)
- `b-map-tools-zoom-only.png` (B-3)
- `b-chapter2-nothing-to-develop.png` (B-1)
- `b-path-short-no-feedback.png` (B-4)
- `b-elm-hall-unaffordable.png` (B-9)
- `b-students-walk-silent.png` (B-6)
- `b-admissions-silent-works.png` (C4)
- `b-hall-full-at-admissions.png` (B-12)

Raw captures and profiles are in `unischool/node_modules/.tmp/rv/passB/`. The
per-step word captures are in the reviewer's scratchpad and are not committed.
