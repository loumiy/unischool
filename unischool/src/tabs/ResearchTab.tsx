import { useMemo, useState } from 'react';
import type { Action } from '../state/actions';
import type { Buildable, Faculty, GameState, Initiative } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import {
  availableScholars, initiativeDepth, initiativeOffers,
  initiativeWeeklyOutput, interdisciplinaryBonus, teamStrength,
  type InitiativeOffer,
} from '../data/researchData';
import { researchTopic } from '../data/researchTopics';
import { planCommitmentCoverage } from '../systems/techtree/techSystem';
import { researchSchools } from '../data/techData';
import FacultyPortrait, { portraitOf } from '../components/FacultyPortrait';
import HelpHint from '../components/HelpHint';
import { rankBy } from '../systems/rivals/rivalsSystem';
import { money } from '../format';

// =====================================================================
// Research, as a screen. Its own tab because Curriculum is where
// `teaching` lives, so Research being where `research` lives makes the two
// faculty stats mean different things. One panel per facility, running or
// vacant; a vacant lab is idle capital the player should see.
// =====================================================================

function years(weeks: number): string {
  const y = weeks / WEEKS_PER_YEAR;
  return y < 1 ? `${weeks} weeks` : `${Math.round(y * 10) / 10} yr`;
}

// A participant. Same furniture as the curriculum's instructor picker, but
// showing research rather than teaching.
function ScholarRow(
  { f, onRemove }:
  { f: Faculty; onRemove?: () => void },
) {
  return (
    <div className="scholar-row">
      <FacultyPortrait f={portraitOf(f)} size={32} />
      <span className="scholar-body">
        <span className="scholar-name">{f.name}</span>
        <span className="scholar-field">{f.field}</span>
      </span>
      <span className="scholar-stat" title={`Research ${f.research} of a possible ${f.researchPotential}`}>
        <span className="scholar-stat-label">Research</span>
        <span className="scholar-bar-track">
          <span className="scholar-bar-headroom" style={{ width: `${f.researchPotential}%` }} />
          <span className="scholar-bar-fill" style={{ width: `${f.research}%` }} />
        </span>
        <span className="scholar-stat-value">{f.research}</span>
      </span>
      {onRemove && (
        <button type="button" className="scholar-drop" onClick={onRemove} aria-label={`Remove ${f.name}`}>✕</button>
      )}
    </div>
  );
}

// A facility with work in it: what, by whom, how far along, and how many
// breakthroughs it has banked (which decides whether it can win an award).
function RunningPanel(
  { s, act, lab, initiative }:
  { s: GameState; act: (a: Action) => void; lab: Buildable; initiative: Initiative },
) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const topic = researchTopic(initiative.topicId);
  const depth = initiativeDepth(initiative.depth);
  const team = s.faculty.filter((f) => initiative.participantIds.includes(f.id));
  const elapsed = initiative.weeksTotal - initiative.weeksRemaining;
  const fraction = initiative.weeksTotal > 0 ? elapsed / initiative.weeksTotal : 0;
  const output = initiativeWeeklyOutput(s, team, depth);
  const fields = new Set(team.map((f) => f.field));

  return (
    <section className="facility-panel running">
      <header className="facility-head">
        <span className="facility-name">
          {lab.name}
          <span className="facility-depth">{depth.name} · {years(initiative.weeksTotal)}</span>
          {/* Said once, about the project, with the multiplier. */}
          {fields.size > 1 && (
            <span className="facility-cross" title={`${fields.size} disciplines on the team`}>
              interdisciplinary ×{interdisciplinaryBonus(team).toFixed(2)}
            </span>
          )}
        </span>
        <button
          type="button"
          className={`facility-cancel${confirmCancel ? ' armed' : ''}`}
          onClick={() => {
            if (!confirmCancel) { setConfirmCancel(true); return; }
            act({ type: 'CANCEL_INITIATIVE', labId: lab.id });
          }}
          onBlur={() => setConfirmCancel(false)}
        >
          {confirmCancel ? 'Confirm — funding is forfeit' : 'Wind up'}
        </button>
      </header>

      <h3 className="facility-topic">{topic?.name ?? 'Unknown project'}</h3>

      <div className="facility-team">
        {team.length === 0
          ? <p className="empty-note">Nobody is left on this project.</p>
          : team.map((f) => <ScholarRow key={f.id} f={f} />)}
      </div>

      <div className="facility-progress">
        <span className="facility-track">
          <span className="facility-fill" style={{ width: `${Math.round(fraction * 100)}%` }} />
        </span>
        <span className="facility-progress-meta">
          <span>{elapsed} of {initiative.weeksTotal} weeks</span>
          <span>
            <b>{initiative.breakthroughs}</b> {initiative.breakthroughs === 1 ? 'breakthrough' : 'breakthroughs'} banked
            {initiative.publications > 0 && ` · ${initiative.publications} published`}
          </span>
          <span className="facility-rate">{output.toFixed(1)} /wk</span>
        </span>
      </div>
    </section>
  );
}

