# Plan 05 — Summer admissions

*Planning document only — no gameplay code is changed by this file. Its job is
to take `BACKLOG.md`'s "Summer admissions" entry — the largest single redesign
in the notes, and a rework of a decision the game already has — and turn it into
an ordered sequence of PRs, each one small enough to land on its own and each
one landing in the order that makes the next one cheaper.*

**Status: In progress.** Seven PRs, A through G. **A has landed**; B through G
have not. A's departures from the plan are noted in A itself: the dormant
`tuitionBonus` effect, and the balance harness moving a PR earlier than
predicted.

---

## 0. The shape of the redesign, and why the order is what it is

The backlog entry reads as six separate complaints about one screen: less text,
a blind tuition slider, a slow reveal, admit rate as a real decision,
scholarships gone, and the tuition exploit closed. Sorted by what they actually
touch, they are two model changes and one screen, and the screen is downstream
of both.

**The finding that sets the order.** The six notes describe a **three-beat
flow**, and the beats disagree about how much the player is allowed to know:

1. **Tuition — blind.** The slider tells you only whether you are in line with
   your prestige. No applicant interest, no stated cap, no projection. Setting
   it locks it.
2. **The reveal — the payoff.** A slow tick up to the applicant count, slower
   than any other number animation in the game, broken down by cohort as head
   counts.
3. **Admit rate — projected.** The opposite posture: moving this slider moves
   the freshman class, and the panel shows the weekly profit/loss and
   satisfaction that follow, against current capacity and the three older
   classes still enrolled.

