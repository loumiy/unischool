# Plan 05 — Summer admissions

*Planning document only — no gameplay code is changed by this file. Its job is
to take `BACKLOG.md`'s "Summer admissions" entry — the largest single redesign
in the notes, and a rework of a decision the game already has — and turn it into
an ordered sequence of PRs, each one small enough to land on its own and each
one landing in the order that makes the next one cheaper.*

**Status: In progress.** Seven PRs, A through G. **A, B and C have landed**; D
through G have not. Each one's departures from the plan are noted in the PR
that departed: A, where `tuitionBonus` turned out to have no users and the
balance harness moved a PR earlier than predicted; and B, where scholarships
had a third consumer in `satisfactionSystem.ts`, `YIELD_BASE` had to absorb the
retired yield term, two more pricing-test sections turned out to be unwritable
rather than one, and the balance re-baseline landed on strategies the plan had
not named; and C, where this plan's own verification step turned out to
contradict the PR it was verifying.

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

**As implemented: four departures.**

*Scholarships had a third consumer the plan never enumerated.*
`satisfactionSystem.ts` read the rate as an **affordability** bonus, up to +20
on basic needs — the sharpest attribute in the model, and upstream of word of
mouth and so of next year's applicants. Deleting it would have quietly removed
a gameplay input. It is re-expressed instead, as the same substitution the plan
authorized for `priceSensitivePull`: affordability now scores the price the
body ACTUALLY PAYS against `priceTolerance`. That reading is per-class, not
listed, so a school that has just raised its price still has three classes
cushioned at the old one — PR A's machinery paying for itself one PR later.

*`YIELD_BASE` had to absorb the retired scholarship term.* The plan said delete
`SCHOLARSHIP_YIELD_STRENGTH`; done naively that is not "remove a lever", it is
"halve nearly every school's intake", because the term was worth up to +0.45
against a base of 0.30 and nearly every school ran some aid. The base moved
0.30 -> 0.52, which is what the old formula produced at the rates the game was
actually played at (five of the sim's seven strategies sat at 0.20-0.25). PR C
deletes yield outright, so this is a bridge.

*Sections 4 AND 5 were unwritable, not just 3.* The plan expected to keep 4 and
5 with an argument dropped. Both held net price fixed while moving the sticker,
which one price makes impossible. Section 3 is now "the price-vs-revenue curve
has an interior optimum" (section 4's question, asked of the model that
exists), and section 4 is band-specificity tested by its one clean observable
signature: at equal overreach, a school with more top-band applicants is
shocked LESS, which a band-blind shock could not produce.

That test also cost a wrong assumption, worth recording because it was nearly
shipped: the obvious reading of band-specificity — that overreach raises the
average quality of who enrolls — is NOT an invariant. Two price effects on
composition run opposite ways (sticker shock pushes the mix up, `qualityMix`'s
own tuition shift pushes it down), and which wins depends on prestige: up at
30 and 50, down at 90. Asserting it would have been asserting today's tunings.

*The balance re-baseline landed on the two strategies the plan did not name,
and for a reason it did not anticipate.* Converting each strategy to its old
NET price looked like the identity-preserving move. It is not, because a
sticker and a net price were doing two different jobs and one number cannot do
both: the sticker was ALSO throttling the pool through sticker shock and
`qualityMix`. "Discount volume" lost both throttles, grew to 23k students it
could not fund, and ended insolvent; its price sits between its old two prices
now, which is the only place a single number can sit. "Overbuilder" never
discounted, so it gained the whole `YIELD_BASE` rise, filled its own beds and
stopped being a stress case at all — 8,000 -> 5,500 restores a real trough
inside the 20-year window and a recovery that holds to year 40.

Both were picked by sweeping, and the sweep is the finding: the response is not
monotone. Overbuilder at 6,000 ends year 40 at -86M while 5,500 and 6,500 both
end healthy. Read those prices as samples of a noisy function, not optima — the
same threshold behaviour PR A's note describes, met head-on this time.

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

**As implemented: the verification above was impossible as written, and why.**

*The parity check contradicts the PR.* "At the curve's default rate the class
matches the pre-C funnel within a rounding student" cannot hold while yield is
deleted: pre-C the class was admits x yield (~0.5), so leaving the curve alone
would have roughly DOUBLED every class. The two halves of this PR were written
without noticing they disagreed.

What was done instead: **all four `admitRate` constants were refitted** against
the enrolled share the two-step funnel actually produced, prestige by prestige.
Ceiling 0.92 -> 0.38, floor 0.04 -> 0.055, midpoint 90 -> 100, steepness 0.05 ->
0.06 — not a scaled copy, because the old admit curve and the enrolled share it
produced are different shapes. The fit lands within a few percent from prestige
50 up (-0.6% at 50, -7% at 70, -6% at 90, -1.5% at 110, -0.3% at 130), which is
where a school spends a run. So the *intent* of the parity check is met, by
moving the curve rather than by asserting a thing that could not be true.

*The number's meaning changed, and it had to.* With no yield step, the rate is
the share of applicants who END UP ON CAMPUS, not the share who get a letter.
That is a plainer model and a more realistic reading besides (a real school
admitting 80% at a 40% yield enrolls 32% of applicants). It is safe only because
`prestigeSystem.ts` deliberately does NOT feed selectivity back into prestige —
checked before touching it; had it been an input, this would have changed what
prestige means.

*What deleting yield really cost.* Two losses, neither of them small, both
inherent to what the backlog asked for rather than to how it was built:

1. **A school nobody has heard of is no longer hurt twice.** It used to admit
   nearly everyone AND watch most of them go elsewhere, so the share of
   applicants it actually enrolled peaked in the MIDDLE of the prestige range.
   No monotone curve expresses that, and a player setting the slider is not
   subject to it at all — which is why the refit runs +19% at prestige 30 and is
   honest about it.
2. **A selective school now keeps the whole top band.** Yield was the only thing
   stopping "skim the best" from working: the best applicants had better offers.
   Without it, any school admitting ~10% takes an all-top-band class and scores
   the maximum 90 on incoming quality. That feeds prestige, which feeds the
   applicant pool, so every school runs a little stronger than before.

*The balance harness passes, and one strategy has a known residual.* All 40
checks pass at the 20-year horizon they assert. But the 40-year `npm run sim`
display now has "Overbuilder" — the deliberate stress case — ending deeply
underwater where it used to end solvent. This is loss (2) meeting a strategy
that builds a dorm unconditionally: a richer pool is a bigger bill every year.
A sweep from 5,500 to 11,000 finds NO price that satisfies both horizons (5,500
passes at 20 and dies by 40; 8,500 recovers by 40 but fails at 20; 7,500 and
11,000 show no distress at all), so it was left at 5,500 — the value that meets
the contract the tests actually state — rather than nudged until the display
looked better. Recorded here and in `balanceSim.ts` rather than fixed, because
fixing it means retuning the prestige/quality loop, which is not this PR's job.

*One process note, since it cost real time.* The curve refit was written, lost
to an atomic script that failed on a later edit, and silently not applied. The
symptom was a sim showing 185k-student schools and a balance suite that PASSED
anyway, because its shape invariants are loose at 20 years. Reading the sim
output rather than trusting the green suite is what caught it.

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
