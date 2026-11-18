import { defineStore } from 'pinia'
import type { FormComponent, FormSchema, ValidationRules } from '@/apps/lab-formsbuilder/shared/types'
import { apiUrl, apiFetch, fetchAllForms, parseJsonResponse, API_V1_PREFIX } from '../utils/api-client'

export const createFormStore = defineStore('forms', {
  state: () => ({
    serverUrl: '',
    forms: [] as FormSchema[],
    selectedFormId: null as string | null,
    currentForm: null as FormSchema | null,
    pendingFormCreate: null as Partial<FormSchema> | null,
    isLoading: false,
    error: null as Error | null,
  }),

  getters: {
    activeForm: (state) => state.currentForm,
    formCount: (state) => state.forms.length,
    formsById: (state) => new Map(state.forms.map(f => [String(f.formKey), f])),
    selectedForm: (state) => state.forms.find(f => String(f.formKey) === state.selectedFormId),
    isCreating: (state) => !!state.pendingFormCreate,
    loadedForms: (state) => state.forms,
  },

  actions: {
    setServerUrl(url: string) {
      this.serverUrl = url
    },
    async loadForms() {
      this.isLoading = true
      this.error = null
      try {
        const controller = new AbortController()
        const timeoutId = globalThis.setTimeout(() => controller.abort(), 20000)
        this.forms = await fetchAllForms(this.serverUrl, controller.signal)
        globalThis.clearTimeout(timeoutId)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          this.error = new Error(
            'Timed out loading forms. The app server may still be starting, or a second launch may have restarted it.'
          )
        } else {
          this.error = err instanceof Error ? err : new Error('Unknown error loading forms')
        }
        console.error('Load forms error:', this.error)
      } finally {
        this.isLoading = false
      }
    },

    async createForm(data: Partial<FormSchema>): Promise<FormSchema> {
      const response = await apiFetch(apiUrl(this.serverUrl, `${API_V1_PREFIX}/forms`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const newForm = await parseJsonResponse<FormSchema>(response)
      this.forms.push(newForm)
      return newForm
    },

    async updateForm(formKey: string, updates: Partial<FormSchema>): Promise<FormSchema> {
      const response = await apiFetch(apiUrl(this.serverUrl, `${API_V1_PREFIX}/forms/${encodeURIComponent(formKey)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const updated = await parseJsonResponse<FormSchema>(response)
      const index = this.forms.findIndex(f => String(f.formKey) === formKey)
      if (index !== -1) {
        this.forms[index] = updated
      }
      return updated
    },

    async deleteForm(formKey: string): Promise<boolean> {
      const response = await apiFetch(apiUrl(this.serverUrl, `${API_V1_PREFIX}/forms/${encodeURIComponent(formKey)}`), {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Failed to delete form: ${response.status}`)
      }

      this.forms = this.forms.filter(f => String(f.formKey) !== formKey)
      return true
    },

    selectForm(formKey: string): FormSchema | null {
      this.selectedFormId = formKey

      const formListItem = this.forms.find(f => String(f.formKey) === formKey)

      if (formListItem) {
        this.currentForm = {
          formKey: formListItem.formKey,
          id: formListItem.id,
          name: formListItem.name,
          description: formListItem.description || '',
          createdAt: formListItem.createdAt,
          updatedAt: formListItem.updatedAt,
          components: formListItem.components as FormComponent[],
          validationRules: formListItem.validationRules as ValidationRules,
          dataConnecter: formListItem.dataConnecter,
          model: formListItem.model,
          columns: formListItem.columns,
          formActions: formListItem.formActions,
        } as FormSchema
      } else {
        this.currentForm = null
      }

      return this.currentForm
    },

    setCurrentForm(form: FormSchema | null) {
      this.currentForm = form
    },

    setPendingCreate(form: Partial<FormSchema> | null) {
      this.pendingFormCreate = form
    },

    clearPendingCreate() {
      this.pendingFormCreate = null
    },

    clearError() {
      this.error = null
    },
  },
})
