<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { useCrmApi } from '../composables/useCrmApi';
import type { EntityDefinition, EntityFormBinding } from '../../shared/types/entity.types';
import { getCrmEntityFormKey } from '../config/form-keys';
import { bindingsForEntity, formKeyForPurpose } from '../../shared/utils/form-binding-resolution';
import EntityIcon from './EntityIcon.vue';

const emit = defineEmits<{
  changed: [];
}>();

const props = defineProps<{
  serverUrl: string;
}>();

const crmBaseUrl = computed(() => props.serverUrl.replace(/\/$/, ''));

function discoveryUrlFor(entityKey: string): string {
  return `${crmBaseUrl.value}/api/connector/discovery/${encodeURIComponent(entityKey)}`;
}

async function copyDiscoveryUrl(entityKey: string): Promise<void> {
  const url = discoveryUrlFor(entityKey);
  try {
    await navigator.clipboard.writeText(url);
    toast.add({
      severity: 'success',
      summary: 'Copied',
      detail: 'Discovery URL copied to clipboard',
      life: 2000,
    });
  } catch {
    toast.add({
      severity: 'warn',
      summary: 'Copy failed',
      detail: url,
      life: 5000,
    });
  }
}

const { generateUniqueId } = useUniqueElementId();
const toast = useToast();
const api = useCrmApi(props.serverUrl);

const definitions = ref<EntityDefinition[]>([]);
const bindings = ref<EntityFormBinding[]>([]);
const staleDuplicateRows = ref(0);
const loading = ref(false);

const draft = ref({
  entityKey: 'contacts',
  formKey: '',
});

function resolvedFormKeyForEntity(entityKey: string): string {
  return dbFormKeyForEntity(entityKey) || getCrmEntityFormKey(entityKey) || '';
}

function entityRows(entityKey: string): EntityFormBinding[] {
  const def = definitions.value.find((d) => d.entityKey === entityKey);
  return bindingsForEntity(bindings.value, entityKey, def?.id);
}

function dbFormKeyForEntity(entityKey: string): string {
  const rows = entityRows(entityKey);
  const createKey = formKeyForPurpose(rows, 'create');
  const editKey = formKeyForPurpose(rows, 'edit');
  return createKey ?? editKey ?? '';
}

function persistedMatchesSaved(entityKey: string, formKey: string): boolean {
  const rows = entityRows(entityKey);
  const createKey = formKeyForPurpose(rows, 'create');
  const editKey = formKeyForPurpose(rows, 'edit');
  return createKey === formKey && editKey === formKey;
}

const entityBindingRows = computed(() => {
  return definitions.value.map((def) => {
    const entityKey = def.entityKey;
    const rows = entityRows(entityKey);
    const createKey = formKeyForPurpose(rows, 'create');
    const editKey = formKeyForPurpose(rows, 'edit');
    const dbFormKey = dbFormKeyForEntity(entityKey);
    const formKey = dbFormKey || getCrmEntityFormKey(entityKey) || '';
    const fromRegistry = !dbFormKey && Boolean(getCrmEntityFormKey(entityKey));
    const mismatch = Boolean(createKey && editKey && createKey !== editKey);
    return {
      entityKey,
      entityName: def.name,
      entityIcon: def.icon,
      discoveryUrl: discoveryUrlFor(entityKey),
      formKey,
      fromRegistry,
      mismatch,
    };
  });
});

watch(
  () => draft.value.entityKey,
  (entityKey) => {
    draft.value.formKey = resolvedFormKeyForEntity(entityKey);
  },
);

async function loadBindings(): Promise<void> {
  const result = await api.fetchFormBindings();
  bindings.value = result.bindings;
  staleDuplicateRows.value = result.staleDuplicateRows;
  if (result.staleDuplicateRows > 0) {
    const removed = await api.dedupeFormBindingsInDb();
    if (removed > 0) {
      const again = await api.fetchFormBindings();
      bindings.value = again.bindings;
      staleDuplicateRows.value = again.staleDuplicateRows;
    }
  }
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    definitions.value = await api.fetchDefinitions();
    await loadBindings();
    draft.value.formKey = resolvedFormKeyForEntity(draft.value.entityKey);
  } finally {
    loading.value = false;
  }
}

async function saveBinding(): Promise<void> {
  const formKey = draft.value.formKey.trim();
  if (!formKey) {
    toast.add({ severity: 'warn', summary: 'Form key required', life: 3000 });
    return;
  }
  try {
    await api.setEntityFormKey(draft.value.entityKey, formKey);
    await loadBindings();
    draft.value.formKey = formKey;
    if (!persistedMatchesSaved(draft.value.entityKey, formKey)) {
      toast.add({
        severity: 'warn',
        summary: 'Save did not stick',
        detail:
          'Teardown and relaunch the CRM app (port 3010), not only the lab dev server, then save again.',
        life: 7000,
      });
    } else {
      toast.add({ severity: 'success', summary: 'Bindings saved', life: 2500 });
      emit('changed');
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: err instanceof Error ? err.message : undefined,
      life: 4000,
    });
  }
}

onMounted(() => load());
</script>

