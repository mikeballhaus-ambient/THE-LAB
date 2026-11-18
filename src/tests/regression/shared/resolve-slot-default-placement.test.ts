import { describe, expect, test } from '@jest/globals';
import { CHART_BUILDER_INTEGRATION_MANIFEST } from '@/backend/db/Apps/integration-manifest-seeds';
import {
  applyManifestDefaultPlacementToBindingConfig,
  resolveSlotDefaultPlacement,
} from '@/shared/lab-integrations/resolve-slot-default-placement';

describe('resolveSlotDefaultPlacement', () => {
  test('chart.designer.metadata maps to designer surface inline', () => {
    const placement = resolveSlotDefaultPlacement(
      CHART_BUILDER_INTEGRATION_MANIFEST,
      'chart.designer.metadata',
      'form.surface',
    );
    expect(placement).toEqual({
      regionId: 'designer.forms',
      surfaceId: 'chart-builder.designer',
      presentation: 'inline',
    });
  });

  test('applyManifestDefaultPlacementToBindingConfig fills missing placement', () => {
    const config = applyManifestDefaultPlacementToBindingConfig(
      CHART_BUILDER_INTEGRATION_MANIFEST,
      'chart.designer.connector',
      'form.surface',
      { schemaVersion: 1 },
    );
    expect(config.placement).toEqual({
      regionId: 'designer.forms',
      surfaceId: 'chart-builder.designer',
      presentation: 'inline',
    });
  });

  test('does not override explicit placement', () => {
    const config = applyManifestDefaultPlacementToBindingConfig(
      CHART_BUILDER_INTEGRATION_MANIFEST,
      'chart.designer.metadata',
      'form.surface',
      {
        schemaVersion: 1,
        placement: { regionId: 'dialogs', presentation: 'dialog' },
      },
    );
    expect(config.placement?.regionId).toBe('dialogs');
  });
});