// A vacant facility and its offer set: one card per depth tier, each with a
// topic this school could lead.
function VacantPanel(
  { s, act, lab }:
  { s: GameState; act: (a: Action) => void; lab: Buildable },
) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<InitiativeOffer | null>(null);
  const [team, setTeam] = useState<string[]>([]);

  // The offers belong to the facility (initiativeOffers reads its field).
  const offers = useMemo(() => initiativeOffers(s, lab.id), [s, lab.id]);

  function choose(offer: InitiativeOffer) {
    setPicked(offer);
    setTeam(offer.suggested.slice(0, offer.depth.participants).map((f) => f.id));
  }

  const chosenTeam = s.faculty.filter((f) => team.includes(f.id));
  const coversFields = picked
    ? picked.topic.fields.every((field) => chosenTeam.some((f) => f.field === field))
    : false;
  const ready = picked !== null
    && chosenTeam.length === picked.depth.participants
    && coversFields
    && s.finance.cash >= picked.fundingCost;

  // What committing this team costs in teaching, named before the click.
  // Uses the same plan the reducer applies, including which courses
  // colleagues pick up.
  const coverage = planCommitmentCoverage(s, team);

  return (
    // An open offer set takes the full row width.
    <section className={`facility-panel vacant${open ? ' expanded' : ''}`}>
      <header className="facility-head">
        <span className="facility-name">
          {lab.name}
          <span className="facility-depth vacant-tag">Vacant</span>
        </span>
        {!open && (
          <button type="button" className="facility-start" onClick={() => setOpen(true)}>Start research →</button>
        )}
      </header>

      {open && (
        <div className="offer-set">
          {offers.map((offer) => (
            <button
              key={offer.depth.key}
              type="button"
              className={`offer${picked?.depth.key === offer.depth.key ? ' selected' : ''}${offer.blockedReason ? ' blocked' : ''}`}
              disabled={!!offer.blockedReason}
              onClick={() => choose(offer)}
            >
              <span className="offer-head">
                <span className="offer-depth">{offer.depth.name}</span>
                <span className="offer-cost">{money(offer.fundingCost)}</span>
              </span>
              <span className="offer-topic">{offer.topic.name}</span>
              <span className="offer-meta">
                {offer.depth.participants} {offer.depth.participants === 1 ? 'scholar' : 'scholars'} · {years(offer.depth.weeks)}
                {offer.topic.fields.length > 1 && ` · ${offer.topic.fields.join(' + ')}`}
              </span>
              <span className="offer-blurb">{offer.blockedReason ?? offer.depth.blurb}</span>
              {!offer.blockedReason && (
                <span className="offer-odds">
                  ~{offer.odds.publications < 10 ? offer.odds.publications.toFixed(1) : Math.round(offer.odds.publications)} publications
                  {' · '}breakthrough {Math.round(offer.odds.breakthroughChance * 100)}%
                  {' · '}award {Math.round(offer.odds.awardChance * 100)}%
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {open && picked && !picked.blockedReason && (
        <div className="offer-commit">
          <h4>The team</h4>
          {chosenTeam.map((f) => (
            <ScholarRow
              key={f.id}
              f={f}
              onRemove={() => setTeam((cur) => cur.filter((id) => id !== f.id))}
            />
          ))}
          {chosenTeam.length < picked.depth.participants && (
            <div className="offer-bench">
              <span className="offer-bench-label">Add a scholar</span>
              {[...new Set(picked.topic.fields.concat(chosenTeam.map((f) => f.field)))]
                .flatMap((field) => availableScholars(s, field))
                .filter((f) => !team.includes(f.id))
                .slice(0, 6)
                .map((f) => (
                  <button key={f.id} type="button" className="offer-add" onClick={() => setTeam((cur) => [...cur, f.id])}>
                    + {f.name} <span className="offer-add-field">{f.field}</span>
                  </button>
                ))}
            </div>
          )}

          {coverage.shed.length > 0 && (
            <p className={coverage.orphaned.length > 0 ? 'offer-warning' : 'offer-note'}>
              {coverage.covered.length > 0 && (
                <>
                  {coverage.covered.length} of this team's {coverage.shed.length}{' '}
                  {coverage.shed.length === 1 ? 'course' : 'courses'} would move to colleagues
                  {coverage.orphaned.length === 0 ? ', with none left uncovered.' : '. '}
                </>
              )}
              {coverage.orphaned.length > 0 && (
                <>
                  {coverage.covered.length > 0
                    ? `The other ${coverage.orphaned.length} would be`
                    : `Committing this team leaves ${coverage.orphaned.length} ${coverage.orphaned.length === 1 ? 'course' : 'courses'}`}
                  {' '}without an instructor for {years(picked.depth.weeks)}: {coverage.orphaned.map((t) => t.name.split(' · ')[0]).join(', ')}.
                </>
              )}
            </p>
          )}
          {chosenTeam.length > 0 && (
            <p className="offer-note">
              Team strength {Math.round(teamStrength(chosenTeam) * 100)} · interdisciplinary bonus
              {' '}×{interdisciplinaryBonus(chosenTeam).toFixed(2)}
            </p>
          )}

          <button
            type="button"
            className="facility-commit"
            disabled={!ready}
            onClick={() => {
              act({
                type: 'START_INITIATIVE',
                labId: lab.id,
                topicId: picked.topic.id,
                depth: picked.depth.key,
                facultyIds: team,
              });
              setOpen(false); setPicked(null); setTeam([]);
            }}
          >
            {!coversFields
              ? `Needs one scholar from each of ${picked.topic.fields.join(', ')}`
              : chosenTeam.length !== picked.depth.participants
                ? `Needs ${picked.depth.participants} scholars`
                : s.finance.cash < picked.fundingCost
                  ? `${money(picked.fundingCost - s.finance.cash)} short`
                  : `Commission — ${money(picked.fundingCost)}`}
          </button>
        </div>
      )}
    </section>
  );
}

export default function ResearchTab({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const researchRank = rankBy(s, 'researchStanding');
  const schools = researchSchools().filter((school) => school.labIds.length > 0);
  const facilities = schools.flatMap((school) =>
    school.labIds
      .map((id) => s.tech.find((t) => t.id === id))
      .filter((lab): lab is Buildable => !!lab && lab.status === 'done')
      .map((lab) => ({ lab })));

  const underway = facilities
    .map(({ lab }) => ({ lab, initiative: s.research.initiatives[lab.id] }))
    .filter((entry): entry is { lab: Buildable; initiative: Initiative } => !!entry.initiative);
  const vacant = facilities.filter(({ lab }) => !s.research.initiatives[lab.id]);
  const history = s.research.completedInitiatives;

  return (
    <div className="tab-content">
      <section className="panel">
        <div className="panel-head">
          <span className="panel-head-title">
            <h2>Research</h2>
            <HelpHint text="Each research facility hosts one project at a time, so the number of things the college can pursue at once is the number of places it has built to pursue them in. Choose an area, a team and a depth; each member gives up two course slots for the duration. Deeper work costs more, runs longer and pays off bigger — and the Landmark tier needs scholars from different disciplines, so the most prestigious work is out of reach for a single department however strong." />
          </span>
          <span className="stat">
            {/* The research-axis rank (prestigeSystem.ts's
                computeResearchTarget). Here rather than on the toolbar, which
                already carries the academic rank. */}
            Research standing #{researchRank} of {s.rivals.length + 1}
            <span className="stat-sep"> · </span>
            {underway.length} of {facilities.length} {facilities.length === 1 ? 'facility' : 'facilities'} in use
          </span>
        </div>

        {facilities.length === 0 ? (
          <p className="empty-note">
            No research facility has been finished yet. Every school can build one — a lab, an institute,
            a studio or a computing center — once its building and that program's entry course are done.
          </p>
        ) : (
          <>
            {/* Split by state: running panels are tall, vacant ones short,
                and what the university is working on is news while what it
                isn't is a worklist. */}
            {underway.length > 0 && (
              <div className="facility-list running-list">
                {underway.map(({ lab, initiative }) => (
                  <RunningPanel key={lab.id} s={s} act={act} lab={lab} initiative={initiative} />
                ))}
              </div>
            )}
            {vacant.length > 0 && (
              <>
                <h3 className="facility-group-head">
                  {underway.length > 0 ? 'Standing idle' : 'Ready for work'}
                </h3>
                <div className="facility-list vacant-list">
                  {vacant.map(({ lab }) => (
                    <VacantPanel key={lab.id} s={s} act={act} lab={lab} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>

      {history.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <span className="panel-head-title"><h2>The record</h2></span>
          </div>
          {/* The only place a finished project stays visible. */}
          <div className="record-list">
            {history.map((done, i) => {
              const topic = researchTopic(done.topicId);
              return (
                <div key={`${done.topicId}-${done.year}-${i}`} className={`record${done.cancelled ? ' cancelled' : ''}`}>
                  <span className="record-year">Y{done.year}</span>
                  <span className="record-body">
                    <span className="record-topic">{topic?.name ?? done.topicId}</span>
                    <span className="record-team">{done.facultyNames.join(', ') || '—'}</span>
                  </span>
                  <span className="record-outcome">
                    {done.cancelled
                      ? <span className="record-cancelled">wound up early</span>
                      : (
                        <>
                          {done.award && <span className="record-award">{done.award}</span>}
                          <span>
                            {done.breakthroughs > 0 && `${done.breakthroughs} breakthrough${done.breakthroughs === 1 ? '' : 's'} · `}
                            {done.publications} published
                          </span>
                          {done.grantIncome > 0 && <span className="record-grant">{money(done.grantIncome)} in grants</span>}
                        </>
                      )}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
