import { useState } from 'react';
import type { Action } from '../state/actions';
import type { GameState, PendingInterrupt } from '../state/types';
import { projectAdmissions } from '../systems/admissions/admissionsSystem';
import type { ReportPayload } from '../systems/rivals/rivalsSystem';

// Placeholder modal content for interrupt types with no dedicated form (see
// AdmissionsInterruptForm below for 'admissions'). The 'debug-test' case is
// scaffolding — remove it once a real interrupt other than admissions
// exists (the U.S. News report, the tutorial) and needs the same treatment.
function interruptBody(interrupt: PendingInterrupt): { title: string; body: string } {
  switch (interrupt.type) {
    case 'debug-test':
      return {
        title: 'Debug: test interrupt',
        body: (interrupt.payload as { message?: string } | undefined)?.message ?? 'No payload.',
      };
    default:
      return { title: interrupt.type, body: 'No content registered for this interrupt type.' };
  }
}

interface AdmissionsDraft {
  tuition: number;
  financialAidRate: number;
}

// The once-a-year summer admissions decision (see README's "Admissions: an
// annual summer decision"). The player sets exactly two levers — tuition
// and average financial aid — and the distribution funnel resolves the rest
// (see admissionsSystem.ts), with current student satisfaction feeding the
// applicant pool as word of mouth. Selectivity and enrollment are NOT inputs:
// they are emergent outcomes, previewed live below so the player can see the
// consequences of the two settings before confirming. This is the only
// place tuition is ever set; there is no live, adjustable tuition control.
function AdmissionsInterruptForm({ payload, prestige, capacity, tuitionCeiling, satisfaction, onResolve }: {
  payload: AdmissionsDraft;
  prestige: number;
  capacity: number;
  tuitionCeiling: number;
  satisfaction: number;
  onResolve: (settings: AdmissionsDraft) => void;
}) {
  const [tuition, setTuition] = useState(payload.tuition);
  const [financialAidRate, setFinancialAidRate] = useState(payload.financialAidRate);

  // Live preview of the emergent outcomes, computed with the very function
  // the reducer commits with — so the numbers shown are the numbers applied.
  const outcome = projectAdmissions(prestige, tuition, financialAidRate, capacity, satisfaction);

  return (
    <>
      <h2>Summer Admissions</h2>
      <p>Set next year's tuition and financial aid. Selectivity and enrollment follow from your applicant pool — see the projected outcomes below before you confirm.</p>

      <label className="admissions-field">
        <span>Tuition <strong>${tuition.toLocaleString()}/yr</strong> (cap ${tuitionCeiling.toLocaleString()})</span>
        <input type="range" min={0} max={tuitionCeiling} step={500} value={tuition}
          onChange={(e) => setTuition(Number(e.target.value))} />
      </label>

      <label className="admissions-field">
        <span>Financial aid <strong>{Math.round(financialAidRate * 100)}%</strong> avg. discount</span>
        <input type="range" min={0} max={1} step={0.01} value={financialAidRate}
          onChange={(e) => setFinancialAidRate(Number(e.target.value))} />
      </label>

      <dl className="admissions-outcomes">
        <div><dt>Applicant pool</dt><dd>{outcome.applicants.toLocaleString()}</dd></div>
        <div><dt>Word of mouth <span className="outcome-note">(satisfaction {Math.round(satisfaction)})</span></dt><dd>{outcome.wordOfMouthMultiplier >= 1 ? '+' : ''}{Math.round((outcome.wordOfMouthMultiplier - 1) * 100)}% applicants</dd></div>
        <div><dt>Admit rate <span className="outcome-note">(selectivity)</span></dt><dd>{Math.round(outcome.admitRate * 100)}%</dd></div>
        <div><dt>Yield</dt><dd>{Math.round(outcome.yieldRate * 100)}%</dd></div>
        <div><dt>Enrolled class</dt><dd>{outcome.enrolled.toLocaleString()} / {capacity.toLocaleString()}</dd></div>
        <div><dt>Incoming quality <span className="outcome-note">(feeds prestige)</span></dt><dd>{Math.round(outcome.avgIncomingQuality)} / 100</dd></div>
        <div><dt>Net tuition / student</dt><dd>${outcome.netTuitionPerStudent.toLocaleString()}/yr</dd></div>
      </dl>

      <button onClick={() => onResolve({ tuition, financialAidRate })}>
        Confirm Policy
      </button>
    </>
  );
}


