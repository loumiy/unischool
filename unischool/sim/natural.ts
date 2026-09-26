// ---------------------------------------------------------------------
// The natural player's report (Plan 65): one fifty-year run of the owner's
// natural line of play (sim/harness/natural.ts), written as a markdown
// report — every year's enrollment, applicants, net, programs, prestige
// and satisfaction; what was built and what never was; research grants
// against what the initiatives cost; and the Final Report's mark.
//
//   npm run natural                          seed 12345, printed
//   npm run natural -- --seed 4242           another seed
//   npm run natural -- --out <file.md>       and written to a file
//   npm run natural -- --pacing              the pacing scorecard (Plan 66):
//                                            three seeds against sim/pacing.ts
//
// Measures, never fails. Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import { writeFileSync } from 'node:fs';
import type { Buildable, SatisfactionAttributes } from '../src/state/types';
import { institutionName, totalEnrolled } from '../src/state/types';
import { isPlaceableKind } from '../src/state/campusMap';
import { isAcademicHall } from '../src/data/techData';
import { foundGame, playYears, DEFAULT_SEED } from './harness/game';
import { createNaturalPlayer, SORT_AT_HALLS } from './harness/natural';
import { createGuidedPlayer } from './harness/guided';
import { scorecard, scorecardText, type PaceFinish, type PaceYear } from './pacing';
import { playerRank } from '../src/systems/rivals/rivalsSystem';

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const seed = Number(arg('--seed') ?? DEFAULT_SEED);
// A plain name: the harness's default reads "Test University University"
// in the Final Report's title.
const name = arg('--name') ?? 'Blackmoor';
const out = arg('--out');
const YEARS = 50;
const PACING_SEEDS = [12345, 4242, 777] as const;

// ---- The pacing scorecard (Plan 66) ----
if (process.argv.includes('--pacing')) {
  const t = Date.now();
  const runs: PaceYear[][] = [];
  const guided: PaceFinish[] = [];
  for (const s of PACING_SEEDS) {
    const natural = createNaturalPlayer();
    playYears(foundGame({ seed: s, name }), natural, YEARS);
    runs.push(natural.record.years);
    const g = foundGame({ seed: s, name });
    playYears(g, createGuidedPlayer(), YEARS);
    guided.push({ enrolled: totalEnrolled(g.s.students), prestige: g.s.self.reputation, rank: playerRank(g.s) });
  }
  const text = [
    `# Pacing scorecard`,
    '',
    `The natural player (\`sim/harness/natural.ts\`), seeds ${PACING_SEEDS.join(', ')}, against Plan 66's targets (\`sim/pacing.ts\`); the buffer rows play the guided player on the same seeds. Written by \`npm run natural -- --pacing\` in ${((Date.now() - t) / 1000).toFixed(0)} s.`,
    scorecardText(scorecard(runs, guided), PACING_SEEDS),
    '',
  ].join('\n');
  if (out) {
    writeFileSync(out, text);
    console.log(`Wrote ${out}.`);
  } else {
    console.log(text);
  }
  process.exit(0);
}

const t0 = Date.now();
const player = createNaturalPlayer();
const g = foundGame({ seed, name });
playYears(g, player, YEARS);
const s = g.s;
const r = player.record;
const seconds = ((Date.now() - t0) / 1000).toFixed(0);

