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

**As implemented:** the removal landed as written. Two things this PR was
told to take with it did NOT land here, and the reason is the same in both
cases: they belong to deleting the FORK, which is PR C, not to deleting the
SUBSIDY, which is this.

*The Public flagship strategy was kept, not retired — deliberately, and it
is what made this PR measurable.* Retiring the strategy in the same PR that
removes the income it was built on would have measured nothing. Kept, it
gives the actual answer:

| Public flagship | Before PR B | After PR B |
|---|---|---|
| year 1 net/wk | 79k | 26k |
| year 20 prestige | 104.1 | 74.6 |
| year 20 enrolled | 52k | 18k |
| year 20 courses | 390 | 294 |
| year 40 prestige | 146.4 | 136.8 |
| year 40 endowment | 19.32B | 2.44B |
| weeks in the red | 0 | 0 |
| min cash | 270k | 226k |

The finding is that **the subsidy was an EARLY-game mechanic wearing a
late-game costume.** Two thirds of this school's year-1 weekly net was the
appropriation, and that money was buying curriculum — which is the
90-weight prestige term, which compounds for the next forty years. Hence a
school that is 30 prestige points behind at year 20 and has still not fully
closed the gap at year 40. It never goes into the red and min cash barely
moves, so "stall, don't die" holds; what it loses is not solvency but pace.
That is the honest cost of answering the backlog's question with "nothing",
and it is worth writing down rather than tuning away. The strategy is
retired in PR C, where `schoolType` stops existing and it can no longer be
expressed.

*The state-capital-match event was left alone.* This plan said to retire it
here because it "has no eligible population left" — which is simply wrong:
`schoolType` survives until PR C, so public schools still exist and the
event still fires for them. Nor is it incoherent in the meantime; real
public systems fund operations and capital through separate channels, so a
school with no appropriation that can still win a legislative capital match
is a coherent thing for one PR. It becomes PR C's problem unavoidably, since
`s.self.schoolType === 'public'` stops compiling there. **Recommendation for
PR C: widen its gate rather than delete it.** It is decent authored content
at weight 7, a state capital match is something private universities really
do win, and keeping it preserves a little of the public-money flavour as
something emergent rather than as a founding fork — which is what
progression.md's "archetypes emerge, they are not chosen" wants anyway. It
needs a prompt reword (it currently says "another campus in the system"),
and widening it adds an income event to six strategies that do not have it
today, so PR C should measure that on its own.

The net effect is a cleaner split than this plan drew: **PR B removes one
income line and measures it; PR C deletes the fork and everything that only
existed to describe it.**

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

**As implemented:** landed as written, plus three things the plan did not
name.

*`schoolTypeData.ts` is renamed `foundingData.ts`.* A file named for school
types that contains none is a trap for whoever opens it next. Mechanical —
one `git mv` and about sixteen references, six of them imports and the rest
comments.

*`BASE_STARTING_REPUTATION` + `prestigeBonus` collapse into one
`startingReputation: 50`.* With a single preset the two numbers had nothing
left to add up.

*The state-capital-match event was WIDENED, not retired — and it is the only
economic change in this PR, so it was measured on its own.* Widening is not
additive: the decision-event pool is weighted, so making one more event
eligible reshuffles which others fire, and every strategy moved. At year 40:

| Strategy | prestige | weeks in the red | min cash | match fires |
|---|---|---|---|---|
| Balanced builder | 139.4 → 133.9 | **0 → 110** | 233k → -12.27M | 3 |
| Curriculum rush | 142.5 → 142.9 | 254 → 254 | unchanged | 0 |
| Discount volume | 77.3 → 85.7 | **509 → 198** | -49.5M → -46.5M | 5 |
| Completionist | 143.7 → 140.0 | **156 → 9** | -46.3M → -885k | 2 |
| Overbuilder | 73.1 → 74.1 | 557 → 733 | -85.3M → -113.9M | 4 |
| Idle | 37.5 → 37.8 | 0 → 0 | unchanged | 8 |

