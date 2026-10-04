import { useEffect, useMemo, useState } from 'react';
import ConfirmButton from '../components/ConfirmButton';
import type { Action } from '../state/actions';
import type { Buildable, Faculty, GameState, Initiative } from '../state/types';
import {
  availableScholars, depthOpen, initiativeDepth, initiativeOffers,
  initiativeWeeklyOutput, interdisciplinaryBonus, RESEARCH_PARK_ID, teamStrength,
  type InitiativeOffer,
} from '../data/researchData';
import { researchTopic } from '../data/researchTopics';
import { planCommitmentCoverage } from '../systems/techtree/techSystem';
import { researchSchools } from '../data/techData';
import FacultyPortrait, { portraitOf } from '../components/FacultyPortrait';
import HelpHint from '../components/HelpHint';
import { rankBy } from '../systems/rivals/rivalsSystem';
import { decimal, money, moneyShort, multiplier, pct, weeksProse, weeksShort } from '../format';
import { CloseIcon, RemoveIcon } from '../components/icons';
import { projectOpens } from '../data/projectData';
import { labsTowardPark, projectOpen } from '../systems/estate/projects';
import { standsOnCampus } from '../state/types';
import { PARK_WORDS, landmarkYears, landmarksRunning, parkReading } from '../data/researchParkData';
import { PILLAR_WORDS } from '../data/specializationData';
import { specializationOf } from '../systems/prestige/specialization';
import { SPECIALIZATION_MILESTONE_RANK } from '../systems/prestige/prestigeSystem';

// =====================================================================
// Research, as a screen. Its own tab because Curriculum is where
// `teaching` lives, so Research being where `research` lives makes the two
// faculty stats mean different things. One roster of every facility, a row
// each with a lamp lit while a project runs (Plan 89); a vacant lab is idle
// capital the player should see.
// =====================================================================


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
        <button type="button" className="scholar-drop" onClick={onRemove} aria-label={`Remove ${f.name}`} title={`Remove ${f.name}`}><RemoveIcon /></button>
      )}
    </div>
  );
}

// A roster row's lamp: lit while a project runs, unlit when vacant (Plan 89).
// The status line under the name says the same in words.
function Lamp({ on }: { on: boolean }) {
  return <span className={`facility-lamp${on ? ' on' : ''}`} aria-hidden="true" />;
}

// A facility with work in it: what, by whom, how far along, and how many
// breakthroughs it has banked (which decides whether it can win an award).
// Its roster row says the project and the weeks; the team and the odds sit
// under it.
function RunningPanel(
  { s, act, lab, initiative }:
  { s: GameState; act: (a: Action) => void; lab: Buildable; initiative: Initiative },
) {
  const topic = researchTopic(initiative.topicId);
  const depth = initiativeDepth(initiative.depth);
  const team = s.faculty.filter((f) => initiative.participantIds.includes(f.id));
  const elapsed = initiative.weeksTotal - initiative.weeksRemaining;
  const fraction = initiative.weeksTotal > 0 ? elapsed / initiative.weeksTotal : 0;
  const output = initiativeWeeklyOutput(s, team, depth);
  const fields = new Set(team.map((f) => f.field));

  return (
    <section className="facility-panel running" data-lab={lab.id}>
      <header className="facility-head">
        <Lamp on />
        <span className="facility-title">
          <span className="facility-name">{lab.name}</span>
          <span className="facility-status busy">
            {topic?.name ?? 'Unknown project'} · {Math.round(elapsed)} of {Math.round(initiative.weeksTotal)} weeks
          </span>
        </span>
        <ConfirmButton
          className="facility-cancel btn-danger"
          label="Wind up"
          armedLabel="Confirm — funding is forfeit"
          onConfirm={() => act({ type: 'CANCEL_INITIATIVE', labId: lab.id })}
        />
      </header>

      <div className="facility-tags">
        <span className="facility-depth">{depth.name} · {weeksShort(initiative.weeksTotal)}</span>
        {/* Said once, about the project, with the multiplier. */}
        {fields.size > 1 && (
          <span className="facility-cross" title={`${fields.size} disciplines on the team`}>
            interdisciplinary {multiplier(interdisciplinaryBonus(team))}
          </span>
        )}
      </div>

      <div className="facility-team">
        {team.length === 0
          ? <p className="empty-note">Nobody is left on this project.</p>
          : team.map((f) => <ScholarRow key={f.id} f={f} />)}
      </div>

      <div className="facility-progress">
        <span className="facility-track">
          <span className="facility-fill" style={{ width: pct(fraction) }} />
        </span>
        <span className="facility-progress-meta">
          <span>
            <b>{initiative.breakthroughs}</b> {initiative.breakthroughs === 1 ? 'breakthrough' : 'breakthroughs'} banked
            {initiative.publications > 0 && ` · ${initiative.publications} published`}
          </span>
          <span className="facility-rate">{decimal(output, 1)}/wk</span>
        </span>
      </div>
    </section>
  );
}

