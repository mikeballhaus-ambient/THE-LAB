import type { CreateAppParamsSchema } from '../../../../../shared/types';
import type { CatalogTagEnsureSpec } from '../../../../db/AppTags/ensure-catalog-tags-for-app';

export function resolveCreateAppCatalogTagSpecs(
  params: Pick<CreateAppParamsSchema, 'catalogTags' | 'catalogTagIds'>,
): CatalogTagEnsureSpec[] | undefined {
  if (params.catalogTags && params.catalogTags.length > 0) {
    return params.catalogTags.map((t) => ({
      id: t.id,
      label: t.label,
      description: t.description,
      sortOrder: t.sortOrder,
    }));
  }
  if (params.catalogTagIds && params.catalogTagIds.length > 0) {
    return params.catalogTagIds.map((id) => ({ id }));
  }
  return undefined;
}
