# Play statistics, read 3 November 2026

*One-off queries of PostHog's capture (`docs/architecture/analytics.md`) over
the last 45 days, by the review's lead. Not saved definitions. Only players who
allowed statistics are counted, ad blockers stop some, and the owner's own test
runs are in the sample, so these are indications, not measurements.*

## How far founded runs got (normal mode, by version)

| Version | Founded | Year 1 | Year 2 | Year 5 | Year 10 | Year 20 |
|---|---|---|---|---|---|---|
| 0.1.0 | 46 | 22 | 19 | 16 | 12 | 6 |
| 0.1.1 | 10 | 6 | 6 | 5 | 2 | 2 |
| 0.1.2 | 25 | 15 | 14 | 10 | 6 | 6 |
| 0.1.3 | 24 | 15 | 13 | 9 | 8 | 5 |
| 0.1.4 | 11 | 9 | 8 | 7 | 6 | 4 |
| 0.1.4.1 | 20 | 12 | 9 | 9 | 6 | 6 |
| 0.2.0 | 3 | 1 | 1 | 1 | 0 | 0 |

From 0.1.3 to 0.1.4.1, 55 runs were founded and 36 reached a first
`year_reached`: **about one founded run in three still ends before it.**

## Tab opens (summed from `year_reached`, which carries each year's counts)

| Version | Run-years | Curriculum | Faculty | Inbox | Students | Research | Athletics | History | Treasury |
|---|---|---|---|---|---|---|---|---|---|
| 0.1.3 | 137 | 522 | 234 | 273 | 145 | 111 | 97 | 82 | 58 |
| 0.1.4 | 97 | 215 | 132 | 92 | 59 | 32 | 33 | 20 | 11 |
| 0.1.4.1 | 128 | 589 | 342 | 348 | 165 | 196 | 96 | 106 | 86 |
| **0.1.3–0.1.4.1, per run-year** | 362 | **3.7** | **1.9** | **2.0** | 1.0 | 0.95 | 0.62 | 0.57 | **0.43** |

The Curriculum is the game; the Treasury and History are opened about once in
two years.

## Chapters (all versions with chapters)

| Chapter | Opened | Done | Briefing read | Guide opened | Weeks open (mean) |
|---|---|---|---|---|---|
| next-course | 49 | 46 | 48 | 27 | 14.7 |
| somewhere-to-sleep | 43 | 39 | 34 | 5 | 18.8 |
| seats | 39 | 37 | 15 | 5 | 5.2 |
| paying-for-it | 37 | 33 | 29 | 6 | 8.5 |
| first-summer | 33 | 32 | 16 | 3 | 3.3 |
| standing | 32 | 30 | 28 | 14 | 7.0 |
| looking-around | 32 | 29 | 28 | 6 | 149.5 |
| a-faculty | 30 | 29 | 16 | 7 | 7.1 |
| hall-of-its-own | 29 | 26 | 26 | 9 | 67.7 |
| campus-life | 27 | 26 | 15 | 16 | 16.2 |
| alumni | 26 | 25 | 13 | 17 | 61.1 |
| research | 24 | 24 | 14 | 7 | 59.3 |
| the-teams | 24 | 23 | 19 | 6 | 72.7 |
| running-the-college | 24 | 23 | 19 | 13 | 45.7 |
| capital-projects | 22 | 14 | 18 | 7 | 544.3 |
| specialization | 19 | 16 | 6 | 5 | 314.2 |
| promises | 11 | 11 | 6 | 2 | 3.8 |
| the-long-game | 9 | 9 | 7 | 0 | 17.6 |

`briefing_read` is a marker, not a measure of reading: it fires when the
briefing is shown open. Players finish nearly every chapter they open, but
from the fifth chapter on about half the briefings are never opened, and the
chapters still get done. That is the strongest evidence in the sample that the
game can be learned without the briefings.
