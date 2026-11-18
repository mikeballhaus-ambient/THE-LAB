<script setup lang="ts">
export interface LabWorkflowGraphDetailOutgoingItem {
  edgeId: string;
  targetLabel: string;
  branchLabel?: string;
  canvasLabel?: string;
}

withDefaults(
  defineProps<{
    items: LabWorkflowGraphDetailOutgoingItem[];
    lead: string;
    showBranches?: boolean;
    emptyText?: string;
  }>(),
  {
    showBranches: false,
    emptyText: 'No outgoing connections yet. Link this node to the next step on the canvas.',
  },
);
</script>

<template>
  <section class="lab-workflow-graph-detail-io__block">
    <h4 class="lab-workflow-graph-detail-io__title">Next steps</h4>
    <p class="lab-workflow-graph-detail-io__lead">{{ lead }}</p>
    <ul v-if="items.length" class="lab-workflow-graph-detail-io__list">
      <li v-for="item in items" :key="item.edgeId">
        <template v-if="showBranches && item.branchLabel">
          {{ item.branchLabel }} → {{ item.targetLabel }}
        </template>
        <template v-else>
          → {{ item.targetLabel }}
        </template>
        <span v-if="item.canvasLabel" class="text-lab-general-text-muted">
          ({{ item.canvasLabel }})
        </span>
      </li>
    </ul>
    <p v-else class="m-0 text-xs text-lab-general-text-muted">{{ emptyText }}</p>
  </section>
</template>
