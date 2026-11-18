import { describe, expect, test } from '@jest/globals';
import { mergeBindingConfigFromMcpFields } from '@/shared/lab-integrations/merge-binding-config-from-mcp';

describe('mergeBindingConfigFromMcpFields', () => {
  test('merges presentation and placement into config', () => {
    const config = mergeBindingConfigFromMcpFields({
      presentation: 'inline',
      placementRegionId: 'designer.forms',
      placementSurfaceId: 'chart-builder.designer',
      placementOrder: 2,
    });
    expect(config).toEqual({
      schemaVersion: 1,
      placement: {
        presentation: 'inline',
        regionId: 'designer.forms',
        surfaceId: 'chart-builder.designer',
        order: 2,
      },
    });
  });

  test('requires placementRegionId when setting presentation', () => {
    expect(() =>
      mergeBindingConfigFromMcpFields({ presentation: 'dialog' }),
    ).toThrow(/placementRegionId/);
  });
});
