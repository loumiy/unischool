import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { institutionName, type GameState, type Pillar } from '../state/types';
import { CloseIcon, PILLAR_ICONS, StatusIcon } from './icons';
import HelpHint from './HelpHint';
import SpecializationPreview, { drawPreviewsAhead } from './specializationPreview';
import { isKey, useHotkeys } from './hotkeys';
import { decimal, gameDate } from '../format';
import { playerRank } from '../systems/rivals/rivalsSystem';
import { PILLAR_LABELS, PRESTIGE_MAX, SPECIALIZATION_MILESTONE_RANK, SPECIALIZATION_PILLAR_RANK, satisfactionLeads } from '../systems/prestige/prestigeSystem';
import { shareFullProjection, specializationOptions, strongestStanding, type ShareFullProjection, type SpecializationOption } from '../systems/prestige/milestone';
import { pillarShareRule, satisfactionRouteWords, specializationShareWorth } from '../data/prestigeWords';
import { CHOICE_WORDS, SPECIALIZATION_BUILDINGS, SPECIALIZATION_CARDS, choiceParkNote, opensLine } from '../data/specializationData';

// ---------------------------------------------------------------------
// The choice (Plan 85D, systems/prestige/milestone.ts), since Plan 110 in
// two parts, so that it reads as the moment it is rather than one more
// letter:
//
// - The letter (SpecializationLetter), the stop's card in the inbox: the
//   board's one sentence on where the college stands, the four pillars'
//   ranks in their colours, "Convene the board" and "Not this year".
// - The page (SpecializationPage), over everything as the Final Report's
//   and the summer's admissions are (InterruptModal.tsx), opened from the
//   letter and closed back to it by Close or Escape. The question and the
//   rule over four panels, each in its pillar's colour: what it builds,
//   drawn by the map's own art (specializationPreview.tsx); where the
//   college stands in the pillar, as a bar to 150 with the share only its
//   specialization fills hatched at the end and the top rival specialist
//   marked, and how many rivals have chosen it; what it adds and how its
//   share fills (the rest of the card's detail behind a "?"); and prestige
//   and rank were that share full today. "Not this year" is beside Close.
//
// Choosing asks twice (Plan 47): the first click lifts the panel, dims the
// others and puts a bar under them that says what is lost, with Confirm and
// Back; Escape backs out. "Not this year" leaves the offer standing. The
// words are in data/specializationData.ts.
// ---------------------------------------------------------------------

// What the letter and the page read, once for a state: the four options,
// the strongest pillar, the guide's rank, and each share full today. The
// clock is held while either is up, so the page opens on what the letter
// already read rather than reading it again as its panels drop in.
interface ChoiceStandings {
  options: SpecializationOption[];
  strongest: { pillar: Pillar; rank: number };
  rank: number;
  // Whether satisfaction leads the field (Plan 116C's route).
  satisfied: boolean;
  full: Record<Pillar, ShareFullProjection>;
}
const READ = new WeakMap<GameState, ChoiceStandings>();
function standingsOf(s: GameState): ChoiceStandings {
  const kept = READ.get(s);
  if (kept) return kept;
  const options = specializationOptions(s);
  const read: ChoiceStandings = {
    options,
    strongest: strongestStanding(s),
    rank: playerRank(s),
    satisfied: satisfactionLeads(s),
    full: Object.fromEntries(options.map((o) => [o.pillar, shareFullProjection(s, o.pillar)])) as Record<Pillar, ShareFullProjection>,
  };
  READ.set(s, read);
  return read;
}

export function SpecializationLetter({ s, onOpen, onLater }: { s: GameState; onOpen?: () => void; onLater: () => void }) {
  const W = CHOICE_WORDS;
  const read = standingsOf(s);
  // The page's drawings, made while the letter is read.
  const opens = onOpen !== undefined;
  useEffect(() => (opens ? drawPreviewsAhead(s) : undefined), [s, opens]);
  return (
    <>
      <p className="letter-eyebrow">{W.from} · {gameDate(s.clock.year, s.clock.week)}</p>
      <h2>{W.title}</h2>
      <p className="letter-body">{W.offer(read.rank, SPECIALIZATION_MILESTONE_RANK, read.strongest, SPECIALIZATION_PILLAR_RANK, read.satisfied ? satisfactionRouteWords('its') : null)}</p>
      <ul className="spec-letter-ranks" aria-label={W.ranksLabel}>
        {read.options.map((o) => (
          <li key={o.pillar} className={`pillar-${o.pillar}`}>
            <span className="spec-letter-pillar">{PILLAR_LABELS[o.pillar]}</span>
            <span className="spec-letter-rank">#{o.rank}</span>
          </li>
        ))}
      </ul>
      <div className="modal-actions">
        {onOpen && <button type="button" onClick={onOpen}>{W.convene} →</button>}
        <button type="button" className="btn-quiet" onClick={onLater}>{W.later}</button>
      </div>
    </>
  );
}

