import { useState } from 'react';
import type { Buildable, FacilityType, GameState } from '../state/types';
import { totalEnrolled } from '../state/types';
import { canStartDevelopment, hasFreeFacultySlot } from '../systems/techtree/techSystem';
import { canSiteRetroactively, RETROACTIVE_SITING_COST } from '../state/campusMap';
import { FACILITY_CATEGORY_OF, type FacilityCategory } from '../data/facilitiesData';
import HelpHint from './HelpHint';
import { ProgressBar } from './Progress';
import ToolbarPopup from './ToolbarPopup';
import {
  DrawPathIcon, EraseIcon, BuildIcon, HousingIcon, DiningIcon, LibraryIcon,
  LabIcon, HealthIcon, QuadIcon, FitnessIcon, ArtsIcon, AcademicIcon,
  AthleticsIcon, StudentLifeIcon, ToolsIcon,
} from './icons';

// The build menu: every physical building the university can have —
// housing, campus-life facilities, academic buildings, and labs. It used to
// sit in a permanent side rail (C2 folded that into a compact popup), and it
// used to read as one long VERTICAL list of text rows. This lays it out the
// way a city-builder's build bar does instead: a horizontal row of category
// "menu icons" across the top, and the buildings of the picked category as a
// horizontal strip of icon TILES below — so the different things you can put
// on campus are seen side by side, at a glance, rather than scrolled past
// one line at a time. The popup deliberately stays a wide band that leaves
// the map visible above it (see ToolbarPopup's module comment for why it
// carries no backdrop): choosing a building while still seeing where it will
// go is the whole point of the one-step placement flow.
//
// This is still "what to build" to the map's "where it goes": every tile
// here arms a pickup that the map resolves into an actual PLACE_BUILDABLE
// once a tile on the map is clicked (see CampusMap.tsx's placeById), exactly
// as the old text rows did — the presentation changed, not the flow.
//
// Each category lists the Buildables of its type(s) that aren't 'locked'. A
// locked Buildable (its prereqs or a population/prestige gate unmet) is left
// off entirely rather than teased — nothing to decide about it yet.
//
// REPEATABLE types (housing, dining, fitness — the sequential chains in
// campusData.ts/facilitiesData.ts) would otherwise grow an ever-longer strip
// of finished halls with nothing to decide about. So their finished
// instances COLLAPSE into a single "Built ×N" tile — a count, the total they
// contribute, and their names one click away — leaving the developing/
// available rung on its own. Types where each instance is a distinct
// decision (labs, academic buildings) and single buildings with tier
// upgrades stay listed one tile per instance.
//
// Courses are deliberately absent: they are not places, so they live in the
// Curriculum view rather than beside the map.

const FACILITY_LABELS: Record<FacilityType, string> = {
  library: 'Library',
  studentCenter: 'Student Center',
  diningHall: 'Dining',
  recCenter: 'Recreation',
  healthCenter: 'Health & Counseling',
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
};

// How many finished instances a repeatable group must have before its
// built tiles collapse into one. Below this there is nothing to tidy: a
// single finished hall reads better as itself than as "1 built".
const COLLAPSE_BUILT_FROM = 2;

interface TypeGroup {
  key: string;
  label: string;
  repeatable: boolean;
  // Set only for the facility types FACILITY_CATEGORY_OF (facilitiesData.ts)
  // names — the single source for "which types are athletics vs recreation"
  // — so this is a lookup, never a second authoring of that line. Absent
  // for every other group (housing, library, labs, academic buildings, ...),
  // which render as their own standalone category tab.
  category?: FacilityCategory;
  items: Buildable[];
}

