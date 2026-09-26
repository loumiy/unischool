# Pacing scorecard

The natural player (`sim/harness/natural.ts`), seeds 12345, 4242, 777, against Plan 66's targets (`sim/pacing.ts`); the buffer rows play the guided player on the same seeds. Written by `npm run natural -- --pacing` in 166 s.

**When**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment: half its growth | Y18–Y22 | Y19 | Y19 | Y19 | Y20 | ✓ |
| Enrollment: 90% of its growth | Y36–Y40 | Y36 | Y36 | Y37 | Y36 | ✓ |
| Prestige: half its growth | Y18–Y22 | Y20 | Y20 | Y20 | Y19 | ✓ |
| Prestige: 90% of its growth | Y36–Y40 | Y36 | Y36 | Y36 | Y36 | ✓ |
| Net $/wk: half its growth | Y20–Y24 | Y23 | Y23 | Y23 | Y23 | ✓ |
| Net $/wk: 90% of its growth | Y37–Y41 | Y41 | Y40 | Y41 | Y41 | ✓ |
| Rank: first in the top 25 | Y12–Y16 | Y14 | Y13 | Y15 | Y14 | ✓ |
| Rank: first in the top 10 | Y20–Y25 | Y22 | Y23 | Y19 | Y22 | ✓ |
| Rank: first #1 | Y34–Y40 | Y35 | Y35 | Y35 | Y35 | ✓ |

**Year 10**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | 17%–29% | 20% | 20% | 20% | 20% | ✓ |
| Prestige | 72.0–82.0 | 76.0 | 75.7 | 76.0 | 76.5 | ✓ |
| Rank | 25–40 | 37 | 32 | 41 | 37 | ✓ |
| Net $/wk, share of Y50 | 10%–20% | 11% | 11% | 11% | 12% | ✓ |

**Year 20**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | 43%–55% | 55% | 55% | 55% | 52% | ✓ |
| Prestige | 96.0–106.0 | 103.9 | 103.6 | 103.9 | 104.3 | ✓ |
| Rank | 8–15 | 12 | 12 | 7 | 15 | ✓ |
| Net $/wk, share of Y50 | 35%–50% | 41% | 42% | 41% | 39% | ✓ |

**Year 30**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | 70%–81% | 78% | 80% | 78% | 76% | ✓ |
| Prestige | 120.0–130.0 | 128.4 | 128.1 | 128.4 | 128.8 | ✓ |
| Rank | 2–5 | 4 | 4 | 4 | 3 | ✓ |
| Net $/wk, share of Y50 | 65%–80% | 71% | 71% | 72% | 67% | ✓ |

**Year 40**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | ≥ 94% | 98% | 98% | 96% | 99% | ✓ |
| Prestige | ≥ 145.0 | 146.8 | 146.7 | 146.8 | 146.9 | ✓ |
| Rank | ≤ 1 | 1 | 1 | 1 | 1 | ✓ |
| Net $/wk, share of Y50 | ≥ 90% | 90% | 91% | 89% | 90% | ✗ |

**Year 50**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment over Y40 | ≤ 5% | 2% | 2% | 4% | 1% | ✓ |
| Net $/wk over Y40 | ≤ 10% | 12% | 10% | 12% | 12% | ✗ |
| Prestige | ≥ 149.5 | 149.7 | 149.7 | 149.7 | 149.7 | ✓ |
| Rank | ≤ 1 | 1 | 1 | 1 | 1 | ✓ |

**Steady**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Largest one-year enrollment gain, share of Y50 | ≤ 8% | 5% | 6% | 4% | 5% | ✓ |
| Largest one-year prestige gain (points) | ≤ 6.0 | 3.1 | 3.1 | 3.1 | 3.1 | ✓ |
| Enrollment: growth in years 1–10 | 15%–35% | 19% | 18% | 19% | 19% | ✓ |
| Enrollment: growth in years 10–20 | 15%–35% | 35% | 36% | 35% | 32% | ✗ |
| Enrollment: growth in years 20–30 | 15%–35% | 25% | 25% | 23% | 25% | ✓ |
| Enrollment: growth in years 30–40 | 15%–35% | 19% | 18% | 19% | 23% | ✓ |
| Enrollment: growth in years 40–50 | ≤ 10% | 2% | 2% | 4% | 1% | ✓ |
| Prestige: growth in years 1–10 | 15%–35% | 24% | 24% | 23% | 24% | ✓ |
| Prestige: growth in years 10–20 | 15%–35% | 29% | 29% | 29% | 29% | ✓ |
| Prestige: growth in years 20–30 | 15%–35% | 25% | 25% | 25% | 25% | ✓ |
| Prestige: growth in years 30–40 | 15%–35% | 19% | 19% | 19% | 19% | ✓ |
| Prestige: growth in years 40–50 | ≤ 10% | 3% | 3% | 3% | 3% | ✓ |
| Net $/wk: growth in years 1–10 | 15%–35% | 11% | 11% | 11% | 12% | ✗ |
| Net $/wk: growth in years 10–20 | 15%–35% | 30% | 31% | 30% | 28% | ✓ |
| Net $/wk: growth in years 20–30 | 15%–35% | 29% | 29% | 31% | 28% | ✓ |
| Net $/wk: growth in years 30–40 | 15%–35% | 19% | 19% | 18% | 23% | ✓ |
| Net $/wk: growth in years 40–50 | ≤ 10% | 10% | 9% | 11% | 10% | ✗ |
| Net $/wk: second straight falls after Y5 | ≤ 0 | 0 | 0 | 0 | 0 | ✓ |

**Buffer**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Guided Y50 enrollment, share of natural | ≥ 85% | 103% | 100% | 103% | 103% | ✓ |
| Guided Y50 prestige, share of natural | ≥ 85% | 100% | 100% | 100% | 100% | ✓ |
| Guided Y50 rank | ≤ 10 | 1 | 1 | 1 | 1 | ✓ |

**45 of 50 targets met.**