export function SpecializationPage({ s, onResolve, onClose }: { s: GameState; onResolve: (pillar: Pillar | null) => void; onClose: () => void }) {
  const W = CHOICE_WORDS;
  const [armed, setArmed] = useState<Pillar | null>(null);
  const page = useRef<HTMLDivElement>(null);
  const name = institutionName(s.self);
  const read = standingsOf(s);
  const field = s.rivals.length + 1;

  // Focus comes to the page, so the keyboard and a screen reader start on it.
  useEffect(() => { page.current?.focus(); }, []);
  // Escape backs out a step: an armed choice, then the page itself, to the
  // letter. App.tsx's ladder stands aside while a stop is pending.
  useHotkeys((e) => {
    if (!isKey(e, 'back')) return;
    e.preventDefault();
    if (armed) setArmed(null);
    else onClose();
  });

  return (
    <div ref={page} tabIndex={-1} className={`spec-page${armed ? ' is-armed' : ''}`} role="dialog" aria-modal="true" aria-labelledby="spec-page-title">
      <div className="spec-page-inner">
        <header className="spec-page-head">
          <div className="spec-page-pennant" aria-hidden="true"><span>{name}</span></div>
          <div className="spec-page-heading">
            <p className="dateline">{W.from} · {gameDate(s.clock.year, s.clock.week)}</p>
            <h2 id="spec-page-title">{W.question(name)}</h2>
            <p className="spec-page-rule">{pillarShareRule()} {W.forGood}</p>
          </div>
          <div className="spec-page-side">
            <div className="spec-page-actions">
              <button type="button" className="btn" onClick={() => onResolve(null)} disabled={armed !== null}>{W.later}</button>
              <button type="button" className="tab-overlay-close" onClick={onClose}>{W.close} <CloseIcon /></button>
            </div>
            <p className="spec-page-later">{W.laterNote}</p>
            <dl className="spec-page-chips">
              <div><dt>{W.prestige}</dt><dd>{decimal(s.self.reputation, 1)}</dd></div>
              <div><dt>{W.rank}</dt><dd>#{read.rank} <small>{W.of(field)}</small></dd></div>
            </dl>
          </div>
        </header>

        <div className="spec-panels">
          {read.options.map((o, i) => (
            <PillarPanel
              key={o.pillar} s={s} o={o} full={read.full[o.pillar]} index={i} field={field}
              strongest={o.pillar === read.strongest.pillar} armed={armed}
              onChoose={() => setArmed(o.pillar)}
            />
          ))}
        </div>

        {armed && <ArmedBar pillar={armed} onConfirm={() => onResolve(armed)} onBack={() => setArmed(null)} />}
      </div>
    </div>
  );
}

// A value as a share of the pillar's 150, for the bar.
function along(value: number): string {
  return `${(Math.max(0, Math.min(PRESTIGE_MAX, value)) / PRESTIGE_MAX) * 100}%`;
}

