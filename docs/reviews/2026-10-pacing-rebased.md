# Pacing scorecard

The natural line (`sim/harness/natural.ts`, priced just short of the red tier), the guided player and the Completionist (both priced at "fair"), seeds 12345, 4242, 777, against the targets in `sim/pacing.ts` (Plans 66 and 68, prestige and rank re-based by Plan 95W). Written by `npm run natural -- --pacing` in 2761 s.

**Natural: when**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment: half its growth | Y24–Y28 | Y27 | Y27 | Y27 | Y28 | ✓ |
| Enrollment: 90% of its growth | Y36–Y40 | Y38 | Y36 | Y38 | Y40 | ✓ |
| Prestige: half its growth | Y22–Y26 | Y24 | Y24 | Y24 | Y25 | ✓ |
| Prestige: 90% of its growth | Y38–Y42 | Y40 | Y39 | Y40 | Y42 | ✓ |
| Net $/wk: half its growth | Y29–Y33 | Y29 | Y28 | Y29 | Y29 | ✓ |
| Net $/wk: 90% of its growth | Y37–Y41 | Y41 | Y41 | Y41 | Y43 | ✓ |
| Rank: first in the top 25 | Y24–Y30 | Y27 | Y26 | Y27 | Y28 | ✓ |
| Rank: first in the top 10 | Y33–Y39 | Y36 | Y35 | Y36 | Y38 | ✓ |
| Rank: first #1 | Y38–Y46 | Y42 | Y40 | Y42 | Y47 | ✓ |
| Largest one-year enrollment gain, share of Y50 | ≤ 8% | 9% | 9% | 9% | 9% | ✗ |
| Net $/wk: second straight falls after Y5 | ≤ 0 | 0 | 0 | 0 | 0 | ✓ |
| Rank at Y50 | ≤ 1 | 1 | 1 | 1 | 1 | ✓ |
| Left to build at Y50 (programs, courses, schools to distinguish) | ≤ 0 | 0 | 0 | 0 | 0 | ✓ |

**Natural: the catalogue**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Programs: half founded | Y15–Y23 | Y14 | Y12 | Y14 | Y15 | ✗ |
| Programs: 90% founded | Y25–Y33 | Y30 | Y29 | Y30 | Y31 | ✓ |
| Courses: half taught | Y15–Y20 | Y16 | Y14 | Y16 | Y16 | ✓ |
| Courses: 90% taught | Y34–Y40 | Y27 | Y26 | Y27 | Y28 | ✗ |
| Schools: the first founded | Y8–Y13 | Y6 | Y5 | Y6 | Y7 | ✗ |
| Schools: the fourth founded | Y14–Y23 | Y12 | Y12 | Y12 | Y13 | ✗ |
| Schools: the seventh founded | Y17–Y25 | Y16 | Y15 | Y16 | Y17 | ✗ |
| Schools: the first distinguished | Y8–Y14 | Y27 | Y26 | Y27 | Y28 | ✗ |
| Schools: all seven distinguished | Y32–Y38 | Y30 | Y29 | Y30 | Y31 | ✗ |
| Graduate courses: the first | Y15–Y20 | Y30 | Y29 | Y30 | Y31 | ✗ |
| Graduate courses: all | Y36–Y42 | Y36 | Y35 | Y36 | Y36 | ✓ |
| The last year anything was added | ≥ Y35 | Y36 | Y35 | Y36 | Y36 | ✓ |

**Guided: when**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment: half its growth | Y16–Y22 | Y17 | Y17 | Y16 | Y18 | ✓ |
| Enrollment: 90% of its growth | Y32–Y40 | Y31 | Y31 | Y30 | Y33 | ✗ |
| Prestige: half its growth | Y24–Y30 | Y26 | Y26 | Y27 | Y26 | ✓ |
| Prestige: 90% of its growth | Y40–Y46 | Y43 | Y41 | Y43 | Y44 | ✓ |
| Net $/wk: half its growth | Y18–Y26 | Y12 | Y15 | Y10 | Y12 | (✗) |
| Net $/wk: 90% of its growth | Y34–Y42 | Y26 | Y47 | Y14 | Y26 | (✗) |
| Rank: first in the top 25 | Y26–Y32 | Y29 | Y27 | Y30 | Y29 | ✓ |
| Rank: first in the top 10 | Y37–Y45 | Y39 | Y37 | Y40 | Y39 | ✓ |
| Rank: first #1 | Y43–Y49 | Y44 | Y44 | Y45 | Y44 | ✓ |
| Largest one-year enrollment gain, share of Y50 | ≤ 8% | 6% | 6% | 6% | 6% | ✓ |
| Net $/wk: second straight falls after Y5 | ≤ 0 | 12 | 11 | 13 | 12 | (✗) |
| Rank at Y50 | ≤ 1 | 1 | 1 | 1 | 1 | ✓ |
| Left to build at Y50 (programs, courses, schools to distinguish) | ≤ 0 | 0 | 0 | 0 | 0 | ✓ |

