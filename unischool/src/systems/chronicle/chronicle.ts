import type { GameState } from '../../state/types';
import {
  BUILDING_BOOM, CHRONICLE_LINES, CHRONICLE_WORDS, ERA_MAX, ERA_MAX_YEARS, ERA_MIN_YEARS, ERA_NAMES, ERA_PRIORITY, RANK_FALL, RANK_FALL_WITHIN,
  type EraKind,
} from '../../data/chronicleData';
import { milestoneById } from '../../data/ladderData';
import { settledTitle } from '../promises/promises';
import { tagById } from '../../data/tagData';
import { eventById } from '../events/catalogue';
import { mainSport } from '../rivals/collegeRival';
import { rankedListBy } from '../rivals/rivalsSystem';
import { moneyShort } from '../../format';
import { sportById } from '../../data/studentLifeData';
import { RUNG_NAMES } from '../finance/distress';
import { TAG_PHRASES } from '../../data/reportData';
import { graduateProgram } from '../../data/techData';
import { GRAND_LANDMARK_IDS } from '../../data/facilitiesData';

// THE CHRONICLE (Plan 33, from v2's chronicle.ts; V2 #53): the run written
// as eras named from what happened. Every closed year is read from what the
// game keeps for good (the history rows, the milestones' years and the
// journal: see Plan 33's PR B) and classed by its largest new thing (Plan
// 80C: a school founded, a graduate degree, a capital project or grand
// landmark, titles, research prizes, a campaign, a building boom, troubles;
// rank only at a real turn). Runs become eras, each era the largest kind of
// its years; eras too short to name fold into a neighbor, two of a kind in a
// row are one, and each era is named from a template and summarized. A pure
// reading, in draft at any time.

export interface YearRecord {
  year: number;
  rank: number | null;
  rungMax: number;
  built: string[];      // names
  campaigns: number;
  titles: number;
  rivalNamed: string | null;
  tags: string[];       // names earned
  kept: string[];       // promise titles
  missed: string[];
  net: number | null;
  endowment: number | null;
  graduated: number;    // graduates
  seismic: string[];    // the letters answered, by title
  firsts: string[];     // ladder milestones reached
  schools: string[];    // schools founded, by subject ("Science")
  graduates: { name: string; degree: string }[]; // graduate programs taught in full
  projects: string[];   // capital projects and grand landmarks finished, largest first
  prizes: number;       // research prizes won
  sport: string | null; // the sport of the year's first title
}

export interface Era {
  kind: EraKind;
  name: string;
  from: number;
  to: number;
  lines: string[];
}

export interface RivalSaga {
  name: string;
  since: number;
  sport: string;       // the series the record is of: the main sport's
  won: number;
  lost: number;
  mine: number;
  theirs: number;
}

export interface Chronicle {
  eras: Era[];
  rival: RivalSaga | null;
}

// ---- Reading the years ----

// The milestones of a kind awarded in a year, by what follows the prefix.
function milestonesIn(s: GameState, prefix: string, year: number): string[] {
  return Object.entries(s.milestoneYears ?? {})
    .filter(([key, y]) => y === year && key.startsWith(prefix))
    .map(([key]) => key.slice(prefix.length))
    .sort();
}

export function yearRecords(s: GameState): YearRecord[] {
  const rivalName = s.rivalStanding ? s.rivals.find((r) => r.id === s.rivalStanding!.rivalId)?.name ?? null : null;
  return s.history.map((h, i) => {
    const y = h.year;
    const built = s.tech.filter((t) => t.kind !== 'course' && t.status === 'done' && t.builtYear === y).sort((a, b) => b.cost - a.cost);
    // A row from before the prize count has none to read.
    const before = i > 0 ? s.history[i - 1].prizes : 0;
    const titles = s.orgs.titles.filter((t) => t.year === y);
    return {
      year: y,
      rank: h.rank > 0 ? h.rank : null,
      rungMax: h.worstRung ?? 0,
      built: built.map((t) => t.name),
      campaigns: (s.advancement?.closed ?? []).filter((c) => c.year === y).length,
      titles: titles.length,
      rivalNamed: s.rivalStanding?.since === y ? rivalName : null,
      tags: (s.identity?.log ?? []).filter((e) => e.earned && e.year === y).map((e) => TAG_PHRASES[e.id] ?? tagById(e.id)?.name ?? e.id),
      kept: (s.promises?.settled ?? []).filter((p) => p.kept && p.year === y).map((p) => settledTitle(s, p)),
      missed: (s.promises?.settled ?? []).filter((p) => !p.kept && p.year === y).map((p) => settledTitle(s, p)),
      net: h.net,
      endowment: h.endowment ?? null,
      graduated: h.graduated,
      seismic: (s.catalogue?.letters ?? []).filter((l) => l.year === y).map((l) => eventById(l.eventId)?.title ?? l.eventId),
      firsts: Object.entries(s.ladder.reached).filter(([, year]) => year === y).map(([id]) => milestoneById(id)?.name ?? id),
      schools: milestonesIn(s, 'school-founded:', y),
      graduates: milestonesIn(s, 'grad-program-complete:', y).flatMap((id) => {
        const p = graduateProgram(id);
        return p ? [{ name: p.name, degree: p.degree }] : [];
      }),
      projects: built.filter((t) => t.project !== undefined || GRAND_LANDMARK_IDS.includes(t.id)).map((t) => t.name.replace(/^The /, '')),
      prizes: h.prizes !== undefined && before !== undefined ? Math.max(0, h.prizes - before) : 0,
      sport: titles.length > 0 ? (sportById(titles[0].sport)?.teamName ?? titles[0].sport).replace(/ Team$/, '') : null,
    };
  });
}

