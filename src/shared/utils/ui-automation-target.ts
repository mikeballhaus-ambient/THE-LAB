import {
  buildLabCatalogLaunchTargetSelector,
  LAB_CATALOG_APP_ID_ATTR,
  LAB_CATALOG_CLOSE_TAB_ACTION_VALUE,
  LAB_CATALOG_LAUNCH_ACTION_ATTR,
  LAB_CATALOG_LAUNCH_ACTION_VALUE,
} from '@/shared/constants/lab-shell-ui-automation';
import {
  buildLabShellActionTargetSelector,
  LAB_SHELL_ACTION_ATTR,
  readLabShellActionDiscoverMeta,
} from '@/shared/constants/lab-shell-workspace-automation';
import { resolveCatalogLaunchIdentity } from '@/shared/utils/ui-automation-catalog-discover';
import {
  buildLabRecordActionTargetSelector,
  LAB_RECORD_ATTR_ACTION,
  LAB_RECORD_ATTR_ID,
  type LabRecordAutomationAction,
} from '@/shared/constants/lab-record-automation';

export const LAB_UI_AUTOMATION_REF_ATTR = 'data-lab-ui-automation-ref';

function escapeSelectorValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Stable ref stamped on the DOM during discover — preferred for element_action. */
export function assignUiAutomationElementRef(el: HTMLElement): string {
  const existing = el.getAttribute(LAB_UI_AUTOMATION_REF_ATTR);
  if (existing) return existing;
  const ref = `ui-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  el.setAttribute(LAB_UI_AUTOMATION_REF_ATTR, ref);
  return ref;
}

export function buildUiAutomationElementRefSelector(ref: string): string {
  const escaped = escapeSelectorValue(ref);
  return `[${LAB_UI_AUTOMATION_REF_ATTR}="${escaped}"]`;
}

/**
 * Canonical CSS target for discovery (record actions, catalog launch, then data-* / id).
 * Same rules as action resolution when falling back from elementRef.
 */
export function buildUiAutomationDiscoveryTarget(element: HTMLElement): string {
  const recordAction = element.getAttribute(LAB_RECORD_ATTR_ACTION);
  const recordId = element.getAttribute(LAB_RECORD_ATTR_ID);
  if (recordAction && recordId) {
    return buildLabRecordActionTargetSelector(
      element.tagName,
      recordId,
      recordAction as LabRecordAutomationAction,
    );
  }

  const shellMeta = readLabShellActionDiscoverMeta(element);
  if (shellMeta && element.hasAttribute(LAB_SHELL_ACTION_ATTR)) {
    return buildLabShellActionTargetSelector(
      element.tagName,
      shellMeta.action,
      shellMeta.targetAppId,
    );
  }

  const catalogLaunchAction = element.getAttribute(LAB_CATALOG_LAUNCH_ACTION_ATTR);
  const catalogAppId = element.getAttribute(LAB_CATALOG_APP_ID_ATTR);
  if (
    catalogAppId &&
    (catalogLaunchAction === LAB_CATALOG_LAUNCH_ACTION_VALUE ||
      catalogLaunchAction === LAB_CATALOG_CLOSE_TAB_ACTION_VALUE)
  ) {
    const tag = element.tagName.toLowerCase();
    const id = catalogAppId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const action = catalogLaunchAction ?? LAB_CATALOG_LAUNCH_ACTION_VALUE;
    return `${tag}[${LAB_CATALOG_APP_ID_ATTR}="${id}"][${LAB_CATALOG_LAUNCH_ACTION_ATTR}="${action}"]`;
  }
  if (catalogLaunchAction === LAB_CATALOG_LAUNCH_ACTION_VALUE && catalogAppId) {
    return buildLabCatalogLaunchTargetSelector(element.tagName, catalogAppId);
  }
  const launchIdentity = resolveCatalogLaunchIdentity(element);
  if (launchIdentity?.appId) {
    const isLaunch =
      catalogLaunchAction === LAB_CATALOG_LAUNCH_ACTION_VALUE ||
      element.classList.contains('lab-catalog-launch') ||
      element.classList.contains('lab-catalog-sidebar-launch');
    if (isLaunch) {
      return buildLabCatalogLaunchTargetSelector(element.tagName, launchIdentity.appId);
    }
  }

  const ref = element.getAttribute(LAB_UI_AUTOMATION_REF_ATTR);
  if (ref) {
    return buildUiAutomationElementRefSelector(ref);
  }

  let selector = element.tagName.toLowerCase();
  if (element.id) {
    selector += `#${element.id}`;
  }
  const classes = Array.from(element.classList).slice(0, 2);
  if (classes.length > 0) {
    selector += `.${classes.join('.')}`;
  }
  const dataAttrs: Record<string, string> = {};
  for (const attr of element.attributes) {
    if (attr.name.startsWith('data-')) {
      dataAttrs[attr.name] = attr.value;
    }
  }
  if (Object.keys(dataAttrs).length > 0) {
    selector += Object.entries(dataAttrs)
      .map(([key, value]) => `[${key}="${escapeSelectorValue(value)}"]`)
      .join('');
  }
  return selector;
}

export function resolveUiAutomationElement(
  target?: string | null,
  elementRef?: string | null,
): HTMLElement | null {
  const ref = elementRef?.trim();
  if (ref) {
    const byRef = document.querySelector(
      buildUiAutomationElementRefSelector(ref),
    ) as HTMLElement | null;
    if (byRef) return byRef;
  }
  const selector = target?.trim();
  if (selector) {
    return document.querySelector(selector) as HTMLElement | null;
  }
  return null;
}
