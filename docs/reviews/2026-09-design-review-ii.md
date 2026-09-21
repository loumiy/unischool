# UniSchool — Design review II, September 2026

*A second design review, of the game as it stands at commit `eb3ea40` (Plan 21 landed). It follows the [September 2026 design review](2026-09-design-review.md) and takes that review's findings as read: where one of them has been answered by Plans 14–21 it says so and moves on. Like the first, it is a review of the design and the player's experience, not of the code, and it is deliberately candid.*

**What prompted it.** A fifty-year playthrough by the game's designer, with notes. The notes are answered first, in Part I, each against what the code actually does, because several of them are measurements the harness can confirm or correct. Part II is the review proper.

**How this review was done.** The design and architecture docs, the plans since the last review (14–21), and every system, data file, tab and component the notes touch were read. Then the game was played three ways:

1. **`npm run sim`**, the ten scripted strategies over forty years, and **`npm run endpoint`**, the four reference archetypes to fifty, on this commit.
2. **A fifty-year probe through the real reducer** under the *Earnest completionist*, *Selective college* and *Regional engine* strategies (seed 12345), recording every year: actions taken, the catalogue and the halls, every free hall slot, the athletics pot and which side of the funded line each program sat on, endowment campaigns launched, and every log line that would have become a toast, by topic and by week. The script is not committed; every figure below is reproducible from `play()` in `sim/balanceSim.ts` with the readings named in Appendix A.
3. **A year-30 Earnest-completionist save loaded into the browser**, to look at the Athletics, Curriculum, Research, Student Life and History tabs as a player would, and to measure how tall each one is.

Numbers below are from those runs. Where a number depends on the seed or the policy it is marked as one run's reading.

---

## Executive summary

The sequence since the first review did what it set out to do, and the game is much better for it. Growth costs something now (the Earnest completionist spends 312 weeks in the red where the old completionist spent none); the tier-1 wall is gone and the founding college teaches; the summer has four beats and a year in review; prestige can fall; there is a final report, seven graded axes, a name, and twenty ambitions; athletics has a department, a pot, a priority list, occasions, rivals, a market with faces, and reaches the applicant pool and the legacy. The institutional feel the first review said to protect has been protected and extended.

The playthrough's central finding is right, and the harness confirms it: **the run is over at about year 27, of fifty.** In the reference completionist run, rank #1 lands in year 13, every hall stands by year 26, the catalogue is at 98% by year 28, and prestige reaches its ceiling of 150 by year 30 — after which twenty years pass at eight to twenty actions a year, almost all of them restarting research and launching endowment campaigns. The design target was a *build* era to year 35 and a *defend* era in which the field closes on the leader. Neither happens: the build era finishes ten years early, and the defend era has nothing to defend, because the leader sits fifty points above the elite band and the band is written so that it can never pass a leader who is standing still.

Beneath that, the notes describe five smaller things, and each is what the notes say it is, with a cause the code names:

- **Prestige is explained descriptively, never prescriptively.** The Standing panel says what each term reads; nothing on any screen says what to do about it, the toolbar chip's tooltip is the single word "Prestige", and the next-step line never mentions it.
- **Health arrives as a need and a fix on the same day.** Below 1,500 students the attribute is dormant; at 1,500 the score drops to the floor and the building that fixes it appears in the menu for the first time, fourteen weeks and $560k away. The score is 12, not 0 — the "0" is the coverage line — but the unfairness is the sequencing, not the number.
- **Every team is a flagship** because the pot outgrows the cost of competing by year 26 and stays there. The bands were designed to be descriptive, with "about a quarter fully funded at mid-game" as the target; the actual reading is ten of ten, with $3M a year of surplus returned to the school. Plan 21 named this brake as the one to measure, and the sim never measured it.
- **The research toast stream is what the notes say**: 100–135 toastable lines a year from year 30 on, and ten to twenty-five weeks a year in which three or more arrive together.
- **The academic hall chain has 33 more slots than there are programs** — five and a half halls' worth — and nothing in the build menu says which halls are empty.

The recommendations at the end are ordered. The single most valuable thing to do next is to **make the last twenty years a game**: shorten the horizon to forty, and give the defend era a problem — a faculty that retires, rivals that can actually pass you, a research economy with visible output — so that a school at the top has something to hold and someone to hold it against.

---

# Part I — The playthrough notes, answered

Each note is quoted in brief, then answered against the code and the harness.

## 1. "Everything was built by year 27; from there it is waiting around. Pull the horizon back, add late-game content, or both."

**Confirmed, and it is both.** The reference runs on this commit:

