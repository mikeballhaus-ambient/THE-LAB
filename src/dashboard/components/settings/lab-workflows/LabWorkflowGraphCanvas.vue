<script setup lang="ts">
import {
  computed,
  markRaw,
  nextTick,
  onMounted,
  provide,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
  type ShallowRef,
} from 'vue';
import {
  VueFlow,
  applyEdgeChanges,
  applyNodeChanges,
  useVueFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeMouseEvent,
  type GraphNode,
  type Node,
  type NodeChange,
  type NodeMouseEvent,
  type NodeTypesObject,
  type ViewportTransform,
} from '@vue-flow/core';
import { DnDProvider } from '@vue-dnd-kit/core';
import type { IDragEvent } from '@vue-dnd-kit/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type {
  LabWorkflowDefinitionV2,
  LabWorkflowGraphEdgeV2,
  LabWorkflowGraphNodeV2,
  LabWorkflowTriggerScheduleV1,
} from '@/shared/types/lab-workflow-graph';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import type { LabIntegrationServiceCatalogResponse } from '@/shared/types/lab-integration-service-catalog';
import { countIntegrationServices } from '@/shared/utils/lab-workflow-integration-context';
import {
  defaultIntegrationCreateStep,
  defaultIntegrationUpdateStep,
  integrationServiceInWorkflowDesignerPalette,
  listIntegrationWriteServices,
  serviceSupportsConnectorWrite,
} from '@/shared/utils/lab-integration-write-services';
import type { LabRuleRecord } from '@/shared/types/lab-rule';
import type { LabWorkflowGraphSelection } from '@/shared/types/lab-workflow-graph-selection';
import type { LabWorkflowFlowEdge, LabWorkflowFlowNode } from '@/shared/types/lab-workflow-graph-flow';
import type { LabWorkflowRunNodeVisualStatus } from '@/shared/types/lab-workflow-run';
import {
  dedupeLabWorkflowGraphEdges,
  labWorkflowCanvasEdgeLabel,
  labWorkflowGraphEdgesHaveDuplicates,
  normalizeLabWorkflowEdgeBranch,
} from '@/shared/utils/lab-workflow-graph-edge';
import {
  getLabWorkflowFlowEdgeDomain,
  labWorkflowFlowEdgeFromDomain,
  labWorkflowFlowEdgesFromVueFlow,
  labWorkflowFlowEdgesToVueFlow,
  labWorkflowFlowNodeFromDomain,
  labWorkflowFlowNodesFromVueFlow,
  labWorkflowFlowNodesToVueFlow,
  labWorkflowGraphNodeFromFlowState,
} from '@/shared/types/lab-workflow-graph-flow';
import {
  DEFAULT_GROUP_HEIGHT as LAB_WORKFLOW_GROUP_DROP_HEIGHT,
  DEFAULT_GROUP_WIDTH as LAB_WORKFLOW_GROUP_DROP_WIDTH,
  LAB_WORKFLOW_NODE_DROP_HEIGHT,
  LAB_WORKFLOW_NODE_DROP_WIDTH,
} from '@/shared/types/lab-workflow-graph-flow';
import {
  labWorkflowGraphNodeCardHeadline,
  labWorkflowGraphNodeConditionLines,
  labWorkflowGraphNodeKindDisplay,
  labWorkflowGraphNodeLabel,
} from '@/shared/utils/lab-workflow-graph-labels';
import { normalizeWorkflowGroupNode } from '@/shared/utils/lab-workflow-graph-group-normalize';
import { labWorkflowGraphStructureSyncKey } from '@/shared/utils/lab-workflow-graph-structure-sync';
import type { LabWorkflowGraphGroupType } from '@/shared/types/lab-workflow-graph-group';
import {
  WORKFLOW_ACTION_PALETTE,
  defaultStepForActionKind,
} from '@/shared/utils/lab-workflow-definition-canvas';
import { labWorkflowRuleNodeIsConfigured } from '@/shared/utils/lab-workflow-graph-rule-record';
import type {
  WorkflowCanvasActionPaletteBlock,
  WorkflowCanvasEventBlock,
} from '@/shared/types/lab-workflow-canvas';
import type {
  LabWorkflowGraphConnectorWritePaletteBlock,
  LabWorkflowGraphIntegrationDataPaletteBlock,
  LabWorkflowGraphLayoutPaletteBlock,
} from '@/shared/types/lab-workflow-graph-palette';
import LabRuleEventDropZone from '../lab-rules/LabRuleEventDropZone.vue';
import LabWorkflowGraphDropOverlay from './LabWorkflowGraphDropOverlay.vue';
import { groupCatalogEntriesBySource } from '@/shared/services/lab-domain-event-catalog';
import { resolveLabEventPublisherDisplayName } from '@/shared/utils/lab-event-publisher-label';
import LabWorkflowPaletteSection from './LabWorkflowPaletteSection.vue';
import LabWorkflowPaletteAppGroup from './LabWorkflowPaletteAppGroup.vue';
import LabWorkflowCanvasCard from './LabWorkflowCanvasCard.vue';
import LabWorkflowGraphNode from './LabWorkflowGraphNode.vue';
import LabWorkflowGraphGroupNode from './LabWorkflowGraphGroupNode.vue';
import LabWorkflowGraphDetailPanel from './LabWorkflowGraphDetailPanel.vue';
import LabWorkflowGraphArrangeControl from './LabWorkflowGraphArrangeControl.vue';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import { isLabWorkflowDefaultViewport } from '@/shared/utils/lab-workflow-graph-viewport';
import {
  defaultWhenForBranchingSource,
  edgeBranchFromSourceHandle,
} from '@/shared/utils/lab-workflow-graph-branch-handles';
import { paletteCardSubtext } from '@/shared/utils/palette-display-text';
import { fetchLabWorkflowSchedules } from '@/shared/services/platform-lab-workflows.client';
import type { LabWorkflowSchedule } from '@/shared/types/lab-workflow-schedule';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import { useLabWorkflowDesignerSplitter } from '@/shared/composables/lab-workflow-designer/useLabWorkflowDesignerSplitter';
import {
  DEFAULT_GROUP_WIDTH,
  labWorkflowGroupHeightForSlots,
  labWorkflowGroupMemberPosition,
  labWorkflowGroupMemberSize,
  labWorkflowGroupRunStatus,
  labWorkflowGroupSlotCount,
  labWorkflowGroupSlotPosition,
  nextLabWorkflowGroupSlotIndex,
  resolveLabWorkflowGroupDropTarget,
} from '@/shared/utils/lab-workflow-group-slots';

const props = defineProps<{
  modelValue: LabWorkflowDefinitionV2;
  /** Saved workflow id, so the panel can read its runtime schedule rows (phase 34). */
  workflowId?: string | null;
  catalogEntries: LabDomainEventCatalogEntry[];
  integrationServiceCatalog?: LabIntegrationServiceCatalogResponse | null;
  rules: LabRuleRecord[];
  rulesLoading?: boolean;
  labUsers: { label: string; value: number }[];
  adminMode: boolean;
  /** Animated dashed edges along the last test/run path (see Test & run panel). */
  runHighlightEdgeIds?: string[];
  /** Node id → colour state, replayed by the Test & run panel. */
  runNodeStatus?: Record<string, LabWorkflowRunNodeVisualStatus>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: LabWorkflowDefinitionV2];
  'rule-created': [rule: LabRuleRecord];
  /**
   * The author picked a node or an edge.
   *
   * The sidebar is tabbed (Details / Test & run / Logs) and is owned by the **host**, so the canvas
   * cannot bring the Details tab forward itself. Announcing the selection here gives the host one
   * place to react, instead of it inferring intent from the `selection` prop on every render.
   */
  'selection-change': [selection: NonNullable<LabWorkflowGraphSelection>];
}>();

const { generateUniqueId } = useUniqueElementId();
const { panelSizes, layoutReady, onSplitterResizeEnd } = useLabWorkflowDesignerSplitter();

/**
 * `fitView` + `onNodesInitialized` from the VueFlow store rendered below.
 *
 * `useVueFlow()` with no id adopts the store the nearest `<VueFlow>` created, so no id plumbing is
 * needed here.
 *
 * The important part is **waiting for measurement**. These nodes have no explicit `width`/`height`,
 * so Vue Flow measures them with a `ResizeObserver` after render. `nextTick` fires before that, so
 * calling `fitView` there fits stale/zero dimensions and silently leaves the viewport where it was.
 * `onNodesInitialized` is emitted once every node has non-zero dimensions — that is the correct
 * signal to fit against.
 */
const { fitView, setViewport, getNodes, getViewport } = useVueFlow();

const workflowViewportApplyRequest = ref(false);

const WORKFLOW_FIT_VIEW_PADDING = 0.15;

/**
 * `markRaw` on the component definitions, not on the map.
 *
 * Vue Flow copies `node-types` into its own reactive store, which deep-converts the values inside.
 * SFC components are plain objects as far as the reactivity system can tell, so without this Vue
 * logs "received a Component that was made a reactive object" and pays proxy overhead on every
 * render of every node. The map itself must stay plain for Vue Flow to iterate it.
 */
const nodeTypes = {
  trigger: markRaw(LabWorkflowGraphNode),
  condition: markRaw(LabWorkflowGraphNode),
  rule: markRaw(LabWorkflowGraphNode),
  action: markRaw(LabWorkflowGraphNode),
  wfGroup: markRaw(LabWorkflowGraphGroupNode),
} as NodeTypesObject;

const flowNodes = ref<LabWorkflowFlowNode[]>([]);
const flowEdges = ref<LabWorkflowFlowEdge[]>([]);

/** Stable array reference for Vue Flow — do not rebuild via computed on every render (breaks drag). */
const vueFlowNodesRef: ShallowRef<Node[]> = shallowRef([]);

/** Middle + right mouse button pan; left button drags nodes / connects handles. */
const panOnDragMouseButtons = [1, 2];

function publishFlowNodesToVueFlow(): void {
  vueFlowNodesRef.value = labWorkflowFlowNodesToVueFlow(flowNodes.value) as Node[];
}

function setFlowNodes(nodes: LabWorkflowFlowNode[], syncVueFlow = true): void {
  flowNodes.value = nodes;
  if (syncVueFlow && !isDraggingGraphNode.value) {
    publishFlowNodesToVueFlow();
  }
}

const vueFlowEdgesRef: ShallowRef<Edge[]> = shallowRef([]);

function publishFlowEdgesToVueFlow(): void {
  const selectedEdgeId = selection.value?.kind === 'edge' ? selection.value.edgeId : null;
  const runHighlight = new Set(props.runHighlightEdgeIds ?? []);
  vueFlowEdgesRef.value = labWorkflowFlowEdgesToVueFlow(flowEdges.value).map((edge) => ({
    ...edge,
    selected: edge.id === selectedEdgeId,
    animated: runHighlight.has(edge.id),
  })) as Edge[];
}

function syncSelectionHighlight(): void {
  publishFlowEdgesToVueFlow();
}

