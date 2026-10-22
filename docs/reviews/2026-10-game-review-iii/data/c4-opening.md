# The opening on b1f2114 (area 4, review III)

`npm run natural -- --opening`, run once by area 4 (107 s), output unchanged below the line. Compare `docs/reviews/2026-10-pacing-opening-96i.md` (before Plan 107).

---


Years 1–5, each read as the next year opens (its summer just closed), for the pacing scorecard's three players on seeds 12345, 4242, 777, and the natural line again at the owner's prices from the second playthrough ($25,000 in year 1, $20,000 in year 2, its own after). *Tolerance* is the families' price tolerance at the prestige the summer was priced at. Written by `npm run natural -- --opening` (`sim/opening.ts`, Plan 96B) in 107 s.

### Natural, seed 12345

| Year | Tuition | Tolerance | Applicants | Enrolled | Net/wk | Cash | Prestige → target | Satisfaction | Courses (writing) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | $29k | $18k | 96 | 346 | $64k | $135k | 38.4 → 47.2 | 82.0 | 8 (1) |
| 2 | $31k | $20k | 219 | 448 | $63k | $208k | 43.6 → 48.2 | 89.3 | 11 (1) |
| 3 | $33k | $20k | 294 | 614 | $122k | $673k | 45.9 → 48.0 | 93.0 | 17 (1) |
| 4 | $33k | $21k | 420 | 888 | $215k | $996k | 47.0 → 47.9 | 85.3 | 27 (1) |
| 5 | $34k | $21k | 372 | 1,125 | $353k | $2.9M | 47.3 → 47.7 | 90.9 | 33 (4) |

The pool, factor by factor (applicants are about their product):

| Year | Prestige pool | Price | Sticker shock | Beds | Word of mouth | Beauty | Cohorts |
|---|---|---|---|---|---|---|---|
| 1 | 2,295 | 0.21 | 0.48 | 0.44 | 0.96 | 1.02 | 0.98 |
| 2 | 3,765 | 0.21 | 0.48 | 0.44 | 1.34 | 1.03 | 0.98 |
| 3 | 5,012 | 0.20 | 0.48 | 0.44 | 1.36 | 1.03 | 0.98 |
| 4 | 5,601 | 0.20 | 0.48 | 0.44 | 1.33 | 1.03 | 1.00 |
| 5 | 5,893 | 0.20 | 0.47 | 0.44 | 1.33 | 1.03 | 1.01 |

### Natural, seed 4242

| Year | Tuition | Tolerance | Applicants | Enrolled | Net/wk | Cash | Prestige → target | Satisfaction | Courses (writing) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | $29k | $18k | 94 | 344 | $65k | $269k | 37.8 → 46.3 | 80.9 | 8 (1) |
| 2 | $31k | $19k | 200 | 429 | $64k | $397k | 42.5 → 46.6 | 87.9 | 11 (1) |
| 3 | $32k | $20k | 277 | 580 | $114k | $564k | 45.2 → 47.6 | 88.5 | 17 (1) |
| 4 | $33k | $21k | 368 | 807 | $195k | $909k | 46.9 → 48.4 | 88.7 | 26 (1) |
| 5 | $34k | $21k | 427 | 1,094 | $307k | $2.7M | 50.2 → 53.4 | 89.5 | 31 (3) |

The pool, factor by factor (applicants are about their product):

| Year | Prestige pool | Price | Sticker shock | Beds | Word of mouth | Beauty | Cohorts |
|---|---|---|---|---|---|---|---|
| 1 | 2,267 | 0.21 | 0.48 | 0.44 | 0.96 | 1.02 | 0.98 |
| 2 | 3,594 | 0.20 | 0.47 | 0.44 | 1.30 | 1.03 | 0.98 |
| 3 | 4,702 | 0.21 | 0.48 | 0.44 | 1.34 | 1.03 | 0.98 |
| 4 | 5,424 | 0.20 | 0.47 | 0.44 | 1.32 | 1.03 | 0.98 |
| 5 | 6,069 | 0.20 | 0.48 | 0.44 | 1.35 | 1.03 | 1.01 |

### Natural, seed 777

