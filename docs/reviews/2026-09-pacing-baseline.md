# Pacing scorecard

The natural player (`sim/harness/natural.ts`), seeds 12345, 4242, 777, against Plan 66's targets (`sim/pacing.ts`); the buffer rows play the guided player on the same seeds. Written by `npm run natural -- --pacing` in 141 s.

**When**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment: half its growth | Y18–Y22 | Y11 | Y12 | Y11 | Y11 | ✗ |
| Enrollment: 90% of its growth | Y36–Y40 | Y17 | Y17 | Y17 | Y17 | ✗ |
| Prestige: half its growth | Y18–Y22 | Y10 | Y11 | Y10 | Y10 | ✗ |
| Prestige: 90% of its growth | Y36–Y40 | Y17 | Y17 | Y17 | Y17 | ✗ |
| Net $/wk: half its growth | Y20–Y24 | Y13 | Y13 | Y13 | Y12 | ✗ |
| Net $/wk: 90% of its growth | Y37–Y41 | Y30 | Y32 | Y28 | Y30 | ✗ |
| Rank: first in the top 25 | Y12–Y16 | Y8 | Y8 | Y8 | Y8 | ✗ |
| Rank: first in the top 10 | Y20–Y25 | Y10 | Y10 | Y10 | Y9 | ✗ |
| Rank: first #1 | Y34–Y40 | Y11 | Y12 | Y11 | Y9 | ✗ |

**Year 10**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | 17%–29% | 33% | 23% | 33% | 43% | ✗ |
| Prestige | 72.0–82.0 | 105.3 | 100.4 | 105.3 | 109.8 | ✗ |
| Rank | 25–40 | 2 | 3 | 2 | 1 | ✗ |
| Net $/wk, share of Y50 | 10%–20% | 9% | 5% | 9% | 10% | ✗ |

**Year 20**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | 43%–55% | 100% | 100% | 100% | 100% | ✗ |
| Prestige | 96.0–106.0 | 145.8 | 145.3 | 145.8 | 146.2 | ✗ |
| Rank | 8–15 | 1 | 1 | 1 | 1 | ✗ |
| Net $/wk, share of Y50 | 35%–50% | 86% | 83% | 86% | 89% | ✗ |

**Year 30**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | 70%–81% | 100% | 100% | 96% | 100% | ✗ |
| Prestige | 120.0–130.0 | 149.6 | 149.6 | 149.6 | 149.6 | ✗ |
| Rank | 2–5 | 1 | 1 | 1 | 1 | ✗ |
| Net $/wk, share of Y50 | 65%–80% | 90% | 87% | 93% | 90% | ✗ |

**Year 40**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | ≥ 94% | 100% | 100% | 100% | 100% | ✓ |
| Prestige | ≥ 145.0 | 150.0 | 150.0 | 150.0 | 150.0 | ✓ |
| Rank | ≤ 1 | 1 | 1 | 1 | 1 | ✓ |
| Net $/wk, share of Y50 | ≥ 90% | 94% | 96% | 94% | 93% | ✓ |

**Year 50**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment over Y40 | ≤ 5% | 0% | 0% | 0% | 0% | ✓ |
| Net $/wk over Y40 | ≤ 10% | 7% | 4% | 7% | 8% | ✓ |
| Prestige | ≥ 149.5 | 150.0 | 150.0 | 150.0 | 150.0 | ✓ |
| Rank | ≤ 1 | 1 | 1 | 1 | 1 | ✓ |

**Steady**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Largest one-year enrollment gain, share of Y50 | ≤ 8% | 39% | 39% | 32% | 39% | ✗ |
| Largest one-year prestige gain (points) | ≤ 6.0 | 12.1 | 12.1 | 12.6 | 11.9 | ✗ |
| Enrollment: growth in years 1–10 | 15%–35% | 32% | 22% | 32% | 43% | ✓ |
| Enrollment: growth in years 10–20 | 15%–35% | 68% | 78% | 68% | 57% | ✗ |
| Enrollment: growth in years 20–30 | 15%–35% | 0% | 0% | -4% | 0% | ✗ |
| Enrollment: growth in years 30–40 | 15%–35% | 0% | 0% | 4% | 0% | ✗ |
| Enrollment: growth in years 40–50 | ≤ 10% | 0% | 0% | 0% | 0% | ✓ |
| Prestige: growth in years 1–10 | 15%–35% | 53% | 49% | 53% | 58% | ✗ |
| Prestige: growth in years 10–20 | 15%–35% | 42% | 46% | 42% | 38% | ✗ |
| Prestige: growth in years 20–30 | 15%–35% | 4% | 4% | 4% | 4% | ✗ |
| Prestige: growth in years 30–40 | 15%–35% | 0% | 0% | 0% | 0% | ✗ |
| Prestige: growth in years 40–50 | ≤ 10% | 0% | 0% | 0% | 0% | ✓ |
| Net $/wk: growth in years 1–10 | 15%–35% | 9% | 5% | 9% | 9% | ✗ |
| Net $/wk: growth in years 10–20 | 15%–35% | 78% | 78% | 77% | 80% | ✗ |
| Net $/wk: growth in years 20–30 | 15%–35% | 3% | 3% | 6% | 1% | ✗ |
| Net $/wk: growth in years 30–40 | 15%–35% | 3% | 9% | 1% | 3% | ✗ |
| Net $/wk: growth in years 40–50 | ≤ 10% | 6% | 4% | 6% | 7% | ✓ |
| Net $/wk: second straight falls after Y5 | ≤ 0 | 3 | 1 | 3 | 3 | ✗ |

**Buffer**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Guided Y50 enrollment, share of natural | ≥ 85% | 63% | 69% | 57% | 63% | ✗ |
| Guided Y50 prestige, share of natural | ≥ 85% | 95% | 88% | 96% | 95% | ✓ |
| Guided Y50 rank | ≤ 10 | 5 | 5 | 3 | 5 | ✓ |

**14 of 50 targets met.**
