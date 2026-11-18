<script setup lang="ts">
import { computed, inject, ref, watch, type ComputedRef } from 'vue';
import { Handle, Position } from '@vue-flow/core';
import type { LabWorkflowFlowNodeData } from '@/shared/types/lab-workflow-graph-flow';
import type { LabWorkflowRunNodeVisualStatus } from '@/shared/types/lab-workflow-run';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import {
  labWorkflowBranchHandlesForNode,
  labWorkflowNodeHasBranchOutputs,
} from '@/shared/utils/lab-workflow-graph-branch-handles';

const props = defineProps<{
  data: LabWorkflowFlowNodeData;
}>();

const selectedNodeId = inject<ComputedRef<string | null>>('labWorkflowGraphSelectedNodeId');

/**
 * Run status is injected rather than carried on `data`: the canvas rebuilds node `data` objects from
 * the domain graph, so keeping the map separate means status changes never mutate the model.
 */
const runNodeStatus = inject<
  ComputedRef<ReadonlyMap<string, LabWorkflowRunNodeVisualStatus>>
>('labWorkflowGraphRunNodeStatus', computed(() => new Map()));

const kindClass = computed(() => `lab-wf-graph-node--${props.data.node.kind}`);

/**
 * True when this node is a member of a group.
 *
 * A member's edges are drawn from the **group**, not from itself: the group is the unit that connects
 * to the rest of the graph, and `layoutAnchorId` in the auto-arrange pass already treats it that way
 * when routing. Leaving the child's handles visible made its own ports look connectable, so authors
 * dragged from a child to the next node and created an edge the walker would take without the group
 * ever running.
 */
const isGroupMember = computed(() => {
  const node = props.data.node;
  return (
    (node.kind === 'action' || node.kind === 'rule')
    && Boolean((node as { groupId?: string }).groupId)
  );
});

const isSelected = computed(() => selectedNodeId?.value === props.data.node.id);

const runStatus = computed<LabWorkflowRunNodeVisualStatus | null>(
  () => runNodeStatus.value.get(props.data.node.id) ?? null,
);

const branchOutputs = computed(() =>
  labWorkflowNodeHasBranchOutputs(props.data.node) ? labWorkflowBranchHandlesForNode(props.data.node) : [],
);

const { generateUniqueId } = useUniqueElementId();

const conditionsExpanded = ref(false);

const conditionLines = computed(() => props.data.conditionLines ?? []);

const cardTitle = computed(() => props.data.headline ?? props.data.label);

const showCardTitle = computed(() => {
  const node = props.data.node;
  const title = cardTitle.value?.trim();
  if (!title) {
    return false;
  }
  const kind = (props.data.kindLabel ?? node.kind)?.trim();
  if (kind && title.toLowerCase() === kind.toLowerCase()) {
    return false;
  }
  return true;
});

const visibleConditionLines = computed(() => {
  if (conditionsExpanded.value || conditionLines.value.length <= 1) {
    return conditionLines.value;
  }
  return conditionLines.value.slice(0, 1);
});

const hiddenConditionCount = computed(() =>
  conditionsExpanded.value ? 0 : Math.max(0, conditionLines.value.length - 1),
);

function toggleConditionsExpanded(): void {
  conditionsExpanded.value = !conditionsExpanded.value;
}

watch(
  () => props.data.node.id,
  () => {
    conditionsExpanded.value = false;
  },
);
</script>

<template>
  <div
    class="lab-wf-graph-node"
    :class="[
      kindClass,
      isGroupMember ? 'lab-wf-graph-node--group-member' : '',
      isSelected ? 'lab-wf-graph-node--selected' : '',
      branchOutputs.length ? 'lab-wf-graph-node--branching' : '',
      runStatus ? `lab-wf-graph-node--run-${runStatus}` : '',
    ]"
  >
    <!--
      Handles are hidden for group members, not removed: `visibility: hidden` keeps Vue Flow's
      handle registry intact so an existing edge still resolves to a DOM node and does not throw on
      render, while offering no target to drag from.
    -->
    <Handle
      v-if="data.node.kind !== 'trigger' && !isGroupMember"
      type="target"
      :position="Position.Top"
      class="lab-wf-graph-node__handle"
    />
    <div class="lab-wf-graph-node__kind-row">
      <span class="lab-wf-graph-node__kind">{{ data.kindLabel ?? data.node.kind }}</span>
      <i
        v-if="data.showRuleSetupWarning"
        class="pi pi-exclamation-triangle lab-wf-graph-node__warn"
        aria-hidden="true"
        title="Rule not linked yet"
      />
    </div>
    <div v-if="showCardTitle" class="lab-wf-graph-node__label">{{ cardTitle }}</div>
    <div v-if="conditionLines.length" class="lab-wf-graph-node__conditions">
      <p
        v-for="(line, index) in visibleConditionLines"
        :key="`${data.node.id}-cond-line-${index}`"
        class="lab-wf-graph-node__condition-line"
      >
        {{ line }}
      </p>
      <button
        v-if="hiddenConditionCount > 0 || (conditionsExpanded && conditionLines.length > 1)"
        type="button"
        class="lab-wf-graph-node__conditions-toggle"
        :id="generateUniqueId(`wf-graph-cond-toggle-${data.node.id}`)"
        @click.stop="toggleConditionsExpanded"
      >
        <template v-if="hiddenConditionCount > 0">
          +{{ hiddenConditionCount }} more
        </template>
        <template v-else>Show less</template>
      </button>
    </div>
    <template v-if="branchOutputs.length && !isGroupMember">
      <div class="lab-wf-graph-node__branch-labels" aria-hidden="true">
        <span
          v-for="port in branchOutputs"
          :key="`${data.node.id}-port-label-${port.id}`"
          class="lab-wf-graph-node__branch-label"
          :style="{ left: `${port.leftPercent}%` }"
        >
          {{ port.label }}
        </span>
      </div>
      <Handle
        v-for="port in branchOutputs"
        :key="`${data.node.id}-port-${port.id}`"
        :id="port.id"
        type="source"
        :position="Position.Bottom"
        class="lab-wf-graph-node__handle lab-wf-graph-node__handle--branch"
        :style="{ left: `${port.leftPercent}%` }"
      />
    </template>
    <Handle
      v-else-if="!isGroupMember"
      type="source"
      :position="Position.Bottom"
      class="lab-wf-graph-node__handle"
    />
  </div>
