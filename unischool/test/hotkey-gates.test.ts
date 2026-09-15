// ---------------------------------------------------------------------
// Which of the map's keys are live, given what the shell has open over it
// (src/components/hotkeys.ts's mapKeysLive and sitingKeysLive).
//
// THE BUG THIS PINS: "R does not rotate a building while placing it."
//
// The map's keys were one boolean — pan, Escape, P and R all switched off
// whenever anything of the shell's own was open, the build popup included.
// But the build popup has no backdrop, the map stays live underneath it, and
// a building is picked up from inside it and deliberately survives the popup
// staying open. So the window in which R meant anything was exactly the
// window in which R was switched off. The only way to reach the feature was
// to collapse the popup first, which no player would guess.
//
// The fix splits one rule into two, and the thing worth testing is not
// either rule on its own — it is that they differ on the build popup and on
// NOTHING ELSE. A later edit that quietly relaxes sitingKeysLive for a tab
// or an interrupt would be a much worse bug than the one being fixed, and it
// would not look like one in a diff.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { mapKeysLive, sitingKeysLive, type ShellOverlays } from '../src/components/hotkeys';

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
  overlayOpen: false, buildOpen: false, logOpen: false, interrupted: false,
};
const open = (o: Partial<ShellOverlays>): ShellOverlays => ({ ...NOTHING_OPEN, ...o });

// All sixteen states the shell can be in, so the claims below are made over
// the whole space rather than over the four cases somebody thought of.
const FLAGS = ['overlayOpen', 'buildOpen', 'logOpen', 'interrupted'] as const;
const ALL: ShellOverlays[] = Array.from({ length: 16 }, (_, mask) =>
  open(Object.fromEntries(FLAGS.map((f, i) => [f, (mask & (1 << i)) !== 0]))));
const describe = (o: ShellOverlays) => FLAGS.filter((f) => o[f]).join('+') || 'nothing open';

console.log('hotkey gate tests');

// --- the bug, as one line ---------------------------------------------
{
  const placing = open({ buildOpen: true });
  assert(
    sitingKeysLive(placing),
    'R is live with the build popup open — which is the whole of the time a building is picked up',
  );
  assert(
    !mapKeysLive(placing),
    'while pan and Escape are not, because Escape belongs to the popup and a camera behind one has moved',
  );
}

// --- nothing open: everything answers ---------------------------------
{
  assert(mapKeysLive(NOTHING_OPEN), 'with nothing open the map has its keyboard');
  assert(sitingKeysLive(NOTHING_OPEN), 'and so does siting');
}

// --- the two rules differ on the build popup, and on nothing else ------
{
  // The load-bearing claim. Stated as an implication over all sixteen
  // states: wherever the two answers disagree, the build popup is the only
  // thing that is open.
  const disagree = ALL.filter((o) => mapKeysLive(o) !== sitingKeysLive(o));
  assert(disagree.length > 0, 'the two rules are not the same boolean wearing two names');
  const onlyBuild = disagree.every(
    (o) => o.buildOpen && !o.overlayOpen && !o.logOpen && !o.interrupted,
  );
  assert(
    onlyBuild,
    `they disagree only when the build popup alone is open (${disagree.map(describe).join(' / ')})`,
  );

  // And siting is never live where the map is: a widening, never a
  // different answer.
  assert(
    ALL.every((o) => !mapKeysLive(o) || sitingKeysLive(o)),
    'anything the map answers, siting answers too',
  );
}

// --- everything else still closes both --------------------------------
{
  // A full-screen tab covers the map, the log popup owns the keyboard, and
  // an interrupt has halted the clock and must be answered. None of those
  // is a state to be rotating a building in.
  for (const flag of ['overlayOpen', 'logOpen', 'interrupted'] as const) {
    const o = open({ [flag]: true });
    assert(!mapKeysLive(o), `${flag} closes the map's keys`);
    assert(!sitingKeysLive(o), `${flag} closes siting's keys too`);
    // ...and still does with a building picked up and the popup open, which
    // is the combination the fix could most plausibly have got wrong.
    const alsoBuilding = open({ [flag]: true, buildOpen: true });
    assert(
      !sitingKeysLive(alsoBuilding),
      `${flag} outranks the build popup rather than the other way round`,
    );
  }
}

// --- an interrupt outranks everything ---------------------------------
{
  const interrupted = ALL.filter((o) => o.interrupted);
  assert(
    interrupted.every((o) => !mapKeysLive(o) && !sitingKeysLive(o)),
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
