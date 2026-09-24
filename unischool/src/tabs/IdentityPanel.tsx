import type { GameState } from '../state/types';
import HelpHint from '../components/HelpHint';
import { tagById, TAG_EARN_AT, TAG_YEARS } from '../data/tagData';
import { perceptionOf, tagIndicators } from '../systems/identity/tags';

// What the guidebooks say (Plan 31, V2 #30): the identity tags the college
// holds, what each does, and the ones it is on the way to earning.

export default function IdentityPanel({ s }: { s: GameState }) {
  const p = perceptionOf(s);
  const ind = tagIndicators(s);
  const coming = Object.entries(p.earning).filter(([id]) => tagById(id));
  return (
    <section className="panel identity-panel">
      <div className="panel-head">
        <span className="panel-head-title">
          <h2>What the Guidebooks Say</h2>
          <HelpHint text={`A college is known for at most three things. A reputation is earned by being something ${TAG_YEARS} years running, and shed the same way, so it lags what the college is doing now. Each changes who applies, how good a class it draws, and one other thing.`} />
        </span>
      </div>
      {p.tags.length === 0 ? (
        <p className="empty-note">The guidebooks have nothing to say about the college yet.</p>
      ) : (
        <ul className="identity-list">
          {p.tags.map((id) => {
            const t = tagById(id)!;
            return (
              <li key={id}>
                <strong>{t.name}</strong> <em>“{t.blurb}”</em>
                <div className="stat">{t.why} {t.teeth.line}</div>
              </li>
            );
          })}
        </ul>
      )}
      {coming.length > 0 && (
        <p className="empty-note">
          On the way: {coming.map(([id, n]) => `${tagById(id)!.name} (${n} of ${TAG_YEARS} years${ind[id] < TAG_EARN_AT ? ', slipping' : ''})`).join(', ')}.
        </p>
      )}
    </section>
  );
}
