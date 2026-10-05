import { closedBySpecialization, endowmentHalf } from '../systems/estate/projects';
import { CLOSED_BUILD_WORDS } from '../data/specializationData';
import { SPECIALIZATION_MILESTONE_RANK, specializationOf } from '../systems/prestige/prestigeSystem';
import { useEffect, useState } from 'react';
import type { Action, CampusTool } from '../state/actions';
import type { Buildable, FacilityType, GameState } from '../state/types';
import { NEED_WORD } from '../data/needWords';
import { totalEnrolled } from '../state/types';
import { canStartDevelopment, hasFreeFacultySlot } from '../systems/techtree/techSystem';
import { awaitsSite } from '../state/campusMap';
import { foundersHallUnsited } from '../state/opening';
import { FACILITY_CATEGORY_OF, type FacilityCategory, nextVenueExpansion, REC_CENTER_TIER2_ID } from '../data/facilitiesData';
import { CHAPTER_HOUSE_CAPACITY_BONUS } from '../data/studentLifeData';
import { FOUNDERS_HALL_ID, isAcademicHall } from '../data/techData';
import HelpHint from './HelpHint';
import { BUILD_WORDS } from '../data/buildWords';
import { ProgressBar } from './Progress';
import ToolbarPopup from './ToolbarPopup';
import { setPlantingSpecies, usePlantingSpecies } from './plantingChoice';
import type { Species } from '../data/treeData';
import {
  DrawPathIcon, EraseIcon, BuildIcon, HousingIcon, DiningIcon, LibraryIcon,
  LabIcon, HealthIcon, QuadIcon, FitnessIcon, ArtsIcon, AcademicIcon, TreeIcon,
  AthleticsIcon, StudentLifeIcon, ToolsIcon, DisclosureIcon,
} from './icons';
import { count, money, moneyShort, pct, satisfactionFigure, weeksShort } from '../format';
import { LOAN_RATE, LOAN_YEARS, financingFor, giftFunds, loanFor } from '../systems/finance/treasury';
import { constructionFrozen } from '../systems/finance/distress';
import { offCampusPlaces } from '../systems/satisfaction/satisfactionSystem';
import { DOWNTOWN_WORDS } from '../data/downtownData';

// The build menu: every physical building the university can have, as a
// row of category icons over a horizontal strip of building tiles. A wide
// band with no backdrop, so the map stays visible while choosing (see
// ToolbarPopup). Each tile arms a pickup the map resolves into
// PLACE_BUILDABLE when a tile is clicked (CampusMap.tsx's placeById).
//
// Locked Buildables are left off entirely rather than teased, but for one
// kind: a specialization's own building that would be open but for the
// specialization (Plan 85F: the Research Park, once the labs have earned
// it, is the case the old game built for every college) shows closed at the
// end of the capital projects, saying why. Repeatable
// chains (housing, dining, fitness, halls, labs) collapse their finished
// instances into one "Built ×N" tile; distinct single buildings stay one tile
// each. Courses are absent: they are not places.

const FACILITY_LABELS: Record<FacilityType, string> = {
  library: 'Library',
  studentCenter: 'Student Center',
  diningHall: 'Dining',
  grocery: 'Grocery Store',
  recCenter: 'Recreation',
  healthCenter: 'Health',
  quad: 'Quad',
  lab: 'Labs',
  gym: 'Gym',
  tennisCourts: 'Tennis Courts',
  pool: 'Pool',
  artGallery: 'Art Gallery',
  athleticsField: 'Multi-Sport Field',
  athleticsArena: 'Arena',
  athleticsDiamond: 'Diamond',
  athleticsNatatorium: 'Natatorium',
  footballStadium: 'Football Stadium',
  fieldHouse: 'Field House',
  landmark: 'Grand landmark',
  amenity: 'Monuments & gardens',
  project: 'Capital projects',
};

// How many finished instances a repeatable group needs before they collapse;
// a single finished hall reads better as itself than as "1 built".
const COLLAPSE_BUILT_FROM = 2;

// FacilityCategory plus 'housing', this popup's merged dorm + chapter-house
// tab (neither is a FacilityType, so it doesn't belong on FacilityCategory).
type BuildCategory = FacilityCategory | 'housing';

// The 'building'-kind group carries the 'academic' category alongside
// the library and labs, which FACILITY_CATEGORY_OF already assigns by type.
const ACADEMIC_GROUP_KEYS: ReadonlySet<string> = new Set(['hall']);
// Grounds ride in the Grounds tab (the path and tree tools') rather than a
// tab of their own.
const GROUNDS_GROUP_KEYS: ReadonlySet<string> = new Set(['quad', 'landmark', 'amenity']);

interface TypeGroup {
  key: string;
  label: string;
  // Built instances collapse behind one "Built ×N" tile. Repeatable groups
  // number their tiles "#N" unless `sequential: false` (the labs).
  repeatable: boolean;
  sequential?: false;
  // From FACILITY_CATEGORY_OF (the single source for category membership),
  // plus housing and academic. Absent groups render as their own tab.
  category?: BuildCategory;
  items: Buildable[];
  // Shown closed after the items, never counted as visible (Plan 85F's
  // specialization buildings; projects.ts's closedBySpecialization).
  closed: Buildable[];
}

