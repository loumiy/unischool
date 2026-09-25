# Plan 59 — Rules, names and saves

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answers

The owner's playthrough notes, the rules half. Four questions, answered:

1. Unstaffed courses: **the program goes dark**, like a program in transit.
2. The club cap: **a separate cap for sport clubs**.
3. The spare hall: **six purchased halls**; Founders Hall may be a school's.
4. Research guidance: **letters and the next-step line**.

And four defaults accepted: a built Second Quad stays; a school without a
Dean gets "Staff from the market"; the stadium's second deck as one more
step (Plan 61); mockups for the screens and buildings (Plans 60–61).

## 1. The PR

| Note | Change |
|---|---|
| The Law School renamed "Social Sciences & Humanities Hall" (the Medical Center, the Arts Center too) | Only an academic hall is dedicated (`schools.ts`'s `dedicatedSchool`): a graduate host founds no school and keeps its name and look. Founders Hall keeps its name whoever fills it. |
| More academic halls than necessary | **Six purchased halls**, Elm to Sycamore. Founders Hall is the starting room until every purchased hall is sited; then the school left in it is at home there (`foundersIsHome`) and nothing asks it to move. The letters say so. |
| Delete "Second Quad" | Gone from the catalog and the ladder. |
| At 24/24 clubs no football team will come | **Sport clubs on their own cap**: one from the start, one more per 1,000 students, at most six; interest clubs keep theirs. A full list of interest clubs still grows sport clubs. The Student Life tab shows both counts. |
| Unstaffed courses cost nothing | **A program with an unstaffed course goes dark** (`techtree/darkness.ts`): no seats, its developing courses hold, every course a zero in the grade averages. |
| Restaffing is click, click, click | **Restaffing in one click** (`faculty/restaffing.ts`): the payroll first, then the cheapest listed candidate, each hire taking what their slots hold. "Staff from the market" on a school's heading in the Curriculum (`RESTAFF`); **the Deans' year-end recommendations** (`dean-recommendations`, accepted in one click); **a candidate always listed** in a field with an unstaffed course. |
| Guide the player to finish an initiative in every lab | Letters *The laboratories* and *The Research Park*; the next-step line names a lab that has not seen an initiative through before any other idle lab. |
| "Add a storey" | The library **adds a story from its panel**, through the same extension as a dorm or a dining hall (`EXTEND_BUILDING`), on its own floor plan; the build-menu tile is gone. |

**Save 78**, carried from 77: an unsited seventh hall or Second Quad leaves
the save; a sited one stays with its slots and its effects.

**Tests:** `test/playthrough-rules.test.ts` (new: darkness, restaffing, the
Deans, the market guarantee, the two club caps, the research letters, the
library's story, no Second Quad); `sorting.test.ts` (six halls, Founders
Hall home, a host keeps its name); `save-load.test.ts` (the carry); fixtures
in four suites now staff the courses they develop, since an unstaffed one
darkens its program.

**As implemented:**

- A program in transit stays *excluded* from the grade averages, as since
  Plan 14; an unstaffed one counts as zeros, because a college that
  dismisses its faculty should read an F, not a comfortable average of what
  is left.
- The Deans bring their recommendations in the first quarter of the year,
  once a year, rather than inside the summer's beats: the summer is already
  three beats long.
- The guided player's report now records when the last school settles in
  Founders Hall, in place of "Founders Hall empty".
- `balance-regression`'s economy-shape claims are reported, not failed
  (`ECONOMY_REPORT_ONLY`), per the owner's rule that balance numbers do not
  gate. The one that moved: the old harness's Earnest completionist, whose
  mid-game dip now runs from year 19 to 25 instead of 17 to 19; it
  recovers, and every hard check (stall, don't die) still gates.
