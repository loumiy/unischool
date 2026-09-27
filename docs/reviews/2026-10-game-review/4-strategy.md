# 4. Strategy

Plan 73, area 4. Commit read: `58fa3fd`.

**Method.** Seven goal-directed players (`tools/review/goalPlayers.ts`, `npm run review:goals`) played the real reducer to year 50. Each goal was run on five seeds (12345, 4242, 777, 31337, 2026) with two college names (Blackmoor, Saint Aldric): 70 games in all. Each player:
- adapts by rules to what its college is doing;
- logs a reason for every decision;
- logs every time it wanted a lever the game doesn't have (a **want**).

The full tables are in [`4a-goal-players.md`](4a-goal-players.md). Two stretches were then checked by hand in the browser:
- a first decade, the new-player session of area 3;
- a late game, the year-25 scenario save.

The aim was to see whether the logged pain points are real on screen.

**The limits.** A goal player is a policy, not a person. It never gets bored, never misreads a screen, and does exactly what its rules say. "Tedious" is measured by what a run asks for: idle weeks, answer-only weeks, and the same action repeated more than ten times in a year. "Too easy" is measured by how early the goal is met and what pushes back afterwards. **The reviewer's judgment** is labelled where it goes beyond the numbers.

## The seven at year 50

Medians over ten runs each:

| Goal | Rank | Prestige | Students | Satisfaction | Net a week | Endowment | Courses | Schools | Placeables | Titles | Final Report | Wants |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| Revenue | 25 | 108 | 6,480 | 65 | $3.9M | $518M | 81 | 7 | 33 | 0 | C ×10 | see demand before pricing |
| Prestige | **1** | 144 | 33,040 | 86 | $1.7M | $116M | 374 | 7 | 52 | 0 | B ×6, C ×4 | train the faculty |
| Satisfaction | 26 | 103 | 2,681 | 88 | $71k | $18M | 98 | 2 | 16 | 0 | **D ×10** | shrink the student body; raise academic |
| Every asset | **1** | 143 | 34,480 | 86 | $1.3M | $63M | 378 | 7 | 78 | 4 | B ×10 | build what is locked |
| Championships | 8 | 133 | 25,760 | 86 | $1.7M | $68M | 322 | 7 | 44 | **27** | C ×10 | found a team; recruit athletes; disband a program |
| Good then big | **1** | 144 | 32,320 | 85 | $1.7M | $107M | 374 | 7 | 58 | 1 | B ×10 | stay small on purpose; train the faculty |
| Big then good | **1** | 147 | 33,840 | 84 | $4.0M | $3.0B | 374 | 7 | 56 | 2 | B ×8, A ×2 | train the faculty; more seats now; shrink the student body |

Every goal reaches the top 50 by year 7–9 and the top 25 by year 15–19.

| Goal | First place |
|---|---|
| Prestige | year 38 (10 of 10 runs) |
| Every asset | year 36 (10 of 10 runs) |
| Good then big | year 38 (10 of 10 runs) |
| Big then good | year 39 (10 of 10 runs) |
| Championships | year 39 (4 of 10 runs) |
| Revenue, Satisfaction | never |

## Goal by goal

### Revenue: the most money

- **Outcome.** Rank 25, prestige 108, 6,480 students, $3.9M a week and a $518M endowment. Every run is graded C, and titled "an old-money college that never won a game that mattered".
- **Curve.** Net income climbs to $1.8M a week by year 10, then grows slowly. Enrolment stays near 4,300 from year 10 to year 30. Prestige peaks at 111 in year 30 and slips. Rank falls from 13 to 27 after year 30, as the rivals climb past a college that has stopped building.
- **Pain.** One want, in all ten runs from year 26: *see demand before pricing*. The price is set blind in the summer ("What will you charge next year? You will see who it drew once it is set", seen on screen in area 3). The only experiment is a year long.
- **Easy.** Money is never short. After year 10 the college has more than it can spend on anything that pays.
- **Tedium.** 412–458 of every 520 weeks are idle, 79–88%. The one repeated action is `research-deep`: 328 initiatives for their grants, more than ten a year in four years.
- **Reviewer's judgment.** A coherent strategy with too little to do. The game offers no revenue levers beyond price, admissions, the endowment draw and research grants, and all four are set-and-forget.

