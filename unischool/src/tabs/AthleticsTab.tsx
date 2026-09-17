import { useState } from 'react';
import type { Action } from '../state/actions';
import type { Coach, GameState, VarsityTeam } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import HelpHint from '../components/HelpHint';
import {
  ATHLETICS_BUDGET_ORDER, COACH_CANDIDATE_LISTING_WEEKS, TRAINER_FIELD,
  sportById, teamQuality, venueForCategory,
} from '../data/studentLifeData';
import FacultyPortrait from '../components/FacultyPortrait';
import { athleticRank } from '../systems/rivals/rivalsSystem';

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

function TeamCard({ s, act, team }: { s: GameState; act: (a: Action) => void; team: VarsityTeam }) {
  const quality = teamQuality(team, s);
  const staffAnnual = (team.headCoach?.salary ?? 0) + (team.assistantCoach?.salary ?? 0) + (team.trainer?.salary ?? 0);
  const weeklyCost = team.upkeepPerWeek + staffAnnual / WEEKS_PER_YEAR;
  return (
    <li className="panel team-card">
      <div className="team-card-head">
        <span className="org-name">
          {team.name}
          <span className="org-tag">{team.status === 'active' ? 'varsity' : 'awaiting venue'}</span>
        </span>
        <span className="org-meta">
          quality {quality} · {team.status === 'active' ? venueForCategory(s, team.venueCategory)?.name ?? 'venue' : `waiting on ${venueForCategory(s, team.venueCategory)?.name ?? 'venue'}`} · {money(weeklyCost)}/wk
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
  const rank = active.length > 0 ? athleticRank(s) : null;

  return (
    <div className="tab-content">
      <section className="panel">
        <div className="panel-head">
          <h2>Varsity Athletics</h2>
          <HelpHint
            text="A sport club (see Student Life) can petition to go varsity: a program budget and a shared competition venue for its sport's category — the coaching staff is hired separately, right here, from a standing candidate pool (mirroring how Faculty hiring works). Every team needs a head coach, an assistant coach, and a trainer; a trainer's field is strength & conditioning, so the same trainer candidates are hireable by any team regardless of sport, while a head/assistant coach candidate is scoped to one specific sport. A vacant role still functions, just at a lower team quality — there's no hard block on an understaffed program. The recruiting & scholarship budget below is the one department-wide knob: it scales every active team's social contribution and the whole program's upkeep together, and now also adds a flat bonus to every team's quality. Standings compare your program's overall quality against rival schools' own athletic strength — a second, independent ranking axis from the academic one."
          />
        </div>
        <div className="athletics-budget">
          <span className="stat">Recruiting & Scholarship Budget: {s.orgs.athleticsBudget}</span>
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
        {rank !== null && (
          <p className="athletics-rank">Athletic standing: <strong>#{rank}</strong> of {s.rivals.length + 1}</p>
        )}
        {teams.length === 0 ? (
          <p className="empty-note">No sport club has gone varsity yet.</p>
        ) : (
          <ul className="team-card-list">
            {active.map((team) => <TeamCard key={team.id} s={s} act={act} team={team} />)}
            {awaiting.map((team) => <TeamCard key={team.id} s={s} act={act} team={team} />)}
          </ul>
        )}
      </section>

      {/* The market sits BELOW the teams, because that is the order the
          questions arrive in: you notice a chair is empty on the team, then
          you go looking for somebody to fill it. */}
      {teams.length > 0 && <TheMarket s={s} act={act} />}
    </div>
  );
}
