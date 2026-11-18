import {
  LAB_CATALOG_APP_ID_ATTR,
  LAB_CATALOG_APP_NAME_ATTR,
  LAB_CATALOG_CLOSE_TAB_ACTION_VALUE,
  LAB_CATALOG_LAUNCH_ACTION_ATTR,
  LAB_CATALOG_LAUNCH_ACTION_VALUE,
  LAB_CATALOG_EDIT_TAGS_ACTION_VALUE,
  LAB_CATALOG_FILTER_TAG_ACTION_VALUE,
  LAB_CATALOG_TOGGLE_PIN_ACTION_VALUE,
} from '@/shared/constants/lab-shell-ui-automation';
import { elementMatchesUiAutomationSearchPattern } from '@/shared/constants/lab-record-automation';
import { isLabShellWorkspaceControl } from '@/shared/constants/lab-shell-workspace-automation';

const CATALOG_APP_CARD_SELECTOR =
  '.app-card-grid, article.app-card-grid, .app-card-container, .app-card-list, ._card.app-card-list';

export function sampleCatalogLaunchLabels(elements: HTMLElement[], limit = 6): string[] {
  const labels: string[] = [];
  for (const el of elements) {
    if (!isCatalogLaunchControl(el)) continue;
    const identity = resolveCatalogLaunchIdentity(el);
    const name =
      identity?.appName ||
      el.getAttribute(LAB_CATALOG_APP_NAME_ATTR)?.trim() ||
      el.getAttribute('aria-label')?.replace(/^(Launch|Close(?: tab)?)\s+/i, '').trim();
    if (name && !labels.includes(name)) {
      labels.push(name);
    }
    if (labels.length >= limit) break;
  }
  return labels;
}

const CATALOG_DISCOVERY_CONTEXT_MARKERS = [
  'app-list-container',
  'lab-app-catalog-sidebar',
  'app-catalog-body',
  'app-catalog-toolbar',
] as const;

export function isCatalogDiscoveryContext(contextArea: string): boolean {
  const normalized = contextArea.trim();
  return CATALOG_DISCOVERY_CONTEXT_MARKERS.some((marker) => normalized.includes(marker));
}