### Prestige: the highest standing

- **Outcome.** First place by year 38 in every run. Prestige 144, 33,040 students, 374 courses.
- **Curve.** Slow for twenty years (rank 20 at year 20), then fast: rank 9 at year 30 and 1 at year 40. Prestige moves at most 2.1 points a summer toward its grade (History › Standing).
- **Pain.** *Train the faculty*, in all ten runs, from year 21, felt for a median of 890 weeks. The teaching standard (the share of courses graded A) caps the prestige target, here at 141. The only way to raise it is to hire better teachers and let weaker ones go. There is no training, sabbatical or mentoring for the professors on the roster.
- **Easy.** Once first, nothing pushes back. The rank holds to year 50 in every run.
- **Tedium.** `tend-teaching`, putting a better instructor on a course, 405 times. `develop-course` 381 times. Both ran more than ten times a year in 14–15 of the 50 years. The idle share falls to 47–56% in years 11–30, the busiest decades of any goal.
- **Checked by hand (year 25).** History › Standing says "82% of courses graded A: standing can reach 145… It is holding the target down now." The Curriculum's "Needs attention" filter finds 0 courses, because it lists only D and F grades (`CurriculumTab.tsx:987`). No filter or sort finds the B and C courses holding the target down among 394 cards.

### Satisfaction: the happiest students

- **Outcome.** Satisfaction 88, the highest, with every need at 90 by year 10. But it is still a "College" at year 50: no research lab, so never chartered (area 3). Rank 26, 2,681 students, two schools. Graded **D in all ten runs**.
- **Pain.** *Shrink the student body*, in all ten runs from year 8. Even the smallest class leaves a need short, and nothing but graduation shrinks the body. *Raise academic*, from year 15. Academic satisfaction is at 88, and nothing on the build menu serves it once the chain is built.
- **Easy.** Satisfaction itself. The goal is met in year 4 and held for 46 years.
- **Tedium.** The idlest goal: 437–469 of 520 weeks idle (84–90%) in every decade.
- **Reviewer's judgment.** The game lets a player make the happiest college in the country and then grades it D. The report's six axes don't include satisfaction, and they punish being small (see A4-4).

### Every campus asset

- **Outcome.** Every buildable standing by year 45, in 8 of 10 runs. 78 placeables, first place by year 36, graded B.
- **Pain.** *Build what is locked*, from year 25. Everything on the menu stands and seven assets are still gated, the towers among them, by enrolment, prestige or a school.
- **Easy.** Money: the goal borrows when it must, and never needs to by year 20.
- **Tedium.** `tend-teaching` 511 times and `develop-course` 401 times. More than ten a year in 21 and 19 years. `research-cheap` 194 times: the Research Park waits on every lab having seen an initiative through. The most modals of any goal: 272, including 85 milestone notes and 93 decision events.
- **Converges with prestige.** Distance 0.08 on the divergence table.

### Championships

- **Outcome.** 27 national titles, the only goal that wins many. Rank 8, prestige 133. Still a "College" in all ten runs, because athletics doesn't lead to research, graded C.
- **Pain.** Three wants, in all ten runs:
  - *found a team* (from year 4). A varsity team can only come from a student sport club that is three years old and petitions in the summer. There is no way to start one.
  - *recruit athletes* (year 5). Every chair is filled and the budget is at its top. There is no recruiting, scholarship or scheduling lever.
  - *disband a program* (year 33). A team that has missed the postseason five times can't be cut.
- **Tedium.** `replace-coach` 152 times: the market keeps listing coaches fifteen points better. `team-order` 102 times.
- **Reviewer's judgment.** Athletics is a real strategy with too few levers. Coaches, the budget and the team order are all a player can touch. Separately, the Final Report's athletics axis can't reach A for anyone (area 7).

### Good then big

A small, excellent college for twenty years, then growth.

