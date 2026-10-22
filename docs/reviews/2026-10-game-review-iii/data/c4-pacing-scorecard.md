# Pacing scorecard on b1f2114 (area 4, review III)

The lead's run of `npm run natural -- --pacing` (started 20:03 on 21 October, 1,111 s), copied from its log unchanged below the line. Area 4 reads it in `4-strategy.md` (C4-2, C4-3, C4-5).

---


The natural line (`sim/harness/natural.ts`, priced just short of the red tier), the guided player and the Completionist (both priced at "fair"), seeds 12345, 4242, 777, against the targets in `sim/pacing.ts` (Plans 66 and 68, prestige and rank re-based by Plan 95W). Written by `npm run natural -- --pacing` in 1111 s.

**Natural: when**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment: half its growth | Y24–Y28 | Y30 | Y31 | Y28 | Y30 | ✗ |
| Enrollment: 90% of its growth | Y36–Y40 | Y40 | Y41 | Y40 | Y40 | ✓ |
| Prestige: half its growth | Y22–Y26 | Y20 | Y21 | Y20 | Y20 | ✗ |
| Prestige: 90% of its growth | Y38–Y42 | Y38 | Y38 | Y38 | Y37 | ✓ |
| Net $/wk: half its growth | Y29–Y33 | Y31 | Y32 | Y30 | Y31 | ✓ |
| Net $/wk: 90% of its growth | Y37–Y41 | Y43 | Y43 | Y42 | Y43 | ✗ |
| Rank: first in the top 25 | Y24–Y30 | Y23 | Y23 | Y23 | Y22 | ✗ |
| Rank: first in the top 10 | Y33–Y39 | Y33 | Y33 | Y35 | Y33 | ✓ |
| Rank: first #1 | Y38–Y46 | Y40 | Y40 | Y39 | never | ✓ |
| Largest one-year enrollment gain, share of Y50 | ≤ 8% | 7% | 8% | 7% | 7% | ✓ |
| Net $/wk: second straight falls after Y5 | ≤ 0 | 0 | 0 | 0 | 0 | ✓ |
| Rank at Y50 | ≤ 1 | 1 | 1 | 1 | 2 | ✓ |
| Left to build at Y50 (programs, courses, schools to distinguish) | ≤ 0 | 0 | 0 | 0 | 0 | ✓ |

**Natural: the catalogue**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Programs: half founded | Y15–Y23 | Y9 | Y9 | Y11 | Y9 | ✗ |
| Programs: 90% founded | Y25–Y33 | Y32 | Y32 | Y32 | Y32 | ✓ |
| Courses: half taught | Y15–Y20 | Y16 | Y16 | Y16 | Y16 | ✓ |
| Courses: 90% taught | Y34–Y40 | Y29 | Y29 | Y29 | Y29 | ✗ |
| Schools: the first founded | Y8–Y13 | Y8 | Y7 | Y8 | Y8 | ✓ |
| Schools: the fourth founded | Y14–Y23 | Y12 | Y12 | Y11 | Y12 | ✗ |
| Schools: the seventh founded | Y17–Y25 | Y14 | Y15 | Y13 | Y14 | ✗ |
| Schools: the first distinguished | Y8–Y14 | Y30 | Y30 | Y30 | Y30 | ✗ |
| Schools: all seven distinguished | Y32–Y38 | Y32 | Y32 | Y32 | Y32 | ✓ |
| Graduate courses: the first | Y15–Y20 | Y33 | Y33 | Y33 | Y33 | ✗ |
| Graduate courses: all | Y36–Y42 | Y38 | Y38 | Y38 | Y38 | ✓ |
| The last year anything was added | ≥ Y35 | Y38 | Y38 | Y38 | Y38 | ✓ |

