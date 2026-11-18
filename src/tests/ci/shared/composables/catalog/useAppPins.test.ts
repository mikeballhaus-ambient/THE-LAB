import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { AppPinRecord } from '@/shared/types/lab-db';

const getMock = jest.fn<(id: string) => Promise<AppPinRecord | undefined>>();
const putMock = jest.fn<(record: AppPinRecord) => Promise<void>>().mockResolvedValue(undefined);

jest.unstable_mockModule('@/shared/types/lab-db', () => ({
  labDB: {
    appPins: { get: getMock, put: putMock },
  },
}));

type UseAppPins = typeof import('@/shared/composables/catalog/useAppPins').useAppPins;

describe('useAppPins', () => {
  let useAppPins: UseAppPins;

  beforeEach(async () => {
    getMock.mockReset();
    putMock.mockReset();
    putMock.mockResolvedValue(undefined);

    const mod = await import('@/shared/composables/catalog/useAppPins');
    useAppPins = mod.useAppPins;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('togglePin adds app id and persists via put', async () => {
    const { pinnedAppIds, togglePin } = useAppPins();

    await togglePin('app-1');

    expect(pinnedAppIds.value).toEqual(['app-1']);
    expect(getMock).not.toHaveBeenCalled();
    expect(putMock).toHaveBeenCalledTimes(1);
    expect(putMock).toHaveBeenCalledWith({
      id: 'app-pins',
      orderedAppIds: ['app-1'],
    });
  });

  test('togglePin removes app id when present and persists empty list', async () => {
    const { pinnedAppIds, togglePin } = useAppPins();

    await togglePin('app-1');
    await togglePin('app-1');

    expect(pinnedAppIds.value).toEqual([]);
    expect(putMock).toHaveBeenCalledTimes(2);
    expect(putMock).toHaveBeenLastCalledWith({
      id: 'app-pins',
      orderedAppIds: [],
    });
  });

  test('loadPins sets pinnedAppIds from Dexie row', async () => {
    getMock.mockResolvedValue({ id: 'app-pins', orderedAppIds: ['x', 'y'] } as AppPinRecord);

    const { pinnedAppIds, loadPins } = useAppPins();

    await loadPins();

    expect(getMock).toHaveBeenCalledWith('app-pins');
    expect(pinnedAppIds.value).toEqual(['x', 'y']);
  });

  test('loadPins coerces legacy object entries to app ids and re-persists', async () => {
    getMock.mockResolvedValue({
      id: 'app-pins',
      orderedAppIds: [{ id: 'app-weather-dashboard' }, 'app-okr-goals'],
    } as unknown as AppPinRecord);

    const { pinnedAppIds, loadPins } = useAppPins();

    await loadPins();

    expect(pinnedAppIds.value).toEqual(['app-weather-dashboard', 'app-okr-goals']);
    expect(putMock).toHaveBeenCalledWith({
      id: 'app-pins',
      orderedAppIds: ['app-weather-dashboard', 'app-okr-goals'],
    });
  });
});
