# Appendix to area 2: consistency on the new screens

Plan 86's area 2, third review. Commit read: `b1f2114`. The new screens (the drawer, the admissions page, Prestige at a glance, the Faculty's table and plot, the Treasury board, the save slots, Settings) were checked against the register (`docs/architecture/ui-shell.md`) and Plan 47's glossary. The method is review II's 2c, from the gallery's captures (`data/c2-gallery.md`) and the source. Counts of fonts and spacing were not redone: Plans 89–108 restyled within the existing tokens.

## What became of review II's departures (D1–D12)

| II | What | On `b1f2114` |
|---|---|---|
| D1 | Two armed labels off the rule | **Fixed for training** ("Confirm — {course} loses its teacher for a term", `trainingData.ts:100`). **Back for the specialization**: the armed label is a bare "Confirm" (`specializationData.ts:343`, used at `SpecializationChoice.tsx:95`). 95J's "Confirm — the other three shares stay empty for good" was later cut by the over-explaining pass (`a7f2287d`). The warning beneath still says it is for good, but the run's one permanent button no longer names its loss (C2-10). |
| D2 | Bare "slots" | **Fixed** on the tile ("4/10 course slots") and the suggested move. One new bare "slots" in the claimed hall's note: "…so its free slots take the programs on offer" (`BuildingInfoPanel.tsx:544`, found by the repaired scanner). The save slots are a different thing, and the scanner now excuses them. |
| D3 | Dismiss on every tile | **Fixed** (95G). |
| D4 | A fifth button role (Train) | **Fixed on the grid**, kept on the person page by choice (95G). |
| D5 | The inbox's "Y31W1" | **Fixed** (95J). The log ticker keeps "Y41W1", as the register allows. |
| D6 | "Spring Term" | **Fixed** in player text. It survives only in comments. |
| D7 | "took its default" | **Fixed.** |
| D8 | "Answer to go on" as a pill | **Fixed**: flat italic (95K). |
| D9 | The funds figure's commas | **Fixed** for the funds (display face, tabular). The weekly net beside it stays in Azeret Mono ("+$2,518,282/wk", spaced commas), and so do the Treasury's levers ("100% of need", "$30,700"). |
| D10 | Six or seven standings | **Fixed** (95J). |
| D11 | "Distinguished" twice | **Resolved by 95J's deviation**, with one leftover. Chapter 8 now names the ranks ("from Adjunct to Distinguished") a click from History's "distinguished program" milestones. That is the overlap 95J chose to keep. |
| D12 | Spacing literals | Not re-counted. |

## New departures

| # | Departure | Where | Rule | Severity |
|---|---|---|---|---|
| E1 | **Two week numbers.** The dock's calendar counts weeks within a term, 1–26 (Plan 90's desk calendar, `format.ts:162`). Briefings and letters write the week of the year: "Week 52 is the summer", "the playoffs in week 47", "At week 52 the clock stops". During the playoffs the dock reads Spring · 21, and at the summer Spring · 26. The long date mixes the two: `gameDate` prints a term with the week of the year, as in the inbox's "Year 1 · Spring term · Week 27", which is the dock's Spring · 1. | `StatusHeader.tsx:219`; `chapterData.ts:145, 270`; `eventData.ts:1212`; `format.ts:168` | R9, one game date | **minor** (C2-8) |
| E2 | **Teaching as a number, with letters left over.** Plan 104G made teaching a number out of 100 and kept the band colors (78/62/44/30). Objective "Appoint a professor who teaches at B or better" (`chapterData.ts:187`); the Faculty filter's tooltip "below an A in teaching" (`FacultyTab.tsx:599`); the plot's grid lines "A 78", "B 62", "C 44" (`facultySort.ts:72`); the training card's "a full grade better at teaching" (`specializationData.ts:234`). Elsewhere the same line is "the top band" (107H). | as listed | One name per thing | **minor** (C2-9) |
| E3 | **The drawer's two scales.** "Its pillars: Academics 5.6 of 41.3 · Research 0.0 of 29.5 …" (`ObjectivesPanel.tsx:50`) puts each pillar out of 41.3/29.5/17.7. The Review says "Academics: +5.5 of 41.3 / Academics stands at 47.7 of 150", and the glance shows "+5.8" on a meter with no maximum. That is three presentations of one figure, and 41.3 is never explained (it is 35% of 118). | as listed | — | **minor** (C2-6) |
| E4 | **"Full marks"** on a satisfaction dial at 100. The scanner flags it as British idiom; the glossary's word is "the top". | `StudentLifeTab.tsx:195` | voice | polish |
| E5 | **Scoreboard figures.** The Athletics scoreboard prints "7/100" in gold, scoreboard style, for the team's *rank* in its sport (7th of 100), one cell from "quality 69". Everywhere else in the game "/100" means a score out of 100, so "7/100" beside a quality of 69 reads as a bad score ([image](img/c2-scoreboard.jpg)). | `AthleticsTab.tsx:427` | One way to write a number | **minor** (C2-9) |
| E6 | **Contractions** in new text: "won't return" (admissions page), "isn't open to build yet" (build menu), "It doesn't come back this run" (the skip). The house rule is none. | `AdmissionsPage.tsx:458`, `buildWords.ts:32`, `openingData.ts:79` | voice | polish |
| E7 | **Second person** grew from 21 (after 95J) to 40, mostly new: the Faculty plot and table's "Your faculty's median(s)" ×9, "For your next college" (the architecture unlock), "Costs {cost} · you have {cash}" on build tiles. | `FacultyPlot.tsx:115–222`, `FacultyTable.tsx:52`, `FacultyTile.tsx:76, 88`, `inbox.ts:145, 162`, `buildWords.ts:29` | voice | polish |

## Clean on the new screens

- **The drawer's buttons are in the register** (107B): Show me, Go and All milestones are cream pills; Back and the Guide's chapter links are quiet. Guide and Close sit side by side in the tab head and match.
- **The admissions page** has one primary per stage (Lock the price, then Send the offers). Its steps and eyebrows ("1 · THE PRICE") follow the summer's own numbering.
- **Prestige at a glance** has one figure per row, as the owner asked.
- **The Faculty table and plot** reuse the tile's chips and the segmented switches.
- **Save slots and Settings** use the menu's buttons and the switch. Every loss asks first ("Confirm — replace {college}").
