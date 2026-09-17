# Student life, athletics, and demands

Clubs, Greek chapters and varsity teams are what a happy student body gives
the institution. A demand is what an unhappy one asks of it.

## Student life: clubs, Greek letters, and varsity athletics

The layer that grows *inside* the campus rather than on it, and the second
thing after research to be gated on buildings the player already put up.
Two layers, the second gated by the first, both riding machinery that
already exists — there is no third interrupt stream and no parallel
subsystem.

**Clubs.** Once a **student center** stands (any tier — read off
`facilityType`, so a retune of the facility chain can't silently close the
gate), students occasionally organise one. This is deliberately the
*lightest* beat in the game and **never stops the clock**: a formation
raises a **petition** — a record on `s.orgs.pendingPetitions` and a log
line — and a whole year's petitions are answered together in a **digest
folded into the summer admissions interrupt**, which is a stop the player
was already making. Approve and the club adds a small, permanent
contribution to the satisfaction target and a recurring line on the weekly
statement; decline and the students notice, transiently. Which shape this
took was a real choice: an in-log accept/dismiss control would have made
`LogStrip` interactive for the first time, while the digest reuses a modal
that fires anyway, so student life adds **zero** stop-the-clock moments a
year.

**Greek life** is an extension of clubs behind a **one-time, declinable
opt-in**, so it can never appear unbidden. Once the club scene is real
enough, students petition to charter a **Hellenic Council**; a school may
refuse, permanently, and the question never returns. With a council,
chapters form on the same petition/digest path as clubs — same light
treatment, heavier numbers on both sides. What makes chapters
*consequential* is what happens to them afterwards, and all of it is
**authored into the existing decision-event table** (`eventData.ts`) rather
than given a stream of its own:

- **A scandal.** Fund a public-relations campaign (a cash cost; the chapter
  survives) or pull the charter (free, and permanent — the satisfaction it
  contributed and the cost it carried both go). The zero-cost path is
  disbanding, so the no-soft-lock invariant holds unchanged.
- **A housing petition.** One chapter at a time asks for a dedicated house,
  and **each chapter asks at most once** — both answers set `housingAsked`,
  so the supply of asks is bounded by the number of chapters that exist and
  it can never become a modal spiral.

Because those three live in the shared table, they **redistribute the
existing event budget rather than adding to it**: the weekly chance and
cooldown that govern how often the clock stops are untouched, and their
`weight` values are the dial for how much of that fixed budget Greek life
takes.

**What an organisation does, mechanically**, is exactly two things, both
read **live** off `s.orgs` every week rather than applied once:

- it carries an `upkeepPerWeek` that `financeSystem.ts` sums as one more
  expense line, so disbanding a chapter removes its cost the same week —
  there is no total stored anywhere to leave behind;
