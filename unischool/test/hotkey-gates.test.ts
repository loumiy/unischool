// ---------------------------------------------------------------------
// Which of the map's keys are live, given what the shell has open over it
// (src/components/hotkeys.ts's mapBackOutLive and mapControlsLive).
//
// THE BUG THIS PINS, reported three times as three different broken keys:
// R would not rotate a building while placing it, P would not arm the path
// tool, and W/A/S/D would not pan — each of them only while the build menu
// was up, which is to say while the player was in the middle of using them.
//
// One wrong idea caused all three. The map's keys were one boolean, switched
// off whenever anything of the shell's own was open, the build popup
// included. But the build popup has no backdrop, the map stays live and
// visible underneath it, and it is where the map's own tools are reached
// from. Working the map with the menu up is the main line, not an edge case.
//
// The fix is that the build popup takes exactly ONE key from the map —
// Escape, because App.tsx's ladder has to arbitrate it — and the thing worth
// testing is not either rule on its own. It is that they differ on the build
// popup and on NOTHING ELSE. A later edit that quietly relaxed
// mapControlsLive for a tab or an interrupt would be a much worse bug than
// the three being fixed, and it would not look like one in a diff.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { mapBackOutLive, mapControlsLive, type ShellOverlays } from '../src/components/hotkeys';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const NOTHING_OPEN: ShellOverlays = {
  overlayOpen: false, buildOpen: false, logOpen: false, interrupted: false, frontUp: false,
};
const open = (o: Partial<ShellOverlays>): ShellOverlays => ({ ...NOTHING_OPEN, ...o });

// All thirty-two states the shell can be in, so the claims below are made over
// the whole space rather than over the four cases somebody thought of.
const FLAGS = ['overlayOpen', 'buildOpen', 'logOpen', 'interrupted', 'frontUp'] as const;
const ALL: ShellOverlays[] = Array.from({ length: 1 << FLAGS.length }, (_, mask) =>
  open(Object.fromEntries(FLAGS.map((f, i) => [f, (mask & (1 << i)) !== 0]))));
const describe = (o: ShellOverlays) => FLAGS.filter((f) => o[f]).join('+') || 'nothing open';

console.log('hotkey gate tests');

// --- the three bugs, as one line --------------------------------------
{
  const menuUp = open({ buildOpen: true });
  assert(
    mapControlsLive(menuUp),
    'pan, R and P are all live with the build menu up — which is when a player reaches for every one of them',
  );
  assert(
    !mapBackOutLive(menuUp),
    'and Escape alone is not, because the menu owns it while it is open',
  );
}

// --- nothing open: everything answers ---------------------------------
{
  assert(mapBackOutLive(NOTHING_OPEN), 'with nothing open the map answers Escape');
  assert(mapControlsLive(NOTHING_OPEN), 'and every one of its controls');
}

// --- the two rules differ on the build popup, and on nothing else ------
{
  // The load-bearing claim. Stated as an implication over all thirty-two
  // states: wherever the two answers disagree, the build popup is the only
  // thing that is open.
  const disagree = ALL.filter((o) => mapBackOutLive(o) !== mapControlsLive(o));
  assert(disagree.length > 0, 'the two rules are not the same boolean wearing two names');
  const onlyBuild = disagree.every(
    (o) => o.buildOpen && !o.overlayOpen && !o.logOpen && !o.interrupted && !o.frontUp,
  );
  assert(
    onlyBuild,
    `they disagree only when the build popup alone is open (${disagree.map(describe).join(' / ')})`,
  );

  // And the controls are never silent where Escape answers: a widening,
  // never a different answer.
  assert(
    ALL.every((o) => !mapBackOutLive(o) || mapControlsLive(o)),
    'wherever Escape reaches the map, so do its controls',
  );
}

// --- everything else still closes both --------------------------------
{
  // A full-screen tab covers the map, the log popup owns the keyboard, and
  // an interrupt has halted the clock and must be answered. None of those
  // is a state to be rotating a building in. Nor is a front screen (the
  // title, hall, settings or credits), which covers the whole game.
  for (const flag of ['overlayOpen', 'logOpen', 'interrupted', 'frontUp'] as const) {
    const o = open({ [flag]: true });
    assert(!mapBackOutLive(o), `${flag} closes Escape`);
    assert(!mapControlsLive(o), `${flag} closes the map's controls too`);
    // ...and still does with a building picked up and the popup open, which
    // is the combination the fix could most plausibly have got wrong.
    const alsoBuilding = open({ [flag]: true, buildOpen: true });
    assert(
      !mapControlsLive(alsoBuilding),
      `${flag} outranks the build popup rather than the other way round`,
    );
  }
}

// --- an interrupt outranks everything ---------------------------------
{
  const interrupted = ALL.filter((o) => o.interrupted);
  assert(
    interrupted.every((o) => !mapBackOutLive(o) && !mapControlsLive(o)),
    `a decision modal silences every map key, whatever else is open (${interrupted.length} states)`,
  );
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