function PillarPanel({ s, o, full, index, field, strongest, armed, onChoose }: {
  s: GameState; o: SpecializationOption; full: ShareFullProjection; index: number; field: number;
  strongest: boolean; armed: Pillar | null; onChoose: () => void;
}) {
  const W = CHOICE_WORDS;
  const card = SPECIALIZATION_CARDS[o.pillar];
  const Icon = PILLAR_ICONS[o.pillar];
  const id = SPECIALIZATION_BUILDINGS[o.pillar];
  const project = id === null ? undefined : s.tech.find((t) => t.id === id);
  // A park that already stands (Plan 85F): what this choice makes of it.
  const park = choiceParkNote(s, o.pillar);
  // The card's detail, behind the "?": the share in the pillar's own
  // points and its long rule, and every mechanic.
  const detail = [opensLine(o.pillar, o.weight), card.alsoNow, ...card.mechanics.map((m) => m.text)].filter(Boolean).join(' ');
  const isArmed = armed === o.pillar;
  const dimmed = armed !== null && !isArmed;
  const top = o.strongest;
  return (
    <section
      className={`spec-panel pillar-${o.pillar}${isArmed ? ' is-armed' : ''}${dimmed ? ' is-dimmed' : ''}`}
      style={{ '--i': index } as CSSProperties}
      aria-labelledby={`spec-${o.pillar}-name`}
      inert={dimmed}
    >
      <div className="spec-panel-head">
        <div className="spec-panel-label">
          <span className="spec-panel-medallion" aria-hidden="true"><Icon /></span>
          <span className="spec-panel-pillar">{PILLAR_LABELS[o.pillar]}</span>
          {strongest && <span className="spec-panel-strongest">{W.strongestTag}</span>}
        </div>
        <h3 id={`spec-${o.pillar}-name`}>{card.name}</h3>
        <p className="spec-panel-summary">{card.summary}</p>
      </div>

      <div className="spec-panel-stage">
        <span className="spec-panel-drawing"><SpecializationPreview s={s} pillar={o.pillar} /></span>
        <p className="spec-panel-builds">
          <span className="spec-panel-builds-kind">{project ? W.builds(project.cost) : W.grows}</span>
          <span className="spec-panel-builds-name">{project ? project.name : W.downtown}</span>
        </p>
      </div>

      <div className="spec-panel-standing">
        <p className="spec-panel-standing-head">
          <span className="eyebrow">{W.standing}</span>
          <span>{W.rivalsHere(o.rivals)}</span>
        </p>
        <p className="spec-panel-rank">
          <span className="spec-panel-rank-figure">#{o.rank} <small>{W.of(field)}</small></span>
          <span className="spec-panel-value"><b>{o.value.toFixed(0)}</b> {W.outOf(PRESTIGE_MAX)}</span>
        </p>
        <div className="spec-meter" role="img" aria-label={W.meter(o.pillar, o.value, PRESTIGE_MAX, top?.value ?? null)}>
          <span className="spec-meter-track">
            <span className="spec-meter-share" style={{ left: along(PRESTIGE_MAX - o.weight) }} />
            <span className="spec-meter-fill" style={{ width: along(o.value) }} />
          </span>
          {top && <span className="spec-meter-top" style={{ left: along(top.value) }} />}
        </div>
        <p className="spec-panel-worth"><span className="spec-swatch-share" aria-hidden="true" />{W.worth(specializationShareWorth(o.pillar))}</p>
        <p className="spec-panel-note">
          {top && <span className="spec-swatch-top" aria-hidden="true" />}
          <span>{top ? <>{W.topSpecialist}: <b>{top.name}</b>, {top.value.toFixed(0)}</> : W.noSpecialist}</span>
        </p>
      </div>

      <dl className="spec-panel-gains">
        <dt>{W.adds}</dt>
        <dd>{card.adds}</dd>
        <dt>{W.fills}</dt>
        <dd>{card.fillsShort} <HelpHint text={detail} align="end" /></dd>
        {park && <dd className="spec-panel-park">{park}</dd>}
      </dl>

      <div className="spec-panel-foot">
        <p className="spec-panel-compare">{W.compare(full.before, full.after, full.rankBefore, full.rankAfter)}</p>
        {isArmed
          ? <p className="spec-panel-selected"><StatusIcon status="done" />{W.selected}</p>
          : <button type="button" className="btn spec-panel-choose" onClick={onChoose} disabled={armed !== null}>{W.choose(o.pillar)}</button>}
      </div>
    </section>
  );
}

// The second ask: what is lost, what comes with it, Confirm and Back.
function ArmedBar({ pillar, onConfirm, onBack }: { pillar: Pillar; onConfirm: () => void; onBack: () => void }) {
  const W = CHOICE_WORDS;
  const Icon = PILLAR_ICONS[pillar];
  const first = SPECIALIZATION_CARDS[pillar].mechanics[0]?.text;
  const back = useRef<HTMLButtonElement>(null);
  // Onto the bar, at its safe button: Enter on it never confirms.
  useEffect(() => { back.current?.focus(); }, [pillar]);
  return (
    <div className={`spec-armed pillar-${pillar}`} role="alertdialog" aria-labelledby="spec-armed-title" aria-describedby="spec-armed-body">
      <span className="spec-panel-medallion" aria-hidden="true"><Icon /></span>
      <div className="spec-armed-text">
        <h3 id="spec-armed-title">{W.armed(pillar)}</h3>
        <p id="spec-armed-body">{W.warning(pillar)}{first ? ` ${first}` : ''}</p>
      </div>
      <div className="spec-armed-actions">
        <button ref={back} type="button" className="btn spec-armed-back" onClick={onBack}>{W.back}</button>
        <button type="button" className="btn-primary spec-armed-confirm" onClick={onConfirm}>{W.confirm}</button>
      </div>
    </div>
  );
}
