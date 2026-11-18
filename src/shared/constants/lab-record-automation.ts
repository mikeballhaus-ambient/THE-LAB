/**
 * Stable DOM contract for list / table row actions (catalog masters, Settings tables, Forms Builder dialogs).
 * Agents target `[data-lab-record-id][data-lab-record-action]` instead of ambiguous per-row `#id`s.
 */

import { elementAttributeValuesForUiAutomationSearch } from '@/shared/utils/ui-automation-search-pattern';

export const LAB_RECORD_ATTR_ID = 'data-lab-record-id';
export const LAB_RECORD_ATTR_NAME = 'data-lab-record-name';
export const LAB_RECORD_ATTR_ACTION = 'data-lab-record-action';

/** Aligns with catalog primary-record deep links (`useCatalogPrimaryRecordDeepLink`). */
export const LAB_CATALOG_PRIMARY_ID_ATTR = 'data-catalog-primary-id';

export type LabRecordAutomationAction =
  | 'edit'
  | 'delete'
  | 'create'
  | 'cancel'
  | 'save';

/** PrimeVue `:pt` for icon/text row actions (catalog masters, nested entity rows). */
export function labRecordActionButtonPt(
  generateUniqueId: (prefix: string) => string,
  idPrefix: string,
  action: LabRecordAutomationAction,
  recordId: string | number,
  recordName?: string,
): { root: { attrs: Record<string, string> } } {
  return {
    root: {
      attrs: {
        id: generateUniqueId(`${idPrefix}-${action}-${recordId}`),
        ...labRecordActionRootAttrs(action, recordId, recordName),
      },
    },
  };
}

export function labRecordActionRootAttrs(
  action: LabRecordAutomationAction,
  recordId: string | number,
  recordName?: string,
): Record<string, string> {
  const attrs: Record<string, string> = {
    [LAB_RECORD_ATTR_ACTION]: action,
    [LAB_RECORD_ATTR_ID]: String(recordId),
  };
  const name = recordName?.trim();
  if (name) {
    attrs[LAB_RECORD_ATTR_NAME] = name;
  }
  attrs['aria-label'] = name ? `${action} ${name}` : `${action} record ${recordId}`;
  return attrs;
}

/** Optional wrapper attrs for list rows (catalog `li`, table row host). */
export function labRecordRowContainerAttrs(
  recordId: string | number,
  recordName?: string,
): Record<string, string> {
  const attrs: Record<string, string> = {
    [LAB_CATALOG_PRIMARY_ID_ATTR]: String(recordId),
  };
  const name = recordName?.trim();
  if (name) {
    attrs[LAB_RECORD_ATTR_NAME] = name;
  }
  return attrs;
}

function escapeSelectorValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function buildLabRecordActionTargetSelector(
  tagName: string,
  recordId: string | number,
  action: LabRecordAutomationAction,
): string {
  const id = escapeSelectorValue(String(recordId));
  const tag = tagName.toLowerCase();
  return `${tag}[${LAB_RECORD_ATTR_ID}="${id}"][${LAB_RECORD_ATTR_ACTION}="${action}"]`;
}

/** Used by UIAutomationHandler searchPattern matching (unit-tested). */
export function elementMatchesUiAutomationSearchPattern(
  el: HTMLElement,
  regex: RegExp,
  getTextContent: (element: HTMLElement) => string | undefined,
): boolean {
  if (el.id?.match(regex)) return true;
  if (el.className?.toString().match(regex)) return true;
  for (const value of elementAttributeValuesForUiAutomationSearch(el)) {
    if (regex.test(value)) return true;
  }
  const text = getTextContent(el);
  return Boolean(text?.match(regex));
}

export function isLabRecordActionControl(el: HTMLElement): boolean {
  const action = el.getAttribute(LAB_RECORD_ATTR_ACTION)?.trim();
  if (!action) return false;
  return Boolean(el.getAttribute(LAB_RECORD_ATTR_ID)?.trim());
}

export type LabRecordActionDiscoverMeta = {
  recordId: string;
  recordName?: string;
  action: LabRecordAutomationAction;
};

export function readLabRecordActionDiscoverMeta(el: HTMLElement): LabRecordActionDiscoverMeta | undefined {
  const action = el.getAttribute(LAB_RECORD_ATTR_ACTION)?.trim() as LabRecordAutomationAction | undefined;
  const recordId = el.getAttribute(LAB_RECORD_ATTR_ID)?.trim();
  if (!action || !recordId) return undefined;
  const recordName = el.getAttribute(LAB_RECORD_ATTR_NAME)?.trim();
  return {
    recordId,
    action,
    ...(recordName ? { recordName } : {}),
  };
}

export const LAB_RECORD_AUTOMATION_GUIDANCE = `
Record list / table CRUD (catalog apps, Settings, integration dialogs):
- Row edit/delete/create actions expose \`${LAB_RECORD_ATTR_ACTION}\` (\`edit\` | \`delete\` | \`create\` | \`save\` | \`cancel\`), \`${LAB_RECORD_ATTR_ID}\`, and optional \`${LAB_RECORD_ATTR_NAME}\` (workflow title, poll question, etc.).
- Prefer \`elementRef\` from discover, then \`target\` \`button[${LAB_RECORD_ATTR_ID}="<id>"][${LAB_RECORD_ATTR_ACTION}="edit"]\`. \`searchPattern\` matches record **names** on those attributes even when the control is icon-only.
- Catalog masters: list item may also have \`${LAB_CATALOG_PRIMARY_ID_ATTR}\` for scroll/deep link; row actions still carry \`${LAB_RECORD_ATTR_ID}\`.
- Per-row \`generateUniqueId('<app>-edit-<recordId>')\` is valid for humans; agents should use data attrs. **Never** reuse the same \`generateUniqueId('…-edit')\` prefix inside a \`v-for\` without \`\${recordId}\` — duplicate ids break automation.
- Forms Builder save/cancel bars use the same action attr contract on primary/secondary buttons when hosted in catalog dialogs.
`.trim();