- it adds a **flat** contribution to the `social` satisfaction attribute
  (the same non-population-scaling shape the quad's bonus has), capped in
  aggregate so student life can never carry the attribute on its own.

Both key off *"an organisation exists"*, flat per org — **never off member
count**. Membership is display-and-flavour only: it is *derived* from three
founding facts on the record (founding size, founding enrollment, founding
year) plus today's enrollment, so an older club reads as larger than a young
one at the same headcount, and nothing in the game reads it. Coupling it to
money or satisfaction would be a deliberate later decision with its own
playtest, not something to slip in silently. There is no trend line and no
sparkline — a current number is enough.

Organisation costs are sized in **weeks of operating cost** (the same unit
the decision-event table uses, shared via `moneyScale.ts`) and fixed in
dollars the moment the player approves the organisation. Fixed rather than
re-derived weekly because deriving a line of opex *from* opex is circular;
the consequence — an old club keeps an old club's budget and fades to noise
against a mature school's spending — is deliberate, and is part of what
makes clubs low-stakes.

**Prestige is untouched.** Student life moves satisfaction and cash and
nothing else, the same discipline the decision events hold: `self.reputation`
is a stock that drifts toward a computed target once a week, and student
life is not one of that target's inputs.

**Satisfaction effects are transient by construction**, exactly like the
decision events': the stock drifts back toward its facilities-derived target
at `SATISFACTION_DRIFT_RATE` a week, floored by `ATTRIBUTE_SCORE_FLOOR`. The
teeth are timing near the summer funnel, not permanence. What *is* durable is
the ongoing source: a disbanded chapter's real cost is that its contribution
to the target stops, not the one-week dent.

**Varsity athletics** is a third layer that **grows out of clubs** rather
than adding a parallel sport simulation: a varsity team is mechanically
close to a Greek chapter that needs a venue. Athletics V2 (below) added a
real coaching-staff hiring pool, team quality, and standings against
rivals' own athletic strength — but there is still **no match simulation
and no schedules**: standings are read off one comparable strength number
per school, the same shape `self.reputation` vs. `Rival.reputation`
already uses for the academic ranking, not a simulated season.

A named share of new club formations (`SPORT_CLUB_SHARE`) roll as a **sport
club** instead of an ordinary one — the same weekly club roll, no second
formation stream — drawn from a fixed, **gendered** `SPORTS` list
(`data/studentLifeData.ts`) that also maps each sport to the **venue
category** it needs (field sports and track share a multi-sport field;
basketball, volleyball and ice hockey share an arena; baseball and softball
share a diamond; swimming needs a natatorium; football is alone, gated behind
its own petition, and gets the pinnacle **football stadium** — the most
expensive Buildable and largest map footprint in the game). Every sport is one
of three profiles (`SPORT_PROFILES`): **men-only** (football, baseball),
**women-only** (field hockey, softball), or **two-gender**, fielding
independent men's and women's lineages (soccer, lacrosse, basketball,
volleyball, swim & dive, track & field, ice hockey) — 18 gendered `SPORTS`
entries in all.

**Track & field and ice hockey were added onto venues that already stood.**
The multi-sport field has carried a regulation eight-lane 400m oval since the
campus-art pass, so track was waiting on nothing. Ice hockey **shares the
arena**, which is a named call rather than an obvious one: a real arena
converts between hardwood and ice, which is exactly what "shared among varsity
teams in one category" means here, and the alternative — an `athleticsIceRink`
facility type — costs a Buildable, a footprint, a ground marking, a build-rail
entry and a map asset for one sport. The cost of the call is that the arena is
now the venue for **six** programs; if that reads as thin in play, the answer
is a rink, not a retreat from sharing.

**Golf is declined and rowing is deferred**, and neither for want of interest.
A golf course is a footprint larger than the campus the game draws. A lake is
**terrain**, and the campus map has no terrain concept at all — it is a tile
grid of placements, and the only water in the game is drawn ornamentally inside
two ground markings. Water on the map is a campus-map problem, not an athletics
one. The other option for rowing, a sport with no venue, is worse than it
sounds: every team carries a `venueCategory`, `promoteToVarsityTeam` and
`sanitizeTeams` both key off it, and `'awaitingVenue'` is the whole shape of the
varsity grant — so a venueless sport threads a special case through all of it
for one program. A men's and a women's program of the same sport are
two entirely separate club/team records (a gendered id, not a `gender` field
alongside a shared one), so they form, petition and graduate on their own
timelines, sharing only the venue category — the second lineage into a
category, of either gender, finds the venue already revealed or built and
pays only the varsity fee. A sport club may petition to go varsity **five
years after it was founded** (`VARSITY_PETITION_MIN_TENURE_YEARS`,
`studentLifeData.ts`); a decline is not permanent — the same tenure gate
re-opens the ask **five years after the decline** rather than closing the
door forever (`StudentClub.varsityLastAskedYear`, re-checked by
`sportClubsAwaitingVarsity`) — an authored decision event (`eventData.ts`'s
`varsity-petition`) modeled directly on the chapter housing petition for its
prompt/choices, but fired on its **own deterministic schedule**
(`eventSystem.ts`'s `fireVarsityPetition`) rather than drawn from the shared
decision-event lottery, so the pipeline is a guarantee rather than a roll of
the dice. It surfaces on the first quiet week at or after
`VARSITY_PETITION_WEEK` — three-quarters through the year, evenly spaced from
both summer admissions and the U.S. News report — so it never reads as just
another summer or midyear beat. Granting it costs a weeks-of-opex program
fee — the coaching staff is no longer part of that cost, or auto-generated:
the team arrives with all three staff roles vacant (see below) — and
**reveals** the required venue Buildable if it isn't already `'done'` —
hidden-until-demanded, the same gate a graduate program
uses (`Buildable.athleticsVenueReveal`, checked in `meetsUnlockGates`; a
team's own existence on `s.orgs.teams` *is* the reveal signal, no separate
flag). Like the chapter-house grant, the venue is **not** pushed straight to
`'done'` and auto-placed — it goes through the ordinary build-rail cost/
duration cycle like any other facility, and the team sits `'awaitingVenue'`
until it finishes. The
**second** team in a category finds the venue already revealed (or built) and
pays only the varsity fee, never a second building — the mechanism that keeps
this an athletic department rather than one building per team.

Venues are **ordinary, reveal-gated `facility` Buildables**, and deliberately
**distinct** from the rec-facility trio (gym/tennis/pool): a natatorium is not
the rec Swimming Pool, a stadium is not a rec field. "Shared" means shared
*among varsity teams* in one category, not shared with recreational use — a
named design fork; see `facilitiesData.ts`'s note above `GYM_ID` for the
rejected alternative and why.

**Coaching staff (Athletics V2)** is a standing hiring pool
(`s.orgs.coachCandidates`) that deliberately **mirrors Faculty's own
market** (`facultyData.ts`'s `generateCandidate`/`grownStat`/
`facultySalary`/`candidateArrivalsThisWeek`) rather than inventing a
second hiring mechanism — `studentLifeData.ts`'s
`generateCoachCandidate`/`grownCoachQuality`/`coachSalaryFor`/
`coachCandidateArrivalsThisWeek`, ticked weekly by
`systems/athletics/athleticsSystem.ts`, the exact same "age every listing,
drop anyone past the window, top back up toward target" shape
`facultySystem.ts`'s `tickCandidatePool` uses. A candidate's `field` is
either a `SPORTS` id (a head/assistant coach candidate, hireable only into
that exact sport's team) or `TRAINER_FIELD` ('strength-conditioning', hireable
as any team's trainer regardless of sport) — and candidates skew
**disproportionately to the gender of the sport they'd coach**
(`COACH_GENDER_MATCH_CHANCE`), a trainer's listing staying an even coin
flip since strength & conditioning carries no sport gender to skew toward.
Each carries a **`heritage`** — the origin of the name pool their name was
drawn from, the same field `Faculty` has — so a coach can be drawn by the same
procedural portrait a professor is, with a face that agrees with their name.

**Hiring is one pool, tagged by need.** The Athletics tab shows the whole
market in a single list rather than a slice per chair: candidates whose sport
the school fields with a chair open are listed first and tagged with the team
that wants them, and the tag *is* the hire button. The rest of the market sits
behind a toggle. This is the shape the Faculty tab used to have and gave up —
faculty hiring moved to Curriculum "where the shortage is actually felt" — and
it comes back here because athletics has no second screen: the Athletics tab
**is** where a coaching shortage is felt. A department with six teams has
eighteen chairs, and a market you have to open role by role is a market you
cannot see.

The pool is sized for what a player sees at one moment rather than for
throughput, and its size is **free of the economy's dice**: the market seeds
and refills from a generator of its own, taking one draw on the global stream
whatever the target is, so the number can be tuned for how the screen reads
without moving a forty-year balance run.
**Every team needs three separately hired roles** — head coach, assistant
coach, trainer (`VarsityTeam.headCoach`/`assistantCoach`/`trainer`,
`types.ts`) — each grown week over week once hired
(`athleticsSystem.ts`'s `growCoach`: quality climbs toward a rolled
ceiling, salary rises with it plus a tenure premium, the same shape
`growFaculty` uses) but NOT while still listed, exactly like Faculty. A
vacant role is not a hard block — the team still competes — just a real,
felt gap: `teamQuality` (`studentLifeData.ts`) scores an empty slot at a
fixed low floor rather than zero.

**The athletic director** is hired once, the first quiet week after the school
fields a varsity team, through an interrupt of athletics' own
(`eventSystem.ts`'s `fireAthleticDirectorOffer`). They are a `Coach` rather
than a fourth kind of person — somebody with a quality, a salary and a field,
theirs being `AD_FIELD`, which marks a role the way `TRAINER_FIELD` marks a
discipline — and they are never listed on the standing market: an AD is
offered, not shopped for.

Three candidates are rolled at fire time and carried in the interrupt's
payload, so the people the modal describes are exactly the people it can hire.
**Salary is the only axis they differ on**, and the modal says so rather than
implying a second: a faculty hire trades teaching against research, but a
director has one stat, so the only question three cards can pose is how much of
the department's budget goes to the person running it.

They do two things, and both are real or the hire would be a pure cost. Their
quality is a **department-wide addend to every team's `teamQuality`**, beside
the budget tier's own bonus — a different lever, since one is people and the
other is money — and sized well under it, so a brilliant director cannot carry
teams with nobody coaching them. And they are the **voice**: the shortage
interrupts and the championship reports are written as the AD speaking.

**The director asks for what the department lacks.** An authored decision
event (`eventData.ts`'s `ad-shortage`) in the shared weighted lottery — not on
a cadence of its own, so it changes the *mix* of what stops the clock rather
than how often it stops. The director names a program running without a coach
and offers to bring somebody in: paying seats a coach rolled best-of-three,
better than the open market usually turns up, and declining leaves the chair to
the market at the cost of team quality meanwhile. It is eligible only when
there is a director to raise it and a chair worth raising — and **never for a
team still awaiting its venue**, because a program that cannot take the field
gains nothing from a better coach, and its actual gap is the building.

**Declining never closes the position.** Unlike the charter or the Hellenic
Council, which close a question for the run on purpose, a school that cannot
afford a director in year 12 must not lose the office — so the offer returns
after a cooldown. The week is recorded when the offer is **put**, not when it
is answered, which is what stops anything that clears the interrupt without
answering from re-firing it the next quiet week forever.

**The mascot is named in that same modal** — the first moment the question has
an answer, since there is now something that wears the name. Deliberately not
at founding: the startup screen would ask before a single building stands and
typically a decade before a varsity team exists. A suggestion is offered and
can be re-rolled or typed over.

A live team's own upkeep (a fixed program fee plus its three coaches'
live, tenure-appreciating salaries) and its flat, capped contribution to
the `social` satisfaction attribute both run through **one recruiting &
scholarship budget lever** (`ATHLETICS_BUDGET_TIERS`, replacing the old
"investment" tier of the same shape) — low/medium/high, scaling the whole
department's upkeep and social contribution together rather than
budgeting per team, and now ALSO adding a flat quality bonus
(`qualityBonus`) on top of whatever the coaching staff itself is worth —
the "recruiting" a shallow model with no individual athlete roster can
actually represent. Athletics reaches satisfaction through this same capped
social contribution, same as clubs and Greek life.

**It now also reaches a standing — and exactly one.** The flag this paragraph
used to carry ("never prestige directly; if athletics should eventually touch
prestige, that is a separate prestige-model decision, flagged rather than
wired") has been answered in the narrow shape it asked for. A varsity program
feeds **campus-life standing**, one of the three the school is ranked on (see
[progression.md](progression.md)'s "Three standings") — a number no system
reads back into a decision. The **academic** number, which is the one the whole
economy reads, is still untouched by athletics and by everything else in this
document.
Disbanding a team is not built in this pass either; when it is, what
happens to a now-teamless venue is a call worth making explicitly rather
than silently.

**Standings** are an independent ranking axis
(`rivalsSystem.ts`'s `athleticRank`, read against `Rival.athleticStrength` —
`rivalData.ts`'s `athleticStrengthFor`, a deterministic function of a rival's
own id and current `reputation`, wide enough (0.6x-1.4x) that a rival can be an
athletic power without being an academic one and vice versa) — the exact same
shape `playerRank` already uses for the U.S. News report, just sorted on
`athleticProgramStrength` (`studentLifeData.ts`: active teams' own
`teamQuality`, averaged and scaled up with how many are fielded — a
department with five solid teams outranks one with a single elite team)
instead of `reputation`. No annual report, movers list, or reveal
interrupt of its own — just a live rank readout on the Athletics tab.

**A rival's athletic strength moves.** It was static for years — a deferred
deepening rather than an oversight — and now drifts annually on its own
momentum like every other axis, because a field that never changes is a field
whose standings are known a decade in advance.

**And it splits per sport.** The department-wide number says whether a school
runs a good athletics program; `sportStrengthFor` (`rivalData.ts`) says whether
it is any good at *lacrosse*, which is the question a particular coach hire is
an answer to. A rival's per-sport strength is **derived, never stored** — a
deterministic hash of (school id, sport id) swinging its department number by
up to 28 points — so 100 schools across 18 sports is 1,800 readings that cost
nothing to save and never change. A school is therefore reliably strong at some
sports and weak at others for the whole run, which is what makes a rivalry
legible over forty years.

The swing is **additive rather than multiplicative**, and the athletic band
stops short of the ceiling `teamQuality` can reach, both for the same reason: a
multiplicative spread scales with the base, so the strongest departments would
lead every sport and the per-sport tables would be the department table with
noise on it — and a band that reached the ceiling saturated it, piling a dozen
schools onto exactly 100 so that every sport's table opened with a tie broken
by position in an array.

The player's own number in a sport is the `teamQuality` of the team they field,
so the two sides of the comparison are the same scale by construction, and
hiring a coach moves their place on the table rather than some parallel figure.
**A school that does not field a sport is not on that sport's table** —
`sportRank` returns null rather than a last place that would imply a program
that does not exist — and neither is a team still `'awaitingVenue'`, for the
same reason it contributes no social bonus: it cannot compete yet.

**The Student Life tab** is the home for clubs (a sport club stays here,
tagged, until it graduates — only VARSITY status moves out) and Greek
chapters with founding year and current membership, the petitions waiting on
the next digest, and an empty state that reads sensibly through the founding
years before any student center exists. **Athletics has its own tab**: once a sport club goes varsity it moves there.
The screen is four sections, in the order the questions arrive in — **the
department** (the director, the name the teams play under, the athletic and
campus-life standings, and the one budget lever), **the programs** as a grid of
team cards, **by sport** (each fielded sport's own rank, with the schools
immediately above and below named), and **the market** last, because you notice
an empty chair on a team and then go looking for somebody to fill it.

It used to open on the budget lever, which is a knob rather than a subject: it
told a player what they could change before telling them what they had. Student Life still has to make the satisfaction
effect **legible**, which is what stops the system feeling arbitrary, and it
does so by *reading the model rather than inventing a display number*:
`satisfactionSystem.ts`'s `studentLifeSatisfaction` runs the very computation
the weekly tick runs against throwaway copies of the state with one source
removed, and reports the difference — the same way the milestone modal reads
`prestigeTargetWithout`. That honesty is the point: when the `social`
attribute is already clamped at its ceiling from facilities alone, the panel
reports that the clubs are adding *nothing*, because nothing is what the
model is applying.

**The Satisfaction Breakdown is the other half of that legibility, and it is
on screen from week one.** Five cards, one per attribute, each with a ring
that fills toward 100, how much of the headline number that attribute is
worth, and a one-line coverage reading; expanding a card lists every
building behind the score, what it serves, and any named bonus — all of it
read from `attributeDetail` rather than reauthored, so the expansion can
never disagree with the dial above it. It renders **unconditionally**: the
panel used to sit below an early return that fired whenever the campus had
no clubs and no pending petitions, which is the first ten to fifteen
founding years of most runs — precisely the stretch where a player is
working out what satisfaction responds to — and made the panel appear for
the first time the week a chess club was recognised, as if the club had
summoned it. Only the two organisation rosters collapse to a note when
there are no organisations.

## Student demands: the inverse of clubs

Clubs are what a happy student body gives the institution. A **demand** is what
an unhappy one asks of it, on a clock. One system
(`systems/demands/demandSystem.ts`), one content/tuning file
(`data/demandData.ts`), and no new economy: demands move satisfaction and,
through it, admissions — **prestige is untouched**, exactly as it is for
student life and the decision events.

- **Trigger.** Satisfaction below `DEMAND_SATISFACTION_THRESHOLD` and the
  student body organises. Above it nothing is ever demanded, which is why a
  well-run school sees this feature only as an empty line in the Student Life
  tab.
- **The ask is derived, not drawn.** The system scores every candidate
  shortfall against `satisfactionSystem.ts`'s **own** coverage reading
  (`attributeCoverage`, the exact 0..1 ratio the attribute is scored on) and
  asks for the **worst** one, resolved to the actual next rung of that actual
  chain — so "somewhere to eat" is a named dining Buildable the school could
  start today, and it is asked for because dining is genuinely what this
  campus is most short of. A completely full campus can instead be asked
  for **beds**, measured against `students.capacity`. There is no parallel
  capacity model anywhere in this: both readings are ones the game already
  keeps.
- **Deadline, and the queue.** Raising a demand sets a target and an expiry on
  `s.events.activeDemand`. A demand that would fire during a busy week WAITS
  in `s.events.pendingDemand` — the same queue pattern `pendingMilestones`
  uses, and for the same reason — and its deadline clock is stamped when it is
  **announced**, not when it is rolled, so waiting never eats the player's time.
- **Resolution is something the player does, not clicks.** Met is detected off
  existing state — the served population for that attribute, or capacity —
  reaching the target, i.e. off a Buildable finishing. There is no acknowledge
  button on the resolution side at all; the only button in the feature is the
  dismissable acknowledgement on the modal that raises it.
- **Failing needs no new machinery.** The satisfaction penalty feeds word of
  mouth, which costs applicants at the next summer funnel
  (`admissionsSystem.ts`'s `WORD_OF_MOUTH_STRENGTH`). That is the whole
  consequence, and it is why a demand for something the school cannot yet
  afford is survivable rather than a trap: `ATTRIBUTE_SCORE_FLOOR` still
  floors satisfaction, so ignoring every demand a run ever raises **stalls**
  the school exactly as the economy already promises, and never sinks it.
- **No spiral, and no to-do list.** At most one demand is open at a time, and
  `DEMAND_COOLDOWN_WEEKS` runs after **any** resolution — met, failed, or
  overtaken by the player fixing the shortfall before anyone got round to
  asking. A failed demand therefore cannot be followed by an immediate second
  unmeetable one.

**Cadence.** Announcing a demand reads *and writes*
`s.events.lastDecisionWeek`, the global floor the authored decision events run
on, so a demand and an event can never land in consecutive weeks and the
number of stop-the-clock moments a year does not rise by the number of demands
— the mix changes, the budget does not. That is the same discipline the
Greek-life entries in `eventData.ts` follow.

**The Student Life tab** carries the outstanding demand: the ask, the deadline,
weeks remaining, and a progress bar driven by the very reading the resolution
runs on, so the bar cannot disagree with whether the demand is met. Its stakes
are **read from the model** the way the club panel's contribution is: the
satisfaction figures are the nudges the system would apply, and the applicant
figures come from running the shipped admissions funnel (`projectAdmissions`)
at today's policy against each of them. When nothing is outstanding the section
says so in one quiet line.
