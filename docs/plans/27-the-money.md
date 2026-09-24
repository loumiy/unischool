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

**As implemented:** `systems/finance/treasury.ts` holds the treasury's
choices. The draw replaces `ENDOWMENT_PAYOUT_RATE` everywhere it was read:
the payout line, the endowment's growth, and a campaign's promised income.
At the default 4% the arithmetic is the old arithmetic to the bit, so the
harness is unmoved. A transfer is offered as a tenth, a quarter and half of
the cash on hand, each rounded down to two figures, and never under
$100,000. The Treasury tab gets an Endowment panel with the draw dial,
what the endowment pays and how fast it grows, and the transfer buttons.
Above 5% it notes the board would think the draw imprudent, which PR D's
confidence reads.

## PR 27C — Borrowing for buildings

- **A second way to pay for a building:** borrowed against the endowment,
  up to 30% of it.
  - A loan is repaid weekly over fifteen years, at 5%.
  - `finance.debt` and `finance.debtRepayment` are optional fields.
  - The repayment is a line in the weekly statement.
- **The build popup offers "borrow"** where cash falls short and the
  borrowing room allows it.

**As implemented:**

- **The loan is the shortfall, not the whole cost.** Cash pays what it can,
  and the loan pays the rest. A tile the cash cannot cover but a loan can
  says "borrow $X", and placing it borrows.
- **Only a college with cash in hand can borrow.** One already in deficit
  cannot, which is where PR D's Freeze will sit.
- **Courses are never borrowed for.** Construction is.
- **Each loan is kept on its own** (`finance.loans`), holding its building,
  balance, level weekly payment and weeks left. A single balance and
  repayment cannot say when one loan ends and another goes on.
- **The payment** is a "Loan repayments" line in the weekly statement and
  part of operating cost.
- **The Endowment panel** shows what is owed and the room left to borrow.
- **Save hygiene** drops malformed loans.
- **The harness never borrows.** With no loans the new line is zero, and
  the harness is unmoved.

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

**As implemented:** `systems/finance/distress.ts`, ported from v2's
`distress.ts` onto this game's weekly tick.

- **The term.** Each week's operating result joins the running term
  (`tickFinance`). `tickDistress` closes the term at the top of weeks 1, 18
  and 35, keyed to the week, so a week the clock holds for an interrupt
  never closes a term twice.
- **The rungs:**
  - Tight: cash under 17 weeks of operating cost.
  - Deficit: two deficit terms running.
  - Freeze: cash at or below zero.
  - Austerity: three terms frozen.
  - Receivership: three terms of austerity, for nine terms.

  Recovery from Freeze or Austerity takes two surplus terms with cash in
  the bank.
- **What the rungs do:**
  - **Freeze and Austerity refuse new construction and borrowing.**
    Courses still start: teaching is not construction.
  - **Austerity** cuts maintenance to nothing. The listed tuition may rise
    at the summer but not fall. The Estate and Endowment dials are the
    board's until it lifts.
  - **The interim CFO** sets the draw to 5% and maintenance to half, and
    builds on cash as anyone may.
  - **Climbing out** hands back the maintenance and draw the college had
    set.
- **The letters.** The board writes on entering Deficit, Freeze, Austerity
  and Receivership, on leaving the last two, and on returning to Sound from
  Deficit or worse. The letters are content in `data/boardData.ts`, shown
  one at a time over the map (`BoardLetter.tsx`, after any milestone's
  note), and never hold the clock.
- **Tight writes no letter** (a judgment call). A growing college's cash
  is often under a term's expenses, and on the harness the well-run
  strategies drift in and out of Tight for decades. The Treasury tab shows
  the rung.
- **The board's confidence** starts at 70:
  - it rises on a surplus term at Sound or Tight;
  - it falls on deficits, freezes, austerity, and a draw above 5%.

  Nothing reads it yet. Phase L's ending is where it will count.
- **Receivership's years** are kept (`scars`) for the chronicle.
- **`weeksInTheRed` is unchanged,** and so is everything that reads it.

## PR 27E — Scaled prices

- **Event prices scale with the budget** (weekly operating cost), so a
  late-game event costs a late-game sum.

**As implemented: already true, so no code.** This game sized its events
in weeks of operating cost long before the merge (`data/moneyScale.ts`'s
`weeksOfOpEx` and `rollAmount`, used throughout `eventData.ts` and
`studentLifeData.ts`). Capital events (a roof, a boiler, a storm) are
priced as a share of what stands, not of the budget: that is deliberate
and pinned by `test/cost-model.test.ts`, since a roof should cost a share
of its building, not weeks of a $20M budget. Loan repayments (PR C) are
part of operating cost, so a college carrying debt pays a little more for
its events, as it would.

## PR 27F — The late-game margin

- **Measure the margin** at years 10, 25 and 50 across the harness.
- **Test the candidate fix** (V1-25): instruction priced per section, and
  salaries rated to prestige.
- **Land what brings a well-run college's fifty-year margin into a
  defensible band,** re-recording the bands it moves.

**As implemented: measured, and no new cost.** The 42% was v2's finding
on v2's cost side. This game already charges the candidate fix:
instruction by the section (`instructionDetail`) and salaries at a market
rate that rises with prestige (`marketRateMultiplier`). Operating margins
(net ÷ income) on the default seed, with the ladder in:

| Strategy | Year 10 | Year 24 | Year 50 |
| --- | --- | --- | --- |
| Balanced builder | 23% | 4% | 8% |
| Regional engine | 11% | 3% | 2% |
| Earnest completionist | 13% | 6% | 26% |
| Scatterer | 19% | 7% | 20% |
| Selective college | 28% | 0% | 48% |
| Completionist | 2% | −1% | −3% |

- **The broad, well-run colleges finish between 2% and 26%.** The build
  era squeezes every one of them to single digits.
- **Only the Selective college ends near v2's figure.** It holds four
  thousand students at the top of the price range, which is the point of
  being selective.
- **So the decision is v1's cost side, kept as it is.** No new cost that
  grows with the college is added. Phase N, which re-derives every band,
  is where the elite margin is revisited if playtests find the defend era
  slack.

## The harness, re-measured

PRs B, C, E and F leave the harness as it was. PR D moves it on purpose:
the ladder is new friction for every strategy that runs out of cash.

- **The unsound strategies** loop through receivership, as a hopeless
  policy should. On the default seed the Overbuilder is scarred nine times
  and Discount volume six. The Curriculum rush is scarred once, in year 9,
  and climbs back.
- **The well-run strategies** touch Deficit at worst. The Balanced builder
  meets one term of austerity in year 19.
- **The reference bands are re-recorded.** The hand-written targets (the
  Balanced builder and the controls) hold without change.
- **Two claims move, each with a note beside it:**
  - The Regional engine's stewardship at seed 777 reads 0.65 before and
    after the ladder, landing either side of the B line by the third
    decimal. The endpoint now asks for a B on two seeds of three and never
    below a C.
  - The Discount strategy's last-decade mean net at the default seed is
    −1.09% of opex against a −1% bar. It is now judged across seeds, like
    the Overbuilder's claims beside it.

## What this plan does not do

- **The administrative ratchet** is built with the seats it is made of, in
  Phase G. The migration plan put it here, but a ratchet of seats needs the
  seats first.
- **Gift-financed buildings,** the third way to pay, spend restricted gifts
  raised for a building. The campaigns that raise them are Phase I's.
  Until then a building is paid for in cash or borrowed for.
