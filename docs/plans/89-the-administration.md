# Plan 89 — The administration

*Planning document only — no gameplay code is changed by this file. Its job
is to turn the owner's idea of administrative offices in Founders Hall into
PRs: a seventh purchased hall so Founders Hall can be emptied, twelve
offices to put in it, and six milestones that open them one at a time.*

**Status: In progress: A–E.**

---

## 0. The owner's ask

> "Currently, programs start developing in Founders Hall, then the player
> eventually moves some or all programs into their own buildings. … leaving
> 6 empty program slots in Founders Hall isn't intuitive, and doesn't
> provide any strategic advantage … it keeps one school's appearance hidden
> (using Founders Hall instead), and while all the other halls eventually
> say 'Smith School of Science', etc., Founders Hall remains 'Founders
> Hall', an asymmetry."

> "When a player first moves a course out of Founders Hall, they may fill
> the now empty program slot with something else… The Administration: a set
> of … offices to choose from that provide strategic advantages and
> represent the administrative functions of the university."

The owner's first offices: Career Services, an athletic director's office
(found a varsity team without waiting for a petition), an Admissions
Office, an events office for student life, a grants office for research and
a maintenance office to reduce expenses.

The owner's answers to follow-up questions (October 2026):

- **Twelve offices**, cut from a longer list (§2).
- **Add a seventh purchased hall.**
- **Founders Hall is always called Founders Hall**, offices or not.
- **Offices open one at a time**, on six milestones spread through a
  typical run (§3).

## 1. Where the game is now

