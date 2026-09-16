# Plan 07 — The startup screen, and the campus vernacular

*Planning document only — no gameplay code is changed by this file. Its job is
to turn the backlog's "Startup screen" entry into an ordered sequence of PRs:
retire the private/public fork, give the campus a chosen architectural
vernacular, and make the founding screen show the building the player is
actually founding.*

**Status: Proposed.** Nothing has landed.

---

## What this plan settles before it starts

Three things the backlog left open, decided here so the sequence below has
something to execute against.

**"Motif set" is not what this gets called.** `buildingSpec.ts` already
exports `type Motif` — `hall`, `residential`, `tower`, `portico`, `block`,
`pavilion`, `hangar`, `works`, `grounds`, `bowl`, `village` — and that is
building *typology*, read by two modules and a test. A second axis called
"motif set" would collide with it permanently. The new axis is
**`Vernacular`**: the architectural term for how buildings get built in a
particular place, which is exactly what a whole campus shares, and which
collides with neither `Motif` nor CSS `style`.

**The current set is Georgian, not classical.** The backlog names the default
"classical — stone and columns". What is actually drawn is red brick walls
(`brickRed`), limestone trim, a shallow hipped slate roof set back behind a
parapet, end pavilions, a projecting centre pavilion under a pediment, a
four-column engaged portico, and a white tower with a gilded dome on Founders
Hall. That is **Collegiate Georgian** — Harvard's Yard, William & Mary,
Wesleyan; `buildingSpec.ts` even notes the tower is white "in the reference
photograph". "Stone and columns" describes a *different* set, and one this
plan declines (see below). The default is `georgian`: red brick, white trim, a
clock tower.

**Four sets, not three, and which four.** What survives at the zoom this map
is played at is silhouette, roof colour and wall colour; ornament is a
tiebreak. The four that differ on those three axes:

| Vernacular | Reads as | Why it earns a slot |
|---|---|---|
| `georgian` | red brick, white trim, cupola | the default — what is already drawn |
| `gothic` | grey ashlar, steep slate, towers, lancets | Princeton/Yale/Duke; the only set that changes the *silhouette* |
| `brutalist` | board-marked concrete, flat, deep-set slots, no trim | the only set that *removes* ornament rather than swapping it |
| `mission` | cream stucco, red clay tile, arcades, campanile | Stanford/USC/UCSB; the loudest read at small size, because the roof does the work |

**Beaux-Arts is named and declined.** It is the backlog's "classical", and at
this zoom it differs from Georgian only in wall colour and ornament density.
Two pediment-and-column sets is one too many. **Glass modernism is declined
too**: the map already spends `curtain` on the residential tower and the
natatorium, so a glass campus would read as "every building is the dorm".

## Why this is a plan and not an art commission

The backlog defers this as "a large art commission". That was true before Plan
03 and Plan 04; it is not true now. The renderer is already split into a parts
vocabulary — `Portico`, `CentrePavilion`, `EndPavilion`, `HippedRoof`,
`Canopy`, `Piers`, `ClockTower`, `WallBand`, `windows`, `Door`,
`EntranceSteps` — driven by a spec module that knows nothing about SVG. A
vernacular is four seams through that, not forty-four redrawn buildings:

1. **Palette.** `MATERIALS` and `TRIM` become per-vernacular tables. Cheapest
   change, and it carries most of the read.
2. **Roof.** `RIDGE_METRES` and `PARAPET` go per-vernacular.
3. **Ornament slot.** A table of what fills the entrance, eaves and apex
   slots. Each new part is `Portico`-sized (~45 lines) or `ClockTower`-sized
   (~85).
4. **Openings.** One arch/lancet/slot branch inside `windows()`.

The **first** alternate set is the expensive one, because it is what forces
the abstraction to be right. Every set after it is one PR.

## Six motifs do not vary, on purpose

This is the load-bearing decision, and it is also simply true of real
campuses: a campus in one style is not a campus where everything is in that
style. Princeton is Gothic and its gym is still a shed.

**Invariant across every vernacular:**

