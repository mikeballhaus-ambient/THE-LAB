<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue';
import { DnDProvider } from '@vue-dnd-kit/core';
import type { IDragEvent } from '@vue-dnd-kit/core';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import { getRuleTriggerEventTypes } from '@/shared/utils/lab-rule-trigger';
import LabRuleEventDropZone from './LabRuleEventDropZone.vue';
import LabRuleEventDragCard from './LabRuleEventDragCard.vue';
import type { RuleEventDragBlock } from './rule-event-drag-block';

const props = defineProps<{
  eventTypes: string[];
  catalogEntries: LabDomainEventCatalogEntry[];
}>();

const emit = defineEmits<{
  'update:eventTypes': [eventTypes: string[]];
}>();

const { generateUniqueId } = useUniqueElementId();

const paletteBlocks = shallowRef<RuleEventDragBlock[]>([]);
const triggerBlocks = ref<RuleEventDragBlock[]>([]);

watch(
  () => props.catalogEntries,
  (entries) => {
    paletteBlocks.value = entries.map((entry) => ({
      dragId: `palette-${entry.eventType}`,
      eventType: entry.eventType,
      label: entry.label,
      description: entry.description,
      isPalette: true,
    }));
  },
  { immediate: true, deep: true },
);

function catalogMeta(eventType: string): { label: string; description: string } {
  const entry = props.catalogEntries.find((e) => e.eventType === eventType);
  if (entry) {
    return { label: entry.label, description: entry.description };
  }
  const parts = eventType.split('.');
  const tail = parts[parts.length - 1] ?? eventType;
  return {
    label: tail.replace(/[-_]/g, ' '),
    description: 'Custom or observed event type.',
  };
}

function blocksFromEventTypes(types: string[]): RuleEventDragBlock[] {
  return types.map((eventType) => {
    const meta = catalogMeta(eventType);
    return {
      dragId: `trigger-${eventType}`,
      eventType,
      label: meta.label,
      description: meta.description,
      isPalette: false,
    };
  });
}

function syncEmitFromTriggerBlocks(): void {
  emit('update:eventTypes', triggerBlocks.value.map((b) => b.eventType));
}

watch(
  () => [...props.eventTypes],
  (types) => {
    const current = triggerBlocks.value.map((b) => b.eventType);
    if (types.length === current.length && types.every((t, i) => t === current[i])) {
      return;
    }
    triggerBlocks.value = blocksFromEventTypes(types);
  },
  { immediate: true },
);

function handleDrop(e: IDragEvent): void {
  const srcItems = e.draggedItems[0]?.items as RuleEventDragBlock[] | undefined;
  const dropZoneItems = e.dropZone?.items as RuleEventDragBlock[] | undefined;
  if (!srcItems || !dropZoneItems) {
    return;
  }

  const fromPalette = srcItems === paletteBlocks.value;
  const fromTrigger = srcItems === triggerBlocks.value;
  const toTrigger = dropZoneItems === triggerBlocks.value;

  if (!toTrigger) {
    return;
  }

  if (fromPalette) {
    const r = e.helpers.suggestCopy('vertical');
    if (!r) {
      return;
    }
    const copies = (r.copiedItems as RuleEventDragBlock[]).map((b) => ({
      ...b,
      dragId: `trigger-${b.eventType}-${crypto.randomUUID()}`,
      isPalette: false,
    }));
    const existing = new Set(triggerBlocks.value.map((b) => b.eventType));
    const toInsert = copies.filter((c) => !existing.has(c.eventType));
    if (!toInsert.length) {
      return;
    }
    const base = triggerBlocks.value;
    triggerBlocks.value = [
      ...base.slice(0, r.targetIndex),
      ...toInsert,
      ...base.slice(r.targetIndex),
    ];
    syncEmitFromTriggerBlocks();
    return;
  }

  if (fromTrigger) {
    const r = e.helpers.suggestSort('vertical');
    if (!r) {
      return;
    }
    triggerBlocks.value = r.sourceItems as RuleEventDragBlock[];
    syncEmitFromTriggerBlocks();
  }
}

function removeTrigger(dragId: string): void {
  triggerBlocks.value = triggerBlocks.value.filter((b) => b.dragId !== dragId);
  syncEmitFromTriggerBlocks();
}

const catalogZoneId = generateUniqueId('lab-rule-event-catalog-zone');
const triggerZoneId = generateUniqueId('lab-rule-event-trigger-zone');
</script>

<template>
  <DnDProvider>
    <div class="lab-rules-dnd-columns">
      <div class="lab-rules-dnd-column lab-rules-dnd-column--catalog">
        <div class="lab-rules-dnd-panel">
          <div class="lab-rules-dnd-column__label">
            <span>Catalog</span>
            <span class="lab-rules-dnd-column__hint">Drag → triggers</span>
          </div>
          <LabRuleEventDropZone
            variant="catalog"
            :items="paletteBlocks"
            :id="catalogZoneId"
            @drop="handleDrop"
          >
          <div class="lab-rules-event-list">
            <LabRuleEventDragCard
              v-for="(block, index) in paletteBlocks"
              :key="block.dragId"
              :index="index"
              :items="paletteBlocks"
              :block="block"
              copy-only
            />
            <p v-if="paletteBlocks.length === 0" class="lab-rules-event-empty">
              No events in catalog yet.
            </p>
          </div>
          </LabRuleEventDropZone>
        </div>
      </div>

      <div class="lab-rules-dnd-column lab-rules-dnd-column--canvas" aria-hidden="true">
        <i class="pi pi-arrow-right lab-rules-dnd-arrow" />
      </div>

      <div class="lab-rules-dnd-column lab-rules-dnd-column--triggers">
        <div class="lab-rules-dnd-panel lab-rules-dnd-panel--canvas">
          <div class="lab-rules-dnd-column__label">
            <span>Rule triggers</span>
            <span class="lab-rules-dnd-column__count">
              {{ getRuleTriggerEventTypes({ eventTypes }).length }} selected
            </span>
          </div>
          <LabRuleEventDropZone
            variant="canvas"
            :items="triggerBlocks"
            :id="triggerZoneId"
            @drop="handleDrop"
          >
            <div class="lab-rules-event-list">
              <LabRuleEventDragCard
                v-for="(block, index) in triggerBlocks"
                :key="block.dragId"
                :index="index"
                :items="triggerBlocks"
                :block="block"
                show-remove
                @remove="removeTrigger(block.dragId)"
              />
              <p v-if="triggerBlocks.length === 0" class="lab-rules-event-empty">
                Drop events here. Any one match runs this rule (OR).
              </p>
            </div>
          </LabRuleEventDropZone>
        </div>
      </div>
    </div>
  </DnDProvider>
</template>
