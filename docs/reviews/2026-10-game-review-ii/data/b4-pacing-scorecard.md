# Pacing scorecard

The natural line (`sim/harness/natural.ts`, priced just short of the red tier), the guided player and the Completionist (both priced at "fair"), seeds 12345, 4242, 777, against the targets in `sim/pacing.ts` (Plans 66 and 68). Written by `npm run natural -- --pacing` in 1441 s.

**Natural: when**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment: half its growth | Y24–Y28 | Y27 | Y27 | Y27 | Y29 | ✓ |
| Enrollment: 90% of its growth | Y36–Y40 | Y38 | Y36 | Y38 | Y39 | ✓ |
| Prestige: half its growth | Y18–Y22 | Y24 | Y24 | Y23 | Y25 | ✗ |
| Prestige: 90% of its growth | Y36–Y40 | Y39 | Y39 | Y38 | Y40 | ✓ |
| Net $/wk: half its growth | Y29–Y33 | Y29 | Y28 | Y29 | Y30 | ✓ |
| Net $/wk: 90% of its growth | Y37–Y41 | Y41 | Y41 | Y41 | Y42 | ✓ |
| Rank: first in the top 25 | Y12–Y16 | Y27 | Y27 | Y25 | Y27 | ✗ |
| Rank: first in the top 10 | Y20–Y25 | Y35 | Y35 | Y35 | Y35 | ✗ |
| Rank: first #1 | Y34–Y40 | Y42 | Y42 | Y40 | Y43 | ✗ |
| Largest one-year enrollment gain, share of Y50 | ≤ 8% | 9% | 9% | 8% | 9% | ✗ |
| Net $/wk: second straight falls after Y5 | ≤ 0 | 0 | 0 | 0 | 0 | ✓ |
| Rank at Y50 | ≤ 1 | 1 | 1 | 1 | 1 | ✓ |
| Left to build at Y50 (programs, courses, schools to distinguish) | ≤ 0 | 0 | 0 | 0 | 0 | ✓ |

**Natural: the catalogue**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Programs: half founded | Y15–Y23 | Y12 | Y11 | Y12 | Y13 | ✗ |
| Programs: 90% founded | Y25–Y33 | Y30 | Y29 | Y30 | Y30 | ✓ |
| Courses: half taught | Y15–Y20 | Y15 | Y14 | Y15 | Y16 | ✓ |
| Courses: 90% taught | Y34–Y40 | Y27 | Y26 | Y27 | Y27 | ✗ |
| Schools: the first founded | Y8–Y13 | Y6 | Y5 | Y6 | Y7 | ✗ |
| Schools: the fourth founded | Y14–Y23 | Y12 | Y11 | Y12 | Y13 | ✗ |
| Schools: the seventh founded | Y17–Y25 | Y15 | Y14 | Y15 | Y15 | ✗ |
| Schools: the first distinguished | Y8–Y14 | Y27 | Y26 | Y27 | Y28 | ✗ |
| Schools: all seven distinguished | Y32–Y38 | Y30 | Y29 | Y30 | Y30 | ✗ |
| Graduate courses: the first | Y15–Y20 | Y30 | Y29 | Y30 | Y31 | ✗ |
| Graduate courses: all | Y36–Y42 | Y36 | Y35 | Y36 | Y37 | ✓ |
| The last year anything was added | ≥ Y35 | Y36 | Y35 | Y36 | Y37 | ✓ |

**Guided: when**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment: half its growth | Y16–Y22 | Y18 | Y18 | Y18 | Y18 | ✓ |
| Enrollment: 90% of its growth | Y32–Y40 | Y33 | Y33 | Y34 | Y33 | ✓ |
| Prestige: half its growth | Y18–Y22 | Y26 | Y26 | Y25 | Y26 | ✗ |
| Prestige: 90% of its growth | Y36–Y40 | Y43 | Y43 | Y41 | Y44 | ✗ |
| Net $/wk: half its growth | Y18–Y26 | Y12 | Y11 | Y14 | Y12 | (✗) |
| Net $/wk: 90% of its growth | Y34–Y42 | Y26 | Y16 | Y50 | Y26 | (✗) |
| Rank: first in the top 25 | Y12–Y16 | Y28 | Y26 | Y28 | Y29 | ✗ |
| Rank: first in the top 10 | Y20–Y25 | Y39 | Y39 | Y37 | Y39 | ✗ |
| Rank: first #1 | Y33–Y40 | Y44 | Y45 | Y44 | Y44 | ✗ |
| Largest one-year enrollment gain, share of Y50 | ≤ 8% | 6% | 8% | 6% | 6% | ✓ |
| Net $/wk: second straight falls after Y5 | ≤ 0 | 12 | 11 | 12 | 12 | (✗) |
| Rank at Y50 | ≤ 1 | 1 | 1 | 1 | 1 | ✓ |
| Left to build at Y50 (programs, courses, schools to distinguish) | ≤ 0 | 0 | 0 | 0 | 0 | ✓ |

