# Plan 28 — Delegation and time

*Planning document only. Its job is to turn Phase G of the v2 merge
(delegation and time, `loumiy/unischool-v2`'s `docs/MIGRATION_PLAN.md`)
into a sequence of PRs.*

**Status: In progress.**

---

## 0. The finding

This game has no administration. Every decision event reaches the player,
at every speed, for fifty years. Nothing is bought by growing an office,
and nothing grows the office. The owner's decisions (v2's
`docs/V1_ADOPTION_LIST.md`):

| # | Decision |
| --- | --- |
| V2 #24 | Seats: Provost, a Dean per school, Facilities, Dean of Students, VP Advancement. Filled from faculty or from outside. Each answers its domain's routine events by policy, and together they unlock speeds. |
| V2 #5 | Speed tiers earned by delegation: 1× and 2× free, 4× needs a Provost, 8× needs a Provost and three Deans. |
| V1-2 | This game's 52-week year and speed values, with the top speeds gated by seats. |
| V2 #11 | The administrative ratchet, from seats only: the admin-share figure, and the seats' permanent cost. (Deferred here from Plan 27.) |

## Rules for this plan

- **Neutral by default.** The harness never appoints a seat, so every
  event still reaches its default answer, and the new payroll line is zero.
- **Deans map onto this game's founded schools:** one Dean's seat for each
  school the college has founded (`school-founded:<School>`).
- **Content lives in data.** The seats, their salaries and their policies
  are in `data/seatData.ts`. Which seat an event belongs to is a field on
  the event.

## PR 28A — The plan

This document.

## PR 28B — The seats and the ratchet

- **`data/seatData.ts`:** five seats, each with:
  - a domain;
  - an outside salary and a cheaper internal one;
  - three policies over one rule each: thrifty, thorough and popular.

  Salaries are paid at the market rate, which rises with prestige, as
  faculty are.
- **`APPOINT_SEAT`:**
  - **Inside:** a senior professor (five years on the roster; for a Dean,
    from that school's fields) leaves teaching for the seat. Their courses
    wait for a new instructor, as when anyone leaves.
  - **Outside:** costs more and takes no one from the classroom.
- **Seats are for good.** There is no dismissing one. That is the ratchet:
  the seats only accumulate.
- **The Treasury** gets an "Administration" line in the weekly statement,
  and the administrative share of payroll.

## PR 28C — The routine, by policy

- **Every decision event names a domain:** academic, estate, students,
  advancement, or board. Board events are the president's own, and no
  seat takes them.
- **When a routine event fires in a covered domain,** the seat answers it
  by its policy, and the log says so. The Provost covers the academic
  side; a Dean covers it when there is no Provost.
- **Escalation:** anything that would move more than four weeks of
  operating cost, or that the policy's choice cannot pay for, still
  reaches the player.
- **`SET_SEAT_POLICY`** changes a seat's instinct at any time.

## PR 28D — Speed tiers

- **1× and 2× are free.** 4× needs a Provost. A new 8× needs a Provost and
  three Deans.
- **The speed control shows the locked tiers** and says what opens them.
  The sandbox speed for playtests is untouched.

## PR 28E — The org chart

- **An Administration panel in the Faculty tab:**
  - each seat, vacant or held, with its policy;
  - the shortlist of senior faculty who could take it;
  - the outside appointment and what each costs;
  - the speeds the seats have earned.
