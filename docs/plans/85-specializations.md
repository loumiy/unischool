# Plan 85 — Specializations

*Planning document only. Its job is to turn the owner's idea of meaningful
trade-offs into PRs: four pillars of success, a college that can be
excellent at all four, and a late, permanent choice that lets it be the
very best at one.*

**Status: Proposed.**

---

## 0. The owner's ask

> "A critical piece missing from this game is meaningful tradeoffs. I want
> to work on a system where there are 4 pillars of success: academics,
> research, student life, and athletics. Prestige is an overall measure of
> all of those. … you can build a school that's excellent at all 4, but
> you can only be the very best at one. At some milestone, you will be
> given a specialization option:"

1. **A faculty training program:** a boost to teaching quality, and each
   year you pick professors for training, which raises their teaching by a
   full letter grade.
2. **The research park:** a boost to research, and it unlocks landmark
   initiatives.
3. **A district for student life.** The owner offered "a downtown
   nightlife district ... the houses visible on the outskirts of campus
   could change to a more bustling nightlife scene", and "an annual gala
   or something is interesting".
4. **An athletic performance complex:** a major boost to athletic
   programs, and more flagship slots.

> "optimal play, without specialization, gets you close to the top of
> every pillar, and probably in the top 10 of the overall rankings.
> Specialization is what allows you to climb to #1 (which should look like
> every pillar being close to the top and one being head-and-shoulders
> above the rest)."

The owner's answers to follow-up questions:

- **The choice is permanent**, and comes late: "some benchmark that's
  typically achievable in the Year 25–40 range."
- **Athletics counts less** than the other pillars in overall prestige.
- **Rivals specialize too.**
- **Student life** is open to suggestions. This plan combines the
  downtown district with an annual festival (§2).

**This changes an existing decision.** Today prestige *is* academic
standing: research and campus life are separate rankings that never feed
it (Plan 80, §1). The owner has asked for prestige to measure all four
pillars, and this plan records the change.

## 1. Where the game is now

- **Prestige** (`s.self.reputation`, `systems/prestige/prestigeSystem.ts`)
  is one weighted target:

  | Term | Weight |
  |---|---|
  | Curriculum breadth | 50 |
  | Concentration | 30 |
  | Teaching quality | 30 |
  | Student quality | 24 |
  | Research output | 22 |
  | Welfare | 20 |
  | Campus life | 12 |
  | Endowment | 8 |
  | Beauty | 6 |
  | Condition (penalty only) | −4 |
  | Crowding (penalty only) | −25 |

  It is capped at 150 and rises at most 2.1 a summer.
- **The standings** are separate axes (`StandingAxis`): reputation,
  social standing, research standing, athletic strength, access and
  financial. Rivals carry their own reputation, social, research and
  athletic values, each on its own momentum.
- **Athletics reaches prestige** only through the campus-life term's venue
  contributions. Titles come early: a first championship around year 8
  for the goal player (Plan 80G).
- **The research park** (`PROJ-RESEARCH-PARK`) is a capital project any
  college may build. It opens the Landmark Program (`depthOpen`).
- **Flagship sports** are capped at 2, 4 or 6 by the athletics subsidy
  (Plan 80G).
- **Without any specialization,** the harness's strong players reach rank
  1 by year 50 (Guided and Completionist).

## 2. Decisions

- **The four pillars:** Academics, Research, Student life, Athletics.
  Each is a 0–1 score built from terms that already exist:
  - **Academics:** breadth, concentration, teaching quality, student
    quality.
  - **Research:** research output and doctorates. Research standing
    already reads these.
  - **Student life:** welfare (satisfaction), campus life and beauty.
  - **Athletics:** titles, program quality and flagship strength. This is
    the athletic standing's own reading, now brought into prestige.

  Endowment, condition and crowding stay outside the pillars as
  adjustments.
- **Prestige** is the weighted blend. It starts at academics 35%,
  research 25%, student life 25% and athletics 15%, tuned in 85C.
- **Ceilings.** Without its specialization, each pillar's score is
  capped a little short of its maximum. A specialization lifts its own
  pillar's cap and adds that pillar's mechanics. The unspecialized
  ceiling is tuned so that optimal play reaches the top 10 overall and
  near the top of every pillar ranking. The owner's shape for #1 is every
  pillar near the top and one clearly above.
- **The milestone is a rank, not a prestige number,** so it survives the
  retune:
  - the choice is offered at the first summer the college stands in the
    overall top 15 (the number is tuned so the Guided player reaches it
    in years 25–40);
  - the board gives two years' notice when the college first comes
    within reach;
  - the choice is permanent;
  - a college that never reaches the milestone never specializes.
- **Rivals specialize.** Each rival is dealt one pillar off its id, and
  that axis runs higher and steadier. The rankings show each rival's
  specialization, so every pillar has a leader to catch.
- **The word** is "specialization" in the game, because "archetype"
  already names the harness's players.
