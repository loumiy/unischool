import { useState } from 'react';
import type { GameState, GreekChapter, SatisfactionAttributes, StudentClub, StudentOrgBase } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import HelpHint from '../components/HelpHint';
import {
  HELLENIC_COUNCIL_HINT, clubCapacity, chapterCapacity,
  hasStudentCenter, orgMembership, studentOrgUpkeep,
} from '../data/studentLifeData';
import { ATTRIBUTE_WEIGHTS, attributeDetail, studentLifeSatisfaction } from '../systems/satisfaction/satisfactionSystem';
import { DEMAND_SATISFACTION_THRESHOLD, DEMAND_URGENT_WEEKS, demandCopy } from '../data/demandData';
import { demandProgress, demandStakes } from '../systems/demands/demandSystem';
import { ProgressBar } from '../components/Progress';

const ATTRIBUTE_LABELS: Record<keyof SatisfactionAttributes, string> = {
  academic: 'Academic',
  social: 'Social',
  basicNeeds: 'Basic Needs',
  health: 'Health',
  housing: 'Housing',
};
const ATTRIBUTE_ORDER: Array<keyof SatisfactionAttributes> = ['academic', 'social', 'basicNeeds', 'health', 'housing'];

// ---------------------------------------------------------------------
// The home for the student-life layer: the clubs the campus has grown, the
// Greek chapters on top of them, and — the part that stops the whole system
// feeling arbitrary — what any of it is actually doing to satisfaction.
//
// THAT NUMBER IS READ, NOT INVENTED. Satisfaction is a stock drifting
// toward a facilities-derived target; clubs and chapters nudge the TARGET,
// so there is no standing "+N satisfaction" to print. The panel below reads
// studentLifeSatisfaction (see satisfactionSystem.ts), which runs the very
// computation the weekly tick runs against a copy of the state with one
// source removed and reports the difference — the same way the milestone
// modal reads prestigeTargetWithout rather than printing authored text. If
// the social attribute is already clamped at its ceiling, the reading says
// zero, because zero is what the model is applying.
//
// Membership is display and flavour only: no system reads it (see
// data/studentLifeData.ts). It is a current number with no trend line and
// no sparkline, deliberately.
// ---------------------------------------------------------------------

function money(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
}

function OrgRow({ org, s, tag }: { org: StudentOrgBase; s: GameState; tag?: string }) {
  return (
    <li className="org-row">
      <span className="org-name">
        {org.name}
        {tag && <span className="org-tag">{tag}</span>}
      </span>
      <span className="org-meta">
        founded {org.foundedYear} · {orgMembership(org, s).toLocaleString()} members · {money(org.upkeepPerWeek)}/wk
      </span>
    </li>
  );
}

// The satisfaction reading. Deliberately shows BOTH shapes the design
// allows — the per-source contribution and the target with and without the
// whole layer — because they answer different questions: "is Greek life
// pulling its weight against clubs" and "what would happen if all of this
// went away".
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
// THE SATISFACTION DIAL. One attribute's 0..100 score drawn as a ring that
// fills — the shape a bounded score wants, and the one thing a row of five
// numbers could never do: let the eye find the low one without reading.
//
// Plain inline SVG, like every other drawing in this app (see
// buildingMotifs.tsx's house rule). The arc is a stroked circle with
// stroke-dasharray set to the filled fraction of its own circumference,
// rotated so it starts at twelve o'clock — no arc-path maths, and it stays
// correct at any radius because the dash is computed from the radius.
//
// Colour is banded rather than continuous: a score is read as "fine /
// slipping / a problem", and three bands say that where a smooth gradient
// only says "some colour". The bands are the app's existing ok/warn/bad
// tokens, so this panel agrees with every other health reading on screen.
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
        // Start the fill at twelve o'clock rather than at three, where a
        // stroked circle's dash otherwise begins.
        transform={`rotate(-90 ${DIAL_SIZE / 2} ${DIAL_SIZE / 2})`}
      />
      <text className="satisfaction-dial-value" x={DIAL_SIZE / 2} y={DIAL_SIZE / 2} textAnchor="middle" dominantBaseline="central">
        {dormant ? '–' : Math.round(score)}
      </text>
    </svg>
  );
}