<template>
  <div class="crm-form-bindings-admin flex flex-col gap-4">
    <h2 class="text-xl font-semibold" :id="generateUniqueId('crm-bindings-title')">Form bindings</h2>

    <Message
      v-if="staleDuplicateRows > 0"
      severity="warn"
      :closable="false"
      class="crm-bindings-stale-msg"
    >
      {{ staleDuplicateRows }} duplicate binding row(s) in the database. Use
      <strong>Teardown</strong> on the CRM app card, then launch it again (refreshes the server on port
      3010). Restarting only <code>npm run dev</code> does not replace that process.
    </Message>

    <p class="text-sm text-lab-general-text-muted">
      Map each CRM entity to one published Forms Builder <strong>form key</strong> (create and edit use the
      same form). Register connectors in Forms Builder using each entity’s <strong>discovery URL</strong>
      below. Defaults also seed from <code>shared/config/entity-form-keys.ts</code> on CRM server start.
      Submit approval on <strong>sales</strong> and <strong>quotes</strong> publishes domain events; policies
      are configured in Workflow Studio demo graphs, not here.
    </p>

    <div
      class="crm-binding-form rounded-lg border border-lab-general-border/70 bg-lab-general-bg-muted/35 p-4 flex flex-col gap-4"
    >
      <div class="max-w-md">
        <label class="text-sm block mb-1" :id="generateUniqueId('crm-binding-entity-label')">Entity</label>
        <Select
          v-model="draft.entityKey"
          :options="definitions"
          option-label="name"
          option-value="entityKey"
          class="w-full"
          :pt="{ root: { attrs: { id: generateUniqueId('crm-binding-entity') } } }"
        >
          <template #option="{ option }">
            <div class="flex items-start gap-2 py-0.5">
              <EntityIcon :icon="(option as EntityDefinition).icon" size="sm" />
              <div class="flex flex-col min-w-0">
                <span>{{ (option as EntityDefinition).name }}</span>
                <span class="text-xs text-lab-general-text-muted font-mono break-all">
                  {{ (option as EntityDefinition).entityKey }}
                </span>
              </div>
            </div>
          </template>
          <template #value="{ value }">
            <EntityIcon
              v-if="value"
              :icon="definitions.find((d) => d.entityKey === value)?.icon"
              size="sm"
            >
              {{ definitions.find((d) => d.entityKey === value)?.name ?? value }}
            </EntityIcon>
          </template>
        </Select>
      </div>

      <div
        class="crm-binding-form-details border-t border-lab-general-border/80 pt-4 grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-end"
      >
        <div class="min-w-0">
          <label
            class="text-sm block mb-1"
            :id="generateUniqueId('crm-binding-discovery-label')"
          >
            Discovery URL
          </label>
          <div
            class="flex flex-wrap items-center gap-2 rounded-md border border-lab-general-border/60 bg-lab-general-bg-muted/40 px-2 py-1.5"
            :id="generateUniqueId('crm-binding-selected-discovery')"
          >
            <code class="text-xs text-lab-general-text-muted break-all flex-1 min-w-0">
              {{ discoveryUrlFor(draft.entityKey) }}
            </code>
            <Button
              icon="pi pi-copy"
              text
              rounded
              size="small"
              severity="secondary"
              class="crm-copy-discovery-btn shrink-0"
              aria-label="Copy discovery URL"
              :pt="{
                root: { attrs: { id: generateUniqueId('crm-binding-copy-discovery') } },
              }"
              @click="copyDiscoveryUrl(draft.entityKey)"
            />
          </div>
        </div>
        <div>
          <label class="text-sm block mb-1" :id="generateUniqueId('crm-binding-form-key-label')">
            Form key
          </label>
          <InputText
            v-model="draft.formKey"
            class="w-full"
            placeholder="form_1790…"
            :id="generateUniqueId('crm-binding-form-key')"
          />
        </div>
        <Button
          label="Save"
          icon="pi pi-save"
          size="small"
          class="crm-binding-save-btn shrink-0"
          :pt="{ root: { attrs: { id: generateUniqueId('crm-binding-save') } } }"
          @click="saveBinding"
        />
      </div>
    </div>

    <DataTable
      :value="entityBindingRows"
      :loading="loading"
      class="crm-bindings-table"
      :pt="{ root: { attrs: { id: generateUniqueId('crm-bindings-table') } } }"
    >
      <Column field="entityKey" header="Entity">
        <template #body="{ data }">
          <div class="flex items-start gap-2">
            <EntityIcon :icon="data.entityIcon" size="sm" />
            <div class="flex flex-col">
              <span>{{ data.entityName ?? data.entityKey }}</span>
              <span class="text-xs text-lab-general-text-muted font-mono">{{ data.entityKey }}</span>
            </div>
          </div>
        </template>
      </Column>
      <Column header="Discovery URL (Forms Builder connector)">
        <template #body="{ data }">
          <div class="flex flex-wrap items-center gap-1 max-w-md">
            <code class="text-xs break-all text-lab-general-text-muted">{{ data.discoveryUrl }}</code>
            <Button
              icon="pi pi-copy"
              text
              rounded
              size="small"
              severity="secondary"
              class="crm-copy-discovery-btn"
              :aria-label="`Copy discovery URL for ${data.entityKey}`"
              :pt="{
                root: {
                  attrs: {
                    id: generateUniqueId(`crm-bindings-copy-${data.entityKey}`),
                  },
                },
              }"
              @click="copyDiscoveryUrl(data.entityKey)"
            />
          </div>
        </template>
      </Column>
      <Column field="formKey" header="Form key">
        <template #body="{ data }">
          <span v-if="data.formKey">{{ data.formKey }}</span>
          <span v-else class="text-lab-general-text-muted">—</span>
        </template>
      </Column>
      <Column header="Notes">
        <template #body="{ data }">
          <span v-if="data.fromRegistry" class="text-lab-general-text-muted text-sm">
            From registry — restart CRM server to write DB, or click Save.
          </span>
          <span v-else-if="data.mismatch" class="text-amber-400 text-sm">
            Create and edit keys differ — save again to align.
          </span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
