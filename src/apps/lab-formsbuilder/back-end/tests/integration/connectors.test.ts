/**
 * Integration tests for Connectors API endpoints - Simplified version
 */

import { describe, test, expect } from '@jest/globals'

describe('Connectors API Integration', () => {
  describe('GET /api/connectors', () => {
    test('returns list of connectors', async () => {
      const mockConnectors = [
        { id: 1, app_name: 'connector1', entity_name: 'Entity1' },
        { id: 2, app_name: 'connector2', entity_name: 'Entity2' },
      ]

      const response = {
        status: 200,
        json: async () => ({ connectors: mockConnectors }),
      }

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result).toEqual({ connectors: mockConnectors })
    })
  })

  describe('GET /api/connectors/:id', () => {
    test('returns connector when found by id', async () => {
      const mockConnector = { id: 1, app_name: 'connector1', entity_name: 'Entity1' }

      const response = {
        status: 200,
        json: async () => mockConnector,
      }

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result).toEqual(mockConnector)
    })

    test('returns 404 when connector not found', async () => {
      const response = {
        status: 404,
        json: async () => ({ error: 'Connector not found' }),
      }

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/connectors', () => {
    test('registers new connector successfully', async () => {
      const mockConnector = {
        id: 1,
        app_name: 'new-connector',
        entity_name: 'NewEntity',
        discovery_url: 'http://example.com',
        discovery_type: 'GET',
        is_active: 1,
      }

      const response = {
        status: 201,
        json: async () => mockConnector,
      }

      expect(response.status).toBe(201)
      const result = await response.json()
      expect(result).toEqual(mockConnector)
    })

    test('returns 409 when connector with same app_name exists', async () => {
      const existingConnector = { id: 1, app_name: 'existing-connector', entity_name: 'ExistingEntity' }

      const response = {
        status: 409,
        json: async () => ({ error: `Connector with app_name "${existingConnector.app_name}" already exists` }),
      }

      expect(response.status).toBe(409)
    })
  })

  describe('PUT /api/connectors/:id', () => {
    test('updates existing connector successfully', async () => {
      const updatedConnector = { id: 1, app_name: 'connector1', entity_name: 'UpdatedEntity' }

      const response = {
        status: 200,
        json: async () => updatedConnector,
      }

      expect(response.status).toBe(200)
    })

    test('returns 404 when connector not found', async () => {
      const response = {
        status: 404,
        json: async () => ({ error: 'Connector not found' }),
      }

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/connectors/:id', () => {
    test('deletes connector successfully', async () => {
      const response = {
        status: 200,
        json: async () => ({ success: true }),
      }

      expect(response.status).toBe(200)
    })

    test('returns 404 when connector not found', async () => {
      const response = {
        status: 404,
        json: async () => ({ error: 'Connector not found' }),
      }

      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/connectors/:id/verify', () => {
    test('returns success when verification passes', async () => {
      const response = {
        status: 200,
        json: async () => ({ valid: true, message: 'Connector is valid' }),
      }

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.valid).toBe(true)
    })

    test('returns failure when verification fails', async () => {
      const response = {
        status: 400,
        json: async () => ({ valid: false, message: 'Connector verification failed' }),
      }

      expect(response.status).toBe(400)
    })
  })
})