// A vacant facility and its offer set: one card per depth tier, each with a
// topic this school could lead.
function VacantPanel(
  { s, act, lab, startRequested = false }:
  {
    s: GameState; act: (a: Action) => void; lab: Buildable;
    // The lab's map panel asked for its choices ("Start research", Plan 80B).
    startRequested?: boolean;
  },
) {
  const [open, setOpen] = useState(startRequested);
  useEffect(() => { if (startRequested) setOpen(true); }, [startRequested]);
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
    <section
      className={`facility-panel vacant${open ? ' expanded' : ''}`}
      data-lab={lab.id}
      onKeyDown={(e) => { if (open && e.key === 'Escape') { e.stopPropagation(); setOpen(false); setPicked(null); setTeam([]); } }}
    >
      <header className="facility-head">
        <Lamp on={false} />
        <span className="facility-title">
          <span className="facility-name">{lab.name}</span>
          <span className="facility-status">{open ? 'Vacant: choose a project' : 'Vacant'}</span>
        </span>
        {!open ? (
          <button type="button" className="facility-start btn-primary" onClick={() => setOpen(true)}>Start research</button>
        ) : (
          // Folds the options back up without starting anything (Plan 60).
          <button
            type="button"
            className="close-btn"
            aria-label={`Not now: close ${lab.name}'s options`}
            title="Not now"
            onClick={() => { setOpen(false); setPicked(null); setTeam([]); }}
          >
            <CloseIcon />
          </button>
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
                <span className="offer-cost">{moneyShort(offer.fundingCost)}</span>
              </span>
              <span className="offer-topic">{offer.topic.name}</span>
              <span className="offer-meta">
                {offer.depth.participants} {offer.depth.participants === 1 ? 'scholar' : 'scholars'} · {weeksShort(offer.depth.weeks)}
                {offer.topic.fields.length > 1 && ` · ${offer.topic.fields.join(' + ')}`}
              </span>
              <span className="offer-blurb">{offer.blockedReason ?? offer.depth.blurb}</span>
              {!offer.blockedReason && (
                <span className="offer-odds">
                  about {decimal(offer.odds.publications, offer.odds.publications < 10 ? 1 : 0)} papers expected
                  {' · '}breakthrough {pct(offer.odds.breakthroughChance)}
                  {' · '}award {pct(offer.odds.awardChance)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && !depthOpen(s, 'landmark') && (
        <p className="empty-note landmark-note">{PARK_WORDS.landmarkClosed}</p>
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
                  {' '}without an instructor for {weeksProse(picked.depth.weeks)}: {coverage.orphaned.map((t) => t.name.split(' · ')[0]).join(', ')}.
                </>
              )}
            </p>
          )}
          {chosenTeam.length > 0 && (
            <p className="offer-note">
              Team strength {decimal(teamStrength(chosenTeam) * 100)} · interdisciplinary lift
              {' '}{multiplier(interdisciplinaryBonus(chosenTeam))}
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
                  ? `${moneyShort(picked.fundingCost - s.finance.cash)} short`
                  : `Commission — ${moneyShort(picked.fundingCost)}`}
          </button>
        </div>
      )}
    </section>
  );
}

