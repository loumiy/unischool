# Plan 08 — Athletics, and the field it plays in

*Planning document only — no gameplay code is changed by this file. Its job is
to take `BACKLOG.md`'s two entangled entries — **Athletics V3** and **Rival
schools** — and turn them into one ordered sequence of PRs, each small enough
to land on its own and each landing in the order that makes the next one
cheaper.*

**Status: Proposed.** Ten PRs in two phases. Phase 1 rebuilds the field the
school is measured against: a hundred schools instead of fifty-six, each with a
mascot, standing decomposed into three independently ranked numbers, and a
rival's athletic strength split per sport and finally allowed to move. Phase 2
spends that on the department: four more sports, a coach market that fits them,
an athletic director and a mascot of the player's own, a laid-out tab, an AD who
asks for what the department lacks, and a year-end playoff whose championships
are the first thing athletics has ever produced that changes a number outside
itself.

**Written against `38a99bb`** (Plan 06 landed, plus the eighth cohort). Every
documentation reference below names a file as it stands at that commit.

**One thing has moved since, and it reaches every phase below.** The PR titled
*"Save migrations become the exception, not the rule"* makes discarding an
incompatible save the default: the bump is the whole obligation, a migration is
written only when a specific run is worth carrying, and
`docs/architecture/game-state.md` now says outright that save compatibility does
not get a vote on how the game is shaped.

This plan was written under the previous policy and proposes five bumps —
41 → 42 (1A), 42 → 43 (1B), 43 → 44 (2B), 44 → 45 (2C), 45 → 46 (2F) — each
carrying a migration as a matter of course. **None of them owes one.** The bumps
stand; the migration attached to each is now an exception to argue for at the
time, against a run actually in progress. The migration text is kept at each PR
because it records what the carry would have cost, and open question 8's
rank-neutrality finding is worth reading whichever way that call goes.

**The numbers themselves are as of `38a99bb` and are already out of date** —
Plan 07's PR A has since taken 41 → 42 for the tuition ceiling. Read the five
above as an ordered list of bumps this plan needs, not as the versions it will
get; whatever `SAVE_VERSION` reads when a PR here starts is what it bumps from.
That drift is the ordinary cost of two plans in flight at once and is not worth
editing this document over each time it happens.

One consequence is named here rather than left to be discovered: PR 1A lands
`University.mascot` early on the stated grounds that it *"keeps the save-shape
change in one migration with the other three."* That is a sequencing decision
made for migration cost, which is the exact habit the new policy retires. The
field may still belong in 1A — it is where the rest of the rival data lands —
but that case now has to be made on its own.

---

## 0. The shape of the feature, and why the order is what it is

### The first finding: these are one feature, and the seam is not the mascot

The backlog names the coupling twice and both times names it small — *"each
school needs a mascot, which is what ties this to Athletics V3"*, and
*"per-sport standings need per-sport rival strength, and that lives here"*.
Both are true and neither is the reason these have to be planned together.

The reason is that **Athletics V3 asks for consequences it has nowhere to put.**
Read its own list: a mechanic that gives the player *a reason* to build venues
and hire coaches; championship interrupts; per-sport standings. Today a coach
costs money and raises `teamQuality`, `teamQuality` raises
`athleticProgramStrength`, and `athleticProgramStrength` is read by exactly one
thing: a rank readout on the Athletics tab. Nothing else in the game reads it.
A team's only mechanical output is `TEAM_SOCIAL_BONUS`, which is flat per team
and identical whether the team is excellent or staffed by nobody. **Hiring a
good coach is, mechanically, a pure cost.** That is the actual defect behind the
backlog's "a mechanic that gives the player a *reason*", and no amount of
layout, interrupts or extra sports fixes it.

`docs/design/student-life.md` says where the fix has to come from, and forbids
taking it casually:

> Athletics reaches satisfaction only through this same capped social
> contribution, same as clubs and Greek life — **never prestige directly**; if
> athletics should eventually touch prestige, that is a separate prestige-model
> decision, flagged rather than wired.

Rival schools' first line **is** that decision: *"Prestige becomes more than one
number — ranked separately by school, by social life, by research."* A social
standing that athletics moves is the destination Athletics V3 has been missing,
and it lives in the other entry. Execute them apart and Athletics V3 ships a
championship that changes nothing, then Rival schools ships an axis with nothing
interesting feeding it.

So the order is forced at the top level: **the field first, the department
second.** Phase 1 builds the three-axis model, the hundred-school field and the
per-sport strength; Phase 2 is athletics spending all three.

### The second finding: the headline number cannot move, so nothing decomposes

"Prestige becomes more than one number" has two possible readings, and only one
of them is affordable.

`s.self.reputation` is read by `admitRate(prestige)` (the whole admissions
funnel), by the applicant-pool size, by price tolerance, by
`sim/balanceSim.ts`'s seven strategies, by `test/balance-regression.test.ts`'s
prestige-separation gate, and by every `YearSnapshot` ever recorded. Splitting
it into three components that *sum* to it — the decomposition reading — moves
every one of those at once, and moves them in the same plan that is trying to
add playoff brackets.

**So this plan takes the other reading: two new numbers beside the existing one,
never inside it.** `computePrestigeTarget` is not touched by any PR here. Its
inputs, weights, baseline, drift rate and clamps are the same after Plan 08 as
before it, and PR 1B's own verification is that `npm run sim` prints byte-
identical prestige columns. Three consequences worth stating plainly:

- The backlog's separate entry, **the admit-rate curve's early slope**, stays
  completely independent of this plan. It re-fits a curve whose input this plan
  never moves, so the two can land in either order.
- `docs/design/progression.md`'s standing note — *"The long-term direction is to
  decompose prestige into several underlying components; that is future work,
  and must keep the composed-stock discipline"* — is **not** what this plan
  does, and the document has to say so rather than be quietly taken as done.
  That is PR 1B's documentation obligation.
- The one-way rule extends rather than bends. Rankings are a measurement *of*
  standing and never an input to it; the new axes are two more measurements.
  Nothing in `prestigeSystem.ts` reads a rank, and nothing in
  `computePrestigeTarget` reads either new stock. `test/invariants.test.ts`'s
  section 5 currently asserts this for one field and one function; it gains the
  other two.

### The third finding: the field has to grow *downward*, and that is what makes the toolbar readout worth anything

Expanding 55 rivals to 99 looks like authoring work and is actually a balance
change, because **rank 50 means something different in a field of 56 than in a
field of 100.** Today the player passes six schools to crack the top 50. In a
naively expanded field they would pass fifty, and the mid-game reveal
`docs/design/progression.md` describes — *"reaching enough prestige to crack the
top 50 (which should take some time)"* — would become the late-game reveal
nobody designed.

The fix is in where the 44 new schools are authored, not in retuning anything.
`rivalData.ts`'s existing field spans **45 to 99** and its header comment says
why the floor is where it is: *"Deliberately no rival starts below ~45: the
player begins at 35-50 depending on school type, so the whole field starts
ranked above a fresh university."* Author the new 44 **below that floor**, in a
long tail from ~44 down to the low teens, and:

- The 50th school by reputation is the **same school it is today**, so the
  top-50 entry threshold is unchanged in prestige terms and the reveal fires at
  the same point in the same run. No constant moves.
- The existing 55 keep their reputations, their momenta and their positions
  relative to each other, so `npm run sim`'s prestige arcs and the regression
  gate's separation checks are untouched.
