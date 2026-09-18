import { FullAppData, TaskItem, TimeBlock } from '../types';

/**
 * Item-level "last touched" timestamp.
 * Stamped by user intent paths (toggle complete, edit, uncheck) so a
 * deliberate action on an item always beats a stale whole-blob writer.
 */
export type StampedItem = { updatedAt?: string };

/**
 * Union-by-id merge of two FullAppData snapshots, per collection.
 *
 * Why: the app persists one big blob (localStorage + IndexedDB + Firestore).
 * Every blob carries a single top-level `updatedAt` that save paths re-stamp
 * at write time. A stale snapshot re-stamped "now" (tab A saving while tab B
 * just completed a task; a Firestore echo; a hydration race) legally
 * overwrites the fresher state and silently DELETES the completion — which
 * is the root cause of "the flame goes cold when I add a task".
 *
 * Rule per collection item (by id):
 *  - present on one side only  -> keep it (union, nothing is lost)
 *  - present on both           -> keep the item with the newer item-level
 *                                 `updatedAt` stamp; without stamps fall
 *                                 back to current behavior (primary wins)
 *
 * Blob-level `updatedAt`: keep the newest, since saves re-stamp it anyway.
 * Settings: primary wins (explicit user choice beats stale echo).
 */
export function mergeAppData<T extends FullAppData>(primary: T, secondary: T): T {
  if (secondary === primary) return primary;
  const secondaryTime = new Date(secondary?.updatedAt || 0).getTime();
  const primaryTime = new Date(primary?.updatedAt || 0).getTime();
  if (secondaryTime <= primaryTime) return primary; // not newer → nothing to do

  const tasks = mergeItems<TaskItem>(primary.tasks, secondary.tasks);
  const timeBlocks = mergeItems<TimeBlock>(primary.timeBlocks, secondary.timeBlocks);

  // Content short-circuit: if item collections are unchanged, do NOT adopt the
  // newer stamp — otherwise identical echo writes (cloud or cross-tab) would
  // keep producing "newer" no-op states and feed a save→echo→save loop.
  if (tasks === (primary.tasks || []) && timeBlocks === (primary.timeBlocks || [])) {
    return primary;
  }

  return {
    ...primary,
    ...secondary,
    settings: primary.settings, // explicit local user choice wins over stale echo
    updatedAt: secondary.updatedAt,
    tasks,
    timeBlocks,
  };
}

function mergeItems<T extends { id: string } & StampedItem>(
  primary: T[] = [],
  secondary: T[] = []
): T[] {
  if (!Array.isArray(primary) || !Array.isArray(secondary)) {
    return (Array.isArray(primary) ? primary : secondary) as T[];
  }
  if (secondary.length === 0) return primary;
  if (primary.length === 0) return secondary;

  const byId = new Map<string, T>();
  for (const item of primary) byId.set(item.id, item);
  let changed = false;
  for (const item of secondary) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      changed = true;
      continue;
    }
    const winner = pickNewer(existing, item);
    if (winner !== existing) {
      byId.set(item.id, winner);
      changed = true;
    }
  }
  // Preserve the primary array reference when nothing changed so callers can
  // detect no-op merges by identity and avoid pointless state updates.
  return changed ? Array.from(byId.values()) : primary;
}

function pickNewer<T extends StampedItem>(a: T, b: T): T {
  const at = new Date(a.updatedAt || 0).getTime();
  const bt = new Date(b.updatedAt || 0).getTime();
  if (bt > at) return b;
  return a; // ties and missing stamps keep the primary (current behavior)
}

/**
 * Helper for intent paths: returns `item` untouched when it already carries
 * the newest stamp, else a copy stamped "now". Used so a deliberate toggle
 * or edit on ONE item cannot be reverted by a stale whole-blob writer.
 */
export function stampNow<T extends StampedItem>(item: T, now: string = new Date().toISOString()): T {
  return { ...item, updatedAt: now };
}
