<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import { DnDProvider } from '@vue-dnd-kit/core';
import type { IDragEvent } from '@vue-dnd-kit/core';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { LabWorkflowDefinitionV1, LabWorkflowStepV1 } from '@/shared/types/lab-workflow';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import type { LabRuleRecord } from '@/shared/types/lab-rule';
import type { WorkflowCanvasDetailSelection } from '@/shared/types/lab-workflow-canvas-selection';
import type {
  WorkflowCanvasActionPaletteBlock,
  WorkflowCanvasEventBlock,
  WorkflowCanvasNewRulePaletteBlock,
  WorkflowCanvasRulePaletteBlock,
} from '@/shared/types/lab-workflow-canvas';
import { paletteCardSubtext } from '@/shared/utils/palette-display-text';
import {
  WORKFLOW_ACTION_PALETTE,
  WORKFLOW_NEW_RULE_PALETTE_BLOCK,
  canvasToDefinition,
  flowBlockPendingNewRule,
  mergeFlowWithPendingPlaceholders,
  refreshFlowBlockDisplay,
  flowBlockFromAction,
  flowBlockFromRule,
  triggerBlockFromEventType,
  type WorkflowCanvasFlowBlock,
} from '@/shared/utils/lab-workflow-definition-canvas';
import { ruleRecordCompatibleWithWorkflowTrigger } from '@/shared/utils/lab-workflow-rule-ref';
import { collectRuleConditionPayloadFields } from '@/shared/utils/lab-rule-payload-fields';
import LabRuleEventDropZone from '../lab-rules/LabRuleEventDropZone.vue';
import LabWorkflowCanvasCard from './LabWorkflowCanvasCard.vue';
import LabWorkflowFlowStepEditor from './LabWorkflowFlowStepEditor.vue';
import LabWorkflowQuickRuleDialog from './LabWorkflowQuickRuleDialog.vue';
import LabWorkflowPaletteSection from './LabWorkflowPaletteSection.vue';
import LabWorkflowCanvasDetailPanel from './LabWorkflowCanvasDetailPanel.vue';

const props = defineProps<{
  modelValue: LabWorkflowDefinitionV1;
  catalogEntries: LabDomainEventCatalogEntry[];
  rules: LabRuleRecord[];
  rulesLoading?: boolean;
  labUsers: { label: string; value: number }[];
  adminMode: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: LabWorkflowDefinitionV1];
  'rule-created': [rule: LabRuleRecord];
}>();

const { generateUniqueId } = useUniqueElementId();

const eventPaletteBlocks = shallowRef<WorkflowCanvasEventBlock[]>([]);
const rulePaletteBlocks = shallowRef<WorkflowCanvasRulePaletteBlock[]>([]);
const actionPaletteBlocks = shallowRef<WorkflowCanvasActionPaletteBlock[]>([]);
const newRulePaletteBlocks = shallowRef<WorkflowCanvasNewRulePaletteBlock[]>([
  WORKFLOW_NEW_RULE_PALETTE_BLOCK,
]);

const triggerBlocks = ref<WorkflowCanvasEventBlock[]>([]);
const flowBlocks = ref<WorkflowCanvasFlowBlock[]>([]);

const quickRuleDialogVisible = ref(false);
const quickRuleTargetDragId = ref<string | null>(null);
const canvasSelection = ref<WorkflowCanvasDetailSelection | null>(null);

function selectionMatches(next: WorkflowCanvasDetailSelection): boolean {
  const current = canvasSelection.value;
  if (!current || current.kind !== next.kind) {
    return false;
  }
  if (next.kind === 'event' && current.kind === 'event') {
    return current.eventType === next.eventType;
  }
  if (next.kind === 'rule' && current.kind === 'rule') {
    return current.ruleId === next.ruleId;
  }
  if (next.kind === 'action' && current.kind === 'action') {
    return current.actionKind === next.actionKind;
  }
  if (next.kind === 'flow' && current.kind === 'flow') {
    return current.dragId === next.dragId;
  }
  return false;
}

