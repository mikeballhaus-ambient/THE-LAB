import { describe, test, expect } from '@jest/globals';
import {
  appMatchesTagFilter,
  buildCatalogSectionsByPrimaryTag,
  buildCatalogSectionsByTag,
  filterAppsForCatalog,
  resolvePrimaryCatalogTagId,
} from '@/shared/utils/catalog-tag-utils';
import type { IApp } from '@/shared/types/app/app.d';
import type { PlatformAppTag } from '@/shared/types/platform-app-tags';

const tags: PlatformAppTag[] = [
  { id: 'platform', label: 'Platform', description: '', sortOrder: 1 },
  { id: 'games', label: 'Games', description: '', sortOrder: 4 },
];

const app: IApp = {
  id: 'a1',
  name: 'A',
  description: '',
  faIcon: 'fa',
  order: 1,
  type: 'browser',
  componentPath: undefined,
  isEnabled: true,
  dependencies: [],
  optionalDependencies: [],
  version: '1.0.0',
  catalogTagIds: ['games', 'platform'],
};

describe('catalog-tag-utils', () => {
  test('primary tag is first recognized id in app order', () => {
    const known = new Set(tags.map((t) => t.id));
    expect(resolvePrimaryCatalogTagId(app, known)).toBe('games');
  });

  test('filter matches non-primary tag', () => {
    expect(appMatchesTagFilter(app, ['platform'])).toBe(true);
  });

  test('sections place app under primary tag only', () => {
    const sections = buildCatalogSectionsByPrimaryTag([app], tags);
    expect(sections.find((s) => s.tag.id === 'games')?.apps.map((a) => a.id)).toEqual(['a1']);
    expect(sections.find((s) => s.tag.id === 'platform')).toBeUndefined();
  });

  test('sections include uncategorized apps without tag assignments', () => {
    const untagged: IApp = { ...app, id: 'u1', name: 'Untagged', catalogTagIds: [] };
    const sections = buildCatalogSectionsByPrimaryTag([untagged], tags);
    expect(sections.find((s) => s.tag.id === '__uncategorized__')?.apps.map((a) => a.id)).toEqual(['u1']);
  });

  test('tag sections list multi-tag apps under every tag they carry', () => {
    const sections = buildCatalogSectionsByTag([app], tags);
    expect(sections.find((s) => s.tag.id === 'games')?.apps.map((a) => a.id)).toEqual(['a1']);
    expect(sections.find((s) => s.tag.id === 'platform')?.apps.map((a) => a.id)).toEqual(['a1']);
  });

  test('tag section count equals the matching filter result', () => {
    const sections = buildCatalogSectionsByTag([app], tags);
    const productivitySection = sections.find((s) => s.tag.id === 'platform');
    const filtered = filterAppsForCatalog({
      apps: [app],
      searchQuery: '',
      typeFilter: 'all',
      selectedTagIds: ['platform'],
      showServerApps: true,
    });
    expect(productivitySection?.apps.length).toBe(filtered.length);
  });

  test('tag sections include hero apps for counts when they carry secondary tags', () => {
    const hero: IApp = {
      ...app,
      id: 'hero-crm',
      name: 'CRM',
      isSystem: true,
      catalogTagIds: ['platform', 'productivity'],
    };
    const catalogApp: IApp = {
      ...app,
      id: 'app-okr-goals',
      name: 'OKR',
      isSystem: false,
      catalogTagIds: ['productivity'],
    };
    const productivityTag: PlatformAppTag = {
      id: 'productivity',
      label: 'Productivity',
      description: '',
      sortOrder: 2,
    };
    const sections = buildCatalogSectionsByTag([hero, catalogApp], [...tags, productivityTag]);
    expect(sections.find((s) => s.tag.id === 'productivity')?.apps.map((a) => a.id)).toEqual([
      'hero-crm',
      'app-okr-goals',
    ]);
  });
});