| Reading (Earnest completionist, seed 12345) | Year |
|---|---|
| Rank #1 | 13 |
| Every academic hall standing (14 of 14) | 26 |
| Catalogue at 98% (419 of 427; the last eight are the Music and Studio Art capstones, behind the performing arts center and the gallery the scripted player never builds) | 28 |
| All nine graduate programs founded | 28 |
| Prestige at its ceiling (150) | 30 |
| Last venue, last dorm rung, last facility | 26–30 |
| Ambitions reached at 50 | 17 of 20 |

From year 30 to 50 the run took **8 to 20 actions a year**. Twenty-one endowment campaigns were launched over the run, twelve of them by year 28; the endowment closes at $14.6B and cash oscillates between $0.4B and $3.2B depending on whether a campaign just fired. The toolbar's next-step line at year 31 reads *"Civil Engineering Labs is idle — commission research"* — which is the last rung of the guidance ladder, and it is what the late game is: waiting for a project to finish so the line can say it again.

The *Selective college* is worse in the same shape: 197 of 427 courses by year 18 and then **zero to eight actions a year for thirty-two years**. The *Balanced builder* is at 416 courses by year 28 and averages 9.7 actions a year in its last decade.

The design ([progression.md](../design/progression.md), "The fifty years") targets a build era to 35 and calls completing every school "*barely* possible in the window". It is comfortably possible by 28, and the endpoint gate (`test/endpoint.test.ts`) asserts a state — every hall built, 90% of the catalogue, #1 reached, all but three ambitions — that is the arc finishing early, pinned as correct.

**Why the defend era does not defend.** Three facts together:

- Prestige is clamped at 150 (`prestigeSystem.ts`) and the completionist reaches it by year 30.
- The elite rivals are authored at 87–99 and the closing term pulls them toward the leader *less a gap*, and explicitly never past: "*an elite rival below the leader rises no closer than this in a year — it chases, it does not overtake. A rival passes the leader in one way only: the leader falls into the band*" (`rivalsSystem.ts`).
- The board's response event ('rival-passed') therefore never fires in a well-run late game; the endpoint gate reads "years 40–50 at #1: 11 of 11" on every seed.

So the one mechanism the era rests on — "*holding the top only means anything because prestige can now fall*" — has nothing to push it. A school at 150 with an A on every axis cannot lose anything by doing nothing, and the run knows it.

**The recommendation is both, in this proportion:** shorten the horizon to **forty years** (the eras become 1–10, 10–28, 28–40, which is where the reference runs actually land), *and* give the last era a problem. What the problem should be is Part II §1 and the recommendations; the short version is that the game already has the material — a faculty hired in years 3–8 who will be sixty-five by year 35, a field of rivals with names, a research economy that produces nothing a player can see — and none of it is connected to a decision yet.

**A second dead zone the notes did not hit, for the record.** The Earnest completionist sits in the red from year 13 to year 20 (minimum cash −$37.7M) and takes **zero actions in years 14 through 20**. That is Plan 15 working as designed — growth has a cost — but seven years of nothing startable is the same experience as the late game with a different cause, and a human who expands as fast as the scripted one would see it. The Balanced builder avoids it (23 red weeks). It is a pacing cliff at the other end of the arc and it wants a floor of its own: a year in the red should be a year of hard choices, not a year of the clock running.

## 2. "Prestige is still not well explained. It is the thing holding you back early, but it is not clear what to do about it."

**Confirmed.** Everything the game says about prestige is descriptive. Every surface, read:

- The toolbar chip: `title="Prestige"`. That is the entire hover.
- The History tab's Standing panel (present from year one): a bar per term with a live detail sentence — *"No school founded yet — six programs of one school in one hall found it, and finishing every one of them distinguishes it."*, *"Students have averaged 68 of 100 this year; 40 earns nothing and 80 pays in full."* These are good sentences. None of them is an instruction, and the panel is two tabs and a scroll away from the number.
- The summer reveal attributes the applicant pool's *change* to prestige, price, word of mouth, beds — but only from the second summer (there is no attribution without a last funnel), and never the *level*: nothing says "prestige 51 draws about 7,000 applicants; 61 would draw twice that".
- The next-step line has four readings — a free hall slot, a program one course from established, a satisfaction shortfall, an idle lab — and none of them names prestige. The opening letters never use the word.

The mechanics the player is trying to feel: the applicant pool roughly **doubles for every ten points of prestige** in the early range (a logistic with midpoint 103), price tolerance is 5,500 + 240 × prestige, and prestige's biggest early terms are curriculum breadth (weight 50, multiplied by library adequacy), concentration (30, founding and distinguishing a school), and teaching (30, the campus average grade). A founding school starts at 51.5 against a baseline of 32, so early on the *target* is usually below the *current* number and the player is watching a stock drift down while being told nothing.

What is missing is one prescriptive sentence at the point of the number: *"Prestige 54, grading toward 57. The biggest thing you could do for it this year: found a school (six Business programs in Business Hall — two to go)."* The Standing panel already computes which term has the most headroom; it just never says so. §2 in Part II.