function setCanvasSelection(next: WorkflowCanvasDetailSelection): void {
  canvasSelection.value = selectionMatches(next) ? null : next;
}

function selectEvent(eventType: string): void {
  setCanvasSelection({ kind: 'event', eventType });
}

function isEventSelected(eventType: string): boolean {
  return canvasSelection.value?.kind === 'event' && canvasSelection.value.eventType === eventType;
}

function selectRulePalette(ruleId: string): void {
  setCanvasSelection({ kind: 'rule', ruleId });
}

function isRulePaletteSelected(ruleId: string): boolean {
  return canvasSelection.value?.kind === 'rule' && canvasSelection.value.ruleId === ruleId;
}

function selectActionPalette(block: WorkflowCanvasActionPaletteBlock): void {
  setCanvasSelection({
    kind: 'action',
    actionKind: block.kind,
    label: block.label,
    description: block.description,
  });
}

function isActionPaletteSelected(kind: WorkflowCanvasActionPaletteBlock['kind']): boolean {
  return canvasSelection.value?.kind === 'action' && canvasSelection.value.actionKind === kind;
}

function selectFlowBlock(block: WorkflowCanvasFlowBlock): void {
  setCanvasSelection({ kind: 'flow', dragId: block.dragId, step: block.step });
}

function isFlowSelected(dragId: string): boolean {
  return canvasSelection.value?.kind === 'flow' && canvasSelection.value.dragId === dragId;
}

watch(
  () => props.catalogEntries,
  (entries) => {
    const list = Array.isArray(entries) ? entries : [];
    eventPaletteBlocks.value = list.map((entry) => ({
      dragId: `wf-palette-event-${entry.eventType}`,
      eventType: entry.eventType,
      label: entry.label,
      description: entry.description,
      isPalette: true,
    }));
  },
  { immediate: true, deep: true },
);

watch(
  () => [props.rules, triggerBlocks.value[0]?.eventType] as const,
  ([rules, eventType]) => {
    const trigger = eventType ?? props.modelValue.trigger.eventType;
    rulePaletteBlocks.value = rules
      .filter((rule) => ruleRecordCompatibleWithWorkflowTrigger(rule, trigger))
      .map((rule) => ({
        dragId: `wf-palette-rule-${rule.id}`,
        ruleId: rule.id,
        label: rule.name,
        description: `${rule.scope} · library rule`,
        isPalette: true,
      }));
  },
  { immediate: true, deep: true },
);

watch(
  () => WORKFLOW_ACTION_PALETTE,
  () => {
    actionPaletteBlocks.value = WORKFLOW_ACTION_PALETTE.map((action) => ({
      dragId: `wf-palette-action-${action.kind}`,
      kind: action.kind,
      label: action.label,
      description: action.description,
      isPalette: true,
    }));
  },
  { immediate: true },
);

let syncingFromParent = false;

function rebuildFlowFromDefinition(def: LabWorkflowDefinitionV1): void {
  const pending = flowBlocks.value.filter((block) => block.pendingQuickRule);
  flowBlocks.value = mergeFlowWithPendingPlaceholders(def, props.rules, pending);
}

watch(
  () => props.modelValue,
  (def) => {
    syncingFromParent = true;
    triggerBlocks.value = def.trigger.eventType
      ? [triggerBlockFromEventType(def.trigger.eventType, props.catalogEntries)]
      : [];
    rebuildFlowFromDefinition(def);
    syncingFromParent = false;
  },
  { immediate: true, deep: true },
);

function syncToParent(): void {
  if (syncingFromParent) {
    return;
  }
  emit(
    'update:modelValue',
    canvasToDefinition(
      triggerBlocks.value[0] ?? null,
      flowBlocks.value,
      props.modelValue.trigger.eventType,
    ),
  );
}

watch([triggerBlocks, flowBlocks], () => syncToParent(), { deep: true });

watch(
  () => triggerBlocks.value[0]?.eventType,
  (eventType) => {
    if (eventType) {
      canvasSelection.value = { kind: 'event', eventType };
    } else if (canvasSelection.value?.kind === 'event') {
      canvasSelection.value = null;
    }
  },
);

