// ---------------------------------------------------------------------
// The teams (Plan 112B, the owner's notes for 0.1.4): the Athletics tab and
// its chapter wait for the first varsity petition, not the first sport club;
// the chapter walks the department in the order it comes (the team, the
// Athletic Director, the three posts, the venue), never asking for the
// director before a team exists; once the director is hired the Athletics
// tab rings the next thing to click; and the tab's button carries the alert
// badge while any team has a post open.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { CHAPTERS, objectiveMet, objectiveRows, ringedBuilding, settleChapters, teamsRing } from '../src/state/chapters';
import { CHAPTER_COPY } from '../src/data/chapterData';
import { tabAvailable } from '../src/components/TabNav';
import { milestoneReached, tickLadder } from '../src/systems/ladder/ladderSystem';
import { findDecisionEvent } from '../src/data/eventData';
import { openChairs, teamsShortStaffed, TRAINER_FIELD } from '../src/data/studentLifeData';
import Toolbar from '../src/components/Toolbar';
import AthleticsTab from '../src/tabs/AthleticsTab';
import { teachPillars } from './fixtures/teaching';
import { bindScriptStream } from '../src/engine/random';
import type { Coach, GameState, StudentClub } from '../src/state/types';

// useCollapse and the settings read localStorage.
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
};

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('the teams tests');
bindScriptStream(20261023);

const opened = (s: GameState, id: string) => s.guidance?.opened[id] !== undefined;
const done = (s: GameState, id: string) => s.guidance?.done[id] !== undefined;

// A guided college in year 6, every chapter of the chain done, with a sport
// club old enough to petition.
function college(): GameState {
  const s = teachPillars(createInitialState('Teams'));
  s.clock.year = 6;
  s.clock.week = 10;
  s.finance.cash = 1e9;
  const chain = CHAPTERS.filter((c) => !c.side).map((c) => c.id);
  s.guidance = { opened: Object.fromEntries(chain.map((id) => [id, 1])), done: Object.fromEntries(chain.map((id) => [id, 1])), met: [], marked: [], gated: true };
  const club: StudentClub = {
    id: 'club-football', name: 'Football Club', foundedYear: 1,
    foundingMembers: 12, foundingEnrolled: 350, upkeepPerWeek: 50,
    sport: 'football', varsityLastAskedYear: null,
  };
  s.orgs.clubs.push(club);
  settleChapters(s);
  return s;
}

// The petition on the screen, as eventSystem.ts's fireVarsityPetition raises it.
function petition(s: GameState): GameState {
  const ctx = findDecisionEvent('varsity-petition')!.rollContext!(s)!;
  s.pendingInterrupt = { type: 'decision-event', payload: { eventId: 'varsity-petition', ctx } };
  return s;
}
const answer = (s: GameState, choiceId: string) => {
  const { ctx } = s.pendingInterrupt!.payload as { ctx: never };
  return reducer(s, { type: 'RESOLVE_DECISION_EVENT', eventId: 'varsity-petition', choiceId, ctx });
};

function coach(field: string): Coach {
  return {
    id: `coach-${field}-${Math.random()}`, name: 'Test Coach', gender: 'male', heritage: 'Anglo/Western European',
    field, quality: 50, qualityPotential: 50, tenureWeeks: 0, weeksListed: 0, salary: 100_000,
  };
}

const noop = () => {};
const bar = (s: GameState) => renderToStaticMarkup(createElement(Toolbar, {
  s, act: noop, active: null, onChangeTab: noop, buildOpen: false, onSetBuildOpen: noop, speed: 'paused', setSpeed: noop, speedKeysLive: true,
  weekProgress: () => 0, placingId: null, onArmPlacement: noop, pathTool: null, onSetPathTool: noop,
  inbox: { count: 0, urgent: false, unreadLetters: 0 }, held: false,
}));
const tab = (s: GameState) => renderToStaticMarkup(createElement(AthleticsTab, { s, act: noop, onOpenBuild: noop }));

// ---- The gate: a sport club alone opens nothing; the petition opens both ----
{
  const s = college();
  tickLadder(s);
  assert(!milestoneReached(s, 'sport'), 'a sport club alone does not reach the ladder\'s rung');
  assert(!opened(s, 'the-teams'), 'nor open The teams');
  assert(!tabAvailable(s, 'athletics'), 'nor the Athletics tab');
  const ungated = structuredClone(s);
  delete ungated.guidance!.gated;
  assert(!tabAvailable(ungated, 'athletics'), 'nor, in a run that is not guided, the Athletics tab by the ladder');

  const yes = answer(petition(structuredClone(s)), 'establish');
  assert(yes.orgs.teams.length === 1, 'Go varsity fields a team');
  assert(milestoneReached(yes, 'sport') && opened(yes, 'the-teams') && tabAvailable(yes, 'athletics'), 'and the same answer opens the rung, The teams and the Athletics tab');
  assert(objectiveMet(yes, 'field-a-varsity-team') && !objectiveMet(yes, 'appoint-athletic-director'), 'with the team fielded and the director still to come');

  const no = answer(petition(structuredClone(s)), 'decline');
  assert(no.orgs.teams.length === 0 && opened(no, 'the-teams') && tabAvailable(no, 'athletics'), 'a petition turned down opens them too');
  assert(!objectiveMet(no, 'field-a-varsity-team'), 'with the team still to field');
  assert(tab(no).includes('waits for your first varsity team'), 'and the tab says the director waits for the first varsity team');

  // A save from before: the old rung, reached by a club, keeps the tab.
  const old = structuredClone(s);
  delete old.guidance!.gated;
  old.ladder.reached.sport = 3;
  assert(tabAvailable(old, 'athletics'), 'a save whose tab opened with the first sport club keeps it');
  const oldGuided = structuredClone(s);
  oldGuided.ladder.reached.sport = 3;
  oldGuided.guidance!.opened['the-teams'] = 1;
  assert(tabAvailable(oldGuided, 'athletics'), 'and so does a guided save whose chapter had opened');
}

