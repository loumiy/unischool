# Plan 35 — Balance and playtest

*Planning document only. Its job is to turn Phase N of the v2 merge
(balance and playtest, `loumiy/unischool-v2`'s `docs/MIGRATION_PLAN.md`)
into a sequence of PRs.*

**Status: In progress.**

---

## 0. What was measured

Phase N asks for three things:
- refit the economy, prestige and pacing on the merged harness;
- playtest the first hour;
- write a review.

Everything below was measured on `main` after Plan 34, on the default seed
unless it says otherwise.

### The money, by decade

The Balanced builder, per year:

| Year | Students | Tuition | Endowment payout | Annual fund | Operating margin | Headline margin |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | 1,280 | $20M | $0.2M | — | 26% | 28% |
| 10 | 6,057 | $109M | $0.3M | $0.2M | 35% | 36% |
| 15 | 25,280 | $534M | $0.5M | $1.3M | 11% | 11% |
| 20 | 29,200 | $823M | $0.6M | $6.4M | 1% | 2% |
| 30 | 33,352 | $1.19B | $24M | $29M | 3% | 7% |
| 40 | 33,520 | $1.22B | $237M | $77M | 2% | 28% |
| 50 | 33,520 | $1.22B | $666M | $137M | 2% | 67% |

The operating margin leaves out the endowment payout and the annual fund.

**The late-game margin (V1-25) is the endowment.**
- A mature college's operating margin is 0–3% from Year 15 on. That is
  about what a real one runs.
- The headline margin climbs because the harness moves every spare dollar
  into the endowment. There it compounds at the 5.5% return, and its
  payout comes back as income: $15M at Year 25, $17B at Year 50.
- Research grants add $13.9B over the run, 34% of lifetime operating
  cost. They land as cash, outside the income statement.

**The build era pays for itself at once.**
- The operating margin is 26–35% in Years 5–10.
- The undergraduate catalogue goes from 20 courses in Year 5 to 364 in
  Year 15.
- The harness is never blocked by money.
- #1 comes at Year 15–17 for every strategy that succeeds (Balanced,
  Selective, Regional). All of them hold it for all eleven of the last
  eleven years.

### The economy is bistable

A small change on either side flips a college between a boom and a stall
of a decade or more. These probes change one thing on a copy of the game;
none of them shipped.

| Change | Balanced builder |
| --- | --- |
| Running costs +10% at low prestige | 7 courses for ten years (182 weeks blocked); #1 at Year 23 |
| Running costs +30% at low prestige | 7 courses for twenty years; rank 2 at Year 50 |
| Charges 10% less tuition than the script | 153 weeks blocked in Years 1–10; #1 at Year 32 |
| Charges 20% less | 8 courses for twenty years; rank 17 at Year 50 |
| Course prices ×3 | 14 courses for twenty years; #1 at Year 39 |
| The elite rivals 20 points stronger | #1 two to four years later; nothing else moves |

The same strategy on different seeds lands on either side too. The
Curriculum rush ends at prestige 24 on one seed and 149 on another.

**The founding has no slack.**
- A player a little less efficient than the script can stall for a
  decade. That is exactly the first hour.
- The playtest below saw it: "Year 1 is starved (cash fell from $1.4M to
  $252k); from year 3 it floods."

### The guardrails

`npm run guardrails`: every strategy, fifty years, three seeds.

- **Stops:** 1.3 to 6 a year. v2's complaint was too many; this is fine.
- **Saturation:** no year at or above 95 satisfaction, for any strategy.
  v2's problem is absent here.
- **Event variety in the harness:** 8 or 9 distinct decision events, with
  varsity petitions the most common. The catalogue's letters are counted
  apart.
- **The idle college:** it outranks only the Overbuilder, which is built
  to fail.

### The first hour

