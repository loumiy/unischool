import { useState } from 'react';
import type { Action } from '../state/actions';
import type {
  Coach, GameState, InitiativeReport, SeasonResult, SummerBeat, SummerDecision, SummerPayload,
} from '../state/types';
import { institutionName, SUMMER_BEATS, WEEKS_PER_YEAR } from '../state/types';
import { REVIEW_LIST_CAP, buildYearInReview } from '../state/yearInReview';
import type { ReviewLine } from '../state/yearInReview';
import { finalReport } from '../state/finalReport';
import { hallEntryFor, hangInHall } from '../state/hall';
import { unlockLabel } from '../state/unlocks';
import { runFinished, saveExported } from '../analytics/analytics';
import { exportSave } from '../state/persistence';
import { downloadFile } from './download';
import { PLATFORM } from '../build';
import FeedbackPrompt from './FeedbackPrompt';
import ReportCardActions, { NewCollegeButton } from './ReportCardActions';
import { REPORT_WORDS } from '../data/reportData';
import { PromiseOffer } from '../tabs/PromisesPanel';
import FinalReportView from './FinalReportView';
import AdmissionsPage, { admissionsPageUp } from './AdmissionsPage';
import { ACCLAIM_RESEARCH_BONUS, initiativeDepth } from '../data/researchData';
import { ACCLAIM_SALARY_PREMIUM } from '../data/facultyData';
import { computePrestigeTarget, pillarValue, prestigeTargetWithout } from '../systems/prestige/prestigeSystem';
import { findDecisionEvent, findOpeningLetter, offeredChoices } from '../data/eventData';
import { restaffPlan } from '../systems/faculty/restaffing';
import { MASCOT_MAX_LENGTH, rollMascotSuggestion, sportById } from '../data/studentLifeData';
import FacultyPortrait from './FacultyPortrait';
import type { DecisionEventContext, MilestonePayload } from '../data/eventData';
import type { OrgPetition } from '../state/types';
import type { ReportPayload } from '../systems/rivals/rivalsSystem';
import RankingsTable from './RankingsTable';
import { SpecializationLetter, SpecializationPage } from './SpecializationChoice';
import Figure from './Figure';
import { FIGURE_HINTS } from '../data/figureHints';
import { isActivationTarget, isKey, useHotkeys } from './hotkeys';
import { modalWidth } from './modalLayout';
import { currentEra, listOf } from '../systems/chronicle/chronicle';
import { CHRONICLE_WORDS } from '../data/chronicleData';
import { CatalogueChoices, CatalogueText } from './EventChoices';
import { eventById, eventText, fill } from '../systems/events/catalogue';
import { catalogueOf } from '../systems/events/catalogueEngine';
import { letterOpensBuild } from '../systems/inbox/inbox';
import { count, gameDate, money, moneyShort, ordinal, pct, prestigeFigure, prestigeShown, signed, signedPct, weeksShort } from '../format';
import { promisesOf } from '../systems/promises/promises';

