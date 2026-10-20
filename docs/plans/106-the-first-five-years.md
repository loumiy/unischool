# Plan 106 — The first five years

*Planning document only. No gameplay code is changed by this file. The
owner's brief (20 October 2026): "The critical fix is the first 5 years,
which we can make even more gradual." The game needs more explanation, but
that must not mean more reading and less creating. The model is Transport
Fever. It teaches by setting objectives, and each objective carries enough
information to guide even the most confused player to it. An experienced
player doesn't need the reading: they meet the same objective without
opening it. The NEXT bar becomes the tool for this, and it can be expanded
to explain a system in depth. A system introduced to the player is fully
explained: what it does, how to work it, and why it matters to the
others.*

**Status: In progress. PRs A–E landed (the model, the bar, the
walkthrough ported, years 1–3 and the gates); PR F (years 4–5) is up; the owner
answered §7's five questions on 20 October.**

---

## 0. In one paragraph

The walkthrough works: 11 of the 15 runs that met it finished it. Players get
lost after it ends. Between the end of step 7 (about week 5 of year 1) and
year 5, the game opens about fifteen systems. One opens with a letter; the
rest open with a toast, a "?" hint or nothing. The
one line of guidance left, the NEXT bar, is a single line that gets cut
off. It says what to do, never how or why, and it
disappears for good once the walk is skipped. This plan replaces the
walkthrough-then-silence pattern with **objectives** that run through
the first five years, one **chapter** per season. Each objective is one line
for the player who knows the game. Expanded, it is a full briefing:
**what, how, why**. Each system's tab or feature appears only when its
chapter begins.

---

## 1. What players were confused by

These were collected from the feedback form (6 replies, all read in full on
20 October), `docs/reviews/playtest-1/findings.md`, the owner's two
playthroughs, and both AI game reviews. Tags: **WN** = didn't know what to
do next, **HT** = didn't know how, **WHY** = didn't know why something was
or wasn't happening.

### 1a. Still open: what this plan must answer