- **Seven schools, seven halls** (`docs/design/curriculum.md`): Founders
  Hall, standing at founding, and a strictly sequential chain of six
  purchased halls (Elm, Oak, Linden, Maple, Chestnut, Sycamore), each six
  program slots, one school to a hall. Plan 55 cut the chain to fit the
  schools exactly; the last school sorted keeps Founders Hall
  (`systems/techtree/schools.ts`'s `foundersIsHome`). **Founders Hall can
  never be emptied today**, and an empty slot would do nothing if it could.
- **Slots are `s.halls`** (`state/types.ts`'s `HallSlot`): a `programId`
  or null, and `transitWeeks` while a program relocates. A move out of
  Founders Hall goes dark `FOUNDERS_MOVE_WEEKS` (four); any other move
  `RELOCATION_WEEKS` (twelve).
- **The administration exists as people.** Plan 28's seats
  (`data/seatData.ts`): a Provost, a Dean per founded school, a Facilities
  Director, a Dean of Students and a VP of Advancement, each answering a
  domain's routine events by a policy, each a permanent salary ("the
  administrative ratchet"). Athletics has its own athletic director
  (Athletics V3). None of them changes what the college *can do*; they
  change who answers.
- **The ladder** (`data/ladderData.ts`, `docs/design/progression.md`) is
  where things open: independent, permanent milestones, each a letter in
  the inbox. Plan 85's specialization is a milestone of its own
  (`systems/prestige/milestone.ts`).

## 2. Decisions

### 2.1 What an office is

**An office occupies one program slot in Founders Hall, and only there.**
It is held once (no two of the same office), counts toward no school's
dedication, and teaches nothing. An office is something the institution
can *do*; a seat is someone who answers for the president. The two meet in
one place (§2.4).

`HallSlot` gains `officeId?: string`; a slot holds a program, an office or
nothing. Founders Hall is the only hall whose panel offers offices.

### 2.2 The seventh hall

**Walnut Hall**, after Sycamore, at the chain's ratio
(`techData.ts`'s `ACADEMIC_HALL_COST_RATIO`, 1.45: about $23.2M after
Sycamore's $16.0M). With seven purchased
halls, every school can have a hall of its own and Founders Hall can be
emptied. `foundersIsHome` goes: no school is ever at home in Founders Hall,
and the sorting readings (`nextSchoolToMove`, `suggestedMove`) treat every
program in it as away from home once a purchased hall is free for its
school. A school dedicated in Founders Hall is still founded (Plan 80D's
rule stands); it is simply never the line of play.

**Founders Hall keeps its name**, whoever is in it: a dedicated Founders
Hall is "Founders Hall · School of …" as today, and a Founders Hall of
offices is "Founders Hall". The map may draw a Founders Hall holding six
offices differently (§PR 89F), but its label does not change.

### 2.3 The twelve offices

Three to a domain. ⭐ marks an office that adds an action or a reading the
college does not have, rather than a percentage; the owner's six are all
kept.

| Domain | Office | What it does | Hooks |
|---|---|---|---|
| **Enrolment** | **Admissions Office** ⭐ (owner) | At the summer decision, a range for the applicant pool before the price is set. The price stops being set blind. | `components/InterruptModal.tsx`'s summer beat; `projectAdmissions`. Answers the backlog's *The price is set blind* |
| | **Career Services** (owner) | Pulls the pre-professional cohort. | `systems/admissions/cohorts.ts` |
| | **Financial Aid Office** | Pulls the price-sensitive cohort without a lower sticker. | `cohorts.ts` |
| **Academic** | **Office of Curriculum Development** ⭐ | One more seat on the curriculum committee. | `techSystem.ts`'s `COURSE_DEVELOPMENT_SLOTS` |
| | **Office of Sponsored Research** (owner's grants office) | A paper's grant chance and size up. | `systems/research/researchSystem.ts`, the grant roll |
| | **Office of Faculty Recruitment** ⭐ | A deeper faculty market: more candidates listed, listed longer. | `systems/faculty/facultySystem.ts`'s weekly market |
| **Students** | **Student Activities Office** ⭐ (owner's events office) | Charter a club directly, once a term, rather than waiting on the weekly roll. | `systems/studentlife/studentLifeSystem.ts` |
| | **Athletics Development Office** ⭐ (owner's athletic director's office) | Found a varsity team without a sport club's petition, given its venue. | `systems/athletics/`; the backlog's *Athletics deferrals*, founding a team directly |
| | **Counseling & Wellness** | Demands arrive less often and ask for less. | `systems/demands/demandSystem.ts` |
| **Money and standing** | **Facilities Management** (owner's maintenance office) | Full maintenance funding pays a backlog down twice as fast, and an event's damage is smaller. | `systems/estate/estate.ts`'s `BACKLOG_PAYDOWN_RATE`, `spreadBacklog` |
| | **Alumni Relations** | More alumni giving, and a campaign's pull goes further. | `systems/alumni/giving.ts`, `campaigns.ts` |
| | **Office of Institutional Research** ⭐ | A forecast of the summer's prestige grade, and of each pillar, from the spring. | `systems/prestige/prestigeSystem.ts`'s target |

**Facilities Management is not a flat cut on expenses.** The owner asked
for one; a flat cut is the office every player opens first, which is no
choice at all. It works on the maintenance backlog instead, which is a cost
only a player who underfunds or suffers storms pays, and it is the office
that makes underfunding maintenance a line of play.

**Cut from the longer list**, and why:

| Office | Why not |
|---|---|
| Center for Teaching Excellence | Plan 85E's training program is the academics specialization; an office would duplicate it |
| Technology Transfer Office | Plan 85F's research park is where research earns money |
| Office of Fellowships, Honors College | A cohort pull each, and enrolment has three |
| Office of Greek Life | Narrow: a run without chapters gets nothing from it |
| Investment Office | A flat percentage on a pile that is already too large late (Plan 85C) |
| Office of Communications | Hard to see working; a scandal is rare |
| Campus Planning Office | Folded into Facilities Management |

### 2.4 Offices and seats

**An office does more with its seat filled.** Each office names one seat
of Plan 28's; while that seat is filled, the office's effect is half again
as large. The six enrolment and academic offices name the Provost; the
three student offices the Dean of Students; Facilities Management the
Facilities Director; Alumni Relations the VP of Advancement; Institutional
Research the Provost. The bonus is the only coupling: an office works
without its seat.

### 2.5 Cost

**A price to open and a staff budget a year**, the budget scaled by the
payroll's standing multiplier as a seat's salary is (`marketRateMultiplier`),
shown as its own line, *Administration*, in the Treasury's expenses. Six
offices are a real cost, so a lean run that leaves programs in Founders Hall
stays a line of play. Prices are set in PR 89B against `moneyScale.ts` and
measured in PR 89G.

### 2.6 Closing an office

**An office can be closed and another opened in its place**, with a dark
term of `RELOCATION_WEEKS` (twelve) in which the slot does nothing. The
opening price is paid again; nothing is refunded. A program can take an
office's slot back the same way. The set can change over fifty years, but
not every summer.

## 3. The six milestones

*Six ladder milestones, each opening one more office.* A milestone opens
the *right* to hold one more office, not a particular office: with all six
reached the college may hold six, chosen from the twelve. An office still
needs a free slot in Founders Hall.

The six are spread so a college holds its first office early, its third
about mid-run and its sixth with fifteen or more years left to use it.
Years are the measured medians of the second review's pacing scorecard
(`docs/reviews/2026-10-game-review-ii/data/b4-pacing-scorecard.md`) for the
Natural, Guided and Completionist players, or read off the Guided
`year-8-balanced` fixtures where the harness does not report the event;
"interp." is a year interpolated from the prestige curve, not measured.

| # | Milestone | Condition | Typical year | Source |
|---|---|---|---|---|
| 1 | **A room to spare** | a program first moves out of Founders Hall | Y3–6 | Elm Hall finishes Y3 (Guided fixtures), Y6 (Natural, pre-Plan 85) |
| 2 | **Four schools** | a fourth school founded | Y9–12 | scorecard: Guided Y9, Completionist Y11, Natural Y12 |
| 3 | **A research reputation** (exists) | prestige 70 | Y17–21 | interp.: Natural Y17, Guided Y20, Completionist Y21 |
| 4 | **A school distinguished** (exists, side) | a school distinguished | Y19–27 | scorecard: Completionist Y19, Guided Y20, Natural Y27 |
| 5 | **In the top 25** | ranked 25th or better at a summer | Y27–31 | scorecard: Natural Y27, Guided Y28, Completionist Y31 |
| 6 | **Every school distinguished** | all seven schools distinguished | Y30–34 | scorecard: Natural Y30, Completionist Y33, Guided Y34 |

- **The first is the owner's trigger.** The first move out of Founders
  Hall is the moment the owner named: the slot it leaves is the first that
  can take an office, and the milestone's letter says so.
- **Two exist and four are new.** Milestones 3 and 4 are on the ladder
  already; reaching them now also opens an office, and their letters gain
  the line. Milestones 1, 2, 5 and 6 are new ladder entries in the
  Growing, Growing, National and National tiers.
- **Independent, as every milestone is.** The allowance counts the six
  reached in any order: a Guided college reaches 3 and 4 in the same year
  (Y20), and a college that never distinguishes a school still reaches
  prestige 70 and the top 25. A small, selective college reaches fewer;
  that is the size of administration it has earned.
- **None is a size milestone.** Enrolment thresholds (6,000, 20,000) were
  passed over: a college that stays small on purpose would never open its
  later offices. Prestige 90 was passed over for the top 25, which the
  scorecard measures and prestige 90 is only interpolated.
- **None follows Plan 85's specialization** (Y30–44), so the sixth office
  is held before most colleges choose, and the two choices do not land on
  the same summer.
- **A slot never waits on the allowance at first.** The move that frees
  Founders Hall's first slot is the move that reaches milestone 1.

PR 89G measures the six against these targets and moves a threshold
(the fourth school, the top 25) if one lands outside its band.

## 4. The PRs

| PR | Subject | Sim baseline | Save version |
|---|---|---|---|
| A | This plan; the backlog | no | no |
| B | Offices in Founders Hall: the slot, the catalogue, open and close, the cost | yes | yes |
| C | The seventh hall and sorting without a home in Founders Hall | yes | yes |
| D | The six milestones | yes | yes |
| E | The twelve effects, and the seat bonus | yes | maybe |
| F | Presentation: the hall panel, the Treasury line, the map | no | no |
| G | The harness and the balance pass | yes | no |

B before D and E; C stands alone and can land first. F after E.

## PR 89A — This plan; the backlog

- This file, and its row in `docs/plans/README.md`.
- The backlog's *The administration: offices in Founders Hall* entry comes
  off (moved here). *The price is set blind* and the *Athletics deferrals*
  entry's direct founding of a team gain a line pointing here, since 89E
  answers both for a college that opens the office; both stay in the
  backlog for a college that does not.

## PR 89B — Offices in Founders Hall

- `data/officeData.ts`: the twelve offices (id, title, domain, blurb, the
  seat it names, opening price, staff budget a year).
- `HallSlot.officeId`; `OPEN_OFFICE` (an empty Founders Hall slot, an
  office not held, an office allowance free, the price) and `CLOSE_OFFICE`
  (the slot goes dark `RELOCATION_WEEKS`, then empty).
- The allowance reads the milestones (§3), stubbed to six until 89D lands.
- The staff budget as an expense line, `Administration`.
- A save migration: no slot holds an office. `SAVE_VERSION` + 1.
- Tests: one of each office at most; only Founders Hall; never past the
  allowance; a closed slot dark for its term; the budget charged weekly.

No office does anything yet; 89E gives them effects.

**As implemented:**

- **No save bump.** An office is an optional field on a slot
  (`HallSlot.office`, an object rather than the plan's `officeId`: the id,
  the year it opened and, while it closes, the weeks left), and an additive
  optional field needs no version (`persistence.ts`). The loader keeps an
  office only in Founders Hall, in a slot with no program, naming one of the
  twelve, once.
- **The running cost is a share of the operating cost**, not a salary
  scaled by `marketRateMultiplier`: each open office draws
  `OFFICE_BUDGET_SHARE` (0.6%) of last week's operating cost. A seat's fixed
  salary is a sum the late budget stops noticing (the budget grows a
  hundredfold over a run), and §2.5 asked that six offices stay a real
  cost. The price to open is in weeks of operating cost too (two to five,
  by office). PR 89G tunes both.
- **A closing office is still held and still counts against the
  allowance**, and costs nothing. Otherwise a college with a spare slot
  could close one office and open another at once, and the dark term would
  cost nothing.
- **The Treasury line lands here**, not in 89F, as *Offices*, beside the
  seats' *Administration*: the cost exists from this PR, so the statement
  says so.
- `slotFree` replaced every "is this slot empty" reading that finds room
  for a program: founding, relocation, the hall panel's counts, the map's
  hall marks, sorting and the next-step line.

## PR 89C — The seventh hall

- **Walnut Hall** at the end of the chain, at the chain's price ratio, on
  the campus layout's next academic site (`components/campusLayout.ts`).
- `foundersIsHome` removed; `nextSchoolToMove` and `suggestedMove` treat
  Founders Hall as nobody's home. The guidance line's *Establish a school*
  (`systems/guidance/establish.ts`) unchanged otherwise.
- `docs/design/curriculum.md` updated: seven purchased halls, and why.
- Sim: the purchased-hall count and the year the seventh school is
  established, before and after.

**As implemented:**

- **A save version, 93 → 94** (`walnutHall`): a save keeps the catalog it
  was founded with, so Walnut Hall joins it, locked, after Sycamore Hall.
  Its id is `HALL-07`, the id Plan 59 retired with Cedar Hall; a version-77
  save that kept a sited Cedar Hall keeps it, and the step adds nothing.
  The version-93 fixture is the year-8 scenario written by main at 93.
- **No layout change.** Halls are sited by the player (and by the harness
  anywhere free); `components/campusLayout.ts` holds no hall sites. Only
  `tools/layout.ts`'s screenshot plan names halls, and a building it does
  not name goes to its overflow block.
- **Sim** (`npm run sim`, three seeds, fifty years): the Guided player and
  its four specialized runs, Lean and Idle are unchanged. The two players
  that buy whatever is offered move: **Completionist** ends at #1 (from
  #7), prestige 117.4 (+8.0) and $152.0M (+$45.8M) at year 50, but 2.0
  lower at year 25; **Selective** ends with $25.9M less (of $607M), about
  Walnut Hall's price. Seven schools are founded by the same years. No
  baseline saved: PR 89G re-measures with the offices in play.

## PR 89D — The six milestones

- Milestones 1, 2, 5 and 6 of §3 added to the ladder; 3 and 4 (which
  exist) gain an office each. Every one's letter names the office it opens
  and lists the twelve.
- `officeAllowance(s)`: the number of the six reached.
- The opening coach and the next-step line: the first milestone's letter
  is the teaching moment ("a slot your programs left in Founders Hall can
  hold an office"); no next-step line pushes an office.
- `docs/design/progression.md`'s ladder table gains the six.

**As implemented:**

- **Room to spare is read off the halls, not the move**: reached when a
  program teaches in a purchased hall while a slot of Founders Hall holds
  no program. The first move out of Founders Hall reaches it, as the owner
  asked; so does founding straight into a purchased hall while Founders
  Hall has room. A reading needs nothing stored, so a saved college that
  moved out long ago reaches it the week it loads, with no save version.
- The prestige-70 rung is the ladder's *A name scholars know* (§3 called
  it by the design doc's older name, *A research reputation*).
- No opening-coach change: the first milestone's letter is the teaching
  moment, and nothing in the next-step line pushes an office.
- `officeAllowance` counts the six reached (`OFFICE_MILESTONES`), and
  `nextOfficeMilestone` names the next for 89F's allowance row.

## PR 89E — The twelve effects

- Each office's effect at its hook (§2.3), with its seat bonus (§2.4).
- The four new actions: the Admissions Office's pool range at the summer
  beat; Curriculum Development's committee seat (shown on the committee
  as "Office of Curriculum Development"); Student Activities' charter; and
  Athletics Development's direct founding of a team.
- The Institutional Research forecast on the History tab's Prestige card.
- Tests for each: present with the office, absent without, larger with
  the seat.

**As implemented:**

Every lever is neutral with its office closed and draws nothing on the
random stream, so a college without offices plays exactly as before. The
readings are `systems/administration/effects.ts` (and `forecast.ts`), the
two actions `officeActions.ts`; the sizes are `officeData.ts`'s, first
guesses for 89G.

| Office | What it does (×k: 1 open, 1.5 with its seat) |
|---|---|
| Admissions Office | a range for the pool at the slider's price, ±15% / k, shown before the price locks |
| Career Services | the pre-professional pull ×(1 + 0.15k) |
| Financial Aid Office | the price-sensitive cohort reads the price ×(1 − 0.2k); the sticker, and every other reading of it, unchanged |
| Office of Curriculum Development | one committee seat, whole (the seat bonus adds none) |
| Office of Sponsored Research | grant chance ×(1 + 0.5k), size ×(1 + 0.25k) |
| Office of Faculty Recruitment | the market holds 30 + 10k candidates, each listed 12 + 6k weeks |
| Student Activities Office | `CHARTER_CLUB`: a club rolled and recognized at once, every 26 / k weeks |
| Athletics Development Office | `FOUND_TEAM`: a sport club with its venue standing goes varsity, no tenure, no petition, for 2.5 / k weeks of operating cost |
| Counseling & Wellness | the gap between demands ×(1 + 0.5k), and the weeks to meet one ×(1 + 0.5k) |
| Facilities Management | the backlog paydown ×(1 + k): twice as fast; an event's damage ×(1 − 0.3k) |
| Alumni Relations | the annual fund ×(1 + 0.15k); a running campaign's take ×(1 + 0.2k) |
| Office of Institutional Research | the rank the summer's grade would buy, from the spring (all year with the Provost) |

Three departures:

- **Counseling & Wellness gives longer rather than asking for less.** A
  demand asks for a building, a program or beds, which do not come in
  parts: a smaller target meets nothing sooner. It gives half as long
  again to meet one instead.
- **Institutional Research forecasts the rank, not the grade.** The
  History tab already says what the year is grading toward ("51.5 → 53.2…
  if nothing changes"), so a forecast of the grade would show the player
  nothing new. What no screen shows is the rank that grade buys against the
  field, so that is what the office reads (rivals as they stand). Its seat
  bonus is the fall term too.
- **Alumni Relations lifts what a campaign brings in, not its target.** A
  campaign's target is set from the yearly response at launch, so lifting
  the response there would lift the target with it.

The Committee panel counts the office's seat beside the prestige seats, so
the locked seats still read their own prestige. The two actions have plain
buttons here (the Clubs panel's *Charter a club*; *Go varsity* on a sport
club's row, on the Students tab, where sport clubs live); 89F styles them.

## PR 89F — Presentation

- **Founders Hall's panel** (the owner approved a mockup, October 2026):
  - **Offices wear the college's own colours**: a program tile takes its
    school's hue, an office tile the college's primary as its edge and a
    wash of its secondary, with an *office* chip and, while its seat is
    filled, "+50%".
  - **An office opens like a program tile**: its domain, its seat (filled
    or not), its cost a year and the year it opened; what it is doing this
    year ("11,200–12,600 applicants at last year's price"); a door to where
    it matters; and *Close office · slot dark 12w*.
  - **A closing office** is dashed and dimmed, "closing · 7w".
  - **An empty slot offers both**, behind a two-way switch over the offer
    list, *Programs · 3 | Offices · 11*. The offices are grouped by domain,
    each card with its seat ("Provost seated · +50%" or "Dean of Students ·
    not seated"), what it does, and its price and cost a year; an office
    held is shown dimmed, "Held · slot 1". Picking one asks to confirm,
    with the price, the cost a year and the dark term on closing.
  - **The allowance row**: six squares, held, free and locked, and the next
    milestone with its progress ("next at prestige 70 (61)").
- **The Treasury** shows *Administration*, office by office.
- **The map**: a Founders Hall holding six offices gains a cupola or clock
  in its vernacular (`components/buildingSpec.ts`); the label stays
  "Founders Hall".
- **The Final Report** names the offices held at year fifty in the run's
  record.

## PR 89G — The harness and the balance pass

- Each archetype (`sim/harness/archetypes.ts`) opens offices by a fixed
  preference of its kind, and moves its last school out of Founders Hall
  into Walnut Hall.
- Measure: the year each of the six milestones is reached (against §3's
  targets), the cost of six offices against the late margin, and the
  standing a full administration buys against a lean run. No single
  office should be in every archetype's first two.

## What this plan does not do

- No office outside Founders Hall, and no second administration building.
- No office that changes a rule of another system's choice (no office that
  alters a specialization).
- No rival offices: rivals have no halls.
- No change to Plan 28's seats beyond the bonus they give an office.