const money = (n: number) => {
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  return a >= 1e9 ? `${sign}$${(a / 1e9).toFixed(2)}B` : a >= 1e6 ? `${sign}$${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `${sign}$${(a / 1e3).toFixed(0)}k` : `${sign}$${a.toFixed(0)}`;
};
const n0 = (n: number) => Math.round(n).toLocaleString('en-US');
const ATTR: Array<[keyof SatisfactionAttributes, string]> = [
  ['academic', 'Aca'], ['social', 'Soc'], ['basicNeeds', 'Needs'], ['health', 'Hlth'], ['housing', 'Hous'],
];
const ATTR_NAME: Record<keyof SatisfactionAttributes, string> = {
  academic: 'academic', social: 'social', basicNeeds: 'basic needs', health: 'health', housing: 'housing',
};

const lines: string[] = [];
const say = (line = '') => lines.push(line);

say(`# The natural line of play — one fifty-year run`);
say();
say(`${institutionName(s.self)}, seed ${seed}, played by \`sim/harness/natural.ts\` (Plan 65). Written by \`npm run natural\` in ${seconds} s.`);
say();
say(`## The line of play`);
say();
say(`Cash is spent to zero: anything a rule calls for is bought if the cash covers it. Each week, in this order:`);
say();
say(`1. **Satisfaction.** Any attribute under 100 that a building would raise gets the cheapest such building (a facility that serves it, the next residence hall, or another story on the library, a dining hall or a dorm). Nothing more is bought for it while one is going up. A building that only unlocks another counts for nothing here.`);
say(`2. **Programs.** Every program on offer is founded where it belongs, hiring its first instructor off the market, never through a posted search. When no hall has a slot, the next academic hall goes up as soon as it is affordable. Otherwise, and once every program is founded, courses go deeper, the lowest rung first. A course that waits on a building gets the building. Dark courses are restaffed.`);
say(`3. **Schools.** From ${SORT_AT_HALLS} academic halls, Founders Hall included, programs move to their schools' halls as the game suggests, and a school spread over two halls is merged into one when another school's offer has nowhere to go (the game never suggests that move).`);
say(`4. **Varsity.** Every petition is accepted, its venue built at once, and every coaching chair filled with the best candidate listed.`);
say(`5. **Research.** Every idle lab funds the deepest initiative whose team would leave no course without an instructor.`);
say(`6. **Everything else** on the build menu (labs, the landmark, amenities, chapter houses) as soon as it is affordable, and a graduate program wherever a host offers one.`);
say();
say(`**Capital projects come first:** one on the build menu is built before any rule spends, and while it waits on money the player saves for it, spending only on satisfaction (rule 1) and restaffing.`);
say();
say(`At admissions, tuition is the highest the slider allows short of the red tier (1.6× what prestige supports), the admit rate is left as the screen opens it, and every club and chapter petition is approved. Every other decision takes the game's default.`);
say();

// ---- The final score ----
const ending = s.ending?.report;
say(`## The final score`);
say();
if (ending) {
  say(`**${ending.mark} · ${ending.markScore.toFixed(0)}** — *${ending.title}*. Rank ${ending.rank} of ${ending.total} at the fiftieth summer.`);
  say();
  say(`| Standing | Grade | Mean over the run | First | Last |`);
  say(`|---|---|---|---|---|`);
  for (const a of ending.axes) say(`| ${a.label} | ${a.grade} | ${a.mean.toFixed(0)} | ${a.first.toFixed(0)} | ${a.last.toFixed(0)} |`);
  say();
  say(`The mark is 70% the six standings' mean, 20% the final rank and 10% the promises (state/finalReport.ts); promises: ${ending.kept.length} kept, ${ending.missed.length} missed, ${ending.declined} declined.`);
} else {
  say(`The fiftieth summer did not write a Final Report.`);
}
say();

// ---- Every year ----
say(`## Every year`);
say();
say(`Read at each summer's close. *Net/wk* is the operating net (the toolbar's figure) averaged over the year's weeks; *programs* are majors standing in halls, graduate programs included; satisfaction is the overall score, then its five attributes. The overall score cannot pass 90: what a college does above 80 counts half (satisfactionSystem.ts's \`diminished\`), so five attributes at 100 read 90.`);
say();
say(`| Year | Enrolled | Applicants | Net/wk | Cash | Programs | Halls | Prestige | Rank | Satisfaction | ${ATTR.map(([, a]) => a).join(' | ')} |`);
say(`|---|---|---|---|---|---|---|---|---|---|${ATTR.map(() => '---').join('|')}|`);
for (const y of r.years) {
  say(`| ${y.year} | ${n0(y.enrolled)} | ${n0(y.applicants)} | ${money(y.netPerWeek)} | ${money(y.cash)} | ${y.programs} | ${r.hallsAt[y.year] ?? ''} | ${y.prestige.toFixed(1)} | ${y.rank} | ${y.satisfaction.toFixed(0)} | ${ATTR.map(([k]) => y.breakdown[k].toFixed(0)).join(' | ')} |`);
}
say();
say(`Weeks in the red: ${r.weeksInRed}. The programs were sorted into their schools' halls from year ${r.sortedFrom ?? '— never (never reached ' + SORT_AT_HALLS + ' halls)'}.`);
say();

// ---- What was built, and what never was ----
const placeables = s.tech.filter((t) => isPlaceableKind(t));
const built = placeables.filter((t) => r.built[t.id] !== undefined);
const never = placeables.filter((t) => r.built[t.id] === undefined);
const kindOf = (t: Buildable): string => {
  if (isAcademicHall(t)) return 'academic hall';
  if (t.kind === 'dorm') return 'residence hall';
  if (t.athleticsVenueReveal) return 'varsity venue';
  if (t.facilityType === 'lab') return 'lab';
  if (t.facilityType === 'project') return 'capital project';
  if (t.facilityType === 'landmark') return 'grand landmark';
  if (t.chapterHouse) return 'chapter house';
  if (t.facilityType === 'amenity') return 'amenity';
  const attr = t.effects?.satisfactionAttribute;
  return attr ? `${ATTR_NAME[attr]} facility` : (t.facilityType ?? t.kind);
};
const serves = (t: Buildable) => (t.kind === 'dorm' ? 'housing' : t.athleticsVenueReveal ? undefined : t.effects?.satisfactionAttribute);

say(`## Campus assets never built`);
say();
say(`Satisfaction buildings go up only under rule 1 (an attribute under 100 that the building would raise), so the ones below were never needed to hold satisfaction where this run held it. Everything else on the build menu was built as soon as it could be paid for.`);
say();
const neverSat = never.filter((t) => serves(t) !== undefined);
const neverOther = never.filter((t) => serves(t) === undefined);
say(`**Satisfaction buildings never built (${neverSat.length}):**`);
say();
say(`| Building | Serves | Cost | Ever on the menu |`);
say(`|---|---|---|---|`);
for (const t of neverSat.sort((a, b) => (serves(a) ?? '').localeCompare(serves(b) ?? '') || a.cost - b.cost)) {
  say(`| ${t.name} | ${ATTR_NAME[serves(t)!]} | ${money(t.cost)} | ${r.offered[t.id] !== undefined ? 'yes' : 'no'} |`);
}
say();
say(`**Everything else never built (${neverOther.length}):**`);
say();
say(`| Building | Kind | Cost | Ever on the menu |`);
say(`|---|---|---|---|`);
for (const t of neverOther.sort((a, b) => kindOf(a).localeCompare(kindOf(b)) || a.cost - b.cost)) {
  say(`| ${t.name} | ${kindOf(t)} | ${money(t.cost)} | ${r.offered[t.id] !== undefined ? 'yes' : 'no'} |`);
}
say();
say(`**Built (${built.length}), by year:**`);
say();
say(`| Year | Building | Kind | Why |`);
say(`|---|---|---|---|`);
for (const t of built.sort((a, b) => r.built[a.id] - r.built[b.id] || a.name.localeCompare(b.name))) {
  const why = r.founding.has(t.id) ? 'stood at founding'
    : t.facilityType === 'project' ? 'capital project: first'
      : r.builtFor[t.id] ? `rule 1: ${ATTR_NAME[r.builtFor[t.id]]}`
        : r.forCourses.has(t.id) ? 'rule 2: a course waited on it'
          : isAcademicHall(t) ? 'rule 2: program slots'
            : t.athleticsVenueReveal ? 'rule 4: a varsity team'
              : t.chapterHouse ? 'rule 6: a chapter asked for it'
                : 'rule 6: on the menu';
  say(`| ${r.built[t.id]} | ${t.name} | ${kindOf(t)} | ${why} |`);
}
const stories = Object.entries(r.extensions);
if (stories.length > 0) {
  say();
  say(`Stories added under rule 1: ${stories.map(([id, n]) => `${s.tech.find((t) => t.id === id)?.name ?? id} ×${n}`).join(', ')}.`);
}
say();

// ---- Capital projects ----
const projects = placeables.filter((t) => t.facilityType === 'project');
say(`## Capital projects`);
say();
say(`Built as soon as each reached the build menu, saving for it when the cash fell short: ${r.projectSaving} weeks spent saving.`);
say();
say(`| Project | Cost | On the menu | Put up | Built |`);
say(`|---|---|---|---|---|`);
for (const t of projects.sort((a, b) => (r.offered[a.id] ?? 99) - (r.offered[b.id] ?? 99) || a.cost - b.cost)) {
  say(`| ${t.name} | ${money(t.cost)} | ${r.offered[t.id] !== undefined ? `year ${r.offered[t.id]}` : 'never'} | ${r.built[t.id] !== undefined ? `year ${r.built[t.id]}` : 'never'} | ${t.status === 'done' ? 'yes' : t.status === 'developing' ? 'going up' : 'no'} |`);
}
say();

// ---- Research ----
const grants = s.research.grantIncome;
say(`## Research: grants against investment`);
say();
say(`| | |`);
say(`|---|---|`);
say(`| Invested in initiatives (up-front funding) | ${money(r.invested)} |`);
say(`| Grant money received | ${money(grants)} (${s.research.grants} grants) |`);
say(`| Return | ${r.invested > 0 ? `${((grants / r.invested) * 100).toFixed(0)}% of what was invested` : '—'} |`);
say(`| Initiatives funded | ${Object.entries(r.initiatives).map(([d, n]) => `${n} ${d}`).join(', ') || 'none'} |`);
say();

// ---- Athletics ----
say(`## Varsity`);
say();
say(`${r.varsity.accepted} petitions accepted, ${r.varsity.refused} declined for want of cash; ${r.varsity.coaches} coaches hired. ${s.orgs.teams.length} varsity teams at the end.`);
say();

const text = `${lines.join('\n')}\n`;
if (out) {
  writeFileSync(out, text);
  console.log(`Wrote ${out}.`);
} else {
  console.log(text);
}
