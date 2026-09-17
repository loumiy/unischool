import { useState } from 'react';
import type { Action } from '../state/actions';
import type { Coach, GameState, VarsityTeam } from '../state/types';
import { WEEKS_PER_YEAR, institutionName } from '../state/types';
import HelpHint from '../components/HelpHint';
import {
  ATHLETICS_BUDGET_ORDER, COACH_CANDIDATE_LISTING_WEEKS, TRAINER_FIELD,
  sportById, teamQuality, venueForCategory,
} from '../data/studentLifeData';
import FacultyPortrait from '../components/FacultyPortrait';
import { athleticRank, rankBy, sportRank, sportRankedList } from '../systems/rivals/rivalsSystem';

function money(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
}

// ---------------------------------------------------------------------
// VARSITY ATHLETICS, Athletics V2. Grew from the v1 shape (moved here from
// StudentLifeTab.tsx — a sport club still lives on Student Life, alongside
// every other club, until it graduates; only VARSITY status moves it here)
// by replacing the single auto-generated coachName with three separately
// hireable staff roles per team (head coach, assistant coach, trainer),
// each drawn from s.orgs.coachCandidates — a standing market mirroring
// FacultyTab.tsx's own hire flow, just scoped to athletics — and by adding
// the recruiting & scholarship budget lever's quality bonus (teamQuality)
// and a real standings readout (athleticRank) against rivals' own
// athleticStrength.
//
// No "petition" affordance here: like the chapter housing petition, going
// varsity is only ever offered through the decision-event interrupt (see
// eventData.ts's 'varsity-petition'), never dispatched directly from this
// tab.
// ---------------------------------------------------------------------

type Role = 'head' | 'assistant' | 'trainer';
const ROLE_LABEL: Record<Role, string> = { head: 'Head Coach', assistant: 'Assistant Coach', trainer: 'Trainer' };
const ROLE_ORDER: readonly Role[] = ['head', 'assistant', 'trainer'];

function coachInSlot(team: VarsityTeam, role: Role): Coach | null {
  return role === 'head' ? team.headCoach : role === 'assistant' ? team.assistantCoach : team.trainer;
}

// One staff role's row: the coach filling it (name, face, quality, salary, a
// Release button), or a vacancy that says so and nothing more.
//
// THE HIRING USED TO LIVE HERE, as a toggle per vacant role that expanded the
// slice of s.orgs.coachCandidates matching that one field. That works for
// three listings and collapses at forty — and worse, it asks the player to go
// looking role by role for a market they cannot see. A department with six
// teams has eighteen slots and eighteen separate places to check.
//
// So the market moved to one list of its own (see TheMarket below), and this
// row's job shrank to reporting. A vacancy is now a thing you notice on the
// team and answer in the market, which is the direction the information
// actually flows.
function StaffRow({ act, team, role }: { act: (a: Action) => void; team: VarsityTeam; role: Role }) {
  const coach = coachInSlot(team, role);

  if (!coach) {
    return (
      <div className="coach-row vacant">
        <span className="coach-role">{ROLE_LABEL[role]}</span>
        <span className="stat">vacant</span>
      </div>
    );
  }

  return (
    <div className="coach-row">
      <FacultyPortrait f={coachPortrait(coach)} size={26} />
      <span className="coach-role">{ROLE_LABEL[role]}</span>
      <span className="coach-name">{coach.name}</span>
      <span className="stat">quality {coach.quality}</span>
      <span className="stat">{money(coach.salary)}/yr</span>
      <span className="coach-row-spacer" />
      <button type="button" onClick={() => act({ type: 'FIRE_COACH', teamId: team.id, role })}>Release</button>
    </div>
  );
}

// A coach, as FacultyPortrait sees them. The seniority input is the one thing
// the two kinds of person compute differently: a professor's comes from
// teaching+research through facultyQualityTier, a coach's from their single
// `quality`, so it is resolved here rather than in the portrait.
const COACH_GRAY_AT_QUALITY = 85; // a coach at the very top of the market is most likely a veteran
function coachPortrait(c: Coach) {
  return {
    id: c.id,
    gender: c.gender,
    heritage: c.heritage,
    seniority: Math.max(0.08, Math.min(0.65, c.quality / COACH_GRAY_AT_QUALITY * 0.65)),
  };
}

