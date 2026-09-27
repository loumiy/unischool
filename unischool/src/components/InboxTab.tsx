import { useEffect, useState } from 'react';
import type { GameState, LogEntry } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import type { Action } from '../state/actions';
import { answered, boardAsks, inboxItems, type InboxItem, type InboxTier } from '../systems/inbox/inbox';
import { foundingNotes } from '../systems/inbox/foundingNote';
import { dueLabel, toDecideCount } from '../systems/inbox/unseen';
import { catalogueOf } from '../systems/events/catalogueEngine';
import { eventById, eventText, fill } from '../systems/events/catalogue';
import { milestoneById, tabOfSection } from '../data/ladderData';
import { BOARD_LETTERS } from '../data/boardData';
import { DEMAND_DEADLINE_WEEKS, demandCopy } from '../data/demandData';
import { demandProgress, demandStakes } from '../systems/demands/demandSystem';
import { SWEEP_DEFAULT_WEEKS } from '../systems/finance/sweep';
import { CatalogueChoices, CatalogueText } from './EventChoices';
import { InterruptContent } from './InterruptModal';
import { TAB_LABELS, tabAvailable, type TabId } from './TabNav';
import { count, gameDate, gameDateOfWeek, satisfactionFigure, weeksProse, weeksShort } from '../format';

// THE INBOX (Plan 77, systems/inbox/inbox.ts): a full-screen tab laid out
// like a mail client. The list on the left holds every item collapsed to a
// sender, a subject and a line of preview, grouped by tier; the reading pane
// on the right shows the selected one whole, with its answers. Opening a
// letter reads it, so nothing here says "Noted" except the board, whose
// letters leave the queue when put away. Below 760px one pane shows at a
// time, and the reading pane has a way back to the list.
//
// What stops the clock is answered here too: the pending interrupt is
// pinned first under "The clock waits" and read in the pane in its modal
// card. App.tsx opens the inbox on it and keeps it open until it is
// resolved.

type Filter = 'all' | InboxTier | 'answered';

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'decide', label: 'To decide' },
  { id: 'letter', label: 'Letters' },
  { id: 'bulletin', label: 'Bulletins' },
  { id: 'answered', label: 'Answered' },
];

const TIER_HEADING: Record<InboxTier, string> = {
  hold: 'The clock waits',
  decide: 'To decide',
  letter: 'Letters',
  bulletin: 'Bulletins',
};

// Year and week of an absolute week, as the log stamps them.
function stamp(abs: number): string {
  const year = Math.floor((abs - 1) / WEEKS_PER_YEAR) + 1;
  const week = ((abs - 1) % WEEKS_PER_YEAR) + 1;
  return `Y${year}W${week}`;
}
const weeks = weeksProse;

// An answered event's log line, "<title> — <who>: <choice>." (catalogueEngine.ts),
// split back into its parts for the list.
function splitAnswer(l: LogEntry): { subject: string; how: string; lapsed: boolean } {
  const cut = l.message.lastIndexOf(' — ');
  if (cut < 0) return { subject: l.message, how: '', lapsed: false };
  const how = l.message.slice(cut + 3);
  return { subject: l.message.slice(0, cut), how, lapsed: how.startsWith('Nobody answered') };
}

