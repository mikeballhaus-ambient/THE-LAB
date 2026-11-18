<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { fetchLabLedgerCapabilities } from '@/shared/services/platform-lab-ledger.client';
import type { CrmRecordIntegrationContext } from '../composables/useCrmIntegrations';

const props = defineProps<{
  entityKey: string;
  recordId: number;
  recordLabel?: string;
  grouped?: boolean;
  groupedAfterSibling?: boolean;
  enabled?: boolean;
  showCreateAccount?: boolean;
  actionsDisabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'open-post-entry', payload: CrmRecordIntegrationContext): void;
  (e: 'open-create-account'): void;
}>();

const canManageAccounts = ref(false);

onMounted(() => {
  void fetchLabLedgerCapabilities()
    .then((caps) => {
      canManageAccounts.value = caps.canManageAccounts;
    })
    .catch(() => {
      canManageAccounts.value = false;
    });
});

const { generateUniqueId } = useUniqueElementId();

const recordContext = computed((): CrmRecordIntegrationContext => ({
  entityKey: props.entityKey,
  recordId: props.recordId,
  recordLabel: props.recordLabel,
}));
</script>

<template>
  <section
    v-if="enabled !== false"
    class="lab-form-section entity-record-ledger-panel mb-0 flex min-w-0 flex-col gap-2"
    :class="grouped ? '' : 'border-t border-lab-general-border mt-4 pt-4'"
    :id="generateUniqueId(`crm-record-ledger-${entityKey}-${recordId}`)"
  >
    <div class="flex flex-wrap items-start justify-between gap-2">
      <h4
        class="lab-form-section__title m-0 min-w-0"
        :id="generateUniqueId(`crm-record-ledger-heading-${entityKey}-${recordId}`)"
      >
        <span class="lab-form-section__icon" aria-hidden="true">
          <i class="pi pi-book" />
        </span>
        Financial ledger
      </h4>
      <div class="flex flex-wrap gap-2">
        <Button
          label="Post journal entry"
          icon="pi pi-book"
          size="small"
          :disabled="actionsDisabled === true"
          :pt="{ root: { attrs: { id: generateUniqueId(`crm-ledger-post-${recordId}`) } } }"
          @click="emit('open-post-entry', recordContext)"
        />
        <Button
          v-if="showCreateAccount && canManageAccounts"
          label="New account"
          icon="pi pi-plus"
          size="small"
          severity="secondary"
          outlined
          :disabled="actionsDisabled === true"
          :pt="{ root: { attrs: { id: generateUniqueId(`crm-ledger-account-create-${recordId}`) } } }"
          @click="emit('open-create-account')"
        />
      </div>
    </div>
    <p class="lab-form-section__lead mb-0">
      Posts through platform Financial Ledger connectors on port 3000.
    </p>
  </section>
</template>