// WHICH TEAMS COULD USE THIS CANDIDATE, as {team, role} pairs. A head/assistant
// coach's field is one SPORTS id, so they can only ever answer the team
// playing that sport — but they may answer either of ITS two chairs. A trainer
// serves any team regardless of sport, so a single trainer listing can be the
// answer to a dozen different vacancies at once.
interface Opening { team: VarsityTeam; role: Role; }

function openingsFor(s: GameState, c: Coach): Opening[] {
  const out: Opening[] = [];
  for (const team of s.orgs.teams) {
    if (c.field === TRAINER_FIELD) {
      if (!team.trainer) out.push({ team, role: 'trainer' });
      continue;
    }
    if (team.sport !== c.field) continue;
    if (!team.headCoach) out.push({ team, role: 'head' });
    if (!team.assistantCoach) out.push({ team, role: 'assistant' });
  }
  return out;
}

// What a candidate's field is called on screen. A SPORTS id resolves to the
// team name it would coach; TRAINER_FIELD is a discipline, not a sport.
function fieldLabel(field: string): string {
  return field === TRAINER_FIELD ? 'Strength & Conditioning' : sportById(field)?.teamName ?? field;
}

// ---------------------------------------------------------------------
// THE MARKET — one list of everyone on it, tagged by who needs them.
//
// This is the shape FacultyTab.tsx used to have and gave up, and its own
// header records why: faculty hiring moved to the Curriculum tab "where the
// shortage is actually felt — you find out you need a kinesiologist when a
// course will not start." Athletics has no second screen where a coaching
// shortage surfaces. This tab IS where it is felt, so the pattern was never
// wrong — it was in the wrong building.
//
// SORTED BY WHETHER ANYBODY NEEDS THEM, then by quality. A market where the
// useful listings are scattered through the useless ones is a market the
// player scrolls past; putting the answerable ones on top is the whole
// content of "tagged by need".
// ---------------------------------------------------------------------
function TheMarket({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const [showAll, setShowAll] = useState(false);

  const listed = s.orgs.coachCandidates.map((c) => ({ c, openings: openingsFor(s, c) }));
  const wanted = listed.filter((row) => row.openings.length > 0);
  const rest = listed.filter((row) => row.openings.length === 0);
  const byQuality = (a: { c: Coach }, b: { c: Coach }) => b.c.quality - a.c.quality;
  wanted.sort(byQuality);
  rest.sort(byQuality);

  const shown = showAll ? [...wanted, ...rest] : wanted;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>On the market</h2>
        <HelpHint
          text="One pool for the whole department, not a separate list per chair. A head or assistant coach is qualified for exactly one sport, so their listing can only answer that sport's team; a trainer's discipline is strength &amp; conditioning, so one trainer can answer any team's vacancy. Candidates whose sport you field with a chair open are listed first and tagged with the team that wants them — the rest are on the market too, and are shown by the toggle. Listings withdraw after a few months whether or not you hire, so a strong candidate in a sport you are about to field is worth taking when they appear."
        />
      </div>

      {listed.length === 0 ? (
        <p className="empty-note">Nobody is on the coaching market this week.</p>
      ) : (
        <>
          {wanted.length === 0 && !showAll && (
            <p className="empty-note">
              Nobody on the market coaches a sport you field with a chair open.
              {rest.length > 0 && ' There are others listed — see below.'}
            </p>
          )}
          <ul className="org-list coach-market">
            {shown.map(({ c, openings }) => (
              <li key={c.id} className={`coach-candidate${openings.length > 0 ? ' wanted' : ''}`}>
                <FacultyPortrait f={coachPortrait(c)} size={30} />
                <span className="coach-candidate-who">
                  <span className="org-name">{c.name}</span>
                  <span className="coach-candidate-field">{fieldLabel(c.field)}</span>
                </span>
                <span className="stat">quality {c.quality}</span>
                <span className="stat">{money(c.salary)}/yr</span>
                <span className="coach-candidate-listed">
                  {Math.max(0, COACH_CANDIDATE_LISTING_WEEKS - c.weeksListed)}w left
                </span>
                <span className="coach-candidate-hire">
                  {openings.length === 0
                    ? <span className="coach-candidate-idle">no chair open</span>
                    : openings.map(({ team, role }) => (
                      <button
                        key={`${team.id}:${role}`}
                        type="button"
                        title={`${team.name} — ${ROLE_LABEL[role]}`}
                        onClick={() => act({ type: 'HIRE_COACH', candidateId: c.id, teamId: team.id, role })}
                      >
                        {/* The tag IS the button: naming the team that wants
                            them is what turns a list of strangers into a list
                            of answers, and clicking the answer should be the
                            same gesture as reading it. */}
                        {openings.length === 1 && openings[0].role !== 'trainer'
                          ? `Hire — ${ROLE_LABEL[role]}`
                          : `${team.name}${role === 'trainer' ? '' : ` · ${ROLE_LABEL[role]}`}`}
                      </button>
                    ))}
                </span>
              </li>
            ))}
          </ul>
          {rest.length > 0 && (
            <button type="button" className="coach-market-toggle" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show only who you need' : `Show the rest of the market (${rest.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------
// THE DEPARTMENT — who runs it, what it is called, what it spends, and where
// it stands.
//
// The tab used to open on the budget lever, which is a knob rather than a
// subject: it told a player what they could change before telling them what
// they had. This is the header the screen was missing — the director, the
// name the teams play under, the two standings athletics actually moves, and
// only then the one dial.
// ---------------------------------------------------------------------
function Department({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const active = s.orgs.teams.filter((t) => t.status === 'active');
  const ad = s.orgs.athleticDirector;

  return (
    <section className="panel department">
      <div className="panel-head">
        <h2>{s.self.mascot ? `${institutionName(s.self)} ${s.self.mascot}` : 'Varsity Athletics'}</h2>
        <HelpHint
          text="A sport club (see Student Life) can petition to go varsity: a program budget and a shared competition venue for its sport's category. Coaching staff is hired separately, from the one market below — every team wants a head coach, an assistant and a trainer, and a vacant chair is a real gap rather than a hard block. The recruiting &amp; scholarship budget is the department's one dial: it scales every active team's social contribution and the whole department's running cost together, and adds a flat bonus to every team's quality. The athletic director adds a second, smaller lift to every team at once — the difference between the two is that one is money and the other is a person. Campus-life standing is one of the three the school is ranked on, and varsity athletics is the only thing on this screen that moves it."
        />
      </div>

      <div className="department-grid">
        {/* The director first: they are the answer to "who runs this", and
            an empty chair here says the offer is still coming. */}
        <div className="department-ad">
          {ad ? (
            <>
              <FacultyPortrait f={coachPortrait(ad)} size={44} />
              <span className="department-ad-who">
                <span className="department-ad-name">{ad.name}</span>
                <span className="department-ad-role">Athletic Director</span>
              </span>
              <span className="department-ad-numbers">
                <span className="stat">quality {ad.quality}</span>
                <span className="stat">{money(ad.salary)}/yr</span>
              </span>
            </>
          ) : (
            <p className="empty-note department-ad-empty">
              No athletic director. The trustees will put candidates forward before long.
            </p>
          )}
        </div>

        {/* The two standings, side by side, because they answer different
            questions: how good is the department, and how much does the
            school's campus life amount to. Athletics is the only thing on
            this screen that moves the second. */}
        <dl className="department-standings">
          <div>
            <dt>Athletic standing</dt>
            <dd>{active.length > 0 ? <><strong>#{athleticRank(s)}</strong> of {s.rivals.length + 1}</> : <span className="stat">no program yet</span>}</dd>
          </div>
          <div>
            <dt>Campus life</dt>
            <dd><strong>#{rankBy(s, 'socialStanding')}</strong> of {s.rivals.length + 1}</dd>
          </div>
        </dl>
      </div>

      <div className="athletics-budget">
        <span className="stat">Recruiting &amp; Scholarship Budget: {s.orgs.athleticsBudget}</span>
        <div className="athletics-budget-tiers">
          {ATHLETICS_BUDGET_ORDER.map((tier) => (
            <button
              key={tier}
              type="button"
              className={tier === s.orgs.athleticsBudget ? 'active' : ''}
              aria-pressed={tier === s.orgs.athleticsBudget}
              onClick={() => act({ type: 'SET_ATHLETICS_BUDGET', tier })}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// THE STANDINGS — one row per sport the school actually fields, showing where
// it sits in THAT sport rather than in athletics generally.
//
// This is what PR 1C's per-sport strength was built for, and the first screen
// in the game where the field is something other than one ordered list of a
// hundred names. The department-wide rank above says whether the school runs a
// good athletics program; this says whether it is any good at lacrosse, which
// is the question a particular coach hire is an answer to.
//
// Each row shows the schools immediately above and below, by name and mascot,
// because a rank with nothing around it is a number and a rank between two
// named rivals is a position.
// ---------------------------------------------------------------------
function SportStandings({ s }: { s: GameState }) {
  const fielded = s.orgs.teams.filter((t) => t.status === 'active');
  if (fielded.length === 0) return null;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>By sport</h2>
        <HelpHint
          text="Every school in the country is stronger at some sports than others, and reliably so — a school that is good at hockey stays good at hockey. Your own strength in a sport is that team's quality, which is its coaching staff, the recruiting budget and the athletic director together, so hiring a coach moves your place on this table rather than some separate figure. Teams still waiting on a venue are not ranked: they cannot compete yet."
        />
      </div>
      <ul className="sport-standings">
        {fielded.map((team) => {
          const list = sportRankedList(s, team.sport);
          const place = sportRank(s, team.sport);
          if (place === null) return null;
          const above = list[place - 2];
          const below = list[place];
          return (
            <li key={team.id} className="sport-standing">
              <span className="sport-standing-sport">{sportById(team.sport)?.teamName ?? team.sport}</span>
              <span className="sport-standing-place">
                <strong>#{place}</strong>
                <span className="sport-standing-of">of {list.length}</span>
              </span>
              <span className="sport-standing-neighbours">
                {above
                  ? <span className="sport-standing-above">↑ {above.name} {above.mascot}</span>
                  : <span className="sport-standing-above best">nobody in the country is ahead</span>}
                {below && <span className="sport-standing-below">↓ {below.name} {below.mascot}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TeamCard({ s, act, team }: { s: GameState; act: (a: Action) => void; team: VarsityTeam }) {
  const quality = teamQuality(team, s);
  const staffAnnual = (team.headCoach?.salary ?? 0) + (team.assistantCoach?.salary ?? 0) + (team.trainer?.salary ?? 0);
  const weeklyCost = team.upkeepPerWeek + staffAnnual / WEEKS_PER_YEAR;
  const venue = venueForCategory(s, team.venueCategory);

  return (
    <li className="panel team-card">
      <div className="team-card-head">
        <span className="org-name">
          {team.name}
          <span className="org-tag">{team.status === 'active' ? 'varsity' : 'awaiting venue'}</span>
        </span>
        <span className="org-meta">
          quality {quality} · {team.status === 'active'
            ? venue?.name ?? 'venue'
            : `waiting on ${venue?.name ?? 'venue'}`} · {money(weeklyCost)}/wk
        </span>
      </div>
      {ROLE_ORDER.map((role) => <StaffRow key={role} act={act} team={team} role={role} />)}
    </li>
  );
}

export default function AthleticsTab({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const teams = s.orgs.teams;
  const active = teams.filter((t) => t.status === 'active');
  const awaiting = teams.filter((t) => t.status === 'awaitingVenue');

  return (
    <div className="tab-content">
      {/* THE ORDER IS THE ORDER THE QUESTIONS ARRIVE IN. What is this
          department and where does it stand; what does it field; how is it
          doing in each sport; and who is available to fix what is missing.
          The tab used to open on the budget lever — a knob before a
          subject. */}
      <Department s={s} act={act} />

      <section className="panel">
        <div className="panel-head">
          <h2>{teams.length === 1 ? 'One program' : `${teams.length} programs`}</h2>
        </div>
        {teams.length === 0 ? (
          <p className="empty-note">No sport club has gone varsity yet.</p>
        ) : (
          <ul className="team-card-list">
            {/* Active first, then the ones waiting on a building: a team that
                cannot compete yet is a construction item, not a program, and
                sorting it down says so without a second heading. */}
            {active.map((team) => <TeamCard key={team.id} s={s} act={act} team={team} />)}
            {awaiting.map((team) => <TeamCard key={team.id} s={s} act={act} team={team} />)}
          </ul>
        )}
      </section>

      <SportStandings s={s} />

      {/* The market sits LAST, because that is the order the questions arrive
          in: you notice a chair is empty on a team, then you go looking for
          somebody to fill it. */}
      {teams.length > 0 && <TheMarket s={s} act={act} />}
    </div>
  );
}
