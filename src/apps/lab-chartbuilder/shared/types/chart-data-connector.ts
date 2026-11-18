import type { FormsBuilderContract } from '@/shared/types/forms-builder-integration';

/** Chart Builder data connector row (API + UI). */
export interface ChartDataConnector {
  id: number;
  appName: string;
  entityName: string;
  discoveryUrl: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  /** Populated on verify/preview when discovery succeeds. */
  contractPreview?: Pick<FormsBuilderContract, 'appName' | 'entityName' | 'capabilities' | 'entityModel'>;
}

export interface ChartConnectorPreviewResult {
  appName: string;
  entityName: string;
  capabilities?: FormsBuilderContract['capabilities'];
  propertyNames: string[];
}
