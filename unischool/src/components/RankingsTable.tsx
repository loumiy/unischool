import type { RankedEntry } from '../systems/rivals/rivalsSystem';

// The guide's table (Plan 80C): the one-time top-fifty reveal and the
// annual report print it (InterruptModal.tsx's RankingsReportView), and the
// History tab's guide shows it live from the Rank chip (tabs/RankingsPanel
// .tsx). A row is a place in the guide; a college below the printed list is
// shown with its neighbors after a gap.

export interface RankingsRow extends RankedEntry {
  place: number;
  // Last year's place, where the report has one; undefined drops the column.
  previousRank?: number | null;
}

// Past the printed list, the college's own row and one either side.
export const NEIGHBORS = 1;

// The rows a live table shows: the first `printed` of the list, then, for a
// college below them, a gap and its neighbors.
export function rankingsRows(list: readonly RankedEntry[], printed: number): (RankingsRow | 'gap')[] {
  const rows: (RankingsRow | 'gap')[] = list.slice(0, printed).map((e, i) => ({ ...e, place: i + 1 }));
  const mine = list.findIndex((e) => e.isPlayer);
  if (mine >= printed) {
    const from = Math.max(printed, mine - NEIGHBORS);
    if (from > printed) rows.push('gap');
    for (let i = from; i <= Math.min(list.length - 1, mine + NEIGHBORS); i += 1) rows.push({ ...list[i], place: i + 1 });
  }
  return rows;
}

export default function RankingsTable({ rows, lastYear }: { rows: readonly (RankingsRow | 'gap')[]; lastYear: boolean }) {
  return (
    <table className="report-table">
      <thead>
        <tr><th>#</th><th>School</th><th>Score</th>{lastYear && <th>Last year</th>}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          if (r === 'gap') {
            return <tr key={`gap-${i}`} className="report-table-gap"><td colSpan={lastYear ? 4 : 3}>…</td></tr>;
          }
          // Keyed by identity, not by name: the player may name their
          // school anything, including something a rival is already called.
          const previous = r.previousRank ?? null;
          const move = previous === null ? null : previous - r.place;
          return (
            <tr key={r.key} className={r.isPlayer ? 'me' : ''}>
              <td className="report-table-rank">{r.place}</td>
              <td className="report-table-name">{r.name}</td>
              <td className="report-table-score">{Math.round(r.value)}</td>
              {lastYear && (
                <td className="report-table-last">
                  {previous === null
                    ? '—'
                    : <>#{previous}{move !== 0 && <span className={`rank-move ${move! > 0 ? 'up' : 'down'}`}> {move! > 0 ? '▲' : '▼'}{Math.abs(move!)}</span>}</>}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
