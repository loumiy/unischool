# UniSchool — Design review, September 2026

*A pre-production design review of the game as it stands at commit `f8bc5ab` (Plan 08 landed). It is a review of the design and the player's experience, not of the code. It is deliberately candid. Where something works it says so, so that it is protected; where something is weak it says why, and what the underlying design problem is.*

**How this review was done.** The whole repository was read: the design and architecture docs, the eight plans, every system, every data file, every tab and component. The game was then played three ways:

1. **Through the real UI**, founding a school and playing the first five years by hand (developing the gen-ed core, hiring, siting buildings, answering the summer decision, the first demand, the first events), with the clock on the sandbox speed.
2. **A 40-year self-directed playthrough through the real reducer**, with a policy written for this review rather than one of the sim's scripted strategies: an earnest completionist who develops every course, builds every building, grants every varsity petition, fills every coaching chair, commissions research in every idle lab, and keeps the price "in line with prestige". Yearly state, action counts, idle weeks and every modal were recorded, and saves were dumped at years 8, 15, 25 and 40 and at the first firing of every modal type.
3. **Those saves loaded back into the browser** to look at every screen at year 15 and year 40, and every interrupt the game can raise.

`npm run sim` (the six scripted strategies over 40 years) was run and read alongside, and `npm run build`, `npm run lint` and `npm test` all pass on this commit.

Numbers quoted below come from those runs. Where a number depends on the seed or on the policy, it is marked as one run's reading, not a law.

---

## Executive summary

UniSchool is a systems-first prototype with an unusually strong *institutional* sensibility: named faculty who grow over decades, a class that keeps the price it was admitted under, a student body whose composition is a record of what the school was each summer, an architectural vernacular chosen at founding, a hundred-school field with mascots and an annual report. Almost nothing in the genre has that almanac feel, and it is the thing to protect.

Underneath it, the simulation does not currently produce the game the design docs describe. Four problems undermine the core experience, and they are design problems, not unfinished UI:

1. **Money stops mattering by about year 6 and never comes back.** Every student is profitable at every price the slider offers, instruction cost is 95% of operating expense at scale, and nothing else on the income statement is more than a rounding error. The design says "money is the throttle"; in play, cash is $14M by year 8, $200M by year 20, $2B by year 40, and the endowment campaign — the intended late-game sink — is asking for $3.4B at an 8% match.
2. **Enrollment is unbounded.** There is no capacity ceiling of any kind, the satisfaction floor is 12, word of mouth bottoms out at 0.55×, and the applicant pool's logistic ceiling is 260,000. A completionist run has 65,000 students on 4,350 beds by year 15 and 73,000 by year 21. The school stops being a place and becomes a number.
3. **The arc ends at roughly year 20 of a 40–50-year sandbox.** In the 40-year run: rank #1 in year 18, every one of 421 courses in year 22, every building in year 29. From year 22 to year 40 the player took between four and fourteen actions a year, almost all of them endowment campaigns and coach hires, against 5–6 modals a year telling them a research project produced nothing.
4. **Research is inert and its reporting is worse than silence.** The most frequent interrupt in the game (61–74 of ~225 modals in a run) is a project concluding with "The work produced nothing publishable." Forty years of continuous research at a top-ranked school produced 9 breakthroughs and 1 prize, and research standing is read by nothing.

Beneath those four, the curriculum is 421 Buildables that differ only by tier and field, so the "develop everything" button is the honest way to play it; the campus map is beautiful and mechanically inert; athletics is a long, well-built chain that ends in a number nothing reads; and the game never once explains why the prestige number — its headline — is what it is.

The recommendations at the end are ordered accordingly. The single most valuable thing to do next is to make growth cost something: a capacity ceiling on intake and an economy in which the marginal student is not always profit. That one change re-enables the pacing model the rest of the design was written against.

---

## 1. Core game and player experience

### What the core loop actually is

The docs draw the loop as *develop programs → prestige drifts up → attract better students → tuition → expand*. In play the loop the player actually runs is shorter and blunter:

> **Wait for cash → click "Develop N" in the Curriculum tab → appoint whoever the market lists in the fields that are short → site the next rung of each facility chain → set the summer sliders → repeat.**

Prestige is a consequence the player watches rather than a resource they manage: it moves 0.25% of its gap per week, nothing on screen decomposes it, and there is no decision whose prestige effect is visible except the milestone modal's "target 54.6 → 55.3".

The loop turns roughly once a year (the summer decision is the only fixed beat), with a trickle of course completions and building completions between. Over a 40-year run the player answered about 225 interrupts and took roughly 1,000 discretionary actions — about 25 actions a year, front-loaded: 50–80 a year in the building decade, 5–15 a year after year 22.

### What the player does repeatedly, and what makes it interesting

| Repeated action | Interesting? | Why / why not |
|---|---|---|
| Develop a course, choose its instructor | **Yes, once you notice the grade.** The drawer shows the grade each candidate instructor would earn, and the tier penalty makes it a matching problem (put the star on the capstone). | Undercut by the "Develop N" button, which makes the choice for you, and by the fact that most departments have one or two eligible people. |
| Hire faculty | Mildly. Teaching vs research stat, slots, salary. | Salaries are irrelevant at scale ($183k/wk of $26M/wk opex); the real question is "is anybody listed in this field this week". Interesting scarcity, not interesting choice. |
| Site a building | Aesthetically yes, mechanically no. | Placement affects nothing. Adjacency, distance, campus shape: none is read. |
| Summer admissions | **Yes — the best beat in the game.** Blind price, the reveal, then a fully projected admit rate. | Its consequences are muted: the "cost" of admitting deep is incoming quality, which is a small prestige term and never bites financially. |
| Answer a decision event | Sometimes. The dining inspection and the estate gift are real choices. | Half the table has a dominant option (see §2). Amounts scale with opex, so the late-game boiler costs $10M against $21M/week income. |
| Commission research | Once or twice. Topic, team, depth, the teaching it costs. | The outcome is invisible for years and is usually nothing. |
| Approve clubs | No. A pre-ticked checklist. | Nothing about a club matters once the social bonus cap (30) is reached, which happens by mid-game. |
| Fill coaching chairs | Mildly. | It is the whole of athletics management, and it terminates in a standing nothing reads. |

### Is there a compelling reason to keep playing?

For roughly the first twelve to fifteen years, yes: the milestone chain reveals a school at a time, each school hall is a real unlock, the rank climbs from #55 into the top 50 (year 7–8 in a good run), and the annual report names who you passed. The rankings-entry modal is a genuine moment.

After that the reasons run out in order: the catalogue completes (year 16–22), rank #1 arrives (year 18 in the self-directed run; the top rival sits around 111 prestige and a completionist passes it), the last building goes up (year 29), and the remaining loop is "launch endowment campaign #14". The sandbox is described as "tapering"; it does not taper, it stops, and it stops with a school that has $2B in cash and nothing to buy.

### Which systems carry the game's identity

1. **Faculty as named people who mature.** A hire in year 3 is a Full professor teaching eight courses in year 15, with a portrait, a bio, a salary that grew, and a name the research record remembers. This is the most distinctive thing in the game and the docs undersell it.
2. **The summer admissions ritual** — the blind price, the slow reveal, the cohort squares, the projections, then the digest of clubs. It is the one moment where the game feels like running an institution rather than clicking a tech tree.
3. **The institutional record**: per-class tuition memory, per-class cohort composition, the History tab, the annual U.S. News report with named rivals passed and overtaken, the College → University charter, naming rights. Together they make the school feel like it has a past.
4. **The campus map** — dimetric, hand-drawn in four vernaculars, with a seeded woodland and autotiled paths. It is the most polished surface and the thing a screenshot sells on.

