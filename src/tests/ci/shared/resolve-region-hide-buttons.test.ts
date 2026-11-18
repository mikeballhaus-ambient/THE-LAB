import { describe, expect, test } from '@jest/globals';
import { resolveHideButtonsForInlineForm } from '@/shared/integration/resolve-region-hide-buttons';
import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import type { LabIntegrationBindingRecord } from '@/shared/types/lab-integrations';

const manifest: AppLabIntegrationManifestV1 = {
  schemaVersion: 1,
  integrationSurfaces: [
    {
      surfaceId: 'chart-builder.designer',
      label: 'Designer',
      regions: [
        {
          regionId: 'designer.forms',
          label: 'Forms',
          kinds: ['form.surface'],
          hideButtons: true,
        },
        {
          regionId: 'dialogs',
          label: 'Dialogs',
          kinds: ['form.surface'],
        },
      ],
    },
  ],
};

const binding = (placement?: LabIntegrationBindingRecord['config']['placement']): LabIntegrationBindingRecord =>
  ({
    id: 'b1',
    hostAppId: 'app-lab-chartbuilder',
    slot: 'chart.designer.metadata',
    kind: 'form.surface',
    providerAppId: 'app-lab-formsbuilder',
    providerRef: 'form-key',
    config: { schemaVersion: 1, placement },
    enabled: true,
    createdByUserId: 1,
    createdAt: '',
    updatedAt: '',
  }) as LabIntegrationBindingRecord;

describe('resolveHideButtonsForInlineForm', () => {
  test('reads hideButtons from surface region', () => {
    expect(
      resolveHideButtonsForInlineForm(manifest, 'chart-builder.designer', 'designer.forms'),
    ).toBe(true);
    expect(resolveHideButtonsForInlineForm(manifest, 'chart-builder.designer', 'dialogs')).toBe(
      false,
    );
  });

  test('binding placement.hideButtons overrides region', () => {
    expect(
      resolveHideButtonsForInlineForm(
        manifest,
        'chart-builder.designer',
        'designer.forms',
        binding({ regionId: 'designer.forms', hideButtons: false }),
      ),
    ).toBe(false);
  });
});
