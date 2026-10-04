import { useId, useState, type ReactNode } from 'react';
import type { Action } from '../state/actions';
import { officeOpen } from '../systems/administration/offices';
import { charterRefusal, foundTeamCost, foundTeamRefusal } from '../systems/administration/officeActions';
import type { BuildableStatus, GameState, GreekChapter, SatisfactionAttributes, StudentClub, StudentOrgBase } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import HelpHint from '../components/HelpHint';
import Figure from '../components/Figure';
import { FIGURE_HINTS, NEED_LABELS } from '../data/figureHints';
import { SECTION_HEADINGS } from '../data/statChips';
import { sectionAnchor } from '../components/sectionTarget';
import {
  HELLENIC_COUNCIL_HINT, clubCapacity, chapterCapacity, interestClubs, sportClubCapacity, sportClubs,
  hasStudentCenter, orgMembership, studentOrgUpkeep, varsityEligibleYear } from '../data/studentLifeData';
import { ATTRIBUTE_WEIGHTS, attributeDetail, studentLifeSatisfaction } from '../systems/satisfaction/satisfactionSystem';
import { DEMAND_SATISFACTION_THRESHOLD, DEMAND_URGENT_WEEKS, demandCopy } from '../data/demandData';
import { demandProgress, demandStakes } from '../systems/demands/demandSystem';
import { ProgressBar } from '../components/Progress';
import { DOWNTOWN_WORDS, districtGrowth, goodwillOf } from '../data/downtownData';
import { offCampusPlaces } from '../systems/satisfaction/satisfactionSystem';
import { count, fraction, gameDateOfWeek, money, moneyShort, satisfactionFigure, satisfactionShown, signed, weeksShort } from '../format';

const ATTRIBUTE_LABELS = NEED_LABELS;
const ATTRIBUTE_ORDER: Array<keyof SatisfactionAttributes> = ['academic', 'social', 'basicNeeds', 'health', 'housing'];

// ---------------------------------------------------------------------
// The student-life layer: clubs, Greek chapters, and what they do to
// satisfaction. That effect is read, not invented: clubs and chapters nudge
// satisfaction's target, so studentLifeSatisfaction (satisfactionSystem.ts)
// reruns the tick's computation without each source and reports the
// difference. Membership is display only; no system reads it.
// ---------------------------------------------------------------------

function OrgRow({ org, s, tag, note, action }: { org: StudentOrgBase; s: GameState; tag?: string; note?: string; action?: ReactNode }) {
  return (
    <li className="org-row">
      <span className="org-name">
        {org.name}
        {tag && <span className="org-tag">{tag}</span>}
      </span>
      <span className="org-meta">
        founded in Year {org.foundedYear} · {count(orgMembership(org, s))} members · {moneyShort(org.upkeepPerWeek)}/wk
        {note && <> · {note}</>}
      </span>
      {action}
    </li>
  );
}

// A sport club's row says when it may petition to go varsity, so a delayed
// department reads as awaited.
function varsityNote(club: StudentClub, s: GameState): string {
  const year = varsityEligibleYear(club);
  return year <= s.clock.year ? 'may petition to go varsity this year' : `may petition to go varsity in Year ${year}`;
}

// Shows both the per-source contribution and the target with and without
// the whole layer: they answer different questions.
// Where the asked-for building stands, in words; nothing while it is simply
// on offer.
const ASK_STATUS: Record<BuildableStatus, string> = {
  locked: ' (not yet open to build)',
  available: '',
  developing: ' (under construction)',
  done: ' (built)',
};


