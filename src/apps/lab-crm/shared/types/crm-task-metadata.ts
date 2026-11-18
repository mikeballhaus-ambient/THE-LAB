import { CRM_APP_REGISTRY_ID } from '@/apps/lab-tasklist/shared/constants/app-scope';

/** Versioned JSON stored in Task List `tasks.metadata` (TEXT). */
export const CRM_TASK_METADATA_SCHEMA_VERSION = 1;

/** CRM-specific payload inside task.metadata (host apps may extend with custom keys). */
export interface CrmTaskMetadataV1 {
  schemaVersion: typeof CRM_TASK_METADATA_SCHEMA_VERSION;
  hostAppId: typeof CRM_APP_REGISTRY_ID;
  entityKey: string;
  recordId: number;
  /** Optional workflow hint (e.g. pipeline stage at creation time). */
  workflow?: string;
  stage?: string;
  /** Human label for list UI without re-fetching the entity. */
  recordLabel?: string;
}

export type CrmTaskMetadata = CrmTaskMetadataV1;

export function buildCrmTaskMetadata(input: {
  entityKey: string;
  recordId: number;
  workflow?: string;
  stage?: string;
  recordLabel?: string;
}): string {
  const payload: CrmTaskMetadataV1 = {
    schemaVersion: CRM_TASK_METADATA_SCHEMA_VERSION,
    hostAppId: CRM_APP_REGISTRY_ID,
    entityKey: input.entityKey,
    recordId: input.recordId,
    ...(input.workflow ? { workflow: input.workflow } : {}),
    ...(input.stage ? { stage: input.stage } : {}),
    ...(input.recordLabel ? { recordLabel: input.recordLabel } : {}),
  };
  return JSON.stringify(payload);
}

export function parseCrmTaskMetadata(raw: string | null | undefined): CrmTaskMetadataV1 | null {
  if (raw == null || String(raw).trim() === '') {
    return null;
  }
  try {
    const parsed = JSON.parse(String(raw)) as Partial<CrmTaskMetadataV1>;
    if (parsed.schemaVersion !== CRM_TASK_METADATA_SCHEMA_VERSION) {
      return null;
    }
    if (parsed.hostAppId !== CRM_APP_REGISTRY_ID) {
      return null;
    }
    if (!parsed.entityKey || parsed.recordId == null || Number.isNaN(Number(parsed.recordId))) {
      return null;
    }
    return {
      schemaVersion: CRM_TASK_METADATA_SCHEMA_VERSION,
      hostAppId: CRM_APP_REGISTRY_ID,
      entityKey: parsed.entityKey,
      recordId: Number(parsed.recordId),
      workflow: parsed.workflow,
      stage: parsed.stage,
      recordLabel: parsed.recordLabel,
    };
  } catch {
    return null;
  }
}

export function crmTaskMatchesEntity(
  metadataRaw: string | null | undefined,
  entityKey: string,
  recordId: number,
): boolean {
  const meta = parseCrmTaskMetadata(metadataRaw);
  if (!meta) {
    return false;
  }
  return meta.entityKey === entityKey && meta.recordId === recordId;
}
