import { defineStore } from 'pinia'
import type { DataConnector } from '@/apps/lab-formsbuilder/shared/types'
import { API_V1_PREFIX, apiUrl, apiFetch, parseConnectorsList, parseJsonResponse } from '../utils/api-client'

export const createConnectorsStore = defineStore('connectors', {
  state: () => ({
    serverUrl: '',
    connectors: [] as DataConnector[],
    selectedConnectorId: null as string | number | null,
    isLoading: false,
    error: null as Error | null,
  }),

  getters: {
    connectorCount: (state) => state.connectors.length,
    connectorsById: (state) => new Map(state.connectors.map(c => [String(c.id), c])),
    selectedConnector: (state) => state.connectors.find(c => String(c.id) === String(state.selectedConnectorId)),
    loadedConnectors: (state) => state.connectors,
  },

  actions: {
    setServerUrl(url: string) {
      this.serverUrl = url
    },
    async loadConnectors() {
      this.isLoading = true
      this.error = null
      try {
        const response = await apiFetch(apiUrl(this.serverUrl, `${API_V1_PREFIX}/connectors`))
        this.connectors = parseConnectorsList(await parseJsonResponse<unknown>(response))
        return this.connectors
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Unknown error loading connectors')
        console.error('Load connectors error:', this.error)
        return []
      } finally {
        this.isLoading = false
      }
    },

    async verifyConnector(connectorId: string | number): Promise<DataConnector> {
      const response = await apiFetch(
        apiUrl(this.serverUrl, `${API_V1_PREFIX}/connectors/${connectorId}/verify`),
        { method: 'POST' }
      )

      const updated = await parseJsonResponse<DataConnector>(response)
      const index = this.connectors.findIndex(c => String(c.id) === String(connectorId))
      if (index !== -1) {
        this.connectors[index] = updated
      }
      return updated
    },

    async previewDiscovery(discoveryUrl: string): Promise<{ appName: string; entityName: string }> {
      const response = await apiFetch(apiUrl(this.serverUrl, `${API_V1_PREFIX}/connectors/preview`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discovery_url: discoveryUrl }),
      })
      return parseJsonResponse<{ appName: string; entityName: string }>(response)
    },

    async createConnector(data: Partial<DataConnector>): Promise<DataConnector> {
      const response = await apiFetch(apiUrl(this.serverUrl, `${API_V1_PREFIX}/connectors`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discovery_url: data.discoveryUrl,
          discovery_type: data.discoveryType,
          is_active: data.is_active,
        }),
      })

      const newConnector = await parseJsonResponse<DataConnector>(response)
      this.connectors.push(newConnector)
      return newConnector
    },

    async updateConnector(connectorId: string | number, updates: Partial<DataConnector>): Promise<DataConnector> {
      const index = this.connectors.findIndex(c => String(c.id) === String(connectorId))
      if (index === -1) throw new Error(`Connector ${connectorId} not found`)

      const response = await apiFetch(apiUrl(this.serverUrl, `${API_V1_PREFIX}/connectors/${connectorId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discovery_url: updates.discoveryUrl,
          discovery_type: updates.discoveryType,
          is_active: updates.is_active,
        }),
      })

      const updated = await parseJsonResponse<DataConnector>(response)
      if (index !== -1) {
        this.connectors[index] = updated
      }
      return updated
    },

    async deleteConnector(connectorId: string | number): Promise<boolean> {
      const index = this.connectors.findIndex(c => String(c.id) === String(connectorId))
      if (index === -1) throw new Error(`Connector ${connectorId} not found`)

      const response = await apiFetch(apiUrl(this.serverUrl, `${API_V1_PREFIX}/connectors/${connectorId}`), {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Failed to delete connector: ${response.status}`)
      }

      this.connectors = this.connectors.filter(c => String(c.id) !== String(connectorId))
      return true
    },

    selectConnector(connectorId?: string | number): DataConnector | null {
      if (connectorId !== undefined && connectorId !== null) {
        this.selectedConnectorId = connectorId
      } else {
        this.selectedConnectorId = null as unknown as string | number | null
      }
      const connector = this.connectors.find(c => String(c.id) === String(connectorId))
      return connector || null
    },

    clearError() {
      this.error = null
    },
  },
})