**Guided: when**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment: half its growth | Y16–Y22 | Y19 | Y19 | Y18 | Y20 | ✓ |
| Enrollment: 90% of its growth | Y32–Y40 | Y33 | Y34 | Y32 | Y33 | ✓ |
| Prestige: half its growth | Y24–Y30 | Y23 | Y24 | Y22 | Y23 | ✗ |
| Prestige: 90% of its growth | Y40–Y46 | Y38 | Y42 | Y38 | Y38 | ✗ |
| Net $/wk: half its growth | Y18–Y26 | Y16 | Y16 | Y16 | Y17 | (✗) |
| Net $/wk: 90% of its growth | Y34–Y42 | Y47 | Y49 | Y47 | Y47 | (✗) |
| Rank: first in the top 25 | Y26–Y32 | Y29 | Y30 | Y29 | Y26 | ✓ |
| Rank: first in the top 10 | Y37–Y45 | Y36 | Y40 | Y35 | Y36 | ✗ |
| Rank: first #1 | Y43–Y49 | Y46 | Y46 | Y44 | Y47 | ✓ |
| Largest one-year enrollment gain, share of Y50 | ≤ 8% | 5% | 4% | 5% | 5% | ✓ |
| Net $/wk: second straight falls after Y5 | ≤ 0 | 7 | 7 | 7 | 10 | (✗) |
| Rank at Y50 | ≤ 1 | 1 | 1 | 1 | 1 | ✓ |
| Left to build at Y50 (programs, courses, schools to distinguish) | ≤ 0 | 0 | 0 | 0 | 0 | ✓ |

**Guided: the catalogue**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Programs: half founded | Y6–Y14 | Y7 | Y7 | Y7 | Y9 | ✓ |
| Programs: 90% founded | Y22–Y32 | Y33 | Y34 | Y31 | Y33 | ✗ |
| Courses: half taught | Y15–Y20 | Y16 | Y16 | Y16 | Y17 | ✓ |
| Courses: 90% taught | Y34–Y40 | Y29 | Y29 | Y28 | Y30 | ✗ |
| Schools: the first founded | Y3–Y10 | Y3 | Y3 | Y3 | Y3 | ✓ |
| Schools: the fourth founded | Y6–Y15 | Y8 | Y7 | Y8 | Y9 | ✓ |
| Schools: the seventh founded | Y8–Y18 | Y11 | Y11 | Y11 | Y11 | ✓ |
| Schools: the first distinguished | Y8–Y14 | Y30 | Y30 | Y29 | Y30 | ✗ |
| Schools: all seven distinguished | Y32–Y38 | Y33 | Y33 | Y31 | Y33 | ✓ |
| Graduate courses: the first | Y15–Y20 | Y33 | Y33 | Y32 | Y33 | ✗ |
| Graduate courses: all | Y36–Y42 | Y38 | Y39 | Y36 | Y38 | ✓ |
| The last year anything was added | ≥ Y35 | Y38 | Y39 | Y36 | Y38 | ✓ |

**Completionist: when**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment: half its growth | Y16–Y22 | Y22 | Y22 | Y22 | Y20 | ✓ |
| Enrollment: 90% of its growth | Y32–Y40 | Y34 | Y34 | Y35 | Y33 | ✓ |
| Prestige: half its growth | Y24–Y30 | Y23 | Y24 | Y23 | Y23 | ✗ |
| Prestige: 90% of its growth | Y40–Y46 | Y43 | Y43 | Y42 | Y43 | ✓ |
| Net $/wk: half its growth | Y18–Y26 | Y9 | Y9 | Y9 | Y10 | (✗) |
| Net $/wk: 90% of its growth | Y34–Y42 | Y19 | Y19 | Y33 | Y13 | (✗) |
| Rank: first in the top 25 | Y26–Y32 | Y28 | Y28 | Y28 | Y29 | ✓ |
| Rank: first in the top 10 | Y37–Y45 | Y41 | Y42 | Y38 | Y41 | ✓ |
| Rank: first #1 | Y43–Y49 | never | never | Y49 | never | ✗ |
| Largest one-year enrollment gain, share of Y50 | ≤ 8% | 5% | 4% | 5% | 5% | ✓ |
| Net $/wk: second straight falls after Y5 | ≤ 0 | 11 | 8 | 11 | 12 | (✗) |
| Rank at Y50 | ≤ 1 | 2 | 2 | 1 | 3 | ✗ |
| Left to build at Y50 (programs, courses, schools to distinguish) | ≤ 0 | 0 | 0 | 0 | 0 | ✓ |

