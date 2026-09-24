import { useState } from 'react';
import type { GameState, GreekChapter, SatisfactionAttributes, StudentClub, StudentOrgBase } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import HelpHint from '../components/HelpHint';
import {
  HELLENIC_COUNCIL_HINT, clubCapacity, chapterCapacity,
  hasStudentCenter, orgMembership, studentOrgUpkeep, varsityEligibleYear } from '../data/studentLifeData';
import { ATTRIBUTE_WEIGHTS, attributeDetail, studentLifeSatisfaction } from '../systems/satisfaction/satisfactionSystem';
import { DEMAND_SATISFACTION_THRESHOLD, DEMAND_URGENT_WEEKS, demandCopy } from '../data/demandData';
import { demandProgress, demandStakes } from '../systems/demands/demandSystem';
import { ProgressBar } from '../components/Progress';
import { money } from '../format';

const ATTRIBUTE_LABELS: Record<keyof SatisfactionAttributes, string> = {
  academic: 'Academic',
  social: 'Social',
  basicNeeds: 'Basic Needs',
  health: 'Health',
  housing: 'Housing',
};
const ATTRIBUTE_ORDER: Array<keyof SatisfactionAttributes> = ['academic', 'social', 'basicNeeds', 'health', 'housing'];

// ---------------------------------------------------------------------
// The student-life layer: clubs, Greek chapters, and what they do to
// satisfaction. That effect is read, not invented: clubs and chapters nudge
// satisfaction's target, so studentLifeSatisfaction (satisfactionSystem.ts)
// reruns the tick's computation without each source and reports the
// difference. Membership is display only; no system reads it.
// ---------------------------------------------------------------------

function OrgRow({ org, s, tag, note }: { org: StudentOrgBase; s: GameState; tag?: string; note?: string }) {
  return (
    <li className="org-row">
      <span className="org-name">
        {org.name}
        {tag && <span className="org-tag">{tag}</span>}
      </span>
      <span className="org-meta">
        founded {org.foundedYear} · {orgMembership(org, s).toLocaleString()} members · {money(org.upkeepPerWeek)}/wk
        {note && <> · {note}</>}
      </span>
    </li>
  );
}

// A sport club's row says when it may petition to go varsity, so a delayed
// department reads as awaited.
function varsityNote(club: StudentClub, s: GameState): string {
  const year = varsityEligibleYear(club);
  return year <= s.clock.year ? 'may petition to go varsity this year' : `may petition to go varsity in year ${year}`;
}

// Shows both the per-source contribution and the target with and without
// the whole layer: they answer different questions.
function StudentLifeEffect({ s }: { s: GameState }) {
  const effect = studentLifeSatisfaction(s);
  const upkeep = studentOrgUpkeep(s);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Effect on Satisfaction</h2>
        <HelpHint
          align="end"
          text="Satisfaction is a stock that drifts toward a target set by what the campus offers. Student organisations move that target, so these are the real points they are adding to it right now — read from the same computation the weekly tick runs, not a separate tally. The headline satisfaction number follows the target over the following weeks."
        />
      </div>
      <dl>
        <dt>Clubs ({effect.clubCount})</dt>
        <dd>{effect.clubTargetContribution > 0 ? '+' : ''}{effect.clubTargetContribution.toFixed(2)}</dd>
        <dt>Greek chapters ({effect.chapterCount})</dt>
        <dd>{effect.greekTargetContribution > 0 ? '+' : ''}{effect.greekTargetContribution.toFixed(2)}</dd>
        <dt>Varsity athletics ({effect.teamCount})</dt>
        <dd>{effect.athleticsTargetContribution > 0 ? '+' : ''}{effect.athleticsTargetContribution.toFixed(2)}</dd>
        <dt>Satisfaction target</dt>
        <dd>{effect.targetWithoutStudentLife.toFixed(1)} → {effect.target.toFixed(1)}</dd>
        <dt>Satisfaction today</dt>
        <dd>{s.students.satisfaction.toFixed(1)}</dd>
        <dt>Weekly cost</dt>
        <dd>{money(upkeep)} ({money(upkeep * WEEKS_PER_YEAR)}/yr)</dd>
      </dl>
      {effect.totalTargetContribution <= 0.01 && (effect.clubCount > 0 || effect.chapterCount > 0 || effect.teamCount > 0) && (
        <p className="empty-note">
          Social satisfaction is already at its ceiling from the campus itself, so these organisations
          are adding nothing to the target right now — they will start to again the moment the campus
          grows past what its social facilities cover.
        </p>
      )}
    </section>
  );
}

function money2(v: number): string {
  return v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
}

