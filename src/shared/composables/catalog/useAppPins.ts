import { ref } from 'vue';
import { labDB } from '@/shared/types/lab-db';

const PINS_ID = 'app-pins';

function coercePinId(entry: unknown): string | null {
  if (typeof entry === 'string' && entry.length > 0) {
    return entry;
  }
  if (entry && typeof entry === 'object' && typeof (entry as { id?: unknown }).id === 'string') {
    const id = (entry as { id: string }).id;
    return id.length > 0 ? id : null;
  }
  return null;
}

function normalizePinIds(ids: readonly unknown[]): string[] {
  const out: string[] = [];
  for (const entry of ids) {
    const id = coercePinId(entry);
    if (id) {
      out.push(id);
    }
  }
  return [...new Set(out)];
}

/** IndexedDB structured clone cannot store Vue reactive proxies — always pass plain data. */
function pinRecord(orderedAppIds: string[]): { id: string; orderedAppIds: string[] } {
  return { id: PINS_ID, orderedAppIds: [...orderedAppIds] };
}

export function useAppPins() {
  const pinnedAppIds = ref<string[]>([]);

  async function loadPins(): Promise<void> {
    const row = await labDB.appPins.get(PINS_ID);
    const raw = row?.orderedAppIds ?? [];
    const normalized = normalizePinIds(raw);
    pinnedAppIds.value = normalized;
    if (row && raw.some((entry) => typeof entry !== 'string')) {
      await labDB.appPins.put(pinRecord(normalized));
    }
  }

  async function togglePin(appId: string): Promise<void> {
    const set = new Set(normalizePinIds(pinnedAppIds.value));
    if (set.has(appId)) set.delete(appId);
    else set.add(appId);
    const next = [...set];
    await labDB.appPins.put(pinRecord(next));
    pinnedAppIds.value = next;
  }

  return { pinnedAppIds, loadPins, togglePin };
}
