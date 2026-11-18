<script setup lang="ts">
import { computed } from 'vue';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import type { LabRuleConditionV1, LabRuleRecord } from '@/shared/types/lab-rule';
import type { LabDomainEventPayloadFieldDescriptor } from '@/shared/types/lab-domain-event-catalog';
import type { WorkflowCanvasDetailSelection } from '@/shared/types/lab-workflow-canvas-selection';
import type { LabWorkflowStepV1 } from '@/shared/types/lab-workflow';
import {
  labPayloadFieldKindLabel,
  summarizeLabRuleCondition,
} from '@/shared/utils/lab-rule-condition-summary';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { resolveLabDomainEventLabel } from '@/shared/utils/palette-display-text';

const props = defineProps<{
  selection: WorkflowCanvasDetailSelection | null;
  catalogEntries: LabDomainEventCatalogEntry[];
  catalogEntry: LabDomainEventCatalogEntry | null;
  payloadFields: LabDomainEventPayloadFieldDescriptor[];
  workflowConditions: LabRuleConditionV1[];
  ruleRecord: LabRuleRecord | null;
}>();

const { generateUniqueId } = useUniqueElementId();

const panelId = generateUniqueId('wf-canvas-detail-panel');

function formatTriggerEventTypes(eventTypes: string[]): string {
  return eventTypes
    .map((type) => resolveLabDomainEventLabel(type, props.catalogEntries))
    .join(', ');
}

const headerKind = computed(() => {
  if (!props.selection) {
    return 'Details';
  }
  switch (props.selection.kind) {
    case 'event':
      return 'Event';
    case 'rule':
      return 'Rule';
    case 'action':
      return 'Action';
    case 'flow':
      return 'Step';
    default:
      return 'Details';
  }
});

const title = computed(() => {
  const sel = props.selection;
  if (!sel) {
    return '';
  }
  if (sel.kind === 'event') {
    return props.catalogEntry?.label ?? sel.eventType;
  }
  if (sel.kind === 'rule' && props.ruleRecord) {
    return props.ruleRecord.name;
  }
  if (sel.kind === 'action') {
    return sel.label;
  }
  if (sel.kind === 'flow') {
    return sel.step.kind === 'rule_ref' ? 'Evaluate rule' : sel.step.kind.replace(/_/g, ' ');
  }
  return '';
});

function stepSummary(step: LabWorkflowStepV1): string[] {
  const lines: string[] = [];
  switch (step.kind) {
    case 'rule_ref':
      lines.push(`Rule id: ${step.ruleId || '(not set)'}`);
      break;
    case 'notify_users': {
      // Both sources are reported when both are set, because the runner unions them — a summary that
      // printed only one would describe a node that reaches more people than it says.
      const recipients: string[] = [];
      if (step.userIds.length) {
        recipients.push(
          step.userIds.length === 1
            ? `user id ${step.userIds[0]}`
            : `${step.userIds.length} lab users (ids ${step.userIds.join(', ')})`,
        );
      }
      if (step.path?.trim()) {
        recipients.push(`“${step.path}” from the payload (user id or email)`);
      }
      lines.push(`Notify ${recipients.join(' and ') || '(nobody yet)'}`);
      break;
    }
    case 'comms_system_dm_payload_user':
      lines.push(`Messages DM to “${step.path}” (user id or email)`);
      if (step.text) {
        lines.push(`Custom text: ${step.text}`);
      }
      break;
    case 'publish_event':
      lines.push(`Publish ${step.type} from ${step.sourceAppId}`);
      break;
    default:
      break;
  }
  return lines;
}

const flowStepLines = computed(() =>
  props.selection?.kind === 'flow' ? stepSummary(props.selection.step) : [],
);
</script>

<template>
  <aside :id="panelId" class="lab-workflow-canvas-detail h-full min-h-0">
    <div class="lab-workflow-canvas-detail__header">
      <span class="lab-workflow-canvas-detail__kind">{{ headerKind }}</span>
      <span v-if="title" class="lab-workflow-canvas-detail__title">{{ title }}</span>
    </div>

    <div v-if="!selection" class="lab-workflow-canvas-detail__empty text-xs text-lab-general-text-muted">
      Select an event, rule, action, or step on the canvas to see conditions and configuration hints.
    </div>

    <template v-else-if="selection.kind === 'event'">
      <p v-if="catalogEntry?.description" class="m-0 text-xs text-lab-general-text-muted">
        {{ catalogEntry.description }}
      </p>

      <div class="lab-workflow-event-conditions__section mt-2">
        <div class="text-xs font-semibold text-lab-general-text">Payload fields</div>
        <ul v-if="payloadFields.length" class="m-0 mt-1 list-none space-y-1 p-0 text-xs">
          <li
            v-for="field in payloadFields"
            :key="field.path"
            class="rounded px-1 py-0.5 bg-lab-general-bg/50"
          >
            <code class="text-lab-accent">{{ field.path }}</code>
            — {{ field.label }}
            <span class="text-lab-general-text-muted">({{ labPayloadFieldKindLabel(field.valueKind) }})</span>
          </li>
        </ul>
        <p v-else class="m-0 mt-1 text-xs text-lab-general-text-muted">No catalog payload fields.</p>
      </div>

      <div v-if="workflowConditions.length" class="lab-workflow-event-conditions__section mt-2">
        <div class="text-xs font-semibold text-lab-general-text">Workflow conditions</div>
        <ul class="m-0 mt-1 list-disc pl-4 text-xs">
          <li v-for="(c, i) in workflowConditions" :key="`wf-${i}`">{{ summarizeLabRuleCondition(c) }}</li>
        </ul>
      </div>
    </template>

    <template v-else-if="selection.kind === 'rule' || (selection.kind === 'flow' && selection.step.kind === 'rule_ref')">
      <template v-if="ruleRecord">
        <p class="m-0 text-xs text-lab-general-text-muted">
          {{ ruleRecord.scope }} · triggers:
          {{ formatTriggerEventTypes(ruleRecord.definition.trigger.eventTypes) }}
        </p>
        <div class="mt-2 text-xs font-semibold text-lab-general-text">Conditions</div>
        <ul
          v-if="ruleRecord.definition.conditions?.length"
          class="m-0 mt-1 list-disc pl-4 text-xs text-lab-general-text"
        >
          <li v-for="(c, i) in ruleRecord.definition.conditions" :key="`rule-${i}`">
            {{ summarizeLabRuleCondition(c) }}
          </li>
        </ul>
        <p v-else class="m-0 mt-1 text-xs text-lab-general-text-muted">
          No payload conditions — event type and scope only.
        </p>
      </template>
      <p v-else class="m-0 text-xs text-lab-general-text-muted">Rule not found or not saved yet.</p>
    </template>

    <template v-else-if="selection.kind === 'action'">
      <p class="m-0 mt-1 text-xs text-lab-general-text-muted">{{ selection.description }}</p>
      <p class="m-0 mt-2 text-xs text-lab-general-text-muted">
        Drag onto the flow, then configure the step under the card on the canvas.
      </p>
    </template>

    <template v-else-if="selection.kind === 'flow'">
      <ul v-if="flowStepLines.length" class="m-0 mt-1 list-none space-y-1 p-0 text-xs text-lab-general-text">
        <li v-for="(line, i) in flowStepLines" :key="i">{{ line }}</li>
      </ul>
      <p
        v-if="selection.step.kind !== 'rule_ref'"
        class="m-0 mt-2 text-xs text-lab-general-text-muted"
      >
        Edit fields in the step row below this card.
      </p>
    </template>
  </aside>
</template>
