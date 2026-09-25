import { servedPopulationFor } from '../systems/satisfaction/satisfactionSystem';
import { useState } from 'react';
import type { Action } from '../state/actions';
import type {
  Coach, GameState, InitiativeReport, PendingInterrupt, SeasonResult, SummerBeat, SummerDecision, SummerPayload,
} from '../state/types';
import { institutionName, SUMMER_BEATS, WEEKS_PER_YEAR } from '../state/types';
import { buildYearInReview } from '../state/yearInReview';
import { finalReport } from '../state/finalReport';
import { hangInHall } from '../state/hall';
import { REPORT_WORDS } from '../data/reportData';
import { PromiseOffer } from '../tabs/PromisesPanel';
import FinalReportView from './FinalReportView';
import { ACCLAIM_RESEARCH_BONUS, initiativeDepth } from '../data/researchData';
import { ACCLAIM_SALARY_PREMIUM } from '../data/facultyData';
import { TUITION_SLIDER_MAX } from '../data/foundingData';
import { projectAdmissions, priceTolerance, priceTier, trailingYearSatisfaction, type PriceTier } from '../systems/admissions/admissionsSystem';
import { intakeCeiling } from '../systems/techtree/instructionCapacity';
import { deriveCohortSignals, cohortBreakdown, type CohortSignals } from '../systems/admissions/cohorts';
import { projectConsequences } from '../systems/admissions/consequences';
import { poolChange } from '../systems/admissions/yearOverYear';
import { computePrestigeTarget, computeSocialTarget, prestigeTargetWithout } from '../systems/prestige/prestigeSystem';
import { findDecisionEvent, findOpeningLetter, OPENING_LETTERS, offeredChoices } from '../data/eventData';
import { MASCOT_MAX_LENGTH, rollMascotSuggestion, sportById } from '../data/studentLifeData';
import FacultyPortrait from './FacultyPortrait';
import { DEMAND_DEADLINE_WEEKS, demandCopy } from '../data/demandData';
import { demandProgress, demandStakes } from '../systems/demands/demandSystem';
import type { DecisionEventContext, MilestonePayload } from '../data/eventData';
import type { OrgPetition } from '../state/types';
import type { ReportPayload } from '../systems/rivals/rivalsSystem';
import AnimatedNumber from './AnimatedNumber';
import Figure from './Figure';
import { SCALE_FREE_BELOW, marginalStudentCost } from '../systems/finance/financeSystem';
import { FIGURE_HINTS } from '../data/figureHints';
import { isActivationTarget, useHotkeys } from './hotkeys';
import { modalWidth } from './modalLayout';
import { currentEra } from '../systems/chronicle/chronicle';
import { CHRONICLE_WORDS } from '../data/chronicleData';
import { CatalogueChoices, CatalogueText } from './EventPanel';
import { eventById, fill } from '../systems/events/catalogue';
import { catalogueOf } from '../systems/events/catalogueEngine';
import { money, ordinal, signedPct } from '../format';
import { promisesOf } from '../systems/promises/promises';

// Fallback content for an interrupt type with no dedicated view; reachable
// only if content and this switch drift apart.
function interruptBody(interrupt: PendingInterrupt): { title: string; body: string } {
  return { title: interrupt.type, body: 'No content registered for this interrupt type.' };
}

interface AdmissionsDraft {
  tuition: number;
  admitRate: number;
}

// The reveal ticks slower than any other number: it is the payoff for a price
// already committed, so it is worth waiting on. The pool and the cohort cards
// share the duration so the panel fills as one reveal.
const REVEAL_MS = 2_600;

const NEED_LABEL: Record<'housing' | 'basicNeeds', string> = {
  housing: 'Beds',
  basicNeeds: 'Dining & health',
};

// Coverage is clamped to 1, so a covered school reads "adequate" with no
// delta; a percentage appears only once the class would leave the campus
// short.
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
// The student-life digest (data/studentLifeData.ts): a year's club and
// chapter petitions, answered together as the summer's fourth beat so student
// life never stops the clock on its own. Every petition defaults to approved,
// the harmless answer; anything unticked is declined, and the queue drains
// either way.
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

// Label and tone for each PriceTier (admissionsSystem.ts).
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

// Font steps measured against the card: the mono figure runs ~12px per
// character at 20px, so 7, 9 and 10 characters each need a smaller size to
// fit the card's 78px of usable width.
function SIZE_FOR_LENGTH(length: number): string {
  if (length >= 10) return 'count-xxs';
  if (length >= 9) return 'count-xs';
  if (length >= 7) return 'count-sm';
  return '';
}

