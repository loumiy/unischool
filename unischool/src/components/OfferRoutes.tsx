import type { GameState } from '../state/types';
import { SATISFACTION_LEADS_AT, SPECIALIZATION_MILESTONE_RANK, SPECIALIZATION_PILLAR_RANK, SPECIALIZATION_PILLAR_YEAR, satisfactionLeads } from '../systems/prestige/prestigeSystem';
import { bestPillarStanding } from '../systems/prestige/milestone';
import { playerRank } from '../systems/rivals/rivalsSystem';
import { PILLAR_WORDS } from '../data/specializationData';

// The three routes to the board's offer of a specialization (Plan 125 B), as
// a checklist where a paragraph spelled them out
// (prestigeWords.ts's specializationOfferRule, which the board's letter and
// the build menu's closed tile still use): each with where the college
// stands on it, ticked when it is met. Any one brings the offer at the next
// summer.
export default function OfferRoutes({ s }: { s: GameState }) {
  const rank = playerRank(s);
  const best = bestPillarStanding(s);
  const late = s.clock.year >= SPECIALIZATION_PILLAR_YEAR;
  const routes = [
    { met: rank <= SPECIALIZATION_MILESTONE_RANK, says: `Top ${SPECIALIZATION_MILESTONE_RANK} in the guide`, now: `#${rank} now` },
    { met: late && best.rank <= SPECIALIZATION_PILLAR_RANK, says: `Top ${SPECIALIZATION_PILLAR_RANK} in any one pillar`, now: late ? `best #${best.rank}, ${PILLAR_WORDS[best.pillar]}` : `from Year ${SPECIALIZATION_PILLAR_YEAR}` },
    { met: late && satisfactionLeads(s), says: `Satisfaction ${SATISFACTION_LEADS_AT}+ in over half your years`, now: late ? '' : `from Year ${SPECIALIZATION_PILLAR_YEAR}` },
  ];
  return (
    <div className="offer-routes">
      <p className="offer-routes-head">The board offers a specialization at the first summer you meet any one:</p>
      <ul>
        {routes.map((r) => (
          <li key={r.says} className={r.met ? 'met' : undefined}>
            <span className="offer-route-tick" aria-label={r.met ? 'met' : 'not yet'}>{r.met ? '✓' : ''}</span>
            <span>{r.says}{r.now && <span className="offer-route-now"> · {r.now}</span>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
