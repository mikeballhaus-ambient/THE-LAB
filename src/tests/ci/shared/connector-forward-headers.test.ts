import { describe, expect, test } from '@jest/globals';
import {
  chartConnectorFilterContext,
  hostAppIdFromRenderContext,
} from '@/shared/server/connector-forward-headers';

describe('connector-forward-headers', () => {
  test('hostAppIdFromRenderContext', () => {
    expect(hostAppIdFromRenderContext({ hostAppId: 'app-lab-tasklist' })).toBe('app-lab-tasklist');
    expect(hostAppIdFromRenderContext({})).toBeUndefined();
  });

  test('chartConnectorFilterContext strips hostAppId', () => {
    expect(
      chartConnectorFilterContext({ taskListId: 3, hostAppId: 'app-lab-tasklist' }),
    ).toEqual({ taskListId: 3 });
  });
});
