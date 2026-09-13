# UniSchool — The Academic Core: Curriculum, Quality, Faculty, Scholarship

*Planning document only — no gameplay code is changed by this file. Its job is
to work out how four systems that are currently separate (the curriculum view,
course development, the faculty roster, and research) become one interconnected
loop, and to sequence that work so each step ships on its own.*

**Status: proposed.** Nothing here is built. The constellation-layout experiment
that preceded this document is deliberately not being carried forward — see
"Why the constellation failed" below, which is the most useful thing it
produced.

---

## 0. The finding that reorders everything

The four requests in the brief look like four features. They are not. Three of
them are blocked behind one small piece of missing state, and that piece is
what this plan is really about.

**Today, a course has no instructor.** `systems/faculty/facultyAssignment.ts` is
explicit about it: course-to-teacher is a *display-only projection*, a
deterministic round-robin that sorts a field's faculty by id, sorts that field's
offered courses by id, and pairs them off so the Faculty tab and the Curriculum
tab can both say something plausible without inventing persisted state. The
engine only ever tracks per-field *capacity* (`Faculty.courseSlots`, consumed by
any `developing`/`done` course whose `requiresFaculty` matches).

That projection is fine for a caption. It cannot carry a grade. Hire one person
into a field and every course in it silently re-pairs; the A-minus that
Microeconomics wore last week is now attached to a different person for reasons
the player never made and cannot see. A grade computed off a round-robin is a
grade that changes when you aren't looking, which is the one thing a grade must
never do.

So:

- **Course quality requires a real, stable course→faculty link.**
- **Player-selected faculty *is* that link.** Letting the player choose isn't a
  separate feature that happens to be nearby — it is the mechanism that makes
  the assignment real enough to grade.
- **Reassigning faculty to improve a weak course** is the same link, edited.

One piece of state unlocks all three. Which means the build order is not the
order the brief lists them in: **the assignment lands first, the grades land on
top of it, and the new map is drawn last** — because until grades exist, a
school-level view of the curriculum has nothing to show that the existing
completion ring doesn't already show.

### Where that state goes

`GameState` grows one record:

```ts
// courseId -> facultyId. The instructor a player chose for a course, fixed
// at the moment development starts and editable thereafter.
courseFaculty: Record<string, string>;
```

A separate record, **not a field on `Buildable`** — for exactly the reason
`placements` is a separate record and not a field on `Buildable` (see README's
"Courses and buildings share one flow"). A building's location and a course's
instructor are the same shape of fact: something true of *one kind* of Buildable
that must not fork the single Buildable model. Courses are never placed;
buildings never have instructors; each gets a side record keyed by id, and the
model underneath stays unforked.

This is the architecturally native move, and it has the precedent in-repo
already. `facultyAssignment.ts`'s round-robin does not disappear — it becomes
the *fallback* for a course with no entry in the record (a legacy save, or a
course whose instructor was dismissed), which is also the migration story.

### One prior worry, retired

An early concern was that most of the catalogue has no faculty field and so
could not be graded. That is wrong, and worth stating plainly because it
removes a whole design problem: **every course already carries
`requiresFaculty`.** `techData.ts` sets it systematically — every major seed
carries one `field`, every one of its nine courses requires it
(`techData.ts:1063`), and the six gen-ed courses get theirs from `GENED_FIELDS`
(`techData.ts:988`). Graduate courses carry their own (`techData.ts:1159`).
There is no unfielded course anywhere in the 421. Every course can be assigned,
and every course can be graded, with no new authored data at all.

---

## 1. Curriculum UI — from constellation to map

### Why the constellation failed

Worth writing down, because the failure is informative rather than cosmetic.

The constellation made **layout** carry the metaphor. But the information
structure of this curriculum is not a constellation — it is a **hierarchy with a
sparse graph laid over it**:

- **The hierarchy is total.** School → major → tier, 42 majors of exactly nine
  courses each, in a fixed 1/4/4 shape (`DiscoveryMajor`: one `tier1Id`, four
  `tier2Ids`, four `tier3Ids`).
- **The graph is almost entirely regular.** T1 gates all four T2s; the T2
  quartet gates all four T3s. Drawn as edges that is 8 lines per major, 336
  lines across the catalogue, every one of them saying the identical thing.
- **The irregular part is small and precious.** `CROSS_MAJOR_BRIDGES` is roughly
  fifty authored edges, and each one is genuinely interesting — Fintech &
  Blockchain needs data structures, Environmental Economics needs the
  environmental science it prices.

A force-directed or radial layout spends its entire expressive budget drawing
the 336 boring edges, and the ~50 interesting ones arrive as indistinguishable
extra spaghetti. Meanwhile the node has to shrink to a dot to fit, which is what
undid the full-course-names improvement from `093fe9e`.

**The rule that follows:** the regular structure is expressed by *position*
(columns, bands, grouping) and drawn with **zero lines**. Only the irregular
structure — the cross-major bridges — is ever drawn as an edge, and only on
demand. That single rule is most of the redesign.

