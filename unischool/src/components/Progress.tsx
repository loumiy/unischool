// Shared completion bar and ring, both driven by a plain 0..1 fraction.
// Presentation only: callers compute the fraction from state they already
// have. Plain SVG, no charting dependency.

// Fixed stroke weight (not a share of size) so rings of any size read alike.
const RING_STROKE = 3.5;
const RING_CENTER_FONT_RATIO = 0.3; // center label size, as a share of the ring's box

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

// `label` is an optional compact endcap carrying the exact figure.
export function ProgressBar({ fraction, label, title }: { fraction: number; label?: string; title: string }) {
  const pct = Math.round(clamp01(fraction) * 100);
  return (
    <span
      className="progress-bar"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={title}
      title={title}
    >
      <span className="progress-bar-track">
        <span className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </span>
      {label && <span className="progress-bar-label">{label}</span>}
    </span>
  );
}

// `center` (usually a percentage) is drawn inside; exact counts go beside it.
export function ProgressRing({
  fraction,
  size,
  center,
  title,
}: { fraction: number; size: number; center?: string; title: string }) {
  const f = clamp01(fraction);
  const radius = (size - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg
      className="progress-ring"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <circle className="progress-ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={RING_STROKE} />
      <circle
        className="progress-ring-fill"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={RING_STROKE}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - f)}
      />
      {center && (
        <text className="progress-ring-center" x={size / 2} y={size / 2} fontSize={size * RING_CENTER_FONT_RATIO}>
          {center}
        </text>
      )}
    </svg>
  );
}