**Completionist: the catalogue**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Programs: half founded | Y6–Y14 | Y11 | Y11 | Y11 | Y11 | ✓ |
| Programs: 90% founded | Y22–Y32 | Y32 | Y32 | Y34 | Y30 | ✓ |
| Courses: half taught | Y15–Y20 | Y20 | Y20 | Y20 | Y19 | ✓ |
| Courses: 90% taught | Y34–Y40 | Y31 | Y31 | Y33 | Y30 | ✗ |
| Schools: the first founded | Y3–Y10 | Y8 | Y8 | Y8 | Y9 | ✓ |
| Schools: the fourth founded | Y6–Y15 | Y11 | Y11 | Y11 | Y11 | ✓ |
| Schools: the seventh founded | Y8–Y18 | Y16 | Y15 | Y16 | Y16 | ✓ |
| Schools: the first distinguished | Y8–Y14 | Y23 | Y23 | Y23 | Y21 | ✗ |
| Schools: all seven distinguished | Y32–Y38 | Y35 | Y35 | Y37 | Y35 | ✓ |
| Graduate courses: the first | Y15–Y20 | Y26 | Y28 | Y26 | Y25 | ✗ |
| Graduate courses: all | Y36–Y42 | Y40 | Y40 | Y40 | Y38 | ✓ |
| The last year anything was added | ≥ Y35 | Y40 | Y40 | Y40 | Y38 | ✓ |

**Natural: year 10**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | 3%–10% | 7% | 7% | 8% | 7% | ✓ |
| Prestige | 48.0–58.0 | 56.3 | 55.7 | 58.0 | 56.3 | ✓ |
| Rank | 50–60 | 55 | 55 | 53 | 55 | ✓ |
| Net $/wk, share of Y50 | 1%–7% | 4% | 4% | 5% | 4% | ✓ |

**Natural: year 20**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | 18%–30% | 33% | 31% | 35% | 33% | ✗ |
| Prestige | 71.0–81.0 | 78.5 | 77.9 | 80.1 | 78.5 | ✓ |
| Rank | 28–38 | 32 | 32 | 30 | 32 | ✓ |
| Net $/wk, share of Y50 | 8%–20% | 28% | 25% | 31% | 28% | ✗ |

**Natural: year 30**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | 58%–72% | 52% | 50% | 55% | 52% | ✗ |
| Prestige | 87.0–97.0 | 94.8 | 93.9 | 94.8 | 95.0 | ✓ |
| Rank | 15–25 | 18 | 20 | 18 | 14 | ✓ |
| Net $/wk, share of Y50 | 42%–58% | 48% | 46% | 51% | 48% | ✓ |

**Natural: year 40**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | ≥ 94% | 91% | 89% | 92% | 91% | ✗ |
| Prestige | ≥ 105.0 | 114.0 | 113.9 | 114.0 | 114.2 | ✓ |
| Rank | ≤ 5 | 1 | 1 | 1 | 2 | ✓ |
| Net $/wk, share of Y50 | ≥ 90% | 88% | 88% | 85% | 89% | ✗ |

**Natural: year 50**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment over Y40 | ≤ 5% | 10% | 12% | 9% | 10% | ✗ |
| Net $/wk over Y40 | ≤ 10% | 14% | 14% | 18% | 12% | ✗ |
| Prestige | ≥ 116.0 | 118.4 | 118.7 | 118.4 | 117.7 | ✓ |
| Rank | ≤ 1 | 1 | 1 | 1 | 2 | ✓ |