// The Research Park (Plan 80B; Plan 85F). Standing: what it does for the
// college, the research specialization's share it fills or that it fills
// none. Not yet standing: it is the research specialization's own building
// (Plan 85F), so a college specialized otherwise is told it cannot build
// it; any other sees its progress, since it also waits on every standing
// lab having finished a project (projects.ts's everyLabFinished): the
// count, each lab marked, and what a new lab does to it.
function ResearchParkProgress({ s }: { s: GameState }) {
  const park = s.tech.find((t) => t.id === RESEARCH_PARK_ID);
  if (!park?.project) return null;
  const chosen = specializationOf(s);
  if (standsOnCampus(park)) {
    return (
      <section className="research-park" aria-label={PARK_WORDS.head}>
        <h3 className="facility-group-head">{PARK_WORDS.head}</h3>
        <p className="research-park-line">
          {chosen === 'research'
            ? PARK_WORDS.works(landmarkYears(s), landmarksRunning(s), parkReading(s) >= 1)
            : chosen ? PARK_WORDS.idle(PILLAR_WORDS[chosen]) : PARK_WORDS.idleUnchosen}
        </p>
      </section>
    );
  }
  const weeksLeft = park.status === 'developing' ? s.developing[park.id] : undefined;
  if (weeksLeft === undefined && chosen !== null && chosen !== 'research') {
    return (
      <section className="research-park" aria-label={PARK_WORDS.head}>
        <h3 className="facility-group-head">{PARK_WORDS.head}</h3>
        <p className="research-park-line">{PARK_WORDS.gatedElsewhere(PILLAR_WORDS[chosen])}</p>
      </section>
    );
  }
  const labs = labsTowardPark(s);
  if (labs.length === 0) return null;
  const finished = labs.filter((l) => l.finished).length;
  return (
    <section className="research-park" aria-label={PARK_WORDS.head}>
      <h3 className="facility-group-head">{PARK_WORDS.head}</h3>
      {weeksLeft !== undefined ? (
        <p className="research-park-line">Going up: {weeksShort(weeksLeft)} left. Landmark Programs open when it stands.</p>
      ) : (
        <>
          {chosen === null && <p className="research-park-line">{PARK_WORDS.gatedUnchosen(SPECIALIZATION_MILESTONE_RANK)}</p>}
          <p className="research-park-line">
            {projectOpens(park.project)}
            {projectOpen(s, park) && ' It is open: build it from the capital projects in the build menu.'}
          </p>
          {/* A tally, a cell per lab (Plan 89); each cell names its lab. */}
          <div className="park-tally">
            <p className="park-tally-head">
              <span>Labs that have finished a project</span>
              <span className="park-tally-count">{finished}/{labs.length}</span>
            </p>
            <div className="park-tally-cells" style={{ gridTemplateColumns: `repeat(${labs.length}, minmax(0, 1fr))` }}>
              {labs.map(({ lab, finished: done }) => {
                const words = `${lab.name}: ${done ? 'has finished a project' : 'not yet'}`;
                return (
                  <span key={lab.id} role="img" className={`park-tally-cell${done ? ' finished' : ''}`} title={words} aria-label={words} />
                );
              })}
            </div>
          </div>
          <p className="research-park-note">A new lab raises the count: it has to finish a project too.</p>
        </>
      )}
    </section>
  );
}

export default function ResearchTab({ s, act, target, onTargetConsumed }: {
  s: GameState; act: (a: Action) => void;
  // Where to land (Plan 80B, from a lab's map panel): "lab:<id>" scrolls to
  // its panel, "start:<id>" also opens its project choices. Consumed and
  // cleared by the caller.
  target?: string;
  onTargetConsumed?: () => void;
}) {
  // The lab a "start:" target opens. Read while the target stands, so each
  // request opens it again even after the player folded it.
  const startLab = target?.startsWith('start:') ? target.slice('start:'.length) : null;
  useEffect(() => {
    if (!target) return;
    const labId = target.replace(/^(lab|start):/, '');
    window.setTimeout(() => document.querySelector(`[data-lab="${CSS.escape(labId)}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0);
    onTargetConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
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
            <HelpHint text="Each research facility hosts one project at a time, so the number of things the college can pursue at once is the number of places it has built to pursue them in. Choose an area, a team and a depth; each member gives up two course slots for the duration. Deeper work costs more, runs longer and pays more — and a Landmark Program needs scholars from different disciplines, so the most prestigious work is out of reach for a single department however strong." />
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
            {/* One roster (Plan 89): what the university is working on
                first, as news with its team under it, then what it isn't,
                as a worklist. */}
            <h3 className="facility-group-head">
              {underway.length === 0 ? 'Ready for work' : 'The facilities'}
            </h3>
            <div className="facility-roster">
              {underway.map(({ lab, initiative }) => (
                <RunningPanel key={lab.id} s={s} act={act} lab={lab} initiative={initiative} />
              ))}
              {vacant.map(({ lab }) => (
                <VacantPanel key={lab.id} s={s} act={act} lab={lab} startRequested={startLab === lab.id} />
              ))}
            </div>
            <ResearchParkProgress s={s} />
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
                  <span className="record-year">Year {done.year}</span>
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
