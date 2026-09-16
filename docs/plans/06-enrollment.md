# Plan 06 — Enrollment

*Planning document only — no gameplay code is changed by this file. Its job is
to take `BACKLOG.md`'s "Admissions and History" entry — a feature named as an
infographic and a possible tab merge — and turn it into an ordered sequence of
PRs, each one small enough to land on its own and each one landing in the order
that makes the next one cheaper.*

**Status: Landed.** All five, A through E — as five commits of one pull
request rather than five pull requests, which is the one departure from this
plan's own premise and was the repository owner's call. The sequence is
otherwise exactly as written, each commit landing on its own and in this
order. Each one's departures are noted in the PR that departed; there are
eight, and they are the most useful thing in this document. The enrolled body's cohort mix
becomes stored state carried by each class from admission to graduation; the
Admissions tab becomes Enrollment and grows the infographic that mix makes
possible; History is not touched. The backlog's merge option is **declined**,
and section 0 argues why.

**Written against PR 98**, which split the README into `docs/design/` and
`docs/architecture/` and has since landed (`7dc084b`). Every documentation
reference below names a post-98 file, and each was checked to resolve against
`main` after that merge. The split did not change this plan's model or its
sequence — only which files each PR has to keep true, and, by way of
`docs/architecture/README.md`'s rule about keeping the spec honest, when each
PR has to do it (section 0's third finding).

---

## 0. The shape of the feature, and why the order is what it is

The backlog entry names three things: the student body has classes *and*
cohorts and only the first is displayed; an infographic of who actually attends
is the feature; and folding Admissions into History is plausible because
Admissions has no gameplay in it. Sorted by what they touch, that is **one
model change, one screen, and one question about the tab bar** — and the third
answers itself once the first two are looked at.

**The finding that sets the order: the mix cannot be reconstructed.** The
backlog frames storing-versus-reconstructing as the real decision this feature
has to make. It is, and it is not close. Every cohort's pull in `cohorts.ts` is
a pure function of *current* `GameState` — labs standing now, teams active now,
programs established now. Recomputing a senior class's mix today therefore
applies today's campus to a class admitted four years ago. That is not merely
lossy; it is retroactive. Build an arts centre in year 8 and the year-5 seniors
become arts-focused in hindsight, and the one thing the display exists to show
— that the four classes are four different schools stacked on top of each other
— is exactly the thing reconstruction destroys. The seniors are a fossil of the
school you were; the freshmen are the school you are. There is no version of
this feature that does not store the split at admission.

So the model change is PR A and everything else is downstream of it, for the
reason Plan 05 gave in the other direction: an hour spent laying out a panel
against a mix that is about to change where it comes from is an hour spent
twice.

**The second finding: the merge is declined.** Counting real game actions per
tab — dispatches, not disclosure toggles — the game has already settled the
question the backlog raises:

| Tab | Lines | Game actions |
|---|---:|---:|
| Curriculum | 1372 | many |
| Faculty | 459 | a few |
| Research | 407 | several |
| Athletics | 166 | several |
| Treasury | 201 | **1** (`LAUNCH_ENDOWMENT_CAMPAIGN`) |
| Student Life | 485 | **0** (its one `onClick` is a disclosure toggle) |
| History | 190 | **0** |
| Admissions | 32 | **0** |

Student Life is 485 lines with no decision in it at all. Treasury is an income
statement with one button on the end, and `TreasuryTab.tsx`'s own header states
the charter plainly: it is "where the economy explains itself". The bar this
game sets for a tab is not a button; `TabNav.tsx` states it as "a tab whose
screen says something useful from the first week".

**Admissions fails that bar, and the backlog misdiagnoses why.** It is not that
the tab lacks gameplay — three tabs do. It is that six raw numbers with no
context teach nothing: "Admit rate 36%" does not say whether that is good, what
moved it, or what to do next. Treasury solves the identical problem by hanging
a `note` on every line explaining what drives the figure. Adding a decision to
Admissions would not fix this; explaining the enrolment picture would.

And the merge does not fix it either, because the two tabs barely overlap.
History charts prestige, operating funds, catalogue and enrolment, and tables
rank, courses, programs and satisfaction — the whole institution over time. The
infographic is the student body's composition. **The overlap is exactly one
column: enrolment.** A merge would produce a tab whose two halves share one
number, justified mainly by the fact that one of them is currently too short,
at the cost of disturbing a tab that already works.

The naming difficulty is the corroborating evidence. "History" buries the
infographic; "Enrollment" mislabels the cash and prestige charts; anything
broad enough to cover both — "The University", "Institutional Record" — is
broad enough to mean nothing. A combined tab has no good name because it has no
single subject. The backlog's own line settles it: *"which tab it lives in is a
consequence of building it."* Having looked at both, the consequence is
Admissions.

**The third finding, from PR 98: documentation is not a trailing PR.**
`docs/architecture/README.md` states the rule outright — "These documents are
the spec, and source comments cite them by name, so they have to stay true.
When a change makes one of them wrong, fix the document in the same PR."

That is a real constraint on this sequence, not a formality, because PR A makes
a documented claim false the moment it lands. `docs/design/admissions.md` says
it twice: "Nothing about a cohort is stored — its pull is a pure function of
state, recomputed wherever it is needed", and, of a cohort, "it cuts across all
four classes, and nothing stores it". Storing the enrolled split contradicts
both, and a spec that is wrong between PR A and PR E is a spec that 89 source
comments are citing.

So the trailing documentation PR this plan would otherwise have ended with is
**dissolved into the PRs that earn it**. Each PR below carries the documents it
falsifies. What survives as a final PR is only the thing no earlier PR makes
wrong: closing the backlog entry, which is not a spec claim going stale but a
piece of forward-looking work becoming past.

### The map

| Note | Touches | PR |
|---|---|---|
| The enrolled cohort split, stored per class and carried to graduation | `types.ts`, `cohorts.ts`, `admissionsSystem.ts`, `reducer.ts`, `consequences.ts`, `persistence.ts`, `docs/design/admissions.md` | A |
| Admissions becomes Enrollment | `TabNav.tsx`, `AdmissionsTab.tsx` → `EnrollmentTab.tsx`, `App.tsx`, `tab-gates.test.ts`, `docs/architecture/ui-shell.md` | B |
| The standing body, four classes by seven cohorts | `EnrollmentTab.tsx`, `styles.css`, `docs/design/admissions.md` | C |
| The funnel, in context | `EnrollmentTab.tsx` | D |
| The backlog entry closes | `BACKLOG.md`, `docs/plans/README.md` | E |

A is invisible to the player and lands behind the existing screen. B is a
rename with no content change. C and D are the screen.

---

## Open questions, settled before the first PR

**1. Where does the enrolled split live?** `finance.tuitionByClass` is the
pattern and Plan 05 established it deliberately: a fact that belongs to a class
rather than to the school, keyed the same four ways, advanced in lockstep in
the same `RESOLVE_ADMISSIONS` block. **Proposed: `students.cohortsByClass`**,
in `students` rather than `finance` because it counts people, not dollars —
the same reason `ClassTuition` is its own interface rather than a reuse of
`ClassCounts`.

**2. Does this force `types.ts` to import from `systems/`?** It would, and that
is worth stopping on: `types.ts` has **no imports at all** today, and opens by
declaring itself authoritative — "if a concept exists in the game, its shape
lives here". `CohortId` is currently declared in `cohorts.ts` and used nowhere
else in `src/`. **Proposed: move `CohortId` into `types.ts`** and have
`cohorts.ts` import it, leaving the `COHORTS` table and every pull curve
exactly where they are. This is a one-line move that makes the file match its
own charter — `types.ts` already spends twelve lines (54–66) explaining what a
cohort is and how it differs from a class, while not owning the type. The
alternative, `types.ts` reaching into `systems/`, spends the file's only
invariant to avoid a move it already argues for.

**3. Who computes the split — the funnel or the reducer?** The reducer could:
`priceTolerance` is exported and `cohortBreakdown` is pure. But `consequences.ts`
projects the same commit on a copy for the live panel, and two call sites
computing a split independently is how a projection starts promising a body the
tick does not produce — the hazard `advanceClasses` was extracted to avoid in
Plan 05's PR D, in this exact block. **Proposed: `AdmissionsProjection` grows an
`enrolledCohorts` field**, computed once inside `projectAdmissions`, which
already has `tolerance`, `cohortSignals` and `enrolled` in hand. One number,
one origin.

Note it must be apportioned over `enrolled`, not `applicants`. That is exact
rather than an approximation, and `cohorts.ts` already carries the argument:
quality band and cohort are independent dimensions in this model — sticker
shock scales bands, never cohorts — so the split is the same before and after
the funnel's attrition. No new math, and `cohorts.test.ts`'s existing
largest-remainder sum invariant covers it unchanged.

**4. Does `advanceClasses` grow a third positional record?** It takes four
positional arguments today and would take six, two of which are parallel
per-class records and a third of which is about to join them. **Proposed:
regroup to `advanceClasses(body, incoming)`** — `{ classes, tuitionByClass,
cohortsByClass }` and `{ count, price, cohorts }` — keeping the existing
`AdvancedBody` return and its `graduating`. Three call sites move
(`reducer.ts`, `consequences.ts`, `class-pricing.test.ts`) and the change is
mechanical, but it happens once here rather than every time a per-class fact is
added.

**5. What does a founding body get, and what does an existing save get?** These
turn out to be the same question with the same answer, which is the argument
for it. A school opens with **all four classes already populated** (`actions.ts`
via `FOUNDING_CLASSES` — 88/88/87/87, a balanced body so there is a graduating
class from year one). Not one of those four was admitted by the player, so
there is no split to record: the honest reading is that nobody chose them. A
v39 save is in exactly that position for up to four in-game years.

**Proposed: both get each class apportioned by `baseShare`** — the model's own
statement of what a pool looks like absent any signal, run through the same
largest-remainder `apportion` so the seven are whole students that sum to the
class. Stated plainly in the v40 migration comment and in the founding comment:
this is a neutral prior, not a reconstruction, and the tab must not imply
otherwise.

The alternative — a nullable split, with the tab showing "not recorded" for
classes it cannot know — is more honest and was considered. It is rejected
because it makes every reader handle a null for at most four in-game years,
after which the branch is unreachable forever, and because the prior is not a
guess about a class the player admitted: it is the true statement that the
founding body arrived before the player had built anything for a cohort to
respond to.

There is a payoff worth naming. In year 1 all four bars read identically, and
each summer one more is replaced by a class the player actually admitted. By
year 5 the founding prior has graduated out entirely and every bar is the
player's own doing. **The infographic fills itself in with four years of the
player's decisions**, which is most of the answer to whether an informational
panel is worth returning to.

**6. Why "Enrollment" and not "Students"?** `TabNav.tsx` already has **Student
Life**. "Students" and "Student Life" adjacent in an eight-item nav is a
misread waiting to happen. "Enrollment" is distinct, covers the applicant pool,
admit rate and incoming quality as well as the standing body, and matches the
plain-noun register of Curriculum / Faculty / Research / Treasury.

---

## PR 06A — The cohort split follows the class that was admitted

**The change.** `students.cohortsByClass: Record<keyof ClassCounts,
CohortCounts>`, where `CohortCounts` is `Record<CohortId, number>` and
`CohortId` moves to `types.ts` (open question 2).

- `projectAdmissions` returns `enrolledCohorts`, apportioned over `enrolled`
  (open question 3).
- `advanceClasses` regroups to `(body, incoming)` and shifts the split in the
  same statements that shift the counts and the prices; the graduating seniors
  take theirs with them (open question 4).
- `RESOLVE_ADMISSIONS` and `consequences.ts` pass it through. Neither gains a
  second opinion about the mix.
- `SAVE_VERSION` 39 → 40, filling `cohortsByClass` by `baseShare` (open
  question 5). A pure fill-in in the shape of v13 → v14's `pathways` slice:
  nothing existing moves, is renamed, or is retired.

**The documents this falsifies, fixed here.**
`docs/design/admissions.md`'s "Admissions cohorts" section ends "Nothing about
a cohort is stored — its pull is a pure function of state, recomputed wherever
it is needed." Half of that stays true and the half that does not is the
interesting half: **the pull is still derived; the enrolled split is now a
record.** The section has to draw a line it has never needed to draw.

"Class, cohort, course" needs the sharper edit. It currently reads that a
cohort "cuts across all four classes, and nothing stores it" — and that
crossing is exactly what PR A turns into the stored thing. A class is still a
year group and a cohort is still a kind of applicant; what is new is that their
**intersection** is recorded at admission, once, and never recomputed. The
three-way distinction the section exists to protect survives intact, which is
worth saying, because a reader meeting `cohortsByClass` for the first time will
reasonably wonder whether it has been broken.

`docs/architecture/game-state.md` needs nothing. It documents `GameState` at the
slice level rather than field by field, its migration prose deliberately stops
at v12 and names the `MIGRATIONS` table as canonical, and 28 numbers do not
move its ~165 KiB budget. `cohortsByClass` is plain data — no `Map`, no `Set`,
no cross-slice reference — so the JSON-round-trip rule that keeps that module
ten lines long holds without comment.

**Invisible to the player.** Nothing reads `cohortsByClass` until PR C. This is
deliberate and is the same posture Plan 05's A and B took: the model lands
behind the existing screen, and the screen is drawn against a model that has
stopped moving.

**Verification:** a new `test/enrolled-cohorts.test.ts` carrying the invariants
that (1) each class's seven counts sum exactly to that class's head count, at
founding, after migration, and after any number of advances; (2) a split
advances with its class and the senior split is dropped on graduation; (3) the
split written at admission is unchanged by later `GameState` changes that would
move `deriveCohortSignals` — the retroactivity guard, which is the whole reason
this is stored rather than derived. `save-migrations.test.ts` gains a v39 → v40
case, which `docs/architecture/README.md` requires of any change to save shape;
`invariants.test.ts`'s existing `baseShare` sum check is what makes the
migration's prior well-formed and needs nothing new.

**`npm run sim` is not needed here, and the reason should be in the PR
summary.** `docs/architecture/README.md` asks for a 40-year balance run
whenever a change moves a number the economy depends on. This does not.
`cohortDemandFactor`, `applicantVolume`, the quality bands and sticker shock
are untouched, and `enrolledCohorts` is a decomposition of an `enrolled` figure
the funnel has already produced — every input to the economy is the same number
it was. Say so explicitly rather than leaving a reviewer to wonder whether the
run was skipped or forgotten.

Note also that `npm test` chains with `&&`, so an early failure silently skips
the later suites: read the tail of the output, not the exit line.

**As implemented: two departures, both making A smaller than predicted.**

The map above lists `class-pricing.test.ts` as a caller of `advanceClasses`
that would have to move with its new signature. It is not one: it drives the
real reducer rather than the pure function (its own header says so — "these
checks drive the real reducer... because the invariant is about WHEN a price
is applied"), so the regroup touched two call sites, not three. Worth knowing
for the next per-class fact, because the reason generalises: the suites that
care about the annual boundary go through `RESOLVE_ADMISSIONS`, so changing
the boundary's internals moves fewer tests than it looks like it will.

Related, and worth writing down because it is a gap rather than a saving:
**`npm run build` does not typecheck `test/`.** `tsconfig.app.json` includes
`src` only, and the suites are bundled by rolldown, which strips types without
checking them. A test calling a changed signature fails at runtime if the
change is observable and passes silently if it is not. The type system caught
every `src` call site here; it would not have caught a test.

`consequences.ts` needed an incoming cohort split it has no use for. The
projection measures money, satisfaction and coverage, all of which read head
counts — so it is passed the neutral prior with a comment saying nothing
downstream reads it, rather than re-deriving the funnel's own split for a
number nobody looks at.

## PR 06B — Admissions becomes Enrollment

**Last cheap moment to do this.** The file is 32 lines now and about 250 after
C and D. Renaming during the content PR means a diff that is a rename and a
rewrite at once, and neither is readable.

`TabId`'s `'admissions'` → `'enrollment'`, the `TABS` label to "Enrollment",
`AdmissionsTab.tsx` → `EnrollmentTab.tsx`, and `App.tsx`'s switch. The tab
stays ungated — it says something useful from the first week, which is the
condition `TabNav.tsx` sets, and the standing body exists from week one even
though no history does.

`docs/architecture/ui-shell.md` names the eight tabs in its opening paragraph
and describes the three gates below it. The first list gains Enrollment in
place of Admissions; the gates paragraph is untouched, because none of the
three gated tabs moves and Enrollment stays ungated. The new `README.md` no
longer lists tabs at all — PR 98 cut it to 934 words and left the shell's
detail in `ui-shell.md` — so that is the only place the name appears.

Nothing about the tab's *contents* changes in this PR.

**Verification:** `tab-gates.test.ts` compiles and passes unchanged — it names
`history`, `research` and `athletics`, none of which move. The type change is
what catches every call site; if it builds, the rename is complete.

**As implemented: the type change found a call site the plan had not named.**
`Toolbar.tsx` keys an icon map by `TabId`, so renaming the id broke it —
`AdmissionsIcon` became `EnrollmentIcon` with it. The plan's claim that "if it
builds, the rename is complete" held, and this is the case that proves it was
worth relying on: a grep for the tab component alone would have missed it.

In the other direction, `tab-gates.test.ts` needed no change at all, exactly
as predicted — it names only the three gated tabs, none of which moved. The
map above lists it anyway; it should not have.

B also missed two prose references to the old name, swept in E once the
whole tree was searched rather than the files the map named:
`docs/architecture/systems.md`'s `src/tabs/` list, and `TreasuryTab.tsx`'s
note that its class order matches "the Admissions tab" — which by then was
wrong twice over, since the renamed tab stacks the classes rather than
listing them. The lesson for the map is that a rename's blast radius is
every mention of the word, not every file that imports the symbol.

## PR 06C — The standing body

The centrepiece, and the reason PR A exists.

Four classes, seven cohorts, as **stacked horizontal bars — one per class,
sharing one legend** — so the shape of one class is read against the shape of
the ones above and below it. That comparison is the entire content: a bar that
differs from the bar under it is a year the school changed what it attracted.

- **Reuse the reveal's vocabulary where it fits.** `InterruptModal`'s cohort
  cards (name small at the top, count big in the middle, driver on hover) are
  the established way this game draws a cohort, and the hover-tooltip rule —
  what a cohort responds to explains the number rather than being the number —
  carries over intact.
- **Class order is a judgement to make in the browser**, not on paper. Treasury's
  `CLASS_ORDER` is youngest-first and its comment notes that Admissions and
  `reducer.ts` agree, which argues for consistency; the fossil-record reading
  argues for seniors at the top, so the strata sit in the order they were laid
  down. Decide it against the rendered screen, as Plan 05's PR F decided the
  reveal's stagger.
- **Seven categorical colours is the real design risk**, and it should be
  stated before it is discovered. `HistoryTab.tsx` deliberately uses no
  charting library and no palette beyond parchment and gold — plain SVG
  polylines, one line, a baseline, two end labels. Seven distinguishable hues
  that do not fight that is genuinely new for this game's visual language. If
  it cannot be done without looking like a different game's UI, the fallback is
  a small-multiple of seven per-cohort rows, each a four-segment bar by class,
  which needs no categorical palette at all — one hue, four tints.

**The founding prior must read as what it is.** Four identical bars in year 1
is the truth, not a bug, but it will look like one. A line under the panel
naming the founding body — and, on a migrated save, saying the same of classes
admitted before the record was kept — is what keeps it honest.

**The document this falsifies.** `docs/design/admissions.md`'s cohorts section
describes exactly one place cohorts are drawn — the summer reveal's seven cards
— and says what they are: "how many of this year's applicants each cohort is
worth". After this PR there are two, and they show different things: the reveal
is one year's *applicants*, the tab is four years of *enrolled* students. That
is the distinction `BACKLOG.md` opened this whole entry by drawing, so the
section should draw it too rather than leaving two cohort displays that look
alike and are not.

"Students: four aggregate classes" gains the standing mix beside the four
counts, and the founding-mix bullet — already there, already naming
`FOUNDING_CLASSES` and 88/88/87/87 — is where the neutral prior belongs, since
it is the same fact seen from the other side.

**Verification:** by eye for the layout; the PR A sum invariant is what keeps
the bars honest against the class totals they segment.

**As implemented: the plan flagged the wrong judgement call, and the colour
risk did not materialise.**

The plan reserved one decision for the browser — class order — and it turned
out not to be a toss-up: youngest-first satisfies both readings at once, since
it is the order Treasury and the reducer already use AND it puts the newest
class on top with the oldest at the bottom, which is the strata reading. It
was decided in ten seconds.

**The decision that actually mattered was one the plan never considered: bar
length.** Rendered as normalised full-width rows — the obvious way to draw a
stacked composition — the four bars were near-indistinguishable. Class sizes
vary by half again across four years (78 to 131 in the run used for this), and
normalising throws exactly that away, leaving four identical-length bars whose
mixes differ by a few percent. Scaling length to class size against the largest
class fixed it: length carries the size, segments carry the mix, and a school
that has been shrinking its intake now shows it at a glance. This is the
finding that justifies "by eye" being a real verification step rather than a
formality — no test would have failed.

**The seven-colour fallback was not needed.** The plan kept one hue and four
tints in reserve in case a categorical palette fought the parchment. Choosing
pigments rather than hues — brass, ink-blue, moss, oxblood, terracotta, plum,
ochre, the range a printed almanac of this era could be tinted in — sits on
parchment without looking like a chart pasted in from a different game.

**Marking the unsignalled classes needed a different claim than the plan
made.** The plan said "a line under the panel naming the founding body". The
panel cannot name it: which classes are priors is not stored, and deriving it
from the clock lies for a migrated save (a v39 run at year 20 has four priors
and a clock that says none). What IS derivable is the thing itself — a class
whose split is exactly the base shares carries no pull from anything built —
and three situations produce that: founding, migration, and a school that
genuinely built nothing. So the label says **"no cohort signal"**, which is
true of all three, instead of guessing between them. Marked per class with a
dagger rather than as one line, since by year 3 only some classes are.

## PR 06D — The funnel, in context

What the six numbers become, now that they are not the whole tab.

`AdmissionsTab`'s `<dl>` — enrolled, classes, satisfaction, applicant pool,
admit rate, incoming quality — is the thing section 0 identified as failing
`TabNav.tsx`'s bar. **Treasury's `StatementLine` is the fix and the precedent**:
every figure carries a `note` saying what drives it, so the panel teaches the
funnel rather than reporting it.

Two of the six already have their explanation written and unplaced. The word-of-
mouth note is on the tab today; `WORD_OF_MOUTH_STRENGTH`, `priceTolerance` and
`admitRate(prestige)` carry the rest in their own comments. This is mostly a
matter of moving what `admissionsSystem.ts` already says to where the player
reads the number.

The classes line goes away here rather than in C — "88 Fr · 88 So · 87 Jr · 87
Sr" is the infographic's axis labels, restated as a sentence.

**Documentation: check, do not assume.** This PR displays the funnel rather
than changing it, so `docs/design/admissions.md`'s "Admissions: an annual
summer decision" should come through untouched. Read it against the shipped
panel anyway — it is the section the panel is now a second rendering of, and
Plan 05's PR G is the precedent for what that reading catches.

**Verification:** by eye. No new state and no new math; every figure on this
panel is one `s.students` field or one call the tab already makes.

**As implemented: reading the spec against the panel caught one of my own
claims, and one tension worth naming.** The applicant-pool note said sticker
shock "takes its cut off the top", which describes the wrong mechanism — it is
the band-specific half of the price response and hits the bands unevenly,
which is the entire reason it is about *who* applies rather than how many.
Corrected before landing. This is the check Plan 05's PR G established, doing
the same job again.

The tension: `docs/design/admissions.md` says word of mouth is **deliberately
not shown**, on the argument that a player told "+12% applicants" reads a
number instead of learning the rule. Two notes on this panel name word of
mouth as a force without quantifying it, and the tab already carried that
sentence before this plan. Read here as a prohibition on a *readout* rather
than on the causal explanation — flagged rather than silently resolved, per
`docs/architecture/README.md`, because it is a judgement someone may want to
take the other way.

## PR 06E — The backlog entry closes

What is left once the documents have been kept true along the way (section 0's
third finding): the forward-looking document catching up with the fact that the
work happened.

- `BACKLOG.md`'s "Admissions and History" entry is removed. `docs/README.md`
  states the discipline this serves — "Nothing belongs in two places at once:
  when a plan lands, what it changed goes into `design/` or `architecture/`,
  and the plan is left alone as the record of what was believed at the time."
  By this point the design docs already hold it, so the entry is the only copy
  left in the wrong tense.
- **The declined merge does not vanish with it.** The entry proposed folding
  Admissions into History; a reader who later wonders why the tabs are still
  separate needs somewhere to land. That is section 0 above, and it is why the
  argument was written into the plan rather than into a PR description.
- `docs/plans/README.md`'s table moves this plan's row to `Landed`. The row
  itself goes in when this document does, not here: a plan reading `Proposed`
  belongs in the index from the day it is written — the exception Plan 05 wrote
  into that file, and the first plan to use it.

**Verification:** the design and architecture docs read end to end against the
shipped tab. Each earlier PR has already fixed what it falsified, so this is
the pass that catches what none of them noticed — the job Plan 05's PR G did
when it found two claims that had quietly stopped being true and that no test
could have caught.

---

## What this plan does not do

- **History is not touched.** No merge, no new chart, no cohort series in the
  year-by-year table. A cohort series would want a mix per *year* rather than
  per class, which is a different record from the one PR A stores, and there is
  no reason to guess at it before the standing-body panel has been looked at.
- **`docs/architecture/game-state.md` is not rewritten.** PR A adds a state
  field and a migration, and that document takes neither: it is written at the
  slice level, and its migration narrative stops at v12 on purpose, naming the
  `MIGRATIONS` table as the canonical record. The v40 entry documents itself
  there, as every migration since v12 has.
- **`YearSnapshot` does not change.** It is deliberately numbers-only for JSON
  round-tripping, and adding a seven-key record per year to a 50-row history
  earns nothing this plan needs.
- **The admit-rate curve is not re-fitted.** `BACKLOG.md`'s "The admit-rate
  curve's early slope" is its own work with its own probes, and PR D will
  display the 36% opening rate that entry calls a mild handicap without
  changing it.
- **No individual-student simulation.** The split is seven counts per class,
  which is four more aggregate records, not a roster.
  `docs/design/admissions.md`'s "Do not introduce individual-student
  simulation" stands untouched.
- **Cohorts gain no gameplay.** No cohort-specific quality band, no
  sticker-shock rate, no per-cohort satisfaction. `cohorts.ts` is explicit that
  a cohort is one blended multiplier and not a segment of the funnel, and this
  plan displays that model rather than extending it.
