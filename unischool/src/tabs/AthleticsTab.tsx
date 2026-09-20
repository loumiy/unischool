import { useState } from 'react';
import type { Action } from '../state/actions';
import type { Coach, GameState, VarsityTeam } from '../state/types';
import { WEEKS_PER_YEAR, institutionName } from '../state/types';
import HelpHint from '../components/HelpHint';
import {
  ATHLETICS_BUDGET_ORDER, ATHLETICS_BUDGET_TIERS, BAND_LABEL, COACH_CANDIDATE_LISTING_WEEKS, TRAINER_FIELD,
  VARSITY_PETITION_MIN_TENURE_YEARS, ceilingResolved, coachProfile, departmentPot, orderedTeams, sportById, teamQuality,
  varsityEligibleYear, venueForCategory,
} from '../data/studentLifeData';
import type { ProgramFunding } from '../data/studentLifeData';
import FacultyPortrait from '../components/FacultyPortrait';
import { athleticRank, rankBy, sportRank, sportRankedList } from '../systems/rivals/rivalsSystem';
import { annualGateFor, attendanceFor } from '../systems/athletics/gate';
import { rivalFor, seasonRecordFor, trophyFor } from '../systems/athletics/season';
import type { SeasonResult } from '../state/types';

// Last season, in a few words. Short on purpose: it sits in a table row
// beside a rank, not in a report.
function seasonLabel(r: SeasonResult): string {
  switch (r.finish) {
    case 'champion': return 'champions';
    case 'final': return 'lost the final';
    case 'semifinal': return 'lost the semi';
    case 'quarterfinal': return 'lost the quarter';
    default: return r.banned ? 'postseason ban' : 'did not qualify';
  }
}

function money(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
}

// What a coach's ceiling reads as (Plan 21's PR K): a scouted range for a
// candidate and for a hire whose tenure has not yet resolved it, the number
// once it has. Beside it, the age — which is the veteran-or-prospect
// question in one figure.
function ceilingLabel(c: Coach): string {
  const p = coachProfile(c);
  if (ceilingResolved(c)) return `ceiling ${c.qualityPotential}`;
  return p.scouted[0] === p.scouted[1] ? `ceiling ${p.scouted[0]}` : `ceiling ${p.scouted[0]}–${p.scouted[1]}`;
}

// ---------------------------------------------------------------------
// VARSITY ATHLETICS, Athletics V2. Grew from the v1 shape (moved here from
// StudentLifeTab.tsx — a sport club still lives on Student Life, alongside
// every other club, until it graduates; only VARSITY status moves it here)
// by replacing the single auto-generated coachName with three separately
// hireable staff roles per team (head coach, assistant coach, trainer),
// each drawn from s.orgs.coachCandidates — a standing market mirroring
// FacultyTab.tsx's own hire flow, just scoped to athletics — and by adding
// the recruiting & scholarship budget lever's quality bonus (teamQuality)
// and a real standings readout (athleticRank) against rivals' own
// athleticStrength.
//
// No "petition" affordance here: like the chapter housing petition, going
// varsity is only ever offered through the decision-event interrupt (see
// eventData.ts's 'varsity-petition'), never dispatched directly from this
// tab.
// ---------------------------------------------------------------------

type Role = 'head' | 'assistant' | 'trainer';
const ROLE_LABEL: Record<Role, string> = { head: 'Head Coach', assistant: 'Assistant Coach', trainer: 'Trainer' };
const ROLE_ORDER: readonly Role[] = ['head', 'assistant', 'trainer'];

function coachInSlot(team: VarsityTeam, role: Role): Coach | null {
  return role === 'head' ? team.headCoach : role === 'assistant' ? team.assistantCoach : team.trainer;
}

