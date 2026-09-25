import { endowmentHalf } from '../systems/estate/projects';
import { useEffect, useState } from 'react';
import type { Action, CampusTool } from '../state/actions';
import type { Buildable, FacilityType, GameState } from '../state/types';
import { totalEnrolled } from '../state/types';
import { canStartDevelopment, hasFreeFacultySlot } from '../systems/techtree/techSystem';
import { awaitsSite } from '../state/campusMap';
import { FACILITY_CATEGORY_OF, type FacilityCategory, LIBRARY_TIER1_ID, nextLibraryFloor, nextVenueExpansion } from '../data/facilitiesData';
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
  AthleticsIcon, StudentLifeIcon, ToolsIcon,
} from './icons';
import { money, moneyShort } from '../format';
import { LOAN_RATE, LOAN_YEARS, financingFor, giftFunds, loanFor } from '../systems/finance/treasury';
import { constructionFrozen } from '../systems/finance/distress';

// The build menu: every physical building the university can have, as a
// row of category icons over a horizontal strip of building tiles. A wide
// band with no backdrop, so the map stays visible while choosing (see
// ToolbarPopup). Each tile arms a pickup the map resolves into
// PLACE_BUILDABLE when a tile is clicked (CampusMap.tsx's placeById).
//
// Locked Buildables are left off entirely rather than teased. Repeatable
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
  performingArtsCenter: 'Performing Arts Center',
  artGallery: 'Art Gallery',
  athleticsField: 'Multi-Sport Field',
  athleticsArena: 'Arena',
  athleticsDiamond: 'Diamond',
  athleticsNatatorium: 'Natatorium',
  footballStadium: 'Football Stadium',
  fieldHouse: 'Field House',
  landmark: 'Grand Landmark',
  amenity: 'Monuments & Gardens',
  project: 'Capital Projects',
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
// Grounds ride in the Campus Tools tab rather than a tab of their own.
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
  { key: 'hall', label: 'Academic Halls', repeatable: true, match: (t) => isAcademicHall(t) },
  { key: 'library', label: FACILITY_LABELS.library, repeatable: false, match: (t) => t.facilityType === 'library' },
  // Labs collapse like halls, but are independent (one per lab-gated major,
  // any order), so no "#N".
  { key: 'lab', label: FACILITY_LABELS.lab, repeatable: true, sequential: false, match: (t) => t.facilityType === 'lab' },
  // Social: the student center, the fitness chain, the two arts facilities.
  { key: 'studentCenter', label: FACILITY_LABELS.studentCenter, repeatable: false, match: (t) => t.facilityType === 'studentCenter' },
  {
    key: 'recCenter',
    label: 'Fitness',
    repeatable: true,
    match: (t) => t.facilityType === 'recCenter' || t.facilityType === 'gym' || t.facilityType === 'tennisCourts' || t.facilityType === 'pool',
  },
  { key: 'performingArtsCenter', label: FACILITY_LABELS.performingArtsCenter, repeatable: false, match: (t) => t.facilityType === 'performingArtsCenter' },
  { key: 'artGallery', label: FACILITY_LABELS.artGallery, repeatable: false, match: (t) => t.facilityType === 'artGallery' },
  { key: 'dorm', label: 'Housing', repeatable: true, match: (t) => t.kind === 'dorm' },
  // Greek chapter houses share the Housing tab but are their own group:
  // each belongs to a specific chapter, so no "#N" and no collapse.
  { key: 'chapterHouse', label: 'Chapter Houses', repeatable: false, match: (t) => !!t.chapterHouse },
  // The grocery folds into Dining: one more basicNeeds option.
  { key: 'diningHall', label: FACILITY_LABELS.diningHall, repeatable: true, match: (t) => t.facilityType === 'diningHall' || t.facilityType === 'grocery' },
  // The health chain is three differently named buildings upgraded in place,
  // so it keeps tier chips; the tab says "Health", the rungs name themselves.
  { key: 'healthCenter', label: FACILITY_LABELS.healthCenter, repeatable: false, match: (t) => t.facilityType === 'healthCenter' },
  // Varsity venues stay locked (so invisible) until a team needing them is
  // granted (facilitiesData.ts's athleticsVenueReveal, eventData.ts's
  // 'varsity-petition').
  { key: 'athleticsField', label: FACILITY_LABELS.athleticsField, repeatable: false, match: (t) => t.facilityType === 'athleticsField' },
  { key: 'athleticsArena', label: FACILITY_LABELS.athleticsArena, repeatable: false, match: (t) => t.facilityType === 'athleticsArena' },
  { key: 'athleticsDiamond', label: FACILITY_LABELS.athleticsDiamond, repeatable: false, match: (t) => t.facilityType === 'athleticsDiamond' },
  { key: 'athleticsNatatorium', label: FACILITY_LABELS.athleticsNatatorium, repeatable: false, match: (t) => t.facilityType === 'athleticsNatatorium' },
  { key: 'footballStadium', label: FACILITY_LABELS.footballStadium, repeatable: false, match: (t) => t.facilityType === 'footballStadium' },
  { key: 'fieldHouse', label: FACILITY_LABELS.fieldHouse, repeatable: false, match: (t) => t.facilityType === 'fieldHouse' },
  // Quads are grounds: they live in the Campus Tools tab beside the path and
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
  athletics: 'Athletics',
  housing: 'Housing',
};

