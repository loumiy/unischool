# Plan 85 — Specializations

*Planning document only. Its job is to turn the owner's idea of meaningful
trade-offs into PRs: four pillars of success, a college that can be
excellent at all four, and a late, permanent choice that lets it be the
very best at one.*

**Status: In progress: A–D merged (#268, #274–#276).**

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