watch(
  () => props.rules,
  () => {
    flowBlocks.value = flowBlocks.value.map((b) =>
      b.pendingQuickRule ? b : refreshFlowBlockDisplay(b, props.rules),
    );
  },
  { deep: true },
);

function openQuickRuleDialog(dragId: string): void {
  quickRuleTargetDragId.value = dragId;
  quickRuleDialogVisible.value = true;
}

function onQuickRuleCreated(rule: LabRuleRecord): void {
  const idx = flowBlocks.value.findIndex((b) => b.dragId === quickRuleTargetDragId.value);
  if (idx >= 0) {
    const next = [...flowBlocks.value];
    next[idx] = flowBlockFromRule(rule);
    flowBlocks.value = next;
  }
  quickRuleTargetDragId.value = null;
  emit('rule-created', rule);
}

function onQuickRuleCancel(): void {
  if (!quickRuleTargetDragId.value) {
    return;
  }
  removeFlow(quickRuleTargetDragId.value);
  quickRuleTargetDragId.value = null;
}

const triggerEventType = computed(
  () => triggerBlocks.value[0]?.eventType ?? props.modelValue.trigger.eventType,
);

const payloadPathOptions = computed(() => {
  const types = triggerEventType.value ? [triggerEventType.value] : [];
  return collectRuleConditionPayloadFields(types, props.catalogEntries)
    .filter((f) => f.valueKind === 'userId')
    .map((f) => ({ label: f.label, value: f.path }));
});

const detailEventType = computed(() =>
  canvasSelection.value?.kind === 'event' ? canvasSelection.value.eventType : null,
);

const selectedCatalogEntry = computed(() => {
  const type = detailEventType.value;
  if (!type) {
    return null;
  }
  return props.catalogEntries.find((e) => e.eventType === type) ?? null;
});

const selectedEventPayloadFields = computed(() => {
  if (!detailEventType.value) {
    return [];
  }
  return collectRuleConditionPayloadFields([detailEventType.value], props.catalogEntries);
});

const workflowConditionsForPanel = computed(() => {
  if (!detailEventType.value || detailEventType.value !== triggerEventType.value) {
    return [];
  }
  return props.modelValue.conditions ?? [];
});

const detailRuleRecord = computed((): LabRuleRecord | null => {
  const sel = canvasSelection.value;
  let ruleId: string | null = null;
  if (sel?.kind === 'rule') {
    ruleId = sel.ruleId;
  } else if (sel?.kind === 'flow' && sel.step.kind === 'rule_ref') {
    ruleId = sel.step.ruleId;
  }
  if (!ruleId) {
    return null;
  }
  return props.rules.find((r) => r.id === ruleId) ?? null;
});

const ruleSelectOptions = computed(() =>
  props.rules
    .filter((r) => ruleRecordCompatibleWithWorkflowTrigger(r, triggerEventType.value))
    .map((r) => ({ label: `${r.name} (${r.scope})`, value: r.id })),
);

function flowIcon(step: LabWorkflowStepV1): string {
  switch (step.kind) {
    case 'rule_ref':
      return 'pi pi-filter';
    case 'notify_users':
      return 'pi pi-bell';
    case 'comms_system_dm_payload_user':
      return 'pi pi-comments';
    case 'publish_event':
      return 'pi pi-share-alt';
    case 'virtual_bank_get_wallet':
    case 'virtual_bank_credit_daily_allotment':
      return 'pi pi-wallet';
    case 'show_user_toast':
      return 'pi pi-comment';
    default:
      return 'pi pi-cog';
  }
}

function updateFlowBlock(index: number, step: LabWorkflowStepV1): void {
  const next = [...flowBlocks.value];
  const block = next[index];
  if (!block) {
    return;
  }
  next[index] = refreshFlowBlockDisplay({ ...block, step }, props.rules);
  flowBlocks.value = next;
  if (canvasSelection.value?.kind === 'flow' && canvasSelection.value.dragId === block.dragId) {
    canvasSelection.value = { kind: 'flow', dragId: block.dragId, step };
  }
}

