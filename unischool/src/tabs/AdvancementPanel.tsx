import type { GameState } from '../state/types';
import type { Action } from '../state/actions';
import HelpHint from '../components/HelpHint';
import { money } from '../format';
import { campaignById } from '../data/campaignData';
import { advancementOf, hasAdvancementOffice, openCampaigns, yearlyResponse } from '../systems/alumni/campaigns';

// Advancement (Plan 30): the campaign running, the ones the college could
// launch, and the building money raised and waiting. Campaigns replace the
// endowment campaign; they are the alumni ledger's payoff.

export default function AdvancementPanel({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const adv = advancementOf(s);
  const running = adv.running;
  const def = running ? campaignById(running.campaignId) : undefined;
  const open = openCampaigns(s);
  return (
    <section className="panel advancement-panel">
      <div className="panel-head">
        <h2>Advancement</h2>
        <HelpHint align="end" text="A campaign asks the alumni for one thing over several years. Each class answers by the warmth its four years earned it, and gives most when the case is about them. What a campaign raises is restricted: endowment money goes into the endowment, building money pays for buildings and nothing else. It needs a VP of Advancement, runs one at a time, and asking cools the ledger a little. A title year lifts what everyone gives." />
      </div>
      {running && def ? (
        <>
          <p><strong>{def.title}</strong>: {money(running.raised)} of {money(running.target)}, {running.dueYear - s.clock.year > 0 ? `${running.dueYear - s.clock.year} years to go` : 'closing this year'}.</p>
          <p className="empty-note">{def.text}</p>
        </>
      ) : !hasAdvancementOffice(s) ? (
        <p className="empty-note">A campaign needs a VP of Advancement to run it (the Faculty tab's Administration).</p>
      ) : open.length === 0 ? (
        <p className="empty-note">No campaign is ready. Each opens once the college has the alumni for it and the need it answers.</p>
      ) : (
        <ul className="campaign-list">
          {open.map((c) => (
            <li key={c.id}>
              <div><strong>{c.title}</strong> <span className="stat">{c.kind === 'endowment' ? 'for the endowment' : 'for buildings'} · {c.years} years · about {money(yearlyResponse(s, c))}/yr</span></div>
              <p className="empty-note">{c.text}</p>
              <button type="button" className="panel-action small" onClick={() => act({ type: 'LAUNCH_CAMPAIGN', id: c.id })}>Launch</button>
            </li>
          ))}
        </ul>
      )}
      <dl>
        {adv.restrictedBuilding > 0 && <><dt>Raised for buildings</dt><dd>{money(adv.restrictedBuilding)}</dd></>}
        <dt>Campaigns closed</dt>
        <dd>{adv.closed.length === 0 ? 'none yet' : adv.closed.map((c) => `${campaignById(c.campaignId)?.title ?? c.campaignId} (${c.met ? 'met' : 'short'})`).join(', ')}</dd>
      </dl>
    </section>
  );
}
