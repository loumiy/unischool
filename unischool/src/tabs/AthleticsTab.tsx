import { Fragment, useState } from 'react';
import ConfirmButton from '../components/ConfirmButton';
import type { Action } from '../state/actions';
import type { Coach, GameState, VarsityTeam } from '../state/types';
import { WEEKS_PER_YEAR, institutionName } from '../state/types';
import { PILLAR_WORDS, teamLimitHelp, teamSlowed } from '../data/specializationData';
import { ATHLETICS_COMPLEX_ID, COMPLEX_WORDS, complexReading, complexRecruiting, complexStands } from '../data/athleticsComplexData';
import { SPECIALIZATION_MILESTONE_RANK } from '../systems/prestige/prestigeSystem';
import { specializationOf } from '../systems/prestige/specialization';
import HelpHint from '../components/HelpHint';
import Figure from '../components/Figure';
import {
  ATHLETICS_BUDGET_ORDER, CHAIR_LABEL, ATHLETICS_BUDGET_TIERS, BAND_LABEL, COACH_CANDIDATE_LISTING_WEEKS, COLLEGE_PULL_MAX,
  NON_FLAGSHIP_FUNDED_SHARE, RECRUITING_CLASSES, RECRUITING_FULL_LIFT, SCHOLARSHIP_LEVELS, SCHOLARSHIP_ORDER, TRAINER_FIELD,
  VARSITY_PETITION_MIN_TENURE_YEARS, annualScholarships, ceilingResolved, coachProfile, collegePull, departmentPot, orderedTeams,
  recruitingTarget, scholarshipCostFor, sportById, teamQuality, teamQualityEarned, TEAM_QUALITY_KNEE, varsityEligibleYear, venueForCategory,
} from '../data/studentLifeData';
import type { ProgramFunding } from '../data/studentLifeData';
import FacultyPortrait from '../components/FacultyPortrait';
import { athleticRank, rankBy, sportRank, sportRankedList } from '../systems/rivals/rivalsSystem';
import { annualGateFor, attendanceFor } from '../systems/athletics/gate';
import { rivalFor, seasonRecordFor, trophyFor } from '../systems/athletics/season';
import type { ScholarshipLevel, SeasonResult } from '../state/types';
import { count, decimal, money, moneyShort, pct, weeksShort } from '../format';
import { ReleaseIcon } from '../components/icons';
import { switchStyle } from '../components/segmentedSwitch';
import { useCollapse } from '../components/useCollapse';

// Last season, in a few words. Short on purpose: it sits in a table row
// beside a rank, not in a report.
function seasonLabel(r: SeasonResult): string {
  switch (r.finish) {
    case 'champion': return 'champions';
    case 'final': return 'lost the final';
    case 'semifinal': return 'lost the semifinal';
    case 'quarterfinal': return 'lost the quarterfinal';
    default: return r.banned ? 'postseason ban' : 'did not qualify';
  }
}

// A coach's ceiling: a scouted range for a candidate or a hire whose tenure
// has not yet resolved it, the number once it has. The age sits beside it.
function ceilingLabel(c: Coach): string {
  const p = coachProfile(c);
  if (ceilingResolved(c)) return `potential ${c.qualityPotential}`;
  return p.scouted[0] === p.scouted[1] ? `potential ${p.scouted[0]}` : `potential ${p.scouted[0]}–${p.scouted[1]}`;
}

// Varsity athletics: teams with three hireable staff roles each (head coach,
// assistant, trainer) drawn from s.orgs.coachCandidates, the flagships and
// their scholarships (teamQuality's funding and recruiting), and standings
// against rivals (athleticRank). Sport clubs stay on Student Life until they go varsity,
// which is only offered through the 'varsity-petition' decision event.

type Role = 'head' | 'assistant' | 'trainer';
const ROLE_SEAT: Record<Role, string> = { head: 'Head coach', assistant: 'Assistant', trainer: 'Trainer' };
const ROLE_ORDER: readonly Role[] = ['head', 'assistant', 'trainer'];

// A chair with its article: "a head coach", "an assistant coach".
const aChair = (role: Role): string => `${role === 'assistant' ? 'an' : 'a'} ${CHAIR_LABEL[role]}`;

function coachInSlot(team: VarsityTeam, role: Role): Coach | null {
  return role === 'head' ? team.headCoach : role === 'assistant' ? team.assistantCoach : team.trainer;
}