## 3. "Before the first health facility appears, health satisfaction is stuck at 0 and there is nothing you can do about it."

**Confirmed in effect, with one correction.** Below 1,500 students the health attribute is *dormant*: it scores 100, the dial shows "–" and the coverage line reads "Not yet a need". The summer that crosses 1,500, the score drops to the floor of **12** (not 0 — the "0" is the coverage line, "0 / 1,500 served"), the prestige crowding penalty starts reading health, and the Health & Counseling Center appears in the build menu *for the first time*, because its unlock is the same 1,500 and locked Buildables are hidden entirely. It costs $560k and takes fourteen weeks, at a stage where cash is a few million.

So the need and its fix arrive on the same day with no lead time, and the next-step line immediately says *"Health is at 12 — build for it"* for a shortfall the player could not have prevented. There *is* an ungated path — the Gym, Pool and Tennis Courts all serve health with no population gate — but they hide behind the Recreation Center, cost three times as much, and nothing tells the player they count.

The fix is sequencing, not a number: reveal the health center a year before the need (at ~1,000 students, with the description it already carries, "*only needed once the campus crosses 1,500*"), or let the attribute ramp in over a year rather than switch. §4 in Part II.

## 4. "More academic halls than a player would ever need; I built five extra empty ones."

**Confirmed, and by design.** Fourteen halls of six slots is **84 slots for 51 programs** (42 majors, 9 graduate). [curriculum.md](../design/curriculum.md) says why: "*a second hall for each of the seven schools, for the nine graduate programs*" — every school needs a second hall because its first is full, and the nine graduate programs then occupy nine of the forty-two new slots. The 33 spare slots are five and a half halls of nothing, and the reference completionist ends with exactly 33 free slots and 14 of 14 halls standing.

The chain is strictly sequential with no gate past the first rung, the build menu's tile says only "6 program slots", and the group never reads `s.halls` — so it cannot say a hall is empty, and the guidance line only ever pushes the other way ("*Elm Hall has a free slot*"). Meanwhile a hall grants nothing but slots: no capacity, no reputation, no rooms.