/** True when a mounted app pane is visible (apps workspace, not catalog-only). */
export function hasVisibleMountedAppWorkspace(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  const panes = document.querySelectorAll('[data-app-pane-app-id]');
  for (const pane of Array.from(panes)) {
    if (!(pane instanceof HTMLElement)) {
      continue;
    }
    const style = window.getComputedStyle(pane);
    if (style.display === 'none' || style.visibility === 'hidden') {
      continue;
    }
    const mount = pane.querySelector('.tab-app-container, [id^="tab-container-"]');
    if (mount && mount.childElementCount > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Catalog **Launch** funnel (search priming, sidebar rail expand, launch-only rows).
 * `app-list-container` is excluded while a mounted app is open — use the app root class instead.
 */
export function isCatalogLaunchDiscoveryContext(contextArea: string): boolean {
  const normalized = contextArea.trim();
  if (!normalized) {
    return false;
  }
  if (
    normalized.includes('lab-app-catalog-sidebar') ||
    normalized.includes('app-catalog-toolbar') ||
    normalized.includes('app-catalog-body')
  ) {
    return true;
  }
  if (normalized.includes('app-list-container')) {
    return !hasVisibleMountedAppWorkspace();
  }
  return false;
}

export function shouldExpandCatalogSidebarForDiscovery(contextArea: string): boolean {
  const normalized = contextArea.trim();
  return (
    isCatalogLaunchDiscoveryContext(contextArea) &&
    (normalized.includes('lab-app-catalog-sidebar') ||
      normalized.includes('lab-catalog-sidebar-rail'))
  );
}

export function isCatalogToolbarControl(el: HTMLElement): boolean {
  if (el.matches('input.lab-catalog-search')) return true;
  if (el.classList.contains('lab-catalog-tag-chip')) return true;
  if (el.matches('.lab-catalog-type-filter button')) return true;
  if (el.classList.contains('app-catalog-hero-carousel__nav')) return true;
  return false;
}

export function isCatalogLaunchControl(el: HTMLElement): boolean {
  const catalogAction = el.getAttribute(LAB_CATALOG_LAUNCH_ACTION_ATTR);
  if (
    catalogAction === LAB_CATALOG_LAUNCH_ACTION_VALUE ||
    catalogAction === LAB_CATALOG_CLOSE_TAB_ACTION_VALUE
  ) {
    return true;
  }
  return (
    el.classList.contains('lab-catalog-launch') ||
    el.classList.contains('lab-catalog-sidebar-launch')
  );
}

export function isCatalogPinControl(el: HTMLElement): boolean {
  const catalogAction = el.getAttribute(LAB_CATALOG_LAUNCH_ACTION_ATTR);
  if (catalogAction === LAB_CATALOG_TOGGLE_PIN_ACTION_VALUE) {
    return true;
  }
  return el.classList.contains('lab-catalog-pin');
}

export function isCatalogEditTagsControl(el: HTMLElement): boolean {
  const catalogAction = el.getAttribute(LAB_CATALOG_LAUNCH_ACTION_ATTR);
  if (catalogAction === LAB_CATALOG_EDIT_TAGS_ACTION_VALUE) {
    return true;
  }
  return el.classList.contains('lab-catalog-edit-tags');
}

export function isCatalogTagFilterControl(el: HTMLElement): boolean {
  if (!el.classList.contains('lab-catalog-tag-chip')) {
    return false;
  }
  if (el.classList.contains('lab-catalog-tag-chip--clear')) {
    return true;
  }
  const catalogAction = el.getAttribute(LAB_CATALOG_LAUNCH_ACTION_ATTR);
  return catalogAction === LAB_CATALOG_FILTER_TAG_ACTION_VALUE;
}

export function isCatalogCardActionControl(el: HTMLElement): boolean {
  return (
    isCatalogLaunchControl(el) ||
    isCatalogPinControl(el) ||
    isCatalogEditTagsControl(el)
  );
}

export function filterToCatalogLaunchControls(elements: HTMLElement[]): HTMLElement[] {
  return elements.filter(isCatalogLaunchControl);
}

export function filterToCatalogCardActionControls(elements: HTMLElement[]): HTMLElement[] {
  return elements.filter(isCatalogCardActionControl);
}

/** Catalog sidebar, rails, toolbar — launch, close-tab, search, expand/collapse. */
export function filterCatalogChromeDiscoverPool(elements: HTMLElement[]): HTMLElement[] {
  return elements.filter(
    (el) =>
      isCatalogToolbarControl(el) ||
      isCatalogLaunchControl(el) ||
      isCatalogPinControl(el) ||
      isCatalogEditTagsControl(el) ||
      isCatalogTagFilterControl(el) ||
      isLabShellWorkspaceControl(el),
  );
}

export function filterToCatalogTagFilterControls(elements: HTMLElement[]): HTMLElement[] {
  return elements.filter(isCatalogTagFilterControl);
}

export function catalogTagFilterMatchesSearchPattern(
  el: HTMLElement,
  regex: RegExp,
  getTextContent: (element: HTMLElement) => string | undefined,
): boolean {
  if (!isCatalogTagFilterControl(el)) return false;
  return elementMatchesUiAutomationSearchPattern(el, regex, getTextContent);
}

export type CatalogLaunchIdentity = {
  appId: string;
  appName: string;
};

/** Registry id + display name from launch attrs or enclosing catalog card (grid title / card data-*). */
export function resolveCatalogLaunchIdentity(el: HTMLElement): CatalogLaunchIdentity | undefined {
  const directId = el.getAttribute(LAB_CATALOG_APP_ID_ATTR)?.trim() ?? '';
  const directName = el.getAttribute(LAB_CATALOG_APP_NAME_ATTR)?.trim() ?? '';
  if (directId || directName) {
    return { appId: directId, appName: directName };
  }

  const card = el.closest(CATALOG_APP_CARD_SELECTOR);
  if (!card) return undefined;

  const cardId =
    card.getAttribute(LAB_CATALOG_APP_ID_ATTR)?.trim() ||
    card.getAttribute('data-app-id')?.trim() ||
    '';
  const cardName =
    card.getAttribute(LAB_CATALOG_APP_NAME_ATTR)?.trim() ||
    card.querySelector('.app-card-grid__title')?.textContent?.trim() ||
    card.querySelector('.font-medium.truncate')?.textContent?.trim() ||
    '';

  if (!cardId && !cardName) return undefined;
  return { appId: cardId, appName: cardName };
}

/**
 * Catalog launch rows: match display name / registry id on the button or parent card
 * (grid Launch buttons often show only the label “Launch”).
 */
export function catalogLaunchMatchesSearchPattern(
  el: HTMLElement,
  regex: RegExp,
  getTextContent: (element: HTMLElement) => string | undefined,
): boolean {
  if (!isCatalogCardActionControl(el)) return false;
  if (elementMatchesUiAutomationSearchPattern(el, regex, getTextContent)) {
    return true;
  }
  const identity = resolveCatalogLaunchIdentity(el);
  if (!identity) return false;
  const { appId, appName } = identity;
  if (appName && regex.test(appName)) return true;
  if (appId && regex.test(appId)) return true;
  const combined = `${appName} ${appId}`.trim();
  return combined.length > 0 && regex.test(combined);
}

export function readCatalogLaunchMeta(el: HTMLElement): { appId: string; appName: string } | undefined {
  if (!isCatalogCardActionControl(el)) return undefined;
  return resolveCatalogLaunchIdentity(el);
}

/** Prefer exact app-name match when multiple launch rows match a loose pattern. */
export function sortCatalogLaunchByPattern(
  elements: HTMLElement[],
  effectiveTerm: string,
): HTMLElement[] {
  const term = effectiveTerm.trim().toLowerCase();
  if (!term) return elements;
  return [...elements].sort((a, b) => {
    const aIdentity = resolveCatalogLaunchIdentity(a);
    const bIdentity = resolveCatalogLaunchIdentity(b);
    const aName = (aIdentity?.appName ?? a.getAttribute(LAB_CATALOG_APP_NAME_ATTR) ?? '').toLowerCase();
    const bName = (bIdentity?.appName ?? b.getAttribute(LAB_CATALOG_APP_NAME_ATTR) ?? '').toLowerCase();
    const aId = (aIdentity?.appId ?? a.getAttribute(LAB_CATALOG_APP_ID_ATTR) ?? '').toLowerCase();
    const bId = (bIdentity?.appId ?? b.getAttribute(LAB_CATALOG_APP_ID_ATTR) ?? '').toLowerCase();
    const score = (name: string, id: string) => {
      if (name === term || id === term) return 0;
      if (name.includes(term) || id.includes(term)) return 1;
      return 2;
    };
    return score(aName, aId) - score(bName, bId);
  });
}
