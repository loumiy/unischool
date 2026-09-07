# UniSchool — Design-Alignment Implementation Roadmap

*Planning document only — no gameplay code is changed by this file. Its job is
to sequence the work that makes the existing game faithfully execute the
intended design and makes `README.md` an accurate specification of that design.*

**Status: complete.** All eight PRs (A–H) below have been implemented and
merged. This document is kept as the historical record of the audit and the
sequencing rationale — see the closing summary after PR H for what shipped,
what was found to already conform, and what remains a deliberately deferred
future direction.

Scope note: this roadmap **cleans up and canonicalizes**. It does **not**
propose new gameplay beyond the future directions the design brief explicitly
names, and it does not touch the actively-developed athletics build except where
documentation/architecture consistency requires it.

---

## 0. How the codebase maps to the design today

A short orientation so every PR below can be read against the same map. The
architecture is healthy: one central `GameState` (`src/state/types.ts`), pure
`(state) => void` tick systems composed in a fixed order in
`src/engine/reducer.ts`, all content in `src/data/`. Most of the design is
already implemented correctly; the work is mostly reconciliation, terminology,
one dead-infrastructure removal, and one genuinely large model change (student
cohorts).

**Already conformant (verify, document, don't rebuild):**

- **Buildable model** — courses/buildings/dorms/facilities/athletics venues are
  one `Buildable` type with shared `canStartDevelopment`/`startDevelopment`
  machinery (`src/systems/techtree/techSystem.ts`). No forked subsystems.
- **Unified develop-and-place** — `PLACE_BUILDABLE` starts development and sites
  a placeable in one action; `START_DEVELOPMENT` handles courses. The old
  "develop → siting queue → place" flow is gone (`src/engine/reducer.ts`,
  `src/state/campusMap.ts`).
- **Placement is cosmetic** — `placements`/`pathways` are separate records read
  by no system; effects apply on completion regardless of placement. The
  separate-record architecture keeps a future mechanical map possible.
- **Money is the only development throttle** — no development slots; the only
  gate is `canStartDevelopment` (affordable + status + faculty course-slot).
  Any number can develop at once.
- **Prestige is a computed stock** — `src/systems/prestige/prestigeSystem.ts`
  drifts `self.reputation` toward a target of capped inputs. No completion
  bonus writes reputation. Rankings read reputation; they never feed it.
- **Research is state-influenced + probabilistic** — production gated on
  labs + faculty; output chance rises with the banked stock
  (`src/systems/research/researchSystem.ts`, `src/data/researchData.ts`).
- **Petitions are a yearly decision pool** — `resolveStudentLifeDigest` drains
  the queue wholesale at the summer boundary; unselected = declined.
- **No hard game-over is *intended*** — `financeSystem.ts` never ends the run;
  negative cash stalls development. (But dead `gameOver` scaffolding remains —
  see PR B.)

**Not conformant (the real work):**

| Design intent | Current state | PR |
|---|---|---|
| Four-cohort aggregate student body | Single `students.enrolled` scalar | **D** |
| "Scholarships" terminology | `financialAidRate` / "financial aid" everywhere | **C** |
| Program-centric curriculum language ("establish/distinguish"), not "major completion/mastery" | `major-complete`/`major-mastered`/`majorsComplete`/"fully mastered" | **C** |
| Grad thresholds explicit & per-school | Professional gate is a uniform `Math.ceil(majors * SHARE)` ratio | **C** |
| No hard game-over (remove infra) | Dead `gameOver` field, reads, banner, CSS | **B** |
| Faculty poaching / spend-to-retain is a *future* direction | README says "no poaching, settled choice" (self-contradicts its own roadmap) | **A**, **G** |
| Admissions inputs = tuition, prestige, satisfaction → applications; scholarships → yield | Code is correct; **README is stale** (says player sets "selectivity + target enrollment") | **A** |
| Prestige updates on a fixed cadence | Code drifts **annually**; brief says **"weekly cadence"** | **A** (decision), **E** |

---

## Cross-cutting design decisions that must be answered before implementation

These block specific PRs; resolve them first (they are cheap to answer, expensive to guess).

1. **Prestige cadence — annual vs weekly. (Blocks A wording, E behavior.)**
   **RESOLVED → weekly (option b).** Prestige moves to a **weekly** drift toward
   the computed target, keeping the target-and-slow-drift model and the sticky,
   non-snappy feel (no per-completion bonus) — it may change gently week to week
   rather than sitting static all year. PR A documents this as canon; PR E moves
   the drift to a weekly `tickPrestige` system and retunes `PRESTIGE_DRIFT_RATE`
   (re-run `npm run sim`). Original options kept below for context.

   The brief says "prestige should update on the intended weekly cadence."
   The code drifts prestige once a year inside `RESOLVE_ADMISSIONS`
   (`tickPrestigeAnnual`), and the README documents annual drift as deliberate
   ("prestige is sticky; a single blockbuster year barely moves it"). These
   cannot both be canon. Options:
   - **(a) Annual is canon** — the brief's "weekly" is loose wording for "on a
     cadence, not per-mutation," which the code already satisfies. Fix the README
     only. *Lowest risk; recommended unless the brief author intends otherwise.*
   - **(b) Weekly is canon** — move the drift to its own weekly `tickPrestige`
     system and retune `PRESTIGE_DRIFT_RATE` (÷52-ish) so stickiness is
     preserved. Requires re-running `npm run sim` and re-tuning; several inputs
     (`selectivity`, `incomingQuality`) only change annually anyway, so weekly
     drift mostly just interpolates. **This changes balance and must be decided
     by the brief author, not inferred.**

2. **Curriculum terminology — how far to rename now. (Blocks C.)**
   **RESOLVED → confirmed vocabulary:** *establish* a program (all T2),
   *distinguish* a program (all T3), *distinguished school* (all programs
   distinguished); "scholarships" over "financial aid". Tier labels stay
   T1/T2/T3 (Unlocked/Established/Distinguished relabel deferred). PR A adopts
   this in the README prose; PR C renames the code symbols + milestone keys with
   a save migration.

   The brief wants program-centric language ("a university develops/establishes/
   distinguishes an academic program") and explicitly says the T1/T2/T3 →
   Unlocked/Established/Distinguished relabel must **not** happen until
   progression rules are fully specified. So: rename the *conceptual* verbs
   ("complete/master a major" → "establish/distinguish a program") **now**, but
   keep tier labels T1/T2/T3 as-is. Confirm the exact target nouns/verbs
   (see PR C for a concrete proposed vocabulary) before touching milestone keys,
   because milestone keys are persisted (save migration cost).

3. **Graduate thresholds — authored per-program vs shared ratio. (Blocks C/curriculum.)**
   Brief: "Graduate-program thresholds should be explicitly defined rather than
   inferred… they may differ by school." Today professional programs gate on
   `Math.ceil(majorCount * PROFESSIONAL_GATE_MAJOR_SHARE)` — a single shared
   ratio, not a per-program number. Decision: replace the ratio with an authored
   `gateMajorsRequired` (or similar) field per `GRADUATE_PROGRAMS` entry?
   Recommended **yes** (it's a small data change and makes the rule explicit),
   but confirm the numbers per program.

4. **`morale` field — wire up or remove. (Blocks G.)**
   `Faculty.morale` is written at generation and never read by any system.
   It is either (a) dead state to remove, or (b) reserved for the future
   poaching/retention system. The brief says don't build the faculty sim now.
   Recommended: **remove it now** (additive to re-add later) unless the brief
   author wants it kept as a declared stub. Either way, stop it being silently
   dead.

5. **Four-cohort enrollment accounting — the modeling contract. (Blocks D.)**
   Moving from one `enrolled` scalar to freshmen/sophomore/junior/senior
   cohorts forces several sub-decisions that change balance and must be fixed
   before coding (see PR D for detail): retention/attrition between years
   (design gives none explicitly — assume 100% progression for v1?), what
   `capacity` now caps (total body vs incoming class), and how the year-1
   founding class is distributed across cohorts. These are enumerated in PR D.

---

## Proposed PR sequence

Ordering minimizes rework: spec first (so later PRs have a target), then the
cheap self-contained cleanups, then terminology (which later PRs would otherwise
have to re-touch), then the large cohort change, then the audits that must run
against the finished model.

```
A ─→ B ─→ C ─→ D ─→ E ─→ F ─→ G ─→ H
spec  dead  terms cohorts lifecycle finance faculty final
      code               & order   distress audit  audit
```

- **B** depends on **A** only for the README line that documents "no game-over."
- **C** depends on **A** (canon vocabulary) and decisions 2 & 3.
- **D** depends on **A** (canon cohort model) and decision 5; should land after
  **C** so it renames against final terminology, not twice.
- **E**, **F** must run *after* **D**, because cohort accounting changes what the
  lifecycle order and the finance-distress paths operate on.
- **G** is independent of D but scheduled here so it audits against final specs.
- **H** is the closing invariant sweep; it must be last.

---

## PR A — README / spec canonicalization

**Goal:** make `README.md` an accurate specification of the intended design, and
the single source of truth every later PR is validated against. **No code
changes.** This PR is where the cross-cutting decisions above get written down.

**Files:** `README.md` only.

**Behavioral changes:** none (documentation).

**Content to fix (each is a confirmed README/code or README/brief mismatch):**

1. **Admissions inputs (stale, §"Admissions").** README says the player sets
   "tuition, financial aid, **selectivity, and target enrollment**"
   (lines ~383, ~1067). The code has exactly two inputs: tuition and
   scholarships; selectivity and enrollment are **emergent funnel outputs**
   (`admissionsSystem.ts`). Rewrite to the funnel model: applications =
   f(sticker tuition, prestige, prior-year avg satisfaction); scholarships drive
   yield; students attend four years.
2. **Faculty poaching contradiction.** §"Faculty" (line ~450) declares
   "no rival poaching — a deliberate, settled choice," while the roadmap
   (line ~1096) lists "poaching" as a *Later* item, and the **brief** names
   poaching + spend-to-retain as an intended future direction. Resolve to: the
   *current* build has no poaching; poaching + paid retention (and the
   departure → understaffed → course-on-hold → rehire chain) is an **intended
   future direction, not yet implemented.** Remove the "settled, never" framing.
3. **Prestige cadence.** Write down whichever of Decision 1 is chosen. If annual
   stays canon, state explicitly that "weekly cadence" in the brief means
   "on a cadence, not per-mutation." If weekly is chosen, describe the weekly
   drift and its retuned rate.
4. **Student body model.** README currently says "aggregate cohorts" loosely
   (§"Faculty", line ~419) while code has a single scalar. Specify the intended
   **four-cohort** model (freshmen/sophomore/junior/senior), four-year
   attendance, annual progression + graduation + new freshman intake, and the
   explicit "no individual student simulation" boundary. (This documents the
   target PR D implements.)
5. **Curriculum vocabulary.** Adopt the program-centric language (Decision 2).
   Keep T1/T2/T3 tier labels. State that Unlocked/Established/Distinguished is a
   *deferred* relabel. Document the rigid gate chain explicitly (see PR C).
6. **Graduate thresholds.** Document that thresholds are authored per program
   (Decision 3) and may differ by school; enumerate the T4+ directions the brief
   lists (MBA capstone; Masters→PhD; Medical School from Science+Health; Law from
   SS&H; Arts centers; Eng+CS joint) as **explicitly undecided** so no one
   invents final rules.
7. **`morale`.** Reflect Decision 4 (drop from the attribute list, or mark as a
   declared stub).
8. **Prestige direct-mutation audit result.** Add a short subsection listing the
   *intentional* direct prestige writes (founding init:
   `BASE_STARTING_REPUTATION + preset.prestigeBonus + GENED_BUILDING_REPUTATION_BONUS`;
   annual drift; rivals writing their own `reputation`) and asserting there are
   no others. (This is the brief's "audit the repo for unintended/direct
   prestige mutations and document which ones are intentional" — the audit is
   done in this roadmap; PR A records the conclusion in the spec.)
9. **Legacy-concept status.** Note explicitly that development slots, the old
   Pace mechanic, and the siting queue are removed; that `RETROACTIVE_SITING_COST`
   is a *recovery path* (founding auto-site pathological case + the chapter-house
   event), **not** the old queue; and that `gameOver` scaffolding is being
   removed in PR B.

**Delete vs modify vs preserve:** modify prose only. Preserve the architecture
rules, the pacing/finance narrative, the research/student-life/interrupts
sections (all accurate).

**Tests/invariants:** none (docs). The acceptance check is that every statement
in §0's "Already conformant" table has a matching README paragraph, and every
"Not conformant" row has either a corrected README paragraph or a documented
future-direction note.

**Open decisions consumed:** 1, 2, 3, 4.

---

## PR B — Remove dead hard-failure (`gameOver`) infrastructure

**Goal:** delete the vestigial hard game-over scaffolding. Nothing sets
`gameOver = true` anymore (finance explicitly no longer does), so the field and
all its readers are dead. This directly serves core principle 3 (no hard
game-over) by removing the machinery that implies one exists.

**Files:**
- `src/state/types.ts` — remove `gameOver: boolean` from `GameState`; fix the
  `PendingInterrupt` comment that references "the same way `tickFinance` sets
  `gameOver`".
- `src/state/actions.ts` — remove `gameOver: false` from `createPreStartState`
  and `createInitialState`.
- `src/engine/reducer.ts` — `TICK` guard `if (!s.started || s.gameOver || …)` →
  drop the `s.gameOver` term.
- `src/engine/useGame.ts` — remove `state.gameOver` from the tick-halt condition
  and its dependency array (2 sites).
- `src/App.tsx` — remove the dead `.gameover` banner block and its comment.
- `src/styles.css` — remove `.gameover` rules (and the comment referencing them
  in the startup/gold-button block).
- `src/state/persistence.ts` — **verify** no migration or load path reads
  `gameOver`; if a loaded save carries the old field it is simply ignored by
  `structuredClone`/spread, so likely **no migration bump needed** (confirm).

**Behavioral change:** none observable (the banner never showed). This is pure
dead-code removal.

**Delete:** the field, all reads, the banner, the CSS.
**Preserve:** the finance "stall, don't die" behavior and its comments — that is
the intended mechanism and must stay.

**Tests/invariants to add:**
- Invariant: `GameState` has no `gameOver` key; grep-guard in a test or a note.
- Regression: a run driven deep into negative cash keeps ticking (no halt),
  and unaffordable `START_DEVELOPMENT`/`PLACE_BUILDABLE` is refused. (Codifies
  "indefinitely negative and effectively unable to act is acceptable.")
- `npm run build` compiles with the field gone (catches missed readers).

**Dependencies:** none functionally; sequence after A only so the README already
says game-over is gone.

---

## PR C — Curriculum terminology + rigid, explicit gating

**Goal:** replace "major completion / mastery" with program-centric language,
make the gate chain explicit and rigid in one authored place, and make graduate
thresholds authored per-program. **Keep T1/T2/T3 tier labels** (deferred per
Decision 2).

**Depends on:** A (canon vocabulary), Decisions 2 and 3. Do this **before** D so
the cohort PR renames against final terms once.

**Files:**
- `src/systems/techtree/techSystem.ts` — `checkMilestones`/`awardMilestone`
  messages ("Major complete", "fully mastered", "fully distinguished school");
  milestone key strings `major-complete:` / `major-mastered:` /
  `school-complete:` / `grad-program-complete:`.
- `src/systems/prestige/prestigeSystem.ts` — `MAJOR_COMPLETE_SHARE` /
  `MAJOR_MASTERED_SHARE` / `SCHOOL_COMPLETE_SHARE` constant names and the
  milestone-key reads in `curriculumBreadthScore` / `graduateBreadthFraction`.
- `src/data/techData.ts` — `GraduateProgramSeed` gate (add authored
  `gateMajorsRequired`), `professionalGateThreshold`, `graduateGateMet`,
  `graduateGateDescription`, `PROFESSIONAL_GATE_MAJOR_SHARE`.
- `src/state/types.ts` — `YearSnapshot.majorsComplete` field rename.
- `src/state/history.ts` — the `majorsComplete` capture.
- `src/tabs/CurriculumTab.tsx`, `src/tabs/HistoryTab.tsx`,
  `src/components/InterruptModal.tsx` — user-facing strings and any
  milestone-key or `majorsComplete` reads.
- `src/state/persistence.ts` — **migration** (SAVE_VERSION 18 → 19) if milestone
  key strings change, because `s.milestones` is a persisted string-keyed record;
  renaming keys strands prestige credit on load unless migrated.
- `README.md` — the milestone-chain and prestige sections (final vocabulary).

**Proposed vocabulary (confirm in Decision 2):**
- "complete a major" (all T2 done) → **"establish a program"**
  (`program-established:<prefix>`).
- "master a major" (all T3 done) → **"distinguish a program"**
  (`program-distinguished:<prefix>`).
- "school complete" → **"distinguished school"** (already the log wording;
  keep `school-distinguished:` or leave `school-complete:` — decide with the
  migration cost in mind).
- Keep `grad-program-complete:` as-is, or rename to `grad-program-founded:` to
  match the existing "is now founded" log line (optional).

**Rigid/explicit gating work:**
- The unlock chain (gen-ed → T1 → school building → T2 → T3) is already
  data-driven via `prereqs` + `meetsUnlockGates` and matches the brief's
  intended direction. This PR **documents it as the canonical rule** and adds
  invariants (below) rather than rewriting the resolver.
- Replace the inferred professional-school ratio with an **authored
  `gateMajorsRequired` per `GRADUATE_PROGRAMS` entry** (Decision 3). Keep
  `graduateGateMet` as the one predicate; it now reads the authored number
  instead of `Math.ceil(count * SHARE)`. `graduateGateDescription` reads the
  same field so text and rule cannot diverge.

**Delete:** `PROFESSIONAL_GATE_MAJOR_SHARE` and `professionalGateThreshold`
(replaced by authored numbers) — *if* Decision 3 is "authored."
**Modify:** milestone keys/messages, prestige constant names, snapshot field,
UI strings.
**Preserve:** the generic prereq resolver, `meetsUnlockGates`, the milestone
*mechanism* (aggregate-condition awards), the tier data itself, T1/T2/T3 labels.

**Tests/invariants to add:**
- **Gate-chain invariant (rigid gating):** a T2 course cannot be `available`
  unless its school building is `done`; a T1 course cannot be `available` unless
  the entire gen-ed core is `done`; a school building cannot be `available`
  unless all its T1 courses are `done`. Assert by driving a scripted state.
- **Program-established fires iff all T2 done; program-distinguished iff all T3
  done** (rename-safe restatement of the current milestone tests).
- **Graduate gate reads authored threshold:** a program opens exactly when its
  authored `gateMajorsRequired` programs are established in each gate school
  (and, for doctorates, the lab is `done`).
- **Save migration:** a v18 save with old milestone keys loads with prestige
  credit intact (breadth score unchanged across the migration).

**Open decisions consumed:** 2, 3.

---

## PR D — Aggregate four-year student cohort model

**Goal:** replace the single `students.enrolled` scalar (which conceptually
represents the whole student body from one admission class) with an aggregate
**four-cohort** model: freshmen, sophomores, juniors, seniors. Annual
progression advances cohorts, graduates seniors, and admits a new freshman
class. **No individual student simulation** — cohorts stay aggregate counts.

This is the **largest** PR and the highest-rework risk; it lands after
terminology (C) so it renames once, and before the lifecycle/finance audits
(E/F) which must operate on the new accounting.

**Depends on:** A (canon model), C (terminology), Decision 5.

**Files (state + systems + UI + persistence):**
- `src/state/types.ts` — `StudentBody`: replace `enrolled` with a cohort
  structure (e.g. `cohorts: { freshmen; sophomores; juniors; seniors }` plus a
  derived `totalEnrolled` helper, or keep `enrolled` as a computed getter to
  minimize downstream churn — see "modeling contract" below).
- `src/systems/admissions/admissionsSystem.ts` — the funnel currently produces
  one `enrolled` number = the whole body. It must instead produce the **incoming
  freshman class**; total body = sum of the four cohorts. `capacity` semantics
  must be decided (Decision 5). Applications already read prestige/tuition; add
  **prior-year average satisfaction** as the applications input (the brief lists
  "average student satisfaction over the preceding year" — today word-of-mouth
  reads *current* satisfaction, not a trailing-year average; decide whether to
  track a rolling average).
- `src/engine/reducer.ts` — `RESOLVE_ADMISSIONS` must, in the right order:
  advance cohorts (senior→graduate, junior→senior, etc.), admit the new freshman
  class from the funnel, then snapshot. This is the "annual progression" step.
- `src/systems/finance/financeSystem.ts` — every per-student line
  (`tuitionRevenue`, `instructionCost`, `baselineFunding` per-student
  appropriation, `seatUpkeep` filled/empty split) reads `enrolled`; must read
  **total body** now. Confirm tuition is charged on the whole body, not just
  freshmen.
- `src/systems/prestige/prestigeSystem.ts` — `admissionsScaleScore`,
  `selectivityScore`, `studentQualityScore` read `enrolled`/admit data. Decide
  whether prestige scale reads **total body** (recommended) while
  selectivity/quality read the **most recent cycle** (freshman class). Document.
- `src/systems/satisfaction/satisfactionSystem.ts` — ratio attributes score
  served-population against `capacity`; unaffected structurally but confirm
  "current student experience → satisfaction → next year's applications" holds
  with the trailing-average change above.
- `src/systems/demands/demandSystem.ts` — reads `capacity`/served; confirm.
- `src/state/history.ts` / `YearSnapshot` — `enrolled` becomes total body;
  consider adding a graduated-this-year stat (statistical record only — brief
  says history is statistical, not narrative).
- UI: `src/components/StatusHeader.tsx`, `src/tabs/AdmissionsTab.tsx`,
  `src/tabs/TreasuryTab.tsx`, `src/components/InterruptModal.tsx`,
  `src/tabs/HistoryTab.tsx`, `src/data/campusData.ts`,
  `src/data/facilitiesData.ts`, `src/data/eventData.ts`,
  `src/data/studentLifeData.ts` — all read `students.enrolled` (18 files total
  read `enrolled`/`capacity`); most only need the "total body" helper, but each
  must be checked.
- `src/state/persistence.ts` — **migration** SAVE_VERSION → next: an old save has
  one `enrolled` number. Decide how to split it into four cohorts on load
  (e.g. quarter it, or put it all in one cohort and let it drain — pick the
  least-surprising). This is mandatory; the field shape changes.

**Modeling contract to fix before coding (Decision 5):**
- **Progression/attrition:** brief gives no retention loss. Assume **100%
  progression** freshman→…→graduation for v1? (Retention as a satisfaction
  consequence is a plausible future hook but not specified — do not build it.)
- **What `capacity` caps:** total body (all four cohorts) vs incoming class.
  Recommended: capacity caps **total body**; the funnel sizes the freshman class
  to fill capacity *net of returning cohorts*. This preserves the "over-built
  beds sit empty and cost money" pacing the finance model depends on.
- **Founding distribution:** year-1 `enrolled: 200` — split across cohorts, or
  start with only freshmen and let the body build over four years? The latter
  changes early-game revenue significantly; decide explicitly.
- **`enrolled` as compatibility shim:** strongly consider keeping a derived
  `totalEnrolled`/`enrolled` read path so the 18 downstream readers change
  minimally and the risk concentrates in admissions + reducer.

**Delete:** the notion that "one annual admission class = the whole body."
**Modify:** admissions funnel output, `RESOLVE_ADMISSIONS` progression step,
every per-student finance/prestige read, persistence.
**Preserve:** the aggregate (non-individual) modeling; the funnel curves
themselves (they now size the freshman class); satisfaction/demand mechanisms.

**Tests/invariants to add:**
- **Conservation:** total body = freshmen + sophomores + juniors + seniors every
  tick; no cohort negative.
- **Progression:** after `RESOLVE_ADMISSIONS`, seniors(t) graduate, each cohort
  = prior younger cohort (± chosen attrition), freshmen = funnel output.
- **Four-year residency:** a freshman class admitted in year Y contributes to the
  body through year Y+3 and is gone by Y+4.
- **Finance parity:** tuition/instruction/appropriation scale with **total body**
  (regression against a fixed scenario).
- **Applications input:** applications respond to prior-year avg satisfaction
  (if the trailing-average change is adopted).
- **Migration:** a v(current) save loads into a valid four-cohort state whose
  total equals the old `enrolled`.

**Open decisions consumed:** 5 (and the satisfaction-averaging sub-decision).

---

## PR E — Weekly/annual lifecycle & system-order audit

**Goal:** verify and document the exact weekly vs annual cadence of every system
and the reducer's fixed `SYSTEMS` order, and (if Decision 1 chose weekly
prestige) move prestige to a weekly system. Capture the currently-undocumented
ordering dependencies the brief calls out.

**Depends on:** D (cohort progression is the biggest annual-boundary change) and
Decision 1.

**Files:**
- `src/engine/reducer.ts` — the `SYSTEMS` array and `RESOLVE_ADMISSIONS`
  annual-boundary sequence (funnel → cohort progression → `tickPrestigeAnnual` →
  `captureYearSnapshot` → advance clock → autosave).
- `src/systems/prestige/prestigeSystem.ts` — only if Decision 1 = weekly:
  introduce `tickPrestige` (weekly) and retune `PRESTIGE_DRIFT_RATE`.
- All `tick*` systems — audit which mutate weekly vs which gate on
  `week === WEEKS_PER_YEAR` / `pendingInterrupt`.

**Behavioral changes:** none if Decision 1 = annual (documentation +
invariants only). If weekly: prestige drifts weekly with a retuned rate; balance
must be re-checked with `npm run sim`.

**Ordering dependencies to document (already true; make explicit):**
- `tickFaculty` → `tickResearch` (research weighted by freshly grown stats).
- `tickResearch`/`tickFinance` before `tickAdmissions` (grants land in the same
  week's cash; funnel reads updated world).
- `tickSatisfaction` before `tickAdmissions` (word-of-mouth reads this week's
  satisfaction).
- `tickStudentLife` before `tickSatisfaction` (recognized orgs count this week).
- `tickEvents` then `tickDemands` **last** (they stand down for a claimed week).
- The autosave side effect lives in `RESOLVE_ADMISSIONS`/`SAVE_GAME` only
  (documented reason: determinism under StrictMode).

**Delete:** nothing.
**Modify:** comments/spec; prestige cadence only if Decision 1 = weekly.
**Preserve:** the current order (it is correct and load-bearing).

**Tests/invariants to add:**
- **Annual boundary fires once per year** and only at `week === WEEKS_PER_YEAR`.
- **Interrupt halts the clock:** with `pendingInterrupt` set, `TICK` is a no-op.
- **Order regression:** a golden-scenario test that would break if two systems
  were reordered (e.g. move `tickSatisfaction` after `tickAdmissions` and assert
  word-of-mouth changes) — encodes the dependency so a future refactor can't
  silently break it.
- If weekly prestige: prestige after 52 weekly drifts ≈ the old single annual
  drift (parity within tolerance) at a steady target.

**Open decisions consumed:** 1 (behavior half).

---

## PR F — Financial-distress behavior audit

**Goal:** confirm and lock the intended distress behavior: negative cash is
allowed; unaffordable development is refused; there is no bankruptcy/game-over;
indefinite negative + effectively-unable-to-act is acceptable **for now**. The
future contraction system (faculty departures, disbanded clubs, courses on hold)
is **not** implemented here — only verified as absent and documented as future.

**Depends on:** D (per-student finance now reads total body) and B (game-over
gone).

**Files:**
- `src/systems/finance/financeSystem.ts` — verify: no auto-draw, no insolvency
  branch, empty-seat mothball floor, endowment payout floor. Confirm the
  "stall, don't die" comment block is still accurate post-cohorts.
- `src/systems/techtree/techSystem.ts` — verify `canStartDevelopment` refuses
  when `cash < cost` (so no buying into debt), and negative cash blocks all
  priced starts until recovery.
- `src/engine/reducer.ts` — verify `RESOLVE_DECISION_EVENT`,
  `LAUNCH_ENDOWMENT_CAMPAIGN`, `PLACE_BUILDABLE` all refuse unaffordable actions
  and never force cash negative except via operating deficit.

**Behavioral changes:** ideally none — this is an audit. Any fix is limited to a
path that lets cash go negative through a *purchase* (which would violate the
model). If found, fix it; otherwise, documentation + tests only.

**Delete:** nothing (game-over already removed in B).
**Modify:** only if an audit finding shows a purchase path can force debt.
**Preserve:** all "stall, don't die" floors.

**Tests/invariants to add:**
- **No purchase drives cash negative:** every priced action refused when
  `cost > cash`.
- **Operating deficit *can* drive cash negative**, and the game keeps ticking
  indefinitely (no halt, no game-over) — codifies the accepted "indefinitely
  negative" state.
- **Recovery levers exist:** lowering net price widens the pool next cycle;
  firing faculty reduces the largest expense line (regression that the levers
  actually move the numbers).

**Future-direction note (documentation, not code):** record in the README that
contraction (faculty poaching/departure → understaffed → course on hold →
rehire; disbanded clubs) is the intended eventual distress response and is
deliberately unbuilt. Do **not** implement it here.

---

## PR G — Faculty semantics / conformance audit

**Goal:** confirm faculty match the intended model — named individuals with
lightweight attributes, no heavy life/personality sim — and resolve the
`morale` dead-state question. Do **not** build poaching/retention (brief: don't
build a new faculty sim unless required to reconcile existing code).

**Depends on:** A (README poaching contradiction resolved), Decision 4.

**Files:**
- `src/state/types.ts` — `Faculty`: resolve `morale` (Decision 4 — remove, or
  keep as a declared stub with a comment saying it is reserved and currently
  unread).
- `src/data/facultyData.ts` — `morale` roll in `generateCandidate`; founding
  `morale` values in `src/state/actions.ts` (5 hires) if the field is removed.
- `src/systems/faculty/facultySystem.ts`, `facultyAssignment.ts` — confirm no
  hidden life-sim behavior; confirm the churning candidate market and
  tenure-growth model match the README.
- `README.md` — already fixed in A; G verifies code matches the corrected spec.

**Behavioral changes:** none, unless `morale` is removed (then generation and
founding no longer set it — invisible, since nothing reads it).

**Delete:** `morale` (if Decision 4 = remove) — field, roll, 5 founding values;
requires a save migration only if the field's absence would break load (it
won't; extra keys are ignored, missing keys just aren't read — confirm no reader
exists first).
**Modify:** README verification.
**Preserve:** named-individual model, teaching/research/potential/tenure growth,
`acclaim`, the standing candidate market, `requiresFaculty` course-slot gating.

**Tests/invariants to add:**
- **Faculty are individuals:** every roster/candidate entry has a unique `id`,
  `name`, `field`.
- **No unread state:** a test (or documented grep) that `morale` is either read
  by a system or absent — i.e. no silently-dead faculty field remains.
- **Growth/retention invariant:** `teaching`/`research` monotonically approach
  their potentials with tenure and plateau; salary rises with them. (Regression
  guarding the "retention is the lever" design.)

**Open decisions consumed:** 4.

---

## PR H — Final spec-conformance / invariant audit

**Goal:** the closing sweep. Verify the whole game now matches the canonical
README, and add the cross-system invariants that protect the alignment from
future drift. Runs last so it audits the finished model.

**Depends on:** all of A–G.

**Files:** test/harness additions primarily; small doc/comment fixes as findings
surface. Likely `sim/balanceSim.ts` (extend to assert invariants across a
fast-forward run) and any test scaffold the project adopts.

**Invariant checklist to encode (each maps to a core design principle):**
- **Curriculum is the spine:** curriculum breadth is the dominant prestige input;
  a build-nothing run cannot reach the top of the rankings (re-assert the
  `admissionsScaleScore` throttle after cohort changes).
- **Institution, not students:** no individual-student state anywhere; student
  body is exactly four aggregate cohorts.
- **No hard game-over:** no `gameOver`, run continues through indefinite
  negative cash.
- **Money is the only development throttle:** no slot state; `canStartDevelopment`
  is the sole gate besides faculty course-slots.
- **Placement is cosmetic:** no system reads `placements`/`pathways`
  (grep-guard); effects apply on completion only.
- **Prestige is a stock:** the only writers of `self.reputation` are the founding
  init and the drift (weekly or annual per Decision 1); nothing else mutates it;
  rank never feeds prestige.
- **Prestige cadence:** updates on the chosen cadence, never per-mutation.
- **Rigid gating:** the gen-ed → T1 → school building → T2 → T3 chain holds;
  graduate gates read authored thresholds.
- **Research is state-influenced + probabilistic:** no lab ⇒ no research; output
  probability rises with stock.
- **Petitions are a yearly pool:** the queue drains wholesale each summer;
  nothing persists across years.
- **Scholarships terminology:** no `financialAid*` identifiers or "financial aid"
  strings remain.
- **Terminology:** no "major complete/mastered/mastery" strings remain (T1/T2/T3
  labels preserved).

**Delete:** any dead code the sweep surfaces.
**Modify:** README/comments for any residual drift.
**Preserve:** everything conformant.

**Tests/invariants to add:** the checklist above, plus a `npm run build` +
`npm run sim` gate documenting that the aligned game still produces the intended
pacing shape.

**Delivered.** `test/invariants.test.ts` (41 checks, `npm run test:invariants`,
folded into `npm test`) encodes every item on the checklist above:
- No-game-over (structural absence of the field), the four-cohort shape
  (structural), no development-slot cap (three simultaneous course starts, all
  `developing`), placement-is-cosmetic (source-scan: no file under `systems/`
  reads `.placements`/`.pathways`), prestige-is-a-stock (source-scan: `self.
  reputation` is written only in `actions.ts`/`prestigeSystem.ts`/
  `rivalsSystem.ts`, and `prestigeSystem.ts` never reads `playerRank`),
  prestige-cadence (source-scan: `tickPrestige` is registered as a bare
  `SYSTEMS`-array entry and never called directly elsewhere, plus a behavioral
  check that one `TICK` moves reputation by less than 1 point), the full
  gen-ed → T1 → school-building → T2 → T3 gate chain driven end-to-end through
  the real reducer on the Business school/Finance major (including its
  authored cross-major bridge onto `ECON110`, confirming prereqs may cross
  majors exactly as documented), research-needs-a-lab (`weeklyResearchPoints`
  is zero at founding, however large the roster), petitions-drain-wholesale
  (a seeded pending petition is gone from the queue and never became a club
  after a `RESOLVE_ADMISSIONS` that didn't approve it), and a legacy-
  terminology sweep (source-scan for `major-complete:`/`major-mastered:`/
  `school-complete:`/`financialAidRate`/`gameOver` anywhere outside the one
  migration file permitted to read old names).
- Curriculum-breadth dominance (`admissionsScaleScore`'s enrollment throttle)
  was verified by re-reading `prestigeSystem.ts` rather than re-encoded as a
  fast-forward assertion — PR A's audit already covers it and the constant
  hasn't moved since; adding a second copy of that check risked drifting from
  `sim/balanceSim.ts`'s own fast-forward numbers rather than reinforcing them.
- No dead code surfaced beyond what B/G already removed; no residual README
  drift was found beyond what A/C/D/E/F/G already corrected — this PR's
  changes are additive (new tests + package.json wiring) with zero `src/`
  game-code edits.
- `npm run build` and `npm run lint` pass; `npm run sim` still shows "stall,
  don't die" holding (no strategy's cash spirals to permanent failure; the
  clock never halts outside a pending interrupt) — the exact red-week counts
  shift slightly from PR G's `morale`-removal `Math.random()` call dropping
  out of the stream (expected: `sim/balanceSim.ts`'s own header note says any
  change to how many times `Math.random` is called moves the whole stream),
  not from anything this PR touched.

---

## Appendix — file-level cleanup index (quick reference)

Concrete touch-points found during the audit, grouped by concern:

- **Dead `gameOver`:** `types.ts:682`, `actions.ts:205,353`, `useGame.ts:52,55`,
  `reducer.ts:173`, `App.tsx:103-107`, `styles.css:874-877,893`. (PR B)
- **"financial aid" → "scholarships":** `types.ts` (`AdmissionsSettings.
  financialAidRate`), `admissionsSystem.ts` (`aid` params/constants),
  `reducer.ts` (`RESOLVE_ADMISSIONS`), `actions.ts` (action payload + inits),
  `financeSystem.ts` (`netTuitionPerStudent`), `AdmissionsTab.tsx`,
  `InterruptModal.tsx`, `README.md`. (Fold into C, or split as a mechanical
  rename sub-PR if preferred — it is orthogonal to the milestone-key rename.)
- **"major complete/mastered" → program-centric:** `techSystem.ts`
  (messages + keys), `prestigeSystem.ts` (share constants + key reads),
  `techData.ts` (grad gate), `types.ts`/`history.ts` (`majorsComplete`),
  `CurriculumTab.tsx`, `HistoryTab.tsx`, `InterruptModal.tsx`,
  `persistence.ts` (milestone-key migration). (PR C)
- **Single-scalar `enrolled` → four cohorts:** 18 reader files incl.
  `admissionsSystem.ts`, `financeSystem.ts`, `prestigeSystem.ts`,
  `satisfactionSystem.ts`, `demandSystem.ts`, `history.ts`, `reducer.ts`,
  `StatusHeader.tsx`, `AdmissionsTab.tsx`, `TreasuryTab.tsx`,
  `InterruptModal.tsx`, `HistoryTab.tsx`, `campusData.ts`, `facilitiesData.ts`,
  `eventData.ts`, `studentLifeData.ts`, `types.ts`, `persistence.ts`. (PR D)
- **`morale` dead field:** `types.ts:60`, `facultyData.ts:672`,
  `actions.ts:296-320` (5 hires). (PR G)
- **Grad threshold (inferred → authored):** `techData.ts`
  (`PROFESSIONAL_GATE_MAJOR_SHARE`, `professionalGateThreshold`,
  `graduateGateMet`, `graduateGateDescription`, `GRADUATE_PROGRAMS`). (PR C)
- **Prestige cadence:** `prestigeSystem.ts` (`tickPrestigeAnnual`),
  `reducer.ts` (`RESOLVE_ADMISSIONS`). (PR E, gated on Decision 1)
- **Recovery-path (not legacy queue) — preserve + document:**
  `campusMap.ts` (`needsSiting`, `canSiteRetroactively`,
  `RETROACTIVE_SITING_COST`, `firstFreeSpot`). (PR A doc note)

---

## Closing summary (post-implementation)

All eight PRs merged, in sequence, each reviewed and merged individually:

| PR | What shipped | Merged |
|---|---|---|
| A | README canonicalized as the design spec; two cross-cutting decisions resolved (weekly prestige cadence; program-centric vocabulary) | ✅ |
| B | Dead `gameOver` hard-failure scaffolding removed | ✅ |
| C | Curriculum terminology renamed to program-centric vocabulary (establish/distinguish); graduate-program gates made explicit authored thresholds; save migration v18→v19 | ✅ |
| D | Aggregate four-year student cohort model (freshman/sophomore/junior/senior) replacing the single `enrolled` scalar; founding ramp; trailing-year-average satisfaction feeding word of mouth; save migration v19→v20 | ✅ |
| E | Prestige drift moved from an annual boundary to a weekly cadence, rate retuned to preserve the original ~12%/year stickiness; system-order audit documented in place | ✅ |
| — | (slotted in alongside E/F) Scholarships terminology rename (`financialAidRate` → `scholarshipRate`); save-migration test harness (`test/save-migrations.test.ts`, 27 checks) | ✅ |
| F | Financial-distress audit: confirmed every priced action is guarded, only the operating deficit can carry cash negative, the run never halts; `test/financial-distress.test.ts` (20 checks) | ✅ |
| G | Faculty-semantics audit: confirmed named-individuals/lightweight-attributes model; removed the dead `morale` field; `test/faculty.test.ts` (16 checks) | ✅ |
| H | Closing invariant sweep: `test/invariants.test.ts` (41 checks) encoding every core design principle as a regression guard | ✅ |

**Net result:** `npm test` now runs four suites — migrations, financial
distress, faculty semantics, and the closing invariant sweep — **104 checks
total**, all driving the real reducer (not a reimplementation), plus targeted
source-scans for the identifiers and patterns the design forbids. `npm run
build`, `npm run lint`, and `npm run sim` all stay green throughout, and the
sim's pacing shape (cost-leads-revenue, stall-don't-die, curriculum-breadth-
dominated prestige) is unchanged in kind — only the specific numbers, drifting
between runs by the ordinary Math.random-stream sensitivity `sim/balanceSim.ts`
itself documents.

**What did NOT change, by design:** the actively-developed athletics build was
untouched; no new gameplay was proposed or built beyond the future directions
the design brief explicitly named (faculty poaching/retention, school-specific
T4+ payoffs, contraction mechanics, spatial map mechanics) — those remain
documented in the README as intended-but-unbuilt, exactly as the brief asked.

**What remains open, deliberately, as future work** (not part of this
cleanup, and not started):
- Faculty poaching + paid retention, and the departure → understaffed →
  course-on-hold → rehire chain (README's "Faculty").
- School-specific T4+ progression for schools beyond Medicine/Law/MBA
  (Masters→PhD sequencing, Arts payoffs, an Engineering+CS joint institution) —
  the brief marks these explicitly undecided.
- Financial-distress contraction (faculty departures, disbanded clubs,
  unstaffed courses going on hold) as the eventual response to sustained
  negative cash — currently the accepted state is simply "indefinitely
  negative, effectively unable to act."
- Prestige decomposed into several underlying components (currently one
  computed stock with multiple weighted inputs, which already satisfies the
  "not a sum of completion bonuses" requirement, but is not yet the richer
  multi-component model the brief gestures at as a long-term direction).
- Any mechanical use of campus-map spatial relationships (placement stays
  cosmetic, by design, with the architecture left open for this).
