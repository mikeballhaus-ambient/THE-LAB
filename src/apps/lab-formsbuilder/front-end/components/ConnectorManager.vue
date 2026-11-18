<template>
  <Card
    ref="cardRef"
    class="connector-manager"
    :class="{
      'connector-manager--compact': isCompactLayout,
      'connector-manager--constrained h-full max-h-full min-h-0 overflow-hidden': isCompactLayout && constrainHeight,
    }"
    :pt="{
      root: isCompactLayout
        ? 'h-full! max-h-full! min-h-0! max-w-[17rem] w-full shrink-0 min-w-0 flex! flex-col! overflow-hidden! bg-lab-general-bg! border! border-lab-general-border!'
        : 'h-full!',
      header: isCompactLayout ? 'hidden!' : undefined,
      title: isCompactLayout ? 'hidden!' : undefined,
      body: isCompactLayout
        ? 'flex-1! flex! flex-col! min-h-0! overflow-hidden! p-0!'
        : undefined,
      content: isCompactLayout
        ? 'flex-1! flex! flex-col! min-h-0! overflow-hidden! p-0!'
        : undefined,
    }"
  >
    <template v-if="!isCompactLayout" #title>
      <span>Data Connectors</span>
    </template>
    <template #content>
      <div
        class="connector-manager-content"
        :class="
          isCompactLayout
            ? 'flex h-full max-h-full min-h-0 flex-[1_1_0%] flex-col overflow-hidden'
            : ''
        "
      >
      <div
        v-if="isCompactLayout"
        class="connector-manager-compact-heading shrink-0 px-3 pt-3 pb-2 text-sm font-semibold text-lab-general-text border-b border-lab-general-border bg-lab-general-bg-muted"
        :id="generateUniqueId('link-connector-heading')"
      >
        Link connector
      </div>
      <div v-if="connectors.length === 0" class="h-full! flex-1">
        <!-- Only show empty state message when no connectors AND showAddButton is false -->
        <div
          v-if="!showAddButton"
          class="flex items-start text-lab-general-text-muted text-xs leading-snug"
          :class="isCompactLayout ? 'p-1' : 'justify-center h-9 text-sm'"
        >
          <i class="pi pi-database mr-2 mt-0.5 shrink-0"></i>
          <span>{{
            isCompactLayout
              ? 'No connectors registered. Use Manage Data Connectors from the home screen.'
              : 'No connectors available. Connect to your applications to enable data fetching.'
          }}</span>
        </div>
        <!-- Original empty state message (only on landing page) -->
        <div v-if="showAddButton" class="flex items-start justify-center h-9 text-lab-general-text-muted text-sm">
          <i class="pi pi-database mr-2 mt-1"></i>No connectors available. Use the "Add Data Connector" button above to
          register a connector to enable data fetching.
        </div>

      </div>
      <div
        v-else
        class="p-2"
        :class="
          isCompactLayout
            ? [
                'flex min-h-0 max-h-full flex-[1_1_0%] flex-col overflow-y-auto overscroll-contain [scrollbar-gutter:stable]',
                constrainHeight ? 'overflow-y-scroll' : '',
              ]
            : ''
        "
      >
        <Accordion
          v-model:value="openAppGroups"
          multiple
          class="connector-app-accordion w-full"
          :pt="{ root: { attrs: { id: generateUniqueId('connector-app-accordion') } } }"
        >
          <AccordionPanel
            v-for="group in connectorsByApp"
            :key="group.appName"
            :value="group.appName"
            class="connector-app-group"
            :pt="{ root: { attrs: { id: generateUniqueId(`connector-app-panel-${group.appName}`) } } }"
          >
            <AccordionHeader
              :pt="{ root: { attrs: { id: generateUniqueId(`connector-app-heading-${group.appName}`) } } }"
            >
              <span
                class="lab-app-list-group-label text-lab-general-text font-semibold"
                :class="isCompactLayout ? 'text-[10px]!' : 'text-xs'"
              >
                {{ group.appName }}
                <span class="lab-app-list-group-count ml-1 text-lab-general-text-muted font-medium"
                  >({{ group.connectors.length }})</span
                >
              </span>
            </AccordionHeader>
            <AccordionContent
              :pt="{ root: { attrs: { id: generateUniqueId(`connector-app-content-${group.appName}`) } } }"
            >
              <div class="space-y-2 pt-1">
        <div
          v-for="connector in group.connectors"
          :key="connector.id"
          class="lab-app-list-row"
          :class="[
            isCompactLayout ? 'p-2' : 'p-3',
            {
              'border-green-500/50 ring-1 ring-green-500/30': isCompactLayout && isConnectorLinked(connector),
              'lab-app-list-row--selected':
                isConnectorHighlighted(connector) && !(isCompactLayout && isConnectorLinked(connector)),
            },
          ]"
        >
          <div class="flex items-start gap-2">
            <div
              class="flex-1 min-w-0"
              :class="{ 'cursor-pointer': isSelectable }"
              @click="handleCardClick(connector)"
            >
              <template v-if="isCompactLayout">
                <div class="flex items-center justify-between gap-2 min-w-0">
                  <h4
                    :id="generateUniqueId(`connector-name-heading-${connector.id}`)"
                    class="font-semibold text-lab-general-text text-xs m-0 truncate"
                  >
                    {{ connector.entityName }}
                  </h4>
                  <span
                    v-if="isConnectorLinked(connector)"
                    class="shrink-0 text-[9px] uppercase tracking-wide text-[var(--lab-accent-primary)]"
                    :id="generateUniqueId(`connector-linked-badge-${connector.id}`)"
                  >
                    Linked
                  </span>
                </div>
              </template>
              <template v-else>
                <h4
                  :id="generateUniqueId(`connector-name-heading-${connector.id}`)"
                  class="font-semibold text-lab-general-text text-sm m-0 mb-0.5 truncate"
                >
                  {{ connector.entityName }}
                </h4>
                <p class="text-xs text-lab-general-text-muted mb-2 m-0 leading-snug">
                  {{ formatCapabilities(connector.capabilities) }}
                </p>
                <div class="text-[10px] text-lab-general-text-muted">
                  {{ connector.createdAt ? formatDate(connector.createdAt) : '' }}
                </div>
              </template>
            </div>

            <div v-if="!isCompactLayout" class="flex flex-col gap-2 shrink-0 items-end">
              <template v-if="isSelectable">
                <span
                  v-if="isLinkedToForm && activeConnectorId === connector.id"
                  class="text-[10px] text-green-300/90 whitespace-nowrap"
                  :id="generateUniqueId(`connector-linked-badge-${connector.id}`)"
                >
                  Linked
                </span>
                <Button
                  v-if="activeConnectorId === connector.id"
                  type="button"
                  text
                  size="small"
                  severity="secondary"
                  :label="detailsExpanded ? 'Hide' : 'Details'"
                  :icon="detailsExpanded ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
                  :aria-expanded="detailsExpanded"
                  @click.stop="detailsExpanded = !detailsExpanded"
                  :pt="{ root: { id: generateUniqueId(`connector-details-toggle-${connector.id}`) } }"
                />
              </template>
              <div v-if="showRowActions" class="flex gap-2 shrink-0">
                <Button
                  size="small"
                  icon="pi pi-pencil"
                  severity="secondary"
                  @click.stop="handleConnectorEdit(connector)"
                  :pt="
                    labRecordActionButtonPt(
                      generateUniqueId,
                      'connector',
                      'edit',
                      connector.id ?? connector.entityName,
                      connector.entityName,
                    )
                  "
                />
                <Button
                  size="small"
                  icon="pi pi-trash"
                  severity="danger"
                  @click.stop="handleConnectorDelete(connector)"
                  :pt="
                    labRecordActionButtonPt(
                      generateUniqueId,
                      'connector',
                      'delete',
                      connector.id ?? connector.entityName,
                      connector.entityName,
                    )
                  "
                />
              </div>
            </div>
          </div>

          <div
            v-if="!isCompactLayout && activeConnectorId === connector.id && detailsExpanded && isSelectable"
            class="mt-3 pt-3 border-t border-lab-general-border rounded-lg text-lab-general-text connector-details"
          >
            <dl class="space-y-3 text-sm m-0">
              <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <dt class="text-lab-general-text-muted font-medium m-0">Application:</dt>
                <dd class="text-lab-general-text font-medium m-0 text-right">{{ connector.appName }}</dd>
              </div>
              <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <dt class="text-lab-general-text-muted font-medium m-0">Entity:</dt>
                <dd class="text-lab-general-text font-medium m-0 text-right">{{ connector.entityName }}</dd>
              </div>
              <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <dt class="text-lab-general-text-muted font-medium m-0">Capabilities:</dt>
                <dd class="text-lab-general-text font-medium m-0 text-right">
                  {{ formatCapabilities(connector.capabilities) }}
                </dd>
              </div>
            </dl>

            <div
              v-if="connector.endpoints?.lookups?.length"
              class="mt-4 pt-4 border-t border-lab-general-border"
            >
              <h4
                :id="generateUniqueId(`lookups-heading-${connector.id}`)"
                class="text-xs font-semibold uppercase tracking-wide text-lab-general-text-muted mb-3 m-0"
              >
                Available lookups
              </h4>
              <ul
                class="list-none m-0 p-0 space-y-2"
                :id="generateUniqueId(`connector-lookups-list-${connector.id}`)"
              >
                <li
                  v-for="lookup in connector.endpoints.lookups"
                  :key="lookup.forProperty"
                  class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs py-1 border-b border-lab-general-border last:border-b-0"
                >
                  <span class="text-sky-400 font-medium">{{ lookup.forProperty }}</span>
                  <span class="text-lab-general-text-muted font-mono text-[11px] break-all text-right">{{
                    lookup.endpoint?.url
                  }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
              </div>
            </AccordionContent>
          </AccordionPanel>
        </Accordion>
      </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.connector-manager--compact :deep(.p-card-body) {
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
  min-height: 0;
  max-height: 100%;
  padding: 0;
}

.connector-manager--compact :deep(.p-card-content) {
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
  min-height: 0;
  max-height: 100%;
  padding: 0;
}

.connector-manager--constrained :deep(.p-accordion) {
  min-height: 0;
}

.connector-manager--compact :deep(.p-accordionheader) {
  color: var(--lab-general-text);
  background: transparent;
}

.connector-manager--compact :deep(.p-accordionheader:hover) {
  background: color-mix(in srgb, var(--lab-general-border) 14%, transparent);
}

.connector-manager--compact :deep(.p-accordionheader-toggle-icon) {
  color: var(--lab-general-text-muted);
}
</style>

<style>
.forms-builder-app .lab-app-list-row {
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 70%, transparent);
  border-radius: 0.375rem;
  background: color-mix(in srgb, var(--lab-general-bg-muted) 40%, var(--lab-general-bg));
}

