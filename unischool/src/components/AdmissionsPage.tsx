import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Action } from '../state/actions';
import type { GameState, SummerDecision, SummerPayload } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { tuitionFloor } from '../systems/finance/distress';
import { TUITION_SLIDER_MAX } from '../data/foundingData';
import { projectAdmissions, priceTolerance, priceTier, trailingYearSatisfaction, type PriceTier } from '../systems/admissions/admissionsSystem';
import { aidPerStudent, netTuition } from '../systems/alumni/funds';
import { intakeCeiling } from '../systems/techtree/instructionCapacity';
import { cohortBreakdown, deriveCohortSignals } from '../systems/admissions/cohorts';
import { projectConsequences } from '../systems/admissions/consequences';
import { admitRateOpening, poolChange, takesColon } from '../systems/admissions/yearOverYear';
import { admissionsRange } from '../systems/administration/effects';
import { SCALE_FREE_BELOW, marginalStudentCost } from '../systems/finance/financeSystem';
import { COHORT_COLOR } from './cohortColors';
import { FIGURE_HINTS } from '../data/figureHints';
import { reducedMotion } from '../settings';
import { count, money, pct, satisfactionShown, signedMoney, signedPct } from '../format';
import { applicantCloud, cutForRate, gpaOf, rateForCut, satOf, type ApplicantCloud } from './applicantCloud';

// ---------------------------------------------------------------------
// The summer's admissions as a page of its own (Plan 108), in place of the
// inbox card: the same two decisions, drawn. The price is set blind and
// locked, as before; the pool it drew then rains in as a cloud of
// applicants on a GPA by SAT plot, coloured by cohort, and the admit rate
// is a line across the cloud, everything above it admitted. Sending the
// offers pours the admitted into the hall's seats before the Students beat.
//
// Every figure is the one the reducer commits with: projectAdmissions for
// the pool and the class, intakeCeiling for the room, projectConsequences
// for money and mood. The cloud (applicantCloud.ts) only draws the pool;
// the line is the admit rate, and the commit sends the rate.
// ---------------------------------------------------------------------

// The plot and the hall, in the SVG's own units.
const W = 880, H = 680;
const PX = 70, PY = 70, PW = 500, PH = 520;
const HALL = { x: 624, y: 92, w: 236, h: 300 };
const RAIN_MS = 1_500;
const FLOW_MS = 1_900;
// The class shown seated a moment before the Students beat takes over.
const SETTLE_MS = 700;

type Stage = 'price' | 'rain' | 'cut' | 'flow';

// Label and tone for each PriceTier (admissionsSystem.ts).
const PRICE_TIER_COPY: Record<PriceTier, { label: string; className: string }> = {
  bargain: { label: 'a bargain for your prestige', className: 'price-tier-bargain' },
  fair: { label: 'in line with your prestige', className: 'price-tier-fair' },
  expensive: { label: 'more than your prestige supports', className: 'price-tier-expensive' },
  reckless: { label: 'far above what your prestige supports', className: 'price-tier-reckless' },
};
// "Fair" spans 0.7 to 1.15 of what prestige supports, about $6,000 at most
// standings, so the tag says where in it the price sits (the merge review,
// Plan 70E), still without naming the number.
function fairPosition(ratio: number): string {
  if (ratio < 0.9) return ' — on the low side';
  if (ratio > 1.05) return ' — near the top';
  return '';
}

const NEED_LABEL: Record<'housing' | 'basicNeeds', string> = { housing: 'Beds', basicNeeds: 'Dining' };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => 1 - (1 - clamp01(x)) ** 3;
const sx = (v: number) => PX + v * PW;
const sy = (v: number) => PY + (1 - v) * PH;

// The line of equal composite c, clipped to the plot.
function lineAt(c: number) {
  const k = 2 * c;
  const [a, b] = k <= 1 ? [[k, 0], [0, k]] : [[1, k - 1], [k - 1, 1]];
  return { x1: sx(a[0]), y1: sy(a[1]), x2: sx(b[0]), y2: sy(b[1]), mx: sx(c), my: sy(c) };
}
function zoneAt(c: number): string {
  const k = 2 * c;
  const pts = k <= 1 ? [[k, 0], [1, 0], [1, 1], [0, 1], [0, k]] : [[1, k - 1], [1, 1], [k - 1, 1]];
  return pts.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ');
}

