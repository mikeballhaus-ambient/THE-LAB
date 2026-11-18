import { describe, test, expect } from '@jest/globals';
import { labelFromCatalogTagId } from '@/backend/db/AppTags/ensure-catalog-tags-for-app';
import { resolveCreateAppCatalogTagSpecs } from '@/backend/mcp/mcp-servers/apps/utils/resolve-create-app-catalog-tags';

describe('catalog tag ensure helpers', () => {
  test('labelFromCatalogTagId humanizes slug', () => {
    expect(labelFromCatalogTagId('demo-training')).toBe('Demo Training');
    expect(labelFromCatalogTagId('examples')).toBe('Examples');
  });

  test('resolveCreateAppCatalogTagSpecs prefers catalogTags', () => {
    const specs = resolveCreateAppCatalogTagSpecs({
      catalogTags: [{ id: 'examples', label: 'Examples' }],
      catalogTagIds: ['platform'],
    });
    expect(specs).toEqual([{ id: 'examples', label: 'Examples' }]);
  });

  test('resolveCreateAppCatalogTagSpecs maps catalogTagIds', () => {
    const specs = resolveCreateAppCatalogTagSpecs({
      catalogTagIds: ['demo-training', 'examples'],
    });
    expect(specs).toEqual([{ id: 'demo-training' }, { id: 'examples' }]);
  });
});
