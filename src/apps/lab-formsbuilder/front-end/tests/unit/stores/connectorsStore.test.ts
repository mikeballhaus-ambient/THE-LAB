import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { createPinia, setActivePinia } from 'pinia'
import type { DataConnector } from '@/apps/lab-formsbuilder/shared/types'
import { createConnectorsStore } from '@/apps/lab-formsbuilder/front-end/stores/connectorsStore'
import { FormBuilderContractEndpoints, FormBuilderContractModel } from '@/shared/types'

describe('connectorsStore', () => {
  let store: ReturnType<typeof createConnectorsStore>

  const FIXED_ISO = '2026-01-01T00:00:00.000Z'

  const createMockConnector = (id: number, name: string): DataConnector => ({
    id,
    appName: 'task-list',
    entityName: name || 'TestItem',
    entityModel: {} as unknown as FormBuilderContractModel,
    endpoints: {} as FormBuilderContractEndpoints,
    capabilities: ['CRUD'],
    createdAt: FIXED_ISO,
    updatedAt: FIXED_ISO,
    discoveryUrl: 'https://test.example.com/discover',
    discoveryType: 'GET',
    is_active: 1,
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    store = createConnectorsStore()
    store.setServerUrl('http://localhost:4011')
    jest.spyOn(global, 'fetch')
  })

  describe('state initialization', () => {
    test('initializes with empty connectors array', () => {
      expect(store.connectors).toEqual([])
    })

    test('initializes with null selectedConnectorId', () => {
      expect(store.selectedConnectorId).toBeNull()
    })

    test('initializes with false isLoading', () => {
      expect(store.isLoading).toBe(false)
    })

    test('initializes with null error', () => {
      expect(store.error).toBeNull()
    })
  })

  describe('getters', () => {
    test('connectorCount getter returns connectors length', () => {
      store.connectors = [createMockConnector(1, 'Connector 1'), createMockConnector(2, 'Connector 2')]

      expect(store.connectorCount).toBe(2)
    })

    test('connectorsById getter creates Map with id as key', () => {
      store.connectors = [createMockConnector(1, 'Connector 1'), createMockConnector(2, 'Connector 2')]

      const connectorsMap = store.connectorsById
      expect(connectorsMap.get('1')).toBeDefined()
      expect(connectorsMap.get('2')).toBeDefined()
      expect(connectorsMap.get('3')).toBeUndefined()
    })

    test('selectedConnector getter finds connector by id', () => {
      const second = createMockConnector(2, 'Connector 2')
      store.connectors = [createMockConnector(1, 'Connector 1'), second]
      store.selectedConnectorId = 2

      expect(store.selectedConnector?.id).toBe(2)
      expect(store.selectedConnector?.appName).toBe(second.appName)
    })
  })

  describe('actions - loadConnectors', () => {
    test('loads connectors from mock data successfully', async () => {
      const mockConnectors = [createMockConnector(1, 'Connector 1'), createMockConnector(2, 'Connector 2')]

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ connectors: mockConnectors }),
      } as Response)

      await store.loadConnectors()

      expect(store.connectors).toEqual(mockConnectors)
    })

    test('handles fetch error and sets error state', async () => {
      const error = new Error('Network error')

      jest.spyOn(global, 'fetch').mockRejectedValue(error)

      await store.loadConnectors()

      expect(store.error).toBe(error)
    })

    test('catches non-Error thrown errors', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue('Unknown error')

      await store.loadConnectors()

      expect(store.error?.message).toBe('Unknown error loading connectors')
    })

    test('returns empty array on failure', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response)

      const result = await store.loadConnectors()

      expect(result).toEqual([])
    })
  })

  describe('actions - verifyConnector', () => {
    test('verifies connector successfully', async () => {
      store.connectors = [createMockConnector(1, 'Connector 1')]
      const mockUpdated = createMockConnector(1, 'Connector 1')
      mockUpdated.last_verified_at = '2026-01-01T00:00:00.000Z'

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockUpdated,
      } as Response)

      const result = await store.verifyConnector(1)

      expect(result).toEqual(mockUpdated)
      expect(store.connectors[0].last_verified_at).toBe(mockUpdated.last_verified_at)
    })

    test('handles verification failure', async () => {
      const error = new Error('Verification failed')

      jest.spyOn(global, 'fetch').mockRejectedValue(error)

      await expect(store.verifyConnector('connector1')).rejects.toThrow(
        'Verification failed'
      )
    })

  })

  describe('actions - createConnector', () => {
    test('creates connector and adds to connectors array', async () => {
      const mockConnector = createMockConnector(1, 'New Connector')

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockConnector,
      } as Response)

      const result = await store.createConnector({
        discoveryUrl: 'http://localhost:3020/api/discovery',
        discoveryType: 'REST',
      })

      expect(store.connectors).toContainEqual(mockConnector)
      expect(result).toEqual(mockConnector)
    })

    test('handles create failure with error response', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response)

      await expect(store.createConnector({ discoveryUrl: 'http://x/api/discovery' })).rejects.toThrow('HTTP 500')
    })
  })

  describe('actions - updateConnector', () => {
    test('updates existing connector by id', async () => {
      store.connectors = [createMockConnector(1, 'Old Name')]

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ ...createMockConnector(1, 'Old Name'), appName: 'New Name' }),
      } as Response)

      await store.updateConnector(1, {
        appName: 'New Name',
      })

      expect(store.connectors[0].appName).toBe('New Name')
    })

    test('throws error when connector not found', async () => {
      store.connectors = [createMockConnector(1, 'Connector 1')]

      await expect(
        store.updateConnector(2, { appName: 'New Name' })
      ).rejects.toThrow('Connector 2 not found')
    })
  })

  describe('actions - deleteConnector', () => {
    test('removes connector from array by id', async () => {
      store.connectors = [createMockConnector(1, 'Connector 1'), createMockConnector(2, 'Connector 2')]

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response)

      await store.deleteConnector(1)

      expect(store.connectors).toHaveLength(1)
      expect(store.connectors[0].id).toBe(2)
    })

    test('throws error when connector not found', async () => {
      store.connectors = [createMockConnector(1, 'Connector 1')]

      await expect(store.deleteConnector(2)).rejects.toThrow('Connector 2 not found')
    })
  })

  describe('actions - selectConnector', () => {
    test('updates selectedConnectorId and returns connector', () => {
      store.connectors = [createMockConnector(1, 'Connector 1'), createMockConnector(2, 'Connector 2')]

      const result = store.selectConnector(2)

      expect(store.selectedConnectorId).toBe(2)
      expect(result).toEqual(createMockConnector(2, 'Connector 2'))
    })

    test('returns null when connector not found', () => {
      store.connectors = [createMockConnector(1, 'Connector 1')]

      const result = store.selectConnector(2)

      expect(store.selectedConnectorId).toBe(2)
      expect(result).toBeNull()
    })
  })

  describe('actions - clearError', () => {
    test('clears error state', () => {
      store.error = new Error('Test error')
      store.clearError()

      expect(store.error).toBeNull()
    })
  })
})