function removeFlow(dragId: string): void {
  flowBlocks.value = flowBlocks.value.filter((b) => b.dragId !== dragId);
}

function removeTrigger(): void {
  triggerBlocks.value = [];
}

function handleTriggerDrop(e: IDragEvent): void {
  const srcItems = e.draggedItems[0]?.items as WorkflowCanvasEventBlock[] | undefined;
  const dropItems = e.dropZone?.items as WorkflowCanvasEventBlock[] | undefined;
  if (!srcItems || dropItems !== triggerBlocks.value) {
    return;
  }
  if (srcItems !== eventPaletteBlocks.value) {
    return;
  }
  const r = e.helpers.suggestCopy('vertical');
  if (!r) {
    return;
  }
  const copy = (r.copiedItems as WorkflowCanvasEventBlock[])[0];
  if (!copy) {
    return;
  }
  triggerBlocks.value = [
    {
      ...copy,
      dragId: `wf-trigger-${copy.eventType}-${crypto.randomUUID()}`,
      isPalette: false,
    },
  ];
}

function handleFlowDrop(e: IDragEvent): void {
  const srcItems = e.draggedItems[0]?.items;
  const dropItems = e.dropZone?.items;
  if (!srcItems || dropItems !== flowBlocks.value) {
    return;
  }

  const defaultUserId = props.labUsers[0]?.value;

  if (srcItems === eventPaletteBlocks.value) {
    return;
  }

  if (srcItems === newRulePaletteBlocks.value) {
    const r = e.helpers.suggestCopy('vertical');
    if (!r) {
      return;
    }
    const placeholder = flowBlockPendingNewRule(r.targetIndex);
    const base = flowBlocks.value;
    flowBlocks.value = [...base.slice(0, r.targetIndex), placeholder, ...base.slice(r.targetIndex)];
    openQuickRuleDialog(placeholder.dragId);
    return;
  }

  if (srcItems === rulePaletteBlocks.value) {
    const r = e.helpers.suggestCopy('vertical');
    if (!r) {
      return;
    }
    const copy = (r.copiedItems as WorkflowCanvasRulePaletteBlock[])[0];
    if (!copy) {
      return;
    }
    const rule = props.rules.find((item) => item.id === copy.ruleId);
    if (!rule) {
      return;
    }
    const block = flowBlockFromRule(rule);
    const base = flowBlocks.value;
    flowBlocks.value = [...base.slice(0, r.targetIndex), block, ...base.slice(r.targetIndex)];
    return;
  }

  if (srcItems === actionPaletteBlocks.value) {
    const r = e.helpers.suggestCopy('vertical');
    if (!r) {
      return;
    }
    const copy = (r.copiedItems as WorkflowCanvasActionPaletteBlock[])[0];
    if (!copy) {
      return;
    }
    const block = flowBlockFromAction(copy.kind, triggerEventType.value, defaultUserId);
    const base = flowBlocks.value;
    flowBlocks.value = [...base.slice(0, r.targetIndex), block, ...base.slice(r.targetIndex)];
    return;
  }

  if (srcItems === flowBlocks.value) {
    const r = e.helpers.suggestSort('vertical');
    if (!r) {
      return;
    }
    flowBlocks.value = r.sourceItems as WorkflowCanvasFlowBlock[];
  }
}

const paletteZoneId = generateUniqueId('wf-canvas-palette');
const triggerZoneId = generateUniqueId('wf-canvas-trigger');
const flowZoneId = generateUniqueId('wf-canvas-flow');
</script>