function StudentLifeEffect({ s }: { s: GameState }) {
  const effect = studentLifeSatisfaction(s);
  const upkeep = studentOrgUpkeep(s);
  // Satisfaction reads in whole points, so each layer's share is the move in
  // the target as shown, and the lines agree with the target beside them.
  const share = (contribution: number) => signed(satisfactionShown(effect.target) - satisfactionShown(effect.target - contribution));

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Effect on satisfaction</h2>
        <HelpHint
          align="end"
          text="Satisfaction drifts toward a target set by what the campus offers. Student organizations move that target, so these are the real points they are adding to it right now — the same figures that set satisfaction each week. The headline satisfaction number moves toward the target over the coming weeks."
        />
      </div>
      <dl>
        <Figure label={`Clubs (${effect.clubCount})`} value={share(effect.clubTargetContribution)} hint={FIGURE_HINTS.clubs} />
        <Figure label={`Greek chapters (${effect.chapterCount})`} value={share(effect.greekTargetContribution)} hint={FIGURE_HINTS.greek} />
        <Figure label={`Varsity athletics (${effect.teamCount})`} value={share(effect.athleticsTargetContribution)} hint={FIGURE_HINTS.varsity} />
        <Figure label="Satisfaction target" value={`${satisfactionFigure(effect.targetWithoutStudentLife)} → ${satisfactionFigure(effect.target)}`} hint={FIGURE_HINTS.satisfactionTarget} />
        <Figure label="Satisfaction today" value={satisfactionFigure(s.students.satisfaction)} hint={FIGURE_HINTS.satisfactionToday} />
        <Figure label="Weekly cost" value={`${money(upkeep)} (${money(upkeep * WEEKS_PER_YEAR)}/yr)`} hint={FIGURE_HINTS.orgCost} />
      </dl>
      {effect.totalTargetContribution <= 0.01 && (effect.clubCount > 0 || effect.chapterCount > 0 || effect.teamCount > 0) && (
        <p className="empty-note">
          Social satisfaction is already at its limit from the campus itself, so these organizations
          are adding nothing to the target right now — they will start to again the moment the campus
          grows past what its social facilities cover.
        </p>
      )}
    </section>
  );
}


// ---------------------------------------------------------------------
// The satisfaction dial: a 0..100 score as a filling ring, so the eye finds
// the low one without reading. A stroked circle with stroke-dasharray set to
// the filled fraction of its circumference. Color is banded (the app's
// ok/warn/bad tokens) because a score reads as fine / slipping / a problem.
// ---------------------------------------------------------------------
const DIAL_SIZE = 64;
const DIAL_STROKE = 7;
// The ring is cut into gauge ticks (Plan 90 I): an SVG mask of dashes over
// both circles, so the fill keeps its own dasharray and its transition.
const DIAL_TICKS = 20;
const DIAL_TICK_GAP = 2.4;

function dialBand(score: number): 'ok' | 'warn' | 'bad' {
  if (score >= 70) return 'ok';
  if (score >= 45) return 'warn';
  return 'bad';
}

// Full marks: the score as shown is 100 (Plan 90 I).
function dialFull(score: number, dormant: boolean): boolean {
  return !dormant && satisfactionShown(score) >= 100;
}

