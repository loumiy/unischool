import { useEffect, useState } from 'react';
import type { Action } from '../state/actions';
import type { Buildable, FacilityType, GameState } from '../state/types';
import { discoverySchools, isAcademicHall, programById, type ProgramInfo } from '../data/techData';
import { dedicatedSchool, hallDisplayName } from '../systems/techtree/schools';
import { GradeChip, InstructorOption, MarketInField, completion, discoverySections } from '../tabs/CurriculumTab';
import { averageCourseQuality, courseQuality, facultyLoads, instructorOf } from '../systems/faculty/facultyAssignment';
import { gradeFor } from '../data/courseQuality';
import { schoolMark } from '../data/schoolPalette';
import {
  canFoundProgram, canRelocateProgram, canStartDevelopment, eligibleInstructors, facultyGate, isUnstaffed,
  RELOCATION_WEEKS,
} from '../systems/techtree/techSystem';
import { transitWeeks } from '../systems/techtree/programOffers';
import { ProgressRing } from './Progress';

// A popover for a PLACED building — what clicking it (outside placement/
// path-draw mode; see CampusMap.tsx's inspectBuilding) shows. For every
// kind but one it is a pure projection: every figure already lives on the
// Buildable itself or in the curriculum data CurriculumTab.tsx reads,
// nothing is computed fresh and nothing it reads is written back.
//
// THE ONE EXCEPTION IS THE HALL VIEW (Plan 14). An academic hall's panel
// is the map's first mechanical surface: its six program slots are where
// a program is FOUNDED — the tier-1 course that opens a major starts from
// here and nowhere else, because the decision is "what goes in this
// building" and it needs the building on screen. The panel dispatches
// FOUND_PROGRAM; the gate it reads (canFoundProgram) is the reducer's own,
// so the button can never offer what the action would refuse.

const INFO_RING_SIZE = 30;

// A dorm's capacity is simply its capacityBonus effect — including the
// founding dorm, which carries its beds through the same effect every other
// dorm does (see campusData.ts; the founding hall opens pre-built, and its
// beds are folded into the founding capacity — see actions.ts).
function dormCapacity(t: Buildable): number | null {
  return t.effects?.capacityBonus ?? null;
}

// What a facility's servesPopulation effect actually COUNTS, per
// facilityType — a dining hall's is seats, a library's is study seats, a
// health center's is how many students it can care for, and so on. Quad
// and lab are deliberately absent: neither has a servesPopulation effect
// at all (a quad is a flat, non-scaling bonus; a lab is a research-rate
// multiplier gating one major's capstone courses), so neither has a
// natural "capacity" figure — see the facility branch below for what's
// shown for those two instead.
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

// The five varsity athletics venues (facilitiesData.ts) — a shared
// competition facility whose info panel should say which team(s) actually
// play there, not just a capacity figure like an ordinary facility (see
// AthleticsVenueInfo below).
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
        {' — no capacity figure; a quad doesn’t scale with enrollment.'}
      </p>
    );
  }
  if (ft === 'lab') {
    return (
      <p className="building-info-line">
        {t.effects?.researchRateBonus !== undefined
          ? `+${Math.round(t.effects.researchRateBonus * 100)}% research output`
          : 'Specialized lab space.'}
        {' — no capacity figure; gates this major’s capstone coursework instead.'}
      </p>
    );
  }
  return <p className="building-info-line">{t.description}</p>;
}

// The completion figure shown for an academic building: the exact same
// done/total CurriculumTab.tsx's own ring for this school computes (see
// discoverySections/completion, both exported from there for this purpose)
// — never re-derived here, so the two can't drift apart. `courseIds` is
// the section's schoolCourseIds when a section exists, or a direct fallback
// (General Studies has no section of its own — see discoverySections'
// comment — and a professional school not yet revealed, which can't
// actually happen for a PLACED building, but is a harmless fallback).
function CourseCompletion({ s, courseIds }: { s: GameState; courseIds: string[] }) {
  if (courseIds.length === 0) return null;
  const comp = completion(s, courseIds);
  // HOW THE TEACHING IS GOING, beside how much of it exists. The same
  // aggregate the Curriculum tab's own school heading shows, rendered with
  // the same chip and the same ramp — a B on a hall and a B on a course
  // cell have to mean the same thing, which they do because they are the
  // same function (averageCourseQuality) and the same component.
  //
  // Absent rather than zero when nothing is graded yet: a school with no
  // developed course has no average, and an F would be a lie about a
  // building that has simply not opened anything.
  const avg = averageCourseQuality(s, courseIds);
  return (
    <p className="building-info-completion">
      <ProgressRing fraction={comp.fraction} size={INFO_RING_SIZE} title={`${comp.done} of ${comp.total} courses developed`} />
      <span className="stat">{comp.done} / {comp.total}<br />developed</span>
      {avg !== null && (
        <span className="building-info-grade">
          <GradeChip grade={gradeFor(avg)} title={`Averages ${Math.round(avg)} / 100 across its developed courses`} />
          <span className="stat">average<br />grade</span>
        </span>
      )}
    </p>
  );
}

