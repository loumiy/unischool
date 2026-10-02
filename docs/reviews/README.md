# UniSchool — Reviews

A review is a **snapshot**: what the game was on a given commit, read by
someone looking for what was wrong with it. Reviews are not edited after they
land. What became of their findings is recorded in the plans that answered
them, in `BACKLOG.md`, and for the full game reviews in a status note beside
them.

This folder also holds the **evidence** later plans captured: screenshots and
harness reports that a plan cites by path. These folders are named by date
and subject, not by plan number, so the tables below give the plans that cite
each one.

## Reviews

| Review | Read | Cited by |
|---|---|---|
| [Design review](2026-09-design-review.md) | `f8bc5ab`, after Plan 08 | Plan 09, Design review II |
| [Design review II](2026-09-design-review-ii.md) | `eb3ea40`, after Plan 21 | the merge review |
| [Map assets, visual review](2026-09-map-assets-visual-review.md) | `2e178a9` | Plan 73 |
| [The merged game](2026-09-merge-review.md) | after Plan 34, with Plan 35's fixes | Plans 35, 36 |
| [Consistency review](2026-09-consistency-review.md) (images in [`2026-09-consistency-review/`](2026-09-consistency-review/)) | the game except its balance | Plans 43, 44, 46–49 |
| [A full review of the game](2026-10-game-review/README.md) (Plan 73), and [its status after Plan 85](2026-10-game-review/STATUS.md) | `58fa3fd`, after Plan 72 | Plans 74–80, 85 |
| [A second full review](2026-10-game-review-ii/README.md) (Plan 86) | `4062bfb`, after Plan 85 | — (awaiting the owner's triage) |

## Harness reports

Written by `npm run natural` (one fifty-year run of the natural line of play,
Plan 65) and `npm run natural -- --pacing` (the pacing scorecard, Plan 66).
Each was kept as the measurement a plan was judged by.

| Report | Cited by |
|---|---|
| [`2026-09-natural-play.md`](2026-09-natural-play.md) | Plan 65, `architecture/playtesting.md` |
| [`2026-09-natural-play-tuned.md`](2026-09-natural-play-tuned.md), [`2026-09-pacing-tuned.md`](2026-09-pacing-tuned.md) | Plan 67 |
| [`2026-09-pacing-baseline.md`](2026-09-pacing-baseline.md) | Plan 66 |
| [`2026-09-pacing-catalogue.md`](2026-09-pacing-catalogue.md) | Plan 68 |
| [`2026-09-natural-play-sorting.md`](2026-09-natural-play-sorting.md), [`2026-09-pacing-sorting.md`](2026-09-pacing-sorting.md) | Plan 69 |
| [`2026-09-natural-play-economy.md`](2026-09-natural-play-economy.md), [`2026-09-pacing-economy.md`](2026-09-pacing-economy.md) | Plan 71, `design/economy.md` |
| [`2026-09-pacing-high-price.md`](2026-09-pacing-high-price.md) | Plan 72, `design/economy.md` |
| `2026-09-natural-play-catalogue.md`, `2026-09-natural-play-money.md`, `2026-09-pacing-money.md` | nothing (intermediate runs; candidates for deletion) |

## Screenshot evidence

| Folder | Plans |
|---|---|
| [`2026-09-phone/`](2026-09-phone/) | 70G (the phone sweep; also `unischool/tools/README.md`) |
| [`2026-09-residences/`](2026-09-residences/), [`2026-09-garden/`](2026-09-garden/), [`2026-09-monuments/`](2026-09-monuments/) | 72 |
| [`2026-09-style-studies/`](2026-09-style-studies/) | the UI style studies that came before Plan 77 (the inbox's own proposal stays in `design/inbox.html`, where Plan 77 cites it) |
| [`2026-10-campus-fixes/`](2026-10-campus-fixes/) | 74, 75, 80H, 81, 82 |
| [`2026-10-ui-fixes/`](2026-10-ui-fixes/) | 76, 78, 80B |
| [`2026-10-canvas/`](2026-10-canvas/) | 83 |
| [`2026-10-canvas-construction/`](2026-10-canvas-construction/) | none: the before and after of #279 (site shells and ivy drawn black on the canvas); a candidate for deletion |
| [`2026-10-faculty/`](2026-10-faculty/) | 84 |
| [`2026-10-pillars/`](2026-10-pillars/) | 85 |

Plans 51, 52 and 54 keep their few images in `docs/plans/NN-subject/`
instead.