</template>

<style scoped>
.lab-wf-graph-node {
  position: relative;
  --lab-wf-node-border: color-mix(in srgb, var(--lab-general-border) 38%, transparent);
  min-width: 11rem;
  max-width: 15rem;
  padding: 0.55rem 0.75rem;
  border-radius: 0.55rem;
  border: 1px solid var(--lab-wf-node-border);
  background: var(
    --lab-workflow-panel-bg,
    color-mix(in srgb, var(--lab-prime-surface-800) 70%, transparent)
  );
  color: var(--lab-general-text);
  font-size: 0.8125rem;
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--lab-general-text) 6%, transparent),
    0 4px 14px color-mix(in srgb, var(--lab-general-text) 8%, transparent);
  cursor: grab;
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}
.lab-wf-graph-node:active {
  cursor: grabbing;
}
.lab-wf-graph-node:hover {
  box-shadow:
    0 2px 4px rgb(0 0 0 / 0.1),
    0 8px 20px rgb(0 0 0 / 0.12);
}
.lab-wf-graph-node--trigger {
  border-color: color-mix(in srgb, var(--lab-accent-primary) 22%, var(--lab-wf-node-border));
}
.lab-wf-graph-node--condition {
  border-color: color-mix(
    in srgb,
    var(--lab-button-border-hover) 18%,
    var(--lab-wf-node-border)
  );
}
.lab-wf-graph-node--rule {
  border-color: color-mix(in srgb, var(--lab-card-border) 45%, var(--lab-wf-node-border));
}
.lab-wf-graph-node--action {
  border-color: color-mix(in srgb, var(--lab-accent-primary) 16%, var(--lab-wf-node-border));
}
.lab-wf-graph-node__kind-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
}

.lab-wf-graph-node__kind {
  text-transform: uppercase;
  font-size: 0.625rem;
  letter-spacing: 0.04em;
  color: var(--lab-general-text-muted);
}

.lab-wf-graph-node__warn {
  flex-shrink: 0;
  font-size: 0.7rem;
  color: color-mix(in srgb, var(--lab-button-border-hover) 75%, var(--lab-general-text));
}
.lab-wf-graph-node__label {
  margin-top: 0.15rem;
  font-weight: 600;
  line-height: 1.25;
  word-break: break-word;
}

/*
 * A member card sits in a slot, not on open canvas.
 *
 * The slot is `NODE_HEIGHT` tall (76px) and must also hold the kind row, so the summary is dropped to
 * the same size the condition lines already use. Without this a two-line summary ("Uses `userId` from
 * the event payload") overflowed the slot and the group's own height had to grow to fit text that was
 * only ever meant to be a caption.
 *
 * Only the summary shrinks — the kind row keeps its size and letter-spacing because it is the member's
 * identity in the list, and shrinking both would make the two indistinguishable again.
 */
/*
 * A member has a **fixed footprint**, set inline from `LAB_WORKFLOW_MEMBER_CARD_*`.
 *
 * The position is computed before the card renders, so the centring maths needs its size up front.
 * Content-driven sizing made two members 20px apart because their summaries differed — each was
 * centred against an assumed width it did not actually have.
 *
 * `overflow: hidden` keeps a long summary inside the card instead of spilling past the border, and the
 * summary clamps to two lines so a tall card cannot push into the next slot.
 */
