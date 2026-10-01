// ---------------------------------------------------------------------
// The harness's athletics specialist (Plan 85G). Until a college specializes
// in athletics the harness's players run its department as they always
// have (the Guided player builds the venues its teams wait on and nothing
// more; the championships goal player runs its own). Once one does, every
// player, unless it says otherwise (Player.athletics), runs the department
// the way the specialization asks, at the top of each week (game.ts's
// playWeek), before its own moves:
//
//   the complex    builds the Athletic Performance Complex once it can pay
//                  for it and keep the guided player's reserve (Guided and
//                  the Completionist build any capital project that opens
//                  anyway; this is for any other player)
//   the subsidy    the high subsidy level: the most flagships
//   the posts      every program's empty coaching posts filled with the best
//                  candidate listed, while the week is in the black; a
//                  flagship's coach replaced by one listed fifteen points
//                  better after two years (the championships player's rule)
//   the flagships  the flagships it has put on full scholarships kept at
//                  the top of the list, and the rest by quality below them,
//                  so a slot the complex adds goes to the strongest of the
//                  rest, and no flagship it has invested in is demoted
//   scholarships   full on every flagship, once the year's net covers them
//   the field house   built when it opens: a lift to every program
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import type { Coach, GameState, VarsityTeam } from '../../src/state/types';
import {
  ATHLETICS_COMPLEX_ID,
} from '../../src/data/athleticsComplexData';
import {
  FIELD_HOUSE_ID, TRAINER_FIELD, departmentPot, orderedTeams, scholarshipCostFor, teamQuality,
} from '../../src/data/studentLifeData';
import { weeklyNet } from '../../src/systems/finance/financeSystem';
import { specializationOf } from '../../src/systems/prestige/specialization';
import { WEEKS_PER_YEAR } from '../../src/state/types';
import type { Game } from './game';
import { reserveOf } from './guided';
import { site } from './moves';

// How often the list is put in order, in weeks: a quarter.
export const ORDER_EVERY_WEEKS = 13;
// A listed coach replaces a flagship's after this long, if this much better.
const UPGRADE_TENURE_WEEKS = 104;
const UPGRADE_MARGIN = 15;

const ROLES = ['head', 'assistant', 'trainer'] as const;
const slotOf = (role: (typeof ROLES)[number]) => (role === 'head' ? 'headCoach' : role === 'assistant' ? 'assistantCoach' : 'trainer');
// What a card shows of a coach: the scouted range's middle, or the quality.
const shown = (c: Coach) => (c.scouted ? (c.scouted[0] + c.scouted[1]) / 2 : c.quality);

// The order: the flagships on full scholarships as they stand, then the
// rest by quality.
export function athleticsOrder(s: GameState): string[] {
  const pot = departmentPot(s);
  const flagships = pot.programs.filter((p) => p.band === 'flagship' && p.team.scholarships === 'full').map((p) => p.team.id);
  const rest = orderedTeams(s).filter((t) => t.status === 'active' && !flagships.includes(t.id))
    .sort((a, b) => teamQuality(b, s, pot) - teamQuality(a, s, pot));
  const waiting = orderedTeams(s).filter((t) => t.status !== 'active').map((t) => t.id);
  return [...flagships, ...rest.map((t) => t.id), ...waiting];
}

function staff(g: Game, team: VarsityTeam, flagship: boolean): void {
  for (const role of ROLES) {
    const slot = slotOf(role);
    const field = role === 'trainer' ? TRAINER_FIELD : team.sport;
    const best = g.s.orgs.coachCandidates.filter((c) => c.field === field).sort((a, b) => shown(b) - shown(a) || b.quality - a.quality)[0];
    if (!best) continue;
    const current = team[slot];
    if (current === null) {
      if (weeklyNet(g.s) > 0) g.act({ type: 'HIRE_COACH', candidateId: best.id, teamId: team.id, role });
      continue;
    }
    if (flagship && current.tenureWeeks >= UPGRADE_TENURE_WEEKS && shown(best) >= Math.max(current.quality, shown(current)) + UPGRADE_MARGIN) {
      g.act({ type: 'FIRE_COACH', teamId: team.id, role });
      g.act({ type: 'HIRE_COACH', candidateId: best.id, teamId: team.id, role });
    }
  }
}

// Runs the department for a college specialized in athletics. Returns
// whether it did anything.
export function runAthletics(g: Game): boolean {
  if (specializationOf(g.s) !== 'athletics') return false;
  const before = g.actions;
  const reserve = reserveOf(g.s);
  // The complex, once it opens and the money is there.
  const complex = g.s.tech.find((t) => t.id === ATHLETICS_COMPLEX_ID);
  if (complex && complex.status === 'available' && !(complex.id in g.s.placements) && g.s.finance.cash - complex.cost >= reserve) site(g, complex);
  if (g.s.orgs.teams.length === 0) return g.actions > before;
  if (g.s.orgs.athleticsBudget !== 'high') g.act({ type: 'SET_ATHLETICS_BUDGET', tier: 'high' });
  // The list: kept in order a quarter at a time, and at once while a
  // flagship has no scholarships yet (a slot the complex has just added).
  const order = athleticsOrder(g.s);
  const current = orderedTeams(g.s).map((t) => t.id);
  const unfunded = departmentPot(g.s).programs.some((p) => p.band === 'flagship' && p.team.scholarships !== 'full');
  if (order.join() !== current.join() && (g.s.clock.week % ORDER_EVERY_WEEKS === 0 || unfunded)) {
    g.act({ type: 'SET_TEAM_ORDER', order });
  }
  const pot = departmentPot(g.s);
  const flagships = new Set(pot.programs.filter((p) => p.band === 'flagship').map((p) => p.team.id));
  for (const team of g.s.orgs.teams) {
    if (team.status === 'active') staff(g, team, flagships.has(team.id));
  }
  for (const team of g.s.orgs.teams) {
    if (!flagships.has(team.id) || team.scholarships === 'full') continue;
    if (weeklyNet(g.s) * WEEKS_PER_YEAR < scholarshipCostFor(team.sport, 'full')) continue;
    g.act({ type: 'SET_SCHOLARSHIPS', teamId: team.id, level: 'full' });
  }
  const house = g.s.tech.find((t) => t.id === FIELD_HOUSE_ID);
  if (house && house.status === 'available' && !(house.id in g.s.placements) && g.s.finance.cash - house.cost >= reserve) site(g, house);
  return g.actions > before;
}
