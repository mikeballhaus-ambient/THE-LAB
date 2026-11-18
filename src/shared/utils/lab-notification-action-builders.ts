import type { LabNotificationAction } from '@/shared/types/lab-notification-action';
import { LAB_HOST_CTX_CATALOG_OPEN_PRIMARY_RECORD_ID } from '@/shared/lab-integrations/lab-host-context-keys';

/** Launch a catalog host and focus a primary entity row from event payload. */
export function catalogLaunchPrimaryRecordAction(
  appId: string,
  label: string,
  recordIdPayloadPath: string,
): LabNotificationAction {
  const templatePath = recordIdPayloadPath.startsWith('payload.')
    ? `{{${recordIdPayloadPath}}}`
    : `{{payload.${recordIdPayloadPath}}}`;
  return {
    kind: 'launch_app',
    label,
    appId,
    hostContext: {
      [LAB_HOST_CTX_CATALOG_OPEN_PRIMARY_RECORD_ID]: templatePath,
    },
  };
}