.lab-wf-graph-node--group-member {
  /*
   * The card must be **exactly** the size the projection computed, or the slot's inset is measured
   * against a box the card overflows.
   *
   * Chrome reported `element.style width: 270px; height: 74px` on the wrapper while the rendered card
   * measured 322x89. Three base rules were fighting the inline size:
   *   - `min-width: 11rem` / `max-width: 15rem` clamped the card to a range unrelated to the wrapper;
   *   - default `content-box` added padding on top of the width;
   *   - content-driven sizing made the final box depend on the summary text.
   *
   * `width/height: 100%` + `border-box` ties the card to its wrapper, so the number the centring maths
   * assumed and the number on screen are the same. The wrapper already has an explicit px size, which
   * is why `100%` resolves here (it did not before, when the wrapper had no width at all).
   */
  width: 100%;
  height: 100%;
  min-width: 0;
  max-width: none;
  box-sizing: border-box;
  padding: 0.4rem 0.55rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.lab-wf-graph-node--group-member .lab-wf-graph-node__label {
  font-size: 0.6875rem;
  line-height: 1.3;
  /* Two lines fit the fixed height; more would either clip mid-word or overflow the card. */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/*
 * Radius matched to the slot band's `0.55rem` — see the border-radius note in
 * `LabWorkflowGraphGroupNode`. Declared here as well so the two stay in step even if the base card
 * radius changes for non-member nodes.
 */
.lab-wf-graph-node--group-member {
  border-radius: 0.55rem;
}

.lab-wf-graph-node__conditions {
  margin-top: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.lab-wf-graph-node__condition-line {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1.35;
  color: var(--lab-general-text-muted);
  word-break: break-word;
}

.lab-wf-graph-node__conditions-toggle {
  align-self: flex-start;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--lab-accent-primary);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.lab-wf-graph-node__conditions-toggle:hover {
  color: var(--lab-general-text);
}

.lab-wf-graph-node--branching {
  /* Room for port labels above the connectors on the bottom edge. */
  padding-bottom: 1.65rem;
}

.lab-wf-graph-node__branch-labels {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0.55rem;
  height: 0.75rem;
  pointer-events: none;
}

.lab-wf-graph-node__branch-label {
  position: absolute;
  transform: translateX(-50%);
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--lab-general-text-muted);
  white-space: nowrap;
  line-height: 1;
}

.lab-wf-graph-node :deep(.vue-flow__handle.lab-wf-graph-node__handle--branch) {
  bottom: -0.3rem;
  transform: translate(-50%, 50%);
}

.lab-wf-graph-node__handle,
.lab-wf-graph-node :deep(.vue-flow__handle) {
  width: 0.5rem;
  height: 0.5rem;
  min-width: 0;
  min-height: 0;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--lab-accent-primary) 85%, var(--lab-general-bg)) !important;
  border: 1px solid color-mix(in srgb, var(--lab-general-bg) 85%, var(--lab-general-border)) !important;
  box-shadow: 0 0 0 1px color-mix(in srgb, #000 35%, transparent);
}

/* After kind tints so selection stays visible on the canvas + detail panel */
.lab-wf-graph-node.lab-wf-graph-node--selected {
  border-width: 2px;
  border-color: color-mix(in srgb, var(--lab-accent-primary) 78%, var(--lab-general-border));
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--lab-accent-primary) 42%, transparent),
    0 4px 16px color-mix(in srgb, var(--lab-accent-primary) 18%, transparent);
}

/*
 * Run-result states. Declared last so they win over the kind tints and over selection while a run
 * is being replayed — the whole point is to see the outcome, not which node is selected.
 *
 * Colours are mixed against the background rather than used at full strength: a saturated green
 * border on every node would read as an alarm. Shadows carry the state instead, which leaves the
 * card readable.
 */
.lab-wf-graph-node--run-succeeded {
  border-color: color-mix(in srgb, #22c55e 65%, var(--lab-general-bg));
  box-shadow:
    0 0 0 1px color-mix(in srgb, #22c55e 38%, transparent),
    0 4px 14px color-mix(in srgb, #22c55e 16%, transparent);
}

.lab-wf-graph-node--run-running {
  border-color: color-mix(in srgb, #38bdf8 78%, var(--lab-general-bg));
  box-shadow:
    0 0 0 2px color-mix(in srgb, #38bdf8 45%, transparent),
    0 4px 18px color-mix(in srgb, #38bdf8 26%, transparent);
  animation: lab-wf-node-pulse 1s ease-in-out infinite;
}

.lab-wf-graph-node--run-skipped {
  border-color: color-mix(in srgb, var(--lab-general-text-muted) 45%, var(--lab-general-bg));
  opacity: 0.72;
}

.lab-wf-graph-node--run-failed {
  border-color: color-mix(in srgb, #ef4444 78%, var(--lab-general-bg));
  box-shadow:
    0 0 0 2px color-mix(in srgb, #ef4444 42%, transparent),
    0 4px 18px color-mix(in srgb, #ef4444 24%, transparent);
}

@keyframes lab-wf-node-pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 2px color-mix(in srgb, #38bdf8 45%, transparent),
      0 4px 18px color-mix(in srgb, #38bdf8 26%, transparent);
  }
  50% {
    box-shadow:
      0 0 0 5px color-mix(in srgb, #38bdf8 16%, transparent),
      0 4px 22px color-mix(in srgb, #38bdf8 34%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lab-wf-graph-node--run-running {
    animation: none;
  }
}
</style>
