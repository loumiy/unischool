import type { LegacyAxis } from '../state/types';

// ---------------------------------------------------------------------
// The axes of a legacy as cards (Plan 17's PR C): the grade as the
// same chip a course wears, the axis's name, and the one line about what
// it read. Drawn by the final report and by the History tab's Legacy
// panel, so the sealed record and the live reading look the same.
// ---------------------------------------------------------------------
export function LegacyAxes({ axes }: { axes: readonly LegacyAxis[] }) {
  return (
    <ul className="legacy-axes">
      {axes.map((axis) => (
        <li key={axis.key} className="legacy-axis">
          <span className={`grade-chip lg grade-${axis.grade.toLowerCase()}`}>{axis.grade}</span>
          <span className="legacy-axis-body">
            <span className="legacy-axis-label">{axis.label}</span>
            <span className="legacy-axis-detail">{axis.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