// The build menu's tabs: campus tools first (always present), then one per
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
    { id: TOOLS_SECTION_ID, label: 'Campus Tools', kind: 'tools', groups: groups.filter((g) => GROUNDS_GROUP_KEYS.has(g.key)) },
    ...built,
  ];
}

// One icon per tab, keyed by section id. Missing entries fall back to the
// generic build glyph.
const SECTION_ICON: Record<string, () => React.JSX.Element> = {
  [TOOLS_SECTION_ID]: ToolsIcon,
  housing: HousingIcon,
  library: LibraryIcon,
  studentCenter: StudentLifeIcon,
  diningHall: DiningIcon,
  healthCenter: HealthIcon,
  quad: QuadIcon,
  lab: LabIcon,
  performingArtsCenter: ArtsIcon,
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
    case 'performingArtsCenter':
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
  if (t.facilityType === 'lab') return 'gates capstone coursework';
  if (t.kind === 'dorm') return `${(t.effects?.capacityBonus ?? 0).toLocaleString()} beds`;
  if (isAcademicHall(t)) return `${t.slots} program slots`;
  // Carries no `effects`: its beds were applied directly to capacity when
  // the petition was approved.
  if (t.chapterHouse) return `${CHAPTER_HOUSE_CAPACITY_BONUS.toLocaleString()} beds`;
  const flat = t.effects?.flatSatisfactionBonus;
  if (flat) return `+${flat} flat`;
  const serves = t.effects?.servesPopulation;
  if (serves) return `serves ${serves.toLocaleString()}`;
  return undefined;
}

// The same figure summed across a collapsed group, so collapsing hides nothing.
function builtGroupDetail(kind: string, built: Buildable[]): string | undefined {
  if (kind === 'dorm') {
    const beds = built.reduce((sum, t) => sum + (t.effects?.capacityBonus ?? 0), 0);
    return `${beds.toLocaleString()} beds`;
  }
  if (kind === 'hall') {
    const slots = built.reduce((sum, t) => sum + (t.slots ?? 0), 0);
    return `${slots} program slots`;
  }
  const serves = built.reduce((sum, t) => sum + (t.effects?.servesPopulation ?? 0), 0);
  return serves > 0 ? `serves ${serves.toLocaleString()}` : undefined;
}