function SatisfactionDial({ score, dormant }: { score: number; dormant: boolean }) {
  const maskId = useId();
  const c = DIAL_SIZE / 2;
  const r = (DIAL_SIZE - DIAL_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const tick = circumference / DIAL_TICKS - DIAL_TICK_GAP;
  const filled = Math.max(0, Math.min(1, score / 100));
  const full = dialFull(score, dormant);
  const band = dormant ? 'dormant' : dialBand(score);
  // Start at twelve o'clock rather than three.
  const turn = `rotate(-90 ${c} ${c})`;

  return (
    <svg
      className={`satisfaction-dial ${band}${full ? ' full' : ''}`}
      width={DIAL_SIZE}
      height={DIAL_SIZE}
      viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
      aria-hidden="true"
    >
      <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={DIAL_SIZE} height={DIAL_SIZE}>
        {/* A gap centred on twelve o'clock, so the fill starts on a tick. */}
        <circle
          cx={c} cy={c} r={r} fill="none" stroke="#fff" strokeWidth={DIAL_STROKE + 2}
          strokeDasharray={`${tick.toFixed(3)} ${DIAL_TICK_GAP}`}
          strokeDashoffset={-(DIAL_TICK_GAP / 2)}
          transform={turn}
        />
      </mask>
      <g mask={`url(#${maskId})`}>
        <circle className="satisfaction-dial-track" cx={c} cy={c} r={r} strokeWidth={DIAL_STROKE} />
        <circle
          className="satisfaction-dial-fill"
          cx={c} cy={c} r={r}
          strokeWidth={DIAL_STROKE}
          strokeDasharray={`${(circumference * filled).toFixed(2)} ${circumference.toFixed(2)}`}
          transform={turn}
        />
      </g>
      {/* A thin ring inside the gauge; at full marks, a gold centre. */}
      <circle className="satisfaction-dial-centre" cx={c} cy={c} r={r - DIAL_STROKE / 2 - (full ? 2.5 : 4)} />
      <text className="satisfaction-dial-value" x={c} y={c} textAnchor="middle" dominantBaseline="central">
        {dormant ? '–' : satisfactionFigure(score)}
      </text>
    </svg>
  );
}

// One attribute's card: dial, name, weight, coverage line, and a collapsed
// building-by-building breakdown, all read from attributeDetail.
function AttributeCard({ s, attribute }: { s: GameState; attribute: keyof SatisfactionAttributes }) {
  const [open, setOpen] = useState(false);
  const detail = attributeDetail(s, attribute);
  const label = ATTRIBUTE_LABELS[attribute];
  // Housing counts beds and the other four count students served, so the
  // unit is named.
  const unit = attribute === 'housing' ? 'beds' : 'served';

  // Expanded state is reported by `aria-expanded` on the toggle, not a class.
  return (
    <li className="satisfaction-card">
      <div className="satisfaction-card-head">
        <SatisfactionDial score={detail.score} dormant={detail.dormant} />
        <div className="satisfaction-card-text">
          <span className="satisfaction-card-label">{label}</span>
          {dialFull(detail.score, detail.dormant) && <span className="satisfaction-card-full">Full marks</span>}
          {/* The need's share of the headline, as a multiplier tag (Plan 90 I). */}
          <span className="satisfaction-card-weight" title={`${ATTRIBUTE_WEIGHTS[attribute]}% of the satisfaction target`}>
            ×{(ATTRIBUTE_WEIGHTS[attribute] / 100).toFixed(2)}
          </span>
          <span className="satisfaction-card-coverage">
            {detail.dormant
              ? 'Not yet a need'
              : detail.neededForFullScore > 0
                // Not every student lives in (satisfactionSystem.ts's
                // expectedRatio), so housing says how many want a bed
                // (Plan 35: "350/175 beds" read as a contradiction).
                ? attribute === 'housing'
                  ? `${count(detail.totalServed)} beds, ${count(detail.neededForFullScore)} wanted`
                  : `${fraction(detail.totalServed, detail.neededForFullScore)} ${unit}`
                : `${count(detail.totalServed)} ${unit}`}
          </span>
        </div>
      </div>
      <button
        type="button"
        className="satisfaction-card-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide sources' : 'Show sources'}
      </button>
      {open && (
        <div className="satisfaction-card-detail">
          {detail.dormant ? (
            <p className="empty-note">Dormant — the campus has not yet reached the size where this need starts to matter.</p>
          ) : (
            <>
              {detail.contributors.length > 0 ? (
                <ul className="satisfaction-contributor-list">
                  {detail.contributors.map((c) => (
                    <li key={c.label}><span>{c.label}</span><span>{count(c.value)}</span></li>
                  ))}
                  <li className="satisfaction-contributor-total">
                    <span>Total {unit}</span>
                    <span>{count(detail.totalServed)}{detail.neededForFullScore > 0 ? `/${count(detail.neededForFullScore)}` : ''}</span>
                  </li>
                </ul>
              ) : (
                <p className="empty-note">Nothing built yet serves this need.</p>
              )}
              {detail.bonuses.length > 0 && (
                <ul className="satisfaction-contributor-list">
                  {detail.bonuses.map((b) => (
                    <li key={b.label}><span>{b.label}</span><span>{signed(b.value)}</span></li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}

// The per-attribute reading behind the headline, live off the campus rather
// than smoothed like s.students.satisfaction, so a facility finished this
// week shows immediately. Always on screen: it explains satisfaction from
// week one, long before any club exists.
function SatisfactionBreakdownPanel({ s }: { s: GameState }) {
  return (
    <section className="panel panel-span-2" {...sectionAnchor('students.breakdown')}>
      <div className="panel-head">
        <h2>{SECTION_HEADINGS['students.breakdown']}</h2>
        <HelpHint
          text="The five needs the satisfaction target is a weighted sum of, read live off the campus as it stands right now — not smoothed, so a building finished this week already shows here even while the headline number is still drifting toward its new target. Each dial fills toward 100; the multiplier under each name is how much of the headline number that need is worth (×0.20 is a fifth of it). Expand one to see exactly what is behind its score: every building serving that need, how many it serves and any other named contributor."
        />
      </div>
      <ul className="satisfaction-cards">
        {ATTRIBUTE_ORDER.map((attribute) => (
          <AttributeCard key={attribute} s={s} attribute={attribute} />
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------
// The outstanding demand (demandSystem.ts): what an unhappy student body
// asks of the institution, kept here so a dismissed modal is still visible.
// The stakes are read from the model (demandStakes runs the admissions
// funnel against each nudge), and progress uses the same reading the
// resolution does, so the bar cannot disagree with whether it is met.
// ---------------------------------------------------------------------
function StudentDemandPanel({ s }: { s: GameState }) {
  const demand = s.events.activeDemand;

  if (!demand) {
    return (
      <section className="panel">
        <h2>Student demands</h2>
        <p className="empty-note">
          No outstanding demands. Students ask the institution for something only when
          satisfaction falls below {DEMAND_SATISFACTION_THRESHOLD}.
        </p>
      </section>
    );
  }

  const copy = demandCopy(demand);
  const progress = demandProgress(s, demand);
  const stakes = demandStakes(s);
  const node = s.tech.find((t) => t.id === demand.askId);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Student demands</h2>
        <span className={`demand-deadline${progress.weeksLeft <= DEMAND_URGENT_WEEKS ? ' urgent' : ''}`}>
          {weeksShort(progress.weeksLeft)} left
        </span>
      </div>
      <p className="empty-note demand-grievance">{copy.grievance(demand.askName)}</p>
      <div className="demand-progress">
        <ProgressBar
          fraction={progress.fraction}
          label={fraction(progress.current, progress.target)}
          title={`${count(progress.current)} of ${count(progress.target)} ${copy.unit}`}
        />
      </div>
      <dl>
        <dt>
          The ask
          <HelpHint text="The bar above is what this need is served by today, against the total the students asked for. Finish the building and the demand clears itself; there is nothing to confirm." />
        </dt>
        <dd>{copy.ask(demand.askName)}{node ? ASK_STATUS[node.status] : ''}</dd>
        <dt>Deadline</dt>
        <dd>{gameDateOfWeek(demand.deadlineWeek)}</dd>
        <dt>If it is met</dt>
        <dd>
          satisfaction {satisfactionFigure(stakes.satisfactionNow)} → {satisfactionFigure(stakes.satisfactionIfMet)} ·
          {' '}{count(stakes.applicantsIfMet)} applicants
        </dd>
        <dt>If the deadline passes</dt>
        <dd>
          satisfaction {satisfactionFigure(stakes.satisfactionNow)} → {satisfactionFigure(stakes.satisfactionIfFailed)} ·
          {' '}{count(stakes.applicantsIfFailed)} applicants
        </dd>
      </dl>
      <p className="empty-note demand-footnote">
        Missing the deadline costs goodwill and the applicants word of mouth brings — the figures
        above, at next summer's funnel. Nothing else: satisfaction cannot fall below a floor, so an unaffordable
        demand left unmet stalls the college rather than sinking it.
      </p>
    </section>
  );
}

// The downtown (Plan 85H): at a college specialized in student life, the
// district's growth, what it meets of the needs, the town's goodwill and the
// festivals, all read off downtownData.ts.
function DowntownPanel({ s }: { s: GameState }) {
  const W = DOWNTOWN_WORDS;
  const festivals = s.downtown.festivals;
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{W.head}</h2>
        <HelpHint align="end" text={W.panelHelp} />
      </div>
      <dl>
        <Figure label={W.growth} value={`${Math.round(districtGrowth(s) * 100)}%`} hint={W.hintGrowth} />
        <Figure
          label={W.offCampusLabel}
          value={W.places(count(offCampusPlaces(s, 'social')), count(offCampusPlaces(s, 'basicNeeds')), count(offCampusPlaces(s, 'housing')))}
          hint={W.hintOffCampus}
        />
        <Figure label={W.goodwill} value={`${Math.round(goodwillOf(s))}`} hint={W.hintGoodwill} />
        <Figure label={W.festivalsLabel} value={W.festivals(s)} hint={W.hintFestivals} />
        <Figure label={W.lastLabel} value={W.lastFestival(festivals[festivals.length - 1])} hint={W.hintLast} />
      </dl>
    </section>
  );
}

// `clubs` is false before the first commencement (Plan 78B): the
// organizations' panels wait for it, and one note says so.
export default function StudentLifeTab({ s, act, clubs: clubsOpen = true }: { s: GameState; act?: (a: Action) => void; clubs?: boolean }) {
  const clubs: StudentClub[] = s.orgs.clubs;
  const chapters: GreekChapter[] = s.orgs.chapters;
  const pending = s.orgs.pendingPetitions;
  // Only clubs and chapters count; varsity teams live on AthleticsTab.tsx.
  const anyOrgs = clubs.length > 0 || chapters.length > 0;

  // The empty state covers only the organization panels; the satisfaction
  // breakdown always renders.
  const emptyOrgs = !anyOrgs && pending.length === 0;

  return (
    <div className="tab-content">
      <div className="student-life-columns">
        {/* First, and always: the reading that explains the headline. */}
        <SatisfactionBreakdownPanel s={s} />
        <StudentDemandPanel s={s} />
        {s.specialization === 'studentLife' && <DowntownPanel s={s} />}
        {!clubsOpen ? (
          <section className="panel">
            <h2>Student organizations</h2>
            <p className="empty-note">
              Clubs and chapters are listed here from the first commencement, once the students have a year behind them.
            </p>
          </section>
        ) : emptyOrgs ? (
          <section className="panel">
            <h2>Student organizations</h2>
            <p className="empty-note">
              {hasStudentCenter(s)
                ? 'No student organizations yet — students will start forming clubs of their own before long.'
                : 'No student organizations yet — build a Student Center to let students start forming clubs.'}
            </p>
          </section>
        ) : (
          <StudentLifeEffect s={s} />
        )}

        {clubsOpen && pending.length > 0 && (
          <section className="panel panel-span-2">
            <h2>Awaiting recognition</h2>
            <p className="empty-note">
              The President answers them together at the summer's Students step; none waits on a decision now.
            </p>
            <ul className="org-list">
              {pending.map((p) => (
                <li key={p.id} className="org-row">
                  <span className="org-name">
                    {p.name}
                    <span className="org-tag">{p.kind === 'club' ? 'club' : p.greekKind}</span>
                  </span>
                  <span className="org-meta">
                    {p.foundingMembers} founding members · {moneyShort(p.upkeepPerWeek)}/wk if recognized
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* The rosters are hidden while there are no organisations; the
            note above says so once. */}
        {clubsOpen && !emptyOrgs && (
          <>
          <section className="panel">
            <div className="panel-head">
              <h2>Clubs</h2>
              <span className="panel-count" title="Interest clubs and sport clubs are counted against separate limits: a sport club leaves the list when it goes varsity.">
                {interestClubs(s).length}/{clubCapacity(s)} · sport {sportClubs(s).length}/{sportClubCapacity(s)}
              </span>
            </div>
            {/* The Student Activities Office (Plan 89E): a club at once. */}
            {officeOpen(s, 'student-activities') && (
              <p className="office-action">
                <button type="button" className="btn-quiet" disabled={charterRefusal(s) !== null}
                  title={charterRefusal(s) ?? 'The Student Activities Office charters a club now, without waiting for one to petition'}
                  onClick={() => act?.({ type: 'CHARTER_CLUB' })}>
                  Charter a club
                </button>
                {charterRefusal(s) && <span className="outcome-note"> {charterRefusal(s)}</span>}
              </p>
            )}
            {clubs.length === 0 ? (
              <p className="empty-note">No recognized clubs.</p>
            ) : (
              <ul className="org-list">
                {clubs.map((c) => (
                  <OrgRow key={c.id} org={c} s={s} tag={c.sport ? 'sport' : undefined} note={c.sport ? varsityNote(c, s) : undefined}
                    action={c.sport && officeOpen(s, 'athletics-development') ? (
                      // The Athletics Development Office (Plan 89E): varsity
                      // without the petition, once the venue stands.
                      <button type="button" className="btn-quiet" disabled={foundTeamRefusal(s, c.id) !== null}
                        title={foundTeamRefusal(s, c.id) ?? `Found ${c.name} as a varsity team now, for ${money(foundTeamCost(s))}`}
                        onClick={() => act?.({ type: 'FOUND_TEAM', clubId: c.id })}>
                        Go varsity · {moneyShort(foundTeamCost(s))}
                      </button>
                    ) : undefined} />
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Greek chapters</h2>
              {s.orgs.hellenicCouncilApproved && (
                <span className="panel-count">{chapters.length}/{chapterCapacity(s)}</span>
              )}
            </div>
            {!s.orgs.hellenicCouncilApproved ? (
              <p className="empty-note">
                {s.orgs.hellenicCouncilOffered
                  ? 'The college has no Greek life. The Hellenic Council was declined, and the question does not come back.'
                  : HELLENIC_COUNCIL_HINT}
              </p>
            ) : chapters.length === 0 ? (
              <p className="empty-note">
                The Hellenic Council is chartered; no chapter has formed yet.
              </p>
            ) : (
              <ul className="org-list">
                {chapters.map((c) => (
                  <OrgRow
                    key={c.id}
                    org={c}
                    s={s}
                    tag={c.housed ? `${c.kind} · with a house` : c.kind}
                  />
                ))}
              </ul>
            )}
          </section>
          </>
        )}

      </div>
    </div>
  );
}