// The hall's seats: a grid fitted to the room, its rows bowed like a
// lecture hall's.
function seatGrid(n: number): { x: number; y: number }[] {
  if (n <= 0) return [];
  const cols = Math.max(1, Math.ceil(Math.sqrt((n * HALL.w) / HALL.h)));
  const rows = Math.ceil(n / cols);
  const cell = Math.min(HALL.w / cols, HALL.h / rows);
  const left = HALL.x + (HALL.w - cols * cell) / 2;
  const mid = (cols - 1) / 2;
  return Array.from({ length: n }, (_, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const bow = mid > 0 ? ((col - mid) / mid) ** 2 * cell * 0.6 : 0;
    return { x: left + (col + 0.5) * cell, y: HALL.y + (row + 0.5) * cell + bow };
  });
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((p, q) => p - q);
  return sorted[Math.floor(sorted.length / 2)];
}

// The summer's admissions beat, when it is up: the page.
export function admissionsPageUp(s: GameState): boolean {
  const i = s.pendingInterrupt;
  if (i?.type !== 'summer') return false;
  const p = i.payload as SummerPayload | undefined;
  return p?.beat === 1 && !p.final;
}

export default function AdmissionsPage({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const payload = s.pendingInterrupt!.payload as SummerPayload;
  const prestige = s.self.reputation;
  const capacity = s.students.capacity;
  const satisfaction = trailingYearSatisfaction(s);
  const cohortSignals = deriveCohortSignals(s);
  // Under austerity the board lets tuition rise, never fall (distress.ts).
  const floor = tuitionFloor(s);
  const tuitionLocked = payload.lockedTuition !== undefined;
  const [tuition, setTuition] = useState(payload.lockedTuition ?? Math.max(floor, payload.tuition));
  const [admitRateChoice, setAdmitRateChoice] = useState(payload.admitRate);
  // Where the player has put the line, while they have; else the line
  // stands at the admit rate.
  const [cut, setCut] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage>(tuitionLocked ? 'cut' : 'price');
  const [t, setT] = useState(0);
  const dragging = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const ceiling = intakeCeiling(s);
  // The pool and the class, from the function the reducer commits with.
  const outcome = projectAdmissions(prestige, netTuition(s, tuition), capacity, satisfaction, cohortSignals, admitRateChoice, ceiling.seatsLeft);
  const maxAdmitRate = outcome.applicants > 0 ? Math.max(0.01, Math.min(1, ceiling.seatsLeft / outcome.applicants)) : 1;
  const tolerance = priceTolerance(prestige);
  const tier = priceTier(netTuition(s, tuition), tolerance);
  const cohorts = cohortBreakdown(cohortSignals, tolerance, tuition, outcome.applicants);
  // One dot to a seat, on a scale the price doesn't move: the room, or the
  // pool at half what families expect, whichever is larger. A cheaper price
  // is a denser cloud; the hall's seats stay as they are.
  const scaleBasis = useMemo(
    () => Math.max(ceiling.seatsLeft, projectAdmissions(prestige, netTuition(s, Math.max(floor, tolerance / 2)), capacity, satisfaction, cohortSignals, 1, ceiling.seatsLeft).applicants),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ceiling.seatsLeft, s.clock.year],
  );
  // The cloud holds still for a summer: seeded by the year, drawn from the
  // locked price's pool.
  const cloud: ApplicantCloud = useMemo(
    () => applicantCloud(outcome.poolByBand, cohorts.map((c) => c.applicants), ceiling.seatsLeft, s.clock.year * 7919 + 17, scaleBasis),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tuition, ceiling.seatsLeft, s.clock.year, outcome.applicants, scaleBasis],
  );
  // The admit rate: the line's share of the cloud, held to the room (Plan
  // 107G), or the opening rate held to it before the line is touched.
  const admitRate = Math.min(cut === null ? admitRateChoice : rateForCut(cloud, cut), maxAdmitRate);
  const fullCut = maxAdmitRate < 1 ? cutForRate(cloud, maxAdmitRate) : null;
  const shownCut = cut === null ? cutForRate(cloud, admitRate) : Math.max(cut, fullCut ?? 0);
  const shownOutcome = admitRate === admitRateChoice ? outcome
    : projectAdmissions(prestige, netTuition(s, tuition), capacity, satisfaction, cohortSignals, admitRate, ceiling.seatsLeft);
  const consequence = projectConsequences(s, shownOutcome.enrolled, tuition, shownOutcome.avgIncomingQuality);
  const netDelta = consequence.weeklyNet - consequence.weeklyNetNow;
  const moodDelta = satisfactionShown(consequence.satisfactionTarget) - satisfactionShown(consequence.satisfactionTargetNow);
  const change = poolChange(outcome, s.students.lastFunnel);
  const poolRange = admissionsRange(s, outcome.applicants);

  // The animations: the pool raining in, and the class pouring into the
  // hall. Under reduced motion both are a single step.
  const raf = useRef<number | null>(null);
  useEffect(() => () => { if (raf.current !== null) cancelAnimationFrame(raf.current); }, []);
  const run = (next: Stage, ms: number, done: () => void) => {
    setStage(next);
    if (reducedMotion()) { done(); return; }
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setT(k);
      if (k < 1) raf.current = requestAnimationFrame(step); else done();
    };
    raf.current = requestAnimationFrame(step);
  };

  const lock = () => {
    act({ type: 'LOCK_TUITION', tuition });
    setT(0);
    run('rain', RAIN_MS, () => { setStage('cut'); setT(0); });
  };
  const send = () => {
    const decision: SummerDecision = { tuition, admitRate };
    setT(0);
    run('flow', FLOW_MS, () => {
      const commit = () => act({ type: 'RESOLVE_SUMMER_BEAT', decision });
      if (reducedMotion()) commit(); else window.setTimeout(commit, SETTLE_MS);
    });
  };

  // Dragging the line: anywhere on the plot, or its handle.
  const cutAt = (e: PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    const xn = (x - PX) / PW, yn = 1 - (y - PY) / PH;
    setCut(Math.max(0.02, Math.min(0.98, (xn + yn) / 2)));
  };
  const onDown = (e: PointerEvent<SVGElement>) => {
    if (stage !== 'cut') return;
    dragging.current = true;
    svgRef.current?.setPointerCapture?.(e.pointerId);
    cutAt(e);
  };
  const onMove = (e: PointerEvent<SVGElement>) => { if (dragging.current) cutAt(e); };
  const onUp = () => { dragging.current = false; };
  const onKey = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? -0.01 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? 0.01 : 0;
    if (d === 0) return;
    e.preventDefault();
    // Up raises the standard: a lower admit rate.
    const next = Math.max(0, Math.min(maxAdmitRate, admitRate + d));
    setAdmitRateChoice(next);
    setCut(null);
  };

  // The dots, where the stage puts them.
  const k = Math.round(admitRate * cloud.dots.length);
  const seated = Math.min(k, cloud.seatDots);
  const seats = useMemo(() => seatGrid(cloud.seatDots), [cloud.seatDots]);
  const r = cloud.dots.length > 220 ? 3.4 : 4.2;
  const showCloud = stage !== 'price';
  const dots = !showCloud ? [] : cloud.dots.map((d, i) => {
    const x0 = sx(d.sat), y0 = sy(d.gpa);
    const admitted = i < seated;
    let x = x0, y = y0, o = admitted ? 1 : 0.8;
    if (stage === 'rain') {
      // Best first from the top, as the pool comes in.
      const local = ease((t - (i / cloud.dots.length) * 0.6) / 0.4);
      y = PY - 24 + (y0 - (PY - 24)) * local;
      o = local;
    } else if (stage === 'flow') {
      if (admitted) {
        const p = seats[i];
        const local = ease((t - (i / Math.max(1, seated)) * 0.55) / 0.45);
        x = x0 + (p.x - x0) * local; y = y0 + (p.y - y0) * local;
      } else {
        const fade = clamp01(t * 1.8);
        y = y0 + fade * 18; o *= 1 - fade;
      }
    }
    return { key: i, x, y, o, admitted: admitted || stage === 'rain', color: COHORT_COLOR[cohorts[d.cohort]?.id ?? 'highAchievers'] };
  });

  // The class, read off the seated dots and the funnel.
  const classDots = cloud.dots.slice(0, seated);
  const medianSat = satOf(median(classDots.map((d) => d.sat)));
  const medianGpa = gpaOf(median(classDots.map((d) => d.gpa)));
  const enrolledByCohort = shownOutcome.enrolledCohorts;
  const line = lineAt(shownCut);
  const full = fullCut !== null ? lineAt(fullCut) : null;
  const ghostRate = s.students.lastFunnel ? payload.admitRate : null;
  const ghost = ghostRate !== null && showCloud ? lineAt(cutForRate(cloud, ghostRate)) : null;
  const minSat = satOf(shownCut), minGpa = gpaOf(shownCut);
  // The line held at the room's edge: said on its label, not twice.
  const atFull = fullCut !== null && shownCut <= fullCut + 0.005;

  return (
    <div className="admissions-page" role="dialog" aria-modal="true" aria-label="Admissions">
      <header className="admissions-page-head">
        <div>
          <p className="admissions-page-eyebrow">Summer · Year {s.clock.year}</p>
          <h2>Admissions</h2>
        </div>
        <ol className="admissions-page-steps" aria-label="Admissions">
          {['The price', 'The standard', 'The class'].map((label, i) => {
            const here = stage === 'price' ? 0 : stage === 'flow' ? 2 : 1;
            return <li key={label} className={i === here ? 'current' : i < here ? 'done' : ''}>{i + 1} · {label}</li>;
          })}
        </ol>
      </header>

      <div className="admissions-page-body">
        <section className="admissions-stage" aria-label="The applicants and the hall">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className={`admissions-svg${stage === 'cut' ? ' cutting' : ''}`}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <text x={PX} y={30} className="adm-title">The applicants</text>
            <text x={PX} y={50} className="adm-sub">
              {showCloud
                ? `${count(outcome.applicants)} applicants${cloud.per > 1 ? ` · each dot is ${count(cloud.per)}` : ''}`
                : 'Lock the price to see who applies'}
            </text>
            <text x={HALL.x} y={30} className="adm-title">The hall</text>
            <text x={HALL.x} y={50} className="adm-sub">Room for {count(ceiling.seatsLeft)} new students</text>

            {[400, 800, 1200, 1600].map((v) => {
              const x = sx((v - 400) / 1200);
              return (
                <g key={v}>
                  <line x1={x} y1={PY} x2={x} y2={PY + PH} className="adm-grid" />
                  <text x={x} y={PY + PH + 18} className="adm-tick" textAnchor="middle">{count(v)}</text>
                </g>
              );
            })}
            {[4, 3.5, 3, 2.5, 2].map((g) => {
              const y = sy((g - 2) / 2);
              return (
                <g key={g}>
                  <line x1={PX} y1={y} x2={PX + PW} y2={y} className="adm-grid" />
                  <text x={PX - 10} y={y + 4} className="adm-tick" textAnchor="end">{g.toFixed(1)}</text>
                </g>
              );
            })}
            <text x={PX + PW / 2} y={PY + PH + 40} className="adm-axis" textAnchor="middle">SAT</text>
            <text x={22} y={PY + PH / 2} className="adm-axis" textAnchor="middle" transform={`rotate(-90 22 ${PY + PH / 2})`}>GPA</text>
            <rect x={PX} y={PY} width={PW} height={PH} className="adm-frame" />

            {stage === 'cut' && <polygon points={zoneAt(shownCut)} className="adm-zone" />}
            {ghost && stage !== 'flow' && (
              <g className="adm-ghost">
                <line x1={ghost.x1} y1={ghost.y1} x2={ghost.x2} y2={ghost.y2} />
                <text x={ghost.x2 + 6} y={ghost.y2 - 6}>Last year</text>
              </g>
            )}
            {full && stage === 'cut' && !atFull && (
              <g className="adm-full">
                <line x1={full.x1} y1={full.y1} x2={full.x2} y2={full.y2} />
                <text x={full.mx + 14} y={full.my + 18}>The hall is full here</text>
              </g>
            )}

            {seats.map((p, i) => (
              <rect key={i} x={p.x - r * 1.3} y={p.y - r * 1.1} width={r * 2.6} height={r * 2.2} rx={r * 0.6} className="adm-seat" />
            ))}
            {seats.length === 0 && <text x={HALL.x} y={HALL.y + 20} className="adm-sub">No places left this year</text>}

            {dots.map((d) => (
              <circle
                key={d.key} cx={d.x} cy={d.y} r={r} opacity={d.o}
                className={d.admitted ? 'adm-dot in' : 'adm-dot out'}
                style={d.admitted ? { fill: d.color } : undefined}
              />
            ))}

            {stage === 'cut' && (
              <g>
                <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} className="adm-cut" />
                <g
                  className="adm-handle"
                  role="slider"
                  tabIndex={0}
                  aria-label="The admission line"
                  aria-valuemin={0}
                  aria-valuemax={Math.round(maxAdmitRate * 100)}
                  aria-valuenow={Math.round(admitRate * 100)}
                  aria-valuetext={`Admit ${pct(admitRate)}: SAT ${count(minSat)} and GPA ${minGpa.toFixed(1)} and up`}
                  onKeyDown={onKey}
                >
                  <circle cx={line.mx} cy={line.my} r={11} />
                </g>
                <g className="adm-handle-label" transform={`translate(${line.mx + 16} ${line.my - 34})`}>
                  <rect width={atFull ? 290 : 186} height={24} rx={6} />
                  <text x={10} y={16}>SAT {count(minSat)} · GPA {minGpa.toFixed(1)} and up{atFull ? ' · the hall is full' : ''}</text>
                </g>
              </g>
            )}

            {/* The class, under the hall, by cohort. */}
            {showCloud && cohorts.filter((c) => c.applicants > 0).map((c, i) => (
              <g key={c.id} transform={`translate(${HALL.x} ${HALL.y + HALL.h + 34 + i * 19})`} className="adm-legend">
                <circle cx={5} cy={-4} r={5} style={{ fill: COHORT_COLOR[c.id] }} />
                <title>{c.driverLabel}</title>
                <text x={16} y={0}>{c.label}</text>
                <text x={HALL.w} y={0} textAnchor="end" className="adm-legend-count">{count(enrolledByCohort[c.id] ?? 0)}</text>
              </g>
            ))}
            {stage === 'flow' && t >= 1 && (
              <text x={HALL.x + HALL.w / 2} y={HALL.y + HALL.h + 6} textAnchor="middle" className="adm-class">{count(shownOutcome.enrolled)} students</text>
            )}
          </svg>
        </section>

        <aside className="admissions-panel">
          <div className="admissions-card">
            <p className="admissions-card-eyebrow">1 · The price</p>
            <div className="admissions-price">
              <strong className={PRICE_TIER_COPY[tier].className}>{money(tuition)}/yr</strong>
            </div>
            <span className={`price-tier-tag ${PRICE_TIER_COPY[tier].className}`}>{PRICE_TIER_COPY[tier].label}{tier === 'fair' ? fairPosition(tolerance > 0 ? tuition / tolerance : 1) : ''}</span>
            {aidPerStudent(s) > 0 && <span className="stat">{money(netTuition(s, tuition))}/yr after aid</span>}
            {!tuitionLocked ? (
              <>
                <label className="admissions-field">
                  <span>Tuition per year. This class pays it for all four years.</span>
                  <input type="range" min={floor} max={TUITION_SLIDER_MAX} step={500} value={tuition} onChange={(e) => setTuition(Number(e.target.value))} />
                </label>
                <span className="price-tolerance" title={FIGURE_HINTS.priceTolerance}>Families expect about {money(Math.round(tolerance / 100) * 100)}</span>
                {floor > 0 && <span className="stat">The board won't let you lower tuition this year. You can still raise it.</span>}
                {poolRange && <span className="stat">The Admissions Office expects {count(poolRange.low)}–{count(poolRange.high)} applicants at this price.</span>}
                <button type="button" className="admissions-lock" onClick={lock}>Lock the price</button>
              </>
            ) : (
              <span className="stat">Locked. This class pays it for all four years.</span>
            )}
          </div>

          <div className={`admissions-card${showCloud ? '' : ' waiting'}`}>
            <p className="admissions-card-eyebrow">2 · The standard</p>
            <dl className="admissions-figures">
              <div><dt>Admit rate</dt><dd>{showCloud ? pct(admitRate) : '—'}</dd></div>
              <div><dt>Freshman class</dt><dd>{showCloud ? count(shownOutcome.enrolled) : '—'}</dd><dd className="sub">of {count(ceiling.seatsLeft)} places</dd></div>
              <div><dt>Median SAT · GPA</dt><dd>{showCloud && classDots.length > 0 ? `${count(medianSat)} · ${medianGpa.toFixed(1)}` : '—'}</dd></div>
              <div><dt title={FIGURE_HINTS.incomingQuality}>Incoming quality</dt><dd>{showCloud ? `${count(shownOutcome.avgIncomingQuality)}/100` : '—'}</dd></div>
            </dl>
            {showCloud && change && (
              <p className="stat admissions-change">
                {count(outcome.applicants)} applicants, <span className={change.change >= 0 ? 'good' : 'bad'}>{signedPct(change.change)}</span> from last summer
                {change.parts.length > 0 && <>: {change.parts.map((p, i) => <span key={p.key} className={p.change >= 0 ? 'good' : 'bad'}>{i > 0 ? ', ' : ''}{p.label}{takesColon(p.key) ? ':' : ''} {signedPct(p.change)}</span>)}</>}
              </p>
            )}
            {showCloud && <p className="stat">{admitRateOpening(!s.students.lastFunnel, payload.admitRate, s.students.capacity, consequence.totalEnrolled, maxAdmitRate)}</p>}
          </div>

          <div className={`admissions-card${showCloud ? '' : ' waiting'}`}>
            <p className="admissions-card-eyebrow">What this class does</p>
            <Effect
              label="Weekly net, once they enroll"
              value={showCloud ? `${money(consequence.weeklyNetNow)} → ${money(consequence.weeklyNet)} a week` : '—'}
              delta={showCloud ? signedMoney(netDelta) : ''}
              good={netDelta >= 0}
              bar={showCloud ? clamp01(0.5 + consequence.weeklyNet / Math.max(1, Math.abs(consequence.weeklyNetNow) * 4)) : 0}
              hint={FIGURE_HINTS.projectedNet}
            />
            <Effect
              label="Satisfaction, where it heads"
              value={showCloud ? (moodDelta === 0 ? 'Holds steady' : moodDelta > 0 ? 'Rises' : 'Falls') : '—'}
              delta={showCloud ? (moodDelta === 0 ? 'no change' : `${moodDelta > 0 ? '▲' : '▼'} ${Math.abs(moodDelta)} point${Math.abs(moodDelta) === 1 ? '' : 's'}`) : ''}
              good={moodDelta >= 0}
              bar={showCloud ? clamp01(satisfactionShown(consequence.satisfactionTarget) / 100) : 0}
              hint={FIGURE_HINTS.projectedSatisfaction}
            />
            <Effect
              label={`${NEED_LABEL[consequence.tightestNeed]}, the tightest need`}
              value={showCloud ? (consequence.tightestCoverage >= 1 ? 'Adequate' : `${pct(consequence.tightestCoverage)} covered`) : '—'}
              delta={showCloud && consequence.tightestCoverage < 1 ? `${pct(consequence.tightestCoverageNow)} → ${pct(consequence.tightestCoverage)}` : ''}
              good={consequence.tightestCoverage >= consequence.tightestCoverageNow}
              bar={showCloud ? clamp01(consequence.tightestCoverage) : 0}
              hint={FIGURE_HINTS.tightestNeed}
            />
            {showCloud && consequence.totalEnrolled > SCALE_FREE_BELOW && (() => {
              const cost = marginalStudentCost(s, 1_000, undefined, consequence.totalEnrolled) * WEEKS_PER_YEAR;
              return <p className={`stat next-thousand ${tuition >= cost ? '' : 'bad'}`} title={FIGURE_HINTS.nextThousand}>Each of the next thousand students pays {money(tuition)} and costs {money(cost)}.</p>;
            })()}
            {showCloud && consequence.notReturning > 0 && (
              <p className="stat" title={FIGURE_HINTS.notReturning}>{count(consequence.notReturning)} {consequence.notReturning === 1 ? 'student' : 'students'} won't come back.{consequence.attritionReasons.length > 0 ? ` They want more ${consequence.attritionReasons.join(' and ')}.` : ''}</p>
            )}
          </div>

          {stage === 'cut' && (
            <>
              <button type="button" className="admissions-send" onClick={send}>Send the offers</button>
              <span className="stat">Drag the line, or use the arrow keys on its handle.</span>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function Effect({ label, value, delta, good, bar, hint }: { label: string; value: string; delta: string; good: boolean; bar: number; hint: string }) {
  return (
    <div className="admissions-effect" title={hint}>
      <div className="admissions-effect-head">
        <span>{label}</span>
        {delta && <strong className={good ? 'good' : 'bad'}>{delta}</strong>}
      </div>
      <span className="admissions-effect-value">{value}</span>
      <span className="admissions-effect-bar" aria-hidden="true"><span className={good ? 'good' : 'bad'} style={{ width: `${Math.round(bar * 100)}%` }} /></span>
    </div>
  );
}
