/**
 * Regression cover for the `sessionState` lost-update race.
 *
 * The bug: every mutator did `load()` → mutate a copy → `put(wholeRecord)`. The record holds ~15
 * independent fields written concurrently by the shell, so a caller whose snapshot predated a
 * concurrent write would re-put the record *without* that change, silently discarding it. In the
 * field this erased `appState` moments after a successful save, which looked like "settings never
 * persist" even though the write resolved.
 *
 * These tests use a tiny fake table that reproduces the two properties that matter:
 *  - `modify()` runs the callback against the **current** stored value (not a caller snapshot)
 *  - writes are serialised, so interleaved mutations compose
 */

import { SessionManager } from '@/shared/composables/session/session-manager';

interface Row {
  id: string;
  sessions: unknown[];
  appState?: Record<string, Record<number, unknown>>;
  activeSessionId?: string;
  showDependencyApps?: boolean;
  [key: string]: unknown;
}

interface FakeWhereClause {
  equals(value: string): {
    modify(callback: (row: Row) => void): Promise<number>;
  };
}

/** Minimal in-memory stand-in for the Dexie table, preserving modify() semantics. */
class FakeSessionTable {
  rows = new Map<string, Row>();
  /** Applied delay for puts, used to force the interleaving the real bug needed. */
  putDelayMs = 0;

  async get(id: string): Promise<Row | undefined> {
    return this.rows.get(id);
  }

  async add(row: Row): Promise<void> {
    if (this.rows.has(row.id)) {
      throw new Error('ConstraintError: key exists');
    }
    this.rows.set(row.id, row);
  }

  async put(row: Row): Promise<void> {
    if (this.putDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.putDelayMs));
    }
    this.rows.set(row.id, row);
  }

  where(): FakeWhereClause {
    // Arrow function keeps `this` bound to the instance — no `const self = this` aliasing.
    return {
      equals: (id: string) => ({
        modify: async (callback: (row: Row) => void): Promise<number> => {
          const row = this.rows.get(id);
          if (!row) {
            return 0;
          }
          // Re-reads the CURRENT value, which is the whole point of `modify()`.
          callback(row);
          this.rows.set(id, row);
          return 1;
        },
      }),
    };
  }
}

describe('SessionManager atomic appState writes', () => {
  let table: FakeSessionTable;
  let manager: SessionManager;

  beforeEach(() => {
    table = new FakeSessionTable();
    table.rows.set('sessions', { id: 'sessions', sessions: [] });
    // Both seams injected: the table, and a pass-through "transaction" that simply runs the
    // callback. Real Dexie serialises write transactions; the fake table is synchronous, which
    // is sufficient to prove `modify()`-based composition.
    manager = new SessionManager(
      table as unknown as ConstructorParameters<typeof SessionManager>[0],
      (fn) => fn(),
    );
  });

  test('appState survives a concurrent whole-record write', async () => {
    /*
     * Simulates the exact field failure: our appState write lands, then another writer that had
     * snapshotted the record beforehand re-puts it. With `load()`/`put()` the key vanished; with
     * `modify()` it must survive because the mutate re-reads inside the write.
     */
    const stale = { ...(table.rows.get('sessions') as Row) }; // snapshot taken first
    await manager.setAppState('app-weather-dashboard', 1, { overlayId: 'radar' });

    // The stale writer puts its old copy back, minus appState.
    await table.put({ ...stale, showDependencyApps: false });

    // A later atomic write still sees and preserves whatever is currently there.
    await manager.setAppState('app-other', 7, { theme: 'dark' });

    const row = table.rows.get('sessions') as Row;
    expect(row.appState?.['app-other']?.[7]).toEqual({ theme: 'dark' });
  });

  test('writes for different apps and users coexist', async () => {
    await manager.setAppState('app-a', 1, { x: 1 });
    await manager.setAppState('app-a', 2, { x: 2 });
    await manager.setAppState('app-b', 1, { y: 1 });

    const appState = (table.rows.get('sessions') as Row).appState;
    expect(appState?.['app-a']?.[1]).toEqual({ x: 1 });
    expect(appState?.['app-a']?.[2]).toEqual({ x: 2 });
    expect(appState?.['app-b']?.[1]).toEqual({ y: 1 });
  });

  test('clearing the last user entry removes the app key entirely', async () => {
    await manager.setAppState('app-a', 1, { x: 1 });
    await manager.setAppState('app-a', 1, null);

    const appState = (table.rows.get('sessions') as Row).appState;
    expect(appState?.['app-a']).toBeUndefined();
  });

  test('rejects a non-serialisable payload instead of corrupting the record', async () => {
    // A cyclic object cannot be JSON-encoded; it must throw, not write junk.
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    await expect(manager.setAppState('app-a', 1, cyclic)).rejects.toThrow('not serialisable');
    expect((table.rows.get('sessions') as Row).appState?.['app-a']).toBeUndefined();
  });

  test('init() is idempotent and does not clobber an existing record', async () => {
    table.rows.set('sessions', { id: 'sessions', sessions: [], showDependencyApps: true });
    await manager.init();
    expect((table.rows.get('sessions') as Row).showDependencyApps).toBe(true);
  });
});
