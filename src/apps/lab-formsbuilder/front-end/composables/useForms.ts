import { onUnmounted, computed } from 'vue'
import type { FormSchema, FormSchemaSaveInput } from '@/apps/lab-formsbuilder/shared/types'
import { createFormStore } from '@/apps/lab-formsbuilder/front-end/stores/formStore'
import { API_V1_PREFIX, apiUrl, apiFetch, parseJsonResponse } from '../utils/api-client'

export function useForms(serverUrl: string) {
  const formsStore = createFormStore()
  formsStore.setServerUrl(serverUrl)

  async function loadForms(): Promise<void> {
    await formsStore.loadForms()
  }

  async function createForm(data: FormSchemaSaveInput): Promise<FormSchema> {
    const payload = {
      formKey: data.formKey,
      name: data.name,
      description: data.description,
      components: data.components ?? [],
      validationRules: data.validationRules ?? {},
      dataConnecter: data.dataConnecter,
      model: data.model,
      columns: data.columns,
      formActions: data.formActions,
      is_active: data.is_active ?? true,
    }
    return formsStore.createForm(payload)
  }

  async function updateForm(key: string, data: FormSchemaSaveInput): Promise<FormSchema> {
    return formsStore.updateForm(key, {
      name: data.name,
      description: data.description,
      components: data.components,
      validationRules: data.validationRules,
      dataConnecter: data.dataConnecter,
      model: data.model,
      columns: data.columns,
      formActions: data.formActions,
      is_active: data.is_active,
    })
  }

  async function deleteForm(key: string): Promise<boolean> {
    return formsStore.deleteForm(key)
  }

  function getForm(key: string): FormSchema | undefined {
    return formsStore.forms.find(f => f.formKey === key)
  }

  async function loadFormForEditing(key: string): Promise<FormSchema | null> {
    try {
      const response = await apiFetch(apiUrl(serverUrl, `${API_V1_PREFIX}/forms/${encodeURIComponent(key)}`))
      const form = await parseJsonResponse<FormSchema>(response)
      formsStore.setCurrentForm(form)
      const index = formsStore.forms.findIndex(f => f.formKey === key)
      if (index !== -1) {
        formsStore.forms[index] = form
      } else {
        formsStore.forms.push(form)
      }
      return form
    } catch (err) {
      console.error('Error loading form schema:', err)
      return null
    }
  }

  async function saveFormChanges(key: string, schema: FormSchema): Promise<FormSchema> {
    return updateForm(key, schema)
  }

  onUnmounted(() => {
    // Store cleanup handled internally by Pinia
  })

  return {
    forms: computed(() => formsStore.loadedForms),
    loading: computed(() => formsStore.isLoading),
    error: computed(() => formsStore.error),
    loadForms,
    createForm,
    updateForm,
    deleteForm,
    getForm,
    loadFormForEditing,
    saveFormChanges,
  }
}
