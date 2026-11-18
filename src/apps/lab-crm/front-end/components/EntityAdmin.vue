<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';

import EntityDefinitionsDnDList from './entity-admin/EntityDefinitionsDnDList.vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { useCrmApi } from '../composables/useCrmApi';
import type { EntityDefinition, EntityProperty, EntityPropertyType } from '../../shared/types/entity.types';
import { isLookupDisplayEligibleProperty } from '../../shared/utils/lookup-display-property';
import EntityIcon from './EntityIcon.vue';

const props = defineProps<{
  serverUrl: string;
}>();

const emit = defineEmits<{
  changed: [];
}>();

const { generateUniqueId } = useUniqueElementId();
const toast = useToast();
const api = useCrmApi(props.serverUrl);

const definitions = ref<EntityDefinition[]>([]);
const loading = ref(false);
const reorderingNav = ref(false);
const showEditor = ref(false);
const saving = ref(false);
const editingKey = ref<string | null>(null);

const propertyTypeOptions: { label: string; value: EntityPropertyType }[] = [
  { label: 'Text', value: 'string' },
  { label: 'Number', value: 'number' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Date', value: 'date' },
  { label: 'Date & time', value: 'datetime' },
  { label: 'Choice list', value: 'enum' },
  { label: 'Lookup', value: 'lookup' },
  { label: 'List', value: 'array' },
];

const draft = ref({
  entityKey: '',
  name: '',
  description: '',
  icon: 'pi-database',
  lookupDisplayProperty: null as string | null,
  lookupDisplayFormat: '' as string,
  properties: [] as EntityProperty[],
});

const isCreate = computed(() => editingKey.value == null);

const lookupTargetOptions = computed(() =>
  definitions.value
    .filter((d) => d.entityKey !== draft.value.entityKey)
    .map((d) => ({ label: d.name, value: d.entityKey })),
);

const lookupDisplayPropertyOptions = computed(() => {
  const options = draft.value.properties
    .filter(isLookupDisplayEligibleProperty)
    .map((p) => ({ label: p.label || p.name, value: p.name }));
  return [{ label: 'Auto (first + last name, else first text field)', value: null as string | null }, ...options];
});

const lookupFormatExample = '{{ salutation }} {{ firstName }} {{ lastName }}';
const lookupFormatPlaceholder = '{{ firstName }} {{ lastName }}';

function emptyProperty(): EntityProperty {
  return { name: 'name', type: 'string', label: 'Name', required: true };
}

function openCreate(): void {
  editingKey.value = null;
  draft.value = {
    entityKey: '',
    name: '',
    description: '',
    icon: 'pi-database',
    lookupDisplayProperty: null,
    lookupDisplayFormat: '',
    properties: [emptyProperty()],
  };
  showEditor.value = true;
}

function openEdit(def: EntityDefinition): void {
  editingKey.value = def.entityKey;
  draft.value = {
    entityKey: def.entityKey,
    name: def.name,
    description: def.description ?? '',
    icon: def.icon?.replace(/^pi\s+/, '') ?? 'pi-database',
    lookupDisplayProperty: def.lookupDisplayProperty ?? null,
    lookupDisplayFormat: def.lookupDisplayFormat ?? '',
    properties: def.properties.map((p) => {
      const copy: EntityProperty = {
        ...p,
        options: p.options ? p.options.map((o) => ({ ...o })) : undefined,
      };
      if (copy.type === 'enum' && !copy.options?.length) {
        copy.options = [{ value: 'option1', label: 'Option 1' }];
      }
      return copy;
    }),
  };
  showEditor.value = true;
}

function addProperty(): void {
  draft.value.properties.push({
    name: `field${draft.value.properties.length + 1}`,
    type: 'string',
    label: `Field ${draft.value.properties.length + 1}`,
  });
}

function removeProperty(index: number): void {
  if (draft.value.properties.length <= 1) {
    return;
  }
  draft.value.properties.splice(index, 1);
}

function onPropertyTypeChange(prop: EntityProperty, type: EntityPropertyType): void {
  prop.type = type;
  if (type === 'enum') {
    if (!prop.options?.length) {
      prop.options = [{ value: 'draft', label: 'Draft' }];
    }
  } else {
    delete prop.options;
  }
  if (type !== 'lookup') {
    delete prop.lookupEntityKey;
    delete prop.lookupLabelProperty;
  }
}

function addEnumOption(propIndex: number): void {
  const prop = draft.value.properties[propIndex];
  if (!prop) {
    return;
  }
  if (!prop.options) {
    prop.options = [];
  }
  const n = prop.options.length + 1;
  prop.options.push({ value: `option${n}`, label: `Option ${n}` });
}

function removeEnumOption(propIndex: number, optionIndex: number): void {
  const prop = draft.value.properties[propIndex];
  if (!prop?.options || prop.options.length <= 1) {
    return;
  }
  prop.options.splice(optionIndex, 1);
}

async function loadDefinitions(): Promise<void> {
  loading.value = true;
  try {
    definitions.value = await api.fetchDefinitions();
  } finally {
    loading.value = false;
  }
}

async function onDefinitionsReorder(next: EntityDefinition[]): Promise<void> {
  definitions.value = next;
  reorderingNav.value = true;
  try {
    definitions.value = await api.reorderDefinitions(next.map((d) => d.entityKey));
    emit('changed');
    toast.add({
      severity: 'success',
      summary: 'Navigation order updated',
      life: 2500,
    });
  } catch (err) {
    await loadDefinitions();
    toast.add({
      severity: 'error',
      summary: 'Reorder failed',
      detail: err instanceof Error ? err.message : 'Unknown error',
      life: 6000,
    });
  } finally {
    reorderingNav.value = false;
  }
}

async function saveDefinition(): Promise<void> {
  saving.value = true;
  try {
    const properties = draft.value.properties.map((p) => {
      const copy: EntityProperty = {
        name: p.name.trim(),
        type: p.type,
        label: p.label.trim(),
      };
      if (p.required) {
        copy.required = true;
      }
      if (p.type === 'lookup' && p.lookupEntityKey) {
        copy.lookupEntityKey = p.lookupEntityKey;
      }
      if (p.type === 'enum') {
        const options = (p.options ?? [])
          .map((o) => ({
            value: o.value.trim(),
            label: (o.label?.trim() || o.value.trim()),
          }))
          .filter((o) => o.value.length > 0);
        if (!options.length) {
          throw new Error(`Property "${p.name}" (choice list) needs at least one choice`);
        }
        copy.options = options;
      }
      return copy;
    });

    if (isCreate.value) {
      await api.createDefinition({
        entityKey: draft.value.entityKey.trim(),
        name: draft.value.name.trim(),
        description: draft.value.description.trim() || undefined,
        icon: draft.value.icon.trim() || undefined,
        properties,
        lookupDisplayProperty: draft.value.lookupDisplayProperty,
        lookupDisplayFormat: draft.value.lookupDisplayFormat.trim() || null,
      });
      toast.add({
        severity: 'success',
        summary: 'Entity created',
        detail: `${draft.value.name} appears in navigation after refresh`,
        life: 4000,
      });
    } else if (editingKey.value) {
      await api.updateDefinition(editingKey.value, {
        name: draft.value.name.trim(),
        description: draft.value.description.trim() || undefined,
        icon: draft.value.icon.trim() || undefined,
        properties,
        lookupDisplayProperty: draft.value.lookupDisplayProperty,
        lookupDisplayFormat: draft.value.lookupDisplayFormat.trim() || null,
      });
      toast.add({
        severity: 'success',
        summary: 'Entity updated',
        detail: editingKey.value,
        life: 3000,
      });
    }
    showEditor.value = false;
    await loadDefinitions();
    emit('changed');
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: err instanceof Error ? err.message : 'Unknown error',
      life: 6000,
    });
  } finally {
    saving.value = false;
  }
}

