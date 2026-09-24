// The multi-series chart (Plan 34, components/MultiChart.tsx): end labels
// never share a line, ranks draw with one at the top, and the scales fit
// every series.

import { chartScales, spreadLabels } from '../src/components/MultiChart';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('multi-chart tests');

// ---- End labels ----
{
  const ys = spreadLabels([50, 52, 30, 51], 11);
  const sorted = [...ys].sort((a, b) => a - b);
  assert(sorted.every((y, i) => i === 0 || y - sorted[i - 1] >= 11), `no two labels closer than a line (${ys.join(', ')})`);
  assert(ys[2] === 30 && ys[0] === 50, 'a label with room stays where its line ends');
  assert(ys.every((y, i) => y >= [50, 52, 30, 51][i]), 'a label is only ever pushed down');
}

// ---- Scales ----
{
  const rank = [{ name: 'Rank', points: [{ x: 1, y: 40 }, { x: 2, y: 1 }] }];
  const up = chartScales(rank, { invert: true, yMin: 1, yMax: 40 });
  assert(up.sy(1) < up.sy(40), 'inverted, first place is at the top');
  const plain = chartScales(rank, { yMin: 1, yMax: 40 });
  assert(plain.sy(40) < plain.sy(1), 'otherwise the larger value is');
  const two = chartScales([
    { name: 'Endowment', points: [{ x: 3, y: 1e6 }, { x: 9, y: 5e6 }] },
    { name: 'Net', points: [{ x: 1, y: -2e6 }, { x: 9, y: 3e5 }] },
  ]);
  assert(two.x0 === 1 && two.x1 === 9 && two.lo === -2e6 && two.hi === 5e6, 'the axes span every series');
  const long = chartScales([{ name: 'A much longer series name', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }]);
  assert(long.right > two.right, 'room on the right grows with the longest end label');
  const flat = chartScales([{ name: 'Flat', points: [{ x: 1, y: 5 }, { x: 5, y: 5 }] }]);
  assert(Number.isFinite(flat.sy(5)), 'a series that never moved still draws');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
