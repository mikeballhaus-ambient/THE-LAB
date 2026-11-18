/**
 * Connector Service - Handles data connector registration and verification
 */


import { DataConnector, FormsBuilderContract } from '../../shared/types';
import { AppDatabaseServiceProxy } from '../../db/app-db-service';
import { DataConnectorsRepository } from '../../db/repositories';

export class ConnectorService {
  private dbProxy: AppDatabaseServiceProxy;
  private dataConnectorRepository!: DataConnectorsRepository

  constructor() {
    this.dbProxy = AppDatabaseServiceProxy.getInstance();
    this.dataConnectorRepository = this.dbProxy.getDataConnectorsRepository()
  }
  /**
   * Get all data connectors.
   */
  async getAllConnectors(): Promise<DataConnector[]> {
    return this.dataConnectorRepository.findAll();
  }

  /**
   * Get connector by ID.
   */
  async getConnectorById(id: number): Promise<DataConnector | null> {
    const result = await this.dataConnectorRepository.findById(id);
    return result || null;
  }

  /**
   * Get connector by app_name.
   */
  async getConnectorByAppName(appName: string): Promise<DataConnector | null> {
    const result = await this.dataConnectorRepository.findByAppName(appName);
    return result || null;
  }

  /**
   * Get connector by entity_name.
   */
  async getConnectorByEntityName(entityName: string): Promise<DataConnector | null> {
    const result = await this.dataConnectorRepository.findByEntityName(entityName);
    return result || null;
  }

  /**
   * Register a new data connector by fetching and validating the discovery contract.
   */
  async registerConnector(data: DataConnector): Promise<DataConnector | null> {
    if (!data.discoveryUrl) {
      return null;
    }

    if (data.appName && data.entityName) {
      return await this.dataConnectorRepository.create(data);
    }

    return this.registerFromDiscoveryUrl(data);
  }

  async registerFromDiscoveryUrl(data: DataConnector): Promise<DataConnector | null> {
    const contract = await this.fetchDiscoveryContract(data.discoveryUrl!);
    if (!contract || !this.validateContract(contract)) {
      return null;
    }

    const now = new Date().toISOString();
    return this.dataConnectorRepository.create({
      appName: contract.appName,
      entityName: contract.entityName,
      discoveryUrl: data.discoveryUrl!,
      discoveryType: data.discoveryType ?? 'REST',
      entityModel: contract.entityModel,
      endpoints: contract.endpoints,
      capabilities: this.resolveCapabilities(contract, data.capabilities),
      is_active: data.is_active !== undefined && data.is_active !== 0 ? 1 : 0,
      last_verified_at: now,
    } as DataConnector);
  }

  private async fetchDiscoveryContract(discoveryUrl: string): Promise<FormsBuilderContract | null> {
    try {
      const axiosModule = await import('axios');
      const response = (await axiosModule.default.get(discoveryUrl, {
        timeout: 10000,
        validateStatus: () => true,
      })) as { data?: unknown };

      if (response.data && typeof response.data === 'object') {
        return response.data as FormsBuilderContract;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to fetch discovery endpoint ${discoveryUrl}:`, message);
    }
    return null;
  }

  /**
   * Update an existing connector.
   */
  async updateConnector(id: number, data: Partial<DataConnector>): Promise<DataConnector | null> {
    const existing = await this.dataConnectorRepository.findById(id);
    if (!existing) {
      return null;
    }

    return this.dataConnectorRepository.update(id, data);
  }

  /**
   * Delete a connector by ID.
   */
  async deleteConnector(id: number): Promise<boolean> {
    // Check if connector exists
    const existing = await this.dataConnectorRepository.findById(id);
    if (!existing) {
      return false;
    }

    return this.dataConnectorRepository.delete(id);
  }

  /**
   * Verify connector contract by calling discovery endpoint.
   */
  async verifyConnector(id: number): Promise<DataConnector | null> {
    // Get connector info
    const connector = await this.dataConnectorRepository.findById(id);
    if (!connector) {
      return null;
    }

    return await this.verifyConnectorConnection(connector, false)
  }

  async verifyConnectorConnection(dataconnector: DataConnector, bypassSave: boolean): Promise<DataConnector | null> {
    // Get connector info
    const connector = dataconnector
    if (!connector) {
      return null;
    }

    // Fetch contract from connector discovery endpoint
    const contract = await this.fetchDiscoveryContract(connector.discoveryUrl);

    if (!bypassSave && connector.id) {
      if (!contract || !this.validateContract(contract)) {
        return null;
      }

      const updated = await this.dataConnectorRepository.update(connector.id, {
        last_verified_at: new Date().toISOString(),
        appName: contract.appName,
        entityName: contract.entityName,
        entityModel: contract.entityModel,
        endpoints: contract.endpoints,
        capabilities: this.resolveCapabilities(contract, connector.capabilities),
      });

      return updated;
    }

    if (contract && this.validateContract(contract)) {
      return {
        ...connector,
        appName: contract.appName,
        entityName: contract.entityName,
        entityModel: contract.entityModel,
        endpoints: contract.endpoints,
        capabilities: this.resolveCapabilities(contract, connector.capabilities),
      };
    }

    return null;
  }

  /**
   * Validate FormsBuilderContract structure.
   */
  private validateContract(contract: FormsBuilderContract): boolean {
    // Check required fields
    if (!contract.appName || !contract.entityName) {
      return false;
    }

    if (!contract.entityModel || typeof contract.entityModel !== 'object') {
      return false;
    }

    if (!contract.endpoints || typeof contract.endpoints !== 'object') {
      return false;
    }

    // Check CRUD endpoints
    const crud = contract.endpoints.crud;
    if (!crud.get || !crud.create || !crud.update || !crud.delete) {
      return false;
    }

    // Validate get endpoint
    if (typeof crud.get.url !== 'string' || crud.get.type !== 'GET') {
      return false;
    }

    // Validate create endpoint
    if (typeof crud.create.url !== 'string' || crud.create.type !== 'POST') {
      return false;
    }

    // Validate update endpoint
    if (typeof crud.update.url !== 'string' || crud.update.type !== 'POST') {
      return false;
    }

    // Validate delete endpoint
    if (typeof crud.delete.url !== 'string' || crud.delete.type !== 'DELETE') {
      return false;
    }

    return true;
  }

  private resolveCapabilities(
    contract: FormsBuilderContract,
    fallback?: DataConnector['capabilities'] | null,
  ): DataConnector['capabilities'] {
    if (contract.capabilities?.length) {
      return [...contract.capabilities];
    }
    const inferred: DataConnector['capabilities'] = ['CRUD'];
    if (contract.endpoints?.lookups?.length) {
      inferred.push('Lookups');
    }
    if (inferred.length > 0) {
      return inferred;
    }
    return fallback?.length ? [...fallback] : ['CRUD'];
  }

  async previewDiscovery(discoveryUrl: string): Promise<{ appName: string; entityName: string } | null> {
    const result = await this.verifyConnectorConnection({ discoveryUrl } as DataConnector, true);
    if (!result?.appName || !result?.entityName) {
      return null;
    }
    return { appName: result.appName, entityName: result.entityName };
  }
}