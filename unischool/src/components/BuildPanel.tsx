import { useState } from 'react';
import type { Buildable, FacilityType, GameState } from '../state/types';
import { canStartDevelopment, hasFreeFacultySlot } from '../systems/techtree/techSystem';
import { STARTING_DORM_CAPACITY } from '../data/campusData';
import { FACILITY_CATEGORY_OF, type FacilityCategory } from '../data/facilitiesData';
import HelpHint from './HelpHint';
import { ProgressBar } from './Progress';

// The build panel: every physical building the university can have —
// housing, campus-life facilities, academic buildings, and labs — as ONE
// list of type groups (Housing, Library, Dining, ...). It sits in the side
// rail beside the campus map (see App.tsx), which is where what gets built
// here ends up: this panel is "what to build", the map is "where it goes".
//
// Each group lists the Buildables of that type that aren't 'locked'. A
// locked Buildable (its prereqs or a population/prestige gate unmet) is
// hidden entirely rather than teased with an unlock note — nothing to
// decide about it yet, so it doesn't belong in this list.
//
// REPEATABLE types (housing, dining — the sequential chains in
// campusData.ts/facilitiesData.ts) would otherwise grow an ever-longer
// list of finished halls with nothing to decide about, crowding out the
// one row that is actually a choice. So their finished instances COLLAPSE
// into a single entry — a count, the total they contribute, and their
// names one click away — leaving the developing/available rung on its own.
// Types where each instance is a distinct decision (labs, academic
// buildings) and single buildings with tier upgrades stay listed one per
// row: there, each row is a different thing to weigh, not a repeat.
//
// Rows borrow the faculty roster's shape (see FacultyTab.tsx): name,
// then a quiet stat, then a chip, then the action — so a building reads
// like a member of the institution rather than a bullet point.
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
// built rows collapse into one. Below this there is nothing to tidy: a
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
  // which render as they always have: flat, no enclosing section.
  category?: FacilityCategory;
  items: Buildable[];
}

// One row per type. dorm/dining are repeatable sequential chains
// (see campusData.ts/facilitiesData.ts) — several finish over a run, so
// their built rows collapse. library/studentCenter/recCenter/healthCenter/
// quad are single buildings with tier upgrades: at most two rows ever, each
// a genuinely different building. gym/tennisCourts/pool/performingArtsCenter/
// artGallery are also single-instance, but one-off (no tier field, no
// upgrade) — exactly one row each, forever. lab and academic building are
// independent multi-instance types (one per lab-gated major / one per
// school) — several can be visible at once, but each is its own decision,
// so they stay listed.
const TYPE_MATCHERS: Array<{ key: string; label: string; repeatable: boolean; match: (t: Buildable) => boolean }> = [
  { key: 'dorm', label: 'Housing', repeatable: true, match: (t) => t.kind === 'dorm' },
  { key: 'library', label: FACILITY_LABELS.library, repeatable: false, match: (t) => t.facilityType === 'library' },
  { key: 'studentCenter', label: FACILITY_LABELS.studentCenter, repeatable: false, match: (t) => t.facilityType === 'studentCenter' },
  { key: 'diningHall', label: FACILITY_LABELS.diningHall, repeatable: true, match: (t) => t.facilityType === 'diningHall' },
  { key: 'recCenter', label: FACILITY_LABELS.recCenter, repeatable: false, match: (t) => t.facilityType === 'recCenter' },
  { key: 'healthCenter', label: FACILITY_LABELS.healthCenter, repeatable: false, match: (t) => t.facilityType === 'healthCenter' },
  { key: 'quad', label: FACILITY_LABELS.quad, repeatable: false, match: (t) => t.facilityType === 'quad' },
  { key: 'lab', label: FACILITY_LABELS.lab, repeatable: false, match: (t) => t.facilityType === 'lab' },
  { key: 'gym', label: FACILITY_LABELS.gym, repeatable: false, match: (t) => t.facilityType === 'gym' },
  { key: 'tennisCourts', label: FACILITY_LABELS.tennisCourts, repeatable: false, match: (t) => t.facilityType === 'tennisCourts' },
  { key: 'pool', label: FACILITY_LABELS.pool, repeatable: false, match: (t) => t.facilityType === 'pool' },
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

// A run of consecutive groups sharing the same category renders inside one
// enclosing section (see CategorySection below); everything else renders
// exactly as before, one group at a time. TYPE_MATCHERS already lists the
// recreation and athletics rows contiguously, so in practice each category
// collapses to a single run — but this only ever MERGES adjacent same-
// category groups, so a future reordering degrades to more (smaller)
// sections rather than breaking.
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

// How many beds/seats one finished instance is worth — the number that
// makes a built row worth keeping on screen at all.
function builtDetail(t: Buildable): string | undefined {
  if (t.facilityType === 'lab') return 'gates capstone coursework';
  if (t.kind === 'dorm') return `${(t.effects?.capacityBonus ?? STARTING_DORM_CAPACITY).toLocaleString()} beds`;
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
    const beds = built.reduce((sum, t) => sum + (t.effects?.capacityBonus ?? STARTING_DORM_CAPACITY), 0);
    return `${beds.toLocaleString()} beds`;
  }
  const serves = built.reduce((sum, t) => sum + (t.effects?.servesPopulation ?? 0), 0);
  return serves > 0 ? `serves ${serves.toLocaleString()}` : undefined;
}

