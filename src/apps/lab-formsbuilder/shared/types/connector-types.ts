// ============================================================================
// Connector Type Definitions
// ============================================================================

import { FormBuilderContractEndpoints, FormBuilderContractModel } from "@/shared/types"

export interface DataConnector {
  id?: number
  appName: string
  entityName: string
  entityModel: FormBuilderContractModel;
  endpoints: FormBuilderContractEndpoints
  capabilities: Array<'CRUD' | 'Lookups' | 'Search' | 'Batch'>,
  createdAt: string
  updatedAt: string
  last_verified_at?: string | null;
  discoveryUrl: string;
  discoveryType: string;
  is_active: number;
}
export interface ConnectorVerification {
  connectorId: string
  name: string
  appName: string
  verified: boolean
  message?: string
  error?: string
}