# Plan 118 — 0.2.0: fixes and words

*The owner's choices for 0.2.0 (28 October 2026), after the playtest's
fourth week: everything players tripped on since 0.1.4 that is a bug or a
missing sentence. The rest of 0.2.0 is Plans 119–121. The findings it
answers are in [findings.md](../reviews/playtest-1/findings.md).*

**Status: Proposed (28 October 2026).** A is done: on main as PR #428 and
on `release/0.1.4.1` as the hotfix.

0.2.0 is one update made of four plans:

| Plan | What | Checked by |
|---|---|---|
| 118 | Fixes and words (this plan) | tests, the text check |
| [119](119-the-campus-grade.md) | The Campus grade, in place of Access | sim tuning, report tests |
| [120](120-running-the-college.md) | Deans who staff, line paint, a second specialization building | tests, a sim run |
| [121](121-championships.md) | Titles every two or three years, dearer venues | sim runs against the targets |

Order: 118 first, then 121, then 119 and 120 side by side. The devlog
(PR I) comes last, once the other three have landed.

---

## 0. What stands today

- **0.1.4** is live on itch.io (build `d085c5a`).
- **0.1.4.1** is the hotfix for I9 alone: the I9 fix cherry-picked onto
  `d085c5a`, the version, and a changelog entry. It is built and checked
  on `release/0.1.4.1`, and waits to be pushed and uploaded.
- Main carries the I9 fix and research prizes by field and depth, both
  for 0.2.0.

## 1. The PRs

| PR | Finding | Change |
|---|---|---|
| A | I9, F12 | **Done.** The fiftieth summer's admissions opens as a page, so Continue into the Epilogue no longer stops with nothing to press. |
| B | F10 | **A club's ask, refused a tick too early.** Greek life or a team asks for money, the player can't cover it and refuses, and the next tick the cash is there. Trace whether the ask is checked against cash before the week's income lands, and fix the order. A refused Greek life asks again after a while, as a team does. |
| C | S4 | **The forecourt loop.** While only Founders Hall stands, students shuttle between the hall and two spots (`walkRoutes.ts`'s `forecourt`). More spots, spread around the hall and along the drive, and a pause at each before turning back. |
| D | I5 | **Capital projects you can find.** The build menu's Capital projects tab shows locked projects greyed out, each with what opens it (`projectOpens`), as it already does for the specialization buildings. The chapter's help names the curriculum gate. The Medical Center counts toward *Begin a capital project*. |
| E | I7 | **The second course, while the first is still written.** The help for *Start a program's second course* says "Let ENGL 101 finish first (N weeks left)" while the first course is still in development, then the Develop step. Chapter help can't read the state today, so this adds a state-aware line, or puts it on the NEXT line. |
| F | I6 | **Say what Year 50 is.** The chapter that frames the long game, and the title screen's help, say the Final Report at Year 50 is the scored ending and the Epilogue is optional play past it. |
| G | F10 | **Student quality and the endowment, in a sentence each.** Where student quality is shown, say what it feeds. On the Treasury's endowment panel, say what the fund is for and what a capital project may draw from it. |
| H | I9's reply | **A safety net for dead ends.** A test that walks each summer beat of a final and a non-final summer through `InterruptModal` and asserts each one draws a button, so a page that hides itself can't strand a run again. |
| I | F13, all | **The 0.2.0 devlog and changelog**, last. They name the fixes players asked for. One line says the owner is looking for an artist to replace the title screen's background (F13; the owner's decision). |

Every PR that changes words runs `npm run review:plain`, and keeps to
Plan 111's rules.

## 2. Decisions

1. **One update, not patches** (the owner): items 1–14 of the 0.2.0 list
   ship together as 0.2.0. The exception is the I9 hotfix, 0.1.4.1, because
   two players were stuck on it.
2. **The title screen's background** stays for 0.2.0. The devlog says an
   artist is being sought.