// One group per type. dorm/dining are repeatable sequential chains
// (see campusData.ts/facilitiesData.ts) — several finish over a run, so
// their built tiles collapse. library/studentCenter/healthCenter/quad are
// single buildings with tier upgrades: at most two tiles ever, each a
// genuinely different building. performingArtsCenter/artGallery are also
// single-instance, but one-off (no tier field, no upgrade) — exactly one
// tile each, forever, hidden until the Arts & Media school clears their
// shared gate (see facilitiesData.ts's ARTS_MEDIA_BUILDING_ID). recCenter
// now covers a FIFTH shape: a repeatable, strictly sequential chain like
// housing/dining, but of distinctly-named one-off facilities (Recreation
// Center, Gym & Fitness Center, Swimming Pool, Tennis Courts, Athletics
// Complex) rather than N copies of one generic thing — see
// facilitiesData.ts's own note above REC_CENTER_TIER1_ID. lab and academic
// building are independent multi-instance types (one per lab-gated major /
// one per school) — several can be visible at once, but each is its own
// decision, so they stay listed.
const TYPE_MATCHERS: Array<{ key: string; label: string; repeatable: boolean; match: (t: Buildable) => boolean }> = [
  { key: 'dorm', label: 'Housing', repeatable: true, match: (t) => t.kind === 'dorm' },
  { key: 'library', label: FACILITY_LABELS.library, repeatable: false, match: (t) => t.facilityType === 'library' },
  { key: 'studentCenter', label: FACILITY_LABELS.studentCenter, repeatable: false, match: (t) => t.facilityType === 'studentCenter' },
  { key: 'diningHall', label: FACILITY_LABELS.diningHall, repeatable: true, match: (t) => t.facilityType === 'diningHall' },
  { key: 'healthCenter', label: FACILITY_LABELS.healthCenter, repeatable: false, match: (t) => t.facilityType === 'healthCenter' },
  { key: 'quad', label: FACILITY_LABELS.quad, repeatable: false, match: (t) => t.facilityType === 'quad' },
  { key: 'lab', label: FACILITY_LABELS.lab, repeatable: false, match: (t) => t.facilityType === 'lab' },
  // The recreation/fitness chain — see the module note above. Positioned
  // right before performingArtsCenter/artGallery so all three share one
  // contiguous run in TYPE_MATCHERS, which is what makes blocksFor wrap
  // them in a single "Recreation" category (see FACILITY_CATEGORY_OF).
  {
    key: 'recCenter',
    label: 'Fitness',
    repeatable: true,
    match: (t) => t.facilityType === 'recCenter' || t.facilityType === 'gym' || t.facilityType === 'tennisCourts' || t.facilityType === 'pool',
  },
  { key: 'performingArtsCenter', label: FACILITY_LABELS.performingArtsCenter, repeatable: false, match: (t) => t.facilityType === 'performingArtsCenter' },
  { key: 'artGallery', label: FACILITY_LABELS.artGallery, repeatable: false, match: (t) => t.facilityType === 'artGallery' },
  // Varsity athletics venues: locked (and so invisible, per the rule above)
  // until a team needing the category is granted — see
  // facilitiesData.ts's athleticsVenueReveal and eventData.ts's
  // 'varsity-petition'. One-off, same shape as the recreational trio above.
  { key: 'athleticsField', label: FACILITY_LABELS.athleticsField, repeatable: false, match: (t) => t.facilityType === 'athleticsField' },
  { key: 'athleticsArena', label: FACILITY_LABELS.athleticsArena, repeatable: false, match: (t) => t.facilityType === 'athleticsArena' },
  { key: 'athleticsDiamond', label: FACILITY_LABELS.athleticsDiamond, repeatable: false, match: (t) => t.facilityType === 'athleticsDiamond' },
  { key: 'athleticsNatatorium', label: FACILITY_LABELS.athleticsNatatorium, repeatable: false, match: (t) => t.facilityType === 'athleticsNatatorium' },
  { key: 'footballStadium', label: FACILITY_LABELS.footballStadium, repeatable: false, match: (t) => t.facilityType === 'footballStadium' },
  { key: 'academicBuilding', label: 'Academic Buildings', repeatable: false, match: (t) => t.kind === 'building' },
];