### Which systems feel like chores, spreadsheets, or implementation artifacts

- **The tier-1 pool**: 42 alphabetical cards, most with a red dot, "not yet organised by school". The first thing a new player sees after the gen-ed core and the least inviting screen in the game.
- **The club digest**: a pre-ticked checklist of names with a $/wk each. A chore that isn't even a chore because the correct answer is "confirm".
- **Research completion reports** of nothing. Sixty-plus times a run.
- **Endowment campaigns**: a button that converts cash into a bigger number with no decision attached, and it is the *entire* late game.
- **The three standings**: two of them are drifting stocks with eleven weighted inputs between them and no reader. They exist to be ranked.
- **The activity log**: 200 undifferentiated lines, mostly "A new paper out of …".

### Does it feel like a strategy/simulation game?

It feels like a **builder** with a **ledger** underneath. It evokes Cities: Skylines in the milestone-gated reveal of options and the campus map; it evokes Football Manager in the faculty roster and market; it evokes Civilization in the U.S. News table. It does not yet evoke any of them in **pressure**: nothing in UniSchool pushes back. Cities: Skylines makes traffic and budget bite; Football Manager makes the board and the press bite; Tropico makes factions bite. UniSchool's only antagonist is time, and time is generous.

### The strongest potential differentiator

**An institution with a memory, run through the people in it.** No competitor has a faculty roster that ages across decades *and* a student body recorded class by class *and* an annual report that names the rivals you passed. If the game leaned into that — departments with chairs and cultures, professors who retire, get poached, win prizes and have buildings named after them, classes that remember who taught them — it would have an identity no map or tech tree gives it. The map is the second differentiator, but only if it starts to read the simulation.

---

## 2. Strategy, decisions, and depth

### Where the tradeoffs are real

- **Who teaches what.** The tier penalty (0 / −2 / −5 / −8) and the load penalty (up to −7) make instructor assignment a genuine matching problem. A star on a gen-ed survey is wasted; a fresh hire on a capstone reads as a D. This is the best micro-decision in the game and it is well surfaced in the course drawer.
- **Committing a scholar to research** costs two of their slots, sheds their lowest-tier courses to colleagues, and can orphan a course. The Research tab names exactly which courses move and which go dark before you commit. Real, legible, and the *only* place the two loops compete for the same people.
- **Price blind, then admit with everything visible.** Deliberately asymmetric information, and it works.
- **Endow or take the cash** (estate gift) is a real short-vs-long choice while cash is scarce — i.e. for about five years.
- **Which school to open first.** Business and Engineering pull pre-professional applicants, Arts pulls arts-focused, a lab pulls research-oriented. The cohort cards make this visible.

### Where decisions are effectively obvious

- **Develop everything, always.** Every course is worth exactly its tier, curriculum breadth is the 90-weight prestige term, and there is no reason to *not* develop a course you can afford. `Develop N · $X` is the honest UI for this, and it collapses 421 decisions into one button per year.
- **Admit as deep as the projection lets you.** Admitting 100% in year 1 turned a founding school's weekly net from $62k to $264k with no visible penalty except "incoming quality 41". Quality feeds a prestige term weighted 24 and scaled by `enrolled/6000`, so a small school's quality term is worth almost nothing anyway. The sim's own probes confirm broad-then-narrow beats the default curve on every axis.
- **Build every facility as soon as it appears.** The sim's Completionist strategy differs from Balanced only in `facilityThreshold: Infinity` and ends year 20 with +$217M and higher prestige. Facilities are underpriced relative to what they unlock.
- **Five of fifteen decision events have a dominant choice**: faculty scandal → part ways (free, +2 satisfaction, and the field is guaranteed to have depth ≥2); state capital match → commit (3.5× return); naming rights → accept (free money for a cosmetic rename); estate gift → endow on any horizon past ~15 years; winter storm → partial (1.2 fewer weeks of opex for three transient points). Two more are decision-free at scale because the social bonus cap is already hit: greek scandal → disband, greek housing → refuse.
- **Never do research** costs nothing measurable; four of six sim strategies produce zero output in 20 years and two of them are the top performers.
- **Ignore dorms.** Beds only scale the applicant pool (floor 0.35, saturating at 6,000 beds) and the housing attribute (weight 15, floor 12). A school with 4,350 beds and 65,000 students has satisfaction 60 and 47,000 applicants.

### Are the resources meaningfully constrained?

| Resource | Constrained? | Evidence |
|---|---|---|
| Money | **Years 1–5 only.** | Year 1 net +$62k/wk on 350 students → +$264k/wk after one summer. Year 8 cash $14M, year 15 $96M, year 20 $206M, year 40 $2B. In the 40-year run, 0 weeks in the red. |
| Space | No. | The grid is 126×126; the full catalogue covers well under a third of it. Nothing reads placement. |
| Faculty | Yes, in a thin-market field, for a few weeks at a time. | Clinical Health / AI / Neuroscience list a candidate every few months. Otherwise anyone listed is fine: a 71-person roster taught 421 courses to 73,000 students. |
| Students | No. See enrollment. | |
| Prestige | Reached, not managed. | The top rival tops out ~111; rank #1 at year 18. |
| Research | Constrained by labs (13 slots) and by the "don't gut a department" instinct, not by anything the game enforces. | 7 of 13 facilities in use at year 40 with 73 faculty. |
| Curriculum | Time-gated by prereqs, otherwise free. | |
| Satisfaction | Floored at 12 per attribute, word of mouth floored at 0.55×. | Never fell below 45 in the self-directed run except during growth spikes. |

### Can players pursue different viable university identities?

Not really, and the prestige formula is why. Curriculum breadth (weight 90) is *everything completed over everything possible*: a deep Engineering school with three distinguished programs scores the same as a shallow school with three established programs in three different schools. There is no specialisation term, no "known for" effect, and every school's tier-3 payoff is the same +breadth. The cohort pulls (research-oriented, arts-focused, pre-professional) are the one place identity is modelled, and they affect *who applies*, not *what the school is worth*. The docs say "archetypes emerge, they are not chosen"; the formula says "the only archetype that wins is the one that builds everything".

The three standings were an attempt at identity axes and they are readings, never inputs — a school can be an "athletic power" on a table nothing reads.

### Short-, medium-, long-term decisions

- **Short (weekly)**: who teaches what; which candidate to appoint; which building rung to site. Present and fine.
- **Medium (yearly)**: the summer sliders; which school to open; whether to commission a 3-year program. Present, and the summer decision is good.
- **Long (decades)**: there are none. No commitment lasts longer than a landmark program (5 years). No decision at year 5 shapes year 25 — you can't choose to be a small elite college, a research university, or a state-scale commuter school, because the formula rewards one path.

### Where emergent stories could come from

The material is there and mostly disconnected:

- **A professor's career**: hired as an assistant, teaches the survey, matures, gets the capstone, joins a landmark program, wins the Halvorsen Prize, gets an outside offer. Every piece exists; nothing narrates it and nothing links the pieces (the prize doesn't raise their poaching odds, the acclaim doesn't reach the applicant pool, they never retire).
- **A department's arc**: founded on one hire, short for years, then flush, then gutted by a research commitment. The capacity meter shows the state; nothing tells the story.
- **A rivalry**: a per-sport strength that is stable across the run *and* a rival that overtakes you academically *and* a rival that leads campus life. The report names them. Nothing lets you *do* anything about a specific rival.
- **A class**: admitted cheap in a bad year, carried at that price for four years, unusually social because the union had just opened. The Enrollment tab draws it; nothing happens because of it.

---

## 3. Progression and pacing

### The timeline of a completionist run (self-directed, seed 4242)