| # | Who | When | System | What they said | Tag |
|---|---|---|---|---|---|
| 1 | F6 (form, 0.1.2) | Y5 | Prestige | "I've established a bunch of programs, a sports team, some clubs, why is my prestige continuing to plummet? … not entirely sure what it is that makes a 'good' score." | WHY |
| 2 | F6 | Y1–5 | Everything | "When you're first thrust into the game, it takes some time … to get acclimated to what the player is supposed to do." | WN |
| 3 | F2 (form, 0.1.1) | Y1–12 | Milestones / NEXT bar | "Although milestones and objectives are displayed in the bottom banner, I often struggled to understand what I was actually expected to do to achieve them. More explicit instructions or step-by-step guidance would have helped." | WN / HT |
| 4 | F2 | — | Athletics | "I was also unsure what I was supposed to do with athletics." | WHY |
| 5 | F2 | — | Research | "I found the research projects somewhat confusing. A clearer explanation of how these systems work, what their purpose is and how to interact with them." | HT |
| 6 | F2 | — | Faculty | The grades: fixed in 104G. Still open: "academic titles (assistant, associate, etc), nor how these attributes affect teaching, courses or student outcomes." | HT |
| 7 | F2 | Y1+ | Everything | "A more comprehensive introduction … gradually introducing its main mechanics … avoid missing important features simply because they weren't aware of them." | WN |
| 8 | D1 (Discord) | Y1, after step 4 | Opening text | "The next few screens were quite overwhelmingly text heavy." | WN |
| 9 | T1 (Twitch) | Y1+ | Clock / letters | Didn't see that time had stopped, or that a letter was waiting. Plan 104B is held for a second report. | WHY |
| 10 | T1 | Y1–3 summers | Admissions | Admitted 1% three summers running, went into debt and never connected the two. By the owner's decision, a careless choice is punished; the consequence was still never explained. | WHY |
| 11 | S1, F1 | Y1–3 | Hiring | "A search seemed to stop," as if out of money. The market is weak by design, but nothing says so. | WHY |
| 12 | S1 | Y1–2 | Money | "I don't like that I can only wait for the money." Partly answered by 104H ("part borrowed"). | WN |
| 13 | F3 (form) | Late | Athletics | "Is the amount of championships you can win in a year capped at 2?" | WHY |
| 14 | F1 (form) | — | Curriculum | Frustrated "waiting to add in more classes" (the committee's seats). | WHY |
| 15 | Review II B3-10 | Y1–3 | Faculty / Curriculum | "Why did searches double?" "Why is a course three times a program?" | WHY |

### 1b. Fixed already, kept as lessons

R2, T1, R9, R10/11 and S1 hit the opening (Plans 103 and 104). Review I's
A3-1 to A3-7 and review II's B3-1 to B3-9 were fixed by Plans 78 and 95. The
lessons for this plan:

- **Every gap after a guided stretch produced a "now what?"** (R2 after
  step 3, A3-4 in weeks 5–28, B3-9 with an idle committee). Guidance that
  stops leaves the player with nothing.
- **"Why is this number moving?" is the most common confusion of all**,
  about 14 reports. Plans 80C, 95N, 96 and 104I fixed it one number at a
  time. Nothing ever answered it in general.
- **The Plan 96 over-explaining pass cut "why" text** ("nobody on the
  market", the transit reasons), and players asked for "why" again
  (F2, F6, S1). Both were right. The text belongs a click away, not on the
  screen.

### 1c. The numbers (PostHog, last 60 days)

| Furthest year reached | Runs | Average minutes played |
|---|---|---|
| 1–2 | 8 | 5 |
| 3–5 | 9 | 14 |
| 6–10 | 9 | 29 |
| 11+ | 57 | 24* |

*Long runs on fast speeds. Of 83 runs, **17 (20%) ended within five years**.
Of the 15 runs that met the 0.1.2 walkthrough, 11 finished it, 2 skipped it
and 2 stopped partway. The sample is small, but it agrees with the written
feedback: the walkthrough holds, and the years after it don't.

---

## 2. The model: objectives, as Transport Fever does them

Transport Fever's campaign gives the player one mission at a time. A mission
is a short list of objectives with live progress ("Connect A and B: 0/1";
"Transport 200 passengers: 74/200"). Each carries a briefing that names the
tools, where they are and why the goal matters. The objective is the
teacher, and the briefing is there for those who want it. A veteran reads
the line, does it, and watches it tick.

The rules for Unischool:

1. **An objective is a goal, not an instruction.** "Seat all 350 students."
   It is not "Click Develop." It ticks itself the moment the state is true,
   in any order and by any route. If it is already true when it arrives, it
   is done before the player sees it.
2. **One line collapsed; a briefing expanded.** The collapsed line plus its
   live counter is all a veteran ever reads. The expanded panel holds the
   explanation, and it never interrupts the player.
3. **Every new system arrives as a chapter**, and its first expansion is
   the full briefing in three parts:
   - **What it is**: two or three sentences.
   - **How to work it**: the levers, each with a **Show me** button that
     opens the view and rings the control, as the coach's door buttons do
     today.
   - **Why it matters**: what it feeds and what feeds it, each a link to
     the system named.
4. **No clock holds after the founding.** Objectives guide; they don't
   stop time. The only exceptions are the opening's first steps and
   anything that already stops the clock (summer, interrupts).
5. **A system is hidden until its chapter.** Its tab, chip or menu tile
   appears when its chapter opens, not before, so a screen holds only what
   has been explained. (The tabs dimmed in Plan 104F and the Students tab
   held back in 104M already work this way.)
6. **Briefings are kept.** Each briefing read is filed in a **Guide**,
   which grows into the game's handbook. Each tab's header gets a "?" that
   opens that system's briefing. This replaces the scattered HelpHints
   over time.
7. **Answer "why" with live causes, not prose.** An objective about a
   number shows that number's top three pulls in its expansion, read from
   the systems that already compute them (StandingBreakdown, the
   satisfaction drag of 104I, the prestige target).

### 2a. The bar, collapsed and expanded

Today's bar is one line in the 26px log ticker, at most 52% of the strip,
cut off with an ellipsis, with no way to expand it (`LogTicker.tsx:91-102`,
`systems/guidance/nextStep.ts`).

**Collapsed** (the ticker strip, a little taller):

```
[ ◆ Chapter 3 · Elm Hall ]  Site Elm Hall and move a program in   1/2  ▴
```

**Expanded** (a drawer rising from the strip, about 420px wide and up to
55% of the height, with the map still live behind it):

```
CHAPTER 3 — A HALL OF ITS OWN                                  1 of 4 ▾
───────────────────────────────────────────────────────────────────────
OBJECTIVES
 ✓ Develop eight courses                                         8/8
 ▸ Site Elm Hall                                                  0/1   [Show me]
 ○ Move a program into Elm Hall
 ○ Give Elm Hall three programs of one school                    0/3

WHAT IT IS
 Founders Hall has six program slots, and each academic hall adds six
 more. When three programs of one school share a hall, that school
 claims the hall and gives it its name …

HOW
 · Build menu › Academic › Elm Hall                              [Show me]
 · Move a program: its hall panel › Move (4 weeks out of Founders) [Show me]

WHY IT MATTERS
 → Schools: six programs found a school, which opens Labs and a Dean
 → Seats: a free slot in Founders Hall can become an Office

ALSO WAITING (2)
 ! History is dark: staff it                                    [Go]
 · Idle cash counts for nothing: set a sweep                     [Go]
```

- **Two layers.** *Objectives* are the teaching, are planned, and last.
  *Also waiting* is today's NEXT chain, reactive and urgent. The collapsed
  line shows an urgent advisory first (a dark program, the board) and
  otherwise the objective. Nothing in `nextStep.ts` is lost; it moves down
  one level.
- **A new chapter opens the drawer once** by itself, onto its briefing.
  After that it opens only when clicked. A setting, **Objectives: Guided /
  Brief / Off**, keeps the drawer shut (Brief) or hides the bar's
  objective layer entirely (Off).
- **Hotkey:** `J` (journal) toggles the drawer.

---

## 3. Every system: when it opens, and when it should

"Today" is the current build (0.1.2 plus main). Week numbers on the
player's path are estimates from code constants and Plan 103's
measurements; the sim wasn't run for this plan.

| # | System | Today: when it opens / how it's introduced | Proposed chapter | Proposed objective(s) | Why it matters (the briefing's links) |
|---|---|---|---|---|---|
| 1 | **Building and placing** | Wk 1, coach step 1 | **1. Founding** (Y1 wk 1) | Raise Founders Hall | Every capacity: seats, beds, meals |
| 2 | **Programs and offers** | Wk 1, coach steps 2–3. One offer can be declined a year; nothing says so | **1. Founding** | Found the first program | Courses, seats, schools |
| 3 | **Faculty appointment** | Wk 1, coach step 2 | **1. Founding** (appoint only) | Appoint its professor | Teaching grades, darkness |
| 4 | **Courses and the committee** | Coach steps 3–4. The committee lamps carry no words | **2. Seats for everyone** (Y1 wk 5–26) | Develop a second course; keep the committee busy (4/4 lamps); places for 350 of 350 | Seats → crowding → prestige; a busy committee is the pace of growth |
| 5 | **Seating and crowding** | NEXT seating line from wk 5 | **2. Seats for everyone** | Places for all 350 students | The prestige target pays for crowding at the summer |
| 6 | **Housing and dining (needs)** | Coach steps 5–7 at wk 5, *together with* step 4 | **3. Somewhere to sleep** (Y1 Spring, about wk 20) | Site a residence hall; site a dining hall. *No need is shown as a number in year 1 (§7.1)* | Needs → satisfaction → word of mouth → applicants |
| 7 | **The clock and speed** | Not taught. T1 missed the pause | **2.** (one line) | Run the clock at 2× | Letters and interrupts stop it; the Provost unlocks 4× |
| 8 | **Inbox and letters** | Letters are modal; ladder letters are toasts in Y1 | **2.** (one line) | Read the board's letter | Matters left open default after 4 weeks |
| 9 | **Treasury: cash and running costs** | Funds chip; "?" hints only | **4. Paying for it** (Y1 wk 36–44) | Open the Treasury; keep a year of costs in hand; see what a loan costs | Salaries and upkeep are weekly; buildings cost up front; distress freezes building |
| 10 | **Admissions and price (summer)** | "Summer is coming" letter at wk 48, then the beat | **5. The first summer** (Y1 wk 48–52) | Set this class's price and admit rate | Price locks for four years → revenue; admit rate → enrollment → crowding and quality. *T1's lesson goes here, said before the choice, not after* |
| 11 | **Year in review and the report card** | Summer beat; first grade at Y1 summer | **5. The first summer** | Read the report card | The grade is the prestige target's verdict |
| 12 | **Prestige** | Chip from wk 1; tooltip only | **6. Standing** (Y2 wk 1–13) | Raise prestige's target above its value | Prestige → applicants, committee seats (70/80/90/100), rank. *F6's "why does it plummet" is answered here, with live pulls* |
| 13 | **Satisfaction and the Students tab** | Tab and chip open at first commencement (104M); no briefing | **6. Standing** | Satisfaction above 60 | Applicants by word of mouth; satisfaction under 60 brings demands from Y3 |
| 14 | **Faculty market, searches, ranks, growth** | "?" hints. Ranks unexplained (F2); the search price and a weak market unexplained (S1, F1) | **7. A faculty** (Y2 wk 14–26) | Post a search; appoint a B-grade or better; read a professor's page | Grade → course quality → prestige's academic pillar; ranks → salary and growth; why searches cost more each time |
| 15 | **Dark programs and restaffing** | NEXT urgent line when it happens | **7. A faculty** (in its briefing), then as an advisory | — | An unstaffed course darkens its whole program: lost seats |
| 16 | **Academic halls and moving** | Letters `a-hall-of-its-own` / `moving-in`; NEXT | **8. A hall of its own** (Y2 Spring, at 8 courses) | Site Elm Hall; move a program in; three of one school | Claiming → schools → labs and Deans; frees Founders Hall slots |
| 17 | **Schools (establishing)** | NEXT "Establish {School} (n of 6)" | **8.** (as its long objective, carried into the later years) | Establish a school: 6/6 | Labs, Research, the charter, Deans: research starts here |
| 18 | **Clubs and student life** | Milestone letter at the 4th program (Student Center); petitions in the summer beat | **9. Campus life** (Y3 Fall) | Build the Student Center; approve a club at summer | Social need, identity tags, the first sport club → Athletics |
| 19 | **Decision events and the inbox catalogue** | Start in Y3 with no introduction (A3-3 found them defaulting unseen) | **9. Campus life** | Answer a matter before it lapses | Matters left open default after 4 weeks; Deans can answer them later |
| 20 | **Demands** | Y3+, when satisfaction is under 60; inbox | **9.** (in the satisfaction briefing; shown only when one arrives) | Meet a demand | — |
| 21 | **Promises** | Offers from the Y3 summer; "?" hint | **10. Promises** (Y3 summer) | Accept one promise | The Final Report; prestige at judging |
| 22 | **Athletics** | Tab at the first sport club; milestone letter; "?" hints. F2 and F3 confused | **11. The teams** (Y4 Fall, or at the first club) | Hire an athletic director; set the priority list; play a season | Athletics pillar, gate revenue, alumni warmth; the season calendar; why the postseason favours established powers (F3) |
| 23 | **Administration offices** | Milestone letter "Room to spare" | **12. Running the college** (Y4 Spring) | Open an office in Founders Hall | Each office's bonus |
| 24 | **Delegation seats and speed** | Panel at the foot of Faculty; "?" hint; a locked-speed note | **12. Running the college** | Appoint a Provost | 4× speed; seats answer matters by policy |
| 25 | **Endowment and the sweep** | Board idle-cash letter; NEXT sweep line | **13. The long game** (Y5 Fall) | Set a standing sweep | Payout funds operations; the financial pillar |
| 26 | **Rankings, rivals and pillars** | Rank chip from wk 1; rankings page at the first top 50 | **13. The long game** | Read the rankings; pick a pillar to lead | Rank → specialization at the top 30; the four pillars are the report card's columns |
| 27 | **Ladder milestones** | "Milestone" chip and LadderPanel; F2 read it as objectives | **Folded into the bar (§7.4).** The ticker's "Milestone" chip goes; a milestone reached shows as an "Unlocked: Student Center" line under the current chapter, and the LadderPanel opens from the drawer. Milestones are not presented as goals | — | — |
| 28 | **Estate, maintenance and beauty** | Only a "?" hint in the Estate panel | **13. The long game**, or when the backlog first bites | Keep the estate's funding share at its need | Beauty → applicants; condition → upkeep cost |
| 29 | **Alumni and campaigns** | "?" hints after the first commencement | **Later: Y6–8**, at the first VP of Advancement | Run a campaign | Gifts, named funds, endowment |
| 30 | **Research, labs and the charter** | Letter `the-laboratories` at the first founded school (about Y9–10) | **Later, at the first school** | Commission an initiative; take the charter | Research pillar, scholars, the University name. *F2's research confusion is answered here* |
| 31 | **Identity tags (guidebook)** | Students › guidebook; "?" hint | **Later**, the first tag earned | — (a briefing only) | Beauty, giving, attrition |
| 32 | **Capital projects and graduate schools** | Build menu from Y10; letters | **Later, Y10** | Begin a capital project | Pillars, prestige |
| 33 | **Specialization and speed-ups** | Board letter, then the choice page (top 30, or top 10 in a pillar from Y20) | **Later**, with a warning objective about five years ahead ("Reach the top 30: 41st") | — | Terms per pillar; the Research Park etc. |
| 34 | **Distress ladder** | Board letters when it happens | **Briefing in chapter 4**; an advisory when it happens | — | Freeze halts construction |
| 35 | **History and chronicle** | Opens at commencement | **6. Standing** (one line: where the report cards are kept) | — | — |

---

## 4. The first five years, chapter by chapter

The principle: **at most one new system per season**, and no tab appears
before its chapter. The seasons are Fall (weeks 1–26), Spring (27–51) and
Summer (week 52). A chapter opens when the one before it is done **and**
its earliest date has come. Earlier chapters are the bottleneck; dates only
keep a fast player from being flooded. **There is no latest date** (§7.3):
a slow player meets each system when they finish the chapter before it,
however many years that takes. Finishing a chapter earns nothing but what
it opens (§7.2).

| Year · season | Chapter | New on screen | Objectives (✓ ticks itself) |
|---|---|---|---|
| **Y1 Fall, wk 1** | **1. Founding** (today's steps 1–3, clock held) | Build menu, Founders Hall panel | Raise Founders Hall · Choose and staff the first program · Found it |
| **Y1 Fall, wk 5–26** | **2. Seats for everyone** (today's step 4 and the seating NEXT line, as one chapter) | Curriculum tab; the clock controls taught; committee lamps named | Develop a second course · Keep the committee busy (n/4) · Places for 350/350 · Run the clock at 2× |
| **Y1 Spring, wk 27–44** | **3. Somewhere to sleep** (today's steps 5–7, *moved later*: by then the seating is in hand and the money is visible) | Nothing new: the needs stay hidden until commencement, per 104M (§7.1). The briefing says in words that students need beds and meals, never a value | Site a residence hall · Site a dining hall |
| **Y1 Spring, wk 36–47** | **4. Paying for it** | Treasury's briefing; distress rungs explained | Open the Treasury · Weeks of costs in hand ≥ 26 · (optional) see what a loan would buy |
| **Y1 Summer, wk 48–52** | **5. The first summer** | Admissions and the report card explained *before* the beat | Set the price and admit rate · Read the report card. *The briefing explains what a low admit rate costs (enrollment, revenue, debt) before the beat; no warning at the choice itself (§7.5)* |
| **Y2 Fall, wk 1–13** | **6. Standing** | Students tab and satisfaction chip (already opened here); History record | Satisfaction ≥ 60 · Prestige's target above its value (the pulls listed live) |
| **Y2 Fall, wk 14–26** | **7. A faculty** | Faculty briefing: grades, ranks, searches, the market | Post a search · Appoint a B or better · Every program staffed |
| **Y2 Spring** (at 8 courses) | **8. A hall of its own** | Academic halls; schools | Site Elm Hall · Move a program in · Three of one school · *Long:* Establish a school 0/6 |
| **Y3 Fall** | **9. Campus life** | Student Center, clubs, the inbox's matters, demands | Build the Student Center · Answer a matter · Approve a club (at summer) |
| **Y3 Summer** | **10. Promises** | Promises in the Review | Accept a promise |
| **Y4 Fall** | **11. The teams** | Athletics tab (now opened by the chapter, not by the club alone) | Hire an athletic director · Set the priority list · Play a season |
| **Y4 Spring** | **12. Running the college** | Offices; the Administration panel; speed locks | Open an office · Appoint a Provost |
| **Y5** | **13. The long game** | Rankings, pillars, endowment, estate | Set a standing sweep · Lead the field in one pillar · Estate funded at need · *Long:* Establish a school |
| **Y5 Summer** | (the feedback prompt, as today) | — | — |

**What changes in pacing, not just in words:**

- **Year 1 is split.** Today steps 4–7 all come at about week 5 with the
  clock held: a course, a dorm and a dining hall in one sitting. D1 called
  this "overwhelmingly text heavy". Housing and dining move to the Spring,
  as their own chapter. *Check with the sim:* does a later dorm cost too
  much satisfaction before the first summer? If so, set the chapter's
  earliest date by Housing's value (say, when it falls under 30), not by
  the week. The trigger is internal; the player still sees no number.
- **Decision events and demands start in Y3 today.** This plan holds them
  until chapter 9 has opened, so a fast player gets them on time and a
  slow player gets them late, never before the inbox is explained.
- **The Athletics tab waits for chapter 11** even if a club forms earlier.
  The club plays on; the tab and its levers appear with their briefing.
- **Nothing is removed for a player who skips.** "Skip the walkthrough"
  becomes "Objectives: Brief". The chapters still open and still gate their
  tabs, but the drawer never opens by itself. Off shows everything from
  the start, as an expert mode.

---

## 5. Writing a briefing

The template every chapter's briefing follows, kept short by rule:

- **What it is**: at most 3 sentences.
- **How**: at most 4 levers, each a line with a **Show me** button.
- **Why it matters**: 2–4 links, each "→ System: one clause".
- **Live**: when the chapter is about a number, its current value and its
  top three pulls. Nothing to write; it is read from state.

Two rules for the sentences themselves (the owner, 20 October):

- **Say what a number adds to.** "Academic halls hold more" can be read
  as more than six programs in one hall; "each academic hall adds six
  more" can't.
- **Don't end a sentence on a passive and a pronoun.** "A hall … is
  claimed by it" makes the reader search back for "it". Name the actor
  and put it first: "that school claims the hall". The authored data
  does this in many places; new text avoids it, and old text is fixed
  when it is touched.

Example, chapter 6 (Standing), which answers F6:

> **What it is.** Prestige is the college's name in the world. Each week it
> drifts toward a *target*, and the target is set by what you've built:
> teaching, research, student life, athletics, size and crowding. It
> moves slowly, so this year's choices show up over two or three years.
>
> **How.** You don't set prestige; you raise its target. Find the biggest
> drag below and fix it. [Show me: the prestige page]
>
> **Why it matters.** → Admissions: more applicants, and better ones. →
> Curriculum: a committee seat at 70, 80, 90 and 100. → Rankings: your
> place in the field.
>
> **Live.** Prestige 44.5, target 41.0 ▼. Pulls: crowding −6.2 (places for
> 410 of 520) · teaching −3.1 (two C-grade courses) · student life +1.4.

---

## 6. The roadmap, as PRs

| PR | What | Depends on |
|---|---|---|
| **A** | The objective model: `Chapter {id, opensAfter, earliest, briefing, objectives[]}`, `Objective {id, text, progress(s): {n, of} \| boolean}`; state `s.guidance.chapters` (opened, done, briefingRead). Ticks in `settleOpening`'s place, every TICK. Save migration (an old save marks every chapter whose objectives are already true as done). | — |
| **B** | The bar: the collapsed line with chapter chip and counter; the drawer; Show me (reusing the coach's door and ring code); "Also waiting" from `nextStep.ts`; milestones as "Unlocked: …" lines, the ticker's Milestone chip removed; the setting; the `J` hotkey. | A |
| **C** | Port the walkthrough: chapters 1–3 replace `OPENING_STEPS`. Founding keeps its held clock and the dimmed tabs. `opening_step` analytics now report chapters. | A, B |
| **D** | Year 1: chapters 4–5. Move housing and dining to the Spring and tune it with the sim (`sim/harness/guided.ts` follows objectives instead of the coach). | C |
| **E** | Years 2–3: chapters 6–10. Gate decision events, demands and promises on their chapters, and add the live-pulls readout for prestige and satisfaction. | D |
| **F** | Years 4–5: chapters 11–13; the Athletics tab gated on its chapter. | E |
| **G** | The Guide: every briefing read, filed by system; "?" in each tab header opens its briefing; begin retiring HelpHints that a briefing now covers. | B |
| **H** | Later chapters: research, alumni, capital projects, specialization (with the five-year warning). | F |
| **I** | Measure: `chapter_opened`, `chapter_done` and `briefing_opened` events; compare the runs that end in Y1–5 (20% today) and the form's "didn't know what to do" answers before and after. | B |

**As implemented (PR A):**
- The model lives in `state/chapters.ts`, beside `state/opening.ts`, because
  its readings look at the map. The words are in `data/chapterData.ts`.
- `GameState.guidance` is optional, so there is no save version bump. A
  save from before it is caught up **by date**, not by what is true now:
  every chapter whose earliest week has passed is done. Reading the state
  instead would stall a late-game run on a transient figure, such as
  places for every student.
- PR A defines chapters 1–3 only, as readings with no UI and no gating.
  The chapters keep their own record and change nothing else until PR B
  shows them and PR C retires the coach's steps.
- "Keep the committee busy (n/4)" is left out of chapter 2. A year-one
  college can't always afford four courses at once, so it moves to the
  briefing.
- "Run the clock at 2×" is an *optional* objective, met by a new
  `MARK_GUIDANCE` action. The college's state doesn't record the speed, and
  a headless player never sets it.

**As implemented (PR B):**
- The drawer is a `ToolbarPopup` above the ticker, like the log and the
  milestones, rather than a new kind of panel. It shares their corner and
  their Escape ladder.
- "Also waiting" lists only the one NEXT line, because `nextStep.ts`
  returns a single step. A list of every advisory waits on a later need.
- The chapter chip and drawer stay hidden while the walkthrough's card is
  up, because chapters 1–2 and the card's steps cover the same ground
  until PR C merges them. They are also hidden in a sandbox.
- Guided opens the drawer by itself only for a chapter **with a briefing**.
  None has one yet, so in practice nothing opens unasked until PR C writes
  them.
- Showing a chapter in the drawer marks its briefing read (`read:<id>`
  through `MARK_GUIDANCE`). Double speed set from the clock marks chapter
  2's optional objective.

**As implemented (PR C):**
- The walkthrough ends on the first program founded. Its three steps keep
  the held clock, the quiet screen and the coach card, and chapter 1 is
  their record. Plan 103's steps 4–7 are retired: a save on one moves on
  to `play`.
- **Year 1 is reordered, by the owner's choice (20 October).** The sim put
  a price on moving housing to the Spring. With the first residence hall
  and dining hall sited in week 5, the first summer drew 616 applicants at
  prestige 38.4. In week 27 it drew 545 at 35.0: about 3 applicants and
  0.15 prestige per week of delay. The owner chose **week 10**. The
  chapters are now:
  - 1. Founding;
  - 2. The next course: a program's second course, plus the optional
    double speed;
  - 3. Somewhere to sleep: from week 10;
  - 4. Seats for everyone: often met before it opens, so it opens met.
  - §4's later chapters move up one.
- A walk that ends on its program founded counts the "Somewhere to sleep"
  letter read, as reaching the old needs step did. A walk skipped earlier
  keeps it at week 9.
- The rings follow the chapters, not the walk's stages (`ringedProgram`,
  `ringedBuilding`). The Curriculum rings the next course while chapter 2
  waits on it, and the build menu opens on and rings the next residence
  hall, then dining hall, during chapter 3.
- Briefings are written for chapters 2–4, which Guided opens by itself the
  first time each is current. `test/chapters.test.ts` holds them to §5's
  limits and to the no-pronoun-ending rule.
- The NEXT line is unchanged. In year 1 it still names a need's figure
  when nothing else is asked, as it has since Plan 78B. That reaches a
  guided player only once every student is seated, by which time chapter
  3's buildings stand.

**As implemented (PR D):**
- Year 1 ends with two more chapters, so it has six in all:
  - **5. Paying for it**, from week 30. Required: open the Treasury,
    marked by the shell as `tab:treasury`. Optional: take in more each
    week than the college spends.
  - **6. The first summer**, from week 46. Done when the summer closes.
- The surplus is optional so that a college in deficit still reaches the
  first-summer chapter, which explains where the income comes from.
- "Read the report card" is dropped as an objective, because the summer's
  Review beat shows the report card anyway. The briefing says what it
  grades.
- §7.5 holds: chapter 6's briefing says what a small class costs (four
  years of short income) before the beat. The admit-rate slider gives no
  warning.
- From here the plan's chapter numbers run two ahead of §4's table: its
  "6. Standing" is chapter 8, and so on.

**As implemented (PR E):**
- Years 2–3 are five chapters:
  - **7. Standing** (Y2 wk 1). Required: open Students and open History.
    Optional: satisfaction at 60, and prestige's target above prestige. Its
    drawer reads live: prestige against its target, each pillar's points
    against its most, what is taken off, and the need dragging satisfaction
    (rule 7).
  - **8. A faculty** (Y2 wk 14). Required: post a search, and every program
    staffed. Optional: a professor teaching at B or better. Its briefing
    answers F2: the rank beside a name only reads the average of teaching
    and research.
  - **9. A hall of its own** (Y2 wk 27, and only once an academic hall can
    be built: `opensWhen`). Required: site it and move a program in.
    Optional: a school claims it.
  - **10. Campus life** (Y3 wk 1). Required: the Student Center sited.
    Optional: a club approved, and a matter answered.
  - **11. Promises** (Y3 wk 46). Required: the third summer. Optional: a
    promise made.
- **The gates** (`systems/guidance/gates.ts`) apply only to a run founded
  guided (`guidance.gated`):
  - decision events, the inbox's catalogue matters and the students'
    demands wait for "Campus life";
  - promise offers wait for "Promises".
- What no gate holds:
  - headless foundings, so the sims are unchanged;
  - saves from before the gates, and sandboxes;
  - a run whose player set Objectives to Off. The shell marks that in the
    record (`objectives-off`), so the gates stay open for that college even
    if the chapters are turned back on.
- Outcome figures (satisfaction 60, a rising prestige target) are optional
  goals with a count, never requirements. A stuck figure must not hold back
  the chapters, and with them the systems.
- Writing the briefings corrected §5's sample. Prestige's target blends
  four pillars, weighted academics 41, research and student life 29.5
  each, athletics 18, plus the endowment (4), less crowding (up to 25) and
  run-down buildings (up to 4). The live readout lists each pillar's points
  against that most, which is what "a good score" means (F6). It doesn't
  rank "most to gain": that list would put research first in year 2,
  before research can exist.

**As implemented (PR F):**
- Years 4–5 are three chapters:
  - **The teams** (Y4 wk 1, once a sport club has formed). Required: an
    athletic director. Optional: a varsity team. Its briefing answers F2
    ("unsure what athletics was for") and F3 (the postseason's old powers).
  - **Running the college** (Y4 wk 27). Required: a Provost. Optional: an
    office in Founders Hall.
  - **The long game** (Y5 wk 1). Required: a standing sweep. Optional: the
    buildings' full upkeep, and a school founded.
- **The teams is a side chapter** (`side: true`). It waits only for its
  week and its sport club, and nothing waits for it, so a college that
  never takes up athletics still reaches the chapters after it.
  - The drawer shows it when it is open.
  - "What opens next" never names it.
- The Athletics tab waits for "The teams" in a guided run (`tabAvailable`,
  gates.ts), in addition to the ladder's sport-club milestone.
- §3's later chapters (research, alumni, capital projects, the
  specialization) are left for PR H; PR G is the Guide.

Each PR reruns the guided and natural sim players (Plans 58 and 65) to
check that the pacing in §4 holds.

---

## 7. The owner's answers (20 October 2026)

1. **Satisfaction in year 1: keep it hidden.** 104M stands. Chapter 3
   asks for a residence hall and a dining hall and explains why in words;
   no need is shown as a number before the first commencement. Chapter 6
   (Y2) is where needs and satisfaction are first shown and explained.
2. **Rewards: none.** A chapter's reward is what it opens.
3. **Slow players: let it be slow.** No date forces a chapter open. A
   player who hasn't finished chapter 8 doesn't see decision events,
   demands or athletics, whatever the year.
4. **Milestones: fold them into the bar.** The ticker's Milestone chip is
   removed; milestones show as "Unlocked: …" lines in the drawer (PR B).
5. **Admissions: explanation only.** The 14 October rule stands: a
   careless admit rate is punished. Chapter 5's briefing explains the cost
   before the first summer's beat. No warning at the choice itself.

---

## Appendix: doc drift found on the way

- `docs/design/progression.md:45` says Students opens at week 1. The code
  opens it at commencement (104M).
- The same table says "regional" opens the Student Union and Grand Quad.
  The code opens `REC-T2` and the Chapel (`ladderData.ts:197`).
- `docs/architecture/interrupts.md` says the needs step opens Students and
  rings Housing and Dining. It now opens no tab (`App.tsx:345`).
- The same doc gives the specialization at the top 20. The code uses 30.