**Natural: steady**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Largest one-year prestige gain (points) | ≤ 6.0 | 4.8 | 5.2 | 4.7 | 4.8 | ✓ |
| Enrollment: growth in years 1–10 | 2%–10% | 6% | 6% | 7% | 6% | ✓ |
| Enrollment: growth in years 10–20 | 15%–35% | 26% | 25% | 27% | 26% | ✓ |
| Enrollment: growth in years 20–30 | 32%–50% | 20% | 18% | 20% | 20% | ✗ |
| Enrollment: growth in years 30–40 | 15%–35% | 38% | 40% | 36% | 38% | ✗ |
| Enrollment: growth in years 40–50 | ≤ 10% | 10% | 11% | 9% | 10% | ✓ |
| Prestige: growth in years 1–10 | 15%–35% | 23% | 22% | 25% | 23% | ✓ |
| Prestige: growth in years 10–20 | 15%–35% | 28% | 28% | 27% | 28% | ✓ |
| Prestige: growth in years 20–30 | 15%–35% | 20% | 20% | 18% | 21% | ✓ |
| Prestige: growth in years 30–40 | 15%–35% | 24% | 25% | 24% | 24% | ✓ |
| Prestige: growth in years 40–50 | ≤ 10% | 5% | 6% | 5% | 4% | ✓ |
| Net $/wk: growth in years 1–10 | 1%–8% | 4% | 4% | 5% | 4% | ✓ |
| Net $/wk: growth in years 10–20 | 5%–15% | 24% | 21% | 27% | 24% | ✗ |
| Net $/wk: growth in years 20–30 | 28%–45% | 21% | 21% | 20% | 21% | ✗ |
| Net $/wk: growth in years 30–40 | 15%–35% | 41% | 42% | 33% | 41% | ✗ |
| Net $/wk: growth in years 40–50 | ≤ 10% | 12% | 12% | 15% | 11% | ✗ |

**Guardrails**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Teaching-blind guided: rank at Y50 | 11–25 | 1 | 1 | 2 | 1 | ✗ |
| Teaching-blind guided: left to build at Y50 | ≤ 0 | 0 | 0 | 0 | 0 | ✓ |
| Buffer: guided Y50 enrollment, share of natural | ≥ 85% | 100% | 100% | 100% | 101% | ✓ |
| Buffer: guided Y50 prestige, share of natural | ≥ 85% | 97% | 97% | 96% | 98% | ✓ |
| Buffer: guided Y50 rank | ≤ 10 | 1 | 1 | 1 | 1 | ✓ |
| Price matters: fair-price Y50 enrollment over natural | ≥ 1.10× | 1.00× | 1.00× | 1.00× | 1.01× | ✗ |
| Price matters: natural Y50 net over fair-price | ≥ 1.25× | 3.64× | 3.64× | 3.62× | 3.71× | ✓ |
| Welfare: natural years after Y5 with an attribute under 50 | ≤ 0 | 0 | 0 | 0 | 0 | ✓ |
| Research: natural lifetime grants over initiative funding | 1.70×–2.30× | 2.40× | 2.51× | 2.40× | 2.25× | ✗ |
| Money (watched): natural Y40 cash, in decades of opex | ≤ 1.0 | 0.9 | 0.9 | 0.9 | 0.9 | (✓) |
| Money: natural Y40 cash | ≤ $1.0B | $9.5B | $9.5B | $10.2B | $9.3B | ✗ |
| Financial strength (watched): Natural Y50, of 100 | ≥ 60 | 100 | 100 | 100 | 100 | (✓) |
| Financial strength (watched): Guided Y50, of 100 | ≥ 60 | 100 | 100 | 100 | 100 | (✓) |
| Financial strength (watched): Completionist Y50, of 100 | ≥ 60 | 1 | 1 | 1 | 2 | (✗) |

**75 of 115 targets met.** Rows in brackets are watched, not counted.