async function deleteEntity(def: EntityDefinition): Promise<void> {
  if (def.isSystem) {
    return;
  }
  const confirmed = window.confirm(
    `Delete entity model "${def.name}" (${def.entityKey})? This cannot be undone.`,
  );
  if (!confirmed) {
    return;
  }
  try {
    await api.deleteDefinition(def.entityKey);
    toast.add({
      severity: 'success',
      summary: 'Entity deleted',
      detail: def.entityKey,
      life: 3000,
    });
    await loadDefinitions();
    emit('changed');
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Delete failed',
      detail: err instanceof Error ? err.message : 'Unknown error',
      life: 6000,
    });
  }
}

onMounted(() => loadDefinitions());

defineExpose({ openCreate });
</script>

<template>
  <div class="crm-entity-admin app-loaded-container flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2
          class="text-xl font-semibold text-lab-general-text"
          :id="generateUniqueId('crm-entity-admin-title')"
        >
          Entity models
        </h2>
        <p class="text-sm text-lab-general-text-muted">
          Add custom entities beyond the six system models. Drag rows to set sidebar navigation order.
          Then publish forms in Forms Builder and set form bindings.
        </p>
      </div>
      <Button
        class="crm-entity-admin-new-btn"
        label="New entity"
        icon="pi pi-plus"
        size="small"
        :pt="{ root: { attrs: { id: generateUniqueId('crm-entity-admin-new') } } }"
        @click="openCreate"
      />
    </div>

    <Message severity="info" :closable="false" class="crm-settings-info-message">
      Checklist for a new entity: save model here → design form in Forms Builder → register connector
      field mapping → add form key on <strong>Form bindings</strong> tab.
    </Message>

    <p v-if="loading && definitions.length === 0" class="text-sm text-lab-general-text-muted m-0">Loading entity models…</p>
    <EntityDefinitionsDnDList
      v-else
      :definitions="definitions"
      :loading="loading"
      :reordering="reorderingNav"
      @reorder="onDefinitionsReorder"
      @edit="openEdit"
      @delete="deleteEntity"
    />

    <Dialog
      v-model:visible="showEditor"
      modal
      append-to="body"
      :header="isCreate ? 'New entity model' : `Edit ${draft.entityKey}`"
      class="crm-entity-admin-dialog lab-integration-dialog lab-app-dialog w-full max-w-2xl"
      :pt="{
        root: { attrs: { id: generateUniqueId('crm-entity-admin-dialog') } },
        mask: { class: 'lab-app-dialog lab-integration-dialog-mask' },
      }"
    >
      <div class="crm-entity-admin-editor">
        <div class="crm-entity-admin-editor-body lab-form-runtime flex flex-col gap-3 text-lab-general-text">
          <div v-if="isCreate" class="fb-field fb-field--vertical">
            <label class="fb-field__label" :id="generateUniqueId('crm-entity-admin-key-label')">
              Entity key (slug)
            </label>
            <div class="fb-field__control">
              <InputText
                v-model="draft.entityKey"
                placeholder="e.g. partners"
                :pt="{ root: { attrs: { id: generateUniqueId('crm-entity-admin-key') } } }"
              />
            </div>
          </div>
          <div class="fb-field fb-field--vertical">
            <label class="fb-field__label" :id="generateUniqueId('crm-entity-admin-name-label')">
              Display name
            </label>
            <div class="fb-field__control">
              <InputText
                v-model="draft.name"
                :pt="{ root: { attrs: { id: generateUniqueId('crm-entity-admin-name') } } }"
              />
            </div>
          </div>
          <div class="fb-field fb-field--vertical">
            <div class="fb-field__label" :id="generateUniqueId('crm-entity-admin-icon-label')">
              Icon (PrimeIcons)
            </div>
            <div class="fb-field__control flex items-center gap-3">
              <EntityIcon :icon="draft.icon" size="lg" />
              <InputText
                v-model="draft.icon"
                placeholder="pi-users"
                class="flex-1"
                :pt="{ root: { attrs: { id: generateUniqueId('crm-entity-admin-icon') } } }"
              />
            </div>
            <p class="text-xs text-lab-general-text-muted m-0">
              Use a PrimeIcons name such as <code class="font-mono text-lab-general-text">pi-users</code> or
              <code class="font-mono text-lab-general-text">pi-dollar</code>. Shown in CRM navigation and lists.
            </p>
          </div>
          <div class="fb-field fb-field--vertical">
            <label class="fb-field__label" :id="generateUniqueId('crm-entity-admin-desc-label')">
              Description
            </label>
            <div class="fb-field__control">
              <Textarea
                v-model="draft.description"
                rows="2"
                :pt="{ root: { attrs: { id: generateUniqueId('crm-entity-admin-description') } } }"
              />
            </div>
          </div>

          <div class="fb-field fb-field--vertical">
            <div class="fb-field__label" :id="generateUniqueId('crm-entity-admin-lookup-display-label')">
              Lookup display property
            </div>
            <p class="text-xs text-lab-general-text-muted m-0">
              When other entities reference this model, show this field instead of the record id.
            </p>
            <div class="fb-field__control">
              <Select
                v-model="draft.lookupDisplayProperty"
                :options="lookupDisplayPropertyOptions"
                option-label="label"
                option-value="value"
                placeholder="Auto"
                :pt="{
                  root: { attrs: { id: generateUniqueId('crm-entity-admin-lookup-display') } },
                }"
              />
            </div>
          </div>
          <div class="fb-field fb-field--vertical">
            <div class="fb-field__label" :id="generateUniqueId('crm-entity-admin-lookup-format-label')">
              Lookup display format (optional)
            </div>
            <p class="text-xs text-lab-general-text-muted m-0">
              Combine fields with placeholders like
              <code class="font-mono text-lab-general-text">{{ lookupFormatExample }}</code>.
              When set, overrides the single property above.
            </p>
            <div class="fb-field__control">
              <InputText
                v-model="draft.lookupDisplayFormat"
                :placeholder="lookupFormatPlaceholder"
                :pt="{
                  root: { attrs: { id: generateUniqueId('crm-entity-admin-lookup-format') } },
                }"
              />
            </div>
          </div>

          <div class="flex items-center justify-between mt-1 gap-2">
            <h3 class="lab-form-group-title m-0" :id="generateUniqueId('crm-entity-admin-props-heading')">
              Properties
            </h3>
            <Button
              label="Add property"
              size="small"
              text
              icon="pi pi-plus"
              :pt="{ root: { attrs: { id: generateUniqueId('crm-entity-admin-add-prop') } } }"
              @click="addProperty"
            />
          </div>

        <div
          v-for="(prop, index) in draft.properties"
          :key="index"
          class="crm-entity-admin-prop-card p-3"
        >
          <div class="fb-field__control flex flex-col gap-2 min-w-0">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <InputText
              v-model="prop.name"
              placeholder="Field name"
              :pt="{
                root: {
                  attrs: { id: generateUniqueId(`crm-entity-admin-prop-name-${index}`) },
                },
              }"
            />
            <InputText
              v-model="prop.label"
              placeholder="Label"
              :pt="{
                root: {
                  attrs: { id: generateUniqueId(`crm-entity-admin-prop-label-${index}`) },
                },
              }"
            />
            <Select
              :model-value="prop.type"
              :options="propertyTypeOptions"
              option-label="label"
              option-value="value"
              placeholder="Type"
              :pt="{
                root: {
                  attrs: { id: generateUniqueId(`crm-entity-admin-prop-type-${index}`) },
                },
              }"
              @update:model-value="(t: EntityPropertyType) => onPropertyTypeChange(prop, t)"
            />
            <Select
              v-if="prop.type === 'lookup'"
              v-model="prop.lookupEntityKey"
              :options="lookupTargetOptions"
              option-label="label"
              option-value="value"
              placeholder="Lookup entity"
              :pt="{
                root: {
                  attrs: { id: generateUniqueId(`crm-entity-admin-prop-lookup-${index}`) },
                },
              }"
            />
          </div>
          <div
            v-if="prop.type === 'enum'"
            class="crm-entity-admin-enum-options crm-entity-admin-prop-card__divider flex flex-col gap-2 pt-2"
          >
            <span
              class="text-xs text-lab-general-text-muted"
              :id="generateUniqueId(`crm-entity-admin-enum-heading-${index}`)"
            >
              Choices (stored value + display label)
            </span>
            <div
              v-for="(opt, oi) in prop.options ?? []"
              :key="oi"
              class="fb-field__control flex flex-wrap gap-2 items-center"
            >
              <InputText
                v-model="opt.value"
                placeholder="value e.g. draft"
                class="flex-1 min-w-[7rem]"
                :pt="{
                  root: {
                    attrs: {
                      id: generateUniqueId(`crm-entity-admin-enum-val-${index}-${oi}`),
                    },
                  },
                }"
              />
              <InputText
                v-model="opt.label"
                placeholder="Label e.g. Draft"
                class="flex-1 min-w-[7rem]"
                :pt="{
                  root: {
                    attrs: {
                      id: generateUniqueId(`crm-entity-admin-enum-lbl-${index}-${oi}`),
                    },
                  },
                }"
              />
              <Button
                icon="pi pi-trash"
                size="small"
                text
                rounded
                severity="danger"
                :disabled="(prop.options?.length ?? 0) <= 1"
                :pt="{
                  root: {
                    attrs: {
                      id: generateUniqueId(`crm-entity-admin-enum-rm-${index}-${oi}`),
                    },
                  },
                }"
                @click="removeEnumOption(index, oi)"
              />
            </div>
            <Button
              label="Add choice"
              size="small"
              text
              icon="pi pi-plus"
              :pt="{
                root: { attrs: { id: generateUniqueId(`crm-entity-admin-enum-add-${index}`) } },
              }"
              @click="addEnumOption(index)"
            />
          </div>
          <div class="flex justify-between items-center">
            <label
              class="fb-field__label flex items-center gap-2 m-0"
              :id="generateUniqueId(`crm-entity-admin-prop-req-label-${index}`)"
            >
              <input
                v-model="prop.required"
                type="checkbox"
                class="shrink-0"
                :id="generateUniqueId(`crm-entity-admin-prop-req-${index}`)"
              />
              Required
            </label>
            <Button
              v-if="draft.properties.length > 1"
              label="Remove"
              size="small"
              severity="danger"
              text
              :pt="{
                root: {
                  attrs: { id: generateUniqueId(`crm-entity-admin-prop-remove-${index}`) },
                },
              }"
              @click="removeProperty(index)"
            />
          </div>
          </div>
        </div>

          <div class="flex justify-end mt-1">
            <Button
              label="Add property"
              size="small"
              text
              icon="pi pi-plus"
              class="crm-entity-admin-add-prop-bottom"
              :pt="{ root: { attrs: { id: generateUniqueId('crm-entity-admin-add-prop-bottom') } } }"
              @click="addProperty"
            />
          </div>
        </div>

        <div class="form-actions-bar lab-form-action-bar flex justify-end gap-2">
          <button
            type="button"
            class="lab-form-action-secondary"
            :disabled="saving"
            :id="generateUniqueId('crm-entity-admin-cancel')"
            @click="showEditor = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="lab-form-action-primary inline-flex items-center gap-2"
            :disabled="saving"
            :id="generateUniqueId('crm-entity-admin-save')"
            @click="saveDefinition"
          >
            <i v-if="saving" class="pi pi-spin pi-spinner text-sm" aria-hidden="true" />
            <i v-else class="pi pi-check text-sm" aria-hidden="true" />
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.crm-entity-admin-editor-body :deep(.fb-field) {
  display: flex;
  width: 100%;
  min-width: 0;
  gap: 0.25rem;
}

.crm-entity-admin-editor-body :deep(.fb-field--vertical) {
  flex-direction: column;
  align-items: flex-start;
}

.crm-entity-admin-editor-body :deep(.fb-field__control) {
  width: 100%;
  min-width: 0;
}
</style>
