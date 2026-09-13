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

## 4. Scholarship — keeping the dice, moving the hand

### What is right today, and must survive

`researchSystem.ts` is well-built and the plan should be additive to it, not a
rewrite. Specifically worth preserving:

- Outputs never write `s.self.reputation` — a breakthrough increments a count
  that `prestigeSystem.ts`'s `researchScore` reads as one clamped input among
  seven. That invariant is load-bearing and must hold through this work.
- The two-dial cadence (weekly chance rising with the banked stock, floored by a
  cooldown) shared with the decision-event table.
- The prize being *queued* rather than fired, so it can't be eaten by a week
  that already owns an interrupt.

### The reframe

Today the whole system is production → stock → dice. The brief's ask is that the
dice stay but stop being the entire system. The cleanest way to get there is to
change **which end** the player touches:

> **Initiatives are the production side. The existing output machinery is the
> resolution side, unchanged.**

That is the low-risk shape, and it is the same discipline the graduate-programs
feature used: one new loop, reusing everything underneath, no parallel subsystem.
Initiatives feed `s.research.points`; `rollResearchOutput` keeps doing exactly
what it does now. The randomness the brief wants to keep is kept *entirely
intact* — what changes is that the player now decides how much enters the hopper,
from whom, and in what area.

### The initiative

```ts
interface Initiative {
  id: string;
  name: string;          // authored per area, e.g. "Study of Urban Migration"
  area: string;          // a school, or a faculty field
  participantIds: string[];
  fundingPerWeek: number;
  weeksRemaining: number;
  weeksTotal: number;
  progress: number;      // banked points, resolved at completion
}
```

The player picks an area, picks participants, sets a funding level, commits.
Weekly output into the stock is driven by:

- **Participants' `research` stats** (and `acclaim`) — the primary term;
- **Funding level** — money converts to output, with diminishing returns, so
  cash is a lever but not a bypass;
- **Infrastructure** — the existing `researchRateBonus` multiplier, live-read off
  finished Buildables, applies here unchanged;
- **Interdisciplinarity** — a bonus when participants come from different
  fields. This is the mechanic that makes a big university *feel* like one, and
  it is the reason to build breadth rather than depth in one place. Worth
  treating as a headline feature rather than a modifier.

**The keystone constraint: a faculty member's time is finite across both loops.**
A person in an initiative has less capacity for courses; a person carrying a full
course load contributes less to an initiative. Whether that is a hard slot
(`courseSlots` reduced while committed) or a soft penalty on both sides is a
tuning question, but the *tension* is the single most valuable mechanic in this
entire plan. It is what makes each hire an allocation decision instead of a
number that goes up, and it is what finally couples the teaching loop and the
research loop into one economy rather than two that happen to share a roster.
Everything else here is refinement; this is the part worth getting right.

### Making it work outside STEM

The blocker is structural, not thematic: `researchData.ts` gates production on
`labEquippedFields`, and four schools — Business, Arts & Media, Social Sciences
& Humanities, Computer Science — have no lab-gated major, so a run concentrated
in any of them produces literally nothing. The README already names this as the
open tension and correctly identifies it as a content question.

Two moves, in order:

1. **Generalize "lab" to research infrastructure.** Mechanically identical
   Buildables; different names, art, and homes. A humanities research institute
   and archive; a behavioural lab and trading floor for Business; studios and a
   performance space for Arts & Media. This is overwhelmingly a `data/` change —
   `facilitiesData.ts` plus widening `LAB_GATED_MAJOR_PREFIXES` — and it follows
   the graduate-programs rule exactly: **no bespoke per-school system**, only
   authored data over shared machinery. It also unblocks the research doctorates
   those four schools cannot currently have, for the same reason.
2. **Discipline-specific output names over identical mechanics.** The same draw,
   relabelled by the initiative's area: a breakthrough is a *monograph* in
   humanities, a *study* in social science, an *exhibition* in the arts, a
   *case study* in business. Purely authored strings — the prestige input,
   the cost, the weight are all one shared table.

