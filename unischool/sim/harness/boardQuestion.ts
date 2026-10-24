// ---------------------------------------------------------------------
// The board's question (Plan 116D, data/boardQuestionData.ts): from Year
// 25, one inbox matter a year that trades one pillar for another. Every
// player, unless it says otherwise (Player.boardQuestion), answers it at the
// top of the week it arrives (game.ts's playWeek), by its lead pillar:
//
//   the lead pillar  its specialization's, or before one its strongest
//                    pillar (pillarValue)
//   the answer       the one whose trade raises the lead pillar; none does,
//                    the default, which changes nothing (an answer that
//                    lowers it is never taken, nor one that closes a
//                    program: so the gift goes to the goal players alone)
//
// A player with its own reasons (the goal players, tools/review/
// goalPlayers.ts) says false here and answers in its own moves, with
// pendingBoardQuestion and answerBoardQuestion. Idle never answers: the
// question takes its default when its weeks run out.
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import type { CatalogueEvent } from '../../src/data/eventCatalogueTypes';
import type { GameState, PendingCatalogueEvent, Pillar } from '../../src/state/types';
import { isBoardQuestion } from '../../src/data/boardQuestionData';
import { catalogueOf } from '../../src/systems/events/catalogueEngine';
import { eventById } from '../../src/systems/events/catalogue';
import { PILLARS, pillarValue } from '../../src/systems/prestige/prestigeSystem';
import { specializationOf } from '../../src/systems/prestige/specialization';
import type { Game } from './game';

// The question waiting, with its event; null when none is.
export function pendingBoardQuestion(s: GameState): { p: PendingCatalogueEvent; e: CatalogueEvent } | null {
  const p = catalogueOf(s).pending.find((x) => isBoardQuestion(x.eventId));
  const e = p ? eventById(p.eventId) : undefined;
  return p && e ? { p, e } : null;
}

export function leadPillar(s: GameState): Pillar {
  return specializationOf(s) ?? [...PILLARS].sort((a, b) => pillarValue(s, b) - pillarValue(s, a))[0];
}

// The answer whose trade raises `pillar`; the default when none does. Never
// one that closes a program: the harness's players build the whole
// catalogue (the pacing card's "left to build"), and a program closed in
// Year 50 is never founded again.
export function answerFor(e: CatalogueEvent, pillar: Pillar): string {
  return e.choices.find((c) => (c.standing?.[pillar] ?? 0) > 0 && !c.effects.closeProgram)?.id ?? e.default;
}

export function answerBoardQuestion(g: Game, choiceId: string): boolean {
  const q = pendingBoardQuestion(g.s);
  if (!q) return false;
  g.act({ type: 'RESOLVE_CATALOGUE_EVENT', instanceId: q.p.instanceId, choiceId });
  return true;
}

// Answers the year's question by the lead pillar. True if it answered.
export function runBoardQuestion(g: Game): boolean {
  const q = pendingBoardQuestion(g.s);
  return q ? answerBoardQuestion(g, answerFor(q.e, leadPillar(g.s))) : false;
}
