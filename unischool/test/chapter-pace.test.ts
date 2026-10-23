// ---------------------------------------------------------------------
// The chapters' pace (Plan 114E, the third review's C3-2): the guided player
// (sim/harness/guided.ts) on three seeds for ten years, its run gated as a
// guided founding's is (gates.ts), so the systems wait for their chapters.
// It fails if any required objective is met more than a year after its
// chapter opened, or is still unmet a year after, and if the ticker's
// chapter (currentChapter) is ever a side chapter while a main one is open.
// The waits it found on the game as Plan 114E left it are listed in KNOWN,
// each with its reason, for the owner to decide; they are printed on every
// run, and any other objective past a year fails.
//
// What the harness can't do, it does as a player would. It opens no tab and
// moves no camera, so each week it makes the marks an open chapter asks for
// (a tab opened, a camera move, double speed: tools/scenario.ts's
// markAsPlayed), the week the chapter opens: a player reading "Open the
// Treasury" opens it. Those objectives then wait no time, so the check says
// nothing about them; it judges the ones the college's state must reach.
// A headless founding starts with Founders Hall sited and no walkthrough,
// so Founding, The next course and Looking around are caught up as done in
// week 1 (chapters.ts's caughtUp) and judged by nothing here.
//
// Every fourth week it also reads each open chapter's page as the drawer
// draws it (ObjectivesPanel) and clicks every Show me: none may open a tab
// that is shut (Plan 114F, the third review's C3-9: Research's did nothing
// before the first lab). A shut tab's line stands in its place, and the
// runs must show one, or the check proves nothing.
//
// Not part of the game: nothing imports it. Ten years on three seeds.
// ---------------------------------------------------------------------

import { foundGame, playYears } from '../sim/harness/game';
import { createGuidedPlayer, reserveOf } from '../sim/harness/guided';
import type { Game } from '../sim/harness/game';
import { openChairs, TRAINER_FIELD } from '../src/data/studentLifeData';
import { canAppoint } from '../src/systems/delegation/seats';
import { seatDef } from '../src/data/seatData';
import { weeklyNet } from '../src/systems/finance/financeSystem';
import { absoluteWeek, CHAPTERS, currentChapter, DOUBLE_SPEED_MARK, LOOK_MARKS, MARKED_TABS, marked, tabMark } from '../src/state/chapters';
import { WEEKS_PER_YEAR } from '../src/state/types';
import { COURSE_MILESTONES, teachObjective } from '../src/data/chapterData';
import type { GameState } from '../src/state/types';
import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import ObjectivesPanel from '../src/components/ObjectivesPanel';
import { hasPage } from '../src/state/chapters';
import { tabAvailable, TAB_LABELS, type TabId } from '../src/components/TabNav';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('chapter pace tests');

const SEEDS = [12345, 4242, 777];
const YEARS = 10;
// The marks a player makes outside the college's state.
const PLAYER_MARKS = new Set<string>([...[...MARKED_TABS].map(tabMark), ...Object.values(LOOK_MARKS), DOUBLE_SPEED_MARK]);
// Which objectives read a mark: their reading turns true when the mark is made.
function marksFor(s: GameState, chapterId: string): string[] {
  const c = CHAPTERS.find((x) => x.id === chapterId)!;
  return [...PLAYER_MARKS].filter((mark) => !marked(s, mark) && c.objectives.some((o) => {
    const before = o.progress(s);
    const after = o.progress({ ...s, guidance: { ...s.guidance!, marked: [...s.guidance!.marked, mark] } });
    return before !== after && after === true;
  }));
}

// What two chapters ask that the NEXT line never does, so the guided player
// never would (sim/harness/athletics.ts staffs a team only past the
// specialization milestone; only the Provost is appointed, moves.ts): done
// as a player reading the chapter would, on the guided player's money sense
// (an open post filled from the market, the seat once the year's net pays
// its salary). Without them the check would measure the harness.
function readChapters(g: Game): void {
  const s = g.s;
  if (isOpen(s, 'the-teams') && s.orgs.athleticDirector && s.finance.cash > reserveOf(s)) {
    for (const { team, role } of openChairs(s)) {
      const field = role === 'trainer' ? TRAINER_FIELD : team.sport;
      const best = g.s.orgs.coachCandidates.filter((c) => c.field === field).sort((a, b) => b.quality - a.quality)[0];
      if (best) g.act({ type: 'HIRE_COACH', candidateId: best.id, teamId: team.id, role });
    }
  }
  const salary = seatDef('advancement')?.outsideSalary ?? 0;
  if (isOpen(s, 'alumni') && canAppoint(s, 'advancement', null) && weeklyNet(s) * WEEKS_PER_YEAR >= salary && s.finance.cash > reserveOf(s)) {
    g.act({ type: 'APPOINT_SEAT', seatId: 'advancement', school: null });
  }
}

// The objectives that waited more than a year when the check was written
// (Plan 114E, measured on these seeds), and why. Not a judgment that the
// wait is right: the owner's to settle, and an entry goes when it is.
const KNOWN: Record<string, string> = {
  // 64 to 90 weeks. The milestones sit at what npm run natural's player has
  // by then; the guided player, saving for the line's halls and programs
  // with a thin reserve in years 3 and 4, teaches fewer.
  [teachObjective(COURSE_MILESTONES['campus-life'])]: 'the guided player teaches the count about a year and a half after Campus life opens',
  [teachObjective(COURSE_MILESTONES['running-the-college'])]: 'and the next count likewise after Running the college',
  // 57 to 94 weeks to site a lab, 72 to 122 to commission research. A lab
  // costs more than the cash above the reserve while the line asks for halls
  // and courses, and research is funded only above RESEARCH_RESERVE_WEEKS.
  'site-a-lab': 'a lab waits on the cash the line\'s halls and courses take first',
  'commission-research': 'research is funded only from above the research reserve',
  // 235 weeks on seed 4242, whose first team is football: the stadium costs
  // several times what the other venues do.
  'build-the-venue': 'a football team waits years for its stadium',
};