function buildGroups(s: GameState): TypeGroup[] {
  return TYPE_MATCHERS
    .map(({ key, label, repeatable, match }) => ({
      key,
      label,
      repeatable,
      // Most TYPE_MATCHERS keys ARE the FacilityType they match (gym,
      // athleticsField, ...) — the lookup below is a no-op for the ones
      // that aren't (dorm, academicBuilding, lab, ...), which simply have
      // no entry in FACILITY_CATEGORY_OF and so no category.
      category: FACILITY_CATEGORY_OF[key as FacilityType],
      items: s.tech.filter((t) => match(t) && t.status !== 'locked'),
    }))
    .filter((g) => g.items.length > 0);
}

// A run of consecutive groups sharing the same category becomes one category
// tab (Athletics, Recreation); everything else becomes its own tab. This
// only ever MERGES adjacent same-category groups, so a future reordering
// degrades to more (smaller) tabs rather than breaking.
interface RenderBlock {
  category?: FacilityCategory;
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

const CATEGORY_LABELS: Record<FacilityCategory, string> = {
  athletics: 'Athletics',
  recreation: 'Recreation',
};

// The build menu's category tabs (see BuildSection below): the campus-editing
// tools first (a fixed tab, always present), then one tab per RenderBlock —
// a category (Athletics/Recreation) or a standalone type. `id` is the block's
// category name or its single group's key, which is also the key SECTION_ICON
// and the initial-tab logic look up.
type BuildSection =
  | { id: string; label: string; kind: 'tools' }
  | { id: string; label: string; kind: 'build'; groups: TypeGroup[] };

const TOOLS_SECTION_ID = 'campus-tools';

function buildSections(s: GameState): BuildSection[] {
  const blocks = blocksFor(buildGroups(s));
  const built: BuildSection[] = blocks.map((b) => b.category
    ? { id: b.category, label: CATEGORY_LABELS[b.category], kind: 'build', groups: b.groups }
    // A non-category block is always exactly one group (blocksFor only
    // merges same-category runs), so its lone group names the tab.
    : { id: b.groups[0].key, label: b.groups[0].label, kind: 'build', groups: b.groups });
  return [{ id: TOOLS_SECTION_ID, label: 'Campus Tools', kind: 'tools' }, ...built];
}

// One "menu icon" per category tab, keyed by the section id (a category name
// or a group key). Falls back to the generic build glyph for anything without
// a dedicated icon, so a new type never renders iconless.
const SECTION_ICON: Record<string, () => React.JSX.Element> = {
  [TOOLS_SECTION_ID]: ToolsIcon,
  dorm: HousingIcon,
  library: LibraryIcon,
  studentCenter: StudentLifeIcon,
  diningHall: DiningIcon,
  healthCenter: HealthIcon,
  quad: QuadIcon,
  lab: LabIcon,
  performingArtsCenter: ArtsIcon,
  artGallery: ArtsIcon,
  academicBuilding: AcademicIcon,
  athletics: AthleticsIcon,
  recreation: FitnessIcon,
};

// The glyph shown on an individual building tile, by the Buildable's own
// kind/facilityType. Distinct from SECTION_ICON so a category holding several
// venue types (Athletics) still gives each its recognisable picture.
function iconForBuildable(t: Buildable): () => React.JSX.Element {
  if (t.kind === 'dorm') return HousingIcon;
  if (t.kind === 'building') return AcademicIcon;
  switch (t.facilityType) {
    case 'library': return LibraryIcon;
    case 'studentCenter': return StudentLifeIcon;
    case 'diningHall': return DiningIcon;
    case 'healthCenter': return HealthIcon;
    case 'quad': return QuadIcon;
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
    case 'footballStadium': return AthleticsIcon;
    default: return BuildIcon;
  }
}

// How many beds/seats one finished instance is worth — the number that
// makes a built tile worth keeping on screen at all.
function builtDetail(t: Buildable): string | undefined {
  if (t.facilityType === 'lab') return 'gates capstone coursework';
  if (t.kind === 'dorm') return `${(t.effects?.capacityBonus ?? 0).toLocaleString()} beds`;
  const flat = t.effects?.flatSatisfactionBonus;
  if (flat) return `+${flat} flat`;
  const serves = t.effects?.servesPopulation;
  if (serves) return `serves ${serves.toLocaleString()}`;
  return undefined;
}

// The same figure, summed across a collapsed group's finished instances,
// so collapsing costs the player no information about what they have.
function builtGroupDetail(kind: string, built: Buildable[]): string | undefined {
  if (kind === 'dorm') {
    const beds = built.reduce((sum, t) => sum + (t.effects?.capacityBonus ?? 0), 0);
    return `${beds.toLocaleString()} beds`;
  }
  const serves = built.reduce((sum, t) => sum + (t.effects?.servesPopulation ?? 0), 0);
  return serves > 0 ? `serves ${serves.toLocaleString()}` : undefined;
}

// The chip in a tile's corner: a tier for the upgradeable single buildings,
// an instance number for a repeatable chain (its position in that chain),
// nothing for the one-of-a-kind types whose name already says which it is.
function rowMarker(t: Buildable, group: TypeGroup, index: number): string | undefined {
  if (t.tier !== undefined) return `Tier ${t.tier}`;
  if (group.repeatable) return `#${index + 1}`;
  return undefined;
}

// One building, as a tile. Four shapes, one for each status the Buildable can
// be in — an interactive button for anything the player can still act on
// (arm a pickup), a plain div for the settled 'done, placed' case. The
// arm/site flow is unchanged from the old text rows: click (or drag onto the
// map) arms a pickup, and PLACE_BUILDABLE fires on the map once a tile is
// chosen (see CampusMap.tsx's placeById). `act` is deliberately not threaded
// here — every tile is a placeable kind, and arming is pure local UI state.
function BuildTile({
  s, t, marker, placingId, onArmPlacement,
}: {
  s: GameState; t: Buildable; marker?: string;
  placingId: string | null; onArmPlacement: (id: string | null) => void;
}) {
  const Icon = iconForBuildable(t);
  const missingFaculty = !!(t.requiresFaculty && !hasFreeFacultySlot(s, t.requiresFaculty));

  // done + already placed on the map: nothing left to decide, so a plain
  // (non-interactive) tile that just records what stands there.
  if (t.status === 'done' && t.id in s.placements) {
    const detail = builtDetail(t);
    return (
      <div className="build-tile done" title={detail ? `${t.name} · ${detail}` : t.name}>
        {marker && <span className="kind-tag">{marker}</span>}
        <span className="build-tile-icon"><Icon /></span>
        <span className="build-tile-name">{t.name}</span>
        <span className="build-tile-foot">✓ built{detail ? ` · ${detail}` : ''}</span>
      </div>
    );
  }

  // done but never sited (a founding / event-granted Buildable — see
  // campusMap.ts's needsSiting). Gated on the flat RETROACTIVE_SITING_COST
  // rather than the Buildable's own cost, since there's no construction left
  // to start, only a spot to mark.
  if (t.status === 'done') {
    const detail = builtDetail(t);
    const armed = placingId === t.id;
    const sitable = canSiteRetroactively(s, t);
    const shortfall = RETROACTIVE_SITING_COST - s.finance.cash;
    return (
      <button
        type="button"
        className={`build-tile available ${armed ? 'placing' : ''}`}
        disabled={!sitable}
        title={armed
          ? 'Click an empty tile on the map to site here, or click this again to cancel.'
          : (shortfall > 0 ? `$${Math.ceil(shortfall).toLocaleString()} short.` : `Already built — $${RETROACTIVE_SITING_COST.toLocaleString()} to mark a spot on campus`)}
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
        <span className="build-tile-foot">{armed ? 'placing…' : `site · $${RETROACTIVE_SITING_COST.toLocaleString()}`}</span>
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

  // available. The enabled/disabled state is canStartDevelopment itself — the
  // same function the reducer gates PLACE_BUILDABLE with — so a tile is never
  // offered for something the engine would refuse, and never withheld for
  // something it would allow. Clicking only ARMS the pickup (or cancels it);
  // the actual PLACE_BUILDABLE dispatch happens on the map once a tile is
  // chosen. Dragging the tile straight onto the map does the same arm-then-
  // drop in one gesture.
  const shortfall = t.cost - s.finance.cash;
  const disabledReason = shortfall > 0
    ? `$${Math.ceil(shortfall).toLocaleString()} short.`
    : missingFaculty
      ? `No free ${t.requiresFaculty} slot.`
      : undefined;
  const startable = canStartDevelopment(s, t);
  const armed = placingId === t.id;
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
      <span className="build-tile-foot">
        {armed
          ? 'placing…'
          : <>{t.cost > 0 ? `$${t.cost.toLocaleString()} · ` : ''}{t.duration}w</>}
      </span>
      {t.requiresFaculty && <span className="build-tile-note">needs {t.requiresFaculty}</span>}
    </button>
  );
}

// The collapsed stand-in for a repeatable group's finished instances: one
// tile carrying the count and the total they add, clicking to expand the
// individual built tiles inline beside it (open state lives in the parent).
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
      <span className="build-tile-name">Built</span>
      {detail && <span className="build-tile-sub">{detail}</span>}
      <span className="build-tile-foot">{open ? 'hide ▾' : 'show ▸'}</span>
    </button>
  );
}

