import type { GameState } from '../state/types';
import type { NextStep } from '../systems/guidance/nextStep';
import { CHAPTER_COPY, DRAWER_WORDS as W, type Door } from '../data/chapterData';
import { CHAPTERS, absoluteWeek, chapterNumber, currentChapter, nextChapter, objectiveRows, ringedProgram, type ObjectiveProgress } from '../state/chapters';
import { MILESTONES, CHARTER_ID, type Progress } from '../data/ladderData';
import { nextMilestone } from '../systems/ladder/ladderSystem';
import { count, gameDateOfWeek, prestigeFigure } from '../format';

// The objectives drawer (Plan 106 §2a): the NEXT bar expanded. The chapter
// open now and its objectives, each with its reading; the chapter's
// briefing, when it has one (what it is, how to work it with a Show me for
// each lever, why it matters); what else waits (the NEXT line); and the
// milestones, folded in from the ticker's old chip (§7.4): those reached
// this chapter as "Unlocked", the next with its count, and the whole ladder
// a click away. state/chapters.ts owns the chapters, data/chapterData.ts
// the words. It sits in a ToolbarPopup above the ticker (LogTicker.tsx).

function figure(n: number, unit: string): string {
  return unit === 'prestige' ? prestigeFigure(n) : count(Math.floor(n));
}
function milestoneCount(p: Progress): string {
  return `${figure(Math.min(p.value, p.target), p.unit)}/${figure(p.target, p.unit)}`;
}
function objectiveCount(p: ObjectiveProgress): string | null {
  return typeof p === 'boolean' ? null : `${count(Math.min(p.n, p.of))}/${count(p.of)}`;
}

// How many milestones the drawer lists as unlocked at most.
const UNLOCKED_SHOWN = 3;

export default function ObjectivesPanel({ s, waiting, onGo, onOpenLadder }: {
  s: GameState;
  // The NEXT line (nextStep.ts): what waits besides the chapter.
  waiting: NextStep | null;
  onGo: (go: Door, hallId?: string, programId?: string) => void;
  onOpenLadder: () => void;
}) {
  const chapter = currentChapter(s);
  const copy = chapter ? CHAPTER_COPY[chapter.id] : null;
  const rows = chapter ? objectiveRows(s, chapter) : [];
  const required = rows.filter((r) => !r.optional);
  const coming = chapter ? null : nextChapter(s);
  const done = CHAPTERS.filter((c) => s.guidance?.done[c.id] !== undefined);

  const since = chapter ? s.guidance!.opened[chapter.id] : absoluteWeek(s) - 52;
  const unlocked = MILESTONES
    .filter((m) => m.id !== CHARTER_ID && (s.ladder.reachedWeek[m.id] ?? -Infinity) >= since)
    .sort((a, b) => s.ladder.reachedWeek[b.id] - s.ladder.reachedWeek[a.id])
    .slice(0, UNLOCKED_SHOWN);
  const milestone = nextMilestone(s);
  const progress = milestone?.progress?.(s);

  return (
    <div className="objectives">
      {chapter && copy ? (
        <section className="objectives-chapter">
          <p className="letter-eyebrow">
            {W.chapter(chapterNumber(chapter))}
            <span className="objectives-tally">{W.of(required.filter((r) => r.met).length, required.length)}</span>
          </p>
          <h3>{copy.title}</h3>
          <ul className="objectives-list">
            {rows.map((r) => {
              const n = objectiveCount(r.progress);
              return (
                <li key={r.id} className={r.met ? 'met' : undefined}>
                  <span className="objectives-mark" role="img" aria-label={r.met ? W.done : W.todo}>{r.met ? '✓' : '○'}</span>
                  <span className="objectives-text">
                    {r.text}
                    {r.optional && <span className="objectives-optional"> ({W.optional})</span>}
                  </span>
                  {n && !r.met && <span className="objectives-count">{n}</span>}
                </li>
              );
            })}
          </ul>
          {copy.briefing && (
            <div className="objectives-briefing">
              <h4>{W.what}</h4>
              <p>{copy.briefing.what}</p>
              {copy.briefing.how.length > 0 && (
                <>
                  <h4>{W.how}</h4>
                  <ul className="objectives-how">
                    {copy.briefing.how.map((h) => (
                      <li key={h.text}>
                        <span>{h.text}</span>
                        {h.door && <button type="button" className="objectives-door" onClick={() => onGo(h.door!, h.hallId, h.ringed ? ringedProgram(s) ?? undefined : undefined)}>{W.showMe}</button>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {copy.briefing.why.length > 0 && (
                <>
                  <h4>{W.why}</h4>
                  <ul className="objectives-why">
                    {copy.briefing.why.map((y) => <li key={y.system}><strong>→ {y.system}:</strong> {y.text}</li>)}
                  </ul>
                </>
              )}
            </div>
          )}
        </section>
      ) : (
        <p className="objectives-between">
          {coming
            ? coming.earliest > absoluteWeek(s)
              ? W.between(CHAPTER_COPY[coming.id].title, `in ${gameDateOfWeek(coming.earliest)}`)
              : W.waitingOn(CHAPTER_COPY[coming.id].title)
            : W.allDone}
        </p>
      )}

      {waiting && (
        <section className="objectives-waiting">
          <h4>{W.waiting}</h4>
          <p className={waiting.urgent ? 'urgent' : undefined}>
            <span>{waiting.text}</span>
            {waiting.go && <button type="button" className="objectives-door" onClick={() => onGo(waiting.go!, waiting.hallId, waiting.programId)}>{W.go}</button>}
          </p>
        </section>
      )}

      <section className="objectives-milestones">
        <h4>{W.milestones}</h4>
        {unlocked.map((m) => (
          <p key={m.id} className="objectives-unlocked"><strong>{W.unlocked}: {m.name}.</strong> {m.opens.join('; ')}</p>
        ))}
        {milestone && (
          <p>
            {W.nextMilestone}: {milestone.name} ({milestone.condition})
            {progress && <span className="objectives-count"> {milestoneCount(progress)}</span>}
          </p>
        )}
        <button type="button" className="objectives-door" onClick={onOpenLadder}>{W.allMilestones}</button>
      </section>

      {done.length > 0 && (
        <p className="objectives-done">{W.done}: {done.map((c) => CHAPTER_COPY[c.id].title).join(' · ')}</p>
      )}
    </div>
  );
}
