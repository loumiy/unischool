import type { GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { moneyShort } from '../format';
import { RUNG_DEFICIT } from '../systems/finance/distress';

// The Treasury's cash over the years: each summer's close from the history
// rows, then this week's figure as a dot at the end. The years the board's
// ladder reached Deficit or worse (YearSnapshot.worstRung) are shaded, so
// the hard years read on the line that made them.

const W = 640;
const H = 220;
const PAD = { top: 14, right: 14, bottom: 22, left: 48 };
const TICKS = 5;

// A round step that puts about TICKS lines across the span: 1, 2 or 5 times
// a power of ten.
function niceStep(span: number): number {
  const raw = span / (TICKS - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * mag).find((step) => step >= raw) ?? raw;
}

export default function TreasuryCashChart({ s }: { s: GameState }) {
  const now = { x: s.clock.year - 1 + s.clock.week / WEEKS_PER_YEAR, y: s.finance.cash };
  const points = [...s.history.map((h) => ({ x: h.year, y: h.cash })), now];
  if (s.history.length < 2) {
    return <p className="empty-note">The line starts once the college has closed two summers.</p>;
  }

  const x0 = points[0].x;
  const x1 = Math.max(now.x, x0 + 1);
  const lo = Math.min(0, ...points.map((p) => p.y));
  const hi = Math.max(...points.map((p) => p.y), lo + 1);
  const step = niceStep(hi - lo);
  const yMin = Math.floor(lo / step) * step;
  const yMax = Math.ceil(hi / step) * step;
  const sx = (x: number) => PAD.left + ((x - x0) / (x1 - x0)) * (W - PAD.left - PAD.right);
  const sy = (y: number) => PAD.top + (1 - (y - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);
  const ticks = Array.from({ length: Math.round((yMax - yMin) / step) + 1 }, (_, i) => yMin + i * step);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const area = `${line} L${sx(now.x).toFixed(1)},${sy(Math.max(0, yMin)).toFixed(1)} L${sx(x0).toFixed(1)},${sy(Math.max(0, yMin)).toFixed(1)} Z`;

  // The hard years, merged into runs: a year's row is its close, so the
  // shading covers the year that led up to it.
  const bands: { from: number; to: number }[] = [];
  for (const h of s.history) {
    if ((h.worstRung ?? 0) < RUNG_DEFICIT) continue;
    const last = bands[bands.length - 1];
    if (last && last.to === h.year - 1) last.to = h.year;
    else bands.push({ from: h.year - 1, to: h.year });
  }

  // Year labels: the first, the last closed, and a round step between.
  const yearStep = Math.max(1, Math.round((x1 - x0) / 5));
  const years = s.history.map((h) => h.year).filter((y, i, all) => i === 0 || i === all.length - 1 || (y - x0) % yearStep === 0);
  const last = s.history[s.history.length - 1];

  return (
    <figure className="treasury-cash-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Cash at each summer from Year ${x0} to Year ${last.year}, ${moneyShort(last.cash)} at the last; ${moneyShort(now.y)} now.${bands.length > 0 ? ` ${bands.length} shaded stretch${bands.length === 1 ? '' : 'es'} of deficit years.` : ''}`}
      >
        {bands.map((b) => (
          <rect key={b.from} className="cash-band" x={sx(Math.max(x0, b.from))} y={PAD.top} width={sx(b.to) - sx(Math.max(x0, b.from))} height={H - PAD.top - PAD.bottom} />
        ))}
        {ticks.map((t) => (
          <g key={t}>
            <line className={t === 0 ? 'cash-zero' : 'cash-grid'} x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} />
            <text className="cash-tick" x={PAD.left - 6} y={sy(t) + 3} textAnchor="end">{moneyShort(t)}</text>
          </g>
        ))}
        {years.map((y) => (
          <text key={y} className="cash-tick" x={sx(y)} y={H - 6} textAnchor="middle">Y{y}</text>
        ))}
        <path className="cash-area" d={area} />
        <path className="cash-line" d={line} />
        <circle className="cash-now" cx={sx(now.x)} cy={sy(now.y)} r={5} />
      </svg>
      {bands.length > 0 && (
        <figcaption className="empty-note">
          <span className="cash-band-key" aria-hidden="true" /> A year the board&apos;s ladder reached Deficit or worse.
        </figcaption>
      )}
    </figure>
  );
}
