import type { GameState } from '../state/types';
import type { Action } from '../state/actions';
import { isPlaceableKind } from '../state/campusMap';
import {
  BACKLOG_GROWTH_RATE, MAINTENANCE_FUNDING_STEP, RENOVATION_WEEKS, canRenovate, conditionOf, maintenanceFunding, renovationCost,
} from '../systems/estate/estate';
import { canPayForWorks } from '../systems/finance/treasury';
import HelpHint from '../components/HelpHint';
import { count, money, moneyShort, pct, weeksShort } from '../format';
import { beautyTerms } from '../systems/estate/beauty';
import { boardHoldsBudget } from '../systems/finance/distress';

// The estate (systems/estate): how much of the buildings' upkeep is paid,
// what the rest has cost them, and the buildings most in need. Renovation
// is offered here and on each building's panel.

const WORST_SHOWN = 5;

export default function EstatePanel({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const funding = maintenanceFunding(s);
  const buildings = s.tech.filter((t) => isPlaceableKind(t) && t.status === 'done');
  const backlog = buildings.reduce((sum, t) => sum + (t.backlog ?? 0), 0);
  const mean = buildings.length === 0 ? 1 : buildings.reduce((sum, t) => sum + conditionOf(t), 0) / buildings.length;
  const worst = buildings
    .filter((t) => (t.backlog ?? 0) > 0 || (t.renovationWeeks ?? 0) > 0)
    .sort((a, b) => conditionOf(a) - conditionOf(b))
    .slice(0, WORST_SHOWN);
  const setFunding = (level: number) => act({ type: 'SET_MAINTENANCE_FUNDING', level });
  const beauty = beautyTerms(s);
  // Under austerity and receivership the board sets it (finance/distress.ts).
  const held = boardHoldsBudget(s);
  return (
    <section className="panel estate-panel">
      <div className="panel-head">
        <h2>Buildings and grounds</h2>
        <HelpHint align="end" text={`Every building has an upkeep. Pay all of it and the campus stays as built. Pay less and the difference becomes each building's backlog, which grows ${pct(BACKLOG_GROWTH_RATE)} a year and wears the building down: streaks, lost slates, boarded windows and, at the end, a fence around a ruin. A renovation pays a building's backlog off, plus a fee, over ${RENOVATION_WEEKS} weeks under scaffolding, and it stays open throughout.`} />
      </div>
      <div className="estate-funding">
        <span>Maintenance funded</span>
        <button type="button" className="panel-action small" aria-label="Fund less" disabled={held || funding <= 0} onClick={() => setFunding(funding - MAINTENANCE_FUNDING_STEP)}>−</button>
        <strong>{pct(funding)}</strong>
        <button type="button" className="panel-action small" aria-label="Fund more" disabled={held || funding >= 1} onClick={() => setFunding(funding + MAINTENANCE_FUNDING_STEP)}>+</button>
      </div>
      <dl>
        <dt>Campus beauty</dt>
        <dd>
          {count(beauty.score)} of 100
          <span className="stat"> — greenery {pct(beauty.greenery)}, landmarks {pct(beauty.landmarks)}, upkeep {pct(beauty.upkeep)}, quads {pct(beauty.enclosure)}</span>
        </dd>
        <dt>Mean condition</dt><dd>{pct(mean)}</dd>
        <dt>Backlog</dt><dd>{money(backlog)}</dd>
      </dl>
      {worst.length > 0 && (
        <ul className="estate-worst">
          {worst.map((t) => (
            <li key={t.id}>
              <span>{t.name}</span>
              <span className="stat">{pct(conditionOf(t))}</span>
              {(t.renovationWeeks ?? 0) > 0
                ? <span className="stat">under scaffolding, {weeksShort(t.renovationWeeks ?? 0)}</span>
                : (
                  <button
                    type="button"
                    className="panel-action small"
                    disabled={!canRenovate(t) || !canPayForWorks(s, renovationCost(t))}
                    onClick={() => act({ type: 'RENOVATE_BUILDING', id: t.id })}
                  >
                    Renovate · {moneyShort(renovationCost(t))} · {weeksShort(RENOVATION_WEEKS)}
                  </button>
                )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
