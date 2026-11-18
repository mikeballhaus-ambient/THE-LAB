import {
  buildIntegrationStubFormDescription,
  INTEGRATION_STUB_DESCRIPTION_MARKER,
} from '@/shared/lab-integrations/integration-stub-markers';
import { rewriteLegacyStubDescription } from '@/backend/lab-integrations/migrate-legacy-integration-stub-descriptions';

describe('rewriteLegacyStubDescription (rm-67.1)', () => {
  test('rewrites canonical stub form line', () => {
    const legacy = 'Stub form for home-asset.edit.dialog (rm-64)';
    expect(rewriteLegacyStubDescription(legacy)).toBe(
      buildIntegrationStubFormDescription('home-asset.edit.dialog'),
    );
  });

  test('leaves clean integration stub unchanged', () => {
    const current = buildIntegrationStubFormDescription('task.create.dialog');
    expect(rewriteLegacyStubDescription(current)).toBeNull();
  });

  test('replaces parenthesized roadmap id on chart copy', () => {
    const legacy = `Integration stub (rm-64)`;
    expect(rewriteLegacyStubDescription(legacy)).toBe(`Integration stub ${INTEGRATION_STUB_DESCRIPTION_MARKER}`);
  });
});