// One group's worth of tiles, flowed into the section's horizontal strip.
// Same built/awaiting/rest split the old vertical list used — a 'done' item
// with nowhere on the map yet is kept OUT of the collapse (it's the one that
// still has something to decide), the rest of a repeatable group's finished
// instances collapse behind BuiltSummaryTile once there are COLLAPSE_BUILT_FROM
// of them.
function BuildGroupTiles({ s, group, placingId, onArmPlacement }: {
  s: GameState; group: TypeGroup; placingId: string | null; onArmPlacement: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  // Chain position is read off the group's own order (chains are strictly
  // sequential, so the visible items are always a prefix of the chain) before
  // the built/unbuilt split, so a tile's #N never shifts as the group collapses.
  const numbered = group.items.map((t, index) => ({ t, marker: rowMarker(t, group, index) }));
  const done = numbered.filter(({ t }) => t.status === 'done');
  const awaitingSiting = done.filter(({ t }) => !(t.id in s.placements));
  const built = done.filter(({ t }) => t.id in s.placements);
  const rest = numbered.filter(({ t }) => t.status !== 'done');
  const collapseBuilt = group.repeatable && built.length >= COLLAPSE_BUILT_FROM;

  return (
    <>
      {awaitingSiting.map(({ t, marker }) => (
        <BuildTile key={t.id} s={s} t={t} marker={marker} placingId={placingId} onArmPlacement={onArmPlacement} />
      ))}
      {collapseBuilt
        ? (
          <>
            <BuiltSummaryTile group={group} built={built.map(({ t }) => t)} open={open} onToggle={() => setOpen((v) => !v)} />
            {open && built.map(({ t, marker }) => (
              <BuildTile key={t.id} s={s} t={t} marker={marker} placingId={placingId} onArmPlacement={onArmPlacement} />
            ))}
          </>
        )
        : built.map(({ t, marker }) => (
          <BuildTile key={t.id} s={s} t={t} marker={marker} placingId={placingId} onArmPlacement={onArmPlacement} />
        ))}
      {rest.map(({ t, marker }) => (
        <BuildTile key={t.id} s={s} t={t} marker={marker} placingId={placingId} onArmPlacement={onArmPlacement} />
      ))}
    </>
  );
}

// Draw path / erase path: campus-editing tools in the same family as placing
// a building, so they get their own category tab, laid out as tiles like
// everything else. `pathTool` is lifted to App.tsx (this popup and the map
// both read/drive it — see App.tsx's module comment).
function CampusToolsTiles({ pathTool, onSetPathTool }: {
  pathTool: 'draw' | 'erase' | null;
  onSetPathTool: (mode: 'draw' | 'erase') => void;
}) {
  return (
    <div className="build-tile-row">
      <button
        type="button"
        className={`build-tile tool ${pathTool === 'draw' ? 'placing' : ''}`}
        aria-pressed={pathTool === 'draw'}
        onClick={() => onSetPathTool('draw')}
        title="Draw a pathway along tile edges"
      >
        <span className="build-tile-icon"><DrawPathIcon /></span>
        <span className="build-tile-name">Draw path</span>
        <span className="build-tile-foot">along tile edges</span>
      </button>
      <button
        type="button"
        className={`build-tile tool ${pathTool === 'erase' ? 'placing' : ''}`}
        aria-pressed={pathTool === 'erase'}
        onClick={() => onSetPathTool('erase')}
        title="Erase a drawn pathway"
      >
        <span className="build-tile-icon"><EraseIcon /></span>
        <span className="build-tile-name">Erase path</span>
        <span className="build-tile-foot">remove a path</span>
      </button>
    </div>
  );
}

export default function BuildPopup({
  s, placingId, onArmPlacement, pathTool, onSetPathTool, onClose,
}: {
  s: GameState;
  // Which placeable Buildable is currently picked up for siting on the map,
  // and how to change it — lifted to App.tsx (see CampusMap.tsx's module
  // comment). Every tile here starts through PLACE_BUILDABLE, dispatched once
  // a tile is chosen on the map (see CampusMap.tsx's placeById), not from a
  // click inside this popup — so the popup stays open across that click.
  placingId: string | null;
  onArmPlacement: (id: string | null) => void;
  pathTool: 'draw' | 'erase' | null;
  onSetPathTool: (mode: 'draw' | 'erase') => void;
  onClose: () => void;
}) {
  const sections = buildSections(s);
  // Default to the first real building category (not the tools tab) so opening
  // Build lands on something to place. Sections are recomputed every render,
  // so the active id is resolved against the current list below — if the tab
  // it named has vanished (its last item built out), we fall back to the
  // first tab rather than showing an empty strip.
  const [activeId, setActiveId] = useState<string>(() => {
    const firstBuild = buildSections(s).find((sec) => sec.kind === 'build');
    return firstBuild?.id ?? TOOLS_SECTION_ID;
  });
  const active = sections.find((sec) => sec.id === activeId) ?? sections[0];

  return (
    <ToolbarPopup
      title="Build"
      onClose={onClose}
      className="build-popup"
      headExtra={<HelpHint text="Every building the university can have, grouped into categories along the top — pick a category to see its buildings as a row of tiles. Each tile shows what's built, what's under construction, and what's next available. Repeatable types (housing, dining, fitness) collapse what's already finished into one 'Built ×N' tile — click it for the individual halls. A facility serves a fixed share of students against total planned capacity, not today's enrollment, so building more housing raises the bar for the rest of campus life too. Anything not yet unlockable is left off rather than teased. Click a tile (or drag it onto the map) to pick a building up, then click an empty tile on the map to build it there; that's the moment the cost is charged and the countdown begins. A tile priced at a flat, small fee instead of a real construction cost is already-built and just needs a spot marked on the map — the university's founding buildings, mainly. The map stays visible behind this bar, so you can see where a building will land before you commit it." />}
    >
      <div className="build-mode">
        <div className="build-mode-topline">
          <span className="stat">{totalEnrolled(s.students).toLocaleString()}/{s.students.capacity.toLocaleString()} beds</span>
          <span className="stat">satisfaction {Math.round(s.students.satisfaction)}</span>
        </div>

        {s.finance.cash < 0 && (
          <p className="stall-note">Cash is negative — the school is running an operating deficit, so nothing can be started until the balance recovers.</p>
        )}

        <nav className="build-mode-tabs" aria-label="Build categories">
          {sections.map((sec) => {
            const Icon = SECTION_ICON[sec.id] ?? BuildIcon;
            const isActive = sec.id === active.id;
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
              </button>
            );
          })}
        </nav>

        <div className="build-mode-tray">
          {active.kind === 'tools'
            ? <CampusToolsTiles pathTool={pathTool} onSetPathTool={onSetPathTool} />
            : (
              <div className="build-tile-row">
                {active.groups.map((group) => (
                  <BuildGroupTiles key={group.key} s={s} group={group} placingId={placingId} onArmPlacement={onArmPlacement} />
                ))}
              </div>
            )}
        </div>
      </div>
    </ToolbarPopup>
  );
}
