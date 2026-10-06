import type { GameState, SpeedUpKind } from '../../state/types';
import { weeksOfOpEx } from '../../data/moneyScale';
import {
  SPEED_UP_PILLAR, SPEED_UP_WEEKS, SPEED_UP_WORDS, STEP_GROWTH, AUTUMN_GOODWILL,
  autumnBought, classBought, emptyBought, phaseStands, wingStands,
} from '../../data/speedUpData';
import { instituteStands } from '../../data/trainingData';
import { parkStands } from '../../data/researchParkData';
import { complexStands } from '../../data/athleticsComplexData';
import { districtGrowth, emptyDowntown } from '../../data/downtownData';
import { changeGoodwill } from '../studentlife/downtown';
import { specializationOf } from './specialization';
import { money } from '../../format';

// ---------------------------------------------------------------------
// A late use for money (Plan 95X, the second review's B4-10): the purchases
// that fill a specialization's share sooner, and what each needs. The
// numbers and words are data/speedUpData.ts's; each mechanic reads what was
// bought (GameState.bought) in its own data file. Draws nothing from the
// random stream.
// ---------------------------------------------------------------------

export function speedUpPrice(s: GameState, kind: SpeedUpKind): number {
  return weeksOfOpEx(s, SPEED_UP_WEEKS[kind]);
}

// The purchases the college's specialization opens, in order: none before
// the choice.
export function speedUpsFor(s: GameState): SpeedUpKind[] {
  const chosen = specializationOf(s);
  return chosen ? (Object.keys(SPEED_UP_PILLAR) as SpeedUpKind[]).filter((k) => SPEED_UP_PILLAR[k] === chosen) : [];
}

// Spent, for good or for the year: said on the panel in place of the button.
export function speedUpDone(s: GameState, kind: SpeedUpKind): boolean {
  switch (kind) {
    case 'class': return classBought(s);
    case 'wing': return wingStands(s);
    case 'autumn': return autumnBought(s);
    case 'step': return districtGrowth(s) >= 1;
    case 'phase': return phaseStands(s);
  }
}

// Why it cannot be bought now, or null if it can. Said to the player as is.
export function speedUpRefusal(s: GameState, kind: SpeedUpKind): string | null {
  if (specializationOf(s) !== SPEED_UP_PILLAR[kind]) return 'Only for the specialization it belongs to.';
  if (kind === 'class' && !instituteStands(s)) return 'The Faculty Training Institute must stand first.';
  if (kind === 'wing' && !parkStands(s)) return 'The Research Park must stand first.';
  if (kind === 'phase' && !complexStands(s)) return 'The Athletic Performance Complex must stand first.';
  if (speedUpDone(s, kind)) return SPEED_UP_WORDS.done[kind];
  if (s.finance.cash < speedUpPrice(s, kind)) return 'Not enough cash.';
  return null;
}

// One purchase (the reducer's BUY_SPEED_UP). Refused, it changes nothing.
export function buySpeedUp(s: GameState, kind: SpeedUpKind): boolean {
  if (speedUpRefusal(s, kind) !== null) return false;
  const price = speedUpPrice(s, kind);
  s.finance.cash -= price;
  const bought = (s.bought ??= emptyBought());
  const year = s.clock.year;
  switch (kind) {
    case 'class': bought.classes.push(year); break;
    case 'wing': bought.wing = year; break;
    case 'phase': bought.phase = year; break;
    case 'autumn':
      bought.autumn.push(year);
      changeGoodwill(s, AUTUMN_GOODWILL);
      break;
    case 'step': {
      const d = (s.downtown ??= emptyDowntown());
      d.growth = Math.min(1, d.growth + STEP_GROWTH);
      break;
    }
  }
  s.log.unshift({ year, week: s.clock.week, kind: 'good', topic: 'money', message: SPEED_UP_WORDS.bought(kind, money(price)) });
  return true;
}
