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

## PR 30C — The annual fund and reunions

- **Each class gives a year,** by size, warmth, means and years out, paid
  weekly as an "Annual fund" line.
- **The reputation dividend** gives up the alumni share it stood in for.
- **A reunion** is offered every five years for a class: it costs per
  head and nudges warmth, capped.

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

## PR 30E — Gift-financed buildings

- **A building can be paid for from restricted building gifts** when they
  cover it: the third way to pay, beside cash and a loan.
