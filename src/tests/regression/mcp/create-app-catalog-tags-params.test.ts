import { describe, expect, test } from '@jest/globals';
import { createAppSchemaFields } from '@/shared/types';
import { resolveCreateAppCatalogTagSpecs } from '@/backend/mcp/mcp-servers/apps/utils/resolve-create-app-catalog-tags';

describe('create_app catalog tag params', () => {
  test('schema preserves catalogTagIds for handler forwarding', () => {
    const parsed = createAppSchemaFields.parse({
      userId: 1,
      type: 'browser',
      name: 'Smoke Test',
      description: 'x',
      faIcon: 'fa-vial',
      catalogTagIds: ['testing', 'examples'],
    });
    expect(resolveCreateAppCatalogTagSpecs(parsed)).toEqual([{ id: 'testing' }, { id: 'examples' }]);
  });
});
