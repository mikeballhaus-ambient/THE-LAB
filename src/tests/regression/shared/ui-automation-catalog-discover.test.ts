import { describe, expect, test } from '@jest/globals';
import {
  catalogLaunchMatchesSearchPattern,
  filterToCatalogCardActionControls,
  filterToCatalogLaunchControls,
  isCatalogLaunchControl,
  isCatalogLaunchDiscoveryContext,
  isCatalogEditTagsControl,
  isCatalogPinControl,
  isCatalogTagFilterControl,
  catalogTagFilterMatchesSearchPattern,
  shouldExpandCatalogSidebarForDiscovery,
  sortCatalogLaunchByPattern,
} from '@/shared/utils/ui-automation-catalog-discover';
import { compileUiAutomationSearchPattern } from '@/shared/utils/ui-automation-search-pattern';
import {
  LAB_CATALOG_EDIT_TAGS_ACTION_VALUE,
  LAB_CATALOG_FILTER_TAG_ACTION_VALUE,
  LAB_CATALOG_LAUNCH_ACTION_ATTR,
  LAB_CATALOG_LAUNCH_ACTION_VALUE,
  LAB_CATALOG_TOGGLE_PIN_ACTION_VALUE,
} from '@/shared/constants/lab-shell-ui-automation';

function mockLaunchButton(appId: string, appName: string): HTMLElement {
  return {
    classList: { contains: () => false } as unknown as DOMTokenList,
    getAttribute: (name: string) => {
      if (name === 'data-app-id') return appId;
      if (name === 'data-appname') return appName;
      if (name === LAB_CATALOG_LAUNCH_ACTION_ATTR) return LAB_CATALOG_LAUNCH_ACTION_VALUE;
      return null;
    },
  } as unknown as HTMLElement;
}

describe('ui-automation-catalog-discover', () => {
  test('filterToCatalogLaunchControls keeps only launch buttons', () => {
    const launch = mockLaunchButton('app-lab-workflow-studio', 'Workflow Studio');
    const chip = {
      classList: { contains: (c: string) => c === 'lab-catalog-tag-chip' } as unknown as DOMTokenList,
      getAttribute: () => null,
    } as unknown as HTMLElement;
    expect(isCatalogLaunchControl(launch)).toBe(true);
    expect(filterToCatalogLaunchControls([launch, chip])).toEqual([launch]);
  });

  test('catalogLaunchMatchesSearchPattern uses parent card title when button text is Launch only', () => {
    const title = {
      textContent: 'Workflow Studio',
    } as unknown as HTMLElement;
    const article = {
      classList: { contains: () => false } as unknown as DOMTokenList,
      getAttribute: (name: string) => (name === 'data-app-id' ? 'app-lab-workflow-studio' : null),
      querySelector: (sel: string) => (sel.includes('app-card-grid__title') ? title : null),
    } as unknown as HTMLElement;

    const button = {
      classList: { contains: (c: string) => c === 'lab-catalog-launch' } as unknown as DOMTokenList,
      attributes: [] as Attr[],
      dataset: {} as DOMStringMap,
      id: '',
      getAttribute: () => null,
      closest: (sel: string) => (sel.includes('app-card-grid') ? article : null),
      textContent: 'Launch',
    } as unknown as HTMLElement;

    const { regex } = compileUiAutomationSearchPattern('Workflow');
    expect(
      catalogLaunchMatchesSearchPattern(button, regex, (el) => el.textContent?.trim()),
    ).toBe(true);
  });

  test('isCatalogLaunchDiscoveryContext treats sidebar as launch scope', () => {
    expect(isCatalogLaunchDiscoveryContext('lab-app-catalog-sidebar')).toBe(true);
    expect(isCatalogLaunchDiscoveryContext('app-list-container')).toBe(true);
    expect(shouldExpandCatalogSidebarForDiscovery('lab-app-catalog-sidebar')).toBe(true);
    expect(shouldExpandCatalogSidebarForDiscovery('app-list-container')).toBe(false);
  });

  test('catalog pin control matches app id and joins card action pool', () => {
    const pin = {
      classList: { contains: (c: string) => c === 'lab-catalog-pin' } as unknown as DOMTokenList,
      dataset: { appId: 'app-billiards', appname: 'Billiards' },
      getAttribute: (name: string) => {
        if (name === 'data-app-id') return 'app-billiards';
        if (name === 'data-appname') return 'Billiards';
        if (name === LAB_CATALOG_LAUNCH_ACTION_ATTR) return LAB_CATALOG_TOGGLE_PIN_ACTION_VALUE;
        return null;
      },
    } as unknown as HTMLElement;
    expect(isCatalogPinControl(pin)).toBe(true);
    const launch = mockLaunchButton('app-billiards', 'Billiards');
    expect(filterToCatalogCardActionControls([pin, launch])).toEqual([pin, launch]);
    const { regex } = compileUiAutomationSearchPattern('Billiards');
    expect(catalogLaunchMatchesSearchPattern(pin, regex, () => undefined)).toBe(true);
  });

  test('catalog edit-tags control matches app id in card action pool', () => {
    const editTags = {
      classList: { contains: (c: string) => c === 'lab-catalog-edit-tags' } as unknown as DOMTokenList,
      dataset: { appId: 'app-billiards', appname: 'Billiards' },
      textContent: 'Tags',
      getAttribute: (name: string) => {
        if (name === 'data-app-id') return 'app-billiards';
        if (name === 'data-appname') return 'Billiards';
        if (name === LAB_CATALOG_LAUNCH_ACTION_ATTR) return LAB_CATALOG_EDIT_TAGS_ACTION_VALUE;
        return null;
      },
    } as unknown as HTMLElement;
    expect(isCatalogEditTagsControl(editTags)).toBe(true);
    const launch = mockLaunchButton('app-billiards', 'Billiards');
    expect(filterToCatalogCardActionControls([editTags, launch])).toEqual([editTags, launch]);
    const { regex } = compileUiAutomationSearchPattern('Billiards');
    expect(catalogLaunchMatchesSearchPattern(editTags, regex, () => 'Tags')).toBe(true);
  });

  test('catalog tag filter chip matches label pattern', () => {
    const chip = {
      classList: {
        contains: (c: string) => c === 'lab-catalog-tag-chip',
      } as unknown as DOMTokenList,
      dataset: {},
      textContent: 'Games',
      getAttribute: (name: string) => {
        if (name === LAB_CATALOG_LAUNCH_ACTION_ATTR) return LAB_CATALOG_FILTER_TAG_ACTION_VALUE;
        if (name === 'data-catalog-tag-id') return 'games';
        return null;
      },
    } as unknown as HTMLElement;
    expect(isCatalogTagFilterControl(chip)).toBe(true);
    const { regex } = compileUiAutomationSearchPattern('Games');
    expect(catalogTagFilterMatchesSearchPattern(chip, regex, (el) => el.textContent?.trim())).toBe(true);
  });

  test('sortCatalogLaunchByPattern prefers exact app name', () => {
    const exact = mockLaunchButton('app-lab-workflow-studio', 'Workflow Studio');
    const other = mockLaunchButton('app-lab-crm', 'CRM');
    const sorted = sortCatalogLaunchByPattern([other, exact], 'Workflow Studio');
    expect(sorted[0]).toBe(exact);
  });
});