Two honest options: **a smaller hall for graduate programs** (a three-slot "graduate wing" the school's second hall could be, in place of two full rungs), or **gate the chain on need** — the next hall appears only when every standing hall has at most one free slot. Either way the build menu should show occupancy ("Elm Hall · 4 of 6 housed") the way the map's pips already do. §5 in Part II.

## 5. "Athletics still feels like an afterthought. Every team was a flagship; unexplained numbers like a coach's age; everything is a full-width panel; games are not often enough."

All four confirmed.

**Flagship.** A band is not a property of a team; it is which side of the funded line the program sits on, recomputed each read: fully funded → *flagship*, partly → *competitive*, unfunded → *developmental*. The pot is subsidy plus gate. The costs to compete are $120k (Olympic), $450k (revenue sport), $1.2M (football); the subsidy tiers are $300k / $750k / $1.5M. So the *medium* subsidy alone fully funds six Olympic programs before a single ticket is sold, and once the gate is $4M a year (a 33,000-student school with a stadium) the line is above every program forever. In the reference run the department is 8 of 8 flagship at year 26 and 10 of 10 from year 30, with $2.3–3.0M a year "returned to the school". The *Selective college*, a 6,000-student school, is 9 of 9 flagship on a $1.46M pot. Plan 21 set "about a quarter fully funded at mid-game" as the tuning target and asked that the first balance run report the funded line at years 15, 25 and 40 — "*if it only ever moves down, a brake is missing*". The sim does not report it, and the brake is missing. On screen, when everything is funded the "money runs out here" divider is not drawn and no sentence replaces it, so the player sees twelve identical pills and no cause.

**The numbers.** A staff row reads *"Caroline Turner · quality 70 · ceiling 70 · 56 · $147,000/yr"*. The 56 is her age, unlabelled. Age counts one a year and forces retirement at 65; it does not move quality. The athletic director never ages. Team quality (0–100) is shown as "quality 72" with no scale and is never placed beside a rival's.

**The layout.** The team list was written as a grid — the CSS comment says "*A GRID, not a column. Eighteen sports can be fielded, and a single scrolling column of eighteen cards is a list you page through rather than a department you take in*" — and the drag-and-drop priority list, added later, overrides it back to a single column. At 1600×1000 the tab shows three and a half team cards per screen; nine programs make it 1,722px tall, eighteen would be twice that. The Faculty tab's card grid and department board are the precedent to follow.

**Cadence.** Every sport plays on the same three weeks — 8, 20, 32 — plus an eight-team bracket in week 47, so a season is three dated results and no schedule, and a twelve-team department produces twelve log lines at once three times a year. There is no fall, winter or spring; the gate assumes six home dates it never plays. Results are log lines only (the 'team' topic is not toastable), so at speed a season passes unseen.

**Championships.** Strength is one number, `teamQuality`, from three coaches (head 50%), the director (8%), the funded bonus (+10) and the field house (+3), against a rival's per-sport strength; a game is an Elo logistic with a 25-point spread. The levers are real — hire better coaches, fund the program, expand the venue, build the field house — but the screen never shows the odds, the strength gap, or the bracket, and never says which lever is short. The Research tab prints "breakthrough 34% · award 12%" before a commitment; the Athletics tab has no equivalent. Titles over forty years on this commit: Earnest completionist 4, Balanced 0, Selective 0, Completionist 0.

**Venue upgrades.** Each venue expands in place twice (+50% seats each); the sprite, footprint and height are identical at zero, one and two expansions. The stands, scoreboard and press box the motifs draw are the same at 40,000 seats and 60,000. The only evidence is a sentence in the building panel.

§3 in Part II takes these together.

## 6. "The research toasts are too much — four or five a week late game. That is what the log is for."

**Confirmed.** Toastable topics are course, building, program, petition, publication, candidate and research-concluded; there is no per-topic throttle and no coalescing, only a stack of five. A publication fires every 90 points of banked output across up to thirteen concurrent initiatives, and every fourth publication also pulls a candidate onto the market, which is a second toast. The reference run from year 30: **publications 27–89 a year, candidates 4–31, concluded projects 5–15** — 100 to 135 toastable lines a year, an average of two to three a week, and **10 to 25 weeks a year in which three or more arrive in the same week**. Grants and breakthroughs, the two research lines a player would actually want a glance at, are log-only.

The rule that should replace it: **a toast is for a thing that changes what the player might do next.** A paper does not; a breakthrough, a grant, a prize and a project ending do. Papers belong in the log and on the building (§7). §6 in Part II.

## 7. "The curriculum tab should let you collapse each school."

**Confirmed.** The tab is a flat, always-expanded tree — school → program row → nine cells — with no collapse state anywhere in it. At 419 courses it renders **7,668px tall** at 1600×1000: four and a half program rows per screen, fifty-one rows, eleven screens. The Build popup already has a real accordion (`BuiltSummaryTile`, aria-expanded, a collapse threshold), which is the pattern. Collapse a school to its header line — mark, name, grade, done/total — and remember which are open; a school at 59/59 should collapse itself. The scroll-to-school affordance the tab already has needs to open the school it scrolls to.

## 8. "Athletic facility upgrades should be visualised; research should be visualised on the research buildings."

Both are true and both have hooks. Nothing about an active project is drawn on the map (`initiative` does not appear in `CampusMap.tsx`), but the per-building overlay layer exists: the construction progress bar along a site's front edge, the completion pulse ring, the inspected halo, and the academic halls' slot pips with their blocked ring and "program on offer" flag. A research ring on a lab (`ProgressRing` exists in `Progress.tsx`), a pulse on a paper and a burst on a breakthrough is the same layer with a different reader — and it is where the research feedback the toasts are carrying should go. For venues, the motifs already draw stands and a scoreboard; an expansion count is one more parameter to the ground marking. §7 in Part II.

## 9. "The camera rotation could use smoothing."

The rotation is four fixed azimuths a quarter turn apart and three pitches, and a turn is one React re-render with no tween — deliberately: "*No animation between views, on purpose — the motifs are drawn for the pixel grid of those views, and the angles in between are not worth the frames*". That reasoning holds for a true rotation (a hand-drawn dimetric building at 37° would look wrong), so the smoothing should not be a rotation. Two things would take the jolt out without drawing an in-between angle: a **~180ms crossfade** between the old and new frames, and a **pan-and-zoom swing** (the old frame eases out a few pixels in the direction of the turn while the new one eases in), both of which the keyboard pan's existing `requestAnimationFrame` loop can drive. Cheap, and worth it; the first review put camera rotation in the "not on the list" bucket and this review keeps it low, but it is a polish item that will keep coming up because Q/E are the most-pressed keys on the map.

---

# Part II — The review

## 1. The arc: three eras, one of which exists

The first review's headline was that the arc ended at year 20 of an endless sandbox. Plans 15 and 17 answered it by making growth cost something and putting an end at fifty. The arc now ends at 27 of fifty, which is better in the way that matters — there is a report, and it grades — and the same in the way the notes describe.

**The found era works.** Years 1–10 are the best stretch of the game: the founding college teaches, the letters say what to do, the first hall waits on eight developed courses, a school founds itself out of six programs in one hall, the rankings entry lands around year 7, and money is tight enough that the order matters. 107 actions in year 8 of the reference run, 59 in year 10.

**The build era finishes early and is fragile at the front.** The completionist's year 12–21 stall (§I.1) and the year 26–28 completion are the two ends of the same problem: the era is paced by cash, cash is paced by enrollment, and enrollment is capped by seats — so a school that seats itself fast hits the wall hard and then, once the tuition catches up, finishes everything in five years. The intended "*barely possible by 35*" wants either more to build or slower building; the recommendations prefer more to build, of a kind that is not another rung.

**The defend era does not exist.** It needs three things it does not have:

1. **Something that can take rank.** The elite band closes and never passes. Make it able to pass a leader who coasts — the band's ceiling should be the leader's *target*, not the leader's *current number less a gap* — and let one or two of the ten be *movers*, authored to climb whether or not the player does. Then "prestige can fall" has a consequence.
2. **Something that falls without action.** Today nothing decays. A faculty hired in year 4 retires at some point; a building ages; a program's grade drifts as its star retires and the survey course is handed to a new assistant. **The faculty lifecycle plan that BACKLOG.md names as next is the defend era's content**, and the review would go further than the backlog does: retirement is not optional. A roster whose founding cohort reaches sixty-five between years 30 and 40 is a late-game problem the game already stores everything for, and a *person page* to read it on.
3. **Something to spend on that is a decision.** The endowment campaign is one button and one number, twenty-one times. The research funding line is the only late sink with a choice in it (topic, team, depth) and its output is invisible. A late game whose money buys *endowed chairs* (a retention lever with a name on it), *named professorships*, *a hospital that changes the medical school*, and *a research institute* that is a building with a standing of its own would spend the same cash on things a player can point at.

**On the horizon.** Forty years is the right length for the game as it is, and the eras the reference runs actually produce are 1–10, 10–28, 28–40. Move `SEMICENTENNIAL_YEAR` and the two year-fifty ambitions, re-record the reference envelope, and rename the beat. If the three items above land, fifty becomes right again — the horizon is a dial, and it should follow the content rather than wait for it.

## 2. Prestige: the one number, and what to do about it

The formula is fine and the Standing panel is a good diagnostic. What the notes ask for is an *actionable* reading, and there are three places to put one:

- **The chip.** The toolbar's prestige number should carry a two-line hover: the target and the trend (*"149 → 149.2 at the summer"*), and the one term with the most headroom, phrased as an action (*"Most room: teaching — three courses graded C in Business"*). The panel already computes headroom per term; this is a sentence on top.
- **The next-step line.** Add a fifth reading, below the shortfall and above the idle lab: the largest prestige term that a single action would move, with the action. Early it will say *"found a school"*; mid it will say *"distinguish Finance — one course to go"* (which the existing `nearlyEstablished` reading nearly says); late it will say *"library adequacy is 0.7 — a floor would lift breadth"*.
- **The first summer's reveal.** State the level relationship once, in the summer that has no last-summer to compare against: *"Prestige 52 drew 6,800 applicants. Ten points more would draw about twice as many."* The pool is a logistic; the sentence is honest at every point on it.

The second thing the notes describe — that early on "you want money, so you want applicants, and prestige holds you back" — is exactly the loop the design wants, and it would read as a loop if the summer named it as one. The Enrollment tab's *"Prestige and price set its size"* is the right sentence in the wrong tab.

## 3. Athletics: a system with everything but a game in it

Plan 21 built the department the first review asked for: a pot that grows with the gate, a priority list, a market with a shape, occasions, a rival per sport, a scandal, a title that reaches the applicant pool and the legacy. The bones are right. Four things keep it from being the strong system the notes want, and they are ordered by how much they would change.

**3a. The funded line has to bite.** The single most important fix, and a constants change plus a measurement. The costs to compete are an order of magnitude below the pot for any school past 10,000 students. Either scale the cost to compete with the school (a program at a 30,000-student school with a stadium competes against schools of that size, and it costs what they spend), or scale it with the sport's field (the top of the sport's table sets the price of competing at the top), or both — and re-fit so that the reference completionist funds **three to five of ten** at year 30, not ten. Report the funded line at 15/25/40 in `npm run sim`'s athletics summary, which Plan 21 asked for and did not get. When the line bites, the priority list becomes the decision it was built to be, the coach market's "above the line" gate means something, and the three bands stop being one.

