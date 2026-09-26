# Plan 67 — Pacing the natural line to forty years

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answer

The owner asked for the tuning to run until Plan 66's targets were met, or
were reasonably close where exact hits aren't feasible, then for a report:
which levers changed, and what the natural line's run looks like now.

The scorecard (`npm run natural -- --pacing`, the natural player on seeds
12345, 4242 and 777) went from **14 of 50 to 45 of 50**. The five misses are
all on a band's edge (§3).

## 1. The levers

Five changes to the game. Each had its own run, and each was kept only
because the scorecard improved:

| Lever | Was | Now | Why |
|---|---|---|---|
| **Summer prestige climb**, capped (`PRESTIGE_MAX_RISE`, new) | 20% of the gap, no cap | 20% of the gap, **at most 2.0 points** | The master lever. Prestige used to close 20% of a gap to a target that hit 150 by year 14, so it reached the cap by year 20. With the cap it climbs about 2.3 a year: 76 at year 10, 104 at 20, 128 at 30, 147 at 40. Pool, price, rank and net all hang off it. |
| **Applicant pool** (`admissionsSystem.ts`) | Logistic: 260,000 × 1/(1+e^(−0.069(p−103))) | **Straight line**: 1,000 + 490 × (p − 30) | The logistic quadrupled between prestige 75 and 100, which made years 9–12 double enrollment every year. A line grows the college as steadily as its standing. |
| **Beds' pull on applicants** (`CAPACITY_FACTOR_REFERENCE`) | Full at 6,000 beds | **Full at 2,500 beds** | Beds rose with enrollment and fed back into applicants all the way to year 30, a loop that made demand accelerate. It is now a founding-years throttle only. |
| **Price tolerance** (`priceTolerance`), and the founding price to match | 5,500 + 240 per point; founding price $13,000 | **12,000 + 190 per point**; founding price **$16,000** | A flatter price curve lets net track enrollment instead of lagging it (net reaches half its growth in year 23; in the Plan 66 baseline it was 13). The founding price moved so it stays at the same share of what prestige supports; otherwise every new college reads as a bargain. |
| **The rival field rises** (`fieldRise`, new) | Rivals random-walk; the elite chase the player only above prestige 100 and cannot pass | Every rival also gains **1.05 × (authored standing / 100)⁴** a year, easing to nothing at a **ceiling of 138** that no rival drifts past | The player was #1 by year 11. The field now climbs with the player: the top 25 comes around year 15, the top 10 around 20, and #1 around 35. The elite's closing on a leader is kept, and is not bound by the ceiling. |

Also in the PR:

- The History tab's prestige note states the cap.
- `test/report-card.test.ts` checks the capped climb instead of the uncapped
  one.
- `sim/baseline.json` is re-saved, since every number moved.
- `docs/design/progression.md` and `economy.md` carry the new rules.

## 2. What the run looks like now

Seed 12345, Blackmoor University: `docs/reviews/2026-09-natural-play-tuned.md`,
with the scorecard in `docs/reviews/2026-09-pacing-tuned.md`. The Plan 65
run is in brackets.

| Year | Enrolled | Net/wk | Prestige | Rank | Programs |
|---|---|---|---|---|---|
| 1 | 545 (419) | $28k ($5k) | 52.7 (53.1) | 55 (55) | 6 (6) |
| 5 | 2,234 (1,407) | $0.7M ($0.3M) | 61.2 (65.1) | 53 (46) | 41 (11) |
| 10 | 6,753 (8,022) | $1.9M ($0.9M) | 75.7 (100.9) | 32 (3) | 42 (42) |
| 15 | 13,099 (30,560) | $4.5M ($10.3M) | 90.1 (134.9) | 23 (1) | 43 (44) |
| 20 | 18,946 (34,480) | $7.4M ($15.2M) | 103.6 (145.3) | 12 (1) | 51 (52) |
| 25 | 23,246 (34,480) | $9.3M ($16.0M) | 116.3 (148.6) | 7 (1) | 52 |
| 30 | 27,564 (34,480) | $12.5M ($15.8M) | 128.1 (149.6) | 4 (1) | 52 |
| 35 | 30,614 (34,480) | $15.0M ($16.8M) | 139.3 (149.9) | **1** (1) | 52 |
| 40 | 33,770 (34,480) | $15.9M ($17.4M) | 146.7 (150.0) | 1 (1) | 52 |
| 50 | 34,368 (34,480) | $17.5M ($17.5M) | 149.7 (150.0) | 1 (1) | 52 |