### What the map actually is

A **Curriculum Map**: a full-bleed, pannable/zoomable canvas of real course
cards, with three levels of resolution. Not three separate screens — one
continuous zoom with three legible stopping points, so navigating never means
losing your place.

**Level 1 — University.** Eight to ten school cards (the seven undergraduate
schools plus Medicine/Law once revealed). Each card carries: name, completion
ring (already computed — `discoverySections()` exports exactly this), courses
done / total, and the **aggregate grade** the quality system adds. This view is
the direct answer to *"look at a school and immediately see its strengths and
weaknesses"* — and it is the view that does not exist today in any form.

**Level 2 — School.** The school's majors as **lanes**. One lane per major,
reading left to right in three bands:

```
  ┌ T1 ──────┐   ┌ T2 ───────────────────────────┐   ┌ T3 ───────────────────────────┐
  │ FINA 101 │──▶│ 110 │ 120 │ 130 │ 140         │──▶│ 210 │ 220 │ 230 │ 240         │
  │ Prin. of │   │ (four cards, one band)        │   │ (four cards, one band)        │
  │ Finance  │   │                               │   │                               │
  └──────────┘   └───────────────────────────────┘   └───────────────────────────────┘
```

The two chevrons between bands replace sixteen prereq lines and say the same
thing more clearly. **Visual hierarchy by tier**, as the brief asks: T1 is the
largest and most saturated card (it is the gateway, and the one the player acts
on first); T2 is standard; T3 is standard-width but visually marked as capstone
work (a heavier rule, a different accent), because "distinguished" is a status
worth reading at a glance.

**Level 3 — Course detail.** A **side drawer**, not a modal over the map. The
map stays visible and stays interactive on the left; the drawer on the right
carries the full name, description, cost, duration, prereqs met/unmet, the
faculty panel (section 3), and the grade with its reasons. Clicking another card
swaps the drawer's contents rather than closing and reopening it — which is what
makes browsing the catalogue feel like browsing rather than like a sequence of
dialogs.

### Cross-disciplinary prerequisites

Never permanent. Three ways they surface, in increasing order of how much the
player asked for them:

1. **On the card, as a badge.** A course with an unmet cross-major prereq shows
   a small marker: `needs ECON 110 →`. Clicking it *navigates the map* to that
   course — pans, zooms, selects. This is the single highest-value interaction
   in the whole map, because the bridge you care about is almost always a bridge
   to something you can't currently see, and a drawn line to an off-screen node
   is worth nothing.
2. **On hover/selection.** Selecting a course lights its own bridges, in and
   out, as actual drawn edges — including one that runs off-screen, which gets a
   directional stub at the viewport edge rather than a line to nowhere.
3. **As a filter.** A toolbar toggle — "show cross-listings" — lights every
   bridge among the courses currently in view. Deliberately a mode the player
   enters and leaves, never the default state.

### Handling 421 courses

The good news is that **progressive discovery already solves most of this**, and
it should be preserved exactly as-is. `CurriculumTab.tsx`'s `buildSections`
derives what is visible purely from existing unlock/milestone state: only the
gen-ed core at founding, then loose tier-1s in a pool, then school sections as
buildings finish, then per-major subgroups as programs establish. A player never
sees 421 courses; they see what they have earned the sight of. That logic is
sound, it is well-documented, and the new map should be a **different renderer
over the same `DiscoverySection[]`**, not a replacement for it.

On top of that, the map adds:

- **Zoom-driven level of detail.** Zoomed out, cards degrade gracefully: title
  drops, then code drops, leaving a grade-colored tile. Never a dot — a tile
  with a grade color is still information.
- **Filters over the whole visible catalogue**, in the overlaid toolbar: by
  status (available / developing / done / blocked), by grade band (*show me
  everything at D or below* — the improvement worklist), by faculty field (*show
  me everything Dr. Okonkwo teaches*), and free-text search over titles and
  codes.
- **Search jumps.** Typing a code or title pans the map to it. With 421 courses,
  a search box that navigates is worth more than any amount of layout cleverness.

### The full-bleed shell

The one confirmed win from the constellation experiment, and it generalizes past
the curriculum: **full-viewport tab content with the toolbar laid over it**,
rather than a sheet floating in front of a dimmed map.

This is a small, separable change to `components/TabOverlay.tsx` and `App.tsx`:
a `fullBleed` mode on the overlay that drops the backdrop dim, drops the
centered sheet box, and lets the tab's own content own the viewport with the
toolbar floating above it — the same treatment `CampusMap` already gets, which
`App.tsx`'s header comment describes as the intended shape of the whole shell.

Curriculum takes it. Athletics and Student Life probably want it too. Treasury,
Admissions and History stay sheets — they are read-and-leave screens, and a
full-screen treatment would make a short page look empty. **This change should
ship first and separately**, because it is small, it is already validated, and
it is the container everything else in this plan renders into.