// "Take me to it." The hall is where the player is looking; the courses it
// stands for are two clicks and a scroll away in another view, and the map
// has no way to show them. See App.tsx's overlay target for the channel.
function OpenInCurriculum({ id, onOpenCurriculum }: { id: string; onOpenCurriculum?: (id: string) => void }) {
  if (!onOpenCurriculum) return null;
  return (
    <button type="button" className="building-info-jump" onClick={() => onOpenCurriculum(id)}>
      Open in Curriculum →
    </button>
  );
}

// ---------------------------------------------------------------------
// THE PROGRAM TILE (Plan 14's PR D). A filled slot: the program's name in
// its school's colour, its progress (courses done of nine) and its
// aggregate grade. Clicking it expands the tile in place to a strip of
// its courses in tier order — each done course showing its grade and
// instructor, each available course a + — and clicking a + opens the same
// instructor picker the course drawer uses and starts that course. One
// course, one deliberate choice of who teaches it, 421 times: there is no
// auto-assignment anywhere here. START_DEVELOPMENT is unchanged and still
// serves the Curriculum tab's drawer; this is a second caller, not a
// second mechanism.
// ---------------------------------------------------------------------
type StripState = 'locked' | 'blocked' | 'available' | 'developing' | 'done';
function stripState(s: GameState, t: Buildable): StripState {
  if (t.status === 'done') return 'done';
  if (t.status === 'developing') return 'developing';
  if (t.status === 'locked') return 'locked';
  return canStartDevelopment(s, t) ? 'available' : 'blocked';
}

function ProgramTile({ program, s, act, open, onToggle }: {
  program: ProgramInfo; s: GameState; act?: (a: Action) => void; open: boolean; onToggle: () => void;
}) {
  const mark = schoolMark(program.school);
  const courses = program.courseIds.map((id) => s.tech.find((t) => t.id === id)).filter((t) => t !== undefined);
  const done = courses.filter((t) => t.status === 'done').length;
  const loads = facultyLoads(s);
  const avg = averageCourseQuality(s, program.courseIds, loads);
  const inTransit = transitWeeks(s, program.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickedFaculty, setPickedFaculty] = useState<string | null>(null);
  useEffect(() => { setSelectedId(null); setPickedFaculty(null); }, [program.id, open]);
  const selected = selectedId ? courses.find((t) => t.id === selectedId) : undefined;

  return (
    <div className={`hall-slot housed${open ? ' open' : ''}`} style={{ borderColor: mark.hue, ['--school-hue' as string]: mark.hue }}>
      <button
        type="button"
        className="program-tile"
        onClick={onToggle}
        aria-expanded={open}
        title={`${program.name} (${program.school}) — ${done} of ${courses.length} courses developed`}
      >
        <span className="hall-slot-motif" style={{ color: mark.hue }} aria-hidden="true">{mark.motif}</span>
        <span className="hall-slot-name">{program.name}</span>
        <span className="program-tile-meta">
          {inTransit > 0
            ? <span className="program-tile-transit" title={`In transit — ${inTransit} weeks until it is teaching again`}>moving · {inTransit}w</span>
            : <span className="program-tile-progress">{done}/{courses.length}</span>}
          {avg !== null && <GradeChip grade={gradeFor(avg)} title={`Averages ${Math.round(avg)} / 100 across its developed courses`} />}
        </span>
      </button>
      {open && (
        <div className="program-strip" role="group" aria-label={`${program.name} courses`}>
          {courses.map((t) => {
            const state = stripState(s, t);
            const quality = courseQuality(s, t, loads);
            const [code] = t.name.split(' · ');
            const num = code.replace(/^[A-Z]+\s*/, '');
            const unstaffed = isUnstaffed(s, t);
            return (
              <button
                key={t.id}
                type="button"
                className={`program-strip-cell ${state}${selectedId === t.id ? ' selected' : ''}${unstaffed ? ' unstaffed' : ''}${inTransit > 0 ? ' transit' : ''}`}
                onClick={() => { setSelectedId(selectedId === t.id ? null : t.id); setPickedFaculty(null); }}
                aria-pressed={selectedId === t.id}
                title={`${t.name} — ${state}`}
              >
                <span className="program-strip-num">{num}</span>
                {quality
                  ? <span className={`program-strip-grade grade-${quality.grade.toLowerCase()}`}>{quality.grade}</span>
                  : state === 'available' ? <span className="program-strip-plus" aria-hidden="true">+</span>
                  : state === 'done' ? <span aria-hidden="true">✓</span>
                  : state === 'developing' ? <span aria-hidden="true">…</span>
                  : null}
              </button>
            );
          })}
        </div>
      )}
      {open && selected && (
        <StripCourse t={selected} s={s} act={act} picked={pickedFaculty} onPick={setPickedFaculty} onStarted={() => { setSelectedId(null); setPickedFaculty(null); }} />
      )}
      {open && <RelocateControls program={program} s={s} act={act} />}
    </div>
  );
}

