# Plan 66 — Pacing targets and the scorecard

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answer

Plan 65's natural player showed a twelve-year sprint and a thirty-eight-year
coast:

- By year 12 it has nearly 30,000 students, every undergraduate program,
  and rank #1.
- A few years finishing the graduate programs follow.
- By year 50 it has gained only about 5,000 more students, and it holds #1
  the whole time.

The owner's ask: the same line of play should reach about its ceilings
around **year 40**. The last ten years can coast, which leaves a buffer for
players who are not playing optimally. Progress is measured by weekly net,
prestige, rank and enrollment.

This plan fixes the targets and builds the scorecard that measures them.
The tuning is the next plan's (§3).

## 1. The PR

- **The targets** (`sim/pacing.ts`), for the natural player, as the median
  of seeds 12345, 4242 and 777.
  - *Growth* is a measure's rise from year 1 to year 50 of the same run, so
    the targets hold whatever the ceilings become.
  - *Ceilings:* the current ones are assumed (34,480 students, prestige
    150, #1, about $18M/wk).
- **When each measure gets there.**

  | Measure | Half its growth | 90% of its growth |
  |---|---|---|
  | Enrollment | Y18–22 | Y36–40 |
  | Prestige | Y18–22 | Y36–40 |
  | Net $/wk | Y20–24 | Y37–41 |

  Rank reaches the top 25 in Y12–16, the top 10 in Y20–25, and #1 first in
  Y34–40.
- **Checkpoints.** Enrollment and net are shares of year 50's value.

  | Year | Enrollment | Prestige | Rank | Net $/wk |
  |---|---|---|---|---|
  | 10 | 17–29% | 72–82 | 25–40 | 10–20% |
  | 20 | 43–55% | 96–106 | 8–15 | 35–50% |
  | 30 | 70–81% | 120–130 | 2–5 | 65–80% |
  | 40 | ≥ 94% | ≥ 145 | 1 | ≥ 90% |
  | 50 | ≤ 5% over Y40 | ≥ 149.5 | 1 | ≤ 10% over Y40 |

- **Steady**, so the checkpoints cannot be met by a sprint and a stall.
  - No year adds more than 8% of final enrollment or 6 prestige points.
  - Each of the first four decades adds 15–35% of each measure's growth.
  - The fifth decade adds at most 10%.
  - After year 5, the net never falls two years running.
- **The buffer.** By year 50 the guided player reaches:
  - at least 85% of the natural player's enrollment;
  - at least 85% of its prestige;
  - a top-10 rank.
- **The scorecard:** `npm run natural -- --pacing` (about 2½ minutes).
  - It plays the natural player on three seeds and the guided player on the
    same three.
  - It prints every target with its band, the median, each seed's value,
    and ✓ or ✗; `-- --out file.md` writes it.
  - It is a report, not a gate, like every balance number since Plan 56.
  - This commit's scorecard is `docs/reviews/2026-09-pacing-baseline.md`.

## 2. The baseline: 14 of 50

Every target from year 40 on is met. Nearly every target before it is
missed, because the college gets there by year 12–17:

| | Target | Now (median) |
|---|---|---|
| Enrollment: half / 90% of growth | Y18–22 / Y36–40 | Y11 / Y17 |
| Prestige: half / 90% | Y18–22 / Y36–40 | Y10 / Y17 |
| Net: half / 90% | Y20–24 / Y37–41 | Y13 / Y30 |
| Rank: top 25 / top 10 / #1 | Y12–16 / Y20–25 / Y34–40 | Y8 / Y10 / Y11 |
| Year 10: prestige, rank | 72–82, 25–40 | 105, 2 |
| Year 20: enrollment share, prestige | 43–55%, 96–106 | 100%, 146 |
| Largest one-year gain | 8% of students, 6 points | 39%, 12.1 points |
| Guided Y50 enrollment, share | ≥ 85% | 63% |

## 3. What drives the sprint, and the levers

The chain behind the sprint:

1. The catalog comes fast.
2. The catalog fills prestige's biggest inputs.
3. Prestige steepens the applicant pool.
4. The pool fills the catalog's seats.
5. The rank follows prestige, and rivals cannot keep up.

The levers, in the order the next plan would try them, one family at a time
with the scorecard rerun after each:

1. **The catalog's pace** (the root).
   - *Halls:* six purchased halls cost $0.75–2.8M, 1.3× each, and only the
     first is gated (by 8 courses). The natural player has all seven by
     year 6 and 42 programs by year 7.
   - *Programs:* founding costs a tier-1 course, $80k, and three offers
     refill the moment one is founded.
   - *Levers:* gate halls 2–6 on enrollment or on founded schools, and
     price them against the college's size, not a fixed ladder. Target
     about half the programs by year 15, every undergraduate program by
     25–30, and the graduate programs by about 35.
2. **Prestige's climb.**
   - *The target:* a baseline of 32 plus weights that can sum to 202
     against a cap of 150. Curriculum breadth (50), concentration and
     teaching (30 each) are all near-full once the catalog is. The target
     hits the cap long before the college is finished.
   - *The rise:* each summer closes 20% of the gap.
   - *Levers:* scale the weights so the target reaches 150 only when nearly
     everything is full; lower the summer rise rate; or both.
3. **The applicant pool's curve.**
   - *The curve:* `prestigePool` is a logistic, 260,000 at its top, midpoint
     103, steepness 0.069. It goes from 29k applicants at prestige 73 to
     130k at 103, and that is what doubles enrollment each year from year 9
     to 12.
   - *The ceiling:* 80 seats per developed course is the only hard cap.
   - *Levers:* flatten the curve or move its midpoint; revisit seats per
     course with the catalog's new pace.
4. **The rival field.**
   - *Now:* the elite rivals start at 87–99, random-walk, and chase the
     player only once it passes prestige 100. The player reaches #1 as soon
     as its prestige clears about 100.
   - *Levers:* have the top of the field rise over the fifty years (the
     elite toward 135–145 by year 40), so #1 takes near-ceiling prestige.
5. **Money.**
   - *Now:* the net mostly follows enrollment, so levers 1–3 move it. Grants
     are 0.4–1.2 weeks of opex on one paper in five, and returned 4.4× the
     research spend in Plan 65's run. The market-rate multiplier's comment
     says 2.5× at prestige 130, but the constant gives 3.4×.
   - *Levers:* grant size, and the scale costs, once the curve is right.
6. **The buffer.** The guided player ends at 63% of the natural player's
   students. Slowing the natural player's catalog closes most of that; if
   not, the guided player's reserve rules are the harness's, not the game's.

**As implemented:** the scorecard runs the guided player on the same seeds
for the buffer, so a full run takes about 2½ minutes: six fifty-year games.
