# Plan 30 — The alumni

*Planning document only. Its job is to turn Phase I of the v2 merge
(alumni and advancement, `loumiy/unischool-v2`'s `docs/MIGRATION_PLAN.md`)
into a sequence of PRs.*

**Status: In progress.**

---

## 0. The finding

This game forgets its graduates the summer they leave. Money from
outside is a reputation dividend (donors in the abstract, by prestige) and
an endowment campaign that converts cash into endowment at a match. The
owner's decisions (v2's `docs/V1_ADOPTION_LIST.md`):

| # | Decision |
| --- | --- |
| V2 #21 | Class memories: each graduating class is stamped with a line about its four years, which sets its warmth for good. |
| V2 #22 | The annual fund and reunions: warm classes give, a reunion nudges warmth, capped. |
| V2 #23 | Campaigns with resonance and restricted gifts, replacing this game's endowment campaign. |
| V2 #9 | Gift-financed buildings: the third way to pay (deferred here from Plan 27). |

## Rules for this plan

- **The ledger is read, never invented.** A class's memory comes from the
  facts of its four years, which this game already keeps: the history
  rows, the distress ladder's record, the buildings' `builtYear`, the
  founded schools, beauty.
- **The annual fund is new money, so it moves the harness.** It lands in
  its own PR, and the slow suites run after it. The reputation dividend
  (donors by prestige) is where outside giving lived, so the fund takes
  over the part of it that is alumni, not stacks on top.
- **Campaigns replace the endowment campaign,** so the harness's campaign
  policy moves to them in the same PR.
- **Content lives in data:** the memory clauses and the campaigns, ported
  from v2's `alumni.json` and `campaigns.json`.

## PR 30A — The plan

This document.

## PR 30B — The ledger

- **At each commencement the graduating class is stamped** (`GameState.
  alumni`): its size, satisfaction, quality, the memory clauses its four
  years earned (loudest first), and warmth from 0 to 100.
- **The clauses** are v2's twenty, each on a condition this game can
  read: happy, unhappy, well or poorly taught, the building years, a new
  school, freeze, austerity, receivership, deficits, a handsome campus.
- **The History tab** lists the classes with their line and warmth.

**As implemented:**

- **Fourteen of v2's twenty clauses.** The six this game cannot read are
  left out: losing beds to a demolition, a renovation's scaffolding, a
  closed department, the cuts, and graduates' outcomes (distinguished,
  adrift).
- **History rows now record** the distress ladder's worst rung each year
  and the schools founded by its close, so the ledger can read a class's
  four years after the fact.
- **"Thinned"** compounds each year's attrition rate over the class's
  years. The yearly attrition figure is the whole college's, not one
  class's.
- **Warmth** is 50 for an ordinary class (60 satisfaction, 60 teaching),
  moved half and three tenths of the distance from there, then by its
  clauses. v2's sum of the raw readings put every good college's classes
  at the ceiling on this game's scales.

## PR 30C — The annual fund and reunions

- **Each class gives a year,** by size, warmth, means and years out, paid
  weekly as an "Annual fund" line.
- **The reputation dividend** gives up the alumni share it stood in for.
- **A reunion** is offered every five years for a class: it costs per
  head and nudges warmth, capped.

**As implemented:** v2's figures ($220 an alum a year, twenty years to
full giving, 15% the year they leave), with one change: a class gives from
its second year out. That also keeps the summer's projection exact, since
the class stamped at commencement gives nothing in the year the
admissions panel prices.

The reputation dividend is left alone. At $900 a prestige point a year it
was never the donors it names, so the fund does not replace it; it is new
money. A reunion costs $90 a head and adds 4 warmth, 12 at most over a
class's life.

## PR 30D — Campaigns

- **v2's six campaigns,** each with a kind (building, endowment, aid), a
  target, a term, a condition, and the memory clauses it resonates with.
- **One runs at a time.** It takes each class's response for its term,
  and asking cools the ledger a little.
- **What it raises is restricted to its kind:**
  - endowment money goes into the endowment;
  - aid money funds the tuition discount;
  - building money finances buildings (PR E).
- **The endowment campaign's action and panel are retired.** A save with
  campaigns run keeps their count.

**As implemented:**

- **Five of v2's six campaigns.** The aid campaign has no aid budget in
  this game to restrict its money to.
- **Conditions in this game's terms.** v2's "three to a room" is a housing
  score under 70.
- **A campaign needs a VP of Advancement** (Plan 28), as in v2.
- **A title year lifts every response by a quarter,** the endowment
  campaign's Plan 21 lift carried over.
- **The target is set at launch:** 90% of what the ledger is expected to
  give over the term, so a campaign can miss it.
- **The harness never appoints a seat, so it never campaigns.** Its
  late-game sink is now a transfer into the endowment (Plan 27B), the
  same move without the old donor match.

## PR 30E — Gift-financed buildings

- **A building can be paid for from restricted building gifts** when they
  cover it: the third way to pay, beside cash and a loan.

**As implemented:** financing is a mode (`'cash' | 'loan' | 'gift'`,
`finance/treasury.ts`). The map and the build popup take gifts first,
since restricted money can be spent on nothing else, then cash, then a
loan. The tile says "from gifts". Courses are never paid from them.

## The harness, re-measured

- **The annual fund is new money,** and the old campaign's donor match is
  gone from the harness's sink. The endpoint and regression suites pass
  unchanged. The reference bands are re-recorded.
- **Two hand-written ceilings move, each with a note:**
  - The Balanced builder's year-50 margin, to 45%. It read 42% at the
    default seed.
  - The idle college's year-50 cash, to $75M. It read $53M: even a few
    hundred graduates give.
- **The late margin has risen in two plans running:** retirement in
  Plan 29, the fund here. V1-25's worry is real on the merged harness,
  and Phase N owns it.
