# Plan 25 — The catalogue, drawn

*Planning document only. Its job is to turn Phase D of the v2 merge (the
building catalogue, `loumiy/unischool-v2`'s `docs/MIGRATION_PLAN.md`) into a
sequence of PRs.*

**Status: In progress.**

---

## 0. The finding

Phase D is mostly art: port v2's building types, give dedicated halls and
research buildings their own looks, add grand landmarks, and keep capacities
readable. The owner's decisions (v2's `docs/V1_ADOPTION_LIST.md`):

| # | Decision |
| --- | --- |
| V2 #41 | Port the catalogue behind the unlock track, with the campus art fixes. |
| V2 #42 | Keep only the rooftop parts that read well: flues, flagpoles, balconies. |
| V2 #43 | Pick one of three grand landmarks: a long build, a big payoff, bespoke art built in visible stages. |
| V1-5 | A mixed hall is generic; a founded school's hall becomes that school's signature building. Confirmed. |
| V1-7, V1-10 | Capstone and research facilities vary by discipline. |
| V1-11 | Graduate halls become capital projects (the Medical School, the Research Park). |
| V1-30 | Every building serves a logical, readable number of students; bigger variants unlock later. Confirmed. |
| V1-32 | Keep this game's ground and venue art; give the stadium a real bowl. |

Set against what this game already has, three findings shape the plan.

1. **Most of v2's 52 types are this game's buildings under other names.**
   Its halls, residences, dining and health, recreation and venues are this
   game's chains. Its academic variants (the science centre, the
   engineering building, the arts building, the conservatory) are exactly
   what V1-5 asks a dedicated hall to become. What is left is v2's
   amenities and small landmarks: the chapel, museum, café, bookshop,
   statue, fountain, gate, garden and bell tower. Their worth is beauty,
   which Phase E introduces. Built now, they would do nothing.
2. **Some of the phase is already here.** The stadium is a bowl of four
   raked stands (V1-32). Four research facilities are already restyled by
   id. The tiered chains already are "bigger variants, unlocked later", and
   since Plan 23 each is opened by a named milestone (V1-30). Storeys that
   add capacity are Phase E's (V2 #36).
3. **Graduate halls as capital projects need the capital-project
   mechanic,** which is Phase L's. Moving graduate programs out of their
   halls now would move the harness for no player-facing gain.

## Rules for this plan

- **Balance-neutral.** Nothing the harness builds changes. New Buildables
  carry no `satisfactionAttribute`, so no strategy picks them up. The slow
  suites run before the PR.
- **The profiler gates every map PR,** as in Plan 24.
- **Art is judged by screenshots** at the four views, and at least two
  pitches, before it lands.

## PR 25A — The plan

This document.

## PR 25B — Signature halls

- **A hall dedicated to one school** (six programs of one school, the hall
  that founds it) is drawn as that school's signature building:

  | School | Signature |
  | --- | --- |
  | Science | a science centre (block, render) |
  | Engineering | an engineering building (works, render) |
  | Health Science | a health sciences building (block, clinical) |
  | Computer Science | a computing building (block, curtain wall) |
  | Arts & Media | an arts building (portico, limestone) |
  | Business | a business school (portico, buff brick) |
  | Social Sciences & Humanities | a collegiate hall in limestone |

- A mixed hall stays the generic gabled hall. The look changes the week the
  hall is dedicated, and reverts if it stops being dedicated.
- Drawing only. The map's copy of the Buildable carries the signature;
  state does not.

**As implemented:** `buildingSpec.ts`'s `SCHOOL_SIGNATURES` maps each school
to a motif and a material. `campusLayout.ts` hands the map a copy of a
dedicated hall carrying its school, which `motifOf` and `materialOf` read.
The school is in the layout key, so the look changes the week the hall is
dedicated, even for a hall a donor named. Founders Hall keeps its clock
tower whatever it holds.

## PR 25C — Research buildings by discipline

- **Every research facility has a discipline's look,** not only the four
  already restyled:
  - an observatory with a tall drum and dome for physics;
  - glasshouses on the biology labs;
  - a clinic front on the neuroscience labs;
  - flues and extraction on the chemistry and chemical engineering labs;
  - a test hall on the civil, mechanical and aerospace labs.

**As implemented:**

- **Motifs by discipline:** the civil, mechanical and aerospace labs are
  clear-span test halls (`hangar`). The neuroscience labs are a clinical
  `block`.
- **`labFeatureOf`:** physics carries an observatory (a stone drum eight
  metres high and a dome with its shutter slit toward the camera), biology a
  glasshouse along the roof, and chemistry and chemical engineering three
  fume flues.
- **Only the electrical engineering labs** stay a plain works building.
- **Profile, Year 40:** 55.1 fps at 4×, unchanged.

## PR 25D — Grand landmarks

- **A new milestone, "A national name"** (prestige 90), opens a choice of
  three grand landmarks: a campanile, a great dome and a triumphal gate.
- **Choosing one closes the other two.** It is a three-year build, drawn in
  visible stages (footings, the lower half, the whole), with a large
  payoff:
  - a share of prestige's campus-life input;
  - a one-time lift to the applicant pool;
  - an upkeep.
- **Bespoke art for each.** The campanile and the dome rise over their
  stages. The gate is a triumphal arch with the college's name on it.

## PR 25E — Roof parts that read

- **Flues on the dining halls and the labs, balconies on the four-storey
  and high-rise dorms, flagpoles on the civic buildings** (V2 #42).
  Nothing is added that does not read at the default zoom.

## PR 25F — Balance and docs

- **The slow suites** on unchanged bands.
- **`docs/architecture/buildables.md`:** the signatures, the landmarks and
  what was deferred.

## What this plan does not do

- **v2's amenities and small landmarks** (the chapel, museum, café,
  bookshop, statue, fountain, gate, garden, bell tower) land in Phase E,
  with the beauty they exist to produce.
- **Graduate halls as capital projects** land in Phase L, with the
  capital-project mechanic.
- **Storeys that add capacity** are Phase E's.
