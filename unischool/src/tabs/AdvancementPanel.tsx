import type { GameState, RunningCampaign } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { absoluteWeek } from '../data/eventData';
import type { Action } from '../state/actions';
import HelpHint from '../components/HelpHint';
import { money, moneyShort } from '../format';
import { campaignById } from '../data/campaignData';
import { advancementOf, hasAdvancementOffice, openCampaigns, yearlyResponse } from '../systems/alumni/campaigns';

// Advancement (Plan 30): the campaign running, the ones the college could
// launch, and the building money raised and waiting. Campaigns replace the
// endowment campaign; they are the alumni ledger's payoff.

// What is left of a running campaign's term: to the week where it was kept
// (campaigns.ts's dueWeek), else to its calendar year.
function campaignTimeLeft(s: GameState, running: RunningCampaign): string {
  if (running.dueWeek === undefined) {
    const years = running.dueYear - s.clock.year;
    return years > 1 ? `${years} years to go` : years === 1 ? 'a year to go' : 'closing this year';
  }
  const weeks = Math.max(0, running.dueWeek - absoluteWeek(s));
  if (weeks > WEEKS_PER_YEAR) return `${Math.round(weeks / WEEKS_PER_YEAR)} years to go`;
  return weeks === 1 ? 'one week to go' : `${weeks} weeks to go`;
}

export default function AdvancementPanel({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const adv = advancementOf(s);
  const running = adv.running;
  const def = running ? campaignById(running.campaignId) : undefined;
  const open = openCampaigns(s);
  return (
    <section className="panel advancement-panel">
      <div className="panel-head">
        <h2>Advancement</h2>
        <HelpHint align="end" text="A campaign asks your alumni to give toward one thing over several years. Each class gives according to the warmth its four years earned. A class gives most when the campaign's cause is something it remembers. Campaign money is restricted. Endowment money goes into the endowment, and building money pays only for buildings. You need a VP of Advancement to run a campaign, and you can run one at a time. Each campaign cools alumni warmth a little. A title year raises what everyone gives." />
      </div>
      {running && def ? (
        <>
          <p><strong>{def.title}</strong>: {money(running.raised)} of {money(running.target)}, {campaignTimeLeft(s, running)}.</p>
          <p className="empty-note">{def.text}</p>
        </>
      ) : !hasAdvancementOffice(s) ? (
        <p className="empty-note">To run a campaign, fill the VP of Advancement seat. It&apos;s under Administration in the Faculty tab.</p>
      ) : open.length === 0 ? (
        <p className="empty-note">No campaign is ready.</p>
      ) : (
        <ul className="campaign-list">
          {open.map((c) => (
            <li key={c.id}>
              <div><strong>{c.title}</strong> <span className="stat">{c.kind === 'endowment' ? 'for the endowment' : 'for buildings'} · {c.years} years · about {moneyShort(yearlyResponse(s, c))}/yr</span></div>
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
