import { useState } from 'react';
import type { Action } from '../state/actions';
import type { GameState, InitiativeReport, PendingInterrupt } from '../state/types';
import { institutionName, WEEKS_PER_YEAR } from '../state/types';
import { ACCLAIM_RESEARCH_BONUS, initiativeDepth } from '../data/researchData';
import { ACCLAIM_SALARY_PREMIUM } from '../data/facultyData';
import { projectAdmissions, priceTolerance, priceTier, trailingYearSatisfaction, admitRate, type PriceTier } from '../systems/admissions/admissionsSystem';
import { deriveCohortSignals, cohortBreakdown, type CohortSignals } from '../systems/admissions/cohorts';
import { projectConsequences } from '../systems/admissions/consequences';
import { computePrestigeTarget, prestigeTargetWithout } from '../systems/prestige/prestigeSystem';
import { findDecisionEvent } from '../data/eventData';
import { DEMAND_DEADLINE_WEEKS, demandCopy } from '../data/demandData';
import { demandProgress, demandStakes } from '../systems/demands/demandSystem';
import type { DecisionEventContext, MilestonePayload } from '../data/eventData';
import type { OrgPetition } from '../state/types';
import type { ReportPayload } from '../systems/rivals/rivalsSystem';
import AnimatedNumber from './AnimatedNumber';
import { isActivationTarget, useHotkeys } from './hotkeys';

// Placeholder modal content for an interrupt type with no dedicated view
// (see AdmissionsInterruptForm below for 'admissions', and every other
// named branch in the component below it). Only reachable if a system ever
// sets pendingInterrupt to a type nothing here recognises — content drift
// between an authored table and this switch, never a path the game takes
// on its own.
function interruptBody(interrupt: PendingInterrupt): { title: string; body: string } {
  return { title: interrupt.type, body: 'No content registered for this interrupt type.' };
}

interface AdmissionsDraft {
  tuition: number;
  admitRate: number;
}

function money(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
}

const NEED_LABEL: Record<'housing' | 'basicNeeds', string> = {
  housing: 'Beds',
  basicNeeds: 'Dining & health',
};