// RELOCATION (PR F). Every free slot in every standing hall, offered as a
// destination — and what the move costs, said up front: the program goes
// dark for RELOCATION_WEEKS. A program already in transit cannot be moved
// again until it settles.
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
        Move it — free, but the program goes dark for {RELOCATION_WEEKS} weeks: no teaching, no progress, and it counts toward no school until it settles.
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

// What one cell of the strip says when opened: who teaches a done course
// and how it is graded; who to choose for an available one, and the
// button that starts it; and for a course that cannot start, exactly why
// — a lab to build, cash short, or a department with no free slot and
// whether the market can fix that today (facultyGate).
function StripCourse({ t, s, act, picked, onPick, onStarted }: {
  t: Buildable; s: GameState; act?: (a: Action) => void;
  picked: string | null; onPick: (id: string) => void; onStarted: () => void;
}) {
  const state = stripState(s, t);
  const [code, titleFromName] = t.name.split(' · ');
  const title = titleFromName ?? code;
  const instructor = instructorOf(s, t);
  const quality = courseQuality(s, t);
  const eligible = state === 'available' || state === 'blocked' ? eligibleInstructors(s, t) : [];
  const chosen = picked ?? eligible[0]?.id ?? null;
  const gate = t.requiresFaculty ? facultyGate(s, t.requiresFaculty) : 'open';
  const shortfall = t.cost - s.finance.cash;
  const unmet = t.prereqs.filter((id) => s.tech.find((x) => x.id === id)?.status !== 'done');

  return (
    <div className="strip-course">
      <p className="strip-course-head">
        <span className="hall-offer-code">{code}</span> {title}
      </p>
      {(state === 'done' || state === 'developing') && (
        <p className="building-info-line">
          {state === 'developing' ? `In development — ${s.developing[t.id] ?? 0} of ${t.duration} weeks left. ` : ''}
          {instructor
            ? <>Taught by {instructor.name}{quality ? <> — <GradeChip grade={quality.grade} title={`Quality ${Math.round(quality.score)} / 100`} /></> : null}</>
            : 'No instructor — assign one from the Curriculum tab.'}
        </p>
      )}
      {state === 'locked' && (
        <p className="building-info-line">
          Opens once {unmet.map((id) => s.tech.find((x) => x.id === id)?.name.split(' · ')[0] ?? id).join(', ') || 'its prerequisites are'} done.
        </p>
      )}
      {(state === 'available' || state === 'blocked') && (
        <>
          <p className="building-info-line">${t.cost.toLocaleString()} · {t.duration} weeks · {t.requiresFaculty ?? 'no department'}</p>
          {eligible.length > 0 ? (
            <>
              <div className="instructor-options">
                {eligible.map((f) => (
                  <InstructorOption key={f.id} s={s} f={f} selected={chosen === f.id} projectedFor={t} onPick={() => onPick(f.id)} />
                ))}
              </div>
              {t.requiresFaculty && act && (
                <details className="course-drawer-more">
                  <summary>Appoint someone new in {t.requiresFaculty}</summary>
                  <MarketInField s={s} act={act} field={t.requiresFaculty} projectedFor={t} />
                </details>
              )}
            </>
          ) : t.requiresFaculty ? (
            <>
              <p className="building-info-line building-info-construction">
                No {t.requiresFaculty} professor has a free course slot{gate === 'hireable' ? ' — appoint somebody below.' : '.'}
              </p>
              {act && <MarketInField s={s} act={act} field={t.requiresFaculty} projectedFor={t} />}
            </>
          ) : null}
          {shortfall > 0 && (
            <p className="building-info-line building-info-construction">${Math.ceil(shortfall).toLocaleString()} short of the development cost.</p>
          )}
          <button
            type="button"
            className="building-info-jump"
            disabled={!act || !chosen || !canStartDevelopment(s, t, chosen)}
            onClick={() => { if (act && chosen) { act({ type: 'START_DEVELOPMENT', nodeId: t.id, facultyId: chosen }); onStarted(); } }}
          >
            {chosen ? `Develop with ${eligible.find((f) => f.id === chosen)?.name ?? 'selected faculty'}` : 'Develop'}
          </button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// THE HALL VIEW. A 2x3 grid of slots. An empty slot is a pale parchment
// tile with a +; clicking it fans out the three programs on offer as
// course tiles — the entry course's code, its name, its cost, its field,
// and the school's colour and mark (schoolPalette.ts). Picking one opens
// the same instructor picker the course drawer uses, and "Found" is the
// one button on the map that starts a course. A filled slot shows its
// program; PR D grows it into the program tile.
// ---------------------------------------------------------------------
function HallSlots({ t, s, act }: { t: Buildable; s: GameState; act?: (a: Action) => void }) {
  const slots = s.halls[t.id];
  // Which empty slot is open (fanned out), and which offer is picked in it.
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [pickedProgram, setPickedProgram] = useState<string | null>(null);
  const [pickedFaculty, setPickedFaculty] = useState<string | null>(null);
  // Which housed program's tile is expanded (PR D). One at a time: the
  // panel is a column, and two strips of nine open at once is a wall.
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
              />
            );
          }
          const open = openSlot === i;
          return (
            <button
              key={i}
              type="button"
              className={`hall-slot empty${open ? ' open' : ''}`}
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
                    ${(course?.cost ?? 0).toLocaleString()} · {course?.requiresFaculty ?? '—'}
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
                  ${Math.ceil(entry.cost - s.finance.cash).toLocaleString()} short of the entry course's cost.
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
                  ? `Found ${picked.name} · $${entry.cost.toLocaleString()}`
                  : `Found ${picked.name}`}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// A building's info: an academic hall (its slots), or Founders Hall (the
// core) — discoverySchools() is the mapping CurriculumTab.tsx itself
// reads, imported rather than duplicated so this panel can never disagree
// with that tab.
function BuildingHallInfo({ t, s, act, onOpenCurriculum }: {
  t: Buildable; s: GameState; act?: (a: Action) => void; onOpenCurriculum?: (id: string) => void;
}) {
  // An academic hall (the repeatable chain): its slots are the whole of
  // what it is.
  if (isAcademicHall(t)) return <HallSlots t={t} s={s} act={act} />;

  const school = discoverySchools().find((sc) => sc.buildingId === t.id);
  if (school) {
    const section = discoverySections(s).find((sec) => sec.key === t.id);
    return (
      <>
        {school.majors.length > 0 ? (
          <ul className="building-info-majors">
            {school.majors.map((m) => <li key={m.prefix}>{m.name}</li>)}
          </ul>
        ) : (
          <p className="building-info-line">The shared general-education core — no majors of its own.</p>
        )}
        <CourseCompletion s={s} courseIds={section ? section.schoolCourseIds : school.coreIds} />
        <OpenInCurriculum id={school.name} onOpenCurriculum={onOpenCurriculum} />
      </>
    );
  }

  // Unreachable for real seed data (every 'building' Buildable is a hall
  // or Founders Hall) — a plain fallback rather than a thrown error, since
  // this is an info panel, not a place worth crashing the map over.
  return <p className="building-info-line">{t.description}</p>;
}

export default function BuildingInfoPanel({ t, s, act, onClose, onOpenCurriculum }: {
  t: Buildable; s: GameState; onClose: () => void;
  // The one thing this panel dispatches: FOUND_PROGRAM from a hall's slot
  // (see HallSlots). Optional, like onOpenCurriculum, so the panel stays
  // renderable on its own terms; the map always passes both.
  act?: (a: Action) => void;
  // Opens the Curriculum tab at a school (by name) or a professional
  // school (by its building id) — the section keys CurriculumTab.tsx uses.
  onOpenCurriculum?: (sectionKey: string) => void;
}) {
  // Escape closes the panel, same as TabOverlay's own dismiss — this only
  // binds while the panel is actually mounted (see CampusMap.tsx, which
  // renders this component only when a building is inspected).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // A developing placeable's effects are authored data on `t.effects`
  // already (what it WILL grant once it finishes — see techSystem.ts's
  // applyEffects), not yet anything the school actually has — the kind-
  // specific info below reads the same fields either way, so this banner is
  // what keeps a still-under-construction building from reading as already
  // standing.
  const weeksLeft = s.developing[t.id];
  return (
    <div className={`building-info-panel${isAcademicHall(t) ? ' hall' : ''}`} role="dialog" aria-label={`${t.name} info`}>
      <div className="building-info-head">
        <h3>{hallDisplayName(s, t)}</h3>
        <button type="button" className="building-info-close" onClick={onClose} aria-label="Close">✕</button>
      </div>
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
    </div>
  );
}
