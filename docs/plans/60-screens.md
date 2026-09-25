# Plan 60 — Screens

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answers

The owner's playthrough notes, the screens half. No new questions: the
defaults stood, and the owner asked for the Athletics mockup to come as the
work went rather than wait on it.

## 1. The PR

| Note | Change |
|---|---|
| Rounded buttons cut off their text (the Hellenic Council's choices and others) | `--radius-pill` is a fixed 20px, not 999px: a pill on one line, a rounded rectangle when the text wraps. The decision choices keep their own `--radius-lg`, which `.modal button`'s pill used to override. |
| The Athletics tab: too many full-width rows, too much scrolling | **Two columns.** The department (director, standings, subsidy dial, the pot as a short ledger of Figures) sits in a sticky side column with the trophy case. The programs are **compact cards in a grid**, still dragged to set the queue, the funded line running across the grid. Each card carries its **sport's rank, last season, record and rivalry** (the colleges either side in the rank's tooltip), so the separate "By sport" list is gone. Three chairs are three one-line rows; three empty chairs are one line. The coaching market is a card grid too. |
| A lab's research options cannot be collapsed | **"Not now ✕"** on an opened lab, and Escape, put it back. |
| Curriculum: collapse programs and schools | A school and a program each have a **▸/▾ toggle**: open while incomplete, closed once complete; a dark program stays open. The player's choice holds for the session. |
| The venue panel: tiles for its teams | A venue's panel shows **a tile per team that plays there**: quality, the crowd a game, the head coach, or "awaiting this venue". |
| The History tab's standings panel | **A card per standing**, six in a grid: its rank, who leads, and its line over the fifty years. |
| The 50-year report as a full page | The final report is **a full-screen page** in the school's colors, scrolling, not a modal. |

**A Plan 59 follow-up:** a program gone dark said so only on its row. The
guided player's thirty-year run carried thirteen dark programs with $4M in
the bank; now the **next-step line names a dark program first** whenever the
payroll or the market can staff it (`restaff` intent), and the same run ends
Year 31 with two (both waiting on the week's listing) and $38M.

**Tests:** `playthrough-rules.test.ts` (the dark line comes first and moves
on once staffed); `figures.test.ts`'s bare-figure ceiling falls to 29.

**As implemented:**

- The button sweep measured every button in seven tabs, the campus, the
  Hellenic petition and the summer: a wrapped line inside a radius of at
  least a third of the height, or text overflowing. After the change, what
  it still flags is one-line buttons with a badge or a stacked icon, which
  are meant to look that way.
- The guided player's final rank, three runs, before and after the line:
  9, 12 and 12 with Plan 59 alone; 1, 2 and 4 with it.
- The guided report's "every letter's ask done" reads Year 12 since Plan 59
  (*The laboratories* asks every lab to finish an initiative, which takes a
  decade), not Year 3 as Plan 58 measured; this plan does not move it.