// The capacity row's value. Coverage is served-over-needed clamped to 1,
// so a school with room to spare reads a flat 100% however many students
// it takes — which is a fact, not a decision. So a covered school gets the
// word "adequate" and no delta, and the percentage only appears once the
// class would actually leave the campus short.
function CoverageValue({ now, next }: { now: number; next: number }) {
  if (next >= 1) return <span className="coverage-adequate">adequate</span>;
  const delta = Math.round(next * 100) - Math.round(now * 100);
  return (
    <>
      <AnimatedNumber value={next * 100} format={(n) => `${Math.round(n)}% covered`} />
      {delta !== 0 && (
        <span className={`consequence-delta ${delta > 0 ? 'good' : 'bad'}`}>
          {delta > 0 ? '+' : '−'}{Math.abs(delta)}
        </span>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
// THE STUDENT-LIFE DIGEST (see data/studentLifeData.ts). Clubs and new
// Greek chapters form quietly during the year and queue as petitions;
// this is where a whole year's worth is answered, as a SECTION of the
// summer admissions interrupt rather than a modal of its own. That is the
// point of the shape: student life is the lightest beat in the game and
// must not stop the clock, and the summer decision is a stop the player is
// already making.
//
// Every petition defaults to approved — recognising a society is the
// ordinary answer, and a player who confirms without reading has done the
// harmless thing rather than taken a satisfaction hit they never chose.
// Anything unticked is declined when the interrupt resolves; the queue
// drains either way, so the digest can never grow across years.
// ---------------------------------------------------------------------
function StudentLifeDigest({ petitions, approved, onToggle }: {
  petitions: OrgPetition[];
  approved: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (petitions.length === 0) return null;
  const clubs = petitions.filter((p) => p.kind === 'club').length;

  return (
    <div className="digest">
      <h3 className="digest-head">
        {petitions.length === 1
          ? 'One new student organisation this year'
          : `${petitions.length} new student organisations this year`}
      </h3>
      <p className="digest-note">
        {clubs === petitions.length
          ? 'Recognise a society and it costs a little every week and adds a little to student satisfaction, for as long as it exists. Decline and the students notice.'
          : 'Chapters carry more of both than clubs do — more cost, and considerably more student life.'}
      </p>
      {petitions.map((p) => (
        <label key={p.id} className={`digest-row ${approved.has(p.id) ? 'approved' : 'declined'}`}>
          <input type="checkbox" checked={approved.has(p.id)} onChange={() => onToggle(p.id)} />
          <span className="digest-row-name">
            {p.name}
            <span className="digest-row-kind">
              {p.kind === 'club' ? 'club' : p.greekKind}
            </span>
          </span>
          <span className="digest-row-cost">
            {p.foundingMembers} founding members · {money(p.upkeepPerWeek)}/wk
          </span>
        </label>
      ))}
    </div>
  );
}

// Label/tone for each PriceTier (see admissionsSystem.ts) — one place
// mapping the model's four bands to what a player actually reads, reused
// for both the raw sticker (step 1) and the resulting net price (step 2)
// so the same visual language covers both.
const PRICE_TIER_COPY: Record<PriceTier, { label: string; className: string }> = {
  bargain: { label: 'a bargain for your prestige', className: 'price-tier-bargain' },
  fair: { label: 'in line with your prestige', className: 'price-tier-fair' },
  expensive: { label: 'pricier than your prestige supports', className: 'price-tier-expensive' },
  reckless: { label: 'far beyond your prestige — sticker shock will bite', className: 'price-tier-reckless' },
};

function PriceTierTag({ tier }: { tier: PriceTier }) {
  const copy = PRICE_TIER_COPY[tier];
  return <span className={`price-tier-tag ${copy.className}`}>{copy.label}</span>;
}

// One cohort's row in the breakdown below — a head count, because the
// question a player is actually asking here is how many people a lab or a
// varsity program brings in, and a multiplier makes them do that
// arithmetic themselves against a pool printed six lines above. The seven
// rows sum to the applicant pool (see cohorts.ts's apportion).
//
// The count still carries the tone: whether this cohort is above or below
// neutral is what says which of the player's choices is working, and it
// is drawn in the same bright good/bad pair the log ticker uses on this
// same dark modal background, so "this audience is up" reads the same way
// everywhere.
function CohortRow({ label, driverLabel, pull, applicants }: { label: string; driverLabel: string; pull: number; applicants: number }) {
  const toneClass = pull > 1 ? 'cohort-up' : pull < 1 ? 'cohort-down' : 'cohort-flat';
  return (
    <div className="cohort-row">
      <span className="cohort-row-label">
        {label}
        <span className="outcome-note">({driverLabel})</span>
      </span>
      <span className={`cohort-row-count ${toneClass}`}>{applicants.toLocaleString()}</span>
    </div>
  );
}

// The once-a-year summer admissions decision (see README's "Admissions: an
// annual summer decision"). The player sets exactly one lever — tuition —
// and the distribution funnel resolves the rest (see admissionsSystem.ts),
// with current student satisfaction and cohort demand (see cohorts.ts)
// feeding the applicant pool alongside prestige and price. Selectivity and
// enrollment are NOT inputs: they are emergent outcomes, previewed live
// below so the player can see the consequences before confirming. This is
// the only place tuition is ever set; there is no live, adjustable tuition
// control.
//
// ONE step, not two. The form used to stage tuition and scholarships
// apart, holding the downstream numbers behind a "Continue" so each
// lever's consequence read on its own beat. With scholarships retired
// (Plan 05's PR B) there is one lever, and gating one slider behind a
// button that reveals the rest of its own consequences is ceremony. The
// staging returns in PR E for a different reason — the tuition decision
// becomes blind and LOCKS, so the reveal has something to reveal.
function AdmissionsInterruptForm({ payload, s, prestige, capacity, tuitionCeiling, satisfaction, cohortSignals, petitions, onResolve }: {
  payload: AdmissionsDraft;
  // The whole state, for the consequence projection alone (see
  // consequences.ts): it advances a COPY of the classes and reads the real
  // finance and satisfaction functions over it. The individual props above
  // are kept as they are — this form reads them far more often than it
  // reads `s`, and threading nine fields through one object would make the
  // cheap reads look as expensive as the projection.
  s: GameState;
  prestige: number;
  capacity: number;
  tuitionCeiling: number;
  satisfaction: number;
  cohortSignals: CohortSignals;
  petitions: OrgPetition[];
  onResolve: (settings: AdmissionsDraft & { approvedPetitionIds: string[] }) => void;
}) {
  const [tuition, setTuition] = useState(payload.tuition);
  const [admitRateChoice, setAdmitRateChoice] = useState(payload.admitRate);
  // Beat 1 ends when the player commits the price. There is no way back:
  // the pool is revealed next, and a slider you can return to after seeing
  // what it bought is not a gamble, it is a lookup table.
  const [tuitionLocked, setTuitionLocked] = useState(false);
  // Approved by default — see the note on StudentLifeDigest above.
  const [approved, setApproved] = useState<Set<string>>(() => new Set(petitions.map((p) => p.id)));

  // Live preview of the emergent outcomes, computed with the very function
  // the reducer commits with — so the numbers shown are the numbers applied.
  const outcome = projectAdmissions(prestige, tuition, capacity, satisfaction, cohortSignals, admitRateChoice);
  // What a school of this standing would normally take — the slider's own
  // opening position on a fresh save, shown as a reference point so a
  // player moving away from it knows they are moving away from something.
  const usualAdmitRate = admitRate(prestige);
  // What committing THIS pair of decisions would do to the school: the
  // money and the mood, at the body it would actually produce — the three
  // classes still enrolled plus the incoming one. Same advance the reducer
  // commits with, same readings the Treasury and Student Life show.
  const consequence = projectConsequences(s, outcome.enrolled, tuition);
  const netDelta = consequence.weeklyNet - consequence.weeklyNetNow;
  const moodDelta = consequence.satisfactionTarget - consequence.satisfactionTargetNow;
  // What this school's prestige lets it charge before demand starts
  // falling away (see admissionsSystem.ts's price tolerance). Shown
  // because it is the single most consequential curve behind this
  // decision: without it, a player pricing above their standing just
  // watches the applicant pool shrink with no idea why.
  const tolerance = priceTolerance(prestige);
  const priceTierNow = priceTier(tuition, tolerance);
  const cohorts = cohortBreakdown(cohortSignals, tolerance, tuition, outcome.applicants);

  return (
    <>
      <h2>Summer Admissions</h2>
      <p>Set next year's tuition and how much of the applicant pool to take. Admitting deeper means a bigger class drawn further down the quality distribution — see the projected outcomes below before you confirm.</p>

      {/* BEAT 1 — the price, set blind. The only feedback is the tier: are
          you in line with your own standing, or not. No applicant count, no
          sticker-shock line, no cap printed — the cap is simply where the
          slider ends (see schoolTypeData.ts). */}
      <label className="admissions-field">
        <span>
          Tuition <strong className={`price-tier-value ${PRICE_TIER_COPY[priceTierNow].className}`}>${tuition.toLocaleString()}/yr</strong>
        </span>
        <input type="range" min={0} max={tuitionCeiling} step={500} value={tuition}
          disabled={tuitionLocked}
          onChange={(e) => setTuition(Number(e.target.value))} />
        <PriceTierTag tier={priceTierNow} />
      </label>

      {!tuitionLocked && (
        <button type="button" className="admissions-lock" onClick={() => setTuitionLocked(true)}>
          Set tuition for the year →
        </button>
      )}

      {tuitionLocked && (
        <>
          {/* BEAT 2 — the reveal. What that price actually drew. */}
          <dl className="admissions-outcomes">
            <div><dt>Applicant pool</dt><dd><AnimatedNumber value={outcome.applicants} /></dd></div>
            <div><dt>Word of mouth <span className="outcome-note">(avg satisfaction last year {Math.round(satisfaction)})</span></dt><dd>{outcome.wordOfMouthMultiplier >= 1 ? '+' : ''}{Math.round((outcome.wordOfMouthMultiplier - 1) * 100)}% applicants</dd></div>
          </dl>

          <div className="cohort-breakdown">
            <h3>Who this pulls in <span className="outcome-note">(applicants, summing to the pool above)</span></h3>
            {cohorts.map((c) => <CohortRow key={c.id} label={c.label} driverLabel={c.driverLabel} pull={c.pull} applicants={c.applicants} />)}
          </div>

          {/* BEAT 3 — the second decision, and the opposite posture: every
              consequence visible before it is taken. */}
          <label className="admissions-field">
            <span>
              Admit rate <strong>{Math.round(admitRateChoice * 100)}%</strong> of applicants
              <span className="outcome-note">
                {' '}(a school of your standing usually takes {Math.round(usualAdmitRate * 100)}%)
              </span>
            </span>
            <input type="range" min={0.01} max={1} step={0.01} value={admitRateChoice}
              onChange={(e) => setAdmitRateChoice(Number(e.target.value))} />
          </label>

          <dl className="admissions-outcomes">
            <div><dt>Freshman class</dt><dd><AnimatedNumber value={outcome.enrolled} /></dd></div>
            <div><dt>Incoming quality <span className="outcome-note">(feeds prestige)</span></dt><dd><AnimatedNumber value={outcome.avgIncomingQuality} format={(n) => `${Math.round(n)} / 100`} /></dd></div>
          </dl>

          {/* What committing does to the school, not just to the intake — the
              decision's consequences, before it is taken (Plan 05's PR D).
              Projected against the body this commit produces, which includes
              the three older classes who are still here and still paying the
              price they were admitted under. */}
          <div className="consequence-panel">
            <h3>If you commit <span className="outcome-note">({consequence.totalEnrolled.toLocaleString()} students next year, {consequence.graduating.toLocaleString()} graduating)</span></h3>
            <dl className="admissions-outcomes">
              <div>
                <dt>Weekly net <span className="outcome-note">(now {money(consequence.weeklyNetNow)}/wk)</span></dt>
                <dd>
                  <AnimatedNumber value={consequence.weeklyNet} format={(n) => `${money(n)}/wk`} />
                  <span className={`consequence-delta ${netDelta >= 0 ? 'good' : 'bad'}`}>
                    {netDelta >= 0 ? '+' : '−'}{money(Math.abs(netDelta))}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Satisfaction <span className="outcome-note">(heading toward, at current capacity — now {Math.round(consequence.satisfactionTargetNow)})</span></dt>
                <dd>
                  <AnimatedNumber value={consequence.satisfactionTarget} format={(n) => `${Math.round(n)}`} />
                  <span className={`consequence-delta ${moodDelta >= 0 ? 'good' : 'bad'}`}>
                    {moodDelta >= 0 ? '+' : '−'}{Math.abs(moodDelta).toFixed(1)}
                  </span>
                </dd>
              </div>
              <div>
                <dt>
                  {NEED_LABEL[consequence.tightestNeed]}
                  <span className="outcome-note"> (the need this class stretches furthest)</span>
                </dt>
                <dd><CoverageValue now={consequence.tightestCoverageNow} next={consequence.tightestCoverage} /></dd>
              </div>
            </dl>
          </div>

          <StudentLifeDigest
            petitions={petitions}
            approved={approved}
            onToggle={(id) => setApproved((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id); else next.add(id);
              return next;
            })}
          />

          <button onClick={() => onResolve({ tuition, admitRate: admitRateChoice, approvedPetitionIds: [...approved] })}>
            Confirm Policy
          </button>
        </>
      )}
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


// ---------------------------------------------------------------------
// The milestone celebration: the stop-the-clock moment for the handful of
// accomplishments worth stopping the clock for (see data/eventData.ts's
// MILESTONE_INTERRUPT_KINDS — an established program, a distinguished
// program, a distinguished school; never a routine course completion). It grants nothing
// and asks nothing: everything it reports already happened. What it adds
// is the one thing the log ticker cannot — the size of what just changed,
// in the currency the whole long arc is denominated in.
//
// The prestige figures are computed here, live, with the very functions
// prestigeSystem.ts drifts reputation by: the target as it stands now,
// against what it would be if these milestones had never been awarded.
// So "+5.4 to the prestige target" is a real reading of the model, not a
// number authored into a congratulation message.
// ---------------------------------------------------------------------
function MilestoneCelebrationView({ s, payload, onDismiss }: {
  s: GameState;
  payload: MilestonePayload;
  onDismiss: () => void;
}) {
  const target = computePrestigeTarget(s);
  const withoutThese = prestigeTargetWithout(s, payload.keys);
  const delta = target - withoutThese;
  const single = payload.entries.length === 1 ? payload.entries[0] : null;

  return (
    <>
      <h2>{single ? single.headline : `${payload.entries.length} milestones reached`}</h2>
      {single ? (
        <p>{single.detail}</p>
      ) : (
        <p>The catalogue has crossed several milestones at once.</p>
      )}

      {payload.entries.map((e) => (
        <div key={e.key} className="milestone-entry">
          {!single && <h3>{e.headline}</h3>}
          {!single && <p className="milestone-detail">{e.detail}</p>}
          {e.unlocks.length > 0 && (
            <>
              <h3 className="milestone-unlocks-head">Now open</h3>
              <ul className="milestone-unlocks">
                {e.unlocks.map((name) => <li key={name}>{name}</li>)}
              </ul>
            </>
          )}
        </div>
      ))}

      <dl className="admissions-outcomes">
        <div>
          <dt>Prestige target <span className="outcome-note">(what this changed)</span></dt>
          <dd>{withoutThese.toFixed(1)} → {target.toFixed(1)}</dd>
        </div>
        <div>
          <dt>Contribution</dt>
          <dd className={delta > 0 ? 'milestone-gain' : ''}>{delta > 0 ? '+' : ''}{delta.toFixed(1)}</dd>
        </div>
        <div>
          <dt>Prestige today <span className="outcome-note">(drifts toward the target each summer)</span></dt>
          <dd>{s.self.reputation.toFixed(1)}</dd>
        </div>
      </dl>

      <button onClick={onDismiss}>Continue</button>
    </>
  );
}

// ---------------------------------------------------------------------
// A RESEARCH PROJECT HAS CONCLUDED (see systems/research/researchSystem.ts).
//
// THE COMPLETION IS THE EVENT. This used to be a prize celebration, which
// meant the modal that stopped the clock was the one for the trophy while
// the work itself — three or five years of a team not teaching — passed as
// a single line in the log. The playtest asked for the inverse and is
// right: the report is what the player wants at the end of a long
// commitment, and the award is one of its results rather than a separate
// occasion.
//
// It grants nothing and asks nothing. Everything here already happened as
// it landed: publications and breakthroughs counted into the prestige
// target, grant money into cash the week it arrived, and — if the work won
// an award — the winner's permanent acclaim, with the higher salary and
// research output acclaim buys. This is the same contract the milestone
// celebration follows.
//
// Everything displayed comes from the PAYLOAD rather than from live state,
// so the report still says something true if a professor on it has since
// been dismissed, or the facility has been renamed, in the weeks between
// the project ending and the quiet week this finally fired on.
// ---------------------------------------------------------------------
function ResearchReportView({ s, report, onDismiss }: {
  s: GameState;
  report: InitiativeReport;
  onDismiss: () => void;
}) {
  const depth = initiativeDepth(report.depth);
  const nothingToShow = report.publications === 0 && report.breakthroughs === 0 && report.grantIncome === 0;

  return (
    <>
      <h2>{report.award ? `${report.topicName} concludes — and wins ${report.award.prizeName}` : `${report.topicName} concludes`}</h2>
      <p>
        {depth.name} · {report.labName} · {report.years} {report.years === 1 ? 'year' : 'years'} ·{' '}
        {report.facultyNames.join(', ')}
      </p>

      {report.award && (
        <p>
          {report.award.facultyName} joins the very short list of {report.award.field} researchers to have
          received it, and {institutionName(s.self)} is named alongside them everywhere the citation is printed.
        </p>
      )}

      <dl className="admissions-outcomes">
        <div>
          <dt>Published <span className="outcome-note">(papers, monographs, works)</span></dt>
          <dd>{report.publications}</dd>
        </div>
        <div>
          <dt>Breakthroughs <span className="outcome-note">(feeds the prestige target)</span></dt>
          <dd>{report.breakthroughs}</dd>
        </div>
        <div>
          <dt>Grant income <span className="outcome-note">(already banked)</span></dt>
          <dd>${report.grantIncome.toLocaleString()}</dd>
        </div>
        {report.award && (
          <>
            <div>
              <dt>{report.award.facultyName}&rsquo;s output <span className="outcome-note">(permanent, per prize)</span></dt>
              <dd>+{Math.round(ACCLAIM_RESEARCH_BONUS * 100)}%</dd>
            </div>
            <div>
              <dt>Their salary <span className="outcome-note">(permanent, per prize)</span></dt>
              <dd>+{Math.round(ACCLAIM_SALARY_PREMIUM * 100)}%</dd>
            </div>
            <div>
              <dt>Prizes to date <span className="outcome-note">(feeds the prestige target)</span></dt>
              <dd>{s.research.prizes}</dd>
            </div>
          </>
        )}
      </dl>

      {nothingToShow && (
        <p className="empty-note">
          The work produced nothing publishable. The team returns to teaching, and the facility is free for
          whatever comes next.
        </p>
      )}

      <button onClick={onDismiss}>Continue</button>
    </>
  );
}

// ---------------------------------------------------------------------
// A STUDENT DEMAND (see systems/demands/demandSystem.ts). The one
// stop-the-clock moment student life gets on its own — raised only when
// satisfaction has sat below DEMAND_SATISFACTION_THRESHOLD, so a
// well-run school never sees it at all.
//
// It asks for nothing and offers nothing to choose: the only answer is to
// BUILD the thing before the deadline, and the demand system detects that
// off the campus itself. So this is an acknowledgement, dismissable in one
// click, exactly as the fairness rule requires — what it must do in that
// one click is be honest about the stakes.
//
// And those stakes are READ, not written. The satisfaction figures are the
// nudges the system would actually apply; the applicant figures come from
// running the shipped admissions funnel (projectAdmissions — the same pure
// function the summer modal previews with) at today's policy against each
// of them, so "failing this costs you N applicants" is word of mouth
// measured, not a threat someone typed. Note what that honesty buys at the
// bottom end: at a school already floored on satisfaction the two numbers
// are close together, which is the satisfaction floor
// (ATTRIBUTE_SCORE_FLOOR) visible in the modal — failing a demand you
// cannot afford to meet is survivable, and the modal says so in figures.
// ---------------------------------------------------------------------
function DemandView({ s, onDismiss }: { s: GameState; onDismiss: () => void }) {
  const demand = s.events.activeDemand;
  // A save written mid-modal against content that has since changed, or an
  // interrupt left behind by an edit: clear it rather than wedging the clock.
  if (!demand) {
    return (
      <>
        <h2>The moment has passed</h2>
        <p>There is no outstanding demand. Nothing has changed.</p>
        <button onClick={onDismiss}>Continue</button>
      </>
    );
  }

  const copy = demandCopy(demand);
  const progress = demandProgress(s, demand);
  const stakes = demandStakes(s);
  const node = s.tech.find((t) => t.id === demand.askId);
  const cost = node ? money(node.cost) : null;

  return (
    <>
      <h2>{copy.headline}</h2>
      <p>{copy.grievance(demand.askName)}</p>

      <dl className="admissions-outcomes">
        <div>
          <dt>The ask</dt>
          <dd>{copy.ask(demand.askName)}</dd>
        </div>
        <div>
          <dt>The deadline</dt>
          <dd>{DEMAND_DEADLINE_WEEKS} weeks &mdash; by year {Math.floor((demand.deadlineWeek - 1) / WEEKS_PER_YEAR) + 1}</dd>
        </div>
        <div>
          <dt>Where you stand <span className="outcome-note">({copy.unit})</span></dt>
          <dd>{Math.round(progress.current).toLocaleString()} / {Math.round(progress.target).toLocaleString()}</dd>
        </div>
        {cost && (
          <div>
            <dt>What it costs to build <span className="outcome-note">(nothing is charged now)</span></dt>
            <dd>{cost}</dd>
          </div>
        )}
        <div>
          <dt>If it is met <span className="outcome-note">(satisfaction, then applicants)</span></dt>
          <dd className="milestone-gain">
            {stakes.satisfactionIfMet.toFixed(1)} &middot; {stakes.applicantsIfMet.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt>If the deadline passes <span className="outcome-note">(word of mouth, at next summer&rsquo;s funnel)</span></dt>
          <dd>{stakes.satisfactionIfFailed.toFixed(1)} &middot; {stakes.applicantsIfFailed.toLocaleString()}</dd>
        </div>
        <div>
          <dt>As things stand today</dt>
          <dd>{stakes.satisfactionNow.toFixed(1)} &middot; {stakes.applicantsNow.toLocaleString()}</dd>
        </div>
      </dl>

      <p className="digest-note">
        There is nothing to answer here and nothing to pay: the demand is met by building what
        it asks for, and missing the deadline costs the school goodwill and next year&rsquo;s
        applicants &mdash; nothing more. It stays visible in the Student Life tab until it resolves.
      </p>

      <button onClick={onDismiss}>Understood</button>
    </>
  );
}

// ---------------------------------------------------------------------
// The College -> University charter: a one-time question, asked the first
// quiet week after any laboratory finishes (see
// systems/events/eventSystem.ts). Cosmetic in full — what changes is the
// fixed half of the school's name and nothing else. It is asked rather
// than applied because a school that wants to stay a college is a real
// thing a player might want, and because the moment is worth marking.
// Either answer closes the question for good.
// ---------------------------------------------------------------------
function CharterOfferView({ s, onResolve }: { s: GameState; onResolve: (accept: boolean) => void }) {
  return (
    <>
      <h2>A university charter</h2>
      <p>
        With laboratory research now under way on campus, the trustees have petitioned for a
        university charter. Granting it changes what the school is called and nothing else —
        no cost, no obligation, and no effect on anything you have built.
      </p>
      <div className="event-choices">
        <button className="event-choice" onClick={() => onResolve(true)}>
          <span className="event-choice-label">
            Accept the charter
            <span className="event-choice-cost">no cost</span>
          </span>
          <span className="event-choice-detail">
            {s.self.name} College becomes {s.self.name} University.
          </span>
        </button>
        <button className="event-choice" onClick={() => onResolve(false)}>
          <span className="event-choice-label">
            Remain a college
            <span className="event-choice-cost">no cost</span>
          </span>
          <span className="event-choice-detail">
            The school keeps the name {s.self.name} College. You will not be asked again.
          </span>
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------
// An authored decision event (see data/eventData.ts). The modal renders
// the definition looked up by id from the data table, and the reducer
// applies the choice by looking up the same definition the same way — so
// there is one authored description of what a choice does, shown and
// applied, never two that can disagree.
//
// A choice the school cannot pay for is shown DISABLED rather than
// hidden: seeing the option you can't afford is the point of a money
// bottleneck. Every event is guaranteed to carry at least one option that
// costs nothing (eventSystem.ts refuses to fire one that doesn't), so
// there is always a way out of the modal.
// ---------------------------------------------------------------------
function DecisionEventView({ s, eventId, ctx, onResolve, onDismiss }: {
  s: GameState;
  eventId: string;
  ctx: DecisionEventContext;
  onResolve: (choiceId: string) => void;
  onDismiss: () => void;
}) {
  const event = findDecisionEvent(eventId);
  // A save written before an event was renamed or removed from the table
  // would otherwise strand the clock behind an unrenderable modal.
  if (!event) {
    return (
      <>
        <h2>An event has passed</h2>
        <p>This event is no longer in the game's content. Nothing has changed.</p>
        <button onClick={onDismiss}>Continue</button>
      </>
    );
  }

  return (
    <>
      <h2>{event.title}</h2>
      <p>{event.prompt(s, ctx)}</p>
      <div className="event-choices">
        {event.choices.map((choice) => {
          const cost = choice.cost(s, ctx);
          // A free choice must stay pickable even with cash already
          // negative — `cost <= s.finance.cash` alone would disable every
          // choice, including the guaranteed no-cost one, and strand the
          // player behind the modal with no way out.
          const affordable = cost === 0 || cost <= s.finance.cash;
          return (
            <button
              key={choice.id}
              className="event-choice"
              disabled={!affordable}
              onClick={() => onResolve(choice.id)}
            >
              <span className="event-choice-label">
                {choice.label}
                <span className="event-choice-cost">
                  {cost > 0 ? `-$${cost.toLocaleString()}` : 'no cost'}
                </span>
              </span>
              <span className="event-choice-detail">
                {choice.describe(s, ctx)}
                {!affordable && ' — the school cannot cover this.'}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// The generic pause-the-clock decision-event system (see README's
// "Interrupts"): renders whichever modal s.pendingInterrupt calls for, on
// top of every tab. Nothing to render when no interrupt is pending.
export default function InterruptModal({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const interrupt = s.pendingInterrupt;

  // The two payloads that carry structured content are read once here,
  // narrowed by the type tag, so the branches below stay free of casts.
  const decision = interrupt?.type === 'decision-event'
    ? interrupt.payload as { eventId: string; ctx: DecisionEventContext }
    : null;

  // Enter dismisses whichever modal is open, for every interrupt type that
  // has a plain "continue" to press — the report, a milestone, a research
  // prize, a student demand, and an authored decision event (Enter there
  // means CONTINUE: resolve with no choice picked, the same escape hatch the
  // dismiss button below uses for a content-table miss, never one specific
  // paid choice, so there is never an affordability check to get wrong).
  // These are the interrupts a long run throws most often and that the
  // player reads and waves through, so making them answer the key the
  // keyboard already puts under that hand is most of what stops a
  // fast-forwarded decade being a click hunt.
  //
  // Each type is wired to its OWN dedicated action, never a fallthrough to
  // generic RESOLVE_INTERRUPT — milestone, research-complete and demand are
  // mechanically just clear-and-advance today (see reducer.ts), same as the
  // generic action itself, but keeping them separate is what makes that stay
  // correct if one of them ever grows real work of its own to do on resolve.
  //
  // Two types are deliberately left out, for two different reasons. Charter
  // is a real either/or — accepting or declining sets
  // `universityCharterOffered`/`suffix` — so there is no neutral "continue"
  // for a key to stand for, and picking one silently would be picking for
  // the player. The admissions form is left out because its
  // tuition value lives in AdmissionsInterruptForm's own local
  // state, not reachable from here without lifting that state up just for a
  // hotkey, so it stays click-to-confirm.
  //
  // Guarded against a focused button/input so a Tab-focused decision-event
  // choice (or, if a future interrupt ever grows a text field) keeps
  // handling its own Enter natively instead of racing this handler. The
  // typing guard and the window listener itself come from useHotkeys (see
  // hotkeys.ts), which also keeps the handler reading the CURRENT interrupt
  // rather than one from an earlier render.
  useHotkeys((e) => {
    if (e.key !== 'Enter' || !interrupt) return;
    if (isActivationTarget(e.target)) return;

    switch (interrupt.type) {
      case 'rankings-entry':
      case 'annual-report':
        act({ type: 'RESOLVE_REPORT' });
        break;
      case 'milestone':
        act({ type: 'RESOLVE_MILESTONE' });
        break;
      case 'research-complete':
        act({ type: 'RESOLVE_RESEARCH_REPORT' });
        break;
      case 'demand':
        act({ type: 'RESOLVE_DEMAND' });
        break;
      case 'decision-event':
        if (decision) {
          act({ type: 'RESOLVE_DECISION_EVENT', eventId: decision.eventId, choiceId: '', ctx: decision.ctx });
        }
        break;
      // admissions, charter, and anything unrecognised: no-op — see above.
    }
  }, interrupt !== null);

  if (!interrupt) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        {interrupt.type === 'admissions' ? (
          <AdmissionsInterruptForm
            payload={interrupt.payload as AdmissionsDraft}
            s={s}
            prestige={s.self.reputation}
            capacity={s.students.capacity}
            tuitionCeiling={s.finance.tuitionCeiling}
            satisfaction={trailingYearSatisfaction(s)}
            cohortSignals={deriveCohortSignals(s)}
            petitions={s.orgs.pendingPetitions}
            onResolve={(settings) => act({ type: 'RESOLVE_ADMISSIONS', ...settings })}
          />
        ) : interrupt.type === 'milestone' ? (
          <MilestoneCelebrationView
            s={s}
            payload={interrupt.payload as MilestonePayload}
            onDismiss={() => act({ type: 'RESOLVE_MILESTONE' })}
          />
        ) : interrupt.type === 'research-complete' ? (
          <ResearchReportView
            s={s}
            report={(interrupt.payload as { report: InitiativeReport }).report}
            onDismiss={() => act({ type: 'RESOLVE_RESEARCH_REPORT' })}
          />
        ) : interrupt.type === 'demand' ? (
          <DemandView s={s} onDismiss={() => act({ type: 'RESOLVE_DEMAND' })} />
        ) : interrupt.type === 'charter' ? (
          <CharterOfferView s={s} onResolve={(accept) => act({ type: 'RESOLVE_CHARTER', accept })} />
        ) : decision ? (
          <DecisionEventView
            s={s}
            eventId={decision.eventId}
            ctx={decision.ctx}
            onResolve={(choiceId) => act({
              type: 'RESOLVE_DECISION_EVENT',
              eventId: decision.eventId,
              choiceId,
              ctx: decision.ctx,
            })}
            // No choice id matches, so the reducer applies nothing and
            // simply clears the interrupt — the escape hatch for an event
            // whose definition has gone from the content table.
            onDismiss={() => act({
              type: 'RESOLVE_DECISION_EVENT',
              eventId: decision.eventId,
              choiceId: '',
              ctx: decision.ctx,
            })}
          />
        ) : interrupt.type === 'rankings-entry' || interrupt.type === 'annual-report' ? (
          <RankingsReportView
            payload={interrupt.payload as ReportPayload}
            isFirstReveal={interrupt.type === 'rankings-entry'}
            onDismiss={() => act({ type: 'RESOLVE_REPORT' })}
          />
        ) : (
          // See interruptBody's own comment above: reachable only on
          // content drift, never in real play. RESOLVE_INTERRUPT advances
          // the clock exactly like every named branch's own dedicated
          // action (see reducer.ts) rather than silently holding the week
          // open forever.
          <>
            <h2>{interruptBody(interrupt).title}</h2>
            <p>{interruptBody(interrupt).body}</p>
            <button onClick={() => act({ type: 'RESOLVE_INTERRUPT' })}>Resolve</button>
          </>
        )}
      </div>
    </div>
  );
}