// ---------------------------------------------------------------------
// The satisfaction dial: a 0..100 score as a filling ring, so the eye finds
// the low one without reading. A stroked circle with stroke-dasharray set to
// the filled fraction of its circumference. Colour is banded (the app's
// ok/warn/bad tokens) because a score reads as fine / slipping / a problem.
// ---------------------------------------------------------------------
const DIAL_SIZE = 64;
const DIAL_STROKE = 7;

function dialBand(score: number): 'ok' | 'warn' | 'bad' {
  if (score >= 70) return 'ok';
  if (score >= 45) return 'warn';
  return 'bad';
}

function SatisfactionDial({ score, dormant }: { score: number; dormant: boolean }) {
  const r = (DIAL_SIZE - DIAL_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(1, score / 100));
  const band = dormant ? 'dormant' : dialBand(score);

  return (
    <svg
      className={`satisfaction-dial ${band}`}
      width={DIAL_SIZE}
      height={DIAL_SIZE}
      viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
      aria-hidden="true"
    >
      <circle
        className="satisfaction-dial-track"
        cx={DIAL_SIZE / 2} cy={DIAL_SIZE / 2} r={r}
        strokeWidth={DIAL_STROKE}
      />
      <circle
        className="satisfaction-dial-fill"
        cx={DIAL_SIZE / 2} cy={DIAL_SIZE / 2} r={r}
        strokeWidth={DIAL_STROKE}
        strokeDasharray={`${(circumference * filled).toFixed(2)} ${circumference.toFixed(2)}`}
        // Start the fill at twelve o'clock rather than three.
        transform={`rotate(-90 ${DIAL_SIZE / 2} ${DIAL_SIZE / 2})`}
      />
      <text className="satisfaction-dial-value" x={DIAL_SIZE / 2} y={DIAL_SIZE / 2} textAnchor="middle" dominantBaseline="central">
        {dormant ? '–' : Math.round(score)}
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
          {/* Two words, so it never wraps in a narrow card. */}
          <span className="satisfaction-card-weight">{ATTRIBUTE_WEIGHTS[attribute]}% weight</span>
          <span className="satisfaction-card-coverage">
            {detail.dormant
              ? 'Not yet a need'
              : detail.neededForFullScore > 0
                ? `${Math.round(detail.totalServed).toLocaleString()} / ${detail.neededForFullScore.toLocaleString()} ${unit}`
                : `${Math.round(detail.totalServed).toLocaleString()} ${unit}`}
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
            <p className="empty-note">Dormant — the campus hasn&rsquo;t crossed the population where this need starts to matter yet.</p>
          ) : (
            <>
              {detail.contributors.length > 0 ? (
                <ul className="satisfaction-contributor-list">
                  {detail.contributors.map((c) => (
                    <li key={c.label}><span>{c.label}</span><span>{Math.round(c.value).toLocaleString()}</span></li>
                  ))}
                  <li className="satisfaction-contributor-total">
                    <span>Total {unit}</span>
                    <span>{detail.totalServed.toLocaleString()}{detail.neededForFullScore > 0 ? ` / ${detail.neededForFullScore.toLocaleString()}` : ''}</span>
                  </li>
                </ul>
              ) : (
                <p className="empty-note">Nothing built yet serves this need.</p>
              )}
              {detail.bonuses.length > 0 && (
                <ul className="satisfaction-contributor-list">
                  {detail.bonuses.map((b) => (
                    <li key={b.label}><span>{b.label}</span><span>{money2(b.value)}</span></li>
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
    <section className="panel panel-span-2">
      <div className="panel-head">
        <h2>Satisfaction Breakdown</h2>
        <HelpHint
          text="The five attributes the satisfaction target is a weighted sum of, read live off the campus as it stands right now — not smoothed, so a building finished this week already shows here even while the headline number is still drifting toward its new target. Each dial fills toward 100; the percentage under each name is how much of the headline number that attribute is worth. Expand one to see exactly what's behind its score: every building serving that need, how many it serves, and any other named contributor."
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
        <h2>Student Demands</h2>
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
        <h2>Student Demands</h2>
        <span className={`demand-deadline${progress.weeksLeft <= DEMAND_URGENT_WEEKS ? ' urgent' : ''}`}>
          {progress.weeksLeft} week{progress.weeksLeft === 1 ? '' : 's'} left
        </span>
      </div>
      <p className="empty-note demand-grievance">{copy.grievance(demand.askName)}</p>
      <div className="demand-progress">
        <ProgressBar
          fraction={progress.fraction}
          label={`${Math.round(progress.current).toLocaleString()} / ${Math.round(progress.target).toLocaleString()}`}
          title={`${Math.round(progress.current).toLocaleString()} of ${Math.round(progress.target).toLocaleString()} ${copy.unit}`}
        />
      </div>
      <dl>
        <dt>
          The ask
          <HelpHint text="Progress above is read off the same campus state the demand resolves against — what this need serves today, against the total the demand asks for. Finish the building and the demand clears itself; there is nothing to confirm." />
        </dt>
        <dd>{copy.ask(demand.askName)}{node ? ` (${node.status})` : ''}</dd>
        <dt>Deadline</dt>
        <dd>year {Math.floor((demand.deadlineWeek - 1) / WEEKS_PER_YEAR) + 1}, week {((demand.deadlineWeek - 1) % WEEKS_PER_YEAR) + 1}</dd>
        <dt>If it is met</dt>
        <dd>
          satisfaction {stakes.satisfactionNow.toFixed(1)} → {stakes.satisfactionIfMet.toFixed(1)} ·
          {' '}{stakes.applicantsIfMet.toLocaleString()} applicants
        </dd>
        <dt>If the deadline passes</dt>
        <dd>
          satisfaction {stakes.satisfactionNow.toFixed(1)} → {stakes.satisfactionIfFailed.toFixed(1)} ·
          {' '}{stakes.applicantsIfFailed.toLocaleString()} applicants
        </dd>
      </dl>
      <p className="empty-note demand-footnote">
        Missing the deadline costs goodwill and the applicants word of mouth brings — the figures
        above, at next summer&rsquo;s funnel. Nothing else: satisfaction is floored, so an unaffordable
        demand left unmet stalls the school rather than sinking it.
      </p>
    </section>
  );
}

export default function StudentLifeTab({ s }: { s: GameState }) {
  const clubs: StudentClub[] = s.orgs.clubs;
  const chapters: GreekChapter[] = s.orgs.chapters;
  const pending = s.orgs.pendingPetitions;
  // Only clubs and chapters count; varsity teams live on AthleticsTab.tsx.
  const anyOrgs = clubs.length > 0 || chapters.length > 0;

  // The empty state covers only the organisation panels; the satisfaction
  // breakdown always renders.
  const emptyOrgs = !anyOrgs && pending.length === 0;

  return (
    <div className="tab-content">
      <div className="student-life-columns">
        {/* First, and always: the reading that explains the headline. */}
        <SatisfactionBreakdownPanel s={s} />
        <StudentDemandPanel s={s} />
        {emptyOrgs ? (
          <section className="panel">
            <h2>Student Organisations</h2>
            <p className="empty-note">
              {hasStudentCenter(s)
                ? 'No student organisations yet — students will start forming clubs of their own before long.'
                : 'No student organisations yet — build a student center to let students start forming clubs.'}
            </p>
          </section>
        ) : (
          <StudentLifeEffect s={s} />
        )}

        {pending.length > 0 && (
          <section className="panel panel-span-2">
            <h2>Awaiting Recognition</h2>
            <p className="empty-note">
              Answered together at the summer admissions decision — nothing here interrupts play.
            </p>
            <ul className="org-list">
              {pending.map((p) => (
                <li key={p.id} className="org-row">
                  <span className="org-name">
                    {p.name}
                    <span className="org-tag">{p.kind === 'club' ? 'club' : p.greekKind}</span>
                  </span>
                  <span className="org-meta">
                    {p.foundingMembers} founding members · {money(p.upkeepPerWeek)}/wk if recognised
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* The rosters are hidden while there are no organisations; the
            note above says so once. */}
        {!emptyOrgs && (
          <>
          <section className="panel">
            <div className="panel-head">
              <h2>Clubs</h2>
              <span className="panel-count">{clubs.length} / {clubCapacity(s)}</span>
            </div>
            {clubs.length === 0 ? (
              <p className="empty-note">No recognised clubs.</p>
            ) : (
              <ul className="org-list">
                {clubs.map((c) => (
                  <OrgRow key={c.id} org={c} s={s} tag={c.sport ? 'sport' : undefined} note={c.sport ? varsityNote(c, s) : undefined} />
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Greek Chapters</h2>
              {s.orgs.hellenicCouncilApproved && (
                <span className="panel-count">{chapters.length} / {chapterCapacity(s)}</span>
              )}
            </div>
            {!s.orgs.hellenicCouncilApproved ? (
              <p className="empty-note">
                {s.orgs.hellenicCouncilOffered
                  ? 'This school has no Greek life. The Hellenic Council was declined, and the question does not come back.'
                  : HELLENIC_COUNCIL_HINT}
              </p>
            ) : chapters.length === 0 ? (
              <p className="empty-note">
                The Hellenic Council is chartered; no chapter currently holds one.
              </p>
            ) : (
              <ul className="org-list">
                {chapters.map((c) => (
                  <OrgRow
                    key={c.id}
                    org={c}
                    s={s}
                    tag={c.housed ? `${c.kind} · housed` : c.kind}
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