// One group per type. Shapes: repeatable sequential chains (dorm, dining,
// the recCenter chain of distinctly named facilities; see facilitiesData.ts
// above REC_CENTER_TIER1_ID); single buildings with tier upgrades (library,
// student center, health, quad); one-offs revealed by a major's tier-2
// coursework (performing arts, gallery; see MUSIC_TIER2_IDS /
// STUDIO_ART_TIER2_IDS); and independent multi-instance types (labs).
const TYPE_MATCHERS: Array<{ key: string; label: string; repeatable: boolean; sequential?: false; match: (t: Buildable) => boolean }> = [
  // The halls (Founders Hall, then techData.ts's chain) are one repeatable
  // sequential group. In a guided founding Founders Hall is 'done' but
  // unsited, which keeps it out of the collapse (see BuildGroupTiles) and
  // ringed for the walkthrough. Library and labs share the Academic tab.
  { key: 'hall', label: 'Academic halls', repeatable: true, match: (t) => isAcademicHall(t) },
  { key: 'library', label: FACILITY_LABELS.library, repeatable: false, match: (t) => t.facilityType === 'library' },
  // Labs collapse like halls, but are independent (one per lab-gated major,
  // any order), so no "#N".
  { key: 'lab', label: FACILITY_LABELS.lab, repeatable: true, sequential: false, match: (t) => t.facilityType === 'lab' },
  // Social: the student center, the Recreation Center, the arts
  // facilities. The gym, pool, tennis courts and Sports & Recreation Complex, which
  // feed health, sit with the health chain (Plans 80B and 80F).
  { key: 'studentCenter', label: FACILITY_LABELS.studentCenter, repeatable: false, match: (t) => t.facilityType === 'studentCenter' },
  { key: 'recCenter', label: FACILITY_LABELS.recCenter, repeatable: false, match: (t) => t.facilityType === 'recCenter' && t.id !== REC_CENTER_TIER2_ID },
  { key: 'artGallery', label: FACILITY_LABELS.artGallery, repeatable: false, match: (t) => t.facilityType === 'artGallery' },
  { key: 'dorm', label: 'Housing', repeatable: true, match: (t) => t.kind === 'dorm' },
  // Greek chapter houses share the Housing tab but are their own group:
  // each belongs to a specific chapter, so no "#N" and no collapse.
  { key: 'chapterHouse', label: 'Chapter houses', repeatable: false, match: (t) => !!t.chapterHouse },
  // The grocery folds into Dining: one more basicNeeds option.
  { key: 'diningHall', label: FACILITY_LABELS.diningHall, repeatable: true, match: (t) => t.facilityType === 'diningHall' || t.facilityType === 'grocery' },
  // The health chain is three differently named buildings upgraded in place,
  // so it keeps tier chips; the tab says "Health", the rungs name themselves.
  { key: 'healthCenter', label: FACILITY_LABELS.healthCenter, repeatable: false, match: (t) => t.facilityType === 'healthCenter' },
  // The fitness chain after it, in the same Health tab: gym, pool, tennis
  // courts and the Sports & Recreation Complex, strictly in order (facilitiesData.ts
  // above GYM_ID). Keyed by its first type, as the grocery rides under
  // 'diningHall'. The Sports & Recreation Complex is a recCenter by type (its art),
  // so it is matched by id.
  {
    key: 'gym',
    label: 'Fitness',
    repeatable: true,
    match: (t) => t.facilityType === 'gym' || t.facilityType === 'pool' || t.facilityType === 'tennisCourts' || t.id === REC_CENTER_TIER2_ID,
  },
  // Varsity venues stay locked (so invisible) until a team needing them is
  // granted (facilitiesData.ts's athleticsVenueReveal, eventData.ts's
  // 'varsity-petition').
  { key: 'athleticsField', label: FACILITY_LABELS.athleticsField, repeatable: false, match: (t) => t.facilityType === 'athleticsField' },
  { key: 'athleticsArena', label: FACILITY_LABELS.athleticsArena, repeatable: false, match: (t) => t.facilityType === 'athleticsArena' },
  { key: 'athleticsDiamond', label: FACILITY_LABELS.athleticsDiamond, repeatable: false, match: (t) => t.facilityType === 'athleticsDiamond' },
  { key: 'athleticsNatatorium', label: FACILITY_LABELS.athleticsNatatorium, repeatable: false, match: (t) => t.facilityType === 'athleticsNatatorium' },
  { key: 'footballStadium', label: FACILITY_LABELS.footballStadium, repeatable: false, match: (t) => t.facilityType === 'footballStadium' },
  { key: 'fieldHouse', label: FACILITY_LABELS.fieldHouse, repeatable: false, match: (t) => t.facilityType === 'fieldHouse' },
  // Quads are grounds: they live in the Grounds tab beside the path and
  // tree tools (GROUNDS_GROUP_KEYS), never a tab of their own.
  // The capital projects (Plan 33): a tab of their own.
  { key: 'project', label: FACILITY_LABELS.project, repeatable: false, match: (t) => t.facilityType === 'project' },
  { key: 'quad', label: FACILITY_LABELS.quad, repeatable: false, match: (t) => t.facilityType === 'quad' },
  // The grand landmarks ride with the grounds: three offered, one built.
  { key: 'landmark', label: FACILITY_LABELS.landmark, repeatable: false, match: (t) => t.facilityType === 'landmark' },
  { key: 'amenity', label: FACILITY_LABELS.amenity, repeatable: false, match: (t) => t.facilityType === 'amenity' },
];

