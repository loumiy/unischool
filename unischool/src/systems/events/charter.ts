import type { GameState, InstitutionTitle } from '../../state/types';
import { INSTITUTION_TITLES, institutionName } from '../../state/types';
import type { CatalogueEvent } from '../../data/eventCatalogueTypes';
import { INSTITUTE_CHARTER_EVENT, INSTITUTE_CHARTER_KEPT_EVENT, INSTITUTE_CHARTER_UNIVERSITY_EVENT, UNIVERSITY_CHARTER_EVENT } from '../../data/eventCatalogue';
import { graduateProgram } from '../../data/techData';

// THE CHARTERS (Plan 78G, Plan 127; docs/design/progression.md's "College,
// Institute and University"). A college carries one of three titles, equals
// in the name. Within a run the board offers the other two by letter: the
// Institute charter the first quiet week a lab is at work (eventSystem.ts's
// fireInstituteCharter), the University charter the first quiet week a
// graduate program has been founded (fireUniversityCharter). Each waits in
// the inbox with its offer as the default, and each answer is final until
// the next letter. Cosmetic: no system reads the name.

// The one instance of each a run ever has, so raising one draws nothing
// from the run's stream (catalogueEngine.ts's fire rolls an id and names).
export const INSTITUTE_CHARTER_INSTANCE = 'charter-institute';
export const UNIVERSITY_CHARTER_INSTANCE = 'charter-university';

// What the events' words name: the first half of the college's name, and
// the whole of it.
export function charterVars(s: GameState): Record<string, string> {
  return { name: s.self.name, school: institutionName(s.self) };
}

// The Institute charter's telling, by the title the college carries when it
// is raised (Plan 127, D4).
export function instituteCharterEvent(s: GameState): CatalogueEvent {
  if (s.self.suffix === 'Institute') return INSTITUTE_CHARTER_KEPT_EVENT;
  if (s.self.suffix === 'University') return INSTITUTE_CHARTER_UNIVERSITY_EVENT;
  return INSTITUTE_CHARTER_EVENT;
}

export function universityCharterEvent(): CatalogueEvent {
  return UNIVERSITY_CHARTER_EVENT;
}

// Whether a graduate program has been founded (Plan 127, D1): housed in its
// host, its entry course begun. Not its first graduate.
export function graduateProgramFounded(s: GameState): boolean {
  return Object.values(s.halls).some((slots) => slots.some((x) => x.programId !== null && graduateProgram(x.programId) !== undefined));
}

// The 'charter' and 'universityCharter' effects (catalogue.ts's
// applyEffects): 1 to 3 a title (College, Institute, University), anything
// else the name as it stands.
export function titleOfEffect(v: number): InstitutionTitle | null {
  return v >= 1 && v <= INSTITUTION_TITLES.length ? INSTITUTION_TITLES[v - 1] : null;
}

// An answer: the title it takes, or none to keep the name. Either way the
// log says the charter was granted, for the player who never opened the
// inbox.
export function grantTitle(s: GameState, letter: 'institute' | 'university', title: InstitutionTitle | null): void {
  s.self.charters[letter] = true;
  const was = institutionName(s.self);
  if (title) s.self.suffix = title;
  const now = institutionName(s.self);
  const opening = letter === 'institute'
    ? 'Your first laboratory is open, and the board has granted a charter.'
    : 'Your first graduate program has begun, and the board has granted a university charter.';
  s.log.unshift({
    year: s.clock.year, week: s.clock.week, kind: 'good', topic: 'milestone', subject: 'charter',
    message: now === was ? `${opening} ${now} keeps its name.` : `${opening} ${was} is now ${now}.`,
  });
}