// The market's panel, where an open seat's "Hire" goes.
const MARKET_ID = 'athletics-market';
function goToMarket() {
  const market = document.getElementById(MARKET_ID);
  if (!market) return;
  market.scrollIntoView({ block: 'start', behavior: 'smooth' });
  market.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
}

// One staff chair on a program card, as a seat (Plan 90): the coach filling
// it (face, name, quality and salary; the ceiling and age in its tooltip, a
// Release button), or an open seat with a dashed blank face and a link to
// the market below, where hiring happens.
function StaffSeat({ act, team, role }: { act: (a: Action) => void; team: VarsityTeam; role: Role }) {
  const coach = coachInSlot(team, role);

  if (!coach) {
    return (
      <div className="staff-seat open">
        <span className="staff-seat-role">{ROLE_SEAT[role]}</span>
        <span className="staff-seat-face" aria-hidden="true" />
        <span className="staff-seat-name">Open</span>
        <button type="button" className="staff-seat-hire" aria-label={`Hire ${aChair(role)}: see the market`} onClick={goToMarket}>
          Hire <span aria-hidden="true">→</span>
        </button>
      </div>
    );
  }

  return (
    <div className="staff-seat" title={`${coach.name}: quality ${coach.quality} · ${ceilingLabel(coach)} · age ${coachProfile(coach).age} · ${moneyShort(coach.salary)}/yr`}>
      <span className="staff-seat-role">{ROLE_SEAT[role]}</span>
      <FacultyPortrait f={coachPortrait(coach)} size={34} />
      <span className="staff-seat-name">{coach.name}</span>
      <span className="staff-seat-line">
        q {coach.quality} · {moneyShort(coach.salary)}/yr
        <span className="visually-hidden"> · {ceilingLabel(coach)} · age {coachProfile(coach).age}</span>
      </span>
      <ConfirmButton
        className="coach-release"
        label={<ReleaseIcon />}
        ariaLabel={`Release ${coach.name}`}
        armedLabel="Confirm — release; the post stays open"
        title={`Release ${coach.name}`}
        onConfirm={() => act({ type: 'FIRE_COACH', teamId: team.id, role })}
      />
    </div>
  );
}

// A coach, as FacultyPortrait sees them. A coach's seniority comes from their
// single `quality` (a professor's from facultyQualityTier), so it is resolved here.
const COACH_GRAY_AT_QUALITY = 85; // a coach at the very top of the market is most likely a veteran
function coachPortrait(c: Coach) {
  return {
    id: c.id,
    gender: c.gender,
    heritage: c.heritage,
    seniority: Math.max(0.08, Math.min(0.65, c.quality / COACH_GRAY_AT_QUALITY * 0.65)),
  };
}

// Which {team, role} pairs could use this candidate. A head or assistant
// coach's field is one sport, so they fit either chair of that sport's team;
// a trainer fits any team.
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

