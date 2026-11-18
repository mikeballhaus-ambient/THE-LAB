<script setup lang="ts">
import Button from 'primevue/button';
import FormList from '../components/FormList.vue';
import FormSubmissionDisplay from '../components/FormSubmissionDisplay.vue';
import type { FormSchema } from '@/apps/lab-formsbuilder/shared/types';

defineProps<{
  generateUniqueId: (prefix: string) => string;
  serverUrl: string;
  loadedForms: FormSchema[];
  selectedFormKey: string | undefined;
}>();

defineEmits<{
  back: [];
  'form-select': [form: FormSchema];
  'form-create': [];
  'form-edit': [form: FormSchema];
  'form-delete': [form: FormSchema];
  submission: [submission: unknown];
  'submission-error': [error: Error];
}>();
</script>

<template>
  <div class="w-full flex flex-col gap-3">
    <div class="flex justify-between items-center border-b pb-2">
      <h2 :id="generateUniqueId('forms-management-heading')" class="text-lg font-semibold">Forms Management</h2>
      <Button
        label="Back"
        icon="pi pi-arrow-left"
        severity="secondary"
        @click="$emit('back')"
        :pt="{ root: { id: generateUniqueId('form-designer-back-btn') } }"
      />
    </div>
    <div>
      <Button
        size="small"
        label="Add New Form"
        icon="pi pi-plus"
        severity="success"
        @click="$emit('form-create')"
        :pt="{ root: { id: generateUniqueId('create-form-btn') } }"
      />
    </div>
    <FormList
      :forms="loadedForms"
      :selected-form-id="selectedFormKey"
      @form-select="$emit('form-select', $event)"
      @form-create="$emit('form-create')"
      @form-edit="$emit('form-edit', $event)"
      @form-delete="$emit('form-delete', $event)"
    />
    <FormSubmissionDisplay
      :forms="loadedForms"
      :server-url="serverUrl"
      @submission="$emit('submission', $event)"
      @error="$emit('submission-error', $event)"
    />
  </div>
</template>
