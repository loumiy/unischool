import type { ReactNode } from 'react';
import type { GameState } from '../state/types';
import { totalEnrolled } from '../state/types';
import { count, moneyShort, prestigeFigure } from '../format';
import {
  gradeYear, PRESTIGE_MAX, type Pillar, type StandingBreakdown, type StandingInput,
} from '../systems/prestige/prestigeSystem';
import { rankForecast } from '../systems/administration/forecast';
import { collegeSpecialization } from '../systems/prestige/milestone';
import { pillarRule } from '../data/prestigeWords';
import { PILLAR_ICONS } from '../components/icons';
import type { BelowALink } from './StandingBreakdown';

// ---------------------------------------------------------------------
// History › Prestige, at a glance (Plan 107D, the owner's pick of the
// mock-ups): the figure and which way it is going, where it sits on its
// scale, and one meter per pillar with one number, what it adds. A pillar's
// meter is as long as the most it can add, so academics' is the longest,
// and filled as far as the college has earned it. Everything the panel
// said in words before (the pillars' make-up, the summer, the
// specialization, the teaching ceiling) is under Details, closed.
//
// The target is not shown as a figure (Plan 98B), only its direction; a
// college with the Office of Institutional Research also reads the
// summer's step.
// ---------------------------------------------------------------------

// Which way the summer will take it: up, down or level.
export function prestigeDirection(breakdown: StandingBreakdown): 'up' | 'down' | 'level' {
  const gap = breakdown.target - breakdown.current;
  return gap >= 0.05 ? 'up' : gap <= -0.05 ? 'down' : 'level';
}
const ARROWS = { up: '↗', down: '↘', level: '→' } as const;
const DIRECTION_WORDS = {
  up: "This year's grade is lifting it.",
  down: "This year's grade is pulling it down.",
  level: "This year's grade is holding it steady.",
} as const;

const signed = (v: number) => `${v >= 0.05 ? '+' : v <= -0.05 ? '−' : ''}${Math.abs(v).toFixed(1)}`;

// A pillar's terms in prestige's points: a term's worth on the pillar's own
// scale times the pillar's share of prestige.
function termsLine(pillar: StandingBreakdown): string {
  const share = pillar.share ?? 0;
  return pillar.inputs.map((t) => `${t.label} ${signed(t.contribution * share)}`).join(' · ');
}

// The summer, in a sentence: how it steps, and what last summer did.
function lastSummer(breakdown: StandingBreakdown): string {
  const card = breakdown.summer?.reportCard;
  const rule = 'Graded each summer, it climbs toward its grade and falls faster than it climbs.';
  return card
    ? `${rule} Last summer: ${prestigeFigure(card.before)} → ${prestigeFigure(card.after)}.`
    : `${rule} The first grade comes at the first summer.`;
}

function PillarMeter({ input, longest }: { input: StandingInput; longest: number }) {
  const key = input.key as Pillar;
  const Icon = PILLAR_ICONS[key];
  const fill = input.weight > 0 ? Math.max(0, Math.min(1, input.contribution / input.weight)) : 0;
  return (
    <li className={`glance-row glance-pillar pillar-${key}`}>
      <span className="glance-icon" aria-hidden="true">{Icon && <Icon />}</span>
      <span className="glance-label">{input.label}</span>
      <span className="glance-meter-lane">
        <span className="glance-meter" style={{ width: `${(input.weight / longest) * 100}%` }} aria-hidden="true">
          <span className="glance-meter-fill" style={{ width: `${fill * 100}%` }} />
        </span>
      </span>
      <span className="glance-figure">{signed(input.contribution)}</span>
    </li>
  );
}

function AdjustmentRow({ input, line }: { input: StandingInput; line: string }) {
  return (
    <li className={`glance-row glance-adjustment${input.contribution <= -0.05 ? ' cost' : ''}`}>
      <span className="glance-icon" aria-hidden="true" />
      <span className="glance-label">{input.label}</span>
      <span className="glance-line">{line}</span>
      <span className="glance-figure">{signed(input.contribution)}</span>
    </li>
  );
}

