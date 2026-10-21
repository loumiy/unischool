# Plan 108 — Admissions day

*The owner's brief (21 October 2026): the admissions cycle should be more
engaging, full screen instead of in the inbox. Not more mechanics: "it
doesn't need to be more complex, I just want it to look more engaging",
such as dots that flow into a bucket, or the applicants as a GPA/SAT
scatter plot with minimums to raise the incoming quality.*

**Status: Landed (21 October 2026), PRs A–B.** The owner picked option 3
of three drawn directions, with GPA and SAT on the axes and the money and
mood projections in the panel, from a clickable mock-up
(https://claude.ai/artifact/FQmo3h6WPjr19E4YyZbkh6), then asked for the
model's early quality mix to change so the cloud shows a young college's
progress.

---

## 0. What stood

The summer's second beat was a card in the inbox: a tuition slider set
blind and locked, a pool that ticked up from zero with eight cohort
cards, an admit-rate slider, and projections. Two decisions, read as
numbers.

## 1. The PRs

### A — The page

- **A page of its own** (`components/AdmissionsPage.tsx`), shown by
  `InterruptModal` while the summer is on beat 1, as the Final Report is on
  beat 0 of the fiftieth (`inbox.ts`'s `interruptPageUp`: the shell
  doesn't hold the inbox open for it, the shell behind it is inert, and the
  inbox has no item for it).
- **The price**, as before: blind, the tier and what families expect, the
  board's floor, the Admissions Office's range. Lock the price.
- **The applicants** rain into a GPA by SAT plot, coloured by cohort.
  `applicantCloud.ts` draws the pool's three quality bands
  (`projectAdmissions` now reports `poolByBand`), best first, each band in
  its own slice of the composite scale, a dot's SAT and GPA spread along
  its line of equal composite so a straight diagonal is exactly a cut on
  quality. One dot is one or more applicants; the pool and the room share
  the scale, so a dot is a seat.
- **The standard**: a line across the cloud, everything above it
  admitted. Because the funnel admits the best of the pool first, the line
  is the admit rate read on the plot; the commit sends the rate. Dragged
  anywhere on the plot, or moved with the arrow keys on its handle (a
  `role="slider"`). It stops at the room's edge (Plan 107G), and last
  summer's rate is a dashed line.
- **Beside it**: admit rate, the freshman class against the places, the
  class's median SAT and GPA, incoming quality; the pool against last
  summer; what the class does to the weekly net, satisfaction and the
  tightest need, the next thousand's price and cost, and who won't return.
  Every figure is the one the reducer commits with.
- **Send the offers** pours the admitted into the hall's seats, best first,
  and the Students beat opens. Under reduced motion both animations are a
  single step.
- The inbox card's form, its cohort cards and the slow reveal go.

### B — An early climb in the pool's quality

The examples drawn from the model showed a young college's cloud barely
changing from prestige 30 to 70: at a fair price `qualityMix`'s tuition
term grows with prestige and cancelled its lift, so the top band sat on its
floor. The mix now takes an extra shift that raises the top band's share,
at a fair price, from 5% at prestige 30 to 14% by 75, holding there until
the curve passes it; the low band gives up only what that adds above the
floor, so a founding college is where it was, and overpricing still costs
quality.

At the usual admit rate and a fair price, incoming quality runs 40
(prestige 32), 46 (55), 59 (70), 64 (78); it was 40, 43, 51, 59. Prestige
100 and up is unchanged. `npm run sim`: every player within 2 points of
prestige at years 10, 25 and 50 bar the Completionist's +3.5 at 50;
`sim/baseline.json` rebased.

## 2. Decided by the owner

| # | Question | Decided |
|---|---|---|
| 1 | More mechanics, or the same two decisions drawn? | **The same two, drawn.** |
| 2 | Which direction? | **The scatter with a cutoff and the class flowing into the hall** (option 3). |
| 3 | GPA and SAT, or quality out of 100? | **GPA and SAT.** |
| 4 | Money and satisfaction on the page? | **In the panel.** |
| 5 | Should a band's place on the plot slide with prestige? | **No: fix the model's early quality mix instead**, so progress shows in the pool itself. |

## Rules

- B moves balance on purpose and rebases the baseline; A changes none.
- No save version change: a save on the admissions beat opens the page,
  on the line if its price was locked.
- `npm run check` and `npm run test:slow`; checked in the browser at
  1440×900, a mid-game save recorded end to end.