// One staff role's row: the coach filling it (name, face, quality, salary, a
// Release button), or a vacancy that says so and nothing more.
//
// THE HIRING USED TO LIVE HERE, as a toggle per vacant role that expanded the
// slice of s.orgs.coachCandidates matching that one field. That works for
// three listings and collapses at forty — and worse, it asks the player to go
// looking role by role for a market they cannot see. A department with six
// teams has eighteen slots and eighteen separate places to check.
//
// So the market moved to one list of its own (see TheMarket below), and this
// row's job shrank to reporting. A vacancy is now a thing you notice on the
// team and answer in the market, which is the direction the information
// actually flows.
function StaffRow({ act, team, role }: { act: (a: Action) => void; team: VarsityTeam; role: Role }) {
  const coach = coachInSlot(team, role);

  if (!coach) {
    return (
      <div className="coach-row vacant">
        <span className="coach-role">{ROLE_LABEL[role]}</span>
        <span className="stat">vacant</span>
      </div>
    );
  }

  return (
    <div className="coach-row">
      <FacultyPortrait f={coachPortrait(coach)} size={26} />
      <span className="coach-role">{ROLE_LABEL[role]}</span>
      <span className="coach-name">{coach.name}</span>
      <span className="stat">quality {coach.quality}</span>
      <span className="stat">{ceilingLabel(coach)}</span>
      <span className="stat">{coachProfile(coach).age}</span>
      <span className="stat">{money(coach.salary)}/yr</span>
      <span className="coach-row-spacer" />
      <button type="button" onClick={() => act({ type: 'FIRE_COACH', teamId: team.id, role })}>Release</button>
    </div>
  );
}

// A coach, as FacultyPortrait sees them. The seniority input is the one thing
// the two kinds of person compute differently: a professor's comes from
// teaching+research through facultyQualityTier, a coach's from their single
// `quality`, so it is resolved here rather than in the portrait.
const COACH_GRAY_AT_QUALITY = 85; // a coach at the very top of the market is most likely a veteran
function coachPortrait(c: Coach) {
  return {
    id: c.id,
    gender: c.gender,
    heritage: c.heritage,
    seniority: Math.max(0.08, Math.min(0.65, c.quality / COACH_GRAY_AT_QUALITY * 0.65)),
  };
}

// WHICH TEAMS COULD USE THIS CANDIDATE, as {team, role} pairs. A head/assistant
// coach's field is one SPORTS id, so they can only ever answer the team
// playing that sport — but they may answer either of ITS two chairs. A trainer
// serves any team regardless of sport, so a single trainer listing can be the
// answer to a dozen different vacancies at once.
interface Opening { team: VarsityTeam; role: Role; }

function openingsFor(s: GameState, c: Coach): Opening[] {
  const out: Opening[] = [];
  for (const team of s.orgs.teams) {
    if (c.field === TRAINER_FIELD) {
      if (!team.trainer) out.push({ team, role: 'trainer' });
      continue;
    }
    if (team.sport !== c.field) continue;
    if (!team.headCoach) out.push({ team, role: 'head' });
    if (!team.assistantCoach) out.push({ team, role: 'assistant' });
  }
  return out;
}

// What a candidate's field is called on screen. A SPORTS id resolves to the
// team name it would coach; TRAINER_FIELD is a discipline, not a sport.
function fieldLabel(field: string): string {
  return field === TRAINER_FIELD ? 'Strength & Conditioning' : sportById(field)?.teamName ?? field;
}