// The corner chip: a tier for upgradeable buildings, a chain position for a
// sequential chain, nothing for one-of-a-kind types.
function rowMarker(t: Buildable, group: TypeGroup, index: number): string | undefined {
  if (t.tier !== undefined) return `Tier ${t.tier}`;
  if (group.repeatable && group.sequential !== false) return `#${index + 1}`;
  return undefined;
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
    const floorPlan = t.id === LIBRARY_TIER1_ID ? nextLibraryFloor(t) : null;
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
            : `Expands the ${t.name} in place — no new building. Adds ${rung.seatsGain.toLocaleString()} seats for the gate and ${rung.servesGain.toLocaleString()} of social capacity over ${rung.weeks} weeks; the teams keep playing while the work is underway.`}
          onClick={() => act({ type: 'EXPAND_VENUE', venueId: t.id })}
        >
          {marker && <span className="kind-tag">{marker}</span>}
          <span className="build-tile-icon"><Icon /></span>
          <span className="build-tile-name">{t.name}</span>
          {detail && <span className="build-tile-sub">{detail}</span>}
          <span className="build-tile-foot">expand · {money(rung.cost)} · {rung.weeks}w</span>
        </button>
      );
    }
    if (floorPlan) {
      const shortfall = floorPlan.cost - s.finance.cash;
      const frozen = constructionFrozen(s);
      return (
        <button
          type="button"
          className="build-tile available"
          disabled={shortfall > 0 || frozen}
          title={frozen ? 'The board has frozen construction; nothing new goes up until it lifts.' : shortfall > 0
            ? `${money(Math.ceil(shortfall))} short.`
            : `Renovates the existing library in place — no new building. Adds ${floorPlan.servesGain.toLocaleString()} seats over ${floorPlan.weeks} weeks; the library keeps serving its existing floors while the new one goes up.`}
          onClick={() => act({ type: 'RENOVATE_LIBRARY' })}
        >
          {marker && <span className="kind-tag">{marker}</span>}
          <span className="build-tile-icon"><Icon /></span>
          <span className="build-tile-name">{t.name}</span>
          {detail && <span className="build-tile-sub">{detail}</span>}
          <span className="build-tile-foot">add a story · {money(floorPlan.cost)} · {floorPlan.weeks}w</span>
        </button>
      );
    }
    return (
      <div className="build-tile done" title={detail ? `${t.name} · ${detail}` : t.name}>
        {marker && <span className="kind-tag">{marker}</span>}
        <span className="build-tile-icon"><Icon /></span>
        <span className="build-tile-name">{t.name}</span>
        <span className="build-tile-foot">✓ built{detail ? ` · ${detail}` : ''}</span>
      </div>
    );
  }

  // Built but not yet sited: Founders Hall in a guided founding (see
  // campusMap.ts's awaitsSite). The walkthrough's first step rings this
  // tile until the hall is picked up (see state/opening.ts).
  if (t.status === 'done') {
    const detail = builtDetail(t);
    const armed = placingId === t.id;
    const sitable = awaitsSite(s, t);
    const ringed = t.id === FOUNDERS_HALL_ID && s.events.opening.stage === 'site-hall' && !armed;
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
        {marker && <span className="kind-tag">{marker}</span>}
        <span className="build-tile-icon"><Icon /></span>
        <span className="build-tile-name">{t.name}</span>
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
        {marker && <span className="kind-tag">{marker}</span>}
        <span className="build-tile-icon"><Icon /></span>
        <span className="build-tile-name">{t.name}</span>
        <span className="build-tile-progress">
          <ProgressBar
            fraction={elapsed}
            label={`${weeksLeft}w`}
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
    ? `Borrows ${money(loan)}, repaid over ${LOAN_YEARS} years at ${LOAN_RATE * 100}%.`
    : constructionFrozen(s)
      ? 'The board has frozen construction.'
      : shortfall > 0
        ? `${money(Math.ceil(shortfall))} short.`
        : missingFaculty
          ? `No free ${t.requiresFaculty} slot.`
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
      {marker && <span className="kind-tag">{marker}</span>}
      <span className="build-tile-icon"><Icon /></span>
      <span className="build-tile-name">{t.name}</span>
      {detail && <span className="build-tile-sub">{detail}</span>}
      <span className="build-tile-foot">
        {armed
          ? 'placing…'
          // A chapter house is already paid for (cost and duration 0), so
          // say so rather than showing "0w".
          : t.cost === 0 && t.duration === 0
            ? 'already paid · place it'
            : <>{t.cost > 0 ? `${money(t.cost)} · ` : ''}{t.duration}w</>}
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
      <span className="kind-tag">×{built.length}</span>
      <span className="build-tile-icon"><Icon /></span>
      <span className="build-tile-name">{group.label}</span>
      <span className="build-tile-sub">{detail ? `built · ${detail}` : 'built'}</span>
      <span className="build-tile-foot">{open ? 'hide ▾' : 'show ▸'}</span>
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
    </>
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
    <div className="species-chips" role="group" aria-label="Which tree to plant">
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
        <span className="build-tile-icon"><DrawPathIcon /></span>
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
        <span className="build-tile-icon"><EraseIcon /></span>
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
        <span className="build-tile-icon"><TreeIcon /></span>
        <span className="build-tile-name">Plant trees</span>
        <span className="build-tile-foot">fills in tiles</span>
      </button>
      {pathTool === 'plant' && <SpeciesChips />}
      <button
        type="button"
        className={`build-tile tool ${pathTool === 'fell' ? 'placing' : ''}`}
        aria-pressed={pathTool === 'fell'}
        onClick={() => onSetPathTool('fell')}
        title="Fell trees — with either tree tool armed the right mouse button fells too, so this is for clearing a wood rather than a correction"
      >
        <span className="build-tile-icon"><EraseIcon /></span>
        <span className="build-tile-name">Fell trees</span>
        <span className="build-tile-foot">clear a wood</span>
      </button>
      {/* Quads are found on their own (state/quads.ts); this marks an open
          space the finder passed over. */}
      <button
        type="button"
        className={`build-tile tool ${pathTool === 'quad' ? 'placing' : ''}`}
        aria-pressed={pathTool === 'quad'}
        onClick={() => onSetPathTool('quad')}
        title="Mark the open space under a click as a quad, where the campus has not already made it one. It must be closed off from the edge of the campus. Click a quad on the map to name it or lift the mark."
      >
        <span className="build-tile-icon"><QuadIcon /></span>
        <span className="build-tile-name">Mark a quad</span>
        <span className="build-tile-foot">name an open space</span>
      </button>
      {/* Lamps and benches: free, on or beside a path, one a click. */}
      <button
        type="button"
        className={`build-tile tool ${pathTool === 'lamp' ? 'placing' : ''}`}
        aria-pressed={pathTool === 'lamp'}
        onClick={() => onSetPathTool('lamp')}
        title="Stand a lamp on or beside a path, one a click — the right mouse button lifts one. Free, like a path."
      >
        <span className="build-tile-icon"><DrawPathIcon /></span>
        <span className="build-tile-name">Lamps</span>
        <span className="build-tile-foot">beside a path</span>
      </button>
      <button
        type="button"
        className={`build-tile tool ${pathTool === 'bench' ? 'placing' : ''}`}
        aria-pressed={pathTool === 'bench'}
        onClick={() => onSetPathTool('bench')}
        title="Set a bench on or beside a path, facing along it, one a click — the right mouse button lifts one. Free, like a path."
      >
        <span className="build-tile-icon"><DrawPathIcon /></span>
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
  // Default to the first building tab, not tools. Sections are recomputed
  // every render; if the active tab has vanished (built out), fall back to
  // the first.
  const [activeId, setActiveId] = useState<string>(() => {
    const firstBuild = buildSections(s).find((sec) => sec.kind === 'build');
    return firstBuild?.id ?? TOOLS_SECTION_ID;
  });
  const active = sections.find((sec) => sec.id === activeId) ?? sections[0];

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
          <button type="button" className="newgame-btn" onClick={() => onArmPlacement(null)}>{BUILD_WORDS.putDown}</button>
        </div>
      </ToolbarPopup>
    );
  }

  return (
    <ToolbarPopup
      title="Build"
      onClose={onClose}
      className="build-popup"
      headExtra={<HelpHint text="Every building the college can have, grouped into categories along the top — pick a category to see its buildings as a row of tiles. Each tile shows what's built, what's under construction, and what's next available. Repeatable types (housing, dining, fitness) collapse what's already finished into one 'Built ×N' tile — click it for the individual halls. A facility serves a fixed share of the enrolled student body, so a bigger class raises the bar for campus life whether or not you've built it any beds — most students commute, and housing itself is its own need (see the Students tab's Housing attribute), not an admissions requirement. Anything not yet unlockable is left off rather than teased. Click a tile (or drag it onto the map) to pick a building up, then click an empty tile on the map to build it there; that's the moment the cost is charged and the countdown begins. The map stays visible behind this bar, so you can see where a building will land before you commit it." />}
    >
      <div className="build-mode">
        <div className="build-mode-topline">
          <span className="stat">{s.students.capacity.toLocaleString()} beds · {totalEnrolled(s.students).toLocaleString()} enrolled</span>
          <span className="stat">satisfaction {Math.round(s.students.satisfaction)}</span>
        </div>

        {constructionFrozen(s) && (
          <p className="stall-note">The board has frozen new construction until the college has run two surplus terms with cash in the bank.</p>
        )}
        {s.finance.cash < 0 && !constructionFrozen(s) && (
          <p className="stall-note">Cash is negative — the college is running an operating deficit, so nothing can be paid for from cash or a loan until the balance recovers. A building the campaign fund covers in full can still start.</p>
        )}

        <nav className="build-mode-tabs" aria-label="Build categories">
          {sections.map((sec) => {
            const Icon = SECTION_ICON[sec.id] ?? BuildIcon;
            const isActive = sec.id === active.id;
            // A tab carries the alert dot while it holds tiles the player
            // hasn't switched to it to see, computed per tab.
            const hasUnseen = sec.groups.some(
              (g) => g.items.some((t) => !s.seen.buildableIds[t.id]),
            );
            return (
              <button
                key={sec.id}
                type="button"
                className={`build-cat-tab ${isActive ? 'active' : ''}`}
                aria-pressed={isActive}
                title={sec.label}
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
