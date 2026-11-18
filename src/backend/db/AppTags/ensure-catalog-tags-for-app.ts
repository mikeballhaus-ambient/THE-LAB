import { appTagsService } from './app-tags-service';

export interface CatalogTagEnsureSpec {
  id: string;
  label?: string;
  description?: string;
  sortOrder?: number;
}

const TAG_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function labelFromCatalogTagId(tagId: string): string {
  return tagId
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeCatalogTagId(raw: string): string {
  const id = raw.trim().toLowerCase();
  if (!TAG_ID_PATTERN.test(id)) {
    throw new Error(
      `Invalid catalog tag id "${raw}". Use lowercase slug (e.g. examples, demo-training).`,
    );
  }
  return id;
}

/**
 * Ensures platform catalog tags exist, then links `appId` (primary tag first).
 * Used by TemplateGenerator / app_management_create_app after the apps row exists.
 */
export function ensureCatalogTagsAndLinkApp(appId: string, specs: CatalogTagEnsureSpec[]): void {
  if (!appId.trim()) {
    throw new Error('appId is required to assign catalog tags');
  }
  if (specs.length === 0) {
    return;
  }

  const orderedIds: string[] = [];
  for (const spec of specs) {
    const id = normalizeCatalogTagId(spec.id);
    if (orderedIds.includes(id)) {
      continue;
    }
    orderedIds.push(id);

    const existing = appTagsService.listTags().find((t) => t.id === id);
    if (!existing) {
      appTagsService.createTag({
        id,
        label: spec.label?.trim() || labelFromCatalogTagId(id),
        description: spec.description?.trim() ?? '',
        sortOrder: spec.sortOrder,
      });
    }
  }

  appTagsService.setAppTags(appId, orderedIds);
}