// A turn in the guide worth an era's name (Plan 80C): reaching first,
// entering the top ten, or a fall (losing first, leaving the top ten, or
// RANK_FALL places in three years from the top RANK_FALL_WITHIN). A steady
// climb is not one.
function rankTurn(recs: YearRecord[], i: number): 'first' | 'topTen' | 'fall' | null {
  const now = recs[i].rank;
  const last = recs[i - 1]?.rank ?? null;
  if (now === null || last === null) return null;
  if (now === 1 && last > 1) return 'first';
  if (now <= 10 && last > 10) return 'topTen';
  if (last === 1 || (last <= 10 && now > 10)) return now > last ? 'fall' : null;
  const before = recs[i - 3]?.rank ?? null;
  if (before !== null && before <= RANK_FALL_WITHIN && now - before >= RANK_FALL) return 'fall';
  return null;
}

// A turn names an era the first time it comes, for as long as it lasts
// (Plan 80G's merge): a college that drifts back and forth across the
// top-ten line is not turning again each time, and a kind has only so many
// names.
function firstRankTurn(recs: YearRecord[], i: number): 'first' | 'topTen' | 'fall' | null {
  const turn = rankTurn(recs, i);
  if (turn === null) return null;
  let run = i - 1;
  while (run >= 1 && rankTurn(recs, run) === turn) run--;
  for (let j = 1; j <= run; j++) if (rankTurn(recs, j) === turn) return null;
  return turn;
}

// What kind of year it was: its largest new thing (ERA_PRIORITY's order).
export function yearKind(recs: YearRecord[], i: number): EraKind {
  const r = recs[i];
  const turn = firstRankTurn(recs, i);
  const has: Record<EraKind, boolean> = {
    founding: r.year <= 3,
    receivership: r.rungMax >= 5,
    troubles: r.rungMax >= 3,
    first: turn === 'first',
    school: r.schools.length > 0,
    graduate: r.graduates.length > 0,
    topTen: turn === 'topTen',
    project: r.projects.length > 0,
    titles: r.titles > 0,
    prizes: r.prizes > 0,
    campaign: r.campaigns > 0,
    fall: turn === 'fall',
    building: r.built.length >= BUILDING_BOOM,
    // A year of nothing new that answered one of the board's letters.
    eventful: r.seismic.length > 0,
    quiet: true,
  };
  return ERA_PRIORITY.find((k) => has[k])!;
}

interface Span { kind: EraKind; from: number; to: number }

const rankOf = (k: EraKind) => ERA_PRIORITY.indexOf(k);
// The largest of some kinds; the fallback when there are none.
function largest(kinds: readonly EraKind[], fallback: EraKind): EraKind {
  if (kinds.length === 0) return fallback;
  return kinds.reduce((best, k) => (rankOf(k) < rankOf(best) ? k : best));
}