And one genuinely new output: **publications** — cheap, frequent, low-value.
The existing three all cost enough that early research is long silence followed
by a grant. A cheap fourth rung gives a young department something to show, gives
humanities an output that reads right at any scale, and makes the stock's growth
legible from week one.

Whether the concept is *renamed* Scholarship throughout (with a save migration,
the way the README's terminology pass handled `major-complete:`) or stays
`research` in code with Scholarship as the player-facing word, is a call worth
making deliberately. **Recommendation: player-facing rename only, at first.** The
code churn of a full rename buys nothing mechanical, and the roadmap has a
precedent for deferring terminology to its own pass.

### Later, explicitly not now

Research centers as placeable Buildables that host initiatives; competitive grant
*applications* (an initiative that targets a named funder); multi-university
collaborations; publication records per faculty member. All of these are natural
growths from the initiative object. None should be in its first version.

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
          │   assigned to courses          joined to initiatives
          │        │                             │
          │   course grades (A–F)          scholarship output
          │        │                             │
          │        ├──▶ academic satisfaction    ├──▶ grants ──▶ money ─┘
          │        │                             │
          │        └──▶ curriculum breadth × quality ──┬── prestige
          │                                            │
          │        publications/breakthroughs/prizes ──┘
          │                                            │
          └───── tuition ◀── enrollment ◀── applicants ◀┘
```

The two things that make it a loop rather than a diagram:

1. **Faculty time is the shared scarce resource.** Teaching and scholarship
   compete for the same people. Every hire is an allocation.
2. **Expansion and quality compete for the same prestige term.** Breadth is
   multiplied by quality, so a wide weak curriculum and a narrow strong one both
   fall short, and the player must decide which way to lean this decade.

Neither of those decisions exists in the game today. Both come from this plan.

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
| **E** | **Scholarship groundwork.** Research infrastructure for the four schools that have none (data); publications as a fourth output; discipline-specific output naming; player-facing terminology. | Independent of A–D; could run in parallel. Fixes a known gap on its own even if F slips. |
| **F** | **Research initiatives.** The initiative object, the tick that produces into the existing stock, the faculty-time constraint, the UI. | Needs E to be worth doing outside STEM. The faculty-time constraint needs B's assignment record to be meaningful. |

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
2. **How hard is the faculty-time constraint?** Hard slot reduction while on an
   initiative, or a soft penalty to both sides? Decides whether research feels
   like a commitment or a dial.
3. **Does reassignment cost anything?** (Recommend free and immediate to start,
   add friction only if it proves exploitable.)
4. **Does the prestige faculty-quality input split into teaching and research?**
   Probably yes eventually, but it should be a tuning pass after both loops
   exist, not a prerequisite for either.
5. **Full `research` → `scholarship` code rename, or player-facing only?**
   (Recommend player-facing only; defer the code rename to a terminology pass
   with its own migration, as PR C of the alignment roadmap did.)
6. **Grade bands vs. `QUALITY_TIER_THRESHOLDS`.** Related but should not be
   identical; needs one explicit decision so the two ladders do not drift.

---

## 8. What this plan deliberately does not do

- **No new Buildable kind, and no fork of the Buildable model.** Assignment is a
  side record keyed by id, exactly as placement is.
- **No second population, no per-school research ledger.** The aggregate
  `s.research.points` stock stays aggregate; the "only equipped schools produce"
  rule stays a property of the production function, not of where the total is
  kept.
- **No prestige written directly by anything.** Every new input reaches
  reputation through a clamped term in `prestigeSystem.ts`'s target, or it does
  not reach it at all.
- **No systems calling systems.** Everything new is a pure `(state) => void`
  tick registered in `SYSTEMS`, or a pure function in `data/`.
- **No constellation.** The layout metaphor is retired; the full-bleed shell it
  proved is kept.