// A single place-movement badge: a climb, a slide, or a year holding
// still. Rank numbers run the wrong way round (smaller is better), so
// `delta` is pre-normalized by the report builder to "places gained".
function RankMovement({ delta }: { delta: number }) {
  if (delta === 0) return <span className="rank-move flat">— held</span>;
  return (
    <span className={`rank-move ${delta > 0 ? 'up' : 'down'}`}>
      {delta > 0 ? '▲' : '▼'}{Math.abs(delta)}
    </span>
  );
}

// Renders both rankings-related interrupts: the one-time "you've entered
// the top 50" reveal and the recurring annual report (see README's
// "Rankings: the U.S. News report"). Standing is otherwise never shown
// outside the persistent header's rank stat and this modal.
//
// The standings list alone is a table of names; what makes a ranking
// FELT is motion — where you moved, who you passed, who is surging up
// behind you. All of that is computed by buildReportPayload (see
// rivalsSystem.ts) from data the game already had: the rivals' momentum
// and the history record's prior-year rank. This view just renders it,
// and renders the movement section only when there is a prior year to
// compare against (never on the first reveal, and never in the first two
// years of a run).
function RankingsReportView({ payload, isFirstReveal, onDismiss }: {
  payload: ReportPayload;
  isFirstReveal: boolean;
  onDismiss: () => void;
}) {
  const { rank, previousRank, movers, passed, passedBy, standings } = payload;
  const delta = previousRank === null ? null : previousRank - rank;

  return (
    <>
      <h2>{isFirstReveal ? "You've Entered the Rankings" : 'Annual U.S. News Report'}</h2>
      <p>
        {isFirstReveal
          ? `Your university has cracked the top 50, landing at #${rank}. The annual report will keep you posted from here on.`
          : `This year's standings are in — you're ranked #${rank}.`}
      </p>

      {delta !== null && (
        <p className="report-headline">
          <RankMovement delta={delta} />
          <span className="report-headline-detail">
            {delta === 0
              ? `steady at #${rank} for a second year`
              : `#${previousRank} → #${rank} year over year`}
          </span>
        </p>
      )}

      {passed.length > 0 && (
        <p className="report-crossing passed">
          Passed: {passed.join(', ')}.
        </p>
      )}
      {passedBy.length > 0 && (
        <p className="report-crossing passed-by">
          Overtaken by: {passedBy.join(', ')}.
        </p>
      )}

      {movers.length > 0 && (
        <div className="report-movers">
          <h3>Big movers</h3>
          <ul>
            {movers.map((m) => (
              <li key={m.name}>
                <span>{m.name}</span>
                <span className="report-mover-move">
                  <RankMovement delta={m.delta} />
                  <span className="report-mover-places">#{m.from} → #{m.to}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="report-standings-head">Top {standings.length}</h3>
      <ol className="report-standings">
        {standings.map((r, i) => (
          <li key={r.name} className={r.isPlayer ? 'me' : ''}>
            <span>{i + 1}. {r.name}</span>
            <span className="stat">{Math.round(r.reputation)}</span>
          </li>
        ))}
      </ol>
      <button onClick={onDismiss}>Dismiss</button>
    </>
  );
}

// The generic pause-the-clock decision-event system (see README's
// "Interrupts"): renders whichever modal s.pendingInterrupt calls for, on
// top of every tab. Nothing to render when no interrupt is pending.
export default function InterruptModal({ s, act }: { s: GameState; act: (a: Action) => void }) {
  if (!s.pendingInterrupt) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        {s.pendingInterrupt.type === 'admissions' ? (
          <AdmissionsInterruptForm
            payload={s.pendingInterrupt.payload as AdmissionsDraft}
            prestige={s.self.reputation}
            capacity={s.students.capacity}
            tuitionCeiling={s.finance.tuitionCeiling}
            satisfaction={s.students.satisfaction}
            onResolve={(settings) => act({ type: 'RESOLVE_ADMISSIONS', ...settings })}
          />
        ) : s.pendingInterrupt.type === 'rankings-entry' || s.pendingInterrupt.type === 'annual-report' ? (
          <RankingsReportView
            payload={s.pendingInterrupt.payload as ReportPayload}
            isFirstReveal={s.pendingInterrupt.type === 'rankings-entry'}
            onDismiss={() => act({ type: 'RESOLVE_REPORT' })}
          />
        ) : (
          <>
            <h2>{interruptBody(s.pendingInterrupt).title}</h2>
            <p>{interruptBody(s.pendingInterrupt).body}</p>
            <button onClick={() => act({ type: 'RESOLVE_INTERRUPT' })}>Resolve</button>
          </>
        )}
      </div>
    </div>
  );
}
