import { SessionManager } from '@/shared/composables/session/session-manager';

describe('SessionManager lab game sidecar preferences', () => {
  test('defaults auto-open true and banter enabled', async () => {
    const store = {
      row: { id: 'sessions', sessions: [] } as import('@/shared/types/lab-db').SessionRecord,
    };
    const table = {
      async get(id: string) {
        return id === 'sessions' ? store.row : undefined;
      },
      async add(row: import('@/shared/types/lab-db').SessionRecord) {
        store.row = row;
      },
      async put(row: import('@/shared/types/lab-db').SessionRecord) {
        store.row = row;
      },
      where(field: string) {
        void field;
        return {
          equals(value: string) {
            return {
              async modify(cb: (row: import('@/shared/types/lab-db').SessionRecord) => void) {
                if (store.row.id === value) {
                  cb(store.row);
                  return 1;
                }
                return 0;
              },
            };
          },
        };
      },
    };

    const sm = new SessionManager(table as never, async (fn) => fn());
    await sm.init();
    expect(await sm.getLabGameSidecarAutoOpen()).toBe(true);
    expect(await sm.getLabGameBanterDisabled()).toBe(false);
    expect(await sm.getLabGameSidecarAutoOpenHintShown()).toBe(false);

    await sm.setLabGameSidecarAutoOpen(false);
    await sm.setLabGameBanterDisabled(true);
    await sm.setLabGameSidecarAutoOpenHintShown(true);

    expect(await sm.getLabGameSidecarAutoOpen()).toBe(false);
    expect(await sm.getLabGameBanterDisabled()).toBe(true);
    expect(await sm.getLabGameSidecarAutoOpenHintShown()).toBe(true);
  });
});
