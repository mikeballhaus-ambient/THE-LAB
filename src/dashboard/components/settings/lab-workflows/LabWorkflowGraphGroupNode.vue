<script setup lang="ts">
import { computed, inject, type ComputedRef } from 'vue';
import { Handle, Position } from '@vue-flow/core';
import type { LabWorkflowFlowNodeData } from '@/shared/types/lab-workflow-graph-flow';
import type { LabWorkflowRunNodeVisualStatus } from '@/shared/types/lab-workflow-run';
import { normalizeWorkflowGroupNode } from '@/shared/utils/lab-workflow-graph-group-normalize';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import {
  DEFAULT_GROUP_WIDTH,
  LAB_WORKFLOW_GROUP_SLOT_HEIGHT,
  labWorkflowGroupSlotPosition,
  labWorkflowGroupSlotWidth,
} from '@/shared/utils/lab-workflow-group-slots';

const props = defineProps<{
  data: LabWorkflowFlowNodeData;
}>();

/**
 * Collapse is a **canvas** preference, not workflow data.
 *
 * Whether the rail is open while authoring says nothing about how the workflow runs, and persisting it
 * would make a view toggle show up as a graph change — dirtying the editor and rewriting the saved
 * definition on every expand. Injected so `LabWorkflowDefinitionEditor` can own one shared set.
 */
const collapsedGroups = inject<ComputedRef<ReadonlySet<string>>>(
  'labWorkflowGraphCollapsedGroups',
  computed(() => new Set<string>()),
);
const toggleGroupCollapsed = inject<(groupId: string) => void>(
  'labWorkflowGraphToggleGroupCollapsed',
  () => undefined,
);

const { generateUniqueId } = useUniqueElementId();

const selectedNodeId = inject<ComputedRef<string | null>>('labWorkflowGraphSelectedNodeId');

const isSelected = computed(() => selectedNodeId?.value === props.data.node.id);

const isSlotsCollapsed = computed(() => collapsedGroups.value.has(props.data.node.id));

/**
 * Whether a node is being dragged over this group.
 *
 * Injected from the canvas (which owns the drag lifecycle) rather than derived from the group's data,
 * so hovering never rewrites the workflow model.
 */
const dragOverGroupIds = inject<ComputedRef<ReadonlySet<string>>>(
  'labWorkflowGraphDragOverGroupIds',
  computed(() => new Set<string>()),
);
const isDragOver = computed(() => dragOverGroupIds.value.has(props.data.node.id));

/**
 * Derived run status, injected by the canvas.
 *
 * The runner records a step per **member** and never one for the group, so reading the status map by
 * the group's own id could never paint it. The canvas folds member status up into the group id, and
 * this reads it exactly as a normal node reads its own.
 */
const runNodeStatus = inject<ComputedRef<ReadonlyMap<string, LabWorkflowRunNodeVisualStatus>>>(
  'labWorkflowGraphRunNodeStatus',
  computed(() => new Map()),
);
const runStatus = computed(() => runNodeStatus.value.get(props.data.node.id) ?? null);

/** Slots as projected by the canvas (members + the mandatory empty one). */
const slotCount = computed(() => props.data.groupSlotCount ?? 0);

/**
 * Members, for the toggle badge.
 *
 * Deliberately **not** `slotCount`: the canvas reports 0 slots while collapsed, so a slot-based badge
 * read "0" on a group that visibly held two members. The badge answers "how many are in here", which
 * does not change with the rail's visibility.
 */
const memberCount = computed(() => props.data.groupMemberCount ?? 0);

/**
 * Empty slots only.
 *
 * Slots `1..memberCount` are occupied: a member card paints over them, but the dashed border and the
 * "Drop here" caption still showed *behind and around* the card because the card is narrower than the
 * slot. Rendering only the slots past the members removes the caption where it is false — an occupied
 * slot is not a drop target, and saying so invites a drop that would join the group at the end.
 */