- **Outcome.** First place by year 38, prestige 144, graded B. The same college as the prestige goal (distance 0.07).
- **Pain.** *Stay small on purpose*, from year 9. With twelve programs the offers keep coming, and the only way to stay small is to ignore them. The game has no "we are a small college" choice. *Train the faculty* came up in 8 of 10 runs.
- **What happened to "good first".** At year 20 it had 7,280 students against 20,640 for big-then-good, at the same prestige (95 against 94). Staying small bought no prestige lead, because breadth (programs established, schools distinguished) is the heaviest input to the grade, and breadth needs size.

### Big then good

Growth as fast as money allows, then quality.

- **Outcome.** First place by year 39. Prestige 147, the highest. A $3.0B endowment, and graded B ×8 and A ×2, the only A's. Titled "a jock school that never opened its doors very wide", for the biggest college in the game (A4-4).
- **Pain.** *Train the faculty* (felt 1,385 weeks, the longest). *More seats now* (from year 3): the committee's seats, the faculty market and the hall slots cap growth, not money. *Shrink the student body* came up in 5 of 10 runs.
- **Tedium.** The busiest year of any goal: in the median run's busiest year, 99 `tend-teaching` actions.

## Do the goals make different colleges?

Each college at year 50 was reduced to eight features, each scaled 0–1: students, prestige, satisfaction, courses, teams, placeables, price ratio and research. The table gives the distance between two goals' medians: 0 is the same college, 1 very different.

| | Revenue | Prestige | Satisfaction | Assets | Champ. | Good→big | Big→good |
|---|---:|---:|---:|---:|---:|---:|---:|
| Revenue | 0 | 0.58 | 0.33 | 0.61 | 0.56 | 0.57 | 0.59 |
| Prestige | | 0 | 0.62 | **0.08** | 0.25 | **0.07** | **0.10** |
| Satisfaction | | | 0 | 0.65 | 0.50 | 0.59 | 0.67 |
| Assets | | | | 0 | 0.27 | **0.09** | **0.12** |
| Championships | | | | | 0 | 0.19 | 0.34 |
| Good then big | | | | | | 0 | 0.16 |

**No, not for four of the seven.** Prestige, every asset, good-then-big and big-then-good all end as the same college:
- first place;
- prestige about 145;
- about 33,000 students;
- all 374 courses;
- seven schools;
- twenty teams.

Championships lands near them. The two that diverge, revenue and satisfaction, do so by *stopping*: they don't grow, and the Final Report grades them C and D.

The paths differ in order, not destination. First place arrives in years 36–39 whatever the path. **The reviewer's judgment:** this is the game's central strategic weakness. The dominant strategy is "do everything", and doing everything is reachable.

## Findings

### A4-1. One college at the end of every ambitious path — major, L

**What.** Four of seven goals converge (table above). The destination is fixed because:
- breadth, the heaviest input to the grade (50 of the 221 points on offer), needs every program;
- concentration needs every school;
- the teaching standard caps everything.

Money stops mattering by mid-game. The Natural player holds $13.4B in cash at year 51, and big-then-good a $3.0B endowment. So nothing forces a choice between breadth, research, athletics and size.

**Why it matters.** A management game's replay value is the choices that exclude each other. Here the ambitious player never has to give anything up.

**Fix.** A plan-sized design question for the owner (L). Three directions:
- **Scarcity that lasts.** Limit schools by hall land or charter slots, so a college can be great at four schools, not seven.
- **Identity that pays.** Make identity tags weigh the grade toward what the college chose. A research powerhouse would be graded on research, and a teaching college on teaching.
- **An ending that reads the path.** Make the Final Report grade the college against its own tags (A4-4), so revenue and satisfaction are real ways to win.

### A4-2. The teaching standard is the late game, and its only lever is manual — major, M

**What.**
- The share of A courses caps the prestige target for every ambitious goal: at 141 for prestige, 143 for good-then-big and 115 for big-then-good.
- *Train the faculty* was wanted in 28 of 30 runs of those goals, and felt for up to 1,385 weeks.
- The only lever is `tend-teaching`: 334–557 swaps a run, more than ten a year in 11–21 years, and 99 in the median run's busiest year.
- On screen (year 25), History › Standing names the cap. Nothing lists the courses behind it: "Needs attention" is D and F only (`CurriculumTab.tsx:987`).

