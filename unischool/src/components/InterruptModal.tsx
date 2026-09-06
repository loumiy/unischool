import { useEffect, useState } from 'react';
import type { Action } from '../state/actions';
import type { GameState, PendingInterrupt, PrizeAward } from '../state/types';
import { institutionName, WEEKS_PER_YEAR } from '../state/types';
import { ACCLAIM_RESEARCH_BONUS } from '../data/researchData';
import { ACCLAIM_SALARY_PREMIUM } from '../data/facultyData';
import { projectAdmissions, priceTolerance } from '../systems/admissions/admissionsSystem';
import { computePrestigeTarget, prestigeTargetWithout } from '../systems/prestige/prestigeSystem';
import { findDecisionEvent } from '../data/eventData';
import { DEMAND_DEADLINE_WEEKS, demandCopy } from '../data/demandData';
import { demandProgress, demandStakes } from '../systems/demands/demandSystem';
import type { DecisionEventContext, MilestonePayload } from '../data/eventData';
import type { OrgPetition } from '../state/types';
import type { ReportPayload } from '../systems/rivals/rivalsSystem';

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
  financialAidRate: number;
}

function money(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
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

// The once-a-year summer admissions decision (see README's "Admissions: an
// annual summer decision"). The player sets exactly two levers — tuition
// and average financial aid — and the distribution funnel resolves the rest
// (see admissionsSystem.ts), with current student satisfaction feeding the
// applicant pool as word of mouth. Selectivity and enrollment are NOT inputs:
// they are emergent outcomes, previewed live below so the player can see the
// consequences of the two settings before confirming. This is the only
// place tuition is ever set; there is no live, adjustable tuition control.
function AdmissionsInterruptForm({ payload, prestige, capacity, tuitionCeiling, satisfaction, petitions, onResolve }: {
  payload: AdmissionsDraft;
  prestige: number;
  capacity: number;
  tuitionCeiling: number;
  satisfaction: number;
  petitions: OrgPetition[];
  onResolve: (settings: AdmissionsDraft & { approvedPetitionIds: string[] }) => void;
}) {
  const [tuition, setTuition] = useState(payload.tuition);
  const [financialAidRate, setFinancialAidRate] = useState(payload.financialAidRate);
  // Approved by default — see the note on StudentLifeDigest above.
  const [approved, setApproved] = useState<Set<string>>(() => new Set(petitions.map((p) => p.id)));

  // Live preview of the emergent outcomes, computed with the very function
  // the reducer commits with — so the numbers shown are the numbers applied.
  const outcome = projectAdmissions(prestige, tuition, financialAidRate, capacity, satisfaction);
  // What this school's prestige lets it charge before demand starts
  // falling away (see admissionsSystem.ts's price tolerance). Shown
  // because it is the single most consequential curve behind this
  // decision: without it, a player pricing above their standing just
  // watches the applicant pool shrink with no idea why.
  const tolerance = Math.round(priceTolerance(prestige));

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
        <div>
          <dt>What your prestige supports <span className="outcome-note">(net price before demand falls away)</span></dt>
          <dd>${tolerance.toLocaleString()}/yr</dd>
        </div>
      </dl>

      <StudentLifeDigest
        petitions={petitions}
        approved={approved}
        onToggle={(id) => setApproved((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id); else next.add(id);
          return next;
        })}
      />

      <button onClick={() => onResolve({ tuition, financialAidRate, approvedPetitionIds: [...approved] })}>
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
// The research prize: the ONLY research output that stops the clock (see
// README's "Research" — grants and breakthroughs resolve silently into
// finance and the prestige target, with nothing but a log line). It is
// here because it is genuinely momentous and genuinely rare: a prize is
// the most expensive of the three outputs and the least likely of them
// even once affordable, so a long run sees a handful at most.
//
// It grants nothing and asks nothing. Everything it reports already
// happened the week the prize was won: the winner's permanent acclaim,
// and with it the higher salary and higher research output that acclaim
// buys, plus the school's share of the capped research prestige input.
// This is the same contract the milestone celebration follows.
//
// The winner's details come from the PAYLOAD rather than from the roster,
// so the modal still says something true if they were dismissed in the
// weeks between the award and the quiet week it finally fired on.
// ---------------------------------------------------------------------
function PrizeCelebrationView({ s, awards, onDismiss }: {
  s: GameState;
  awards: PrizeAward[];
  onDismiss: () => void;
}) {
  const single = awards.length === 1 ? awards[0] : null;

  return (
    <>
      <h2>{single ? `${single.facultyName} wins ${single.prizeName}` : `${awards.length} prizes awarded`}</h2>
      <p>
        {single
          ? `The award recognises work done in this university's laboratories. ${single.facultyName} joins the very short list of ${single.field} researchers to have received it, and ${institutionName(s.self)} is named alongside them everywhere the citation is printed.`
          : 'The university’s laboratories have been recognised more than once this season.'}
      </p>

      {!single && (
        <ul className="milestone-unlocks">
          {awards.map((a) => (
            <li key={a.facultyId + a.prizeName}>{a.facultyName} ({a.field}) — {a.prizeName}</li>
          ))}
        </ul>
      )}

      <dl className="admissions-outcomes">
        <div>
          <dt>Research output <span className="outcome-note">(permanent, per prize)</span></dt>
          <dd>+{Math.round(ACCLAIM_RESEARCH_BONUS * 100)}%</dd>
        </div>
        <div>
          <dt>Salary <span className="outcome-note">(permanent, per prize)</span></dt>
          <dd>+{Math.round(ACCLAIM_SALARY_PREMIUM * 100)}%</dd>
        </div>
        <div>
          <dt>Prizes to date <span className="outcome-note">(feeds the prestige target)</span></dt>
          <dd>{s.research.prizes}</dd>
        </div>
      </dl>

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
          const affordable = cost <= s.finance.cash;
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

  // Enter resolves whichever modal is open, but ONLY for the interrupt
  // types explicitly wired below — the report and an authored decision
  // event (Enter here means CONTINUE: resolve with no choice picked, the
  // same escape hatch the dismiss button below uses for a content-table
  // miss, never one specific paid choice, so there is never an
  // affordability check to get wrong). Every other type is a deliberate
  // no-op, not a fallthrough to the generic RESOLVE_INTERRUPT: milestone,
  // research-prize, demand and charter all fire mid-TICK (see reducer.ts's
  // SYSTEMS) and their own resolve actions advance the clock as part of
  // clearing them, which generic RESOLVE_INTERRUPT does not — dispatching
  // it for one of those would clear the interrupt without moving the
  // week forward, and the NEXT tick would then re-run that same week's
  // systems a second time before finally advancing. Extending Enter to
  // any of them later means wiring its own dedicated action, never this
  // generic one. The admissions form is left out for a different reason:
  // its tuition/aid values live in AdmissionsInterruptForm's own local
  // state, not reachable from here without lifting that state up just for
  // a hotkey, so it stays click-to-confirm (see the PR notes for more).
  //
  // Guarded against a focused button/input so a Tab-focused decision-event
  // choice (or, if a future interrupt ever grows a text field) keeps
  // handling its own Enter natively instead of racing this handler.
  //
  // The listener is re-registered whenever `interrupt`/`decision` change
  // identity (every interrupt is a fresh object off structuredClone — see
  // reducer.ts), so the closure below always reads the CURRENT interrupt,
  // never a stale one from a previous render.
  useEffect(() => {
    if (!interrupt) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (interrupt!.type) {
        case 'rankings-entry':
        case 'annual-report':
          act({ type: 'RESOLVE_REPORT' });
          break;
        case 'decision-event':
          if (decision) {
            act({ type: 'RESOLVE_DECISION_EVENT', eventId: decision.eventId, choiceId: '', ctx: decision.ctx });
          }
          break;
        // admissions, milestone, research-prize, demand, charter, and
        // anything unrecognised: no-op — see the comment above.
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [interrupt, decision, act]);

  if (!interrupt) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        {interrupt.type === 'admissions' ? (
          <AdmissionsInterruptForm
            payload={interrupt.payload as AdmissionsDraft}
            prestige={s.self.reputation}
            capacity={s.students.capacity}
            tuitionCeiling={s.finance.tuitionCeiling}
            satisfaction={s.students.satisfaction}
            petitions={s.orgs.pendingPetitions}
            onResolve={(settings) => act({ type: 'RESOLVE_ADMISSIONS', ...settings })}
          />
        ) : interrupt.type === 'milestone' ? (
          <MilestoneCelebrationView
            s={s}
            payload={interrupt.payload as MilestonePayload}
            onDismiss={() => act({ type: 'RESOLVE_MILESTONE' })}
          />
        ) : interrupt.type === 'research-prize' ? (
          <PrizeCelebrationView
            s={s}
            awards={(interrupt.payload as { awards: PrizeAward[] }).awards}
            onDismiss={() => act({ type: 'RESOLVE_PRIZE' })}
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