// ---- The chapter: in the order it happens, the director never first ----
{
  const teams = CHAPTERS.find((c) => c.id === 'the-teams')!;
  const ids = teams.objectives.map((o) => o.id);
  assert(ids.join(',') === 'field-a-varsity-team,appoint-athletic-director,staff-the-team,build-the-venue', `the team, the director, the posts, the venue (${ids.join(',')})`);
  assert(teams.side === true, 'a side chapter, so a college that never fields a team is not held back');
  assert(teams.objectives.every((o) => !o.optional), 'every step required');
  const copy = CHAPTER_COPY['the-teams'];
  assert(copy.about !== undefined && ids.every((id) => copy.help?.[id]?.text), 'a paragraph, and help for every objective');
  assert(/waits for your first varsity team|soon after your first team goes varsity, and not before/.test(copy.help!['appoint-athletic-director'].text), 'the director\'s help says it waits for the first varsity team');
  assert(copy.help!['build-the-venue'].door === 'build' && copy.help!['build-the-venue'].ringed === true, 'the venue\'s Show me opens the build menu ringed');
  assert(ids.slice(0, 3).every((id) => copy.help![id].door === 'athletics'), 'the others open the Athletics tab');
}

// ---- The walk: from the director's hire, the posts, then the venue ----
{
  let s = answer(petition(college()), 'establish');
  const team = s.orgs.teams[0];
  assert(team.status === 'awaitingVenue', 'the fixture\'s team waits on its venue');
  const venue = s.tech.find((t) => t.kind === 'facility' && t.facilityType === team.venueCategory)!;
  assert(ringedBuilding(s)?.id === venue.id, 'the build menu rings the team\'s venue while The teams is open');
  assert(teamsRing(s) === null, 'the Athletics tab rings nothing before the director');
  assert(!tab(s).includes('opening-target'), 'and draws no ring');

  const rows = () => objectiveRows(s, CHAPTERS.find((c) => c.id === 'the-teams')!);
  const staffRow = () => rows().find((r) => r.id === 'staff-the-team')!.progress as { n: number; of: number };
  assert(staffRow().n === 0 && staffRow().of === 3, 'the posts read 0 of 3');

  s = structuredClone(s);
  s.orgs.athleticDirector = coach('athletic-director');
  settleChapters(s);
  assert(objectiveMet(s, 'appoint-athletic-director'), 'a director meets the second');
  assert(teamsRing(s)?.step === 'staff' && teamsRing(s)?.teamId === team.id, 'with the director hired, the tab rings the team\'s open posts');
  assert(tab(s).includes('opening-target'), 'and draws the ring');

  s.orgs.teams[0].headCoach = coach('football');
  s.orgs.teams[0].assistantCoach = coach('football');
  settleChapters(s);
  assert(staffRow().n === 2 && teamsRing(s)?.step === 'staff', 'two posts filled, the third still rung');
  s.orgs.teams[0].trainer = coach(TRAINER_FIELD);
  settleChapters(s);
  assert(objectiveMet(s, 'staff-the-team'), 'three posts meet the third');
  assert(teamsRing(s)?.step === 'venue', 'and the ring moves to the venue');
  assert(tab(s).includes(`Build ${venue.name}`) && tab(s).includes('opening-target'), 'a ringed door to the build menu');

  s.placements[venue.id] = { row: 0, col: 0, w: 1, h: 1 } as unknown as GameState['placements'][string];
  settleChapters(s);
  assert(objectiveMet(s, 'build-the-venue') && done(s, 'the-teams'), 'the venue sited ends the chapter');
  assert(teamsRing(s) === null && ringedBuilding(s) === null, 'and the rings with it');
}

// ---- The badge: an open post on any team ----
{
  const s = answer(petition(college()), 'establish');
  assert(openChairs(s).length === 3 && teamsShortStaffed(s), 'a new team has three open posts, its venue unbuilt or not');
  assert(bar(s).includes('aria-label="Athletics, a staff post is open"') && /Athletics<\/span><span class="alert-badge"/.test(bar(s)), 'the Athletics button carries the alert badge');
  const staffed = structuredClone(s);
  staffed.orgs.teams[0].headCoach = coach('football');
  staffed.orgs.teams[0].assistantCoach = coach('football');
  staffed.orgs.teams[0].trainer = coach(TRAINER_FIELD);
  assert(!teamsShortStaffed(staffed) && bar(staffed).includes('aria-label="Athletics"') && !/Athletics<\/span><span class="alert-badge"/.test(bar(staffed)), 'every post filled, no badge');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
