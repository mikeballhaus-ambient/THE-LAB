import { CRM_APP_REGISTRY_ID } from '../constants/app-scope';

export const HELP_DESK_CRM_METADATA_SCHEMA_VERSION = 1;

export interface HelpDeskCrmMetadataV1 {
  schemaVersion: typeof HELP_DESK_CRM_METADATA_SCHEMA_VERSION;
  hostAppId: typeof CRM_APP_REGISTRY_ID;
  entityKey: string;
  recordId: number;
  recordLabel?: string;
}

export function buildHelpDeskCrmMetadata(input: {
  entityKey: string;
  recordId: number;
  recordLabel?: string;
}): string {
  const payload: HelpDeskCrmMetadataV1 = {
    schemaVersion: HELP_DESK_CRM_METADATA_SCHEMA_VERSION,
    hostAppId: CRM_APP_REGISTRY_ID,
    entityKey: input.entityKey,
    recordId: input.recordId,
    ...(input.recordLabel ? { recordLabel: input.recordLabel } : {}),
  };
  return JSON.stringify(payload);
}

export function parseHelpDeskCrmMetadata(raw: string | null | undefined): HelpDeskCrmMetadataV1 | null {
  if (raw == null || String(raw).trim() === '') {
    return null;
  }
  try {
    const parsed = JSON.parse(String(raw)) as Partial<HelpDeskCrmMetadataV1>;
    if (parsed.schemaVersion !== HELP_DESK_CRM_METADATA_SCHEMA_VERSION) {
      return null;
    }
    if (parsed.hostAppId !== CRM_APP_REGISTRY_ID) {
      return null;
    }
    if (!parsed.entityKey || parsed.recordId == null || Number.isNaN(Number(parsed.recordId))) {
      return null;
    }
    return {
      schemaVersion: HELP_DESK_CRM_METADATA_SCHEMA_VERSION,
      hostAppId: CRM_APP_REGISTRY_ID,
      entityKey: parsed.entityKey,
      recordId: Number(parsed.recordId),
      recordLabel: parsed.recordLabel,
    };
  } catch {
    return null;
  }
}

export function ticketMatchesEntity(
  metadataRaw: string | null | undefined,
  entityKey: string,
  recordId: number,
): boolean {
  const meta = parseHelpDeskCrmMetadata(metadataRaw);
  if (!meta) {
    return false;
  }
  return meta.entityKey === entityKey && meta.recordId === recordId;
}
