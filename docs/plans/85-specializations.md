# Plan 85 — Specializations

*Planning document only. Its job is to turn the owner's idea of meaningful
trade-offs into PRs: four pillars of success, a college that can be
excellent at all four, and a late, permanent choice that lets it be the
very best at one.*

**Status: Landed: A–I merged (#268, #274–#278, #280–#282).**

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
- **No hard caps (the owner's decision, 2026-09-30, in 85D's review; it
  replaces the ceilings above).** "I don't think the pillar scores should
  be hard-capped, the game should just be structured such that it's not
  possible (or highly improbable) to get as high as 150 without the
  specialization bonus." So each pillar holds a term only its own
  specialization fills, and its other terms share the rest in their old
  proportions: a perfect college without the specialization stands where
  the ceilings were because a term is empty, not because a clamp holds it.
  Athletics' team ceiling becomes a slowdown of a program's quality above a
  knee, and the rivals' unspecialized axes drift toward targets instead of
  stopping at the ceilings. See 85D's note.
- **The milestone lowered, the structure kept (the owner's decision,
  2026-09-30, reviewing the no-caps rework).** Without the ceilings' slack
  the strong players climb later, and at the top 12 the Completionist
  reached the milestone after year 40 on two seeds. The owner kept the
  structure (the missing specialization term, no diminishing returns
  instead) and lowered the milestone to the top 20. See 85D's note.
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

**As implemented (#274):** prestige is the blend of the four pillars, for the
college and every rival alike. No ceilings, no specialization state, and no
save change.

- **Each pillar is a standing on the prestige scale** (`prestigeSystem.ts`'s
  `pillarBreakdown`). It starts from a floor of 32, prestige's old
  baseline, and its terms fill the remaining 118 to 150. Each term keeps its
  old weight where it had one, scaled onto that span, and a capital
  project's lift is points on top. Its 0–1 score is (value − 32) / 118.
  - **Academics:** curriculum breadth 50 (× library adequacy),
    concentration 30, teaching quality 30, student quality 24 (× scale).
    These are prestige's old weights. Academic capital projects on top.
  - **Research:** what the labs have produced, 80 (60 credits for full:
    publications, finished projects, breakthroughs, prizes, doctorates), and
    fields with a lab, 40. This is the research standing's own reading. Its
    old stock, `researchStanding`, now drifts toward this pillar and is what
    the research ranking reads. Prestige's own research term (credits over
    20) is gone.
  - **Student life:** welfare 20, campus life 12 and beauty 6, prestige's
    old weights. *Campus life* is the campus life standing's reading less
    its athletics: facilities 30, clubs and chapters 35, and the social
    satisfaction students report, 25, as a 0–1 score. `socialStanding`
    drifts toward this pillar. Experience capital projects on top.
  - **Athletics:** program strength 30 and championships 20, the campus
    life standing's weights. Flagship strength is 20, the mean quality of
    the flagship programs. That weight is new: I set it equal to the titles'.
    The athletic ranking reads the pillar's score on its 0–100 scale.
- **Prestige's target** = 32 + 118 × (0.35 academics + 0.25 research +
  0.25 student life + 0.15 athletics), which is the weighted mean of the
  four values. Then the endowment adds up to 8, condition takes up to 4 and
  crowding up to 25.
  - The teaching standard's ceiling, the 5–150 band, `PRESTIGE_MAX_RISE` and
    the drift are unchanged.
  - `PILLAR_WEIGHTS` sits with the other prestige constants in
    `prestigeSystem.ts`; the repository has no `tuning.ts`.
  - The breakdown's rows are the four pillars and the three adjustments.
    Each pillar row carries its own breakdown, so the report card grades
    pillars.