---

## 2. Course quality — the A–F grade

### Derived, never stored

Follow the precedent the codebase already sets hard: `teaching`, `research` and
`salary` are recomputed from potential + tenure on *every* tick
(`facultySystem.ts`'s `growFaculty`), which is precisely why the research prize
needed `acclaim` as its own field — a stored bump would have been erased the
following week.

Course quality goes the other way: it is **computed on read**, from the
assignment plus the instructor's current stats. Nothing to store, nothing to
migrate, nothing to drift. It rises on its own as a retained instructor matures,
which is exactly the behaviour we want — *the course you developed in Year 3
quietly gets better because you kept the person teaching it.* That is a lovely
thing for a player to notice, and it falls out for free.

```ts
// data/courseQuality.ts — pure, data-layer, no state mutation
export function courseQualityScore(s: GameState, course: Buildable): number | null
export function courseGrade(score: number | null): Grade   // 'A'|'B'|'C'|'D'|'F'|'—'
```

`null` for a course not yet developed (no grade on an undeveloped course — an
empty slot is not an F) and for one whose instructor has been dismissed, which
renders as `—` / "unstaffed" rather than F. **F is a grade the player earned; a
dash is a state the player must fix.** Keeping those visually distinct matters.

### The formula

Primary term, per the brief, is the assigned instructor's **teaching** stat.
Around it, a small number of legible modifiers — each one a lever the player can
actually pull, because a modifier they cannot influence is just noise:

| Input | Effect | Why |
|---|---|---|
| Instructor `teaching` (0–100) | the base | The brief's primary driver |
| **Overload penalty** | negative, scaling | An instructor carrying more courses than their `courseSlots` comfortably allows teaches all of them worse. Makes "hire more" and "hire better" genuinely different answers |
| **Tier difficulty** | small negative on T3 / graduate | A capstone needs a stronger person than an intro survey. Gives senior faculty a natural home and makes assignment a *matching* problem, not a ranking problem |
| **`acclaim`** | small positive | A prize-winner's course benefits. Ties the research loop back into teaching at one point, cheaply |
| **Facilities** | small positive, capped | The school building being done, library adequacy. Deliberately small — see the risk note below |

Grade bands sit alongside `facultyData.ts`'s existing `QUALITY_TIER_THRESHOLDS`
(85 / 70 / 55 / 35), and should probably *not* be identical to them: an 85
faculty member is Distinguished, but an 85-point course being an A is a
different claim. Propose A ≥ 82, B ≥ 68, C ≥ 52, D ≥ 36, F below — tuned so a
**founding school reads C, not F**.

> **Open question, flagged rather than decided:** absolute or curved? An
> absolute scale is honest (a new school genuinely is not good yet) and gives
> decades of visible improvement, but risks an opening hour that is a wall of
> Ds. A curve against what is currently hirable flatters the early game but
> makes the grade meaningless as a long-run measure. **Recommendation: absolute,
> with the low bands set generously**, so F means "you assigned badly or left it
> unstaffed" — a state the player caused and can fix — rather than "you are new".

### What the grade feeds

Two places, and the second one is the whole point of the feature.

**Academic satisfaction** (`satisfactionSystem.ts:236-238`). Today `academic` is
library ratio + a bonus scaled by `facultyQualityScore` — the *roster average*,
which counts a brilliant chemist the school hired and never assigned to anything.
Replace that term with the **average grade of courses actually offered**. It is
strictly more honest: students experience the courses they take, not the payroll.
And it is what makes *improve a weak course* a real alternative to *develop
another course*, because both now move the same number.

**Prestige breadth** (`prestigeSystem.ts:338`). Breadth is the dominant term
(`CURRICULUM_BREADTH_WEIGHT = 90`) and today it is a pure count of milestones.
Add course quality as a **multiplier on that term** — which is not a new pattern,
it is precisely the shape `libraryAdequacyScore` already has on the same line:

```ts
CURRICULUM_BREADTH_WEIGHT * curriculumBreadthScore(s)
  * libraryAdequacyScore(s)
  * curriculumQualityScore(s)   // new, clamped, with a floor
```

With a floor (as the library term has, `LIBRARY_ADEQUACY_FLOOR = 0.4`), so a
broad-but-mediocre school still banks most of its breadth, and only a
broad-*and*-excellent one banks all of it. Rankings read reputation and never
feed it, so this flows all the way out to the U.S. News report with no further
work.

> **Risk to watch:** stacking a second multiplier on the same term compounds.
> Breadth × library × quality can swing the dominant input hard. The floors must
> be set so the realistic worst case is a meaningful haircut, not a collapse —
> `npm run sim` is the tool for checking that shape before tuning by feel.

### Display

- **On the card:** a grade chip in a consistent corner, with a subtle
  background-tint scale across the card — saturated enough to scan a school at a
  glance, muted enough that a wall of cards doesn't read as a heat map. The
  existing status treatment (brass fill for done, pulse for developing) stays;
  grade tint sits *underneath* it, never replacing status.
- **Aggregated upward:** major grade = mean of its developed courses; school
  grade = mean of its majors (weighted by course count, so a school with one
  strong major and five weak ones does not read as a B). This is what fills the
  Level-1 university view.
- **In the drawer:** the grade with its *reasons* itemized — "Prof. Adeyemi,
  teaching 71 · −6 overloaded · −4 capstone tier". A grade the player cannot
  decompose is a grade they cannot act on.

---

## 3. Faculty — from invisible resource to named choice

### The flow

Clicking an available course opens the drawer, which leads with the assignment
decision rather than burying it:

**Several eligible.** A short list of in-field faculty with a free slot, each
rendered as the card `FacultyTab.tsx` already builds — portrait
(`FacultyPortrait.tsx`), name, rank badge, teaching/research bars, bio. Plus two
things that list does not currently show and needs here: **current load**
("3 of 4 slots") and, crucially, **the grade this course would get with them**.
The projected grade turns an abstract stat comparison into a concrete
consequence, and it is cheap — `courseQualityScore` is pure, so calling it
speculatively against each candidate costs nothing.

**Exactly one eligible.** Pre-selected, shown, one button: *Develop with
Dr. Reyes — projected B+*. Frictionless, as the brief asks, but never silent:
the player still learns who is teaching it.

**Nobody eligible.** This is the case that currently produces a dead-end and a
dot on a cell. Instead, the drawer becomes the fix:

- If people exist in the field but are all full: *"All three Economics faculty
  are at capacity."* — with those three listed, so the player can reassign
  someone off a course they care less about, or go hire.
- If the field is empty or short: **"Hire Faculty"** inline, showing the
  *current candidates in that field* straight from `s.candidates` with an
  Appoint button, and the honest answer when the market is thin — *"No
  Neuroscience candidates on the market this week."* That is real information
  (`facultyData.ts` deliberately makes Neuroscience turn up ~28% of weeks) and
  it is far better than a generic "hire more faculty" nudge, because it tells
  the player to *wait and watch* rather than to go looking for a button that
  isn't there.

This is the brief's *"eliminating the need for separate dialogue explaining the
problem"*, and it deletes a category of dead end rather than explaining it.

### New actions

```ts
| { type: 'START_DEVELOPMENT'; nodeId: string; facultyId: string }  // gains the choice
| { type: 'REASSIGN_COURSE_FACULTY'; courseId: string; facultyId: string }
```

`canStartDevelopment` gains a matching parameter: the chosen person must exist,
match `requiresFaculty`, and have a free slot. The existing per-field slot
accounting (`usedFacultySlots` / `totalFacultySlots`) stays exactly as it is —
it remains the capacity truth; the assignment record is only *which* of that
field's people holds each slot.

`DEVELOP_ALL_AVAILABLE_COURSES` (the sandbox helper) auto-picks the
best-available instructor per course. It is a debug affordance; it should not
acquire a decision.

**Reassignment cost:** recommend **free and immediate** to start. The real cost
is already an opportunity cost — moving your best teacher onto Organic Chemistry
makes whatever they were teaching worse — and that is a genuinely interesting
decision without any additional tax. Add friction (a cost, or effect deferred to
the summer boundary) only if playtesting shows the player churning assignments
every week. Do not pre-emptively tax a mechanic that may be self-limiting.

### Dismissal now has consequences

`FIRE_FACULTY` currently just removes a row. With real assignments it orphans
courses, and those courses become **unstaffed**: grade `—`, a visible marker on
the card, an honest penalty to the academic-satisfaction average, and an
explicit *"assign an instructor"* call in the drawer.

Note what this is: it is the README's own deferred future direction —
*"a department left understaffed, its courses going on hold until a replacement
is hired"* — arriving for free as a consequence of the assignment record. It
should be built now, because the alternative (silently re-round-robining the
orphans) re-introduces exactly the invisible reshuffling this whole plan exists
to remove. Firing should warn: *"Dr. Chen teaches 4 courses. They will be left
unstaffed."*

### Teaching vs. Scholarship

Worth noting how little work this actually is: **the split already exists in
state.** `Faculty.teaching` and `Faculty.research` are separate fields, with
separate potentials and separate growth curves. What is missing is not the data
model — it is that today *neither stat has a job of its own*. Both are averaged
together into `facultyQualityScore` for prestige and satisfaction, and
`facultyQualityTier` buckets their mean into a rank badge.

Course quality gives `teaching` its first real, visible, per-person job.
Research initiatives (section 4) give `research` its first. After both, the two
numbers finally mean different things to the player, and a hiring decision
becomes *what do I need this person for* rather than *is this person good*. The
prestige input should then probably split too — but that is a tuning question
for after both loops exist, not a prerequisite for either.

---

## 4. Scholarship — initiatives in the labs

### What is right today, and must survive

`researchSystem.ts` is well-built, and this section is additive to most of it.
Three things are load-bearing and must hold through the rework:

- **Outputs never write `s.self.reputation`.** A breakthrough increments a count
  that `prestigeSystem.ts`'s `researchScore` reads as one clamped input among
  seven. That invariant is the whole reason research can't outrun curriculum
  breadth, and nothing below may break it.
- **The two-dial cadence** — a weekly chance floored by a cooldown, then a
  weighted draw — is reused wholesale, just scoped to a running initiative
  instead of to a global stock.
- **The prize is queued, not fired** (`pendingPrizes` / `RESOLVE_PRIZE`), so it
  can't be eaten by a week that already owns an interrupt. That machinery is
  kept exactly as-is; only what *triggers* it changes.

### The model

An initiative is **authored content**, not a procedural roll: a named advanced
topic, in a named field or across several, run out of a specific lab by named
people, for a long time.

> **The lab is the slot.** Each research facility hosts **one** initiative at a
> time. The number of things a university can pursue at once is the number of
> places it has built to pursue them in.

This is a better constraint than gating on faculty time alone, and it is worth
saying why: it makes **building a lab a direct research-capacity decision**
rather than a multiplier on a number. Today a lab does two vague things (opens a
gate, adds to a campus-wide rate). Under this model a lab is a concrete,
countable thing — a bench you either have free or don't — and the question
"should we build another lab" acquires an obvious, legible answer. It also scales
correctly with the existing build economy: **nine labs exist today** (Engineering
holds five — Chemical, Mechanical, Electrical, Civil, Aerospace; Science holds
three — Chemistry, Biology, Physics; Health Science holds Neuroscience), rising
to roughly fifteen once the four lab-less schools get infrastructure of their
own. So a founding school runs one initiative, and a mature research university
runs a dozen or so in parallel. That is the right shape without any new tuning.

### Authored topics

A new `data/researchTopics.ts`, and it should be understood up front as **the
largest content-authoring job in this plan** — comparable in scale to the 421
course titles, and the main reason PR F is expensive.

```ts
interface ResearchTopic {
  id: string;
  name: string;            // "Room-Temperature Superconductivity"
  fields: string[];        // one field, or several for a cross-disciplinary topic
  minDepth: InitiativeDepth;   // a landmark topic can't be run as a pilot study
  blurb: string;           // one line of flavour, shown on the offer card
}
```

Two kinds:

**Single-field topics.** Advanced subject matter for each of the 28 fields —
roughly three to five apiece, so a field always has something to offer and the
offers don't repeat immediately. ~110–140 topics.

**Cross-disciplinary topics**, which list two or three fields and **can only be
staffed by drawing a participant from each**. These are the ones worth spending
authoring care on, because they are the mechanic that makes a large university
feel like one thing rather than a collection of departments — *Computational
Neuroscience* wants Neuroscience and Computer Science; *Climate Economics* wants
Biology and Economics; *Medical Imaging Physics* wants Physics and Clinical
Health; *Digital Humanities* wants History and Computer Science. ~25–40 of them.

The payoff: a cross-disciplinary initiative should be **meaningfully stronger**
than a single-field one of the same depth — better outcome odds, richer awards.
That is the reward for having built breadth instead of drilling one school.

**Which topics are offered** when a lab falls vacant is gated, not random-from-
everything: the lab's own fields, plus any field the school has actually built
out (a developed T3 catalogue in it), plus who is on the roster to staff it. And
the offer is a **draw**, not the full list — the same discipline as the candidate
market, so "what came up this time" is itself a small piece of texture.

### Depth

A vacant lab shows a **"Start research"** panel offering several options, one per
depth tier, each pre-loaded with an eligible topic. Deeper means more faculty,
more money up front, longer commitment, bigger payoff:

| Depth | Faculty | Duration | Funding | Outcome profile |
|---|---|---|---|---|
| **Pilot Study** | 1 | ~26 weeks (6 mo) | small | Publications; a grant now and then. Breakthrough unlikely |
| **Funded Project** | 2 | ~78 weeks (1.5 yr) | moderate | Regular grants; a real breakthrough chance |
| **Major Program** | 3 | ~156 weeks (3 yr) | large | Multiple breakthroughs likely; award possible |
| **Landmark Program** | 4–5, **cross-disciplinary required** | ~260 weeks (5 yr) | very large | The Nobel tier |

(Durations against `WEEKS_PER_YEAR = 52`.) Funding is charged **up front**, like
every other Buildable cost in the game — the same "commit the money at the moment
of the decision" rule `startDevelopment` follows, so research borrows the pacing
model rather than inventing a second one.

Note what the Landmark tier does: it makes the single most prestigious thing in
the game *structurally* require an interdisciplinary team. You cannot win a Nobel
out of one department.

### State

```ts
interface Initiative {
  id: string;
  labId: string;            // the facility hosting it — one initiative per lab
  topicId: string;
  depth: InitiativeDepth;
  participantIds: string[];
  weeksTotal: number;
  weeksRemaining: number;
  breakthroughs: number;    // banked during the run; gates the award roll at conclusion
  grantIncome: number;      // for the conclusion report
}

// on ResearchState:
initiatives: Record<string, Initiative>;   // keyed by labId — the slot IS the key
```

Keying by `labId` makes "one per lab" an invariant of the data shape rather than
a rule some system has to remember to enforce. A lab is vacant exactly when it
has no key.

### How a run resolves

**During the run** — the weighted-random events the brief wants kept, now scoped
to a specific project instead of floating free over a global stock:

- **Grants** → cash, as today. Amount scales with the participants' combined
  `research` strength (and `acclaim`), so a strong team is genuinely better at
  pulling money in, exactly as the brief asks.
- **Breakthroughs** → increment `s.research.breakthroughs` (unchanged, so the
  prestige path is untouched) *and* bank one on the initiative, which is what
  makes the award possible later.
- **Publications** → a new, cheap, frequent low rung. Worth adding because the
  existing three outputs all cost enough that early research is a long silence
  followed by a grant; a cheap fourth rung gives a young department something to
  show from week one, and gives humanities an output that reads right at any
  scale.

Per-week chances are driven by the participants' research strength, the depth
tier, the hosting lab's own `researchRateBonus`, and the cross-disciplinary
bonus. The existing cooldown machinery keeps a single project from firing four
weeks running.

**At conclusion** — the part that is genuinely new:

1. A **completion payoff** sized by depth and by how the run actually went
   (breakthroughs banked, team strength). Feeds the same capped prestige input;
   never writes reputation.
2. **The major award roll.** Per the brief: **gated on having produced at least
   one breakthrough**, then rolled on the participants' research strength plus
   noise, with depth weighting the odds. A Pilot Study should essentially never
   produce one; a Landmark Program with three breakthroughs and a Distinguished
   team should have a real chance.

This **moves the prize out of `RESEARCH_OUTPUTS`** and into initiative
conclusion. That's the one real deletion in this section, and it is an
improvement on two counts: a Nobel now has a *story* attached — a named topic,
a named team, five years — instead of arriving as a weighted draw against a
stock. And the existing `pendingPrizes` queue, `RESOLVE_PRIZE`, the `acclaim`
field, and the celebration interrupt are all reused unchanged. Only the trigger
moves.

Faculty participants are **committed for the duration**. At 26 to 260 weeks this
is a serious commitment, and it is where the teaching/scholarship tension
actually bites (see decision 2): the question is whether commitment reduces
`courseSlots`, penalizes course quality, or is purely an opportunity cost of
being unavailable for *other* initiatives.

### What happens to the aggregate points stock

Under this model `s.research.points` loses its job: production is per-initiative,
and outputs are triggered by a running project rather than bought out of a bank.
The monotone counts it lives beside — `breakthroughs`, `grants`, `prizes`,
`grantIncome` — all stay exactly as they are, which is what keeps
`prestigeSystem.ts`'s `researchScore` working untouched.

The open question is whether lab-equipped faculty who are *not* on an initiative
still trickle into a stock (see decision 7). **Recommendation: retire the stock
as a driver.** "Player-directed research rather than the entire system" reads
most cleanly as: idle capacity produces nothing, and the way to produce is to
start something. It also removes the slightly odd current situation where
research happens because you own a building.

### The UI: a Research tab of its own

The brief floats Faculty tab or a new tab. **Recommend a new Research tab**, for
three reasons: the Faculty tab is already a dense two-panel screen (roster +
market) and this content is a full screen on its own; the interaction is about
*labs and projects*, with faculty as an input, so filing it under Faculty inverts
the subject; and — the real argument — Curriculum is where `teaching` lives, so
Research being where `research` lives completes the symmetry that makes the two
stats finally mean different things. It takes the same full-bleed treatment
(PR A).

**Layout: one horizontal panel per research facility**, stacked. Each panel is a
lab, and a lab is either running something or vacant.

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ⌬ PHYSICS LAB · Science Center                          Major Program · 3 yr  │
│ ───────────────────────────────────────────────────────────────────────────── │
│ "Room-Temperature Superconductivity"                                          │
│                                                                               │
│  (◕)  Dr. Amara Osei      Physics      research 78 ▓▓▓▓▓▓▓▓░░                  │
│  (◕)  Dr. Jae-won Park    Chemistry    research 64 ▓▓▓▓▓▓░░░░   ⚛ cross-disc. │
│  (◕)  Dr. Ines Marchetti  Mathematics  research 71 ▓▓▓▓▓▓▓░░░                 │
│                                                                               │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░  94 of 156 weeks · 1 breakthrough │
└───────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────┐
│ ⌬ BIOLOGY LAB · Science Center                                        VACANT  │
│                                                    ┌────────────────────────┐ │
│                                                    │    Start research →    │ │
│                                                    └────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────┘
```

Everything the brief asks for is on the panel: the lab it runs out of, the topic,
the participants with headshots (`FacultyPortrait.tsx`, already built), their
fields, their research strength as bars (`StatBar` in `FacultyTab.tsx`, already
built), and a progress bar. Breakthroughs banked so far sit next to the progress
bar, because that's the number that decides whether this run can end in an award
— the player should be able to watch it.

**"Start research"** opens the offer set: one card per depth tier, each showing
topic, required fields, faculty count, up-front cost, duration, and a plain-words
outcome expectation. Choosing a card then assigns participants — auto-filled with
the strongest eligible person per required field, editable, and blocked with a
clear reason when a required field has nobody free (with the same inline **Hire
Faculty** affordance the curriculum drawer gets, since it is the identical dead
end).

A completed initiative leaves a **result card** in a history strip below — topic,
team, what it produced, whether it took an award. Over a long run that strip
becomes the university's research record, and it is the cheapest possible version
of "publications and awards" as a visible institutional history.

### Making it work outside STEM

Unchanged in substance from the previous draft, and now **load-bearing rather
than nice-to-have**: under a lab-as-slot model, a school with no lab has not just
no output but *no slot* — it literally cannot participate. Business, Arts & Media,
Social Sciences & Humanities and Computer Science all currently have none.

1. **Generalize "lab" to research infrastructure.** Mechanically identical
   Buildables, different names, art and homes: a humanities research institute
   and archive; a behavioural lab and trading floor for Business; studios and a
   performance space for Arts & Media; a computing centre for CS. Overwhelmingly
   a `data/` change — `facilitiesData.ts` plus widening
   `LAB_GATED_MAJOR_PREFIXES` — and it follows the graduate-programs rule
   exactly: **no bespoke per-school system**, only authored data over shared
   machinery. It also unblocks the research doctorates those four schools cannot
   currently have, for the same reason.
2. **Discipline-specific output names over identical mechanics.** A breakthrough
   is a *monograph* in humanities, a *study* in social science, an *exhibition*
   in the arts, a *case study* in business. Authored strings over one shared
   table.

On terminology: whether the concept is *renamed* Scholarship in code (with a save
migration, as the README's terminology pass handled `major-complete:`) or stays
`research` with Scholarship as the player-facing word is decision 5.
**Recommendation: player-facing only at first** — the code churn buys nothing
mechanical, and the roadmap has precedent for deferring terminology to its own
pass.

### Later, explicitly not now

Grant *applications* (an initiative that targets a named funder competitively);
multi-university collaborations with rivals; per-faculty publication records;
research centers as a Buildable tier above the lab that hosts several initiatives
at once. All are natural growths from this object. None belong in its first
version.

---

## 5. The loop this produces

```
        money ──────────────┐
          ▲                 ▼
          │        ┌─── hire / retain faculty ───┐
          │        │                             │
          │   teaching stat                research stat
          │        │                             │
          │        ▼                             ▼
          │   assigned to courses     committed to an initiative in a lab
          │        │                             │
          │   course grades (A–F)      during: publications, grants, breakthroughs
          │        │                             │
          │        ├──▶ academic satisfaction    ├──▶ grants ──▶ money ─┘
          │        │                             │
          │        │                    at conclusion: payoff, and
          │        │                    a major award if a breakthrough landed
          │        │                             │
          │        └──▶ curriculum breadth × quality ──┬── prestige
          │                                            │
          │                              research score ┘
          │                                            │
          └───── tuition ◀── enrollment ◀── applicants ◀┘
```

Four things make this a loop rather than a diagram:

1. **Faculty time is the shared scarce resource.** A person teaching four courses
   and a person five years into a Landmark Program are the same person. Every
   hire is an allocation.
2. **Labs are the throttle on scholarship**, the way money is the throttle on
   everything else. Concurrency is bought with buildings.
3. **Expansion and quality compete for the same prestige term**, because breadth
   is multiplied by quality.
4. **Breadth pays off twice.** Building many schools is what makes
   cross-disciplinary topics — and therefore Landmark Programs, and therefore
   awards — reachable at all. The most prestigious outcome in the game is gated
   on having built a genuine *university* rather than a good department.

None of those decisions exist in the game today.

---

## 6. Proposed PR sequence

Ordered so each step ships independently, and so nothing is designed against
information that doesn't exist yet.

| PR | What | Why here |
|---|---|---|
| **A** | **Full-bleed tab shell.** `fullBleed` mode on `TabOverlay`; Curriculum adopts it, toolbar overlaid. No content changes. | Small, already validated by the constellation experiment, and it is the container everything else renders into. Ship it alone. |
| **B** | **Course→faculty assignment as real state.** `courseFaculty` record; `START_DEVELOPMENT` takes a `facultyId`; `REASSIGN_COURSE_FACULTY`; faculty-picker UI **in the existing curriculum tab**; dismissal leaves courses unstaffed; round-robin becomes the legacy fallback; save migration + harness extension. | The keystone. Deliberately lands in the *old* layout so the interaction is proven before any new rendering work depends on it. |
| **C** | **Course quality grades.** `data/courseQuality.ts`, grade chips on cards, aggregation to major/school, drawer breakdown. Wire into `satisfactionSystem`'s academic term and `prestigeSystem`'s breadth multiplier. Sim pass on the compounding risk. | Needs B. Gives D something to display. |
| **D** | **The Curriculum Map.** Three-level zoomable canvas over the same `DiscoverySection[]`, lane layout, tier hierarchy, on-demand bridges, badge navigation, filters and search, side drawer. | The big one, and now the only one that is purely a rendering change — every fact it displays already exists. |
| **E** | **Research infrastructure for the four schools that have none** (data); publications as a fourth output; discipline-specific output naming; player-facing terminology. | Independent of A–D; could run in parallel. Now a **prerequisite** for F rather than a nicety: no lab means no slot, so without this, F ships a system four schools cannot touch at all. |
| **F1** | **Initiatives — engine.** `data/researchTopics.ts` (the authoring job), the `Initiative` object keyed by labId, the tick that runs a project and fires its during-run events, conclusion payoff, the award roll, prize trigger moved out of `RESEARCH_OUTPUTS`. Migration for the retired points stock. | Needs E to be worth doing outside STEM. The faculty-commitment rule needs B's assignment record to mean anything. |
| **F2** | **The Research tab.** Full-bleed; one horizontal panel per facility; the start-research offer set; participant assignment with inline hiring; the results history strip. | Split from F1 so the engine can be balanced against `npm run sim` before a screen is built on top of it. |

**The ordering argument, since it inverts the brief:** building the map first
(D before B and C) would mean designing course cards and a school-level overview
around information that does not exist — which is very close to how the
constellation ended up optimizing layout for its own sake. Let the data land
first; then the map has something to be a map *of*.

---

## 7. Decisions needed before implementation

Flagged rather than silently chosen, per the README's working-style note.

1. **Absolute or curved grading?** (Recommend absolute, generous low bands.)
   Decides whether the first hour reads as "we are new" or "we are failing".
2. **How hard is the teaching/scholarship constraint?** A faculty member
   committed to a 3-year Major Program: do their `courseSlots` drop (hard — they
   stop teaching), do their courses take a quality penalty (soft — they teach
   worse while distracted), or is the only cost that they're unavailable for
   other initiatives (loose)? Decides whether research feels like a sacrifice or
   a free upgrade for anyone idle.
3. **Does course reassignment cost anything?** (Recommend free and immediate to
   start, add friction only if it proves exploitable.)
4. **Does the prestige faculty-quality input split into teaching and research?**
   Probably yes eventually, but a tuning pass after both loops exist.
5. **Full `research` → `scholarship` code rename, or player-facing only?**
   (Recommend player-facing only; defer the code rename to its own terminology
   pass with a migration.)
6. **Grade bands vs. `QUALITY_TIER_THRESHOLDS`.** Related but should not be
   identical; needs one explicit decision so the two ladders do not drift.
7. **Does the aggregate research-points stock survive?** (Recommend retiring it
   as a driver — idle labs produce nothing; the way to produce is to start
   something.) The alternative is a small passive trickle from lab-equipped
   faculty not on an initiative.
8. **Can an initiative be cancelled, and at what cost?** A 5-year commitment with
   no exit is a trap the first time a player misjudges it; a free exit makes the
   commitment meaningless. (Lean: cancellable, forfeiting the up-front funding
   and banking nothing.)
9. **How many topics for a first pass?** The full ~150 is a large authoring job.
   A first version could ship 2 per field plus ~15 cross-disciplinary (~70) and
   grow, accepting that offers repeat more often early on.

---

## 8. What this plan deliberately does not do

- **No new Buildable kind, and no fork of the Buildable model.** Assignment is a
  side record keyed by id, exactly as placement is; an initiative is a side
  record keyed by the lab's id.
- **No second population, no per-school research ledger.** The monotone output
  counts stay aggregate on `ResearchState`; what becomes per-place is the
  *initiative*, which is a slot, not a ledger.
- **No prestige written directly by anything.** Every new input — course quality,
  initiative payoffs, awards — reaches reputation through a clamped term in
  `prestigeSystem.ts`'s target, or it does not reach it at all.
- **No systems calling systems.** Everything new is a pure `(state) => void` tick
  registered in `SYSTEMS`, or a pure function in `data/`.
- **No second pacing model.** Initiative funding is charged up front at the
  moment of commitment, exactly as every Buildable cost is.
- **No constellation.** The layout metaphor is retired; the full-bleed shell it
  proved is kept.