// Fallback content for an interrupt type with no dedicated view; reachable
// only if content and this switch drift apart.
function interruptBody(): { title: string; body: string } {
  return { title: 'A matter set aside', body: 'The matter this concerned has lapsed. Nothing has changed.' };
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

  return (
    <div className="digest">
      <h3 className="digest-head">
        {petitions.length === 1
          ? 'One new student organization this year'
          : `${petitions.length} new student organizations this year`}
      </h3>
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
            {p.foundingMembers} founding members · {moneyShort(p.upkeepPerWeek)}/wk
          </span>
        </label>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------
// The summer: one modal, three beats, one stop a year. The header lights the
// current beat; one action per beat moves on (types.ts's SummerPayload,
// reducer.ts's RESOLVE_SUMMER_BEAT). Only the last beat turns the calendar.
// ---------------------------------------------------------------------
// The fiftieth summer's first beat is the Final Report, and says so.
function SummerSteps({ beat, final }: { beat: SummerBeat; final?: boolean }) {
  const labels = SUMMER_BEATS.map((label, i) => (i === 0 && final ? 'Final Report' : label));
  return (
    <ol className="summer-steps" aria-label="Summer">
      {labels.map((label, i) => (
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

// One line of the review. A group (Plan 95I) is its head over its first
// REVIEW_LIST_CAP members, and "and N more" opens the rest in place.
function ReviewLineView({ line }: { line: ReviewLine }) {
  const [open, setOpen] = useState(false);
  const items = line.items ?? [];
  const shown = open ? items : items.slice(0, REVIEW_LIST_CAP);
  const more = items.length - shown.length;
  return (
    <li className={line.tone ?? ''}>
      {line.text}
      {line.detail && <span className="review-detail">{line.detail}</span>}
      {items.length > 0 && (
        <ul className="review-items">
          {shown.map((item, i) => <li key={i}>{item}</li>)}
          {more > 0 && (
            <li>
              <button type="button" className="review-more" onClick={() => setOpen(true)}>and {count(more)} more</button>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

// Beat one: the year just lived, in facts (state/yearInReview.ts).
// Read-and-continue.
// Every fifth summer, in a browser (Plan 97D): the run lives in the page's
// storage, which Safari clears after seven days unvisited and a private
// window on close, so the review offers the file. The desktop build keeps
// its own storage and does not ask.
export const backUpDue = (year: number) => PLATFORM !== 'desktop' && year % 5 === 0;

function ReviewBeat({ s, onContinue, onSave }: { s: GameState; onContinue: (promises: string[]) => void; onSave: () => void }) {
  const review = buildYearInReview(s);
  const era = currentEra(s);
  const [taken, setTaken] = useState<string[]>([]);
  const toggle = (id: string) => setTaken((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  return (
    <>
      <h2>Year {review.year} in review</h2>
      {review.truncated && <p>The log no longer reaches back to its first weeks.</p>}
      {era && <p className="review-era">{CHRONICLE_WORDS.now.replace('{era}', era.name)}</p>}
      <div className="review-grid">
        {review.sections.map((section) => (
          <section key={section.key} className="review-section">
            <h3>{section.title}</h3>
            {section.lines.length === 0 ? (
              <p className="review-empty">{section.empty}</p>
            ) : (
              <ul>
                {section.lines.map((line, i) => <ReviewLineView key={i} line={line} />)}
              </ul>
            )}
          </section>
        ))}
      </div>
      <PromiseOffer s={s} taken={taken} onToggle={toggle} />
      {review.year === 5 && <FeedbackPrompt s={s} prompt="five-years" text="Five years in. Two minutes of feedback?" onSave={onSave} />}
      {backUpDue(review.year) && (
        <p className="review-backup">
          A browser can clear what a page keeps, after weeks unvisited or when a private window closes.{' '}
          <button type="button" className="menu-btn" onClick={() => { const f = exportSave(s); downloadFile(f.filename, f.text); saveExported('backup'); }}>Back up this run</button>
        </p>
      )}
      <div className="modal-actions">
        <button onClick={() => onContinue(taken)}>{taken.length > 0 ? 'Make it public' : 'Continue'}</button>
      </div>
    </>
  );
}

// The Final Report (Plan 33): the fiftieth summer's first beat, in place of
// the year in review. A pure reading (state/finalReport.ts), taken exactly
// as RESOLVE_ADMISSIONS will write it. Read-and-continue: the run goes on,
// into the Epilogue.
// Play again (Plan 70J): the report card's two buttons, and Found another
// college, which hangs the run too before it ends it.
function FinalReportBeat({ s, onContinue, onNewCollege, onSave }: { s: GameState; onContinue: () => void; onNewCollege?: () => void; onSave: () => void }) {
  const report = finalReport(s);
  return (
    <>
      <div className="final-report-eyebrow">{REPORT_WORDS.eyebrow}</div>
      <h2>{REPORT_WORDS.title}</h2>
      <FinalReportView s={s} report={report} />
      {/* What this run earned for the next college (Plan 98C). */}
      {(s.events.unlocksEarned?.length ?? 0) > 0 && (
        <p className="final-report-unlocks">
          New for your next college: {listOf(s.events.unlocksEarned!.map(unlockLabel))} architecture.
        </p>
      )}
      <ReportCardActions entry={hallEntryFor(s, report)} />
      <FeedbackPrompt s={s} prompt="final-report" text="Fifty years. How was it? Two minutes of feedback helps the playtest." onSave={onSave} />
      <p className="review-empty">{REPORT_WORDS.epilogue}</p>
      {/* Leaving the report hangs the run in the hall of fame (state/hall.ts). */}
      <div className="final-page-leave">
        <button onClick={() => { hangInHall(s, report); runFinished(s, report, true); onContinue(); }}>Continue into the Epilogue →</button>
        {onNewCollege && (
          <NewCollegeButton
            note={REPORT_WORDS.newCollege}
            lost="its books close for good"
            onConfirm={() => { hangInHall(s, report); runFinished(s, report, false); onNewCollege(); }}
          />
        )}
      </div>
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
        <p>No new student organization petitioned this year.</p>
      ) : null}
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
        <Figure label="Tuition for the incoming class" value={`${money(decision.tuition)}/yr`} hint={FIGURE_HINTS.tuitionLocked} />
        <Figure label="Admit rate" value={pct(decision.admitRate)} hint={FIGURE_HINTS.admitRate} />
      </dl>
      <div className="modal-actions">
        <button onClick={() => onResolve([...approved])}>Open Year {s.clock.year + 1}</button>
      </div>
    </>
  );
}

function SummerView({ s, payload, act }: { s: GameState; payload: SummerPayload; act: (a: Action) => void }) {
  const decision = payload.decision ?? { tuition: payload.tuition, admitRate: payload.admitRate };
  return (
    <>
      <SummerSteps beat={payload.beat} final={payload.final} />
      {payload.beat === 0 && payload.final ? (
        <FinalReportBeat s={s} onContinue={() => act({ type: 'RESOLVE_SUMMER_BEAT' })} onSave={() => act({ type: 'SAVE_GAME' })} />
      ) : payload.beat === 0 ? (
        <ReviewBeat s={s} onContinue={(promises) => act({ type: 'RESOLVE_SUMMER_BEAT', promises })} onSave={() => act({ type: 'SAVE_GAME' })} />
      ) : payload.beat === 1 ? (
        // Answered on its own page (Plan 108, AdmissionsPage.tsx).
        <p>Admissions is open on its own page.</p>
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
  // Whether the guide's list carries the school yet (s.hasEnteredRankings).
  // The Standing beat renders for every school; the top-50 table only once
  // the school is on it.
  published?: boolean;
  onDismiss: () => void;
}) {
  const { rank, previousRank, movers, passed, passedBy, standings, others } = payload;
  const delta = previousRank === null ? null : previousRank - rank;

  return (
    <>
      <h2>{isFirstReveal ? 'The college enters the guide' : published ? 'Standing — the guide' : 'Standing'}</h2>
      <p>
        {isFirstReveal
          ? `${standings.find((r) => r.isPlayer)?.name ?? 'The college'} has entered the guide's top fifty, at #${rank}.`
          : published
            ? `This year's standings: the college is #${rank}.`
            : `The college ranks #${rank} of ${payload.field}.`}
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
          <h3>The largest moves</h3>
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
                  ? 'no college in the country is ahead'
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
          <RankingsTable rows={standings.map((r, i) => ({ ...r, place: i + 1 }))} lastYear />
        </>
      )}
      <div className="modal-actions">
        <button onClick={onDismiss}>Continue</button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------
// The milestone celebration (data/eventData.ts's MILESTONE_INTERRUPT_KINDS).
// It grants and asks nothing. The prestige figures are computed live with
// prestigeSystem.ts's own functions (the target now vs. without these
// milestones), so the contribution shown is a real reading of the model.
// Since Plan 95T a letter (InboxTab.tsx), with no Continue; a save with one
// standing as a stop shows it once, with it.
// ---------------------------------------------------------------------
export function MilestoneCelebrationView({ s, payload, onDismiss }: {
  s: GameState;
  payload: MilestonePayload;
  onDismiss?: () => void;
}) {
  const target = computePrestigeTarget(s);
  const withoutThese = prestigeTargetWithout(s, payload.keys);
  // From the figures as shown, so the three lines agree.
  const delta = prestigeShown(target) - prestigeShown(withoutThese);
  const single = payload.entries.length === 1 ? payload.entries[0] : null;

  return (
    <>
      <h2>{single ? single.headline : `${payload.entries.length} milestones reached`}</h2>
      {single && <p>{single.detail}</p>}

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
        {/* What the milestones add to where prestige is heading, not the
            target itself (Plan 98B). */}
        <div>
          <dt>Adds to where prestige is heading</dt>
          <dd className={delta > 0 ? 'milestone-gain' : ''}>{signed(delta, 1)}</dd>
        </div>
        <div>
          <dt>Prestige today</dt>
          <dd>{prestigeFigure(s.self.reputation)}</dd>
        </div>
      </dl>

      {onDismiss && (
        <div className="modal-actions">
          <button onClick={onDismiss}>Continue</button>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
// A research project has concluded (systems/research/researchSystem.ts). The
// completion is the event; an award is one of its results. It grants and asks
// nothing: everything shown has already landed. It reads the payload, not
// live state, so it stays true if a professor has since left or the facility
// been renamed. A letter since Plan 95T, as the celebration is.
// ---------------------------------------------------------------------
export function ResearchReportView({ s, report, onDismiss }: {
  s: GameState;
  report: InitiativeReport;
  onDismiss?: () => void;
}) {
  const depth = initiativeDepth(report.depth);

  return (
    <>
      <h2>{report.award ? `${report.topicName} concludes — and wins ${report.award.prizeName}` : `${report.topicName} concludes`}</h2>
      <p>
        {depth.name} · {report.labName} · {weeksShort(Math.round(report.years * WEEKS_PER_YEAR))} ·{' '}
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
          <dt>Breakthroughs <span className="outcome-note">(adds to prestige)</span></dt>
          <dd>{report.breakthroughs}</dd>
        </div>
        <div>
          <dt>Grant income <span className="outcome-note">(already banked)</span></dt>
          <dd>{money(report.grantIncome)}</dd>
        </div>
        {report.award && (
          <>
            <div>
              <dt>{report.award.facultyName}'s output <span className="outcome-note">(permanent, per prize)</span></dt>
              <dd>{signedPct(ACCLAIM_RESEARCH_BONUS)}</dd>
            </div>
            <div>
              <dt>Their salary <span className="outcome-note">(permanent, per prize)</span></dt>
              <dd>{signedPct(ACCLAIM_SALARY_PREMIUM)}</dd>
            </div>
            <div>
              <dt>Prizes to date <span className="outcome-note">(adds to prestige)</span></dt>
              <dd>{s.research.prizes}</dd>
            </div>
          </>
        )}
      </dl>

      {onDismiss && (
        <div className="modal-actions">
          <button onClick={onDismiss}>Continue</button>
        </div>
      )}
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
  const now = pillarValue(s, 'athletics');
  const without = pillarValue({
    ...s,
    orgs: { ...s.orgs, titles: s.orgs.titles.slice(0, -1) },
  }, 'athletics');
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
          <dt>Athletics</dt>
          {/* The athletics pillar (Plan 85B), which titles lift: what it
              moved by. */}
          <dd>{worth >= 0.05 ? `${signed(worth, 1)} to where it is heading` : 'already at its limit'}</dd>
        </div>
      </dl>

      <div className="modal-actions">
        <button onClick={onDismiss}>Continue</button>
      </div>
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
        The {payload.clubName} is the first of the college's sport clubs to be recognized. It plays intramurals
        for now; in a few years it may petition to go varsity, and there will be a department, a venue and a
        season behind it. The students have already started arguing about what the teams should be called —
        the colors are {institutionName(s.self)}'s own, but a name is something people shout.
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
          Another
        </button>
      </label>
      <div className="modal-actions">
        <button onClick={() => onResolve(mascot)}>Name them</button>
      </div>
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
      <h2>An Athletic Director</h2>
      <p>
        {s.orgs.teams.length === 1
          ? 'The college fields a varsity program now, and nobody is running it.'
          : `The college fields ${s.orgs.teams.length} varsity programs now, and nobody is running them.`}
        {' '}Three candidates have applied.
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
            <span className="ad-candidate-salary">{moneyShort(c.salary)}/yr</span>
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
            Another
          </button>
        </label>
      )}

      <button className="ad-decline" onClick={() => onResolve(null, mascot)}>
        Appoint nobody for now
      </button>
    </>
  );
}

// ---------------------------------------------------------------------
// A letter from the board (data/eventData.ts's OPENING_LETTERS). Only the
// first letter offers "I know the way", which skips the rest of the script.
// A letter no longer in the table (an old save) is put down quietly. A
// letter whose ask is a building has a door to the build menu (Plan 78B):
// it resolves the letter as Continue does, and the shell opens Build once
// the stop is answered (App.tsx).
// ---------------------------------------------------------------------
function LetterView({ s, id, onResolve, onOpenBuild }: {
  s: GameState;
  id: string;
  onResolve: (skipAll: boolean) => void;
  onOpenBuild?: () => void;
}) {
  const letter = findOpeningLetter(id);
  if (!letter) {
    return (
      <>
        <h2>A letter has been mislaid</h2>
        <p>Nothing has changed.</p>
        <div className="modal-actions">
          <button onClick={() => onResolve(false)}>Continue</button>
        </div>
      </>
    );
  }
  return (
    <>
      {/* Dated by the clock: a letter that waited on the college (Plan 55)
          can arrive in any year. */}
      <p className="letter-eyebrow">From the chair of the board · {gameDate(s.clock.year, s.clock.week)}</p>
      <h2>{letter.title}</h2>
      <p className="letter-body">{letter.body(s)}</p>
      <p className="letter-ask">
        <span className="letter-ask-label">{letter.done(s) ? 'Done' : 'To do'}</span>
        {letter.ask(s).text}
      </p>
      <div className="modal-actions letter-actions">
        <div className="modal-actions">
          {onOpenBuild && letterOpensBuild(s, id) ? (
            <>
              <button type="button" onClick={() => { onResolve(false); onOpenBuild(); }}>Continue and open Build</button>
              <button type="button" className="btn-quiet" onClick={() => onResolve(false)}>Continue</button>
            </>
          ) : (
            <button onClick={() => onResolve(false)}>Continue</button>
          )}
        </div>
        {/* On every letter, not only the first: a guided founding marks the
            first read at the start, so the opt-out has to travel with the rest. */}
        <button type="button" className="letter-skip" onClick={() => onResolve(true)}>
          Skip the chair's letters from here on
        </button>
      </div>
    </>
  );
}

// The Deans' year-end recommendations (Plan 59, eventSystem.ts): each
// school's plan to restaff its unstaffed courses (restaffing.ts), read live
// so it shows exactly what accepting commits.
function DeanRecommendationsView({ s, schools, onResolve }: { s: GameState; schools: string[]; onResolve: (accept: boolean) => void }) {
  const plans = schools.map((school) => ({
    school,
    dean: (s.seats ?? []).find((x) => x.seatId === 'dean' && x.school === school)?.holder,
    steps: restaffPlan(s, school),
  }));
  const hires = plans.flatMap((p) => p.steps.filter((x) => x.hire));
  const courseName = (id: string) => s.tech.find((t) => t.id === id)?.name ?? id;
  const facultyName = (id: string) => s.faculty.find((f) => f.id === id)?.name ?? s.candidates.find((c) => c.id === id)?.name ?? id;
  return (
    <>
      <h2>The Deans' recommendations</h2>
      <p>
        Some courses have no instructor.
        The Deans have found who can take them.
      </p>
      {plans.map((p) => (
        <section key={p.school} className="dean-plan">
          <h3>{p.school}{p.dean ? ` · Dean ${p.dean}` : ''}</h3>
          <ul>
            {p.steps.map((step) => (
              <li key={step.courseId}>
                <strong>{courseName(step.courseId)}</strong> — {facultyName(step.facultyId)}
                {step.hire ? ` (appointed from the market, ${money(step.hire.salary)}/yr)` : ' (already on the faculty)'}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className="event-choices">
        <button className="event-choice" onClick={() => onResolve(true)}>
          <span className="event-choice-label">
            Accept every recommendation
            <span className="event-choice-cost">{hires.length > 0 ? `${hires.length} appointment${hires.length === 1 ? '' : 's'}, ${moneyShort(hires.reduce((n, x) => n + x.hire!.salary, 0))}/yr` : 'no new salaries'}</span>
          </span>
        </button>
        <button className="event-choice" onClick={() => onResolve(false)}>
          <span className="event-choice-label">Not now<span className="event-choice-cost">the programs stay dark</span></span>
        </button>
      </div>
    </>
  );
}

// A letter to the President (Plan 32): one of the catalog's seismic events.
// "From the board" is kept for the distress ladder's letters (the inbox's,
// InboxTab.tsx). The clock waits on it; its choices are the inbox's
// (EventChoices.tsx).
function CatalogueLetterView({ s, instanceId, act }: { s: GameState; instanceId: string; act: (a: Action) => void }) {
  const p = catalogueOf(s).pending.find((x) => x.instanceId === instanceId);
  const e = p ? eventById(p.eventId) : undefined;
  if (!p || !e) {
    return (
      <>
        <h2>A letter has been mislaid</h2>
        <p>Nothing has changed.</p>
        <div className="modal-actions">
          <button onClick={() => act({ type: 'RESOLVE_CATALOGUE_EVENT', instanceId, choiceId: '' })}>Continue</button>
        </div>
      </>
    );
  }
  const text = fill(eventText(e, p), p.vars);
  return (
    <>
      <p className="letter-eyebrow">A letter to the President · {gameDate(s.clock.year, s.clock.week)}</p>
      <h2>{e.title ? fill(e.title, p.vars) : 'A letter to the President'}</h2>
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
        <h2>A matter set aside</h2>
        <p>The matter this concerned has lapsed. Nothing has changed.</p>
        <div className="modal-actions">
          <button onClick={onDismiss}>Continue</button>
        </div>
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
                  {cost > 0 ? moneyShort(-cost) : 'no cost'}
                </span>
              </span>
              <span className="event-choice-detail">
                {choice.describe(s, ctx)}
                {!affordable && ' — the college cannot cover this.'}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// What s.pendingInterrupt calls for (docs/architecture/interrupts.md): the
// Enter key for the read-and-continue stops, and the pages: the Final
// Report's, the summer's admissions and, opened from its letter, the
// specialization's. Every other stop is answered in the inbox
// (InterruptContent, below).
export default function InterruptModal({ s, act, onNewCollege, specializationOpen = false, onCloseSpecialization }: {
  s: GameState;
  act: (a: Action) => void;
  onNewCollege?: () => void;
  // The specialization's page (Plan 109), opened from its letter in the
  // inbox (App.tsx keeps whether it is open).
  specializationOpen?: boolean;
  onCloseSpecialization?: () => void;
}) {
  const interrupt = s.pendingInterrupt;

  // Enter continues the read-and-continue interrupts, each through its own
  // dedicated action; for a decision event it resolves with no choice
  // picked, never a paid one. Left out: the
  // summer's decision beats (their values live in local state), and the
  // athletic director (both). useHotkeys ignores Enter on a focused button
  // or input, so those keep their native behavior.
  useHotkeys((e) => {
    if (!isKey(e, 'answer') || !interrupt) return;
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
      // the summer's decision beats, decision events (Enter used to dismiss
      // one with no choice, dodging its consequence), the athletic
      // director, and anything unrecognised: no-op — see above.
    }
  }, interrupt !== null);

  if (!interrupt) return null;

  // The fiftieth summer's Final Report is a page, not a card (Plan 60): by
  // now the player may be running years at full speed, clicking through each
  // summer, and the end of the run (for now) has to stop them.
  const summer = interrupt.type === 'summer' ? interrupt.payload as SummerPayload : null;
  if (summer?.final && summer.beat === 0) {
    return (
      <div className="final-page" role="dialog" aria-modal="true" aria-label={REPORT_WORDS.title}>
        <div className="final-page-inner">
          <FinalReportBeat s={s} onContinue={() => act({ type: 'RESOLVE_SUMMER_BEAT' })} onNewCollege={onNewCollege} onSave={() => act({ type: 'SAVE_GAME' })} />
        </div>
      </div>
    );
  }

  // The summer's admissions is a page of its own (Plan 108).
  if (summer && admissionsPageUp(s)) return <AdmissionsPage key="admissions" s={s} act={act} />;

  // The specialization's page (Plan 109), over the inbox that holds its
  // letter: closed, the letter is where it was.
  if (interrupt.type === 'specialization' && specializationOpen) {
    const close = () => onCloseSpecialization?.();
    return (
      <SpecializationPage
        key="specialization"
        s={s}
        onClose={close}
        onResolve={(pillar) => { close(); act({ type: 'RESOLVE_SPECIALIZATION', pillar }); }}
      />
    );
  }

  // Every other stop is answered in the inbox (Plan 77, InboxTab.tsx),
  // which App.tsx opens on it and holds open until it is resolved.
  return null;
}

// The pending interrupt's content, as the inbox's reading pane shows it.
// It keeps the modal's card (`.modal`, with `.modal-inbox` placing it in
// the pane), so every view reads as it did over the map. `onOpenBuild` is a
// letter's door to the build menu (Plan 78B); `onOpenSpecialization` the
// specialization letter's to its page (Plan 109).
export function InterruptContent({ s, act, onOpenBuild, onOpenSpecialization }: {
  s: GameState; act: (a: Action) => void; onOpenBuild?: () => void; onOpenSpecialization?: () => void;
}) {
  const interrupt = s.pendingInterrupt;
  if (!interrupt) return null;
  const decision = interrupt.type === 'decision-event'
    ? interrupt.payload as { eventId: string; ctx: DecisionEventContext }
    : null;
  return (
    <div className={`modal modal-inbox modal-${modalWidth(interrupt)}`} data-interrupt={interrupt.type}>
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
      ) : interrupt.type === 'dean-recommendations' ? (
        <DeanRecommendationsView
          s={s}
          schools={(interrupt.payload as { schools: string[] }).schools}
          onResolve={(accept) => act({ type: 'RESOLVE_DEAN_RECOMMENDATIONS', accept })}
        />
      ) : interrupt.type === 'letter' ? (
        <LetterView
          s={s}
          id={(interrupt.payload as { id: string }).id}
          onResolve={(skipAll) => act({ type: 'RESOLVE_LETTER', skipAll })}
          onOpenBuild={onOpenBuild}
        />
      ) : interrupt.type === 'specialization' ? (
        <SpecializationLetter s={s} onOpen={onOpenSpecialization} onLater={() => act({ type: 'RESOLVE_SPECIALIZATION', pillar: null })} />
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
          <h2>{interruptBody().title}</h2>
          <p>{interruptBody().body}</p>
          <div className="modal-actions">
            <button onClick={() => act({ type: 'RESOLVE_INTERRUPT' })}>Continue</button>
          </div>
        </>
      )}
    </div>
  );
}
