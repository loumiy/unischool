# Plan 39 — Demolishing, and calling off

*Planning document only. Its job is to turn the owner's request into a PR.*

**Status: Landed.**

---

## 0. The request

The owner asked for two things:

- **demolishing** a building: free, with no money returned;
- **cancelling** a project mid-construction, with its cost returned.

Neither existed. A building, once placed, stood for good. Its site, its
upkeep and its place in the catalogue could not be changed.

## 1. The decisions

- **Calling off construction** returns the whole cost, and returns it to
  where it was paid from:
  - the building fund, for a building paid from gifts;
  - the endowment's half, for a capital project, with the rest to cash;
  - cash otherwise. When the building was borrowed for, its loan is
    settled out of the refund, so the college ends up as if it had never
    borrowed, less the interest already paid.

  The building is back in the catalogue as available, and its site is
  cleared. Trees its siting felled stay felled.
- **The financing is now recorded.** A building paid from anything but cash
  carries an optional `financing` field while it is going up. The field is
  cleared when the building is finished or called off. It is an additive
  optional field, so, under `persistence.ts`'s policy, the save version is
  not bumped. A save from before this change has no record, and a call-off
  there refunds to cash.
- **A library renovation cannot be called off.** It also reads
  `developing`, but over a standing building. It is an in-place project,
  not a construction.
- **Demolishing** costs nothing and returns nothing, and cannot be undone.
  - The building goes back into the catalogue as its content entry first
    was, so building it again costs the full price and starts it new: no
    backlog, storeys, expansions, donor name, historic status or build
    year.
  - What it granted is taken back where that can be counted: a dorm's beds,
    including those of its added storeys. Its live effects (service,
    satisfaction, prestige, upkeep) stop by themselves, because they are
    read every week from the buildings that stand.
  - What it opened stays open: nothing available ever re-locks
    (techSystem.ts). Demolishing a tier-1 library leaves the tier-2
    library standing.
- **What does not come down:**
  - Founders Hall;
  - a chapter house, which belongs to its chapter;
  - a building declared historic;
  - a hall with programs in it (they must be moved out first);
  - a lab with a research project under way.
- **One grand landmark to a college** still holds. Calling off or pulling
  down the chosen one reopens the other two.
- **The module lives in `state/`** (`state/demolition.ts`, beside
  `placeBuildable.ts`), because it writes placements. The invariant sweep
  keeps weekly systems off the map.

## 2. The PR

- `CANCEL_CONSTRUCTION` and `DEMOLISH_BUILDING` actions, reduced by
  `state/demolition.ts`.
- **The building panel** gains two controls, each of which asks once more
  before acting:
  - on a building going up: "Call off construction · $X returned", with a
    confirmation saying where the money goes;
  - on a standing building: "Demolish…", with a confirmation saying it is
    free, returns nothing and cannot be undone. Where a building may not come
    down, the panel says why.
- **The log** records both.
- **Test:** `demolition.test.ts` covers the call-off under each of the four
  kinds of financing, finishing, demolishing, a dorm's beds and the
  protected buildings.
