# Plan 26 — The estate

*Planning document only. Its job is to turn Phase E of the v2 merge (the
estate and layout, `loumiy/unischool-v2`'s `docs/MIGRATION_PLAN.md`) into a
sequence of PRs.*

**Status: In progress.**

---

## 0. The finding

Until now the map has been cosmetic: the invariant suite forbids any tick
system from reading placements, paths or trees. Phase E is where that ends
on purpose. The owner's decisions (v2's `docs/V1_ADOPTION_LIST.md`):

| # | Decision |
| --- | --- |
| V2 #36 | Backlog from underfunded maintenance, visible weathering, failure events, renovation under scaffolding, added storeys. |
| V2 #28 | Buildings 25 years and older can be declared Historic: prestige, warmth and ivy, costlier upkeep. Founders Hall can't be demolished. |
| V2 #33 | Beauty from greenery, landmarks, condition and quads feeds applications and satisfaction. Small pairing bumps. Every layout effect capped at about 12%. |
| V1-13 | Beauty moves the applicant pool. |
| V1-21 | Building condition and campus beauty become weighted inputs to prestige. |
| V2 #44 | Streaks, lost slates, boarded windows, weeds and a fence for derelict buildings; ivy on historic ones. |
| V2 #48 | Trees count toward beauty. |

This game already charges every finished building an upkeep
(`effects.upkeepPerWeek`, served-population based), and renovates the
library and the venues in place. What it lacks:

- a choice about how much of that upkeep to pay;
- a cost to paying less;
- any reason for the layout to matter.

## Rules for this plan

- **Neutral by default, then measured.** Condition, storeys and historic
  status all start at a no-op: full maintenance funding, no extension, no
  declaration. The harness never touches them, so they are
  balance-neutral. Beauty is the one change the harness cannot avoid,
  since its campuses have trees, quads and buildings. It lands alone, in
  its own PR, and the slow suites say what it moved. Bands that move are
  re-recorded with a note, as Plan 22's were. Phase N re-derives them all.
- **One module reads the map for the simulation:** `src/systems/estate/`.
  The invariant suite's rule becomes "no tick system but the estate reads
  placements, paths or trees".
- **Every layout effect goes through one capped aggregation.** Beauty's
  swing on the applicant pool and the pairing bumps together never exceed
  12%.

## PR 26A — The plan

This document.

## PR 26B — Condition and maintenance

- **`finance.maintenanceFunding`** (optional, default 1; 0 to 1 in steps of
  0.05), set in the Treasury tab. The upkeep line charges this share.
- **Backlog:** what goes unpaid becomes a building's backlog
  (`Buildable.backlog`, optional), which compounds at 6% a year.
  **Condition** is 1 − backlog ÷ (half the building's cost), from 0 to 1.
- **`RENOVATE_BUILDING`** pays the backlog plus 5% of the cost, and puts the
  building under scaffolding for eight weeks while it stays open. Condition
  is restored when the work finishes.
- **The map ties weathering to condition:**
  - streaks under 0.75;
  - lost slates under 0.5;
  - boarded windows under 0.25;
  - weeds and a fence when derelict (under 0.1).

  Age alone still streaks a building, as in Plan 24.
- **The building panel** shows condition, backlog and the renovation offer.

**As implemented:**

- **`systems/estate/estate.ts`'s `tickEstate`** runs after `tickFinance`,
  which charges each building's upkeep at the funding share
  (`upkeepShare`).
- **Condition's ruin line** is half a building's cost, with a $400,000
  floor for the buildings that cost next to nothing.
- **Dorms carry no upkeep line.** Their running costs are netted against
  room fees elsewhere, so the dial does not reach them and they keep no
  backlog. Giving dorms an upkeep would move every band, so that is Phase
  N's to decide with the rest of the economy.
- **The Treasury tab has an Estate panel:** the funding dial, mean
  condition, the total backlog, and the five worst buildings, each with its
  renovation. The building panel shows the same line for one building.
- **Weathering** takes the worse of age and condition. Boarded windows,
  weeds and a fence are new bands. A building under renovation wears
  scaffolding over its whole height, and no weathering.
- **Balance-neutral:** at full funding `tickEstate` writes nothing, and the
  fast suite and the harness see the same upkeep.

## PR 26C — Storeys

- **`EXTEND_BUILDING`** adds a storey to a dorm or a dining hall, up to two:
  - a quarter more capacity each;
  - 40% of the build cost;
  - twelve weeks under scaffolding off the roof, open throughout.
- It generalises the library's renovation (`floorsAdded`, `renovatingFrom`)
  rather than adding a second path.

**As implemented:** not the library's path after all. That path sends the
building back to 'developing', and finishing re-applies its effects, which
would add a dorm's beds a second time. A storey runs its own countdown
(`Buildable.extensionWeeks`) in `tickEstate` instead. On completion it
counts in `floorsAdded`, which the drawing already turns into floors. A
dorm adds a quarter of its built beds to capacity. A dining hall serves a
quarter more, at the same upkeep per head. Both stay open throughout,
under scaffolding on the map. The building panel offers it.

## PR 26D — Historic status

- **`DECLARE_HISTORIC`** on a building standing 25 years or more
  (`builtYear`). A historic building:
  - adds 0.03 to prestige's campus-life input, up to five buildings;
  - costs a quarter more to keep;
  - wears ivy on the map.
- Founders Hall can be declared from year 25 like any other.

## PR 26E — Beauty

- **`systems/estate/beauty.ts`:** a score from 0 to 100 out of four weighted
  shares of a target:
  - greenery: trees against 60% of the founding woodland;
  - landmarks: the grand landmark, plus Phase D's deferred amenities as
    they arrive;
  - upkeep: mean condition;
  - enclosure: detected quads' quality.

  It is scored once a week, from the same layout the map draws.
- **Where it goes:**
  - the applicant pool, neutral at 50, at most ±12% through the layout cap;
  - prestige, as a new weighted input (V1-21), neutral at 50.
- **The Estate panel** (Treasury tab) shows the score and its four terms.
- **The slow suites run,** and any band beauty moves is re-recorded with a
  note.

## PR 26F — The small landmarks and amenities

- **v2's deferred amenities, as beauty-bearing Buildables:** a chapel, a
  statue, a fountain, a formal garden and a bell tower, gated on the ladder
  and cheap. Each has bespoke art from the existing motifs.
- **None carries a satisfaction attribute,** so the harness never builds
  them.

## PR 26G — Pairing bumps

- **Small, capped bonuses for sensible neighbours:**
  - a dorm within six tiles of a dining hall;
  - a hall within eight of a library;
  - a quad bounded by a hall.

  Each lifts its satisfaction attribute by at most 2 points. The total
  goes through the layout cap.

## What this plan does not do

- **Failure events** (a boiler, a roof) are Phase K's, with the other
  events.
- **Demolition politics** are Phase K's.
- **Upkeep rising with age** is Phase N's to tune.
- **Debt and gift financing** are Phase F's.