interface SlotBand {
  index: number;
  top: number;
  left: number;
  width: number;
  height: number;
  occupied: boolean;
}

/**
 * Every slot band, positioned from the shared constants.
 *
 * Occupied bands render as an invisible spacer (the member card paints over them); only empty bands
 * show the "Drop here" affordance. Absolute `top`/`height` rather than a flex gap is what keeps the
 * bands aligned with the member projection, which is computed from the same numbers.
 */
const slotBands = computed((): SlotBand[] => {
  const groupNode = props.data.node;
  // `DEFAULT_GROUP_WIDTH` when the definition omits a width, so the band and the member projection
  // always get a concrete number rather than each guessing separately.
  const groupWidth = groupNode.kind === 'group'
    ? (groupNode.width ?? DEFAULT_GROUP_WIDTH)
    : DEFAULT_GROUP_WIDTH;
  const bands: SlotBand[] = [];
  for (let index = 0; index < slotCount.value; index += 1) {
    const position = labWorkflowGroupSlotPosition(index, groupWidth);
    bands.push({
      index: index + 1,
      top: position.y,
      left: position.x,
      // The band is the full inner width. The member card is narrower and centred inside it, so the
      // slot reads as a container the card sits in rather than a box the card fills.
      width: labWorkflowGroupSlotWidth(groupWidth),
      height: LAB_WORKFLOW_GROUP_SLOT_HEIGHT,
      occupied: index < memberCount.value,
    });
  }
  return bands;
});

const config = computed(() => {
  if (props.data.node.kind !== 'group') {
    return null;
  }
  return normalizeWorkflowGroupNode(props.data.node);
});

const label = computed(() => {
  if (props.data.node.kind === 'group') {
    return props.data.label || props.data.node.label || 'Group';
  }
  return props.data.label;
});

const kindLabel = computed(() =>
  config.value?.groupType === 'rules' ? 'Rule group' : 'Action group',
);

const modeHint = computed(() => {
  if (!config.value || config.value.groupType !== 'actions') {
    return '';
  }
  const exec = config.value.executionMode === 'parallel' ? 'Parallel' : 'In order';
  const fail = config.value.failurePolicy === 'continue' ? 'continue on failure' : 'stop on failure';
  return `${exec} · ${fail}`;
});
</script>

<template>
  <div
    class="lab-wf-graph-group"
    :class="[
      isSlotsCollapsed ? 'lab-wf-graph-group--collapsed' : '',
      isDragOver ? 'lab-wf-graph-group--drag-over' : '',
      isSelected ? 'lab-wf-graph-group--selected' : '',
      runStatus ? `lab-wf-graph-group--run-${runStatus}` : '',
      config?.groupType === 'rules' ? 'lab-wf-graph-group--rules' : 'lab-wf-graph-group--actions',
    ]"
  >
    <Handle type="target" :position="Position.Top" class="lab-wf-graph-node__handle" />
    <div class="lab-wf-graph-group__header">
      <span class="lab-wf-graph-group__kind">{{ kindLabel }}</span>
      <!--
        Collapse lives on the header, not the body: the whole point is to shrink the card, so the
        control has to remain reachable while it is collapsed.
      -->
      <button
        type="button"
        class="lab-wf-graph-group__slots-toggle"
        :id="generateUniqueId(`wf-group-slots-toggle-${data.node.id}`)"
        :aria-expanded="!isSlotsCollapsed"
        :aria-label="isSlotsCollapsed ? 'Expand member slots' : 'Collapse member slots'"
        :title="isSlotsCollapsed ? 'Expand slots' : 'Collapse slots'"
        @click.stop="toggleGroupCollapsed(data.node.id)"
      >
        <i
          :class="isSlotsCollapsed ? 'pi pi-chevron-down' : 'pi pi-chevron-up'"
          aria-hidden="true"
        />
        <span class="lab-wf-graph-group__slots-count">{{ memberCount }}</span>
      </button>
    </div>
    <div class="lab-wf-graph-group__label">{{ label }}</div>
    <p v-if="modeHint" class="lab-wf-graph-group__mode">{{ modeHint }}</p>
    <!--
      The rail is **absolutely positioned** from the same constants the drop maths and the member
      projection use, so a member always lands on a rendered band.
      It was previously flowed content with the hint text sitting between slots: the hint pushed every
      band down while members stayed at their computed offsets, so a member rendered in the wrong band
      and the card's content overflowed its fixed height.
    -->
    <div
      v-if="!isSlotsCollapsed"
      class="lab-wf-graph-group__slots"
      :aria-label="`${slotCount} placement slot${slotCount === 1 ? '' : 's'}`"
    >
      <div
        v-for="band in slotBands"
        :key="`slot-${band.index}`"
        class="lab-wf-graph-group__slot"
        :class="{ 'lab-wf-graph-group__slot--occupied': band.occupied }"
        :style="{
          top: `${band.top}px`,
          height: `${band.height}px`,
          left: `${band.left}px`,
          width: `${band.width}px`,
        }"
        aria-hidden="true"
      >
        <template v-if="!band.occupied">
          <span class="lab-wf-graph-group__slot-index">{{ band.index }}</span>
          <span class="lab-wf-graph-group__slot-text">Drop here</span>
        </template>
      </div>
    </div>
    <Handle type="source" :position="Position.Bottom" class="lab-wf-graph-node__handle" />
  </div>