- **Rivals:**
  - A rival's pillars are its stored axes: `reputation` is its academics,
    `researchStanding` its research and `socialStanding` its student life,
    all already on the scale. Its `athleticStrength` (0–100) maps as the
    player's does, 32 + 118 × strength / 100.
  - **A rival's prestige is the same blend** (`rivalsSystem.ts`'s
    `rivalOverall`), with no adjustments. The player's endowment and
    penalties have no rival counterpart. That asymmetry is at most +8 for
    the player.
  - The overall is derived, not stored, so nothing is saved. Every table
    ranks by it: the guide, Rank, the report, the chronicle's eras and the
    college rival.
  - **The elite band chases on the overall.** The closing step is read on
    the rival's overall and added to all four of its pillars, so the
    overall rises by exactly the step. The no-leapfrog cap shifts all four
    down.
  - The field's own drift is unchanged. Academics still rises toward
    `FIELD_CEILING`, the other three drift on their momentum, and the pass
    takes one draw a year. A year-ago estimate (the report's movers) steps
    each pillar back by its momentum.
- **The screens:**
  - History › Prestige shows the pillars and the adjustments, and each
    pillar opens onto its make-up.
  - The standings have seven cards: Prestige, Academics, Research,
    Student life, Athletics, Access and Financial strength. The four pillar
    breakdowns sit under them.
  - The guide adds each school's four pillars as columns.
  - The report's lines name the four pillars.
  - The Athletics tab's standings read Athletics and Student life. A
    title's modal reports what it added to the athletics pillar.
  - The Final Report's academics axis reads the academics pillar.
- **The sim moves** (medians of three seeds, against the old baseline):

  | | Rank Y10 / Y25 / Y50 | Prestige Y10 / Y25 / Y50 | Satisfaction Y10 / Y25 / Y50 |
  |---|---|---|---|
  | Guided | 54 (+9) / 15 (+4) / 1 | 58.0 (−11.0) / 93.0 (−14.1) / 129.8 (−13.2) | 88.6 (+4.5) / 84.6 (+0.6) / 86.2 (+0.5) |
  | Completionist | 53 (+6) / 11 (−3) / 1 | 59.7 (−6.9) / 95.2 (−9.5) / 134.1 (−9.9) | 84.9 (+1.4) / 89.4 (+6.2) / 87.8 (+0.4) |
  | Selective | 56 (+5) / 49 (+29) / 52 (+34) | 51.6 (−9.6) / 63.5 (−32.2) / 64.6 (−47.4) | 85.2 (+11.3) / 79.8 (+11.5) / 76.9 (+1.8) |
  | Lean | 59 (+6) / 57 (+30) / 63 (+40) | 47.0 (−12.2) / 52.0 (−37.5) / 51.9 (−50.2) | 74.1 (−3.0) / 67.3 (−13.9) / 67.6 (−7.9) |
  | Idle | 78 (+1) / 59 (+1) / 66 (+2) | 31.7 (−0.7) / 49.7 (−4.9) / 46.0 (−2.8) | 84.0 flat |

  Prestige falls for everyone.
  - The field's overall falls with it: rivals' research, student life and
    athletics sit below their academics.
  - Guided and Completionist still reach #1 by year 50.
  - Selective and Lean fall far, since they build little outside
    academics. Selective's and Lean's cash fall with prestige, through
    price tolerance and the pool.

  When the strong players reach #1 (seeds 12345, 4242, 777):
  - **Guided:** before, first #1 in years 39, 32 and 39. Now years 41 and
    35, and seed 12345 finishes second. Prestige at year 50 is 125–131,
    against 140–145 before.
  - **Completionist:** before, years 39, 40 and 40. Now years 35, 33 and
    35. Prestige at year 50 is about 134, against 144–145.

  **For 85C:** the Guided player never activates a varsity team (every
  team waits on a venue), so its athletics pillar sits at 32 all run and is
  #100 of 100. Its #1 comes from academics (150) and student life (139).
  Student life is the easiest pillar: welfare is full from about year 5
  for every player that keeps students happy.
- **Checks:**
  - `npm run check`; `npm run sim` re-recorded (`--save`), then 0 deltas;
  - `npm run phone` on the launch fixture and a year-45 save;
  - `review:strings`: nothing flagged.
  - Tests follow the model: the report card's weight budget is by pillar,
    beauty and the capital projects are read inside their pillars, a title
    lifts the athletics pillar, and the closing field places rivals by
    their overall.
- **Screenshots** in `docs/reviews/2026-10-pillars/`, from a Guided run
  named Blackmoor at years 7 and 46:
  - `85b-prestige-early.jpg` and `85b-prestige-late.jpg` (a pillar opened);
  - `85b-standings-early.jpg` and `85b-standings-late.jpg`;
  - `85b-guide-early.jpg` and `85b-guide-late.jpg`.

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

**As implemented (#275):** every pillar stops at a ceiling without its
specialization, a title is rare without the athletics one, and every rival
is dealt a pillar that runs higher and steadier. Save version 88.

*The ceilings, the team ceiling and the rivals' held axes were superseded in
#276 by the owner's decision in 85D's review: no hard caps (§2, and 85D's
note).*

- **The ceilings** (`prestigeSystem.ts`'s `UNSPECIALIZED_CEILINGS`, beside
  `PILLAR_WEIGHTS`; the repository has no `tuning.ts`):

  | Pillar | Ceiling |
  |---|---|
  | Academics | 126 |
  | Research | 126 |
  | Student life | 120 |
  | Athletics | 110 |

  - `pillarCeiling(s, pillar)` is 150 for the college's specialization and
    the ceiling otherwise. `specializationOf(s)` reads the choice and answers
    none until 85D saves `s.specialization`; it has a module of its own
    (`systems/prestige/specialization.ts`, types only) so the data files can
    read it without an import cycle.
  - The ceiling is the pillar breakdown's `ceiling`, so the target is the
    lower of the ceiling and what the terms earn, and prestige counts a held
    pillar at its ceiling. The breakdown carries `held`, true while the
    ceiling is what sets the target.
  - Student life's is lower because it is the easiest to fill; athletics' is
    about where a strong department without titles stands (the team
    ceiling, below, caps its program strength and flagships).
  - **The words** are in `data/specializationData.ts`. To the player a
    ceiling is a *limit* (Plan 47's glossary). History › Prestige marks a
    held pillar's row *At its limit*, and its line ends "Held at its limit
    of 126. Only a specialization in academics would lift it." The pillar's
    breakdown names the limit under its note; opened under its row in
    History › Prestige it leaves the held sentence off, since the row has
    just said it, and in the standings it says it once.
    "Specialization" throughout, never "archetype"; the glossary gains the
    word.
- **Ties go to the college in the standings** (the owner's decision in
  review). The standings sort by `rivalsSystem.ts`'s `byStanding`: the
  higher value first, and on a tie the college ahead; rivals among
  themselves keep the field's order. That covers prestige, the four
  pillars, access, financial strength and the year-ago table the report's
  movers read. Ties are common at the ceilings, where the college and the
  rivals held there share one value. A sport's own table, and so its
  playoff seeds, keeps the old rule (`byStrength`): level, the rival is
  seeded ahead.
- **Athletics, harder.** The target, set here for review: on the
  unspecialized path a first title comes after year 20 in most runs, and a
  handful at most by year 50. Two levers, both lifted by the athletics
  specialization (85G):
  - **The team ceiling:** no program plays above 90
    (`studentLifeData.ts`'s `UNSPECIALIZED_TEAM_CEILING`). `teamQuality` is
    the lower of that and `teamQualityEarned`. A team card held there says
    so, and the department's help names the ceiling.
  - **The big stage:** in the college's own games the opponent plays 8
    points stronger in a quarterfinal, 20 in a semifinal and 35 in a final
    (`playoffs.ts`'s `STAGE_EDGE`, `stageEdge`). Brackets between rivals are
    as they were, and the postseason still takes one draw.
  - The rivals' athletic specialists, which run higher, make the field
    stronger as the run goes on. Before this, the championships goal player
    had team qualities of 100 by year 15 and several at 100 all run.
- **Rival specializations:**
  - `Rival.specialization`, dealt by `rivalData.ts`'s `dealtSpecialization`
    (a hash of the id under the salt `specialization`): 35 academic, 23
    research, 19 student-life and 22 athletic specialists. The six strongest
    authored schools cover all four, and the elite band has a specialist in
    each.
  - **The specialized axis** rises as the field's academics does
    (`fieldRise`, by the fourth power of the authored standing) at twice
    the rate (`SPECIALIZED_RISE_RATE`), easing toward
    `SPECIALIZED_CEILING`, 150 (athletics: the top of its band, 85), and
    takes half its momentum and its yearly shock
    (`SPECIALIZED_STEADINESS`).
  - **The other three** stop at the college's unspecialized ceilings
    (athletics at strength 66, what 110 maps to). Drift never carries an
    axis past its ceiling, and the elite band's closing is held there too;
    an axis already above in an old save keeps its place until it falls.
  - The draws are unchanged: one a year for the whole field, the same rolls
    in the same order whatever the specializations (the test counts them).
  - **The screens:** the guide tags every rival after its name (*Aca*,
    *Res*, *Life*, *Ath*, the words on hover) and underlines its
    specialized pillar's figure; the standings name each leader's
    specialization ("Led by Ravensmoor Institute, specialized in student
    life"). The annual report's printed table is a snapshot and is not
    tagged.
- **Save:** `SAVE_VERSION` 87 → 88, migration `dealSpecializations` at
  `MIGRATIONS[87]`: each rival dealt its pillar as a new game deals it, its
  standings left where they were. A specialization that is not one of the
  four is dealt again on load. `test/fixtures/save-v87.json` is the
  `year-8-balanced` scenario written before the bump (the chain test wants
  a fixture written at each version the chain starts from).
  `sim/harness/invariants.ts` checks every rival holds its dealt pillar.
- **The Guided harness fix.** The Guided player never activated a varsity
  team because it never built a venue: the next-step line never asks for
  one, and its plain-sense builds (`buildFor`, and the labs, projects and
  buildings a course waits on) left varsity venues out. Every team waited
  on the Multi-Sport Field, the Arena, the Diamond, the Natatorium or the
  Football Stadium all run. It now also builds the venue a team waits on, as
  it builds the building a course waits on. A harness fix, not a game
  change: all 20 teams are active by year 50. It hires no coaches and picks
  no flagships, so its athletics pillar is about 67 and ranks in the 60s,
  and adds about 5 to its prestige at year 50 (seed 12345: 115.5 with the
  fix, 110.0 without).
- **The sim moves** (medians of three seeds, against 85B's baseline; pillar
  ranks at year 50, academics / research / student life / athletics):

  | | Rank Y10 / Y25 / Y50 | Prestige Y10 / Y25 / Y50 | Satisfaction Y10 / Y25 / Y50 | Pillar ranks Y50 |
  |---|---|---|---|---|
  | Guided | 55 (+1) / 16 (+1) / 6 (+5) | 59.4 (+1.4) / 94.8 (+1.7) / 115.5 (−14.3) | 87.6 (−1.0) / 84.5 (−0.1) / 87.9 (+1.7) | 9 / 8 / 4 / 67, was 1 / 3 / 1 / 100 |
  | Completionist | 53 / 16 (+5) / 7 (+6) | 59.7 / 94.1 (−1.1) / 115.5 (−18.6) | 84.9 / 86.8 (−2.7) / 87.5 (−0.4) | 7 / 12 / 4 / 61, was 2 / 7 / 1 / 59 |
  | Selective | 56 / 50 (+1) / 53 (+1) | 51.6 / 63.5 / 65.1 (+0.5) | 85.2 / 79.8 / 77.1 (+0.2) | 53 / 58 / 5 / 100, was 48 / 59 / 4 / 100 |
  | Lean | 58 (−1) / 57 / 63 | 47.0 / 52.0 / 51.9 | 74.1 / 67.3 / 67.6 | 51 / 77 / 7 / 100, was 48 / 78 / 5 / 100 |
  | Idle | 78 / 59 / 66 | 31.7 / 49.7 / 46.0 | 84.0 flat | 81 / 75 / 7 / 100, was 84 / 75 / 5 / 100 |

  When the strong players first reach each place (seeds 12345, 4242, 777):

  | | Top 15 | Top 10 | #1 |
  |---|---|---|---|
  | Guided | 26, 26, 24 (was 25, 25, 26) | 29, 29, 30 (was 27, 28, 28) | never, best 6, 4, 3 (was never, 42, 36) |
  | Completionist | 27, 26, 26 (was 24, 23, 24) | 34, 27, 39 (was 27, 26, 25) | never, best 6, 6, 9 (was 36, 34, 36) |

  - **The targets:** both reach the top 10 by year 50 and neither is ever
    first; at year 50 each holds academics, research and student life at
    their ceilings, which ranks about 7th to 10th, 8th to 14th and 3rd to
    6th. Their athletics ranks in the 60s because neither runs its
    department (no coaches, no flagships); the championships goal player,
    which does, ranks 10th (8–24): the runs that hold athletics at its
    limit rank 8th to 10th, the rest 19th to 24th.
  - **What the tie-break moved** (measured before the baseline was
    re-recorded): academics rank at year 50, Guided 12, 11, 11 → 10, 8, 9
    by seed, Completionist 9, 9, 10 → 7, 7, 9; research, student life and
    athletics did not move, nor did either player's overall rank (Guided
    6, Completionist 7; best 6, 4, 3 and 6, 6, 9) or any other figure in
    the report. The championships player's athletics rank at year 50 is 10
    (8–24), against 17 (12–24) without it: where it holds the athletics
    limit it now takes the tie. Its titles and overall rank are as before,
    since the sports' tables and seeds keep the old rule. No unspecialized
    player is ever first: the
    best any reaches in any year is Guided's 3rd, the championships
    player's 20th.
  - **Titles:** Guided and Completionist won none before and none after.
    The championships goal player (`npm run review:goals -- --goals
    championships`, five seeds, two names): first title a median year 29
    (13–40; four runs of ten won none), against year 9 (8–11); titles by
    year 25 a median 0, against 19; by year 50 a median 1 (0–3), against 69
    (59–95). Its overall rank at year 50 falls from 11 to 27 (22–29).
  - **The milestone** (no effect until 85D): Guided first stands in the
    top 15 in years 24–26, Completionist in 26–27, at the early edge of
    the 25–40 wanted.
  - **Cash at year 50** moves a lot (Guided $128M → $654M, Completionist
    +$70M), and is the report's noisiest figure: late in the run both bank
    most of what they earn (Guided seed 12345 held $166M at year 45 and
    $1.1B at year 50).
  - Selective, Lean and Idle barely move: their pillars sit under the
    ceilings. Idle's student life, 101 from welfare alone, ranks 7th
    against 5th: student-life specialists now run above it.
- **Open, for review:**
  - **The endowment** stays outside the pillars (up to +8). A college with
    every pillar at its ceiling, athletics included, and a full endowment
    would stand near 130, level with the field's best specialists; none of
    the harness's players comes close. 85I's balance pass should include
    one.
  - **The team ceiling and the big stage** are this PR's reading of
    "rare"; 85G decides how far the complex lifts each.
- **Checks:** `npm run check`; `npm run sim` re-recorded (`--save`), then 0
  deltas; `npm run phone` on the launch fixture and a year-46 Guided save;
  `review:strings`, nothing new flagged. `test/specializations.test.ts`
  pins the ceilings and the held line, the tie-break (level with the best,
  the college is first, and ahead of every rival held at its ceiling; in a
  sport's table a level rival is still seeded ahead), the
  deal (the same every time, all
  four dealt, all four among the strongest), the field after fifty years
  (each pillar led by its specialist, no other axis past its ceiling, one
  draw a year), the migration and the harder titles. The closing-field,
  first-place, department and playoffs tests were rescaled to standings
  and teams an unspecialized college can hold.
- **Screenshots** in `docs/reviews/2026-10-pillars/`, from a Guided run
  named Blackmoor at year 46: `85c-prestige.jpg` (academics, research and
  student life held, academics opened), `85c-standings.jpg` and
  `85c-guide.jpg` (the rival tags).

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

**As implemented (#276):** the college chooses a specialization once, at the
close of the first summer it stands in the guide's top 20, and keeps it. In
the owner's review of the first version (which lifted a hard ceiling), the
owner decided against hard caps (§2), so this PR also replaces 85C's
ceilings: each pillar now holds a specialization term that only its own
specialization fills. The choice opens that term, which fills over ten
years until 85E–H give it a mechanic. Reviewing that, the owner kept the
structure and lowered the milestone from the top 12 to the top 20 (§2).
Save version 89.

- **`s.specialization`** is `'none'` or a pillar (`types.ts`'s
  `Specialization`, the pillar keys 85B and 85C use), with
  `specializationYear`, the summer it was chosen. Two more fields keep the
  milestone's beats: `specializationNotice` (the year the board's notice
  came) and `specializationOffered` (the summer the college first stood at
  the milestone). `specializationOf(s)` reads the field.
- **No hard caps: the specialization term** (`prestigeSystem.ts`'s
  `SPECIALIZATION_TERM_WEIGHTS`, beside `PILLAR_WEIGHTS`):

  | Pillar | Term (of the 118 above the floor) | Natural maximum without it |
  |---|---|---|
  | Academics | 24 | 126 |
  | Research | 24 | 126 |
  | Student life | 30 | 120 |
  | Athletics | 30 | 120 |

  - Each pillar's other terms, the capital projects among them, share the
    rest of the span in their old proportions (`pillarOf`'s `scaled`). A
    capital project's lift was points on top of a pillar; it is now a term
    like the others, scaled with them, and its row shows before one stands,
    so the terms add up. A perfect unspecialized college stands at the
    natural maximum (`UNSPECIALIZED_MAXIMA`), because its term is empty.
  - `pillarCeiling` and the clamp are gone, and so are the "At its limit"
    tag and the "Held at its limit" lines. The term is an ordinary row in
    the pillar's breakdown, named for its program ("The faculty training
    program"): "+0.0 of 24", "Comes only with a specialization in
    academics"; specialized in another, "The college is specialized in
    research, so this stays empty"; specialized in it, how far it has
    filled.
  - **How it fills in 85D:** a tenth for each year since the choice, full
    after ten (`specializationData.ts`'s `SPECIALIZATION_READINGS`, one
    reading per pillar, `SPECIALIZATION_FILL_YEARS`). 85E–H replace their
    pillar's reading with their mechanic's (the share of the faculty
    trained, the park's output, and so on).
  - **Athletics' term is 30, not the 40 the ceiling took away.** At 40 the
    championships goal player's athletics ranked 36th at year 50 (it was
    10th), because a strong department without titles stood at about 78;
    at 30 it stands near 90 and ranks 15th. Its natural maximum is 120.
- **Athletics' team ceiling is a slowdown** (`studentLifeData.ts`'s
  `teamQualityCurve`): a program's quality is what its staff, money,
  recruiting and pull earn up to `TEAM_QUALITY_KNEE`, 80; above it, each
  further point is worth less, easing toward 80 + `TEAM_QUALITY_SOFT_SPAN`,
  90, which it never passes. So 100 is out of reach without the athletics
  specialization, which takes the slowdown away. A team card slowed by it is
  marked "slowed", with what it would have earned. The big stage is
  unchanged.
- **The rivals are unclamped** (`rivalsSystem.ts`): an unspecialized axis
  drifts toward `RIVAL_UNSPECIALIZED_TARGETS` (academics and research 112,
  student life 107, athletics 90; each at or below the college's natural
  maximum). An upward move shrinks to nothing over the last
  `RIVAL_TARGET_EASE` (8) points below the target, a downward move is
  whole, and an axis already above (an authored standing, or an old save)
  takes no upward move until it has fallen below. Nothing pushes an axis
  down, and nothing holds it at a number. A specialized axis still
  approaches 150 as before. The draws are unchanged.
- **What the choice does now:** its pillar's term opens and fills, so the
  pillar can rise to 150. Athletics also takes away the teams' slowdown and
  the big stage's edge, both through one hook, `specialization.ts`'s
  `athleticsLifted`, which `teamQualityCurve` and `stageEdge` read and 85G's
  complex extends.
  *Amended in 85G's review (the owner, 2026-10-01): the big stage is shrunk
  to a quarter for an athletics specialist, not taken away (`playoffs.ts`'s
  `SPECIALIZED_STAGE_SHARE`); see 85G's note.*
- **The milestone** (`prestigeSystem.ts`'s `SPECIALIZATION_MILESTONE_RANK`,
  beside the term weights): **the top 20**. It is read at the summer's own
  week after the field has moved: the table the summer's review prints.
  - On the first version, with the ceilings, the strong players reached the
    top 15 in years 24–27, so the milestone was the top 12 (years 27–30).
  - Without caps they climb about six years later, and at the top 12 the
    Completionist arrived in years 43 and 49 on two seeds.
  - The owner kept the structure and asked for the tightest rank inside
    25–40 on every seed. First summer at each rank (seeds 12345, 4242,
    777; Guided, then the Completionist):

    | Rank | Guided | Completionist |
    |---|---|---|
    | Top 12 | 35, 35, 36 | 43, 49, 40 |
    | Top 15 | 34, 32, 34 | 40, 45, 36 |
    | Top 18 | 33, 31, 30 | 39, 41, 34 |
    | Top 19 | 32, 30, 30 | 36, 41, 33 |
    | Top 20 | 31, 29, 30 | 36, 38, 30 |

    The top 20 is the tightest that holds on every seed, with two years to
    spare at the late end (the Completionist's 38) and four at the early
    (Guided's 29). The rank changes only when the choice comes: the climb
    to it is the same whatever it is.
- **The notice** (`SPECIALIZATION_NOTICE_PLACES`): the first week the college
  stands within four places of the milestone (the top 24), the board's
  letter ("Within reach of the top 20") arrives in the inbox as a board
  letter, which never stops the clock. It names the four specializations and
  the points of its pillar each opens, says athletics also frees the teams,
  and says the rest arrives in time. The strong players have it two to five
  years ahead (Guided in years 28, 27, 28; Completionist 31, 36, 28, on
  seeds 12345, 4242, 777). Its second button opens History, not the
  Treasury. It comes once.
- **The choice** is raised by `RESOLVE_ADMISSIONS` after the page has turned
  (`milestone.ts`'s `raiseSpecializationChoice`), on the new year's first
  week before it runs, so its answer (`RESOLVE_SPECIALIZATION`) holds no week
  and never moves the clock. It is filed under the summer's year. A page in
  the inbox (`components/SpecializationChoice.tsx`, `modalWidth` "page"):
  the four side by side (two by two under 1100px, stacked on a phone), each
  card with its pillar and name; **Now:** "Opens the faculty training
  program's share of academics, worth 24 points, filling over 10 years"
  (and, for athletics, the teams); **Still to come:** its mechanics,
  "Arrives in a later update"; the college's value and rank in the pillar;
  and how many rivals are specialized in it and the strongest of them.
  Choosing asks twice (Plan 47's `ConfirmButton`: "Confirm: this is for
  good", with the warning that it cannot be changed or undone). The words
  and the cards are in `data/specializationData.ts` (`SPECIALIZATION_CARDS`:
  each mechanic has `ready`, which 85E–H flip as they build it).
- **Decided here: closing without choosing.** The card has a "Not this
  year" button (an interrupt cannot be closed otherwise). The offer stands:
  the choice comes back at the close of every summer until it is made, even
  if the college has slipped below the milestone since, because reaching it
  once earned it. Nothing chooses for the player: the game's default answer
  (`defaultAnswers.ts`, which the debug panel's Jump uses) is "not this
  year". A college that never reaches the milestone is never offered it; a
  sandbox run neither gets the notice nor the offer.
- **Once chosen:** History › Prestige and the standings open with a line
  saying where the college stands on the choice ("The college is
  specialized in academics, chosen in Year 31: academics may rise to the
  full 150, and the other three pillars' specialization terms stay empty";
  before it, the offer standing or the milestone to reach, and that the
  terms are empty). The specialized pillar's row and standings card are
  marked *Specialized*. The Athletics tab's help says what the
  specialization leaves of the slowdown. The guide tags the college with
  its specialization as it tags every rival. The chronicle's era says "In
  Year 31 it chose to specialize in academics: the faculty training
  program."
- **The Final Report names the specialization first** (the owner's "fix the
  report"): once the college has one, the title's phrase is the card's own,
  "Blackmoor University: a college known first for its teaching, with no
  glaring weakness" (`SPECIALIZATION_CARDS`' `known`,
  `finalReport.ts`'s `composeTitle`, `reportData.ts`'s
  `SPECIALIZATION_AXIS` for the standing it claims). A college that never
  specialized keeps the guidebooks' tag phrase.
- **The harness** (`sim/harness/specialization.ts`): every player chooses by
  a rule, `Player.specialization`. The default, `'strongest'`, is the pillar
  with the highest value on the prestige scale, and on a tie (within half a
  point) the better rank in that pillar; a pillar names a fixed pick (the
  hook for 85I's specialized Guided players); `'never'` puts it off every
  time (the unspecialized player, for measuring); `'wait'` leaves the choice
  standing, for `tools/scenario.ts`. `answerAll` asks the rule before the
  game's default. The report prints each run's pick and year. `npm run
  scenario -- specialization` stops at the choice, and
  `specialization-notice` at the notice.
- **Save:** `SAVE_VERSION` 88 → 89, migration `noSpecializationYet` at
  `MIGRATIONS[88]`: none, with no notice and no offer, so a college already
  at the milestone is told at its next week and offered the choice at its
  next summer. `test/fixtures/save-v88.json` is the `year-8-balanced`
  scenario written before the bump. The load sanitizes a specialization that
  is not a pillar to none, and gives a choice without a year its offer's.
  `sim/harness/invariants.ts` checks the specialization and its year. The
  review's change moves no saved field.
- **What each player picks** (seeds 12345, 4242, 777): Guided academics in
  years 31, 29, 30; Completionist academics in years 36, 38, 30. Academics
  is the highest value when the choice comes (Guided seed 12345 at year 32:
  academics 111, #10; research 107, #11; student life 93, #10; athletics 60,
  #77). Selective, Lean and Idle never reach the milestone (best ranks 55)
  and never specialize.
- **The sim moves**, against main's baseline (85C), medians of three seeds;
  pillar ranks at year 50, academics / research / student life / athletics:

  | | Rank Y10 / Y25 / Y50 | Prestige Y10 / Y25 / Y50 | Satisfaction Y10 / Y25 / Y50 | Pillar ranks Y50 |
  |---|---|---|---|---|
  | Guided | 56 (+1) / 31 (+15) / 1 (−5) | 50.0 (−9.4) / 81.7 (−13.1) / 119.2 (+3.7) | 85.8 (−1.8) / 84.9 (+0.4) / 85.1 (−2.8) | 5 / 8 / 4 / 78, was 9 / 8 / 4 / 67 |
  | Completionist | 56 (+3) / 35 (+19) / 1 (−6) | 50.1 (−9.6) / 76.4 (−17.6) / 117.2 (+1.7) | 85.7 (+0.8) / 89.6 (+2.8) / 89.9 (+2.5) | 5 / 10 / 4 / 75, was 7 / 12 / 4 / 61 |
  | Selective | 60 (+4) / 58 (+8) / 61 (+8) | 43.2 (−8.4) / 51.3 (−12.2) / 52.1 (−13.0) | 86.4 (+1.2) / 83.1 (+3.3) / 81.7 (+4.6) | 56 / 65 / 22 / 100, was 53 / 58 / 5 / 100 |
  | Lean | 64 (+6) / 64 (+7) / 72 (+9) | 40.1 (−6.9) / 43.3 (−8.7) / 42.8 (−9.0) | 75.8 (+1.7) / 75.0 (+7.7) / 73.8 (+6.2) | 56 / 81 / 27 / 100, was 51 / 77 / 7 / 100 |
  | Idle | 80 (+2) / 66 (+7) / 75 (+9) | 30.4 (−1.3) / 41.9 (−7.8) / 38.8 (−7.2) | 84.0 flat | 79 / 80 / 28 / 100, was 81 / 75 / 7 / 100 |

  When the strong players first reach each place (seeds 12345, 4242, 777;
  the year's first week; the milestone is read at the summer before):

  | | Top 20 | Top 15 | Top 10 | #1 |
  |---|---|---|---|---|
  | Guided, 85C | 24, 23, 23 | 26, 26, 24 | 29, 29, 30 | never (best 6, 4, 3) |
  | Guided, first 85D (top 12, ceilings) | 24, 23, 23 | 26, 26, 24 | 29, 29, 30 | 41, 42, 39 |
  | Guided, no caps, top 12 | 31, 29, 30 | 34, 32, 34 | 36, 36, 39 | 48, 47, 50 |
  | Guided, now (top 20) | 31, 29, 30 | 34, 32, 34 | 35, 35, 38 | 42, 42, 44 |
  | Completionist, 85C | 24, 22, 22 | 27, 26, 26 | 34, 27, 39 | never (best 6, 6, 9) |
  | Completionist, first 85D (top 12, ceilings) | 24, 22, 22 | 27, 26, 26 | 33, 27, 35 | never, 46, never |
  | Completionist, no caps, top 12 | 36, 38, 30 | 40, 46, 37 | 45, 50, 43 | year 51, never, never |
  | Completionist, now (top 20) | 36, 38, 30 | 40, 44, 35 | 42, 45, 39 | 49, never (best 2), 45 |

  At year 50 Guided is first on every seed (prestige 119.8, 119.0, 119.2);
  the Completionist is first on seeds 12345 and 777 (117.2, 119.5) and
  second on 4242 (113.6). The
  same players held to no specialization (`'never'`): Guided's best place
  5, 4, 4 and year-50 prestige 111.3; the Completionist's 5, 10, 7 and
  110.5, 106.0, 110.4. They never reach first.

  - **The balance targets, all met.** Unspecialized optimal play reaches the
    top 10 and is never first (the best any reaches is 4th). The milestone
    comes in years 25–40 on every seed (Guided 29–31, the Completionist
    30–38, at the summer). A specialized strong player reaches #1: Guided on
    every seed, from years 42–44; the Completionist on two, from 45 and 49.
    Choosing earlier fills the term sooner, so first place came five or six
    years earlier than with the milestone at the top 12.
  - **Why it moves.** With no slack above a cap, a college's every shortfall
    shows: each pillar's other terms now fill 94 (or 88) of its 118 points
    rather than all of them, and the capital projects share them rather than
    sitting on top. Every player stands lower through the middle of the run
    (prestige at year 25 is 13 to 18 lower for the strong players), and the
    climb up the guide comes about six years later. Before the owner
    lowered the milestone, the rivals' targets were the one lever on the
    field: lowering them brings the milestone
    earlier but lets an unspecialized college reach first place late. In the
    trials, with targets 80% of the way from the floor to the natural
    maxima, Guided without a specialization was first in year 49 on one
    seed (milestone: Guided 33–35, Completionist 38–46); at 75%, the same
    (Guided 32–37, Completionist 36–44). The chosen targets keep the
    unspecialized college out of first place and put Guided's milestone
    inside the range. Smaller terms (18, 18, 24, 32), with the targets tied
    to the natural maxima, left the milestone where it was (Guided 33–41,
    Completionist 40–44). Then the owner lowered the milestone (above).
  - Selective, Lean and Idle fall 7 to 13 in prestige and 7 to 9 places:
    their pillars shrink with the same rescale, and student life, which
    their welfare filled, ranks in the 20s, not the top ten.
  - Enrollment falls with prestige through the middle of the run (at year
    25, Guided 22,800 and the Completionist 21,200: 1,920 and 3,360 fewer
    than the first 85D), and the smaller colleges end poorer (Selective
    $235M and Lean $97M less cash at year 50). By year 50 the strong
    players enroll as many as before.
- **The championships goal player** (`npm run review:goals -- --goals
  championships`, five seeds, two names; year 50, medians):

  | | First title | Titles by 25 | Titles by 50 | Athletics rank | Overall rank |
  |---|---|---|---|---|---|
  | 85C (and first 85D, unchanged) | 29 (13–40; 4 of 10 none) | 0 | 1 (0–3) | 11 (9–25) | 26 (22–30) |
  | Now | 23 (14–43; none without) | 1 | 2 (1–5) | 15 (11–25) | 48 (45–51) |

  Titles stay rare: a handful at most by year 50, though now every run
  wins at least one. Its athletics ranks about where it did, and its
  overall rank falls with every player's pillars (above). The milestone at
  the top 20 does not move it: its best place in any run is 41st, so it is
  never offered the choice.
- **Checks:** `npm run check`; `npm run test:slow`; `npm run sim`
  re-recorded (`--save`), then 0 deltas; `npm run phone` on the
  `specialization` scenario (the choice at 390 and 820 wide), the launch
  fixture, the notice and a year-47 save; `review:strings`, nothing new
  flagged. `test/specialization-choice.test.ts` pins the notice before the
  milestone (and once, and only within reach), the offer at the milestone's
  summer to the place (and not one place short, nor mid-year), the choice at
  the summer's close holding no week, not this year and its return, the
  opening of only the chosen pillar's term (athletics' teams too), the other
  terms' words after the choice, permanence, a save round trip (mid-choice
  too), the chronicle's line, the Final Report's title (specialized, and a
  college that never was), the migration and the load's sanitizing, and the
  harness's rule. `test/specializations.test.ts` pins the terms: every
  pillar's weights add up, a perfect unspecialized college stands at its
  natural maximum, a specialized one with its term full passes it and every
  term in full is 150, the term fills a tenth a year; the team-quality
  curve (whole below the knee, slower above, never 100, whole again with
  the specialization); the rivals unclamped (none climbs past its target,
  one above is not snapped back) and the draws.
- **Screenshots** in `docs/reviews/2026-10-pillars/`, from a Guided run
  named Blackmoor (seed 12345): `85d-notice.jpg` (the board's letter in the
  inbox), `85d-choice.jpg` and `85d-choice-phone.jpg` (the choice at 1400
  and 390 wide), `85d-choice-confirm.jpg` (the confirm step armed),
  `85d-prestige-unspecialized.jpg` (History › Prestige before the choice,
  academics opened on its empty term; taken with the milestone at the top
  12, in year 33), `85d-prestige.jpg` (after choosing, year 47), `85d-standings.jpg`, `85d-guide.jpg` and `85d-final-report.jpg`
  (the Final Report's line naming the specialization).
- **Open, for review:**
  - **The milestone is now the top 20**, nearly twice the first version's
    rank, because the climb without caps is slower (above).
  - **Both strong players pick academics.** 85I's fixed-pick variants will
    show what the other three are worth.
  - **Athletics' term is 30**, not the 40 asked for, for the championships
    player's athletics rank (above).

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

**As implemented (#277):** a college specialized in academics may build the
Faculty Training Institute, and while it stands it trains professors each
year: a pick's teaching rises a full grade, the width of its band on the
course-grade scale, and its potential with it. The academics pillar's specialization term now reads the program, the share
of the faculty trained, in place of 85D's ten years. Save version 90.
*"Lifts the academic pillar's ceiling" is the term since 85D's review: no
pillar has a ceiling (§2).* The owner decided the four questions the first
version left open on review (2026-10-01): a trainee teaches one course fewer
for a term (kept); the institute runs at $35,000 a week (kept); a training
adds a band's width, not a move to the same place in the next band
(changed); and a strong college's picks lapse once its faculty is all at
an A (kept).

- **The institute** (`projectData.ts`'s `PROJ-TRAINING`, "The Faculty
  Training Institute") is a capital project like the others, built from the
  build menu's capital projects and payable half from the endowment. It
  opens only to a college specialized in academics: `CapitalProject` gains
  `specialization`, which `projects.ts`'s `projectOpen` reads (85F's research
  park can use the same gate). It lifts no standing of its own: the term
  reads what it does.
  - **Cost:** $30M and 104 weeks, between the Graduate College ($25M, 104
    weeks) and the Law and Business Schools ($35M, 130 weeks).
  - **Its running cost, the owner's decision (2026-10-01):** upkeep of $35,000 a week
    ($1.8M a year), the Law and Business Schools' figure. There is no fee
    per trainee. A trained professor also costs more, since salary follows
    teaching.
  - **On the map:** an academic hall (the `hall` motif, the halls' deep
    roof), three stories, 11 by 7, in the civic limestone rather than the
    halls' brick, under a glazed cupola on the ridge. The cupola is a new
    signifier (`buildingSpec.ts`'s `cupola`, drawn by `buildingMotifs.tsx`'s
    `RoofSignifier`, which the hall's own branch now calls in place of the
    bell-gable). The canvas painter walks the same components
    (`canvasArt.ts`'s `registerArt(BuildingMotif, …)`), so the canvas and
    the SVG map draw it alike. It is entered through the halls' formal
    portal, and `tools/layout.ts` sites it at the foot of the capital
    projects' court.
- **Training** (`systems/faculty/training.ts`; numbers and words in
  `data/trainingData.ts`). `TRAIN_FACULTY` spends one of the year's picks.
  - **The picks:** one for every 15 professors on the roster, at least 2
    (`FACULTY_PER_TRAINING_PICK`, `MIN_TRAINING_PICKS`): 5 for a faculty of
    80, 6 for 90 to 104. A professor can be picked once a year, while below
    an A, and again in a later year.
  - **A grade's width up, the owner's decision (2026-10-01)**
    (`courseQuality.ts`'s `gradeWidth` and `oneGradeUp`): teaching rises by
    the width of the band it sits in, read off the course-grade bands: 16
    points from a B (a B's 77 becomes 93), 18 from a C, 14 from a D. An F,
    whose band has no floor of its own, takes a D's width. Teaching stops at
    100. An A has no grade above it and cannot be picked. The teaching
    potential rises by the same points, to at most 100. A professor at the
    top of a band crosses two letters (a C's 61 becomes 79); one at its
    bottom lands on the next band's floor (a B's 62 becomes 78).
    - The first version moved teaching to the same place in the next band
      up, exactly one letter: a B's 77 became 99, since A's band is the
      widest (22 points). The owner chose the band's width instead.
  - **The gain lasts:** `Faculty.training` holds the points added and the
    potential before training, and `growFaculty` grows teaching on that
    potential and adds the points (at most 100). A trainee keeps growing
    along the curve they were hired on, a grade higher.
  - **Does a trainee teach less? The owner's decision (2026-10-01):** yes, one course
    fewer for a term (26 weeks from the pick). `effectiveCourseSlots`
    subtracts one course slot while the term runs (`trainingSlotsOff`). A
    course that no longer fits moves, lowest tier first, to the strongest
    colleague in the field with a course slot free, or waits for an
    instructor. That is the research commitment's plan, shared
    (`techSystem.ts`'s `planTrainingCoverage`). The Train button asks first
    when a course would move, and names where it goes; the log says so.
  - **Picks lapse** (kept by the owner, 2026-10-01, for a faculty all at
    an A too): `s.training` is the year and the professors trained in it;
    a new year starts the list again. At the year's last week the log
    says how many went unused, and the Faculty tab says that picks not used
    by the end of the year lapse.
- **The career record** notes each training (`Career.training`, a year with
  the teaching before and after, written by `career.ts`'s `recordTraining`).
  The person view gains a Training section: "Trained at the Faculty Training
  Institute in Year 34: teaching from 73 (B) to 93 (A), and their potential
  with it." The words are `careerWords.ts`'s.
- **The Faculty tab:**
  - Over the grid, the program's bar: "3 of 5 training picks left this
    year", the rule, the lapse, and the share trained against the 40% that
    fills the term. Before the institute stands it says to build one, or
    that it is going up.
  - A *Can be trained* filter, a **Train** action on a professor's tile and
    a *Trained* badge. The Train button is hidden for an A, and disabled,
    with the reason, once the picks are spent or the professor was trained
    this year. While a trainee is at the institute, the badge takes the
    school color and gives the date the course slot returns.
  - The log has a `training` topic.
- **The term reads the program** (`specializationData.ts`'s
  `SPECIALIZATION_READINGS.academics` is `trainingData.ts`'s
  `trainingReading`). It is the share of the faculty on the roster who have
  been trained, over `TRAINED_SHARE_FOR_FULL`, 40%, at most full.
  - A professor who retires takes their training with them, and a new hire
    arrives untrained, so the program has to keep going.
  - **Without the institute standing, the term is empty,** specialized or
    not. The row says why: "…but no Faculty Training Institute stands, so
    this stays empty. Build one from the capital projects, then train
    professors there each year…". Standing, it says "21 of 87 professors
    (24%) have been trained at the Faculty Training Institute. It fills as
    that share rises, full at 40%."
  - The other three pillars still fill with the years until 85F-H.
  - **Pacing against 85D.** 85D filled the term ten years after the choice's
    summer. Now it fills in 10 or 11 years: the year the share first stood
    at 40%, from the choice (seeds 12345, 4242, 777; with the band's width):

    | | Choice | Institute opens | Half full | Full | Years to fill |
    |---|---|---|---|---|---|
    | Guided | 31, 29, 30 | 34, 32, 34 | 38, 36, 38 | 41, 39, 41 | 10, 10, 11 |
    | Completionist | 36, 38, 30 | 39, 41, 33 | 43, 45, 37 | 47, 49, 41 | 11, 11, 11 |

    It starts later, since the institute takes two years to build (half
    full after about seven years, against five), and then fills faster, at
    about 15% of the term a year.
    - At a third, it filled in 9 to 10 years (measured with the first
      version's gain). First place moved by a year or two either way,
      within the field's noise. I kept 40% to stay inside the 10 to 15
      years asked. With the first version's gain it filled in 10 to 12.
- **The choice's card** moves the institute and training from *Still to
  come* to *Now*, and the academics card's opening line ends "filling as
  professors are trained at the institute, full once 40% of the faculty has
  been trained" (the card's `fills`). The other three keep "filling over 10
  years".
- **The harness** (`sim/harness/training.ts`):
  - Guided and the Completionist already build any capital project that
    opens, so each builds the institute at once. The institute opens two
    to three years after the choice.
  - Every harness player spends the year's picks as soon as it has them
    (`game.ts`'s `playWeek`; `Player.trains` turns this off, or limits it to
    a test of the state).
  - **The pick** is the untrained professor below A with the highest
    teaching potential; once nobody untrained is left below A, the same
    among those trained before.
    - Trying the lowest potential first measured worse. Those professors
      would never reach an A unaided, but they are older, retire sooner and
      take their training with them. The term filled more slowly (40 to 47
      trained of about 83 at year 50, against 46 to 55), and Guided first
      reached first place a year later.
  - `npm run scenario -- training` stops a few weeks into Year 38 with the
    year's picks unspent. `invariants.ts` checks the list, the picks, and
    that a trained professor's potential is the potential before plus the
    points.
- **Save:** `SAVE_VERSION` 89 → 90, migration `trainingProgram` at
  `MIGRATIONS[89]`. It adds the institute to the catalog, locked (a save
  keeps the catalog it was founded with; a college already specialized in
  academics sees it open the next week), and an empty year's list.
  `test/fixtures/save-v89.json` is the `year-8-balanced` scenario written
  before the bump. The load drops a malformed training or list
  (`sanitizeTraining`, and the career's lines in `sanitizeCareers`).
- **The sim moves**, against main's baseline (85D), medians of three seeds,
  with the owner's band-width gain. Teaching is the faculty's median teaching
  at years 30, 40 and 50; the pillar ranks are at year 50, academics /
  research / student life / athletics:

  | | Rank Y10 / Y25 / Y50 | Prestige Y10 / Y25 / Y50 | Satisfaction Y10 / Y25 / Y50 | Pillar ranks Y50 | Teaching Y30 / Y40 / Y50 |
  |---|---|---|---|---|---|
  | Guided | 56 / 31 / 1 | 50.0 / 81.7 / 120.3 (+1.1) | 85.8 / 84.9 / 88.2 (+3.1) | 5 / 7 / 4 / 77, was 5 / 8 / 4 / 78 | 80 / 91 (+7) / 97 (+11) |
  | Completionist | 56 / 35 / 1 | 50.1 / 76.4 / 116.3 (−0.9) | 85.7 / 89.6 / 88.3 (−1.6) | 6 / 16 / 4 / 77, was 5 / 10 / 4 / 75 | 81 / 87 (+3) / 94 (+8) |
  | Selective | 60 / 58 / 61 | 43.2 / 51.3 / 52.1 | 86.4 / 83.1 / 81.7 | 56 / 65 / 22 / 100 | 54 / 49 / 50 |
  | Lean | 64 / 64 / 72 | 40.1 / 43.3 / 42.8 | 75.8 / 75.0 / 73.8 | 56 / 81 / 27 / 100 | 55 / 50 / 47 |
  | Idle | 80 / 66 / 75 | 30.4 / 41.9 / 38.8 | 84.0 / 84.0 / 84.1 | 79 / 80 / 28 / 100 | none |

  When the strong players first reach each place (seeds 12345, 4242, 777;
  the year's first week):

  | | Top 20 | Top 10 | #1 |
  |---|---|---|---|
  | Guided, 85D | 31, 29, 30 | 35, 35, 38 | 42, 42, 44 |
  | Guided, now | 31, 29, 30 | 36, 36, 38 | 45, 43, 45 |
  | Completionist, 85D | 36, 38, 30 | 42, 45, 39 | 49, never (best 2), 45 |
  | Completionist, now | 36, 38, 30 | 43, 46, 38 | never (best 2), 50, 46 |

  The first version's gain (a move to the same place in the next band) had
  Guided first in years 44, 43 and 45, the Completionist never (best 2), in
  year 51's first week and in 43, and median teaching of 99 at year 50.

  - **The picks** are unchanged: academics, Guided in years 31, 29 and 30,
    the Completionist in 36, 38 and 30. Selective, Lean and Idle never reach
    the milestone, never specialize and do not move.
  - **Trainees a year:** Guided trains 5 or 6 a year until about year 42.
    By then nearly every professor is at an A, so it trains 1 to 5 a year
    and lets the rest lapse (73, 88 and 78 trainings in all). The
    Completionist trains 5 a year throughout, 3 to 4 in a few late years
    (65, 50 and 91). At year 50, 38 to 54 of 77 to 83 professors are
    trained.
  - **The targets hold.** Held to no specialization (`'never'`), both
    players are exactly as before: Guided's best place 5, 4 and 4 and
    prestige 111.3 at year 50, the Completionist's 5, 10 and 7 and 110.4,
    and never first. Specialized, Guided is first on every seed from years
    43 to 45 and at year 50. The Completionist is first on 4242 at year 50
    and on 777 from year 46; on 12345 it is second, as 4242 was before.
  - **Why first place comes a year or two later:** the term starts filling
    about three years after the choice, while 85D's started at once.
    Prestige runs up to 1.2 lower through years 34 to 42 and is level by
    year 44. At year 50 Guided is 0.5 to 1.3 higher on every seed; the
    Completionist is −0.9 to +1.4. With prestige level, the rank still turns
    on the elite band, which closes on the college as it rises.
  - **Teaching:** the harness's picks are the high-potential professors just
    below an A, so a B's 77 becomes 93, and they then keep growing toward
    their raised potential. The faculty's median teaching at year 50 is 97
    for Guided (99 with the first version's gain), against 86.
  - **Fewer professors:** Guided ends year 50 with 77 to 82 against 87 to
    95, the Completionist with 80 to 83 against 87 to 93. The harness hires a
    stronger teacher for a course below an A (`moves.ts`'s `tendTeaching`),
    and with training fewer courses are below an A. Enrollment, courses and
    schools do not move.
  - **Cash at year 50:** Guided +$22M, the Completionist +$123M (a smaller
    payroll), the report's noisiest figure as before.
- **Checks:** `npm run check`; `npm run test:slow`; `npm run sim`
  re-recorded (`--save`), then 0 deltas; `npm run phone` on the launch
  fixture, the `training` scenario and the `specialization` scenario;
  `review:strings`. One new flag, "common room", was rewritten. The jargon
  count for "pot" rises by 4 only because the check matches "potential".
  - `test/training.test.ts` pins:
    - a band's width up on every band (a B's 77 to 93, a C's 50 to 68, an
      F taking a D's width), at most 100, and none for an A;
    - the institute locked without academics and with research, open with
      academics, and its description saying so;
    - training refused without the institute;
    - the picks' scale;
    - a pick raising teaching its band's width and the potential as much, a year on
      still there, with the course slot back;
    - the career line and the log;
    - not twice a year;
    - a full load shedding one course for 26 weeks;
    - picks running out, lapsing at the year's end with the log's line, and
      a full allowance the next year;
    - the term reading the share, full at 40%, empty without the institute
      and for another specialization;
    - the card;
    - the harness's pick;
    - a save round trip with malformed training dropped;
    - the migration.
  - `test/specializations.test.ts` reads the full term through the program
    and the years' fill through research.
  - `test/projects.test.ts` counts seven projects.
- **Screenshots** in `docs/reviews/2026-10-pillars/`, from a Guided run
  named Blackmoor (seed 12345) in Year 38, the `training` scenario:
  - `85e-institute.jpg`, the institute on the map (the campus laid out by
    `tools/layout.ts`);
  - `85e-grid.jpg`, the grid filtered to *Can be trained*, after two picks:
    "3 of 5 training picks left this year";
  - `85e-person.jpg`, a professor trained in Year 34 (73 to 89);
  - `85e-academics.jpg`, History › Prestige with academics opened on the
    term;
  - `85e-choice.jpg`, the choice card at Year 32 with the institute and
    training under *Now*.

  The grid, the person and the choice card were retaken after the owner's
  change to the gain; the institute and the academics breakdown are from
  the first version's run (their words did not change).
- **Decided on review (the owner, 2026-10-01):**
  - A trainee teaches one course fewer for a term. Kept.
  - The institute's upkeep is $35,000 a week, with no fee per trainee.
    Kept.
  - A training adds its band's width (about 16 points), not a move to the
    same place in the next band; the potential rises as much, to at most
    100. Changed in this PR.
  - Picks lapse once the faculty is all at an A. Kept.

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

**As implemented (#278):** only a college specialized in research may build
the Research Park, and while it stands there its Landmark work fills the
research pillar's specialization term and every lab's output is 15% higher.
The Landmark Program stays tied to the park, not to the specialization, so a
park built before this PR keeps it whatever the college chooses. Save
version 91. *"Lifts the research pillar's ceiling" is the term since 85D's
review: no pillar has a ceiling (§2).* The owner decided both questions the
first version left open on review (2026-10-01), as built: the park adds no
direct lift, and the boost is 15%.

- **The gate** (`projectData.ts`'s `PROJ-RESEARCH-PARK`): 85E's
  `CapitalProject.specialization`, `'research'`, beside its Year 12 and its
  labs (Plan 53: every standing lab has finished a research project), which
  still apply to the college specialized in research. `projectOpens` says
  both: "Opens once the college is specialized in research and every lab on
  campus has finished a research project; no other college may build it."
- **The park lifts no standing of its own, the owner's decision
  (2026-10-01).** Until now it lifted research
  18 points for any college; like 85E's institute, the term reads what it
  does instead. By 85D's rule (a pillar's other terms share the span in
  their old proportions) the 18 points' share went to the research
  pillar's other terms: what the labs have produced (80), the fields with a
  lab (40) and the Medical Center (8) now share the 94 points the park's 18
  shared with them. So the natural maximum is still 126, and a college
  without the park is no longer short of it. Keeping the lift for the
  research specialist alone would have made its term 24 plus about 12, and
  every other college's natural maximum about 114 (measured below; the
  owner kept it out).
- **The term reads the park** (`data/researchParkData.ts`'s `parkReading`,
  `SPECIALIZATION_READINGS.research`): the years of Landmark work in the
  last `LANDMARK_WINDOW_YEARS` (10), a year for each program each year it
  runs, at most `LANDMARKS_COUNTED` (3) at once, full at
  `LANDMARK_YEARS_FOR_FULL` (12). Two running without a break fill it in six
  years, three in four, and a little over one at a time holds it full. The
  window makes it a rate, not a stock, as the academics term's trained
  faculty retire. Nothing while no park stands: the row says the park is
  missing, or still going up, and how it fills.
  - **The record:** `s.research.landmarkWork`, a year and its weeks, the
    window's years only, written each week by the research tick
    (`recordLandmarkWork`). Landmark Programs could already run; nothing
    counted them.
  - **Why Landmark work:** it is the one thing only the park makes
    possible, and it costs what the specialization should: four scholars,
    eight course slots, for five years, and four weeks of operating cost
    up front.
  - **Pacing** (the harness's research variant, below): at 20 years it
    filled 13 to 16 years after the choice; at 12, in 10 to 12, as academics
    does. Money is what holds it back: the funding is four weeks of
    operating cost, about $40M in the thirties, and the research specialist
    runs one Landmark Program, at most, until about Year 40, then three.
- **The boost, the owner's decision (2026-10-01)** (`PARK_RESEARCH_BOOST`,
  15%): while the park
  stands at a college specialized in research, `researchRateMultiplier` is
  15% higher, so every lab's papers come 15% sooner, with the grants that
  ride on them; every offer's expected papers show it. A park at any other
  college gives none. Measured on the research variant: without it, first
  place came on two seeds of three (years 46 and 48; best 2nd on 4242), the
  term filled in years 41, 42 and 49, and seed 777 started only 5 Landmark
  Programs; with it, first place on every seed (years 46–47) and the term
  full in 41–42. Its effect on the pillar is small (the output term is full
  at 60 credits, which the strong players pass between years 30 and 43); it
  works through the grants, which pay for Landmark Programs.
- **Existing saves.** `SAVE_VERSION` 90 → 91, migration `researchParkGate` at
  `MIGRATIONS[90]`:
  - a park built or going up stays, with its Landmark Programs, whatever
    the college chooses; it fills no term and gives no boost unless the
    college specializes in research;
  - a park open but not begun at a college not specialized in research is
    closed again, as a new run's would be (it opens again if the college
    chooses research), and its letter's ask is done while it is closed;
  - the Landmark work is read back from what the save kept: each Landmark
    Program running, for the weeks it has run, and each finished in the
    window, for its five years, ended in the middle of its year; no more
    than three a week.
  - The park's terms and description are the catalog's on every load
    (`refreshAuthoredText`), so the gate and the lost lift reach old saves
    without the migration. `test/fixtures/save-v90.json` is the
    `year-8-balanced` scenario written before the bump. The load drops a
    malformed record (`sanitizeLandmarkWork`).
- **The words** (`researchParkData.ts`'s `PARK_WORDS`, Plan 47's glossary):
  - **the build menu** lists the park closed at the end of the capital
    projects, "specialized in research only", the reason on hover, once the
    labs have earned it (`projects.ts`'s `closedBySpecialization`). It is
    the one locked building the menu shows; the Faculty Training Institute
    shows the same way to a college not specialized in academics;
  - **the park's description**: "At a college specialized in research, its
    Landmark work fills research's specialization share and every lab's
    output is 15% higher; a park at a college specialized in anything else
    keeps its Landmark Programs and adds nothing more";
  - **History › Prestige**: the research row's term, as above; specialized
    elsewhere, "…so this stays empty. Its Research Park stays, with its
    Landmark Programs, but fills none of this"; unspecialized with a park,
    "The Research Park on campus would fill it with its Landmark work, once
    the college specializes in research";
  - **the choice's cards**: research's opening line ends "filling as
    Landmark Programs run at the park, full at 12 years of Landmark work in
    the last 10", and the park and the boost move from *Still to come* to
    *Now*. A college whose park already stands sees on the research card
    that it works at once, and on the other three that it stays but fills
    nothing and adds nothing;
  - **the Research tab**: the park's section says what it does for a
    college specialized in research (the Landmark work against the 12, the
    boost), that it does nothing for one specialized elsewhere, that it is
    the research specialization's building before the choice, and that it
    cannot be built after another;
  - **the letters**: *The laboratories* says only a college that chooses
    research may build the park; *The Research Park* comes after the choice
    and names the term and the boost; the next-step line at an unproven lab
    says the park waits on a specialization in research.
  - **Event conditions and eras:** the catalog's `research-park` need was
    already "the park stands, or three labs", so it reads true for every
    strong college; the chronicle names eras from whatever capital projects
    a college finished and assumes no park. Nothing changed.
- **The harness** (`sim/harness/researchPark.ts`):
  - Guided and the Completionist build any capital project that opens, so
    no unspecialized or academic player builds the park, and the research
    specialist builds it the year after the choice, when it can afford it.
  - Before this PR no harness player commissioned a Landmark Program (each
    lab took its cheapest research project). Now, at the top of each week
    and before the player's own moves, a college specialized in research
    with the park standing starts a Landmark Program in an idle lab whose
    offer is open, while fewer than three run and the funding leaves the
    guided player's research reserve (`commissionLandmarks`;
    `Player.landmarks` turns it off).
  - `invariants.ts` checks that the park is never open at a college not
    specialized in research, and the record's years and weeks.
  - `npm run scenario -- research-park` stops in Year 40 at a research
    specialist with the park at work; `specialization-old-park` stops at
    the choice with a park built in Year 17 (`scenarios.ts`'s
    `withOldPark`). A scenario can name a fixed pick (`specialization`).
- **The sim moves**, against main's baseline (85E), medians of three seeds;
  pillar ranks at year 50, academics / research / student life / athletics;
  the research pillar is the stock the guide prints:

  | | Rank Y10 / Y25 / Y50 | Prestige Y10 / Y25 / Y50 | Satisfaction Y10 / Y25 / Y50 | Pillar ranks Y50 | Research Y25 / Y50 |
  |---|---|---|---|---|---|
  | Guided | 56 / 29 (−2) / 1 | 50.2 (+0.2) / 80.0 (−1.6) / 120.4 (+0.1) | 85.8 / 83.7 (−1.1) / 87.8 (−0.4) | 6 / 8 / 4 / 81, was 5 / 7 / 4 / 77 | 76.3 (−3.9) / 123.1 (−0.2) |
  | Completionist | 56 / 34 (−1) / 1 | 50.1 / 79.1 (+2.7) / 118.1 (+1.7) | 85.7 / 88.2 (−1.4) / 89.8 (+1.5) | 5 / 9 / 3 / 70, was 6 / 16 / 4 / 77 | 69.6 (+7.4) / 111.7 (+4.7) |
  | Selective | 60 / 57 (−1) / 61 | 43.2 / 51.6 (+0.2) / 53.1 (+1.1) | 86.4 / 81.1 (−2.0) / 82.3 (+0.6) | 57 / 63 / 21 / 100, was 56 / 65 / 22 / 100 | 35.7 (+0.4) / 48.8 (+2.8) |
  | Lean | 64 / 64 / 72 | 40.1 / 43.3 / 42.8 | 75.8 / 75.0 / 73.8 | 56 / 81 / 27 / 100 | 31.4 / 32.0 |
  | Idle | 80 / 66 / 75 | 30.4 / 41.9 / 38.8 | 84.0 / 84.0 / 84.1 | 79 / 80 / 28 / 100 | 31.4 / 32.0 |
  | Guided, research (fixed pick) | 56 / 29 (−2) / 1 | 50.2 (+0.2) / 80.0 (−1.6) / 117.6 (−0.4) | 85.8 / 83.7 (−1.1) / 87.1 (+0.2) | 9 / 6 / 5 / 77, was 8 / 6 / 4 / 74 | 76.3 (−3.9) / 140.5 (−3.1) |

  When each first reached each place, its pick and the park (seeds 12345,
  4242, 777; the year's first week):

  | | Top 20 | Top 10 | #1 | Pick | Park begun / open |
  |---|---|---|---|---|---|
  | Guided, 85E | 31, 29, 30 | 36, 36, 38 | 45, 43, 45 | academics 31, 29, 30 | 14 / 17 on every seed |
  | Guided, now | 30, 32, 29 | 36, 40, 35 | 46, 47, 42 | academics 30, 32, 30 | never |
  | Completionist, 85E | 36, 38, 30 | 43, 46, 38 | never (best 2), 50, 46 | academics 36, 38, 30 | 28 / 31, 31 / 34, 20 / 23 |
  | Completionist, now | 33, 39, 31 | 40, 43, 40 | 47, never (best 2), 47 | academics 34, 39, 31 | never |
  | Guided, research, 85E | 31, 29, 30 | 35, 35, 38 | 45, 46, 46 | research 31, 29, 30 | 14 / 17 on every seed |
  | Guided, research, now | 30, 32, 29 | 36, 41, 35 | 47, 47, 46 | research 30, 32, 30 | 31 / 33, 33 / 35, 31 / 33 |

  Selective, Lean and Idle never reach the milestone (best 55th), never
  specialize and never built the park.

  - **The research path** (Guided with a fixed pick of research, the 85D
    hook): it builds the park the year after the choice (open two years
    later), starts its first Landmark Program within four years of the
    park's opening, as the money allows, and runs three from about Year 40
    (10, 9 and 10 in all). The term is half full in years
    39, 40 and 40 and full in 41, 42 and 42: 11, 10 and 12 years after the
    choice. It is first from years 47, 47 and 46 and at year 50 on every
    seed (prestige 118.4, 116.4, 117.6), a year or two later than the
    academic Guided and than 85E's research variant, whose term filled with
    the years and whose park had stood since Year 17. Its research pillar
    ranks 5th to 7th at year 50 (target 149.9, but the stock drifts toward
    it: 137 to 143), with the rivals' research specialists near 150; its
    academics ranks 9th to 10th, the Landmark Programs' scholars teaching
    eight fewer course slots each. 85I's "its pillar is #1 by a clear
    margin" is not met by research, and should be looked at there.
  - **Neither strong player now picks research.** Both pick academics, as
    before, in nearly the same years: losing the park did not change their
    strongest pillar.
  - **The targets hold.** Held to no specialization (`'never'`): Guided's
    best place 3, 3 and 5 (was 5, 4, 4), prestige at year 50 110.9 (was
    111.3); the Completionist's 4, 3 and 7 (was 5, 10, 7), 110.5 (was
    110.4). Neither is ever first. Specialized, both reach first place:
    Guided on every seed (academics or research), the Completionist on two
    of three, as before.
- **What unspecialized colleges lose**, measured:
  - **The Landmark Program.** No harness player commissioned one before
    (85E's research variant started 0 to 2 by the guided line), so the
    harness loses nothing it used; a player loses the deepest research and
    the likeliest prize (a 45% base award chance against 20% for a Major
    Program).
  - **The park's lift, mid-run.** Guided built the park in Year 14 and had
    its 18 points from Year 17; now its research target at year 25 is 98.9,
    against 108.1 (the stock 76.3 against 80.2; on seed 4242 70.0 against
    80.2). By Year 50 the other terms are full and it is level (123.1). The
    Completionist, which built the park late (years 23 to 34), gains: its
    other terms count for more from the start (research 69.6 against 62.2
    at year 25, 111.7 against 107.0 at year 50).
  - **The cost.** The park's $45M and $45,000 a week are saved.
  - **The net:** the unspecialized strong players stand a little higher,
    and come a place or two closer to first (best 3rd, against 4th), never
    reaching it. That is the rescale of the research pillar's terms (above),
    not a change anywhere else.
  - **Measured for the decision, the park's lift kept** (18 points, for
    the research specialist alone; everything else as here): held to no
    specialization, Guided's best place 7, 6 and 9 and prestige at year 50
    107.9 (−3.4 against 85E), research at year 50 111.4 (−12.2); the
    Completionist's best 5, 10 and 8, 107.4 (−3.0). The top 20 came 0 to 5
    years later. Neither was first.
- **Checks:** `npm run check`; `npm run test:slow`; `npm run sim`
  re-recorded (`--save`), then 0 deltas; `npm run phone` on the launch
  fixture (a pre-85F park standing), the `research-park` scenario and the
  `specialization-old-park` choice; `review:strings`, nothing new flagged
  (new strings avoid "standing"; the jargon count for "Landmark Program"
  rises with the feature).
  - `test/researchPark.test.ts` pins the gate (closed to every other
    specialization and to none, open to research once the labs have
    finished, listed closed in the build menu, its words), the lost lift,
    an existing park keeping its Landmark Programs and offers, a non-research
    pick keeping the park with no term and no boost (and the row and cards
    saying so), the term reading the Landmark work (the window, the full
    mark, three at once, nothing without the park or while it goes up), the
    research tick's record, the card, the boost only when specialized with
    the park, the migration (a closed park, an open one kept for research,
    the launch fixture's running Landmark Program read back), a round trip
    and a malformed record, and the harness's rule.
  - `test/projects.test.ts` opens the park for a research college, and pins
    the Medical Center as the one project lifting research;
    `test/specializations.test.ts` and `test/training.test.ts` read the
    years' fill through student life; `test/guided.test.ts` holds its third
    run ("Harrow College") to research, so the Research Park's letter, which
    the other two are no longer sent, is delivered and done there (by Year
    30), and fifty years of a research specialist keep the rules.
- **Screenshots** in `docs/reviews/2026-10-pillars/`, from Guided runs named
  Blackmoor (seed 12345):
  - `85f-build-gated.jpg`, the capital projects in Year 21, unspecialized:
    the park and the institute closed;
  - `85f-research.jpg`, History › Prestige in Year 40 at a research
    specialist (the `research-park` scenario), research opened on its term;
  - `85f-research-tab.jpg`, the Research tab's park section there;
  - `85f-choice.jpg`, the choice in Year 31 with the park and the boost
    under *Now*;
  - `85f-choice-old-park.jpg`, the same choice at a college whose park was
    built in Year 17 (`specialization-old-park`).

  The park's look on the map is unchanged.
- **Decided on review (the owner, 2026-10-01):**
  - The park adds no direct lift: its 18 points go to the research
    pillar's other terms by 85D's rule, and the natural maximum stays 126.
    Kept as built.
  - The boost is 15% to every lab's output while the park stands at a
    college specialized in research. Kept as built.
- **For 85I** (open):
  - **The reading's pace:** a player who can fund three Landmark Programs
    at once fills the term four years after the park opens, faster than
    the academics term can fill. The harness's research specialist, held
    back by the funding, fills it in 10 to 12 years.
  - **The research specialist's research pillar** ranks 5th to 7th at
    year 50 (its stock 137 to 143, drifting toward 149.9, with the rivals'
    research specialists near 150): "its pillar is #1 by a clear margin" is
    not met.
  - **The unspecialized players come closer to first:** held to no
    specialization, best 3rd (Guided 3, 3, 5; the Completionist 4, 3, 7),
    against 4th before, never first. The margin is a place or two.
  - **The labs' gate stays:** the research specialist's park still waits on
    every standing lab having finished a research project (Plan 53).
  - **Neither strong player picks research;** the specialized variants are
    85I's.

## PR 85G — The athletic performance complex

- **A complex on the map,** buildable only with this specialization.
- **Flagship slots** above the subsidy cap (for example two more), a
  recruiting boost, and better odds deep in the postseason.
- **Lifts the athletics pillar's ceiling.**
- **Checks:** the harness's athletics specialist wins titles regularly by
  year 50, and an unspecialized goal player rarely does.

**As implemented (#280):** a college specialized in athletics may build the
Athletic Performance Complex, and while it stands there the department may
name two flagships above its subsidy level's, its scholarships recruit a
sixth more, and the college plays stronger in its own semifinals and finals.
The athletics pillar's specialization term now reads what the complex
produces, the department's deep postseason runs over the last ten years, in
place of 85D's ten years. Save version 92. *"Lifts the athletics pillar's
ceiling" is the term since 85D's review: no pillar has a ceiling (§2).*
**The owner's decisions (2026-10-01), reviewing the first version:**

1. **The complex's cost is kept:** $30M to build over 104 weeks, and $35,000
   a week to run.
2. **Fewer titles: about one or two a year, around 25 to 40 by year 50.**
   The first version's athletics specialists won 56 to 80, up to seven in a
   year. The complex's postseason edge was halved (a semifinal +5 → +3, a
   final +8 → +4) and its recruiting boost with it (+⅓ → +⅙); the two extra
   flagships were kept. That is not enough on its own: the specialists win
   49 to 64 (Guided) and 28 to 69 (the Completionist). What drives the count
   is the athletics specialization's own lift (85D), not the complex: with
   no slowdown and no edge for the established powers, every flagship plays
   at 100 and wins, and with none of the complex's mechanics at all Guided
   still won 31 to 38.
3. **A quarter of the big stage stays (the owner chose the lever,
   2026-10-01), amending 85D's lift.** Against a college specialized in
   athletics the established powers keep a quarter of their postseason edge,
   2 in a quarterfinal, 5 in a semifinal and 9 in a final (`playoffs.ts`'s
   `SPECIALIZED_STAGE_SHARE`, 0.25, beside `STAGE_EDGE`; 85D took it all
   away). The complex's +3 and +4 come off what is left, so a college with
   the complex faces 2, 2 and 5. Unspecialized colleges keep the full 8, 20
   and 35. The term's full mark comes down with the runs, from 40 to 30.
   The specialists now win 32 to 46 (Guided) and 16 to 38 (the
   Completionist) by year 50, about one or two a year.

- **The complex** (`projectData.ts`'s `PROJ-ATHLETICS-COMPLEX`, "The
  Athletic Performance Complex") is a capital project like the others, built
  from the build menu's capital projects and payable half from the
  endowment. It opens only to a college specialized in athletics, through
  85E's `CapitalProject.specialization` gate (`projects.ts`'s `projectOpen`),
  and the build menu lists it closed, with the reason, to any other college
  (85F's `closedBySpecialization`). It lifts no standing of its own: the
  term reads what it does.
  - **Cost (kept by the owner):** $30M and 104 weeks, with upkeep of $35,000
    a week: the Faculty Training Institute's figures, the other specialization
    building a college raises at the choice. The venues are far cheaper (the
    Football Stadium is $6.5M, the Arena $1.8M), but the complex is a
    capital project, priced with the Graduate College ($25M) and the
    professional schools ($35M).
  - **On the map:** a big modern block (the `block` motif), three stories,
    13 by 9, in the curtain wall the Natatorium shares, glass from plinth to
    eaves, with a running track on its roof: a rust-red oval round a green
    infield with a white lane line. The track is a new signifier
    (`buildingSpec.ts`'s `track`, drawn by `buildingMotifs.tsx`'s
    `RoofSignifier`). It is one glazed box, not the hospital's slab and wing
    that every large `block` splits into, and it carries no roof plant. The
    canvas painter walks the same components (`canvasArt.ts`'s
    `registerArt(BuildingMass, …)`), so the canvas and the SVG map draw it
    alike. `tools/layout.ts` sites it beside the venues, below the diamond
    between the arena's row and the recreation lane (row 35, column 68).
- **Its mechanics** (`data/athleticsComplexData.ts`), only while the complex
  stands at a college specialized in athletics (`complexWorks`). The
  specialization alone keeps 85D's lift, as amended (no slowdown above the
  knee; the established powers' edge shrunk to a quarter), and gets none of
  these.
  - **More flagships** (`COMPLEX_FLAGSHIPS`, 2): `departmentPot`'s cap is the
    subsidy level's 2, 4 or 6 and two more; the pot carries `baseCap`, the
    subsidy level's alone. Each is funded in full and may recruit.
  - **A recruiting boost (the owner's halving: a sixth,
    `COMPLEX_RECRUITING_BOOST`; it was a third):** `recruitingTarget` takes
    the boost, so full scholarships build to +17.5 over the four classes, not
    +15. It builds and falls away a class a year, as recruiting does. The
    scale's top is `RECRUITING_MAX_LIFT`, 17.5, which the load's clamp and
    the invariants read.
  - **Better odds deep in the postseason (the owner's halving:
    `COMPLEX_HOME_EDGE`, 3 in a semifinal and 4 in a final; it was 5 and
    8):** with the athletics specialization `stageEdge` is the quarter of
    the big stage left (2 / 5 / 9) less the complex's edge, so the college
    faces 2, 2 and 5 points in its own quarterfinals, semifinals and finals.
    At 25 points of difference the stronger side wins three times in four.
    The words say the complex cuts the established powers' edge by a
    further 3 and 4 points. The draws are unchanged.
- **The term reads the complex** (`complexReading`,
  `SPECIALIZATION_READINGS.athletics`): the department's deep runs in the
  last `COMPLEX_WINDOW_YEARS` (10), a title worth 1, a lost final a half and
  a lost semifinal a quarter (`COMPLEX_POINTS`), full at
  `COMPLEX_POINTS_FOR_FULL` (30). Nothing while no complex stands: the row
  says the complex is missing, or still going up, and how it fills.
  Standing, it reads "…training at the Athletic Performance Complex, its
  programs have made 12 titles, 9 lost finals and 10 lost semifinals in the
  last 10 years, 19 points (a title counts 1, a lost final a half and a lost
  semifinal a quarter). It fills as that rises, full at 30."
  - **The record:** `orgs.complexRuns`, a year, a sport and a finish, the
    window's years only, written by the postseason (`playoffs.ts`'s
    `runPlayoffs`, `recordComplexRun`), and only while the complex works:
    titles won before it stood count for nothing.
  - **Why deep runs:** they are what the complex is for, and the window makes
    the term a rate, not a stock, as the research park's Landmark work is:
    the department has to keep winning. Counting lost finals and semifinals
    smooths a title count that jumps by the year. A reading of flagships at
    an elite quality would fill within three years of the complex: with the
    slowdown gone, every flagship of the harness's specialist plays at 100
    about six years after the choice.
  - **Pacing:** at 12 points the term filled three years after the complex
    opened; the first version's 40 filled it in 10 to 12 years. With a
    quarter of the big stage kept the deep runs fall to 26 to 40 points a
    window at year 50, and the full mark comes down to 30, which fills it 9
    to 12 years after the choice, the build included, as academics and
    research fill. At 25 (the coordinator's "about 25") it filled in 8 to
    10, early on four of six runs, so 30 it is. At year 50 the term reads
    1.0 on five runs and 0.88 on one.

    | | Choice | Complex begun / open | Half full | Full | Years to fill |
    |---|---|---|---|---|---|
    | Guided, athletics | 30, 32, 30 | 31 / 33, 33 / 35, 31 / 33 | 37, 39, 37 | 40, 44, 41 | 10, 12, 11 |
    | Completionist, athletics | 34, 39, 31 | 35 / 37, 40 / 42, 32 / 34 | 41, 47, 37 | 45, 51, 40 | 11, 12, 9 |
- **The words** (`athleticsComplexData.ts`'s `COMPLEX_WORDS`, Plan 47's
  glossary, which gains *deep run*):
  - **the choice's card:** the athletics card's opening line ends "filling
    as its programs make deep runs once the Athletic Performance Complex
    stands, full at 30 points in the last 10 years (a title counts 1, a lost
    final a half and a lost semifinal a quarter)", and the complex and its
    mechanics move from *Still to come* to *Now*. Student life's are the
    only ones still to come;
  - **the Athletics tab:** the department panel gains *The Athletic
    Performance Complex*: standing, the flagships it may name against the
    subsidy level's, the recruiting and the postseason edge, and the deep
    runs against the 30 points; going up, or open to build, what it will do;
    otherwise that it is the athletics specialization's own building. The
    Flagships figure reads "8 of 8" and its hint counts the complex's slots;
    the order's help says the line is the subsidy's and the complex's; a
    flagship's scholarship buttons and recruiting line say +17.5 at the
    complex;
  - **the complex's description** says what it does, and only for a college
    specialized in athletics.
- **The harness** (`sim/harness/athletics.ts`): once a college specializes in
  athletics, every player (unless `Player.athletics` is false) runs the
  department as the specialization asks, at the top of each week: it builds
  the complex once it opens and the cash keeps the guided player's reserve
  (Guided and the Completionist build any capital project anyway); runs the
  high subsidy level; fills every empty coaching post with the best
  candidate listed while the week is in the black, and replaces a
  flagship's coach with one fifteen points better after two years (the
  championships player's rule); keeps the flagships it has put on full
  scholarships at the top of the list and the rest by quality below, so a
  slot the complex adds goes to the strongest of the rest and nobody it has
  invested in is demoted; puts every flagship on full scholarships once the
  year's net covers them; and builds the Field House. Before the choice
  nothing changes: Guided runs no department, as before.
  - The championships goal player runs its own department
    (`athletics: false`), builds the complex when it opens and chooses
    flagships for the complex's slots too. `npm run review:goals -- --goals
    championships --specialization athletics` gives a goal player a fixed
    pick (the 85D hook); its runs record their pick and a *top 20* mark.
  - `invariants.ts` checks that the complex is never open at a college not
    specialized in athletics, the record (inside the window, a deep run, one
    a sport a year, only at an athletics college) and recruiting up to
    `RECRUITING_MAX_LIFT`.
  - `npm run scenario -- athletics-complex` stops a few weeks into Year 37
    at a Guided run held to athletics, the complex standing and eight
    flagships.
- **Save:** `SAVE_VERSION` 91 → 92, migration `athleticsComplex` at
  `MIGRATIONS[91]`: the complex joins the catalog, locked (it opens the next
  week for a college specialized in athletics, as a new run's does), and the
  record starts empty. `test/fixtures/save-v91.json` is the
  `year-8-balanced` scenario written before the bump. The load drops a
  malformed run (`sanitizeComplexRuns`) and clamps recruiting to 0–17.5.
- **The sim moves**, against main's baseline (85F), medians of three seeds;
  pillar ranks at year 50, academics / research / student life / athletics:

  | | Rank Y10 / Y25 / Y50 | Prestige Y10 / Y25 / Y50 | Satisfaction Y10 / Y25 / Y50 | Pillar ranks Y50 |
  |---|---|---|---|---|
  | Guided | 56 / 29 / 1 | 50.2 / 80.0 / 120.4 | 85.8 / 83.7 / 87.8 | 6 / 8 / 4 / 81 |
  | Completionist | 56 / 34 / 1 | 50.1 / 79.1 / 118.1 | 85.7 / 88.2 / 89.8 | 5 / 9 / 3 / 70 |
  | Selective | 60 / 57 / 61 | 43.2 / 51.6 / 53.1 | 86.4 / 81.1 / 82.3 | 57 / 63 / 21 / 100 |
  | Lean | 64 / 64 / 72 | 40.1 / 43.3 / 42.8 | 75.8 / 75.0 / 73.8 | 56 / 81 / 27 / 100 |
  | Idle | 80 / 66 / 75 | 30.4 / 41.9 / 38.8 | 84.0 / 84.0 / 84.1 | 79 / 80 / 28 / 100 |
  | Guided, athletics (fixed pick) | 56 / 29 / 1 (−1) | 50.2 / 80.0 / 123.5 (+7.8) | 85.8 / 83.7 / 87.1 (+0.3) | 8 / 9 / 4 / 1, was 8 / 9 / 4 / 19 |
  | Completionist, athletics (fixed pick) | 56 / 34 / 1 (−2) | 50.1 / 79.1 / 120.5 (+7.2) | 85.7 / 88.2 / 88.9 (−0.4) | 8 / 14 / 4 / 1, was 9 / 14 / 4 / 13 |

  When each first reached each place, its pick and the complex (seeds 12345,
  4242, 777; the year's first week):

  | | Top 20 | Top 10 | #1 | Pick | Complex begun / open |
  |---|---|---|---|---|---|
  | Guided | 30, 32, 29 | 36, 40, 35 | 46, 47, 42 | academics 30, 32, 30 | never |
  | Completionist | 33, 39, 31 | 40, 43, 40 | 47, never (best 2), 47 | academics 34, 39, 31 | never |
  | Guided, athletics, 85F | 30, 32, 29 | 35, 42, 34 | 49, never (best 4), never (best 2) | athletics 30, 32, 30 | (none) |
  | Guided, athletics, now | 30, 32, 29 | 34, 38, 36 | 43, 45, 42 | athletics 30, 32, 30 | 31 / 33, 33 / 35, 31 / 33 |
  | Completionist, athletics, 85F | 33, 39, 31 | 39, 43, 42 | 50, never (best 3), never (best 3) | athletics 34, 39, 31 | (none) |
  | Completionist, athletics, now | 33, 39, 31 | 39, 43, 38 | 46, 50, 44 | athletics 34, 39, 31 | 35 / 37, 40 / 42, 32 / 34 |

  - **Nothing moves but the athletics specialists.** Guided, the
    Completionist, Selective, Lean and Idle are identical to main's on every
    seed, year by year: the strong players pick academics, the rest never
    reach the milestone (best 55th), and no unspecialized college can open
    the complex. `sim/baseline.json` is re-recorded unchanged.
  - **The targets hold.** Held to no specialization (`'never'`), Guided's best
    place is 3, 3 and 5 and its prestige at year 50 110.9; the
    Completionist's 4, 4 and 7 and 110.5: as before, never first.
    Specialized in athletics, Guided is first on every seed, from years 43,
    45 and 42 and at year 50; the Completionist on every seed too, from 46,
    50 and 44 (4242, which chooses in Year 39, in year 50's first week).
    With the halved edge and boost but no quarter of the big stage the
    years were 42, 45, 40 and 45, never (2nd), 45; with the first version's
    42, 45, 42 and 46, never, 43. Before, held to
    athletics, Guided was first on one seed (Year 49) and the Completionist
    on one (Year 50).
  - **Why the athletics specialist now stands highest of all:** its prestige
    at year 50 is 122.1 to 123.8, against 119.0 to 120.6 for Guided's own
    academics pick. Most of it is the department, not the complex: Guided
    hires no coaches and names no flagships unless it is specialized in
    athletics, so its athletics pillar stands at 57 to 61 (80th to 81st)
    when it picks academics, and about 144 (1st) when it runs the department
    as the specialization asks. At 15% of prestige that is about 13 points,
    against the 8 or so the academics term is worth at 35%. The
    academic pick's athletics is the harness's choice not to run a
    department; 85I's balance pass should compare specialists that run every
    pillar alike.
- **Titles** (the plan's check). Titles by year 25 and 50, the first title,
  the athletics rank and the overall rank at year 50; the goal player's are
  medians of five seeds and two names, the variants' per seed (12345, 4242,
  777):

  | | First title | Titles by 25 | Titles by 50 | Athletics rank Y50 | Overall rank Y50 |
  |---|---|---|---|---|---|
  | Championships goal player, unspecialized (main and now) | 22 (13–42) | 1 | 2 (1–5) | 15 (11–25) | 48 (45–50) |
  | Championships goal player, athletics pick | the same: never offered the choice (best place 41st) | | | | |
  | Championships goal player, handed athletics at Year 30 (what-if) | 22 (13–30) | 1 | 95 (75–105) | 1 | 38 (34–41) |
  | Guided, athletics, 85F | never | 0 | 0 | 18, 19, 19 | 1, 4, 2 |
  | Guided, athletics, first version (+5 / +8, +⅓) | 31, 35, 31 | 0 | 65, 56, 80 | 1, 1, 1 | 1, 1, 1 |
  | Guided, athletics, halved (+3 / +4, +⅙), no quarter | 31, 35, 31 | 0 | 61, 49, 64 | 1, 1, 1 | 1, 1, 1 |
  | Guided, halved, no quarter, no extra flagships | 31, 35, 31 | 0 | 44, 43, 52 | 1, 1, 1 | 1, 1, 1 |
  | Guided, none of the complex's mechanics, no quarter | 31, 36, 31 | 0 | 35, 31, 38 | 1, 1, 1 | (measured with the term at 12) |
  | Guided, halved, a quarter kept, term full at 25 | 33, 35, 32 | 0 | 40, 30, 26 | 1, 1, 1 | 1, 1, 1 |
  | **Guided, athletics, now (halved, a quarter kept, full at 30)** | 33, 35, 32 | 0 | **41, 32, 46** | 1, 1, 1 | 1, 1, 1 |
  | Completionist, athletics, 85F | never | 0 | 0 | 13, 11, 15 | 1, 3, 3 |
  | Completionist, athletics, first version | 35, 42, 32 | 0 | 48, 33, 70 | 1, 1, 1 | 1, 2, 1 |
  | Completionist, halved, no quarter | 35, 42, 32 | 0 | 48, 28, 69 | 1, 1, 1 | 1, 2, 1 |
  | Completionist, halved, no quarter, no extra flagships | 35, 42, 32 | 0 | 28, 22, 43 | 1, 1, 1 | 1, 2, 1 |
  | Completionist, halved, a quarter kept, full at 25 | 37, 42, 33 | 0 | 18, 16, 40 | 1, 1, 1 | 1, 2, 1 |
  | **Completionist, athletics, now** | 37, 42, 33 | 0 | **19, 16, 38** | 1, 1, 1 | 1, 1, 1 |

  - **The check is met:** the athletics specialist wins titles regularly
    from two or three years after its choice, one to two a year (at most
    five in one year), and the unspecialized championships player still
    wins one to five in fifty years (unchanged: first title a median 22,
    one by year 25, two by year 50, athletics 15th, overall 48th). Nothing
    moves before the choice (no title by year 25 for anyone held to
    athletics).
  - **The owner's target, about 25 to 40:** Guided wins 32 to 46 and the
    Completionist 16 to 38. Medians 41 and 19; across the two runs measured
    with the quarter (full at 25 and at 30) Guided won 26 to 46 and the
    Completionist 16 to 40. The full mark moves prestige a little, and with
    it the whole run, so title counts shift a few between runs.
  - **Why the lever was needed** (the measurements behind the owner's
    choice): halving the complex's edge and boost was not enough on its own.
    Halving the edge and the boost took off only 4 to 16 titles for Guided.
    Of what is left, the two extra flagships are worth 6 to 17 for Guided
    and 6 to 26 for the Completionist (without them Guided wins 43 to 52,
    the Completionist 22 to 43), and the
    specialization's lift itself about 31 to 38: with none of the complex's
    mechanics, every flagship plays at 100 about six years after the choice
    and no established power has an edge over it. The extra flagships are
    the complex's largest driver but not the main one, so they are kept.
  - **The lever, measured before the owner chose it** (in a copy, with the
    term still at 40): with a quarter kept Guided won 18 to 41 and the
    Completionist 12 to 30; with half kept, 13 to 26 and 9 to 10; with three
    quarters, 7 to 10 and 2 to 7. The owner chose a quarter.
  - **The championships goal player never reaches the milestone,** so a
    fixed athletics pick changes nothing for it (its best place in any run
    is 41st): it builds athletics first and the college that pays for it
    second, and athletics is 15% of prestige. Measured
    only as a what-if (a measurement copy that hands it the athletics
    specialization at Year 30, which the game never does): it wins 75 to 105
    titles by year 50 (median 95), its athletics ranks 1st on every run, and
    its overall rank at year 50 is 38 (34 to 41), against 48. So the complex
    makes an athletics-first college the best in its pillar, but athletics
    alone cannot carry a college to first place: that needs the other three
    pillars near the top, as the Guided and Completionist variants have.
- **What is left for 85I** (open):
  - **The title counts are noisy:** 16 to 46 across seeds and players, a
    seed's late choice (the Completionist on 4242, Year 39) leaving it the
    fewest. The athletics pillar is full either way (its titles term fills
    at 12 weighted titles), so the count matters for the term's pacing and
    the side effects (applicants, donors) more than for prestige.
  - **The athletics specialist stands above the academic one** at year 50
    (above): a harness asymmetry, for 85I's variants.
  - **The championships goal player cannot specialize:** it never reaches
    the top 20 (best 41st), and even handed the specialization it stands
    38th at year 50.
- **Checks:** `npm run check`; `npm run test:slow`; `npm run sim` re-recorded
  (`--save`), then 0 deltas; `npm run phone` on the launch fixture, the
  `athletics-complex` scenario and the `specialization` choice;
  `review:strings`, nothing new flagged (new strings avoid "standing"; the
  jargon counts for "flagship", "subsidy" and "capital project" rise with
  the feature).
  - `test/athleticsComplex.test.ts` pins the gate (closed to every other
    specialization and to none, listed closed in the build menu, open to
    athletics, no lift, its words), the extra flagship slots (only with the
    complex standing at an athletics college; on any subsidy level; the
    rules counting them), the recruiting boost (past +15 only with both),
    the postseason edge (the established powers' full edge without the
    specialization, a quarter of it, 2 / 5 / 9, with it alone or while the
    complex goes up, and the quarter less the complex's with both), the term reading the deep runs (the window, the
    points, the full mark, nothing without the complex or while it goes up,
    empty for another specialization, the record written only while the
    complex works), the card, the migration from the version-91 fixture, a
    round trip and a malformed record, and the harness's rule (it builds the
    complex, runs the high subsidy, fills every slot on full scholarships
    and every post the market can, and leaves another specialization
    alone).
  - `test/projects.test.ts` counts eight projects; `test/recruiting.test.ts`
    clamps an edited save to `RECRUITING_MAX_LIFT`;
    `test/specialization-choice.test.ts` fills athletics' term through the
    complex.
- **Screenshots** in `docs/reviews/2026-10-pillars/`, from a Guided run named
  Blackmoor (seed 12345) held to athletics, the `athletics-complex` scenario
  in Year 37, the campus laid out by `tools/layout.ts`:
  - `85g-complex.jpg`, the complex on the map beside the venues;
  - `85g-athletics-tab.jpg`, the Athletics tab: eight flagships, the
    complex's section, the trophy case;
  - `85g-athletics-term.jpg`, History › Prestige with athletics opened on
    the term (19 of 30 points);
  - `85g-choice.jpg`, the choice in Year 31 (the `specialization`
    scenario) with the complex and its mechanics under *Now*.

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

**As implemented (#281):** a college specialized in student life sees the
town beside its campus grow into a downtown district, holds a festival each
spring, and hears from the town. The district meets part of the students'
social, dining and housing needs; the festival buys satisfaction, next
summer's applicants and, at the gala, alumni gifts; a spring without one,
and some of the town-and-gown events' answers, cost the town's goodwill. The
student-life pillar's specialization term now reads the festivals of the
last ten springs, carried by the district's growth and the town's goodwill,
in place of 85D's ten years. Save version 93. *"Lifts the student-life
pillar's ceiling" is the term since 85D's review: no pillar has a ceiling
(§2).* **Every size below was proposed here and kept as proposed by the
owner on review (2026-10-01); evening student life against the other
specializations is left to 85I.**

- **The district** (`data/downtownData.ts`, `systems/studentlife/
  downtown.ts`'s `tickDowntown`): `s.downtown.growth`, 0 to 1, rises each
  week at a college specialized in student life, full after
  `DISTRICT_YEARS_TO_FULL` (10) years at the goodwill a town starts with (50),
  scaled by `districtPace` (0.5 + goodwill / 100: half again as fast at full
  goodwill, half as fast at none). Nothing else moves it, and it never
  shrinks. Guided held to student life (seed 12345, choosing in Year 30)
  has it grown in full in Year 39, its goodwill high from the festivals.
- **On the map** (`ringLand.ts`'s `buildDistrict`, drawn by
  `Surroundings.tsx`), in `DISTRICT_STEPS` (6) steps by the growth:
  - terraced shops along Main Street, two to four stories, flat-roofed with
    a parapet, in the town's own brick, buff and stone and three painted
    fronts; on the street side a shopfront, an awning in one of five colors
    and a blade sign square to the street. They fill out from the frontage
    across the road from the campus, then along the town's;
  - from the third step a taller row behind the shops, an alley back, with
    apartments over it;
  - strings of lights across the street on poles;
  - a house a shop stands on gives way at the shop's step; every other house
    stays, and a college specialized in anything else keeps the plain town
    (the owner's earlier choice). The land is built on its own random
    numbers, so the district never moves a field, a tree or a house.
  - **Lit:** the map has no night. The district is lit (the shopfronts and a
    share of the windows warm, the bulbs glowing, pools of light on the
    street under each string) for `FESTIVAL_LIT_WEEKS` (3) from a festival
    and through the winter weeks, when the evenings come early (the map's
    snow at `WINTER_LIT_SNOW`, 0.5, or deeper; with the seasons setting off,
    only the festival's weeks). `districtLit`.
  - **Cost:** the step and the lights are part of `ringView`'s cache key and
    the canvas's ring signature, so the ring is rebuilt when either changes
    (a few times a year), never per frame. The canvas and the SVG map draw
    it from the same components, with presentation attributes only.
- **Off-campus life** (`satisfactionSystem.ts`'s `offCampusPlaces`):
  `OFF_CAMPUS_SHARE` (**15%**) of each of the social, dining and
  housing needs, times the growth, as the dial reads the need
  (`expectedRatio`). They count with the buildings in `servedPopulationFor`
  and, for housing, beside the beds (`bedsWithDowntown`), so the dials,
  crowding, a demand and the building panel's need line all read them. At a
  Year-50 college of 34,480 that is about 1,880 social places, 5,170 meals
  and 1,930 beds. They cost nothing and count first toward the need, so they
  never push the buildings past the space-beyond-need line
  (`beyondNeed.ts`'s `needCapacity`). **Where they show:** each need's
  drawer in the Students tab ("Downtown, off campus"), the housing card's
  beds, the build menu's top line ("19,590 beds · 1,773 downtown · 33,440
  enrolled"), and a new Students-tab panel, *The downtown* (growth, places,
  goodwill, festivals, the last festival).
- **The festival** (`downtownData.ts`'s `FESTIVAL_EVENT`, raised by
  `catalogueEngine.ts`'s `raiseFestival`): at the Spring Term's fourth week
  (`FESTIVAL_WEEK`, 30), an inline matter in the inbox from the student
  government, once a spring, raised like the charter (undrawn, so the run's
  stream is untouched; no seat answers it; the clock runs). Six weeks to
  answer; left, the modest weekend (the student government holds one
  whatever the administration decides). Its answer is the catalog's new
  `festival` lever (`downtown.ts`'s `holdFestival`). **Proposed sizes:**

  | Scale | Cost (catalog sum; at a large college) | Satisfaction | Next summer's applicants | Town goodwill | Term points |
  |---|---|---|---|---|---|
  | A modest weekend | $50,000; $600,000 | +1 | +1% of last summer's pool | +2 | 0.4 |
  | A street fair | $125,000; $1.5M | +2 | +2% | +4 | 0.7 |
  | A festival with a headline act | $250,000; $3M | +3 | +3% | +6 | 1 |
  | A headline gala | $500,000; $6M | +4 | +4% | +8 | 1.2 |
  | No festival | nothing | | | **−10** | 0 |

  - The costs scale with the budget as every catalog event's do
    (`priceScale`: twelve times by the time any college specializes); late
    in the run a large college's week's net is about $2.5M.
  - At the gala the alumni give `FESTIVAL.gala.gifts` (6%) of a year's
    annual giving to the endowment: about $2.6M in Year 38, $5–6M in the
    late forties, so the gala comes close to paying for itself late in the
    run. The applicants are the summer's one-time lift
    (`students.applicantLift`, about 1,100 for a headline act at a pool of
    36,000).
  - The answers' words in the inbox say each effect ("+1,458 applicants next
    summer · town goodwill +8 · alumni gifts of about $2.6M to the
    endowment"). The log says what was held, and a spring without one.
  - **A chronicle occasion:** each era says how many springs held the
    festival and how many as a gala, and names the springs the town went
    without (`chronicleData.ts`'s `festival*` lines); a gala year is an era
    kind of its own, *The Gala Years* (below a building boom, above a quiet
    year).
- **The town's goodwill** (`s.downtown.goodwill`, 0 to 100, from
  `GOODWILL_START`, 50; none existed): each festival raises it, a skipped
  spring costs `SKIPPED_GOODWILL` (10), and the town-and-gown events trade
  it (the catalog's new `goodwill` lever). It paces the district and carries
  the term.
- **Town and gown** (six events, `eventCatalogue.ts`'s `town-*`, gated on
  the new condition `downtownAtLeast`, the district's growth, which reads 0
  at a college not specialized in student life, so no other college's draws
  move): the noise on Main Street (patrol, quiet, or "the downtown was the
  town's idea"), the Bell's partnership offer (crest and all, on the
  college's terms, or no), the street festival wanting the main quad, the
  rents downtown, late-night buses and the college's colors in the shop
  windows. Each trades money, the students' mood and the town's goodwill;
  the two with a cooldown of five years or less have two more tellings
  (`eventVariants.ts`), and each has a title for the inbox. Plan 47's
  glossary gains *the downtown*, *the festival* and the town's *goodwill*.
- **The term reads the program** (`downtownReading`,
  `SPECIALIZATION_READINGS.studentLife`): festival points in the last
  `FESTIVAL_WINDOW_YEARS` (10) springs (this spring's once decided), over
  `FESTIVAL_POINTS_FOR_FULL` (10), times (0.5 + 0.5 × growth), times (0.5 +
  0.5 × goodwill / `GOODWILL_FOR_FULL`, 60, at most 1). So a headline act
  every spring fills it in ten, the district carries half of it at first,
  and a town gone cold halves it. **Empty with no festival in the window,
  and the row says so:** "…no spring festival has been held in the last 10
  years, so this stays empty. Hold the festival each spring…". Filling, it
  reads "7 festivals in the last 10 years, 7 of the 10 points that fill it
  (a modest weekend counts 0.4, …). The downtown has grown 96% of the way,
  which carries half the term at first and all of it once grown, and the
  town's goodwill stands at 100, in full from 60."
  - **Pacing** (the harness's variants, below; the year the term first read
    half and full):

    | | Choice | Half full | Full | Years to fill | Festivals held |
    |---|---|---|---|---|---|
    | Guided, student life | 30, 32, 30 | 37, 39, 38 | 41, 42, 43 | 11, 10, 13 | 20 headline acts; 13 galas and 5 headline acts; 16 headline acts, 3 galas and a weekend |
    | Completionist, student life | 34, 39, 31 | 42, 46, 38 | 46, 50, 42 | 12, 11, 11 | 15 headline acts and a weekend; 11 headline acts; 19 headline acts |

    About 10 to 12 years, as the other three fill; Guided on seed 777 took
    13, a weekend and a slower start costing it a year.
  - 85D's years' fill is gone: every pillar reads its mechanic, and
    `SPECIALIZATION_DETAILS` is a full record.
- **The choice's card** (`SPECIALIZATION_CARDS.studentLife`): the district,
  the festival and town and gown move from *Still to come* to *Now*; its
  opening line ends "filling as the college holds its spring festival, full
  at 10 points of festivals in the last 10 years (a festival with a headline
  act counts 1), carried by the downtown's growth and the town's goodwill".
  Nothing on any card is still to come, and the board's notice no longer
  says the rest arrives in time.
- **The harness** (`sim/harness/downtown.ts`, `Player.downtown`): once a
  college specializes in student life, every player, at the top of each
  week:
  - holds the festival each spring at the largest scale whose cost two weeks
    of the week's net cover with the guided player's reserve kept
    (`FESTIVAL_NET_WEEKS`), the modest weekend at the least, never none;
  - answers each town-and-gown event for the town's goodwill and the
    students' mood together, the cheaper of two alike, within the reserve;
  - counts the downtown's beds with the campus's before building a residence
    hall (`moves.ts`'s `buildDorm`); the dining and social places need no
    move, since every player's plain sense reads the needs through the
    satisfaction model.
  - `invariants.ts` checks the growth and goodwill ranges, the festivals'
    order and scales, and that no downtown grows at another college. `npm
    run scenario -- downtown` stops in Year 38 with the festival waiting
    (the district grown), `downtown-early` two years after the choice, and
    `town-and-gown` at the first town-and-gown event.
- **Save:** `SAVE_VERSION` 92 → 93, migration `downtownStarts` at
  `MIGRATIONS[92]`: no growth, the starting goodwill and no festival. A
  college already specialized in student life (its term filling with the
  years) starts its district at the next week and is asked about its first
  festival at the next Spring Term's fourth week; until then its term reads
  empty. `test/fixtures/save-v92.json` is the `year-8-balanced` scenario
  written before the bump. The load clamps the growth and goodwill and drops
  a malformed festival (`sanitizeDowntown`; one a year, a known scale, none
  later than the save's year).
- **The sim moves**, against main's baseline (85G), medians of three seeds;
  pillar ranks at year 50, academics / research / student life / athletics:

  | | Rank Y10 / Y25 / Y50 | Prestige Y10 / Y25 / Y50 | Satisfaction Y10 / Y25 / Y50 | Pillar ranks Y50 |
  |---|---|---|---|---|
  | Guided | 56 / 29 / 1 | 50.2 / 80.0 / 120.4 | 85.8 / 83.7 / 87.8 | 6 / 8 / 4 / 81 |
  | Completionist | 56 / 34 / 1 | 50.1 / 79.1 / 118.1 | 85.7 / 88.2 / 89.8 | 6 / 9 / 3 / 70 |
  | Selective | 60 / 57 / 61 | 43.2 / 51.6 / 53.1 | 86.4 / 81.1 / 82.3 | 57 / 63 / 21 / 100 |
  | Lean | 64 / 64 / 72 | 40.1 / 43.3 / 42.8 | 75.8 / 75.0 / 73.8 | 56 / 81 / 27 / 100 |
  | Idle | 80 / 66 / 75 | 30.4 / 41.9 / 38.8 | 84.0 / 84.0 / 84.1 | 79 / 80 / 28 / 100 |
  | Guided, student life (fixed pick) | 56 / 29 / 1 | 50.2 / 80.0 / 118.6 (−1.8) | 85.8 / 83.7 / 88.8 (+1.0) | 9 / 8 / 3 / 81 |
  | Completionist, student life (fixed pick) | 56 / 34 / 2 (+1) | 50.1 / 79.1 / 117.0 (−1.1) | 85.7 / 88.2 / 87.9 (−1.9) | 9 / 9 / 3 / 75 |
  | Guided, no specialization (`'never'`) | 56 / 29 / 4 | 50.2 / 80.0 / 110.9 | 85.8 / 83.7 / 86.8 | 9 / 8 / 4 / 85 |
  | Completionist, no specialization | 56 / 34 / 5 | 50.1 / 79.1 / 110.5 | 85.7 / 88.2 / 88.2 | 8 / 9 / 4 / 75 |

  The variants' moves are against the same player's own academic pick.
  When each first reached each place, and its pick (seeds 12345, 4242, 777;
  the year's first week):

  | | Top 20 | Top 10 | #1 | Pick | Prestige Y50 |
  |---|---|---|---|---|---|
  | Guided | 30, 32, 29 | 36, 40, 35 | 46, 47, 42 | academics 30, 32, 30 | 120.4, 119.0, 120.6 |
  | Completionist | 33, 39, 31 | 40, 43, 40 | 47, never (best 2), 47 | academics 34, 39, 31 | 118.1, 113.1, 119.5 |
  | Guided, student life | 30, 32, 29 | 36, 40, 35 | 44, never (best 2), 44 | student life 30, 32, 30 | 119.0, 117.2, 118.6 |
  | Completionist, student life | 33, 39, 31 | 39, 44, 41 | 51 (the run's last week), never (best 2), 49 | student life 34, 39, 31 | 117.0, 112.3, 118.1 |
  | Guided, no specialization | 30, 32, 29 | 38, 44, 34 | never (best 3, 3, 5) | none | 112.6, 109.8, 110.9 |
  | Completionist, no specialization | 33, 39, 31 | 39, 44, 44 | never (best 4, 3, 7) | none | 110.5, 107.6, 110.8 |

  - **Nothing moves but the student-life specialists.** Guided, the
    Completionist, Selective, Lean and Idle are identical to main's, year by
    year: the strong players pick academics, the rest never reach the
    milestone (best 56th), and no other college grows a downtown, holds a
    festival or draws a town-and-gown event. `sim/baseline.json` is
    re-recorded unchanged.
  - **The targets.** Unspecialized (`'never'`), neither strong player is
    ever first: Guided's best place 3, 3 and 5, the Completionist's 4, 3 and
    7. Specialized in student life, Guided is first from Year 44 on seeds
    12345 and 777 and holds it at Year 50; on 4242 it is second (117.2,
    choosing in Year 32 and holding galas from Year 33). The Completionist is
    first on 777 from Year 49 and on 12345 in Year 51's first week, at the
    run's close; on 4242, which chooses in Year 39, it is second. The default
    players are unchanged.
  - **Against the other specializations:** held to student life, Guided is
    first two years earlier than its own academic pick on 12345 (44 against
    46), two years later on 777 (44 against 42) and not at all on 4242
    (against 47); its prestige at Year 50 is 1 to 2 lower (118.6 median
    against 120.4). The academic term is worth
    more to prestige (24 points at 35%, about 8.4, against student life's 30
    at 25%, 7.5), and the training program lifts teaching beyond its term.
    Research (Guided first on every seed, years 46 to 47) and athletics (42
    to 45) are measured in their notes.
  - **The pillar:** student life stands at 133 to 138 at Year 50 and ranks
    3rd on every run: the rivals' student-life specialists stand near 150.
    Welfare is full (satisfaction pays in full from 80), but campus life,
    beauty and the capital projects are a few points short (in Year 38,
    18.2 of 21.1, 9.9 of 10.6 and 20.2 of 21.1), and the pillar's stock
    drifts toward its target. As for research (85F), "its pillar is #1 by
    a clear margin" is for 85I.
  - **Off-campus places in use:** the harness's dining halls and social
    buildings are the same in number as its academic pick's (Guided 6 and
    10, the Completionist 8 and 12): its plain sense builds for what the
    model calls short, and the downtown's meals carry the dining need the
    halls leave short (Guided's basic needs read 90 in Year 38 with
    academics and 100 with student life), which is most of the student-life
    Guided's satisfaction gain. Its residence halls move by a hall either way by
    seed (beds at Year 50: Guided 29,630, 14,750 and 29,670, against 29,670,
    19,670 and 24,710; the Completionist 19,710, 24,470 and 29,550 against
    24,670, 19,470 and 24,670), since a hall is 5,000 beds and the harness
    builds beds for nine students in ten, far past the housing need, so the
    downtown's 1,930 beds delay a hall a year or two rather than save one.
  - **Town and gown:** the specialists drew 0 to 6 of the six
    town-and-gown events in their 11 to 20 years (the inline catalog's cadence, a handful of
    eligible events among some 150), answering each for goodwill and mood;
    the goodwill stood at 100 at Year 50 on every run, the festivals alone
    raising it 6 to 8 a spring.
  - **Cash at year 50** moves with the run, the report's noisiest figure as
    before (Guided held to student life $986M, $113M and $540M; the gala
    years cost Guided on 4242 about $6M a spring).
- **Checks:** `npm run check`; `npm run test:slow`; `npm run sim`
  re-recorded (`--save`), then 0 deltas; `npm run phone` on the launch
  fixture, the `downtown` scenario and the `specialization` choice;
  `review:strings`: one new flag, "the Saturday" (British idiom), rewritten;
  new strings avoid "standing".
  - `test/downtown.test.ts` pins the district's growth (a tenth a year at a
    goodwill of 50, faster warm and slower cold, none at another college,
    the week's tick, the map's steps), the off-campus places (15% of each
    need grown, half at half, none at another college, counted with the
    buildings and in the drawers, the housing dial and coverage, the space
    past need untouched), the festival (raised from the Spring Term's fourth
    week, once, drawing nothing, only at a student-life college; the gala's
    cost, mood, applicants, goodwill and gifts; the record; the lights; a
    smaller scale; the default; a skipped spring's goodwill and log; goodwill
    floored at none), the town-and-gown events (gated at every other
    specialization and before the district, trading goodwill), the term
    (empty without a festival and saying so, full with ten headline acts,
    three quarters half grown, half with no goodwill, the window), the
    card, the chronicle's lines, the map (step 0 the plain town, shops for
    houses as it grows, lit and dark, the land untouched), the migration
    from the version-92 fixture, a round trip and a malformed downtown, and
    the harness's rule.
  - `test/specializations.test.ts` fills student life's term through the
    festivals; `test/training.test.ts` and `test/athleticsComplex.test.ts`
    read the student-life card as built.
- **Screenshots** in `docs/reviews/2026-10-pillars/`, from a Guided run
  named Blackmoor (seed 12345) held to student life (it chooses in Year 30):
  - `85h-district-early.jpg`, Year 32: the first shops across Main Street
    from the campus;
  - `85h-district-grown.jpg`, Year 38 (the `downtown` scenario): the
    district grown, by day;
  - `85h-district-lit.jpg`, the same week after the gala was answered: lit;
  - `85h-festival.jpg`, the festival in the inbox, each scale's effects;
  - `85h-town-and-gown.jpg`, Year 33 (the `town-and-gown` scenario): the
    late-night buses;
  - `85h-off-campus.jpg`, the Students tab: the downtown in the basic needs
    and housing drawers, and the downtown's panel; `85h-build-beds.jpg`, the
    build menu's line of beds;
  - `85h-student-life-term.jpg`, History › Prestige with student life opened
    on the term;
  - `85h-choice.jpg`, the choice in Year 31 (the `specialization` scenario)
    with the district, the festival and town and gown under *Now*.
- **Open, for the owner's review:**
  - **Every size:** the off-campus share (15%), the district's ten years
    and its pace with goodwill, the festival's costs and effects (the
    table), the gala's gifts (6% of a year's giving), a skipped spring's
    10 points of goodwill, the term's reading (10 points in 10 springs,
    half carried by the district, goodwill in full from 60), and the
    town-and-gown events' sums.
  - **The default if nobody answers** is the modest weekend, so only a
    deliberate "No festival this year" costs goodwill. A default of none
    would make an inattentive specialist pay.
  - **Lit:** the map has no night, so "lights at night" became the
    festival's three weeks and the winter weeks. A night of the map's own
    would be a larger change.
  - **The gala late in the run** nearly pays for itself in gifts, so a rich
    college holds one every spring; the harness's rule (two weeks of the
    week's net) holds the headline act most years.
  - **The student-life specialist** reaches first on two seeds of three for
    each strong player, a little behind the academic pick in prestige, and
    its pillar ranks 3rd (85I).

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

**As implemented (#282):** the sim report plays the Guided player held to
each of the four specializations and to none, beside the plain Guided
player, which picks its strongest pillar (academics). Every player at the
milestone now runs the athletics department alike, which was the harness's
asymmetry, and three constants were retuned so that unspecialized play stays
out of first place once it does. `sim/baseline.json` is re-recorded with
the five new players and each player's rank in the four pillars. No save
change.

- **The players** (`sim/report.ts`'s `VARIANTS`): *Guided, academics*,
  *Guided, research*, *Guided, student life* and *Guided, athletics*, each
  a fixed pick through 85D's hook (`Player.specialization`), and *Guided,
  unspecialized* (`'never'`), the fourth target's own player. Everything but
  the pick is the Guided player's. Under each player the report prints, per
  seed, its pick and year, the first year it stood in the top 20, the top 10
  and first, and its own pillar's place and margin over the next school at
  Year 50 (a player without a pick, its best pillar's). The pillar ranks at
  years 10, 25 and 50 are figures of their own, diffed like the rest.
  `--players <regex>` and `--seeds a,b,c` measure part of the report and are
  never saved; every run's rows land in `node_modules/.tmp/report-runs.json`.
- **Every pillar run alike** (`sim/harness/athletics.ts`'s
  `runsDepartment`): until now only a college specialized in athletics ran
  its department (the high subsidy, every coaching post filled, the
  flagships ordered and on full scholarships, the Field House), so the
  academic, research and student-life picks and the unspecialized player
  hired no coaches and named no flagships, and their athletics stood 56 to
  62, 71st to 90th. Now every player runs it once the college reaches the
  milestone (offered the choice: the overall top 20), whatever it chooses or
  if it chooses nothing; only the complex stays the athletics specialist's.
  Nothing changes before the milestone, nor for Selective, Lean and Idle,
  which never reach it; the championships goal player runs its own
  (`athletics: false`). The research park's Landmark Programs, the
  institute's training and the festival are each their own
  specialization's mechanics, so they stay with it. The fix alone, before
  any tuning (Guided players, seeds 12345, 4242 and 777):
  - their athletics rises to 83 to 88 and ranks 20th to 40th, and prestige
    at Year 50 by 2.6 to 4.8: Guided (academics) 124.1, 121.6 and 123.5
    (was 120.4, 119.0 and 120.6), first from years 40, 43 and 42 (was 46,
    47 and 42); the athletics pick, which ran it already, is unchanged;
  - **the unspecialized player reaches first place** on two seeds of
    three (115.8 from Year 49 on 12345, 115.4 from Year 47 on 777; second on
    4242 at 114.4), against best places 3, 3 and 5 before. That is the
    fourth target broken, and what the tuning below answers.
- **The untouched numbers** (main's harness and constants with the variants
  added; seeds 12345, 4242 and 777; the year's first week):

  | | Top 20 | Top 10 | #1 | Prestige Y50 | Own pillar Y50: rank, margin | Other pillars Y50 (aca/res/life/ath) |
  |---|---|---|---|---|---|---|
  | Guided, academics (= Guided) | 30, 32, 29 | 36, 40, 35 | 46, 47, 42 | 120.4, 119.0, 120.6 | #6 −1.5; #6 −1.6; #6 −1.6 | –/8/4/80; –/9/4/81; –/8/5/81 |
  | Guided, research | 30, 32, 29 | 36, 41, 35 | 47, 47, 46 | 118.4, 116.4, 117.6 | #5 −7.0; #7 −12.7; #6 −9.5 | 9/–/4/76; 9/–/5/77; 10/–/5/81 |
  | Guided, student life | 30, 32, 29 | 36, 40, 35 | 44, never (best 2), 44 | 119.0, 117.2, 118.6 | #3 −13.1; #3 −15.7; #3 −14.4 | 8/8/–/81; 9/9/–/71; 10/8/–/82 |
  | Guided, athletics | 30, 32, 29 | 34, 38, 36 | 43, 45, 42 | 123.8, 122.1, 123.5 | #1 +12.0; #1 +11.7; #1 +11.8 | 8/9/4/–; 8/9/4/–; 10/8/5/– |
  | Guided, unspecialized | 30, 32, 29 | 38, 44, 34 | never (best 3, 3, 5) | 112.6, 109.8, 110.9 | (best: student life #4, #4, #5) | 9/7/4/78; 9/8/4/85; 10/9/5/90 |

  Each specialist reached first on two or three seeds, and the
  unspecialized player never did; but only athletics led its own pillar.
  The rivals' specialists stood at the top of the scale: at Year 50 four
  academic and three research specialists stood at 150, and two student-life
  ones near 148, so the college could at best tie them, and its research
  and student-life rankings read stocks that drift toward the pillar (about
  12% of the gap a year) and stood at 137 to 143 and 133 to 137. Athletics'
  rivals stop at 85 of 100, 132 on the prestige scale.
- **The tuning** (three constants; the owner's decided values are untouched:
  the top-20 milestone, no hard caps, the band-width training gain, the
  park's no-lift rule and 15% boost, the complex's $30M, the quarter of the
  big stage and 85H's sizes):
  1. **The rivals' specialists ease toward 140, not 150**
     (`rivalsSystem.ts`'s `SPECIALIZED_CEILING`; athletics' band is
     unchanged at 85, 132). Reason: a college that specializes and runs its
     program stands at 148 to 150 in its pillar, and only below that can it
     lead the field by a clear margin. On its own (measured): academics
     #1 by 8.0 to 8.4 on every seed, research #1 on one seed (by 1.8),
     student life still 3rd; but the top of the field fell with the
     specialists' pillars and the unspecialized player was first on all
     three seeds, from years 47, 48 and 41.
  2. **The specialization terms, 24/24/30/30 → 28/28/34/34**
     (`prestigeSystem.ts`'s `SPECIALIZATION_TERM_WEIGHTS`; natural maxima
     122, 122, 116 and 116). Reason: the term is what a specialization is
     worth over unspecialized play, and with every department run alike the
     unspecialized college stood within 6 to 8 points of the specialists and
     level with the top of the field. Four more points each widen it: by the
     arithmetic they take about 3.7 points off an unspecialized strong
     college's prestige and 2.3 to 3.3 off a specialist's (its own pillar's
     term is full either way). With the ceiling at 140 and the terms but not
     change 3, the unspecialized player was first on one seed of three (Year
     47 on 4242).
  3. **The rivals' unspecialized academics eases toward 118, not 112**
     (`RIVAL_UNSPECIALIZED_TARGETS.academics`; research 112, student life 107
     and athletics 90 are unchanged). Reason: with the specialists' ceiling
     lower, the top of the field needed lifting where it does not cost the
     college its other pillars. The field's academics is the one
     unspecialized axis that rises steadily (`fieldRise`, the others random
     walks), 118 is where a strong unspecialized college's academics stands
     at Year 50 (113.7 to 119.7) and 4 under its natural maximum, and it
     raised the best rival at Year 50 by about 1.8 (a median 114.5 against
     112.8 over the five variants' runs). Raising research's or student
     life's would have pushed the college's own unspecialized pillars down
     the tables.

  Changes 2 and 3 move every run from the founding, so the climb to the
  milestone is 1 to 7 years later (below).
- **The final numbers.** The moves, against main's baseline (85H), medians
  of three seeds; pillar ranks at Year 50, academics / research / student
  life / athletics (the five new players against the untouched numbers
  above):

  | | Rank Y10 / Y25 / Y50 | Prestige Y10 / Y25 / Y50 | Satisfaction Y10 / Y25 / Y50 | Pillar ranks Y50 |
  |---|---|---|---|---|
  | Guided | 57 (+1) / 34 (+5) / 1 | 49.6 (−0.6) / 77.9 (−2.1) / 120.2 (−0.2) | 88.8 (+3.0) / 84.4 (+0.6) / 89.4 (+1.6) | 1 / 8 / 4 / 29, was 6 / 8 / 4 / 81 |
  | Completionist | 57 (+1) / 38 (+4) / 1 | 49.2 (−1.0) / 75.0 (−4.0) / 116.0 (−2.0) | 85.4 (−0.3) / 87.4 (−0.8) / 87.9 (−1.9) | 1 / 19 / 4 / 35, was 5 / 9 / 3 / 70 |
  | Selective | 60 / 58 (+1) / 62 (+1) | 43.4 (+0.2) / 50.8 (−0.8) / 51.2 (−1.9) | 86.5 (+0.1) / 81.8 (+0.7) / 82.3 (−0.1) | 60 / 61 / 24 / 100, was 57 / 63 / 21 / 100 |
  | Lean | 66 (+2) / 66 (+2) / 74 (+2) | 39.8 (−0.3) / 41.8 (−1.5) / 42.6 (−0.3) | 79.8 (+4.0) / 70.7 (−4.3) / 78.1 (+4.2) | 58 / 83 / 24 / 100, was 56 / 81 / 27 / 100 |
  | Idle | 82 (+2) / 67 (+1) / 74 (−1) | 29.7 (−0.7) / 41.6 (−0.4) / 38.2 (−0.6) | 84.0 / 84.0 / 84.1 | 78 / 80 / 33 / 100, was 79 / 80 / 28 / 100 |
  | Guided, academics | as Guided | | | |
  | Guided, research | 57 (+1) / 34 (+5) / 1 | 49.6 (−0.6) / 77.9 (−2.1) / 117.8 (+0.2) | 88.8 (+3.0) / 84.4 (+0.6) / 84.9 (−2.2) | 9 / 5 / 4 / 37, was 9 / 6 / 5 / 77 |
  | Guided, student life | 57 (+1) / 34 (+5) / 1 | 49.6 (−0.6) / 77.9 (−2.1) / 118.7 | 88.8 (+3.0) / 84.4 (+0.6) / 89.4 (+0.7) | 10 / 7 / 3 / 42, was 9 / 8 / 3 / 81 |
  | Guided, athletics | 57 (+1) / 34 (+5) / 1 | 49.6 (−0.6) / 77.9 (−2.1) / 119.1 (−4.4) | 88.8 (+3.0) / 84.4 (+0.6) / 87.1 | 9 / 8 / 4 / 1, was 8 / 9 / 4 / 1 |
  | Guided, unspecialized | 57 (+1) / 34 (+5) / 3 (−1) | 49.6 (−0.6) / 77.9 (−2.1) / 111.0 (+0.1) | 88.8 (+3.0) / 84.4 (+0.6) / 88.5 (+1.8) | 9 / 8 / 4 / 34, was 9 / 8 / 4 / 85 |

  When each first reached each place, and where it stood at Year 50 (seeds
  12345, 4242, 777; the year's first week):

  | | Top 20 (the pick) | Top 10 | #1 | Rank Y50 | Prestige Y50 | Own pillar Y50: rank, margin | Other pillars Y50 (aca/res/life/ath) |
  |---|---|---|---|---|---|---|---|
  | Guided, academics (= Guided) | 33, 35, 31 | 42, 41, 39 | 47, 47, 43 | 1, 1, 1 | 115.5, 120.2, 121.4 | #1 +3.7; #1 +8.1; #1 +8.6 | –/18/6/27; –/7/4/29; –/8/4/40 |
  | Guided, research | 33, 35, 31 | 42, 41, 41 | never (best 2), 46, 47 | 2, 1, 1 | 113.6, 117.8, 118.0 | #6 −8.5; #5 −1.7; #5 −1.5 | 16/–/6/32; 9/–/4/41; 9/–/4/37 |
  | Guided, student life | 33, 35, 31 | 41, 41, 40 | 49, 44, 45 | 1, 1, 1 | 115.7, 118.7, 118.7 | #3 −8.3; #3 −9.7; #3 −8.1 | 18/14/–/13; 10/6/–/42; 9/7/–/45 |
  | Guided, athletics | 33, 35, 31 | 41, 42, 39 | 51 (the run's last week), 45, 44 | 2, 1, 1 | 116.0, 119.1, 119.9 | #1 +11.0; #1 +11.4; #1 +11.9 | 20/15/4/–; 9/8/7/–; 9/8/4/– |
  | Guided, unspecialized | 33, 35, 31 | 47, 44, 42 | never (best 8, 3, 3) | 8, 3, 3 | 105.0, 111.0, 111.0 | (best: student life #4, #5, #4) | 15/22/4/34; 9/7/5/39; 9/8/4/31 |
  | Completionist (academics) | 35, 40, 38 | 44, 45, 44 | 49, 51 (the run's last week), 49 | 1, 2, 1 | 117.1, 112.4, 116.0 | #1 +8.7; #1 +6.4; #1 +7.7 | –/16/4/39; –/20/4/34; –/19/5/35 |

- **Against the targets** (the harness's three seeds):
  1. **Each specialized variant reaches first by Year 50 on some seeds:
     met.** Academics on three (from years 47, 47 and 43), student life on
     three (49, 44, 45), research on two (46, 47; second on 12345) and
     athletics on two (45, 44; on 12345 second at Year 50 and first in the
     run's last week). Prestige at Year 50: 113.6 to 121.4.
  2. **Its pillar #1 by a clear margin: met for academics and athletics,
     not for research and student life.** *Proposed: "clear" is 5 points or
     more over the next school at Year 50, on the prestige scale the guide
     prints.* Athletics leads by 11.0 to 11.9 on every seed, academics by 8.1
     and 8.6 on two (3.7 on 12345, whose academics stood at 143.7). Research
     ranks 5th to 6th (1.5 to 8.5 behind) and student life 3rd (8.1 to 9.7
     behind): their rankings read the stocks, 131.5 to 138.5 and 129.3 to
     131.9, while the pillars themselves stood at 143.0 to 149.9 and 144.2
     to 146.6. The levers cannot close that: the stock trails its pillar by
     years (about 12% of the gap a year), and a rival ceiling low enough to
     sit under it (about 125) would sink the whole field.
     **The smallest change that would meet it (proposed, not built):** rank
     the college's research and student life on their pillar values, as its
     academics and athletics already are, not on the stocks
     (`rivalsSystem.ts`'s `selfValue` and `pillarColumns`; nothing reads the
     stocks back into a decision). Read that way, at Year 50, research leads
     by 9.9 and 9.8 on two seeds (3.0 on 12345) and student life by 6.6, 7.1
     and 6.4 on all three. Alternatively the stocks could drift faster
     (`PRESTIGE_DRIFT_RATE`).
  3. **Its other pillars near the top: met for academics, research and
     student life on two seeds of three; not for athletics.** *Proposed:
     the top 10.* Academics, research and student life rank 4th to 10th on
     4242 and 777; on 12345, the weakest run (below), student life ranks 4th
     to 6th but academics and research 14th to 22nd.
     Athletics without its specialization ranks 13th to 45th, a median
     around 35th: titles are rare without it by the owner's design (85C), so
     its titles term (a fifth of the pillar's span) stays nearly empty, and
     the rivals' 22 athletic specialists stand above. It was 71st to 90th
     before the harness ran the department.
  4. **Unspecialized play stays top 10 and never first: met.** Best places
     8, 3 and 3; 8th, 3rd and 3rd at Year 50, at 105.0 to 111.0 (the
     specialists' 113.6 to 121.4). On five more seeds (1, 2, 3, 99, 2024;
     measured only) it was first on one, seed 1, in its last two years by
     0.6 (110.7 against 110.1), and best 2nd to 4th on the others; the
     research variant was first on four of the five, the athletics variant
     on all five.
- **The weakest run is seed 12345** under the new terms: every Guided
  player there reaches the milestone in Year 33 (it was 30) and stands
  lower all run (prestige at Year 40 about 98 to 102, against 103 to 108 on
  the other seeds; about 31,000 students at Year 50 against 34,480), so its
  specialists end
  at 113.6 to 116.0 and its academics, research and student life lower in
  their tables.
- **Side effects:**
  - **The milestone comes later.** The Guided players reach the top 20 in
    years 31 to 35 (were 29 to 32), the Completionist in 35, 40 and 38 (were
    33, 39 and 31): inside the owner's 25 to 40, with the Completionist on
    4242 at its edge. Moving the milestone (the owner's top 20) would buy
    margin; I left it.
  - **The top of the field holds less above about 118:** a rival's
    unspecialized pillars ease toward their targets and its specialized one
    toward 140, so its prestige tops out at about 117.8 (a student-life
    specialist), against about 120.8 with 150. So a late leader standing
    above that (72I's contested first place) can no longer be passed when it
    slips. `test/first-place.test.ts`'s leader is rescaled from 119 (best
    125) to 112 (best 118), as 85C rescaled it.
  - **The athletics specialist** stands lower than the others' gain would
    suggest (119.1 median, −4.4), its three-point lead over the academic pick
    gone: every pick now runs the department, and the terms' change costs a
    specialist in athletics the most. Its titles by Year 50 are 36, 26 and
    35 (were 41, 32 and 46), inside the owner's 25 to 40; it chooses two to
    three years later.
  - **The Completionist** runs the department too and now leads academics
    on every seed; it is first at Year 50 on 12345 and 777 (from Year 49),
    as before on two seeds of three, and on 4242 in the run's last week.
  - Selective, Lean and Idle move a little with the terms (prestige −0.3 to
    −1.9 at Year 50, a place or two) and never reach the milestone (best
    55th). Cash at Year 50 moves as ever (Guided $270M, +$154M).
- **The endowment** (85C's open question). Measured as a what-if (a copy
  of the unspecialized Guided player whose endowment is topped up each week
  from the milestone; not a harness rule): with a full endowment ($400,000
  a student, about $13.8 billion at 34,480 students, +8 points) it is
  **first on every seed**, from years 47, 44 and 42, at 115.1, 119.0 and
  119.7; with half (+4 to +5) it is first on two seeds of three (years 45
  and 46). Before the tuning (the department run, the constants
  untouched) a full endowment was first from years 39, 44 and 41. The
  report's players never come near it (a fifth of full at best, +1.6), but
  it is within a real player's reach: the natural player, which prices high,
  holds $8.6 billion in cash at Year 40 and $20.6 billion at Year 50 beside
  a $3.1 billion endowment (seed 12345), so a college that swept its cash
  into the endowment would fill it years before Year 50. A rich
  unspecialized college can buy first place with the endowment, which the
  pillars are built to prevent. **Proposed, not
  built:** fold the endowment into a pillar as one of its terms (academics',
  say), where 85D's rule shares the pillar's span and no term lifts an
  unspecialized college past its natural maximum; a full endowment would
  then be worth about 2 points, not 8. Alternatives: halve it (+4), or give
  the rivals an endowment of their own so the asymmetry 85B noted goes.
- **Run time:** the report plays each run in a process of its own, as many
  at once as there are cores (`SIM_JOBS` to change it), as `npm run
  review:goals` does. The 30 runs now take 10.6 to 11.6 minutes on four
  cores, against 13.5 minutes for main's 15 runs one at a time, so the five
  new players need no flag; on one core it would be about 27 minutes. Each
  process plays one run, so the numbers are the same as one process playing
  them in turn (the untouched run reproduced main's baseline exactly).
- **Not changed, for the owner:**
  - **A research player funding three Landmark Programs fills its term in
    four years** (12 years of Landmark work, three at once), where academics
    takes six at the least (about a fifteenth of the faculty trained a year,
    full at 40%) and student life about nine (ten points of festivals, a
    gala worth 1.2). The harness's specialist is held back by money and
    fills it 9 to 11 years after the choice, so nothing in the report shows
    it. Counting two at once (`LANDMARKS_COUNTED`) would make six years the
    fastest.
  - **The student-life term on seed 777** filled only in Year 47 (half in
    40): the festival's scale follows the week's net.
- **Checks:** `npm run check`; `npm run test:slow`; `npm run sim`
  re-recorded (`--save`), then 0 deltas; `npm run phone`; `review:strings`.
  `test/athleticsComplex.test.ts` pins the harness's new rule (a college at
  the milestone runs the department whatever it chose, and if it chose
  nothing, never the complex; one short of it is left alone);
  `test/first-place.test.ts` is rescaled (above). No UI changed, so no
  screenshots.
- **Open, for the owner's review:**
  - the three constants above, and "clear" as 5 points;
  - research's and student life's margin: rank them on the pillar, not the
    stock (or a faster stock);
  - the endowment: into a pillar, halved, or the rivals' own;
  - athletics as "near the top" for a college not specialized in it;
  - the milestone's later arrival (the Completionist on 4242 in Year 40).

**The owner's decisions (2026-10-01), reviewing the first version:**

1. **The three constants are kept** (the 140 ceiling, the terms of 28, 28,
   34 and 34, the rivals' academics target of 118). **A clear margin is 5
   points or more** over the next school at Year 50.
2. **Research and student life are ranked on their pillar values**, as
   academics and athletics already were, not on the stocks that drift
   toward them. Built: `rivalsSystem.ts`'s `selfValue` (every ranking:
   the standings, the guide's place in each pillar, the annual report's
   other standings, the History record's `standingValues`, so the Final
   Report's research and experience axes and its charts, the Research and
   Athletics tabs' ranks) and `pillarColumns` (the guide's columns and the
   choice's figures) read `pillarValue`; and the two pillars' breakdowns
   read as they stand (`pillarOf` with no stock), so History › Prestige and
   the standings say "Read as it stands, week by week" where they said
   "Drifting up toward". The chronicle names eras from the overall rank
   and reads neither stock.
   - **Where the stocks are still read:** three slow readings that are not
     rankings: the faculty market's research center (`facultyData.ts`'s
     `marketStandingOf`), a varsity program's pull from campus life
     (`studentLifeData.ts`'s `collegePull`) and the research-powerhouse
     tag (`identity/tags.ts`), plus the debug panel. Moving those would
     change play, not a table, so they are left; the save fields stay
     (`tickPrestige` still drifts them), and no save version changes.
   - **The choice reads the pillar too**, so the harness's strongest-pillar
     rule (`specialization.ts`'s `strongestOf`) now sees research at its
     value (112 at the milestone on seed 12345, against 103 for
     academics): **the plain Guided player picks research** on every
     seed, and the Completionist student life, research and academics.
     `test/specialization-choice.test.ts` checks the rule on the choice's
     figures, since a test cannot set two pillar values level by hand;
     `test/specializations.test.ts`'s ties set the field level with the
     college's pillar.
3. **The endowment's adjustment is halved**, up to 4 (was 8), and stays
   outside the pillars (`prestigeSystem.ts`'s `ENDOWMENT_WEIGHT`;
   `test/report-card.test.ts`).
4. **The Landmark count is left alone:** three at once still count.
5. **Athletics outside the top 10 without its specialization, and the later
   milestone,** are accepted and stay noted.

**The numbers with the decisions** (`sim/baseline.json` re-recorded again;
seeds 12345, 4242 and 777; the year's first week; the moves against the
first version's numbers above):

| | Rank Y10 / Y25 / Y50 | Prestige Y10 / Y25 / Y50 | Satisfaction Y10 / Y25 / Y50 | Pillar ranks Y50 |
|---|---|---|---|---|
| Guided (picks research) | 57 / 31 (−3) / 1 | 49.3 (−0.2) / 79.4 (+1.5) / 117.5 (−2.7) | 88.7 / 88.0 (+3.6) / 87.4 (−2.0) | 10 / 1 / 4 / 40, was 1 / 8 / 4 / 29 |
| Completionist | 57 / 36 (−2) / 7 (+6) | 49.8 (+0.6) / 77.1 (+2.1) / 109.4 (−6.7) | 86.1 (+0.7) / 85.4 (−2.0) / 90.4 (+2.4) | 12 / 10 / 3 / 31, was 1 / 19 / 4 / 35 |
| Selective | 60 / 58 / 61 (−1) | 43.3 (−0.1) / 49.4 (−1.4) / 51.0 (−0.2) | 85.6 (−0.9) / 84.8 (+3.0) / 81.8 (−0.4) | 60 / 62 / 27 / 100 |
| Lean | 66 / 68 (+2) / 75 (+1) | 39.7 (−0.1) / 42.0 (+0.2) / 41.0 (−1.6) | 79.9 (+0.1) / 77.6 (+6.9) / 75.7 (−2.4) | 61 / 75 / 28 / 100 |
| Idle | 82 / 66 (−1) / 75 (+1) | 29.5 (−0.2) / 41.6 / 37.9 (−0.3) | 84.0 / 84.0 / 84.1 | 78 / 80 / 31 / 100 |
| Guided, academics | 57 / 31 (−3) / 1 | 49.3 (−0.2) / 79.4 (+1.5) / 121.0 (+0.8) | 88.7 / 88.0 (+3.6) / 84.4 (−5.0) | 1 / 8 / 4 / 38 |
| Guided, research | 57 / 31 (−3) / 1 | 49.3 (−0.2) / 79.4 (+1.5) / 117.5 (−0.3) | 88.7 / 88.0 (+3.6) / 87.4 (+2.5) | 10 / 1 / 4 / 40, was 9 / 5 / 4 / 37 |
| Guided, student life | 57 / 31 (−3) / 1 | 49.3 (−0.2) / 79.4 (+1.5) / 118.8 (+0.1) | 88.7 / 88.0 (+3.6) / 88.7 (−0.7) | 10 / 8 / 1 / 41, was 10 / 7 / 3 / 42 |
| Guided, athletics | 57 / 31 (−3) / 1 | 49.3 (−0.2) / 79.4 (+1.5) / 119.7 (+0.7) | 88.7 / 88.0 (+3.6) / 86.3 (−0.8) | 10 / 8 / 4 / 1 |
| Guided, unspecialized | 57 / 31 (−3) / 5 (+2) | 49.3 (−0.2) / 79.4 (+1.5) / 111.7 (+0.7) | 88.7 / 88.0 (+3.6) / 88.1 (−0.4) | 9 / 8 / 4 / 37 |

| | Milestone (the pick) | Top 10 | #1 | Rank Y50 | Prestige Y50 | Own pillar Y50: rank, margin | Other pillars Y50 (aca/res/life/ath) |
|---|---|---|---|---|---|---|---|
| Guided, academics | 30, 35, 33 | 38, 41, 39 | 43, 45, 45 | 1, 1, 1 | 121.5, 120.6, 121.0 | #1 +8.6; #1 +8.6; #1 +8.5 | –/8/4/36; –/8/3/38; –/8/5/41 |
| Guided, research (= Guided) | 30, 35, 33 | 41, 42, 40 | 43, 46, 46 | 1, 1, 1 | 117.5, 117.0, 117.8 | #1 +9.7; #1 +10.0; #1 +9.9 | 10/–/4/40; 10/–/3/22; 10/–/5/42 |
| Guided, student life | 30, 35, 33 | 37, 41, 39 | 43, 44, 45 | 1, 1, 1 | 118.8, 118.6, 119.0 | #1 +3.9; #1 +7.0; #1 +5.7 | 11/9/–/30; 10/8/–/41; 10/7/–/43 |
| Guided, athletics | 30, 35, 33 | 37, 40, 40 | 42, 45, 45 | 1, 1, 1 | 120.9, 119.7, 119.6 | #1 +12.3; #1 +11.9; #1 +11.8 | 9/8/4/–; 10/8/4/–; 10/7/4/– |
| Guided, unspecialized | (offered 30, 35, 33) | 39, 41, 40 | never (best 3, 5, 4) | 3, 6, 5 | 111.5, 111.8, 111.7 | (best: student life #4) | 11/9/4/37; 9/8/4/12; 9/8/4/41 |
| Completionist | life 42, research 44, academics 35 | 48, 47, 43 | never (best 4), never (best 4), 47 | 7, 7, 1 | 109.4, 107.7, 119.2 | #1 +1.4; #10 −15.3; #1 +8.5 | 12/13/–/31; 12/–/4/29; –/8/3/42 |

- **Against the targets** (the harness's three seeds):
  1. **Each specialist first by Year 50 on some seeds: met, on every
     seed** for all four (from years 42 to 46), at 117.0 to 121.5.
  2. **Its pillar first by 5 points or more: met for academics, research
     and athletics on every seed** (8.5 to 12.3); **student life on two of
     three** (7.0 and 5.7; 3.9 on 12345).
  3. **Its other pillars in the top 10: met for academics, research and
     student life**, but for two 11th places (student life's academics and
     the unspecialized player's, both on 12345); athletics, without its
     specialization, 22nd to 43rd (accepted).
  4. **Unspecialized play top 10, never first: met.** 3rd, 6th and 5th at
     Year 50 (best 3rd, 5th, 4th), at 111.5 to 111.8.
- **The endowment, halved** (the what-if again: the unspecialized Guided
  player with a full endowment from the milestone): **it is still first on
  two seeds of three**, from Year 45 on 12345 (116.7 at Year 50, 3.3 above
  the best rival) and from Year 47 on 4242 (115.7, 2.0 above); on 777 it is
  second, 1.1 behind (115.6 against 116.7). A full endowment is worth about
  +4 to +5 against the same player's 111.5 to 111.8, and leaves it 1 to 5
  points under every specialist on its seed. Not tuned further; the owner
  decides.
- **The Completionist** is the one player the decisions moved a lot: the
  halved endowment moves every run a little from the first years (it counts
  from the founding), and the Completionist then hovers at 20th to 25th
  for a decade on two seeds, so it reaches the milestone in years 42 and 44,
  **past the owner's 25 to 40** (35 to 40 before), picks student life and
  research there (its strongest pillars now that the choice reads them),
  and is 7th at Year 50; on 777 it picks academics in Year 35 and is first
  from Year 47. The Guided players reach the milestone in years 30 to 35.
- **Screenshots** in `docs/reviews/2026-10-pillars/`, from a Guided run
  named Blackmoor (seed 12345), which now picks research in Year 30, at
  Year 48: `85i-prestige.jpg` (History › Prestige, research opened: read as
  it stands at 149.7; the endowment of 4), `85i-standings.jpg` (research
  #1, every pillar read as it stands) and `85i-guide.jpg` (the college's
  research column at 150); and `85i-choice.jpg`, the choice in Year 31 (the
  `specialization` scenario), each card with the pillar's value (research
  112, #7).
- **Checks:** `npm run check`; `npm run test:slow`; `npm run sim`
  re-recorded (`--save`), then 0 deltas; `npm run phone` on the launch
  fixture, the `specialization` choice and the Year 48 save;
  `review:strings`, nothing new flagged.
- **What remains:** the owner's call on the endowment (still first on two
  seeds of three at +4), student life's margin on one seed (3.9), and the
  Completionist's milestone past Year 40 on two seeds.

- **Decided on review (the owner, 2026-10-01):** the three items left open
  are accepted as they stand. A full endowment (at +4) may still carry an
  unspecialized college to first; student life's margin of 3.9 on one seed
  stands; the Completionist reaching the milestone in Years 42 and 44 on two
  seeds stands. Plan 85 is landed.

## What this plan does not do

- No changing specialization after the choice, and no second
  specialization.
- No new pillar beyond the four.
- No downside built into any specialization beyond what it rules out.
  The exclusivity is the trade-off.
