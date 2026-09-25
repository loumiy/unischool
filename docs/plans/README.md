# UniSchool — Plans

A **plan** is a document that takes a pile of notes, an audit, or a brief, and
turns it into an ordered sequence of PRs — each one small enough to land on its
own, each one landing in the order that makes the next one cheaper. Writing one
is how work gets started here.

Almost everything in this folder is a **closed record**. A plan is not a to-do
list and never was: by the time a plan reads `Landed`, the work is in `main`.
The one exception is a plan still reading `Proposed` — the sequence has been
written but no PR has landed — which lives here from the day it is written,
because the sequencing IS the record of the thinking and it is no use filed
anywhere else. A plan that is `Superseded` stays too, unedited below its status
line, for the same reason: Plans 10–13 are the thinking that Plans 14–17 came
out of, and what each one got wrong is recorded in the status line of the plan
that replaced it. Work that has not been sequenced at all lives in `BACKLOG.md` at
the repository root, and the game as it actually is lives in `docs/design/` and
`docs/architecture/`. Three tenses, three homes.

## The plans

| | Plan | Covered | Status |
|---|---|---|---|
| 01 | [Design alignment](01-design-alignment.md) | Making the game execute the intended design, and README an accurate spec of it. PRs A–H. | Landed |
| 02 | [The academic core](02-academic-core.md) | Curriculum, course quality, the faculty roster and research becoming one loop. PRs A–G. | Landed |
| 03 | [Campus assets](03-campus-art.md) | One scale, one detail vocabulary, and a correct depth sort for the campus map. PRs A–G, plus F2 and G2. | Landed |
| 04 | [The shell, research, the roster, and the site](04-shell-research-roster-site.md) | Four phases from a page of playtest notes: the shell, research end to end, the roster, campus art. 23 PRs. | Landed |
| 05 | [Summer admissions](05-summer-admissions.md) | Reworking the annual admissions decision: per-class tuition, scholarships retired, admit rate promoted to a decision, and the reveal. PRs A–G. | Landed |
| 06 | [Enrollment](06-enrollment.md) | The enrolled body's cohort mix, stored per class at admission; Admissions becomes Enrollment and grows the infographic. History untouched. PRs A–E. | Landed |
| 07 | [The startup screen, and the campus vernacular](07-startup-and-vernacular.md) | Retiring the private/public fork, giving the campus a chosen architectural vernacular, and making the founding facade Founders Hall. PRs A–K. | Landed |
| 08 | [Athletics, and the field it plays in](08-athletics-rivals.md) | Athletics V3 and Rival schools as one sequence: a hundred-school field, standing split into three ranked axes, per-sport strength, four more sports, an athletic director, and a playoff whose titles are the first thing athletics moves. Two phases, PRs 1A–1C and 2A–2G. | Landed |
| 09 | [The playtest harness](09-playtest-harness.md) | Scenarios, a debug panel behind a flag, the prestige breakdown, and a sim scorecard with reference bands — the instrumentation the design changes are measured with. PRs A–F. | Landed |
| 10 | [Growth has a cost](10-growth-has-a-cost.md) | Prestige as an asymmetric stock, instruction cost per section, an interim intake ceiling, attrition. | Superseded by Plan 15 |
| 11 | [Academic halls](11-academic-halls.md) | Halls with one room per program, developed continuously from the room's roster. | Superseded by Plan 14 |
| 12 | [The year](12-the-year.md) | The summer as four beats, year-over-year on the reveal, modal widths, a scripted first year, toasts. | Superseded by Plan 16 |
| 13 | [The endpoint](13-the-endpoint.md) | A fifty-year run with ambitions, a legacy and an elite band that closes. | Superseded by Plan 17 |
| 14 | [The curriculum on the map](14-curriculum-on-the-map.md) | Repeatable halls with six program slots, one hall to a school; programs offered three at a time instead of forty-two at once; every course keeps its instructor choice and `Develop N` retires; the Curriculum tab becomes forty-two colour-coded rows with drag-and-drop faculty. PRs A–I. | Landed |
| 15 | [Growth has a cost](15-growth-has-a-cost.md) | Prestige as an asymmetric stock with a summer report card and a concentration term, instruction per section, seats from housed courses as the ceiling, attrition, research that produces something — and one re-fit against the scorecard. PRs A–H. | Landed |
| 16 | [The year](16-the-year.md) | The summer as four beats (review, standing, admissions, students), year-over-year on the reveal, a fourth gear and no skip, three modal widths, a scripted first year, toasts. PRs A–H. | Landed |
| 17 | [The endpoint](17-the-endpoint.md) | A fifty-year run in three eras — found, build, defend — with ambitions, a six-axis legacy, the semicentennial report, an elite band that closes on the leader, and a balance target where completionism is one good run among four. PRs A–G. | Landed |
| 18 | [The look](18-the-look.md) | The Varsity register: the school's own colours as the theme, cream and outline ink around them, two self-hosted typefaces, chips and hard offsets, a labelled tab bar — one token layer, then one screen per PR. PRs A–G. | Landed |
| 19 | [The founding college](19-the-founding-college.md) | Retiring the general-education core and the school that holds it: Founders Hall becomes an ordinary six-slot hall, the college opens already teaching three programs, and the first year is a choice between depth and breadth. PRs A–G. | Landed |
| 20 | [The catalogue](20-the-catalogue.md) | What the course data *says*: two prereq bridges that hide a whole school behind a capstone, 108 research topics no facility can host, 336 course descriptions written by eight templates, and the graduate programs four schools do not have. PRs A–I. | Landed |
| 21 | [The department](21-the-department.md) | Athletics re-aimed rather than re-imagined: the name pools, outlets for the outputs that terminate in readings, a per-sport scale and a drag-and-drop priority list funded as a queue out of a pot that grows with the department's own gate and giving, a coach market scarce in good coaches rather than in coaches, four dated occasions a year, an arrival that stops being a coin flip, a postseason ban, and water polo. Six phases, PRs A–R. | Landed |
| 22 | [Foundations](22-foundations.md) | Phase A of the merge with UniSchool v2: a test runner and CI, one formatter, dead code out, a seeded random stream in the state, saving out of the reducer, an action log and replay, the comment trim, content integrity checks, the merged harness and v2's tools. PRs A–J. | Landed |
| 23 | [The ladder](23-the-ladder.md) | Phase B of the merge: the unlock track. Named milestones, each opening buildings and tabs on one condition, shown as a ladder with progress and a letter as each lands; the scattered unlock gates and tab gates fold into it. PRs A–E. | Landed |
| 24 | [The campus](24-the-campus.md) | Phase C of the merge: the campus map. A static layer drawn once per layout, ten tilt pitches, a road and reachability, detected and designated quads, diagonal and curved paths, walkers on real routes with desire lines, player-placed lamps and benches, the flag, banners and crowds, and construction and age drawn on the buildings; the profiler gates every PR. PRs A–J. | Landed |
| 25 | [The catalogue, drawn](25-the-catalogue-drawn.md) | Phase D of the merge: dedicated halls drawn as their school's signature building, research buildings by discipline, three grand landmarks built in stages behind a new milestone, and the roof parts that read. v2's amenities wait for Phase E's beauty, graduate halls for Phase L's capital projects. PRs A–F. | Landed |
| 26 | [The estate](26-the-estate.md) | Phase E of the merge: the map starts to matter. Maintenance funding, backlog and condition, renovation, added storeys, historic status, campus beauty feeding the applicant pool and prestige, the small landmarks, and capped pairing bumps. Every layout effect is neutral by default except beauty, which is measured on the harness. PRs A–G. | Landed |
| 27 | [The money](27-the-money.md) | Phase F of the merge: a treasury with choices. An endowment draw rate and transfers into the endowment, borrowing for buildings, the distress ladder that replaces "stall, don't die" with rungs and board letters, event prices that scale with the budget, and the late-game margin measured and fixed. PRs A–F. | Landed |
| 28 | [Delegation and time](28-delegation-and-time.md) | Phase G of the merge: seats (a Provost, a Dean per founded school, Facilities, a Dean of Students, a VP of Advancement) filled from the faculty or from outside, each answering its domain's routine events by policy; their permanent payroll is the administrative ratchet; and the top speeds are earned by them. PRs A–E. | Landed |
| 29 | [The people](29-the-people.md) | Phase H of the merge: v2's quirks on this game's faculty market, retirement, a Faculty tab that shows only the fields in use, an admissions projection line, rising expectations and diminishing returns on satisfaction, one Students tab, and demands that no longer stop the clock. PRs A–H. | Landed |
| 30 | [The alumni](30-the-alumni.md) | Phase I of the merge: the alumni ledger (each class stamped at commencement with what its four years held, which sets its warmth for good), the annual fund and reunions, v2's campaigns with resonance and restricted gifts in place of the endowment campaign, and gift-financed buildings. PRs A–E. | Landed |
| 31 | [The world](31-the-world.md) | Phase J of the merge: how the world reads. Building condition as a prestige input, six standings in the league (in History), identity tags earned and shed over years that shape the pool and carry small teeth, one rival who is also the rival in the main sport, and a schedule that climbs with the college's name. PRs A–F. | Landed |
| 32 | [The events](32-the-events.md) | Phase K of the merge: v2's catalogue of events in place of this game's texture decisions. Inline events wait in a panel over the map and take their default if nobody answers; the rare seismic ones are the board's letters and stop the clock. One interpreter reads v2's conditions and applies its effects, with prices scaled to the college's budget, and seats answer their domain's routine. PRs A–E. | Landed |
| 33 | [Goals and the ending](33-goals-and-the-ending.md) | Phase L of the merge: promises with deadlines, rewards and penalties in place of the achievements, and a decade's list to choose from; capital projects that lift a standing, payable half from the endowment, with a late tier for the defend era; a summer without the Standing beat and a Review rebuilt; the chronicle; the Final Report in place of the legacy; the Epilogue; and the hall of fame. PRs A–I. | Landed |
| 34 | [Presentation](34-presentation.md) | Phase M of the merge: v2's title screen and main menu with this game's startup screen and the hall of fame; one notification system (the ticker, NEXT and the event panel) in place of the toasts; a build menu that folds to a strip while a building is held; the history charts; settings for text size, colour vision and motion, and figures that explain themselves; and v2's synthesised sound. PRs A–G. | Landed |
| 35 | [Balance and playtest](35-balance-and-playtest.md) | Phase N of the merge: the economy measured by decade; the late margin (V1-25) settled as the endowment's; the scorecard reading the operating margin and the pacing, with the guardrails as gates; a founding with slack for a player less efficient than the script; the playtest's fixes; and the review. PRs A–E. | Landed |
| 36 | [Costs that grow with size](36-costs-that-grow-with-size.md) | The boom (the merge review's first open question): the cost of being large, a running-cost line that rises with the logarithm of the roll above a founding threshold, on top of the prestige market rate; the endowment carrying a big college; the harness taught the marginal student; the scale fitted to the design's eras; and the break made visible. PRs A–F. | Landed |
| 37 | [The map, from v2](37-the-map-from-v2.md) | The owner's map requests: the path joints drawn by grid corner in every view (a bug); a choice of tree when planting; trees that answer the tilt as v2's do; and v2's smooth quarter turn, measured on a late campus. PRs A–E. | Landed |
| 38 | [The turn in full detail](38-the-turn-in-full-detail.md) | The owner's report that a quarter turn drops the buildings' detail: the massing view retired, and the full scene drawn at every in-between angle, as v2 draws it, with the per-frame waste taken out (the desire lines' route search, each tree's shapes, a forced layout). One PR. | Landed |
| 39 | [Demolishing, and calling off](39-demolish-and-cancel.md) | The owner's request: a building going up can be called off with its cost returned where it was paid from (a loan settled), and a standing one demolished for nothing and with nothing back, into the catalogue again as it first was; Founders Hall, historic buildings, occupied halls and busy labs stay up. One PR. | Landed |
| 40 | [The crane, from v2](40-the-crane.md) | The owner's request: v2's tower crane on building sites (a latticed mast, cab, A-frame and ties, a jib with trolley and hook, a weighted counter-jib, all filled beams that hold the ground as the camera turns) and its scaffold of standards, ledgers and a brace, in place of stroked lines. One PR. | Landed |
| 41 | [Labs at work](41-labs-at-work.md) | The owner's request: a lab hosting research shows it on the map, without text: a ring filling in its school's colour as the project runs, and an atom turning inside it (still under reduced motion). One PR. | Landed |
| 42 | [Walkers behind walls](42-walkers-behind-walls.md) | The owner's report that walkers still clip through buildings: a walker was cut by the first nearer building whose box came close, which often covered nothing; now by every nearer building whose outline is over it (up to three), through turns too. One PR. | Landed |
| 43 | [The consistency review](43-consistency-review.md) | The owner's request for a review of everything but the balance: the logic, the flow, the screens and the data, each read against the code, fixed where there was one right answer ([the review](../reviews/2026-09-consistency-review.md) lists every finding and the questions left open). The map and the words are Plans 44 and 45. One PR. | Landed |
| 44 | [The map in every view](44-the-map-in-every-view.md) | The review of the map at all four views and the tilt: slopes, stands, towers, doors, tones, shadows, flags and ground marks that were right only at the opening camera, now drawn by the grid and the world; and storeys counted once, chapter houses and capital projects given their own height and wall. One PR. | Landed |
| 45 | [The words agree](45-the-words-agree.md) | A review of the player-facing text: placeholders that filled wrong ("the the class of 7"), lines assembled wrong, text that contradicted the code (promise goals, the prestige hints, what can pay for a building), and one thing under several names; now the college, the guide, the offices and American spelling, one name each. One PR. | Landed |
| 46 | [The owner's answers](46-the-owners-answers.md) | The owner's answers to the consistency review's questions, Q1–Q10 and Q12: in-place work stands, campaigns close on their week, the freeze covers every construction, relocation reads one way, trees and topics no longer move the dice or double up, typed resolves, the tuition lock saved, unreadable saves set aside, catalog text refreshed on load; residences are Houses, Chemistry is CHEM (save 73, carried from 72), no graduate beds, topics admit their partner labs, Ashcombe is elite. One PR. | Landed |
| 47 | [One voice](47-one-voice.md) | The owner's answers to the consistency review's Q13 and Q14: one dismiss verb per kind, one date and week format, sentence case, one confirmation (arm, then act) for every loss, notes that stack instead of hiding each other, one announcement per moment, the opening sent to Founders Hall, and the Final Report saying what follows it; the catalog's paid choices cost money, its duplicate stories go, dated letters wait for their year, and no real trophy, rival, mascot or funder is named. One PR. | Landed |
| 48 | [Every door](48-every-door.md) | The owner's answer to the consistency review's Q15: every wall has a door, shut only where a building stands against it; walkers leave and enter by the doors that suit their route, fade through them, and the doors open as they pass; legs that step, a rise on each step, a pace each. One PR. | Landed |
| 49 | [Any name](49-any-name.md) | The owner's answer to the consistency review's Q16: the harness's strategies no longer stall when no offer fits a hall (they site the hall even while saving, and mix only once every hall is built); a second founding name joins the seeds in every band, the targets and pace are judged across runs, and no name may stall the Balanced builder. Found: the pace guardrails were set on the stall, and the Earnest completionist depends on its path; both are left for the owner. One PR. | Landed |
| 50 | [Fewer projects](50-fewer-projects.md) | The owner's review of the capital projects: the Great Lawn, the Championship Stadium, the Medical Center project, the Institute for Advanced Study and the Great Commons go; the health chain's hospital becomes the Medical Center, a project that lifts academics and research from Year 15 and no longer waits on the medical school (save 74, carried from 73). One PR. | Landed |
| 51 | [Graduate schools](51-graduate-schools.md) | The owner's structure for graduate programs: finish the school's undergraduate curriculum, build its capital project, found the program there. The Arts Center (MFA) replaces the Performing Arts Center; the Medical Center houses Medicine; new Law and Business Schools; the Graduate College houses six doctorates, a new one in Economics among them; letters' buttons spaced (save 75, carried from 74). One PR. | Landed |
| 52 | [Founding pillars](52-founding-pillars.md) | The owner's request: a college opens with English, Mathematics and Economics (Calculus, Microeconomics, Introduction to Literary Studies and their sequels), one from each of three schools, taught by a roster matched to them; Founders Hall is no school's, and letter two says a school is a hall of your own. One PR. | Landed |
| 53 | [Research staging](53-research-staging.md) | The owner's answer on research: the first three depths from the first lab, Landmark Programs once the Research Park stands, and the park once every built lab has seen an initiative through; the Research Library goes (save 76, carried from 75). One PR. | Landed |
| 54 | [Venue stages](54-venue-stages.md) | The owner's answer on venues: the football stadium, the multi-sport field and the diamond grow from the field alone to a small stand to full seating (the stadium's full stage the championship bowl), the arena rises two storeys and the natatorium one; a venue expanding stands at its stage. One PR. | Landed |
| 55 | [Sorting schools](55-sorting-schools.md) | The owner's line of play: programs begin in Founders Hall and move out, school by school, into halls of their own, until Founders Hall stands empty. Seven purchased halls, one a school; a move out of Founders Hall is four weeks; letters that wait on the college teach the moves; the tile suggests the move, the line names it, a hall says "Science · 3 of 6" (save 77, carried from 76). One PR. | Landed |
| 56 | [Checks, not numbers](56-checks-not-numbers.md) | The owner's rule for the harness rebuild: only checks gate a merge, balance numbers are reported. The scorecard and the endpoint claims become reports (`npm run scorecard`, `npm run endpoint:claims`); the slow job is `balance-regression` alone; the rebuild's four layers set down for Plans 57–59. One PR. | Landed |
| 57 | [Faster runs, the moves, and fuzz](57-harness-moves.md) | The rebuild's first layer: a fifty-year run from 44 s to 21 s, identical rows (the athletics pot read once, a reducer without its clone for headless play); the harness's game loop, vocabulary of moves and rules any state keeps; a fuzz suite in `npm test` and a late one, from checkpoints, in the slow job. One PR. | Landed |
| 58 | [The guided player](58-guided-player.md) | The rebuild's second layer: a player that does only what the game tells it (the line's intent as data), measured over five runs — the line of play done by Year 6, #1 by Year 17 — with recommended numbers for the owner; two guidance gaps fixed; three fifty-year runs checked in the slow job; the Graduate College from Year 15. One PR. | Landed |
| 59 | [Rules, names and saves](59-rules-and-names.md) | The owner's playthrough, rules half: graduate hosts keep their names; six purchased halls and Founders Hall the last school's; no Second Quad; sport clubs on their own cap; an unstaffed course darkens its program, restaffed in one click, by the Deans at year's turn, with a candidate always listed; research letters; the library adds a story from its panel (save 78). One PR. | Landed |
| 61 | [Buildings](61-buildings.md) | The owner's playthrough, buildings half: Georgian roofline corners wrap all four corners and hold together as the camera turns; the library's doors clear of its columns, no steps; Arts & Media a sawtooth studio, Business a domed exchange; the multi-sport field's one grandstand and corner scoreboard; the diamond redrawn around the plate; the stadium's bowl closed at the corners and a second deck. One PR. | Landed |
| 62 | [Walkers](62-walkers.md) | The owner's playthrough, walkers: trees cut walkers as buildings do; drawing a path no longer stalls the crowd (routes replan once the paths settle); a ring walk round the Grand Quad's fountain, which no one walks through. One PR. | Landed |
| 60 | [Screens](60-screens.md) | The owner's playthrough, screens half: pill buttons that wrap become rounded rectangles; the Athletics tab in two columns with program cards carrying each sport's standing; a lab's options close; Curriculum schools and programs collapse once complete; a venue's panel tiles its teams; the History standings as six cards; the final report a full page; and the next-step line names a dark program first. One PR. | Landed |