</template>

<style scoped>
.lab-wf-graph-group {
  width: 100%;
  height: 100%;
  min-width: 12rem;
  min-height: 7rem;
  /*
   * Padding moved onto the **header contents**, not the card.
   *
   * The rail is `position: absolute; inset: 0`, which resolves against the *padding box*. With padding
   * on the card, the bands were offset by 8.8px from inside the padding while Vue Flow positions a
   * child from the group's **border box origin** (its stored `position` is relative to the group's
   * top-left). The child therefore sat ~9px low and ~12px right of the band it was meant to be centred
   * in — which reads as "wider gap on top than the sides".
   *
   * Removing the padding makes both coordinate systems share one origin. Header spacing is now on the
   * header block itself, so nothing about the visual layout changes.
   */
  padding: 0;
  border-radius: 0.55rem;
  /* Header block restored spacing: the card no longer provides padding, but the visual inset must stay. */
  --lab-wf-group-gutter-x: 0.75rem;
  --lab-wf-group-gutter-top: 0.55rem;
  border: 1px dashed color-mix(in srgb, var(--lab-accent-primary) 35%, var(--lab-general-border));
  background: color-mix(in srgb, var(--lab-workflow-canvas-bg) 55%, var(--lab-general-bg));
  color: var(--lab-general-text);
  box-sizing: border-box;
  cursor: grab;
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--lab-general-text) 6%, transparent),
    0 4px 14px color-mix(in srgb, var(--lab-general-text) 8%, transparent);
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}

.lab-wf-graph-group:active {
  cursor: grabbing;
}

.lab-wf-graph-group:hover {
  box-shadow:
    0 2px 4px color-mix(in srgb, var(--lab-general-text) 10%, transparent),
    0 8px 20px color-mix(in srgb, var(--lab-general-text) 12%, transparent);
}

.lab-wf-graph-group--rules {
  border-color: color-mix(in srgb, var(--lab-card-border) 45%, var(--lab-general-border));
}

/* Header-only: tighten the vertical rhythm so the fixed collapsed height is fully used. */
/*
 * Collapsed card height.
 *
 * The **stored** height is always the expanded one (the schema requires >= 120, and a view preference
 * must not be persisted). Collapsing therefore shortens only the rendered box. `!important` is needed
 * because Vue Flow writes the projected height as an inline style on the node wrapper's child.
 */