**3b. Seasons.** Give each sport a season — fall, winter, spring — and a handful of dated home and away results across it, not three shared weeks. This is the cadence the notes ask for and it need not be a fixture generator: six to ten results per sport per year, drawn from the sport's table near the team's place, written as the log lines PR N already writes, with the bracket at the season's end rather than everyone's week 47. Football on Saturdays in the fall, basketball through the winter, baseball in the spring is the whole of what "mimic real schedules" needs; it also spreads the department's noise across the year instead of stacking it three times, and it gives the gate its six home dates honestly. A week with a home game is a week the map could show a crowd at the venue.

**3c. Say the odds.** On each team card: strength against the sport's field (*"72 — 4th of 100; the leader is 88"*), the bracket odds the Elo already implies (*"reaches the eight: 61% · title: 9%"*), and the lever that is short (*"head coach 50 is the weakest chair — a 70 here is +10"*). The Research tab's odds line is the precedent. This is the whole answer to "*what am I supposed to do to raise the odds*": the levers exist, they are invisible.

**3d. The screen.** Restore the grid. The staff rows are the card's height; fold them behind the head coach line (*"Head coach Turner 70 · assistant 57 · trainer 52"*) and open a card to see the chairs. Label the age (*"age 56 · retires in 9"*), or drop it from the row and keep it in the market where it already has a tooltip. When everything is funded, draw the line at the bottom and say so: *"Every program is fully funded; $2.3M returned to the school."* — which is, on this commit, the sentence that would have told the designer why every team was a flagship.