.forms-builder-app .lab-app-list-row--selected {
  border-color: color-mix(in srgb, var(--lab-button-border-hover) 50%, var(--lab-general-border));
  background: color-mix(in srgb, var(--lab-general-border) 10%, var(--lab-general-bg));
}

.forms-builder-app .lab-app-list-row:hover {
  background: color-mix(in srgb, var(--lab-general-border) 8%, var(--lab-general-bg));
}
</style>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';
import type { DataConnector } from '../../shared/types';
import { groupConnectorsByApp } from '../utils/group-connectors-by-app';


const { generateUniqueId } = useUniqueElementId();

// NEW PROP: Whether to show the "Add Data Connector" button reference
const props = withDefaults(defineProps<{
  connectors: DataConnector[];
  showAddButton?: boolean;
  /** Landing uses full cards; form designer sidebar uses compact rows. */
  layout?: 'default' | 'compact';
  /** Form designer: parent sets a bounded height; list scrolls inside the card. */
  constrainHeight?: boolean;
  selectedConnectorId?: number | null;
  /** When set (form designer), details collapse once this connector is linked to the form. */
  formLinkedConnectorId?: number | null;
}>(), {
  showAddButton: false,
  layout: 'default',
  constrainHeight: false,
  selectedConnectorId: null,
  formLinkedConnectorId: null,
});