- **Student life: the downtown and the festival.** The town already drawn
  beside the campus (Plan 81) grows into a nightlife district, and play
  gets three things:
  1. **Off-campus life.** The district meets part of the students' social
     and dining needs and offers off-campus housing, so the college needs
     fewer dining halls, social buildings and dorms.
  2. **An annual festival.** Each spring the player sets its scale, from a
     modest weekend to a headline gala. The spend buys satisfaction, next
     year's applications and alumni giving at the gala. Skipping a year
     costs goodwill.
  3. **Town and gown.** Events from a lively downtown (noise complaints,
     a bar's partnership offer, a street festival wanting the quad) trade
     money, mood and the town's goodwill.

## 3. The PRs

| PR | Subject | Sim baseline | Save version |
|---|---|---|---|
| A | This plan; the backlog | no | no |
| B | Four pillars, and prestige as their blend | yes | maybe |
| C | Ceilings, harder athletics, rivals that specialize; the retune | yes | yes |
| D | The milestone and the choice | yes | yes |
| E | The faculty training program | yes | maybe |
| F | The research park as a specialization | yes | maybe |
| G | The athletic performance complex | yes | maybe |
| H | The downtown and the festival | yes | yes |
| I | The balance pass, and the harness's specialized players | yes | no |

E needs Plan 84's grid (84D). E–H can go in any order after D.

## PR 85B — Four pillars, and prestige as their blend

- **The four pillar scores** are computed from the existing terms, and
  prestige's target becomes their weighted blend, with the three
  adjustments outside.
- **A pillar ranking for each of the four,** player and rivals alike.
  Rivals get an academic value (their reputation today) and keep their
  other three axes.
- **The Standing panel and the rankings** show the four pillars and
  prestige as their blend, with each pillar's make-up in its breakdown.
- **No ceilings yet.** This PR changes how the number is built, not how
  high it goes. The sim baseline is re-recorded with the moves described.
- Writes the change of decision into the design doc.

## PR 85C — Ceilings, harder athletics, rivals that specialize; the retune

- **Each pillar's unspecialized ceiling,** in `tuning.ts`.
- **Athletics made harder** on the unspecialized path: a first title is
  rare without the complex. The target is set in this PR and agreed on
  review.
- **Rival specializations:** each rival is dealt one pillar off its id,
  saved, with a migration for existing saves.
- **The retune.** The targets, measured by the harness across seeds:
  - optimal unspecialized play (Guided, Completionist) reaches the overall
    top 10 by year 50, and the top 10 of each pillar;
  - no unspecialized player reaches #1 overall.
- **Checks:** the sim report's new pillar ranks per player; the
  milestone's rank reached in years 25–40 by Guided (it has no effect
  until D).

## PR 85D — The milestone and the choice

- **Notice.** The board's notice arrives when the college first comes
  within reach of the milestone rank. It names the four specializations
  and what each would give.
- **The choice** is made at the first summer at the milestone, on a
  screen of its own:
  - the four specializations side by side, each with its pillar, its
    lifted ceiling and its mechanics;
  - the college's current standing in each pillar;
  - the rivals already specialized in each.
- **Permanent.** `s.specialization` is saved, with a save version bump.
  The chronicle marks the year.
- **The harness** gets a choice rule for each player: its strongest pillar,
  or a fixed pick for the specialized variants in I.
- **Checks:** the notice and the choice at the milestone, a save round
  trip, and `review:strings`.

## PR 85E — The faculty training program

- **An institute on the map** (a building in the catalog), buildable only
  with this specialization.
- **Each year the player picks professors for training** from Plan 84's
  grid. A pick's teaching rises by one letter grade (the course-grade
  bands), and so does its potential, so the gain lasts.
- **How many:** a number that scales with the size of the faculty.
- **Costs to decide in review:** whether a trainee teaches less for a term
  while training, and the institute's own running cost.
- **Lifts the academic pillar's ceiling.**
- **Checks:** a test that a grade is gained; the harness's teaching
  specialist in I.

## PR 85F — The research park as a specialization

- **The existing research park** becomes this specialization's
  building. Only a research-specialized college may build it, and
  Landmark initiatives stay tied to it.
- **Lifts the research pillar's ceiling,** plus a boost to research
  output.
- **Existing saves** that already built the park keep it and its
  Landmark access. At the milestone, such a college is offered the choice
  as any other. If it picks something else, the park stays but lifts no
  ceiling. The migration and the words say so.
- **The harness** players that build the park today (Plan 53) follow the
  new rule.

## PR 85G — The athletic performance complex

- **A complex on the map,** buildable only with this specialization.
- **Flagship slots** above the subsidy cap (for example two more), a
  recruiting boost, and better odds deep in the postseason.
- **Lifts the athletics pillar's ceiling.**
- **Checks:** the harness's athletics specialist wins titles regularly by
  year 50, and an unspecialized goal player rarely does.

## PR 85H — The downtown and the festival

- **The district on the map.** The town beside the campus (`ringLand.ts`)
  grows, over the years after the choice, into a lit, busier district:
  more buildings, shopfronts and lights at night. It is still drawn only,
  never built on.
- **Off-campus life:**
  - part of the social and dining need is met by the district;
  - off-campus housing takes part of the housing need;
  - both are shown where the needs are.
- **The festival:**
  - a spring decision with three or four scales and their costs;
  - effects on satisfaction, next year's applications and alumni
    giving;
  - skipping a year costs goodwill;
  - it is written in the content files, and is a chronicle occasion.
- **Town and gown:** a handful of events in the catalog, gated on this
  specialization, with choices that trade money, mood and the town's
  goodwill.
- **Lifts the student-life pillar's ceiling.**
- **Save version bump:** the district's growth and the festival's
  history.

## PR 85I — The balance pass, and the specialized players

- **Four specialized variants** of the Guided player in the sim report,
  one per specialization, beside the unspecialized one.
- **Targets:**
  - each specialized variant can reach #1 overall by year 50 on some
    seeds;
  - its pillar is #1 by a clear margin;
  - its other pillars stay near the top;
  - unspecialized play stays top 10.
- **The re-recorded baseline** is described; the owner reviews the
  report.

## What this plan does not do

- No changing specialization after the choice, and no second
  specialization.
- No new pillar beyond the four.
- No downside built into any specialization beyond what it rules out.
  The exclusivity is the trade-off.
