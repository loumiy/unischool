import type { GameState } from './types';
import { institutionName } from './types';
import { exportSave, readSave, type SaveRefusal } from './persistence';

// ---------------------------------------------------------------------
// SAVE SLOTS (Plan 98D). Three named places a player keeps a run, beside
// the autosave (persistence.ts's SAVE_KEY), which the game keeps writing as
// it always has. A slot holds a save file exactly as "Download save" writes
// it (exportSave), so a slot is read by the same path as an imported file
// (readSave: parse, migrate, sanitize) and every later build can open it.
// Loading a slot adopts it as the run, as an import does.
//
// Its index, `unischool.slots`, keeps what the menu lists without parsing
// each save: the college, the year and week, and when it was saved.
// ---------------------------------------------------------------------

export const SLOT_COUNT = 3;
export const SLOTS_KEY = 'unischool.slots';
export const slotKey = (id: number) => `unischool.slot.${id}`;

export interface SlotInfo {
  id: number;
  collegeName: string;
  year: number;
  week: number;
  savedAt: number;
}

function readIndex(): SlotInfo[] {
  try {
    const raw = localStorage.getItem(SLOTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is SlotInfo =>
      typeof e === 'object' && e !== null
      && Number.isInteger((e as SlotInfo).id) && (e as SlotInfo).id >= 1 && (e as SlotInfo).id <= SLOT_COUNT
      && typeof (e as SlotInfo).collegeName === 'string'
      && typeof (e as SlotInfo).year === 'number' && typeof (e as SlotInfo).savedAt === 'number');
  } catch {
    return [];
  }
}

function writeIndex(index: SlotInfo[]): void {
  localStorage.setItem(SLOTS_KEY, JSON.stringify([...index].sort((a, b) => a.id - b.id)));
}

// The three slots in order, each with what it holds or null when empty. A
// slot listed in the index but missing its save reads as empty.
export function listSlots(): (SlotInfo | null)[] {
  const index = readIndex();
  return Array.from({ length: SLOT_COUNT }, (_, i) => {
    const info = index.find((e) => e.id === i + 1) ?? null;
    if (!info) return null;
    try {
      return localStorage.getItem(slotKey(info.id)) === null ? null : info;
    } catch {
      return null;
    }
  });
}

export type SlotWrite = 'saved' | 'full';

// Writes the run into a slot. A refused write (storage full) leaves the slot
// and its index as they were, and never touches the autosave.
export function saveToSlot(id: number, state: GameState, now = Date.now()): SlotWrite {
  if (!Number.isInteger(id) || id < 1 || id > SLOT_COUNT) throw new Error(`no slot ${id}`);
  const { text } = exportSave(state);
  const key = slotKey(id);
  let before: string | null = null;
  try {
    before = localStorage.getItem(key);
    localStorage.setItem(key, text);
    const info: SlotInfo = {
      id, collegeName: institutionName(state.self), year: state.clock.year, week: state.clock.week, savedAt: now,
    };
    writeIndex([...readIndex().filter((e) => e.id !== id), info]);
    return 'saved';
  } catch {
    // Put back what the slot held, if anything was written over it.
    try {
      if (before === null) localStorage.removeItem(key);
      else localStorage.setItem(key, before);
    } catch {
      // Nothing more can be done.
    }
    return 'full';
  }
}

// The run a slot holds, read as an imported file is.
export function readSlot(id: number): { state: GameState } | { refused: SaveRefusal | 'empty' } {
  let raw: string | null;
  try {
    raw = localStorage.getItem(slotKey(id));
  } catch {
    raw = null;
  }
  if (raw === null) return { refused: 'empty' };
  const read = readSave(raw);
  return 'refused' in read ? { refused: read.refused } : { state: read.state };
}

export function deleteSlot(id: number): void {
  try {
    localStorage.removeItem(slotKey(id));
    writeIndex(readIndex().filter((e) => e.id !== id));
  } catch {
    // A slot that cannot be removed stays listed.
  }
}