// The chip at the end of a row's name: a tier for the upgradeable
// single buildings, an instance number for a repeatable chain (its
// position in that chain), nothing for the one-of-a-kind rows whose name
// already says which it is.
function rowMarker(t: Buildable, group: TypeGroup, index: number): string | undefined {
  if (t.tier !== undefined) return `Tier ${t.tier}`;
  if (group.repeatable) return `#${index + 1}`;
  return undefined;
}

function BuildableRow({
  s, t, marker, placingId, onArmPlacement,
}: {
  s: GameState; t: Buildable; marker?: string;
  // Which Buildable is currently picked up for siting on the map, and how
  // to change it — lifted to App.tsx (see CampusMap.tsx's module comment)
  // since the map is what actually commits a placement once one of these
  // rows arms it. `act` is no longer threaded down here: every row in this
  // panel is a placeable kind (see the module comment above — courses live
  // in the Curriculum view instead), and arming/disarming a pickup is pure
  // local UI state, not a dispatch.
  placingId: string | null; onArmPlacement: (id: string | null) => void;
}) {
  const missingFaculty = !!(t.requiresFaculty && !hasFreeFacultySlot(s, t.requiresFaculty));

  if (t.status === 'done') {
    const detail = builtDetail(t);
    return (
      <li className="available-item building-item done">
        <div className="build-row">
          <span className="build-name">{t.name}</span>
          {detail && <span className="stat">{detail}</span>}
          {marker && <span className="kind-tag">{marker}</span>}
          <span className="build-row-spacer" />
        </div>
      </li>
    );
  }

  if (t.status === 'developing') {
    const weeksLeft = s.developing[t.id] ?? 0;
    const elapsed = t.duration > 0 ? (t.duration - weeksLeft) / t.duration : 1;
    return (
      <li className="available-item building-item developing">
        <div className="build-row">
          <span className="build-name">{t.name}</span>
          {marker && <span className="kind-tag">{marker}</span>}
          <span className="build-row-spacer" />
        </div>
        <div className="available-item-meta">
          <ProgressBar
            fraction={elapsed}
            label={`${weeksLeft}w`}
            title={`${t.duration - weeksLeft} of ${t.duration} weeks built`}
          />
        </div>
      </li>
    );
  }

  // available. The enabled/disabled state is canStartDevelopment itself —
  // the same function the reducer gates PLACE_BUILDABLE with — so a button
  // is never offered for something the engine would refuse, and never
  // withheld for something it would allow. Clicking it doesn't start
  // anything by itself any more: every row here is a placeable kind (see
  // the module comment above), and placement IS how a placeable Buildable
  // starts — so this only ARMS the pickup (or cancels it, clicked again),
  // and the actual PLACE_BUILDABLE dispatch happens on the map once a tile
  // is chosen (see CampusMap.tsx's placeById). Dragging the button straight
  // onto the map does the same arm-then-drop in one gesture, mirroring the
  // old siting tray's own drag affordance.
  const shortfall = t.cost - s.finance.cash;
  const disabledReason = shortfall > 0
    ? `$${Math.ceil(shortfall).toLocaleString()} short.`
    : missingFaculty
      ? `No free ${t.requiresFaculty} slot.`
      : undefined;
  const startable = canStartDevelopment(s, t);
  const armed = placingId === t.id;
  return (
    <li className={`available-item building-item available ${armed ? 'placing' : ''}`}>
      <div className="build-row">
        <span className="build-name">{t.name}</span>
        {marker && <span className="kind-tag">{marker}</span>}
        <span className="build-row-spacer" />
        <button
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
          {armed ? 'placing…' : 'site →'}
        </button>
      </div>
      <div className="available-item-meta">
        <span className="stat">{t.cost > 0 ? `$${t.cost.toLocaleString()} · ` : ''}{t.duration}w</span>
        {t.requiresFaculty && <span className="requires-faculty-tag">needs {t.requiresFaculty}</span>}
      </div>
    </li>
  );
}