| Year | Tuition | Tolerance | Applicants | Enrolled | Net/wk | Cash | Prestige → target | Satisfaction | Courses (writing) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | $29k | $18k | 95 | 344 | $66k | $349k | 37.8 → 46.3 | 81.8 | 8 (1) |
| 2 | $31k | $19k | 200 | 430 | $66k | $570k | 42.7 → 47.0 | 86.7 | 11 (1) |
| 3 | $32k | $20k | 281 | 584 | $116k | $865k | 45.3 → 47.6 | 87.8 | 17 (1) |
| 4 | $33k | $21k | 367 | 811 | $199k | $641k | 46.5 → 47.5 | 86.8 | 26 (2) |
| 5 | $34k | $21k | 402 | 1,084 | $314k | $2.4M | 49.3 → 51.9 | 89.2 | 32 (4) |

The pool, factor by factor (applicants are about their product):

| Year | Prestige pool | Price | Sticker shock | Beds | Word of mouth | Beauty | Cohorts |
|---|---|---|---|---|---|---|---|
| 1 | 2,266 | 0.21 | 0.48 | 0.44 | 0.95 | 1.02 | 0.98 |
| 2 | 3,601 | 0.20 | 0.48 | 0.44 | 1.30 | 1.03 | 0.98 |
| 3 | 4,755 | 0.21 | 0.48 | 0.44 | 1.33 | 1.03 | 0.98 |
| 4 | 5,432 | 0.20 | 0.47 | 0.44 | 1.30 | 1.03 | 0.99 |
| 5 | 5,943 | 0.20 | 0.48 | 0.44 | 1.30 | 1.03 | 1.01 |

### Guided, seed 12345

| Year | Tuition | Tolerance | Applicants | Enrolled | Net/wk | Cash | Prestige → target | Satisfaction | Courses (writing) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | $18k | $18k | 338 | 554 | $65k | $702k | 37.4 → 46.1 | 77.6 | 7 (1) |
| 2 | $19k | $19k | 703 | 640 | $84k | $1.3M | 42.7 → 47.8 | 88.7 | 8 (0) |
| 3 | $20k | $20k | 1,120 | 1,200 | $87k | $3.2M | 46.3 → 49.5 | 83.8 | 15 (0) |
| 4 | $21k | $21k | 1,727 | 1,520 | $212k | $1.0M | 48.2 → 50.2 | 91.9 | 19 (3) |
| 5 | $21k | $21k | 1,964 | 2,240 | $271k | $1.7M | 49.3 → 50.3 | 86.1 | 28 (1) |

The pool, factor by factor (applicants are about their product):

| Year | Prestige pool | Price | Sticker shock | Beds | Word of mouth | Beauty | Cohorts |
|---|---|---|---|---|---|---|---|
| 1 | 2,236 | 0.37 | 1.00 | 0.44 | 0.91 | 1.01 | 1.01 |
| 2 | 3,508 | 0.37 | 1.00 | 0.44 | 1.20 | 1.01 | 1.02 |
| 3 | 4,791 | 0.37 | 1.00 | 0.44 | 1.33 | 1.01 | 1.02 |
| 4 | 5,774 | 0.37 | 1.00 | 0.57 | 1.31 | 1.01 | 1.05 |
| 5 | 6,341 | 0.37 | 1.00 | 0.58 | 1.31 | 1.01 | 1.06 |

### Guided, seed 4242

| Year | Tuition | Tolerance | Applicants | Enrolled | Net/wk | Cash | Prestige → target | Satisfaction | Courses (writing) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | $18k | $18k | 336 | 553 | $64k | $739k | 37.2 → 45.6 | 77.2 | 7 (1) |
| 2 | $19k | $19k | 690 | 640 | $84k | $466k | 42.4 → 47.5 | 88.4 | 8 (1) |
| 3 | $20k | $20k | 1,174 | 1,200 | $85k | $1.8M | 46.4 → 49.9 | 87.8 | 15 (0) |
| 4 | $21k | $21k | 1,767 | 1,440 | $212k | $1.7M | 48.1 → 49.8 | 88.6 | 18 (3) |
| 5 | $21k | $21k | 1,972 | 2,400 | $257k | $1.2M | 49.0 → 49.7 | 85.6 | 30 (3) |

The pool, factor by factor (applicants are about their product):