**Guided: the catalogue**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Programs: half founded | Y6–Y14 | Y7 | Y7 | Y8 | Y7 | ✓ |
| Programs: 90% founded | Y22–Y32 | Y28 | Y27 | Y28 | Y31 | ✓ |
| Courses: half taught | Y15–Y20 | Y15 | Y15 | Y15 | Y15 | ✓ |
| Courses: 90% taught | Y34–Y40 | Y29 | Y29 | Y29 | Y30 | ✗ |
| Schools: the first founded | Y3–Y10 | Y5 | Y5 | Y5 | Y3 | ✓ |
| Schools: the fourth founded | Y6–Y15 | Y9 | Y9 | Y9 | Y6 | ✓ |
| Schools: the seventh founded | Y8–Y18 | Y12 | Y12 | Y12 | Y10 | ✓ |
| Schools: the first distinguished | Y8–Y14 | Y18 | Y18 | Y18 | Y19 | ✗ |
| Schools: all seven distinguished | Y32–Y38 | Y33 | Y32 | Y33 | Y34 | ✓ |
| Graduate courses: the first | Y15–Y20 | Y22 | Y22 | Y22 | Y23 | ✗ |
| Graduate courses: all | Y36–Y42 | Y36 | Y36 | Y36 | Y38 | ✓ |
| The last year anything was added | ≥ Y35 | Y36 | Y36 | Y36 | Y38 | ✓ |

**Completionist: when**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment: half its growth | Y16–Y22 | Y19 | Y21 | Y19 | Y19 | ✓ |
| Enrollment: 90% of its growth | Y32–Y40 | Y30 | Y32 | Y30 | Y30 | ✗ |
| Prestige: half its growth | Y24–Y30 | Y27 | Y29 | Y27 | Y27 | ✓ |
| Prestige: 90% of its growth | Y40–Y46 | Y46 | Y46 | Y45 | Y46 | ✓ |
| Net $/wk: half its growth | Y18–Y26 | Y9 | Y9 | Y9 | Y9 | (✗) |
| Net $/wk: 90% of its growth | Y34–Y42 | Y11 | Y13 | Y11 | Y11 | (✗) |
| Rank: first in the top 25 | Y26–Y32 | Y30 | Y30 | Y27 | Y35 | ✓ |
| Rank: first in the top 10 | Y37–Y45 | Y43 | Y43 | Y43 | Y47 | ✓ |
| Rank: first #1 | Y43–Y49 | Y48 | Y48 | Y48 | never | ✓ |
| Largest one-year enrollment gain, share of Y50 | ≤ 8% | 5% | 5% | 6% | 5% | ✓ |
| Net $/wk: second straight falls after Y5 | ≤ 0 | 13 | 13 | 13 | 14 | (✗) |
| Rank at Y50 | ≤ 1 | 1 | 1 | 1 | 4 | ✓ |
| Left to build at Y50 (programs, courses, schools to distinguish) | ≤ 0 | 0 | 0 | 0 | 0 | ✓ |

**Completionist: the catalogue**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Programs: half founded | Y6–Y14 | Y12 | Y12 | Y12 | Y13 | ✓ |
| Programs: 90% founded | Y22–Y32 | Y28 | Y28 | Y27 | Y28 | ✓ |
| Courses: half taught | Y15–Y20 | Y17 | Y18 | Y17 | Y17 | ✓ |
| Courses: 90% taught | Y34–Y40 | Y27 | Y29 | Y27 | Y27 | ✗ |
| Schools: the first founded | Y3–Y10 | Y8 | Y7 | Y11 | Y8 | ✓ |
| Schools: the fourth founded | Y6–Y15 | Y12 | Y12 | Y12 | Y11 | ✓ |
| Schools: the seventh founded | Y8–Y18 | Y17 | Y17 | Y17 | Y16 | ✓ |
| Schools: the first distinguished | Y8–Y14 | Y19 | Y19 | Y19 | Y18 | ✗ |
| Schools: all seven distinguished | Y32–Y38 | Y30 | Y32 | Y30 | Y30 | ✗ |
| Graduate courses: the first | Y15–Y20 | Y24 | Y25 | Y23 | Y24 | ✗ |
| Graduate courses: all | Y36–Y42 | Y36 | Y37 | Y36 | Y36 | ✓ |
| The last year anything was added | ≥ Y35 | Y36 | Y37 | Y36 | Y36 | ✓ |

**Natural: year 10**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | 3%–10% | 6% | 7% | 6% | 5% | ✓ |
| Prestige | 48.0–58.0 | 53.6 | 54.7 | 53.6 | 51.8 | ✓ |
| Rank | 50–60 | 56 | 56 | 55 | 56 | ✓ |
| Net $/wk, share of Y50 | 1%–7% | 3% | 4% | 3% | 3% | ✓ |

**Natural: year 20**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | 18%–30% | 35% | 35% | 35% | 29% | ✗ |
| Prestige | 71.0–81.0 | 76.3 | 77.3 | 76.3 | 74.2 | ✓ |
| Rank | 28–38 | 33 | 33 | 32 | 34 | ✓ |
| Net $/wk, share of Y50 | 8%–20% | 24% | 28% | 24% | 21% | ✗ |

