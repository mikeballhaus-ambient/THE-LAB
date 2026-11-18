import { onUnmounted, computed } from 'vue'
import type { DataConnector } from '@/apps/lab-formsbuilder/shared/types'
import { createConnectorsStore } from '@/apps/lab-formsbuilder/front-end/stores/connectorsStore'

export interface ConnectorsEvents {
  connectorLoaded: DataConnector[]
  connectorError: Error
}

export function useConnectors(serverUrl: string) {
  const connectorsStore = createConnectorsStore()
  connectorsStore.setServerUrl(serverUrl)

  // Load connectors on init
  async function loadConnectors(): Promise<DataConnector[]> {
    await connectorsStore.loadConnectors()
    return connectorsStore.loadedConnectors
  }

  // Select connector (via store action)
  function selectConnector(id: string): void {
    connectorsStore.selectConnector(id)
  }

  // Verify connector (via store action)
  async function verifyConnector(connectorId: string): Promise<DataConnector> {
    return await connectorsStore.verifyConnector(connectorId)
  }

  async function previewDiscovery(discoveryUrl: string): Promise<{ appName: string; entityName: string }> {
    return await connectorsStore.previewDiscovery(discoveryUrl)
  }

  // Create connector (via store action)
  async function createConnector(data: Partial<DataConnector>): Promise<DataConnector> {
    return await connectorsStore.createConnector(data)
  }

  // Update connector (via store action)
  async function updateConnector(
    connectorId: string | number,
    updates: Partial<DataConnector>
  ): Promise<DataConnector> {
    return await connectorsStore.updateConnector(connectorId, updates)
  }

  // Delete connector (via store action)
  async function deleteConnector(connectorId: string | number): Promise<boolean> {
    try {
      await connectorsStore.deleteConnector(connectorId)
      return true
    } catch {
      return false
    }
  }

  // Get selected connector (via store getter)
  function getSelectedConnector(): DataConnector | null {
    return connectorsStore.selectedConnector || null
  }

  // Check if loading (via store state)
  function isConnecting(): boolean {
    return connectorsStore.isLoading
  }

  // Get error (via store state)
  function getError(): Error | null {
    return connectorsStore.error
  }

  // Clear error (via store action)
  function clearError(): void {
    connectorsStore.clearError()
  }

  onUnmounted(() => {
    // Store cleanup handled internally by Pinia
  })

  return {
    connectors: computed(() => connectorsStore.loadedConnectors),
    selectedConnectorId: computed(() => connectorsStore.selectedConnectorId),
    selectedConnector: computed(() => connectorsStore.selectedConnector),
    isLoading: computed(() => connectorsStore.isLoading),
    error: computed(() => connectorsStore.error),
    loadConnectors,
    verifyConnector,
    previewDiscovery,
    createConnector,
    updateConnector,
    deleteConnector,
    selectConnector,
    getSelectedConnector,
    isConnecting,
    getError,
    clearError,
  }
}
