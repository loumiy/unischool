import type { GameState } from '../../state/types';
import { CHRONICLE_LINES, CHRONICLE_WORDS, ERA_MAX, ERA_MAX_YEARS, ERA_MIN_YEARS, ERA_NAMES, type EraKind } from '../../data/chronicleData';
import { milestoneById } from '../../data/ladderData';
import { promiseById } from '../../data/promiseData';
import { tagById } from '../../data/tagData';
import { eventById } from '../events/catalogue';
import { mainSport } from '../rivals/collegeRival';
import { rankedListBy } from '../rivals/rivalsSystem';
import { moneyShort } from '../../format';

// THE CHRONICLE (Plan 33, from v2's chronicle.ts; V2 #53): the run written
// as eras named from what happened. Every closed year is read from what the
// game keeps for good (the history rows and the journal: see Plan 33's PR B),
// given a kind (a founding, a building boom, troubles, a campaign, a rise,
// a golden stretch, or nothing much); runs of a kind become eras, eras too
// short to name fold into a neighbour, and each era is named from a
// template and summarised. A pure reading, in draft at any time.

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

export function yearRecords(s: GameState): YearRecord[] {
  const rivalName = s.rivalStanding ? s.rivals.find((r) => r.id === s.rivalStanding!.rivalId)?.name ?? null : null;
  return s.history.map((h) => {
    const y = h.year;
    return {
      year: y,
      rank: h.rank > 0 ? h.rank : null,
      rungMax: h.worstRung ?? 0,
      built: s.tech.filter((t) => t.kind !== 'course' && t.status === 'done' && t.builtYear === y).sort((a, b) => b.cost - a.cost).map((t) => t.name),
      campaigns: (s.advancement?.closed ?? []).filter((c) => c.year === y).length,
      titles: s.orgs.titles.filter((t) => t.year === y).length,
      rivalNamed: s.rivalStanding?.since === y ? rivalName : null,
      tags: (s.identity?.log ?? []).filter((e) => e.earned && e.year === y).map((e) => tagById(e.id)?.name ?? e.id),
      kept: (s.promises?.settled ?? []).filter((p) => p.kept && p.year === y).map((p) => promiseById(p.id)?.title ?? p.id),
      missed: (s.promises?.settled ?? []).filter((p) => !p.kept && p.year === y).map((p) => promiseById(p.id)?.title ?? p.id),
      net: h.net,
      endowment: h.endowment ?? null,
      graduated: h.graduated,
      seismic: (s.catalogue?.letters ?? []).filter((l) => l.year === y).map((l) => eventById(l.eventId)?.title ?? l.eventId),
      firsts: Object.entries(s.ladder.reached).filter(([, year]) => year === y).map(([id]) => milestoneById(id)?.name ?? id),
    };
  });
}

// What kind of year it was, first match wins.
export function yearKind(recs: YearRecord[], i: number): EraKind {
  const r = recs[i];
  if (r.year <= 3) return 'founding';
  if (r.rungMax >= 5) return 'receivership';
  if (r.rungMax >= 3) return 'troubles';
  if (r.campaigns > 0) return 'campaign';
  if (r.rivalNamed) return 'rivalry';
  if (r.built.length >= 2) return 'building';
  const before = recs[i - 3]?.rank ?? null;
  if (r.rank !== null && before !== null) {
    if (before - r.rank >= 3) return 'rise';
    if (r.rank - before >= 3) return 'decline';
  }
  if (r.rank !== null && r.rank <= 8 && r.rungMax === 0) return 'golden';
  return 'quiet';
}

interface Span { kind: EraKind; from: number; to: number }

