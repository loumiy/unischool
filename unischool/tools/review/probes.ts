// ---------------------------------------------------------------------
// SMALL PROBES BEHIND THE REVIEW'S NUMBERS (Plan 73). Each prints a short
// table the review quotes, so a finding can be checked again after a fix.
//
//   npm run review:probe -- vernacular <save.json>...
//       How much of each campus the vernacular restyles (by count and by
//       footprint area, open ground left out), and which looks repeat: the
//       same motif, wall, school signature, lab feature, residence form and
//       footprint drawn for different buildings. Area 1, A1-1 and A1-2.
//       Then, in each set but Modern and Art Deco, how much still wears the
//       render wall, and which buildings (Plan 95D, B1-3).
//   npm run review:probe -- weather <save.json>...
//       How many placed buildings stand in each weathering band (0 sound …
//       4 derelict, ageMarks.tsx). Area 1, A1-6.
//   npm run review:probe -- catalogue
//       Every placeable in the catalogue by motif, and in each vernacular
//       how many share a wall and an entrance part: where one drawing
//       recurs across the catalogue. Area 1, A1-2.
//   npm run review:probe -- backlog [--years N] [--seeds 12345,4242]
//       Plays harness games (Completionist, Natural) with full maintenance
//       funding and reports, every ten years, the estate's backlog, the
//       derelict count and Founders Hall's condition, plus every answer that
//       moved the backlog. Area 1, A1-6; area 7.
// ---------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { campusLayout } from '../../src/components/campusLayout';
import { BONUS_VERNACULAR_CHOICES, RESIDENCE_FORMS, VERNACULAR_CHOICES, entrancePartOf, labFeatureOf, materialOf, materialsFor, motifOf, signatureOf, signifierOf, surfaceFollowsVernacular, variesByVernacular } from '../../src/components/buildingSpec';
import { initialTech } from '../../src/data/techData';
import { initialDorms } from '../../src/data/campusData';
import { initialFacilities } from '../../src/data/facilitiesData';
import { conditionOf } from '../../src/systems/estate/estate';
import { isPlaceableKind } from '../../src/state/campusMap';
import type { GameState, Vernacular } from '../../src/state/types';
import { foundGame, playWeek, type Player } from '../../sim/harness/game';
import { createArchetype } from '../../sim/harness/archetypes';
import { createNaturalPlayer } from '../../sim/harness/natural';

const [mode, ...rest] = process.argv.slice(2);
const flag = (name: string, fallback: string): string => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] ?? fallback : fallback;
};
const files = rest.filter((a, i) => !a.startsWith('--') && !rest[i - 1]?.startsWith('--'));
const load = (path: string): GameState => {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  return raw.state ?? raw;
};
const short = (path: string) => path.split('/').pop();

