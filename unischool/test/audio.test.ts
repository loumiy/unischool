// Sound (Plan 34, components/audio/, data/audioData.ts): the engine needs a
// speaker; what it is told to play does not, and that is what these check.

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { CUES, SFX, THEMES, audioProblems, chordNotes, midiToHz, sectionAt, themeById } from '../src/data/audioData';
import { CEREMONIAL_FROM, SILENT_TOPICS, ambienceFor, cuesFor, linesSince, stateCues, themeFor, winterDepth } from '../src/components/audio/director';
import { DEFAULT_AUDIO, normaliseAudio } from '../src/components/audio/settings';
import { AudioEngine } from '../src/components/audio/engine';
import { RUNG_FREEZE, RUNG_TIGHT, foundingDistress } from '../src/systems/finance/distress';
import { OCCASIONS } from '../src/systems/athletics/season';
import { LOG_TOPICS, type GameState, type LogEntry, type VarsityTeam } from '../src/state/types';

bindScriptStream(3340);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('audio tests');

function at(year: number, week = 10): GameState {
  const s = createInitialState('Sound');
  s.pendingInterrupt = null;
  s.clock.year = year;
  s.clock.week = week;
  return s;
}

// ---- The file ----
{
  const problems = audioProblems();
  assert(problems.length === 0, `the sound file is sound (${problems.join('; ')})`);
  assert(THEMES.map((t) => t.id).sort().join() === 'ceremonial,distress,founding,growth', 'four themes');
  for (const t of THEMES) {
    const chord = chordNotes(t, t.progression[0]);
    assert(chord.length === 4 && chord.every((n, i) => i === 0 || n > chord[i - 1]), `${t.id}: a triad and its seventh, rising`);
    assert(midiToHz(chord[0]) > 80 && midiToHz(chord[3] + 12 * t.arp.octave) < 2000, `${t.id}: in a range the ear likes`);
    assert((t.progressionB?.length ?? 0) > 0 && t.patternB?.length === 8, `${t.id}: a B section and a second pattern`);
  }
  assert(midiToHz(69) === 440, 'A is 440');
  const distress = chordNotes(themeById('distress'), 0);
  const growth = chordNotes(themeById('growth'), 0);
  assert(distress[1] - distress[0] === 3 && growth[1] - growth[0] === 4, 'the undertone is minor, growth major');
  assert(Object.values(CUES).every((id) => SFX.some((s) => s.id === id)), 'every cue names an effect that exists');
}

// ---- Four hours of a theme never plays the same eight bars more than twice running ----
for (const theme of THEMES) {
  const steps = Math.floor((4 * 3600) / (60 / theme.bpm / 2));
  let last = '';
  let run = 0;
  let worst = 0;
  for (let start = 0; start + 64 <= steps; start += 64) {
    let sig = '';
    for (let i = start; i < start + 64; i++) {
      const n = sectionAt(theme, i);
      sig += `${n.degree}:${n.tone},`;
    }
    run = sig === last ? run + 1 : 1;
    worst = Math.max(worst, run);
    last = sig;
  }
  assert(worst <= 2, `${theme.id}: no eight bars more than twice running (${worst})`);
}

// ---- The music follows the college ----
{
  assert(themeFor(null) === 'founding' && themeFor(at(1)) === 'founding', 'a founding theme for the founding');
  assert(themeFor(at(10)) === 'growth', 'growth between');
  const tight = at(10);
  tight.finance.distress = { ...foundingDistress(), rung: RUNG_TIGHT };
  assert(themeFor(tight) === 'growth', 'a tight year is not yet distress');
  const frozen = at(10);
  frozen.finance.distress = { ...foundingDistress(), rung: RUNG_FREEZE };
  assert(themeFor(frozen) === 'distress', 'the undertone once the board freezes construction');
  assert(themeFor(at(CEREMONIAL_FROM)) === 'ceremonial', 'ceremony for the last years');
  const ended = at(20);
  ended.finance.distress = { ...foundingDistress(), rung: RUNG_FREEZE };
  ended.ending = {} as GameState['ending'];
  assert(themeFor(ended) === 'ceremonial', 'and for the Final Report, whatever the books say');
}

// ---- The campus ----
{
  const s = at(10, 36);
  s.students.classes = { freshman: 600, sophomore: 500, junior: 450, senior: 400 };
  const term = ambienceFor(s);
  assert(term.crowd > 0 && term.crowd < 1, `a murmur with the roll (${term.crowd.toFixed(2)})`);
  s.pendingInterrupt = { type: 'summer', payload: { beat: 0, tuition: 0, admitRate: 0.5 } } as GameState['pendingInterrupt'];
  assert(ambienceFor(s).crowd < term.crowd, 'thinner over the summer');
  s.students.classes = { freshman: 0, sophomore: 0, junior: 0, senior: 0 };
  assert(ambienceFor(s).crowd === 0, 'silent with nobody there');
  assert(winterDepth(26) === 1 && winterDepth(27) === 1 && winterDepth(1) === 0 && winterDepth(52) === 0, 'winter is deepest at the turn of the terms, and summer has none');
  const deep = ambienceFor(at(10, 26));
  const warm = ambienceFor(at(10, 44));
  assert(deep.wind > warm.wind && warm.birds > deep.birds, 'wind in the winter, birds out of it');
}