| Year | Prestige pool | Price | Sticker shock | Beds | Word of mouth | Beauty | Cohorts |
|---|---|---|---|---|---|---|---|
| 1 | 2,231 | 0.37 | 1.00 | 0.44 | 0.91 | 1.01 | 1.01 |
| 2 | 3,446 | 0.37 | 1.00 | 0.44 | 1.20 | 1.01 | 1.02 |
| 3 | 4,736 | 0.37 | 1.00 | 0.44 | 1.36 | 1.01 | 1.05 |
| 4 | 5,799 | 0.37 | 1.00 | 0.57 | 1.30 | 1.01 | 1.08 |
| 5 | 6,278 | 0.37 | 1.00 | 0.57 | 1.30 | 1.01 | 1.09 |

### Guided, seed 777

| Year | Tuition | Tolerance | Applicants | Enrolled | Net/wk | Cash | Prestige → target | Satisfaction | Courses (writing) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | $18k | $18k | 337 | 553 | $65k | $690k | 37.3 → 45.7 | 77.4 | 7 (1) |
| 2 | $19k | $19k | 685 | 640 | $82k | $1.2M | 42.7 → 48.1 | 87.3 | 8 (0) |
| 3 | $20k | $20k | 1,139 | 1,120 | $85k | $3.4M | 46.4 → 49.8 | 86.6 | 14 (0) |
| 4 | $21k | $21k | 1,482 | 2,080 | $201k | $1.2M | 48.4 → 49.9 | 88.5 | 26 (1) |
| 5 | $21k | $21k | 1,642 | 2,640 | $418k | $2.3M | 48.7 → 50.0 | 76.6 | 33 (4) |

The pool, factor by factor (applicants are about their product):

| Year | Prestige pool | Price | Sticker shock | Beds | Word of mouth | Beauty | Cohorts |
|---|---|---|---|---|---|---|---|
| 1 | 2,234 | 0.37 | 1.00 | 0.44 | 0.91 | 1.01 | 1.01 |
| 2 | 3,456 | 0.37 | 1.00 | 0.44 | 1.19 | 1.01 | 1.01 |
| 3 | 4,812 | 0.37 | 1.00 | 0.44 | 1.35 | 1.01 | 1.02 |
| 4 | 5,849 | 0.37 | 1.00 | 0.44 | 1.34 | 1.01 | 1.08 |
| 5 | 6,359 | 0.37 | 1.00 | 0.57 | 1.08 | 1.01 | 1.10 |

### Completionist, seed 12345

| Year | Tuition | Tolerance | Applicants | Enrolled | Net/wk | Cash | Prestige → target | Satisfaction | Courses (writing) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | $18k | $18k | 355 | 560 | $64k | $609k | 37.8 → 46.5 | 80.9 | 7 (1) |
| 2 | $19k | $19k | 746 | 800 | $83k | $566k | 42.9 → 47.7 | 87.7 | 10 (1) |
| 3 | $20k | $20k | 1,200 | 1,280 | $131k | $811k | 46.1 → 48.9 | 90.4 | 16 (2) |
| 4 | $21k | $21k | 1,781 | 1,920 | $240k | $1.5M | 47.9 → 49.5 | 93.0 | 24 (2) |
| 5 | $21k | $21k | 1,906 | 2,240 | $377k | $1.6M | 49.2 → 50.5 | 88.5 | 28 (3) |

The pool, factor by factor (applicants are about their product):

| Year | Prestige pool | Price | Sticker shock | Beds | Word of mouth | Beauty | Cohorts |
|---|---|---|---|---|---|---|---|
| 1 | 2,257 | 0.37 | 1.00 | 0.44 | 0.94 | 1.02 | 1.01 |
| 2 | 3,592 | 0.37 | 1.00 | 0.44 | 1.22 | 1.03 | 1.02 |
| 3 | 4,843 | 0.37 | 1.00 | 0.44 | 1.37 | 1.03 | 1.03 |
| 4 | 5,702 | 0.37 | 1.00 | 0.57 | 1.36 | 1.03 | 1.04 |
| 5 | 6,238 | 0.37 | 1.00 | 0.58 | 1.30 | 1.04 | 1.05 |

### Completionist, seed 4242

