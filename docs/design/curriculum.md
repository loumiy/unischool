# Curriculum

The 421-course catalogue: how it unlocks, how it is presented, and the
facilities that gate its capstones. Graduate work sits on top of it and has
[its own document](graduate-programs.md).

## The milestone chain (how the curriculum gets its shape)

The 421-course curriculum is not a flat list; buildings give it a progression
spine. The intended climb:

1. Start with **one academic building** and the **gen-ed core** available — nothing
   else. Every major's tier-1 entry course requires the *entire* gen-ed core, not
   just its own school, so the core is the one true root every climb shares.
2. Completing the gen-ed core unlocks **every major's tier-1 course**, across every
   school, all at once.
3. Completing **all tier-1 courses in a school** unlocks the ability to **build
   that school** (a `building` Buildable).
4. Completing that **school building** unlocks the school's **tier-2** courses.
5. Completing **all tier-2 courses in a major** **establishes that program** —
   granting an applicant-pool bonus and unlocking the major's **tier-3** courses.
6. Completing the **tier-3** courses **distinguishes that program**.
7. Once a school's programs are distinguished — or, for a doctorate, once the
   school has a lab — a **graduate program** opens on top of it, and completing
   one founds it (see [graduate-programs.md](graduate-programs.md)). Every
   school is intended to
   have a meaningful payoff for progressing through tier 3; some school-specific
   T4+ payoffs are still being designed and are deliberately left unspecified
   here rather than invented (see
   [graduate-programs.md](graduate-programs.md)).

**A note on terminology.** The game models an *institution*, so the language is
institutional: a university **establishes** and then **distinguishes** an
academic **program** — it does not "complete" or "master" a major. Students are
the ones who complete degrees; the player builds the programs they graduate from.
The confirmed vocabulary is **establish** (all tier-2 done), **distinguish** (all
tier-3 done), and a **distinguished school** (every program distinguished). The
tier labels themselves stay **T1 / T2 / T3** for now; the possible relabel to
Unlocked / Established / Distinguished is deferred until the full progression
rules are specified. The code still carries the older milestone keys
(`major-complete:`, `major-mastered:`, `school-complete:`) and constant names;
those are renamed to match this vocabulary, with a save migration, in the
terminology pass (see [Plan 01](../plans/01-design-alignment.md)'s PR C).

Milestone bonuses (program-established, program-distinguished, distinguished-
school, program-founded — keyed `major-complete:` / `major-mastered:` /
`school-complete:` / `grad-program-complete:` in code until the terminology
pass) are dedicated milestone logic in `techSystem.ts` — they are a first-class
part of the model, not an afterthought. Note this makes buildings prerequisites
for courses, which is exactly why prereqs must cross kinds. These milestones no
longer grant reputation directly; instead they are the durable "curriculum
breadth" stock that feeds the prestige target (see
[progression.md](progression.md)) — establishing or
distinguishing a program, or distinguishing a whole school, raises the ceiling
prestige can drift toward, rather than instantly bumping it.

## The Curriculum map: three levels over one revealed set

The Curriculum tab, like every tab, is **full-bleed**: it owns the viewport and
the dock is laid over it (see [ui-shell.md](../architecture/ui-shell.md)).

Three levels, all derived from the unlock/milestone state progressive
discovery already computes — the view adds no state of its own:

1. **Schools.** One card per revealed school, with its completion and its
   aggregate grade.
2. **Lanes and tier bands.** A school opens into its majors, each a lane banded
   by tier, so position carries the regular structure.
3. **The course drawer.** A course opens into who teaches it, what grade that
   earns, who else is eligible and what it leads to.

**Almost no edges are drawn, and that is the argument.** 42 majors in a fixed
1/4/4 shape means the tier chain is ~336 edges all saying the same thing.
Position carries that; what gets highlighted instead are the **~50 authored
cross-major bridges**, which are the interesting ones — and only when they are
relevant to what you are looking at. Every prerequisite in the drawer is a link
that opens its school and selects it, so the only edges that exist are the ones
you walk.

