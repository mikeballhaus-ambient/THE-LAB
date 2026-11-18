<script setup lang="ts">
import { computed, inject } from 'vue';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import FormFieldShell from '@/shared/forms/FormFieldShell.vue';
import { FORM_RUNTIME_VALUES_KEY } from '@/shared/forms/form-runtime-values';

defineProps<{
  field: IFormRuntimeField;
}>();

const store = inject(FORM_RUNTIME_VALUES_KEY);

const summary = computed(() => {
  const raw = store?.getValue('definitionJson');
  if (raw == null || String(raw).trim() === '') {
    return { kind: 'empty' as const };
  }
  try {
    const def = JSON.parse(String(raw)) as {
      schemaVersion?: number;
      trigger?: { eventType?: string };
      steps?: unknown[];
      nodes?: unknown[];
    };
    if (def.schemaVersion === 2 || Array.isArray(def.nodes)) {
      return {
        kind: 'graph' as const,
        nodes: Array.isArray(def.nodes) ? def.nodes.length : 0,
      };
    }
    return {
      kind: 'legacy' as const,
      eventType: def.trigger?.eventType ?? '—',
      steps: Array.isArray(def.steps) ? def.steps.length : 0,
    };
  } catch {
    return { kind: 'invalid' as const };
  }
});
</script>

<template>
  <FormFieldShell :source="field">
    <p class="m-0 mb-2 text-sm text-lab-general-text-muted">
      Workflow graphs and steps are edited in <strong>Workflow Studio</strong> (catalog app or Settings → Lab workflows).
      Use this form for name, scope, and enablement only.
    </p>
    <template v-if="summary.kind === 'graph'">
      <p class="m-0 text-sm text-lab-general-text">Graph workflow — {{ summary.nodes }} node(s) on record.</p>
    </template>
    <template v-else-if="summary.kind === 'legacy'">
      <p class="m-0 text-sm text-lab-general-text">
        Legacy workflow — trigger <code class="text-xs">{{ summary.eventType }}</code
        >, {{ summary.steps }} step(s).
      </p>
    </template>
    <p v-else-if="summary.kind === 'invalid'" class="m-0 text-sm text-amber-400">
      Stored definition JSON is invalid. Open Workflow Studio to repair.
    </p>
    <p v-else class="m-0 text-sm text-lab-general-text-muted">
      No workflow definition yet. Build it in Workflow Studio first.
    </p>
  </FormFieldShell>
</template>
