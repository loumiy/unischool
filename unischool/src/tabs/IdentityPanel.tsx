import type { GameState } from '../state/types';
import HelpHint from '../components/HelpHint';
import { tagById, TAG_EARN_AT, TAG_YEARS, type TagDef } from '../data/tagData';
import { perceptionOf, tagIndicators } from '../systems/identity/tags';

// What the guidebooks say (Plan 31, V2 #30): the identity tags the college
// holds, what each does, and the ones it is on the way to earning. Each
// reputation is a round sticker beside its quote, and the years toward one
// are pips (Plan 90 N).

// A reputation whose own effect costs the college (more attrition, a
// higher cost a student, lower satisfaction) is a warning, not praise, and
// gets a cream sticker rather than a gold one.
function isWarning(t: TagDef): boolean {
  const { lever, amount } = t.teeth;
  return lever === 'attrition' || lever === 'studentCost' ? amount > 0 : amount < 0;
}

export default function IdentityPanel({ s }: { s: GameState }) {
  const p = perceptionOf(s);
  const ind = tagIndicators(s);
  const coming = Object.entries(p.earning).filter(([id]) => tagById(id));
  return (
    <section className="panel identity-panel">
      <div className="panel-head">
        <span className="panel-head-title">
          <h2>What the guidebooks say</h2>
          <HelpHint text={`A college is known for at most three things. A reputation is earned by being something ${TAG_YEARS} years running, and shed the same way, so it lags what the college is doing now. Each changes who applies, how good a class it draws and one effect of its own, listed with each.`} />
        </span>
      </div>
      {p.tags.length === 0 ? (
        <p className="empty-note">The guidebooks have nothing to say about the college yet.</p>
      ) : (
        <ul className="identity-list">
          {p.tags.map((id) => {
            const t = tagById(id)!;
            return (
              <li key={id} className="identity-entry">
                <strong className={`identity-sticker${isWarning(t) ? ' warning' : ''}`}><span>{t.name}</span></strong>
                <q className="identity-quote">{t.blurb}</q>
                <p className="identity-why">{t.why} {t.teeth.line}</p>
              </li>
            );
          })}
        </ul>
      )}
      {coming.length > 0 && (
        <ul className="identity-coming">
          {coming.map(([id, n]) => (
            <li key={id}>
              <span>On the way: {tagById(id)!.name}</span>
              <span className="identity-pips" aria-hidden="true">
                {Array.from({ length: TAG_YEARS }, (_, i) => <i key={i} className={i < n ? 'on' : undefined} />)}
              </span>
              <span className="identity-years">{n} of {TAG_YEARS} years{ind[id] < TAG_EARN_AT ? ', slipping' : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
