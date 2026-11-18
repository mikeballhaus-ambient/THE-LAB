/**
 * Platform product apps (Wave A catalog) use `app-lab-*` registry ids and `lab-*` folders under `src/apps/`.
 */

export const LAB_CRM_APP_ID = 'app-lab-crm';
export const LAB_HELP_DESK_APP_ID = 'app-lab-helpdesk';
export const LAB_TASK_LIST_APP_ID = 'app-lab-tasklist';
export const LAB_FORMS_BUILDER_APP_ID = 'app-lab-formsbuilder';
export const LAB_CHART_BUILDER_APP_ID = 'app-lab-chartbuilder';
export const LAB_APP_BUILDER_APP_ID = 'app-lab-app-builder';
export const LAB_KNOWLEDGE_BASE_APP_ID = 'app-knowledge-base';
export const LAB_WORKFLOW_STUDIO_APP_ID = 'app-lab-workflow-studio';
export const LAB_APPROVALS_APP_ID = 'app-lab-approvals-policies';
export const LAB_LEDGER_APP_ID = 'app-lab-financial-ledger';

export const LAB_PRODUCT_APP_IDS = [
  LAB_CRM_APP_ID,
  LAB_HELP_DESK_APP_ID,
  LAB_TASK_LIST_APP_ID,
  LAB_FORMS_BUILDER_APP_ID,
  LAB_CHART_BUILDER_APP_ID,
] as const;

/** Registry id → `src/apps/{folder}` segment (no `app-` prefix). */
export const LAB_PRODUCT_APP_FOLDER_BY_ID: Record<string, string> = {
  [LAB_CRM_APP_ID]: 'lab-crm',
  [LAB_HELP_DESK_APP_ID]: 'lab-helpdesk',
  [LAB_TASK_LIST_APP_ID]: 'lab-tasklist',
  [LAB_FORMS_BUILDER_APP_ID]: 'lab-formsbuilder',
  [LAB_CHART_BUILDER_APP_ID]: 'lab-chartbuilder',
};

/** One-time SQLite + JSON string migration from pre-`app-lab-*` registry ids. */
export const LEGACY_PLATFORM_PRODUCT_APP_ID_MAP: Record<string, string> = {
  'app-crm': LAB_CRM_APP_ID,
  'app-help-desk': LAB_HELP_DESK_APP_ID,
  'app-task-list': LAB_TASK_LIST_APP_ID,
  'app-forms-builder': LAB_FORMS_BUILDER_APP_ID,
  'app-chart-builder': LAB_CHART_BUILDER_APP_ID,
};

export const LEGACY_PLATFORM_PRODUCT_APP_FOLDER_MAP: Record<string, string> = {
  crm: 'lab-crm',
  'help-desk': 'lab-helpdesk',
  'task-list': 'lab-tasklist',
  'forms-builder': 'lab-formsbuilder',
  'chart-builder': 'lab-chartbuilder',
};
