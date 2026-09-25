import { constructionFrozen } from '../systems/finance/distress';
import { canDeclareHistoric, canExtend, canRenovate, conditionOf, extensionCost, extensionGain, renovationCost } from '../systems/estate/estate';
import { useEffect, useState } from 'react';
import type { Action } from '../state/actions';
import { venueSeatsOf } from '../data/facilitiesData';
import type { Buildable, FacilityType, GameState } from '../state/types';
import { FOUNDERS_HALL_ID, isAcademicHall, programById, type ProgramInfo } from '../data/techData';
import { dedicatedSchool, hallDisplayName } from '../systems/techtree/schools';
import { GradeChip, InstructorOption, MarketInField } from '../tabs/CurriculumTab';
import { averageCourseQuality, facultyLoads } from '../systems/faculty/facultyAssignment';
import { gradeFor } from '../data/courseQuality';
import { schoolMark } from '../data/schoolPalette';
import {
  canFoundProgram, canRelocateProgram, eligibleInstructors, facultyGate,
  RELOCATION_WEEKS,
} from '../systems/techtree/techSystem';
import { transitWeeks } from '../systems/techtree/programOffers';
import { milestoneLine, programProgress, unmetPrereqNames } from '../systems/techtree/programProgress';
import { money, pct } from '../format';
import { canCancelConstruction, demolitionBlock } from '../state/demolition';

// A popover for a placed building (see CampusMap.tsx's inspectBuilding). For
// every kind but one it is a pure projection of the Buildable and the
// curriculum data; nothing is computed fresh or written back.
//
// The exception is the hall view: an academic hall's six program slots are
// where a program is founded, because the decision is "what goes in this
// building". It dispatches FOUND_PROGRAM, gated by the reducer's own
// canFoundProgram so the button never offers what the action would refuse.
// It does not develop courses: the Curriculum tab is where a program is
// filled in, and a program tile is a summary with one door to its row there.

// A dorm's capacity is its capacityBonus effect, the founding dorm included.
function dormCapacity(t: Buildable): number | null {
  return t.effects?.capacityBonus ?? null;
}

// What a facility's servesPopulation effect counts, per facilityType. Quad
// and lab are absent: neither has a servesPopulation effect, so see the
// facility branch below for what they show instead.
const FACILITY_CAPACITY_LABEL: Partial<Record<FacilityType, string>> = {
  diningHall: 'dining seats',
  library: 'study seats',
  studentCenter: 'social capacity',
  recCenter: 'recreation capacity',
  healthCenter: 'care capacity',
  gym: 'fitness capacity',
  tennisCourts: 'court capacity',
  pool: 'pool capacity',
  performingArtsCenter: 'venue capacity',
  artGallery: 'gallery capacity',
};

// The varsity venues (facilitiesData.ts): their panel says which teams play
// there, not just a capacity (see AthleticsVenueInfo).
const ATHLETICS_VENUE_TYPES: readonly FacilityType[] = [
  'athleticsField', 'athleticsArena', 'athleticsDiamond', 'athleticsNatatorium', 'footballStadium',
];