const emit = defineEmits<{
  (e: 'connector-select', id: number): void;
  (e: 'connector-edit', connector: DataConnector): void;
  (e: 'connector-delete', connector: DataConnector): void;
}>();

const cardRef = ref(null);
const activeConnectorId = ref<number | null>(null);
const detailsExpanded = ref(false);

watch(
  () => props.selectedConnectorId,
  (id) => {
    if (id != null) {
      activeConnectorId.value = id;
    }
  },
  { immediate: true },
);

watch(
  () => props.formLinkedConnectorId,
  (linkedId) => {
    if (linkedId == null) {
      return;
    }
    if (activeConnectorId.value === linkedId) {
      detailsExpanded.value = false;
    }
  },
  { immediate: true },
);

const isSelectable = computed(() => !props.showAddButton);

const isCompactLayout = computed(() => props.layout === 'compact');

const showRowActions = computed(() => props.showAddButton);

const connectorsByApp = computed(() => groupConnectorsByApp(props.connectors));

/** App group accordion — empty = all panels collapsed by default. */
const openAppGroups = ref<string[]>([]);

const isLinkedToForm = computed(() => {
  const linkedId = props.formLinkedConnectorId;
  return linkedId != null && activeConnectorId.value === linkedId;
});

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function handleCardClick(connector: DataConnector): void {
  if (connector.id == null || !isSelectable.value) {
    return;
  }
  if (isCompactLayout.value) {
    activeConnectorId.value = connector.id;
    emit('connector-select', connector.id);
    return;
  }
  if (activeConnectorId.value === connector.id) {
    detailsExpanded.value = !detailsExpanded.value;
    return;
  }
  activeConnectorId.value = connector.id;
  if (connector.id !== props.formLinkedConnectorId) {
    detailsExpanded.value = true;
  }
  emit('connector-select', connector.id);
}

function isConnectorLinked(connector: DataConnector): boolean {
  const linkedId = props.formLinkedConnectorId;
  return linkedId != null && connector.id === linkedId;
}

function isConnectorHighlighted(connector: DataConnector): boolean {
  if (connector.id == null) {
    return false;
  }
  if (isConnectorLinked(connector)) {
    return !isCompactLayout.value;
  }
  return isSelectable.value && activeConnectorId.value === connector.id;
}

function handleConnectorEdit(connector: DataConnector): void {
  emit('connector-edit', connector);
}

function handleConnectorDelete(connector: DataConnector): void {
  emit('connector-delete', connector);
}

function formatCapabilities(capabilities?: unknown): string {
  if (!capabilities) return 'None';
  if (Array.isArray(capabilities)) {
    return capabilities.length ? capabilities.join(', ') : 'None';
  }
  return String(capabilities);
}
</script>
