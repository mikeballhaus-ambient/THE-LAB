import { CRM_APP_REGISTRY_ID } from '@/apps/lab-crm/shared/constants/app-scope';
import type { LabApprovalRequestRecord } from '@/shared/types/lab-approval';
import {
  LAB_HOST_CTX_CRM_OPEN_ENTITY_KEY,
  LAB_HOST_CTX_CRM_OPEN_READ_ONLY,
  LAB_HOST_CTX_CRM_OPEN_RECORD_ID,
} from '@/shared/lab-integrations/lab-host-context-keys';
import type { LabWorkspaceContextApi } from '@/shared/composables/useLabWorkspaceContext';

export function canOpenCrmRecordFromApprovalRequest(request: LabApprovalRequestRecord): boolean {
  if (request.subjectAppId !== CRM_APP_REGISTRY_ID) {
    return false;
  }
  const entityKey = request.subjectEntityType?.trim();
  const recordId = request.subjectEntityId?.trim();
  return Boolean(entityKey && recordId);
}

export function stageCrmOpenFromApprovalRequest(
  workspace: LabWorkspaceContextApi | null,
  request: LabApprovalRequestRecord,
): boolean {
  if (!workspace || !canOpenCrmRecordFromApprovalRequest(request)) {
    return false;
  }
  workspace.setHostContext({
    [LAB_HOST_CTX_CRM_OPEN_ENTITY_KEY]: request.subjectEntityType.trim(),
    [LAB_HOST_CTX_CRM_OPEN_RECORD_ID]: request.subjectEntityId.trim(),
    [LAB_HOST_CTX_CRM_OPEN_READ_ONLY]: '1',
  });
  return true;
}