export default function InboxTab({ s, act, target, onTargetConsumed, read, onRead, onSeen, onOpenTab, onShowOnMap }: {
  s: GameState;
  act: (a: Action) => void;
  // An item to open on arrival (an arrival toast's Open), consumed once.
  target?: string;
  onTargetConsumed: () => void;
  // The founding notes' read state, the one the save does not keep (App.tsx).
  read: ReadonlySet<string>;
  onRead: (id: string) => void;
  // Whatever the reading pane shows has been opened (Plan 78E's final-week
  // pause asks, App.tsx).
  onSeen: (id: string) => void;
  onOpenTab: (tab: TabId | 'build') => void;
  onShowOnMap: (buildableId: string) => void;
}) {
  const items = inboxItems(s, { read });
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(target ?? null);
  // Narrow screens: which of the two panes is showing.
  const [reading, setReading] = useState(target !== undefined);

  useEffect(() => {
    if (target === undefined) return;
    setSelectedId(target);
    setFilter('all');
    setReading(true);
    onTargetConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const q = query.trim().toLowerCase();
  const matches = (text: string) => q === '' || text.toLowerCase().includes(q);
  const shown = filter === 'answered' ? [] : items.filter((i) =>
    (filter === 'all' || i.tier === filter || (filter === 'decide' && i.tier === 'hold')) && matches(`${i.from} ${i.subject} ${i.preview}`));
  const answers = filter === 'answered' ? answered(s).filter((l) => matches(l.message)) : [];

  // What the reading pane shows: the picked item while it is still in the
  // inbox (an answered event leaves it), else the first thing to decide,
  // else the newest unread letter, else the newest letter.
  const readable = shown.filter((i) => i.tier !== 'bulletin');
  const selected = readable.find((i) => i.id === selectedId)
    ?? readable.find((i) => i.tier === 'hold')
    ?? readable.find((i) => i.tier === 'decide')
    ?? readable.find((i) => i.unread)
    ?? readable[0]
    ?? null;
  const answerIndex = filter === 'answered' ? Math.max(0, Number(selectedId?.replace('answer:', '') ?? 0)) : -1;
  const answer = answers[Math.min(answerIndex, answers.length - 1)];

  // Opening a letter reads it (Plan 77): the milestone and the demand in the
  // save, a founding note for the session. The board's letters are put away
  // by their own buttons, since that also takes them out of the queue.
  const selectedKey = selected?.id ?? null;
  useEffect(() => {
    if (selected) onSeen(selected.id);
    if (!selected || !selected.unread) return;
    if (selected.kind === 'milestone' && selected.ref) act({ type: 'READ_MILESTONE', id: selected.ref });
    else if (selected.kind === 'demand') act({ type: 'READ_DEMAND' });
    else if (selected.kind === 'founding') onRead(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  function pick(id: string) {
    setSelectedId(id);
    setReading(true);
  }

  // One heading per tier, in the order inboxItems returns them.
  const groups: { tier: InboxTier; rows: InboxItem[] }[] = [];
  for (const i of shown) {
    const last = groups[groups.length - 1];
    if (last && last.tier === i.tier) last.rows.push(i);
    else groups.push({ tier: i.tier, rows: [i] });
  }
  // The stop has its own tier and is not counted under "To decide" (Plan
  // 78E); the toolbar's button still counts it, as what wants an answer.
  const counts = {
    decide: toDecideCount(items),
    letter: items.filter((i) => i.tier === 'letter' && i.unread).length,
  };

  return (
    <div className="inbox" data-pane={reading ? 'read' : 'list'}>
      <div className="inbox-list">
        <div className="inbox-tools">
          <input id="inbox-search" className="inbox-search" type="search" aria-label="Search the inbox" placeholder="Search letters and matters" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="inbox-filters segmented" role="group" aria-label="Show">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className={filter === f.id ? 'active' : ''} aria-pressed={filter === f.id} onClick={() => { setFilter(f.id); setSelectedId(f.id === 'answered' ? 'answer:0' : null); }}>
                {f.label}
                {f.id === 'decide' && counts.decide > 0 && <span className="inbox-filter-count">{counts.decide}</span>}
                {f.id === 'letter' && counts.letter > 0 && <span className="inbox-filter-count">{counts.letter}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="inbox-rows">
          {filter === 'answered' ? (
            answers.length === 0 ? <p className="inbox-empty">{q ? 'Nothing answered matches.' : 'Nothing answered yet. Every matter settled, by the President, a seat or the clock, is kept here.'}</p> : (
              <>
                <div className="inbox-group"><span>Answered</span><span>newest first</span></div>
                {answers.map((l, i) => {
                  const a = splitAnswer(l);
                  return (
                    <button key={`${l.year}-${l.week}-${i}`} type="button" className={`inbox-row answered${answer === l ? ' selected' : ''}`} onClick={() => pick(`answer:${i}`)}>
                      <span className="inbox-dot" />
                      <span className="inbox-from">Answered</span>
                      <span className="inbox-when">Y{l.year}W{l.week}</span>
                      <span className="inbox-subject">{a.subject}</span>
                      <span className={`inbox-preview${a.lapsed ? ' lapsed' : ''}`}>{a.how}</span>
                    </button>
                  );
                })}
              </>
            )
          ) : groups.length === 0 ? (
            <p className="inbox-empty">{q ? 'Nothing matches.' : 'Nothing waiting. Matters, letters and the week\'s news arrive here.'}</p>
          ) : groups.map((g) => (
            <div key={g.tier} role="group" aria-label={TIER_HEADING[g.tier]}>
              <div className="inbox-group">
                <span>{TIER_HEADING[g.tier]}</span>
                <span>
                  {g.tier === 'hold' ? 'answer to go on'
                    : g.tier === 'decide' ? 'the clock runs on'
                    : g.tier === 'letter' ? `${g.rows.filter((r) => r.unread).length} unread`
                      : 'kept for a term'}
                </span>
              </div>
              {g.rows.map((i) => i.tier === 'bulletin' ? (
                <div key={i.id} className={`inbox-row bulletin ${i.tone ?? ''}`}>
                  <span className="inbox-dot" />
                  <span className="inbox-subject">
                    {i.subject}
                    {i.ref && s.placements[i.ref] && (
                      <> <button type="button" className="inbox-link" onClick={() => onShowOnMap(i.ref!)}>Show on map</button></>
                    )}
                  </span>
                  <span className="inbox-when">{stamp(i.week)}</span>
                </div>
              ) : (
                <button
                  key={i.id}
                  type="button"
                  className={`inbox-row ${i.tier}${i.urgent ? ' urgent' : ''}${i.unread ? ' unread' : ''}${selected?.id === i.id ? ' selected' : ''}`}
                  aria-current={selected?.id === i.id ? 'true' : undefined}
                  onClick={() => pick(i.id)}
                >
                  <span className="inbox-dot" />
                  <span className="inbox-from">{i.from}</span>
                  {i.tier === 'hold'
                    ? <span className="inbox-due">Clock stopped</span>
                    : i.weeksLeft !== undefined
                    ? <span className="inbox-due">{dueLabel(i.weeksLeft, weeksShort)}</span>
                      : <span className="inbox-when">{i.kind === 'milestone' ? `Y${Math.floor((i.week - 1) / WEEKS_PER_YEAR) + 1}` : stamp(i.week)}</span>}
                  <span className="inbox-subject">{i.subject}</span>
                  {i.kind === 'demand' && s.events.activeDemand
                    ? <span className="inbox-meter"><i style={{ width: `${Math.round(demandProgress(s, s.events.activeDemand).fraction * 100)}%` }} /></span>
                    : <span className="inbox-preview">{i.preview}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="inbox-read" aria-live="polite">
        <button type="button" className="inbox-back btn-quiet" onClick={() => setReading(false)}>← All mail</button>
        {filter === 'answered'
          ? (answer ? <AnswerView l={answer} /> : null)
          : selected ? (
            <ReadingPane key={selected.id} s={s} act={act} item={selected} onOpenTab={onOpenTab} />
          ) : (
            <div className="inbox-quiet">
              <h3 className="heading-panel">Nothing to read</h3>
              <p>Events that want an answer, the board's letters, milestones and the week's news all arrive here. The button in the toolbar counts what needs deciding.</p>
            </div>
          )}
      </div>
    </div>
  );
}

// ---- The reading pane, one layout per kind ----

function ReadHead({ tier, from, subject, meta }: { tier: InboxTier; from: string; subject: string; meta: string }) {
  return (
    <header className="inbox-read-head">
      <div className="inbox-tags">
        <span className={`inbox-tag ${tier}`}>{tier === 'letter' ? 'Letter' : 'To decide'}</span>
        <span className="letter-eyebrow">{from}</span>
      </div>
      <h3 className="heading-dialog">{subject}</h3>
      <p className="inbox-meta">{meta}</p>
    </header>
  );
}

function ReadingPane({ s, act, item, onOpenTab }: {
  s: GameState;
  act: (a: Action) => void;
  item: InboxItem;
  onOpenTab: (tab: TabId | 'build') => void;
}) {
  if (item.kind === 'interrupt') {
    return (
      <div className="inbox-hold">
        <p className="inbox-hold-note"><span className="inbox-tag hold">The clock waits</span> Nothing moves until this is answered.</p>
        <InterruptContent s={s} act={act} onOpenBuild={() => onOpenTab('build')} />
      </div>
    );
  }

  if (item.kind === 'event') {
    const p = catalogueOf(s).pending.find((x) => x.instanceId === item.ref);
    const e = p ? eventById(p.eventId) : undefined;
    if (!p || !e) return null;
    const text = fill(eventText(e, p), p.vars);
    const left = item.weeksLeft ?? 0;
    const def = e.choices.find((c) => c.id === e.default);
    return (
      <article className="inbox-letter">
        <ReadHead tier="decide" from={item.from} subject={item.subject} meta={`From ${item.from.replace(/^The /, 'the ')} to the President · arrived ${gameDateOfWeek(p.firedWeek)}`} />
        <div className="inbox-read-grid">
          <div className="inbox-read-main">
            <div className="inbox-body"><CatalogueText text={text} className="inbox-para" /></div>
            <p className="inbox-section-label eyebrow">Answers</p>
            <CatalogueChoices s={s} p={p} e={e} onChoose={(choiceId) => act({ type: 'RESOLVE_CATALOGUE_EVENT', instanceId: p.instanceId, choiceId })} />
          </div>
          <aside className="inbox-side">
            <span className="inbox-side-key eyebrow">Time to answer</span>
            <span className={`inbox-side-big${item.urgent ? ' urgent' : ''}`}>{dueLabel(left, weeks)}</span>
            <span className="inbox-meter"><i style={{ width: `${Math.round((1 - left / e.timeoutWeeks) * 100)}%` }} /></span>
            {def && (<><span className="inbox-side-key eyebrow">If nobody answers</span><span className="inbox-side-value">{fill(def.label, p.vars)}</span></>)}
          </aside>
        </div>
      </article>
    );
  }

  if (item.kind === 'demand') {
    const demand = s.events.activeDemand;
    if (!demand) return null;
    const copy = demandCopy(demand);
    const progress = demandProgress(s, demand);
    const stakes = demandStakes(s);
    const left = item.weeksLeft ?? 0;
    return (
      <article className="inbox-letter">
        <ReadHead tier="decide" from={item.from} subject={copy.headline} meta={`From the students to the President · ${weeks(left)} left of ${weeks(DEMAND_DEADLINE_WEEKS)}`} />
        <div className="inbox-read-grid">
          <div className="inbox-read-main">
            <div className="inbox-body"><p className="inbox-para">{copy.grievance(demand.askName)}</p></div>
            <p className="inbox-section-label section-head">What would meet it</p>
            <div className="inbox-goal">
              <strong>{copy.ask(demand.askName)}</strong>
              <span className="inbox-meter wide"><i style={{ width: `${Math.round(progress.fraction * 100)}%` }} /></span>
              <span>{count(progress.current)} of {count(progress.target)} {copy.unit}.</span>
              <span className="inbox-goal-stakes">Met, satisfaction heads for {satisfactionFigure(stakes.satisfactionIfMet)}; missed, next summer's applicant pool is {count(stakes.applicantsIfFailed)} rather than {count(stakes.applicantsIfMet)}.</span>
            </div>
            <div className="modal-actions inbox-actions">
              <button type="button" onClick={() => onOpenTab('build')}>Open Build</button>
              {tabAvailable(s, 'students') && <button type="button" className="btn-quiet" onClick={() => onOpenTab('students')}>See it in Students</button>}
            </div>
          </div>
          <aside className="inbox-side">
            <span className="inbox-side-key eyebrow">Deadline</span>
            <span className={`inbox-side-big${item.urgent ? ' urgent' : ''}`}>{dueLabel(left, weeks)}</span>
            <span className="inbox-side-key eyebrow">Met by</span>
            <span className="inbox-side-value">Building it: the demand closes the week it is met</span>
          </aside>
        </div>
      </article>
    );
  }

  if (item.kind === 'board') {
    const id = item.ref!;
    const letter = BOARD_LETTERS[id];
    if (!letter) return null;
    return (
      <article className="inbox-letter">
        <ReadHead tier={item.tier} from={item.from} subject={letter.title} meta={`From the board to the President · ${gameDate(s.clock.year, s.clock.week)}`} />
        <div className="inbox-read-main">
          <div className="inbox-body"><p className="inbox-para">{letter.text}</p></div>
          <div className="modal-actions inbox-actions">
            {boardAsks(id) ? (
              <>
                {/* The letter's ask (Plan 70D): setting the sweep puts it away. */}
                <button type="button" onClick={() => act({ type: 'SET_SWEEP', weeks: SWEEP_DEFAULT_WEEKS })}>Sweep above {weeksShort(SWEEP_DEFAULT_WEEKS)}</button>
                <button type="button" className="btn-quiet" onClick={() => act({ type: 'READ_BOARD_LETTER' })}>Not now</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => act({ type: 'READ_BOARD_LETTER' })}>Noted</button>
                <button type="button" className="btn-quiet" onClick={() => onOpenTab('treasury')}>Open Treasury</button>
              </>
            )}
          </div>
        </div>
      </article>
    );
  }

  if (item.kind === 'milestone') {
    const m = milestoneById(item.ref!);
    if (!m) return null;
    // The door: a tab the milestone opens, else the tab of a section it opens
    // (the first commencement opens History's record, Plan 78C).
    const tab = [...m.tabs, ...(m.sections ?? []).map(tabOfSection)].find((t) => tabAvailable(s, t));
    return (
      <article className="inbox-letter">
        <ReadHead tier="letter" from={item.from} subject={m.name} meta={`Reached in Year ${s.ladder.reached[m.id]} · ${m.condition}`} />
        <div className="inbox-read-main">
          <div className="inbox-body"><p className="inbox-para">{m.letter}</p></div>
          {m.opens.length > 0 && (
            <>
              <p className="inbox-section-label section-head">What this opens</p>
              <ul className="milestone-opens">{m.opens.map((line) => <li key={line}>{line}</li>)}</ul>
            </>
          )}
          {(m.buildables.length > 0 || tab) && (
            <div className="modal-actions inbox-actions">
              {m.buildables.length > 0 && <button type="button" onClick={() => onOpenTab('build')}>Open Build</button>}
              {tab && <button type="button" className={m.buildables.length > 0 ? 'btn-quiet' : undefined} onClick={() => onOpenTab(tab)}>Open {TAB_LABELS[tab]}</button>}
            </div>
          )}
        </div>
      </article>
    );
  }

  if (item.kind === 'founding') {
    const n = foundingNotes(s).find((x) => x.id === item.ref);
    if (!n) return null;
    return (
      <article className="inbox-letter">
        <ReadHead tier="letter" from={item.from} subject={n.title} meta={gameDate(n.year, n.week)} />
        <div className="inbox-read-main"><div className="inbox-body"><p className="inbox-para">{n.text}</p></div></div>
      </article>
    );
  }
  return null;
}

function AnswerView({ l }: { l: LogEntry }) {
  const a = splitAnswer(l);
  return (
    <article className="inbox-letter">
      <header className="inbox-read-head">
        <div className="inbox-tags"><span className="inbox-tag answered">Answered</span></div>
        <h3 className="heading-dialog">{a.subject}</h3>
        <p className="inbox-meta">{gameDate(l.year, l.week)}</p>
      </header>
      <p className={`inbox-para${a.lapsed ? ' lapsed' : ''}`}>{a.how}</p>
      {a.lapsed && <p className="inbox-para inbox-note">Nobody answered in time, so it took its default.</p>}
    </article>
  );
}