// Every placeable id currently rendered as a tile: the build-menu alert
// badge's definition of "visible" (types.ts's SeenState). Derived from
// buildGroups so the two can never drift.
export function visibleBuildableIds(s: GameState): string[] {
  return buildGroups(s).flatMap((g) => g.items.map((t) => t.id));
}

// dorm and chapterHouse merge into one Housing tab. Neither is a FacilityType,
// so the pairing is named here rather than routed through FACILITY_CATEGORY_OF.
const HOUSING_GROUP_KEYS: ReadonlySet<string> = new Set(['dorm', 'chapterHouse']);

function buildGroups(s: GameState): TypeGroup[] {
  return TYPE_MATCHERS
    .map(({ key, label, repeatable, sequential, match }) => ({
      key,
      label,
      repeatable,
      sequential,
      // Most keys are the FacilityType they match; the rest have no entry in
      // FACILITY_CATEGORY_OF and so no category.
      category: (HOUSING_GROUP_KEYS.has(key) ? 'housing'
        : ACADEMIC_GROUP_KEYS.has(key) ? 'academic'
          : FACILITY_CATEGORY_OF[key as FacilityType]) as BuildCategory | undefined,
      items: s.tech.filter((t) => match(t) && t.status !== 'locked'),
      closed: key === 'project' ? s.tech.filter((t) => match(t) && closedBySpecialization(s, t)) : [],
    }))
    .filter((g) => g.items.length > 0);
}

// A run of consecutive same-category groups becomes one tab; everything else
// its own tab. Only adjacent groups merge, so a reordering degrades to more
// tabs rather than breaking.
interface RenderBlock {
  category?: BuildCategory;
  groups: TypeGroup[];
}

function blocksFor(groups: TypeGroup[]): RenderBlock[] {
  const blocks: RenderBlock[] = [];
  for (const g of groups) {
    const last = blocks[blocks.length - 1];
    if (g.category && last?.category === g.category) last.groups.push(g);
    else blocks.push({ category: g.category, groups: [g] });
  }
  return blocks;
}

const CATEGORY_LABELS: Record<BuildCategory, string> = {
  academic: 'Academic',
  social: 'Social',
  health: 'Health',
  athletics: 'Athletics',
  housing: 'Housing',
};

// The build menu's tabs: Grounds, the campus tools, first (always present;
// "Campus tools" until Plan 80B, its id kept), then one per
// RenderBlock. `id` is the block's category or its single group's key, which
// SECTION_ICON and the initial-tab logic look up.
type BuildSection =
  // The tools tab carries the grounds groups (the quads) as tiles beside
  // the path and tree tools.
  | { id: string; label: string; kind: 'tools'; groups: TypeGroup[] }
  | { id: string; label: string; kind: 'build'; groups: TypeGroup[] };

const TOOLS_SECTION_ID = 'campus-tools';

function buildSections(s: GameState): BuildSection[] {
  const groups = buildGroups(s);
  const blocks = blocksFor(groups.filter((g) => !GROUNDS_GROUP_KEYS.has(g.key)));
  const built: BuildSection[] = blocks.map((b) => b.category
    ? { id: b.category, label: CATEGORY_LABELS[b.category], kind: 'build', groups: b.groups }
    // A non-category block is always exactly one group (blocksFor only
    // merges same-category runs), so its lone group names the tab.
    : { id: b.groups[0].key, label: b.groups[0].label, kind: 'build', groups: b.groups });
  return [
    { id: TOOLS_SECTION_ID, label: 'Grounds', kind: 'tools', groups: groups.filter((g) => GROUNDS_GROUP_KEYS.has(g.key)) },
    ...built,
  ];
}

// The tab the menu opens on (Plan 92): Grounds, the first, except while
// Founders Hall waits for its ground; then the tab that holds it, where the
// walkthrough points (test/build-tab.test.ts).
export function initialBuildTab(s: GameState): string {
  return (foundersHallUnsited(s) ? buildTabOf(s, FOUNDERS_HALL_ID) : undefined) ?? TOOLS_SECTION_ID;
}

// The tab a Buildable is listed under, by section id (test/balance.test.ts).
export function buildTabOf(s: GameState, id: string): string | undefined {
  return buildSections(s).find((section) => section.groups.some((g) => g.items.some((t) => t.id === id)))?.id;
}

// One icon per tab, keyed by section id. Missing entries fall back to the
// generic build glyph.
const SECTION_ICON: Record<string, () => React.JSX.Element> = {
  [TOOLS_SECTION_ID]: ToolsIcon,
  housing: HousingIcon,
  library: LibraryIcon,
  studentCenter: StudentLifeIcon,
  diningHall: DiningIcon,
  health: HealthIcon,
  quad: QuadIcon,
  lab: LabIcon,
  artGallery: ArtsIcon,
  academic: AcademicIcon,
  athletics: AthleticsIcon,
  social: StudentLifeIcon,
};