.lab-wf-graph-group--collapsed {
  height: 92px !important;
  min-height: 0;
  padding-top: 0.45rem;
  padding-bottom: 0.45rem;
}

/*
 * Run status.
 *
 * Mirrors `LabWorkflowGraphNode`'s run classes exactly — same colours, same shadow-based emphasis — so a
 * group and a card read as the same state at a glance. Only the border style differs: the group's
 * resting border is dashed, and a dashed green border would look like a hover rather than an outcome.
 *
 * The status itself is derived from the group's members (see `labWorkflowGroupRunStatus`), because the
 * runner never records a step for the group.
 */
.lab-wf-graph-group--run-succeeded {
  border-style: solid;
  border-color: color-mix(in srgb, #22c55e 65%, var(--lab-general-bg));
  box-shadow:
    0 0 0 1px color-mix(in srgb, #22c55e 38%, transparent),
    0 4px 14px color-mix(in srgb, #22c55e 16%, transparent);
}

.lab-wf-graph-group--run-running {
  border-style: solid;
  border-color: color-mix(in srgb, #38bdf8 78%, var(--lab-general-bg));
  box-shadow:
    0 0 0 2px color-mix(in srgb, #38bdf8 45%, transparent),
    0 4px 18px color-mix(in srgb, #38bdf8 26%, transparent);
}

.lab-wf-graph-group--run-skipped {
  border-color: color-mix(in srgb, var(--lab-general-text-muted) 45%, var(--lab-general-bg));
  opacity: 0.72;
}

.lab-wf-graph-group--run-failed {
  border-style: solid;
  border-color: color-mix(in srgb, #ef4444 78%, var(--lab-general-bg));
  box-shadow:
    0 0 0 2px color-mix(in srgb, #ef4444 42%, transparent),
    0 4px 18px color-mix(in srgb, #ef4444 24%, transparent);
}

/*
 * Drag-over affordance.
 *
 * Solid accent border plus a ring: the dashed border is the group's resting state, so only a clearly
 * different treatment reads as "this will accept the drop".
 */
.lab-wf-graph-group--drag-over {
  border-style: solid;
  border-color: color-mix(in srgb, var(--lab-accent-primary) 85%, var(--lab-general-border));
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--lab-accent-primary) 30%, transparent),
    0 4px 16px color-mix(in srgb, var(--lab-accent-primary) 20%, transparent);
  background: color-mix(in srgb, var(--lab-accent-primary) 8%, var(--lab-general-bg));
}

.lab-wf-graph-group--collapsed .lab-wf-graph-group__label {
  margin-top: 0.1rem;
}

.lab-wf-graph-group--collapsed .lab-wf-graph-group__mode {
  margin-top: 0.15rem;
}

.lab-wf-graph-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  /*
   * The card has no padding (see the `.lab-wf-graph-group` note), so the header supplies the gutter
   * itself. `box-sizing: border-box` keeps the total heading block the same height as before, which
   * matters because `LAB_WORKFLOW_GROUP_SLOT_TOP` expects the rail to start below it.
   */
  padding: var(--lab-wf-group-gutter-top) var(--lab-wf-group-gutter-x) 0;
}

/*
 * Slot rail toggle. Sits in the header so it stays reachable while the rail is collapsed — a control
 * that hides itself is a control the author has to hunt for.
 */
.lab-wf-graph-group__slots-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.05rem 0.3rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 70%, transparent);
  border-radius: 9999px;
  background: transparent;
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--lab-general-text-muted);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.lab-wf-graph-group__slots-toggle:hover {
  border-color: color-mix(in srgb, var(--lab-accent-primary) 55%, var(--lab-general-border));
  color: var(--lab-general-text);
}

.lab-wf-graph-group__slots-count {
  font-variant-numeric: tabular-nums;
}

.lab-wf-graph-group__kind {
  text-transform: uppercase;
  font-size: 0.625rem;
  letter-spacing: 0.04em;
  color: var(--lab-general-text-muted);
}

.lab-wf-graph-group__label {
  margin-top: 0.15rem;
  /* Same horizontal gutter as the header, now supplied per element rather than by the card. */
  padding: 0 var(--lab-wf-group-gutter-x);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.25;
}

.lab-wf-graph-group__mode {
  margin: 0.25rem 0 0;
  padding: 0 var(--lab-wf-group-gutter-x);
  font-size: 0.6875rem;
  font-weight: 600;
  color: color-mix(in srgb, var(--lab-accent-primary) 70%, var(--lab-general-text-muted));
}

/*
 * Slot rail.
 *
 * **Absolutely positioned.** Each band's `top` is set inline from `labWorkflowGroupSlotPosition`, the
 * same function the member projection uses, so a member always lands on a rendered band.
 *
 * The flowed (flex) version could not guarantee that: the hint line and the rail's own margin sat in
 * normal flow, so any change to the header or hint pushed every band down while members kept their
 * computed offsets — a member then rendered between bands and the card's content overflowed.
 * `pointer-events: none` because the rail must never intercept a drag aimed at a member.
 */
.lab-wf-graph-group__slots {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.lab-wf-graph-group__slot {
  position: absolute;
  /* `left`/`width` are set inline from the shared slot geometry so the band matches the member card. */
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.55rem;
  /*
   * Matches the member card's radius (`0.55rem` in `LabWorkflowGraphNode`).
   *
   * A slot and the surface inside it with different corner radii read as two unrelated boxes — the
   * inset looks uneven at the corners even when the gap on each side is identical.
   */
  border-radius: 0.55rem;
  border: 1px dashed color-mix(in srgb, var(--lab-accent-primary) 28%, var(--lab-general-border));
  background: color-mix(in srgb, var(--lab-general-bg) 45%, transparent);
  box-sizing: border-box;
  font-size: 0.6875rem;
  color: var(--lab-general-text-muted);
}

/*
 * An occupied band keeps its **outline** — the rail marks where members sit, so hiding it entirely
 * made the slots look absent once children landed — but drops its caption, since an occupied slot is
 * not a drop target.
 */
/*
 * An occupied band is the **same** band, just without the caption.
 *
 * Keeping identical border and background is what makes the rail read as a slot the card sits in;
 * a lighter or transparent occupied band looked like a different (smaller) element behind the card,
 * which is what the "backgrounds do not match" report was seeing.
 */
.lab-wf-graph-group__slot--occupied {
  border-style: solid;
  border-color: color-mix(in srgb, var(--lab-accent-primary) 22%, var(--lab-general-border));
}

/* Muted deliberately: the marker is an affordance, not content competing with a real node card. */
.lab-wf-graph-group__slot-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.05rem;
  height: 1.05rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 600;
  color: color-mix(in srgb, var(--lab-accent-primary) 75%, var(--lab-general-text-muted));
  border: 1px solid color-mix(in srgb, var(--lab-accent-primary) 35%, var(--lab-general-border));
}

.lab-wf-graph-group :deep(.vue-flow__handle) {
  width: 0.5rem;
  height: 0.5rem;
  min-width: 0;
  min-height: 0;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--lab-accent-primary) 85%, var(--lab-general-bg)) !important;
  border: 1px solid color-mix(in srgb, var(--lab-general-bg) 85%, var(--lab-general-border)) !important;
  box-shadow: 0 0 0 1px color-mix(in srgb, #000 35%, transparent);
}

.lab-wf-graph-group.lab-wf-graph-group--selected {
  border-width: 2px;
  border-style: solid;
  border-color: color-mix(in srgb, var(--lab-accent-primary) 78%, var(--lab-general-border));
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--lab-accent-primary) 42%, transparent),
    0 4px 16px color-mix(in srgb, var(--lab-accent-primary) 18%, transparent);
}
</style>
