import { isLabRecordActionControl } from '@/shared/constants/lab-record-automation';
import { isLabShellWorkspaceControl } from '@/shared/constants/lab-shell-workspace-automation';
import {
  isCatalogEditTagsControl,
  isCatalogLaunchControl,
  isCatalogPinControl,
  isCatalogTagFilterControl,
  isCatalogToolbarControl,
} from '@/shared/utils/ui-automation-catalog-discover';

/** Vue 3 runtime stores component event invokers on the DOM node (`patchEvent`). */
const VUE_EVENT_INVOKERS_KEY = '_vei';

const ACTIONABLE_ROLES = new Set([
  'button',
  'link',
  'tab',
  'menuitem',
  'option',
  'switch',
  'checkbox',
  'radio',
  'treeitem',
]);

const NATIVE_ACTIONABLE_TAGS = new Set(['button', 'a', 'input', 'select', 'textarea', 'summary', 'audio']);

/** Extra nodes to scan inside a discover scope (Vue `@click` divs, lab-tagged controls). */
export const UI_AUTOMATION_ACTIONABLE_SUPPLEMENT_SELECTOR = [
  '[data-lab-record-action]',
  '[data-lab-catalog-action]',
  '[data-lab-shell-action]',
  '[data-lab-interactive]',
  '[onclick]',
  'div.cursor-pointer',
  'span.cursor-pointer',
  'li.cursor-pointer',
].join(', ');

export function hasVueBoundClickHandler(el: HTMLElement): boolean {
  const invokers = (el as unknown as Record<string, unknown>)[VUE_EVENT_INVOKERS_KEY];
  if (!invokers || typeof invokers !== 'object') return false;
  return Object.keys(invokers as Record<string, unknown>).some(
    (key) =>
      key === 'onClick'
      || key === 'onPointerup'
      || key === 'onMousedown'
      || key === 'onKeydown',
  );
}

export function hasDeclarativeClickHandler(el: HTMLElement): boolean {
  if (el.onclick != null) return true;
  if (el.hasAttribute('onclick')) return true;
  return hasVueBoundClickHandler(el);
}

/** Tab panels, data tables, and list shells: focusable but not a click target. */
export function isLikelyPassiveLayoutShell(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag !== 'div' && tag !== 'span' && tag !== 'section') return false;

  const text = el.textContent?.trim() ?? '';
  if (text.length < 180) return false;

  if (
    el.classList.contains('p-tabpanel')
    || el.classList.contains('p-datatable')
    || el.classList.contains('lab-workflows-list')
    || el.classList.contains('lab-workflows-management')
    || el.classList.contains('p-tabview-panels')
  ) {
    return true;
  }

  if (el.querySelector('table, .p-datatable-table, .p-datatable-tbody, .p-tabview-panel')) {
    return text.length > 250;
  }

  return text.length > 450;
}

/**
 * Discover pool: actionable controls only — native inputs, lab record/launch attrs,
 * explicit roles, and non-native nodes with real click handlers (`@click` / `onclick`).
 * Tabindex-only scroll/focus shells are excluded.
 */
export function isUiAutomationDiscoverCandidate(el: HTMLElement): boolean {
  if (isLabRecordActionControl(el)) return true;
  if (isCatalogLaunchControl(el)) return true;
  if (isCatalogPinControl(el)) return true;
  if (isCatalogEditTagsControl(el)) return true;
  if (isCatalogTagFilterControl(el)) return true;
  if (isCatalogToolbarControl(el)) return true;

  if (el.hasAttribute('data-lab-interactive')) return true;

  const tag = el.tagName.toLowerCase();
  if (NATIVE_ACTIONABLE_TAGS.has(tag)) {
    return true;
  }

  const role = el.getAttribute('role');
  if (role && ACTIONABLE_ROLES.has(role)) {
    return true;
  }

  if (hasDeclarativeClickHandler(el)) {
    return !isLikelyPassiveLayoutShell(el);
  }

  if (tag === 'div' || tag === 'span' || tag === 'li') {
    if (el.classList.contains('cursor-pointer') && !isLikelyPassiveLayoutShell(el)) {
      return true;
    }
  }

  return false;
}

export function mergeDiscoverCandidates(
  primary: HTMLElement[],
  supplemental: HTMLElement[],
): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const merged: HTMLElement[] = [];
  for (const el of [...primary, ...supplemental]) {
    if (seen.has(el)) continue;
    if (!isUiAutomationDiscoverCandidate(el)) continue;
    seen.add(el);
    merged.push(el);
  }
  return merged;
}

/** Drop ancestors when a more specific descendant also matched (e.g. list shell div vs row edit button). */
export function pruneNestedDiscoverMatches(elements: HTMLElement[]): HTMLElement[] {
  return elements.filter(
    (el) => !elements.some((other) => other !== el && el !== other && el.contains(other)),
  );
}

/**
 * When row action buttons matched, omit generic containers that only matched via aggregated textContent.
 */
export function refineDiscoverMatchesByUiRole(elements: HTMLElement[]): HTMLElement[] {
  const recordActions = elements.filter(isLabRecordActionControl);
  if (recordActions.length > 0) {
    return recordActions;
  }
  const shellControls = elements.filter(isLabShellWorkspaceControl);
  if (shellControls.length > 0) {
    return shellControls;
  }
  const launches = elements.filter(isCatalogLaunchControl);
  const pins = elements.filter(isCatalogPinControl);
  const editTags = elements.filter(isCatalogEditTagsControl);
  const tagFilters = elements.filter(isCatalogTagFilterControl);
  if (launches.length > 0 || pins.length > 0 || editTags.length > 0 || tagFilters.length > 0) {
    return [...tagFilters, ...launches, ...pins, ...editTags];
  }
  return pruneNestedDiscoverMatches(elements);
}