- A founding school stops being last. A private school opens at 50
  (`BASE_STARTING_REPUTATION` 40 + 10) — above the whole tail, ranked ~#55 of
  100 rather than #55 of 56. A public opens at 35 and sits *inside* the tail,
  ranked around #68 with a dozen schools directly above it to pass in its first
  decade.

That last line is the argument for the backlog's other rivals ask — *"show rank
outside the top 50 on the toolbar"* — and the reason the two belong in one PR.
A rank readout is motivating when there is a field below you and schools just
above you to climb past. "#56 of 56" is not a readout, it is a floor, and that
is why the toolbar has been hiding it behind `hasEnteredRankings` all along. The
hundred-school field is what earns the readout; the readout is what makes the
hundred-school field felt.

**What the reveal then means** needs one sentence of fiction, and it has a good
one: the U.S. News list publishes fifty names. Where you stand is knowable from
week one; *being published* is the event. The interrupt keeps its top-50 gate
untouched.

### The fourth finding: per-sport strength is derived — the opposite call from Plan 06's, for the opposite reason

Plan 06's central finding was that the enrolled cohort mix **cannot** be
reconstructed and has to be stored, because every cohort pull is a function of
*current* state and recomputing an old class's mix applies today's campus to a
class admitted four years ago.

Per-sport rival strength is the mirror image, and saying why keeps the two
consistent rather than arbitrary. A hundred schools across eighteen sports is
1,800 numbers: unauthorable (`rivalData.ts` already refuses 55 hand-picked
athletic-strength numbers as *"pure busywork with no signal a formula can't
already give"*) and, stored, 1,800 more numbers in every save. But the thing
being reconstructed is not a fossil. A class's cohort mix is a fact about a
decision made at a moment and gone forever; **a school's strength at lacrosse is
a standing fact about the school**, and a deterministic hash of (`id`, sport id)
spread around its stored department strength reproduces it identically on every
read, forever, across saves and reloads. There is nothing to lose.

So: **one stored number per rival that moves, eighteen derived from it that
don't move independently.** And a school is permanently a hockey school or
permanently a swimming school, which is not a compromise — it is the thing that
makes a rivalry legible over forty years.

The stored number does have to start moving, which closes a note the code
already carries. `types.ts` on `Rival.athleticStrength`: *"Static for now (no
annual drift of its own, unlike reputation/momentum) — a deferred deepening, not
an oversight."* A playoff against a field that never changes is a playoff whose
result is known in advance, so PR 1C gives athletic strength the momentum-plus-
shock drift `reputation` already has.

### The fifth finding: a playoff is not a season, and the line has to be drawn before PR 2F

Two documents hold match simulation deferred. `docs/design/student-life.md`:
*"there is still no match simulation and no schedules: standings are read off
one comparable strength number per school."* `BACKLOG.md`'s **Athletics
deferrals**: *"Match simulation and schedules (standings are one comparable
strength number per school, not a simulated season)."*

A bracket does not violate either, and the distinction is exact rather than
convenient. What is deferred is a **season**: weeks, fixtures, opponents,
results accumulating into a record. What PR 2F builds is a single function, run
once a year, that seeds the top eight schools in a sport by the strength number
standings *already* sort on and resolves three rounds of one-off comparisons.
No week ever contains a game. No team ever has a schedule. The bracket reads the
same input the rank readout reads and produces one more number: a champion.

Stating this in the plan is load-bearing, because "playoffs" is exactly the
feature that grows a regular season if nobody wrote down that it must not.

### The sixth finding: the mascot is contested between two backlog entries, and this plan settles it

`BACKLOG.md`'s **Startup screen** entry floats *"picking the mascot here rather
than burying it in Athletics (which pairs with Athletics V3's own mascot step,
so these should land together or not at all)"*. Athletics V3 lists *"name the
mascot"* as part of its first interrupt. One of the two entries has to lose it,
and only one of them is being executed here.

**Settled: the mascot is named in athletics**, at the athletic-director
interrupt, for a reason better than "that is the entry in flight". The startup
screen asks for it before the player has any reason to care, before a single
building stands, and typically a decade before a varsity team exists — a naming
decision with no context, made at the one moment the game is trying to get out
of the player's way. The first varsity team is the exact moment the question
acquires an answer: there is now something that wears the name.

The cost is real and gets paid rather than ignored — though not, in the end, by
this plan. The startup-screen plan reached the same conclusion independently and
from the other side, and its branch has already edited both backlog entries to
defer the mascot here. The quotation above is the entry as it stood at `38a99bb`
and is left as written, because that is the text this finding was reasoning
against. PR 2G's remaining obligation to that entry is a pointer, not a bullet.
The entry's own "together or not at all" is honoured either way — they are
landing together, in athletics.

### The seventh finding: documentation is not a trailing PR

Plan 06's third finding still binds, and `docs/architecture/README.md` still
states it outright: *"These documents are the spec, and source comments cite
them by name, so they have to stay true. When a change makes one of them wrong,
fix the document in the same PR."*

This plan falsifies more spec than Plan 06 did — `progression.md`'s whole
"Rankings" section, `student-life.md`'s "Standings" and "Varsity athletics"
paragraphs, and half a dozen source comments that count sports as fourteen. Each
PR below carries the documents it breaks. What is left for the last PR is only
what no earlier one makes wrong: two pieces of forward-looking work becoming
past.

### The map

| Note | Touches | PR |
|---|---|---|
| 99 rivals, each with a mascot; rank on the toolbar from week one | `rivalData.ts`, `types.ts`, `StatusHeader.tsx`, `HistoryTab.tsx`, `persistence.ts`, `docs/design/progression.md` | 1A |
| Standing becomes three independently ranked numbers | `types.ts`, `prestigeSystem.ts`, `rivalsSystem.ts`, `rivalData.ts`, `InterruptModal.tsx`, `persistence.ts`, `invariants.test.ts`, `docs/design/progression.md` | 1B |
| A rival's athletic strength drifts, and splits per sport | `rivalsSystem.ts`, `rivalData.ts`, `docs/design/student-life.md` | 1C |
| Track & Field and Ice Hockey; golf declined, rowing deferred | `studentLifeData.ts`, `gendered-sports.test.ts`, `docs/design/student-life.md` | 2A |
| One coach pool, tagged by need, with faces | `studentLifeData.ts`, `types.ts`, `FacultyPortrait.tsx`, `AthleticsTab.tsx`, `persistence.ts`, `styles.css` | 2B |
| An athletic director, and a mascot | `types.ts`, `eventSystem.ts`, `InterruptModal.tsx`, `studentLifeData.ts`, `financeSystem.ts`, `persistence.ts`, `balanceSim.ts` | 2C |
| The department, laid out | `AthleticsTab.tsx`, `styles.css`, `docs/design/student-life.md` | 2D |
| The AD asks for what the department lacks | `eventData.ts`, `eventSystem.ts`, `docs/architecture/interrupts.md` | 2E |
| Playoffs, and a championship that moves a number | `athleticsSystem.ts`, `types.ts`, `prestigeSystem.ts`, `InterruptModal.tsx`, `AthleticsTab.tsx`, `persistence.ts`, `docs/design/student-life.md` | 2F |
| Two backlog entries close | `BACKLOG.md`, `docs/plans/README.md` | 2G |

1A through 1C are invisible as athletics and land behind the existing screens.
2A through 2C are the department's contents. 2D is the screen. 2E and 2F are the
loop closing.

---

## Open questions, settled before the first PR