// The glyph on an individual tile, so a category holding several venue types
// still gives each its own picture.
function iconForBuildable(t: Buildable): () => React.JSX.Element {
  if (t.kind === 'dorm' || t.chapterHouse) return HousingIcon;
  if (t.kind === 'building') return AcademicIcon;
  switch (t.facilityType) {
    case 'library': return LibraryIcon;
    case 'studentCenter': return StudentLifeIcon;
    case 'diningHall':
    case 'grocery': return DiningIcon;
    case 'healthCenter': return HealthIcon;
    case 'quad': return QuadIcon;
    case 'landmark': return AcademicIcon;
    case 'amenity': return QuadIcon;
    case 'lab': return LabIcon;
    case 'recCenter':
    case 'gym':
    case 'tennisCourts':
    case 'pool': return FitnessIcon;
    case 'artGallery': return ArtsIcon;
    case 'athleticsField':
    case 'athleticsArena':
    case 'athleticsDiamond':
    case 'athleticsNatatorium':
    case 'footballStadium':
    case 'fieldHouse': return AthleticsIcon;
    default: return BuildIcon;
  }
}

// What one finished instance is worth (beds, seats, slots).
function builtDetail(t: Buildable): string | undefined {
  if (t.facilityType === 'lab') return 'required for capstone courses';
  if (t.kind === 'dorm') return `${count(t.effects?.capacityBonus ?? 0)} beds`;
  if (isAcademicHall(t)) return `${t.slots} program slots`;
  // Carries no `effects`: its beds were applied directly to capacity when
  // the petition was approved.
  if (t.chapterHouse) return `${count(CHAPTER_HOUSE_CAPACITY_BONUS)} beds`;
  const flat = t.effects?.flatSatisfactionBonus;
  if (flat) return `+${flat} social life`;
  const serves = t.effects?.servesPopulation;
  // The need it serves (Plan 76C): the gym's number is health, not social.
  const need = t.effects?.satisfactionAttribute;
  if (serves) return `serves ${count(serves)}${need ? ` · ${NEED_WORD[need]}` : ''}`;
  return undefined;
}

// The same figure summed across a collapsed group, so collapsing hides nothing.
function builtGroupDetail(kind: string, built: Buildable[]): string | undefined {
  if (kind === 'dorm') {
    const beds = built.reduce((sum, t) => sum + (t.effects?.capacityBonus ?? 0), 0);
    return `${count(beds)} beds`;
  }
  if (kind === 'hall') {
    const slots = built.reduce((sum, t) => sum + (t.slots ?? 0), 0);
    return `${slots} program slots`;
  }
  const serves = built.reduce((sum, t) => sum + (t.effects?.servesPopulation ?? 0), 0);
  return serves > 0 ? `serves ${count(serves)}` : undefined;
}

// The stamp's chain position for a sequential chain; nothing for
// one-of-a-kind types, and nothing for a tiered building, whose level is
// LevelPips (Plan 90).
function rowMarker(t: Buildable, group: TypeGroup, index: number): string | undefined {
  if (t.tier !== undefined) return undefined;
  if (group.repeatable && group.sequential !== false) return `#${index + 1}`;
  return undefined;
}

// The tile's head (Plan 90): a strip of plan paper with the building's
// drawing on it, and the stamp ("#3", "BUILT", "×7 BUILT") in its corner.
function TilePlan({ Icon, stamp }: { Icon: () => React.JSX.Element; stamp?: string }) {
  return (
    <span className="build-tile-plan">
      <span className="build-tile-icon"><Icon /></span>
      {stamp && <span className="build-tile-stamp">{stamp}</span>}
    </span>
  );
}

// The highest tier its facility type reaches in the data, so a level reads
// out of the chain's length (the health chain's three, the library's one).
function maxTierOf(s: GameState, t: Buildable): number {
  return s.tech.reduce((max, other) => (other.facilityType === t.facilityType && other.tier !== undefined
    ? Math.max(max, other.tier) : max), t.tier ?? 0);
}

// A tiered building's level as pips (Plan 90): filled up to the level, out of
// the chain's top tier.
function LevelPips({ s, t }: { s: GameState; t: Buildable }) {
  const tier = t.tier;
  if (tier === undefined) return null;
  const of = maxTierOf(s, t);
  return (
    <span className="build-tile-level" role="img" aria-label={`Level ${tier} of ${of}`} title={`Level ${tier} of ${of}`}>
      {Array.from({ length: of }, (_, i) => <i key={i} className={i < tier ? 'on' : undefined} />)}
    </span>
  );
}