// ---------------------------------------------------------------------
// THE MARKET — one list of everyone on it, tagged by who needs them.
//
// This is the shape FacultyTab.tsx used to have and gave up, and its own
// header records why: faculty hiring moved to the Curriculum tab "where the
// shortage is actually felt — you find out you need a kinesiologist when a
// course will not start." Athletics has no second screen where a coaching
// shortage surfaces. This tab IS where it is felt, so the pattern was never
// wrong — it was in the wrong building.
//
// SORTED BY WHETHER ANYBODY NEEDS THEM, then by quality. A market where the
// useful listings are scattered through the useless ones is a market the
// player scrolls past; putting the answerable ones on top is the whole
// content of "tagged by need".
// ---------------------------------------------------------------------
function TheMarket({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const [showAll, setShowAll] = useState(false);

  const listed = s.orgs.coachCandidates.map((c) => ({ c, openings: openingsFor(s, c) }));
  const wanted = listed.filter((row) => row.openings.length > 0);
  const rest = listed.filter((row) => row.openings.length === 0);
  const byQuality = (a: { c: Coach }, b: { c: Coach }) => b.c.quality - a.c.quality;
  wanted.sort(byQuality);
  rest.sort(byQuality);

  const shown = showAll ? [...wanted, ...rest] : wanted;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>On the market</h2>
        <HelpHint
          text="One pool for the whole department, not a separate list per chair. A head or assistant coach is qualified for exactly one sport, so their listing can only answer that sport's team; a trainer's discipline is strength &amp; conditioning, so one trainer can answer any team's vacancy. Candidates whose sport you field with a chair open are listed first and tagged with the team that wants them — the rest are on the market too, and are shown by the toggle. Every open chair always has somebody listed, but the good ones are rare. A card shows a ceiling as a range, not a number: a prospect is cheap and low now with a ceiling you cannot quite see, a veteran is good now and expensive with little left to grow and a retirement coming; a better athletic director scouts a narrower range. Listings withdraw after a few months whether or not you hire."
        />
      </div>

      {listed.length === 0 ? (
        <p className="empty-note">Nobody is on the coaching market this week.</p>
      ) : (
        <>
          {wanted.length === 0 && !showAll && (
            <p className="empty-note">
              Nobody on the market coaches a sport you field with a chair open.
              {rest.length > 0 && ' There are others listed — see below.'}
            </p>
          )}
          <ul className="org-list coach-market">
            {shown.map(({ c, openings }) => (
              <li key={c.id} className={`coach-candidate${openings.length > 0 ? ' wanted' : ''}`}>
                <FacultyPortrait f={coachPortrait(c)} size={30} />
                <span className="coach-candidate-who">
                  <span className="org-name">{c.name}</span>
                  <span className="coach-candidate-field">{fieldLabel(c.field)}</span>
                </span>
                <span className="stat">quality {c.quality}</span>
                <span className="stat" title={coachProfile(c).veteran ? 'A veteran: high now, little growth left, a short horizon' : 'A prospect: low now, a ceiling you cannot quite see'}>
                  {ceilingLabel(c)} · {coachProfile(c).age}
                </span>
                <span className="stat">{money(c.salary)}/yr</span>
                <span className="coach-candidate-listed">
                  {Math.max(0, COACH_CANDIDATE_LISTING_WEEKS - c.weeksListed)}w left
                </span>
                <span className="coach-candidate-hire">
                  {openings.length === 0
                    ? <span className="coach-candidate-idle">no chair open</span>
                    : openings.map(({ team, role }) => (
                      <button
                        key={`${team.id}:${role}`}
                        type="button"
                        className="panel-action"
                        title={`${team.name} — ${ROLE_LABEL[role]}`}
                        onClick={() => act({ type: 'HIRE_COACH', candidateId: c.id, teamId: team.id, role })}
                      >
                        {/* The tag IS the button: naming the team that wants
                            them is what turns a list of strangers into a list
                            of answers, and clicking the answer should be the
                            same gesture as reading it. */}
                        {openings.length === 1 && openings[0].role !== 'trainer'
                          ? `Hire — ${ROLE_LABEL[role]}`
                          : `${team.name}${role === 'trainer' ? '' : ` · ${ROLE_LABEL[role]}`}`}
                      </button>
                    ))}
                </span>
              </li>
            ))}
          </ul>
          {rest.length > 0 && (
            <button type="button" className="coach-market-toggle" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show only who you need' : `Show the rest of the market (${rest.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------
// THE DEPARTMENT — who runs it, what it is called, what it spends, and where
// it stands.
//
// The tab used to open on the budget lever, which is a knob rather than a
// subject: it told a player what they could change before telling them what
// they had. This is the header the screen was missing — the director, the
// name the teams play under, the two standings athletics actually moves, and
// only then the one dial.
// ---------------------------------------------------------------------
function Department({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const active = s.orgs.teams.filter((t) => t.status === 'active');
  const ad = s.orgs.athleticDirector;
  const pot = departmentPot(s);

  return (
    <section className="panel department">
      <div className="panel-head">
        <h2>{s.self.mascot ? `${institutionName(s.self)} ${s.self.mascot}` : 'Varsity Athletics'}</h2>
        <HelpHint
          text="A sport club (see Student Life) can petition to go varsity: a program budget and a shared competition venue for its sport's category. Coaching staff is hired separately, from the one market below — every team wants a head coach, an assistant and a trainer, and a vacant chair is a real gap rather than a hard block. The department runs on a pot: the school's subsidy (the one dial here) plus what the programs earn at the gate. Programs draw their sport's cost to compete off the pot in the order you put them — drag the list — until the money runs out; a fully funded program recruits at full strength, one below the line runs at a discount, and whatever is left over goes back to the school. The athletic director adds a smaller lift to every team at once. Campus-life standing is one of the three the school is ranked on, and varsity athletics is the only thing on this screen that moves it."
        />
      </div>

      <div className="department-grid">
        {/* The director first: they are the answer to "who runs this", and
            an empty chair here says the offer is still coming. */}
        <div className="department-ad">
          {ad ? (
            <>
              <FacultyPortrait f={coachPortrait(ad)} size={44} />
              <span className="department-ad-who">
                <span className="department-ad-name">{ad.name}</span>
                <span className="department-ad-role">Athletic Director</span>
              </span>
              <span className="department-ad-numbers">
                <span className="stat">quality {ad.quality}</span>
                <span className="stat">{money(ad.salary)}/yr</span>
              </span>
            </>
          ) : (
            <p className="empty-note department-ad-empty">
              No athletic director. The trustees will put candidates forward before long.
            </p>
          )}
        </div>

        {/* The two standings, side by side, because they answer different
            questions: how good is the department, and how much does the
            school's campus life amount to. Athletics is the only thing on
            this screen that moves the second. */}
        <dl className="department-standings">
          <div>
            <dt>Athletic standing</dt>
            <dd>{active.length > 0 ? <><strong>#{athleticRank(s)}</strong> of {s.rivals.length + 1}</> : <span className="stat">no program yet</span>}</dd>
          </div>
          <div>
            <dt>Campus life</dt>
            <dd><strong>#{rankBy(s, 'socialStanding')}</strong> of {s.rivals.length + 1}</dd>
          </div>
          {/* Only once there is one. A nought here would be the screen telling
              a young department it has failed at something it has not had
              time to attempt. */}
          {s.orgs.titles.length > 0 && (
            <div>
              <dt>Championships</dt>
              <dd><strong>{s.orgs.titles.length}</strong></dd>
            </div>
          )}
        </dl>
      </div>

      {/* THE POT (Plan 21's PR G): the subsidy the school puts in, what the
          programs earned at the gate, and what is left once the list has
          drawn on it. The tier is the subsidy, said in dollars. */}
      <div className="athletics-budget">
        <span className="stat">
          Subsidy: {s.orgs.athleticsBudget} ({money(pot.subsidy)}/yr)
          {active.length > 0 && (
            <> · gate {money(pot.earned)}/yr · pot {money(pot.pot)}/yr · programs draw {money(pot.drawn)}/yr · {pot.surplus > 0 ? `${money(pot.surplus)}/yr returned to the school` : 'nothing left over'}</>
          )}
        </span>
        <div className="athletics-budget-tiers">
          {ATHLETICS_BUDGET_ORDER.map((tier) => (
            <button
              key={tier}
              type="button"
              className={tier === s.orgs.athleticsBudget ? 'active' : ''}
              aria-pressed={tier === s.orgs.athleticsBudget}
              title={`${money(ATHLETICS_BUDGET_TIERS[tier].subsidyPerYear)}/yr into the department's pot`}
              onClick={() => act({ type: 'SET_ATHLETICS_BUDGET', tier })}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// THE STANDINGS — one row per sport the school actually fields, showing where
// it sits in THAT sport rather than in athletics generally.
//
// This is what PR 1C's per-sport strength was built for, and the first screen
// in the game where the field is something other than one ordered list of a
// hundred names. The department-wide rank above says whether the school runs a
// good athletics program; this says whether it is any good at lacrosse, which
// is the question a particular coach hire is an answer to.
//
// Each row shows the schools immediately above and below, by name and mascot,
// because a rank with nothing around it is a number and a rank between two
// named rivals is a position.
// ---------------------------------------------------------------------
function SportStandings({ s }: { s: GameState }) {
  const fielded = s.orgs.teams.filter((t) => t.status === 'active');
  if (fielded.length === 0) return null;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>By sport</h2>
        <HelpHint
          text="Every school in the country is stronger at some sports than others, and reliably so — a school that is good at hockey stays good at hockey. Your own strength in a sport is that team's quality, which is its coaching staff, the recruiting budget and the athletic director together, so hiring a coach moves your place on this table rather than some separate figure. Teams still waiting on a venue are not ranked: they cannot compete yet."
        />
      </div>
      <ul className="sport-standings">
        {fielded.map((team) => {
          const list = sportRankedList(s, team.sport);
          const place = sportRank(s, team.sport);
          if (place === null) return null;
          const last = s.orgs.lastSeason[team.sport];
          const above = list[place - 2];
          const below = list[place];
          const record = seasonRecordFor(s, team.sport);
          const rival = rivalFor(s, team.sport);
          const rivalry = s.orgs.rivalries[team.sport];
          return (
            <li key={team.id} className="sport-standing">
              <span className="sport-standing-sport">{sportById(team.sport)?.teamName ?? team.sport}</span>
              <span className="sport-standing-place">
                <strong>#{place}</strong>
                <span className="sport-standing-of">of {list.length}</span>
              </span>
              {/* Last season, beside the rank: a table of ranks says where you
                  stand, and this says what happened. "Did not qualify" is a
                  result the row states plainly — it is the sentence that makes
                  a coach's salary a decision. */}
              <span className="sport-standing-season">
                {last ? <span className={`season-finish ${last.finish}`}>{seasonLabel(last)}</span> : <span className="season-finish none">first season</span>}
              </span>
              <span className="sport-standing-neighbours">
                {above
                  ? <span className="sport-standing-above">↑ {above.name} {above.mascot}</span>
                  : <span className="sport-standing-above best">nobody in the country is ahead</span>}
                {below && <span className="sport-standing-below">↓ {below.name} {below.mascot}</span>}
              </span>
              {/* The record and the rival (Plan 21's PRs M and N): a rank is
                  a number; a rank against Wexford State, whom you have beaten
                  eleven times in thirty years, is a story. */}
              <span className="sport-standing-rivalry">
                {record ? <span className="stat">{record.wins}–{record.losses} this season</span> : <span className="stat">season not yet open</span>}
                {rival && (
                  <span className="stat" title={`${trophyFor(s, team.sport)} — the all-time series against ${rival.name}`}>
                    rival: {rival.name} {rival.mascot}
                    {rivalry ? ` (${rivalry.wins}–${rivalry.losses}${rivalry.streak !== 0 ? `, ${Math.abs(rivalry.streak)} straight ${rivalry.streak > 0 ? 'to you' : 'to them'}` : ''})` : ''}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------
// THE TROPHY CASE (Plan 21's PR E): every title as an object with a year and
// a sport, newest first, not a count. The almanac feel the design review
// said to protect — a banner is a thing that happened, and a case full of
// them is what a dynasty looks like from the hallway.
// ---------------------------------------------------------------------
function TrophyCase({ s }: { s: GameState }) {
  if (s.orgs.titles.length === 0) return null;
  const titles = [...s.orgs.titles].sort((a, b) => b.year - a.year);
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Trophy case</h2>
        <HelpHint text="Every national title the school has won, by year and sport. A title lifts campus-life standing for good, swells the next summer's applicant pool for a few years, and for about a year makes donors easier to find and an endowment campaign worth more." />
      </div>
      <ul className="org-list trophy-case">
        {titles.map((title) => (
          <li key={`${title.sport}:${title.year}`} className="trophy">
            <span className="trophy-year">{title.year}</span>
            <span className="org-name">{sportById(title.sport)?.teamName.replace(/ Team$/, '') ?? title.sport}</span>
            <span className="stat">national champions</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TeamCard({ s, act, team, funding }: { s: GameState; act: (a: Action) => void; team: VarsityTeam; funding?: ProgramFunding }) {
  const quality = teamQuality(team, s);
  const staffAnnual = (team.headCoach?.salary ?? 0) + (team.assistantCoach?.salary ?? 0) + (team.trainer?.salary ?? 0);
  const weeklyCost = team.upkeepPerWeek + staffAnnual / WEEKS_PER_YEAR;
  const venue = venueForCategory(s, team.venueCategory);
  // The house (Plan 21's PR D): 1,200 in the rain in year twelve and a full
  // house in year thirty-four is the growth fantasy in one number, and what
  // it earns beside it is the knife-edge the budget lever never posed.
  const attendance = attendanceFor(s, team);
  const gate = annualGateFor(s, team);

  return (
    <li className="panel team-card">
      <div className="team-card-head">
        <span className="org-name">
          {team.name}
          <span className={`org-tag${funding ? ` band-${funding.band}` : ''}`}>
            {team.status !== 'active' ? 'awaiting venue' : funding ? BAND_LABEL[funding.band] : 'varsity'}
          </span>
          {team.postseasonBanThroughYear !== undefined && s.clock.year <= team.postseasonBanThroughYear && (
            <span className="org-tag banned">postseason ban through {team.postseasonBanThroughYear}</span>
          )}
        </span>
        <span className="org-meta">
          quality {quality} · {team.status === 'active'
            ? venue?.name ?? 'venue'
            : `waiting on ${venue?.name ?? 'venue'}`} · {money(weeklyCost)}/wk
          {funding && (
            <> · draws {money(funding.drawn)} of {money(funding.cost)}/yr{funding.funded < 0.999 && funding.funded > 0 ? ` (${Math.round(funding.funded * 100)}% funded)` : ''}</>
          )}
          {team.status === 'active' && attendance > 0 && (
            <> · {attendance.toLocaleString()} a game, {money(gate)}/yr at the gate</>
          )}
        </span>
      </div>
      {ROLE_ORDER.map((role) => <StaffRow key={role} act={act} team={team} role={role} />)}
    </li>
  );
}

// ---------------------------------------------------------------------
// THE PRIORITY LIST (Plan 21's PR G): the programs in the order the player
// put them, dragged, with the line drawn where the money runs out. The
// idiom is the Curriculum tab's drag-and-drop, here on whole cards. Only
// the order is dispatched; the bands on the cards are read back off the pot.
// ---------------------------------------------------------------------
function PriorityList({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const pot = departmentPot(s);
  const ordered = orderedTeams(s);
  const active = ordered.filter((t) => t.status === 'active');
  const awaiting = ordered.filter((t) => t.status === 'awaitingVenue');
  const fundingOf = new Map(pot.programs.map((p) => [p.team.id, p]));

  const drop = (targetId: string) => {
    if (!dragging || dragging === targetId) return;
    const ids = ordered.map((t) => t.id);
    const from = ids.indexOf(dragging);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragging);
    act({ type: 'SET_TEAM_ORDER', order: ids });
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{ordered.length === 1 ? 'One program' : `${ordered.length} programs`}</h2>
        <HelpHint text="Drag a program up or down. Each draws its sport's cost to compete off the department's pot in this order until the pot runs out — the line shows where. A program above the line is a flagship and recruits at full strength; one the money reaches only part-way is competitive; one it never reaches is developmental and runs at a discount, not a zero. Dragging a program below the line it was above is a real demotion: its head coach may resign rather than take the cut. Teams waiting on a venue sit out of the queue and draw nothing." />
      </div>
      {ordered.length === 0 ? (
        <div className="empty-note">
          {/* The path (PR O): the tab opens with the first sport club, empty
              and saying what comes next, rather than with the first team. */}
          <p>No sport club has gone varsity yet. The path: a sport club forms on Student Life, and after {VARSITY_PETITION_MIN_TENURE_YEARS} years it may petition to go varsity — a program budget, a shared venue for its sport, and a place on this list.</p>
          {s.orgs.clubs.filter((c) => c.sport !== null).length > 0 && (
            <ul className="org-list">
              {s.orgs.clubs.filter((c) => c.sport !== null).map((c) => {
                const year = varsityEligibleYear(c);
                return (
                  <li key={c.id} className="org-row">
                    <span className="org-name">{c.name}</span>
                    <span className="org-meta">{year <= s.clock.year ? 'may petition this year' : `may petition in year ${year}`}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <ul className="team-card-list priority-list">
          {active.map((team, i) => {
            const funding = fundingOf.get(team.id);
            const lineHere = i === pot.fundedLine && pot.fundedLine < active.length && pot.fundedLine > 0;
            return (
              <li key={team.id} className="priority-slot">
                {lineHere && <div className="funded-line">the money runs out here</div>}
                <div
                  className={`priority-card${dragging === team.id ? ' dragging' : ''}${over === team.id ? ' over' : ''}`}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragging(team.id); }}
                  onDragEnd={() => { setDragging(null); setOver(null); }}
                  onDragOver={(e) => { e.preventDefault(); if (over !== team.id) setOver(team.id); }}
                  onDrop={(e) => { e.preventDefault(); drop(team.id); setDragging(null); setOver(null); }}
                >
                  <span className="priority-rank" title="Drag to reorder">{i + 1}</span>
                  <TeamCard s={s} act={act} team={team} funding={funding} />
                </div>
              </li>
            );
          })}
          {pot.fundedLine === 0 && active.length > 0 && (
            <li className="priority-slot"><div className="funded-line">the pot funds no program in full</div></li>
          )}
          {/* Teams waiting on a building: construction items, not programs,
              sorted below the queue without a second heading. */}
          {awaiting.map((team) => (
            <li key={team.id} className="priority-slot awaiting">
              <TeamCard s={s} act={act} team={team} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AthleticsTab({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const teams = s.orgs.teams;

  return (
    <div className="tab-content">
      {/* THE ORDER IS THE ORDER THE QUESTIONS ARRIVE IN. What is this
          department and where does it stand; what does it field; how is it
          doing in each sport; and who is available to fix what is missing.
          The tab used to open on the budget lever — a knob before a
          subject. */}
      <Department s={s} act={act} />

      <PriorityList s={s} act={act} />

      <SportStandings s={s} />

      <TrophyCase s={s} />

      {/* The market sits LAST, because that is the order the questions arrive
          in: you notice a chair is empty on a team, then you go looking for
          somebody to fill it. */}
      {teams.length > 0 && <TheMarket s={s} act={act} />}
    </div>
  );
}