That is why "far less text on screen" is not a copy pass that can be done
first. Most of today's text exists to explain numbers that beat 1 is about to
stop showing (`InterruptModal.tsx`'s "Applicant interest", "Sticker shock") and
numbers that beat 3 is about to replace (yield, the reported admit rate). The
text goes away as a *consequence* of the other five notes, so it goes last.

And the two model changes go first, for the same reason in the other direction:
the panel in beats 1–3 is a live preview of `projectAdmissions`, so every hour
spent laying it out against today's funnel is an hour spent twice. Per-class
tuition (A) and the end of scholarships (B) change what that function takes and
returns; admit rate as an input (C) changes what it resolves. Only then is there
a stable thing to draw.

### The map

| Note | Touches | PR |
|---|---|---|
| Tuition per class, following the class to graduation | `types.ts`, `reducer.ts`, `financeSystem.ts`, `techSystem.ts`, `persistence.ts`, `TreasuryTab.tsx` | A |
| Scholarships go away — one rate | `types.ts`, `admissionsSystem.ts`, `reducer.ts`, `InterruptModal.tsx`, `balanceSim.ts` | B |
| Admit rate is the second decision; yield goes away | `admissionsSystem.ts`, `actions.ts`, `reducer.ts` | C |
| Projected profit/loss and satisfaction before commitment | `InterruptModal.tsx`, `financeSystem.ts`, `satisfactionSystem.ts` | D |
| Tuition is a gamble; no stated cap; setting it locks | `InterruptModal.tsx`, `schoolTypeData.ts` | E |
| The reveal | `InterruptModal.tsx`, `AnimatedNumber.tsx` | F |
| Far less text on screen | `InterruptModal.tsx`, `styles.css` | G |

A and B are invisible to the player and land behind the existing screen. C is
invisible except that the modal grows a slider. D through G are the screen.

---

## Open questions, settled before the first PR

**1. Where do four prices live?** `students.classes` is four plain head counts
and `types.ts` says so twice ("each class is a plain head count"). **Proposed:
`finance.tuitionByClass`**, keyed the same four ways, advanced in lockstep with
`students.classes` in the same `RESOLVE_ADMISSIONS` block that already shifts
them (`reducer.ts:619`). Money lives in `finance`, the head counts stay counts,
and the two are advanced by adjacent lines that a reader sees together.

**2. What does a `tuitionBonus` effect do now?** `techSystem.ts:472` adds
straight to the scalar today, which under per-class pricing would be the exploit
wearing a Buildable's clothes — a mid-year build repricing all four classes.
**Proposed: it raises the price the NEXT class is charged**, carried as a
standing adjustment the summer slider opens at, never applied to a class already
enrolled. That is also the only reading under which the effect is a reason to
build the thing rather than a lump of retroactive cash.

**3. What happens to sticker shock when scholarships go?** This is the real
casualty. Sticker shock exists to stop "raise tuition and scholarships together,
holding net price fixed" from being a free lunch — `admissionsSystem.ts`'s
`STICKER_SHOCK_RATE` comment and README both say so, and
`admissions-pricing.test.ts`'s section 3 tests exactly that. With one rate,
sticker *is* net, that exploit cannot be expressed, and the test cannot be
written.
**Proposed: keep the mechanic, retire its justification.** Band-specific
attrition off the listed price is still doing real work that `applicantVolume`'s
own price response does not — it is what makes an overreaching price cost you
the low band hardest, and so what ties price to the *composition* of the pool
rather than only its size. Rewrite the comment and the README paragraph to claim
that and nothing more. The "exploit is closed" invariant does not disappear from
the suite; it **moves** to PR A, where it becomes a test that a mid-stream price
rise cannot reprice an enrolled class.

**4. Does the $100k slider retire `tuitionCeiling`?** Not for free. The ceiling
is not only a cap — it is most of what distinguishes a public school from a
private one (`schoolTypeData.ts:93,103`: $60k against $22k), and the backlog's
own startup-screen entry proposes dropping public/private entirely. **Proposed:
PR E raises the slider's end to $100k for a private school and leaves the public
ceiling in force**, so this plan does not quietly decide the school-type
question on the startup screen's behalf. If public/private does get dropped
later, the ceiling goes with it and E's slider is already the right shape.

**5. Does the reveal show the enrolled mix or the incoming one?** The incoming
one, which is what `cohortBreakdown` already returns. The standing body's cohort
mix would need each class's split stored at admission; that is the
Admissions/History infographic's decision to make, and `BACKLOG.md` records it
there.

---

## PR 05A — Tuition follows the class that paid it

**The exploit.** `finance.tuitionPerStudent` is one scalar
(`types.ts:13`). `financeBreakdown` multiplies it by the whole body
(`financeSystem.ts:284`), and `RESOLVE_ADMISSIONS` overwrites it every summer
(`reducer.ts:604`). So raising tuition reprices freshmen through seniors
retroactively, and the winning line is to stay cheap while the school grows and
then hike — the four classes on the books are captive.

**The change.**

- `finance.tuitionByClass: { freshman, sophomore, junior, senior }` replaces
  `finance.tuitionPerStudent`. The summer decision sets the **freshman** entry
  only.
- `reducer.ts:619`'s advance shifts prices with the counts, in the same block
  and in the same direction: senior takes junior's price, junior sophomore's,
  sophomore freshman's, and freshman takes the new decision. A graduating
  class's price leaves with it.
- `financeBreakdown` sums four products instead of one. This is also the point
  where tuition revenue stops being expressible as `enrolled × price`, so the
  Treasury note that reads that way (`TreasuryTab.tsx:63`) becomes a four-row
  breakdown — which is the honest statement of what the school now charges, and
  the only place the player can see that the seniors are paying 2018 prices.
- `demandSystem.ts:133` and the modal both call `projectAdmissions` with a
  tuition figure; both pass the **prospective freshman price**, since the funnel
  has only ever modeled who is applying *this* year.

**The migration** (SAVE_VERSION 36) is exact rather than a guess: every class in
an existing save really is paying the same scalar, so copying it into all four
entries reproduces the save's own revenue to the dollar. Worth saying in the
migration comment, because it is the rare rename-shaped change that has no
resumed-save cost at all.

**Verification:** a new `test/class-pricing.test.ts` carrying the invariant that
moves here from `admissions-pricing.test.ts`'s section 3 — run a year at
$15k, raise the decision to $45k, and assert the three older classes'
contribution to `financeBreakdown` is unchanged, and that total revenue rises by
exactly the new freshman class times the difference. Plus the balance regression,
which will move: see the note under B.

**As implemented: two departures.**

*The scalar split in two, and `tuitionBonus` had no users.* The plan said
`finance.tuitionByClass` replaces `finance.tuitionPerStudent`; it took **two**
fields, not one. The old scalar was quietly doing three jobs — the price
charged, the slider's opening position, and the target of a `tuitionBonus`
effect — and only the first is per-class. So the listed price became
`finance.listedTuition` and kept the other two jobs, which is also the field
open question 2's answer needed to exist. The question turned out to be cheaper
than it looked for a reason the plan did not know: **nothing in `src/data/` sets
`tuitionBonus` at all.** It is a declared-but-unused effect, so routing it to
the listed price is a contract for a future Buildable rather than a change to
any shipped one. It was routed and commented rather than deleted, since deleting
a designed effect is not this PR's call to make.

*The balance harness moved here, not at B.* The plan predicted the sim would
need a re-baseline when scholarships go. It moved at A. `balance-regression`'s
40 checks all still pass — they assert shape (growth isn't optional, stall
don't die, no strategy permanently sunk, the pinch is real), not snapshots — but
the 40-year runs are visibly different, and in both directions: "Balanced
builder" closes on $281M instead of $410M, while "Public flagship" goes from
closing $16M underwater with 668 weeks in the red to closing $224M up with none.

That is much larger than the ~1% the pricing lag is worth per year, and it is
not a bug — the arithmetic identity is tested twice over (a founded school at
one price bills exactly `enrolled × price`, and the v35 migration reproduces a
resumed save's revenue to the dollar). The sim is a threshold system: every
strategy builds when cash clears a buffer, so a small, permanent change to cash
flow *timing* moves which week a building goes up, and forty years of that
compounds. The direction is not always down, because in this economy building
sooner is often what sinks a school.

The control strategy proves the mechanism precisely. "Idle" charges a flat
$12,000 and moved by +$0.42M over forty years — it was *founded* at $13,000, so
under per-class pricing its three older classes stay on the founding price for
three more years and it bills slightly MORE early, which is the new model
behaving exactly as specified on a school that never changes its price.

## PR 05B — Scholarships go away

**The change.** `AdmissionsSettings.scholarshipRate` is deleted, and with it:
the modal's entire second step and its `scholarshipsRevealed` gate, the
`scholarshipRate` argument to `bandYield` and to `projectAdmissions`, the
`SCHOLARSHIP_YIELD_*` constants, and the net-price/sticker-price distinction
everywhere it appears. Net price becomes the price.

**What this costs, stated plainly.** Scholarships are a genuine lever with a
real-world referent — universities do buy yield with aid — and removing them
removes the only way to court the price-sensitive cohort without lowering the
price everyone sees. The backlog asks for it anyway, on the grounds that two
price dials on one screen is the thing making the screen unreadable. The
`priceSensitive` cohort's pull already reads net price
(`cohorts.ts`'s `priceSensitivePull`) and will simply read the sticker instead —
no retuning, since the two numbers were identical at a 0% rate and that curve is
centered on `priceTolerance`, not on the gap between them.

**The balance harness will move, and should.** Every strategy in
`balanceSim.ts` carries a `scholarships` function (`STRATEGIES`, from line 1054)
and "Discount volume (beds first)" is *defined* by a 50% rate. That strategy
becomes a low-sticker strategy, which is the same archetype expressed the way
the new model expresses it. Expect `balance-regression.test.ts` to need a
re-baseline in this PR, and do it as a re-baseline — recording what moved and
why — not as a threshold nudge.

**Verification:** `admissions-pricing.test.ts` loses section 3 (moved to A in
its per-class form) and keeps 1, 2, 4, 5 and 6 with the scholarship argument
dropped; the balance regression re-baselined with its deltas written down.

## PR 05C — Admit rate is the second decision

**The change.** `admitRate(prestige)` stops being the funnel's own answer and
becomes the slider's **opening position** — what a school of this standing would
normally admit. `RESOLVE_ADMISSIONS` takes the player's rate instead, skimming
from the top of the band distribution until it is used up, exactly as the loop
at `admissionsSystem.ts:424` already does.

**Yield goes away** with it: `bandYield` and `yieldRate` are deleted, and the
freshman class is the admits. The slider then moves class size directly, which
is the whole point of promoting it to a decision — today the player sets two
price levers and watches a class size emerge from four compounding curves.

**The consequence worth keeping.** Admitting deeper means reaching further down
the quality bands, so `avgIncomingQuality` falls as the rate rises, with no new
machinery — the band skim already produces this. That is the cost that makes the
decision a decision, and it feeds prestige, so it is a cost with teeth. Say so
in the code comment; do not add a second penalty on top of it.

**Verification:** extend `admissions-pricing.test.ts` — class size is monotone
in admit rate, incoming quality is monotone *against* it, and at the curve's own
default rate the committed class matches what the pre-C funnel produced within a
rounding student (so this PR is a promotion of an existing number, not a
retuning of it).

## PR 05D — The panel projects the consequences

Beat 3 shows what the committed class does to the school, before it is
committed:

- **Weekly profit and loss** from `financeBreakdown` run against the projected
  body — the three older classes at their own prices (A) plus the prospective
  freshmen at this year's. This is the first screen in the game where per-class
  pricing is visible as money.
- **Satisfaction** against current capacity, via `satisfactionSystem.ts`'s
  housing and basic-needs ratios at the projected head count. A player admitting
  a class their dorms and dining halls cannot carry should see the number that
  says so while the slider is still moving.

Both read the shipped pure functions, the way the modal already reads
`projectAdmissions` — no second copy of either formula. Neither is a new system.

**Verification:** by eye for the layout; a check that the projected weekly net
at the committed rate equals `weeklyNet` on the tick after the interrupt
resolves, which is the only way the panel can lie.

## PR 05E — Tuition is a gamble

Beat 1. The tuition step loses every readout except the one that says whether
the price is in line with prestige (`priceTier`, already built and already
tiered). No applicant interest, no sticker-shock line, no stated cap — the cap
is where the slider ends (open question 4: $100k private, the ceiling still in
force for public). **Setting it locks it**: confirming the tuition step commits
that number and moves to the reveal, with no going back to re-roll after seeing
the pool.

The lock is what makes the beat a gamble rather than a slider people scrub. It
is also, mechanically, the smallest change here — the step machinery exists, as
`scholarshipsRevealed` (B deletes the scholarship step but the two-step shape it
proved is what E reuses).

**Verification:** by eye.

## PR 05F — The reveal

Beat 2, and the payoff the other six PRs are clearing the stage for.

- The applicant count ticks up slowly — **slower than any other number animation
  in the game**. `AnimatedNumber`'s `DURATION_MS` is a fixed 450ms module
  constant; give it an optional duration and pass a much longer one here. Keep
  its `prefers-reduced-motion` path exactly as it is: a reader who asked for
  less motion gets the settled figure, and that is not a lesser reveal, it is
  the same number.
- The **cohort head counts** land with it (`cohortBreakdown`, already returning
  whole applicants that sum to the pool). Whether the seven rows tick in
  together or stagger behind the total is a judgement to make in the browser,
  not on paper.

**Verification:** by eye, and the existing `cohorts.test.ts` sum invariant keeps
the rows honest against the headline.

## PR 05G — Far less text on screen

Last, because it is only now knowable. With beat 1 blind, beat 3 projected, and
scholarships and yield gone, most of the modal's current prose is explaining
numbers that no longer appear: the "Applicant interest (at last year's
scholarship rate — set next)" note, the sticker-shock paragraph, the opening
"Set next year's tuition and scholarships…", and the `outcome-note` on every
row of a `dl` that is about to be three rows shorter.

Sweep the copy, and the admissions log line at `reducer.ts:661` with it — it
still names a scholarship rate and a yield. Then re-read the whole screen
against `README.md`'s "Admissions: an annual summer decision" and update the
spec, which by this point is describing a screen that no longer exists.

**Verification:** by eye, and README read end to end against the shipped modal.

---

## What this plan does not do

- **The Admissions and History infographic** stays in `BACKLOG.md`. It wants the
  enrolled body's cohort mix, which needs each class's split stored at
  admission — a different model change from this one, and one that is cheaper to
  design once per-class pricing has established the pattern of carrying a fact
  alongside a class.
- **Public/private** is not decided here (open question 4).
- **Rival schools and Athletics V3** are untouched. Nothing in this plan reads
  or moves them.
