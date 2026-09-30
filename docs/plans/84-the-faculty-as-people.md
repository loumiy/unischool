# Plan 84 — The faculty as people

*Planning document only. Its job is to turn the owner's faculty ideas into
PRs: a market that reflects the college's standing, and a Faculty tab that
shows each professor as a person with a career.*

**Status: Landed. A to E merged (#267, #269–#272).**

---

## 0. The owner's ask

> "I want the faculty system to feel more personal. Instead of grouping
> faculty by field, I want a big grid of faculty tiles, with headshots, and
> I want to be able to sort by teaching quality & research quality. I want
> to be able to click a faculty tile and expand to reveal a more in depth
> bio: when they arrived at X University, what courses they've taught
> during what time periods, research they've done, recognition they've
> received, plus the quirks, bio, nationality."
>
> "I also want faculty candidates to be more reflective of the
> university's reputation. Initially, most candidates will have low stats
> (but varying potential). As you gain prestige and research reputation,
> the pool of candidates improves. This helps solve the threat of
> professors retiring because by then the pool of candidates is improved,
> so you can find a suitable replacement instead of starting from the
> bottom."

This plan takes up the backlog's *The Faculty tab, and a person page*.
Plan 85 (specializations) depends on it: its faculty training program
picks professors from this grid.

## 1. Where the game is now

- **The market ignores standing.** `generateCandidate`
  (`data/facultyData.ts`) rolls both potentials uniformly in [45, 100]
  whatever the college's prestige or research standing. Only the price
  moves: `marketRateMultiplier` raises salaries with prestige. Current
  teaching and research start at `grownStat(potential, 0)` and grow
  toward the potential with tenure.
- **Retirement** comes after a career of 25 to 40 years, fixed per
  professor from the id (`careerWeeks`), with a year's notice. Since the
  market is flat, the replacement is drawn from the same pool as the
  founder was.
- **A professor keeps no history.** `Faculty` holds the current stats,
  potentials, tenure in weeks, a prize count (`acclaim`), nationality, a
  one-line bio, a quirk and the portrait's inputs. Which courses they
  taught, and when, is not recorded. Research keeps names only in the
  capped record of finished projects (`CompletedInitiative.facultyNames`,
  24 entries), and prizes only as a count.
- **The Faculty tab** groups the roster and the market by field, with
  sort and filter (Plan 72F) and short/over flags per department.
  Portraits (`FacultyPortrait.tsx`) exist but are small.

## 2. Decisions

Proposed here, for the owner to confirm on review:

- **The market follows standing.** Each candidate's potentials are drawn
  from a distribution whose center rises with standing:
  - the teaching potential with prestige;
  - the research potential with a blend of prestige and research
    standing, weighted toward research standing.

  The spread stays wide, so potential varies at every stage. A few
  standouts still appear early, rarely, so an early hire can be a find.
- **Candidates arrive raw.** Current stats start well below potential
  (as now) and grow with tenure. The rate of growth is the lever that
  keeps the first decade from dragging; it is tuned in 84B.
- **The founding market** (Plan 80D) is unchanged: its professors are
  written, not rolled.
- **The grid replaces grouping by field** as the default view. Field
  becomes a filter, not a layout, and a department's short or over flag
  moves to the filter bar, so staffing gaps stay one click away.
- **The history is kept for current faculty only.** A professor who
  leaves takes their record with them. The chronicle and the research
  record already keep what the college remembers.
- **"Recognition"** means prizes (by name, year and project), a
  distinguished program they taught in, and long service (25 years).
  Nothing is invented for flavor.

## 3. The PRs

| PR | Subject | Sim baseline | Save version |
|---|---|---|---|
| A | This plan; the backlog | no | no |
| B | A market that follows standing | yes | no |
| C | The career record | no | yes |
| D | The faculty grid | no | no |
| E | The person, expanded | no | no |

## PR 84B — A market that follows standing

- **Potentials.** Each potential is drawn around a center that rises with
  standing:
  - about 50 at founding standing, rising toward about 80 at the top;
  - the spread is wide: roughly ±20, clamped to [30, 100];
  - teaching follows prestige; research follows research standing more
    than prestige.

  The same rules apply to the retirement search and to event hires.
- **Current stats** start at about half of potential and grow with tenure
  toward it. Tune the rate so a good early hire becomes good within about
  five years.
- **Salary** keeps following current stats and prestige, as now. A better
  pool costs more because it is better.
- **The market's text says so.** The Faculty tab's market header states
  that the candidates the college attracts improve with its standing, and
  names the standing that moves each potential.
- **Checks:**
  - a test that the candidate pool's mean potential rises with standing;
  - the harness: median teaching and research of the Guided and
    Completionist faculty at years 10, 25 and 40, before and after;
  - the weeks a retirement's courses wait for an instructor;
  - `npm run sim` re-recorded, with the moves described.

## PR 84C — The career record

- **A compact history on each `Faculty`:**
  - the week they arrived (existing faculty: derived from `tenureWeeks`);
  - courses taught, as spans (course id, first week, last week), opened
    when a course is assigned and closed when it moves or ends;
  - research, as each project they joined (topic, depth, years, outcome);
  - prizes by name, year and project;
  - a yearly snapshot of teaching and research, for a small line chart.
- **Kept small.** Adjacent spans of the same course merge, and nothing is
  kept for someone who has left. The added save size on a year-50
  campus is measured and stated in the PR.
- **Save version bump**, with a migration: existing faculty get an
  arrival week derived from tenure and an empty history from here on.
  A fixture for the new version.
- **Checks:** tests that spans open and close as courses move, that a
  project and a prize land in the record, and that the migration holds.

**As implemented (#269):** `Faculty.career` (`types.ts`'s `Career`),
written only by `systems/faculty/career.ts`. Nothing in the simulation
reads it and nothing that writes it draws on the random stream, so
`npm run sim` is unchanged (0 deltas). Save version 87.

- **What is kept, and when:**
  - `arrivedWeek`, set by `appointFaculty` (every appointment, the event's
    chair included). A candidate has no record.
  - `courses`: spans of `{ courseId, from, to }` in absolute weeks. Rather
    than hooking the six places that write `courseFaculty` (the reducer's
    reassign, restaffing, the swap, a project's cover, a course started,
    a departure), the record reads `courseFaculty` once a week, after the
    roster's week in `tickFaculty`: each course a professor teaches
    extends its span if the span reached last week, and opens a new one
    otherwise. So adjacent weeks merge by construction, and a course that
    moves or ends closes at the last week it was taught. A course counts
    once it is taught (`done`), not while it is developed.
  - `research`: a line per participant when a project ends (the topic, the
    depth, the year it ended, how long it ran, papers, breakthroughs, and
    `cancelled` when wound up early or abandoned), from `concludeInitiative`.
  - `prizes`: name, year and the project's topic, on the winner.
  - `years`: one `[year, teaching, research]` mark, rounded, at the last
    week of each year on the roster.
- **The migration (86 → 87):** each professor arrives as many weeks ago as
  their tenure, less the founding market's head start
  (`FOUNDING_TENURE_WEEKS`, served elsewhere), never before week 1, with
  an empty record. `test/fixtures/save-v86.json` is the year-8-balanced
  scenario written by main before the bump. A record that is missing or
  malformed on load starts empty that week (`sanitizeCareers`).
- **Rules:** `sim/harness/invariants.ts` checks that every professor has
  a record, no candidate does, and a course's spans run forward without
  touching.
- **Size, year 50:**
  - Guided: 92 professors, about 50 KB of a 490 KB save. That is 582
    spans (26 KB), 1,196 yearly marks (13 KB) and 54 project lines (5 KB).
  - Completionist: 100 professors, about 46 KB of 500 KB.

  Spans barely fragment: 565 professor-course pairs held 582 spans. A
  veteran teaches a dozen courses at once, so the spans are most of it.
- **Tests:** `test/career.test.ts` covers the migration, spans opening,
  running on and closing as a course moves and comes back, a project and a
  prize on the record, and six guided years under the rules.

## PR 84D — The faculty grid

- **Tiles:** a portrait at a size that reads, name, field, teaching and
  research as letter grades (the course-grade bands), a potential hint,
  and small badges:
  - a quirk;
  - prizes;
  - retiring within a year;
  - courses waiting in their field.
- **Sort:**
  - by teaching or by research (the owner's two);
  - also by potential, salary, years at the college and name.
- **Filter:** by field or school, *retiring soon*, *can take a course*,
  and a search box.
- **The market uses the same tiles,** so a candidate and a professor are
  compared like for like. The retirement notice links to the market
  filtered to that field.
- **Scale:** a year-50 roster (well over a hundred) scrolls smoothly on
  a phone. Measure it, and add windowing only if needed.
- **Checks:** `npm run phone`; screenshots of the grid early and late, and
  of the market.

**As implemented (#270):** the tab opens on the grid. A view switch
shows *Faculty*, *Market* and *Departments*. The department board
(Plan 72F's meters, demand and search offers) is kept whole as the third
view, and a Curriculum door to a department still opens it on that row.
One tile (`tabs/FacultyTile.tsx`) serves the grid, the market and the
board.

- **The tile:**
  - a 56 px portrait (40 on a phone), the name, field and rank;
  - teaching and research as course-grade letters (`gradeFor`: A from 78,
    B from 62), with `→B` when the potential reaches a higher letter;
  - badges: ★ and the prize count, *Retiring* (the year's notice given),
    *On a project*, *N waiting* and the quirk (its line as the title);
  - pay, load (or a listing's weeks left, and the grade a candidate would
    earn on the first course waiting), *More* and the action.

  *More* keeps the old card's detail until 84E replaces it.
- **Decisions the plan left open:**
  - *Potential* sorts by the two potentials together.
  - *Years here* reads the arrival (84C), so a founding professor's
    head start does not count. The owner's *Years left* stays beside it.
    The market hides both.
  - *N waiting* counts the unstaffed and the open courses in the field. It
    shows only where the person could take one: always on a candidate,
    and on a professor with a course slot free. Otherwise every early tile
    carried it.
  - *Can take a course* uses the same test.
  - *Field* lists the divisions (`FACULTY_FIELD_GROUPS`, as "All of …")
    and the fields in use.
  - The search matches the name, field, quirk and nationality.
- **Short and over** departments sit under the filter bar as chips. Each
  chip toggles the field filter.
- **The retirement notice:**
  - The log line carries *Find a successor →* while the professor is
    still here (`LogStrip.tsx`'s `retirementNotice`, in the ticker and
    the activity log).
  - Next up gains a *Retiring* reading.
  - Both open the tab on `market:<field>`: the market, filtered to the
    field. A market narrowed to one field with nobody listed offers a
    search.
- **Scale, measured** (year-50 Guided, 92 professors, headless Chromium,
  90 scroll steps):
  - Phone: two tiles to a row, a median frame of 16.7 ms (p95 19). The
    grid is 10,500 px tall.
  - Desktop at 1400×900: 16.7 ms (p95 23).

  `content-visibility` did not help, and nothing is windowed.
- **Checks:**
  - `npm run check`; `npm run sim` unchanged (0 deltas);
  - `npm run phone` on the launch fixture and the year-50 save. The
    Market and Departments views were also checked at 390 px.
  - `test/faculty-sort.test.ts` covers the new orders, letters and
    filters.
  - Screenshots in `docs/reviews/2026-10-faculty/`: `84d-grid-early.jpg`
    (year 4), `84d-grid-late.jpg` (year 51), `84d-market.jpg`,
    `84d-retiring-market.jpg` (the retirement's door) and `84d-phone.jpg`.

## PR 84E — The person, expanded

- **Clicking a tile expands it in place** (on a phone, it opens full
  screen) to show:
  - when they arrived ("Joined Blackmoor University in Year 3, fall
    term");
  - the bio, nationality and quirk, each explained;
  - the courses they have taught, as a timeline of spans by year;
  - their research: projects, outcomes and prizes;
  - recognition, as defined in §2;
  - teaching and research over the years, as a small chart;
  - the actions that exist today (assign, dismiss and the rest) in the
    same place.
- **Words** live in content files (`data/`), not code, and follow the
  Plan 47 glossary.
- **Checks:** `review:strings`, `npm run phone`; screenshots of a young
  hire, a veteran with prizes, and a candidate (who has no history, which
  is said plainly).

**As implemented (#272):** a tile opens into the person
(`tabs/FacultyPerson.tsx`), read off the career record through
`tabs/facultyCareer.ts`. The words live in `data/careerWords.ts`.

- **Where it opens:**
  - On a wide screen it opens in place. The tile spans the grid's whole
    row, with its face (and its actions) on the left and the person
    beside it.
  - On a phone (≤ 520 px) the tile stays in the grid and the person
    opens full screen over the tab, in a portal, with its own Close.
    Escape closes the person and not the tab.
  - The tile's top and its *More* both open it.
- **What it shows:**
  - "Joined Blackmoor University in Year 8, spring term.", then the years
    here and the years to retirement. A founding professor gets a note
    that their record from elsewhere counts toward growth but not years
    here.
  - The person: the background (bio), the nationality and the quirk,
    each with a line saying what it is. The quirk is explained in the
    numbers from its effects (`quirkExplained`: "teaching potential +10,
    research potential −10 and the students take to them"). Then pay,
    course slots and scholarly output, moved from the old detail.
  - Courses taught: a timeline, one row per course, from the arrival to
    the week just played. A course taught now is drawn in the school
    color and reads "Since Year 9". Fourteen rows are drawn, and the rest
    are named under them.
  - Research: each project, newest first, with its depth, length, the
    year it ended and its outcome, or "wound up early". A running
    project leads.
  - Recognition, exactly as §2 defines it:
    - prizes by name, year and project;
    - each distinguished program they taught in, dated by its milestone
      (`milestoneYears`);
    - 25 years of service (`LONG_SERVICE_YEARS`), with the year reached.

    Nothing else is counted, and an empty list says what would count.
  - A chart of teaching and research, a mark at each year's end and
    today, with the A and B bands. The scale runs to 100 from a floor
    under the lowest mark, so growth fills the height.
  - The actions stay where they were, on the face: Dismiss or Appoint.
    A door opens the field's courses in the Curriculum.
- **A candidate** shows the person and pay, then says plainly: "… has
  not worked at Blackmoor University. There is no history here yet: the
  record starts the week they are appointed."
- **Checks:**
  - `npm run check`; `npm run sim` unchanged (0 deltas);
  - `npm run phone`. The expanded person, at 390 px (full screen) and at
    820 px (in place), has nothing past the edge.
  - `npm run review:strings`: nothing flagged in the new files.
  - `test/faculty-person.test.ts` covers the arrival line, the timeline,
    the research lines, recognition (the three kinds and nothing else),
    the chart's last mark, the quirk's words and the candidate.
  - The bare-figure ceiling falls from 29 to 27: the old detail's
    figures moved into the person's list, less two.
  - Screenshots in `docs/reviews/2026-10-faculty/`: `84e-young-hire.jpg`,
    `84e-veteran.jpg` (two prizes, two distinguished programs, 32 years),
    `84e-candidate.jpg` and `84e-phone-veteran.jpg`. They are from a
    year-40 Natural run named Blackmoor: the Guided and Completionist
    runs win no prize a professor keeps by year 50.

## What this plan does not do

- No poaching or retention offers. They stay in the backlog; the career
  record makes them easier to write later.
- No change to how many courses a professor can teach, or to
  retirement's timing.
- No training program; that is Plan 85's faculty specialization.
