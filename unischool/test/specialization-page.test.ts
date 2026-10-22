// ---------------------------------------------------------------------
// The specialization as a letter and a page (Plan 109,
// components/SpecializationChoice.tsx). What is worth pinning:
//
//   - the stop's card in the inbox is a short letter: the board's one
//     sentence, the four pillars' ranks, Convene the board and Not this
//     year; and narrow, no longer a page of cards;
//   - the page shows only when the shell has opened it, over the inbox:
//     the question by the college's name, the rule, Not this year and
//     Close, and four panels, each with its building, its rank and value,
//     the bar to 150 with the share only its specialization fills from
//     150 less the share's points and the top specialist where they stand,
//     what it adds and how it fills, the comparison, and its own choose
//     button; the strongest pillar tagged once; nothing armed yet;
//   - what the panels draw: each capital project on its plate, and the
//     downtown's slice where its street is first dressed, shops and
//     strings of lights on their own plate, for any name.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { institutionName, type GameState } from '../src/state/types';
import { readSave } from '../src/state/persistence';
import InterruptModal, { InterruptContent } from '../src/components/InterruptModal';
import { modalWidth } from '../src/components/modalLayout';
import { PlateDrawing, downtownSlice } from '../src/components/specializationPreview';
import { landOf } from '../src/components/ringLand';
import { PILLARS, PRESTIGE_MAX } from '../src/systems/prestige/prestigeSystem';
import { specializationOptions, strongestStanding } from '../src/systems/prestige/milestone';
import { CHOICE_WORDS, SPECIALIZATION_BUILDINGS, SPECIALIZATION_CARDS } from '../src/data/specializationData';
import { pillarShareRule } from '../src/data/prestigeWords';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('specialization page tests');

function launch(): GameState {
  const read = readSave(readFileSync(join(process.cwd(), 'test/fixtures/save-launch.json'), 'utf8'));
  if ('refused' in read) throw new Error(`the launch fixture is refused: ${read.refused}`);
  const s = read.state;
  s.started = true;
  s.events.opening.stage = 'play';
  s.pendingInterrupt = { type: 'specialization' };
  return s;
}
// React escapes these in markup.
const html = (text: string) => text.replace(/&/g, '&amp;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;');

// ---- The letter ----
{
  const s = launch();
  assert(modalWidth({ type: 'specialization' }) === 'narrow', 'the stop\'s card is a narrow letter');
  let opened = 0;
  const letter = renderToStaticMarkup(createElement(InterruptContent, { s, act: () => {}, onOpenSpecialization: () => { opened += 1; } }));
  assert(letter.includes(html(CHOICE_WORDS.title)) && letter.includes(html(CHOICE_WORDS.from)), 'from the board, under its title');
  assert(letter.includes(`${CHOICE_WORDS.convene} →`) && letter.includes(CHOICE_WORDS.later), 'Convene the board, and Not this year');
  assert(!letter.includes('spec-panel') && !letter.includes(html(pillarShareRule())), 'no panels and no rule in the letter');
  for (const o of specializationOptions(s)) assert(letter.includes(`pillar-${o.pillar}`) && letter.includes(`#${o.rank}`), `${o.pillar}'s rank in the letter (#${o.rank})`);
  assert(opened === 0, 'and nothing opens until it is pressed');
  const bare = renderToStaticMarkup(createElement(InterruptContent, { s, act: () => {} }));
  assert(!bare.includes(CHOICE_WORDS.convene) && bare.includes(CHOICE_WORDS.later), 'with no page to open, only Not this year');
}