const ADJUSTMENT_LABELS: Record<string, string> = { endowment: 'Endowment', condition: 'Upkeep' };
function adjustmentLine(s: GameState, input: StandingInput): string {
  if (input.key === 'endowment') return `${moneyShort(s.finance.endowment)} for ${count(totalEnrolled(s.students))} students`;
  if (input.key === 'condition') return input.contribution <= -0.05 ? 'Buildings need their upkeep' : 'Buildings in good repair';
  return input.detail;
}

export function PrestigeGlance({ s, breakdown, belowA, head }: {
  s: GameState; breakdown: StandingBreakdown; belowA?: BelowALink; head?: ReactNode;
}) {
  const direction = prestigeDirection(breakdown);
  const forecast = rankForecast(s);
  const step = forecast ? gradeYear(s).after - breakdown.current : null;
  const pillars = breakdown.inputs.filter((i) => i.pillar);
  const adjustments = breakdown.inputs.filter((i) => !i.pillar && i.key in ADJUSTMENT_LABELS);
  const longest = Math.max(...pillars.map((p) => p.weight));
  const at = Math.max(0, Math.min(1, breakdown.current / PRESTIGE_MAX));
  return (
    <div className="glance">
      <div className="glance-head">
        {head}
        <span className={`glance-figure-big ${direction}`}>
          {prestigeFigure(breakdown.current)}
          <span className="glance-arrow" aria-label={direction === 'up' ? 'rising' : direction === 'down' ? 'falling' : 'steady'}>{ARROWS[direction]}</span>
        </span>
      </div>
      <p className="glance-sub">
        {DIRECTION_WORDS[direction]}
        {step !== null && <> About <strong className={direction}>{signed(step)}</strong> next summer.</>}
      </p>
      <div className="glance-track" role="img" aria-label={`Prestige ${prestigeFigure(breakdown.current)} of ${PRESTIGE_MAX}`}>
        <span className="glance-track-fill" style={{ width: `${at * 100}%` }} />
      </div>
      <div className="glance-scale" aria-hidden="true"><span>0</span><span>{PRESTIGE_MAX}</span></div>

      <h3 className="glance-title">What lifts it</h3>
      <ul className="glance-rows">
        {pillars.map((p) => <PillarMeter key={p.key} input={p} longest={longest} />)}
        {adjustments.map((a) => (
          <AdjustmentRow key={a.key} input={{ ...a, label: ADJUSTMENT_LABELS[a.key] }} line={adjustmentLine(s, a)} />
        ))}
      </ul>

      <details className="glance-details">
        <summary>Details</summary>
        <ul className="glance-terms">
          {pillars.map((p) => (
            <li key={p.key} className={`pillar-${p.key}`}>
              <strong>{p.label} {signed(p.contribution)}</strong>
              <span>{termsLine(p.pillar!)}</span>
            </li>
          ))}
        </ul>
        <p className="stat pillar-rule">{pillarRule()}</p>
        <p className="stat specialization-status">{collegeSpecialization(s)}</p>
        {forecast && (
          <p className="stat rank-forecast">
            The Office of Institutional Research: graded today, the summer would leave the college at {prestigeFigure(forecast.prestige)},
            {' '}#{forecast.rank} in the guide{forecast.rank === forecast.now ? ', where it stands now' : ` (#${forecast.now} now)`}.
          </p>
        )}
        <p className="stat">{lastSummer(breakdown)}</p>
        {breakdown.ceiling && (
          <p className={`stat standing-ceiling${breakdown.held ? ' binding' : ''}`}>
            <strong>{breakdown.ceiling.label}:</strong> {breakdown.ceiling.detail}
            {breakdown.held && ` ${breakdown.ceiling.held ?? 'It is holding prestige back now.'}`}
            {belowA && belowA.count > 0 && (
              <>
                {' '}
                <button type="button" className="standing-link" onClick={belowA.onOpen}>
                  {belowA.count === 1 ? 'Show the course below the top band' : `Show the ${belowA.count} courses below the top band`}
                </button>
              </>
            )}
          </p>
        )}
      </details>
    </div>
  );
}
