/** Host context keys for cross-app navigation from platform chrome (Settings inbox, etc.). */
export const LAB_HOST_CTX_CRM_OPEN_ENTITY_KEY = 'crmOpenEntityKey';
export const LAB_HOST_CTX_CRM_OPEN_RECORD_ID = 'crmOpenRecordId';
/** When set (e.g. `'1'`), CRM opens the record view with mutations disabled (Approvals inbox → View CRM record). */
export const LAB_HOST_CTX_CRM_OPEN_READ_ONLY = 'crmOpenReadOnly';

/** Open a Settings panel by nav id (`approvals`, …). Consumed by Settings dialog on open. */
export const LAB_HOST_CTX_SETTINGS_VIEW = 'labSettingsView';

/** Open Approvals decide dialog for this request id (Settings → Approvals). */
export const LAB_HOST_CTX_APPROVAL_OPEN_REQUEST_ID = 'labApprovalOpenRequestId';

/** Catalog workspace: expand/focus primary entity row by numeric id (Polls, etc.). */
export const LAB_HOST_CTX_CATALOG_OPEN_PRIMARY_RECORD_ID = 'catalogOpenPrimaryRecordId';
