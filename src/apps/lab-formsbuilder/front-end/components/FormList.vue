<script setup lang="ts">
import { computed, ref } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';
import type { FormSchema } from '../../shared/types';
import { groupFormsByConnectorApp } from '../utils/group-forms-by-connector-app';

const { generateUniqueId } = useUniqueElementId();
const toast = useToast();

const props = defineProps<{
  forms: FormSchema[];
  selectedFormId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'form-select', form: FormSchema): void;
  (e: 'form-create'): void;
  (e: 'form-edit', form: FormSchema): void;
  (e: 'form-delete', form: FormSchema): void;
}>();

const cardRef = ref(null);

const formsByConnectorApp = computed(() => groupFormsByConnectorApp(props.forms));

/** App group accordion — empty = all panels collapsed by default. */
const openFormGroups = ref<string[]>([]);

function handleFormEdit(form: FormSchema): void {
  emit('form-edit', form);
}

function handleFormDelete(form: FormSchema): void {
  emit('form-delete', form);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function handleFormSelect(form: FormSchema): void {
  emit('form-select', form);
}

function connectorEntityLabel(form: FormSchema): string | null {
  const entity = form.dataConnecter?.entityName?.trim();
  return entity || null;
}

async function copyFormKey(formKey: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(formKey);
    toast.add({
      severity: 'success',
      summary: 'Copied',
      detail: 'Form key copied to clipboard',
      life: 2000,
    });
  } catch {
    toast.add({
      severity: 'warn',
      summary: 'Copy failed',
      detail: formKey,
      life: 5000,
    });
  }
}
</script>

<template>
  <Card ref="cardRef" class="" pt:root="h-full!">
    <template #title>Forms</template>
    <template #content>
      <div v-if="forms.length === 0" class="flex items-start justify-center h-9 text-lab-general-text-muted text-sm w-full">
        <div>
          <i class="pi pi-list mr-2 mt-1"></i>
          No forms available yet.
          Use the "Create New Form" button above to get started!
        </div>
      </div>
      <div v-else class="p-2">
        <Accordion
          v-model:value="openFormGroups"
          multiple
          class="form-app-accordion w-full"
          :pt="{ root: { attrs: { id: generateUniqueId('form-list-accordion') } } }"
        >
          <AccordionPanel
            v-for="group in formsByConnectorApp"
            :key="group.key"
            :value="group.key"
            class="form-connector-app-group"
            :pt="{ root: { attrs: { id: generateUniqueId(`form-app-panel-${group.key}`) } } }"
          >
            <AccordionHeader
              :pt="{ root: { attrs: { id: generateUniqueId(`form-app-heading-${group.key}`) } } }"
            >
              <span class="lab-app-list-group-label">
                {{ group.label }}
                <span class="lab-app-list-group-count ml-1">({{ group.forms.length }})</span>
              </span>
            </AccordionHeader>
            <AccordionContent
              :pt="{ root: { attrs: { id: generateUniqueId(`form-app-content-${group.key}`) } } }"
            >
              <div class="space-y-3 pt-1">
                <div
                  v-for="form in group.forms"
                  :key="form.formKey"
                  class="lab-app-list-row p-3"
                  :class="{
                    'lab-app-list-row--selected': selectedFormId === form.formKey,
                  }"
                >
                  <div class="flex items-start gap-3">
                    <div class="flex-1 cursor-pointer min-w-0" @click="handleFormSelect(form)">
                      <h4
                        :id="generateUniqueId(`form-name-heading-${form.formKey}`)"
                        class="font-semibold text-lab-general-text text-sm m-0 mb-0.5 truncate"
                      >
                        {{ form.name }}
                      </h4>
                      <p
                        v-if="connectorEntityLabel(form)"
                        class="text-[10px] text-lab-general-text-muted m-0 mb-1 truncate"
                      >
                        {{ connectorEntityLabel(form) }}
                      </p>
                      <code
                        v-if="form.formKey"
                        class="text-[11px] font-mono text-lab-general-text-muted truncate block min-w-0 mb-1"
                        :title="form.formKey"
                      >
                        {{ form.formKey }}
                      </code>
                      <p v-if="form.description" class="text-xs text-lab-general-text-muted mb-2 m-0 leading-snug">
                        {{ form.description }}
                      </p>
                      <div class="text-[10px] text-lab-general-text-muted">
                        {{ form.createdAt ? formatDate(form.createdAt) : '' }}
                      </div>
                    </div>

                    <div class="flex flex-nowrap gap-2 shrink-0 items-start">
                      <Button
                        v-if="form.formKey"
                        size="small"
                        icon="pi pi-copy"
                        severity="secondary"
                        aria-label="Copy form key"
                        @click.stop="copyFormKey(form.formKey)"
                        :pt="{
                          root: { id: generateUniqueId(`form-copy-key-${form.formKey}`) },
                        }"
                      />
                      <Button
                        size="small"
                        icon="pi pi-pencil"
                        severity="secondary"
                        @click.stop="handleFormEdit(form)"
                        :pt="
                          labRecordActionButtonPt(
                            generateUniqueId,
                            'form',
                            'edit',
                            form.formKey ?? form.name,
                            form.name,
                          )
                        "
                      />
                      <Button
                        size="small"
                        icon="pi pi-trash"
                        severity="danger"
                        @click.stop="handleFormDelete(form)"
                        :pt="
                          labRecordActionButtonPt(
                            generateUniqueId,
                            'form',
                            'delete',
                            form.formKey ?? form.name,
                            form.name,
                          )
                        "
                      />
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionPanel>
        </Accordion>
      </div>
    </template>
  </Card>
</template>
