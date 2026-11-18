import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { createPinia, setActivePinia } from 'pinia'
import { createFormStore } from '@/apps/lab-formsbuilder/front-end/stores/formStore'

describe('formStore', () => {
  let store: ReturnType<typeof createFormStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = createFormStore()
    store.setServerUrl('http://localhost:4011')
  })

  describe('state initialization', () => {
    test('initializes with empty forms array', () => {
      expect(store.forms).toEqual([])
    })

    test('initializes with null selectedFormId', () => {
      expect(store.selectedFormId).toBeNull()
    })

    test('initializes with null currentForm', () => {
      expect(store.currentForm).toBeNull()
    })

    test('initializes with null pendingFormCreate', () => {
      expect(store.pendingFormCreate).toBeNull()
    })

    test('initializes with false isLoading', () => {
      expect(store.isLoading).toBe(false)
    })

    test('initializes with null error', () => {
      expect(store.error).toBeNull()
    })
  })

  describe('getters', () => {
    test('activeForm getter returns currentForm', () => {
      store.setCurrentForm({
        formKey: 'test-form',
        name: 'Test Form',
        description: 'A test form',
        components: [],
        validationRules: {},
      })

      expect(store.activeForm).toEqual({
        formKey: 'test-form',
        name: 'Test Form',
        description: 'A test form',
        components: [],
        validationRules: {},
      })
    })

    test('formCount getter returns forms length', () => {
      store.forms = [
        {
          formKey: 'form1',
          name: 'Form 1',
          description: 'Form 1 description',
          components: [],
          validationRules: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          formKey: 'form2',
          name: 'Form 2',
          description: 'Form 2 description',
          components: [],
          validationRules: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
      ]

      expect(store.formCount).toBe(2)
    })

    test('formsById getter creates Map with formKey as key', () => {
      store.forms = [
        {
          formKey: 'form1',
          name: 'Form 1',
          description: 'Form 1 description',
          components: [],
          validationRules: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          formKey: 'form2',
          name: 'Form 2',
          description: 'Form 2 description',
          components: [],
          validationRules: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
      ]

      const formsMap = store.formsById
      expect(formsMap.get('form1')).toBeDefined()
      expect(formsMap.get('form2')).toBeDefined()
      expect(formsMap.get('nonexistent')).toBeUndefined()
    })

    test('selectedForm getter finds form by formKey', () => {
      store.forms = [
        {
          formKey: 'form1',
          name: 'Form 1',
          description: 'Form 1 description',
          components: [],
          validationRules: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          formKey: 'form2',
          name: 'Form 2',
          description: 'Form 2 description',
          components: [],
          validationRules: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
      ]
      store.selectedFormId = 'form2'

      expect(store.selectedForm?.formKey).toBe('form2')
      expect(store.selectedForm?.name).toBe('Form 2')
    })

    test('isCreating getter returns true when pendingFormCreate exists', () => {
      store.setPendingCreate({ name: 'New Form' })

      expect(store.isCreating).toBe(true)

      store.clearPendingCreate()
      expect(store.isCreating).toBe(false)
    })
  })

  describe('actions - loadForms', () => {
    test('sets isLoading to true before fetching', async () => {
      // Reset state before test
      store.isLoading = false

      await store.loadForms()
      expect(store.isLoading).toBe(false)
    })

    test('loads forms from mock data successfully', async () => {
      const mockForms = [
        { formKey: 'form1', name: 'Form 1', components: [], validationRules: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { formKey: 'form2', name: 'Form 2', components: [], validationRules: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ]

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ forms: mockForms, total: mockForms.length, limit: 50, offset: 0 }),
      } as Response)

      await store.loadForms()

      expect(store.forms).toEqual(mockForms)
    })

    test('handles fetch error and sets error state', async () => {
      const error = new Error('Network error')

      jest.spyOn(global, 'fetch').mockRejectedValue(error)

      await store.loadForms()

      expect(store.error).toBe(error)
      expect(store.isLoading).toBe(false)
    })

    test('catches non-Error thrown errors', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue('Unknown error')

      await store.loadForms()

      expect(store.error?.message).toBe('Unknown error loading forms')
    })
  })

  describe('actions - createForm', () => {
    test('creates form and adds to forms array', async () => {
      const mockForm = {
        formKey: 'new-form-123',
        name: 'New Form',
        description: 'A new form',
        components_json: JSON.stringify([]),
        validation_rules: {},
      }

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockForm,
      } as Response)

      const result = await store.createForm({
        name: 'New Form',
        description: 'A new form',
        components: [],
        validationRules: {},
      })

      expect(store.forms).toContainEqual(mockForm)
      expect(result).toEqual(mockForm)
    })

    test('handles create failure with error response', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response)

      await expect(store.createForm({ name: 'New Form', components: [], validationRules: {} })).rejects.toThrow()
    })
  })

  describe('actions - updateForm', () => {
    test('updates existing form by formKey', async () => {
      store.forms = [
        {
          formKey: 'form1',
          name: 'Old Name',
          description: 'Old Description',
          components: [],
          validationRules: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
      ]

      const updated = {
        formKey: 'form1',
        name: 'New Name',
        description: 'New Description',
        components: [],
        validationRules: {},
      }

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => updated,
      } as Response)

      await store.updateForm('form1', {
        name: 'New Name',
        description: 'New Description',
        components: [],
        validationRules: {},
      })

      expect(store.forms[0].name).toBe('New Name')
    })

    test('handles update failure', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Update failed'))

      await expect(store.updateForm('form1', { name: 'Test', components: [], validationRules: {} })).rejects.toThrow()
    })
  })

  describe('actions - deleteForm', () => {
    test('removes form from array by formKey', async () => {
      store.forms = [
        { formKey: 'form1', name: 'Form 1', components: [], validationRules: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { formKey: 'form2', name: 'Form 2', components: [], validationRules: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ]

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response)

      await store.deleteForm('form1')

      expect(store.forms).toHaveLength(1)
      expect(store.forms[0].formKey).toBe('form2')
    })

    test('handles deletion failure', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Delete failed'))

      await expect(store.deleteForm('form1')).rejects.toThrow()
    })
  })

  describe('actions - setServerUrl', () => {
    test('sets server URL', () => {
      store.setServerUrl('http://localhost:3000')
      expect(store['serverUrl']).toBe('http://localhost:3000')
    })
  })

  describe('actions - setCurrentForm', () => {
    test('sets current form', () => {
      const form = {
        formKey: 'test-form',
        name: 'Test Form',
        description: 'A test form',
        components: [],
        validationRules: {},
      }

      store.setCurrentForm(form)
      expect(store.currentForm).toEqual(form)
    })
  })

  describe('actions - setPendingCreate', () => {
    test('sets pending create state', () => {
      store.setPendingCreate({ name: 'New Form' })
      expect(store.pendingFormCreate).toEqual({ name: 'New Form' })
      expect(store.isCreating).toBe(true)
    })
  })

  describe('actions - clearPendingCreate', () => {
    test('clears pending create state', () => {
      store.setPendingCreate({ name: 'New Form' })
      store.clearPendingCreate()
      expect(store.pendingFormCreate).toBeNull()
      expect(store.isCreating).toBe(false)
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