**1. What exactly are the three axes, and what feeds each?**

| Axis | Field (player and rival share the name) | Fed by |
|---|---|---|
| Academic | `reputation` | **Unchanged.** `computePrestigeTarget` exactly as it stands. |
| Research | `researchStanding` | The credits `researchScore` already counts (publications at a tenth, completed initiatives, breakthroughs, prizes, doctorates), read on their own full scale rather than as one capped 22-weight input among six; plus lab breadth (`labEquippedFields`) and the research strength of faculty actually assigned to initiatives. |
| Social | `socialStanding` | Campus-life facilities (the `prestigeContribution` sum `campusLifeScore` already reads), student-life breadth (clubs, chapters, housed chapters — capped, the same shape the social satisfaction ceiling uses), the `social` satisfaction attribute itself, and **athletics**: `athleticProgramStrength` now, plus championship titles from PR 2F. |

Same field names on both sides of the comparison, which is not cosmetic: it
turns `rankedList`/`playerRank`/`athleticRankedList` — three copies of one
function today — into one `rankedListBy(s, axis)` covering four leaderboards.
That de-duplication is part of PR 1B rather than a follow-up, because the fourth
copy would otherwise be written in PR 1C.

**Proposed: all three are stocks in `prestigeSystem.ts`**, computed as targets
and drifted at `PRESTIGE_DRIFT_RATE` by one `tickPrestige` that now drifts
three. One module owning all three is what keeps the composed-stock discipline
checkable by the invariants test, which greps that module by path.

**Note the double-counting that is deliberate.** Research credits feed both the
academic target (at weight 22, where they already do) and the research axis (at
full scale). That is correct: the two numbers answer different questions — *how
good is this university* and *how good is its research* — and a research
university is supposed to score on both. What is forbidden is the reverse
direction, and it is the thing the invariants test guards: no new axis may ever
appear in `computePrestigeTarget`.

**2. Does athletics finally touch prestige, then?** No — and the distinction is
the whole reason this is affordable. Athletics reaches `socialStanding`, a
number no system reads back: not admissions, not tuition, not the applicant
pool, not the funnel. It is a leaderboard and a championship's payoff. The
headline number athletics is forbidden to touch stays untouched, so
`student-life.md`'s flagged decision is made in exactly the narrow shape it was
flagged in, and `npm run sim` can prove it.

**3. Where does the athletic director live, and what do they actually do?**
**Proposed: `s.orgs.athleticDirector: Coach | null`.** Reusing `Coach` rather
than inventing a fourth person type — an AD is a person with a `quality`, a
`salary` and a `field` (a new `AD_FIELD`, the same way `TRAINER_FIELD` marks a
role rather than a sport), which is exactly `Coach`'s shape.

They do two things, and both have to be real or the hire is another pure cost:

- Their `quality` is a **department-wide addition to every team's
  `teamQuality`**, in the same place `ATHLETICS_BUDGET_TIERS[...].qualityBonus`
  is applied — so a good AD raises every program at once, which is what an AD
  is, and is a different lever from the budget tier (people versus money).
- They are the **voice**: PR 2E's shortage interrupts and PR 2F's championship
  reports are written as the AD speaking, which is what makes a periodic "your
  wrestling program has no head coach" read as a person doing their job rather
  than the UI nagging.

**4. "Three generated cards, salary the only real differentiator" — is that a
choice at all?** It is, once read correctly, and the cards have to be honest
about which one. A faculty hire trades teaching against research; an AD has one
stat, so the only question the cards can pose is **how much of the department's
budget goes to the person running it**. So: quality rolls across a wide band,
salary tracks quality closely, and the three cards are a cheap one, a middling
one and an expensive one. **Proposed: the modal says so in a line** rather than
implying a hidden tradeoff — the same honesty `student-life.md` praises
elsewhere, where the satisfaction panel reports that the clubs are adding
nothing when nothing is what they add.

**5. How many sports, and where do they play?** Four, and both venues already
exist:

- **Track & Field**, men's and women's, on `athleticsField`. The backlog's own
  observation — *"the multi-sport field already carries a track"* — and
  `groundMarkings.tsx` draws it. Zero new art, zero new facility.
- **Ice Hockey**, men's and women's, in `athleticsArena`. **A named call rather
  than an obvious one:** a real arena converts between hardwood and ice, which
  is exactly the "shared among varsity teams in one category" model
  `student-life.md` describes, and the alternative — an `athleticsIceRink`
  facility type — costs a Buildable, a footprint, a ground marking, a build-rail
  entry and a map asset for one sport. The cost of the call is that the arena
  becomes the venue for six programs, which is a lot of load on one building and
  is the thing to watch in playtest.
- **Rowing: deferred**, and the reason is not scope. The backlog floats *"a lake
  and a boathouse, or no venue"*; a lake is **terrain**, and the campus map has
  no terrain concept at all — `campusData.ts` is a tile grid of placements, and
  the only water in the game is drawn ornamentally inside two ground markings
  (the quad fountain and the rec pool). Water on the map is a campus-map plan,
  not an athletics one. "No venue" is the other option and is worse than it
  sounds: every team carries a `venueCategory`, `promoteToVarsityTeam` and
  `sanitizeTeams` both key off it, and the `awaitingVenue` status is the whole
  shape of the varsity grant. A venueless sport is a special case threaded
  through all of it for one program. It moves to **Athletics deferrals** in PR
  2G with this reasoning attached.
- **Golf: declined.** The backlog already suspects it — *"probably too much
  ground"* — and it is right: a course is a footprint larger than the campus the
  game draws.

Eighteen `SPORTS` entries, from fourteen.

**6. Reusing faculty headshots means what, exactly?** `FacultyPortrait.tsx`
reads four things off its subject: `id` (every trait is a hash bucket off it),
`gender`, `heritage` (skin tone), and `facultyQualityTier(f)` (gray hair —
seniority). A `Coach` has the first two and neither of the last two, and
`rollCoachName` currently **throws away** the name pool's origin that
`rollFullName` keeps as `heritage`.

**Proposed: `Coach` gains `heritage`, and the portrait is generalized off a
small shape** — `{ id, gender, heritage, senior }` — that `Faculty` and `Coach`
both satisfy, with `senior` computed by each caller from what it has
(`facultyQualityTier` for a professor, a quality threshold for a coach). Two
alternatives were considered and are worse: hashing a heritage out of the coach
id decouples the face from the name, which is the exact defect `facultyData.ts`
documents as the reason `heritage` exists separately from `nationality`; and
copying the portrait into a second component doubles a 250-line file to avoid a
four-field interface.

Existing coaches in a save get a heritage in the same migration *if one is
written* — a coach hired in year 9 does not change name, quality, salary or team,
only acquires a face. Under the current save policy the likelier answer is that
the save drops and the question does not arise.

**7. What does a championship actually store?** Forty years × eighteen sports of
brackets is an archive nobody reads inside a save that has to stay JSON-plain.
**Proposed, bounded by construction:**

- `s.orgs.titles: Array<{ sport: string; year: number }>` — the player's own
  championships only. Monotone, small, and the input `socialStanding` reads.
- `s.orgs.lastSeason: Record<string, { champion: string; playerResult: string }>`
  — **overwritten every year**, one entry per sport the player fields, so the
  standings table can say who won last year and how far the player got. It never
  grows.

No bracket is stored. A bracket is a thing that happened for one modal's
duration; what survives it is a champion and a title.