## Naming

```
docs/plans/NN-subject.md
```

- **`NN`** — two digits, assigned in the order the plan was *started*, never
  reused and never renumbered. It is the plan's permanent handle: "Plan 04's 4A"
  is a citable reference, and a filename that sorts is a folder that reads in
  order.
- **`subject`** — short, kebab-case, and about the *area of the game*, not the
  kind of document. `campus-art`, not `campus-art-plan`; the folder already says
  plan, and a suffix that repeats the folder is noise.
- **No `ROADMAP`, `SPEC`, `DESIGN`, `TODO` or `NOTES`.** One word for this kind
  of document, and it is *plan*. A second word invites a second convention.

## Shape

Every plan opens with the same three things, in this order:

```markdown
# Plan NN — Subject in sentence case

*Planning document only — no gameplay code is changed by this file. Its job is
to <what this plan is for>.*

**Status: Landed.** <what shipped, and where the implementation departed>
```

`Status:` takes one of exactly four values:

| Value | Means |
|---|---|
| `Proposed` | Written, not started. Lives here anyway — a plan nobody has started is still the record of the thinking. |
| `In progress` | Some PRs have landed. Say which. |
| `Landed` | All of it shipped. |
| `Superseded by Plan NN` | Abandoned or absorbed. Say which plan took over. |

## Two rules that make these worth keeping

**Record deviations in the PR that deviated.** A plan is written before the work
and is therefore wrong in places. When the implementation departs from it, the
departure goes in an **`**As implemented:**`** note attached to the PR it
belongs to — not into a changelog at the bottom, and not by quietly editing the
plan to match what was built. Plan 04 has eight of these, and they are the most
useful thing in it: they are the record of what the planning got wrong.

**Do not edit a landed plan to keep it current.** Its value is that it says what
was believed at the time. If the world has moved, that belongs in the design
and architecture docs, in `BACKLOG.md`, or in the next plan.