// The collapsed stand-in for a repeatable group's finished instances: one
// row carrying the count and the total they add, expanding to the list of
// names. Deliberately shaped like a faculty row, expand caret and all.
function BuiltGroupRow({ group, built }: { group: TypeGroup; built: Buildable[] }) {
  const [open, setOpen] = useState(false);
  const detail = builtGroupDetail(group.key, built);

  return (
    <li className="available-item building-item done built-group">
      <div className="build-row">
        <button
          type="button"
          className="faculty-expand-btn"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? `Hide the ${group.label.toLowerCase()} already built` : `List the ${group.label.toLowerCase()} already built`}
        >
          {open ? '▾' : '▸'}
        </button>
        <span className="build-name">Built</span>
        {detail && <span className="stat">{detail}</span>}
        <span className="kind-tag">×{built.length}</span>
        <span className="build-row-spacer" />
      </div>
      {open && (
        <ul className="built-instance-list">
          {built.map((t, i) => (
            <li key={t.id}>
              <span className="built-instance-name">{t.name}</span>
              <span className="kind-tag">#{i + 1}</span>
              <span className="build-row-spacer" />
              {builtDetail(t) && <span className="stat">{builtDetail(t)}</span>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function BuildGroup({
  s, group, placingId, onArmPlacement,
}: {
  s: GameState; group: TypeGroup; placingId: string | null; onArmPlacement: (id: string | null) => void;
}) {
  // Chain position is read off the group's own order (the chains are
  // strictly sequential, so the visible items are always a prefix of the
  // chain) before the built/unbuilt split, so a row's #N never shifts as
  // the group collapses.
  const numbered = group.items.map((t, index) => ({ t, marker: rowMarker(t, group, index) }));
  const built = numbered.filter(({ t }) => t.status === 'done');
  const rest = numbered.filter(({ t }) => t.status !== 'done');
  const collapseBuilt = group.repeatable && built.length >= COLLAPSE_BUILT_FROM;

  return (
    <div className="building-group">
      <div className="building-group-head">
        <h3>{group.label}</h3>
        <span className="stat">{built.length} built</span>
      </div>
      <ul className="available-list building-list">
        {collapseBuilt
          ? <BuiltGroupRow group={group} built={built.map(({ t }) => t)} />
          : built.map(({ t, marker }) => (
            <BuildableRow key={t.id} s={s} t={t} marker={marker} placingId={placingId} onArmPlacement={onArmPlacement} />
          ))}
        {rest.map(({ t, marker }) => (
          <BuildableRow key={t.id} s={s} t={t} marker={marker} placingId={placingId} onArmPlacement={onArmPlacement} />
        ))}
      </ul>
    </div>
  );
}

function CategorySection({
  category, groups, s, placingId, onArmPlacement,
}: {
  category: FacilityCategory; groups: TypeGroup[]; s: GameState;
  placingId: string | null; onArmPlacement: (id: string | null) => void;
}) {
  return (
    <section className="building-category">
      <h3 className="building-category-head">{CATEGORY_LABELS[category]}</h3>
      <div className="building-groups">
        {groups.map((group) => (
          <BuildGroup key={group.key} s={s} group={group} placingId={placingId} onArmPlacement={onArmPlacement} />
        ))}
      </div>
    </section>
  );
}

export default function BuildPanel({
  s, placingId, onArmPlacement,
}: {
  s: GameState;
  // Which placeable Buildable is currently picked up for siting on the
  // map, and how to change it — lifted to App.tsx (see CampusMap.tsx's
  // module comment). `act` is no longer threaded through this panel at
  // all: every row here starts through PLACE_BUILDABLE now, dispatched
  // once a tile is chosen on the map (see CampusMap.tsx's placeById), not
  // from a click inside this panel.
  placingId: string | null;
  onArmPlacement: (id: string | null) => void;
}) {
  const groups = buildGroups(s);
  const blocks = blocksFor(groups);

  return (
    <aside className="side-panel">
      <section className="panel side-panel-section">
        <div className="panel-head">
          <span className="panel-head-title">
            <h2>Build</h2>
            <HelpHint text="Every building the university can have, grouped by type: what's built, what's under construction, and what's next available. Repeatable types (housing, dining) collapse what's already finished into one line — open it for the individual halls. A facility serves a fixed share of students against total planned capacity, not today's enrollment, so building more housing raises the bar for the rest of campus life too. Anything not yet unlockable is left off the list rather than teased. 'Site →' picks a building up — click (or drag it onto) an empty tile on the map to start building it there; that's the moment the cost is charged and the countdown begins." />
          </span>
        </div>

        <div className="side-panel-stats">
          <span className="stat">{s.students.enrolled.toLocaleString()}/{s.students.capacity.toLocaleString()} beds</span>
          <span className="stat">satisfaction {Math.round(s.students.satisfaction)}</span>
        </div>

        {s.finance.cash < 0 && (
          <p className="stall-note">Cash is negative — the school is running an operating deficit, so nothing can be started until the balance recovers.</p>
        )}

        <div className="building-groups">
          {blocks.map((block, i) => block.category
            ? (
              <CategorySection
                key={`${block.category}-${i}`}
                category={block.category}
                groups={block.groups}
                s={s}
                placingId={placingId}
                onArmPlacement={onArmPlacement}
              />
            )
            : block.groups.map((group) => (
              <BuildGroup key={group.key} s={s} group={group} placingId={placingId} onArmPlacement={onArmPlacement} />
            )))}
        </div>
      </section>
    </aside>
  );
}
