import { useEffect } from 'react';
import type { Buildable, FacilityType, GameState } from '../state/types';
import { discoverySchools, professionalSchools } from '../data/techData';
import { completion, discoverySections } from '../tabs/CurriculumTab';
import { STARTING_DORM_CAPACITY, STARTING_DORM_ID } from '../data/campusData';
import { ProgressRing } from './Progress';

// A read-only popover for a PLACED building — what clicking it (outside
// placement/path-draw mode; see CampusMap.tsx's inspectBuilding) shows.
// Pure projection: every figure here already lives on the Buildable itself
// or in the curriculum data CurriculumTab.tsx reads, nothing is computed
// fresh for this panel and nothing it reads is written back — see the PR
// notes on why this stays a read, never a second source of truth for the
// school/majors mapping or a school's course-completion count.

const INFO_RING_SIZE = 30;

// A dorm's capacity is its capacityBonus effect, EXCEPT the founding dorm
// (STARTING_DORM_ID), whose capacity was folded into the game's starting
// baseline rather than granted through effects (see campusData.ts) — so it
// carries none. STARTING_DORM_CAPACITY is the one other place that number
// lives.
function dormCapacity(t: Buildable): number | null {
  if (t.effects?.capacityBonus !== undefined) return t.effects.capacityBonus;
  return t.id === STARTING_DORM_ID ? STARTING_DORM_CAPACITY : null;
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
              {team.name} — coach {team.coachName}
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
  return (
    <p className="building-info-completion">
      <ProgressRing fraction={comp.fraction} size={INFO_RING_SIZE} title={`${comp.done} of ${comp.total} courses developed`} />
      <span className="stat">{comp.done} / {comp.total}<br />developed</span>
    </p>
  );
}

// An academic hall's info: either one of the seven undergraduate schools
// (discoverySchools()) or Medicine/Law, which are their own top-level
// curriculum sections rather than a school (professionalSchools()) — the
// same two mappings CurriculumTab.tsx itself reads, imported rather than
// duplicated so this panel's majors list can never disagree with that tab.
function BuildingHallInfo({ t, s }: { t: Buildable; s: GameState }) {
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
      </>
    );
  }

  const prof = professionalSchools().find((p) => p.buildingId === t.id);
  if (prof) {
    const section = discoverySections(s).find((sec) => sec.key === t.id);
    return (
      <>
        <p className="building-info-line">{prof.degree}</p>
        <CourseCompletion s={s} courseIds={section ? section.schoolCourseIds : prof.courseIds} />
      </>
    );
  }

  // Unreachable for real seed data (every 'building' Buildable is either a
  // school or a professional school above) — a plain fallback rather than
  // a thrown error, since this is a read-only info panel, not a place
  // worth crashing the map over.
  return <p className="building-info-line">{t.description}</p>;
}

export default function BuildingInfoPanel({ t, s, onClose }: { t: Buildable; s: GameState; onClose: () => void }) {
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

  return (
    <div className="building-info-panel" role="dialog" aria-label={`${t.name} info`}>
      <div className="building-info-head">
        <h3>{t.name}</h3>
        <button type="button" className="building-info-close" onClick={onClose} aria-label="Close">✕</button>
      </div>
      {t.kind === 'dorm' && (
        <p className="building-info-line">
          {(() => {
            const capacity = dormCapacity(t);
            return capacity !== null ? `${capacity.toLocaleString()} beds` : 'Capacity unknown.';
          })()}
        </p>
      )}
      {t.kind === 'facility' && <FacilityInfo t={t} s={s} />}
      {t.kind === 'building' && <BuildingHallInfo t={t} s={s} />}
    </div>
  );
}