// ---- The stadium ----
{
  const game = OCCASIONS[0].week;
  const s = at(10, game);
  assert(!ambienceFor(s).roar, 'no roar without a team');
  s.orgs.teams = [{ id: 't', sport: 'football', status: 'active' } as unknown as VarsityTeam];
  assert(ambienceFor(s).roar, 'a roar on a game week');
  s.clock.week = game + 1;
  assert(!ambienceFor(s).roar, 'and not the week after');
}

// ---- The log cues its effects ----
{
  const line = (message: string, over: Partial<LogEntry> = {}): LogEntry => ({ year: 5, week: 3, message, kind: 'info', ...over });
  const cues = cuesFor([
    line('a hall', { topic: 'building' }),
    line('another hall', { topic: 'building' }),
    line('a hire', { topic: 'appointment' }),
    line('a grant', { topic: 'grant' }),
    line('a win', { topic: 'team', kind: 'good' }),
    line('a loss', { topic: 'team', kind: 'bad' }),
    line('texture'),
  ]);
  assert(cues.join() === 'complete,tick,coin,cheer,loss', `each effect once, in order, a win cheered and a loss lamented (${cues.join()})`);
  assert(cuesFor([line('the red', { topic: 'money', kind: 'bad' })]).join() === 'alarm', 'money going the wrong way is an alarm, not a coin');
  assert(cuesFor([line('a venue', { topic: 'team', kind: 'info' })]).length === 0, 'a venue finishing is its building\'s line, not the team\'s');
  // Plan 70H: no topic is silent by accident.
  const unheard = LOG_TOPICS.filter((t) => CUES[t] === undefined && SILENT_TOPICS[t] === undefined);
  assert(unheard.length === 0, `every log topic cues an effect or is listed as silent, with its reason (${unheard.join(', ')})`);
  assert(Object.keys(SILENT_TOPICS).every((t) => CUES[t as keyof typeof CUES] === undefined), 'a silent topic has no cue');
  const log = [line('c'), line('b'), line('a')];
  assert(linesSince(log, undefined) === null, 'nothing heard yet is a load, not news');
  assert(linesSince(log, { ...log[1] })?.length === 1, 'the lines newer than the last heard, by their words');
  assert(linesSince(log, line('gone')) === null, 'a log that no longer holds it is heard from where it stands');
}

// ---- The settings, and a browser with no sound ----
{
  assert(JSON.stringify(normaliseAudio(null)) === JSON.stringify(DEFAULT_AUDIO), 'defaults when nothing is stored');
  const read = normaliseAudio({ master: 3, music: -1, sfx: 'loud', muted: true, extra: 1 });
  assert(JSON.stringify(read) === JSON.stringify({ ...DEFAULT_AUDIO, master: 1, music: 0, muted: true }), 'levels clamped, junk dropped');
  const engine = new AudioEngine();
  engine.unlock();
  engine.setTheme('distress');
  engine.play('place');
  engine.setAmbience(ambienceFor(at(10)));
  assert(!engine.available && !engine.started, 'silent, not broken, where there is no Web Audio');
}

if (failures === 0) {
  // ---- What the state says that no line does (Plan 70H) ----
{
  const before = at(6);
  const after = structuredClone(before);
  assert(stateCues(before, after).length === 0, 'a week with nothing new is silent');
  after.placements['X-NEW'] = { row: 1, col: 1, w: 1, h: 1 };
  assert(stateCues(before, after).includes('place'), 'ground broken is a thump');
  assert(stateCues(after, before).includes('demolish'), 'a building gone is its demolition');
  const red = structuredClone(before);
  before.finance.cash = 10;
  red.finance.cash = -10;
  assert(stateCues(before, red).includes('alarm'), 'cash going into the red is an alarm');
  assert(!stateCues(red, red).includes('alarm'), 'and staying there is not, week after week');
  const title = structuredClone(before);
  title.orgs.titles.push({ sport: 'football', year: 6 });
  assert(stateCues(before, title).includes('fanfare'), 'a title is a fanfare');
  const up = structuredClone(before);
  up.self.reputation += 40;
  assert(stateCues(before, up).includes('rankUp') && stateCues(up, before).includes('rankDown'), 'the rank moving is heard both ways');
}

console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
