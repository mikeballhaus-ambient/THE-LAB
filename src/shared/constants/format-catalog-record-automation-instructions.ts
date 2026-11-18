import {
  LAB_CATALOG_PRIMARY_ID_ATTR,
  LAB_RECORD_ATTR_ACTION,
  LAB_RECORD_ATTR_ID,
  LAB_RECORD_ATTR_NAME,
} from '@/shared/constants/lab-record-automation';
import {
  formatLabCatalogLaunchFaq,
  LAB_UI_AUTOMATION_TOOLS_PHRASE,
} from '@/shared/constants/lab-shell-ui-automation';

export type CatalogHostRecordAutomationDoc = {
  /** Registry id, e.g. `app-polls-surveys` */
  appId: string;
  /** Catalog grid display name, e.g. `Polls & Surveys` */
  displayName: string;
  /** Mounted root class substring for discover `contextArea`, e.g. `polls-surveys-app` */
  contextAreaClass: string;
  /** Human label for the primary row, e.g. `poll question` */
  primaryRecordLabel: string;
  /** Optional extra bullets (integration create, nested entities, etc.) */
  extraBullets?: string[];
};

/**
 * Markdown block appended to catalog host `app-instructions` (rm-68.2).
 */
export function formatCatalogHostRecordAutomationSection(
  doc: CatalogHostRecordAutomationDoc,
): string {
  const extras =
    doc.extraBullets?.map((line) => `- ${line}`).join('\n') ?? '';

  return `
## UI automation (${LAB_UI_AUTOMATION_TOOLS_PHRASE})

- **Launch:** ${formatLabCatalogLaunchFaq(doc.displayName).replace(/^- /, '')}
- **In-app scope:** \`ui_automation_discover_elements\` with \`contextArea: "${doc.contextAreaClass}"\` (mounted tab: \`app-loaded-container\` also works).
- **Edit/delete a ${doc.primaryRecordLabel} by title:** use \`searchPattern\` matching the visible name — discovery matches \`${LAB_RECORD_ATTR_NAME}\` on row actions even when the control is icon-only.
- **Prefer stable targets:** \`button[${LAB_RECORD_ATTR_ID}="<recordId>"][${LAB_RECORD_ATTR_ACTION}="edit"]\` (discovery returns this in \`target\` when attrs are present). Actions: \`edit\` | \`delete\` | \`create\`.
- **Row wrapper:** master list items may expose \`${LAB_CATALOG_PRIMARY_ID_ATTR}\` for scroll/deep link; actions still carry \`${LAB_RECORD_ATTR_ID}\`.
- **Do not** click guessed \`#…-edit\` ids without discovery — use data attrs or discovered \`target\`.
${extras ? `${extras}\n` : ''}`.trim();
}

export type PlatformRecordListAutomationDoc = {
  /** Where the table lives, e.g. `lab-workflow-studio-app` or `settings-container` */
  contextArea: string;
  /** What the rows represent, e.g. `workflow` */
  recordLabel: string;
  /** How to open the surface from catalog/settings */
  launchHint: string;
};

export function formatPlatformRecordListAutomationSection(
  doc: PlatformRecordListAutomationDoc,
): string {
  return `
## UI automation (${LAB_UI_AUTOMATION_TOOLS_PHRASE})

- **Open surface:** ${doc.launchHint} When Sidecar lists this app as **Focused** / **Visible**, skip launch and use **Scope** below.
- **Scope:** \`contextArea: "${doc.contextArea}"\`.
- **Edit/delete a ${doc.recordLabel}:** \`searchPattern\` on the ${doc.recordLabel} **name** → click \`target\` with \`${LAB_RECORD_ATTR_ACTION}="edit"\` or \`"delete"\`.
- **New row:** \`data-lab-record-action="create"\` on the primary **New …** button when present.
- Prefer \`button[${LAB_RECORD_ATTR_ID}="<id>"][${LAB_RECORD_ATTR_ACTION}="edit"]\` over raw \`#id\` selectors.`.trim();
}
