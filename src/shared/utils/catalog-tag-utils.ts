import type { IApp } from '@/shared/types/app/app.d';
import type { PlatformAppTag } from '@/shared/types/platform-app-tags';

/** Synthetic section for apps with no platform catalog tag assignment (browse mode only). */
export const UNCATALOGED_CATALOG_SECTION_TAG_ID = '__uncategorized__';

export const UNCATALOGED_CATALOG_SECTION_TAG: PlatformAppTag = {
  id: UNCATALOGED_CATALOG_SECTION_TAG_ID,
  label: 'Other apps',
  description: 'Not assigned to a catalog section yet — set tags in Settings or App Management.',
  sortOrder: 9999,
};

export function resolvePrimaryCatalogTagId(
  app: Pick<IApp, 'catalogTagIds'>,
  knownTagIds: Set<string>,
): string | null {
  const ids = app.catalogTagIds ?? [];
  for (const id of ids) {
    if (knownTagIds.has(id)) return id;
  }
  return null;
}

export function isAppUncategorizedForCatalog(
  app: Pick<IApp, 'catalogTagIds'>,
  knownTagIds: Set<string>,
): boolean {
  return resolvePrimaryCatalogTagId(app, knownTagIds) === null;
}

export function appMatchesTagFilter(
  app: Pick<IApp, 'catalogTagIds'>,
  selectedTagIds: string[],
  knownTagIds?: Set<string>,
): boolean {
  if (selectedTagIds.length === 0) return true;
  const known = knownTagIds ?? new Set<string>();
  const assigned = new Set(app.catalogTagIds ?? []);
  const wantsUncategorized = selectedTagIds.includes(UNCATALOGED_CATALOG_SECTION_TAG_ID);
  const wantsTagged = selectedTagIds.some(
    (id) => id !== UNCATALOGED_CATALOG_SECTION_TAG_ID && assigned.has(id),
  );
  const isUncategorized = isAppUncategorizedForCatalog(app, known);
  if (wantsUncategorized && isUncategorized) return true;
  return wantsTagged;
}

export function sortAppsByOrderThenName<T extends Pick<IApp, 'order' | 'name'>>(apps: T[]): T[] {
  return [...apps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
}

export interface CatalogTagSection {
  tag: PlatformAppTag;
  apps: IApp[];
}

/**
 * Browse mode: one section per tag (master sort order). Each app appears once under primary tag.
 */
export function buildCatalogSectionsByPrimaryTag(
  apps: IApp[],
  tags: PlatformAppTag[],
): CatalogTagSection[] {
  const known = new Set(tags.map((t) => t.id));
  const byPrimary = new Map<string, IApp[]>();

  for (const app of apps) {
    const primary = resolvePrimaryCatalogTagId(app, known);
    if (!primary) continue;
    const list = byPrimary.get(primary) ?? [];
    list.push(app);
    byPrimary.set(primary, list);
  }

  const sections: CatalogTagSection[] = [];
  const sortedTags = [...tags].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));

  for (const tag of sortedTags) {
    const sectionApps = sortAppsByOrderThenName(byPrimary.get(tag.id) ?? []);
    if (sectionApps.length === 0) continue;
    sections.push({ tag, apps: sectionApps });
  }

  const uncategorized = sortAppsByOrderThenName(
    apps.filter((app) => isAppUncategorizedForCatalog(app, known)),
  );
  if (uncategorized.length > 0) {
    sections.push({ tag: UNCATALOGED_CATALOG_SECTION_TAG, apps: uncategorized });
  }

  return sections;
}

/**
 * Browse mode: one section per tag listing **every** app carrying that tag.
 *
 * Apps with several tags (e.g. `platform` + `productivity`) appear in each of
 * their sections, so the section list and its `(N)` count match what the app
 * cards advertise and what "Show all" then filters to.
 */
export function buildCatalogSectionsByTag(
  apps: IApp[],
  tags: PlatformAppTag[],
): CatalogTagSection[] {
  const known = new Set(tags.map((t) => t.id));
  const sortedTags = [...tags].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
  );

  const sections: CatalogTagSection[] = [];
  for (const tag of sortedTags) {
    const sectionApps = sortAppsByOrderThenName(
      apps.filter((app) => (app.catalogTagIds ?? []).includes(tag.id)),
    );
    if (sectionApps.length === 0) continue;
    sections.push({ tag, apps: sectionApps });
  }

  const uncategorized = sortAppsByOrderThenName(
    apps.filter((app) => isAppUncategorizedForCatalog(app, known)),
  );
  if (uncategorized.length > 0) {
    sections.push({ tag: UNCATALOGED_CATALOG_SECTION_TAG, apps: uncategorized });
  }

  return sections;
}

export function filterAppsForCatalog(params: {
  apps: IApp[];
  searchQuery: string;
  typeFilter: 'all' | 'browser' | 'hybrid' | 'server';
  selectedTagIds: string[];
  showServerApps: boolean;
  knownTagIds?: Set<string>;
}): IApp[] {
  const q = params.searchQuery.trim().toLowerCase();
  const known = params.knownTagIds ?? new Set<string>();
  return params.apps.filter((app) => {
    if (!params.showServerApps && app.type === 'server') return false;
    if (params.typeFilter !== 'all' && app.type !== params.typeFilter) return false;
    if (!appMatchesTagFilter(app, params.selectedTagIds, known)) return false;
    if (!q) return true;
    const hay = `${app.name} ${app.id} ${app.description}`.toLowerCase();
    return hay.includes(q);
  });
}

export function splitHeroAndCatalogApps(apps: IApp[]): {
  heroApps: IApp[];
  catalogApps: IApp[];
} {
  const heroApps = sortAppsByOrderThenName(apps.filter((a) => a.isSystem === true));
  const heroIds = new Set(heroApps.map((a) => a.id));
  const catalogApps = sortAppsByOrderThenName(apps.filter((a) => !heroIds.has(a.id)));
  return { heroApps, catalogApps };
}
