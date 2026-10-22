# Area 4's probes on older trees (review III)

Each line is one 50-year (or 10-year) harness game, seed 12345, name Halifax, played by a probe in area 4's scratch directory against a tree extracted with `git archive <commit>`. *blind* is the Guided player with `TEACHING.care = false` (`sim/harness/moves.ts`: hires the cheapest, never tends the teaching), the scorecard's teaching-blind line; *care* is the Guided player as it plays. Read with `4-strategy.md`, C4-2, C4-3 and C4-9.

## The teaching-blind Guided player, bisected (prestige, rank and students at Y10–Y50)

```
526e957a  2026-10-20 Merge pull request #396 from loumiy/claude/stoic-ride-wge7g3
0a1b40ea  2026-10-20 NEXT asks for a library only when one would help (S2)
39ed87b7  2026-10-20 Merge pull request #399 from loumiy/claude/stoic-ride-wge7g3
77e90652  2026-10-20 Plan 106 PR C: the walkthrough ends at the founding; chapters take over (#400)
b7dab812  2026-10-20 Plan 106 PR D: the rest of year 1, Paying for it and The first summer (#401)
4aa162c2  2026-10-21 Plan 107: the owner's notes after Plan 106 (proposed)
281a9548  2026-10-21 Plan 107 PR B: chapter 8 opens the Faculty tab, and the drawer's buttons in the register
9774eab3  2026-10-21 Plan 107 PR D: prestige at a glance
434c90ce  2026-10-21 Plan 107 PR E: crowding goes
5eba30b5  2026-10-21 Plan 107 PR F: prestige that moves early
fa51c1d5  2026-10-19 sim: rebase the baseline for the claimed-hall offer fix (the last baseline before Plan 107)
b1f2114  2026-10-21 0.1.3

b1f2114 blind 12345 Y10 P56.7 R54 N8480 | Y20 P72.2 R39 N21280 | Y30 P92.4 R21 N32080 | Y40 P111.1 R3 N37840 | Y50 P116.9 R1 N37840
fa51c1d5 blind 12345 Y10 P48.9 R57 N6880 | Y20 P65.3 R53 N18640 | Y30 P79.4 R35 N27360 | Y40 P95.1 R19 N37200 | Y50 P106.7 R9 N37840
```

(The runs on the bisect trees, as printed:)

```
526e957a blind 12345 Y10 P48.9 R57 N6880 | Y20 P65.3 R53 N18640 | Y30 P79.4 R35 N27360 | Y40 P95.1 R19 N37200 | Y50 P106.7 R9 N37840
0a1b40ea blind 12345 Y10 P48.9 R57 N6880 | Y20 P67.3 R50 N18640 | Y30 P89.4 R22 N28720 | Y40 P107.8 R7 N37840 | Y50 P115.7 R1 N37840
39ed87b7, 77e90652, b7dab812, 4aa162c2, 281a9548: identical to 0a1b40ea
9774eab3 blind 12345 Y10 P50.5 R57 N8080 | Y20 P69.9 R44 N18960 | Y30 P89.8 R20 N29680 | Y40 P110.0 R5 N37840 | Y50 P117.6 R1 N37840
434c90ce blind 12345 Y10 P53.3 R56 N8160 | Y20 P69.2 R45 N20880 | Y30 P82.6 R31 N30480 | Y40 P105.2 R7 N36240 | Y50 P116.8 R1 N37840
5eba30b5 blind 12345 Y10 P55.7 R55 N8480 | Y20 P72.4 R37 N19600 | Y30 P91.4 R21 N29280 | Y40 P109.2 R4 N37840 | Y50 P116.8 R1 N37840
526e957a care 12345 Y10 P53.0 R56 N8640 | Y20 P70.1 R45 N20880 | Y30 P91.6 R16 N31760 | Y40 P108.7 R4 N37840 | Y50 P115.1 R1 N37840
0a1b40ea care 12345 (identical to 526e957a)
```

## What the NEXT line asked the blind player for, years 1–30

```
526e957a blind Y30: saving weeks 233 asked {"found":68,"wait":47,"site":190,"build-for":852,"move":38,"develop":303,"research":36,"restaff":4} carried {"found":23,"site":8,"build-for":1,"move":38,"develop":3,"research":13,"restaff":4} libraries 1
0a1b40ea blind Y30: saving weeks 234 asked {"found":68,"wait":569,"site":190,"build-for":5,"move":38,"develop":302,"research":354,"restaff":12} carried {"found":23,"site":8,"build-for":1,"move":38,"develop":3,"research":331,"restaff":12} libraries 1
```

## The natural line before Plan 107 (`fa51c1d5`)

```
fa51c1d5 natural 12345 Y10 P52.4 R56 N1934 cash 3.0M net 0.7M tuition 34000 | Y20 P75.3 R37 N13359 cash 127.9M net 5.6M tuition 41000 | Y30 P94.1 R13 N22618 cash 2.95B net 11.6M tuition 47000 | Y40 P114.0 R1 N37840 cash 10.63B net 17.8M tuition 53500 | Y50 P119.2 R1 N37840 cash 25.42B net 19.5M tuition 55000
```

## The Idle and Guided players' first ten years (prestige at the start of each year)

```
now Idle prestige at the start of years 1-11: 32.0 32.9 33.6 33.3 33.2 35.7 39.4 41.1 41.4 42.0 42.3
now Guided prestige at the start of years 1-11: 32.0 37.5 42.7 46.3 48.2 49.3 50.9 52.8 54.4 56.1 57.4
pre107 (fa51c1d5) Idle prestige at the start of years 1-11: 42.0 31.6 24.2 19.6 16.0 18.3 20.8 23.1 25.5 27.8 30.1
pre107 (fa51c1d5) Guided prestige at the start of years 1-11: 42.0 39.6 40.6 41.7 42.6 43.3 45.3 46.3 48.5 50.7 53.0
```