function AthleticsVenueInfo({ t, s }: { t: Buildable; s: GameState }) {
  const teams = s.orgs.teams.filter((team) => team.venueCategory === t.facilityType);
  return (
    <>
      <p className="building-info-line">
        {t.effects?.servesPopulation !== undefined
          ? `${t.effects.servesPopulation.toLocaleString()} social capacity — a shared competition venue, not a rec facility.`
          : t.description}
      </p>
      {(t.expansions ?? 0) > 0 && (
        <p className="building-info-line">Expanded {t.expansions === 1 ? 'once' : `${t.expansions} times`}: {venueSeatsOf(t).toLocaleString()} seats at the gate.</p>
      )}
      {teams.length === 0 ? (
        <p className="building-info-line">No varsity team calls this home yet.</p>
      ) : (
        <ul className="building-info-majors">
          {teams.map((team) => (
            <li key={team.id}>
              {team.name} — coach {team.headCoach?.name ?? 'vacant'}
              {team.status === 'awaitingVenue' ? ' (awaiting this venue)' : ''}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function FacilityInfo({ t, s }: { t: Buildable; s: GameState }) {
  const ft = t.facilityType;
  if (ft && ATHLETICS_VENUE_TYPES.includes(ft)) return <AthleticsVenueInfo t={t} s={s} />;
  const label = ft ? FACILITY_CAPACITY_LABEL[ft] : undefined;
  if (label && t.effects?.servesPopulation !== undefined) {
    return <p className="building-info-line">Serves {t.effects.servesPopulation.toLocaleString()} {label}</p>;
  }
  if (ft === 'quad') {
    return (
      <p className="building-info-line">
        {t.effects?.flatSatisfactionBonus !== undefined
          ? `+${t.effects.flatSatisfactionBonus} flat social satisfaction`
          : 'A green centerpiece for campus life.'}
        {' — no capacity figure; a quad does not scale with enrollment.'}
      </p>
    );
  }
  if (ft === 'lab') {
    return (
      <p className="building-info-line">
        {t.effects?.researchRateBonus !== undefined
          ? `+${Math.round(t.effects.researchRateBonus * 100)}% research output`
          : 'Specialized lab space.'}
        {' — no capacity figure; gates this program\'s capstone coursework instead.'}
      </p>
    );
  }
  return <p className="building-info-line">{t.description}</p>;
}

// "Take me to it": the courses a hall stands for live in another view. See
// App.tsx's overlay target for the channel.
function OpenInCurriculum({ id, onOpenCurriculum }: { id: string; onOpenCurriculum?: (id: string) => void }) {
  if (!onOpenCurriculum) return null;
  return (
    <button type="button" className="building-info-jump" onClick={() => onOpenCurriculum(id)}>
      Open in Curriculum →
    </button>
  );
}

// ---------------------------------------------------------------------
// The program tile: a filled slot showing the program's name in its school's
// color, courses done of nine, and aggregate grade. Clicking opens its
// summary and one door, "Open in Curriculum". Relocation sits behind a
// "Move…" disclosure since it happens a few times a run.
// ---------------------------------------------------------------------
function ProgramTile({ program, s, act, open, onToggle, onOpenCurriculum }: {
  program: ProgramInfo; s: GameState; act?: (a: Action) => void; open: boolean; onToggle: () => void;
  onOpenCurriculum?: (sectionKey: string) => void;
}) {
  const mark = schoolMark(program.school);
  const loads = facultyLoads(s);
  const avg = averageCourseQuality(s, program.courseIds, loads);
  const progress = programProgress(s, program);
  const inTransit = transitWeeks(s, program.id);
  const courseTitle = (t: Buildable) => t.name.split(' · ')[1] ?? t.name;
  const courseCode = (t: Buildable) => t.name.split(' · ')[0];

  return (
    <div className={`hall-slot housed${open ? ' open' : ''}`} style={{ borderColor: mark.hue, ['--school-hue' as string]: mark.hue }}>
      <button
        type="button"
        className="program-tile"
        onClick={onToggle}
        aria-expanded={open}
        title={`${program.name} (${program.school}) — ${progress.done} of ${progress.total} courses developed`}
      >
        <span className="hall-slot-motif" style={{ color: mark.hue }} aria-hidden="true">{mark.motif}</span>
        <span className="hall-slot-name">{program.name}</span>
        <span className="program-tile-meta">
          {inTransit > 0
            ? <span className="program-tile-transit" title={`In transit — ${inTransit} weeks until it is teaching again`}>moving · {inTransit}w</span>
            : <span className="program-tile-progress">{progress.done}/{progress.total}</span>}
          {avg !== null && <GradeChip grade={gradeFor(avg)} title={`Averages ${Math.round(avg)} / 100 across its developed courses`} />}
        </span>
      </button>
      {open && (
        <div className="program-summary">
          <dl className="program-summary-facts">
            <div><dt>Standing</dt><dd>{milestoneLine(progress)}</dd></div>
            <div><dt>Teaching</dt><dd>{progress.seats.toLocaleString()} seats</dd></div>
            {progress.developing > 0 && <div><dt>In development</dt><dd>{progress.developing}</dd></div>}
          </dl>
          <p className="building-info-line program-summary-next">
            {inTransit > 0
              ? `In transit — ${inTransit} week${inTransit === 1 ? '' : 's'} until its courses count again.`
              : progress.next
                ? (() => {
                  const field = progress.next.requiresFaculty;
                  const gate = field ? facultyGate(s, field) : 'open';
                  return (
                    <>
                      Next: <span className="hall-offer-code">{courseCode(progress.next)}</span> {courseTitle(progress.next)} · {money(progress.next.cost)} · {progress.next.duration} wk
                      {gate !== 'open' && (
                        <span className="program-summary-blocked"> — no free {field} slot{gate === 'hireable' ? ', a candidate is listed' : ', nobody on the market'}.</span>
                      )}
                    </>
                  );
                })()
                : progress.waiting
                  ? <>Waiting on <span className="hall-offer-code">{courseCode(progress.waiting)}</span> {courseTitle(progress.waiting)} — needs {unmetPrereqNames(s, progress.waiting).join(', ') || 'its prerequisites'}.</>
                  : progress.developing > 0
                    ? 'Every remaining course is in development.'
                    : 'Every course is developed.'}
          </p>
          <OpenInCurriculum id={`program:${program.id}`} onOpenCurriculum={onOpenCurriculum} />
          {act && (
            <details className="relocate-details">
              <summary>Move to another hall…</summary>
              <RelocateControls program={program} s={s} act={act} />
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// Relocation: every free slot in every standing hall, with the cost said up
// front (the program goes dark for RELOCATION_WEEKS). A program in transit
// cannot be moved again until it settles.
function RelocateControls({ program, s, act }: { program: ProgramInfo; s: GameState; act?: (a: Action) => void }) {
  const inTransit = transitWeeks(s, program.id);
  const destinations = Object.entries(s.halls)
    .map(([hallId, slots]) => ({
      hallId,
      hall: s.tech.find((t) => t.id === hallId),
      free: slots.map((slot, i) => (slot.programId === null ? i : -1)).filter((i) => i >= 0),
    }))
    .filter((d) => d.hall && d.free.length > 0 && canRelocateProgram(s, { programId: program.id, hallId: d.hallId, slot: d.free[0] }));
  if (inTransit > 0) {
    return (
      <p className="building-info-line building-info-construction relocate-note">
        In transit — {inTransit} week{inTransit === 1 ? '' : 's'} until its courses count again. Nothing in it can be started or advanced until then.
      </p>
    );
  }
  if (destinations.length === 0) {
    return <p className="building-info-line relocate-note">No free slot anywhere to move this program to.</p>;
  }
  return (
    <div className="relocate">
      <p className="building-info-line relocate-note">
        Free, but the program goes dark for {RELOCATION_WEEKS} weeks: no teaching, no progress, and it counts toward no school until it settles.
      </p>
      {destinations.map((d) => (
        <p key={d.hallId} className="relocate-row">
          <span className="relocate-hall">{hallDisplayName(s, d.hall!)}</span>
          {d.free.map((slot) => (
            <button
              key={slot}
              type="button"
              className="relocate-slot"
              disabled={!act}
              title={`Move ${program.name} to ${hallDisplayName(s, d.hall!)}, slot ${slot + 1}`}
              onClick={() => act?.({ type: 'RELOCATE_PROGRAM', programId: program.id, hallId: d.hallId, slot })}
            >
              {slot + 1}
            </button>
          ))}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------
// The hall view: a 2x3 grid of slots. Clicking an empty slot fans out the
// three programs on offer as course tiles (schoolPalette.ts colors);
// picking one opens the instructor picker, and "Found" is the one button on
// the map that starts a course. A filled slot shows a ProgramTile.
// ---------------------------------------------------------------------
function HallSlots({ t, s, act, onOpenCurriculum }: {
  t: Buildable; s: GameState; act?: (a: Action) => void; onOpenCurriculum?: (sectionKey: string) => void;
}) {
  const slots = s.halls[t.id];
  // Which empty slot is open (fanned out), and which offer is picked in it.
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [pickedProgram, setPickedProgram] = useState<string | null>(null);
  const [pickedFaculty, setPickedFaculty] = useState<string | null>(null);
  // Which housed program's tile is expanded; one at a time.
  const [openTile, setOpenTile] = useState<string | null>(null);
  useEffect(() => { setOpenSlot(null); setPickedProgram(null); setPickedFaculty(null); setOpenTile(null); }, [t.id]);

  if (!slots) {
    // Under construction, or an entry the loader dropped: the slots exist
    // as a count on the Buildable but nothing can go in them yet.
    return (
      <>
        <p className="building-info-line">{t.slots} program slots, once it opens.</p>
        <div className="hall-slots">
          {Array.from({ length: t.slots ?? 0 }, (_, i) => (
            <div key={i} className="hall-slot pending" aria-hidden="true" />
          ))}
        </div>
      </>
    );
  }

  const offers = s.programOffers.map((id) => programById(id)).filter((p) => p !== undefined);
  const picked = pickedProgram ? programById(pickedProgram) : undefined;
  const entry = picked ? s.tech.find((x) => x.id === picked.entryCourseId) : undefined;
  const eligible = entry ? eligibleInstructors(s, entry) : [];
  const chosen = pickedFaculty ?? eligible[0]?.id ?? null;
  const founding = picked && openSlot !== null && chosen
    ? { programId: picked.id, hallId: t.id, slot: openSlot, facultyId: chosen }
    : null;
  const canFound = founding !== null && canFoundProgram(s, founding);
  const free = slots.filter((slot) => slot.programId === null).length;
  const school = dedicatedSchool(s, t.id);

  return (
    <>
      {school && (
        <p className="building-info-line building-info-dedication" style={{ color: schoolMark(school).hue }}>
          {schoolMark(school).motif} Dedicated to the School of {school}.
        </p>
      )}
      <p className="building-info-line">
        {free === 0
          ? 'Every slot is taken.'
          : `${free} of ${slots.length} slots free${offers.length > 0 ? ` — ${offers.length} program${offers.length === 1 ? '' : 's'} on offer.` : '.'}`}
      </p>
      <div className="hall-slots">
        {slots.map((slot, i) => {
          if (slot.programId !== null) {
            const program = programById(slot.programId);
            if (!program) {
              return <div key={i} className="hall-slot housed"><span className="hall-slot-name">{slot.programId}</span></div>;
            }
            return (
              <ProgramTile
                key={i}
                program={program}
                s={s}
                act={act}
                open={openTile === program.id}
                onToggle={() => { setOpenTile(openTile === program.id ? null : program.id); setOpenSlot(null); }}
                onOpenCurriculum={onOpenCurriculum}
              />
            );
          }
          const open = openSlot === i;
          // The opening walkthrough's last step rings the first free room
          // of Founders Hall until it is opened (see state/opening.ts and
          // styles.css's .opening-target).
          const ringed = s.events.opening.stage === 'found' && t.id === FOUNDERS_HALL_ID && openSlot === null
            && slots.findIndex((slot) => slot.programId === null) === i;
          return (
            <button
              key={i}
              type="button"
              className={`hall-slot empty${open ? ' open' : ''}${ringed ? ' opening-target' : ''}`}
              onClick={() => { setOpenSlot(open ? null : i); setPickedProgram(null); setPickedFaculty(null); setOpenTile(null); }}
              aria-pressed={open}
              disabled={offers.length === 0}
              title={offers.length === 0 ? 'Nothing is on offer to found here.' : 'Found a program in this slot'}
            >
              +
            </button>
          );
        })}
      </div>

      {openSlot !== null && offers.length > 0 && (
        <div className="hall-offer">
          <h4 className="hall-offer-head">On offer for slot {openSlot + 1}</h4>
          <div className="hall-offer-tiles">
            {offers.map((program) => {
              const course = s.tech.find((x) => x.id === program.entryCourseId);
              const mark = schoolMark(program.school);
              const [code] = (course?.name ?? program.entryCourseId).split(' · ');
              const selected = pickedProgram === program.id;
              return (
                <button
                  key={program.id}
                  type="button"
                  className={`hall-offer-tile${selected ? ' selected' : ''}`}
                  style={{ borderColor: mark.hue, ['--school-hue' as string]: mark.hue }}
                  onClick={() => { setPickedProgram(selected ? null : program.id); setPickedFaculty(null); }}
                  aria-pressed={selected}
                >
                  <span className="hall-offer-code" style={{ color: mark.hue }}>{mark.motif} {code}</span>
                  <span className="hall-offer-name">{program.name}</span>
                  <span className="hall-offer-meta">
                    {money(course?.cost ?? 0)} · {course?.requiresFaculty ?? '—'}
                  </span>
                </button>
              );
            })}
          </div>

          {picked && entry && (
            <div className="hall-offer-picker">
              <h4 className="hall-offer-head">Who teaches {entry.name.split(' · ')[1] ?? entry.name}?</h4>
              {eligible.length > 0 ? (
                <div className="instructor-options">
                  {eligible.map((f) => (
                    <InstructorOption
                      key={f.id}
                      s={s}
                      f={f}
                      selected={chosen === f.id}
                      projectedFor={entry}
                      onPick={() => setPickedFaculty(f.id)}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <p className="building-info-line">
                    No {entry.requiresFaculty} professor has a free course slot. Appoint one to found this program.
                  </p>
                  {entry.requiresFaculty && act && <MarketInField s={s} act={act} field={entry.requiresFaculty} projectedFor={entry} />}
                </>
              )}
              {s.finance.cash < entry.cost && (
                <p className="building-info-line building-info-construction">
                  {money(Math.ceil(entry.cost - s.finance.cash))} short of the entry course's cost.
                </p>
              )}
              <button
                type="button"
                className="building-info-jump"
                disabled={!canFound || !act}
                onClick={() => {
                  if (founding && act) act({ type: 'FOUND_PROGRAM', ...founding });
                  setOpenSlot(null); setPickedProgram(null); setPickedFaculty(null);
                }}
              >
                {chosen
                  ? `Found ${picked.name} · ${money(entry.cost)}`
                  : `Found ${picked.name}`}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// A building's info: an academic hall's slots, Founders Hall included.
function BuildingHallInfo({ t, s, act, onOpenCurriculum }: {
  t: Buildable; s: GameState; act?: (a: Action) => void; onOpenCurriculum?: (id: string) => void;
}) {
  if (isAcademicHall(t)) return <HallSlots t={t} s={s} act={act} onOpenCurriculum={onOpenCurriculum} />;

  // Unreachable for real seed data (every 'building' is a hall); a plain
  // fallback rather than crashing the map.
  return <p className="building-info-line">{t.description}</p>;
}

// A finished building's condition and, when it has a backlog, the offer to
// renovate it (systems/estate).
function EstateLine({ t, s, act }: { t: Buildable; s: GameState; act: (a: Action) => void }) {
  if ((t.extensionWeeks ?? 0) > 0) {
    return <p className="building-info-line">A story going up, open throughout: {t.extensionWeeks} weeks left.</p>;
  }
  const extend = canExtend(t) ? (
    <button type="button" className="building-info-jump" disabled={s.finance.cash < extensionCost(t) || constructionFrozen(s)} title={constructionFrozen(s) ? 'The board has frozen construction; nothing new goes up until it lifts.' : undefined} onClick={() => act({ type: 'EXTEND_BUILDING', id: t.id })}>
      Add a story · {money(extensionCost(t))}, twelve weeks, {extensionGain(t).toLocaleString()} more {t.kind === 'dorm' ? 'beds' : 'served'}
    </button>
  ) : null;
  if ((t.renovationWeeks ?? 0) > 0) {
    return <p className="building-info-line">Under renovation, open throughout: {t.renovationWeeks} weeks left.</p>;
  }
  const historic = t.historic
    ? <p className="building-info-line">Historic: a landmark of the college's own past.</p>
    : canDeclareHistoric(s, t) ? (
      <button type="button" className="building-info-jump" onClick={() => act({ type: 'DECLARE_HISTORIC', id: t.id })}>
        Declare historic · lends prestige, costs a quarter more to keep
      </button>
    ) : null;
  if ((t.backlog ?? 0) <= 0) return <>{historic}{extend}</>;
  const cost = renovationCost(t);
  return (
    <>
      <p className="building-info-line">
        Condition {pct(conditionOf(t))}, with {money(t.backlog ?? 0)} of maintenance owed.
      </p>
      <button type="button" className="building-info-jump" disabled={!canRenovate(t) || s.finance.cash < cost} onClick={() => act({ type: 'RENOVATE_BUILDING', id: t.id })}>
        Renovate · {money(cost)}, eight weeks
      </button>
      {historic}
      {extend}
    </>
  );
}

// Calling off a building going up, or pulling down a standing one (Plan 39).
// Each asks once more before it acts; neither can be undone.
function TakeDown({ t, s, act, onClose }: { t: Buildable; s: GameState; act: (a: Action) => void; onClose: () => void }) {
  const [asking, setAsking] = useState(false);
  if (canCancelConstruction(s, t)) {
    const back = t.financing === 'gift' ? 'to the building fund'
      : t.financing === 'endowment' ? 'half to the endowment, half to cash'
        : t.financing === 'loan' ? 'to cash, its loan settled'
          : 'to cash';
    return asking ? (
      <div className="building-info-takedown">
        <p className="building-info-line">Call off {t.name}? {money(t.cost)} comes back {back}; the site is cleared.</p>
        <div className="building-info-confirm">
          <button type="button" className="building-info-jump danger" onClick={() => { act({ type: 'CANCEL_CONSTRUCTION', id: t.id }); onClose(); }}>Call it off</button>
          <button type="button" className="building-info-jump" onClick={() => setAsking(false)}>Keep building</button>
        </div>
      </div>
    ) : (
      <button type="button" className="building-info-jump quiet" onClick={() => setAsking(true)}>
        Call off construction · {money(t.cost)} returned
      </button>
    );
  }
  if (t.status !== 'done') return null;
  const blocked = demolitionBlock(s, t);
  if (blocked) return <p className="building-info-line building-info-note">Not for demolition. {blocked}</p>;
  return asking ? (
    <div className="building-info-takedown">
      <p className="building-info-line">Demolish {t.name}? It is free, nothing is returned, and it cannot be undone.</p>
      <div className="building-info-confirm">
        <button type="button" className="building-info-jump danger" onClick={() => { act({ type: 'DEMOLISH_BUILDING', id: t.id }); onClose(); }}>Demolish</button>
        <button type="button" className="building-info-jump" onClick={() => setAsking(false)}>Keep it</button>
      </div>
    </div>
  ) : (
    <button type="button" className="building-info-jump quiet" onClick={() => setAsking(true)}>Demolish…</button>
  );
}

export default function BuildingInfoPanel({ t, s, act, onClose, onOpenCurriculum }: {
  t: Buildable; s: GameState; onClose: () => void;
  // What this panel dispatches: FOUND_PROGRAM from a hall's slot, the
  // estate's actions, and calling off or demolishing (Plan 39). Optional,
  // like onOpenCurriculum; the map always passes both.
  act?: (a: Action) => void;
  // Opens the Curriculum tab at a school (by name) or at one program's row
  // ("program:<id>") — the targets CurriculumTab.tsx accepts.
  onOpenCurriculum?: (sectionKey: string) => void;
}) {
  // Escape is not bound here: CampusMap.tsx's back-out closes the panel,
  // in its turn after App.tsx's ladder, so one press never closes two things.
  // A developing building's effects are what it will grant once finished,
  // and the info below reads them either way, so this banner keeps it from
  // reading as already standing.
  const weeksLeft = s.developing[t.id];
  return (
    <div className={`building-info-panel${isAcademicHall(t) ? ' hall' : ''}`} role="dialog" aria-label={`${t.name} info`}>
      <div className="building-info-head">
        <h3>{hallDisplayName(s, t)}</h3>
        <button type="button" className="building-info-close" onClick={onClose} aria-label="Close">✕</button>
      </div>
      {t.status === 'done' && act && <EstateLine t={t} s={s} act={act} />}
      {t.status === 'developing' && weeksLeft !== undefined && (
        <p className="building-info-line building-info-construction">
          Under construction — {weeksLeft} of {t.duration} week{t.duration === 1 ? '' : 's'} left.
        </p>
      )}
      {t.kind === 'dorm' && (
        <p className="building-info-line">
          {(() => {
            const capacity = dormCapacity(t);
            return capacity !== null ? `${capacity.toLocaleString()} beds` : 'Capacity unknown.';
          })()}
        </p>
      )}
      {t.kind === 'facility' && <FacilityInfo t={t} s={s} />}
      {t.kind === 'building' && <BuildingHallInfo t={t} s={s} act={act} onOpenCurriculum={onOpenCurriculum} />}
      {act && <TakeDown key={t.id} t={t} s={s} act={act} onClose={onClose} />}
    </div>
  );
}