function vernacular(): void {
  for (const path of files) {
    const s = load(path);
    const L = campusLayout(s);
    let n = 0; let nv = 0; let ns = 0; let area = 0; let areaV = 0; let areaS = 0;
    const looks = new Map<string, string[]>();
    for (const e of L.placed) {
      const m = motifOf(e.t);
      if (m === 'grounds') continue;
      const a = e.p.w * e.p.h;
      n += 1; area += a;
      if (variesByVernacular(m)) { nv += 1; areaV += a; }
      if (surfaceFollowsVernacular(m)) { ns += 1; areaS += a; }
      const sig = signatureOf(e.t);
      const look = [m, materialOf(e.t, s.self.vernacular).wall, sig ? `${sig.material}${sig.feature ? `+${sig.feature}` : ''}` : '',
        labFeatureOf(e.t) ?? '', RESIDENCE_FORMS[e.t.id] ?? '', signifierOf(e.t) ?? '', `${e.p.w}x${e.p.h}`].join('|');
      looks.set(look, [...(looks.get(look) ?? []), e.t.id]);
    }
    console.log(`\n## ${short(path)}: year ${s.clock.year}, ${s.self.vernacular}`);
    console.log(`buildings (open ground left out): ${n}; restyled by the vernacular: ${nv} (${Math.round((100 * nv) / Math.max(1, n))}%), ${Math.round((100 * areaV) / Math.max(1, area))}% of their footprint area`);
    console.log(`wearing the vernacular's surface (Plan 74E: its massing, or its windows, entrance and crest): ${ns} (${Math.round((100 * ns) / Math.max(1, n))}%), ${Math.round((100 * areaS) / Math.max(1, area))}% of their footprint area`);
    console.log(`distinct looks: ${looks.size}; drawn more than once:`);
    for (const [look, ids] of [...looks].filter(([, ids]) => ids.length > 1).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${ids.length}× ${look}: ${ids.join(' ')}`);
    }
    // The same campus in every set where render is foreign (Plan 95D, the
    // second review's B1-3): how much of it still wears the buff render wall.
    console.log('render wall, by set (Modern and Art Deco left out):');
    for (const v of RENDER_FOREIGN) {
      const render = materialsFor(v).render.wall;
      let k = 0; let areaR = 0;
      const ids = new Map<string, number>();
      for (const e of L.placed) {
        if (motifOf(e.t) === 'grounds' || materialOf(e.t, v).wall !== render) continue;
        k += 1; areaR += e.p.w * e.p.h;
        ids.set(e.t.id, (ids.get(e.t.id) ?? 0) + 1);
      }
      const list = [...ids].map(([id, c]) => (c > 1 ? `${id}×${c}` : id)).join(' ');
      console.log(`  ${v}: ${k} of ${n} (${Math.round((100 * k) / Math.max(1, n))}%), ${Math.round((100 * areaR) / Math.max(1, area))}% of area${list ? `: ${list}` : ''}`);
    }
  }
}
const RENDER_FOREIGN: Vernacular[] = [...VERNACULAR_CHOICES, ...BONUS_VERNACULAR_CHOICES]
  .map((c) => c.id).filter((v) => v !== 'modern' && v !== 'artDeco');

function weather(): void {
  for (const path of files) {
    const s = load(path);
    const bands = [0, 0, 0, 0, 0];
    const L = campusLayout(s);
    for (const e of L.placed) bands[e.age] += 1;
    console.log(`${short(path)}: year ${s.clock.year}; buildings by weathering band 0..4: ${bands.join(' / ')} of ${L.placed.length}`);
  }
}

function catalogue(): void {
  const all = [...initialTech(), ...initialDorms(), ...initialFacilities()].filter(isPlaceableKind);
  const byMotif = new Map<string, string[]>();
  for (const t of all) byMotif.set(motifOf(t), [...(byMotif.get(motifOf(t)) ?? []), t.id]);
  console.log(`${all.length} placeables\n\n| Motif | Varies by vernacular | Count | Ids |\n|---|---|---:|---|`);
  for (const [m, ids] of [...byMotif].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`| ${m} | ${variesByVernacular(m as never) ? 'yes' : 'no'} | ${ids.length} | ${ids.join(', ')} |`);
  }
  for (const { id: v } of VERNACULAR_CHOICES) {
    const walls = new Map<string, number>();
    const doors = new Map<string, number>();
    for (const t of all) {
      if (motifOf(t) === 'grounds') continue;
      const w = materialOf(t, v).wall;
      walls.set(w, (walls.get(w) ?? 0) + 1);
      const e = entrancePartOf(t, v);
      doors.set(e, (doors.get(e) ?? 0) + 1);
    }
    const list = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ');
    console.log(`\n${v}: walls ${list(walls)}; entrances ${list(doors)}`);
  }
}

function backlog(): void {
  const standing = (s: GameState) => s.tech.filter((t) => isPlaceableKind(t) && t.id in s.placements && t.status === 'done');
  const total = (s: GameState) => standing(s).reduce((a, t) => a + (t.backlog ?? 0), 0);
  const years = Number(flag('years', '50'));
  const seeds = flag('seeds', '12345,4242').split(',').map(Number);
  const runs: [string, number][] = [['Completionist', seeds[0]], ...seeds.map((seed): [string, number] => ['Natural', seed])];
  for (const [who, seed] of runs) {
    const player: Player = who === 'Natural' ? createNaturalPlayer() : createArchetype('Completionist');
    const g = foundGame({ seed, name: 'Harwick' });
    const act = g.act.bind(g);
    const moves: string[] = [];
    g.act = (a) => {
      const before = total(g.s);
      act(a);
      const d = total(g.s) - before;
      if (a.type !== 'TICK' && Math.abs(d) > 1_000) moves.push(`  year ${g.s.clock.year} week ${g.s.clock.week}: ${JSON.stringify(a).slice(0, 100)} moved it ${d > 0 ? '+' : ''}$${(d / 1e6).toFixed(2)}M`);
    };
    const rows: string[] = [];
    let marked = 0;
    // Weeks the estate went short: austerity sets maintenance to nothing
    // (systems/finance/distress.ts), and a player may lower it.
    let shortWeeks = 0;
    while (g.s.clock.year <= years) {
      playWeek(g, player);
      if ((g.s.finance.maintenanceFunding ?? 1) < 1) shortWeeks += 1;
      if (g.s.clock.year !== marked && g.s.clock.year % 10 === 1) {
        marked = g.s.clock.year;
        const st = standing(g.s);
        const hall = st.find((t) => t.id === 'BLDG-GENSTUDIES');
        rows.push(`  year ${g.s.clock.year}: backlog $${(total(g.s) / 1e6).toFixed(1)}M; derelict ${st.filter((t) => conditionOf(t) < 0.1).length} of ${st.length}; Founders Hall condition ${hall ? conditionOf(hall).toFixed(2) : '–'}; weeks with maintenance under full so far ${shortWeeks}`);
      }
    }
    console.log(`\n## ${who}, seed ${seed}\n${rows.join('\n')}\nanswers that moved the backlog:\n${moves.join('\n') || '  none'}`);
  }
}

if (mode === 'vernacular') vernacular();
else if (mode === 'weather') weather();
else if (mode === 'backlog') backlog();
else if (mode === 'catalogue') catalogue();
else {
  console.error('usage: probes vernacular <save.json>... | weather <save.json>... | catalogue | backlog [--years N] [--seeds a,b]');
  process.exit(2);
}
