import { describe, expect, test } from '@jest/globals';
import { formatAppsHomeCatalogRegistry } from '@/shared/composables/lab-sidecar/format-lab-sidecar-catalog-registry';

describe('formatAppsHomeCatalogRegistry', () => {
  test('compact sidebar layout documents launcher rail', () => {
    const block = formatAppsHomeCatalogRegistry(
      [
        {
          id: 'app-a',
          name: 'Alpha',
          description: 'First',
          type: 'browser',
          categories: ['Platform'],
        },
      ],
      'compact-sidebar',
    );
    expect(block).toContain('lab-app-catalog-sidebar');
    expect(block).toContain('lab-running-apps-rail');
    expect(block).toContain('Restore');
  });

  test('lists apps and notes section preview limit', () => {
    const block = formatAppsHomeCatalogRegistry([
      {
        id: 'app-a',
        name: 'Alpha',
        description: 'First app',
        type: 'browser',
        categories: ['Productivity'],
      },
      {
        id: 'app-b',
        name: 'Beta',
        description: 'Second',
        type: 'hybrid',
        categories: ['Productivity'],
      },
    ]);
    expect(block).toContain('full registry');
    expect(block).toContain('at most 8 apps per category');
    expect(block).toContain('Alpha');
    expect(block).toContain('`app-a`');
    expect(block).toContain('Productivity');
  });
});