// Runs of a kind; a run too short to name folded into a neighbor, the pair
// then the larger kind of the two; never two eras of a kind in a row; a
// stretch too long for one era split where the most happened, its later
// part named for the next-largest thing in it; and no more eras than a
// chronicle can hold.
export function partition(recs: YearRecord[]): Span[] {
  const kinds = new Map(recs.map((r, i) => [r.year, yearKind(recs, i)]));
  const spans: Span[] = [];
  const at = (y: number) => recs.find((r) => r.year === y);
  const notable = (r: YearRecord | undefined) => (r ? r.seismic.length * 3 + r.built.length + r.titles * 2 + r.tags.length + r.schools.length * 4 + r.projects.length * 3 : 0);
  const kindsIn = (from: number, to: number) => recs.filter((r) => r.year >= from && r.year <= to).map((r) => kinds.get(r.year)!);
  const len = (s: Span) => s.to - s.from + 1;
  recs.forEach((r) => {
    const kind = kinds.get(r.year)!;
    const last = spans[spans.length - 1];
    if (last && last.kind === kind) last.to = r.year;
    else spans.push({ kind, from: r.year, to: r.year });
  });
  // Merges two neighbors into the first index; the pair is the larger kind.
  const join = (i: number, j: number) => {
    const [a, b] = i < j ? [i, j] : [j, i];
    spans[a] = { kind: largest([spans[a].kind, spans[b].kind], 'quiet'), from: spans[a].from, to: spans[b].to };
    spans.splice(b, 1);
  };
  const mergeRepeats = () => {
    for (let i = 1; i < spans.length; i++) {
      if (spans[i].kind === spans[i - 1].kind) { join(i - 1, i); i--; }
    }
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < spans.length; i++) {
      const s = spans[i];
      if (len(s) >= ERA_MIN_YEARS || spans.length === 1 || s.kind === 'founding') continue;
      // The last stretch of a run in progress stays: it is still being lived.
      if (i === spans.length - 1 && i > 0 && spans.length <= 2) continue;
      const prevIsFounding = i > 0 && spans[i - 1].kind === 'founding';
      const into = i > 0 && !prevIsFounding ? i - 1 : i + 1 < spans.length ? i + 1 : i - 1;
      // Folding into the founding keeps it the founding: the years after it
      // are never named for it.
      if (spans[into].kind === 'founding') continue;
      join(i, into);
      changed = true;
      break;
    }
    const before = spans.length;
    mergeRepeats();
    if (spans.length !== before) changed = true;
  }
  // A stretch too long to be one era is split where the most happened. Each
  // part is named for the largest thing in its own years that its neighbor
  // is not, so a split never puts two of a kind in a row; a cut with no such
  // pair is passed over, and a stretch with none stays whole.
  for (let i = 0; i < spans.length && spans.length < ERA_MAX; i++) {
    const s = spans[i];
    if (len(s) <= ERA_MAX_YEARS || s.kind === 'founding') continue;
    const cuts: { y: number; score: number }[] = [];
    for (let y = s.from + ERA_MIN_YEARS; y <= s.to - ERA_MIN_YEARS + 1; y++) {
      cuts.push({ y, score: notable(at(y)) + 0.01 * (ERA_MAX_YEARS - Math.abs(y - s.from - ERA_MAX_YEARS / 2)) });
    }
    cuts.sort((a, b) => b.score - a.score);
    const prev = spans[i - 1]?.kind;
    const next = spans[i + 1]?.kind;
    for (const { y: cut } of cuts) {
      const early = kindsIn(s.from, cut - 1).filter((k) => k !== 'founding' && k !== prev);
      if (early.length === 0) continue;
      const first = largest(early, 'quiet');
      const late = kindsIn(cut, s.to).filter((k) => k !== 'founding' && k !== first && k !== next);
      if (late.length === 0) continue;
      spans.splice(i, 1, { kind: first, from: s.from, to: cut - 1 }, { kind: largest(late, 'quiet'), from: cut, to: s.to });
      // The earlier part may still be too long: read it again.
      i--;
      break;
    }
  }
  while (spans.length > ERA_MAX) {
    let shortest = 1;
    for (let i = 1; i < spans.length; i++) if (len(spans[i]) < len(spans[shortest])) shortest = i;
    if (spans[shortest - 1].kind === 'founding' && shortest + 1 < spans.length) join(shortest, shortest + 1);
    else join(shortest - 1, shortest);
    mergeRepeats();
  }
  return spans;
}

// ---- The words ----

function fill(t: string, vars: Record<string, string | number>): string {
  return t.replace(/\{(\w+)\}/g, (whole, k: string) => (k in vars ? String(vars[k]) : whole));
}

export function listOf(items: string[]): string {
  const unique = [...new Set(items)];
  if (unique.length <= 1) return unique[0] ?? '';
  return `${unique.slice(0, -1).join(', ')} and ${unique[unique.length - 1]}`;
}

