import {
  isCatalogDiscoveryContext,
  isCatalogLaunchDiscoveryContext,
} from '@/shared/utils/ui-automation-catalog-discover';

export type UiAutomationDiscoverIntent =
  | 'catalog-launch'
  | 'catalog-chrome'
  | 'workspace'
  | 'default';

/**
 * Chooses discover filtering — launch funnel vs workspace chrome vs generic in-app.
 */
export function resolveUiAutomationDiscoverIntent(contextArea: string): UiAutomationDiscoverIntent {
  const normalized = contextArea.trim();
  if (!normalized) {
    return 'default';
  }
  if (
    normalized.includes('lab-workspace-tabbar') ||
    normalized.includes('app-view-layout')
  ) {
    return 'workspace';
  }
  if (
    normalized.includes('lab-catalog-sidebar-rail') ||
    normalized.includes('lab-running-apps-rail') ||
    normalized.includes('lab-app-catalog-sidebar-shell') ||
    normalized.includes('lab-running-apps-rail-shell')
  ) {
    return 'catalog-chrome';
  }
  if (isCatalogLaunchDiscoveryContext(normalized)) {
    return 'catalog-launch';
  }
  if (isCatalogDiscoveryContext(normalized)) {
    return 'catalog-chrome';
  }
  return 'default';
}
