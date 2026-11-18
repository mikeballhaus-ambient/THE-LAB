import { formatLabShellOverlaySubtitle } from '@/shared/composables/lab-sidecar/format-lab-shell-overlay-guidance';
import { LAB_SHELL_LABORATORY_VIEW_LABEL } from '@/shared/constants/lab-shell-naming';
import type { LabSidecarViewContext } from '@/shared/types/lab-sidecar-view-context';
import type { RuntimeApp } from '@/shared/types';

export function resolveAppDisplayName(appId: string, apps: readonly RuntimeApp[]): string {
  const match = apps.find((app) => app.id === appId);
  const name = match?.name?.trim();
  return name && name.length > 0 ? name : appId;
}

export function formatLabSidecarScopeSubtitle(
  ctx: LabSidecarViewContext,
  apps: readonly RuntimeApp[],
): string {
  if (ctx.toolProfile === 'app_builder') {
    return 'App Builder';
  }
  if (ctx.shellOverlay) {
    return formatLabShellOverlaySubtitle(ctx.shellOverlay);
  }
  switch (ctx.viewMode) {
    case 'apps_home':
      return 'Apps home';
    case 'single_app': {
      const appId = ctx.focusedAppId ?? ctx.visibleAppIds[0] ?? null;
      return appId ? resolveAppDisplayName(appId, apps) : 'App';
    }
    case 'split_apps': {
      const ids =
        ctx.splitAppIds && ctx.splitAppIds.length === 2
          ? ctx.splitAppIds
          : ctx.visibleAppIds;
      if (ids.length === 0) {
        return 'Split view';
      }
      return ids.map((id) => resolveAppDisplayName(id, apps)).join(' · ');
    }
    case 'lab_assistant_full':
      return `Full ${LAB_SHELL_LABORATORY_VIEW_LABEL}`;
    default:
      return 'THE-LAB';
  }
}
