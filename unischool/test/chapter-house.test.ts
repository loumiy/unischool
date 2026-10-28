// ---------------------------------------------------------------------
// A chapter house, not yet (Plan 118B, F10). A chapter that asks for a
// house when the college can't pay for it gets "not yet": no house, a
// one-point dent, and the same chapter asks again in half a year. Before,
// the only free answer closed the question for good, though the cash was
// often there a week later. With the cash in hand, "not yet" isn't offered,
// and refusing still closes it.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { teachingCollege } from './fixtures/teaching';
import { reducer } from '../src/engine/reducer';
import { absoluteWeek, findDecisionEvent, offeredChoices, type DecisionEventContext } from '../src/data/eventData';
import type { GameState, GreekChapter } from '../src/state/types';
import { WEEKS_PER_YEAR } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('chapter house tests');

const event = findDecisionEvent('greek-housing')!;

function withChapter(cash: number): { s: GameState; ctx: DecisionEventContext } {
  const s = teachingCollege('Houses');
  s.started = true;
  s.events.opening.stage = 'play';
  s.orgs.hellenicCouncilApproved = true;
  const chapter = { id: 'ch-1', name: 'Alpha Beta Gamma', kind: 'fraternity', glyphs: 'ΑΒΓ', housed: false, housingAsked: false, foundedWeek: 1, upkeepPerWeek: 1000 } as unknown as GreekChapter;
  s.orgs.chapters = [chapter];
  s.finance.cash = cash;
  const ctx: DecisionEventContext = { subjectId: 'ch-1', subjectName: chapter.name, amount: 5_000_000 };
  s.pendingInterrupt = { type: 'decision-event', payload: { eventId: 'greek-housing', ctx } };
  return { s, ctx };
}

// ---- short of cash: "not yet" ----
{
  const { s, ctx } = withChapter(4_000_000);
  const ids = offeredChoices(s, event, ctx).map((c) => c.id);
  assert(ids.includes('not-yet') && ids.includes('refuse') && ids.includes('build'), `short of cash, "not yet" is offered beside the others (${ids.join(', ')})`);
  const notYet = event.choices.find((c) => c.id === 'not-yet')!;
  assert(notYet.cost(s, ctx) === 0 && notYet.describe(s, ctx).includes('$1,000,000 short'), `it is free and says the shortfall (${notYet.describe(s, ctx)})`);

  const after = reducer(s, { type: 'RESOLVE_DECISION_EVENT', eventId: 'greek-housing', choiceId: 'not-yet', ctx });
  const chapter = after.orgs.chapters[0];
  assert(!chapter.housed && !chapter.housingAsked, 'the chapter is not housed, and not closed');
  assert(chapter.housingAskAfter === absoluteWeek(s) + Math.round(WEEKS_PER_YEAR / 2), 'it may ask again in half a year');
  assert(!event.eligible(after), 'so it does not ask again at once');
  const later = { ...after, clock: { ...after.clock, year: after.clock.year + 1 } };
  assert(event.eligible(later), 'and asks again once the half year is up');
}

// ---- with the cash: no "not yet", and refusing closes it ----
{
  const { s, ctx } = withChapter(9_000_000);
  const ids = offeredChoices(s, event, ctx).map((c) => c.id);
  assert(!ids.includes('not-yet'), `with the cash in hand, "not yet" is not offered (${ids.join(', ')})`);
  const after = reducer(s, { type: 'RESOLVE_DECISION_EVENT', eventId: 'greek-housing', choiceId: 'refuse', ctx });
  assert(after.orgs.chapters[0].housingAsked && !event.eligible(after), 'refusing still closes the question for good');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
