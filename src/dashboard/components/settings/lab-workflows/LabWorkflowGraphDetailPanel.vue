<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Checkbox from 'primevue/checkbox';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import type { LabIntegrationServiceCatalogResponse } from '@/shared/types/lab-integration-service-catalog';
import { listIntegrationWriteServices } from '@/shared/utils/lab-integration-write-services';
import type { LabRuleConditionV1, LabRuleRecord } from '@/shared/types/lab-rule';
import type { LabWorkflowDefinitionV2, LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import {
  collectWorkflowPayloadMappingFields,
  hasDynamicPayload,
} from '@/shared/utils/lab-rule-payload-fields';
import LabWorkflowTriggerMappingPanel from './LabWorkflowTriggerMappingPanel.vue';
import {
  LAB_WORKFLOW_EDGE_WHEN_OPTIONS,
  labWorkflowOutgoingBranchLabel,
  resolveIfOutgoingBranchLabels,
} from '@/shared/utils/lab-workflow-graph-edge';
import { labWorkflowNodeHasBranchOutputs } from '@/shared/utils/lab-workflow-graph-branch-handles';
import {
  labWorkflowRuleNodeIsWired,
  labWorkflowRuleNodeNeedsConfiguration,
} from '@/shared/utils/lab-workflow-graph-rule-node';
import { labWorkflowRuleNodeIsConfigured } from '@/shared/utils/lab-workflow-graph-rule-record';
import type { LabWorkflowEdgeWhen } from '@/shared/types/lab-workflow-graph';
import LabWorkflowFlowStepEditor from './LabWorkflowFlowStepEditor.vue';
import LabWorkflowGraphRuleSetupPanel from './LabWorkflowGraphRuleSetupPanel.vue';
import LabWorkflowTriggerScheduleSection from './LabWorkflowTriggerScheduleSection.vue';
import type { LabWorkflowSchedule } from '@/shared/types/lab-workflow-schedule';
import { formInputTextPt, formSelectPt, withFormControlRootId } from '@/shared/forms/form-control-pt';
import { fetchLabWorkflowMockSamples } from '@/shared/services/platform-lab-workflows.client';
import {
  capturedPayloadFieldPaths,
  latestWorkflowItemPayloadFieldsFromSamples,
  type CapturedPayloadField,
} from '@/shared/utils/lab-workflow-captured-payload-fields';
import type { LabWorkflowGraphSelection } from '@/shared/types/lab-workflow-graph-selection';
import {
  labWorkflowGraphNodeKindDisplay,
  labWorkflowGraphNodeLabel,
} from '@/shared/utils/lab-workflow-graph-labels';
import { labWorkflowActionStepCanvasLabels } from '@/shared/utils/lab-workflow-definition-canvas';
import LabWorkflowPayloadConditionFields from './LabWorkflowPayloadConditionFields.vue';
import LabWorkflowGraphDetailNextSteps from './LabWorkflowGraphDetailNextSteps.vue';
import {
  labWorkflowGraphGroupMemberNodes,
  labWorkflowGraphGroupNodes,
} from '@/shared/utils/lab-workflow-graph-group';
import { normalizeWorkflowGroupNode } from '@/shared/utils/lab-workflow-graph-group-normalize';
import {
  LAB_WORKFLOW_ACTION_GROUP_EXECUTION_OPTIONS,
  LAB_WORKFLOW_ACTION_GROUP_FAILURE_OPTIONS,
  LAB_WORKFLOW_RULE_GROUP_COMBINE_OPTIONS,
} from '@/shared/types/lab-workflow-graph-group';
import { formCheckboxPt } from '@/shared/forms/form-control-pt';

const props = defineProps<{
  definition: LabWorkflowDefinitionV2;
  selection: LabWorkflowGraphSelection;
  catalogEntries: LabDomainEventCatalogEntry[];
  integrationServiceCatalog?: LabIntegrationServiceCatalogResponse | null;
  rules: LabRuleRecord[];
  rulesLoading?: boolean;
  labUsers: { label: string; value: number }[];
  adminMode: boolean;
  /** Runtime schedule rows for this workflow (phase 34). Empty when it has none. */
  schedules?: LabWorkflowSchedule[];
  /** True while the schedules read route is in flight. */
  schedulesLoading?: boolean;
  /**
   * The persisted workflow, needed by the webhook mapping panel (phase 37): hooks are keyed by
   * workflow id, and an unsaved draft has none — the panel says so rather than creating an orphan row.
   */
  workflowId?: string | null;
}>();

const emit = defineEmits<{
  'update:node': [node: LabWorkflowGraphNodeV2];
  'update:edge': [edge: LabWorkflowDefinitionV2['edges'][number]];
  'delete:node': [nodeId: string];
  'delete:edge': [edgeId: string];
}>();

const { generateUniqueId } = useUniqueElementId();

const selectedNode = computed(() => {
  const selection = props.selection;
  if (!selection || selection.kind !== 'node') {
    return null;
  }
  return props.definition.nodes.find((n) => n.id === selection.nodeId) ?? null;
});

const selectedEdge = computed(() => {
  const selection = props.selection;
  if (!selection || selection.kind !== 'edge') {
    return null;
  }
  return props.definition.edges.find((e) => e.id === selection.edgeId) ?? null;
});

const workflowTriggerNode = computed(() =>
  props.definition.nodes.find((n) => n.kind === 'trigger') ?? null,
);

const triggerEventType = computed(() =>
  workflowTriggerNode.value?.kind === 'trigger' ? workflowTriggerNode.value.eventType : '',
);

/**
 * Whether the selected trigger's payload shape comes from the caller (phase 37).
 *
 * Drives whether the Output mapping section renders at all: a declared event has its fields in the
 * catalog and needs no discovery, so showing the panel would be noise.
 */
const isDynamicPayloadTrigger = computed(() => {
  const node = selectedNode.value;
  if (!node || node.kind !== 'trigger') {
    return false;
  }
  return hasDynamicPayload([node.eventType], props.catalogEntries);
});

const payloadPathOptions = computed(() => {
  const base = collectWorkflowPayloadMappingFields(
    triggerEventType.value ? [triggerEventType.value] : [],
    props.catalogEntries,
    capturedPayloadFieldPaths(capturedPayloadFields.value),
  ).map((field) => ({
    label: field.label,
    value: field.path,
  }));
  return base.length ? base : [{ label: 'Custom path…', value: '__path_custom__' }];
});

/**
 * Fields from the most recent captured payload — code completion, conditions, and integration mapping.
 *
 * A dynamic-payload trigger has **no catalog fields** — the caller decides the body — so the only
 * truthful source is a payload that actually arrived. Loaded from the workflow's saved samples rather
 * than passed down, because captures change while the panel is open (a Listen session in the other
 * tab appends one), and a stale list would offer fields that no longer match the code being written.
 */
const capturedPayloadFields = ref<CapturedPayloadField[]>([]);

async function loadCapturedPayloadFields(): Promise<void> {
  if (!props.workflowId) {
    capturedPayloadFields.value = [];
    return;
  }
  try {
    const samples = await fetchLabWorkflowMockSamples(props.workflowId);
    const triggerId =
      workflowTriggerNode.value?.kind === 'trigger' ? workflowTriggerNode.value.id : null;
    const scoped = triggerId
      ? samples.filter((sample) => sample.triggerNodeId === triggerId)
      : samples;
    const mapping =
      workflowTriggerNode.value?.kind === 'trigger' ? workflowTriggerNode.value.mapping : undefined;
    capturedPayloadFields.value = latestWorkflowItemPayloadFieldsFromSamples(scoped, mapping);
  } catch {
    // Completion is an aid; a failed load must not break the panel.
    capturedPayloadFields.value = [];
  }
}

onMounted(loadCapturedPayloadFields);
watch(() => props.workflowId, loadCapturedPayloadFields);
// Re-read when the selection changes so a Listen capture in the run panel is visible here.
watch(
  () => props.selection,
  () => {
    void loadCapturedPayloadFields();
  },
  { deep: true },
);
watch(
  () =>
    workflowTriggerNode.value?.kind === 'trigger' ? workflowTriggerNode.value.mapping : undefined,
  () => {
    void loadCapturedPayloadFields();
  },
  { deep: true },
);

const labUserOptions = computed(() =>
  props.labUsers.map((user) => ({ label: user.label, value: String(user.value) })),
);

const connectorServices = computed(() => listIntegrationWriteServices(props.integrationServiceCatalog));

const eventOptions = computed(() =>
  props.catalogEntries.map((entry) => ({
    // A declared event with no publisher yet must look different from a live one: selecting it
    // produces a valid workflow that never fires, and nothing else in this panel would say so.
    label: entry.label,
    value: entry.eventType,
  })),
);

const ruleOptions = computed(() =>
  props.rules.map((rule) => ({ label: rule.name, value: rule.id })),
);

const actionGroupOptions = computed(() =>
  labWorkflowGraphGroupNodes(props.definition, 'actions').map((group) => ({
    label: group.kind === 'group' ? group.label : 'Group',
    value: group.id,
  })),
);

const ruleGroupOptions = computed(() =>
  labWorkflowGraphGroupNodes(props.definition, 'rules').map((group) => ({
    label: group.kind === 'group' ? group.label : 'Group',
    value: group.id,
  })),
);

const selectedGroupConfig = computed(() => {
  const node = selectedNode.value;
  if (!node || node.kind !== 'group') {
    return null;
  }
  return normalizeWorkflowGroupNode(node);
});

/**
 * Members of the selected group, each with its **node type**.
 *
 * The label alone is not an identity: two notify nodes in one group both read "Uses `userId` from the
 * event payload", so a list of bare labels told the author how many members there were but not which
 * one was which — and offered nothing to click. The kind row is the same string the canvas card
 * prints, so the panel and the graph agree on what a member *is*.
 */
const selectedGroupMembers = computed(() => {
  const node = selectedNode.value;
  const config = selectedGroupConfig.value;
  if (!node || node.kind !== 'group' || !config) {
    return [];
  }
  const memberKind = config.groupType === 'rules' ? 'rule' : 'action';
  const labelOptions = {
    catalogEntries: props.catalogEntries,
    rules: props.rules,
    integrationServiceCatalog: props.integrationServiceCatalog,
  };
  return labWorkflowGraphGroupMemberNodes(props.definition, node.id, memberKind).map((member) => {
    const label = labWorkflowGraphNodeLabel(member, labelOptions);
    const kindLabel = labWorkflowGraphNodeKindDisplay(member, labelOptions);
    return {
      id: member.id,
      kindLabel,
      label,
      // Suppress a duplicate when the kind is already the whole story ("Rule" node with no name).
      showLabel: label.trim().length > 0 && label.trim().toLowerCase() !== kindLabel.trim().toLowerCase(),
    };
  });
});

const edgeSourceIsRuleGroup = computed(() => {
  const edge = selectedEdge.value;
  if (!edge) {
    return false;
  }
  const source = props.definition.nodes.find((n) => n.id === edge.source);
  if (source?.kind !== 'group') {
    return false;
  }
  return normalizeWorkflowGroupNode(source).groupType === 'rules';
});

const edgeSourceNode = computed(() => {
  const edge = selectedEdge.value;
  if (!edge) {
    return null;
  }
  return props.definition.nodes.find((n) => n.id === edge.source) ?? null;
});

const edgeSourceKind = computed(() => edgeSourceNode.value?.kind ?? null);

/** True when the source is an IF action — its branch is a port, so `always` is not a valid route. */
const edgeSourceIsIfAction = computed(() => {
  const source = edgeSourceNode.value;
  return source?.kind === 'action' && source.step.kind === 'if_condition';
});

/**
 * True when the source is a Loop action. Both exits are `always` and the **port** decides which runs,
 * so the `when` dropdown has nothing meaningful to offer and is hidden in the template.
 */
const edgeSourceIsLoopAction = computed(() => {
  const source = edgeSourceNode.value;
  return source?.kind === 'action' && source.step.kind === 'loop';
});

const edgeWhenOptions = computed(() => {
  if (edgeSourceIsLoopAction.value) {
    return LAB_WORKFLOW_EDGE_WHEN_OPTIONS.filter((o) => o.value === 'always');
  }
  // An IF action emits exactly one of two ports. Offering "Always" here was worse than unhelpful:
  // an `always` edge carries no port, and `edgeOutputAllows` refuses a port-less edge on a branching
  // node — so choosing it silently stopped the branch from ever running.
  if (edgeSourceIsIfAction.value) {
    return LAB_WORKFLOW_EDGE_WHEN_OPTIONS.filter(
      (o) => o.value === 'on_true' || o.value === 'on_false',
    );
  }
  const kind = edgeSourceKind.value;
  if (kind === 'condition') {
    return LAB_WORKFLOW_EDGE_WHEN_OPTIONS.filter(
      (o) => o.value === 'on_true' || o.value === 'on_false' || o.value === 'always',
    );
  }
  if (kind === 'rule' || edgeSourceIsRuleGroup.value) {
    return LAB_WORKFLOW_EDGE_WHEN_OPTIONS.filter(
      (o) => o.value === 'on_match' || o.value === 'on_no_match' || o.value === 'always',
    );
  }
  return LAB_WORKFLOW_EDGE_WHEN_OPTIONS.filter((o) => o.value === 'always');
});

const selectedRuleWired = computed(() => {
  const node = selectedNode.value;
  if (!node || node.kind !== 'rule') {
    return false;
  }
  return labWorkflowRuleNodeIsWired(props.definition, node.id);
});

const selectedRuleNeedsSetup = computed(() => {
  const node = selectedNode.value;
  if (!node || node.kind !== 'rule') {
    return false;
  }
  return labWorkflowRuleNodeNeedsConfiguration(props.definition, node);
});

function patchEdge(patch: Partial<LabWorkflowDefinitionV2['edges'][number]>): void {
  const edge = selectedEdge.value;
  if (!edge) {
    return;
  }
  emit('update:edge', { ...edge, ...patch });
}

function onEdgeWhenChange(when: LabWorkflowEdgeWhen): void {
  patchEdge({ when });
}

function onEdgeLabelChange(label: string): void {
  const trimmed = label.trim();
  patchEdge({ label: trimmed || undefined });
}

function patchNode(next: LabWorkflowGraphNodeV2): void {
  emit('update:node', next);
}

function patchSelectedNode(patch: Partial<LabWorkflowGraphNodeV2>): void {
  const node = selectedNode.value;
  if (!node) {
    return;
  }
  patchNode({ ...node, ...patch } as LabWorkflowGraphNodeV2);
}

function onGraphConditionListUpdate(conditions: LabRuleConditionV1[]): void {
  const node = selectedNode.value;
  if (!node || node.kind !== 'condition') {
    return;
  }
  patchNode({ ...node, conditions });
}

function nodeSummary(nodeId: string): string {
  const node = props.definition.nodes.find((n) => n.id === nodeId);
  if (!node) {
    return 'Unknown node';
  }
  return labWorkflowGraphNodeLabel(node, {
    catalogEntries: props.catalogEntries,
    rules: props.rules,
    integrationServiceCatalog: props.integrationServiceCatalog,
  });
}

const edgeSourceSummary = computed(() => {
  const edge = selectedEdge.value;
  if (!edge) {
    return '';
  }
  return nodeSummary(edge.source);
});

const edgeTargetSummary = computed(() => {
  const edge = selectedEdge.value;
  if (!edge) {
    return '';
  }
  return nodeSummary(edge.target);
});

/** Runtime schedule row for the selected trigger, so the panel can show next / last run. */
const selectedTriggerSchedule = computed(() => {
  const node = selectedNode.value;
  if (!node || node.kind !== 'trigger') {
    return null;
  }
  return props.schedules?.find((row) => row.triggerNodeId === node.id) ?? null;
});

const selectedNodeHeaderTitle = computed(() => {
  const node = selectedNode.value;
  if (!node) {
    return '';
  }
  switch (node.kind) {
    case 'trigger':
      return 'Trigger';
    case 'condition':
      return 'Condition';
    case 'rule':
      return node.name?.trim() ? `Rule: ${node.name.trim()}` : 'Rule';
    case 'group':
      return node.label?.trim() || (node.groupType === 'rules' ? 'Rule group' : 'Action group');
    case 'action':
      return labWorkflowActionStepCanvasLabels(node.step, props.rules).title;
    default:
      return 'Node';
  }
});

const selectedNodeHeaderLead = computed(() => {
  const node = selectedNode.value;
  if (!node || node.kind !== 'action') {
    return '';
  }
  return labWorkflowActionStepCanvasLabels(node.step, props.rules).subtitle;
});

const selectedActionNode = computed(() => {
  const node = selectedNode.value;
  return node?.kind === 'action' ? node : null;
});

const selectedIfActionStep = computed(() => {
  const node = selectedActionNode.value;
  if (node?.step.kind === 'if_condition') {
    return node.step;
  }
  return null;
});

function patchIfActionStep(
  patch: Partial<{ conditions: LabRuleConditionV1[]; combine?: 'all' | 'any' }>,
): void {
  const node = selectedNode.value;
  if (node?.kind !== 'action' || node.step.kind !== 'if_condition') {
    return;
  }
  patchSelectedNode({
    kind: 'action',
    step: { ...node.step, ...patch },
  });
}

/**
 * Whether this node's outgoing links should be named by their output.
 *
 * Every multi-output node earns a label: an IF has True/False, a rule Match/No match, a loop
 * While/Done. Deriving it from the node rather than passing a literal at each call site is what keeps
 * the Loop honest — it shares the generic "action" template with single-output steps, so a
 * `show-branches` prop written per branch silently omitted it and the loop listed its two exits as
 * bare arrows with no way to tell While from Done.
 */
const selectedNodeHasNamedOutputs = computed(() => {
  const node = selectedNode.value;
  return Boolean(node && labWorkflowNodeHasBranchOutputs(node));
});

const selectedNodeOutgoing = computed(() => {
  const node = selectedNode.value;
  if (!node) {
    return [];
  }
  const ifBranchLabels =
    node.kind === 'action' && node.step.kind === 'if_condition'
      ? resolveIfOutgoingBranchLabels(node, props.definition.edges)
      : new Map<string, string>();
  return props.definition.edges
    .filter((edge) => edge.source === node.id)
    .map((edge) => ({
      edgeId: edge.id,
      when: edge.when,
      whenLabel:
        LAB_WORKFLOW_EDGE_WHEN_OPTIONS.find((option) => option.value === edge.when)?.label ?? edge.when,
      branchLabel:
        ifBranchLabels.get(edge.id) ?? labWorkflowOutgoingBranchLabel(node, edge),
      canvasLabel: edge.label?.trim() || undefined,
      targetLabel: nodeSummary(edge.target),
    }));
});
</script>

<template>
  <aside
    class="lab-workflow-graph-detail"
    :id="generateUniqueId('lab-workflow-graph-detail')"
  >
    <div v-if="!selection" class="lab-workflow-graph-detail__empty">
      <i class="pi pi-mouse-pointer text-lg text-lab-general-text-muted" aria-hidden="true" />
      <p class="m-0 text-sm text-lab-general-text-muted">
        Select a node or connection on the canvas to edit it here.
      </p>
    </div>

    <template v-else-if="selectedNode">
      <div class="mb-2 flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="text-xs font-semibold uppercase text-lab-general-text-muted">
            {{ selectedNodeHeaderTitle }}
          </div>
          <p
            v-if="selectedNodeHeaderLead"
            class="m-0 mt-0.5 text-sm text-lab-general-text"
          >
            {{ selectedNodeHeaderLead }}
          </p>
        </div>
        <Button
          v-if="selectedNode.kind !== 'trigger'"
          icon="pi pi-trash"
          severity="danger"
          text
          rounded
          aria-label="Delete node"
          :pt="{ root: { attrs: { id: generateUniqueId('wf-graph-delete-node') } } }"
          @click="emit('delete:node', selectedNode.id)"
        />
      </div>

      <div class="lab-workflow-graph-detail-io">
        <template v-if="selectedNode.kind === 'trigger'">
          <section class="lab-workflow-graph-detail-io__block lab-form-section">
            <h4 class="lab-workflow-graph-detail-io__title lab-form-section__title"><span class="lab-form-section__step">1</span>Input</h4>
            <p class="lab-workflow-graph-detail-io__lead lab-form-section__lead">
              Choose the event that starts this workflow.
            </p>
            <label class="lab-workflow-graph-detail-io__label">Event type</label>
            <Select
              :model-value="selectedNode.eventType"
              :options="eventOptions"
              option-label="label"
              option-value="value"
              filter
              placeholder="Event type"
              class="w-full"
              :pt="withFormControlRootId(formSelectPt, generateUniqueId('wf-graph-trigger-event'))"
              @update:model-value="
                (eventType) =>
                  eventType &&
                  patchSelectedNode({ kind: 'trigger', eventType })
              "
            />
            <LabWorkflowTriggerScheduleSection
              :model-value="selectedNode.schedule"
              :persisted="selectedTriggerSchedule"
              :persisted-loading="schedulesLoading"
              @update:model-value="
                (schedule) => patchSelectedNode({ kind: 'trigger', schedule })
              "
            />
          </section>
          <!--
            Output mapping is only meaningful for a **dynamic-payload** trigger: a webhook's shape is
            chosen by the caller, so it has to be discovered before it can be mapped. A declared event
            has its fields in the catalog and needs none of this.
          -->
          <section
            v-if="isDynamicPayloadTrigger"
            class="lab-workflow-graph-detail-io__block lab-form-section"
          >
            <h4 class="lab-workflow-graph-detail-io__title lab-form-section__title"><span class="lab-form-section__step">2</span>Output mapping</h4>
            <LabWorkflowTriggerMappingPanel
              :workflow-id="workflowId ?? null"
              :trigger-node-id="selectedNode.id"
              :trigger-event-type="selectedNode.eventType"
              :mapping="selectedNode.mapping ?? []"
              @update:mapping="(mapping) => patchSelectedNode({ kind: 'trigger', mapping })"
            />
          </section>
          <div class="lab-workflow-graph-detail-io__arrow" aria-hidden="true">
            <i class="pi pi-arrow-down" />
          </div>
          <section class="lab-workflow-graph-detail-io__block lab-form-section">
            <!-- Output mapping is conditional, so this numeral is computed: a declared event has no
                 mapping section and a hard-coded 3 would skip a number. -->
            <h4 class="lab-workflow-graph-detail-io__title lab-form-section__title"><span class="lab-form-section__step">{{ isDynamicPayloadTrigger ? 3 : 2 }}</span>What this node does</h4>
            <p class="lab-workflow-graph-detail-io__lead lab-form-section__lead">
              When this event happens, the workflow starts and passes its details to the next steps.
            </p>
          </section>
          <div class="lab-workflow-graph-detail-io__arrow" aria-hidden="true">
            <i class="pi pi-arrow-down" />
          </div>
          <LabWorkflowGraphDetailNextSteps
            :items="selectedNodeOutgoing"
            lead="First steps that run when the workflow starts."
          />
        </template>

        <template v-else-if="selectedNode.kind === 'condition'">
          <section class="lab-workflow-graph-detail-io__block lab-form-section">
            <h4 class="lab-workflow-graph-detail-io__title lab-form-section__title"><span class="lab-form-section__step">1</span>Input</h4>
            <p class="lab-workflow-graph-detail-io__lead lab-form-section__lead">
              Information from earlier steps in the workflow.
            </p>
          </section>
          <div class="lab-workflow-graph-detail-io__arrow" aria-hidden="true">
            <i class="pi pi-arrow-down" />
          </div>
          <section class="lab-workflow-graph-detail-io__block lab-form-section">
            <h4 class="lab-workflow-graph-detail-io__title lab-form-section__title"><span class="lab-form-section__step">2</span>What this node does</h4>
            <p class="lab-workflow-graph-detail-io__lead lab-form-section__lead">
              Checks the rules below and sends the run down the <strong>Yes</strong> or
              <strong>No</strong> path.
            </p>
            <LabWorkflowPayloadConditionFields
              class="mt-2"
              :conditions="selectedNode.conditions"
              :trigger-event-type="triggerEventType"
              :catalog-entries="catalogEntries"
              :integration-service-catalog="integrationServiceCatalog"
              :lab-user-options="labUserOptions"
              :captured-payload-fields="capturedPayloadFields"
              field-key-prefix="wf-graph-cond"
              @update:conditions="onGraphConditionListUpdate"
            />
          </section>
          <div class="lab-workflow-graph-detail-io__arrow" aria-hidden="true">
            <i class="pi pi-arrow-down" />
          </div>
          <LabWorkflowGraphDetailNextSteps
            :items="selectedNodeOutgoing"
            show-branches
            lead="Outgoing links on the canvas. Set each connection to Yes or No when you select the line."
          />
        </template>

        <template v-else-if="selectedNode.kind === 'rule'">
          <section class="lab-workflow-graph-detail-io__block lab-form-section">
            <h4 class="lab-workflow-graph-detail-io__title lab-form-section__title"><span class="lab-form-section__step">1</span>Input</h4>
            <p class="lab-workflow-graph-detail-io__lead lab-form-section__lead">
              Information from earlier steps in the workflow.
            </p>
        <Message
          v-if="!labWorkflowRuleNodeIsConfigured(selectedNode) && !selectedRuleWired"
          severity="info"
          :closable="false"
          class="text-xs"
        >
          Connect this node to the flow (incoming and outgoing links). Rule setup is optional until both
          connections are in place.
        </Message>
        <Message
          v-else-if="selectedRuleNeedsSetup"
          severity="warn"
          :closable="false"
          class="text-xs"
        >
          This rule node is wired into the flow. Add a name and at least one condition below before saving
          the workflow.
        </Message>
        <label class="lab-workflow-graph-detail-io__label">Inside rule group (optional)</label>
        <Select
          :model-value="selectedNode.groupId ?? null"
          :options="ruleGroupOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="Not in a group"
          class="mb-2 w-full"
          :pt="withFormControlRootId(formSelectPt, generateUniqueId('wf-graph-rule-group'))"
          @update:model-value="
            (groupId) =>
              patchSelectedNode({
                kind: 'rule',
                groupId: groupId ?? undefined,
              })
          "
        />
          </section>
          <div class="lab-workflow-graph-detail-io__arrow" aria-hidden="true">
            <i class="pi pi-arrow-down" />
          </div>
          <section class="lab-workflow-graph-detail-io__block lab-form-section">
            <h4 class="lab-workflow-graph-detail-io__title lab-form-section__title"><span class="lab-form-section__step">2</span>What this node does</h4>
            <p class="lab-workflow-graph-detail-io__lead lab-form-section__lead">
              Runs your rule and follows the <strong>Match</strong> or <strong>No match</strong> path.
            </p>
            <LabWorkflowGraphRuleSetupPanel
              :workflow-trigger-event-type="triggerEventType"
              :name="selectedNode.name"
              :conditions="selectedNode.conditions"
              :catalog-entries="catalogEntries"
              :integration-service-catalog="integrationServiceCatalog"
              :lab-user-options="labUserOptions"
              :captured-payload-fields="capturedPayloadFields"
              @apply="
                ({ name, conditions }) =>
                  patchSelectedNode({
                    kind: 'rule',
                    name,
                    conditions,
                    ruleId: undefined,
                  })
              "
            />
          </section>
          <div class="lab-workflow-graph-detail-io__arrow" aria-hidden="true">
            <i class="pi pi-arrow-down" />
          </div>
          <LabWorkflowGraphDetailNextSteps
            :items="selectedNodeOutgoing"
            show-branches
            lead="Outgoing links on the canvas. Set each connection to match or no match when you select the line."
          />
        </template>

        <template v-else-if="selectedNode.kind === 'group' && selectedGroupConfig">
          <section class="lab-workflow-graph-detail-io__block lab-form-section">
            <h4 class="lab-workflow-graph-detail-io__title lab-form-section__title"><span class="lab-form-section__step">1</span>Input</h4>
            <p class="lab-workflow-graph-detail-io__lead lab-form-section__lead">
              <template v-if="selectedGroupConfig.groupType === 'rules'">
                Information from earlier steps, including which branch was taken.
              </template>
              <template v-else>
                Information passed in from the previous step or branch.
              </template>
            </p>
          </section>
          <div class="lab-workflow-graph-detail-io__arrow" aria-hidden="true">
            <i class="pi pi-arrow-down" />
          </div>
          <section class="lab-workflow-graph-detail-io__block lab-form-section">
            <h4 class="lab-workflow-graph-detail-io__title lab-form-section__title"><span class="lab-form-section__step">2</span>What this node does</h4>
            <p class="lab-workflow-graph-detail-io__lead lab-form-section__lead">
              <template v-if="selectedGroupConfig.groupType === 'rules'">
                Runs member rules with the combine options below, then routes match / no-match branches.
              </template>
              <template v-else>
                Runs member actions in order (or parallel) using the execution options below.
              </template>
            </p>
            <label class="lab-workflow-graph-detail-io__label">Group name</label>
            <InputText
              :model-value="selectedNode.label"
              :placeholder="selectedGroupConfig.groupType === 'rules' ? 'Rule group' : 'Action group'"
              class="w-full"
              :pt="withFormControlRootId(formInputTextPt, generateUniqueId('wf-graph-group-label'))"
              @update:model-value="
                (label) =>
                  label &&
                  patchSelectedNode({ kind: 'group', label })
              "
            />
            <template v-if="selectedGroupConfig.groupType === 'actions'">
              <label class="lab-workflow-graph-detail-io__label">Execution</label>
              <Select
                :model-value="selectedGroupConfig.executionMode"
                :options="LAB_WORKFLOW_ACTION_GROUP_EXECUTION_OPTIONS"
                option-label="label"
                option-value="value"
                class="w-full"
                :pt="withFormControlRootId(formSelectPt, generateUniqueId('wf-graph-group-exec'))"
                @update:model-value="
                  (mode) =>
                    mode &&
                    patchSelectedNode({ kind: 'group', executionMode: mode })
                "
              />
              <label class="lab-workflow-graph-detail-io__label">On step failure</label>
              <Select
                :model-value="selectedGroupConfig.failurePolicy"
                :options="LAB_WORKFLOW_ACTION_GROUP_FAILURE_OPTIONS"
                option-label="label"
                option-value="value"
                class="w-full"
                :pt="withFormControlRootId(formSelectPt, generateUniqueId('wf-graph-group-fail'))"
                @update:model-value="
                  (policy) =>
                    policy &&
                    patchSelectedNode({ kind: 'group', failurePolicy: policy })
                "
              />
            </template>
            <template v-else>
              <label class="lab-workflow-graph-detail-io__label">Rule combine</label>
              <Select
                :model-value="selectedGroupConfig.ruleCombine"
                :options="LAB_WORKFLOW_RULE_GROUP_COMBINE_OPTIONS"
                option-label="label"
                option-value="value"
                class="w-full"
                :pt="withFormControlRootId(formSelectPt, generateUniqueId('wf-graph-group-combine'))"
                @update:model-value="
                  (mode) =>
                    mode &&
                    patchSelectedNode({ kind: 'group', ruleCombine: mode })
                "
              />
              <div class="mt-2 flex items-start gap-2">
                <Checkbox
                  :model-value="selectedGroupConfig.continueOnNoMatch"
                  binary
                  :pt="
                    withFormControlRootId(
                      formCheckboxPt,
                      generateUniqueId('wf-graph-group-continue-no-match'),
                    )
                  "
                  @update:model-value="
                    (checked) =>
                      patchSelectedNode({
                        kind: 'group',
                        continueOnNoMatch: checked === true,
                      })
                  "
                />
                <span class="text-xs leading-snug text-lab-general-text-muted">
                  Continue on outgoing branches when the group does not match (otherwise stop this path).
                </span>
              </div>
            </template>
            <p class="lab-workflow-graph-detail-io__label mt-3">Members</p>
            <!--
              Kind first, then the summary. Two members of one type and one recipient path read
              identically without it, so the list said "2 members" and nothing about which was which.
            -->
            <ul v-if="selectedGroupMembers.length" class="lab-workflow-graph-detail-io__list">
              <li
                v-for="member in selectedGroupMembers"
                :key="`${selectedNode.id}-member-${member.id}`"
                class="lab-workflow-graph-detail-io__member"
              >
                <span class="lab-workflow-graph-detail-io__member-kind">{{ member.kindLabel }}</span>
                <span v-if="member.showLabel" class="lab-workflow-graph-detail-io__member-label">
                  {{ member.label }}
                </span>
              </li>
            </ul>
            <p v-else class="m-0 text-xs text-lab-general-text-muted">
              No
              {{ selectedGroupConfig.groupType === 'rules' ? 'rules' : 'actions' }}
              in this group yet.
            </p>
          </section>
          <div class="lab-workflow-graph-detail-io__arrow" aria-hidden="true">
            <i class="pi pi-arrow-down" />
          </div>
          <LabWorkflowGraphDetailNextSteps
            :items="selectedNodeOutgoing"
            show-branches
            lead="Nodes linked after this group on the canvas."
          />
        </template>

        <template v-else-if="selectedIfActionStep">
          <section class="lab-workflow-graph-detail-io__block lab-form-section">
            <h4 class="lab-workflow-graph-detail-io__title lab-form-section__title"><span class="lab-form-section__step">1</span>Input</h4>
            <p class="lab-workflow-graph-detail-io__lead lab-form-section__lead">
              Information from earlier steps in the workflow.
            </p>
            <label class="lab-workflow-graph-detail-io__label">Inside group (optional)</label>
            <Select
              :model-value="selectedActionNode?.groupId ?? null"
              :options="actionGroupOptions"
              option-label="label"
              option-value="value"
              show-clear
              placeholder="Not in a group"
              class="w-full"
              :pt="withFormControlRootId(formSelectPt, generateUniqueId('wf-graph-if-action-group'))"
              @update:model-value="
                (groupId) =>
                  patchSelectedNode({
                    kind: 'action',
                    groupId: groupId ?? undefined,
                  })
              "
            />
          </section>
          <div class="lab-workflow-graph-detail-io__arrow" aria-hidden="true">
            <i class="pi pi-arrow-down" />
          </div>
          <section class="lab-workflow-graph-detail-io__block lab-form-section">
            <h4 class="lab-workflow-graph-detail-io__title lab-form-section__title"><span class="lab-form-section__step">2</span>What this node does</h4>
            <p class="lab-workflow-graph-detail-io__lead lab-form-section__lead">
              Checks your rules and sends the run down the <strong>Yes</strong> or <strong>No</strong> path.
            </p>
            <LabWorkflowPayloadConditionFields
              :conditions="selectedIfActionStep.conditions"
              :combine="selectedIfActionStep.combine"
              show-combine
              :trigger-event-type="triggerEventType"
              :catalog-entries="catalogEntries"
              :integration-service-catalog="integrationServiceCatalog"
              :lab-user-options="labUserOptions"
              :captured-payload-fields="capturedPayloadFields"
              field-key-prefix="wf-graph-if"
              @update:conditions="(conditions) => patchIfActionStep({ conditions })"
              @update:combine="(combine) => patchIfActionStep({ combine })"
            />
          </section>
          <div class="lab-workflow-graph-detail-io__arrow" aria-hidden="true">
            <i class="pi pi-arrow-down" />
          </div>
          <LabWorkflowGraphDetailNextSteps
            :items="selectedNodeOutgoing"
            show-branches
            lead="Yes / No branches on the canvas. Label each outgoing link (for example “No assignee”) when you select the connection."
          />
        </template>

        <template v-else-if="selectedActionNode">
          <section class="lab-workflow-graph-detail-io__block lab-form-section">
            <h4 class="lab-workflow-graph-detail-io__title lab-form-section__title"><span class="lab-form-section__step">1</span>Input</h4>
            <p class="lab-workflow-graph-detail-io__lead lab-form-section__lead">
              Information from earlier steps in the workflow.
            </p>
            <label class="lab-workflow-graph-detail-io__label">Inside group (optional)</label>
            <Select
              :model-value="selectedActionNode.groupId ?? null"
              :options="actionGroupOptions"
              option-label="label"
              option-value="value"
              show-clear
              placeholder="Not in a group"
              class="w-full"
              :pt="withFormControlRootId(formSelectPt, generateUniqueId('wf-graph-action-group'))"
              @update:model-value="
                (groupId) =>
                  patchSelectedNode({
                    kind: 'action',
                    groupId: groupId ?? undefined,
                  })
              "
            />
            <p
              v-if="selectedNodeOutgoing.length === 0"
              class="m-0 mt-2 text-xs text-lab-general-text-muted"
            >
              Connect an incoming link from the trigger, rule, or group.
            </p>
          </section>
          <div class="lab-workflow-graph-detail-io__arrow" aria-hidden="true">
            <i class="pi pi-arrow-down" />
          </div>
          <section class="lab-workflow-graph-detail-io__block lab-form-section">
            <h4 class="lab-workflow-graph-detail-io__title lab-form-section__title"><span class="lab-form-section__step">2</span>What this node does</h4>
            <p class="lab-workflow-graph-detail-io__lead lab-form-section__lead">
              What happens at this step (notify someone, send a message, update a record, and so on).
            </p>
            <LabWorkflowFlowStepEditor
              :step="selectedActionNode.step"
              :rule-options="ruleOptions"
              :user-options="labUsers"
              :payload-path-options="payloadPathOptions"
              :captured-payload-fields="capturedPayloadFields"
              :integration-write-services="connectorServices"
              :rules-loading="rulesLoading"
              :trigger-event-type="triggerEventType"
              :catalog-entries="catalogEntries"
              :integration-service-catalog="integrationServiceCatalog"
              block-key="graph-action"
              @update:step="(step) => patchSelectedNode({ kind: 'action', step })"
            />
          </section>
          <div class="lab-workflow-graph-detail-io__arrow" aria-hidden="true">
            <i class="pi pi-arrow-down" />
          </div>
          <LabWorkflowGraphDetailNextSteps
            :items="selectedNodeOutgoing"
            :show-branches="selectedNodeHasNamedOutputs"
            lead="Nodes linked after this step on the canvas."
          />
        </template>
      </div>
    </template>

    <template v-else-if="selectedEdge">
      <div class="mb-2 flex items-start justify-between gap-2">
        <div class="text-xs font-semibold uppercase text-lab-general-text-muted">Connection</div>
        <Button
          icon="pi pi-trash"
          severity="danger"
          text
          rounded
          aria-label="Remove connection"
          :pt="{ root: { attrs: { id: generateUniqueId('wf-graph-delete-edge') } } }"
          @click="emit('delete:edge', selectedEdge.id)"
        />
      </div>
      <div class="lab-workflow-graph-detail-io">
        <section class="lab-workflow-graph-detail-io__block lab-form-section">
          <h4 class="lab-workflow-graph-detail-io__title lab-form-section__title"><span class="lab-form-section__step">1</span>Input</h4>
          <p class="lab-workflow-graph-detail-io__lead lab-form-section__lead">Data and branch state from the source node.</p>
          <dl class="lab-workflow-graph-detail-io__meta">
            <div>
              <dt>From</dt>
              <dd>{{ edgeSourceSummary }}</dd>
            </div>
          </dl>
        </section>
        <div class="lab-workflow-graph-detail-io__arrow" aria-hidden="true">
          <i class="pi pi-arrow-down" />
        </div>
        <section class="lab-workflow-graph-detail-io__block lab-form-section">
          <h4 class="lab-workflow-graph-detail-io__title lab-form-section__title"><span class="lab-form-section__step">2</span>What this node does</h4>
          <p class="lab-workflow-graph-detail-io__lead lab-form-section__lead">
            Controls when this branch runs and how it is labeled on the canvas.
          </p>
          <template v-if="edgeSourceIsLoopAction">
            <label class="lab-workflow-graph-detail-io__label">Loop exit</label>
            <p class="m-0 mb-2 text-xs text-lab-general-text-muted">
              A loop routes by port, not by condition. Drag from <strong>While</strong> to repeat the
              body and from <strong>Done</strong> to continue after the loop.
            </p>
          </template>
          <template v-else>
            <label class="lab-workflow-graph-detail-io__label">Run this branch when</label>
            <Select
              :model-value="selectedEdge.when"
              :options="edgeWhenOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              :pt="withFormControlRootId(formSelectPt, generateUniqueId('wf-graph-edge-when'))"
              @update:model-value="(v) => v && onEdgeWhenChange(v)"
            />
          </template>
          <label class="lab-workflow-graph-detail-io__label mt-2">Canvas label (optional)</label>
          <InputText
            :model-value="selectedEdge.label ?? ''"
            placeholder="Shown on the connection line"
            class="w-full"
            :pt="withFormControlRootId(formInputTextPt, generateUniqueId('wf-graph-edge-label'))"
            @update:model-value="(v) => onEdgeLabelChange(v ?? '')"
          />
        </section>
        <div class="lab-workflow-graph-detail-io__arrow" aria-hidden="true">
          <i class="pi pi-arrow-down" />
        </div>
        <section class="lab-workflow-graph-detail-io__block lab-form-section">
          <h4 class="lab-workflow-graph-detail-io__title lab-form-section__title"><span class="lab-form-section__step">3</span>Next steps</h4>
          <p class="lab-workflow-graph-detail-io__lead lab-form-section__lead">Downstream node this connection points to.</p>
          <ul class="lab-workflow-graph-detail-io__list">
            <li>→ {{ edgeTargetSummary }}</li>
          </ul>
        </section>
      </div>
    </template>
  </aside>
</template>