- `grounds` — quad, field, courts, diamond, pool. A gridiron is a gridiron.
  Zero work.
- `bowl` — the football stadium. A concrete bowl in every era.
- `hangar` — gym, rec centre, arena, natatorium. Clear-span sheds are
  engineering, not architecture.
- `works` — the labs. `buildingSpec.ts` already calls this wall
  "deliberately the dullest on the map, because that is what these buildings
  are", and that holds whatever the quad looks like.
- `block` — the teaching hospital. A modern hospital is a modern hospital;
  `clinical` stays.
- `tower` — the 5,000-bed residential tower. A late-game apartment tower is
  curtain wall whatever the founding quad is, and it would be actively *wrong*
  for it to grow a Gothic spire.

**Varying:** `hall` (nine of them, and where nearly all the read lives),
`portico` (library, performing arts, gallery), `residential`, `village`, and
`pavilion` on a light touch — the supporting cast should follow the campus
without competing with it. `residential` and `village` share most of their
parts, so the real number is closer to four families than five.

Plus Founders Hall's clock tower, which is one component and the most
legible single thing in any of these sets: cupola, spire, campanile, or
nothing at all.

The invariant six are also the ceiling on how large any set PR can get, which
is what makes Phase 3 estimable.

---

## Phase 1 — The founding fork goes

The backlog asks what replaces the public tuition ceiling: "the subsidy alone,
or nothing." **Nothing.** Both go.

### PR A — The tuition ceiling stops being a school-type fact

`finance.tuitionCeiling` becomes one constant rather than a per-type number.
What is removed is the *distinction*, not the bound: `InterruptModal.tsx`
uses the ceiling as the tuition slider's `max`, and a slider needs a top.

`TreasuryTab.tsx` currently prints a "Tuition ceiling" row, which contradicts
`schoolTypeData.ts`'s own claim that the cap "is still never stated on
screen." Resolve it by deleting the row: a bound that is identical for
everyone and that nothing reaches is not information. The sim's deficit
surcharge clamp points at the same constant. One migration sets every save's
ceiling to it.

**As implemented:** two departures, one of them a correction to this plan.

*The field came off state rather than being reset on it.* The plan said "one
migration sets every save's ceiling to it", which assumed `tuitionCeiling`
would stay on `FinanceState`. It should not: a number identical in every save
forever is not state. `finance.tuitionCeiling` is deleted (SAVE_VERSION 42,
`MIGRATIONS[41]`), `TUITION_SLIDER_MAX` lives in `schoolTypeData.ts` beside
`STARTING_TUITION`, and the two clamps — `reducer.ts`'s `RESOLVE_ADMISSIONS`
and the slider's own `max` — read it from the module. `MIGRATIONS[38]`, which
used to reset the ceiling from the school-type preset, becomes an empty step:
whatever it wrote, `MIGRATIONS[41]` deletes on the same load.

*PR A moves the economy, and PR B is not the only one that does.* The Risks
section below says PR B is "the only PR in the plan that moves the economy."
That is wrong, and measurably so. The sim's Public flagship sits at **exactly
$22,000 from year 16 to year 40** — 25 of its 40 years pinned to the cap,
wanting ~$38k by the close. Removing the cap is therefore not bookkeeping for
that arc, it is the arc:

| Public flagship, at year 40 | Before | After |
|---|---|---|
| tuition | 22k (pinned) | 39k |
| enrolled | 82k | 64k |
| net/wk | 4.09M | 35.00M |
| endowment | 2.06B | 19.32B |
| prestige | 146.2 | 146.4 |
| weeks in the red | 0 | 0 |

Read carefully, this is the change working rather than the balance breaking.
The runs are **identical through year 15** and diverge only where the clamp
used to bite. Enrollment *falls* 22% because `PRICE_SENSITIVITY` does its job
against the higher price. Prestige is flat because it is dominated by
curriculum breadth, which this strategy had already maxed. And every one of
the six private strategies is **byte-identical** before and after — which is
the first actual proof of Plan 05's PR E claim that the 100k ceiling is
somewhere nothing reaches.

