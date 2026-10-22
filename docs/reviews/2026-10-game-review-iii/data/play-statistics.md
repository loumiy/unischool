# Play statistics, read 21 October 2026

*Read from PostHog's capture of the playtest (`docs/architecture/analytics.md`)
on 21 October 2026, over the last 60 days, by the review's lead. Every figure is
a one-off query, not a saved definition. Only players who allowed statistics are
counted, and ad blockers stop some, so these are a sample of the playtest, not
all of it. A `run_id` is new for each college founded or save loaded from a
file, so a player who restarts counts twice.*

## Sample by version

| Version | Runs seen | Players (install ids) | First seen | Last seen |
|---|---|---|---|---|
| 0.1.0 | 106 | 52 | 7 Oct | 15 Oct |
| 0.1.1 | 31 | 15 | 13 Oct | 19 Oct |
| 0.1.2 | 51 | 26 | 16 Oct | 22 Oct (UTC) |
| 0.1.3 | 6 | 3 | 21 Oct | 22 Oct (UTC), almost certainly the owner's own tests |

"Runs seen" includes ids that only opened the title screen. The tables below
count only **runs founded in the window, sandbox excluded**.

## How far founded runs got

| Furthest summer | 0.1.0 | 0.1.1 | 0.1.2 |
|---|---|---|---|
| None (stopped before the first summer) | 24 | 4 | 8 |
| Year 1 | 3 | — | 2 |
| Year 2 | 1 | 1 | 2 |
| Years 3–5 | 4 | 1 | 3 |
| Years 6–10 | 4 | 3 | 3 |
| Years 11–20 | 4 | — | 2 |
| Years 21–35 | 2 | — | 3 |
| Years 36–49 | — | 1 | — |
| Year 50 | 3 | 1 | 1 |
| **Founded, not sandbox** | **45** | **11** | **24** |
| **Share that never reached a summer** | **53%** | **36%** | **33%** |

Runs that stopped before the first summer had at most 3 minutes of running clock
(0 on 0.1.1 and 0.1.2): they stopped during the walkthrough, while the clock is
held, or within a minute of it.

Median minutes of running clock by furthest summer (all versions): year 1 about
4; year 2 about 6–10; years 3–5 about 10–12; years 6–10 about 22–32; years 11–20
38–70; years 21–35 68–93; year 50 71–197 (fast speeds shorten it).

## Where 0.1.2's runs stopped in the walkthrough

`opening_step` was first sent by 0.1.2 (Plan 104).

| Outcome | Last walkthrough stage | Runs | Walkthrough skipped |
|---|---|---|---|
| No summer | none sent (skipped at the welcome) | 1 | 1 |
| No summer | `site-hall` (the first step) | 2 | 1 |
| No summer | `second-course` (Plan 103's steps) | 2 | 0 |
| No summer | `play` (walkthrough finished) | 2 | 0 |
| Reached a summer | `play` | 13 | 0 |
| Reached a summer | `appoint` | 1 | 1 |
| Reached a summer | none sent | 1 | 0 |

## The specialization

| Version | Offered (runs) | Chosen | Declined (runs) | Years chosen | Pillars chosen |
|---|---|---|---|---|---|
| 0.1.0 | 7 | 7 | 2 | 21, 21, 21, 21, 24, 24, 33 | academics 3, student life 2, research 2 |
| 0.1.1 | 5 | 5 | 0 | all 21 | academics 4, athletics 1 |
| 0.1.2 | 3 | 3 | 0 | all 21 | research, student life, athletics |

Every run that reached year 21 was offered the choice and every one chose.
Academics was chosen 7 times of 15.

## Finished runs (the Final Report left)

| Version | Mark | Rank | Minutes |
|---|---|---|---|
| 0.1.0 | B | 6 | 59 |
| 0.1.0 | B | 16 | 71 |
| 0.1.0 | C | 8 | 118 |
| 0.1.1 | B | 14 | 85 |
| 0.1.1 | A | 1 | 99 |
| 0.1.1 | B | 2 | 195 |
| 0.1.2 | B | 1 | 144 |

## A year of play, on 0.1.1–0.1.3 (averages per summer reported)

| Years | Summers | Runs | Stops a year | Weeks at 1× | 2× | 4× | 8× | Curriculum opened | Faculty | Students | Treasury | History | Research | Athletics | Inbox | Mean rank | Mean prestige band |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1–2 | 45 | 24 | 2.9 | 25.7 | 25.3 | 1.2 | 0 | 3.4 | 1.2 | 0.6 | 0.1 | 0.3 | 0.0 | 0.0 | 1.1 | 66 | 32 |
| 3–5 | 48 | 17 | 3.7 | 15.4 | 29.9 | 6.8 | 0 | 3.6 | 2.2 | 1.4 | 0.1 | 0.4 | 0.1 | 0.7 | 2.4 | 62 | 38 |
| 6–10 | 51 | 13 | 4.3 | 21.0 | 16.9 | 14.5 | 0 | 3.7 | 2.5 | 1.1 | 0.1 | 0.5 | 0.3 | 0.8 | 2.4 | 59 | 41 |
| 15–25 | 24 | 9 | 6.0 | 18.3 | 18.3 | 11.2 | 4.2 | 4.1 | 2.2 | 0.8 | 0.0 | 0.3 | 1.9 | 1.0 | 3.2 | 47 | 60 |
| 30–50 | 19 | 6 | 8.3 | 19.6 | 21.7 | 0 | 10.6 | 6.1 | 3.3 | 1.2 | 0.3 | 0.5 | 3.2 | 1.3 | 2.8 | 15 | 94 |

Tabs are counted as times opened in that year. The Treasury is opened about
once in ten years; History about once in two.