// ---- The page ----
{
  const s = launch();
  const shut = renderToStaticMarkup(createElement(InterruptModal, { s, act: () => {} }));
  assert(shut === '', 'the page is not up until the letter opens it');
  const page = renderToStaticMarkup(createElement(InterruptModal, { s, act: () => {}, specializationOpen: true, onCloseSpecialization: () => {} }));
  assert(page.includes('class="spec-page"') && page.includes('role="dialog"') && page.includes('aria-modal="true"'), 'opened, it is a page over everything');
  assert(page.includes(html(CHOICE_WORDS.question(institutionName(s.self)))), 'asking by the college\'s name');
  assert(page.includes(html(pillarShareRule())) && page.includes(html(CHOICE_WORDS.forGood)), 'under it the rule, and what stays empty');
  assert(page.includes(`>${CHOICE_WORDS.later}<`) && page.includes(`${CHOICE_WORDS.close} <svg`), 'Not this year and Close at its head');
  assert((page.match(/<section class="spec-panel /g) ?? []).length === 4, 'four panels');
  assert((page.match(new RegExp(CHOICE_WORDS.strongestTag, 'g')) ?? []).length === 1, 'the strongest pillar tagged once');
  const strongest = strongestStanding(s).pillar;
  const tagged = page.slice(page.indexOf(`pillar-${strongest}`), page.indexOf(CHOICE_WORDS.strongestTag));
  assert(!tagged.includes('<section'), `on its own panel (${strongest})`);
  assert(!page.includes('is-armed') && !page.includes('inert') && !page.includes('spec-armed'), 'nothing armed yet');
  for (const o of specializationOptions(s)) {
    const card = SPECIALIZATION_CARDS[o.pillar];
    const at = page.indexOf(`spec-panel pillar-${o.pillar}`);
    const panel = page.slice(at, page.indexOf('</section>', at));
    const id = SPECIALIZATION_BUILDINGS[o.pillar];
    const project = id ? s.tech.find((t) => t.id === id) : undefined;
    assert(id === null || (project !== undefined && panel.includes(html(project.name)) && panel.includes(CHOICE_WORDS.builds(project.cost))), `${o.pillar}: what it builds, and its price`);
    assert(id !== null || (panel.includes(CHOICE_WORDS.grows) && panel.includes(CHOICE_WORDS.downtown)), `${o.pillar}: the downtown, and how long it grows`);
    assert(panel.includes(html(card.name)) && panel.includes(html(card.summary)) && panel.includes(html(card.adds)) && panel.includes(html(card.fillsShort)), `${o.pillar}: its name, what it adds and how it fills`);
    assert(panel.includes(`#${o.rank}`) && panel.includes(`<b>${o.value.toFixed(0)}</b>`), `${o.pillar}: #${o.rank}, at ${o.value.toFixed(0)}`);
    const share = `left:${((PRESTIGE_MAX - o.weight) / PRESTIGE_MAX) * 100}%`;
    const fill = `width:${(Math.min(PRESTIGE_MAX, o.value) / PRESTIGE_MAX) * 100}%`;
    assert(panel.includes(share) && panel.includes(fill), `${o.pillar}: the bar, filled to the value, the last ${o.weight} points hatched`);
    assert(o.strongest === null || (panel.includes('spec-meter-top') && panel.includes(html(o.strongest.name))), `${o.pillar}: the top specialist marked and named`);
    assert(panel.includes(CHOICE_WORDS.rivalsHere(o.rivals)), `${o.pillar}: ${CHOICE_WORDS.rivalsHere(o.rivals)}`);
    assert(panel.includes('Full today: prestige') && panel.includes(`>${CHOICE_WORDS.choose(o.pillar)}<`), `${o.pillar}: the comparison, and "${CHOICE_WORDS.choose(o.pillar)}"`);
  }
}

// ---- What the panels draw ----
{
  const s = launch();
  for (const p of PILLARS) {
    const id = SPECIALIZATION_BUILDINGS[p];
    if (id === null) continue;
    const t = s.tech.find((x) => x.id === id);
    assert(t !== undefined, `${p}'s project is in the catalogue (${id})`);
    if (!t) continue;
    const drawn = renderToStaticMarkup(createElement(PlateDrawing, { t, vernacular: s.self.vernacular }));
    assert(drawn.includes('campus-ground') && drawn.length > 2000, `${t.name} is drawn on its plate (${drawn.length} characters)`);
  }
  for (const name of ['Blackmoor', 'Halifax', 'Playtest University', 'Q']) {
    const slice = downtownSlice(name);
    assert(slice !== null, `${name}: the downtown has a slice`);
    if (!slice) continue;
    const shops = slice.sprites.flatMap((x) => (x.kind === 'shop' ? [x.shop] : []));
    assert(shops.length >= 4, `${name}: a street of shops (${shops.length})`);
    assert(shops.some((x) => x.awning >= 0) && slice.sprites.some((x) => x.kind === 'lights'), `${name}: shopfronts and a string of lights`);
    const first = [...landOf(name).district.strings].sort((a, b) => a.step - b.step)[0];
    assert(first !== undefined && Math.abs(first.col - slice.centre) <= 7, `${name}: centred where the street is first dressed`);
    assert(shops.every((x) => Math.abs(x.col + x.w / 2 - slice.centre) <= 5.01), `${name}: every shop near it`);
    const { c0, r0, c1, r1 } = slice.plate;
    assert(shops.every((x) => x.col >= c0 && x.col + x.w <= c1 && x.row >= r0 && x.row + x.h <= r1), `${name}: and all on the plate`);
    assert(slice.sprites.every((x, i) => i === 0 || slice.sprites[i - 1].y <= x.y), `${name}: back to front`);
    assert(landOf(name).district.shops.length > shops.length, `${name}: a slice, not the whole town`);
  }
}

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
