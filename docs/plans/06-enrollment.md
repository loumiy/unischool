# Plan 06 — Enrollment

*Planning document only — no gameplay code is changed by this file. Its job is
to take `BACKLOG.md`'s "Admissions and History" entry — a feature named as an
infographic and a possible tab merge — and turn it into an ordered sequence of
PRs, each one small enough to land on its own and each one landing in the order
that makes the next one cheaper.*

**Status: Proposed.** Five PRs, A through E. The enrolled body's cohort mix
becomes stored state carried by each class from admission to graduation; the
Admissions tab becomes Enrollment and grows the infographic that mix makes
possible; History is not touched. The backlog's merge option is **declined**,
and section 0 argues why.

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

### The map

| Note | Touches | PR |
|---|---|---|
| The enrolled cohort split, stored per class and carried to graduation | `types.ts`, `cohorts.ts`, `admissionsSystem.ts`, `reducer.ts`, `consequences.ts`, `persistence.ts` | A |
| Admissions becomes Enrollment | `TabNav.tsx`, `AdmissionsTab.tsx` → `EnrollmentTab.tsx`, `App.tsx`, `tab-gates.test.ts` | B |
| The standing body, four classes by seven cohorts | `EnrollmentTab.tsx`, `styles.css` | C |
| The funnel, in context | `EnrollmentTab.tsx` | D |
| README, and the backlog entry closes | `README.md`, `BACKLOG.md`, `docs/plans/README.md` | E |

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
case; `invariants.test.ts`'s existing `baseShare` sum check is what makes the
migration's prior well-formed and needs nothing new.

## PR 06B — Admissions becomes Enrollment

**Last cheap moment to do this.** The file is 32 lines now and about 250 after
C and D. Renaming during the content PR means a diff that is a rename and a
rewrite at once, and neither is readable.

`TabId`'s `'admissions'` → `'enrollment'`, the `TABS` label to "Enrollment",
`AdmissionsTab.tsx` → `EnrollmentTab.tsx`, and `App.tsx`'s switch. The tab
stays ungated — it says something useful from the first week, which is the
condition `TabNav.tsx` sets, and the standing body exists from week one even
though no history does.

Nothing about the tab's *contents* changes in this PR.

**Verification:** `tab-gates.test.ts` compiles and passes unchanged — it names
`history`, `research` and `athletics`, none of which move. The type change is
what catches every call site; if it builds, the rename is complete.

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

**Verification:** by eye for the layout; the PR A sum invariant is what keeps
the bars honest against the class totals they segment.

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

**Verification:** by eye. No new state and no new math; every figure on this
panel is one `s.students` field or one call the tab already makes.

## PR 06E — README, and the backlog entry closes

Last, because it is only now knowable.

- README's tab lists (lines 31 and 122) name Admissions; both become
  Enrollment.
- "Admissions cohorts: who the school pulls in" (697) describes cohorts as a
  thing nothing about which is stored — "its pull is a pure function of state,
  recomputed wherever it is needed". PR A makes half of that false. The pull is
  still derived; the **enrolled split is now a record**, and the paragraph has
  to draw the line it currently does not need to.
- "Students: four aggregate classes" (727) gains the standing mix, and "Class,
  cohort, course" (784) is where the distinction is already drawn and where the
  new record belongs.
- `BACKLOG.md`'s "Admissions and History" entry is removed — and the merge it
  proposed is not silently dropped. It was considered and declined, and the
  reasoning lives in section 0 above, which is where a reader who wonders why
  the tabs are still separate will look.
- `docs/plans/README.md`'s table moves this plan's row to `Landed`. The row
  itself goes in when this document does, not here: a plan reading `Proposed`
  belongs in the index from the day it is written.

**Verification:** README read end to end against the shipped tab, which is what
caught two false claims in Plan 05's PR G and is the only check that can.

---

## What this plan does not do

- **History is not touched.** No merge, no new chart, no cohort series in the
  year-by-year table. A cohort series would want a mix per *year* rather than
  per class, which is a different record from the one PR A stores, and there is
  no reason to guess at it before the standing-body panel has been looked at.
- **`YearSnapshot` does not change.** It is deliberately numbers-only for JSON
  round-tripping, and adding a seven-key record per year to a 50-row history
  earns nothing this plan needs.
- **The admit-rate curve is not re-fitted.** `BACKLOG.md`'s "The admit-rate
  curve's early slope" is its own work with its own probes, and PR D will
  display the 36% opening rate that entry calls a mild handicap without
  changing it.
- **No individual-student simulation.** The split is seven counts per class,
  which is four more aggregate records, not a roster. README's "Do not
  introduce individual-student simulation" stands untouched.
- **Cohorts gain no gameplay.** No cohort-specific quality band, no
  sticker-shock rate, no per-cohort satisfaction. `cohorts.ts` is explicit that
  a cohort is one blended multiplier and not a segment of the funnel, and this
  plan displays that model rather than extending it.
