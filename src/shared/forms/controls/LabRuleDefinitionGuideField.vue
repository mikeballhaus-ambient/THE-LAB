<script setup lang="ts">
import { computed, inject } from 'vue';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import FormFieldShell from '@/shared/forms/FormFieldShell.vue';
import { FORM_RUNTIME_VALUES_KEY } from '@/shared/forms/form-runtime-values';
import { parseLabRuleDefinition } from '@/shared/types/schemas/lab-rule-schema';

defineProps<{
  field: IFormRuntimeField;
}>();

const store = inject(FORM_RUNTIME_VALUES_KEY);

const summary = computed(() => {
  const raw = store?.getValue('definitionJson');
  if (raw == null || String(raw).trim() === '') {
    return { events: 0, conditions: 0, hasDefinition: false };
  }
  try {
    const def = parseLabRuleDefinition(JSON.parse(String(raw)));
    return {
      events: def.trigger?.eventTypes?.length ?? 0,
      conditions: def.conditions?.length ?? 0,
      hasDefinition: true,
    };
  } catch {
    return { events: 0, conditions: 0, hasDefinition: false, invalid: true };
  }
});
</script>

<template>
  <FormFieldShell :source="field">
    <p class="m-0 mb-2 text-sm text-lab-general-text-muted">
      Rule triggers and conditions are edited in the full <strong>Lab rules</strong> editor (Settings → Lab rules, or
      Rules Engine). Integration forms only store metadata here.
    </p>
    <ul v-if="summary.hasDefinition" class="m-0 list-disc pl-5 text-sm text-lab-general-text">
      <li>{{ summary.events }} trigger event(s)</li>
      <li>{{ summary.conditions }} condition(s)</li>
    </ul>
    <p v-else-if="summary.invalid" class="m-0 text-sm text-amber-400">
      Stored definition JSON is invalid. Fix it in Settings → Lab rules.
    </p>
    <p v-else class="m-0 text-sm text-lab-general-text-muted">
      No rule logic saved yet. Create the rule in Settings, then adjust name, scope, and priority here if needed.
    </p>
  </FormFieldShell>
</template>
