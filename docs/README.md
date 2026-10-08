# UniSchool — Documentation

| Folder | Tense | Holds |
|---|---|---|
| [`design/`](design/) | present | What the game **is**: its systems, and the rules they run on |
| [`architecture/`](architecture/) | present | How the codebase implements them |
| [`plans/`](plans/) | past | Closed records of how work was sequenced and what shipped |
| [`reviews/`](reviews/README.md) | snapshot | Reviews of the game as it stood on a given date, and the screenshots and harness reports later plans cite as evidence ([index](reviews/README.md)) |
| [`assets/`](assets/) | present | The asset gallery: every buildable asset in every vernacular, as the game draws it (`npm run gallery:assets`, which writes this folder; never edit it by hand) |
| [`images/`](images/) | present | The root README's screenshots, the timelapse and the short clips, re-shot by the tools in `unischool/tools/README.md` |

Work that is going to happen but **has not** lives in
[`BACKLOG.md`](../BACKLOG.md) at the repository root — the one forward-looking
document here. Nothing belongs in two places at once: when a plan lands, what
it changed goes into `design/` or `architecture/`, and the plan is left alone
as the record of what was believed at the time.

## Design

| Document | Covers |
|---|---|
| [gameplay.md](design/gameplay.md) | What the player does, and the loop it feeds |
| [curriculum.md](design/curriculum.md) | The milestone chain, the curriculum map, and the facilities that gate capstones |
| [graduate-programs.md](design/graduate-programs.md) | The six programs that grow on top of a finished school |
| [progression.md](design/progression.md) | Founding, prestige, rankings, the fifty years and the legacy, and College → University |
| [economy.md](design/economy.md) | Money as the throttle, and the growth loop that makes it bite |
| [admissions.md](design/admissions.md) | The summer decision, tuition by class, cohorts, and the student body |
| [faculty.md](design/faculty.md) | Hiring, assignment, and the grade every course carries |
| [research.md](design/research.md) | Topics, teams, depth, and what a run produces |
| [student-life.md](design/student-life.md) | Clubs, Greek life, varsity athletics, and student demands |

`design/inbox.html` (with `inbox-campus.jpg`) is the inbox proposal Plan 77
was planned from: a picture of a design that has since been built, kept
where Plan 77 cites it.

## Architecture

See [architecture/README.md](architecture/README.md) for the index and for how
to work on the codebase.
