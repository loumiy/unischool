# Gameplay

A turn-based university management sim. The player advances week by week over a
long playthrough (target 20–50 in-game years), building an institution from a
small college into a major university.

There is **no win condition**. It is an indefinite sandbox that naturally tapers
once the curriculum is fully built out and the rankings are topped. The core
feeling is the **builder's long arc**: investing time, watching something grow,
and seeing the scale of progress over decades.

## What the player does

- **Expands the campus** with academic buildings, dormitories, dining,
  recreation, health facilities and athletics venues — all placed on a tile
  grid, all the same kind of thing underneath.
- **Develops the curriculum** across 421 courses, 42 majors and seven schools,
  climbing a milestone chain from the gen-ed core to distinguished programs.
- **Hires faculty** with their own teaching and research strengths, and decides
  who teaches what — which is what decides the grade each course earns.
- **Commissions research** out of a specific facility: a topic, a team and a
  depth, producing publications, grants, breakthroughs and the occasional prize.
- **Sets admissions** once a year, in summer: a price and an admit rate, and
  then lives with the class those two decisions drew.
- **Grows student life** through clubs, Greek chapters, varsity teams and the
  facilities they need.
- **Answers interrupts** — donor offers, faculty departures, facility failures,
  chapter scandals, student demands — which give the quiet weeks their texture.

## The core loop

```
        Develop programs & facilities
                    ↓
            Prestige drifts up
                    ↓
        Attract more / better students
                    ↓
              Tuition revenue
                    ↓
        Expand campus & capabilities
                    ↺
```

Each turn of it escalates, roughly once per course tier. Two properties hold
throughout:

**Growth is slow, and it is meant to be.** Prestige is a stock that drifts
toward a computed target rather than a tally that jumps on completion, so a
school's standing is earned over decades and does not evaporate when growth
stalls. See [progression.md](progression.md).

**Money is the pacing mechanism, and cost leads revenue.** Every cost is charged
the moment a commitment is made; every payoff waits for the next summer
admissions boundary, and the prestige payoff waits for a weekly drift on top of
that. Adding capacity and students is supposed to hurt before the tuition heals
it. A cash shortfall stalls expansion — it never ends the run. See
[economy.md](economy.md).

## Where the detail lives

| Question | Document |
|---|---|
| How does the catalogue unlock? | [curriculum.md](curriculum.md) |
| What sits on top of a finished school? | [graduate-programs.md](graduate-programs.md) |
| How is standing earned and reported? | [progression.md](progression.md) |
| Where does the money go? | [economy.md](economy.md) |
| Who enrolls, and at what price? | [admissions.md](admissions.md) |
| Who teaches, and how well? | [faculty.md](faculty.md) |
| What does research produce? | [research.md](research.md) |
| What grows inside the campus? | [student-life.md](student-life.md) |
