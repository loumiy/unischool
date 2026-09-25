# Plan 52 — Founding pillars

*Planning document only. Its job is to turn the owner's request into a PR.*

**Status: Landed.**

---

## 0. The request

The owner asked for:
- the courses a college opens with to come from different schools, not all
  from one;
- very recognizable course names that feel like the pillars of starting a
  school;
- the founding faculty matched to teach them.

Until now the college opened with English, History and Philosophy, all from
Social Sciences & Humanities. Letter two then asked the player to fill
Founders Hall with three more programs of that school.

## 1. The PR

- **The founding programs** are English, Mathematics and Economics
  (`FOUNDING_PROGRAMS`). Each opens with its first two courses developed:

  | Program | School | Courses |
  |---|---|---|
  | English | Social Sciences & Humanities | Introduction to Literary Studies, British Literature Survey |
  | Mathematics | Science | Calculus, Linear Algebra |
  | Economics | Business | Microeconomics, Macroeconomics |

- **The roster:**

  | Professor | Field | Teaches at founding |
  |---|---|---|
  | Dr. Grace Bennett | English | English (third slot free) |
  | Dr. Priya Iyer | Mathematics | Mathematics |
  | Dr. John Okafor | Economics (was History) | Economics |
  | Dr. Alma Reyes | Sociology | nothing yet |
  | Dr. Elena Novak | Psychology (was Philosophy) | nothing yet |

  Reyes and Novak are what the founding offer's guarantee is written
  against. It now guarantees Sociology or Psychology (was Sociology or
  Mathematics), so the first founding never needs a hire.
- **Founders Hall** begins three schools, and so is no school's hall. A
  school is a hall of the player's own.
- **Letter two**, "One school, or a building of your own", says so:
  - it names the three schools Founders Hall began;
  - it says a school takes a hall of your own, and what the first hall
    costs and waits on;
  - it says what rooms are left and which offers the roster can already
    teach.

  Its ask is "Site a hall of your own".
- **Tests** that leaned on the old founding now use the new one:
  - `instructor-swap`, `invariants`, `program-offers` and `year-in-review`;
  - `research-commitment`, whose lab field, Economics, now has a founding
    professor;
  - `save-load`;
  - `school-founding`, where Founders Hall now stays mixed.
- **Docs:** `curriculum.md`.

![The welcome letter](52-founding-pillars/welcome.png)
![Founders Hall at founding](52-founding-pillars/founders.png)

**As implemented:** as above.
- **No save bump:** only a new run's opening values change, and an
  existing run keeps the college it was founded as.
- **Harness:** untouched, as with the plans before it.