// One building as a tile: a button for anything the player can act on (arm a
// pickup, by click or by dragging onto the map), a plain div once done and
// placed. `act` is used only for in-place work on a done building: the
// library's "add a floor" and a venue expansion, which need no map click.
function BuildTile({
  s, t, marker, placingId, onArmPlacement, act,
}: {
  s: GameState; t: Buildable; marker?: string;
  placingId: string | null; onArmPlacement: (id: string | null) => void;
  act: (a: Action) => void;
}) {
  const Icon = iconForBuildable(t);
  const missingFaculty = !!(t.requiresFaculty && !hasFreeFacultySlot(s, t.requiresFaculty));

  // Done and placed: a static tile, unless the tier-1 library has a floor
  // left or a venue has an expansion left, which get an in-place offer.
  if (t.status === 'done' && t.id in s.placements) {
    const detail = builtDetail(t);
    // A venue rung: the same in-place offer, up to its expansions cap.
    const rung = t.athleticsVenueReveal ? nextVenueExpansion(t) : null;
    if (rung) {
      const shortfall = rung.cost - s.finance.cash;
      const frozen = constructionFrozen(s);
      return (
        <button
          type="button"
          className="build-tile available"
          disabled={shortfall > 0 || frozen}
          title={frozen ? 'The board has frozen construction; nothing new goes up until it lifts.' : shortfall > 0
            ? `${money(Math.ceil(shortfall))} short.`
            : `Expands the ${t.name} in place — no new building. Adds ${count(rung.seatsGain)} seats in the stands, and their prestige, at once, and ${count(rung.servesGain)} of social capacity when the ${rung.weeks} weeks of work are done; the teams keep playing while the work is under way.`}
          onClick={() => act({ type: 'EXPAND_VENUE', venueId: t.id })}
        >
          <TilePlan Icon={Icon} stamp={marker ? `${marker} BUILT` : 'BUILT'} />
          <span className="build-tile-name">{t.name}</span>
          <LevelPips s={s} t={t} />
          {detail && <span className="build-tile-sub">{detail}</span>}
          <span className="build-tile-foot">expand · {moneyShort(rung.cost)} · {weeksShort(rung.weeks)}</span>
        </button>
      );
    }
    return (
      <div className="build-tile done" title={detail ? `${t.name} · ${detail}` : t.name}>
        <TilePlan Icon={Icon} stamp={marker ? `${marker} BUILT` : 'BUILT'} />
        <span className="build-tile-name">{t.name}</span>
        <LevelPips s={s} t={t} />
        {detail && <span className="build-tile-sub">{detail}</span>}
      </div>
    );
  }

  // Built but not yet sited: Founders Hall in a guided founding (see
  // campusMap.ts's awaitsSite). Rung until the hall is picked up: by the
  // walkthrough's first step, or while a skipped walk holds the clock for it
  // (see state/opening.ts).
  if (t.status === 'done') {
    const detail = builtDetail(t);
    const armed = placingId === t.id;
    const sitable = awaitsSite(s, t);
    const ringed = t.id === FOUNDERS_HALL_ID && sitable && (s.events.opening.stage === 'site-hall' || s.events.opening.stage === 'play') && !armed;
    return (
      <button
        type="button"
        className={`build-tile available ${armed ? 'placing' : ''} ${ringed ? 'opening-target' : ''}`}
        disabled={!sitable}
        title={armed
          ? 'Click an empty tile on the map to site here, or click this again to cancel.'
          : 'The founding hall — pick it up, then click where it stands. No charge.'}
        draggable={sitable}
        onDragStart={(e) => {
          onArmPlacement(t.id);
          e.dataTransfer.setData('text/plain', t.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onClick={() => onArmPlacement(armed ? null : t.id)}
      >
        <TilePlan Icon={Icon} stamp={marker} />
        <span className="build-tile-name">{t.name}</span>
        <LevelPips s={s} t={t} />
        {detail && <span className="build-tile-sub">{detail}</span>}
        <span className="build-tile-foot">{armed ? 'placing…' : 'site · no charge'}</span>
      </button>
    );
  }

  if (t.status === 'developing') {
    const weeksLeft = s.developing[t.id] ?? 0;
    const elapsed = t.duration > 0 ? (t.duration - weeksLeft) / t.duration : 1;
    return (
      <div className="build-tile developing" title={`${t.name} · ${t.duration - weeksLeft} of ${t.duration} weeks built`}>
        <TilePlan Icon={Icon} stamp={marker} />
        <span className="build-tile-name">{t.name}</span>
        <LevelPips s={s} t={t} />
        <span className="build-tile-progress">
          <ProgressBar
            fraction={elapsed}
            label={weeksShort(weeksLeft)}
            title={`${t.duration - weeksLeft} of ${t.duration} weeks built`}
          />
        </span>
      </div>
    );
  }

  // Available. Enabled exactly when canStartDevelopment (the reducer's own
  // PLACE_BUILDABLE gate) allows it, paid in cash or with a loan. Clicking only arms the pickup; dragging
  // onto the map arms and drops in one gesture.
  const shortfall = t.cost - s.finance.cash;
  // Paid from building gifts when they cover it; short of cash, a building
  // can be borrowed for (finance/treasury.ts).
  const financing = financingFor((f) => canStartDevelopment(s, t, undefined, f));
  const loan = financing === 'loan' ? loanFor(s, t.cost) : 0;
  const disabledReason = financing === 'gift'
    ? `Paid from ${money(giftFunds(s))} raised for buildings.`
    : financing === 'endowment'
    ? `Half, ${money(endowmentHalf(t))}, from the endowment; the rest in cash.`
    : loan > 0
    ? `Borrows ${money(loan)}, repaid over ${LOAN_YEARS} years at ${pct(LOAN_RATE, 1)}.`
    : constructionFrozen(s)
      ? 'The board has frozen construction.'
      : shortfall > 0
        ? `${money(Math.ceil(shortfall))} short.`
        : missingFaculty
          ? `Needs ${t.requiresFaculty} faculty.`
          : undefined;
  const startable = financing !== null;
  const armed = placingId === t.id;
  const detail = builtDetail(t);
  return (
    <button
      type="button"
      className={`build-tile available ${armed ? 'placing' : ''}`}
      disabled={!startable}
      title={armed ? 'Click an empty tile on the map to build here, or click this again to cancel.' : disabledReason}
      draggable={startable}
      onDragStart={(e) => {
        onArmPlacement(t.id);
        e.dataTransfer.setData('text/plain', t.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onArmPlacement(armed ? null : t.id)}
    >
      <TilePlan Icon={Icon} stamp={marker} />
      <span className="build-tile-name">{t.name}</span>
      <LevelPips s={s} t={t} />
      {detail && <span className="build-tile-sub">{detail}</span>}
      <span className="build-tile-foot">
        {armed
          ? 'placing…'
          // A chapter house is already paid for (cost and duration 0), so
          // say so rather than showing "0w".
          : t.cost === 0 && t.duration === 0
            ? 'already paid · place it'
            : <>{t.cost > 0 ? `${moneyShort(t.cost)} · ` : ''}{weeksShort(t.duration)}</>}
      </span>
      {loan > 0 && !armed && <span className="build-tile-note">borrow {moneyShort(loan)}</span>}
      {financing === 'gift' && !armed && t.cost > 0 && <span className="build-tile-note">from gifts</span>}
      {t.requiresFaculty && <span className="build-tile-note">needs {t.requiresFaculty}</span>}
    </button>
  );
}

// The collapsed stand-in for a repeatable group's finished instances: count
// and total, expanding the built tiles inline (open state lives in the parent).
function BuiltSummaryTile({ group, built, open, onToggle }: {
  group: TypeGroup; built: Buildable[]; open: boolean; onToggle: () => void;
}) {
  const detail = builtGroupDetail(group.key, built);
  const Icon = iconForBuildable(built[0]);
  return (
    <button
      type="button"
      className="build-tile done built-summary"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? `Hide the ${group.label.toLowerCase()} already built` : `List the ${group.label.toLowerCase()} already built`}
      title={detail ? `${built.length} built · ${detail}` : `${built.length} built`}
    >
      <TilePlan Icon={Icon} stamp={`×${built.length} BUILT`} />
      <span className="build-tile-name">{group.label}</span>
      {detail && <span className="build-tile-sub">{detail}</span>}
      <span className="build-tile-foot">{open ? 'Hide' : 'Show'} <DisclosureIcon open={open} /></span>
    </button>
  );
}

// One group's tiles. A 'done' item not yet on the map stays out of the
// collapse (it still has a decision); the rest collapse behind
// BuiltSummaryTile from COLLAPSE_BUILT_FROM.
function BuildGroupTiles({ s, group, placingId, onArmPlacement, act }: {
  s: GameState; group: TypeGroup; placingId: string | null; onArmPlacement: (id: string | null) => void;
  act: (a: Action) => void;
}) {
  const [open, setOpen] = useState(false);
  // Chain position is read before the built/unbuilt split (visible items are
  // a prefix of the chain), so a tile's #N never shifts as the group collapses.
  const numbered = group.items.map((t, index) => ({ t, marker: rowMarker(t, group, index) }));
  const done = numbered.filter(({ t }) => t.status === 'done');
  const awaitingSiting = done.filter(({ t }) => !(t.id in s.placements));
  const built = done.filter(({ t }) => t.id in s.placements);
  const rest = numbered.filter(({ t }) => t.status !== 'done');
  const collapseBuilt = group.repeatable && built.length >= COLLAPSE_BUILT_FROM;

  return (
    <>
      {awaitingSiting.map(({ t, marker }) => (
        <BuildTile key={t.id} s={s} t={t} marker={marker} placingId={placingId} onArmPlacement={onArmPlacement} act={act} />
      ))}
      {collapseBuilt
        ? (
          <>
            <BuiltSummaryTile group={group} built={built.map(({ t }) => t)} open={open} onToggle={() => setOpen((v) => !v)} />
            {open && built.map(({ t, marker }) => (
              <BuildTile key={t.id} s={s} t={t} marker={marker} placingId={placingId} onArmPlacement={onArmPlacement} act={act} />
            ))}
          </>
        )
        : built.map(({ t, marker }) => (
          <BuildTile key={t.id} s={s} t={t} marker={marker} placingId={placingId} onArmPlacement={onArmPlacement} act={act} />
        ))}
      {rest.map(({ t, marker }) => (
        <BuildTile key={t.id} s={s} t={t} marker={marker} placingId={placingId} onArmPlacement={onArmPlacement} act={act} />
      ))}
      {group.closed.map((t) => <ClosedTile key={t.id} s={s} t={t} />)}
    </>
  );
}

// A specialization's own building the college may not build (Plan 85F):
// a closed tile with the reason, never armed.
function ClosedTile({ s, t }: { s: GameState; t: Buildable }) {
  const Icon = iconForBuildable(t);
  const pillar = t.project!.specialization!;
  const why = CLOSED_BUILD_WORDS.why(t.name, pillar, specializationOf(s), SPECIALIZATION_MILESTONE_RANK);
  return (
    <button type="button" className="build-tile available closed" disabled title={why} aria-label={`${t.name}: ${why}`}>
      <TilePlan Icon={Icon} />
      <span className="build-tile-name">{t.name}</span>
      <span className="build-tile-sub">{CLOSED_BUILD_WORDS.sub(pillar)}</span>
      <span className="build-tile-foot">{CLOSED_BUILD_WORDS.foot}</span>
    </button>
  );
}

// Draw path / erase path / trees: campus-editing tools as tiles in their own
// tab. `pathTool` is lifted to App.tsx.

// Which tree the plant tool plants (Plan 37, from v2's): whatever grows,
// or one kind. A row under the tile while the tool is armed.
const SPECIES_CHIPS: readonly { id: Species | null; label: string }[] = [
  { id: null, label: 'Whatever grows' },
  { id: 'canopy', label: 'Broadleaf' },
  { id: 'conifer', label: 'Conifer' },
  { id: 'ornamental', label: 'Ornamental' },
];
function SpeciesChips() {
  const chosen = usePlantingSpecies();
  return (
    <div className="species-chips segmented" role="group" aria-label="Which tree to plant">
      {SPECIES_CHIPS.map((c) => (
        <button
          key={c.label}
          type="button"
          className={`species-chip ${chosen === c.id ? 'active' : ''}`}
          aria-pressed={chosen === c.id}
          onClick={() => setPlantingSpecies(c.id)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
function CampusToolsTiles({ s, pathTool, onSetPathTool, groups, placingId, onArmPlacement, act }: {
  s: GameState;
  pathTool: CampusTool | null;
  onSetPathTool: (mode: CampusTool) => void;
  // The grounds groups (the quads), laid out as tiles after the tools.
  groups: TypeGroup[];
  placingId: string | null; onArmPlacement: (id: string | null) => void; act: (a: Action) => void;
}) {
  return (
    <div className="build-tile-row">
      <button
        type="button"
        className={`build-tile tool ${pathTool === 'draw' ? 'placing' : ''}`}
        aria-pressed={pathTool === 'draw'}
        onClick={() => onSetPathTool('draw')}
        title="Draw a pathway by filling in tiles — P on the map does the same, and the right mouse button erases while either tool is armed"
      >
        <TilePlan Icon={DrawPathIcon} />
        <span className="build-tile-name">Draw path</span>
        <span className="build-tile-foot">fills in tiles · P</span>
      </button>
      <button
        type="button"
        className={`build-tile tool ${pathTool === 'erase' ? 'placing' : ''}`}
        aria-pressed={pathTool === 'erase'}
        onClick={() => onSetPathTool('erase')}
        title="Erase a drawn pathway — with either tool armed the right mouse button erases too, so this is for a long clearing pass rather than a correction"
      >
        <TilePlan Icon={EraseIcon} />
        <span className="build-tile-name">Erase path</span>
        <span className="build-tile-foot">remove a path</span>
      </button>
      {/* Trees: planted and felled by tile with the path tools' stroke and
          right-button opposite. Free, like a path. */}
      <button
        type="button"
        className={`build-tile tool ${pathTool === 'plant' ? 'placing' : ''}`}
        aria-pressed={pathTool === 'plant'}
        onClick={() => onSetPathTool('plant')}
        title="Plant trees by filling in tiles — the right mouse button fells while either tree tool is armed. Nothing is planted under a building or a path."
      >
        <TilePlan Icon={TreeIcon} />
        <span className="build-tile-name">Plant trees</span>
        <span className="build-tile-foot">fills in tiles</span>
      </button>
      {pathTool === 'plant' && <SpeciesChips />}
      <button
        type="button"
        className={`build-tile tool ${pathTool === 'fell' ? 'placing' : ''}`}
        aria-pressed={pathTool === 'fell'}
        onClick={() => onSetPathTool('fell')}
        title="Fell trees — with either tree tool armed the right mouse button fells too, so this is for clearing woodland rather than a correction"
      >
        <TilePlan Icon={EraseIcon} />
        <span className="build-tile-name">Fell trees</span>
        <span className="build-tile-foot">clear woodland</span>
      </button>
      {/* Lamps and benches: free, on or beside a path, one a click. */}
      <button
        type="button"
        className={`build-tile tool ${pathTool === 'lamp' ? 'placing' : ''}`}
        aria-pressed={pathTool === 'lamp'}
        onClick={() => onSetPathTool('lamp')}
        title="Stand a lamp on or beside a path, one a click — the right mouse button lifts one. Free, like a path."
      >
        <TilePlan Icon={DrawPathIcon} />
        <span className="build-tile-name">Lamps</span>
        <span className="build-tile-foot">beside a path</span>
      </button>
      <button
        type="button"
        className={`build-tile tool ${pathTool === 'bench' ? 'placing' : ''}`}
        aria-pressed={pathTool === 'bench'}
        onClick={() => onSetPathTool('bench')}
        title="Set a bench on or beside a path, one a click: it faces the path, and R turns it before it is set. The right mouse button lifts one. Free, like a path."
      >
        <TilePlan Icon={DrawPathIcon} />
        <span className="build-tile-name">Benches</span>
        <span className="build-tile-foot">beside a path</span>
      </button>
      {groups.map((group) => (
        <BuildGroupTiles key={group.key} s={s} group={group} placingId={placingId} onArmPlacement={onArmPlacement} act={act} />
      ))}
    </div>
  );
}

export default function BuildPopup({
  s, act, placingId, onArmPlacement, pathTool, onSetPathTool, onClose,
}: {
  s: GameState;
  // Reports which buildable ids the player has seen (SeenState), and
  // dispatches the in-place renovations from BuildTile.
  act: (a: Action) => void;
  // The picked-up Buildable, lifted to App.tsx. PLACE_BUILDABLE fires from
  // the map, so the popup stays open across that click.
  placingId: string | null;
  onArmPlacement: (id: string | null) => void;
  pathTool: CampusTool | null;
  onSetPathTool: (mode: CampusTool) => void;
  onClose: () => void;
}) {
  const sections = buildSections(s);
  // Sections are recomputed every render; if the active tab has vanished
  // (built out), fall back to the first.
  const [activeId, setActiveId] = useState<string>(() => initialBuildTab(s));
  const active = sections.find((sec) => sec.id === activeId) ?? sections[0];
  // The downtown's beds (Plan 85H), beside the campus's.
  const offCampusBeds = offCampusPlaces(s, 'housing');

  // The alert badge's other half: marks unseen tiles in the active tab only
  // seen, since switching to a tab is what "seeing" it means. The tools tab
  // counts too (its quads are tiles like any other).
  const activeUnseenIds = active.groups.flatMap((g) => g.items.filter((t) => !s.seen.buildableIds[t.id]).map((t) => t.id));
  const activeUnseenKey = activeUnseenIds.join('|');
  useEffect(() => {
    if (activeUnseenIds.length > 0) act({ type: 'MARK_SEEN', kind: 'buildable', ids: activeUnseenIds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUnseenKey]);

  // A building in hand (Plan 34, from v2's): the menu folds to a strip along
  // the toolbar, so the ghost and the ground it is going on are never under
  // it. Escape puts it down (App.tsx's ladder), before it closes the menu.
  const held = placingId ? s.tech.find((t) => t.id === placingId) : undefined;
  if (held) {
    const financing = held.status === 'done' ? 'cash' : financingFor((f) => canStartDevelopment(s, held, undefined, f));
    return (
      <ToolbarPopup title="Build" onClose={onClose} className="build-popup holding">
        <div className="build-holding">
          <span className="build-holding-name">
            {BUILD_WORDS.holding
              .replace('{building}', held.name)
              .replace('{cost}', money(held.status === 'done' ? 0 : held.cost))
              .replace('{pay}', BUILD_WORDS.pay[financing ?? 'none'])}
          </span>
          <span className="build-holding-keys">{BUILD_WORDS.holdingKeys}</span>
          <button type="button" className="menu-btn btn-quiet" onClick={() => onArmPlacement(null)}>{BUILD_WORDS.putDown}</button>
        </div>
      </ToolbarPopup>
    );
  }

  return (
    <ToolbarPopup
      title="Build"
      onClose={onClose}
      className="build-popup"
      headExtra={<HelpHint text="Every building the college can have, grouped into categories along the top — pick a category to see its buildings as a row of tiles. A red exclamation mark on a category means something new to build there, a building the college has not yet looked at; it clears once the category is opened. Each tile shows what is built, what is under construction and what is next available. Repeatable types (housing, dining, fitness) collapse what is already finished into one tile stamped '×N built' — click it for the individual halls. A facility serves a fixed number of students, and each need grows with enrollment, so a bigger class raises the bar for campus life whether or not the college has built it any beds — most students commute, and housing is its own need (see the Students tab's Housing need), not an admissions requirement, though beds widen the applicant pool up to 2,500 of them. Buildings the college cannot build yet are not listed. Click a tile (or drag it onto the map) to pick a building up, then click an empty tile on the map to build it there; that is the moment the cost is charged and the countdown begins. The map stays visible behind this bar, so you can see where a building will land before you commit it." />}
    >
      <div className="build-mode">
        <div className="build-mode-topline">
          <span className="stat">
            {count(s.students.capacity)} beds{offCampusBeds > 0 && <span title={DOWNTOWN_WORDS.offCampusHint}> · {DOWNTOWN_WORDS.offCampusBeds(count(offCampusBeds))}</span>} · {count(totalEnrolled(s.students))} enrolled
          </span>
          <span className="stat">satisfaction {satisfactionFigure(s.students.satisfaction)}</span>
        </div>

        {constructionFrozen(s) && (
          <p className="stall-note">The board has frozen new construction until the college has run two surplus terms with cash in the bank.</p>
        )}
        {s.finance.cash < 0 && !constructionFrozen(s) && (
          <p className="stall-note">Cash is negative — the college is running an operating deficit, so nothing can be paid for from cash or a loan until the balance recovers. A building the campaign fund covers in full can still start.</p>
        )}

        <nav className="build-mode-tabs segmented" aria-label="Build categories">
          {sections.map((sec) => {
            const Icon = SECTION_ICON[sec.id] ?? BuildIcon;
            const isActive = sec.id === active.id;
            // The "!" has one meaning, "something new to build here" (Plan
            // 78F): the category holds a tile the player has not seen,
            // because the category has not been opened since it appeared.
            // Opening it marks its tiles seen (the effect above).
            const hasUnseen = sec.groups.some(
              (g) => g.items.some((t) => !s.seen.buildableIds[t.id]),
            );
            return (
              <button
                key={sec.id}
                type="button"
                className={`build-cat-tab ${isActive ? 'active' : ''}`}
                aria-pressed={isActive}
                title={hasUnseen ? `${sec.label}: something new to build here` : sec.label}
                onClick={() => setActiveId(sec.id)}
              >
                <Icon />
                <span className="build-cat-label">{sec.label}</span>
                {hasUnseen && <span className="alert-badge" aria-hidden="true">!</span>}
              </button>
            );
          })}
        </nav>

        <div className="build-mode-tray">
          {active.kind === 'tools'
            ? <CampusToolsTiles s={s} pathTool={pathTool} onSetPathTool={onSetPathTool} groups={active.groups} placingId={placingId} onArmPlacement={onArmPlacement} act={act} />
            : (
              <div className="build-tile-row">
                {active.groups.map((group) => (
                  <BuildGroupTiles key={group.key} s={s} group={group} placingId={placingId} onArmPlacement={onArmPlacement} act={act} />
                ))}
              </div>
            )}
        </div>
      </div>
    </ToolbarPopup>
  );
}
