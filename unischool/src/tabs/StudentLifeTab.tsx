import { Fragment, useState } from 'react';
import type { GameState, GreekChapter, StudentClub, StudentOrgBase } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import HelpHint from '../components/HelpHint';
import {
  HELLENIC_COUNCIL_HINT, clubCapacity, chapterCapacity, hasStudentCenter,
  orgMembership, studentOrgUpkeep,
} from '../data/studentLifeData';
import { studentLifeSatisfaction } from '../systems/satisfaction/satisfactionSystem';
import { DEMAND_SATISFACTION_THRESHOLD, DEMAND_URGENT_WEEKS, demandCopy } from '../data/demandData';
import { demandProgress, demandStakes } from '../systems/demands/demandSystem';
import { ProgressBar } from '../components/Progress';

const ATTRIBUTE_LABELS: Record<string, string> = {
  academic: 'Academic (library)',
  social: 'Social (student center, rec, quad, student orgs)',
  basicNeeds: 'Basic needs (dining)',
  health: 'Health (counseling center)',
  infrastructure: 'Infrastructure (parking)',
};

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
  const [showBreakdown, setShowBreakdown] = useState(false);
  const breakdown = s.students.satisfactionBreakdown;

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
        <dt>Satisfaction target</dt>
        <dd>{effect.targetWithoutStudentLife.toFixed(1)} → {effect.target.toFixed(1)}</dd>
        <dt>
          Satisfaction today{' '}
          <button className="satisfaction-toggle" onClick={() => setShowBreakdown((v) => !v)}>
            {showBreakdown ? 'hide breakdown ▲' : 'breakdown ▼'}
          </button>
        </dt>
        <dd>{s.students.satisfaction.toFixed(1)}</dd>
        <dt>Weekly cost</dt>
        <dd>{money(upkeep)} ({money(upkeep * WEEKS_PER_YEAR)}/yr)</dd>
      </dl>
      {showBreakdown && (
        <dl className="satisfaction-breakdown">
          {(Object.keys(breakdown) as Array<keyof typeof breakdown>).map((key) => (
            <Fragment key={key}>
              <dt>{ATTRIBUTE_LABELS[key]}</dt>
              <dd>{Math.round(breakdown[key])}</dd>
            </Fragment>
          ))}
        </dl>
      )}
      {effect.totalTargetContribution <= 0.01 && (effect.clubCount > 0 || effect.chapterCount > 0) && (
        <p className="empty-note">
          Social satisfaction is already at its ceiling from the campus itself, so these organisations
          are adding nothing to the target right now — they will start to again the moment the campus
          grows past what its social facilities cover.
        </p>
      )}
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
  const anyOrgs = clubs.length > 0 || chapters.length > 0;

  // The empty state has to read sensibly for the ten to fifteen founding
  // years before a student center exists — which is most of the early game,
  // and the whole of some runs.
  if (!anyOrgs && pending.length === 0) {
    return (
      <div className="tab-content">
        <div className="student-life-columns">
          <StudentDemandPanel s={s} />
          <section className="panel">
            <h2>Student Organisations</h2>
            <p className="empty-note">
              {hasStudentCenter(s)
                ? 'No student organisations yet — students will start forming clubs of their own before long.'
                : 'No student organisations yet — build a student center to let students start forming clubs.'}
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="student-life-columns">
        <StudentDemandPanel s={s} />
        <StudentLifeEffect s={s} />

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

        <section className="panel">
          <div className="panel-head">
            <h2>Clubs</h2>
            <span className="panel-count">{clubs.length} / {clubCapacity(s)}</span>
          </div>
          {clubs.length === 0 ? (
            <p className="empty-note">No recognised clubs.</p>
          ) : (
            <ul className="org-list">
              {clubs.map((c) => <OrgRow key={c.id} org={c} s={s} />)}
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
      </div>
    </div>
  );
}
