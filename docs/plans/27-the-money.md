# Plan 27 — The money

*Planning document only. Its job is to turn Phase F of the v2 merge (money,
`loumiy/unischool-v2`'s `docs/MIGRATION_PLAN.md`) into a sequence of PRs.*

**Status: In progress.**

---

## 0. The finding

This game's money is one pot and one rule. Cash comes in from tuition,
fees, the endowment's fixed 4% and gifts, and goes out on salaries,
instruction, upkeep and building. A college that runs out "stalls, doesn't
die": construction waits, `weeksInTheRed` counts, and nothing else happens.
The owner's decisions (v2's `docs/V1_ADOPTION_LIST.md`):

| # | Decision |
| --- | --- |
| V2 #9 | The treasury: sticker price minus aid, fees, an endowment draw rate, gifts. Buildings financed by cash, debt or gift. |
| V2 #10 | The distress ladder: Sound → Tight → Deficit → Freeze → Austerity → Receivership, with board letters and cuts. No bankruptcy. |
| V2 #11 | The administrative ratchet, from seats only. |
| V2 #12 | Event prices scale with the budget. Moving cash into the endowment is a player action only. |
| V1-25 | The late-game margin: well-run colleges end fifty years with a 42% operating margin. Decide the fix here, measured on the merged harness. |

## Rules for this plan

- **Neutral by default where it can be.** The draw rate defaults to today's
  4%. Debt and endowment transfers are choices the harness never makes.
- **The ladder and the margin fix move the harness on purpose.** Each lands
  in its own PR, runs the slow suites, and re-records any band it moves
  with a note saying why.
- **The administrative ratchet waits for Phase G's seats,** which it is
  made of.

## PR 27A — The plan

This document.

## PR 27B — The endowment draw

- **`finance.drawRate`** (optional, default 0.04; 0.03 to 0.07 in steps of
  0.005), set in the Treasury tab. The endowment pays it out and grows by
  its return less it, as today.
- **`MOVE_TO_ENDOWMENT`:** a player's transfer of cash into the endowment,
  in round sums. Never automatic.

## PR 27C — Borrowing for buildings

- **A second way to pay for a building:** borrowed against the endowment,
  up to 30% of it.
  - A loan is repaid weekly over fifteen years, at 5%.
  - `finance.debt` and `finance.debtRepayment` are optional fields.
  - The repayment is a line in the weekly statement.
- **The build popup offers "borrow"** where cash falls short and the
  borrowing room allows it.

## PR 27D — The distress ladder

- **`finance.distress`** (rung, terms at the rung, runs of surplus and
  deficit terms, board confidence) is closed each term: weeks 1, 18 and 35
  of this game's year.
- **The rungs:**
  - Tight: cash under a term's expenses.
  - Deficit: two deficit terms in a row.
  - Freeze: cash at or below zero. No new construction.
  - Austerity: three terms frozen. The board cuts maintenance to nothing,
    and freezes the tuition discount if one is set.
  - Receivership: three terms of austerity. For three years the interim CFO
    sets the draw rate and the maintenance, and the player keeps the
    curriculum.

  Down one rung a term, up as the conditions allow, and never bankrupt.
- **A board letter at each step that matters,** as a non-blocking note like
  the ladder's (Plan 23). It never stops the clock.
- **"Stall, don't die" becomes the ladder.** The slow suites run, and the
  Overbuilder's bands are re-recorded if its trajectory moves.

## PR 27E — Scaled prices

- **Event prices scale with the budget** (weekly operating cost), so a
  late-game event costs a late-game sum.

## PR 27F — The late-game margin

- **Measure the margin** at years 10, 25 and 50 across the harness.
- **Test the candidate fix** (V1-25): instruction priced per section, and
  salaries rated to prestige.
- **Land what brings a well-run college's fifty-year margin into a
  defensible band,** re-recording the bands it moves.