// Every button in a rendered element tree with these words, and every
// element with this class: the panel is a plain function of its props, so
// calling it gives the tree (as test/chapters.test.ts's findButton).
function walkPanel(el: ReactElement, words: string, className: string): { clicks: (() => void)[]; lines: number } {
  const tree = (el.type as (p: unknown) => ReactNode)(el.props);
  const clicks: (() => void)[] = [];
  let lines = 0;
  const walk = (n: ReactNode): void => {
    if (!n) return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (!isValidElement(n)) return;
    const p = n.props as { children?: ReactNode; onClick?: () => void; className?: string };
    if (n.type === 'button' && p.children === words && p.onClick) clicks.push(p.onClick);
    if (p.className === className) lines += 1;
    walk(p.children);
  };
  walk(tree);
  return { clicks, lines };
}
// The Show me's of every open chapter's page: the shut tabs they opened, and
// how many shut lines stood in for one.
function showMes(s: GameState): { shut: string[]; lines: number } {
  const shut: string[] = [];
  let lines = 0;
  for (const c of CHAPTERS) {
    if (!isOpen(s, c.id) || !hasPage(c.id)) continue;
    let went: string | undefined;
    const panel = createElement(ObjectivesPanel, { s, waiting: null, onGo: (go: string) => { went = go; }, onOpenLadder: () => {}, view: c.id, onView: () => {} });
    const found = walkPanel(panel, 'Show me', 'objectives-shut');
    lines += found.lines;
    for (const click of found.clicks) {
      went = undefined;
      click();
      if (went && went in TAB_LABELS && !tabAvailable(s, went as TabId)) shut.push(`${c.id} → ${went}`);
    }
  }
  return { shut, lines };
}
let shutLines = 0;

const isOpen = (s: GameState, id: string) => s.guidance!.opened[id] !== undefined && s.guidance!.done[id] === undefined;

for (const seed of SEEDS) {
  const g = foundGame({ seed });
  // A guided founding's gates (reducer.ts's START_GAME): the matters, the
  // petition, the Athletics tab and the mascot stop wait for their chapters.
  if (!g.s.guidance) {
    assert(false, `seed ${seed}: the founding has no chapters`);
    continue;
  }
  g.s.guidance.gated = true;
  const player = createGuidedPlayer();
  const sideOverMain: string[] = [];
  const shutDoors = new Set<string>();
  // Each required objective's wait, in weeks from its chapter's opening,
  // and the week each objective was latched met (the record keeps only
  // that it is).
  const waits = new Map<string, number>();
  const metWeek = new Map<string, number>();
  const play = () => {
    const s = g.s;
    for (const c of CHAPTERS) {
      if (isOpen(s, c.id)) for (const mark of marksFor(s, c.id)) g.act({ type: 'MARK_GUIDANCE', mark });
    }
    readChapters(g);
    const now = g.s;
    for (const id of now.guidance!.met) if (!metWeek.has(id)) metWeek.set(id, absoluteWeek(now));
    const current = currentChapter(now);
    if (current?.side && CHAPTERS.some((c) => !c.side && isOpen(now, c.id)) && sideOverMain.length < 3) {
      sideOverMain.push(`${current.id} in year ${now.clock.year}, week ${now.clock.week}`);
    }
    if (now.clock.week % 4 === 0) {
      const doors = showMes(now);
      shutLines += doors.lines;
      for (const d of doors.shut) shutDoors.add(`${d} (year ${now.clock.year})`);
    }
  };
  try {
    playYears(g, player, YEARS, play);
  } catch (e) {
    assert(false, `seed ${seed}: the run threw in year ${g.s.clock.year}: ${(e as Error).message}`);
    continue;
  }
  const s = g.s;
  const gd = s.guidance!;
  const end = absoluteWeek(s);
  for (const c of CHAPTERS) {
    const from = gd.opened[c.id];
    if (from === undefined) continue;
    for (const o of c.objectives) {
      if (o.optional) continue;
      // Met in week 1, before the first week was watched: the founding's.
      const at = metWeek.get(o.id) ?? (gd.met.includes(o.id) ? from : undefined);
      const wait = (at ?? end) - from;
      waits.set(`${c.id}/${o.id}`, wait);
      if (wait > WEEKS_PER_YEAR && KNOWN[o.id]) {
        console.log(`  known: seed ${seed}, ${c.id}'s "${o.id}" ${wait} weeks (${KNOWN[o.id]})`);
        continue;
      }
      assert(wait <= WEEKS_PER_YEAR,
        `seed ${seed}: ${c.id}'s "${o.id}" ${at === undefined ? 'is still unmet' : 'was met'} ${wait} weeks after the chapter opened (year ${Math.floor((from - 1) / WEEKS_PER_YEAR) + 1})`);
    }
  }
  assert(sideOverMain.length === 0, `seed ${seed}: the ticker never shows a side chapter over a main one (${sideOverMain.join('; ')})`);
  assert(shutDoors.size === 0, `seed ${seed}: no Show me opens a shut tab (${[...shutDoors].slice(0, 3).join('; ')})`);
  const longest = [...waits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, w]) => `${k} ${w}w`).join(', ');
  console.log(`  seed ${seed}: ${Object.keys(gd.opened).length} chapters opened; longest waits ${longest}`);
}

assert(shutLines > 0, `a shut tab's line stood in for its Show me somewhere in the runs (${shutLines} times)`);

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