const selection = ref<LabWorkflowGraphSelection>(null);

/**
 * Groups whose slot rail the author has collapsed.
 *
 * Lives here (not in the definition) because it is a view preference: persisting it would mark the
 * workflow dirty every time someone collapsed a group to see past it, and a reload would then treat a
 * pure UI toggle as a content change. Members of a collapsed group keep their slot positions, so
 * expanding again reveals the same order.
 */
const collapsedGroupIds = ref<ReadonlySet<string>>(new Set<string>());

function setGroupSlotsCollapsed(groupId: string, collapsed: boolean): void {
  const next = new Set(collapsedGroupIds.value);
  if (collapsed) {
    next.add(groupId);
  } else {
    next.delete(groupId);
  }
  collapsedGroupIds.value = next;
  // Re-derive geometry: the group's height follows its slot count, which depends on this flag.
  syncFlowFromDefinition(props.modelValue);
}

function toggleGroupSlotsCollapsed(groupId: string): void {
  setGroupSlotsCollapsed(groupId, !collapsedGroupIds.value.has(groupId));
}

provide('labWorkflowGraphCollapsedGroups', computed(() => collapsedGroupIds.value));
provide('labWorkflowGraphToggleGroupCollapsed', toggleGroupSlotsCollapsed);

/**
 * Announce every new selection to the host.
 *
 * A `watch` rather than an emit at each assignment: selection is set from clicks, palette drops and
 * programmatic node creation, and a per-call emit is exactly the kind of thing that gets missed when
 * a sixth creation path is added. Only non-null transitions are announced — clearing the selection
 * (a pane click) is not a request to show anything.
 */
watch(selection, (next) => {
  if (next) {
    emit('selection-change', next);
  }
});

/** Canvas selection for node chrome — inject into node SFCs so clicks do not rewrite the nodes array. */
const selectedCanvasNodeId = computed(() =>
  selection.value?.kind === 'node' ? selection.value.nodeId : null,
);
provide('labWorkflowGraphSelectedNodeId', selectedCanvasNodeId);

/**
 * Run colouring is injected for the same reason: status must never rewrite the domain graph.
 *
 * Group nodes are folded in here: the runner records a step per **member** and never one for the
 * group, so a group could never be painted by the stream alone. Each group's status is derived from
 * its members, which is also the more truthful thing to show — a group is green only because
 * something inside it succeeded.
 */
provide(
  'labWorkflowGraphRunNodeStatus',
  computed<ReadonlyMap<string, LabWorkflowRunNodeVisualStatus>>(() => {
    const map = new Map<string, LabWorkflowRunNodeVisualStatus>(
      Object.entries(props.runNodeStatus ?? {}),
    );
    const statusById = props.runNodeStatus ?? {};
    for (const node of props.modelValue.nodes) {
      if (node.kind !== 'group') {
        continue;
      }
      const memberIds = props.modelValue.nodes
        .filter(
          (candidate) =>
            (candidate.kind === 'action' || candidate.kind === 'rule')
            && candidate.groupId === node.id,
        )
        .map((member) => member.id);
      const derived = labWorkflowGroupRunStatus(memberIds, statusById);
      if (derived) {
        map.set(node.id, derived as LabWorkflowRunNodeVisualStatus);
      }
    }
    return map;
  }),
);
const isDraggingGraphNode = ref(false);
const loadedGraphStructureKey = ref('');
const flowDropPaneRef = useTemplateRef<InstanceType<typeof LabWorkflowGraphDropOverlay>>('flowDropPaneRef');
const lastDropPointer = ref({ x: 0, y: 0 });

const flowViewport = ref<ViewportTransform>({
  x: props.modelValue.viewport?.x ?? 0,
  y: props.modelValue.viewport?.y ?? 0,
  zoom: props.modelValue.viewport?.zoom ?? 1,
});

/** Vue Flow reads `default-viewport` on prop changes — keep stable while editing (not tied to v-model echo). */
const vueFlowInitialViewport = ref<ViewportTransform>({
  x: props.modelValue.viewport?.x ?? 0,
  y: props.modelValue.viewport?.y ?? 0,
  zoom: props.modelValue.viewport?.zoom ?? 1,
});

interface PaletteDropSize {
  width: number;
  height: number;
}

const defaultPaletteDropSize: PaletteDropSize = {
  width: LAB_WORKFLOW_NODE_DROP_WIDTH,
  height: LAB_WORKFLOW_NODE_DROP_HEIGHT,
};

const groupPaletteDropSize: PaletteDropSize = {
  width: LAB_WORKFLOW_GROUP_DROP_WIDTH,
  height: LAB_WORKFLOW_GROUP_DROP_HEIGHT,
};

const graphDropZoneItems = shallowRef<['workflow-graph-canvas']>(['workflow-graph-canvas']);

const layoutPaletteBlocks = shallowRef<LabWorkflowGraphLayoutPaletteBlock[]>([
  {
    dragId: 'wf-graph-layout-condition',
    layoutKind: 'condition',
    label: 'Condition',
    description: 'Branch on Yes/No rules',
    isPalette: true,
  },
  {
    dragId: 'wf-graph-layout-new-rule',
    layoutKind: 'new_rule',
    label: 'New rule node',
    description: 'Create a library rule and link it here',
    isPalette: true,
  },
  {
    dragId: 'wf-graph-layout-group',
    layoutKind: 'group',
    label: 'Action group',
    description: 'Group actions with run order and failure options',
    isPalette: true,
  },
  {
    dragId: 'wf-graph-layout-rule-group',
    layoutKind: 'rule_group',
    label: 'Rule group',
    description: 'Group rule nodes with combine options',
    isPalette: true,
  },
  {
    dragId: 'wf-graph-layout-schedule-trigger',
    layoutKind: 'schedule_trigger',
    label: 'Schedule trigger',
    description: 'Start this workflow on a clock pattern instead of an event',
    isPalette: true,
  },
]);

/**
 * Runtime schedule rows for the open workflow (phase 34).
 *
 * Read, never written, from here: the schedule is authored on the trigger node and persisted by the
 * workflow save, so this exists only to show the author *when* it will next fire. Refetched when a
 * workflow is saved (the dialog reopens with a new id) rather than polled — a stale "next run" for a
 * few seconds is harmless; a stale pattern is what the single-source-of-truth rule prevents.
 */
const workflowSchedules = ref<LabWorkflowSchedule[]>([]);
const workflowSchedulesLoading = ref(false);

async function refreshWorkflowSchedules(): Promise<void> {
  if (!props.workflowId) {
    workflowSchedules.value = [];
    return;
  }
  workflowSchedulesLoading.value = true;
  try {
    workflowSchedules.value = await fetchLabWorkflowSchedules(props.workflowId);
  } catch {
    // A read failure must not break the designer: the graph still edits and saves, and the panel
    // simply reports "no stored row yet" rather than claiming a next run it cannot know.
    workflowSchedules.value = [];
  } finally {
    workflowSchedulesLoading.value = false;
  }
}

onMounted(() => {
  void refreshWorkflowSchedules();
});

watch(
  () => props.workflowId,
  () => {
    void refreshWorkflowSchedules();
  },
);

const eventPaletteBlocks = shallowRef<WorkflowCanvasEventBlock[]>([]);
const actionPaletteBlocks = shallowRef<WorkflowCanvasActionPaletteBlock[]>([]);
const integrationDataPaletteBlocks = shallowRef<LabWorkflowGraphIntegrationDataPaletteBlock[]>([]);
const connectorWritePaletteBlocks = shallowRef<LabWorkflowGraphConnectorWritePaletteBlock[]>([]);
let syncingFromParent = false;

const triggerEventType = computed(() => {
  const trigger = props.modelValue.nodes.find((n) => n.kind === 'trigger');
  return trigger?.kind === 'trigger' ? trigger.eventType : '';
});

const integrationServiceCount = computed(() =>
  countIntegrationServices(props.integrationServiceCatalog),
);

const integrationWriteServices = computed(() =>
  listIntegrationWriteServices(props.integrationServiceCatalog),
);

const integrationAppNameById = computed(() => {
  const map = new Map<string, string>();
  for (const group of props.integrationServiceCatalog?.apps ?? []) {
    map.set(group.appId, group.appName);
  }
  return map;
});

const catalogEventGroups = computed(() => groupCatalogEntriesBySource(props.catalogEntries));

