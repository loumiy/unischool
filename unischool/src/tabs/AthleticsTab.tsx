import { useState } from 'react';
import type { Action } from '../state/actions';
import type { Coach, GameState, VarsityTeam } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import HelpHint from '../components/HelpHint';
import { ATHLETICS_BUDGET_ORDER, TRAINER_FIELD, teamQuality, venueForCategory } from '../data/studentLifeData';
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

// One staff role's row: either the coach filling it (name, quality, salary,
// a Release button), or — vacant — a toggle that expands the eligible
// slice of s.orgs.coachCandidates (this role's own field: the team's sport
// for head/assistant, TRAINER_FIELD for trainer, so a trainer candidate is
// hireable by any team regardless of sport) to hire from. Candidates for a
// single specific field are few enough (the market spreads ~18 listings
// across 15 fields) that showing them inline, unpaged, reads fine — no
// FacultyTab-style expand-per-row needed beyond the one vacancy toggle.
function StaffRow({ s, act, team, role }: { s: GameState; act: (a: Action) => void; team: VarsityTeam; role: Role }) {
  const [open, setOpen] = useState(false);
  const coach = coachInSlot(team, role);

  if (coach) {
    return (
      <div className="coach-row">
        <span className="coach-role">{ROLE_LABEL[role]}</span>
        <span className="coach-name">{coach.name}</span>
        <span className="stat">quality {coach.quality}</span>
        <span className="stat">{money(coach.salary)}/yr</span>
        <span className="coach-row-spacer" />
        <button type="button" onClick={() => act({ type: 'FIRE_COACH', teamId: team.id, role })}>Release</button>
      </div>
    );
  }

  const field = role === 'trainer' ? TRAINER_FIELD : team.sport;
  const candidates = s.orgs.coachCandidates
    .filter((c) => c.field === field)
    .sort((a, b) => b.quality - a.quality);

  return (
    <div className="coach-row vacant">
      <span className="coach-role">{ROLE_LABEL[role]}</span>
      <span className="stat">vacant</span>
      <span className="coach-row-spacer" />
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? 'hide' : `hire (${candidates.length})`}
      </button>
      {open && (
        candidates.length === 0 ? (
          <p className="empty-note coach-candidates-empty">Nobody on the market for this role yet — check back another week.</p>
        ) : (
          <ul className="org-list coach-candidates">
            {candidates.map((c) => (
              <li key={c.id} className="org-row">
                <span className="org-name">
                  {c.name}
                  <span className="org-tag">quality {c.quality}</span>
                </span>
                <span className="org-meta">
                  {money(c.salary)}/yr
                  <button type="button" onClick={() => act({ type: 'HIRE_COACH', candidateId: c.id, teamId: team.id, role })}>Hire</button>
                </span>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
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
      {ROLE_ORDER.map((role) => <StaffRow key={role} s={s} act={act} team={team} role={role} />)}
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
    </div>
  );
}