*(A literal constellation layout was built and abandoned before this — see
`docs/plans/02-academic-core.md`'s "Why the constellation failed", which is the most
useful thing that experiment produced. The one finding carried forward is the
full-bleed shell, now described in
[ui-shell.md](../architecture/ui-shell.md).)*

## The health chain, and clinical coursework

Three buildings, each a different institution rather than the same one with
a bigger number on it (`facilitiesData.ts`), unlocked in order past rising
population thresholds:

- **Health & Counseling Center** (3x3) — the small campus clinic a school
  needs once it crosses 1,500 enrolled.
- **University Clinic** (5x5) — real outpatient care, and the **practicum
  site** two clinical majors train in (see below).
- **University Hospital** (11x11, the largest *building* on campus) — the
  late-game rung, and the one facility in the game gated on **another
  building**: `BLDG-MED`, the School of Medicine's own hall. A university
  hospital is a teaching hospital, and a campus without a medical school
  does not have one.

Capacity tracks footprint at a near-flat ~220-250 students served per tile
across all three, while cost per seat climbs (280 -> 400 -> 650) the way
every chain in that file does.

**Clinical coursework gates on a clinical facility**, the same cross-kind
mechanism the labs and the arts facilities use — but keyed by COURSE id
rather than by major prefix (`techData.ts`'s `CLINICAL_PRACTICUM_GATE`),
because a clinic gates the courses that are actually clinical:

- **Nursing's four capstones** need the University Clinic. This retired the
  **Nursing Lab**: a lab here means a *bench science*, and nursing is not
  one — its capstones are clinical practica, which happen where patients
  are. Health Science stays a research school on Neuroscience's lab, which
  is a bench science and keeps its own.
- **Pharmacy's Clinical Pharmacy Practicum** — and only that one of its
  capstones — needs the Clinic too.
- **The MD's Advanced Clinical Practicum** needs the **Hospital**. A
  clerkship is inpatient work, so the chain reads: found the school ->
  build its hospital -> finish the degree.

None of this can be circular: every gate points at a health-chain facility,
and the health chain's own prereqs are earlier rungs of itself plus the
medical school BUILDING — never a course.

## Arts payoffs: two facilities, two majors

Arts & Media's version of "every school gets a meaningful tier-3 payoff" —
the same curated cross-kind gate `LAB_GATED_MAJOR_PREFIXES` gives the lab
sciences (a Buildable gates a major's capstone coursework), but with each of
two majors pointed at its **own** facility instead of a lab per major:

- **Performing Arts Center** (`facilitiesData.ts`'s `PERFORMING_ARTS_CENTER_ID`)
  unlocks once **Music's** full tier-2 quartet (`MUSC110`–`MUSC140`) is done,
  then gates Music's own tier-3 capstone courses — the concert hall and
  theater is where those capstones perform.
- **Art Gallery** (`ART_GALLERY_ID`) unlocks once **Studio Art's** tier-2
  quartet (`SART110`–`SART140`) is done, then gates Studio Art's tier-3
  capstones the same way — the rotating-exhibit gallery is where those
  capstones exhibit.

Each facility's unlock and its own gate sit two tiers apart (tier-2 to
unlock, tier-3 gated), so this can never be circular: building the facility
can never require the facility. The two are otherwise independent of each
other — nothing orders the gallery against the performing arts center, only
each against its own major's coursework.

**Graphic Design, the school's third major, sits outside both gates.** A
two-building, two-major split already covers the school's performing
(Music) and exhibited (Studio Art) halves; there's no third facility for a
third major to specialize into, so Graphic Design's capstones take the
plain tier-2 prereq every non-gated major's capstones get.

**Both facilities also feed student satisfaction** like any other
campus-life facility — `satisfactionAttribute: 'social'` plus a
`servesPopulation` (1,500 for the Performing Arts Center, 500 for the Art
Gallery), read by the same `social` ratio the rec center and student-center
tiles feed. There is no separate arts-specific satisfaction input; it is the
existing mechanism, not a new one.