| Year | Tuition | Tolerance | Applicants | Enrolled | Net/wk | Cash | Prestige → target | Satisfaction | Courses (writing) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | $18k | $18k | 352 | 560 | $64k | $585k | 37.6 → 46.2 | 79.5 | 7 (1) |
| 2 | $19k | $19k | 719 | 800 | $86k | $681k | 42.8 → 47.8 | 88.0 | 10 (1) |
| 3 | $20k | $20k | 1,114 | 1,360 | $133k | $1.1M | 44.7 → 46.2 | 85.6 | 17 (1) |
| 4 | $21k | $21k | 1,558 | 2,080 | $261k | $1.5M | 46.5 → 48.2 | 87.7 | 26 (2) |
| 5 | $21k | $21k | 1,590 | 2,400 | $410k | $1.9M | 47.8 → 49.2 | 85.2 | 30 (3) |

The pool, factor by factor (applicants are about their product):

| Year | Prestige pool | Price | Sticker shock | Beds | Word of mouth | Beauty | Cohorts |
|---|---|---|---|---|---|---|---|
| 1 | 2,252 | 0.37 | 1.00 | 0.44 | 0.94 | 1.02 | 1.01 |
| 2 | 3,543 | 0.37 | 1.00 | 0.44 | 1.20 | 1.03 | 1.02 |
| 3 | 4,767 | 0.37 | 1.00 | 0.44 | 1.33 | 1.03 | 1.02 |
| 4 | 5,273 | 0.37 | 1.00 | 0.57 | 1.28 | 1.03 | 1.03 |
| 5 | 5,786 | 0.37 | 1.00 | 0.57 | 1.20 | 1.04 | 1.04 |

### Completionist, seed 777

| Year | Tuition | Tolerance | Applicants | Enrolled | Net/wk | Cash | Prestige → target | Satisfaction | Courses (writing) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | $18k | $18k | 359 | 560 | $62k | $501k | 38.1 → 47.2 | 81.8 | 7 (1) |
| 2 | $20k | $20k | 780 | 720 | $82k | $394k | 43.3 → 48.2 | 88.3 | 9 (2) |
| 3 | $20k | $20k | 1,210 | 1,200 | $112k | $596k | 46.3 → 48.9 | 90.9 | 15 (2) |
| 4 | $21k | $21k | 1,806 | 1,840 | $225k | $1.5M | 47.8 → 49.1 | 92.7 | 23 (1) |
| 5 | $21k | $21k | 1,934 | 2,240 | $360k | $1.3M | 48.9 → 50.2 | 89.3 | 28 (2) |

The pool, factor by factor (applicants are about their product):

| Year | Prestige pool | Price | Sticker shock | Beds | Word of mouth | Beauty | Cohorts |
|---|---|---|---|---|---|---|---|
| 1 | 2,272 | 0.37 | 1.00 | 0.44 | 0.94 | 1.02 | 1.01 |
| 2 | 3,705 | 0.37 | 1.00 | 0.44 | 1.24 | 1.03 | 1.02 |
| 3 | 4,965 | 0.37 | 1.00 | 0.44 | 1.38 | 1.03 | 1.03 |
| 4 | 5,755 | 0.37 | 1.00 | 0.57 | 1.38 | 1.03 | 1.04 |
| 5 | 6,198 | 0.37 | 1.00 | 0.58 | 1.30 | 1.04 | 1.05 |

### Natural at the owner's prices ($25k, then $20k), seed 12345

| Year | Tuition | Tolerance | Applicants | Enrolled | Net/wk | Cash | Prestige → target | Satisfaction | Courses (writing) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | $25k | $18k | 160 | 401 | $64k | $135k | 38.4 → 47.2 | 82.0 | 8 (1) |
| 2 | $20k | $20k | 796 | 880 | $74k | $679k | 43.6 → 48.3 | 90.1 | 11 (1) |
| 3 | $33k | $20k | 273 | 1,027 | $189k | $957k | 45.8 → 47.5 | 81.8 | 21 (1) |
| 4 | $33k | $21k | 455 | 1,331 | $268k | $440k | 47.0 → 48.0 | 90.2 | 28 (2) |
| 5 | $34k | $21k | 423 | 1,557 | $429k | $568k | 47.3 → 47.6 | 90.3 | 36 (4) |