**Natural: year 30**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | 58%–72% | 59% | 64% | 59% | 56% | ✓ |
| Prestige | 87.0–97.0 | 92.2 | 94.0 | 92.2 | 90.0 | ✓ |
| Rank | 15–25 | 19 | 18 | 19 | 23 | ✓ |
| Net $/wk, share of Y50 | 42%–58% | 52% | 56% | 52% | 52% | ✓ |

**Natural: year 40**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | ≥ 94% | 100% | 100% | 100% | 92% | ✓ |
| Prestige | ≥ 105.0 | 112.2 | 113.5 | 112.2 | 107.8 | ✓ |
| Rank | ≤ 5 | 4 | 1 | 4 | 5 | ✓ |
| Net $/wk, share of Y50 | ≥ 90% | 89% | 89% | 89% | 84% | ✗ |

**Natural: year 50**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment over Y40 | ≤ 5% | 0% | 0% | 0% | 9% | ✓ |
| Net $/wk over Y40 | ≤ 10% | 13% | 12% | 13% | 19% | ✗ |
| Prestige | ≥ 116.0 | 117.9 | 118.5 | 117.9 | 117.3 | ✓ |
| Rank | ≤ 1 | 1 | 1 | 1 | 1 | ✓ |

**Natural: steady**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Largest one-year prestige gain (points) | ≤ 6.0 | 2.3 | 2.3 | 2.3 | 2.3 | ✓ |
| Enrollment: growth in years 1–10 | 2%–10% | 5% | 6% | 5% | 4% | ✓ |
| Enrollment: growth in years 10–20 | 15%–35% | 29% | 29% | 29% | 24% | ✓ |
| Enrollment: growth in years 20–30 | 32%–50% | 27% | 29% | 25% | 27% | ✗ |
| Enrollment: growth in years 30–40 | 15%–35% | 37% | 37% | 41% | 36% | ✗ |
| Enrollment: growth in years 40–50 | ≤ 10% | 0% | 0% | 0% | 8% | ✓ |
| Prestige: growth in years 1–10 | 15%–35% | 10% | 11% | 10% | 7% | ✗ |
| Prestige: growth in years 10–20 | 15%–35% | 32% | 31% | 32% | 32% | ✓ |
| Prestige: growth in years 20–30 | 15%–35% | 22% | 23% | 22% | 22% | ✓ |
| Prestige: growth in years 30–40 | 15%–35% | 27% | 27% | 28% | 25% | ✓ |
| Prestige: growth in years 40–50 | ≤ 10% | 8% | 7% | 8% | 13% | ✓ |
| Net $/wk: growth in years 1–10 | 1%–8% | 3% | 4% | 3% | 3% | ✓ |
| Net $/wk: growth in years 10–20 | 5%–15% | 20% | 24% | 20% | 18% | ✗ |
| Net $/wk: growth in years 20–30 | 28%–45% | 29% | 29% | 29% | 32% | ✓ |
| Net $/wk: growth in years 30–40 | 15%–35% | 33% | 33% | 36% | 32% | ✓ |
| Net $/wk: growth in years 40–50 | ≤ 10% | 11% | 11% | 11% | 16% | ✗ |

**Guardrails**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Teaching-blind guided: rank at Y50 | 11–25 | 25 | 23 | 28 | 25 | ✓ |
| Teaching-blind guided: left to build at Y50 | ≤ 0 | 0 | 0 | 0 | 0 | ✓ |
| Buffer: guided Y50 enrollment, share of natural | ≥ 85% | 100% | 100% | 95% | 100% | ✓ |
| Buffer: guided Y50 prestige, share of natural | ≥ 85% | 101% | 101% | 102% | 100% | ✓ |
| Buffer: guided Y50 rank | ≤ 10 | 1 | 1 | 1 | 1 | ✓ |
| Price matters: fair-price Y50 enrollment over natural | ≥ 1.10× | 1.00× | 1.00× | 1.00× | 1.00× | ✗ |
| Price matters: natural Y50 net over fair-price | ≥ 1.25× | 5.40× | 4.19× | 8.19× | 5.40× | ✓ |
| Welfare: natural years after Y5 with an attribute under 50 | ≤ 0 | 6 | 1 | 6 | 8 | ✗ |
| Research: natural lifetime grants over initiative funding | 1.70×–2.30× | 1.98× | 1.98× | 2.02× | 1.65× | ✓ |
| Money (watched): natural Y40 cash, in decades of opex | ≤ 1.0 | 0.8 | 0.9 | 0.8 | 0.8 | (✓) |
| Money: natural Y40 cash | ≤ $1.0B | $9.1B | $10.1B | $9.1B | $7.3B | ✗ |
| Financial strength (watched): Natural Y50, of 100 | ≥ 60 | 100 | 100 | 100 | 100 | (✓) |
| Financial strength (watched): Guided Y50, of 100 | ≥ 60 | 66 | 100 | 2 | 66 | (✓) |
| Financial strength (watched): Completionist Y50, of 100 | ≥ 60 | 1 | 1 | 2 | 1 | (✗) |

**85 of 115 targets met.** Rows in brackets are watched, not counted.
