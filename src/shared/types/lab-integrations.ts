/** rm-64 — global integration bindings (platform main DB). */

export const LAB_INTEGRATION_KINDS = [
  'form.surface',
  'chart.surface',
  'connector.read',
  'task.surface',
  'approval.flow',
  'ledger.posting',
  'event.publish',
] as const;

export type LabIntegrationKind = (typeof LAB_INTEGRATION_KINDS)[number];

export type LabIntegrationPresentation = 'inline' | 'dialog';

export interface LabIntegrationPlacement {
  surfaceId?: string;
  regionId: string;
  order?: number;
  presentation?: LabIntegrationPresentation;
  /** Overrides region `hideButtons` for this binding when set. */
  hideButtons?: boolean;
}

export interface LabIntegrationBindingConfigV1 {
  schemaVersion: 1;
  serviceId?: string;
  placement?: LabIntegrationPlacement;
  /** Context key on host → query param or filter field */
  filterMap?: Record<string, string>;
}

export interface LabIntegrationBindingRecord {
  id: string;
  hostAppId: string;
  slot: string;
  kind: LabIntegrationKind;
  providerAppId: string;
  providerRef: string;
  config: LabIntegrationBindingConfigV1;
  enabled: boolean;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
}