A scripted browser playtest was played as a newcomer from a clean
browser to Year 5 (132 screenshots). It found:
- **Bugs:**
  - the History tab showed the chronicle twice;
  - the map's Help overflowed the screen and would not close;
  - the week-5 board letter counted the programs it wanted as "rooms left"
    and named programs never on offer, so its advice could not be
    followed;
  - saves were made only once a year;
  - a log line lost its speaker at "Dr.";
  - the credits named the wrong person.
- **Clarity:**
  - events expired unseen in four seconds at four times speed;
  - "four beats" (there are three);
  - "three Deans" (the Deans are per founded school);
  - housing read "350/175 beds";
  - a Final Report mark of F after the first year.
- **Polish:** clipped labels in Faculty and the Build tray, low-contrast
  dining labels, and a locked speed key that does nothing.

## Rules for this plan

- **Measure before tuning, and tune only what the measurements show.**
  The economy is a threshold system. A global retune moves every strategy
  across the boom–stall line at once.
- **The harness's bands are re-derived, not forced** (the migration
  plan's risk list).
- **A decision that changes the design is written back into the design
  docs** in the same PR.

## PR 35A — The plan

This document.

## PR 35B — What the playtest found

The playtest's bugs and clarity fixes:
- the duplicate chronicle;
- the Help popover: a height limit, and it closes on Escape or an outside
  click;
- the week-5 letter reads the rooms actually free, names only programs on
  offer, and says when Founders Hall can no longer be one school's;
- saves at the turn of each term and when the page is hidden or closed;
- the clock eases to normal speed when an event arrives;
- the summer's three beats, the Deans' wording, and the housing line;
- the draft Final Report from Year 10;
- the log's "Dr.";
- the credits.

## PR 35C — The scorecard reads the operating margin (V1-25)

- **The scorecard's margin becomes the operating margin:** the week's net
  less the endowment payout and the annual fund, over operating cost.
  - The headline margin is kept in the report beside it.
  - The Balanced builder's Year-50 ceiling returns to the operating
    economy's own range. The 75% it had grown to (Plans 29, 30, 32) was
    the endowment.
- **The settled decision (V1-25) is written into `docs/design/economy.md`:**
  - a mature college runs at a few percent;
  - its endowment is the reward for decades of surplus, and grows as a
    real one does;
  - it is not a margin to be taxed away.
- **The guardrails gain the pacing readings:**
  - the year a strategy first reaches #1;
  - the year its catalogue is 80% built;
  - weeks blocked by money in Years 1–10;
  - the last decade's years at #1.
- **The guardrails the migration plan meant as gates become assertions:**
  - no strategy in the harness exceeds twelve stops a year;
  - no year saturates at 95;
  - the idle college outranks none but the Overbuilder.

## PR 35D — A founding with slack

- **The founding gift rises from $1.4M to $3.0M.**
  - With it, a player who charges 10% less than the script's price no
    longer stalls in the founding years: no weeks blocked in Years 1–10,
    and #1 around Year 26.
  - At 15% less, the college still grows (rank 7 at Year 50) where it
    froze before.
  - The strong strategies are not made faster, since they were never
    short of cash.
  - The Overbuilder and the idle college still fail.
- **The harness's reference is re-recorded,** and any claim the change
  moves is re-fitted with its reason written beside it.

## PR 35E — The review

`docs/reviews/2026-09-merge-review.md`, in the shape of v2's reviews:
- how it was tested;
- the verdict;
- intuitive, immersive, progress;
- the numbers;
- what is still open.

## Left for the owner

These are design questions, not tuning. The review will make the case for
each.

- **The build era is too profitable when it works.**
  - A successful college has built its catalogue by Year 15 and holds #1
    from then on. The design's eras put the building at Years 12–35.
  - Every cost lever measured tips the economy into a stall before it
    slows the boom. The fix is a mechanism that smooths the threshold
    (costs that grow with size, not with prestige alone), not a constant.
- **The defend era is uncontested at the cap.** The elite band cannot pass
  a leader held at prestige 150. The no-leapfrog rule makes first place
  permanent once taken.
- **The playtest was a script, not a person.** The migration plan asks for
  a person.
- **The mix has not been heard** (Plan 34).
