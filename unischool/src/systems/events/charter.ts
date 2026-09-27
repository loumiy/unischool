import type { GameState } from '../../state/types';
import { institutionName } from '../../state/types';

// THE UNIVERSITY CHARTER (Plan 78G; docs/design/progression.md's "College,
// and University"). The board grants it the first quiet week a lab is at
// work (eventSystem.ts's fireCharter), and the President decides the name:
// the catalog's one undrawn inline event (eventCatalogue.ts's
// CHARTER_EVENT), waiting in the inbox with "Become X University" as its
// default. Cosmetic: no system reads the name.

// The one instance a run ever has, so raising it draws nothing from the
// run's stream (catalogueEngine.ts's fire rolls an id and names).
export const CHARTER_INSTANCE = 'university-charter';

// What the event's words name: the first half of the college's name.
export function charterVars(s: GameState): Record<string, string> {
  return { name: s.self.name, school: institutionName(s.self) };
}

// The answer (the 'charter' effect, catalogue.ts's applyEffects): take
// "University", or keep the name. Either way the log says the charter was
// granted, for the player who never opened the inbox.
export function grantCharter(s: GameState, take: boolean): void {
  s.self.universityCharterOffered = true;
  const was = institutionName(s.self);
  if (take) s.self.suffix = 'University';
  const now = institutionName(s.self);
  s.log.unshift({
    year: s.clock.year, week: s.clock.week, kind: 'good', topic: 'milestone', subject: 'charter',
    message: now === was
      ? `With research under way, the board has granted a university charter, and ${now} keeps its name.`
      : `With research under way, the board has granted a university charter: ${was} is now ${now}.`,
  });
}