What the money explosion really shows is that **the Public flagship strategy
is now mis-specified, not the economy mis-balanced**: `rampTuition(240,
3_200)` was authored against a 22k cap, so with the cap gone the strategy is
just "a private school with a subsidy and a large pool" — which is precisely
what PRs B and C finish deleting. It is retired in PR B. It is left alone
here rather than retuned, because retuning a strategy that is about to be
deleted would be fitting a number to a school type that is on its way out.
`balance-regression` passes unchanged: its one Public flagship assertion is
that prestige beats idling, and 146.4 against 37.5 clears it as comfortably
as 146.2 did.

### PR B — The appropriation goes

`baselineFundingPerWeek` and `appropriationPerStudentPerYear` come off
`FinanceState`; `financeSystem.ts`'s `baselineFunding` term goes with them.
`eventData.ts`'s state-match event is retired — it is gated on
`schoolType === 'public'` and has no eligible population left. `TreasuryTab`
loses its appropriation branch.

**This is the only PR in the plan that moves the economy, and it moves it a
lot.** The sim's "Public flagship" strategy retires, and the arc it measured
loses $5,500 per enrolled student per year — which was that playstyle's whole
economy. Expect the balance-regression baseline to move; re-run `npm run sim`
and re-fit it in this PR rather than letting it drift into the next.

### PR C — `schoolType` comes off state and off the screen

`SchoolType` and `SCHOOL_TYPE_PRESETS` collapse into one `FOUNDING_PRESET`.
`START_GAME` loses its `schoolType` field, `createInitialState` takes only a
name, and the startup screen loses `.startup-types` — which is the slot
Phase 4 wants back.

The surviving starting conditions take **private's** numbers (1.4M cash, +10
prestige, a 150 applicant pool), because those are the arc the remaining sim
strategies are fitted against and so they move least. They are tunable, and
this PR should say so.

**Not re-tuned here:** the founding applicant pool and the admit-rate curve's
early slope touch the same funnel, and re-fitting `admitRate(prestige)` is its
own backlog item with its own `ADMIT_PROBES`. Take private's pool unchanged
and leave the curve alone.

`save-migrations.test.ts`'s "school type survives round trip" assertion
inverts; the migration drops the field.

## Phase 2 — The vernacular seam

Three PRs that are provably no-ops. The point of doing them before any art
exists is that the abstraction gets to be wrong while it is still cheap.

### PR D — `Vernacular` exists, and there is exactly one

`type Vernacular = 'georgian'` in `buildingSpec.ts`, `self.vernacular` on
state, set at founding and defaulted by migration. `MATERIALS`, `TRIM`, `GILT`
and `TOWER_STONE` move behind `materialsFor(v)` / `trimFor(v)`; `materialOf`
gains the vernacular, threaded from `CampusMap`.

The trim classes in `styles.css` (`.iso-plinth`, `.iso-cornice`,
`.iso-parapet`, `.iso-pediment`) are alpha-over-wall, which is convenient —
pale trim works over any wall colour, so Gothic and Mission get it free. It is
*wrong* for Brutalist, which wants no trim at all rather than pale trim. That
is PR H's problem and is flagged here so it is not a surprise.

`building-spec.test.ts` gains a case asserting Georgian's tables equal today's
constants exactly, so this PR is provably invisible.

### PR E — Roof and openings become vernacular-keyed

`RIDGE_METRES`, `PARAPET` and whether there *is* a parapet go per-vernacular.
`windowShapeOf(v)` yields `'rect' | 'arched' | 'lancet' | 'slot'`, as one
branch inside `windows()`. Still one vernacular, still a no-op.

### PR F — The ornament table

`PARTS[vernacular]`, naming what fills the entrance slot, the eaves slot and
the apex slot, and which of the five varying motifs read it. The six invariant
motifs opt out explicitly, with the reason in the comment rather than in a
plan nobody will open again. Georgian's row is today's `Portico` /
`CentrePavilion` / `EndPavilion` / `ClockTower`.