**Guided: the catalogue**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Programs: half founded | Y6–Y14 | Y7 | Y7 | Y7 | Y7 | ✓ |
| Programs: 90% founded | Y22–Y32 | Y30 | Y29 | Y30 | Y31 | ✓ |
| Courses: half taught | Y15–Y20 | Y16 | Y16 | Y16 | Y15 | ✓ |
| Courses: 90% taught | Y34–Y40 | Y31 | Y31 | Y32 | Y30 | ✗ |
| Schools: the first founded | Y3–Y10 | Y6 | Y6 | Y6 | Y3 | ✓ |
| Schools: the fourth founded | Y6–Y15 | Y9 | Y9 | Y9 | Y6 | ✓ |
| Schools: the seventh founded | Y8–Y18 | Y10 | Y10 | Y10 | Y10 | ✓ |
| Schools: the first distinguished | Y8–Y14 | Y20 | Y20 | Y20 | Y19 | ✗ |
| Schools: all seven distinguished | Y32–Y38 | Y34 | Y34 | Y35 | Y34 | ✓ |
| Graduate courses: the first | Y15–Y20 | Y24 | Y25 | Y24 | Y23 | ✗ |
| Graduate courses: all | Y36–Y42 | Y38 | Y38 | Y38 | Y38 | ✓ |
| The last year anything was added | ≥ Y35 | Y38 | Y38 | Y38 | Y38 | ✓ |

**Completionist: when**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment: half its growth | Y16–Y22 | Y21 | Y21 | Y21 | Y21 | ✓ |
| Enrollment: 90% of its growth | Y32–Y40 | Y33 | Y33 | Y33 | Y33 | ✓ |
| Prestige: half its growth | Y18–Y22 | Y26 | Y26 | Y29 | Y26 | ✗ |
| Prestige: 90% of its growth | Y36–Y40 | Y46 | Y46 | Y45 | Y46 | ✗ |
| Net $/wk: half its growth | Y18–Y26 | Y10 | Y10 | Y10 | Y9 | (✗) |
| Net $/wk: 90% of its growth | Y34–Y42 | Y13 | Y13 | Y18 | Y12 | (✗) |
| Rank: first in the top 25 | Y12–Y16 | Y31 | Y34 | Y31 | Y29 | ✗ |
| Rank: first in the top 10 | Y20–Y25 | Y43 | Y45 | Y41 | Y43 | ✗ |
| Rank: first #1 | Y33–Y40 | Y49 | Y49 | Y47 | never | ✗ |
| Largest one-year enrollment gain, share of Y50 | ≤ 8% | 5% | 5% | 4% | 5% | ✓ |
| Net $/wk: second straight falls after Y5 | ≤ 0 | 12 | 16 | 12 | 8 | (✗) |
| Rank at Y50 | ≤ 1 | 1 | 1 | 1 | 2 | ✓ |
| Left to build at Y50 (programs, courses, schools to distinguish) | ≤ 0 | 0 | 0 | 0 | 0 | ✓ |

**Completionist: the catalogue**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Programs: half founded | Y6–Y14 | Y11 | Y12 | Y11 | Y11 | ✓ |
| Programs: 90% founded | Y22–Y32 | Y29 | Y29 | Y29 | Y29 | ✓ |
| Courses: half taught | Y15–Y20 | Y18 | Y19 | Y18 | Y18 | ✓ |
| Courses: 90% taught | Y34–Y40 | Y30 | Y30 | Y30 | Y30 | ✗ |
| Schools: the first founded | Y3–Y10 | Y8 | Y8 | Y7 | Y8 | ✓ |
| Schools: the fourth founded | Y6–Y15 | Y11 | Y12 | Y11 | Y11 | ✓ |
| Schools: the seventh founded | Y8–Y18 | Y14 | Y15 | Y14 | Y14 | ✓ |
| Schools: the first distinguished | Y8–Y14 | Y19 | Y19 | Y20 | Y19 | ✗ |
| Schools: all seven distinguished | Y32–Y38 | Y33 | Y32 | Y33 | Y33 | ✓ |
| Graduate courses: the first | Y15–Y20 | Y23 | Y23 | Y24 | Y23 | ✗ |
| Graduate courses: all | Y36–Y42 | Y38 | Y38 | Y37 | Y38 | ✓ |
| The last year anything was added | ≥ Y35 | Y38 | Y38 | Y37 | Y38 | ✓ |

**Natural: year 10**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | 3%–10% | 6% | 7% | 6% | 5% | ✓ |
| Prestige | 72.0–82.0 | 53.8 | 54.1 | 53.8 | 51.7 | ✗ |
| Rank | 25–40 | 55 | 55 | 55 | 56 | ✗ |
| Net $/wk, share of Y50 | 1%–7% | 3% | 4% | 3% | 3% | ✓ |

**Natural: year 20**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | 18%–30% | 33% | 33% | 33% | 29% | ✗ |
| Prestige | 96.0–106.0 | 76.6 | 76.9 | 76.6 | 74.5 | ✗ |
| Rank | 8–15 | 32 | 31 | 35 | 32 | ✗ |
| Net $/wk, share of Y50 | 8%–20% | 26% | 27% | 26% | 20% | ✗ |