// One cohort's card: the audience's name small, the head count big. The
// driver (what pulls this audience) waits on hover, as both a styled tooltip
// and a native `title` for keyboard and touch. The count's tone says whether
// the audience is above or below neutral.
function CohortCard({ label, driverLabel, pull, applicants, lastYear, revealMs, note }: {
  label: string; driverLabel: string; pull: number; applicants: number;
  // The cause named, where a cohort has one (e.g. a title); shown in the
  // tooltip.
  note?: string;
  // Last summer's count (students.lastFunnel), so the card reads as a
  // change. Null at the first summer.
  lastYear: number | null;
  revealMs: number;
}) {
  const toneClass = pull > 1 ? 'cohort-up' : pull < 1 ? 'cohort-down' : 'cohort-flat';
  // The figure shrinks, not the card. Sized by the final value's length, not
  // the displayed one, so the reveal's count-up does not resize the text.
  const sizeClass = SIZE_FOR_LENGTH(applicants.toLocaleString().length);
  return (
    <div className="cohort-card" title={note ? `${driverLabel}. ${note}` : driverLabel}>
      <span className="cohort-card-label">{label}</span>
      <span className={`cohort-card-count ${toneClass} ${sizeClass}`}>
        <AnimatedNumber value={applicants} durationMs={revealMs} revealFrom={0} />
      </span>
      {lastYear !== null && (
        <span className="cohort-card-last" title="Last summer">{lastYear.toLocaleString()} last year</span>
      )}
      <span className="cohort-card-tip" role="tooltip">{driverLabel}{note && <><br />{note}</>}</span>
    </div>
  );
}

