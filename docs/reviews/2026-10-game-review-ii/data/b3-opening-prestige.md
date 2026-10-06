# Area 3: prestige and rank over the opening years

Every college is founded at prestige 51.5 (`actions.ts:326`, the preset's starting reputation plus Founders Hall's bonus). The grade a young college can earn is far below it: research and athletics sit on their floor of 32, and the other pillars start near it. So prestige falls at the first summers and does not regain its founding value for about a decade.

## The hands-on session (Alder College, production build, 1440×900)

| Summer | Grade | Prestige | Rank after | What the Review blamed |
|---|---|---|---|---|
| Year 1 | 29 | 51.0 → 44.5 (−6.5) | #55 → #57 | crowding −11.5 (no beds until week 25), research and athletics +0.0 |
| Year 2 | 42 | 44.5 → 43.7 (−0.8) | #57 | research and athletics +0.0 |
| Year 3 | 45 | 43.7 → 43.9 (+0.2) | #57 → #58 | crowding (dining at 36% after the default admit rate) |
| Year 4 | 49 | 44.0 → 45.1 (+1.1) | #58 → #57 | athletics +0.0 |

## The harness players, seed 12345 (`npm run scenario -- --player P --year N`)

Prestige at the first week of the year after N:

| Player | Y2 | Y3 | Y4 | Y5 | Y6 | Y8 | Y10 |
|---|---|---|---|---|---|---|---|
| Guided | 45 | 46 | 46 | 44 | 45 | 47 | 51 |
| Completionist | 45 | 45 | 41 | 43 | 45 | 47 | 50 |
| Natural | 46 | 46 | 45 | 46 | 48 | 49 | 53 |

Plan 85D's own table puts Guided at prestige 50.0 at year 10, 9.4 lower than before the pillars (59.4), and rank 56. Area 4's goal players read the same flat first decade (prestige 43–45, rank 58–61).

## After Plan 95N (the college opens at 42)

Prestige after each summer, Years 1–10, the harness's Guided and Natural players, three seeds (`foundGame` and `playWeek`, as the table above):

| Player | Seed | Y1 | Y2 | Y3 | Y4 | Y5 | Y6 | Y7 | Y8 | Y9 | Y10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Guided | 12345 | 39.5 | 40.8 | 41.9 | 42.6 | 41.5 | 43.4 | 44.5 | 46.0 | 47.4 | 49.3 |
| Guided | 4242 | 39.4 | 40.6 | 41.8 | 42.3 | 41.3 | 43.1 | 44.7 | 46.2 | 47.5 | 49.7 |
| Guided | 777 | 39.4 | 40.5 | 41.6 | 42.1 | 40.0 | 41.6 | 43.4 | 45.6 | 47.3 | 49.2 |
| Natural | 12345 | 40.1 | 41.6 | 42.8 | 43.7 | 45.3 | 46.8 | 47.9 | 48.9 | 49.8 | 49.2 |
| Natural | 4242 | 39.8 | 41.1 | 42.2 | 43.1 | 44.2 | 45.4 | 46.6 | 47.7 | 48.4 | 49.0 |
| Natural | 777 | 39.9 | 41.2 | 42.2 | 43.1 | 43.5 | 45.3 | 46.8 | 47.8 | 49.2 | 50.6 |

The first summer still falls, by about 2.5 (it fell 6.6 from 51.5): Year 1 grades 29–37, since the college has no beds until week 25. From Year 2 prestige rises every summer but Guided's fifth.
