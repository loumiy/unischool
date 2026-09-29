import { pct, prestigeFigure, signed } from '../format';
import {
  multiplierLine, type StandingBreakdown, type StandingInput, type StandingReading,
} from '../systems/prestige/prestigeSystem';

// ---------------------------------------------------------------------
// A standing, explained: prestige's in History's Prestige panel, research's
// and campus life's in the standings (Plan 80C). Every figure comes from
// prestigeSystem.ts's breakdown, the object its target function sums, so
// the panel cannot disagree with the tick; nothing here names a row.
//
// Each bar has two layers: pale is what the input's score reaches (weight
// x score), solid is what it is worth after its multiplier. The gap is what
// a shortfall (a small library, a small student body) is costing.
// ---------------------------------------------------------------------

// A penalty row (crowding) is drawn in the penalty color as a subtraction.
// `grade`, when present, is what the input was worth at last summer's report
// card (prestigeSystem.ts's gradeYear), shown beside its worth now.
function StandingRow({ input, max, grade }: { input: StandingInput; max: number; grade?: number }) {
  const reach = input.weight * input.score;
  const worth = Math.abs(input.contribution);
  const sign = input.penalty ? '−' : '+';
  const widthOf = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  return (
    <li className={`standing-row${input.penalty ? ' standing-penalty' : ''}`}>
      <div className="standing-row-head">
        <span className="standing-row-label">{input.label}</span>
        <span className="standing-row-figure">
          {grade !== undefined && (
            <span className="standing-row-grade" title="Graded last summer">{sign}{Math.abs(grade).toFixed(1)} → </span>
          )}
          {sign}{worth.toFixed(1)}<span className="standing-row-of"> of {input.weight}</span>
        </span>
      </div>
      <div className="standing-bar" aria-hidden="true">
        <div className="standing-bar-reach" style={{ width: widthOf(reach) }} />
        <div className="standing-bar-fill" style={{ width: widthOf(worth) }} />
      </div>
      <p className="standing-detail">
        {input.detail}
        {input.multiplier && (
          <>
            {' '}
            <span className="standing-multiplier">
              {multiplierLine(input.multiplier)}
            </span>
          </>
        )}
      </p>
    </li>
  );
}

// A reading is an input that does not count yet (prestigeSystem.ts's
// StandingReading): only the pale layer, at its proposed weight. A reading
// with no weight is a ratio and is shown as a percentage.
function ReadingRow({ item, max }: { item: StandingReading; max: number }) {
  const widthOf = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  return (
    <li className="standing-row standing-reading">
      <div className="standing-row-head">
        <span className="standing-row-label">{item.label}</span>
        <span className="standing-row-figure">
          {item.weight === undefined
            ? pct(item.score)
            : <>{item.penalty ? '−' : '+'}{item.reach.toFixed(1)}<span className="standing-row-of"> of {item.weight}, not yet counted</span></>}
        </span>
      </div>
      {item.weight !== undefined && (
        <div className="standing-bar" aria-hidden="true">
          <div className="standing-bar-reach" style={{ width: widthOf(item.reach) }} />
        </div>
      )}
      <p className="standing-detail">{item.detail}</p>
    </li>
  );
}

// Where a standing sits and where it is heading: "51.5 → 53.2".
export function StandingFigure({ breakdown }: { breakdown: StandingBreakdown }) {
  return (
    <span className="standing-figure">
      {prestigeFigure(breakdown.current)}
      <span className="standing-arrow"> → </span>
      {prestigeFigure(breakdown.target)}
    </span>
  );
}

// The summer model, in a sentence: what the year is grading toward, how
// the step works, and last summer's card if there is one.
function summerNote(breakdown: StandingBreakdown, gap: number): string {
  const { riseRate, maxRise, fallRate, reportCard } = breakdown.summer!;
  const step = gap > 0 ? Math.min(gap * riseRate, maxRise) : Math.abs(gap) * fallRate;
  const grading = `This year is grading ${prestigeFigure(breakdown.target)}; each summer, prestige closes `
    + `${pct(riseRate)} of a gap upward (at most ${prestigeFigure(maxRise)} points) and ${pct(fallRate)} downward`
    + (Math.abs(gap) < 0.05 ? '.' : ` — ${signed(gap > 0 ? step : -step, 1)} if nothing changes.`);
  const last = reportCard
    ? ` Last summer graded ${reportCard.score.toFixed(0)} for Year ${reportCard.year}: ${prestigeFigure(reportCard.before)} → ${prestigeFigure(reportCard.after)}.`
    // Before the first summer (Plan 78C): when the grade first counts.
    : ' Prestige is graded at the end of each year; the first grade comes at the first summer.';
  return grading + last;
}

// `titled`: the breakdown's own heading, with its figure. The Prestige panel
// (HistoryTab.tsx) carries both in its own head and leaves it off.
export function Standing({ breakdown, titled = true }: { breakdown: StandingBreakdown; titled?: boolean }) {
  // All bars share one scale, the largest weight in this standing, so terms
  // are comparable at a glance.
  const max = Math.max(...breakdown.inputs.map((i) => i.weight));
  const gap = breakdown.target - breakdown.current;
  return (
    <div className="standing">
      {titled && (
        <div className="standing-head">
          <h3>{breakdown.label}</h3>
          <StandingFigure breakdown={breakdown} />
        </div>
      )}
      <p className="standing-note">
        {breakdown.summer
          ? summerNote(breakdown, gap)
          : Math.abs(gap) < 0.05
            ? 'Sitting at its target.'
            : `Drifting ${gap > 0 ? 'up' : 'down'} toward ${prestigeFigure(breakdown.target)}, by `
              + `${(Math.abs(gap) * breakdown.driftRate).toFixed(3)} a week — about `
              + `${(Math.abs(gap) * breakdown.driftRate * 52).toFixed(1)} over a year if nothing changes.`}
        {' '}Everything starts from a baseline of {breakdown.baseline}.
      </p>
      {breakdown.ceiling && (
        <p className={`standing-note standing-ceiling${breakdown.ceiling.value <= breakdown.target + 0.05 ? ' binding' : ''}`}>
          <strong>{breakdown.ceiling.label}:</strong> {breakdown.ceiling.detail}
          {breakdown.ceiling.value <= breakdown.target + 0.05 && ' It is holding the target down now.'}
        </p>
      )}
      <ul className="standing-rows">
        {breakdown.inputs.map((input) => (
          <StandingRow key={input.key} input={input} max={max} grade={breakdown.summer?.reportCard?.grades[input.key]} />
        ))}
      </ul>
      {breakdown.readings.length > 0 && (
        <>
          <p className="standing-note standing-readings-note">
            Shown for reference; not part of the grade.
          </p>
          <ul className="standing-rows">
            {breakdown.readings.map((item) => (
              <ReadingRow key={item.key} item={item} max={max} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