Mixed rather than uniformly bad — two strategies spend far *less* of the run
underwater — and every one of them ends richer. The line worth explaining is
Balanced builder, the reference "intended line of play", going from never in
the red to 110 weeks of it. The mechanism is `chooseEventOption` in
`sim/balanceSim.ts`: the harness takes **the first choice it can afford**,
testing only `cost <= cash`. Committing the match costs three weeks of opex
in one lump, so a school sitting just above that commits and is left with no
buffer. That is the pre-existing harness policy applied to one more event,
not new behaviour — and `balance-regression`'s solvency gate still passes,
because it measures year 20 and because a mid-expansion trough that ends at
1.15B is exactly the case its own `solvent()` comment describes. The strategy
takes the trade three times in forty years, dips, and comes out ahead.

**A finding worth its own line: the harness has `courseAffordabilityAware`
for courses and nothing equivalent for events.** Its course logic refuses
commitments its cash flow cannot carry; its event logic does not. That gap
was invisible while the only lump-sum event was gated to one school type.
It is not this plan's to fix, but it is the reason Balanced builder's arc
looks the way it does above, and anyone re-fitting these numbers should know
it is a harness policy rather than a property of the game.

*The Public flagship strategy is retired here*, as this plan said, now that
`schoolType` no longer exists to express it. `balance-regression`'s
"growth isn't optional" check named it as one of three strategies; it is
replaced with Completionist rather than left at two, since a check that
quietly loses a third of its coverage because a strategy was deleted
elsewhere is a weakened check pretending to be an unchanged one.

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