**Why it matters.** The last twenty years of an ambitious game are spent swapping instructors card by card, with no worklist.

**Fix.**
- A "below A" filter, linked from Standing's teaching line ("Show the 71 courses below A"). S.
- A Provost policy that puts the best free instructor on each course automatically. The seat system already exists.
- A faculty-development lever: sabbaticals, a teaching centre building, mentoring, each raising teaching over time for money. That turns the want into a strategic choice between buying stars and growing your own. M.

### A4-3. Most weeks ask nothing — major, M

**What.** Idle weeks (nothing done, nothing asked) per decade:
- 43% for assets in years 11–20;
- 90% for satisfaction in years 1–10;
- 60–85% for most goals and decades.

Answer-only weeks add 2–8%. Meanwhile each run answers 129–274 modals:
- 50 summer beats;
- 12–85 milestone notes;
- up to 52 research-complete modals (revenue);
- up to 93 decision events (assets).

**Why it matters.** Idle weeks are what fast-forward is for. But a game where 80% of weeks ask nothing, and the rest are interrupted by modals, has its decisions in the wrong places. **The reviewer's judgment**, from area 3's session: the modals are well written, and there are too many of the kind that asks nothing (milestone notes, research reports).

**Fix.**
- Fold milestone notes and research reports into the summer Review, or a digest the player opens.
- Keep modals for choices.
- Use the freed attention for the choices A4-1 would add.

M.

### A4-4. The Final Report misreads the strategies that differ — major, S

**What.**
- **"Never balanced its books"** is the low phrase for the finance axis (`reportData.ts:63`). That axis is endowment per student against $80,000 (`rivalsSystem.ts:227-241`). It goes to colleges running surpluses: the assets goal at $1.3M a week gets it, with a $63M endowment over 34,480 students.
- **"Never opened its doors very wide"** (`reportData.ts:62`) is the access axis: half the admit rate, half the price's affordability. It goes to big-then-good, the largest college in the game at 33,840 students.
- **The satisfaction goal is graded D ×10.** Satisfaction isn't among the six axes. The happiest college in the country (88, every need at 90) has no way to earn credit for it.
- **The athletics axis can't reach A** for anyone (area 7): its standing is capped at 100 and then scaled by 100/150.

**Why it matters.** The Final Report is the game's verdict. Its titles are what a player remembers and shares. A verdict that calls a surplus "unbalanced books" reads as a bug.

**Fix.**
- Rename the two phrases to say what the axes measure: "never built an endowment to match its size"; "stayed hard to get into".
- Add satisfaction, or "the student experience", to the axes, or fold it into experience.
- Scale athletics like the others.

S.

### A4-5. Athletics and size have too few levers — minor, M

Four wants, each met by no lever:

| Want | Runs |
|---|---|
| Found a team | 10 of 10 |
| Recruit athletes | 10 of 10 |
| Disband a program | 10 of 10 |
| Stay small on purpose, or shrink the student body | 25 of 30, across the three goals that met it |

**Fix.**
- Athletics:
  - let a varsity program be founded directly, at a cost higher than waiting for a club;
  - add recruiting (scholarships) to the athletics budget;
  - allow a team to be cut, with the alumni's displeasure as the price.
- Size:
  - a target enrolment in the summer's Admissions beat that the admit rate works toward;
  - a "decline this offer" on the program queue, which would also serve area 3's A3-1.

### A4-6. Pricing is blind by design, and the revenue player wants to see — minor, S

Every revenue run wanted to *see demand before pricing* from year 26. The summer price is set before the pool is revealed (area 3), so a price change is a year-long experiment. **The reviewer's judgment:** blind pricing is a legitimate design, since real colleges set tuition before admissions. But the game could show last year's response to price as a line on the tuition slider ("at $28,000 last year, 12% fewer price-sensitive applicants"). The data is already in the pool breakdown.