The pool, factor by factor (applicants are about their product):

| Year | Prestige pool | Price | Sticker shock | Beds | Word of mouth | Beauty | Cohorts |
|---|---|---|---|---|---|---|---|
| 1 | 2,295 | 0.26 | 0.64 | 0.44 | 0.96 | 1.02 | 0.99 |
| 2 | 3,765 | 0.36 | 0.97 | 0.44 | 1.32 | 1.03 | 1.01 |
| 3 | 5,028 | 0.20 | 0.48 | 0.44 | 1.24 | 1.03 | 0.99 |
| 4 | 5,584 | 0.20 | 0.48 | 0.46 | 1.27 | 1.03 | 1.01 |
| 5 | 5,883 | 0.20 | 0.47 | 0.49 | 1.37 | 1.03 | 1.02 |

### Natural at the owner's prices ($25k, then $20k), seed 4242

| Year | Tuition | Tolerance | Applicants | Enrolled | Net/wk | Cash | Prestige → target | Satisfaction | Courses (writing) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | $25k | $18k | 156 | 397 | $65k | $269k | 37.8 → 46.3 | 80.9 | 8 (1) |
| 2 | $20k | $19k | 727 | 937 | $78k | $80k | 42.6 → 46.7 | 87.6 | 12 (1) |
| 3 | $32k | $20k | 237 | 1,053 | $206k | $208k | 44.6 → 46.2 | 76.2 | 22 (2) |
| 4 | $33k | $21k | 396 | 1,302 | $265k | $1.1M | 45.9 → 48.2 | 83.3 | 29 (1) |
| 5 | $33k | $21k | 448 | 1,554 | $375k | $2.8M | 47.5 → 48.9 | 89.8 | 38 (1) |

The pool, factor by factor (applicants are about their product):

| Year | Prestige pool | Price | Sticker shock | Beds | Word of mouth | Beauty | Cohorts |
|---|---|---|---|---|---|---|---|
| 1 | 2,267 | 0.26 | 0.63 | 0.44 | 0.96 | 1.02 | 0.99 |
| 2 | 3,592 | 0.36 | 0.96 | 0.44 | 1.28 | 1.03 | 1.01 |
| 3 | 4,685 | 0.21 | 0.48 | 0.44 | 1.14 | 1.03 | 0.99 |
| 4 | 5,186 | 0.21 | 0.48 | 0.46 | 1.11 | 1.03 | 1.01 |
| 5 | 5,635 | 0.20 | 0.48 | 0.49 | 1.35 | 1.03 | 1.02 |

### Natural at the owner's prices ($25k, then $20k), seed 777

| Year | Tuition | Tolerance | Applicants | Enrolled | Net/wk | Cash | Prestige → target | Satisfaction | Courses (writing) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | $25k | $18k | 157 | 398 | $66k | $349k | 37.8 → 46.3 | 81.8 | 8 (1) |
| 2 | $20k | $19k | 729 | 939 | $80k | $272k | 42.7 → 47.0 | 86.4 | 12 (1) |
| 3 | $32k | $20k | 249 | 1,066 | $207k | $465k | 45.0 → 47.3 | 80.5 | 22 (2) |
| 4 | $33k | $21k | 419 | 1,339 | $272k | $720k | 46.3 → 48.0 | 86.7 | 28 (2) |
| 5 | $34k | $21k | 467 | 1,603 | $388k | $1.7M | 49.8 → 52.9 | 89.2 | 38 (3) |

The pool, factor by factor (applicants are about their product):

| Year | Prestige pool | Price | Sticker shock | Beds | Word of mouth | Beauty | Cohorts |
|---|---|---|---|---|---|---|---|
| 1 | 2,266 | 0.26 | 0.63 | 0.44 | 0.95 | 1.02 | 0.99 |
| 2 | 3,600 | 0.36 | 0.97 | 0.44 | 1.28 | 1.03 | 1.01 |
| 3 | 4,748 | 0.21 | 0.48 | 0.44 | 1.17 | 1.03 | 0.99 |
| 4 | 5,333 | 0.21 | 0.49 | 0.46 | 1.15 | 1.03 | 1.01 |
| 5 | 5,927 | 0.20 | 0.47 | 0.49 | 1.35 | 1.03 | 1.03 |

