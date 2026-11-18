import type { CatalogTagEnsureSpec } from './ensure-catalog-tags-for-app';
import {
  APP_BUILDER_HOST_CTX_CATALOG_TAG_LABEL,
  APP_BUILDER_HOST_CTX_PRIMARY_CATALOG_TAG_ID,
} from '@/shared/constants/app-builder-host-context';
import type { LabSidecarChatContext } from '@/shared/types/lab-sidecar-view-context';

const stashByUserId = new Map<number, CatalogTagEnsureSpec[]>();

export function rememberAppBuilderCatalogTags(userId: number, specs: CatalogTagEnsureSpec[]): void {
  if (!Number.isFinite(userId) || specs.length === 0) {
    return;
  }
  stashByUserId.set(userId, specs.map((s) => ({ ...s })));
}

export function consumeAppBuilderCatalogTags(userId: number): CatalogTagEnsureSpec[] | undefined {
  const specs = stashByUserId.get(userId);
  if (!specs?.length) {
    return undefined;
  }
  stashByUserId.delete(userId);
  return specs.map((s) => ({ ...s }));
}

export function rememberAppBuilderCatalogTagsFromSidecarContext(
  userId: number,
  ctx: LabSidecarChatContext | undefined | null,
): void {
  if (ctx?.toolProfile !== 'app_builder' || !ctx.hostContext) {
    return;
  }
  const id = ctx.hostContext[APP_BUILDER_HOST_CTX_PRIMARY_CATALOG_TAG_ID]?.trim();
  if (!id) {
    return;
  }
  const label = ctx.hostContext[APP_BUILDER_HOST_CTX_CATALOG_TAG_LABEL]?.trim();
  rememberAppBuilderCatalogTags(userId, [{ id, label: label || undefined }]);
}