// One attribute's CARD: the dial, the attribute's name, how much of the
// headline number it is worth, a one-line reading of the coverage behind
// the score — and, still collapsed by default, exactly what is behind it,
// building by building (the disclosure this panel has always had, kept
// verbatim because it is the part that makes the score checkable).
//
// Everything here is read from attributeDetail rather than reauthored —
// see satisfactionSystem.ts's own note on why.
function AttributeCard({ s, attribute }: { s: GameState; attribute: keyof SatisfactionAttributes }) {
  const [open, setOpen] = useState(false);
  const detail = attributeDetail(s, attribute);
  const label = ATTRIBUTE_LABELS[attribute];
  // The coverage line. Housing counts BEDS and the other four count
  // students served (see satisfactionSystem.ts's one deliberate exception),
  // so the unit is named rather than left to be inferred from two numbers.
  const unit = attribute === 'housing' ? 'beds' : 'served';

  return (
    <li className={`satisfaction-card${open ? ' open' : ''}`}>
      <div className="satisfaction-card-head">
        <SatisfactionDial score={detail.score} dormant={detail.dormant} />
        <div className="satisfaction-card-text">
          <span className="satisfaction-card-label">{label}</span>
          {/* How much of the headline number this attribute is worth. Kept
              to two words so it never wraps inside a card narrow enough for
              five to sit in a row; the panel's help text spells it out. */}
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

// The per-attribute reading behind the headline number and the target above:
// each attribute is read live off the campus as it stands right now — not
// smoothed the way s.students.satisfaction itself is (see
// satisfactionSystem.ts), so a facility that finished this week shows up
// here immediately even while "Satisfaction today" is still drifting
// toward its new target.
//
// ALWAYS ON SCREEN, at every stage of a run. It used to sit below an early
// return that fired whenever the campus had no clubs and no pending
// petitions — which is the first ten to fifteen years of most runs and the
// whole of some — so the one panel that explains what satisfaction IS was
// hidden for exactly as long as a player most needed it, and appeared, for
// no visible reason, the week a chess club was recognised. It is the first
// thing on the tab now (see StudentLifeTab below).
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
// THE OUTSTANDING DEMAND (see systems/demands/demandSystem.ts). The
// counterweight to everything else on this screen: clubs are what a happy
// student body gives the institution, a demand is what an unhappy one asks
// of it. It lives here rather than in a stream of its own so that a player
// who dismissed the raising modal can still see what is outstanding, what
// it will take, and how long they have.
//
// The stakes are read from the model exactly as the club panel above reads
// its contribution: the satisfaction figures are the nudges the demand
// system would apply, and the applicant figures come from running the
// shipped admissions funnel at today's policy against each of them (see
// demandStakes). Nothing here is authored except the grievance itself.
//
// Progress is the same reading the resolution runs on — servedPopulation
// for the attribute, or capacity for a housing demand — so the bar cannot
// disagree with whether the demand is actually met.
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
  // Varsity teams no longer show on this tab (see AthleticsTab.tsx), so
  // their existence alone must not keep this tab out of its own empty
  // state — only clubs and chapters (this tab's actual content) do.
  const anyOrgs = clubs.length > 0 || chapters.length > 0;

  // THE EMPTY STATE IS NOW ONLY THE ORGANISATIONS' OWN. It used to be the
  // whole TAB's: a campus with no clubs and no pending petitions returned
  // early, taking the satisfaction breakdown down with it. That is the
  // first ten to fifteen founding years of most runs and the whole of some
  // — precisely the stretch where a player is trying to work out what
  // satisfaction responds to — and it meant the panel appeared for the
  // first time the week a chess club was recognised, as if the club had
  // summoned it. The breakdown is campus-wide and true from week one, so it
  // renders unconditionally below; only the two organisation panels and the
  // clubs-vs-chapters contribution reading (which genuinely has nothing to
  // report with no organisations) collapse to a note.
  const emptyOrgs = !anyOrgs && pending.length === 0;

  return (
    <div className="tab-content">
      <div className="student-life-columns">
        {/* First, and always: the reading that explains the headline
            number, whatever stage the campus is at. */}
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

        {/* The two rosters, hidden entirely while the campus has no
            organisations at all — the single note above says it once,
            and two more panels each saying "none" says nothing further. */}
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
                  <OrgRow key={c.id} org={c} s={s} tag={c.sport ? 'sport' : undefined} />
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
