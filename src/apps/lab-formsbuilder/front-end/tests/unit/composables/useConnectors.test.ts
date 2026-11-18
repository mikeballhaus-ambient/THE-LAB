import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { createPinia, setActivePinia } from 'pinia'
import { useConnectors } from '@/apps/lab-formsbuilder/front-end/composables/useConnectors'

describe('useConnectors composables', () => {
  let connectorsComposable: ReturnType<typeof useConnectors>

  beforeEach(() => {
    setActivePinia(createPinia())
    connectorsComposable = useConnectors('http://localhost:4011')
    global.fetch = jest.fn() as typeof fetch
  })

  describe('loadConnectors', () => {
    test('loads connectors from API successfully', async () => {
      const mockConnectors = [
        {
          id: 'connector1',
          appName: 'task-list',
          entityName: 'TestItem',
          endpoints: { create: '/api/test', read: '/api/test', update: '/api/test', delete: '/api/test' },
          capabilities: ['CRUD'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
      ]

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({ connectors: mockConnectors }),
      } as Response)

      const result = await connectorsComposable.loadConnectors()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4011/api/v1/connectors',
        expect.objectContaining({ credentials: 'include' }),
      )
      expect(result).toEqual(mockConnectors)
    })

    test('handles API error and returns empty array', async () => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response)

      const result = await connectorsComposable.loadConnectors()

      expect(result).toEqual([])
    })

    test('handles network error and returns empty array', async () => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(new Error('Network error'))

      const result = await connectorsComposable.loadConnectors()

      expect(result).toEqual([])
    })
  })

  describe('verifyConnector', () => {
    test('verifies connector successfully', async () => {
      const mockUpdated = {
        id: 1,
        appName: 'task-list',
        entityName: 'TestItem',
        last_verified_at: '2026-01-01T00:00:00.000Z',
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => mockUpdated,
      } as Response)

      const result = await connectorsComposable.verifyConnector('1')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4011/api/v1/connectors/1/verify',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      )
      expect(result).toEqual(mockUpdated)
    })

    test('handles verification failure', async () => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      } as Response)

      await expect(connectorsComposable.verifyConnector('connector1')).rejects.toThrow()
    })
  })

  describe('selectConnector', () => {
    test('updates selectedConnectorId', () => {
      connectorsComposable.selectConnector('connector1')

      expect(connectorsComposable.selectedConnectorId.value).toBe('connector1')
    })
  })
})
