import { appsService } from '@/backend/db/Apps/apps-service';
import { appTagsService } from '@/backend/db/AppTags/app-tags-service';
import type { LabSidecarCatalogAppEntry } from '@/shared/composables/lab-sidecar/format-lab-sidecar-catalog-registry';
import { formatLabSidecarSystemPromptAppendix } from '@/shared/composables/lab-sidecar/format-lab-sidecar-system-prompt';
import type { LabSidecarChatContext } from '@/shared/types/lab-sidecar-view-context';

function resolveAppInstructionsMap(ctx: LabSidecarChatContext): Record<string, string> {
  const map: Record<string, string> = {};
  const ids = new Set(ctx.visibleAppIds);
  if (ctx.focusedAppId) {
    ids.add(ctx.focusedAppId);
  }
  if (ctx.splitAppIds) {
    for (const appId of ctx.splitAppIds) {
      ids.add(appId);
    }
  }
  for (const appId of ids) {
    const app = appsService.getAppById(appId);
    if (app?.appSystemInstructions?.trim()) {
      map[appId] = app.appSystemInstructions.trim();
    }
  }
  return map;
}

function resolveSidecarCatalogRegistry(
  ctx: LabSidecarChatContext,
): LabSidecarCatalogAppEntry[] | undefined {
  if (ctx.shellOverlay || ctx.viewMode === 'lab_assistant_full') {
    return undefined;
  }
  const tagRows = appTagsService.listTags();
  const labelById = new Map(tagRows.map((t) => [t.id, t.label]));
  return appsService
    .getAllAppsWithCatalogTags()
    .map((app) => ({
      id: app.id,
      name: app.name,
      description: app.description ?? '',
      type: app.type,
      categories: (app.catalogTagIds ?? []).map((tagId) => labelById.get(tagId) ?? tagId),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function appendLabSidecarContextToSystemMessage(
  sysMsg: string,
  ctx: LabSidecarChatContext | undefined | null,
): Promise<string> {
  if (!ctx || ctx.viewMode === 'lab_assistant_full') {
    return sysMsg;
  }
  const catalogRegistry = ctx ? resolveSidecarCatalogRegistry(ctx) : undefined;
  const appendix = formatLabSidecarSystemPromptAppendix(
    ctx,
    resolveAppInstructionsMap(ctx),
    catalogRegistry,
  );
  return `${sysMsg}\n${appendix}`;
}