**As implemented:** invisible, and proved twice — `building-spec.test.ts`
goes from 84 checks to 107, and `npm run sim`'s output is identical row for
row (the only diff between runs is rolldown's own chunk size and build time).

Three departures.

*`trimFor(v)` is `stoneFor(v)`, and returns all three stones.* Nothing ever
wants the trim alone: a motif reaching for it is drawing masonry, and the
gilding and the clock tower's stone are the same decision made about two
smaller pieces of it. They travel together, so they are one `StonePalette`.

*`Vernacular` lives in `state/types.ts`, not `buildingSpec.ts`.* It is a
saved fact about the school rather than a drawing detail, and
`buildingSpec.ts` already imports `Buildable` from there — so this is the
dependency direction that already exists rather than a new one.

*The threading is explicit, not context.* `TRIM`, `GILT` and `TOWER_STONE`
were module constants read at 26 sites inside six components
(`EntranceSteps`, `EndPavilion`, `Portico`, `Piers`, `Canopy`,
`ClockTower`). The repo uses no React context anywhere, and introducing it
for this would be a new architectural pattern to carry forever; instead
`stone` flows exactly as `material` already does — `CampusMap` →
`PlacedBuilding` → `BuildingMotif` → `BuildingMass` → the six.

**The one real trap, found while wiring it and now pinned by a test:**
`BuildingMotif` is memoised on *reference* equality (`a.material ===
b.material`), and `CampusMap` resolves the palette once per building per
render. Both `materialsFor` and `stoneFor` therefore have to return objects
held on the `VERNACULARS` table rather than building fresh ones — "tidying"
either into an object literal would silently make every pane on the campus
re-reconcile on every mouse move, which is precisely the cost the memo
comment says it exists to avoid. Section 13 asserts the identity directly,
so the next person to tidy it gets a failing test instead of a janky pan.

Section 13 also asserts that every entry in `VERNACULARS` supplies all seven
walls and all three stones. That is trivial with one vernacular and is the
point of the block with four: a set that forgets `clinical` would draw the
teaching hospital as `undefined`, and the first anyone would know is a blank
building on the map.

### PR E — Roof and openings become vernacular-keyed

`RIDGE_METRES`, `PARAPET` and whether there *is* a parapet go per-vernacular.
`windowShapeOf(v)` yields `'rect' | 'arched' | 'lancet' | 'slot'`, as one
branch inside `windows()`. Still one vernacular, still a no-op.

**As implemented:** a no-op again, proved the same two ways —
`building-spec.test.ts` goes 107 → 170 checks, and the sim is identical row
for row. `VernacularPalette` is renamed `VernacularSpec`, since it now holds
roof metrics and an opening shape as well as colour.

*The wrappers carry the vernacular itself, replacing PR D's resolved
`stone`.* PR D passed a `StonePalette` down because colour was all that
varied. PR E needs the ridge, the parapet and the window shape too, and
threading four resolved values is four chances to pass a mismatched set —
so one string goes down and `BuildingMass` resolves what it needs at the
point of use. This is the sort of correction the three-no-op sequence exists
to surface cheaply.

*The invariant six are now enforced, not described.* PR D stated them in a
comment. That was not enough: `windows()` is reached from eleven call sites
covering a mix of varying and invariant motifs — the residential tower's
podium and shaft, the hospital's ward slab, and a shared tail branch serving
`portico`, `pavilion` and `residential` alongside `hangar` and `works`.
Deciding per-call-site would have meant re-making the judgment eleven times.
Instead `VERNACULAR_INVARIANT_MOTIFS` is a real list in `buildingSpec.ts`,
`paneShapeOf(t, v)` returns `'rect'` for anything on it, and the renderer
asks once per building. Section 14 asserts every invariant motif in the
catalogue keeps rectangular openings, and that no vernacular's
`ridgeMetres` names one of them — so a future set PR cannot quietly pitch a
roof onto the gym.

*`windowOutline` implements all four shapes now, not just `rect`.* Writing
only the used one would have left PR G doing both "add Gothic" and "invent
lancet geometry", which is the coupling this phase exists to prevent. The
outlines are pure `(u, v)` geometry with no JSX, so they are testable
without rendering: section 14 pins that every shape stays inside its own
bay, and that it reaches both its sill and its head — the second check
existing because an arch drawn upside down passes the first one.

**Worth knowing for the set PRs: `npx tsc -b` does not typecheck `test/`.**
The tsconfigs include `src`, `sim` and `vite.config.ts` only, and rolldown
bundles the tests without checking them. Two `ridgeOf(hall)` call sites kept
their old one-argument form through a clean typecheck and a clean lint, and
surfaced only as a runtime `TypeError` when the suite actually ran. Changing
a signature that tests touch means running them, not trusting the compiler.

### PR F — The ornament table

`PARTS[vernacular]`, naming what fills the entrance slot, the eaves slot and
the apex slot, and which of the five varying motifs read it. The six invariant
motifs opt out explicitly, with the reason in the comment rather than in a
plan nobody will open again. Georgian's row is today's `Portico` /
`CentrePavilion` / `EndPavilion` / `ClockTower`.

**As implemented:** a no-op, proved the same two ways — 170 → 225 checks,
and the sim identical row for row. Phase 2 is done and every one of its
three PRs was provably invisible.

*There is no eaves slot.* The plan named three; only two of them were real.
How a wall meets its roof was already answered by PR E's
`VernacularRoof.parapet` — a positive parapet is a Georgian eaves, zero is a
Gothic one — so an eaves slot would restate one fact in a second place, and
two places that must agree is the exact failure this table exists to
prevent. The third real slot turned out to be the **roofline end**: Georgian
raises a small pavilion at each end of a hall's roof, and a Gothic gable
closes itself and wants nothing there. So the slots are `entrance`,
`rooflineEnd`, `apex`.

*The entrance slot is keyed per motif, not per vernacular alone.* Georgian
already varies it — a hall gets a portico, the civic set gets a colonnade
(it does not have an entrance, it *is* one), a dining hall gets a canopy. A
single per-vernacular entrance would have flattened a distinction the campus
already draws.

*Unimplemented parts are named but not drawn — the opposite of PR E's
call, on purpose.* `EntrancePart` and `ApexPart` name `porch`, `arcade`,
`recess`, `spire`, `campanile` and `core`; only Georgian's three have
geometry. PR E wrote all four window outlines because an outline is a dozen
lines of pure `(u, v)` arithmetic checkable without rendering; a spire is
eighty lines of iso SVG checkable only by looking at it, and writing three
blind would be inventing three buildings nobody has seen.

What makes that safe rather than sloppy is `IMPLEMENTED_*_PARTS` plus a
test asserting every part a vernacular in `VERNACULARS` names is on those
lists. **Verified adversarially rather than assumed:** flipping Georgian's
apex to `'spire'` fails two checks, including `vernacular 'georgian' names
apex 'spire', which nothing draws yet`. So PR G adding a Gothic row is
forced to draw what it names.

*The renderer now asks what goes here, not what this is.* The three
ornament branches that read `motif === 'hall'`, `motif === 'portico'` and
`motif === 'pavilion' || motif === 'residential'` now read `entrance ===
'portico'`, `=== 'colonnade'` and `=== 'canopy'`. The fourteen remaining
`motif ===` branches are all **structural** — which mass to build, not what
to decorate it with — and are correctly motif-driven; the set PRs should
leave them alone.

## Phase 3 — The sets

Ordered so that each one tests something the next one depends on.

### PR G — Collegiate Gothic

Grey ashlar, steep slate (`hall`'s ridge goes from 2.2 m to roughly 7), no
parapet, lancet windows, a buttressed entrance porch where the portico was,
and a spire on Founders Hall. **First, because it proves substitution** — it
is still an ornamented campus, just differently ornamented, so it exercises
the table's normal case while the table is still young enough to change.

**As implemented:** it landed as a table row plus two new parts (`Porch`,
`Spire`), which is what Phase 2 was for. Georgian is untouched — sections
13–15 still pass unchanged, and a rendered Founders Hall before and after
is the same building.

**Verified by looking at it**, not by tests alone. Art that cannot be seen
should not be written (PR F's own argument for not drawing a spire blind),
so this PR drove the real app with the pre-installed Chromium, founded a
school and photographed Founders Hall in both vernaculars at the same
camera. Four defects came out of that which no test caught, and three of
them were invisible in the source:

1. **`.iso-dome` and `.iso-finial` hardcoded Georgian gold in `styles.css`,
   silently overriding the vernacular.** A CSS class rule beats a
   presentation attribute, so the `fill`/`stroke` the motifs pass had never
   been doing anything — unnoticeable while gold was the only answer, and it
   painted a Gothic spire's stone pinnacles gold the moment there were two.
   Colour for both now comes from the vernacular; the stylesheet keeps only
   the geometry.
2. **A dark roof flattens its own facets.** `SLOPE` shades a roof's four
   faces *multiplicatively* off one colour, so the near-black slate real
   Gothic wants (#4a5261, tried first) left the brightest and darkest faces
   barely 40 apart and a steep hip read as one flat plate — the exact
   opposite of the set's whole point. The slate is now matched to Georgian's
   facet spread (68.9 against 68.8), which is the number that makes a
   pitched roof legible as pitched.
3. **The roof's inset is a parapet device.** `hall` set its roof back 0.3
   tiles and painted a deck ring underneath, which is a gutter — and with no
   parapet to gutter behind it drew a pale ring all the way round a Gothic
   hall. Both now follow `parapet > 0`.
4. The ridge itself needed to be **13 m, not 7.4**. A hall is 7x5 tiles, so
   a hip has twenty-odd metres of span to climb and a ridge that sounds deep
   in metres comes out gentle on screen.

**Section 16 is the new quality gate, and it earned itself immediately**:
it applies section 12's palette discipline (at most seven walls, three
roofs, every pair of materials 35 apart, every roof 60 from its own wall) to
*each* vernacular rather than to Georgian alone, and it caught two real
defects in the first Gothic palette — four roof tones, and a refectory 32.8
from a hall. It also adds the one rule that only exists once there are two
sets: **the invariant motifs must be made of invariant materials.** A set
that recolours every entry in its `MaterialSet` repaints the gym and the
teaching hospital along with the halls. Measured off the catalogue rather
than hand-listed, because which materials reach an invariant motif is a
consequence of `materialOf`'s switch: as of PR G that is `render`, `curtain`
and `clinical` — and two of those three *also* serve varying motifs, so
"recolour everything the halls don't use" is not a safe shortcut either.

**Follow-up from review, same PR.** Shown the rendered hall, the first thing
noticed was that the doorway looked wrong: windows around it, and what read
as a pair of columns either side. Both had one cause — the Gothic hall was
still being given Georgian's **centre pavilion**, a projecting bay with four
ranks of windows and a classical pediment, with the porch parked in front of
it. The centre bay is part of the **entrance slot** now, so each vernacular
brings its own: Georgian its pavilion, Gothic a porch that *is* the bay
rather than an object standing on the lawn in front of one. The buttresses
moved onto the bay's own front corners, flush with its sides, so they read as
buttresses instead of free-standing columns — which were, of all things, the
one classical element a Gothic entrance must not have.

Two further corrections the fix made obvious once the windows were off: the
arch was a large dark hole (now door-scaled), and a full-height bay carrying
one door was a blank grey cliff. A porch is **lower than the wall it stands
against** — that is most of what makes it read as a porch — so it rises two
thirds and the wall's own lancets show above the gable. `EntranceSteps` now
land at whatever the entrance actually presents, since a porch's steps set
out at a portico's depth float on the grass.

**The screenshot harness is committed** as `tools/makeSave.ts` and
`tools/shoot.mjs` (`npm run shot:save`, `npm run shot`), because it earned
it: six defects across this PR, none of which any test caught. It fast-
forwards the sim's Completionist strategy to get every motif onto one map,
overrides the vernacular on the way out so the *same* campus can be
photographed in each set, and loads it into a headless Chromium through
`localStorage`. The dependency is `playwright-core` rather than `playwright`
so installing the repo does not pull a browser nobody asked for.

**Gothic is not reachable in play yet.** `FOUNDING_VERNACULAR` is still
`'georgian'` and PR K is what puts the choice on the founding screen. That
is this plan's sequencing rather than an oversight — the screen wants all
four sets to show at once.

### PR H — Brutalist

Board-marked concrete, flat roofs throughout, deep-set slot windows with a
reveal shadow, an entrance recessed under an overhang, and a blank stair core
where Founders Hall's tower was. **Second, because it proves subtraction**:
the trim classes need a `none` case, not a recoloured one. `GILT` has no home
in this set and should be *absent* rather than repainted — the campus's one
gilded thing simply is not there, which is a statement about the vernacular.

**As implemented:** subtraction worked as planned — `trim: 'none'` and
`gilt: 'none'` are read by `hasTrim`/`hasGilt` and every band, dome and
finial is *skipped* rather than recoloured. Four things went beyond it, three
of them from review of the rendered building against a photograph of a real
Brutalist block.

*Concrete is not a palette.* The obvious set — seven greys — fails the
palette check outright: every concrete grey sits within 15–30 of every other
one **and** of `render`, which the labs pin to Georgian's value. Real
examples are not monochrome either, so the set pairs pale board-marked
concrete with warm brown brick and a deeper civic concrete. The value order
also **inverts**: in this architecture the library is the most monumental
thing on the campus, not the palest.

*Beige, not grey-green, and ribbons, not slots.* The first pass was tuned
from memory; against the reference it was plainly the wrong century.
`'ribbon'` joins `WindowShape` — it fills its bay **edge to edge** so
neighbouring bays touch and a rank reads as one continuous band of glazing
between two slabs, which is the single most recognisable thing about these
buildings.

*The glazing's colour moved out of the stylesheet into the vernacular.*
`.iso-window` hardcoded a pale translucent fill, and a painted sash reads
pale while a ribbon of curtain glazing reads dark. This is the **same trap
`.iso-dome` sprang in PR G** — a class rule beats the presentation attribute
a motif passes — and it was found the same way, by looking. `StonePalette`
gains `glass`; Georgian and Gothic carry the exact value the stylesheet used
to hold, so neither moves.

*Massing is a fourth axis, and Brutalism needs it.* The set still read wrong
after the palette was right, because these buildings are not decorated
boxes — the decoration **is** the shape. `Massing` (`'solid' | 'stacked'`)
joins the spec, and a stacked hall is a broad base with an upper slab
stepped back on one axis and cantilevered past the other, over a dark
soffit. Two attempts: insetting a middle slab on *all four* sides draws
concentric rectangles, which from this camera is a pancake with a skirt.
Stepping on **one** axis leaves a real L-shaped profile. The invariant six
are always `'solid'` — a gym is one clear span in any century.

**The roof rule met a case it was not written for, and was scoped rather
than skipped.** Section 16 demands every roof sit 60 from its own walls,
which exists so a building does not read as one undifferentiated mass. A
Brutalist building *is* one undifferentiated mass: what you look down onto
is the top of the concrete, and a dark lid was the single wrongest thing
about the first pass. So `hasRoofForm(v)` — **derived**, from having no
pitch anywhere and no parapet, rather than declared as a flag that would
just be a switch for turning the check off — now selects which half applies.
A vernacular with a roof must clear 60; one without must stay *within* 90,
so the "no roof" claim is checked too. Both directions are asserted, and
neither can be quietly relaxed into the other.

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