const connectorWriteGroups = computed(() => {
  const map = new Map<string, { appName: string; services: (typeof integrationWriteServices.value)[number][] }>();
  for (const service of integrationWriteServices.value) {
    const existing = map.get(service.providerAppId);
    if (existing) {
      existing.services.push(service);
    } else {
      map.set(service.providerAppId, { appName: service.appName, services: [service] });
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[1].appName.localeCompare(b[1].appName))
    .map(([appId, group]) => ({ appId, appName: group.appName, services: group.services }));
});

function eventAppDisplayName(sourceAppId: string): string {
  return resolveLabEventPublisherDisplayName(sourceAppId, integrationAppNameById.value);
}

function eventPaletteIndexForType(eventType: string): number {
  return eventPaletteBlocks.value.findIndex((block) => block.eventType === eventType);
}

function eventPaletteDragId(eventType: string): string {
  return eventPaletteBlocks.value.find((block) => block.eventType === eventType)?.dragId ?? eventType;
}

function integrationDataPaletteIndex(providerAppId: string, serviceId: string): number {
  return integrationDataPaletteBlocks.value.findIndex(
    (block) => block.providerAppId === providerAppId && block.serviceId === serviceId,
  );
}

function connectorWritePaletteIndex(dragId: string): number {
  return connectorWritePaletteBlocks.value.findIndex((block) => block.dragId === dragId);
}

function addIntegrationAction(
  mode: 'create' | 'update',
  ref: (typeof integrationWriteServices.value)[number],
  position?: { x: number; y: number },
): void {
  const id = crypto.randomUUID();
  const step =
    mode === 'create'
      ? defaultIntegrationCreateStep(ref)
      : defaultIntegrationUpdateStep(ref);
  const node: LabWorkflowGraphNodeV2 = {
    id,
    kind: 'action',
    position: position ?? { x: 200 + Math.random() * 60, y: 120 + props.modelValue.nodes.length * 40 },
    step,
  };
  patchDefinition((def) => ({ ...def, nodes: [...def.nodes, node] }));
  selection.value = { kind: 'node', nodeId: id };
}

function addLookupConditionFromService(
  block: LabWorkflowGraphIntegrationDataPaletteBlock,
  position: { x: number; y: number },
): void {
  const group = props.integrationServiceCatalog?.apps.find((app) => app.appId === block.providerAppId);
  const service = group?.services.find((item) => item.serviceId === block.serviceId);
  const field = service?.properties?.[0]?.name ?? 'id';
  const id = crypto.randomUUID();
  const node: LabWorkflowGraphNodeV2 = {
    id,
    kind: 'condition',
    position,
    conditions: [
      {
        kind: 'lookup_field_exists',
        providerAppId: block.providerAppId,
        serviceId: block.serviceId,
        recordIdPath: 'id',
        field,
      },
    ],
  };
  patchDefinition((def) => ({ ...def, nodes: [...def.nodes, node] }));
  selection.value = { kind: 'node', nodeId: id };
}

function rebuildIntegrationPaletteBlocks(): void {
  const dataBlocks: LabWorkflowGraphIntegrationDataPaletteBlock[] = [];
  const writeBlocks: LabWorkflowGraphConnectorWritePaletteBlock[] = [];
  for (const group of props.integrationServiceCatalog?.apps ?? []) {
    for (const service of group.services) {
      if (!integrationServiceInWorkflowDesignerPalette(service)) {
        continue;
      }
      dataBlocks.push({
        dragId: `wf-graph-int-data-${group.appId}-${service.serviceId}`,
        providerAppId: group.appId,
        serviceId: service.serviceId,
        label: service.label,
        description: service.description ?? '',
        isPalette: true,
      });
      if (serviceSupportsConnectorWrite(service.capabilities)) {
        writeBlocks.push(
          {
            dragId: `wf-graph-int-create-${group.appId}-${service.serviceId}`,
            mode: 'create',
            providerAppId: group.appId,
            serviceId: service.serviceId,
            label: `Create · ${service.label}`,
            description: '',
            isPalette: true,
          },
          {
            dragId: `wf-graph-int-update-${group.appId}-${service.serviceId}`,
            mode: 'update',
            providerAppId: group.appId,
            serviceId: service.serviceId,
            label: `Update · ${service.label}`,
            description: '',
            isPalette: true,
          },
        );
      }
    }
  }
  integrationDataPaletteBlocks.value = dataBlocks;
  connectorWritePaletteBlocks.value = writeBlocks;
}

/**
 * Group members ordered by their **slot position**, top to bottom.
 *
 * Order comes from the saved `y` rather than array order because that is what the author sees: a
 * member dragged into slot 0 must read first even if it was appended to the nodes array last. The id
 * tiebreak keeps the order deterministic for members that share a y (a graph authored before slots).
 */
function orderedGroupMembers(
  def: LabWorkflowDefinitionV2,
  groupId: string,
): LabWorkflowGraphNodeV2[] {
  return def.nodes
    .filter(
      (node) =>
        (node.kind === 'action' || node.kind === 'rule')
        && node.groupId === groupId,
    )
    .sort((a, b) => {
      const dy = a.position.y - b.position.y;
      if (Math.abs(dy) > 0.5) {
        return dy;
      }
      return a.id.localeCompare(b.id);
    });
}

/**
 * Where a member is **rendered**: its slot index in the group's rail.
 *
 * This is a projection, not a stored value. Deriving it means a member cannot be drawn anywhere but
 * its slot, which is what makes "snap back" true rather than best-effort: the earlier implementation
 * wrote a position on drop and then competed with the parent's `v-model` re-sync, so the stored point
 * won and the node stayed wherever the pointer left it.
 */
function memberSlotIndex(
  def: LabWorkflowDefinitionV2,
  groupId: string,
  nodeId: string,
): number {
  return orderedGroupMembers(def, groupId).findIndex((node) => node.id === nodeId);
}

function domainToFlow(def: LabWorkflowDefinitionV2): {
  nodes: LabWorkflowFlowNode[];
  edges: LabWorkflowFlowEdge[];
} {
  const graphLabelOptions = {
    catalogEntries: props.catalogEntries,
    rules: props.rules,
    integrationServiceCatalog: props.integrationServiceCatalog,
  };
  /*
   * Group geometry first, because a member's rendered position depends on its group's slot count.
   *
   * The height is derived (not read from the node) so adding a member expands the card without any
   * write: the count changes, the next render is taller, and there is no second code path that could
   * compute a different height.
   */
  const groupGeometry = new Map<string, { height: number; slotCount: number }>();
  const collapsedGroups = collapsedGroupIds.value;
  for (const node of def.nodes) {
    if (node.kind !== 'group') {
      continue;
    }
    const memberCount = orderedGroupMembers(def, node.id).length;
    const collapsed = collapsedGroups.has(node.id);
    const slotCount = collapsed ? 0 : labWorkflowGroupSlotCount(memberCount);
    groupGeometry.set(node.id, {
      /*
       * **Always the expanded height**, even while collapsed.
       *
       * `buildDefinitionFromFlow` writes this projected height back into the definition, and the schema
       * requires `height >= 120`. The collapsed height (92) therefore failed validation on save with
       * `nodes[10].height: too small`, blocking the whole workflow from being saved.
       *
       * Collapse is a view preference, so it must not be persisted at all: the shorter card comes from
       * the `--collapsed` CSS class, which shrinks the visual box without touching the stored number.
       */
      height: labWorkflowGroupHeightForSlots(labWorkflowGroupSlotCount(memberCount)),
      slotCount,
    });
  }

  const nodes: LabWorkflowFlowNode[] = def.nodes
    .map((domainNode) => {
    const conditionLines = labWorkflowGraphNodeConditionLines(domainNode, graphLabelOptions);
    const headline = conditionLines.length
      ? labWorkflowGraphNodeCardHeadline(domainNode, graphLabelOptions)
      : undefined;
    const flowNode = labWorkflowFlowNodeFromDomain(domainNode, {
      node: domainNode,
      label: labWorkflowGraphNodeLabel(domainNode, graphLabelOptions),
      headline,
      conditionLines: conditionLines.length ? conditionLines : undefined,
      kindLabel: labWorkflowGraphNodeKindDisplay(domainNode, graphLabelOptions),
      showRuleSetupWarning: domainNode.kind === 'rule' && !labWorkflowRuleNodeIsConfigured(domainNode),
    });

    if (domainNode.kind === 'group') {
      const geometry = groupGeometry.get(domainNode.id);
      if (!geometry) {
        return flowNode;
      }
      return {
        ...flowNode,
        style: { width: `${domainNode.width ?? LAB_WORKFLOW_GROUP_DROP_WIDTH}px`, height: `${geometry.height}px` },
        data: {
          ...flowNode.data,
          node: { ...domainNode, height: geometry.height },
          groupSlotCount: geometry.slotCount,
          groupMemberCount: orderedGroupMembers(def, domainNode.id).length,
        },
      };
    }

    const groupId =
      (domainNode.kind === 'action' || domainNode.kind === 'rule') && domainNode.groupId
        ? domainNode.groupId
        : null;
    if (!groupId || !groupGeometry.has(groupId)) {
      return flowNode;
    }
    /*
     * A collapsed group hides its members.
     *
     * Leaving them visible would draw them outside the shortened card — the card collapsed but its
     * contents did not — and moving them would rewrite the order the author left. Hiding is the only
     * reading of "collapse" that is both honest and reversible: saved offsets are untouched, so
     * expanding restores exactly the same rail.
     */
    if (collapsedGroups.has(groupId)) {
      // `null` filters the node out of the canvas entirely. `hidden: true` is not enough for a
      // parented node: Vue Flow still measures and positions it, so it can reappear as a stray card
      // outside the shortened group.
      return null;
    }
    const index = memberSlotIndex(def, groupId, domainNode.id);
    const groupNode = props.modelValue.nodes.find((node) => node.id === groupId);
    const groupWidth =
      groupNode?.kind === 'group' && groupNode.width ? groupNode.width : DEFAULT_GROUP_WIDTH;
    const memberSize = labWorkflowGroupMemberSize(groupWidth);
    return {
      ...flowNode,
      // Centred both axes inside the band, using the card's computed footprint rather than an assumed one.
      position: labWorkflowGroupMemberPosition(Math.max(0, index), groupWidth),
      style: {
        ...flowNode.style,
        width: `${memberSize.width}px`,
        height: `${memberSize.height}px`,
      },
    };
  })
    .filter((node): node is LabWorkflowFlowNode => node !== null);
  const nodeById = new Map(def.nodes.map((node) => [node.id, node]));
  // Dedupe on read as well as on write. A row persisted before the save path healed duplicates would
  // otherwise draw one line while the details panel lists two, and the shadowed entry could never be
  // selected to delete it. Showing one edge here makes the canvas match what the graph actually is.
  const edges: LabWorkflowFlowEdge[] = dedupeLabWorkflowGraphEdges(def.edges).edges.map((edge) =>
    labWorkflowFlowEdgeFromDomain(
      edge,
      labWorkflowCanvasEdgeLabel(edge, nodeById.get(edge.source)),
      false,
      nodeById.get(edge.source),
    ),
  );
  return { nodes, edges };
}

/**
 * Nodes the author has explicitly detached from a group, by node id.
 *
 * ## Why this exists
 *
 * `buildDefinitionFromFlow` derives a member's `groupId` from the Vue Flow node's `parentNode`. Vue
 * Flow keeps that field internally and merges incoming nodes by id, so clearing containment on our
 * copy left the store's `parentNode` intact — every later build then read it back and **re-joined the
 * node to the group**. That is why dragging a child out moved it and yet the group still listed it.
 *
 * An explicit override is used rather than fighting the store: it is the one piece of containment
 * state the canvas owns outright, so it cannot be resurrected by a merge.
 */
const releasedMemberIds = ref<ReadonlySet<string>>(new Set<string>());

function setMemberReleased(nodeId: string, released: boolean): void {
  const next = new Set(releasedMemberIds.value);
  if (released) {
    next.add(nodeId);
  } else {
    next.delete(nodeId);
  }
  releasedMemberIds.value = next;
}

function currentFlowNodesFromVue(): LabWorkflowFlowNode[] {
  const detached = releasedMemberIds.value;
  const storeNodes = getNodes.value;
  if (storeNodes.length > 0) {
    return labWorkflowFlowNodesFromVueFlow(storeNodes, detached);
  }
  if (vueFlowNodesRef.value.length > 0) {
    return labWorkflowFlowNodesFromVueFlow(vueFlowNodesRef.value, detached);
  }
  return flowNodes.value;
}

/**
 * Keep dragged geometry when the parent echoes a structural patch with stale saved positions.
 *
 * Group members are **excluded**: their position is derived from slot order on every projection, so
 * copying a live drag offset back into the definition would be overwritten on the next render and, in
 * between, would look like the node had escaped the rail. Their offsets are written exactly once, when
 * membership changes (`moveNodeIntoGroup`).
 */
function mergeCanvasPositionsIntoDefinition(def: LabWorkflowDefinitionV2): LabWorkflowDefinitionV2 {
  const live = currentFlowNodesFromVue();
  if (live.length === 0) {
    return def;
  }
  const memberIds = new Set(
    def.nodes
      .filter(
        (node) =>
          (node.kind === 'action' || node.kind === 'rule')
          && Boolean(node.groupId),
      )
      .map((node) => node.id),
  );
  const positionById = new Map(
    live
      .filter((node) => !memberIds.has(node.id))
      .map((node) => [node.id, node.position]),
  );
  return {
    ...def,
    nodes: def.nodes.map((node) => {
      const position = positionById.get(node.id);
      if (!position) {
        return node;
      }
      return { ...node, position: { x: position.x, y: position.y } };
    }),
  };
}

function buildDefinitionFromFlow(): LabWorkflowDefinitionV2 {
  const flowNodeList = currentFlowNodesFromVue();
  flowNodes.value = flowNodeList;
  const nodes: LabWorkflowGraphNodeV2[] = props.modelValue.nodes.map((domainNode) => {
    const flowNode = flowNodeList.find((n) => n.id === domainNode.id);
    return labWorkflowGraphNodeFromFlowState(domainNode, flowNode);
  });
  const flowEdgeList = flowEdges.value;
  const vueEdgeById = new Map(vueFlowEdgesRef.value.map((edge) => [edge.id, edge]));
  const nodeById = new Map(
    props.modelValue.nodes.map((domainNode) => {
      const flowNode = flowNodeList.find((n) => n.id === domainNode.id);
      return [domainNode.id, labWorkflowGraphNodeFromFlowState(domainNode, flowNode)];
    }),
  );
  const mappedEdges: LabWorkflowGraphEdgeV2[] = flowEdgeList.map((flowEdge) => {
    const existing = props.modelValue.edges.find((e) => e.id === flowEdge.id);
    const domainEdge = getLabWorkflowFlowEdgeDomain(flowEdge);
    const sourceNode = nodeById.get(flowEdge.source);
    const vueEdge = vueEdgeById.get(flowEdge.id);
    const fromHandle = edgeBranchFromSourceHandle(
      sourceNode,
      vueEdge?.sourceHandle ?? flowEdge.sourceHandle,
    );
    // A stored `when` beats the handle. The handle is a *rendering* of the branch, derived from the
    // edge — so letting it win means "Run this branch when" can never change an existing edge: the
    // panel writes `when`, the canvas re-derives it from the old port, and the edit reverts. A brand
    // new connection has no `domainEdge`, so drawing still decides the branch from the handle.
    const when =
      domainEdge?.when ?? fromHandle.when ?? existing?.when
      ?? (sourceNode ? defaultWhenForBranchingSource(sourceNode) : 'always');
    return {
      id: flowEdge.id,
      source: flowEdge.source,
      target: flowEdge.target,
      when,
      outputIndex: fromHandle.outputIndex ?? domainEdge?.outputIndex ?? existing?.outputIndex,
      label: domainEdge?.label ?? existing?.label,
    };
  });
  const normalizedEdges = mappedEdges.map((edge) =>
    normalizeLabWorkflowEdgeBranch(nodeById.get(edge.source), edge),
  );
  // Heal duplicates on save: an edge whose id is repeated has a twin the canvas can never select,
  // so leaving it in the definition means the author cannot delete it from the UI at all.
  const edges = dedupeLabWorkflowGraphEdges(normalizedEdges).edges;
  const vp = getViewport();
  return {
    ...props.modelValue,
    nodes,
    edges,
    viewport: {
      x: vp.x,
      y: vp.y,
      zoom: vp.zoom,
    },
  };
}

/** Latest graph layout from the canvas (for save without relying on a prior v-model emit). */
function exportGraphDefinition(): LabWorkflowDefinitionV2 {
  return buildDefinitionFromFlow();
}

defineExpose({ exportGraphDefinition });

function emitDefinition(): void {
  if (syncingFromParent) {
    return;
  }
  emit('update:modelValue', buildDefinitionFromFlow());
}

function syncFlowFromDefinition(def: LabWorkflowDefinitionV2): void {
  syncingFromParent = true;
  const mapped = domainToFlow(mergeCanvasPositionsIntoDefinition(def));
  setFlowNodes(mapped.nodes);
  flowEdges.value = mapped.edges;
  publishFlowEdgesToVueFlow();
  const vp = def.viewport ?? { x: 0, y: 0, zoom: 1 };
  vueFlowInitialViewport.value = { x: vp.x, y: vp.y, zoom: vp.zoom };
  flowViewport.value = { x: vp.x, y: vp.y, zoom: vp.zoom };
  syncingFromParent = false;
  workflowViewportApplyRequest.value = true;
}

function onFlowNodesInitialized(): void {
  if (!workflowViewportApplyRequest.value) {
    return;
  }
  workflowViewportApplyRequest.value = false;

  if (isLabWorkflowDefaultViewport(props.modelValue.viewport)) {
    void fitView({ padding: WORKFLOW_FIT_VIEW_PADDING, duration: 0 });
    return;
  }

  const saved = props.modelValue.viewport;
  if (saved) {
    void setViewport({ x: saved.x, y: saved.y, zoom: saved.zoom }, { duration: 0 });
  }
}

watch(
  () => props.modelValue,
  (def) => {
    if (isDraggingGraphNode.value) {
      return;
    }
    const structureKey = labWorkflowGraphStructureSyncKey(def);
    if (structureKey === loadedGraphStructureKey.value) {
      // Structure unchanged: keep canvas positions (unsaved drags). Parent v-model echoes must not
      // reset Vue Flow — selection clicks and panel edits only patch content via buildDefinitionFromFlow.
      return;
    }
    loadedGraphStructureKey.value = structureKey;
    syncFlowFromDefinition(def);
    // Repair on open. A row stored with duplicate edges cannot be fixed from the canvas (the twin has
    // no selectable handle), so leaving it until the author happens to save strands it indefinitely.
    // Emitting the healed graph here makes the next normal save persist the repair. It converges: the
    // echo is already duplicate-free, so this branch does not fire again.
    if (labWorkflowGraphEdgesHaveDuplicates(def.edges)) {
      emitDefinition();
    }
  },
  { immediate: true, deep: true },
);

watch(
  () => props.catalogEntries,
  (entries) => {
    const list = Array.isArray(entries) ? entries : [];
    eventPaletteBlocks.value = list.map((entry) => ({
      dragId: `wf-graph-palette-event-${entry.eventType}`,
      eventType: entry.eventType,
      label: entry.label,
      description: entry.description,
      isPalette: true,
    }));
  },
  { immediate: true, deep: true },
);

watch(
  () => props.integrationServiceCatalog,
  () => {
    rebuildIntegrationPaletteBlocks();
  },
  { immediate: true, deep: true },
);

watch(
  () => WORKFLOW_ACTION_PALETTE,
  () => {
    actionPaletteBlocks.value = WORKFLOW_ACTION_PALETTE.map((action) => ({
      dragId: `wf-graph-palette-action-${action.kind}`,
      kind: action.kind,
      label: action.label,
      description: action.description,
      isPalette: true,
    }));
  },
  { immediate: true },
);

watch(
  () => props.runHighlightEdgeIds,
  () => {
    publishFlowEdgesToVueFlow();
  },
  { deep: true },
);

function patchDefinition(mutator: (def: LabWorkflowDefinitionV2) => LabWorkflowDefinitionV2): void {
  emit('update:modelValue', mutator(buildDefinitionFromFlow()));
}

function autoArrangeCanvas(): void {
  const current = buildDefinitionFromFlow();
  const nodes = autoArrangeLabWorkflowGraph(current);
  const nextDef: LabWorkflowDefinitionV2 = { ...current, nodes };
  syncingFromParent = true;
  const mapped = domainToFlow(nextDef);
  setFlowNodes(mapped.nodes, true);
  publishFlowEdgesToVueFlow();
  syncingFromParent = false;
  emit('update:modelValue', nextDef);
  void nextTick(() => {
    void fitView({ padding: WORKFLOW_FIT_VIEW_PADDING, duration: 200 }).then(() => {
      emitDefinition();
    });
  });
}

function isIgnorableNodeChange(change: NodeChange): boolean {
  if (change.type === 'select' || change.type === 'dimensions') {
    return true;
  }
  if (change.type === 'position') {
    // Only completed drags persist to the workflow model; selection can emit stale positions.
    return change.dragging !== false;
  }
  return false;
}

function onNodesChange(changes: NodeChange[]): void {
  const positionDragging = changes.some(
    (change) => change.type === 'position' && change.dragging === true,
  );
  const positionDragEnded = changes.some(
    (change) => change.type === 'position' && change.dragging === false,
  );
  /*
   * **Mid-drag: do nothing but record that a drag is happening.**
   *
   * Vue Flow owns the node transform during a drag — it applies it to the DOM itself and emits a
   * `position` change per frame purely so consumers can observe progress. The previous code rebuilt
   * every node object and then reassigned `vueFlowNodesRef` (the array bound to `<VueFlow>`) on each of
   * those frames, which forced Vue Flow to re-render the whole graph while it was also moving a node.
   * Dragging a group was worst: its children keep live transforms of their own, so every frame also
   * re-rendered them.
   *
   * The final position is captured at drag-end by `onNodeDragStop` and on the `dragging: false` change
   * below, so nothing is lost by skipping the intermediate frames.
   */
  if (positionDragging) {
    isDraggingGraphNode.value = true;
    return;
  }

  const next = applyNodeChanges(
    changes,
    vueFlowNodesRef.value as Parameters<typeof applyNodeChanges>[1],
  ) as Node[];
  flowNodes.value = labWorkflowFlowNodesFromVueFlow(next);
  vueFlowNodesRef.value = next;
  if (positionDragEnded) {
    void nextTick(() => {
      isDraggingGraphNode.value = false;
      /*
       * Suppressed while a membership drop is in flight.
       *
       * Vue Flow emits the final position change **after** `node-drag`/`node-drag-stop`, so this
       * `emitDefinition()` ran *after* the drop handler had decided to join a group — and rebuilt the
       * definition from the live flow, which has no `groupId` (containment is decided by the drop, not
       * by the store). The join was therefore written and then silently overwritten by a definition
       * without it: the badge stayed at 0 and the node was never a member.
       */
      if (membershipDropPending) {
        return;
      }
      emitDefinition();
    });
    return;
  }
  if (isDraggingGraphNode.value) {
    return;
  }
  if (changes.every((change) => isIgnorableNodeChange(change))) {
    return;
  }
  emitDefinition();
}

function onEdgesChange(changes: EdgeChange[]): void {
  const next = applyEdgeChanges(
    changes,
    labWorkflowFlowEdgesToVueFlow(flowEdges.value) as Parameters<typeof applyEdgeChanges>[1],
  ) as Edge[];
  flowEdges.value = labWorkflowFlowEdgesFromVueFlow(next);
  vueFlowEdgesRef.value = next;
  emitDefinition();
}

function onNodeDragStart(): void {
  isDraggingGraphNode.value = true;
}

/**
 * Set while a drop is deciding whether the node changed group.
 *
 * `onNodesChange` fires its own `emitDefinition()` for the final position change, and Vue Flow
 * dispatches that **after** `node-drag-stop`. On a membership-changing drop that trailing emit
 * rebuilt a definition with no `groupId` and erased the join. This flag lets the drop handler be the
 * last writer for that one interaction.
 */
let membershipDropPending = false;

function beginMembershipDrop(): void {
  membershipDropPending = true;
  // Cleared on the next macrotask: Vue Flow's position change arrives within the same tick window.
  window.setTimeout(() => {
    membershipDropPending = false;
  }, 0);
}

/**
 * Where a dragged node's centre currently is, in **canvas** coordinates.
 *
 * `draggedCentre` is tracked from the drag event because Vue Flow has already applied the drag;
 * reading the node back out of the store races the `computedPosition` recompute and can hand back the
 * previous frame's point, which is how a drop one slot away landed in the wrong slot.
 */
let draggedCentre: { x: number; y: number } | null = null;

function nodeCentreFromFlowEvent(event: { node: { id: string } }): { x: number; y: number } | null {
  const live = getNodes.value.find((node) => node.id === event.node.id);
  const graphNode = live as GraphNode | undefined;
  const pos = graphNode?.computedPosition ?? graphNode?.position;
  if (!pos) {
    return null;
  }
  const dimensions = (graphNode as { dimensions?: { width?: number; height?: number } } | undefined)
    ?.dimensions;
  return {
    x: pos.x + (dimensions?.width ?? LAB_WORKFLOW_NODE_DROP_WIDTH) / 2,
    y: pos.y + (dimensions?.height ?? LAB_WORKFLOW_NODE_DROP_HEIGHT) / 2,
  };
}

/**
 * Group the pointer is currently over, for the drop-target highlight.
 *
 * There was no indicator at all before this: the only drop highlight in the app belongs to
 * `LabWorkflowGraphDropOverlay`, which covers **palette** drags. A user dragging an existing node had
 * no signal about whether the group would accept it, which is exactly the ambiguity that makes a drop
 * feel broken even when it lands.
 */
const dragOverGroupId = ref<string | null>(null);

/**
 * Do the per-frame work at most once per frame, and only while a highlight can change.
 *
 * `node-drag` fires on every pointer move, often several times per frame. The previous version ran
 * `find` over the store **and** the definition, then a member-count filter per group, on every one of
 * those events — which is what made dragging a group choppy: the group drag is the case where the most
 * nodes update at once, and it was doing the most redundant work at the same time.
 *
 * The drag centre is still recorded every event (cheap), because the drop needs the freshest point.
 * Only the *highlight* decision is throttled, since it can change at most once per frame anyway.
 */
let dragHighlightFrame = 0;

function onNodeDrag(event: { node: { id: string } }): void {
  draggedCentre = nodeCentreFromFlowEvent(event);
  /*
   * A dragged **group** carries its children by `computedPosition`, which Vue Flow recomputes from the
   * parent's live position — so members follow without any work from us. Their stored `position` stays
   * an offset, and `onNodeDragStop` writes the group's final position once.
   *
   * Nothing else is needed per frame: no node rebuild, no definition emit. Only the highlight decision
   * is throttled to an animation frame, because it can change at most once per frame anyway.
   */
  if (dragHighlightFrame !== 0) {
    return;
  }
  const nodeId = event.node.id;
  dragHighlightFrame = window.requestAnimationFrame(() => {
    dragHighlightFrame = 0;
    updateDragHighlight(nodeId);
  });
}

function updateDragHighlight(nodeId: string): void {
  const centre = draggedCentre;
  const domainNode = props.modelValue.nodes.find((node) => node.id === nodeId);
  const candidate = centre && domainNode
    && (domainNode.kind === 'action' || domainNode.kind === 'rule')
    ? resolveLabWorkflowGroupDropTarget(
        props.modelValue.nodes,
        centre,
        domainNode.kind === 'rule' ? 'rule' : 'action',
      )
    : null;

  // Bail before touching reactive state: an unchanged answer must not trigger a re-render.
  const nextId = candidate?.groupId ?? null;
  if (nextId === dragOverGroupId.value) {
    return;
  }
  setDragOverGroup(nextId);
}

/**
 * Highlight state lives in its own set of node ids rather than mutating domain nodes.
 *
 * Vue Flow re-renders a node when its `data` changes, so flagging the group through its data would
 * rewrite the workflow model on every pointer move — the exact "hover dirties the graph" problem the
 * run-status map was already injected to avoid.
 */
const dragOverGroupIds = ref<ReadonlySet<string>>(new Set<string>());

function setDragOverGroup(groupId: string | null): void {
  dragOverGroupId.value = groupId;
  dragOverGroupIds.value = groupId ? new Set([groupId]) : new Set<string>();
}

provide('labWorkflowGraphDragOverGroupIds', computed(() => dragOverGroupIds.value));

/**
 * Reparent a node on drop — into a group, out of one, or back to the slot it came from.
 *
 * ## Why the drop is the authority
 *
 * `parentNode` is a Vue Flow **structural** field: setting it from the details panel (the only route
 * available before this) leaves the canvas to guess where the child belongs, and Vue Flow's own
 * drag-into-parent is not wired for a custom container node type. Deciding containment here means
 * one rule for all three cases:
 *
 * - over a group that accepts the kind **and** it is not already a member → join, take a free slot;
 * - over no group (or a group that rejects the kind) while already a member → leave the group,
 *   adopting its absolute position so the node does not teleport;
 * - otherwise → snap to the nearest slot, which is the "invalid drop returns to its slot" behaviour.
 */
function onNodeDragStop(event: { node: { id: string } }): void {
  const nodeId = event.node.id;
  /*
   * Read the drag's final position from Vue Flow's store, not `flowNodes`.
   *
   * `onNodesChange` now skips its rebuild for the frames of a drag (that rebuild was what made a group
   * drag choppy), so `flowNodes` deliberately lags until drag-end. The store is authoritative for the
   * position the user actually released at.
   */
  const liveNode = getNodes.value.find((node) => node.id === nodeId) as GraphNode | undefined;
  const releasedPosition =
    liveNode?.position ?? flowNodes.value.find((node) => node.id === nodeId)?.position;
  /*
   * Read membership from the **live definition**, not `props.modelValue`.
   *
   * `props` only updates after the parent re-renders following an emit. After the user's first drop
   * (or any pending edit), props still describe the previous graph — so `groupId` and even the node
   * list could be stale, and the hit-test compared against groups the user had already changed. The
   * build is the single source of truth for what the canvas currently shows.
   */
  const liveDef = buildDefinitionFromFlow();
  const domainNode = liveDef.nodes.find((node) => node.id === nodeId);
  const isMember = domainNode?.kind === 'action' || domainNode?.kind === 'rule';
  /*
   * The **fresh** read wins. `draggedCentre` is only a fallback for the case where the store has not
   * published a position yet.
   *
   * It used to be the other way round, which broke dropping into a group entirely: `node-drag` fires
   * per frame, so the cached centre could be a frame (or a whole flick, on a fast drag) behind the
   * release point. The hit-test then used a point the user had already dragged away from, and the drop
   * fell outside the group. The drag-stop event carries the final position, so it must be preferred.
   */
  const centre = nodeCentreFromFlowEvent(event) ?? draggedCentre;
  draggedCentre = null;
  setDragOverGroup(null);

  if (!releasedPosition || !domainNode || !isMember || !centre) {
    void nextTick(() => {
      isDraggingGraphNode.value = false;
    });
    return;
  }

  const memberKind = domainNode.kind === 'rule' ? 'rule' : 'action';
  const target = resolveLabWorkflowGroupDropTarget(liveDef.nodes, centre, memberKind);
  const currentGroupId = domainNode.groupId ?? null;

  if (target && target.groupId !== currentGroupId) {
    beginMembershipDrop();
    moveNodeIntoGroup(nodeId, target.groupId);
    return;
  }

  if (!target && currentGroupId) {
    beginMembershipDrop();
    leaveGroup(nodeId, releasedPosition);
    return;
  }

  if (target && currentGroupId) {
    /*
     * A drop that stays inside the group settles back into the slot the member already had.
     *
     * `emitDefinition()` alone is **not** enough: the parent echoes an unchanged definition, and the
     * structural-sync key ignores positions, so the canvas kept the drag offset the pointer left
     * behind. Re-projecting is what actually returns the card to its slot.
     */
    snapBackToProjection();
    return;
  }

  void nextTick(() => {
    isDraggingGraphNode.value = false;
  });
}

/**
 * Put the canvas back in sync with the definition.
 *
 * Called after any drop whose outcome is "the stored graph did not change". Without it the DOM keeps
 * whatever position the drag produced — the definition is right and the canvas is wrong, which is
 * exactly the "it does not snap back" symptom.
 */
function snapBackToProjection(): void {
  void nextTick(() => {
    isDraggingGraphNode.value = false;
    /*
     * `syncFlowFromDefinition` re-runs `domainToFlow`, which recomputes every member's slot position
     * and republishes the Vue Flow node list — that is what puts the card back. It also sets the
     * `syncingFromParent` guard, so the rebuild does not echo back as an edit.
     */
    syncFlowFromDefinition(props.modelValue);
  });
}

/**
 * Join a group.
 *
 * Only `groupId` is written. The rendered slot, the group's height and the number of empty slots are
 * all **derived** from membership on the next projection, so there is exactly one place that decides
 * where a member sits and nothing to keep in sync.
 *
 * The `y` is seeded from the current member count so the derived order matches "append to the end" —
 * the order the author just created by dropping.
 */
function moveNodeIntoGroup(nodeId: string, groupId: string): void {
  const current = buildDefinitionFromFlow();
  const group = current.nodes.find((node) => node.id === groupId);
  if (!group || group.kind !== 'group') {
    return;
  }
  const appendIndex = nextLabWorkflowGroupSlotIndex(current.nodes, groupId);
  const slot = labWorkflowGroupSlotPosition(appendIndex);
  // Joining cancels any earlier release, or the override would keep the node out of the group.
  setMemberReleased(nodeId, false);

  /*
   * Build the next definition explicitly and project **that**.
   *
   * `patchDefinition` + a trailing `emitDefinition()` was wrong twice over: the emit had not reached
   * the prop yet (so `buildDefinitionFromFlow` still saw no `groupId)` and the trailing
   * `emitDefinition()` rebuilt from the live flow, which had no containment either — so the join was
   * written once and immediately overwritten by a definition without it.
   */
  const nextDef = buildDefinitionFromFlow();
  const patched: LabWorkflowDefinitionV2 = {
    ...nextDef,
    nodes: nextDef.nodes.map((node) =>
      node.id === nodeId
        ? ({ ...node, groupId, position: slot } as LabWorkflowGraphNodeV2)
        : node,
    ),
  };
  emit('update:modelValue', patched);
  setFlowNodes(domainToFlow(patched).nodes, true);
  publishFlowEdgesToVueFlow();
  void nextTick(() => {
    isDraggingGraphNode.value = false;
  });
}

/**
 * Drop a member back onto the canvas.
 *
 * The parent's absolute position is added to the child's offset, because the stored `position` for a
 * member is parent-relative. Without it the node lands at the offset *as if* it were canvas space —
 * usually on top of the group it just left.
 */
function leaveGroup(nodeId: string, relativePosition: { x: number; y: number }): void {
  // Live definition: `props.modelValue` lags any pending emit, so the group's origin could be stale.
  const current = buildDefinitionFromFlow();
  const domainNode = current.nodes.find((node) => node.id === nodeId);
  const groupId = domainNode && (domainNode.kind === 'action' || domainNode.kind === 'rule')
    ? domainNode.groupId
    : undefined;
  if (!groupId) {
    return;
  }
  const group = current.nodes.find((node) => node.id === groupId);
  const absolute = {
    x: (group?.position.x ?? 0) + relativePosition.x,
    y: (group?.position.y ?? 0) + relativePosition.y,
  };
  /*
   * Record the release **before** rebuilding. `buildDefinitionFromFlow` derives `groupId` from Vue
   * Flow's `parentNode`, which still holds the group, so without this the node would be re-joined by
   * the very build that is meant to detach it.
   */
  setMemberReleased(nodeId, true);

  /*
   * Project the **patched** definition, not `props.modelValue`.
   *
   * `patchDefinition` only *emits* the change; the prop is replaced on the next parent render, so
   * reading `props.modelValue` afterwards still saw `groupId` and re-nested the node onto the group.
   * That is why the drag-out moved the card but kept the membership.
   *
   * A full re-projection is also what clears Vue Flow's own copy of `parentNode` — it keeps that field
   * in its store as well as on the node object, so deleting it locally leaves the store's copy intact
   * and the child still renders nested.
   */
  const nextDef = buildDefinitionFromFlow();
  const patched: LabWorkflowDefinitionV2 = {
    ...nextDef,
    nodes: nextDef.nodes.map((node) =>
      node.id === nodeId
        ? ({ ...node, groupId: undefined, position: absolute } as LabWorkflowGraphNodeV2)
        : node,
    ),
  };
  emit('update:modelValue', patched);
  setFlowNodes(domainToFlow(patched).nodes, true);
  publishFlowEdgesToVueFlow();
  void nextTick(() => {
    isDraggingGraphNode.value = false;
  });
}

function onFlowPointerMove(event: PointerEvent): void {
  lastDropPointer.value = { x: event.clientX, y: event.clientY };
}

function onFlowViewportChange(viewport: ViewportTransform): void {
  flowViewport.value = viewport;
}

function screenPointerToFlowPosition(clientX: number, clientY: number): { x: number; y: number } {
  const paneEl = flowDropPaneRef.value?.getPaneElement() ?? null;
  if (!paneEl) {
    return { x: 200, y: 120 + props.modelValue.nodes.length * 40 };
  }
  const rect = paneEl.getBoundingClientRect();
  const vp = flowViewport.value;
  const relativeX = clientX - rect.left;
  const relativeY = clientY - rect.top;
  return {
    x: (relativeX - vp.x) / vp.zoom,
    y: (relativeY - vp.y) / vp.zoom,
  };
}

function dropPositionOnCanvas(size: PaletteDropSize = defaultPaletteDropSize): { x: number; y: number } {
  const flow = screenPointerToFlowPosition(lastDropPointer.value.x, lastDropPointer.value.y);
  return {
    x: Math.max(16, flow.x - size.width / 2),
    y: Math.max(16, flow.y - size.height / 2),
  };
}

function layoutPaletteDropSize(block: LabWorkflowGraphLayoutPaletteBlock): PaletteDropSize {
  if (block.layoutKind === 'group' || block.layoutKind === 'rule_group') {
    return groupPaletteDropSize;
  }
  return defaultPaletteDropSize;
}

function draggedPaletteBlock<T>(e: IDragEvent): T | null {
  const dragItem = e.draggedItems[0];
  if (!dragItem) {
    return null;
  }
  return dragItem.item as T;
}

function isGraphCanvasDropZone(dropZone: IDragEvent['dropZone']): boolean {
  return dropZone?.items === graphDropZoneItems.value;
}

function handleGraphCanvasDrop(e: IDragEvent): void {
  if (!isGraphCanvasDropZone(e.dropZone)) {
    return;
  }
  const srcItems = e.draggedItems[0]?.items;
  if (srcItems === layoutPaletteBlocks.value) {
    const block = draggedPaletteBlock<LabWorkflowGraphLayoutPaletteBlock>(e);
    if (!block) {
      return;
    }
    const pos = dropPositionOnCanvas(layoutPaletteDropSize(block));
    if (block.layoutKind === 'condition') {
      addNodeAt('condition', { position: pos });
      return;
    }
    if (block.layoutKind === 'schedule_trigger') {
      startScheduleTrigger(pos);
      return;
    }
    if (block.layoutKind === 'group') {
      addGroupAt('actions', pos);
      return;
    }
    if (block.layoutKind === 'rule_group') {
      addGroupAt('rules', pos);
      return;
    }
    startNewRuleNodeAt(pos);
    return;
  }

  const pos = dropPositionOnCanvas();

  if (srcItems === eventPaletteBlocks.value) {
    const block = draggedPaletteBlock<WorkflowCanvasEventBlock>(e);
    if (!block) {
      return;
    }
    const trigger = props.modelValue.nodes.find((n) => n.kind === 'trigger');
    if (trigger?.kind === 'trigger') {
      updateNode({ ...trigger, eventType: block.eventType });
    } else {
      addNodeAt('trigger', { eventType: block.eventType, position: pos });
    }
    return;
  }

  if (srcItems === actionPaletteBlocks.value) {
    const block = draggedPaletteBlock<WorkflowCanvasActionPaletteBlock>(e);
    if (!block) {
      return;
    }
    addActionFromPalette(block.kind, pos);
    return;
  }

  if (srcItems === integrationDataPaletteBlocks.value) {
    const block = draggedPaletteBlock<LabWorkflowGraphIntegrationDataPaletteBlock>(e);
    if (!block) {
      return;
    }
    addLookupConditionFromService(block, pos);
    return;
  }

  if (srcItems === connectorWritePaletteBlocks.value) {
    const block = draggedPaletteBlock<LabWorkflowGraphConnectorWritePaletteBlock>(e);
    if (!block) {
      return;
    }
    const ref = integrationWriteServices.value.find(
      (service) =>
        service.providerAppId === block.providerAppId && service.serviceId === block.serviceId,
    );
    if (!ref) {
      return;
    }
    addIntegrationAction(block.mode, ref, pos);
  }
}

function onConnect(connection: Connection): void {
  if (!connection.source || !connection.target) {
    return;
  }
  /*
   * A member's handles are hidden, but an edge can still be created without them (import, MCP, or a
   * graph saved before this rule). Redirecting the target to the group keeps the invariant that the
   * **group** is what the rest of the graph connects to, so a member is never reachable on a path
   * that skips the group's own execution and failure options.
   */
  const targetNode = props.modelValue.nodes.find((n) => n.id === connection.target);
  const targetGroupId =
    targetNode && (targetNode.kind === 'action' || targetNode.kind === 'rule')
      ? targetNode.groupId
      : undefined;
  if (targetGroupId && targetGroupId !== connection.source) {
    connection = { ...connection, target: targetGroupId };
  }
  const source = props.modelValue.nodes.find((n) => n.id === connection.source);
  const fromHandle = edgeBranchFromSourceHandle(source, connection.sourceHandle);
  const when =
    fromHandle.when ?? (source ? defaultWhenForBranchingSource(source) : 'always');
  const outputIndex = fromHandle.outputIndex;
  const edge: LabWorkflowGraphEdgeV2 = {
    id: crypto.randomUUID(),
    source: connection.source,
    target: connection.target,
    when,
    ...(outputIndex != null ? { outputIndex } : {}),
  };
  const nextFlowEdge = labWorkflowFlowEdgeFromDomain(
    edge,
    labWorkflowCanvasEdgeLabel(edge, source),
    false,
    source,
  );
  flowEdges.value = [...flowEdges.value, nextFlowEdge];
  publishFlowEdgesToVueFlow();
  patchDefinition((def) => ({ ...def, edges: [...def.edges, edge] }));
}

function onNodeClick(event: NodeMouseEvent): void {
  selection.value = { kind: 'node', nodeId: event.node.id };
  syncSelectionHighlight();
}

function onEdgeClick(event: EdgeMouseEvent): void {
  selection.value = { kind: 'edge', edgeId: event.edge.id };
  syncSelectionHighlight();
}

function onPaneClick(): void {
  selection.value = null;
  syncSelectionHighlight();
}

function updateEdgeFromPanel(edge: LabWorkflowGraphEdgeV2): void {
  patchDefinition((def) => ({
    ...def,
    edges: def.edges.map((e) => (e.id === edge.id ? edge : e)),
  }));
  const sourceNode = props.modelValue.nodes.find((n) => n.id === edge.source);
  flowEdges.value = flowEdges.value.map((fe) => {
    if (fe.id !== edge.id) {
      return fe;
    }
    return {
      ...fe,
      label: labWorkflowCanvasEdgeLabel(edge, sourceNode),
      data: { domainEdge: edge },
    };
  });
  publishFlowEdgesToVueFlow();
}

function removeEdge(edgeId: string): void {
  flowEdges.value = flowEdges.value.filter((e) => e.id !== edgeId);
  publishFlowEdgesToVueFlow();
  patchDefinition((def) => ({
    ...def,
    edges: def.edges.filter((e) => e.id !== edgeId),
  }));
  if (selection.value?.kind === 'edge' && selection.value.edgeId === edgeId) {
    selection.value = null;
  }
}

function updateNode(node: LabWorkflowGraphNodeV2): void {
  const live = currentFlowNodesFromVue().find((flowNode) => flowNode.id === node.id);
  const nodeWithLivePosition = live
    ? { ...node, position: { x: live.position.x, y: live.position.y } }
    : node;
  patchDefinition((def) => ({
    ...def,
    nodes: def.nodes.map((n) => (n.id === nodeWithLivePosition.id ? nodeWithLivePosition : n)),
  }));
  setFlowNodes(
    flowNodes.value.map((flowNode) => {
      if (flowNode.id !== nodeWithLivePosition.id) {
        return flowNode;
      }
      const parentNode =
        (nodeWithLivePosition.kind === 'action' || nodeWithLivePosition.kind === 'rule') &&
        nodeWithLivePosition.groupId
          ? nodeWithLivePosition.groupId
          : flowNode.parentNode;
      const extent = parentNode ? ('parent' as const) : flowNode.extent;
      const graphLabelOptions = {
        catalogEntries: props.catalogEntries,
        rules: props.rules,
        integrationServiceCatalog: props.integrationServiceCatalog,
      };
      const conditionLines = labWorkflowGraphNodeConditionLines(
        nodeWithLivePosition,
        graphLabelOptions,
      );
      const headline = conditionLines.length
        ? labWorkflowGraphNodeCardHeadline(nodeWithLivePosition, graphLabelOptions)
        : undefined;
      return {
        ...flowNode,
        parentNode,
        extent,
        data: {
          ...flowNode.data,
          node: nodeWithLivePosition,
          label: labWorkflowGraphNodeLabel(nodeWithLivePosition, graphLabelOptions),
          headline,
          conditionLines: conditionLines.length ? conditionLines : undefined,
          kindLabel: labWorkflowGraphNodeKindDisplay(nodeWithLivePosition, graphLabelOptions),
          showRuleSetupWarning:
            nodeWithLivePosition.kind === 'rule' &&
            !labWorkflowRuleNodeIsConfigured(nodeWithLivePosition),
        },
      };
    }),
  );
}

/**
 * Bindings for the node/edge detail panel.
 *
 * The panel lives in the right sidebar, which the host may take over for its own tabs. Passing
 * the props as a slot scope (rather than letting the canvas render the panel) means "who shows the
 * detail panel" has exactly one answer — previously both rendered and fought for the column.
 */
const detailPanelData = computed(() => ({
  definition: props.modelValue,
  selection: selection.value,
  // Phase 37: the webhook mapping panel is keyed by workflow, so the panel needs the id. An unsaved
  // draft passes null and the panel says so rather than creating an orphan row.
  workflowId: props.workflowId ?? null,
  schedules: workflowSchedules.value,
  schedulesLoading: workflowSchedulesLoading.value,
  catalogEntries: props.catalogEntries,
  integrationServiceCatalog: props.integrationServiceCatalog,
  rules: props.rules,
  rulesLoading: props.rulesLoading,
  labUsers: props.labUsers,
  adminMode: props.adminMode,
}));

/** Detail panel emits Vue events; hosts must wire these (not `on*` props). */
const detailPanelHandlers = {
  onUpdateNode: updateNode,
  onUpdateEdge: updateEdgeFromPanel,
  onDeleteNode: deleteNode,
  onDeleteEdge: removeEdge,
};

function deleteNode(nodeId: string): void {
  const removed = props.modelValue.nodes.find((n) => n.id === nodeId);
  setFlowNodes(
    flowNodes.value
      .filter((n) => n.id !== nodeId)
      .map((flowNode) => {
        if (removed?.kind === 'group' && flowNode.parentNode === nodeId) {
          // Drop the containment fields when the group that owned them is deleted, or the node
          // stays positioned against a parent that no longer exists.
          const rest = { ...flowNode };
          delete (rest as { parentNode?: unknown }).parentNode;
          delete (rest as { extent?: unknown }).extent;
          return rest;
        }
        return flowNode;
      }),
  );
  flowEdges.value = flowEdges.value.filter((e) => e.source !== nodeId && e.target !== nodeId);
  publishFlowEdgesToVueFlow();
  patchDefinition((def) => ({
    ...def,
    nodes: def.nodes
      .filter((n) => n.id !== nodeId)
      .map((n) =>
        removed?.kind === 'group' &&
        (n.kind === 'action' || n.kind === 'rule') &&
        n.groupId === nodeId
          ? { ...n, groupId: undefined }
          : n,
      ),
    edges: def.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
  }));
  selection.value = null;
}

/**
 * Create — or convert the existing trigger into — a scheduled trigger (34.15).
 *
 * The default pattern is "every weekday at 09:00" in the browser's zone: the most common authoring
 * intent, and unlike an empty cron field it is immediately valid. The event type is kept (or
 * defaulted), because a scheduled run still carries one downstream.
 *
 * Converting rather than adding a second trigger is deliberate — the validator allows exactly one
 * trigger, so a new node would be rejected and the author would see an error for doing the obvious
 * thing.
 */
function startScheduleTrigger(position?: { x: number; y: number }): void {
  let browserZone = 'UTC';
  try {
    browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    // Keep UTC: an unresolvable zone still yields a valid schedule, just an unexpected one.
  }
  const schedule: LabWorkflowTriggerScheduleV1 = {
    kind: 'cron',
    expression: '0 9 * * 1-5',
    timezone: browserZone,
  };
  const trigger = props.modelValue.nodes.find((n) => n.kind === 'trigger');
  if (trigger?.kind === 'trigger') {
    updateNode({ ...trigger, schedule });
    selection.value = { kind: 'node', nodeId: trigger.id };
    return;
  }
  addNodeAt('trigger', { schedule, position: position ?? { x: 220, y: 40 } });
}

function addNodeAt(kind: LabWorkflowGraphNodeV2['kind'], extra?: Partial<LabWorkflowGraphNodeV2>): void {
  const id = crypto.randomUUID();
  const yBase = 80 + props.modelValue.nodes.length * 48;
  let node: LabWorkflowGraphNodeV2;
  switch (kind) {
    case 'trigger':
      if (props.modelValue.nodes.some((n) => n.kind === 'trigger')) {
        return;
      }
      node = {
        id,
        kind: 'trigger',
        position: { x: 220, y: 40 },
        eventType: triggerEventType.value || props.catalogEntries[0]?.eventType || 'app-lab-tasklist.task.created',
      };
      break;
    case 'condition':
      node = {
        id,
        kind: 'condition',
        position: { x: 180 + Math.random() * 80, y: yBase },
        conditions: [{ kind: 'payload_exists', path: 'assigneeId' }],
      };
      break;
    case 'rule':
      node = {
        id,
        kind: 'rule',
        position: { x: 180 + Math.random() * 80, y: yBase },
      };
      break;
    case 'action':
      node = {
        id,
        kind: 'action',
        position: { x: 180 + Math.random() * 80, y: yBase },
        step: defaultStepForActionKind('notify_users', triggerEventType.value),
      };
      break;
    case 'group':
      node = {
        id,
        kind: 'group',
        position: { x: 160 + Math.random() * 40, y: yBase },
        label: 'Group',
        width: 320,
        height: 200,
        groupType: 'actions',
        executionMode: 'sequential',
        failurePolicy: 'stop',
      };
      break;
    default:
      return;
  }
  if (extra) {
    node = { ...node, ...extra } as LabWorkflowGraphNodeV2;
  }
  patchDefinition((def) => ({ ...def, nodes: [...def.nodes, node] }));
  selection.value = { kind: 'node', nodeId: id };
}

function selectedGroupContext(): { id: string; groupType: LabWorkflowGraphGroupType } | undefined {
  const sel = selection.value;
  if (sel?.kind !== 'node') {
    return undefined;
  }
  const node = props.modelValue.nodes.find((n) => n.id === sel.nodeId);
  if (node?.kind !== 'group') {
    return undefined;
  }
  const normalized = normalizeWorkflowGroupNode(node);
  return { id: node.id, groupType: normalized.groupType };
}

function addGroupAt(groupType: LabWorkflowGraphGroupType, position?: { x: number; y: number }): void {
  const id = crypto.randomUUID();
  const node: LabWorkflowGraphNodeV2 = {
    id,
    kind: 'group',
    position: position ?? { x: 200, y: 160 },
    label: groupType === 'rules' ? 'Rule group' : 'Action group',
    width: 320,
    height: groupType === 'rules' ? 180 : 200,
    groupType,
    executionMode: 'sequential',
    failurePolicy: 'stop',
    ruleCombine: 'sequential_first_match',
    continueOnNoMatch: false,
  };
  patchDefinition((def) => ({ ...def, nodes: [...def.nodes, node] }));
  selection.value = { kind: 'node', nodeId: id };
}

function addActionFromPalette(
  kind: (typeof WORKFLOW_ACTION_PALETTE)[number]['kind'],
  position?: { x: number; y: number },
): void {
  const id = crypto.randomUUID();
  const groupCtx = selectedGroupContext();
  const groupId = groupCtx?.groupType === 'actions' ? groupCtx.id : undefined;
  const memberCount = groupId
    ? props.modelValue.nodes.filter((n) => n.kind === 'action' && n.groupId === groupId).length
    : 0;
  const node: LabWorkflowGraphNodeV2 = {
    id,
    kind: 'action',
    position:
      position ??
      (groupId
        ? { x: 28, y: 36 + memberCount * 52 }
        : { x: 200 + Math.random() * 60, y: 120 + props.modelValue.nodes.length * 40 }),
    groupId,
    step: defaultStepForActionKind(kind, triggerEventType.value, props.labUsers[0]?.value),
  };
  patchDefinition((def) => ({ ...def, nodes: [...def.nodes, node] }));
  selection.value = { kind: 'node', nodeId: id };
}

function startNewRuleNodeAt(position?: { x: number; y: number }): void {
  const id = crypto.randomUUID();
  const groupCtx = selectedGroupContext();
  const groupId = groupCtx?.groupType === 'rules' ? groupCtx.id : undefined;
  const memberCount = groupId
    ? props.modelValue.nodes.filter((n) => n.kind === 'rule' && n.groupId === groupId).length
    : 0;
  const node: LabWorkflowGraphNodeV2 = {
    id,
    kind: 'rule',
    position:
      position ??
      (groupId
        ? { x: 28, y: 36 + memberCount * 52 }
        : { x: 200, y: 160 }),
    groupId,
  };
  patchDefinition((def) => ({ ...def, nodes: [...def.nodes, node] }));
  selection.value = { kind: 'node', nodeId: id };
}

const canvasRootId = generateUniqueId('lab-workflow-graph-canvas');

defineOptions({ inheritAttrs: false });
</script>

<template>
  <div class="lab-workflow-graph-canvas-host" v-bind="$attrs">
    <DnDProvider class="lab-workflow-graph-canvas-dnd">
      <div class="lab-workflow-graph-canvas">
    <div
      v-if="!layoutReady"
      class="lab-workflow-graph-canvas__splitter lab-workflow-graph-canvas__splitter--loading"
      aria-hidden="true"
    />
    <Splitter
      v-else
      class="lab-workflow-graph-canvas__splitter"
      pt:root="border-0! bg-transparent! h-full! min-h-0!"
      pt:gutter:class="lab-workflow-designer-splitter-gutter"
      :gutter-size="5"
      :step="2"
      @resizeend="onSplitterResizeEnd"
    >
    <SplitterPanel
      class="lab-workflow-graph-canvas__palette"
      :size="panelSizes[0]"
      :min-size="10"
    >
      <div class="lab-workflow-graph-canvas__palette-scroll lab-chat-scrollbar">
      <LabWorkflowPaletteSection title="Layout">
        <LabRuleEventDropZone variant="catalog" :items="layoutPaletteBlocks">
          <div class="lab-rules-event-list">
            <LabWorkflowCanvasCard
              v-for="(block, index) in layoutPaletteBlocks"
              :key="block.dragId"
              :index="index"
              :items="layoutPaletteBlocks"
              :drag-id="block.dragId"
              :title="block.label"
              :hint="paletteCardSubtext(block.label, block.description)"
              :icon="
                block.layoutKind === 'condition'
                  ? 'pi pi-filter'
                  : block.layoutKind === 'group'
                    ? 'pi pi-objects-column'
                    : block.layoutKind === 'rule_group'
                      ? 'pi pi-shield'
                      : block.layoutKind === 'schedule_trigger'
                        ? 'pi pi-clock'
                        : 'pi pi-plus'
              "
              :tone="
                block.layoutKind === 'condition'
                  ? 'flow'
                  : block.layoutKind === 'group'
                    ? 'action'
                    : block.layoutKind === 'rule_group'
                      ? 'rule'
                      : 'rule'
              "
              copy-only
            />
          </div>
        </LabRuleEventDropZone>
      </LabWorkflowPaletteSection>

      <LabWorkflowPaletteSection
        v-if="integrationServiceCatalog?.apps.length"
        title="Related records"
        :count="integrationServiceCount"
        :default-open="false"
      >
        <p class="m-0 mb-2 text-xs text-lab-general-text-muted">
          Drag a record type onto the canvas to add a condition that checks fields on that record.
        </p>
        <LabRuleEventDropZone variant="catalog" :items="integrationDataPaletteBlocks">
          <div class="flex flex-col gap-1">
            <LabWorkflowPaletteAppGroup
              v-for="group in integrationServiceCatalog.apps"
              :key="group.appId"
              :app-id="group.appId"
              :app-name="group.appName"
              :count="group.services.length"
            >
              <div class="lab-rules-event-list">
                <template v-for="service in group.services" :key="service.serviceId">
                  <LabWorkflowCanvasCard
                    v-if="integrationDataPaletteIndex(group.appId, service.serviceId) >= 0"
                    :index="integrationDataPaletteIndex(group.appId, service.serviceId)"
                    :items="integrationDataPaletteBlocks"
                    :drag-id="`wf-graph-int-data-${group.appId}-${service.serviceId}`"
                    :title="service.label"
                    :hint="paletteCardSubtext(service.label, service.description)"
                    icon="pi pi-database"
                    tone="flow"
                    copy-only
                    selectable
                    @select="
                      addLookupConditionFromService(
                        integrationDataPaletteBlocks[
                          integrationDataPaletteIndex(group.appId, service.serviceId)
                        ],
                        { x: 220, y: 120 + modelValue.nodes.length * 40 },
                      )
                    "
                  />
                </template>
              </div>
            </LabWorkflowPaletteAppGroup>
          </div>
        </LabRuleEventDropZone>
      </LabWorkflowPaletteSection>

      <LabWorkflowPaletteSection title="Events" :count="eventPaletteBlocks.length">
        <LabRuleEventDropZone variant="catalog" :items="eventPaletteBlocks">
          <div class="flex flex-col gap-1 lab-workflow-graph-palette-list">
            <LabWorkflowPaletteAppGroup
              v-for="group in catalogEventGroups"
              :key="group.sourceAppId"
              :app-id="group.sourceAppId"
              :app-name="eventAppDisplayName(group.sourceAppId)"
              :count="group.events.length"
            >
              <div class="lab-rules-event-list">
                <template v-for="entry in group.events" :key="entry.eventType">
                  <LabWorkflowCanvasCard
                    v-if="eventPaletteIndexForType(entry.eventType) >= 0"
                    :index="eventPaletteIndexForType(entry.eventType)"
                    :items="eventPaletteBlocks"
                    :drag-id="eventPaletteDragId(entry.eventType)"
                    :title="entry.label"
                    :hint="paletteCardSubtext(entry.label, entry.description)"
                    icon="pi pi-bolt"
                    tone="event"
                    copy-only
                    selectable
                    @select="
                      () => {
                        const trigger = modelValue.nodes.find((n) => n.kind === 'trigger');
                        if (trigger?.kind === 'trigger') {
                          updateNode({ ...trigger, eventType: entry.eventType });
                        } else {
                          addNodeAt('trigger', { eventType: entry.eventType });
                        }
                      }
                    "
                  />
                </template>
              </div>
            </LabWorkflowPaletteAppGroup>
          </div>
        </LabRuleEventDropZone>
      </LabWorkflowPaletteSection>

      <LabWorkflowPaletteSection
        v-if="integrationWriteServices.length"
        title="Update app records"
        :count="integrationWriteServices.length * 2"
        :default-open="false"
      >
        <p class="m-0 mb-2 text-xs text-lab-general-text-muted">
          Drag create/update steps onto the canvas (or click to add at default position).
        </p>
        <LabRuleEventDropZone variant="catalog" :items="connectorWritePaletteBlocks">
          <div class="flex flex-col gap-1">
            <LabWorkflowPaletteAppGroup
              v-for="group in connectorWriteGroups"
              :key="group.appId"
              :app-id="group.appId"
              :app-name="group.appName"
              :count="group.services.length * 2"
            >
              <div class="lab-rules-event-list">
                <template v-for="service in group.services" :key="`${service.providerAppId}-${service.serviceId}`">
                  <LabWorkflowCanvasCard
                    v-if="connectorWritePaletteIndex(`wf-graph-int-create-${group.appId}-${service.serviceId}`) >= 0"
                    :index="connectorWritePaletteIndex(`wf-graph-int-create-${group.appId}-${service.serviceId}`)"
                    :items="connectorWritePaletteBlocks"
                    :drag-id="`wf-graph-int-create-${group.appId}-${service.serviceId}`"
                    :title="`Create · ${service.label}`"
                    icon="pi pi-plus"
                    tone="action"
                    copy-only
                    selectable
                    @select="addIntegrationAction('create', service)"
                  />
                  <LabWorkflowCanvasCard
                    v-if="connectorWritePaletteIndex(`wf-graph-int-update-${group.appId}-${service.serviceId}`) >= 0"
                    :index="connectorWritePaletteIndex(`wf-graph-int-update-${group.appId}-${service.serviceId}`)"
                    :items="connectorWritePaletteBlocks"
                    :drag-id="`wf-graph-int-update-${group.appId}-${service.serviceId}`"
                    :title="`Update · ${service.label}`"
                    icon="pi pi-pencil"
                    tone="action"
                    copy-only
                    selectable
                    @select="addIntegrationAction('update', service)"
                  />
                </template>
              </div>
            </LabWorkflowPaletteAppGroup>
          </div>
        </LabRuleEventDropZone>
      </LabWorkflowPaletteSection>

      <LabWorkflowPaletteSection title="Actions" :count="actionPaletteBlocks.length">
        <LabRuleEventDropZone variant="catalog" :items="actionPaletteBlocks">
          <div class="lab-rules-event-list lab-workflow-graph-palette-list">
            <LabWorkflowCanvasCard
              v-for="(block, index) in actionPaletteBlocks"
              :key="block.dragId"
              :index="index"
              :items="actionPaletteBlocks"
              :drag-id="block.dragId"
              :title="block.label"
              :hint="paletteCardSubtext(block.label, block.description)"
              icon="pi pi-cog"
              tone="action"
              copy-only
              selectable
              @select="addActionFromPalette(block.kind)"
            />
          </div>
        </LabRuleEventDropZone>
      </LabWorkflowPaletteSection>
      </div>
    </SplitterPanel>

    <SplitterPanel
      class="lab-workflow-graph-canvas__flow"
      :size="panelSizes[1]"
      :min-size="35"
    >
    <div class="lab-workflow-graph-flow-pane" :id="canvasRootId">
      <LabWorkflowGraphDropOverlay
        ref="flowDropPaneRef"
        :zone-items="graphDropZoneItems"
        @drop="handleGraphCanvasDrop"
        @pointermove="onFlowPointerMove"
      >
        <VueFlow
          :nodes="vueFlowNodesRef"
          :edges="vueFlowEdgesRef"
          :node-types="nodeTypes"
          nodes-draggable
          elements-selectable
          :pan-on-drag="panOnDragMouseButtons"
          pan-on-scroll
          :node-drag-threshold="2"
          :default-viewport="vueFlowInitialViewport"
          @nodes-initialized="onFlowNodesInitialized"
          @viewport-change="onFlowViewportChange"
          @nodes-change="onNodesChange"
          @edges-change="onEdgesChange"
          @connect="onConnect"
          @node-click="onNodeClick"
          @node-drag-start="onNodeDragStart"
          @node-drag="onNodeDrag"
          @node-drag-stop="onNodeDragStop"
          @edge-click="onEdgeClick"
          @pane-click="onPaneClick"
        >
          <Background />
          <Controls :show-interactive="false" />
          <LabWorkflowGraphArrangeControl @arrange="autoArrangeCanvas" />
        </VueFlow>
      </LabWorkflowGraphDropOverlay>
    </div>
    </SplitterPanel>

    <!--
      Right sidebar. The canvas does NOT render the detail panel itself when a host supplies the
      `sidebar` slot — it passes the panel's bindings through instead. Previously both rendered, so
      the two competed for the column and the tab strip had no room.
    -->
    <SplitterPanel
      class="lab-workflow-graph-canvas__detail"
      :size="panelSizes[2]"
      :min-size="12"
    >
      <slot
        name="sidebar"
        :detail-panel-props="detailPanelData"
        :detail-panel-handlers="detailPanelHandlers"
      >
        <LabWorkflowGraphDetailPanel
          v-bind="detailPanelData"
          @update:node="updateNode"
          @update:edge="updateEdgeFromPanel"
          @delete:node="deleteNode"
          @delete:edge="removeEdge"
        />
      </slot>
    </SplitterPanel>
    </Splitter>
      </div>
    </DnDProvider>
  </div>
</template>

<style scoped>
.lab-workflow-palette-item {
  padding: 0.4rem 0.55rem;
  border-radius: 0.4rem;
  border: 1px solid transparent;
  background: transparent;
  color: var(--lab-general-text);
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}
.lab-workflow-palette-item:hover {
  border-color: color-mix(in srgb, var(--lab-general-border) 55%, transparent);
  background: color-mix(in srgb, var(--lab-accent-primary) 10%, var(--lab-workflow-panel-bg));
}
</style>

<!-- After @vue-flow theme-default — branch labels must not reuse node panel / accent border chrome. -->
<style>
.lab-workflow-graph-canvas__flow .vue-flow__edge-textbg,
.lab-workflow-graph-canvas__flow .vue-flow__edge-textwrapper rect {
  fill: var(--lab-workflow-edge-label-bg) !important;
  stroke: var(--lab-workflow-edge-label-border) !important;
  stroke-width: 1.25px;
}

.lab-workflow-graph-canvas__flow .vue-flow__edge-text {
  fill: var(--lab-general-text) !important;
}

/*
 * Group members: let the inline size be the size.
 *
 * Chrome showed `element.style width: 270px; height: 74px` on the wrapper while the card rendered at
 * 322x89 — Vue Flow's own `.vue-flow__node` rules size the wrapper from content once a drag has run,
 * so the card and the slot disagreed about how big the card was and the slot's inset looked huge.
 *
 * Scoped styles cannot reach this element (Vue Flow renders it, outside the component), hence the
 * unscoped block. `min-width`/`max-height: none` clear Vue Flow's content-based clamps; the inline px
 * size from the projection is then authoritative.
 */
.lab-workflow-graph-canvas__flow .vue-flow__node[data-id] > .lab-wf-graph-node--group-member {
  min-width: 0;
  max-width: none;
  min-height: 0;
  max-height: none;
}
</style>