**3e. Venues that grow.** Expansions are the library renovation's idiom, and the library gains a storey when it renovates; the venues should gain a tier of stands. The ground-marking dispatch takes a facility type and a tier already; it needs the expansion count, and one more ring of seats per expansion on the bowl, a second deck on the arena's hangar, a scoreboard that appears at the first expansion. Cheap, visible, and it makes a $3M decision show.

**3f. Petitions are the modal load now.** The first review's biggest modal complaint was research reports of nothing; Plan 15 fixed it. The replacement is the varsity petition: 93 of 133 decision events in the reference completionist run, 40 of 78 for the selective college, 51 of 87 for the curriculum rush — every sport club re-petitions every three years for the whole run. A club that has been declined twice should stop asking, or ask through the summer digest (where clubs are already answered in one beat) rather than a stop-the-clock modal each.

## 4. Satisfaction and the reveal of needs

The five-attribute model is the clearest diagnostic in the game, and the dormancy rule (a need does not exist until the campus is big enough to have it) is right. The health case (§I.3) is a reveal-timing bug in an otherwise good system, and the same pattern should be checked for every gated need: the fix should be *buildable* a year before the need *bites*, and the need should ramp rather than switch. Concretely: unlock at two-thirds of the population gate, ramp the target from 0 to full over the year after the gate, and show the dormant dial as a countdown (*"Health — a need from 1,500 students; 1,180 now"*) instead of a dash.

## 5. The catalogue and its halls

The curriculum on the map (Plan 14) and the catalogue (Plan 20) are the largest improvement since the first review. The tab is beautiful at year 8 and a wall at year 30 (§I.7). Collapsible schools are the fix, with the additional rule that a finished school collapses itself.

Halls (§I.4): the honest fix is a **graduate wing** — a smaller, cheaper second building per school with three slots — in place of the second full hall. It removes 21 of the 33 spare slots, makes the graduate programs a visibly different kind of thing on the map (they are described as such and drawn as the same hall), and shortens the chain. Failing that, gate the next rung on occupancy and show occupancy in the menu.

## 6. Noise: the toast policy, restated

The first review asked for toasts so that things happening in quiet weeks were seen. Plan 16 built them and the policy was "what never stops the clock and is still worth a glance". The late game shows the policy needs one more clause: **a toast is for a thing the player might act on.** By that rule:

