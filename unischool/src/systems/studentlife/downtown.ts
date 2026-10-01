import type { GameState } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';
import {
  DISTRICT_YEARS_TO_FULL, FESTIVAL, FESTIVAL_NAMES, GOODWILL_MAX,
  SKIPPED_GOODWILL, districtPace, downtownWorks, emptyDowntown, festivalScaleOf, goodwillOf,
} from '../../data/downtownData';
import { annualGiving } from '../alumni/giving';
import { money } from '../../format';

// THE DOWNTOWN AND THE FESTIVAL (Plan 85H; the numbers and words are
// data/downtownData.ts's). At a college specialized in student life:
//
//   the district   grows each week, faster the warmer the town's goodwill
//                  (tickDowntown); what it meets of the students' needs is
//                  satisfactionSystem.ts's (offCampusPlaces)
//   the festival   raised in the inbox each spring (events/
//                  catalogueEngine.ts's raiseFestival), an undrawn inline
//                  matter like the charter; its answer, the catalog's
//                  'festival' lever, holds it (holdFestival)
//   goodwill       the festivals raise it, a spring without one costs it,
//                  and the town-and-gown events trade it (changeGoodwill)
//
// Nothing here draws from the run's stream, so a college specialized in
// anything else plays exactly as before.

function downtownOf(s: GameState) {
  return (s.downtown ??= emptyDowntown());
}

// The town's goodwill moved by `points`, kept to 0..GOODWILL_MAX.
export function changeGoodwill(s: GameState, points: number): void {
  const d = downtownOf(s);
  d.goodwill = Math.max(0, Math.min(GOODWILL_MAX, d.goodwill + points));
}

// The weekly tick (the reducer's SYSTEMS, after the student-life tick and
// before satisfaction, so the district's places count this week).
export function tickDowntown(s: GameState): void {
  if (!downtownWorks(s)) return;
  const d = downtownOf(s);
  if (d.growth < 1) d.growth = Math.min(1, d.growth + districtPace(d.goodwill) / (DISTRICT_YEARS_TO_FULL * WEEKS_PER_YEAR));
}

// The answer (the catalog's 'festival' lever, catalogue.ts's applyEffects):
// `index` 0 is none, 1 to 4 the scales. Its cost and its mood are the
// answer's own levers; here, the rest: the record, the town's goodwill, next
// summer's applicants and the gala's gifts. Held once a spring.
export function holdFestival(s: GameState, index: number): void {
  const d = downtownOf(s);
  const year = s.clock.year;
  if (d.festivals.some((f) => f.year === year)) return;
  const scale = festivalScaleOf(index);
  d.festivals.push({ year, week: s.clock.week, scale });
  if (scale === 'none') {
    changeGoodwill(s, SKIPPED_GOODWILL);
    s.log.unshift({
      year, week: s.clock.week, kind: 'bad', topic: 'event',
      message: `No spring festival this year. The downtown's merchants have taken it personally: the town's goodwill falls to ${Math.round(goodwillOf(s))}.`,
    });
    return;
  }
  const t = FESTIVAL[scale];
  changeGoodwill(s, t.goodwill);
  const lift = Math.round(Math.max(0, s.students.applicantPool) * t.applicants);
  s.students.applicantLift += lift;
  const gifts = t.gifts > 0 ? Math.round(annualGiving(s) * t.gifts) : 0;
  if (gifts > 0) s.finance.endowment += gifts;
  const name = FESTIVAL_NAMES[scale];
  s.log.unshift({
    year, week: s.clock.week, kind: 'good', topic: 'event',
    message: `The spring festival, ${name}, filled the downtown${gifts > 0 ? `, and the alumni at the gala gave ${money(gifts)} to the endowment` : ''}. The town's goodwill stands at ${Math.round(goodwillOf(s))}.`,
  });
}