// The market: one list of every coach candidate, tagged by which teams need
// them, sorted by whether anybody needs them and then by quality. Unlike
// faculty hiring, this tab is where a coaching shortage is felt.
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
    <section className="panel" id={MARKET_ID}>
      <div className="panel-head">
        <h2 tabIndex={-1}>On the market</h2>
        <HelpHint
          text="One pool for the whole department, not a separate list per post. A head or assistant coach is qualified for exactly one sport, so their listing can only answer that sport's team; a trainer's discipline is strength &amp; conditioning, so one trainer can answer any team's vacancy. Candidates whose sport the college fields with a post open are listed first and tagged with the team that wants them — the rest are on the market too, and are shown by the toggle. Every open post always has somebody listed, but the good ones are rare. A card shows a coach's potential as a range, not a number: a prospect is cheap and low now with a potential nobody can quite see, a veteran is good now and expensive with little left to grow and a retirement coming; a better Athletic Director scouts a narrower range. Listings withdraw after a few months whether or not the college hires."
        />
      </div>

      {listed.length === 0 ? (
        <p className="empty-note">Nobody is on the coaching market this week.</p>
      ) : (
        <>
          {wanted.length === 0 && !showAll && (
            <p className="empty-note">
              Nobody on the market coaches a sport the college fields with a post open.
              {rest.length > 0 && ' There are others listed — see below.'}
            </p>
          )}
          <ul className="coach-market">
            {shown.map(({ c, openings }) => (
              <li key={c.id} className={`coach-candidate${openings.length > 0 ? ' wanted' : ''}`}>
                <div className="coach-candidate-top">
                  <FacultyPortrait f={coachPortrait(c)} size={30} />
                  <span className="coach-candidate-who">
                    <span className="org-name">{c.name}</span>
                    <span className="coach-candidate-field">{fieldLabel(c.field)}</span>
                  </span>
                  <span className="coach-candidate-listed">
                    {weeksShort(Math.max(0, COACH_CANDIDATE_LISTING_WEEKS - c.weeksListed))} left
                  </span>
                </div>
                <span className="stat" title={coachProfile(c).veteran ? 'A veteran: high now, little growth left, a short horizon' : 'A prospect: low now, a potential nobody can quite see'}>
                  quality {c.quality} · {ceilingLabel(c)} · age {coachProfile(c).age} · {moneyShort(c.salary)}/yr
                </span>
                <span className="coach-candidate-hire">
                  {openings.length === 0
                    ? <span className="coach-candidate-idle">no post open</span>
                    : openings.map(({ team, role }) => (
                      <button
                        key={`${team.id}:${role}`}
                        type="button"
                        className="panel-action"
                        title={`${team.name} — ${CHAIR_LABEL[role]}`}
                        onClick={() => act({ type: 'HIRE_COACH', candidateId: c.id, teamId: team.id, role })}
                      >
                        {/* The tag is the button: clicking the team that wants them hires. */}
                        {openings.length === 1 && openings[0].role !== 'trainer'
                          ? `Hire as ${CHAIR_LABEL[role]}`
                          : `${team.name}${role === 'trainer' ? '' : ` · ${CHAIR_LABEL[role]}`}`}
                      </button>
                    ))}
                </span>
              </li>
            ))}
          </ul>
          {rest.length > 0 && (
            <button type="button" className="panel-action coach-market-toggle" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show only who the open posts need' : `Show the rest of the market (${rest.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

// The department, in the side column: the director, the two standings the
// department moves, the subsidy dial and the pot in a few lines.
function Department({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const active = s.orgs.teams.filter((t) => t.status === 'active');
  const ad = s.orgs.athleticDirector;
  const pot = departmentPot(s);
  const scholarships = annualScholarships(s, pot);

  return (
    <section className="panel department">
      <div className="panel-head">
        <h2>{s.self.mascot ? `${institutionName(s.self)} ${s.self.mascot}` : 'Varsity athletics'}</h2>
        <HelpHint
          text={`A sport club (see the Students tab) can petition to go varsity: a program budget and a shared competition venue for its sport's category. Coaching staff is hired separately, from the one market below — every team wants a head coach, an assistant and a trainer, and a vacant post is a real gap rather than a hard block. The department runs on its own fund: the college's subsidy plus what the programs earn at the gate. The subsidy level here sets the subsidy, and with it the staff's pay (×0.75, ×1 or ×1.4) and what the teams add to student life (×0.6, ×1 or ×1.5). The subsidy level also sets how many programs may be flagships: 2, 4 or 6, the first on the list, and two more while the Athletic Performance Complex stands at a college specialized in athletics. A flagship takes its sport's whole cost to compete from the fund and may carry a scholarship budget, which recruits; every other program takes at most ${pct(NON_FLAGSHIP_FUNDED_SHARE)} of its cost, in the order of the cards, until the money runs out. Whatever is left over goes back to the college. The Athletic Director adds a smaller lift to every team at once. Athletics is one of the four pillars of prestige (the History tab): the programs' strength, the flagships' and the titles make it, and it counts for less than the other three.`}
        />
      </div>

      {/* The director first; an empty chair means the offer is still coming. */}
      <div className="department-ad">
        {ad ? (
          <>
            <FacultyPortrait f={coachPortrait(ad)} size={40} />
            <span className="department-ad-who">
              <span className="department-ad-name">{ad.name}</span>
              <span className="department-ad-role">Athletic Director</span>
              <span className="stat">quality {ad.quality} · {moneyShort(ad.salary)}/yr</span>
            </span>
          </>
        ) : (
          <p className="empty-note department-ad-empty">
            No Athletic Director. The board will put candidates forward before long.
          </p>
        )}
      </div>

      {/* Two pillars of prestige: athletics, the department's own, and student life. */}
      <dl className="department-standings">
        <div>
          <dt>Athletics</dt>
          <dd>{active.length > 0 ? <><strong>#{athleticRank(s)}</strong> of {s.rivals.length + 1}</> : <span className="stat">no program yet</span>}</dd>
        </div>
        <div>
          <dt>Student life</dt>
          <dd><strong>#{rankBy(s, 'socialStanding')}</strong> of {s.rivals.length + 1}</dd>
        </div>
        {/* Championships only once there is one. */}
        {s.orgs.titles.length > 0 && (
          <div>
            <dt>Titles</dt>
            <dd><strong>{s.orgs.titles.length}</strong></dd>
          </div>
        )}
      </dl>

      {/* The pot: the school's subsidy, gate earnings, and what is left once
          the priority list has drawn on it. The tier is the subsidy in dollars. */}
      <div className="athletics-budget">
        <span className="athletics-budget-label">Subsidy</span>
        <div className="athletics-budget-tiers segmented switch" style={switchStyle(ATHLETICS_BUDGET_ORDER.length, ATHLETICS_BUDGET_ORDER.indexOf(s.orgs.athleticsBudget))}>
          {ATHLETICS_BUDGET_ORDER.map((tier) => (
            <button
              key={tier}
              type="button"
              className={tier === s.orgs.athleticsBudget ? 'active' : ''}
              aria-pressed={tier === s.orgs.athleticsBudget}
              title={`${money(ATHLETICS_BUDGET_TIERS[tier].subsidyPerYear)}/yr into the department's fund; up to ${ATHLETICS_BUDGET_TIERS[tier].flagships} flagships; staff pay ×${ATHLETICS_BUDGET_TIERS[tier].upkeepMultiplier}; the teams' lift to student life ×${ATHLETICS_BUDGET_TIERS[tier].socialMultiplier}`}
              onClick={() => act({ type: 'SET_ATHLETICS_BUDGET', tier })}
            >
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <dl className="athletics-pot">
        <Figure label="Subsidy" value={`${money(pot.subsidy)}/yr`} hint="What the college puts into the department's fund each year, set by the subsidy level above." />
        <Figure
          label="Flagships"
          value={`${pot.programs.filter((p) => p.band === 'flagship').length} of ${pot.cap}`}
          hint={pot.cap > pot.baseCap
            ? COMPLEX_WORDS.flagshipsHint(pot.cap, pot.baseCap, s.orgs.athleticsBudget)
            : `How many programs are flagships, of the ${pot.cap} the ${s.orgs.athleticsBudget} subsidy allows: the first on the list. Only a flagship is funded in full and recruits.`}
        />
        {scholarships > 0 && (
          <Figure label="Scholarships" value={`${money(scholarships)}/yr`} hint="What the flagships' scholarship budgets cost the college in a year, paid from its own funds rather than the department's: the Treasury's Athletic scholarships line." />
        )}
        {active.length > 0 && (
          <>
            <Figure label="Gate" value={`${money(pot.earned)}/yr`} hint="What the programs earn at the gate in a year, which goes into the same fund." />
            <Figure label="Fund" value={`${money(pot.pot)}/yr`} hint="The subsidy and the gate together: what the programs take from, in the order of the cards." />
            <Figure label="Programs take" value={`${money(pot.drawn)}/yr`} hint={`What the programs take from the fund to compete, in the order of the cards until the fund runs out: a flagship its sport's whole cost, any other program up to ${pct(NON_FLAGSHIP_FUNDED_SHARE)} of it.`} />
            <Figure label="Back to the college" value={pot.surplus > 0 ? `${money(pot.surplus)}/yr` : 'nothing'} hint="The subsidy the programs do not take is never charged, and the gate they leave is paid to the college each week, as the Treasury's Athletics surplus." />
          </>
        )}
      </dl>
      <ComplexSection s={s} />
    </section>
  );
}

// The Athletic Performance Complex (Plan 85G), under the department's
// figures: standing at a college specialized in athletics, what it does (the
// flagships above the subsidy's, the recruiting, the postseason, the deep
// runs that fill athletics' specialization share); going up, or open to
// build; and otherwise that it is the athletics specialization's own
// building, which this college may or may not yet choose.
function ComplexSection({ s }: { s: GameState }) {
  const complex = s.tech.find((t) => t.id === ATHLETICS_COMPLEX_ID);
  if (!complex) return null;
  const chosen = specializationOf(s);
  const pot = departmentPot(s);
  const flagships = pot.programs.filter((p) => p.band === 'flagship').length;
  const line = chosen === 'athletics'
    ? complexStands(s)
      ? COMPLEX_WORDS.works(s, complexReading(s) >= 1, flagships, pot.cap, pot.baseCap, RECRUITING_FULL_LIFT)
      : complex.status === 'developing' ? COMPLEX_WORDS.goingUp : COMPLEX_WORDS.build
    : chosen ? COMPLEX_WORDS.gatedElsewhere(PILLAR_WORDS[chosen]) : COMPLEX_WORDS.gatedUnchosen(SPECIALIZATION_MILESTONE_RANK);
  return (
    <section className="athletics-complex" aria-label={COMPLEX_WORDS.head}>
      <h3 className="facility-group-head">{COMPLEX_WORDS.head}</h3>
      <p className="athletics-complex-line">{line}</p>
    </section>
  );
}

// The colleges either side of a rank, for its tooltip.
function neighboursOf(list: ReturnType<typeof sportRankedList>, place: number): string {
  const above = list[place - 2];
  const below = list[place];
  return [
    above ? `↑ ${above.name} ${above.mascot}` : 'nobody in the country is ahead',
    below ? `↓ ${below.name} ${below.mascot}` : '',
  ].filter(Boolean).join('\n');
}

// A sport's standing, on its program card, as a small navy scoreboard (Plan
// 89): the rank (the colleges just above and below in its tooltip) in one
// cell; the all-time series against the sport's rival, last season and this
// season's record in the other. Teams still waiting on a venue are not
// ranked: they cannot compete.
function SportLine({ s, team }: { s: GameState; team: VarsityTeam }) {
  const list = sportRankedList(s, team.sport);
  const place = sportRank(s, team.sport);
  if (place === null) return null;
  const last = s.orgs.lastSeason[team.sport];
  const record = seasonRecordFor(s, team.sport);
  const rival = rivalFor(s, team.sport);
  const rivalry = s.orgs.rivalries[team.sport];
  const neighbours = neighboursOf(list, place);
  // The series is kept the college's wins first, so who leads it is known.
  const lead = rivalry ? Math.sign(rivalry.wins - rivalry.losses) : 0;
  return (
    <div className="team-card-standing scoreboard">
      <div className="scoreboard-cell scoreboard-rank" title={neighbours}>
        <span className="scoreboard-label">Rank</span>
        <span className="scoreboard-digits">
          {place}<small aria-hidden="true">/{list.length}</small><span className="visually-hidden"> of {list.length}</span>
        </span>
      </div>
      <div className="scoreboard-cell">
        {rival && (
          <>
            <span className="scoreboard-label">Rival series</span>
            <span className="scoreboard-game team-card-rival" title={`${trophyFor(s, team.sport)} — the all-time series against ${rival.name}`}>
              {rivalry
                ? <><span className={`scoreboard-score ${lead > 0 ? 'up' : lead < 0 ? 'down' : 'level'}`}>{lead > 0 ? 'Lead' : lead < 0 ? 'Trail' : 'Level'} {rivalry.wins}–{rivalry.losses}</span> {rival.name}</>
                : <>vs {rival.name}</>}
            </span>
          </>
        )}
        <span className="scoreboard-status">
          {last ? <span className={`season-finish ${last.finish}`}>{seasonLabel(last)}</span> : <span className="season-finish none">first season</span>}
          <span aria-hidden="true"> · </span>
          {record ? <span>{record.wins}–{record.losses} this season</span> : <span>season not open</span>}
        </span>
      </div>
    </div>
  );
}

// The scoreboard as the folded line carries it (Plan 95I): the rank and
// last season's result, in the same navy and gold.
function SportScore({ s, team }: { s: GameState; team: VarsityTeam }) {
  const list = sportRankedList(s, team.sport);
  const place = sportRank(s, team.sport);
  if (place === null) return null;
  const last = s.orgs.lastSeason[team.sport];
  return (
    <span className="team-card-standing scoreboard compact">
      <span className="scoreboard-digits" title={neighboursOf(list, place)}>
        {place}<small aria-hidden="true">/{list.length}</small><span className="visually-hidden"> of {list.length}</span>
      </span>
      <span className="scoreboard-status">
        {last ? <span className={`season-finish ${last.finish}`}>{seasonLabel(last)}</span> : <span className="season-finish none">first season</span>}
      </span>
    </span>
  );
}

// A program's next action, for its folded line (Plan 95I): the open chair
// to fill, the head coach's first; otherwise what holds it back (a venue
// to wait on, a postseason ban); otherwise nothing.
function NextAction({ s, team }: { s: GameState; team: VarsityTeam }) {
  if (team.status !== 'active') {
    return <span className="team-card-next">waiting on {venueForCategory(s, team.venueCategory)?.name ?? 'a venue'}</span>;
  }
  const open = ROLE_ORDER.find((role) => !coachInSlot(team, role));
  if (open) {
    return (
      <button type="button" className="staff-seat-hire team-card-next" onClick={goToMarket}>
        Hire {aChair(open)} <span aria-hidden="true">→</span>
      </button>
    );
  }
  if (team.postseasonBanThroughYear !== undefined && s.clock.year <= team.postseasonBanThroughYear) {
    return <span className="team-card-next">postseason ban through {team.postseasonBanThroughYear}</span>;
  }
  return null;
}

// The trophy case: every title as an object with a year and sport, newest first.
function TrophyCase({ s }: { s: GameState }) {
  if (s.orgs.titles.length === 0) return null;
  const titles = [...s.orgs.titles].sort((a, b) => b.year - a.year);
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Trophy case</h2>
        <HelpHint text="Every national title the college has won, by year and sport. A title lifts the athletics pillar for good, swells the next summer's applicant pool for a few years, and for about a year makes donors easier to find and a campaign worth more." />
      </div>
      <ul className="org-list trophy-case">
        {titles.map((title) => (
          <li key={`${title.sport}:${title.year}`} className="trophy">
            <span className="trophy-year">Year {title.year}</span>
            <span className="org-name">{sportById(title.sport)?.teamName.replace(/ Team$/, '') ?? title.sport}</span>
            <span className="stat">national champions</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const SCHOLARSHIP_LABEL: Record<ScholarshipLevel, string> = { none: 'None', some: 'Some', full: 'Full' };

// Recruiting and the college's pull, on a program card (Plan 80G): a
// flagship's scholarship budget, the strength its classes have built and
// where it is heading, and what the venue and campus life add. A program
// that is no flagship shows only what it still carries, falling away.
function Recruiting({ s, act, team, flagship }: { s: GameState; act: (a: Action) => void; team: VarsityTeam; flagship: boolean }) {
  // The Athletic Performance Complex's boost (Plan 85G), while it works.
  const boost = complexRecruiting(s);
  const target = recruitingTarget(team, flagship, boost);
  const now = team.recruiting;
  const pull = collegePull(s, team);
  const full = RECRUITING_FULL_LIFT * boost;
  const perClass = full / RECRUITING_CLASSES;
  const atComplex = boost > 1 ? ' at the Athletic Performance Complex' : '';
  const trend = now < target - 0.05 ? `, building toward +${decimal(target)}` : now > target + 0.05 ? ', falling away' : '';
  return (
    <>
      {flagship && (
        <div className="team-card-scholarships">
          <span className="athletics-budget-label">Scholarships</span>
          <div className="segmented switch" style={switchStyle(SCHOLARSHIP_ORDER.length, SCHOLARSHIP_ORDER.indexOf(team.scholarships))}>
            {SCHOLARSHIP_ORDER.map((level) => (
              <button
                key={level}
                type="button"
                className={level === team.scholarships ? 'active' : ''}
                aria-pressed={level === team.scholarships}
                title={level === 'none'
                  ? 'No scholarships: nothing spent, and the recruited classes graduate away'
                  : `${money(scholarshipCostFor(team.sport, level))}/yr; recruits toward +${decimal(full * SCHOLARSHIP_LEVELS[level].liftShare)}${atComplex}, up to +${decimal(perClass * SCHOLARSHIP_LEVELS[level].liftShare, 1)} a class a year`}
                onClick={() => act({ type: 'SET_SCHOLARSHIPS', teamId: team.id, level })}
              >
                {SCHOLARSHIP_LABEL[level]}
              </button>
            ))}
          </div>
          {team.scholarships !== 'none' && <span className="stat">{moneyShort(scholarshipCostFor(team.sport, team.scholarships))}/yr</span>}
        </div>
      )}
      <div className="team-card-meta">
        {(flagship || now > 0.05) && (
          <span title={`What the recruited classes add to the team: a class a year, up to +${decimal(perClass, 1)} each, built over ${RECRUITING_CLASSES} years to at most +${decimal(full)} on full scholarships${atComplex}, and lost a class a year when the money stops or the program is no longer a flagship.`}>
            recruiting <strong>+{decimal(now, 1)}</strong>{trend}
          </span>
        )}
        <span title={`The college's pull, up to +${COLLEGE_PULL_MAX}: +${decimal(pull.venue, 1)} from the venue's stage (its expansions) and +${decimal(pull.standing, 1)} from the student-life standing.`}>
          pull <strong>+{decimal(pull.total, 1)}</strong>
        </span>
      </div>
    </>
  );
}

// A program as a card in the list: the name and band, how it stands in its
// sport, what it costs and draws, its recruiting and its three chairs.
// Every program starts folded to its one line (Plan 95I, as Plan 76B
// folded the Curriculum's): the scoreboard, its quality, its band and its
// next action. It opens in place for the rest.
function TeamCard({ s, act, team, funding, rank }: {
  s: GameState; act: (a: Action) => void; team: VarsityTeam; funding?: ProgramFunding; rank?: number;
}) {
  const quality = teamQuality(team, s);
  const staffAnnual = (team.headCoach?.salary ?? 0) + (team.assistantCoach?.salary ?? 0) + (team.trainer?.salary ?? 0);
  const weeklyCost = team.upkeepPerWeek + staffAnnual / WEEKS_PER_YEAR;
  const venue = venueForCategory(s, team.venueCategory);
  // The house: attendance and what it earns at the gate.
  const attendance = attendanceFor(s, team);
  const gate = annualGateFor(s, team);
  const banned = team.postseasonBanThroughYear !== undefined && s.clock.year <= team.postseasonBanThroughYear;

  // A flagship wears a gold corner in place of its tag (Plan 90).
  const flagship = team.status === 'active' && funding?.band === 'flagship';
  const [collapsed, toggle] = useCollapse(`team:${team.id}`, true);
  const name = team.name.replace(/ Team$/, '');

  return (
    <div className={`team-card${flagship ? ' is-flagship' : ''}${collapsed ? ' collapsed' : ''}`}>
      {flagship && (
        <span className="team-card-corner" title="Flagship">
          <span aria-hidden="true">★</span>
          <span className="visually-hidden">Flagship</span>
        </span>
      )}
      <div className="team-card-head">
        <button type="button" className="collapse-toggle" aria-expanded={!collapsed} aria-label={`${collapsed ? 'Show' : 'Hide'} ${name}`} onClick={toggle}>
          {collapsed ? '▸' : '▾'}
        </button>
        {rank !== undefined && <span className="priority-rank" title="Drag to reorder">{rank}</span>}
        <span className="team-card-name">{name}</span>
        {!flagship && (
          <span className={`org-tag${funding ? ` band-${funding.band}` : ''}`}>
            {team.status !== 'active' ? 'awaiting venue' : funding ? BAND_LABEL[funding.band] : 'varsity'}
          </span>
        )}
        {collapsed && (
          <span className="team-card-line">
            {team.status === 'active' && <SportScore s={s} team={team} />}
            <span className="team-card-quality">quality <strong>{quality}</strong></span>
            <NextAction s={s} team={team} />
          </span>
        )}
      </div>
      {!collapsed && <>
        {banned && <span className="org-tag banned">postseason ban through {team.postseasonBanThroughYear}</span>}
        {team.status === 'active' && <SportLine s={s} team={team} />}
        <div className="team-card-meta">
          <span>quality <strong>{quality}</strong>
            {/* The slowdown above the knee (Plan 85D's review), said where the number is. */}
            {team.status === 'active' && teamQualityEarned(team, s) > quality && (
              <span className="team-held" title={teamSlowed(TEAM_QUALITY_KNEE, teamQualityEarned(team, s), quality, specializationOf(s))}> slowed</span>
            )}
          </span>
          <span>{team.status === 'active' ? venue?.name ?? 'venue' : `waiting on ${venue?.name ?? 'a venue'}`}</span>
          <span>{moneyShort(weeklyCost)}/wk</span>
          {funding && (
            <span title={`Takes ${money(funding.drawn)} of the ${money(funding.cost)}/yr it costs to compete`}>
              takes {moneyShort(funding.drawn)} of {moneyShort(funding.cost)}{funding.funded < 0.999 && funding.funded > 0 ? ` (${pct(funding.funded)})` : ''}
            </span>
          )}
          {team.status === 'active' && attendance > 0 && (
            <span title={`${money(gate)}/yr at the gate`}>{count(attendance)} a game · {moneyShort(gate)}/yr gate</span>
          )}
        </div>
        {team.status === 'active' && <Recruiting s={s} act={act} team={team} flagship={funding?.band === 'flagship'} />}
        {/* Three seats side by side, an open one dashed (Plan 90). */}
        <div className="team-card-staff" role="group" aria-label="Staff">
          {ROLE_ORDER.map((role) => <StaffSeat key={role} act={act} team={team} role={role} />)}
        </div>
      </>}
    </div>
  );
}

// The priority list: programs in the player's order, dragged, with the line
// drawn under the flagships. Only the order is dispatched; the bands are
// read back off the pot.
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
        <HelpHint text={`Drag a program up or down. The first ${pot.cap} are the flagships ${pot.cap > pot.baseCap ? `the ${s.orgs.athleticsBudget} subsidy and the Athletic Performance Complex allow` : `the ${s.orgs.athleticsBudget} subsidy allows`} — the line shows where they end. A flagship takes its sport's whole cost to compete from the department's fund and may carry a scholarship budget: some or full scholarships recruit a class a year, and over ${RECRUITING_CLASSES} years full ones build up to +${RECRUITING_FULL_LIFT}. Below the line a program takes at most ${pct(NON_FLAGSHIP_FUNDED_SHARE)} of its cost, in this order until the fund runs out: competitive while the money reaches it, developmental once it does not, which runs at a discount, not a zero. Dragging a flagship below the line is a real demotion: its head coach may resign rather than take the cut, and its recruiting falls away. Teams waiting on a venue sit out of the order and take nothing. A card's rank is its place in its sport, nationally: every college is reliably stronger at some sports than others, and the college's is the team's quality — its coaches, its funding, its recruiting, the college's pull and the Athletic Director — so hiring a coach moves it. ${teamLimitHelp(TEAM_QUALITY_KNEE, specializationOf(s))} Hover the rank for the colleges either side.`} />
      </div>
      {ordered.length === 0 ? (
        <div className="empty-note">
          {/* Before any team: the first sport club and what comes next. */}
          <p>No sport club has gone varsity yet. The path: a sport club forms on the Students tab, and after {VARSITY_PETITION_MIN_TENURE_YEARS} years it may petition to go varsity — a program budget, a shared venue for its sport, and a place on this list.</p>
          {s.orgs.clubs.filter((c) => c.sport !== null).length > 0 && (
            <ul className="org-list">
              {s.orgs.clubs.filter((c) => c.sport !== null).map((c) => {
                const year = varsityEligibleYear(c);
                return (
                  <li key={c.id} className="org-row">
                    <span className="org-name">{c.name}</span>
                    <span className="org-meta">{year <= s.clock.year ? 'may petition this year' : `may petition in Year ${year}`}</span>
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
              <Fragment key={team.id}>
                {lineHere && <li className="priority-slot wide"><div className="funded-line">flagships above · {pot.fundedLine} of {pot.cap}</div></li>}
                <li className="priority-slot">
                  <div
                    className={`priority-card${dragging === team.id ? ' dragging' : ''}${over === team.id ? ' over' : ''}`}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragging(team.id); }}
                    onDragEnd={() => { setDragging(null); setOver(null); }}
                    onDragOver={(e) => { e.preventDefault(); if (over !== team.id) setOver(team.id); }}
                    onDrop={(e) => { e.preventDefault(); drop(team.id); setDragging(null); setOver(null); }}
                  >
                    <TeamCard s={s} act={act} team={team} funding={funding} rank={i + 1} />
                  </div>
                </li>
              </Fragment>
            );
          })}
          {/* Teams waiting on a building: construction items, not programs,
              below the queue under a quiet divider. */}
          {awaiting.length > 0 && (
            <li className="priority-slot wide"><div className="funded-line awaiting-line">awaiting a venue · {awaiting.length}</div></li>
          )}
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
    <div className="tab-content athletics-layout">
      {/* The department and its trophies in a side column; the programs, each
          with its standing, and then the market fill the main one. */}
      <div className="athletics-side">
        <Department s={s} act={act} />
        <TrophyCase s={s} />
      </div>

      <div className="athletics-main">
        <PriorityList s={s} act={act} />

        {/* The market last: you notice an empty chair, then look for someone. */}
        {teams.length > 0 && <TheMarket s={s} act={act} />}
      </div>
    </div>
  );
}
