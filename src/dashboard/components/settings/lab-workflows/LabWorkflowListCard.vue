<script setup lang="ts">
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { LabWorkflowRecord } from '@/shared/types/lab-workflow';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import LabWorkflowTriggerEventBadge from './LabWorkflowTriggerEventBadge.vue';
import { labRecordActionRootAttrs } from '@/shared/constants/lab-record-automation';

const props = defineProps<{
  workflow: LabWorkflowRecord;
  triggerEventType: string;
  catalogEntries: LabDomainEventCatalogEntry[];
  adminMode: boolean;
  ownerLabel?: string;
}>();

const emit = defineEmits<{
  edit: [];
  delete: [];
  'filter-tag': [tag: string];
}>();

const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <article
    class="app-card-grid lab-workflow-list-card"
    :data-lab-record-name="workflow.name"
    :data-workflow-id="workflow.id"
  >
    <header class="app-card-grid__header">
      <div class="app-card-grid__title-row">
        <div class="app-card-grid__identity">
          <div class="app-card-grid__icon" aria-hidden="true">
            <i class="pi pi-share-alt text-base" />
          </div>
          <div class="min-w-0">
            <h3 class="app-card-grid__title">{{ workflow.name }}</h3>
            <div
              v-if="workflow.tags?.length"
              class="app-card-grid__tag-badges"
              :aria-label="`Tags: ${workflow.tags.join(', ')}`"
            >
              <button
                v-for="tag in workflow.tags"
                :key="tag"
                type="button"
                class="lab-app-tag-badge lab-workflow-list-card__tag"
                :aria-label="`Filter workflows by ${tag}`"
                :id="generateUniqueId(`lab-workflow-card-tag-${workflow.id}-${tag}`)"
                @click.stop="emit('filter-tag', tag)"
              >
                {{ tag }}
              </button>
            </div>
          </div>
        </div>
        <p class="app-card-grid__meta-line">
          <span>{{ workflow.enabled ? 'Enabled' : 'Disabled' }}</span>
          <span class="app-card-grid__meta-sep" aria-hidden="true">·</span>
          <span>Priority {{ workflow.priority }}</span>
          <template v-if="adminMode">
            <span class="app-card-grid__meta-sep" aria-hidden="true">·</span>
            <span>{{ workflow.scope }}</span>
            <template v-if="workflow.scope === 'user' && ownerLabel">
              <span class="app-card-grid__meta-sep" aria-hidden="true">·</span>
              <span class="truncate max-w-[8rem]" :title="ownerLabel">{{ ownerLabel }}</span>
            </template>
          </template>
        </p>
      </div>
    </header>

    <p class="app-card-grid__description">
      {{ workflow.description?.trim() || 'No description yet.' }}
    </p>

    <footer class="app-card-grid__footer">
      <div class="lab-workflow-list-card__trigger">
        <LabWorkflowTriggerEventBadge
          :event-type="triggerEventType"
          :catalog-entries="catalogEntries"
        />
      </div>
      <div class="app-card-grid__footer-row">
        <div class="flex items-center gap-2 min-w-0">
          <Button
            :id="generateUniqueId(`lab-workflow-edit-${workflow.id}`)"
            label="Edit"
            icon="pi pi-pencil"
            size="small"
            :pt="{
              root: {
                attrs: labRecordActionRootAttrs('edit', workflow.id, workflow.name),
              },
            }"
            @click="emit('edit')"
          />
          <Button
            :id="generateUniqueId(`lab-workflow-delete-${workflow.id}`)"
            label="Delete"
            icon="pi pi-trash"
            severity="danger"
            text
            size="small"
            :pt="{
              root: {
                attrs: labRecordActionRootAttrs('delete', workflow.id, workflow.name),
              },
            }"
            @click="emit('delete')"
          />
        </div>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.lab-workflow-list-card__tag {
  cursor: pointer;
  border: none;
  font: inherit;
}

.lab-workflow-list-card__tag:hover {
  filter: brightness(1.08);
}

.lab-workflow-list-card__trigger {
  margin-bottom: 0.5rem;
}
</style>