| Year | What happened | What the player was doing |
|---|---|---|
| 1 | Gen-ed core in 4 weeks; 42 tier-1 courses revealed; first dorm. | One click, then 48 weeks of waiting for summer. |
| 2–4 | Tier-1s, first school halls (2.7), first program established (3.8), first lab (4.4), charter (4.7). | The busiest stretch: 30–50 actions a year, 1–9 modals. |
| 5–7 | Tier-2 and tier-3 waves; 10 milestone modals a year; rank #48 by year 7. | Hiring into every field; siting a facility every few weeks. |
| 7.5 | **Entered the rankings** (#50). | The best moment in the run. |
| 8–12 | Enrollment 14k → 40k; beds 2,350 → 4,350; satisfaction 74 → 85. | Money stops being a question (cash $14M → $38M). |
| 12 | 10 milestones in one modal. | Health Science and Computer Science come online together. |
| 15–16 | Rank #10; prestige 96 → 103; first grad course. | Endless grad-course bills ($6M each) that are trivially affordable. |
| 18 | **Rank #1.** | |
| 19–22 | All six graduate programs; all 421 courses (21.8). | Last real construction. |
| 23–29 | First prize (23.7), campaigns (24.7), last dorm tower (29). | 5–14 actions a year. |
| 30–40 | 18 championships, endowment $1.5B → $9.2B, cash $0.7B → $2B. | Nothing. Campaign, coach, dismiss the research report. |

The sim's Completionist strategy (a cruder policy, default admit curve) is slower — 421 courses at year 32, prestige 143 at 40 — so the exact years move with policy. The *shape* does not: the game is built out somewhere between year 20 and year 32 of a 40–50-year sandbox.

### Is the early game engaging?

The first *screen* is: one hall on a large green field, six gen-ed cards, one dorm on offer, 30 candidates on a market, and no guidance whatsoever. The first *year* is: click "Develop 6", then wait 48 weeks for anything to happen. Nothing prompts the player to build a dorm (the school is fully commuter and satisfaction falls from 70 to 30 over the year); the "!" on the Curriculum icon at week 4 is the only signal that the tier-1 wall has opened.

Years 2–7 are engaging in the way a tech tree is engaging: things unlock, halls go up, the milestone modals fire, and the rank starts moving. But two things dull it: the 42-card alphabetical pool, and the fact that money stops constraining choice at about year 5, so from then on the pace is set by build durations, not decisions.

### Pacing spikes, bottlenecks, floodgates, waiting

- **Floodgate**: completing the gen-ed core opens all 42 entry courses at once, across every school, with most blocked on faculty. Too much, too soon, with no structure.
- **Floodgate**: the year-12 modal with 10 milestones. Celebrations that arrive ten at a time are not celebrations.
- **Bottleneck that isn't**: the 20-week school hall build and the 28-week tier-3 course are the only real waits; with unlimited parallel development the catalogue is a matter of cash, and cash is not a matter.
- **Waiting**: at real speed a year is 4.3 minutes and the self-directed run averaged 25 actions and 5.6 modals a year — one thing to do every 8 seconds in the building decade, one every 20–40 seconds after year 22. At 2× it is tolerable; at 1× the mid and late game are a screensaver.
- **The sandbox "fast" speed exists only for a school named "test".** A real player has no skip-to-next-event.

### Are systems introduced at appropriate times?

The gating is mostly good: Research appears with the first lab, Athletics with the first team, History in year 2, health with 1,500 students, graduate programs when a school is near-complete. Three timing problems:

1. **Athletics arrives too late.** A sport club needs a student center (year 2–3), a 30% roll, then five years of tenure, then a petition week. First varsity team: year 8.75 in one run, year 19.75 in another. The AD, the mascot, and the "name your teams" moment — the game's warmest flavour beat — can land two decades in.
2. **Graduate programs arrive after the arc is over.** First professional course year 12–14, first program year 18–28. By then $6M per course is pocket change and the "cash-rich late-game sink" they were designed as doesn't sink anything.
3. **Demands never fire on a well-run school**, and the well-run school is the default. The threshold (45) is below anything a player who builds facilities ever sees.

### Does complexity increase at a manageable rate?

The *number of systems* grows well. The *cognitive load per system* does not: the Faculty board shows all 29 departments from week 1; the Curriculum shows 42 cards at week 4; the Build popup has nine categories by year 10. What is missing is a layer that says what matters *now*.

### Does progression feel earned?

Milestones do: an established program is nine courses and a hall and it says so. Rank does not: it is a consequence of breadth and enrollment, and because enrollment is unbounded and every student is profitable, the rank climb feels like a function of time. Prestige 100 arrived in year 16 without a single decision the player could point to.

### Do late-game goals differ from early-game goals?

No. The early goal is "develop the next course and build the next rung"; the late goal is "develop the last course and build the last rung", then "click campaign". Graduate programs are the same Buildable at 25× the price. There is no late-game *problem* — no decline, no rival that reacts, no succession, no scandal that can actually hurt, no cost of size.

### Where the structure will become tedious

- The 168 tier-3 courses, each 24 weeks and identical.
- The 13 identical labs.
- Eight of fifteen dorm rungs are the same building at a higher price.
- 61–74 research reports, most of nothing.
- Varsity petitions: the deterministic petition cadence produced 25 of 59 and 46 of 70 decision events in two sim runs.
- The endowment campaign loop from year ~25 on.

---

## 4. Intuitiveness and cognitive load

*Read as a first-time player who knows the genre.*

### Understood immediately

- The map, panning, zoom, the toolbar's four numbers and the funds figure.
- "Develop a course, choose an instructor, it costs $55k and takes 4 weeks."
- Build → category → tile → click the ground.
- The satisfaction breakdown: five dials, a coverage line each, "Show sources". The clearest diagnostic in the game.
- The Treasury: a real income statement with a sentence under each line.
- The summer decision's three beats.

### Struggled with

- **Why prestige is 52 and what would move it.** Nothing on any screen answers this. The History tab has one sentence.
- **What "in line with your prestige" means in dollars**, and why the reveal drew 1,066 applicants rather than 500 or 5,000.
- **Why the tier-1 pool is "not organised by school"** and what "complete a school's entry courses to raise its building" asks me to do (which six? the cards are alphabetical by code).
- **The red vs amber dot on a course** (department full and nobody listed vs someone listed). It is explained nowhere on the screen itself.
- **What research standing is for**, what campus-life standing is for, and why two of my three ranks are on different tabs.
- **What a "slot" is.** The Faculty board's meter is excellent once you know that a course occupies a slot forever, that unstaffed courses still occupy one, and that research takes two. None of that is on the board.
- **That beds are not a cap.** Every genre reflex says "I need dorms before I can admit". The Enrollment tab says, in its last line, that there is no capacity ceiling of any kind. A player learns this the year they admit 1,000 students with 350 beds and nothing goes wrong.

### Learned by trial and error

- That admitting everyone is free money.
- That the "Develop N" button is the whole curriculum game.
- That a club digest is safe to confirm without reading.
- That a research project usually produces nothing, so the depth choice barely matters.
- That an event's "pay" option is almost never worth it after year 10.
- That a declined varsity petition comes back five years later, for every sport club, forever.

### Are objectives and consequences clear?

There are no objectives. The game states no goal beyond "no win condition", offers no "next step", and its only prompts are badges. Consequences of the *summer* decision are projected well; consequences of everything else are either invisible (prestige) or explained in prose after the fact (the demand modal, the milestone modal).

### Can I understand why something happened and what to do about it?

- **Satisfaction**: yes, fully. The best-explained number in the game.
- **Finance**: yes, per line.
- **Applicant pool**: partly. This year's figure is decomposed into cohorts; the *change* from last year is not.
- **Prestige**: no.
- **Rank**: the report says who you passed; it can't say why.
- **Course grade**: yes, itemised in the drawer.
- **A department "over"/"short"**: the meter shows it; the fix (hire, reassign) is a tab away with no link.
- **A research project's output**: the report lists it; there is no "because".

### Where information overwhelms

1. The Faculty board — 29 rows, six columns, a four-segment meter with two rules each, before expansion. On a mature school with "Expand all" it is hundreds of cards on one page and no sort or filter.
2. The summer modal at 440px — two sliders, eight cohort squares, two figures, three projections, and a checklist.
3. The annual report — movement, passed, overtaken, big movers, two other standings, and a 50-row table in the same 440px.
4. A school lane view — 54 cells each with up to six marks.

### The curriculum, specifically

The three-level map (schools → lanes → drawer) with progressive reveal is the right shape, and it is honest about its choice to draw no edges. What makes it read as a database is not the structure, it is the *content*: every course is the same Buildable with a different string, so there is nothing to compare, nothing to prefer, nothing to plan around except "which four complete the quartet". The 336 tier-2/tier-3 descriptions come from eight templates by position ("Builds on X's foundations with a focused study of Y"), so opening two drawers in a row reads the same sentence twice.

The other database moment is the tier-1 pool: 42 cards, alphabetical by code, deliberately not grouped by school "so seed order doesn't leak structure". The structure is the *point* — a new player should be looking at seven schools with six doors each and choosing which school to open, not scanning ACCT/AERO/ANTH for the white ones.

What is missing is any tool for "what should I develop next": no "closest to a milestone", no "this course would establish a program", no "these six raise a hall", no cost sorting, and no combination of "ready" with "affordable".

---

## 5. Player feedback and simulation legibility

### What is legible

- **Satisfaction** (five dials, sources, with-and-without student life, demand stakes).
- **Money** (the statement, the driver notes, the four class prices).
- **Course quality** (itemised factors, the grade each candidate would earn).
- **Faculty capacity** (the meter — the strongest instrument in the UI).
- **Milestone worth** and **championship worth**, both computed as target-minus-target-without rather than authored.
- **The annual report's movement** (passed, overtaken, movers).

### What is opaque

- **Prestige.** A six-term weighted formula with two multipliers (library adequacy 0.4–1.0 on the 90-weight term; `enrolled/6000` on the quality term), drifting 0.25% a week, with no breakdown anywhere. A player who builds a library cannot know it multiplied their entire curriculum score; a player who shrinks cannot know why prestige fell.
- **Why applicants changed.** The reveal is one year's figure decomposed by cohort. Word of mouth (a 0.55–1.45× multiplier on the whole pool) is deliberately hidden, sticker shock is applied to three invisible sub-pools, and the cohort demand factor is a share-weighted sum whose neutral point is only 1.0 at a founding school priced at tolerance. "The pool grew 40%" has five causes and the game names none.
- **Research.** Output per week is shown; the chance of anything coming of it is 0.5–3.4% a week and never stated. A player commits three professors for three years and cannot know whether that was a good bet.
- **Unstaffed courses score zero in the campus average but show "—" on their own card**, so firing a professor drops academic satisfaction and the teaching prestige input while every card the player looks at is blank.
- **Rival movement in the report is an estimate** (the annual shock is unrecoverable), so the game can report a rival moving four places when it moved two.
- **The three standings** — a rank each, no inputs shown.
- **Instruction cost.** The statement says "$388/wk per student — rises with every course you offer". It does not say that this is 95% of everything, or that the 350th course costs $65,000 a week forever across the body.

### Better feedback that needs no new systems

1. **A prestige panel** on the History tab or a new Standing tab: the six inputs as bars against their weights, the two multipliers named, the target vs today, and "what moved last year". Everything needed is in `computePrestigeTarget` and `prestigeTargetWithout`.
2. **A year-over-year line on the summer reveal**: "Pool 1,609 (+34%): prestige +8%, price −3%, word of mouth +21%, new labs +6%". The funnel already computes each factor.
3. **A year-in-review** built from the log at each summer: courses finished, programs established, hires, departures, research outputs, rank change. The log has every line; it needs grouping.
4. **Link diagnoses to fixes**: the Basic Needs dial → the Dining category of the build popup; the demand modal → the building it names; a "short" department → its market.
5. **Show the odds** on a research offer (expected publications, breakthrough chance, award chance at this team strength) rather than only cost and duration.
6. **Put the tooltip on the dot**: amber/red course dots and the department state words should say what they mean on hover.

---

## 6. UI/UX and visual design

### What has real character and should be kept

- The **startup facade** that engraves the typed name in stone and previews the vernacular. Best single screen.
- The **campus map**: dimetric SVG, per-vernacular architecture, cursor-distance label fade, a topological depth sort, autotiled paths. Distinctive and clearly loved.
- The **parchment / navy / brass** register with Georgia headings and monospace numbers. It reads as an almanac. Keep it.
- The **faculty capacity meter**, the **cohort squares**, the **satisfaction dials**, and the **procedural portraits**. Each invents a shape rather than reaching for a chart.
- The **course drawer**, which is the model for what every entity's detail view should be: the facts, the itemised score, the doors to related things, the action.

### Readability problems

1. **One modal width (440px) for every interrupt.** Fine for a decision event; cramped for the admissions form (eight squares in four columns needed a 12px font step); wrong for the annual report, which puts a 50-row table in it; wrong for the ten-milestone celebration, which is a scroll of identical paragraphs.
2. **The `<dl>` pattern carries most of the game's numbers** with no hierarchy inside it. Treasury, Balance & Policy, Effect on Satisfaction, the course drawer facts — all the same label-left / mono-right rows. The eye has nowhere to land.
3. **Ten-point type** in several places (offer meta, cohort labels, table headers), and eight font sizes that escape the token scale.
4. **No maximum content width.** On a 1600px viewport the tab panels already stretch; the income statement on a wide monitor is a line of text with a number a metre to its right.
5. **The bottom toolbar is the only chrome** and it carries eleven controls plus four stats plus the clock. The tab icons have no labels (title only), and three of them look alike at 24px (heart, clipboard, ring).

### Information architecture problems

1. **Actions live away from the diagnosis.** Student Life and Enrollment tabs receive no dispatcher at all. Everything a player can *do* about satisfaction is in the build popup; everything about enrollment is in a once-a-year modal.
2. **Hiring lives in two places** (Curriculum drawer for the shortage, Faculty board for browsing) — which is defended in the code and is right — but the Faculty board's demand sentence names courses that don't link, and the drawer's "nobody in this field" lists candidates without their research stat.
3. **Three standings on three screens** (toolbar, Research tab, Athletics tab), with the report as the only place all three appear.
4. **The log is a strip and a 200-line popup**, with no filter, no grouping, no route back into the game.
5. **Modal-only decisions.** Tuition, admit rate, club approval, the charter, the AD hire, the varsity grant: every one is a modal that stops the clock, and none can be revisited from a tab. There is no admissions office screen.
6. **No "what next".** No advisor, no objective strip, no suggested action; the only prompts are three badge dots.

### What makes it feel unfinished or generic

- Eight tabs that are all "a stack of parchment panels with a definition list in each". Treasury and Enrollment could be any spreadsheet game.
- HelpHint prose as documentation: 250 words behind a "?" on the map, 110 on Athletics. Good writing in the wrong place.
- The identical modal shell for every event: title, paragraph, two bordered buttons.
- The map draws nothing about the simulation: no students, no traffic, no crowding, no "this dorm is full", nothing at night, no seasons. A failing campus and a thriving campus are the same picture.
- No sound, no animation beyond number counts and a completion pulse.

### How to handle hierarchy, type, spacing, cards, buttons, colour, icons, panels, maps, tooltips, notifications, menus

- **Hierarchy**: give every panel one number that is the answer (big, serif) and demote the rest. Treasury: net weekly, then the two lines that dominate it. Faculty: the shortfall sentence, then the board. Research: what is running, not the vacant grid.
- **Type**: keep Georgia for names and headings, but promote the display size (the school name, the rank, a milestone title) to something 32–40px so moments read as moments. Enforce the token scale; retire the sub-11px sizes.
- **Spacing**: adopt a 4/8/16/24 rhythm and stop using 18 and 22.
- **Cards**: a course cell, a faculty card, a team card, a lab panel and a club row should share one anatomy — eyebrow, name, one status chip, one number — so the eye can read any of them at a glance.
- **Buttons**: one primary (brass fill), one secondary (outline), one destructive (oxblood outline). Today "Appoint", "Develop with…", "Confirm Policy", "Launch campaign #1" and the event choices are five styles.
- **Colour**: the palette is right. Use the semantic pair more: green/amber/red on *state* only (dots, dials, the funds figure) and nowhere decorative. Retire the 78 raw hex literals into tokens.
- **Icons**: label the toolbar tabs at ≥1280px; the icons are fine at 24px but not self-explanatory.
- **Panels**: cap content width at ~1200px and centre; stack Treasury's two columns into one statement with a summary on top.
- **Map**: the highest-impact visual work is *letting the map show the sim*: tiny pedestrians whose density is enrollment, a full-dorm glyph, lights at night, a construction crane rather than a bar. Second: the "recenter" button the code removed, and a minimap or edge indicators, because a player who pans off the campus has no way back.
- **Tooltips**: every dot, chip, badge, and abbreviated column header gets a one-line title. Move the HelpHint essays into a Help screen and leave one sentence behind.
- **Notifications**: a small toast for the events that don't stop the clock (course finished, hall finished, club petition, publication) that fades in three seconds, and a "this week" tray. The ticker line is too easy to miss.
- **Menus**: an escape menu with Save/Load slots/New Game/Settings/Help; today the hamburger has Save and Erase.
- **Modals**: three widths (narrow for events, medium for reports, wide for admissions), and the annual report as a full-screen page with the table as a table.

### Screens that deserve the most attention, in order

1. **The first hour**: the empty map, the tier-1 pool, the absence of a next step.
2. **The summer admissions modal** — the game's best beat deserves a wide, unhurried layout and a "last year" column.
3. **The Curriculum tab's school level** — the seven school cards are the game's real progression view and they are small parchment boxes in a grid.
4. **A "Standing" or "Prestige" surface** that does not exist.
5. **The Faculty board's card grid** (sorting, filtering, and a person page).
6. **The annual report** as a page.

### High-impact, low-rewrite improvements

- Group the tier-1 pool by school with the hall as the lane's header.
- Widen the admissions modal and add "last year" values beside each figure.
- Add a prestige breakdown panel (read-only, no state).
- Toasts for completions and petitions.
- Labels on the toolbar tabs.
- A year-in-review at each summer, generated from the log.
- Skip-to-next-event and a 4× speed for everyone.
- Cap panel width and centre.
- Kill the research-report-of-nothing (log it; report only outputs and awards).
- Show pedestrians on the map (even a dozen dots per thousand students).

---

## 7. Scope and project-management review

*As a design lead reviewing the project as it stands.*

### Concerns about the design

1. **The pacing thesis in the docs is not what the code does.** `docs/design/economy.md` says every ratio attribute is scored against planned capacity and that adding capacity "dilutes every ratio the week it opens". The code scores four of five attributes against *enrolled* (`satisfactionSystem.ts` lines 241, 280); the source comment at line 189 still says capacity. The "growth has to be paid for twice" argument the whole economy rests on is not implemented. Either the refactor lost the mechanic or the docs are three refactors stale; either way the design is being tuned against a model that isn't running.
2. **The balance harness measures the wrong thing.** The regression test pins no trajectory numbers; every assertion is relational or a sign, several pass "at a majority of three seeds", and the "intended line of play" (Balanced builder) ends year 20 overdrawn on the default seed. Meanwhile the harness reports enrollment of 70,000 and cash of $1.7B at year 40 without a single assertion that this is wrong. The tests protect invariants beautifully and protect the *feel* not at all.
3. **The prestige formula has dead weight and a dominant term.** Campus life maxes at 0.15 of a 12-weight input (two rec-centre rungs are the only sources: +1.8 prestige, ever); the endowment term needs $400k per student; research is capped at 22 and almost never earned. Breadth × library is the game.
4. **Three of ten Buildable effect fields are implemented and never authored** (`tuitionBonus`, `applicantPoolBonus`, `unlockIds`); two more serve four Buildables. The content vocabulary is thinner than the engine's.
5. **The comments have become a second source of truth and have drifted** — field counts (28 vs 29), event counts (14 vs 15), catalogue size (330 vs 421), the placeable count the map size was justified against (60 vs 68). Fifteen thousand comment lines in thirty-nine thousand is a maintenance surface.

### Disproportionately complex relative to gameplay value

- **Athletics**: 18 gendered sports, venue categories, a 19-field coach market with the same churn model as faculty, an athletic director with a shortage event, per-sport rival strength for 100 schools × 18 sports, an annual bracket, a campus-life standing, and a mascot flow — terminating in a number no system reads and a title that is worth "+1.7 to the target" of a standing nothing reads. It is the best-built system in the game and the least connected.
- **Three standings** with their own drift, momentum, RNG streams, and invariants, so that two leaderboards can exist.
- **Save migrations** v3 → v40, 2,870 lines of `persistence.ts`, for a game "nobody is playing yet". The docs now say discard by default; the file says otherwise.
- **The founding woodland, tree felling, and the depth sort** — beautiful, and not where the game's problems are.

### Substantial implementation / balancing / maintenance risk

- The RNG-determinism constraint (one draw per year for rivals, a pinned coach pool size "known to be too small" because the balance sim shares `Math.random`) is letting a test harness dictate content values. That will get worse with every system.
- A single `computePrestigeTarget` read by admissions, pricing, snapshots and the sim means any prestige change is a whole-game rebalance. The docs already record one attempt that "broke the game before it fixed it".
- Enrollment × courses in `instructionCostPerStudent` makes every course a permanent tax on every student. Any enrollment fix moves the whole economy.

### Underdeveloped

- **Consequence.** Nothing can go wrong that the player can't ignore.
- **The faculty lifecycle** (aging, retirement, poaching, retention, chairs) — on the backlog, and it is the system with the highest identity payoff.
- **Research outcomes and their reach** into the world (applicants, donors, faculty market, rivals).
- **The endgame.**
- **Onboarding.** The tutorial is a backlog line.
- **Events**: fifteen, half with a dominant choice, one a year.
- **The map as a simulation surface.**

### Overdeveloped

- Athletics relative to its reach (see above).
- The rival field's drift machinery relative to what rivals do (nothing).
- Graduate programs as six identical clusters of 25×-priced courses.
- Save migrations.
- Prose comments and HelpHint essays.

### Cut, simplify, defer, redesign — if the goal is to ship

**Cut**
- The "quiet report of nothing" research modal.
- The charter interrupt (make it a log line and a rename button).
- Two of the four identical 500-bed dorm rungs and two of the four 1,000-bed rungs.
- The `prize` row of `RESEARCH_OUTPUTS` and the dead bank-model plumbing.
- The unauthored effect fields, or author them.

**Simplify**
- Collapse research standing and campus-life standing into *inputs* to prestige (or into the applicant funnel) and stop ranking them separately until they do something.
- Athletics: keep the department, the coaches, the venue chain and the bracket; merge assistant coach and trainer into one "staff" slot; let the AD's shortage event be the only athletics event; make the varsity petition a *tab action* rather than a deterministic interrupt.
- Graduate programs: three (Medicine, Law, one Doctoral School) rather than six.
- Migrations: freeze at the current version and delete the chain.

**Defer**
- Match simulation and schedules; terrain; camera rotation; deans and boards; sound.
- Camera rotation is cheap technically but not what the game needs.

**Redesign**
- The growth economy (capacity ceiling, marginal cost).
- The prestige formula (specialisation, reactive rivals, a cap that isn't reached at year 18).
- The research loop's outputs and reach.
- The first year.

### Where scope is exceeding what is reasonable

Plan 08 alone is 1,225 lines of planning for a system that reaches nothing the economy reads. The next plan should not add a system. It should make the existing ones bite, connect, and end. The project has the discipline to do that — the docs are exemplary about *why* — but the docs are currently describing a game the code doesn't run.

---

## 8. Earnest playthrough

*Objective: develop every course and program, build every asset, maximise prestige and institutional development, stay solvent, see everything.*

### The opening (through the UI, sandbox speed)

Founding is charming: a name, four vernaculars with one-line descriptions, a facade that engraves the name. Then a hall, a field, and silence. I opened the Curriculum tab because it had a badge; "Develop 6 · $330,000" was the obvious button and I pressed it. The drawer for College Writing showed one eligible instructor (Dr. Grace Bennett, B), which was the first moment I felt the game had people in it.

Then forty-eight weeks with nothing to do. No prompt to build a dorm; satisfaction slid from 70 to 30. I built nothing because nothing told me to, and I am a genre player. The activity log's one line was "Developed: GE 160".

**Summer 1** was the first good moment: the blind price ("in line with your prestige"), the reveal counting up to 1,066, eight cohort squares. I mis-set the admit slider and took everyone — the game let me, the projection said "+$201,674/wk", and nothing about it was flagged as reckless. Enrollment 350 → 1,329 on zero beds.

**Year 2**: the tier-1 wall — 42 cards, alphabetical, most with a red dot. I appointed the first three "Appoint" buttons I saw and sited a dorm, dining hall, library, student center, quad and rec center in one sitting because I could afford all of them. Placing was pleasant (the ghost, the rotate, the click); it was also arbitrary, because nothing about where I put them mattered. Cash went from $5M to $15M during the year with nothing to spend it on.

**Year 3**: the first demand — "somewhere to study" — arrived because my library placement had silently failed (a click on an invalid spot does nothing; a human would have seen the ghost not land, a hurried one wouldn't). The demand modal is well written and reads its stakes from the model. **Year 4**: a roof failure at $377k against $40M in the bank, which is the pattern for every event from here on. **Year 5**: the first club petition, pre-ticked; a faculty scandal (part ways, obviously); an outside offer for $67k (fund it, obviously).

### The long arc (headless, own policy)

I set the price at 90% of tolerance each summer and admitted broadly while small, narrowing as standing rose. The school never had a bad week: 0 weeks in the red across 40 years, minimum cash $325k in year 1. Every year the question was "what is affordable and available", and from year 6 the answer was "everything".

What was **intuitive**: the milestone chain (entry courses → hall → tier 2 → establish → tier 3 → distinguish → graduate). The facility chains. The summer sliders. Hiring into the field that's short.

What was **difficult**: knowing which six entry courses raise a hall without counting prefixes. Keeping departments staffed when a research commitment shed courses (the Research tab warns; the Faculty board shows "over"; the fix is in a third place). Understanding why prestige rose 5 points in a year with no milestones (enrollment scale on the quality term, as it turns out).

**Too many clicks**: a course is three or four; a building is three or four plus a pan; a hire from the shortage is four. Not outrageous per action, but with 421 courses and 68 placeables the "Develop N" button and a drag-and-drop tile become the only sane paths, and then the decisions are gone.

**Repetitive**: the 168 tier-3 courses; the 13 labs; siting the seventh 500-bed dorm; dismissing the fifty-third research report; the varsity petition every five years for every sport club; endowment campaign #14.

**Uncertain what to do next**: week 5 of year 1; every summer after year 25.

**Wasted time**: at real speed, the mid game — a week is five seconds and a year is four minutes with perhaps ten decisions in it. The research reports of nothing. The club digest. The ten-milestone modal.

**Meaningful decisions**: which school to open first (Business pulled pre-professionals; a lab pulled the research-oriented); committing Dr. Reyes to a three-year program and watching her Physics survey go to an assistant; the blind price the year after a bad satisfaction year; endow vs cash while cash still mattered; the AD choice (a real three-way, if only on salary).

**Rewarding**: "You've Entered the Rankings" at year 7.5; the first hall on the map; a program established with four named capstones opening; the first championship modal (the AD "on the telephone since the final whistle", a bracket with named rivals); the History tab at year 15 with four curves that all go up.

**Genuinely fun**: the summer reveal, the first three years of building, the moment a department that had one adjunct became a real department, the campus at year 15 with the track and the arena and the fountain.

**Box-checking**: everything after the last hall — tier-3 sweeps, labs, dorm rungs, grad courses at $6M apiece, campaigns.

**Wanted to keep playing**: years 2–12.

**Wanted to stop**: the first time I had $50M and nothing to buy (year 13); definitely by year 22 when the catalogue was done and rank #1 was four years old.

### Underlying design problems behind the experience

- **The player is never under pressure**, so every decision is "yes, and when". Pressure needs a cost of growth and a way to fail short of insolvency.
- **The catalogue has no texture**, so it can only be completed, not explored.
- **Time is the only scarce thing** and the game gives the player no control over it beyond 1× and 2×.
- **The best beats (rankings entry, championship, milestone, summer) are all reports**. The player's *actions* are never the moment; the *news* is.

---

## 9. Content, systems, and missing opportunities

### High-value opportunities (reinforce what exists)

1. **A cost of size.** Capacity as a soft ceiling on intake (teaching seats, beds, dining) and a marginal-cost model where a student past capacity costs more than they pay. This one change makes every facility decision, every dorm rung and every summer slider a tradeoff, and it re-enables the "cost leads revenue" pacing the docs already describe.
2. **Specialisation in the prestige and applicant models.** A "known for" term: distinguished programs *concentrated* in a school count more than the same number spread thin; a school with a research standing in one field pulls that field's cohort and candidates. Lets a small elite college and a broad state university both be viable, and makes "which school first" a decades-long decision.
3. **Faculty lifecycle.** Retirement at ~30 years' tenure (a founding hire retires in the mid-game); rival poaching scaled by a professor's acclaim and the school's rank; a retention negotiation; department chairs who lift a department's grades. The backlog names it; this review says it is the highest-identity feature the game can build on existing state.
4. **Research that reaches somewhere.** Publications and breakthroughs as *labelled* pulls on specific cohorts and on the faculty market ("a physicist saw your paper"); grants as a real income line at research schools; a prize that puts a named professor in the annual report and on a building. And a report only when there is something to report.
5. **Rivals that do one thing.** Not a strategic AI — one thing: a rival above you in a table occasionally poaches a professor, and a rival you pass occasionally sends a "naming-rights" donor your way. The field already has names, mascots and per-axis standings; give it one hand.
6. **A prestige explainer** and a **summer year-over-year** (§5). Feedback, not systems.
7. **The first year as a scripted opening** (the tutorial on the backlog): a trustee's letter, "your students have nowhere to sleep", the first hall as an explicit goal.
8. **Athletics that touches the economy**: a stadium sells tickets; a title moves the applicant pool's athletes cohort visibly and a donor's mood; a losing program with a high budget draws an event. The chain exists; it needs an outlet.

### Interesting but not now

- Seasons with fixtures and a record (the backlog's line is right: a bracket is not a season).
- Deans and a board (the AD shape generalises, but only once departments have something a dean would change).
- Terrain and rowing.
- Camera rotation.
- Individual notable students (a rare "student of note" event is cheap flavour; a student sim is not).
- Naming rights for Medicine and Law halls (small, and correct).
- A demand-curve finance model (deferred already; the capacity ceiling matters more).

---

## 10. Recommendations and priorities

### Critical — problems that undermine the core experience now

**C1. Make growth cost something.**
- *Problem*: no capacity ceiling; every student profitable at every price; satisfaction floors so soft that 65,000 students on 4,350 beds keep applying.
- *Why it matters*: it removes every tradeoff downstream — dorms, dining, price, admit rate, facilities — and produces schools of 70,000 that break the fantasy and the arc.
- *Solution*: intake capped by a **teaching capacity** derived from what already exists (faculty slots × a seats-per-course constant, or library/dining/health served-population as a soft ceiling with a steep applicant penalty past it). Past capacity, students cost more than tuition (crowding multiplier on instruction cost) and the housing/dining coverage gates the *pool* harder than a 0.35 floor. Raise `ATTRIBUTE_SCORE_FLOOR` consequences: below 45 satisfaction, attrition (a class shrinks between years).
- *Scope*: medium. `admissionsSystem.ts` (the skim), `financeSystem.ts` (instruction cost), `satisfactionSystem.ts` (floors), the projection in `consequences.ts`, the sim's expectations.
- *Affects*: admissions, finance, satisfaction, demands, prestige's scale term.

**C2. Re-tune the economy so money is a throttle after year 5.**
- *Problem*: instruction cost is 95% of opex and scales per student per course; salaries, upkeep, research and athletics are rounding errors; cash reaches billions.
- *Why*: "money is the pacing mechanism" is the design's spine, and it holds for five years.
- *Solution*: move instruction cost from per-student-per-course to per-*section* (each course costs a fixed amount per N students enrolled in it), make faculty salaries scale with the catalogue they teach and with prestige (a top-50 school pays top-50 salaries), give buildings upkeep that scales with use, and cap the endowment campaign at a handful with real match rates. Target: net margin 5–15% of opex at every stage of the arc; capital costs at each stage that take one to three years of surplus.
- *Scope*: medium-large, mostly constants and one formula, but it is a whole-game rebalance and needs the sim re-fitted.
- *Affects*: finance, sim, every cost constant.

**C3. Give the run an arc that ends, or a late game that is a different game.**
- *Problem*: everything is built by year 20–30 of a 40–50-year sandbox; rank #1 in year 18; the last decades are campaign clicks.
- *Why*: half the playtime is dead.
- *Solution*: two complementary moves. (a) **Reactive rivals and a prestige ceiling you have to defend**: rivals drift toward the player's level, poach, and reclaim rank, so #1 is held, not reached. (b) **An explicit era structure or end state**: e.g. a "centennial" at year 50 (or 100) with a legacy summary, or optional goals (a distinguished school, a Nobel-equivalent, a title in every sport) that surface as a "history in the making" panel. Shorten the default arc to ~30 years if that is what the content supports.
- *Scope*: (a) medium in `rivalsSystem.ts` + the faculty lifecycle; (b) small-medium UI plus a goals list.
- *Affects*: rivals, prestige, faculty, History.

**C4. Make research produce and report something.**
- *Problem*: 0.5–3.4% weekly output chance; 61–74 reports of "nothing publishable" per run; 9 breakthroughs and 1 prize in 40 years; standing read by nothing.
- *Why*: the most frequent interrupt is the least rewarding, and the mid-game loop the docs intend research to be doesn't exist.
- *Solution*: guarantee output (a Funded Project always publishes; a Program always banks at least one breakthrough chance roll per year with a stated probability); show expected outputs on the offer; report only when there is an output or award, log the rest; let publications and prizes reach the applicant funnel and the candidate market with a *label*; fold research standing into prestige or the pool instead of ranking it separately.
- *Scope*: small-medium in `researchSystem.ts`, `researchData.ts`, `ResearchTab.tsx`, `InterruptModal.tsx`.
- *Affects*: research, events, admissions cohorts, prestige.

**C5. Explain prestige.**
- *Problem*: the headline number has no breakdown anywhere.
- *Solution*: a Standing panel (History tab or its own) with the six inputs, the two multipliers, target vs today, and last year's movers. Read-only.
- *Scope*: small. Everything is already exported from `prestigeSystem.ts`.

### High priority — substantial improvements to fun, strategy, progression, usability

**H1. The first year.** A scripted opening (three or four interrupts: welcome, develop the core, house your students, hire for the school you want), the tier-1 pool grouped by school with the hall as the goal, a "next step" line in the toolbar. Small-medium; touches `eventSystem.ts`, `CurriculumTab.tsx`, the toolbar.

**H2. Curriculum texture and a breadth-vs-depth choice.** Author a handful of per-major effects (a cohort pull, a grant rate, a satisfaction bonus, a two-field prerequisite) so courses differ; add a concentration term to `curriculumBreadthScore` so a distinguished *school* is worth more than six scattered programs; replace the eight description templates with authored one-liners for the 336 courses (content work, not code). Medium; `techData.ts`, `prestigeSystem.ts`.

**H3. Faculty lifecycle.** Retirement, poaching by rank, retention negotiation, and a person page that narrates a career. Medium; `facultySystem.ts`, a new event or two, the Faculty tab.

**H4. Event table rebalance and authoring.** Fix the five dominant choices; let events touch prestige *inputs* through durable state (a scandal that costs a program its distinguished status for a year; a donor who funds a chair); scale capital-style events (boiler, roof) to the building's cost rather than opex; add ten events that read state the way `ad-shortage` does. Small-medium; `eventData.ts`.

**H5. Feedback surfaces.** Year-over-year on the summer reveal; year-in-review at summer; diagnosis-to-fix links; toasts; tooltips on every dot and chip. Small each; `InterruptModal.tsx`, `StudentLifeTab.tsx`, `LogTicker.tsx`.

**H6. Athletics reaches the economy.** Ticket revenue from venues scaled by team quality and enrollment; a title moves the athlete cohort and a donor event; the varsity petition becomes a tab action with a cost rather than a deterministic interrupt. Small-medium; `athleticsSystem.ts`, `financeSystem.ts`, `eventSystem.ts`.

**H7. Time controls for real players.** 4× and "advance to next event" for everyone; sandbox fast stays gated. Small; `useGame.ts`, `StatusHeader.tsx`.

**H8. Modal layout.** Three modal widths; the annual report as a page; the milestone burst as one card per milestone in a wide grid; the admissions form wider with last-year values. Small-medium; CSS and `InterruptModal.tsx`.

### Medium priority

- **M1. Campus map reads the sim**: pedestrians by enrollment, full-dorm and queue glyphs, night/season tint. Adjacency effects only after the map has something to say. Medium; `CampusMap.tsx`.
- **M2. Student life with teeth**: cap the social bonus per *type* rather than in aggregate so a club still counts; let a Greek scandal cost applicants; make membership read into something (a club with 500 members petitions for a room). Small; `studentLifeData.ts`, `satisfactionSystem.ts`.
- **M3. Demands that fire**: threshold 60 rather than 45, and a demand can target *quality* (a D-graded major) not only coverage. Small; `demandData.ts`, `demandSystem.ts`.
- **M4. Graduate programs as distinct things**: Medicine needs the hospital *and* a clinical faculty; Law has a bar-passage reading that feeds the pre-professional pull; doctoral programs consume research output. Reduce six to three or four. Medium; `techData.ts`.
- **M5. Faculty board usability**: sort/filter, a "short" filter, a person page, links from demand sentences to courses. Small-medium; `FacultyTab.tsx`.
- **M6. Curriculum "what next" tools**: closest-to-milestone, would-raise-a-hall, ready-and-affordable filter. Small; `CurriculumTab.tsx`.
- **M7. Naming rights for BLDG-MED/LAW**; the naming donor becomes a recurring character. Small.
- **M8. Save slots and an escape menu.** Small.
- **M9. Doc/code reconciliation** on satisfaction denominators and the stale counts. Small, and worth doing before any rebalance.

### Future ideas — worthwhile, not now

- Match simulation and fixtures; a per-sport season record.
- Deans, a board of trustees, a CFO with a veto.
- Terrain and water; rowing; a golf course you cannot afford the land for.
- Camera rotation and tilt.
- Menus as physical objects (ledger, clipboard, chalkboard) — the canvas exists.
- Sound and music.
- A student-of-note event stream (no student sim).
- Multiple campuses or a satellite campus as the late-game sink.

---

## If I only made 10 changes to UniSchool from this review, I would investigate these first

1. **Cap intake by capacity and make the marginal student cost something** (C1). Every other tradeoff in the game is downstream of this.
2. **Restructure instruction cost and re-fit the economy so surplus stays thin at every stage** (C2). Money has to be the throttle past year 5.
3. **Rivals that defend the top and poach your people** (C3a + H3). Makes rank a thing you hold and gives the faculty roster stakes.
4. **A concentration term in prestige and per-major identity effects** (H2). Lets two players build two different universities.
5. **Research that always produces something visible, with the odds shown before commitment, and no reports of nothing** (C4).
6. **A prestige breakdown panel** (C5). The headline number must be explainable.
7. **A scripted first year and a tier-1 pool grouped by school** (H1). The first hour decides whether anyone sees year 8.
8. **Year-over-year on the summer reveal and a year-in-review at each summer** (H5). The game's best beat becomes its best explainer.
9. **Faculty retirement, poaching and retention with a person page** (H3). The identity feature, built on state that already exists.
10. **Athletics and student life reaching the economy and the applicant pool with labels** (H6, M2), so that the best-built chain in the game ends somewhere a player can feel.

Not on the list, deliberately: the map's visual polish, camera rotation, more sports, more dorm rungs, more graduate programs, and more save migrations. The game does not need more things. It needs the things it has to push back, connect, and end.

---

## Appendix A — Measurements from the self-directed 40-year run

Policy: price at 90% of tolerance; admit `clamp(1.35 − prestige/100, 0.08, 0.65)`; develop everything affordable cheapest-tier-first with a four-week-opex buffer; build every facility rung when its attribute is under 80; keep beds at 35% of enrolled; commission the deepest affordable research in every idle lab without gutting a department; grant every petition; fill every chair; campaigns with surplus. Seed 4242.

| Year | Cash | Enrolled / beds | Prestige | Rank | Opex/wk | Net/wk | Sat. | Courses | Faculty | Tuition | Admit | Applicants | Actions | Modals |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $349k | 999 / 350 | 51 | 55 | $121k | $175k | 81 | 22 | 26 | $16.0k | 65% | 1,132 | 49 | 1 |
| 4 | $3.3M | 4,376 / 1,350 | 53 | 55 | $813k | $553k | 97 | 106 | 37 | $16.5k | 65% | 2,655 | 37 | 9 |
| 8 | $14.1M | 13,760 / 2,350 | 65 | 44 | $4.0M | $796k | 74 | 219 | 57 | $19.0k | 65% | 6,220 | 8 | 6 |
| 12 | $38.3M | 39,806 / 4,350 | 84 | 15 | $16.5M | $238k | 85 | 350 | 68 | $23.0k | 51% | 29,260 | 33 | 7 |
| 16 | $59.4M | 72,862 / 5,350 | 103 | 6 | $32.9M | $2.8M | 62 | 393 | 71 | $27.0k | 32% | 69,938 | 4 | 6 |
| 18 | $162M | 86,896 / 6,350 | 113 | **1** | $40.5M | $5.9M | 63 | 404 | 72 | $29.5k | 22% | 103,571 | 14 | 7 |
| 22 | $258M | 67,369 / 9,350 | 127 | 1 | $33.8M | $6.7M | 77 | **421** | 73 | $32.5k | 8% | 156,095 | 10 | 5 |
| 30 | $720M | 71,922 / 29,430 | 142 | 1 | $37.0M | $12.7M | 96 | 421 | 73 | $35.5k | 8% | 225,978 | 11 | 8 |
| 40 | $1.96B | 72,908 / 29,430 | 148 | 1 | $37.5M | $21.1M | 94 | 421 | 73 | $37.0k | 8% | 223,905 | 7 | 8 |

Firsts (game-years): dorm 1.0 · school hall 2.7 · club 3.0 · program established 3.8 · lab 4.4 · program distinguished 4.4 · charter 4.7 · initiative 5.6 · **rankings entry 7.5** · varsity team 8.8 · AD 8.8 · school distinguished 10.3 · first grad course 11.8 · first title 14.9 · all 384 undergrad courses 16.2 · prestige 100 16.6 · first grad program 18.0 · **all 421 courses 21.8** · first prize 23.7 · first campaign 24.7 · last placeable 28.8.

Modals over 40 years: admissions 40 · annual report 33 · **research-complete 61** · decision event 38 · milestone 30 · championship 18 · rankings-entry 1 · charter 1 · athletic director 1 — **223 total, 5.6 a year**. Weeks in the red: 0. Minimum cash: $325k (year 1).

Year-40 income statement: tuition $51.5M/wk, endowment payout $7.0M/wk, reputation dividend $2.6k/wk; instruction $33.5M/wk, seat upkeep $0.7M, academic upkeep $0.6M, campus upkeep $0.24M, salaries $0.20M. Endowment $9.16B; campaign #21 priced at $3.38B for an 8% match.

## Appendix B — Where the numbers in this review come from

- Content: `src/data/techData.ts`, `facilitiesData.ts`, `campusData.ts`, `eventData.ts`, `demandData.ts`, `studentLifeData.ts`, `researchData.ts`, `researchTopics.ts`, `facultyData.ts`, `rivalData.ts`, `foundingData.ts`, `moneyScale.ts`, `courseQuality.ts`.
- Formulas: `src/systems/prestige/prestigeSystem.ts` (`computePrestigeTarget`, weights 90/30/24/22/12/18, baseline 32, drift 0.0025), `finance/financeSystem.ts` (`instructionCostPerStudent` = 38 + 1.00 × done courses; endowment campaign cost 2M × 1.45ⁿ, match decay 0.88ⁿ), `admissions/admissionsSystem.ts` (pool logistic ceiling 260,000, price tolerance 5,500 + 240 × prestige, word of mouth ±0.45, capacity factor floor 0.35 at 6,000 beds), `satisfaction/satisfactionSystem.ts` (weights 20/24/30/11/15, floor 12, ratios against enrolled), `events/eventSystem.ts` (first year 3, 3%/week, cooldown 20, repeat 156).
- The sim: `npm run sim` on this commit (six strategies, 40 years, seed 12345).
- The self-directed run and the browser sessions: scripts kept outside the repository; every figure above is reproducible from the reducer with the policy stated in Appendix A.