- **The endpoint is unchanged:** the same ceiling of 34,480 students,
  prestige 150, #1, about $17.5M/wk and a B · 68 final mark. What changed is
  the road there.
  - *Enrollment* adds about 3,800 students every five years, no longer 22,000
    between years 10 and 15.
  - *Prestige* climbs about 12 points every five years.
  - *First place* comes at year 35 and is held.
- **The last decade coasts,** as the owner asked: enrollment +2%, prestige
  +3 points, net +10% (§3).
- **Seed spread is small.** The three seeds agree within about 1,500
  students and 2 prestige points at every checkpoint, and first place comes
  in year 35 on all three.

## 3. The five misses

All five are within a point or two of their bands, and they trade against
each other: fixing one moved another over its line.

| Target | Band | Median |
|---|---|---|
| Net at year 40, share of year 50 | ≥ 90% | 90% (89.x) |
| Net, year 50 over year 40 | ≤ 10% | 12% |
| Net, growth in years 40–50 | ≤ 10% | 10% (10.x) |
| Net, growth in years 1–10 | 15–35% | 11% |
| Enrollment, growth in years 10–20 | 15–35% | 35% (35.x) |

**Net's tail** is structural. Tuition follows the class that paid it, so a
college whose prestige is still rising at year 40 (147, then 150) keeps
raising its revenue for four more years as the old classes graduate. Closing
it would mean prestige reaching 150 by about year 38, which pulls rank and
enrollment early.

**Net's first decade** is small because a young college's fixed costs eat
most of its tuition. It is 11% of the final net at year 10, against the
band's 15%.

## 4. What did not work

These are left out of the PR:

- **Scaling the prestige inputs.** The inputs sum to about 200 against a
  cap of 150, and scaling them by 0.62 so that 150 needs everything simply
  lowered the ceiling: the natural line ended at about 138.
- **Gating academic halls on prestige.** It deadlocks. With two halls the
  prestige target settles around 72, so a gate at 80 is never reached. It
  locked up twice, at two different gate ladders.
- **Opening halls on a year schedule** (years 1, 5, 10, 15, 21, 27). The
  owner's line only sorts its schools once seven halls stand, so with the
  last hall at year 27 no school is founded until then, and labs, research
  and prestige all stall. First place slipped to year 48; 13 of 50.

## 5. For the owner

- **A player who prices at "fair" still sprints.** The guided player and
  the Completionist charge what prestige supports, not 1.6 times it, which
  draws about 1.8 times the applicants. Their growth is capped by the
  catalog's seats, not by demand, and the catalog is still complete by about
  year 20:

  | Player | Year 10 students | Year 25 students | Year 10 before |
  |---|---|---|---|
  | Guided | 14,400 | 34,480 | 6,000 |
  | Completionist | 19,100 | 34,480 | 7,200 |

  Prestige and rank are paced for everyone by the climb cap and the field.
  Enrollment and net are paced only for a player who prices high. Pacing the
  catalog itself is the next lever, but halls are the wrong handle (§4). The
  candidates:
  - seats per course that grow with the college's age or standing;
  - courses whose development time scales with the catalog's size;
  - a scorecard row for the guided player's trajectory, not just its year
    50.
- **The catalog still fills early.** The natural player has 41 programs at
  year 5 and all 52 by year 20. Enrollment and prestige no longer follow it,
  so it no longer drives the sprint, but a player still has nothing left to
  found after year 20.
- **Money still piles up.** $52B in cash at year 50. Grants returned 5.5
  times the research spend ($35.6B on $6.5B), and nothing sinks the surplus.
  That is Plans 63 and 65's finding, unchanged here.
- **Health still sags in years 8–20** (as low as 37). The health chain sits
  behind the Recreation Center, a social building, and the clinic and
  Medical Center wait on enrollment gates (Plan 65). Slower enrollment makes
  the wait longer.
- **The other archetypes** (`npm run sim`, three seeds):
  - The *Selective* and *Lean* colleges end 10–20 prestige points lower
    than before, around 84, and ranked in the 40s. The field now rises past
    a college that stays small.
  - *Idle* is unchanged.
  - Every slow check still passes: stall-don't-die, the crisis recovery,
    the guided player's letters and schools, and fuzz.

**As implemented:** twenty scorecard runs, each about 55 seconds, in a
scratch loop that ran the natural player's three seeds in parallel. The
scorecard in `docs/reviews/2026-09-pacing-tuned.md` is the last of them,
written by `npm run natural -- --pacing`.
