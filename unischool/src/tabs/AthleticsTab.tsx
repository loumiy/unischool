import type { GameState } from '../state/types';
import type { Action } from '../state/actions';
import HelpHint from '../components/HelpHint';
import {
  ATHLETICS_INVESTMENT_ORDER, coachSalary, venueForCategory,
} from '../data/studentLifeData';

function money(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
}

// ---------------------------------------------------------------------
// VARSITY ATHLETICS (moved here from StudentLifeTab.tsx — a sport club
// still lives on Student Life, alongside every other club, until it
// graduates; only VARSITY status moves it here). Active teams, teams still
// awaiting their shared venue, and the one investment lever (item 4). No
// "petition" affordance here: like the chapter housing petition, going
// varsity is only ever offered through the decision-event interrupt (see
// eventData.ts's 'varsity-petition'), never dispatched directly from this
// tab.
// ---------------------------------------------------------------------
export default function AthleticsTab({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const teams = s.orgs.teams;
  const active = teams.filter((t) => t.status === 'active');
  const awaiting = teams.filter((t) => t.status === 'awaitingVenue');

  return (
    <div className="tab-content">
      <section className="panel">
        <div className="panel-head">
          <h2>Varsity Athletics</h2>
          <HelpHint
            text="A sport club (see Student Life) can petition, once, to go varsity: a paid coach, a program budget, and a shared competition venue for its sport's category. A two-gender sport's men's and women's clubs are independent programs that each petition on their own — going varsity in one never opens or closes the other. Either way, the second team in a category (any gender) finds the venue already revealed or built and pays only the varsity cost. The investment lever below is the one knob for the whole department — it scales every active team's contribution to social satisfaction, and the whole program's upkeep, together; it is not a per-team budget."
          />
        </div>
        <div className="athletics-investment">
          <span className="stat">Investment: {s.orgs.athleticsInvestment}</span>
          <div className="athletics-investment-tiers">
            {ATHLETICS_INVESTMENT_ORDER.map((tier) => (
              <button
                key={tier}
                type="button"
                className={tier === s.orgs.athleticsInvestment ? 'active' : ''}
                aria-pressed={tier === s.orgs.athleticsInvestment}
                onClick={() => act({ type: 'SET_ATHLETICS_INVESTMENT', tier })}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>
        {teams.length === 0 ? (
          <p className="empty-note">No sport club has gone varsity yet.</p>
        ) : (
          <ul className="org-list">
            {active.map((team) => (
              <li key={team.id} className="org-row">
                <span className="org-name">
                  {team.name}
                  <span className="org-tag">varsity</span>
                </span>
                <span className="org-meta">
                  coach {team.coachName} · {venueForCategory(s, team.venueCategory)?.name ?? 'venue'} ·{' '}
                  {money(team.upkeepPerWeek + coachSalary(team, s))}/wk
                </span>
              </li>
            ))}
            {awaiting.map((team) => (
              <li key={team.id} className="org-row">
                <span className="org-name">
                  {team.name}
                  <span className="org-tag">awaiting venue</span>
                </span>
                <span className="org-meta">
                  coach {team.coachName} · waiting on {venueForCategory(s, team.venueCategory)?.name ?? 'venue'} ·{' '}
                  {money(team.upkeepPerWeek + coachSalary(team, s))}/wk
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
