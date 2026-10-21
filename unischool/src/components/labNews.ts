import type { LogEntry } from '../state/types';
import { disciplineVocab, facilitySchool } from '../data/researchData';
import { moneyShort } from '../format';

// A lab's news over its roof: a paper, a grant or a breakthrough rises from
// the lab's mark the week it lands and fades (CampusMap.tsx draws it). Read
// from the week's new log lines, which carry the lab's id as their subject;
// drawing only, so nothing here touches the run.

export type LabNewsKind = 'paper' | 'grant' | 'breakthrough';

export interface LabNews {
  lab: string;
  kind: LabNewsKind;
  text: string;
  // Its place in the lab's stack this week, from 0, so a paper and the
  // grant riding on it rise one after the other instead of on top.
  order: number;
}

// At most this many rise over one lab in a week; a catch-up (lines from
// more than one week at once) raises none, as it is not news to watch.
export const LAB_NEWS_MOST = 3;

const KIND_OF: Partial<Record<NonNullable<LogEntry['topic']>, LabNewsKind>> = {
  publication: 'paper',
  grant: 'grant',
  breakthrough: 'breakthrough',
};

const capital = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

// The floats for a week's new lines (newest first, as the log keeps them),
// at the labs that stand on the map. Pure, for the test.
export function labNewsIn(fresh: readonly LogEntry[], placed: (id: string) => boolean): LabNews[] {
  if (new Set(fresh.map((l) => `${l.year}:${l.week}`)).size > 1) return [];
  const out: LabNews[] = [];
  const count = new Map<string, number>();
  for (const l of [...fresh].reverse()) {
    const kind = l.topic ? KIND_OF[l.topic] : undefined;
    if (!kind || !l.subject || !placed(l.subject)) continue;
    const vocab = disciplineVocab(facilitySchool(l.subject));
    const text = kind === 'grant' ? (l.amount !== undefined ? `+${moneyShort(l.amount)}` : 'Grant')
      : kind === 'paper' ? `+1 ${vocab.publication}`
      : `${capital(vocab.breakthrough)}!`;
    const order = count.get(l.subject) ?? 0;
    if (order >= LAB_NEWS_MOST) continue;
    count.set(l.subject, order + 1);
    out.push({ lab: l.subject, kind, text, order });
  }
  return out;
}