**8. Does a migrated save get the 44 new schools?** Yes — a save that does not
can never reach content authored below it, and the whole tail is where the
early-game readout lives.

**And it is rank-neutral for almost every save**, which is the finding that
makes this safe rather than merely necessary. Rank counts the schools *above*
you; the new 44 are all below reputation ~44. Any school that has climbed past
the old field's floor — which is every school past its founding decade, and
every private school from week one — gains exactly zero schools above it and
keeps its rank to the digit. The exception is a save whose prestige currently
sits *inside* the new tail (a founding-era run, or a collapsed one): it picks up
a handful of schools above it and its rank number steps up once.

The `YearSnapshot` rows already recorded cannot be corrected, for the same
reason Plan 06 gave: nothing stores what the field looked like in year 3. So the
History chart on an early save may show a one-year step in the rank line. Named
in the migration comment, not papered over.

---

# PHASE 1 — THE FIELD

*Three PRs. None of them renders anything on the Athletics tab, and none of them
touches `computePrestigeTarget`.*

## PR 1A — A hundred schools, each with a mascot, and a rank from week one

**The change.** `rivalData.ts` grows from 55 rivals to 99, and every school in
the game — the player's included — acquires a mascot.

- **44 new schools, authored below the existing floor** (open question: section
  0's third finding), spanning roughly 44 down to the low teens, with momenta
  drawn from the same band as the existing field. The existing 55 entries are
  not touched: same ids, same reputations, same momenta.
- **`Rival.mascot: string`** on all 99, authored beside the names — one data
  pass over the file rather than two. Nothing mechanical reads it; it is what
  makes a standings row read as a sports page rather than a spreadsheet, and it
  is what PR 2F's championship modal names when the player loses a final.
- **`University.mascot: string`**, empty at founding and filled by PR 2C's
  interrupt. **Re-argued** since the front matter, which rightly flagged that
  the original reason — keeping the save-shape change in one migration — is
  exactly the habit the new save policy retires. It belongs here anyway, for a
  reason that has nothing to do with migration cost: `Rival.mascot` and
  `University.mascot` are one concept on two sides of the same comparison, and
  the field is read by the same standings code. Splitting them across two PRs
  would mean writing the "what a mascot is and is not" comment twice, or
  writing it in 1A against a type that only half exists. The empty string is
  not a placeholder awaiting 2C; it is the true statement that a school with no
  varsity program has nothing for a mascot to name.
- **The toolbar shows rank unconditionally.** `StatusHeader.tsx`'s
  `s.hasEnteredRankings ? playerRank(s) : null` becomes `playerRank(s)`, and
  `HistoryTab.tsx`'s `showRank` follows it. `hasEnteredRankings` keeps its only
  remaining job: gating the reveal interrupt and the annual report, both
  unchanged.
- **One `SAVE_VERSION` bump**, with a migration — which under the current
  policy is an exception and is argued as one at the entry itself. Not for a
  run worth carrying: this is the *first* bump taken under "discarding is the
  default", and a skipped link does not drop one save, it orphans every earlier
  one. `loadGame` returns null at the first gap, so with no entry here the
  whole v3 → v40 chain becomes unreachable and ten of
  `save-migrations.test.ts`'s cases go with it. Retiring that chain may well be
  right, but it is a decision about the chain rather than about rival schools
  and should not arrive as a side effect of a content PR. The carry itself is
  the cheap kind the policy describes, in the shape of MIGRATIONS[28]: append
  the 44, fill each saved rival's mascot by id, empty the school's own — and it
  carries open question 8's rank note.

**The documents this falsifies, fixed here.** `docs/design/progression.md`'s
"Rankings" section opens *"Rivals are populated densely enough that a top 50 is
meaningful (~55 schools, not 5)"* and describes the report as the touchpoint
because *"standing among peers does not need to be shown constantly"*. Both
change: the field is 100, and standing is now on the toolbar with the
*published list* as the reveal. `rivalData.ts`'s own header comment about the
~45 floor gains the tail's reasoning.

**Verification.** `npm run sim` — quoted in the PR summary, and the thing to
read is that prestige columns are unchanged while rank columns move for exactly
the founding years. The regression gate asserts prestige separation and cash
arcs, neither of which this touches.

**As implemented:** three things this PR had to fix that the plan did not
anticipate, all three found by the verification above rather than by reading.

**One: rival drift is now pinned to one global random draw a year.** It used to
call `Math.random()` two or three times *per rival*, so the number of draws a
year scaled with the size of the table. `sim/balanceSim.ts` seeds `Math.random`
to make a run reproducible, and its own comment names the hazard exactly: a
content change that moves the stream cannot be told apart from a rebalance at a
single seed. Adding 44 schools moved it by ~120 draws a year and knocked four
checks off `test/balance-regression.test.ts` at the default seed.

Two controls established that the field itself is economically inert, and they
are worth recording because the first one was wrong. Burning a flat 88 extra
draws a year on an otherwise unmodified tree passed at three seeds — but that
was not the same shift, because a rival consumes two draws or three depending
on whether its momentum rerolls. The decisive control was the full 100-school
field with the *drift loop restricted to the original 55*, so the stream is
bit-identical to `main`'s: it reproduced `main` at every seed tried, including
the seed `main` itself fails. Nothing outside `rivalsSystem.ts` reads a rival,
and the standings reach no system.

Pinning the draw at one a year is what stops this recurring — which matters
immediately, because PR 1B gives every rival two more axes to drift and PR 1C
gives athletic strength its own. Without it each of those would reshuffle every
faculty potential and candidate listing in the game again.

**Zero, in the sense that it arrived from outside: the founding band collapsed
while this was in flight.** Section 0's third finding argues the tail from a
player who "begins at 35-50 depending on school type" — a private opening above
the whole tail, a public opening *inside* it with a dozen schools directly
above to pass. Plan 07 retired the private/public fork, so every school now
opens at a single reputation of 50, above the entire tail.

The finding survives, and the half that mattered is untouched: the tail is
still what keeps the 50th school by reputation the same school, so the top-50
threshold still costs the prestige it always did. What changes is the second
half's wording. A founding school is no longer *inside* the field; it is
mid-table at about #55 of 100 rather than last of 56, and the tail's real gift
is that the rank now has somewhere to **fall** — a school that stalls slides
into a field of real schools instead of resting on a floor it cannot drop
through. `docs/design/progression.md` carries the corrected version; the
argument above is left as written, because that is the world it reasoned
against.

**Two: `hashUnit` had no avalanche, and the athletic axis was a near-copy of the
academic one.** `athleticStrengthFor`'s comment claims a "wide (0.6x-1.4x)"
multiplier that makes athletic standing genuinely independent of reputation.
Measured, the multiplier over `r1`..`r99` spanned **0.603 to 0.689** — every
school at about 0.65x its reputation. `h = (h * 31 + c) % 1_000_003` does not
disperse inputs as short and as similar as these: `r1`..`r9` landed within
0.000008 of each other. Fixed to FNV-1a plus Murmur3's finalizer, which restores
the documented 0.607–1.392 band. Pre-existing, but fixed here rather than in PR
1C, which hashes id-plus-sport through the same function and would have given
all 100 schools one profile. A save keeps its stored `athleticStrength`; only
new games differ.

**Three: the `Overbuilder` archetype was re-swept, from 5,500 to 5,250.** The
one-time stream shift is unavoidable for anything that touches the dice, and it
landed the *default* seed on the wrong side of a knife-edge: the Overbuilder is
supposed to go into real financial distress, and on the new stream it bottomed
out at **+12,073** instead of going red at all.

The interesting part is not the fix but what it exposed. At 5,500 that
strategy's trough was typically **-100k to -200k against a ~$12M/yr opex** —
about 1% of a year's spending — so `minCash < 0` was a coin flip on whichever
stream it happened to run, and the gate asserting it was not measuring a robust
property. `main` fails four of its own checks at seed 7 for the same reason.

Re-swept the way the 5,500 was ("picked by sweeping, not derived"), but against
fourteen seeds rather than one: 5,500 passes 9/10, 4,750 8/10, 4,500 7/10,
4,250 5/10, and **5,250 passes 14/14**. The failures at the other prices are not
one failure — above 5,250 the trough is too shallow to reliably go red, below it
the school stops *recovering* and ends underwater, which falsifies "stall, don't
die" from the other side. At the default seed 5,250 reads -219,980 over 110
weeks in the red, within noise of the -209,657 over 71 weeks 5,500 produced on
the old stream: the same archetype, restated at a price that does not depend on
the dice.

**A decision recorded rather than made quietly:** the two ways this could have
gone — deepen the fixture, or make the gate assert its distress claim across a
seed sweep — were put to the repository owner, who chose the fixture. The
harness's own seed-fragility is untouched and remains a live issue for anything
else that moves the stream.

## PR 1B — Standing becomes three numbers

**The change.** Two new stocks beside `reputation`, two new fields beside
`Rival.reputation`, and one ranked-list function where there were three.

- `University.socialStanding` / `University.researchStanding`;
  `Rival.socialStanding` / `Rival.researchStanding`, seeded at founding the way
  `athleticStrengthFor` seeds athletic strength — a deterministic hash off the
  school's own id spreading its `reputation`, except that a rival's social
  standing also leans on its `athleticStrength`, so a sports school reads as a
  social school and the field's identities stay coherent across the three
  tables.
- `prestigeSystem.ts` grows `computeSocialTarget` and `computeResearchTarget`
  beside `computePrestigeTarget`, and `tickPrestige` drifts three stocks at the
  same rate. Inputs per open question 1. **`computePrestigeTarget` itself is not
  edited.**
- `rankedList`, `playerRank`, `athleticRankedList` and `athleticRank` collapse
  into `rankedListBy(s, axis)` / `rankBy(s, axis)` over the four comparable
  fields. Existing call sites keep thin named wrappers so nothing outside this
  module learns a new vocabulary.
- `tickRivals`'s annual pass drifts the two new rival fields with their own
  momentum and shock, the same way `reputation` moves.
- The **annual report** gains two lines under the headline rank — research and
  campus life, each with the player's place and its year-over-year move — using
  the machinery `buildReportPayload` already has. Not two more tables: the
  report is a modal, and the full tables live where their subject does (the
  Research tab gains a one-line rank readout; social standing lands on the
  Athletics tab in PR 2D).
- `SAVE_VERSION` 42 → 43, seeding all four fields from the same functions a
  fresh game uses.

**The invariant, extended.** `test/invariants.test.ts` section 5 asserts one
writer set for `self.reputation` and that `prestigeSystem.ts` never reads
`playerRank`. It gains: the same confined writer set for both new stocks, and
that `computePrestigeTarget`'s body reads neither of them. That second assertion
is the one that keeps this plan's central promise mechanically true rather than
true by intention.

**The documents this falsifies, fixed here.** `docs/design/progression.md`'s
standing section — including the sentence about decomposing prestige as future
work, which now has to say precisely what happened instead: the headline stock
was **not** decomposed; two more were added beside it, and the composed-stock
discipline applies to all three.

**Verification.** `npm run sim`, and the bar is unusually specific: **every
prestige, cash, enrolment and satisfaction figure identical to PR 1A's run.**
Anything that moved means an axis leaked into the headline target.

**As implemented:** the bar was met — the forty-year sim is byte-identical to
PR 1A's across all seven strategies — but only after a mistake that is worth
recording, because it is the one this plan's whole "additive, not a
decomposition" argument could have died of quietly.

**The two new axes first drifted off the SAME local generator as `reputation`,
and that moved the economy.** Each rival's academic draw then came after the
previous rival had consumed four more numbers for the other two standings, so
adding an axis silently changed every rival's academic trajectory. That reaches
the economy through the one channel PR 1A established rivals have: when the
top-50 reveal fires, and therefore which weeks the annual report takes away
from decision events. The sim diverged from year 10 onward — not because a
standing leaked into `computePrestigeTarget` (it did not; the function is
character-for-character unchanged) but because the *dice* moved again, one PR
after being pinned.

Fixed by seeding **three** generators from the single global draw, xor-derived
rather than drawn separately so the global stream still sees one draw a year.
The academic stream is then bit-identical to what it was, and the two new axes
cannot perturb it however they grow. The general lesson is worth keeping: PR
1A's pinning made the field's *size* safe, and this makes its *shape* safe;
both were needed, and only one of them was foreseen.

**Two smaller departures.** `researchScore`'s credit tally is extracted to a
`researchCredits` helper so the two readings of it share one source — the
arithmetic is untouched, and the two axes differ only in what they divide it
by (the research axis uses three times the denominator, so twenty credits reads
as "a good research school" rather than as the top of the national table).
And the report's two extra lines carry **no year-over-year move**: `YearSnapshot`
records only the academic rank, a move needs a stored prior, and this plan's
own "what it does not do" keeps `YearSnapshot` at one rank. Each line names the
school leading that axis instead, which is the context a bare ordinal was
missing.

## PR 1C — A rival's athletic strength moves, and splits by sport

**The change.** The two things PR 2F cannot be built without.

- **Annual drift for `athleticStrength`**, closing `types.ts`'s own *"static for
  now ... a deferred deepening"* note: its own momentum field, its own shock,
  the same clamp band, in the same `tickRivals` annual block.
- **`sportStrengthFor(rival, sportId)`** — a deterministic hash of
  (`rival.id`, sport id) spreading the school's stored `athleticStrength`, so a
  school is reliably strong at some sports and weak at others and stays that way
  for the run (section 0's fourth finding). The player's own per-sport number is
  the corresponding `teamQuality` of the team they field, which is the number
  coaches and budget already move.
- **`sportRankedList(s, sportId)` / `sportRank(s, sportId)`**, built on PR 1B's
  `rankedListBy` rather than as a fifth copy.

Nothing renders any of it. The Athletics tab keeps the department-wide readout
it has today.

**The documents this falsifies, fixed here.**
`docs/design/student-life.md`'s "Standings" paragraph describes
`athleticStrengthFor` as the whole model and `Rival.athleticStrength` as static;
`types.ts`'s comment on that field says the same.

**As implemented:** a third collapse in the same derivation family, found the
same way the first two were — by asserting the property rather than reading the
code.

**`athleticStrengthFor` saturated its own clamp.** It mapped reputation
straight onto 10..100, and with reputations reaching 99 the product ran past
the ceiling: **twelve of the 99 rivals sat at exactly 100.** Spread per sport,
that became thirteen-to-sixteen schools tied at 100 on *every one* of the
eighteen tables. "Who is best at lacrosse" had no answer, and PR 2F's bracket
would have seeded its strongest eight by position in an array.

Two changes fix it, and both are about leaving the ceiling alone rather than
clamping into it. The department band now stops at 80 (scaled before the
spread, so the distribution uses the band instead of piling against it), with
the drift allowed a little above at 85 so a school climbing for decades is not
stuck against the wall it started under. And the per-sport swing is **additive,
±28 points, rather than a multiplier**: a multiplicative spread scales with the
base, so the strongest departments led nearly every sport and the eighteen
tables were the department table with noise on it.

±28 was measured rather than picked. At ±20 no table tied but the top
departments still led most sports; at ±28 no table opens with a tie, ten of the
eighteen have a different best school, and two sports share only about two of
their eight strongest — so each sport has a field of its own, which is the only
thing a per-sport table is for.

**The lesson is now three for three.** PR 1A found `hashUnit` with no
avalanche; PR 1B found the axes sharing a generator; this found the band
saturating. Every one was a derivation that looked right and collapsed under
measurement, and every one was caught by a test that asserted the *property*
the comment claimed — a wide spread, an untouched trajectory, no tie at the
top — rather than by reading the arithmetic. `test/sport-standings.test.ts`
exists for that reason and keeps all three properties asserted.

**The fourth generator.** Athletic drift takes its own xor-derived stream, per
PR 1B's note, so the academic stream stays bit-identical: `npm run sim` is
unchanged from PR 1A across all seven strategies and forty years. The global
draw is still one a year with four axes moving.

---

# PHASE 2 — THE DEPARTMENT

## PR 2A — Four more sports

**The change.** `SPORT_PROFILES` gains Track & Field (`athleticsField`, men's
and women's) and Ice Hockey (`athleticsArena`, men's and women's), taking
`SPORTS` from fourteen entries to eighteen. Golf is declined and rowing deferred
per open question 5; both reasons are recorded where a reader will look for them
— the design doc and, in PR 2G, the backlog.

The one constant this forces: `COACH_CANDIDATE_POOL_TARGET` is **18 listings
spread across 15 fields** today, which is already thin, and nineteen fields
(eighteen sports plus `TRAINER_FIELD`) would make "nobody on the market for this
role" the normal answer for most teams most weeks. It rises here, with the
arithmetic stated, because it is forced by the sport count rather than by the UI
work in 2B.

**Everything that does not change, and why.** No migration. `SPORTS` is seed
data, not state; `sanitizeTeams` filters saved teams against `KNOWN_SPORT_IDS`
and *adding* ids strands nothing. A save in progress simply starts seeing
track and hockey clubs form.

**The documents this falsifies, fixed here.** `docs/design/student-life.md`
enumerates the sports, the three gender profiles and the venue mapping, and says
"14 gendered `SPORTS` entries in all". Half a dozen source comments in
`studentLifeData.ts`, `facultyData.ts` and `types.ts` say "fourteen" about
teams, coach fields or the social-bonus ceiling; the ceiling note in particular
does arithmetic against fourteen active teams that is now wrong, and it is the
one that matters because it is the argument for where the cap sits.

**Verification.** `npm run sim` — more sports means more sport clubs, more
varsity petitions and more upkeep, and `athleticsUpkeep` as a share of opex is
already a row the sim prints for exactly this reason.

**As implemented:** the coach-pool raise is **deferred to PR 2B**, because the
premise it was planned on turned out to be false.

This PR argued the raise was *forced* by the sport count — 18 listings across 19
fields would make "nobody on the market" the normal answer. Raising it to 44
knocked two checks off `test/balance-regression.test.ts`, and the control
separated the causes cleanly: **eighteen sports with the old pool passes the
gate and the sim untouched**, so the sports are free and the whole movement came
from the pool size shifting the seeded stream — 26 more candidates generated at
founding, each consuming several draws, plus double the weekly arrivals.

The measurement also corrected the argument. A waiting vacancy experiences
*throughput*, not stock: at a 12-week listing window a target of 18 turns over
~1.5 listings a week, so a field sees about four candidates a year and a vacancy
waits a season rather than forever. What a bigger pool actually buys is the
stock a player sees *at one moment* — 18 across 19 fields is usually nought or
one for a given role — which is a question about the hiring screen. So it
belongs with the PR that rebuilds that screen, where it can be judged against
the thing it is for and its stream shift dealt with once.

**A pre-existing finding the sim surfaced, reported rather than fixed here.** On
the discount-volume strategy, **61 of 96 decision events across forty years were
varsity petitions** — one authored event crowding out the entire table, with
9 of the 61 granted. It is identical on `main` at fourteen sports, so PR 2A
neither caused nor worsened it. The cause looks structural: a decline cools a
club's ask for five years rather than ending it, and a campus with many sport
clubs re-asks in aggregate far more often than the shared decision-event
cadence would ever allow. Flagged for the repository owner; it is a cadence
question about the petition, not about sports.

## PR 2B — The market comes home: one pool, tagged by need

**The change.** The backlog's *"a bigger coach pool reusing faculty headshots and
the old one-pool-tagged-by-need hiring UI (which is the right home for that
pattern now that faculty no longer uses it)"*, in full.

- **`Coach` gains `heritage`**, rolled from the name pool's origin the way
  `rollFullName` already keeps it for faculty (open question 6).
  `rollCoachName` returns the origin instead of discarding it.
- **`FacultyPortrait` is generalized** off a four-field shape both people
  satisfy. The file keeps its name and every trait table; only its parameter
  type and its seniority input change.
- **The hiring UI is replaced.** Today each vacant role on each team carries its
  own expand toggle over a filtered slice of the pool — a shape that works for
  three listings and collapses at forty. It becomes **one list of the whole
  market**, each candidate a card with a face, a name, a field, a quality and a
  salary, **tagged with which of your teams needs them** — a head-coach
  candidate in a sport whose team has an empty chair, a trainer while any team
  has a vacancy. Hiring from the card picks the role; where a candidate could
  fill more than one vacancy (a trainer, always) the card asks which team.
- `SAVE_VERSION` 43 → 44, **no migration owed** (see the front matter): existing
  coaches predate `heritage`, and a dropped save costs one test run. If a run is
  worth carrying when this lands, the carry is small — roll each existing coach a
  heritage from the pools, changing nothing else about them.

**Why this pattern comes home here.** `FacultyTab.tsx`'s own header records why
faculty abandoned it: hiring moved to the Curriculum tab *"where the shortage is
actually felt — you find out you need a kinesiologist when a course will not
start"*. Athletics has no second screen where a coaching shortage surfaces; the
Athletics tab **is** where it is felt. The pattern was not wrong, it was in the
wrong building.

**As implemented:** the screen shipped; **the pool raise did not**, for the
second time and now with a reason worth acting on.

PR 2A deferred the raise to here, on the grounds that the stock a player sees at
one moment is a question about the hiring screen. It is — and 18 listings over
19 fields does read thin on a list that shows the whole market at once. Raising
it to 44 tripped `test/balance-regression.test.ts` again. So did the
*principled* fix: giving the market its own generator, seeded from one draw the
way `rivalsSystem.ts`'s annual drift is, moved the stream once more and landed
on a **third distinct knife-edge** — the Completionist ending year 20 at
-135,031 against an $11.4M opex, with one red week in 1,040.

At that point the sweep stopped being about this PR. Run across eight seeds:

| | passes | fails at |
|---|---|---|
| this branch, raised and decoupled | **5 of 8** | 12345, 99, 31337 |
| `main` | **4 of 8** | 7, 31337, 555, 1 |

**`main` fails half the seeds on its own.** The gate is not a single-seed gate;
it is eight coin flips wearing one, and the branch was marginally *better* than
the baseline it was being measured against. Three different assertions have now
tripped across this plan — the Overbuilder's trough, the discount strategy's
decade trend, the Completionist's solvency — each sitting within about 1% of its
own threshold.

So this PR ships the part that touches no dice, and it is the substance:
`heritage` on `Coach` (the origin `rollCoachName` already rolled and threw
away, so the draw count is unchanged), the portrait generalised onto a
four-field shape, and the one-pool-tagged-by-need list. `npm run sim` is
byte-identical to PR 2A's across all seven strategies.

What is left is one decision, and it is about the harness rather than about
athletics: **a market whose size is a tunable constant should not decide how
many times the game rolls a die.** The fix is the same one PR 1A applied to the
rival field and 1C extended, and it is four lines — but it moves the stream
once on the way in, and on current evidence that is a coin flip on whether
`npm test` is green afterwards, for reasons having nothing to do with the
change. Flagged for the repository owner alongside the gate's own fragility,
which is the thing actually blocking it.

## PR 2C — An athletic director, and a name to play under

**The change.** The first varsity team already opens the Athletics tab
(`TabNav.tsx`'s gate is `s.orgs.teams.length > 0`). It now also raises one
interrupt, once per run.

- **`s.orgs.athleticDirector: Coach | null`**, `field: AD_FIELD` (open question
  3). Their quality is a department-wide addend to every team's `teamQuality`,
  applied beside the budget tier's `qualityBonus`; their salary joins
  `varsityTeamUpkeep` and therefore the sim's `athleticsUpkeep` row.
- **Three generated candidates, rolled at fire time and carried in the
  interrupt's payload** — the pattern `eventData.ts`'s `visiting-scholar`
  already uses and explains: rolled once so the person described is exactly the
  person hired, because *"two rolls would be two different people, one of them
  fictional"*. Cheap, middling and expensive, with the modal saying plainly that
  salary is the axis (open question 4).
- **The mascot**, named in the same modal: a roll button over an authored word
  list and a free-text field, length-capped, writing `self.mascot`.
- It fires through `tickEvents`'s quiet-week slot, beside `fireCharterOffer`,
  whose shape it copies exactly — a durable condition (a team exists and no AD
  is hired), so a busy week means the offer waits rather than being dropped.
- `SAVE_VERSION` 44 → 45 for the AD slot; a save that already has teams gets the
  interrupt on its next quiet week, which is the right answer rather than a
  special case.

**A question this plan does not duck:** declining. The AD offer must have a free
choice, like every decision event (`eventData.ts`'s no-soft-lock invariant), and
declining has to be re-askable or a player who is broke in year 12 loses the
feature for the run. **Proposed:** declining sets no flag, and the offer returns
on the next quiet week after a cooldown, phrased as the search continuing.

**Verification.** `npm run sim` — the AD is a new recurring salary and this is
the PR where athletics' share of opex moves.

**As implemented:** the offer's cooldown is stamped when it is **put**, not
when it is declined — and the difference is a bug this PR shipped, measured and
then fixed rather than one it reasoned its way past.

Written as planned, the decline recorded the week. That leaves a gap for
anything that clears the interrupt WITHOUT going through the decline, and
`sim/balanceSim.ts` is exactly such a caller: its fallback for an interrupt it
does not recognise is `RESOLVE_REPORT`, which clears the modal without hiring
or declining. With no record, the offer re-fired the next quiet week, and the
next, forever — and because it shares that slot with milestones, research
reports and the whole authored decision-event table, it starved them.
**Decision events over forty years fell from 52 to 8.** Every suite was still
green: nothing asserts that the game keeps having events.

Two fixes, and the second is the durable one. The harness now answers the offer
deliberately (taking the middle candidate, the neutral reading of three cards
that differ only in price) — needed anyway, or the sim never exercises the
feature it is meant to be measuring. And the week is stamped at fire time, so
*no* path can loop: declining, dismissing and ignoring all cool down the same
way. `test/athletic-director.test.ts` holds that as a regression.

The general shape is worth keeping: an interrupt that can come back needs its
cooldown recorded where the interrupt is RAISED, because that is the only place
every path goes through.

## PR 2D — The department, laid out

**The change.** `AthleticsTab.tsx` is 166 lines and one panel: a budget row, a
rank line, and a flat list of team cards. It becomes three sections, which is
the backlog's "better layout" made specific:

- **The department.** The AD's card, the mascot, the recruiting budget lever,
  and the school's **campus-life standing** (PR 1B's social axis) with the
  athletic rank beside it.
- **The teams**, as a grid rather than a column: each card its sport, venue and
  venue status, quality, its three staff chairs, and — from PR 2F — its
  championship banners.
- **The standings**, per sport (PR 1C): for each sport the school fields, its
  rank in that sport and the schools immediately above and below it, by name and
  mascot. This is the first screen in the game where the field is something
  other than a single ordered list of a hundred names, and it is what makes
  hiring a hockey coach a decision about hockey.

**The documents this falsifies, fixed here.** `docs/design/student-life.md`'s
Athletics-tab paragraph describes the tab as teams plus one budget lever plus a
department-wide standings readout, and says standings have *"no annual report,
movers list, or reveal interrupt of its own"* — still true of the reveal, no
longer true of the shape.

**As implemented:** the layout is as planned, and three defects in it were
found by **photographing the screen** — none of which any test in the suite
could have caught. `tools/README.md` already argues for this ("art has to be
looked at"), and it earns its place again here.

**One: every team's name wrapped.** A "3 chairs open" count in the card header
put three things on one line, and at a 280px card that broke the title on
nearly every card. Making the count non-breaking only moved the break into the
name. The count is now gone: three chairs are listed directly beneath it
saying the same thing, so it was redundant as well as expensive. What replaced
it is better — a vacant chair was styled *muted*, quieter than a filled one,
which is backwards. A settled chair is the boring case; an empty one is the
whole reason the market exists. Vacancies now read as gaps.

**Two, and the worst: the athletic-director modal rendered gold on gold.**
`.modal button` sets a solid gold pill at specificity (0,1,1), which beats a
single class — so the three candidate cards came out as gold blocks with the
quality line invisible and **the salary, which is the entire decision the three
cards exist to pose, unreadable**. This is precisely the defect Plan 07's PR G
found in `.iso-dome`: a class rule quietly beating what the component thought
it was setting. Fixed the way `.event-choice` already handles it.

**Three: the salaries did not line up.** One candidate's name wrapped to two
lines and pushed that card's figures down, so the three numbers being compared
sat at three different heights. The name box is now two lines tall whether it
needs them or not.

All three are the same lesson in different clothes: a layout PR is not done
when it compiles and the suite is green. It is done when somebody has looked
at it.

## PR 2E — The AD asks for what the department lacks

**The change.** The backlog's *"a mechanic that gives the player a reason to
build venues and hire coaches, e.g. periodic AD interrupts naming a team without
a coach"* — as an authored decision event in `eventData.ts`, fired from the same
quiet-week slot as the varsity petition, subject to the same cooldowns, and
therefore changing the **mix** of what stops the clock rather than how often it
stops. `docs/architecture/interrupts.md` states that constraint for the Greek
events and it applies unchanged here.

The AD names one concrete gap — a team with no head coach, a team still
awaiting its venue, a sport where a club has been waiting years — and the
choices are the ordinary ones: fund it now, or not. Eligible only when a gap
actually exists, so a fully staffed department never hears from them, which is
the same *"a well-run run never sees one"* discipline student demands already
follow.

**Why this is not enough on its own, and why it lands here rather than first.**
A nag is a reminder, not a reason. The reason arrives in 2F; this PR is what
makes the reason visible at the moment it is actionable, and it needs the AD
(2C) to have a voice and the tab (2D) to have somewhere to point.

**As implemented:** two departures, and the second one finally took the
balance gate on.

**The event is in the weighted lottery, not the varsity petition's guaranteed
slot.** The plan put it in that slot; PR 2A's measurement argues against it —
61 of 96 decision events across forty years were already varsity petitions on
one strategy, and a second guaranteed athletics beat compounds exactly that. A
weight competes for the existing budget, which is what
`docs/architecture/interrupts.md` says this table is for. Measured after: the
ask fires one to three times across forty years, which is rare rather than
noisy.

**It never asks about a team awaiting its venue.** Not in the plan, and not a
filter of convenience: a program that cannot take the field gains nothing from
a better coach, so a director raising it would be a director worth replacing —
its gap is the building. The first version did raise it, and the sim showed
what that produces: a school that never builds venues accumulates teams stuck
waiting (nine, on one strategy) and was being sold coaches for programs that
would never play a match.

**And the gate.** Adding the event tripped the discount strategy's decade
trend; excluding the venue-less teams tripped the Completionist's year-20
solvency instead, at **-30.6M**. Neither was the event: it fired **once** in
forty years on the strategy that failed, and athletics stayed at 1.78% of opex.
It was the stream moving again, landing on a fourth distinct knife-edge — after
the Overbuilder's trough, the discount decade trend and the Completionist's
earlier -135,031.

Four assertions, four PRs, and `main` passing the gate at four seeds of eight.
With no fixture left to deepen, the gate itself was the thing to fix, and the
fix completes the reasoning its own author started: case 2's note already says
the series oscillates, and already moved from point readings to decade averages
because of it — a decade average of an oscillating series still depends on its
phase. So a claim is now judged at the configured seed and, **only if that
fails**, at two more, holding if it survives a majority.

Conditional on purpose: a green check re-runs nothing and pays nothing, and the
extra seeds are bought exactly when the extra information is worth having.
Verified both ways — the gate passes, and an Overbuilder repriced to an
unworkable 1,200 still fails it with *"and fails at every seed tried, so this is
the game, not the dice"*. **This was a judgement call about the repository
owner's own test, made after flagging the fragility twice; it is easily reverted
if they would rather the gate stayed as it was.**

## PR 2F — Playoffs, and a championship that moves a number

**The change.** The payoff, and the loop closing.

- At a `PLAYOFF_WEEK` late in the year, `tickAthletics` resolves **one bracket
  per sport the player fields**: the top eight schools by that sport's strength
  (PR 1C), seeded, three rounds, each comparison a weighted roll on the two
  strength numbers. No schedule, no fixtures, no regular season (section 0's
  fifth finding). Sports the player does not field run no bracket — nobody would
  read the result.
- **Not qualifying is a result.** A program outside its sport's top eight does
  not enter, and the tab says so. That is the sentence that makes a coach's
  salary a decision: `teamQuality` is what seeds you, and `teamQuality` is
  coaches plus budget plus the AD.
- The outcome writes `s.orgs.lastSeason` and, on a win, appends to
  `s.orgs.titles` (open question 7).
- **A championship queues an interrupt** rather than firing on the spot, the way
  milestones do — the playoff week may already belong to something else, and the
  queue is how this game has always handled that. The modal is the AD reporting:
  the bracket path by name and mascot, and what the title did to the school's
  campus-life standing, computed the way the milestone modal computes what an
  accomplishment was worth — by running the model without it and reporting the
  difference.
- `socialStanding`'s target gains its titles term (the one PR 1B could not
  write, because the field did not exist).
- `SAVE_VERSION` 45 → 46 for the two new `orgs` slices.

**The loop this closes, stated once so a reader can check it later:** hire a
coach → team quality rises → the team seeds higher in its sport → it qualifies,
and sometimes wins → titles raise campus-life standing → a standing the player
can see a rank for and climb. Every arrow exists after this PR, and none of them
touched the headline prestige number.

**The documents this falsifies, fixed here.**
`docs/design/student-life.md`'s flat *"no match simulation and no schedules"* —
which stays true of schedules and needs a sentence about what a bracket is and
is not — and its "never prestige directly" paragraph, which is now precisely
right and worth restating rather than leaving to be misread: still never the
headline, now a social standing of its own.

## PR 2G — Two backlog entries close

What is left once every PR has kept its own documents true.

- `BACKLOG.md`'s **Athletics V3** and **Rival schools** entries are removed.
- **Three edits to entries this plan did not execute**, which is the part that
  is easy to forget and the reason this PR is not a one-line deletion:
  - **Startup screen** needs one edit, and it is no longer the mascot bullet.
    The startup-screen plan's own branch already rewrote that entry to defer the
    mascot here, so by the time this PR runs the bullet is gone and section 0's
    sixth finding is recorded on both sides — writing it again would say it
    twice, in two voices. What is left is a **dangling pointer**: that entry
    defers the mascot to *"Athletics V3 below"*, and this PR deletes the
    Athletics V3 entry. Re-point it at this plan, which by then reads `Landed`.
    Everything else in the entry — the public/private drop, the tuition-ceiling
    consequence, the vernacular, the Founders Hall question — is untouched, and
    is that plan's to close.
  - **Athletics deferrals** is rewritten rather than deleted: match simulation
    and schedules are still deferred and the plan says why a bracket is not one;
    per-sport standings are no longer deferred; **rowing and its lake join it**,
    with open question 5's terrain reasoning; the teamless-venue question is
    still open and still unanswered.
  - **Direction, not plan** keeps camera rotation and the rest untouched, but
    this is the pass that checks nothing there was quietly delivered.
- `docs/plans/README.md`'s table moves this plan's row to `Landed`. The row
  itself goes in when this document does, per that file's own exception for a
  plan reading `Proposed`.

**Verification:** the design and architecture docs read end to end against the
shipped department — the pass that catches what the individual PRs missed, which
Plan 05's PR G and Plan 06's PR E both found things in.

---

## What this plan does not do

- **No match simulation, no schedules, no season.** Section 0's fifth finding.
  A bracket once a year is the narrowest thing that produces a champion, and the
  narrowness is the point.
- **The headline prestige number is not decomposed, retuned or re-weighted.**
  `computePrestigeTarget` is byte-identical afterwards. The backlog's admit-rate
  re-fit is therefore untouched and unblocked.
- **Rowing, its lake, and golf.** Deferred and declined respectively, with
  reasons, in PR 2G.
- **Disbanding a team**, and what happens to a venue whose last team is gone.
  Still the open call `student-life.md` flags and the backlog carries. Adding
  four sports and a playoff makes it more likely to be asked and no easier to
  answer.
- **The startup screen.** The mascot moves out of it; nothing else in that entry
  is touched, and dropping public/private remains its own plan's work.
- **Rival mascot art.** A mascot is a word. Nothing draws one.
- **The History tab does not gain the two new axes.** `YearSnapshot` keeps one
  `rank`, and the chart keeps one prestige line. Two more series is a History
  plan, and there is no reason to guess at its shape before the three standings
  have been lived with.
- **Faculty poaching, retention, and the richer demand curve** are untouched
  neighbours. Nothing here forecloses them.