**Natural: year 30**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | 58%–72% | 59% | 61% | 59% | 56% | ✓ |
| Prestige | 120.0–130.0 | 92.6 | 93.4 | 92.6 | 90.7 | ✗ |
| Rank | 2–5 | 18 | 17 | 18 | 20 | ✗ |
| Net $/wk, share of Y50 | 42%–58% | 52% | 53% | 51% | 52% | ✓ |

**Natural: year 40**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment, share of Y50 | ≥ 94% | 99% | 99% | 99% | 97% | ✓ |
| Prestige | ≥ 145.0 | 112.8 | 113.1 | 112.8 | 111.3 | ✗ |
| Rank | ≤ 1 | 3 | 3 | 1 | 3 | ✗ |
| Net $/wk, share of Y50 | ≥ 90% | 88% | 89% | 88% | 84% | ✗ |

**Natural: year 50**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Enrollment over Y40 | ≤ 5% | 1% | 1% | 1% | 3% | ✓ |
| Net $/wk over Y40 | ≤ 10% | 14% | 13% | 14% | 19% | ✗ |
| Prestige | ≥ 149.5 | 118.1 | 118.1 | 116.9 | 118.1 | ✗ |
| Rank | ≤ 1 | 1 | 1 | 1 | 1 | ✓ |

**Natural: steady**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Largest one-year prestige gain (points) | ≤ 6.0 | 2.3 | 2.3 | 2.3 | 2.3 | ✓ |
| Enrollment: growth in years 1–10 | 2%–10% | 5% | 6% | 5% | 4% | ✓ |
| Enrollment: growth in years 10–20 | 15%–35% | 27% | 27% | 28% | 23% | ✓ |
| Enrollment: growth in years 20–30 | 32%–50% | 28% | 28% | 26% | 28% | ✗ |
| Enrollment: growth in years 30–40 | 15%–35% | 40% | 39% | 40% | 41% | ✗ |
| Enrollment: growth in years 40–50 | ≤ 10% | 1% | 1% | 1% | 3% | ✓ |
| Prestige: growth in years 1–10 | 15%–35% | 10% | 11% | 10% | 7% | ✗ |
| Prestige: growth in years 10–20 | 15%–35% | 32% | 32% | 32% | 32% | ✓ |
| Prestige: growth in years 20–30 | 15%–35% | 23% | 23% | 23% | 23% | ✓ |
| Prestige: growth in years 30–40 | 15%–35% | 29% | 28% | 29% | 29% | ✓ |
| Prestige: growth in years 40–50 | ≤ 10% | 7% | 7% | 6% | 10% | ✓ |
| Net $/wk: growth in years 1–10 | 1%–8% | 3% | 4% | 3% | 2% | ✓ |
| Net $/wk: growth in years 10–20 | 5%–15% | 23% | 23% | 23% | 18% | ✗ |
| Net $/wk: growth in years 20–30 | 28%–45% | 25% | 25% | 25% | 32% | ✗ |
| Net $/wk: growth in years 30–40 | 15%–35% | 36% | 36% | 37% | 32% | ✗ |
| Net $/wk: growth in years 40–50 | ≤ 10% | 12% | 11% | 12% | 16% | ✗ |

**Guardrails**

| | Target | Median | Seed 12345 | Seed 4242 | Seed 777 | |
|---|---|---|---|---|---|---|
| Teaching-blind guided: rank at Y50 | 11–25 | 23 | 23 | 20 | 25 | ✓ |
| Teaching-blind guided: left to build at Y50 | ≤ 0 | 0 | 0 | 0 | 0 | ✓ |
| Buffer: guided Y50 enrollment, share of natural | ≥ 85% | 100% | 100% | 100% | 100% | ✓ |
| Buffer: guided Y50 prestige, share of natural | ≥ 85% | 100% | 99% | 102% | 100% | ✓ |
| Buffer: guided Y50 rank | ≤ 10 | 1 | 1 | 1 | 1 | ✓ |
| Price matters: fair-price Y50 enrollment over natural | ≥ 1.10× | 1.00× | 1.00× | 1.00× | 1.00× | ✗ |
| Price matters: natural Y50 net over fair-price | ≥ 1.25× | 5.62× | 7.09× | 4.93× | 5.62× | ✓ |
| Welfare: natural years after Y5 with an attribute under 50 | ≤ 0 | 6 | 1 | 6 | 6 | ✗ |
| Research: natural lifetime grants over initiative funding | 1.70×–2.30× | 1.88× | 1.80× | 1.94× | 1.88× | ✓ |
| Money (watched): natural Y40 cash, in decades of opex | ≤ 1.0 | 0.8 | 0.9 | 0.8 | 0.8 | (✓) |
| Financial strength (watched): Natural Y50, of 100 | ≥ 60 | 100 | 100 | 100 | 100 | (✓) |
| Financial strength (watched): Guided Y50, of 100 | ≥ 60 | 66 | 4 | 71 | 66 | (✓) |
| Financial strength (watched): Completionist Y50, of 100 | ≥ 60 | 2 | 3 | 2 | 2 | (✗) |

**63 of 114 targets met.** Rows in brackets are watched, not counted.