// The summer's third beat (docs/design/admissions.md): the player sets
// tuition blind and it locks, then sets the admit rate with every consequence
// previewed. Selectivity and enrollment are emergent outcomes of the funnel
// (admissionsSystem.ts). This is the only place tuition is ever set.
function AdmissionsInterruptForm({ payload, s, prestige, capacity, satisfaction, cohortSignals, onCommit }: {
  payload: AdmissionsDraft;
  // For the consequence projection alone (consequences.ts), which advances a
  // copy of the classes through the real finance and satisfaction functions.
  s: GameState;
  prestige: number;
  capacity: number;
  satisfaction: number;
  cohortSignals: CohortSignals;
  // Carries the decision into the payload (types.ts's SummerPayload) and
  // moves on to the Students beat, where the year turns over.
  onCommit: (decision: SummerDecision) => void;
}) {
  const [tuition, setTuition] = useState(payload.tuition);
  const [admitRateChoice, setAdmitRateChoice] = useState(payload.admitRate);
  // Set blind, then locked with no way back: a price you could revise after
  // seeing the pool would be a lookup table, not a decision.
  const [tuitionLocked, setTuitionLocked] = useState(false);

  // Seats the catalogue has left after graduation, from the same function
  // the reducer clips with. The admit-rate slider shrinks to fit.
  const ceiling = intakeCeiling(s);
  // Live preview of the emergent outcomes, computed with the very function
  // the reducer commits with — so the numbers shown are the numbers applied.
  const outcome = projectAdmissions(prestige, tuition, capacity, satisfaction, cohortSignals, admitRateChoice, ceiling.seatsLeft);
  // The rate at which the class fills the room: past it the slider buys
  // nothing, so it ends there.
  const maxAdmitRate = outcome.applicants > 0
    ? Math.max(0.01, Math.min(1, ceiling.seatsLeft / outcome.applicants))
    : 1;
  // What committing this pair would do to money and mood, for the three
  // continuing classes plus the incoming one; the same advance the reducer
  // commits with.
  const consequence = projectConsequences(s, outcome.enrolled, tuition);
  const netDelta = consequence.weeklyNet - consequence.weeklyNetNow;
  const moodDelta = consequence.satisfactionTarget - consequence.satisfactionTargetNow;
  // What prestige lets the school charge before demand falls away, shown so
  // a player pricing above their standing can see why the pool shrinks.
  const tolerance = priceTolerance(prestige);
  const priceTierNow = priceTier(tuition, tolerance);
  const cohorts = cohortBreakdown(cohortSignals, tolerance, tuition, outcome.applicants);
  // Why the pool moved: each factor's share of the change against last
  // summer. Null at the first summer.
  const change = poolChange(outcome, s.students.lastFunnel);

  return (
    <>
      <h2>Admissions</h2>
      {!tuitionLocked && (
        <p className="admissions-prompt">
          What will you charge next year? You will see who it drew once it is set.
        </p>
      )}

      {/* The price, set blind: the only feedback is the tier. The slider
          ends at TUITION_SLIDER_MAX (foundingData.ts). */}
      <label className="admissions-field">
        <span>
          Tuition <strong className={`price-tier-value ${PRICE_TIER_COPY[priceTierNow].className}`}>${tuition.toLocaleString()}/yr</strong>
        </span>
        <input type="range" min={0} max={TUITION_SLIDER_MAX} step={500} value={tuition}
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
          {/* THE REVEAL. What that price actually drew. */}
          <dl className="admissions-outcomes">
            <Figure
              className="reveal"
              label="Applicant pool"
              hint={FIGURE_HINTS.applicants}
              value={<>
                <AnimatedNumber value={outcome.applicants} durationMs={REVEAL_MS} revealFrom={0} />
                {change && (
                  <span className={`consequence-delta ${change.change >= 0 ? 'good' : 'bad'}`}>{signedPct(change.change)}</span>
                )}
              </>}
            />
            {change && (
              <div className="pool-change">
                <dt>Against last summer&rsquo;s {change.lastApplicants.toLocaleString()}</dt>
                <dd className="pool-change-parts">
                  {change.parts.length === 0
                    ? 'nothing moved'
                    : change.parts.map((p) => (
                      <span key={p.key} className={p.change >= 0 ? 'good' : 'bad'}>{p.label} {signedPct(p.change)}</span>
                    ))}
                </dd>
              </div>
            )}
            <Figure
              className="reveal"
              label={<>Room for <span className="outcome-note">(the catalogue&rsquo;s seats, less who stays on)</span></>}
              hint={FIGURE_HINTS.room}
              value={<AnimatedNumber value={ceiling.seatsLeft} durationMs={REVEAL_MS} revealFrom={0} />}
            />
          </dl>
          <p className="admissions-ceiling-note">
            {ceiling.capacity.toLocaleString()} seats across the housed catalogue; {ceiling.stayingOn.toLocaleString()} stay on after graduation.
            {ceiling.nextSummer > ceiling.capacity
              ? ` Next summer the catalogue will hold ${ceiling.nextSummer.toLocaleString()}, counting the courses now in development.`
              : ' Nothing in development will add seats by next summer.'}
          </p>

          <div className="cohort-breakdown">
            <h3>Who this pulls in</h3>
            <div className="cohort-cards">
              {cohorts.map((c) => (
                <CohortCard
                  key={c.id} label={c.label} driverLabel={c.driverLabel} pull={c.pull} applicants={c.applicants} note={c.note}
                  lastYear={s.students.lastFunnel ? s.students.lastFunnel.cohorts[c.id] ?? 0 : null}
                  revealMs={REVEAL_MS}
                />
              ))}
            </div>
          </div>

          {/* THE SECOND DECISION, and the opposite posture: every
              consequence visible before it is taken. */}
          <label className="admissions-field">
            <span>
              Admit rate <strong>{Math.round(admitRateChoice * 100)}%</strong>
            </span>
            <input type="range" min={0.01} max={Math.max(0.01, Math.round(maxAdmitRate * 100) / 100)} step={0.01} value={Math.min(admitRateChoice, maxAdmitRate)}
              onChange={(e) => setAdmitRateChoice(Number(e.target.value))} />
            {maxAdmitRate < 1 && (
              <span className="outcome-note">
                {outcome.capped
                  ? `Held to the room: ${ceiling.seatsLeft.toLocaleString()} fit of the ${Math.round(outcome.applicants * Math.min(admitRateChoice, 1)).toLocaleString()} this share would admit.`
                  : `The slider ends at ${Math.round(maxAdmitRate * 100)}%, where the class fills the room.`}
              </span>
            )}
          </label>

          <dl className="admissions-outcomes">
            <Figure label="Freshman class" value={<AnimatedNumber value={outcome.enrolled} />} hint={FIGURE_HINTS.freshmen} />
            <Figure label="Incoming quality" value={<AnimatedNumber value={outcome.avgIncomingQuality} format={(n) => `${Math.round(n)} / 100`} />} hint={FIGURE_HINTS.incomingQuality} />
          </dl>

          {/* The projection line (Plan 29): the class against last year's,
              and the whole body against the beds and dining it will need. */}
          <p className="admissions-projection">
            A class of {outcome.enrolled.toLocaleString()} against {s.students.classes.freshman.toLocaleString()} last year:
            {' '}{consequence.totalEnrolled.toLocaleString()} students next year, for {s.students.capacity.toLocaleString()} beds
            {' '}and dining for {Math.round(servedPopulationFor(s, 'basicNeeds')).toLocaleString()}.
          </p>

          {/* What committing does to the whole school, including the three
              older classes still paying their locked price. */}
          <div className="consequence-panel">
            <h3>Projections</h3>
            <dl className="admissions-outcomes">
              <Figure
                label="Weekly net"
                hint={FIGURE_HINTS.projectedNet}
                value={<>
                  <AnimatedNumber value={consequence.weeklyNet} format={(n) => `${money(n)}/wk`} />
                  <span className={`consequence-delta ${netDelta >= 0 ? 'good' : 'bad'}`}>
                    {netDelta >= 0 ? '+' : '−'}{money(Math.abs(netDelta))}
                  </span>
                </>}
              />
              <Figure
                label="Satisfaction"
                hint={FIGURE_HINTS.projectedSatisfaction}
                value={<>
                  <AnimatedNumber value={consequence.satisfactionTarget} format={(n) => `${Math.round(n)}`} />
                  <span className={`consequence-delta ${moodDelta >= 0 ? 'good' : 'bad'}`}>
                    {moodDelta >= 0 ? '+' : '−'}{Math.abs(moodDelta).toFixed(1)}
                  </span>
                </>}
              />
              <Figure
                label={NEED_LABEL[consequence.tightestNeed]}
                hint={FIGURE_HINTS.tightestNeed}
                value={<CoverageValue now={consequence.tightestCoverageNow} next={consequence.tightestCoverage} />}
              />
              {consequence.totalEnrolled > SCALE_FREE_BELOW && (() => {
                // The break (Plan 36): what the next thousand would pay at this
                // price against what they would cost at this size.
                const cost = marginalStudentCost(s, 1_000, undefined, consequence.totalEnrolled) * WEEKS_PER_YEAR;
                return (
                  <Figure
                    label="The next thousand"
                    hint={FIGURE_HINTS.nextThousand}
                    value={<span className={`next-thousand ${tuition >= cost ? '' : 'bad'}`}>pay {money(tuition)} each, cost {money(cost)}</span>}
                  />
                );
              })()}
              {consequence.notReturning > 0 && (
                <Figure
                  label={<>Not returning <span className="outcome-note">({consequence.attritionReasons.length > 0 ? consequence.attritionReasons.join(', ') : 'a bad year'})</span></>}
                  hint={FIGURE_HINTS.notReturning}
                  value={<AnimatedNumber value={consequence.notReturning} />}
                />
              )}
            </dl>
          </div>

          <button onClick={() => onCommit({ tuition, admitRate: Math.min(admitRateChoice, maxAdmitRate) })}>
            Set the policy →
          </button>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
// The summer: one modal, three beats, one stop a year. The header lights the
// current beat; one action per beat moves on (types.ts's SummerPayload,
// reducer.ts's RESOLVE_SUMMER_BEAT). Only the last beat turns the calendar.
// ---------------------------------------------------------------------
function SummerSteps({ beat }: { beat: SummerBeat }) {
  return (
    <ol className="summer-steps" aria-label="Summer">
      {SUMMER_BEATS.map((label, i) => (
        <li
          key={label}
          className={i === beat ? 'current' : i < beat ? 'done' : ''}
          aria-current={i === beat ? 'step' : undefined}
        >
          {label}
        </li>
      ))}
    </ol>
  );
}

// Beat one: the year just lived, in facts (state/yearInReview.ts).
// Read-and-continue.
function ReviewBeat({ s, onContinue }: { s: GameState; onContinue: (promises: string[]) => void }) {
  const review = buildYearInReview(s);
  const era = currentEra(s);
  const [taken, setTaken] = useState<string[]>([]);
  const toggle = (id: string) => setTaken((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  return (
    <>
      <h2>Year {review.year} in review</h2>
      <p>
        The year is over. Before the summer&rsquo;s decisions, what it produced.
        {review.truncated && ' The record of its earliest weeks has scrolled off the log.'}
      </p>
      {era && <p className="review-era">{CHRONICLE_WORDS.now.replace('{era}', era.name)}</p>}
      <div className="review-grid">
        {review.sections.map((section) => (
          <section key={section.key} className="review-section">
            <h3>{section.title}</h3>
            {section.lines.length === 0 ? (
              <p className="review-empty">{section.empty}</p>
            ) : (
              <ul>
                {section.lines.map((line, i) => (
                  <li key={i} className={line.tone ?? ''}>{line.text}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <PromiseOffer s={s} taken={taken} onToggle={toggle} />
      <button onClick={() => onContinue(taken)}>{taken.length > 0 ? 'Make it public →' : 'Continue →'}</button>
    </>
  );
}

// The Final Report (Plan 33): the fiftieth summer's first beat, in place of
// the year in review. A pure reading (state/finalReport.ts), taken exactly
// as RESOLVE_ADMISSIONS will write it. Read-and-continue: the run goes on,
// into the Epilogue.
function FinalReportBeat({ s, onContinue }: { s: GameState; onContinue: () => void }) {
  const report = finalReport(s);
  return (
    <>
      <div className="eyebrow final-report-eyebrow">{REPORT_WORDS.eyebrow}</div>
      <h2>{REPORT_WORDS.title}</h2>
      <FinalReportView s={s} report={report} />
      <p className="review-empty">{REPORT_WORDS.epilogue}</p>
      {/* Leaving the report hangs the run in the hall of fame (state/hall.ts). */}
      <button onClick={() => { hangInHall(s, report); onContinue(); }}>Continue into the Epilogue →</button>
    </>
  );
}

// Beat four: the student-life digest, and what the school is about to commit
// before the year turns over.
function StudentsBeat({ s, decision, petitions, onResolve }: {
  s: GameState;
  decision: SummerDecision;
  petitions: OrgPetition[];
  onResolve: (approvedPetitionIds: string[]) => void;
}) {
  const [approved, setApproved] = useState<Set<string>>(() => new Set(petitions.map((p) => p.id)));
  return (
    <>
      <h2>Students</h2>
      {petitions.length === 0 ? (
        <p>
          No new student organisation petitioned this year
          {s.orgs.clubs.length === 0 && s.orgs.chapters.length === 0
            ? ' — clubs form once the campus has a student center for them to meet in.'
            : '.'}
        </p>
      ) : (
        <p>What the students organised this year, and are asking the school to recognise.</p>
      )}
      <StudentLifeDigest
        petitions={petitions}
        approved={approved}
        onToggle={(id) => setApproved((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id); else next.add(id);
          return next;
        })}
      />
      <dl className="admissions-outcomes">
        <Figure label={<>Tuition for the incoming class <span className="outcome-note">(locked for four years)</span></>} value={`${money(decision.tuition)}/yr`} hint={FIGURE_HINTS.tuitionLocked} />
        <Figure label="Admit rate" value={`${Math.round(decision.admitRate * 100)}%`} hint={FIGURE_HINTS.admitRate} />
      </dl>
      <button onClick={() => onResolve([...approved])}>Open year {s.clock.year + 1}</button>
    </>
  );
}

function SummerView({ s, payload, act }: { s: GameState; payload: SummerPayload; act: (a: Action) => void }) {
  const decision = payload.decision ?? { tuition: payload.tuition, admitRate: payload.admitRate };
  return (
    <>
      <SummerSteps beat={payload.beat} />
      {payload.beat === 0 && payload.final ? (
        <FinalReportBeat s={s} onContinue={() => act({ type: 'RESOLVE_SUMMER_BEAT' })} />
      ) : payload.beat === 0 ? (
        <ReviewBeat s={s} onContinue={(promises) => act({ type: 'RESOLVE_SUMMER_BEAT', promises })} />
      ) : payload.beat === 1 ? (
        <AdmissionsInterruptForm
          payload={{ tuition: payload.tuition, admitRate: payload.admitRate }}
          s={s}
          prestige={s.self.reputation}
          capacity={s.students.capacity}
          satisfaction={trailingYearSatisfaction(s)}
          cohortSignals={deriveCohortSignals(s)}
          onCommit={(d) => act({ type: 'RESOLVE_SUMMER_BEAT', decision: d })}
        />
      ) : (
        <StudentsBeat
          s={s}
          decision={decision}
          petitions={s.orgs.pendingPetitions}
          onResolve={(approvedPetitionIds) => act({ type: 'RESOLVE_ADMISSIONS', ...decision, approvedPetitionIds })}
        />
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

// Renders both rankings interrupts: the one-time top-50 reveal and the
// annual report (docs/design/progression.md). Movement, crossings and movers
// come from buildReportPayload (rivalsSystem.ts); the movement line appears
// only when there is a prior year to compare against.
function RankingsReportView({ payload, isFirstReveal, published = true, onDismiss }: {
  payload: ReportPayload;
  isFirstReveal: boolean;
  // Whether the U.S. News list carries the school yet (s.hasEnteredRankings).
  // The Standing beat renders for every school; the top-50 table only once
  // the school is on it.
  published?: boolean;
  onDismiss: () => void;
}) {
  const { rank, previousRank, movers, passed, passedBy, standings, others } = payload;
  const delta = previousRank === null ? null : previousRank - rank;

  return (
    <>
      <h2>{isFirstReveal ? "You've entered the rankings" : published ? 'Standing — the U.S. News report' : 'Standing'}</h2>
      <p>
        {isFirstReveal
          ? `Your university has cracked the top 50, landing at #${rank}. The report will keep you posted every summer from here on.`
          : published
            ? `This year's standings are in — you're ranked #${rank}.`
            : `You are ranked #${rank} of ${payload.field} this summer. The U.S. News list publishes fifty names; the school is not on it yet.`}
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

      {/* The other two standings, one line each (see
          systems/prestige/prestigeSystem.ts). */}
      {others.length > 0 && (
        <ul className="report-others">
          {others.map((o) => (
            <li key={o.label}>
              <span className="report-other-label">{o.label}</span>
              <span className="report-other-rank">#{o.rank}</span>
              <span className="report-other-note">
                {o.isLeader
                  ? 'nobody in the country is ahead of you'
                  : `${o.leader} ${o.leaderMascot} lead`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {published && (
        <>
          <h3 className="report-standings-head">Top {standings.length}</h3>
          {/* With last year's position, so the list reads as motion. */}
          <table className="report-table">
            <thead>
              <tr><th>#</th><th>School</th><th>Score</th><th>Last year</th></tr>
            </thead>
            <tbody>
              {standings.map((r, i) => {
                // Keyed by identity, not by name: the player may name their
                // school anything, including something a rival is already called.
                const move = r.previousRank === null ? null : r.previousRank - (i + 1);
                return (
                  <tr key={r.key} className={r.isPlayer ? 'me' : ''}>
                    <td className="report-table-rank">{i + 1}</td>
                    <td className="report-table-name">{r.name}</td>
                    <td className="report-table-score">{Math.round(r.value)}</td>
                    <td className="report-table-last">
                      {r.previousRank === null
                        ? '—'
                        : <>#{r.previousRank}{move !== 0 && <span className={`rank-move ${move! > 0 ? 'up' : 'down'}`}> {move! > 0 ? '▲' : '▼'}{Math.abs(move!)}</span>}</>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
      <button onClick={onDismiss}>{isFirstReveal ? 'Dismiss' : 'Continue →'}</button>
    </>
  );
}

// ---------------------------------------------------------------------
// The milestone celebration (data/eventData.ts's MILESTONE_INTERRUPT_KINDS).
// It grants and asks nothing. The prestige figures are computed live with
// prestigeSystem.ts's own functions (the target now vs. without these
// milestones), so the contribution shown is a real reading of the model.
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

      {/* One milestone reads as a paragraph with its unlocks; a burst reads
          as cards, each with its unlocks folded behind a count. */}
      {single ? (
        single.unlocks.length > 0 && (
          <div className="milestone-entry">
            <h3 className="milestone-unlocks-head">Now open</h3>
            <ul className="milestone-unlocks">
              {single.unlocks.map((name) => <li key={name}>{name}</li>)}
            </ul>
          </div>
        )
      ) : (
        <div className="milestone-cards">
          {payload.entries.map((e) => (
            <div key={e.key} className="milestone-card">
              <h3>{e.headline}</h3>
              <p className="milestone-detail">{e.detail}</p>
              {e.unlocks.length > 0 && (
                <details className="milestone-unlocks-fold">
                  <summary>{e.unlocks.length} now open</summary>
                  <ul className="milestone-unlocks">
                    {e.unlocks.map((name) => <li key={name}>{name}</li>)}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

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
// A research project has concluded (systems/research/researchSystem.ts). The
// completion is the event; an award is one of its results. It grants and asks
// nothing: everything shown has already landed. It reads the payload, not
// live state, so it stays true if a professor has since left or the facility
// been renamed.
// ---------------------------------------------------------------------
function ResearchReportView({ s, report, onDismiss }: {
  s: GameState;
  report: InitiativeReport;
  onDismiss: () => void;
}) {
  const depth = initiativeDepth(report.depth);

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
          <dd>{money(report.grantIncome)}</dd>
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

      <button onClick={onDismiss}>Continue</button>
    </>
  );
}

// ---------------------------------------------------------------------
// A student demand (systems/demands/demandSystem.ts), raised only when
// satisfaction has sat below DEMAND_SATISFACTION_THRESHOLD. There is nothing
// to choose: the answer is to build the ask before the deadline, which the
// demand system detects. The stakes are read, not written: satisfaction
// figures are the nudges the system would apply, and applicant figures come
// from running projectAdmissions at today's policy.
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
        applicants &mdash; nothing more. It stays visible in the Students tab until it resolves.
      </p>

      <button onClick={onDismiss}>Understood</button>
    </>
  );
}

// ---------------------------------------------------------------------
// The athletic director's offer, fired the first quiet week after the school
// fields a varsity team. A director has one stat, so the three cards differ
// only in quality and salary, and the copy says the choice is about money. It
// also asks for the mascot if none has been named yet.
// ---------------------------------------------------------------------
interface AthleticDirectorPayload {
  candidates: Coach[];
  mascotSuggestion: string;
}

// ---------------------------------------------------------------------
// A championship. What the title did to campus-life standing is computed by
// running the target without it and reporting the difference.
// ---------------------------------------------------------------------
function ChampionshipView({ s, result, onDismiss }: {
  s: GameState; result: SeasonResult; onDismiss: () => void;
}) {
  const sport = sportById(result.sport)?.teamName ?? result.sport;
  // The bare sport for the label: `teamName` ends in "Team", which reads
  // wrong in "Titles in Men's Soccer Team".
  const sportShort = sport.replace(/ Team$/, '');
  const ad = s.orgs.athleticDirector;
  const titlesInSport = s.orgs.titles.filter((t) => t.sport === result.sport).length;

  // What this one was worth, by asking the model what the target would be
  // with one fewer title on the board.
  const now = computeSocialTarget(s);
  const without = computeSocialTarget({
    ...s,
    orgs: { ...s.orgs, titles: s.orgs.titles.slice(0, -1) },
  });
  const worth = now - without;

  return (
    <>
      <h2>{s.self.mascot ? `The ${s.self.mascot} are national champions` : 'National champions'}</h2>
      <p>
        {ad ? `${ad.name} has been on the telephone since the final whistle. ` : ''}
        The {sport} finished the season as champions
        {result.seed !== null && result.seed > 2 ? ` — from the ${ordinal(result.seed)} seed` : ''}.
      </p>

      {result.beaten.length > 0 && (
        <ol className="championship-path">
          {result.beaten.map((opponent, i) => (
            <li key={opponent}>
              <span className="championship-round">{['Quarterfinal', 'Semifinal', 'Final'][i] ?? 'Round'}</span>
              <span className="championship-opponent">beat {opponent}</span>
            </li>
          ))}
        </ol>
      )}

      <dl className="championship-worth">
        <div>
          <dt>Titles in {sportShort}</dt>
          <dd>{titlesInSport}</dd>
        </div>
        <div>
          <dt>Titles in all</dt>
          <dd>{s.orgs.titles.length}</dd>
        </div>
        <div>
          <dt>Campus-life standing</dt>
          {/* Standing drifts toward its target, so this is what the target
              moved by. */}
          <dd>{worth >= 0.05 ? `+${worth.toFixed(1)} to the target` : 'already at its ceiling'}</dd>
        </div>
      </dl>

      <button onClick={onDismiss}>Dismiss</button>
    </>
  );
}

// The first sport club: a small modal that names the teams, years before
// there is a department.
interface FirstSportClubPayload { clubName: string; sportId: string | null; mascotSuggestion: string; }

function FirstSportClubView({ s, payload, onResolve }: {
  s: GameState;
  payload: FirstSportClubPayload;
  onResolve: (mascot: string) => void;
}) {
  const [mascot, setMascot] = useState(payload.mascotSuggestion);
  return (
    <>
      <h2>The first sport club</h2>
      <p>
        The {payload.clubName} is the first of the school's sport clubs to be recognised. It plays intramurals
        for now; in a few years it may petition to go varsity, and there will be a department, a venue and a
        season behind it. The students have already started arguing about what the teams should be called —
        the colours are {institutionName(s.self)}'s own, but a name is something people shout.
      </p>
      <label className="ad-mascot">
        <span className="ad-mascot-label">The teams will play as the</span>
        <input
          className="ad-mascot-input"
          value={mascot}
          maxLength={MASCOT_MAX_LENGTH}
          onChange={(e) => setMascot(e.target.value)}
          aria-label="Mascot"
        />
        <button type="button" className="ad-mascot-roll" onClick={() => setMascot(rollMascotSuggestion(Math.random))}>
          another
        </button>
      </label>
      <button className="panel-action" onClick={() => onResolve(mascot)}>Name them</button>
    </>
  );
}

function AthleticDirectorView({ s, payload, onResolve }: {
  s: GameState;
  payload: AthleticDirectorPayload;
  onResolve: (candidate: Coach | null, mascot: string) => void;
}) {
  const [mascot, setMascot] = useState(payload.mascotSuggestion);
  const cheapest = payload.candidates.reduce((lo, c) => (c.salary < lo.salary ? c : lo), payload.candidates[0]);

  return (
    <>
      <h2>An athletic director</h2>
      <p>
        {s.orgs.teams.length === 1
          ? 'The school fields a varsity program now, and nobody is running it.'
          : `The school fields ${s.orgs.teams.length} varsity programs now, and nobody is running them.`}
        {' '}Three candidates have applied. A director lifts every team the school fields —
        and unlike a coach, there is only one of them, so the question is simply how much of
        the department's budget goes to the person in charge.
      </p>

      <div className="ad-candidates">
        {payload.candidates.map((c) => (
          <button key={c.id} className="ad-candidate" onClick={() => onResolve(c, mascot)}>
            <FacultyPortrait
              f={{ id: c.id, gender: c.gender, heritage: c.heritage, seniority: Math.min(0.65, c.quality / 130) }}
              size={40}
            />
            <span className="ad-candidate-name">{c.name}</span>
            <span className="ad-candidate-quality">quality {c.quality}</span>
            <span className="ad-candidate-salary">{money(c.salary)}/yr</span>
            {c.id === cheapest.id && <span className="ad-candidate-tag">least expensive</span>}
          </button>
        ))}
      </div>

      {/* Asked only if the first sport club did not already name them. */}
      {!s.self.mascot && (
        <label className="ad-mascot">
          <span className="ad-mascot-label">The teams will play as the</span>
          <input
            className="ad-mascot-input"
            value={mascot}
            maxLength={MASCOT_MAX_LENGTH}
            onChange={(e) => setMascot(e.target.value)}
            aria-label="Mascot"
          />
          <button type="button" className="ad-mascot-roll" onClick={() => setMascot(rollMascotSuggestion(Math.random))}>
            another
          </button>
        </label>
      )}

      <button className="ad-decline" onClick={() => onResolve(null, mascot)}>
        Appoint nobody for now — the search goes on, and the position will come back around.
      </button>
    </>
  );
}

// ---------------------------------------------------------------------
// A letter from the board (data/eventData.ts's OPENING_LETTERS). Only the
// first letter offers "I know the way", which skips the rest of the script.
// A letter no longer in the table (an old save) is put down quietly.
// ---------------------------------------------------------------------
function LetterView({ s, id, onResolve }: { s: GameState; id: string; onResolve: (skipAll: boolean) => void }) {
  const letter = findOpeningLetter(id);
  if (!letter) {
    return (
      <>
        <h2>A letter has been mislaid</h2>
        <p>Nothing has changed.</p>
        <button onClick={() => onResolve(false)}>Continue</button>
      </>
    );
  }
  const first = OPENING_LETTERS[0].id === letter.id;
  return (
    <>
      <p className="letter-eyebrow">From the chair of the board · Week {letter.week}</p>
      <h2>{letter.title}</h2>
      <p className="letter-body">{letter.body(s)}</p>
      <p className="letter-ask">
        <span className="letter-ask-label">{letter.done(s) ? 'Done' : 'To do'}</span>
        {letter.ask}
      </p>
      <button onClick={() => onResolve(false)}>Understood</button>
      {first && (
        <button type="button" className="letter-skip" onClick={() => onResolve(true)}>
          I know the way — no more letters this run
        </button>
      )}
    </>
  );
}

// The College -> University charter, asked once, the first quiet week after
// any lab finishes (systems/events/eventSystem.ts). Cosmetic: only the name
// changes. Either answer closes the question.
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

// A letter from the board (Plan 32): one of the catalogue's seismic events.
// The clock waits on it; its choices are the panel's (EventPanel.tsx).
function CatalogueLetterView({ s, instanceId, act }: { s: GameState; instanceId: string; act: (a: Action) => void }) {
  const p = catalogueOf(s).pending.find((x) => x.instanceId === instanceId);
  const e = p ? eventById(p.eventId) : undefined;
  if (!p || !e) {
    return (
      <>
        <h2>A letter has been mislaid</h2>
        <p>Nothing has changed.</p>
        <button onClick={() => act({ type: 'RESOLVE_CATALOGUE_EVENT', instanceId, choiceId: '' })}>Continue</button>
      </>
    );
  }
  const text = fill(e.text, p.vars);
  return (
    <>
      <p className="letter-eyebrow">From the board · Year {s.clock.year}</p>
      <h2>{e.title ? fill(e.title, p.vars) : 'A letter from the board'}</h2>
      <CatalogueText text={text} className="letter-body" />
      <CatalogueChoices s={s} p={p} e={e} onChoose={(choiceId) => act({ type: 'RESOLVE_CATALOGUE_EVENT', instanceId, choiceId })} />
    </>
  );
}

// ---------------------------------------------------------------------
// An authored decision event (data/eventData.ts). The modal and the reducer
// look up the same definition by id, so what is shown is what is applied. An
// unaffordable choice is shown disabled, not hidden; every event has a free
// choice, so there is always a way out.
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
        {offeredChoices(s, event, ctx).map((choice) => {
          const cost = choice.cost(s, ctx);
          // A free choice stays pickable even with negative cash.
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
                  {cost > 0 ? money(-cost) : 'no cost'}
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

// Renders whichever modal s.pendingInterrupt calls for, on top of every tab
// (docs/architecture/interrupts.md).
export default function InterruptModal({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const interrupt = s.pendingInterrupt;

  // The two payloads that carry structured content are read once here,
  // narrowed by the type tag, so the branches below stay free of casts.
  const decision = interrupt?.type === 'decision-event'
    ? interrupt.payload as { eventId: string; ctx: DecisionEventContext }
    : null;

  // Enter continues the read-and-continue interrupts, each through its own
  // dedicated action; for a decision event it resolves with no choice
  // picked, never a paid one. Left out: the charter (a real either/or), the
  // summer's decision beats (their values live in local state), and the
  // athletic director (both). useHotkeys ignores Enter on a focused button
  // or input, so those keep their native behaviour.
  useHotkeys((e) => {
    if (e.key !== 'Enter' || !interrupt) return;
    if (isActivationTarget(e.target)) return;

    switch (interrupt.type) {
      case 'rankings-entry':
      case 'annual-report':
        act({ type: 'RESOLVE_REPORT' });
        break;
      case 'summer': {
        // Only the read-and-continue beats: a key must not commit a price or
        // decline a year's petitions.
        // Not the fiftieth summer's report either (its button hangs the run
        // in the hall of fame, state/hall.ts), nor a review with promises on
        // offer (Enter sent none, declining whatever the player had ticked).
        const payload = interrupt.payload as SummerPayload;
        if (payload.beat < 1 && !payload.final && !promisesOf(s).offer) act({ type: 'RESOLVE_SUMMER_BEAT' });
        break;
      }
      case 'milestone':
        act({ type: 'RESOLVE_MILESTONE' });
        break;
      case 'research-complete':
        act({ type: 'RESOLVE_RESEARCH_REPORT' });
        break;
      case 'championship':
        act({ type: 'RESOLVE_CHAMPIONSHIP' });
        break;
      case 'letter':
        act({ type: 'RESOLVE_LETTER', skipAll: false });
        break;
      case 'demand':
        act({ type: 'RESOLVE_DEMAND' });
        break;
      // the summer's decision beats, decision events (Enter used to dismiss
      // one with no choice, dodging its consequence), charter, the athletic
      // director, and anything unrecognised: no-op — see above.
    }
  }, interrupt !== null);

  if (!interrupt) return null;

  return (
    <div className="modal-backdrop">
      <div className={`modal modal-${modalWidth(interrupt)}`} data-interrupt={interrupt.type}>
        {interrupt.type === 'summer' ? (
          <SummerView s={s} payload={interrupt.payload as SummerPayload} act={act} />
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
        ) : interrupt.type === 'championship' ? (
          <ChampionshipView
            s={s}
            result={(interrupt.payload as { result: SeasonResult }).result}
            onDismiss={() => act({ type: 'RESOLVE_CHAMPIONSHIP' })}
          />
        ) : interrupt.type === 'first-sport-club' ? (
          <FirstSportClubView
            s={s}
            payload={interrupt.payload as FirstSportClubPayload}
            onResolve={(mascot) => act({ type: 'RESOLVE_MASCOT', mascot })}
          />
        ) : interrupt.type === 'athletic-director' ? (
          <AthleticDirectorView
            s={s}
            payload={interrupt.payload as AthleticDirectorPayload}
            onResolve={(candidate, mascot) => act({ type: 'RESOLVE_ATHLETIC_DIRECTOR', candidate, mascot })}
          />
        ) : interrupt.type === 'charter' ? (
          <CharterOfferView s={s} onResolve={(accept) => act({ type: 'RESOLVE_CHARTER', accept })} />
        ) : interrupt.type === 'letter' ? (
          <LetterView
            s={s}
            id={(interrupt.payload as { id: string }).id}
            onResolve={(skipAll) => act({ type: 'RESOLVE_LETTER', skipAll })}
          />
        ) : interrupt.type === 'catalogue-letter' ? (
          <CatalogueLetterView s={s} instanceId={(interrupt.payload as { instanceId?: string } | undefined)?.instanceId ?? ''} act={act} />
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
            // No choice id matches, so the reducer only clears the
            // interrupt: the escape hatch for an event gone from the table.
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
          // Content drift only (see interruptBody). RESOLVE_INTERRUPT
          // advances the clock rather than holding the week open.
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