// Runs of a kind, the short ones folded into what came before, and no more
// eras than a chronicle can hold.
export function partition(recs: YearRecord[]): Span[] {
  const spans: Span[] = [];
  const at = (y: number) => recs.find((r) => r.year === y);
  const notable = (r: YearRecord | undefined) => (r ? r.seismic.length * 3 + r.built.length + r.titles * 2 + r.tags.length : 0);
  recs.forEach((r, i) => {
    const kind = yearKind(recs, i);
    const last = spans[spans.length - 1];
    if (last && last.kind === kind) last.to = r.year;
    else spans.push({ kind, from: r.year, to: r.year });
  });
  const len = (s: Span) => s.to - s.from + 1;
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
      const target = spans[into];
      target.from = Math.min(target.from, s.from);
      target.to = Math.max(target.to, s.to);
      spans.splice(i, 1);
      changed = true;
      break;
    }
    for (let i = 1; i < spans.length; i++) {
      if (spans[i].kind === spans[i - 1].kind) {
        spans[i - 1].to = spans[i].to;
        spans.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  // A stretch too long to be one era is split where the most happened.
  for (let i = 0; i < spans.length && spans.length < ERA_MAX; i++) {
    const s = spans[i];
    if (len(s) <= ERA_MAX_YEARS) continue;
    let cut = -1;
    let best = -1;
    for (let y = s.from + ERA_MIN_YEARS; y <= s.to - ERA_MIN_YEARS + 1; y++) {
      const score = notable(at(y)) + 0.01 * (ERA_MAX_YEARS - Math.abs(y - s.from - ERA_MAX_YEARS / 2));
      if (score > best) { best = score; cut = y; }
    }
    if (cut < 0) continue;
    spans.splice(i, 1, { kind: s.kind, from: s.from, to: cut - 1 }, { kind: s.kind, from: cut, to: s.to });
    i--;
  }
  while (spans.length > ERA_MAX) {
    let shortest = 1;
    for (let i = 1; i < spans.length; i++) if (len(spans[i]) < len(spans[shortest])) shortest = i;
    spans[shortest - 1].to = spans[shortest].to;
    spans.splice(shortest, 1);
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
  const rival = years.find((r) => r.rivalNamed)?.rivalNamed;
  const vars: Record<string, string> = {
    building: biggest ?? 'the New Hall',
    rival: rival ?? 'the Rival',
    ordinal: ordinalWord(campaignNo),
  };
  // A quiet stretch with a letter everyone remembers is named for it.
  const event = years.flatMap((r) => r.seismic)[0];
  const kind: EraKind = span.kind === 'quiet' && event ? 'eventful' : span.kind;
  if (event) vars.event = titleCase(event);
  const options = ERA_NAMES[kind];
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
  const ranked = years.filter((r) => r.rank !== null);
  if (ranked.length >= 2) {
    const a = ranked[0].rank!;
    const b = ranked[ranked.length - 1].rank!;
    lines.push(Math.abs(a - b) <= 1 ? fill(L.rankFlat, { to: rankWord(b) }) : fill(L.rank, { from: rankWord(a), to: rankWord(b) }));
  }
  const closed = years.filter((r) => r.net !== null);
  if (closed.length) {
    const net = closed.reduce((t, r) => t + (r.net ?? 0), 0);
    const netWords = `${net >= 0 ? 'in the black by' : 'in the red by'} ${moneyShort(Math.abs(net))}`;
    const first = closed[0].endowment;
    const last = closed[closed.length - 1].endowment;
    lines.push(first !== null && last !== null
      ? fill(L.money, { net: netWords, from: moneyShort(first), to: moneyShort(last) })
      : fill(L.moneyPlain, { net: netWords }));
  }
  const worst = Math.max(...years.map((r) => r.rungMax));
  if (worst >= 3) lines.push(fill(L.troubles, { rung: `rung ${worst}` }));
  const classes = years.filter((r) => r.graduated > 0).length;
  if (classes) lines.push(fill(L.classes, { classes: classes === 1 ? 'One class' : `${classes} classes` }));
  const weathered = years.flatMap((r) => r.seismic);
  if (weathered.length) lines.push(fill(L.weathered, { list: listOf(weathered.map((w) => w.charAt(0).toLowerCase() + w.slice(1))) }));
  const titles = years.reduce((t, r) => t + r.titles, 0);
  if (titles) lines.push(titles === 1 ? L.title : fill(L.titles, { count: titles }));
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
  if (saga.won + saga.lost > 0) lines.push(fill(saga.won + saga.lost === 1 ? W.sagaGame : W.sagaGames, { count: saga.won + saga.lost, won: saga.won, lost: saga.lost }));
  lines.push(fill(W.sagaStanding, { mine: rankWord(saga.mine), rival: saga.name, theirs: rankWord(saga.theirs) }));
  return lines;
}

export { fill as fillChronicle };