function ordinalWord(n: number): string {
  return ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'][n - 1] ?? `${n}th`;
}

export function rankWord(n: number): string {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${suffix[(v - 20) % 10] ?? suffix[v] ?? suffix[0]}`;
}

const SMALL = new Set(['the', 'of', 'in', 'a', 'an', 'and', 'on', 'at', 'to', 'for']);
function titleCase(text: string): string {
  return text.split(' ').map((w, i) => (i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}

function hashOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function nameEra(s: GameState, span: Span, recs: YearRecord[], used: Set<string>, campaignNo: number): string {
  const years = recs.filter((r) => r.year >= span.from && r.year <= span.to);
  const biggest = years.flatMap((r) => r.built)[0];
  const schools = years.flatMap((r) => r.schools);
  const graduate = years.flatMap((r) => r.graduates)[0];
  const vars: Record<string, string> = {
    building: biggest ?? 'the New Hall',
    school: schools[0] ?? '',
    school2: schools[1] ?? '',
    graduate: graduate?.name ?? 'Graduate School',
    degree: graduate?.degree ?? 'Doctorate',
    project: years.flatMap((r) => r.projects)[0] ?? biggest ?? 'New Hall',
    sport: years.find((r) => r.sport)?.sport ?? 'Varsity',
    ordinal: ordinalWord(campaignNo),
  };
  // A quiet stretch with a letter everyone remembers is named for it: the
  // first one no earlier era is named for.
  const letters = years.flatMap((r) => r.seismic);
  const event = letters.find((l) => ![...used].some((n) => n.includes(titleCase(l).replace(/^The /, '')))) ?? letters[0];
  const kind: EraKind = span.kind === 'quiet' && event ? 'eventful' : span.kind;
  if (event) vars.event = titleCase(event);
  const options = ERA_NAMES[kind === 'school' && schools.length > 1 ? 'schools' : kind];
  const start = hashOf(`${s.self.name}:${span.from}:${span.kind}`) % options.length;
  for (let k = 0; k < options.length; k++) {
    // "After the Storm", not "After The Storm".
    const name = fill(options[(start + k) % options.length], vars).replace(/(\S) The /g, '$1 the ');
    if (!used.has(name)) return name;
  }
  return `${fill(options[start], vars)} (${span.from}–${span.to})`;
}

function summarise(span: Span, recs: YearRecord[]): string[] {
  const L = CHRONICLE_LINES;
  const years = recs.filter((r) => r.year >= span.from && r.year <= span.to);
  const lines: string[] = [span.from === span.to ? fill(L.spanOne, { from: span.from }) : fill(L.span, { from: span.from, to: span.to })];
  const built = years.flatMap((r) => r.built);
  lines.push(built.length ? fill(L.built, { list: listOf(built.slice(0, 6)) + (built.length > 6 ? ` and ${built.length - 6} more` : '') }) : L.builtNone);
  const firsts = years.flatMap((r) => r.firsts);
  if (firsts.length) lines.push(fill(L.firsts, { list: listOf(firsts) }));
  const schools = years.flatMap((r) => r.schools);
  if (schools.length) lines.push(fill(L.founded, { list: listOf(schools.map((x) => `the School of ${x}`)) }));
  const graduates = years.flatMap((r) => r.graduates).map((g) => `the ${g.name}`);
  if (graduates.length) {
    const said = listOf(graduates);
    lines.push(fill(graduates.length === 1 ? L.graduate : L.graduates, { list: said.charAt(0).toUpperCase() + said.slice(1) }));
  }
  const ranked = years.filter((r) => r.rank !== null);
  if (ranked.length >= 2) {
    const a = ranked[0].rank!;
    const b = ranked[ranked.length - 1].rank!;
    lines.push(Math.abs(a - b) <= 1 ? fill(L.rankFlat, { to: rankWord(b) }) : fill(L.rank, { from: rankWord(a), to: rankWord(b) }));
  }
  const closed = years.filter((r) => r.net !== null);
  if (closed.length) {
    const net = closed.reduce((t, r) => t + (r.net ?? 0), 0);
    // The change in cash, which counts building and the sweep: said as what
    // it is, not as the books (Plan 76C).
    const netWords = `${net >= 0 ? 'rose' : 'fell'} by ${moneyShort(Math.abs(net))}`;
    const first = closed[0].endowment;
    const last = closed[closed.length - 1].endowment;
    lines.push(first !== null && last !== null
      ? fill(L.money, { net: netWords, from: moneyShort(first), to: moneyShort(last) })
      : fill(L.moneyPlain, { net: netWords }));
  }
  const worst = Math.max(...years.map((r) => r.rungMax));
  if (worst >= 3) lines.push(fill(L.troubles, { rung: RUNG_NAMES[worst] ?? `rung ${worst}` }));
  const classes = years.filter((r) => r.graduated > 0).length;
  if (classes) lines.push(fill(L.classes, { classes: classes === 1 ? 'One class' : `${classes} classes` }));
  const weathered = years.flatMap((r) => r.seismic);
  if (weathered.length) lines.push(fill(L.weathered, { list: listOf(weathered.map((w) => w.charAt(0).toLowerCase() + w.slice(1))) }));
  const titles = years.reduce((t, r) => t + r.titles, 0);
  if (titles) lines.push(titles === 1 ? L.title : fill(L.titles, { count: titles }));
  const prizes = years.reduce((t, r) => t + r.prizes, 0);
  if (prizes) lines.push(prizes === 1 ? L.prize : fill(L.prizes, { count: prizes }));
  const tags = years.flatMap((r) => r.tags);
  if (tags.length) lines.push(fill(L.tags, { tags: listOf(tags) }));
  const rival = years.find((r) => r.rivalNamed)?.rivalNamed;
  if (rival) lines.push(fill(L.rival, { rival }));
  const kept = years.flatMap((r) => r.kept).map((t) => t.toLowerCase());
  const missed = years.flatMap((r) => r.missed).map((t) => t.toLowerCase());
  if (kept.length) lines.push(fill(kept.length === 1 ? L.kept : L.keptMany, { list: listOf(kept) }));
  if (missed.length) lines.push(fill(missed.length === 1 ? L.missed : L.missedMany, { list: listOf(missed) }));
  return lines;
}

// One stretch of years in the chronicle's sentences (the Epilogue's
// addenda, PR H).
export function summariseYears(s: GameState, from: number, to: number): string[] {
  return summarise({ kind: 'quiet', from, to }, yearRecords(s));
}

// ---- The whole of it ----

export function chronicleOf(s: GameState): Chronicle {
  const recs = yearRecords(s);
  const spans = partition(recs);
  const used = new Set<string>();
  let campaigns = 0;
  let previous: string[] = [];
  const eras = spans.map((span) => {
    if (span.kind === 'campaign') campaigns++;
    const name = nameEra(s, span, recs, used, Math.max(1, campaigns));
    used.add(name);
    // A historian does not repeat "nothing was built" or "still 25th" era
    // after era.
    const said = summarise(span, recs);
    const repeats = new Set(previous.filter((l) => l === CHRONICLE_LINES.builtNone || l.startsWith('The guide had')));
    const lines = said.filter((l, i) => i === 0 || !repeats.has(l));
    previous = said;
    return { ...span, name, lines };
  });
  return { eras, rival: rivalSaga(s) };
}

function rivalSaga(s: GameState): RivalSaga | null {
  const standing = s.rivalStanding;
  if (!standing) return null;
  const rival = s.rivals.find((r) => r.id === standing.rivalId);
  if (!rival) return null;
  const sport = mainSport(s);
  const record = sport ? s.orgs.rivalries[sport] : undefined;
  const list = rankedListBy(s, 'reputation');
  return {
    name: rival.name,
    since: standing.since ?? s.clock.year,
    sport: sport ? (sportById(sport)?.teamName ?? sport).replace(/ Team$/, '') : 'varsity',
    won: record?.wins ?? 0,
    lost: record?.losses ?? 0,
    mine: list.findIndex((e) => e.isPlayer) + 1,
    theirs: list.findIndex((e) => e.key === rival.id) + 1,
  };
}

// The era the college is living in now: the chronicle's last.
export function currentEra(s: GameState): Era | null {
  const eras = chronicleOf(s).eras;
  return eras.length > 0 ? eras[eras.length - 1] : null;
}

export function sagaLines(saga: RivalSaga): string[] {
  const W = CHRONICLE_WORDS;
  const lines = [fill(W.sagaNamed, { rival: saga.name, year: saga.since })];
  if (saga.won + saga.lost > 0) lines.push(fill(saga.won + saga.lost === 1 ? W.sagaGame : W.sagaGames, { count: saga.won + saga.lost, won: saga.won, lost: saga.lost, sport: saga.sport }));
  lines.push(fill(W.sagaStanding, { mine: rankWord(saga.mine), rival: saga.name, theirs: rankWord(saga.theirs) }));
  return lines;
}

export { fill as fillChronicle };