## Phase 3 — The sets

Ordered so that each one tests something the next one depends on.

### PR G — Collegiate Gothic

Grey ashlar, steep slate (`hall`'s ridge goes from 2.2 m to roughly 7), no
parapet, lancet windows, a buttressed entrance porch where the portico was,
and a spire on Founders Hall. **First, because it proves substitution** — it
is still an ornamented campus, just differently ornamented, so it exercises
the table's normal case while the table is still young enough to change.

### PR H — Brutalist

Board-marked concrete, flat roofs throughout, deep-set slot windows with a
reveal shadow, an entrance recessed under an overhang, and a blank stair core
where Founders Hall's tower was. **Second, because it proves subtraction**:
the trim classes need a `none` case, not a recoloured one. `GILT` has no home
in this set and should be *absent* rather than repainted — the campus's one
gilded thing simply is not there, which is a statement about the vernacular.

### PR I — Mission

Cream stucco, red clay tile (the roof slope gets tile courses, which is
`floorCourses`' machinery turned sideways), a round-arched arcade instead of
the civic colonnade, and a campanile on Founders Hall. **Last, because by then
it is pure content** — if D through H did their jobs this PR touches one table
row and draws two parts.

## Phase 4 — The startup screen

### PR J — The facade becomes Founders Hall

`SchoolFacade` is regenerated from the parts vocabulary and reads
`PARTS[vernacular]`, so the picture on the founding screen is the building the
player is about to own.

It stays a **flat elevation**, not the iso mass. The engraved entablature is
the thing that explains "College, not University" without a caption, and an
iso 7×5 mass cannot carry the player's own name legibly at that size. The
facade already draws seven columns, which reads as the seven-tile front.

The backlog flags the facade and Founders Hall as "out of step" because Plan
04's 4A narrowed the hall to 7×5 while the facade has seven columns and
`PORTICO_COLUMNS` is four. They are not in conflict: the facade's seven are
the *whole front*, and the four are the *engaged centre bay*. Recording that
here because "one of them has to move" was the wrong conclusion from the right
observation.

### PR K — Choose the vernacular at founding

Four cards in the slot PR C vacated, and the facade above redraws live as the
player moves between them. This is what PR J was for: the founding screen
already had a preview surface, it just was not previewing anything yet.

The choice is **permanent**. A campus's architecture is what it was built as,
and offering to change it later would undo the one thing the invariant six
motifs are saying.

---

## Out of scope, and why

- **The mascot.** The backlog wants it picked at founding rather than buried
  in Athletics, and also says that "pairs with Athletics V3's own mascot step,
  so these should land together or not at all." Nothing named `mascot` exists
  in the codebase yet. Gating this plan on Athletics V3's schedule would be
  paying a real coupling cost for a dropdown. It stays in the backlog,
  attached to Athletics V3, where the rest of its machinery will be.
- **The admit-rate curve's early slope.** Its own backlog item; see PR C.
- **Beaux-Arts, and glass modernism.** Named and declined above.

## Risks

- ~~**PR B is the economic one.**~~ **Wrong — see PR A's "As implemented"
  note.** PR A is also an economic PR, and for the public arc a larger one
  than PR B: the ceiling it removes was binding on that arc for 25 of 40
  years, while the appropriation PR B removes was never the thing holding it
  down. Both PRs move the same single playstyle, in opposite directions, and
  the honest reading is that Phase 1 as a whole is the economic change rather
  than any one PR in it. If the balance regression moves more than re-fitting
  can absorb honestly, that is still a finding worth writing down rather than
  tuning away.
- **Phase 3 is the only unbounded art.** Each set is one row of a table and
  four or five motif families, and the six invariant motifs are the hard
  ceiling on how large any of them can become. If a set PR starts reaching
  into `hangar` or `block`, that is the signal it has slipped scope.
- **Phase 2's three no-ops are the plan's insurance.** If they are collapsed
  into the first set PR to save time, the abstraction gets designed around one
  example, and PR H is where that bill comes due.