| Line | Today | Should be |
|---|---|---|
| A paper | toast | log, and a pulse on the lab |
| A candidate pulled by research | toast | toast only if the field is short (the `candidate` topic was for a short field; research's pull bypasses that test) |
| A project concluded with nothing | toast | toast (it frees a lab) |
| A breakthrough | log | toast, and a burst on the lab |
| A grant | log | toast (it is money, and it is the largest late income line after tuition) |
| A prize | log → modal via report | keep |
| A game result | log | log; a crowd on the venue on a home date |
| A varsity petition | modal | summer digest |

And coalesce: a week with four publications is one toast (*"Four papers this week"*), which the stack rule ("five at most") was trying to be.

## 7. The map should show the simulation

The first review's highest-impact visual note — *let the map show the sim* — landed for construction (the progress bar, the completion pulse) and for the halls (the pips). It has not landed for research, athletics or the student body, and the late game is where it would matter most, because the late game is *only* those things. In order of value:

1. **A research ring on every lab** with a project running: the fraction elapsed, in the school's hue; a pulse on a paper, a burst on a breakthrough, a coin on a grant. This is where §6's demoted toasts go, and it is a reason to look at the map in year 35.
2. **A crowd at a venue on a home date**, sized by attendance, and a pennant on a title. The occasions exist; nothing draws them.
3. **Venue expansions that draw** (§3e).
4. **Faculty on the map**: a professor is a person in a room in a building (Plan 14); the day they retire, the window could go dark until the chair is filled.

None of these is a system. They are readers of state the game already keeps, drawn in a layer that already exists.

## 8. What works, and should be protected

- **The founding year.** The letters, the coach card, the first hall gated on eight courses, a school founding itself. The first hour is fixed.
- **The summer.** Four beats, a year in review sorted from the log, the reveal with attribution, the standing beat with the table. The best sequence in the game and it has not been diluted.
- **The final report.** Seven graded axes, a name from an authored table, the founder's four numbers, the fifty-year curves. The ending exists and it is good; the problem is only that the last twenty years before it are empty.
- **The department as a people system.** Coaches with faces, ages, ceilings and horizons; a director; a market that lists by reputation; a poach. The athletics people are now as real as the faculty, and that is the right direction.
- **The institutional record.** Ambitions with years, cohorts with prices, the sealed legacy, the History tab counting up and down.

## 9. Recommendations, in order

**Critical — the run should be fifty (or forty) years long, not twenty-seven.**

1. **Shorten the horizon to forty** now; re-fit the reference envelope; keep the constant one place. (Small.)
2. **The faculty lifecycle, with retirement as a rule, not an option.** Aging, retirement between 62 and 70, poaching by the elite band with a price to keep, endowed chairs as the retention lever, a person page. This is the defend era's content and it is the next plan in the backlog already. (A plan.)
3. **An elite band that can pass a coasting leader.** Close toward the leader's *target*, not their number; two authored movers. Make the board's response fire. (Medium; a rivals PR.)
4. **Make the athletics funded line bite** (§3a) and report it in the sim. (Small constants, one re-fit, one measurement.)

**High — legibility, which the notes are mostly about.**

5. **A prescriptive prestige line** in three places: the chip's hover, a next-step reading, the first summer's sentence (§2).
6. **Seasons and odds for athletics** (§3b, §3c): per-sport calendars with six to ten results, the bracket at season's end, strength and odds on the card.
7. **Reveal a need's fix before the need** (§4), starting with health.
8. **The toast policy's new clause** and coalescing (§6). Papers and research-pulled candidates out; breakthroughs and grants in; petitions to the digest.
9. **Collapsible schools** in the Curriculum tab; finished schools collapse themselves.
10. **The Athletics tab's grid**, folded staff rows, a labelled age, and the "everything is funded" sentence (§3d).

**Medium — the map reads the sim.**

11. Research rings, pulses and bursts on labs (§7.1).
12. Venue expansions that draw (§3e); a crowd on a home date.
13. A graduate wing in place of the second hall, or an occupancy gate on the chain, and occupancy in the build menu (§5).
14. The mid-game money wall: a floor for the completionist's year 13–20 stall — a year in the red should offer a hard choice (a hiring freeze, a tuition surcharge, a mothballed hall), not silence.

**Low — polish that will keep coming up.**

15. Camera turn crossfade and swing (§I.9).
16. `gameplay.md` still says six graded axes; there are seven.

## If I only made five changes from this review

1. Shorten the run to forty years and give the last twelve a faculty that retires and a field that can pass you.
2. Make the athletics funded line bite, and say the odds on the card.
3. One prescriptive prestige sentence, in the chip and in the next-step line.
4. Move papers off the toasts and onto the labs; put grants and breakthroughs on.
5. Collapse the Curriculum tab's schools and restore the Athletics tab's grid.

---

## Appendix A — Measurements

**Reference run: Earnest completionist, seed 12345, fifty years**, read weekly from `play()`'s `onWeek` hook. Toast counts are log lines carrying a toastable topic, deduplicated by `toastKey`.

| Year | Actions | Courses | Halls (free slots) | Flagship / competitive / developmental | Pot (subsidy + gate) | Surplus | Campaigns | Endowment | Cash | Toastable lines (papers · candidates · concluded) | Weeks with ≥3 toasts |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 8 | 107 | 149 | 7 (7) | 1/0/0 | $0.93M (0.75 + 0.18) | $0.81M | 1 | $7M | $9M | — · 22 · 0 | 15 |
| 12 | 5 | 327 | 9 (10) | 4/0/0 | $1.15M | $0.67M | 1 | $7M | $28M | 1 · 6 · 4 | 1 |
| 16 | 0 | 327 | 9 (10) | 4/0/0 | $1.19M | $0.71M | 1 | $7M | −$28M | 0 | 0 |
| 20 | 0 | 327 | 9 (10) | 4/0/0 | $1.19M | $0.71M | 1 | $8M | $19M | 0 | 0 |
| 24 | 35 | 388 | 11 (18) | 5/0/0 | $4.29M (1.5 + 2.79) | $2.61M | 2 | $14M | $238M | 39 · 6 · 12 | 13 |
| 28 | 17 | 419 | 14 (33) | 8/0/0 | $4.19M (0.75 + 3.44) | $2.15M | 12 | $747M | $167M | 74 · 19 · 8 | 15 |
| 32 | 12 | 419 | 14 (33) | 10/0/0 | $5.60M (1.5 + 4.10) | $2.99M | 14 | $1.33B | $440M | 73 · 22 · 8 | 17 |
| 36 | 10 | 419 | 14 (33) | 10/0/0 | $5.67M | $3.06M | 17 | $3.59B | $556M | 89 · 31 · 6 | 25 |
| 40 | 8 | 419 | 14 (33) | 10/0/0 | $5.64M | $3.03M | 19 | $6.86B | $379M | 77 · 17 · 6 | 12 |
| 44 | 8 | 419 | 14 (33) | 10/0/0 | $5.52M | $2.91M | 19 | $7.54B | $2.09B | 81 · 22 · 6 | 20 |
| 48 | 9 | 419 | 14 (33) | 10/0/0 | $5.55M | $2.94M | 20 | $10.67B | $2.36B | 82 · 18 · 11 | 13 |
| 50 | 13 | 419 | 14 (33) | 10/0/0 | $5.52M | $2.91M | 21 | $14.64B | $452M | 67 · 17 · 12 | 15 |

Endpoint (`npm run endpoint`, seed 12345): *a university in full* — breadth A, concentration A, teaching B, research A, reach A, stewardship A, campus life B; first at #1 in year 13; at #1 in 11 of years 40–50; 17 of 20 ambitions; prestige 150.0; 312 weeks in the red.

**Selective college, seed 12345**: 197 of 427 courses by year 18 and 199 at year 50; 10 of 14 halls; 9 of 9 programs flagship on a $1.46M pot from year 20; 0–12 actions a year from year 16 on; two campaigns in fifty years.

**`npm run sim`, forty years, seed 12345** (the strategies the notes are closest to): Balanced builder — 416 courses by 28, 9.7 actions a year in the last decade, 11 teams, 0 titles, 23 of 55 decision events were varsity petitions. Earnest completionist — 21.1 actions a year (10.5 last decade), 7.8 money-blocked weeks a year, 4 titles, 93 of 133 decision events were varsity petitions, grants 23.4% of lifetime opex.

**Screens (year-30 Earnest completionist save, 1600×1000)**: Athletics 1,722px (9 programs); Curriculum 7,668px (419 courses, 51 program rows); Research 1,859px; History 2,356px; Student Life 1,015px.

## Appendix B — Where the numbers come from

- Horizon and legacy: `state/types.ts` (`SEMICENTENNIAL_YEAR`), `state/legacy.ts`, `state/finalReport.ts`, `data/ambitionsData.ts`, `test/endpoint.test.ts`.
- Prestige: `systems/prestige/prestigeSystem.ts` (baseline 32, weights 50/30/30/24/22/20/12/8, crowding −25, clamp 5–150, rise 0.20 / fall 0.30); pool: `systems/admissions/admissionsSystem.ts` (ceiling 260,000, midpoint 103, steepness 0.069; tolerance 5,500 + 240 × prestige).
- Rivals: `systems/rivals/rivalsSystem.ts` (elite closing above 100, gap 8, rate 0.35, no leapfrog), `data/rivalData.ts`.
- Satisfaction: `systems/satisfaction/satisfactionSystem.ts` (weights 20/24/30/11/15, floor 12, health gate 1,500); `data/facilitiesData.ts` (health center $560k / 14 weeks at 1,500; gym, pool, tennis serve health ungated behind the rec center).
- Halls: `data/techData.ts` (14 halls, 6 slots, $750k × 1.3ⁿ, first at 8 courses, then sequential); `docs/design/curriculum.md`.
- Athletics: `data/studentLifeData.ts` (bands from `departmentPot`; costs 120k / 450k / 1.2M; subsidy 300k / 750k / 1.5M; `teamQuality`; coach ages and retirement at 65), `systems/athletics/season.ts` (weeks 8, 20, 32), `playoffs.ts` (week 47, field of 8, spread 25), `gate.ts` (six home dates), `tabs/AthleticsTab.tsx`, `styles.css` (`.team-card-list` vs `.priority-list`), `facilitiesData.ts` (expansions: max 2, +50% seats), `components/buildingSpec.ts` and `groundMarkings.tsx` (motif keyed on type only).
- Toasts: `components/toasts.ts` (seven topics, 3s, stack of 5), `systems/research/researchSystem.ts` (a paper per 90 points; a candidate per four papers and per breakthrough), `docs/architecture/ui-shell.md`.
- Curriculum: `tabs/CurriculumTab.tsx` (no collapse state), `components/BuildPopup.tsx` (the accordion precedent).
- Map: `components/CampusMap.tsx` (progress bar, pulse, halo, hall pips; `turnBy`/`applyCamera`; the keyboard-pan `requestAnimationFrame` loop), `components/Progress.tsx`.
- Petitions: `data/studentLifeData.ts` (`VARSITY_PETITION_MIN_TENURE_YEARS = 3`), `data/eventData.ts` (`VARSITY_PETITION_WEEK`).