<template>
  <DnDProvider>
    <div class="lab-workflow-canvas lab-rules-dnd-columns">
      <div class="lab-rules-dnd-column lab-workflow-canvas__palette">
        <div class="lab-rules-dnd-panel lab-workflow-canvas__palette-panel">
          <div class="lab-rules-dnd-column__label lab-workflow-canvas__palette-label">
            <span>Palette</span>
          </div>

          <LabWorkflowPaletteSection title="Events" :count="eventPaletteBlocks.length">
            <LabRuleEventDropZone variant="catalog" :items="eventPaletteBlocks" :id="paletteZoneId">
              <div class="lab-rules-event-list lab-workflow-canvas__palette-list">
                <LabWorkflowCanvasCard
                  v-for="(block, index) in eventPaletteBlocks"
                  :key="block.dragId"
                  :index="index"
                  :items="eventPaletteBlocks"
                  :drag-id="block.dragId"
                  :title="block.label"
                  :hint="paletteCardSubtext(block.label, block.description)"
                  icon="pi pi-bolt"
                  tone="event"
                  copy-only
                  selectable
                  :selected="isEventSelected(block.eventType)"
                  @select="selectEvent(block.eventType)"
                />
              </div>
            </LabRuleEventDropZone>
          </LabWorkflowPaletteSection>

          <LabWorkflowPaletteSection
            title="Rules"
            :count="rulePaletteBlocks.length + newRulePaletteBlocks.length"
          >
            <p v-if="rulesLoading" class="lab-rules-event-empty">Loading…</p>
            <div class="lab-rules-event-list lab-workflow-canvas__palette-list mb-1">
              <LabWorkflowCanvasCard
                v-for="(block, index) in newRulePaletteBlocks"
                :key="block.dragId"
                :index="index"
                :items="newRulePaletteBlocks"
                :drag-id="block.dragId"
                :title="block.label"
                :hint="paletteCardSubtext(block.label, block.description)"
                icon="pi pi-plus-circle"
                tone="rule"
                copy-only
              />
            </div>
            <p v-if="!rulePaletteBlocks.length" class="lab-rules-event-empty">
              Set a trigger event first.
            </p>
            <div v-else class="lab-rules-event-list lab-workflow-canvas__palette-list">
              <LabWorkflowCanvasCard
                v-for="(block, index) in rulePaletteBlocks"
                :key="block.dragId"
                :index="index"
                :items="rulePaletteBlocks"
                :drag-id="block.dragId"
                :title="block.label"
                :hint="paletteCardSubtext(block.label, block.description)"
                icon="pi pi-filter"
                tone="rule"
                copy-only
                selectable
                :selected="isRulePaletteSelected(block.ruleId)"
                @select="selectRulePalette(block.ruleId)"
              />
            </div>
          </LabWorkflowPaletteSection>

          <LabWorkflowPaletteSection title="Actions" :count="actionPaletteBlocks.length">
            <div class="lab-rules-event-list lab-workflow-canvas__palette-list">
              <LabWorkflowCanvasCard
                v-for="(block, index) in actionPaletteBlocks"
                :key="block.dragId"
                :index="index"
                :items="actionPaletteBlocks"
                :drag-id="block.dragId"
                :title="block.label"
                :hint="paletteCardSubtext(block.label, block.description)"
                icon="pi pi-play"
                tone="action"
                copy-only
                selectable
                :selected="isActionPaletteSelected(block.kind)"
                @select="selectActionPalette(block)"
              />
            </div>
          </LabWorkflowPaletteSection>
        </div>
      </div>

      <div class="lab-rules-dnd-column lab-rules-dnd-column--canvas" aria-hidden="true">
        <i class="pi pi-arrow-right lab-rules-dnd-arrow" />
      </div>

      <div class="lab-rules-dnd-column lab-workflow-canvas__stage">
        <div class="lab-rules-dnd-panel lab-rules-dnd-panel--canvas lab-workflow-canvas__stage-panel">
          <div class="lab-rules-dnd-column__label lab-workflow-canvas__stage-label">
            <span>Canvas</span>
          </div>

          <div class="lab-workflow-canvas__stage-layout">
            <div class="lab-workflow-canvas__stage-main">
          <div class="lab-workflow-canvas__trigger">
            <div class="lab-workflow-canvas__zone-label">When — event</div>
            <LabRuleEventDropZone
              variant="canvas"
              :items="triggerBlocks"
              :id="triggerZoneId"
              @drop="handleTriggerDrop"
            >
              <div class="lab-rules-event-list">
                <LabWorkflowCanvasCard
                  v-for="(block, index) in triggerBlocks"
                  :key="block.dragId"
                  :index="index"
                  :items="triggerBlocks"
                  :drag-id="block.dragId"
                  :title="block.label"
                  :hint="paletteCardSubtext(block.label, block.description)"
                  icon="pi pi-bolt"
                  tone="event"
                  show-remove
                  selectable
                  :selected="isEventSelected(block.eventType)"
                  @select="selectEvent(block.eventType)"
                  @remove="removeTrigger"
                />
                <p v-if="!triggerBlocks.length" class="lab-rules-event-empty">
                  Drop one catalog event here (workflow trigger).
                </p>
              </div>
            </LabRuleEventDropZone>
          </div>

          <div class="lab-workflow-canvas__flow-connector" aria-hidden="true">
            <i class="pi pi-arrow-down" />
          </div>

          <div class="lab-workflow-canvas__flow">
            <div class="lab-workflow-canvas__zone-label">Then — rules &amp; actions (in order)</div>
            <LabRuleEventDropZone
              variant="canvas"
              :items="flowBlocks"
              :id="flowZoneId"
              @drop="handleFlowDrop"
            >
              <div class="lab-rules-event-list">
                <div
                  v-for="(block, index) in flowBlocks"
                  :key="block.dragId"
                  class="lab-workflow-canvas__flow-item"
                  :class="{ 'lab-workflow-canvas__flow-item--selected': isFlowSelected(block.dragId) }"
                >
                  <LabWorkflowCanvasCard
                    :index="index"
                    :items="flowBlocks"
                    :drag-id="block.dragId"
                    :title="block.displayLabel"
                    :hint="paletteCardSubtext(block.displayLabel, block.displayHint)"
                    :icon="flowIcon(block.step)"
                    tone="flow"
                    show-remove
                    selectable
                    :selected="isFlowSelected(block.dragId)"
                    @select="selectFlowBlock(block)"
                    @remove="removeFlow(block.dragId)"
                  />
                  <div
                    v-if="block.pendingQuickRule"
                    class="lab-workflow-canvas__pending-rule px-2 pb-2"
                  >
                    <Button
                      :id="generateUniqueId(`wf-create-rule-${block.dragId}`)"
                      label="Create & save rule"
                      icon="pi pi-pencil"
                      size="small"
                      outlined
                      @click="openQuickRuleDialog(block.dragId)"
                    />
                  </div>
                  <LabWorkflowFlowStepEditor
                    v-else
                    :step="block.step"
                    :block-key="block.dragId"
                    :rule-options="ruleSelectOptions"
                    :user-options="labUsers"
                    :payload-path-options="payloadPathOptions"
                    :rules-loading="rulesLoading"
                    @update:step="(step) => updateFlowBlock(index, step)"
                  />
                </div>
                <p v-if="!flowBlocks.length" class="lab-rules-event-empty">
                  Drop rules and actions from the palette. rule_ref stops the flow when the rule
                  does not match.
                </p>
              </div>
            </LabRuleEventDropZone>
          </div>
            </div>

            <LabWorkflowCanvasDetailPanel
              :selection="canvasSelection"
              :catalog-entries="catalogEntries"
              :catalog-entry="selectedCatalogEntry"
              :payload-fields="selectedEventPayloadFields"
              :workflow-conditions="workflowConditionsForPanel"
              :rule-record="detailRuleRecord"
            />
          </div>
        </div>
      </div>
    </div>

    <LabWorkflowQuickRuleDialog
      :visible="quickRuleDialogVisible"
      :workflow-trigger-event-type="triggerEventType"
      :catalog-entries="catalogEntries"
      :admin-mode="adminMode"
      @update:visible="(v) => (quickRuleDialogVisible = v)"
      @created="onQuickRuleCreated"
      @cancel="onQuickRuleCancel"
    />
  </DnDProvider>
</template>
