import { computed, ref, type Ref } from 'vue';
import type { IApp } from '@/shared/types/app/App';
import type { RuntimeApp } from '@/shared/types';
import type { PlatformAppTag } from '@/shared/types/platform-app-tags';
import {
  buildCatalogSectionsByTag,
  filterAppsForCatalog,
  splitHeroAndCatalogApps,
} from '@/shared/utils/catalog-tag-utils';

export function useAppCatalog(options: {
  apps: Ref<IApp[]>;
  tags: Ref<PlatformAppTag[]>;
  showServerApps: Ref<boolean>;
}) {
  const searchQuery = ref('');
  const typeFilter = ref<'all' | 'browser' | 'hybrid' | 'server'>('all');
  const selectedTagIds = ref<string[]>([]);

  const knownTagIds = computed(() => new Set(options.tags.value.map((t) => t.id)));

  const filteredApps = computed(() =>
    filterAppsForCatalog({
      apps: options.apps.value,
      searchQuery: searchQuery.value,
      typeFilter: typeFilter.value,
      selectedTagIds: selectedTagIds.value,
      showServerApps: options.showServerApps.value,
      knownTagIds: knownTagIds.value,
    }),
  );

  /** Search/type (and explicit “show all” tag filter) — not tag chip navigation. */
  const isFiltering = computed(
    () =>
      searchQuery.value.trim().length > 0 ||
      selectedTagIds.value.length > 0 ||
      typeFilter.value !== 'all',
  );

  const heroAppsComputed = computed(() => {
    const filtered = filteredApps.value;
    if (isFiltering.value) return [] as RuntimeApp[];
    return splitHeroAndCatalogApps(filtered).heroApps;
  });

  const catalogAppsComputed = computed(() => {
    const filtered = filteredApps.value;
    if (isFiltering.value) return filtered;
    return splitHeroAndCatalogApps(filtered).catalogApps;
  });

  /**
   * Section `(N)` and browse grids use {@link catalogSectionBrowseApps} in AppContainer
   * (platform hero rows omitted only from the Platform section). Tag membership here is
   * the full assignment list from `buildCatalogSectionsByTag`.
   */
  const tagSections = computed(() =>
    buildCatalogSectionsByTag(filteredApps.value, options.tags.value),
  );

  function toggleTagFilter(tagId: string): void {
    const set = new Set(selectedTagIds.value);
    if (set.has(tagId)) set.delete(tagId);
    else set.add(tagId);
    selectedTagIds.value = [...set];
  }

  function clearFilters(): void {
    searchQuery.value = '';
    selectedTagIds.value = [];
    typeFilter.value = 'all';
  }

  return {
    searchQuery,
    typeFilter,
    selectedTagIds,
    filteredApps,
    isFiltering,
    heroApps: heroAppsComputed,
    catalogApps: catalogAppsComputed,
    tagSections,
    toggleTagFilter,
    clearFilters,
  };
}
