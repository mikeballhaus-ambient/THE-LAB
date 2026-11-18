<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import InputNumber from 'primevue/inputnumber';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { labAppFetch } from '@/shared/composables/useLabUserHeaders';
import type { CrmRecordIntegrationContext } from '../composables/useCrmIntegrations';

const props = defineProps<{
  serverUrl: string;
  visible: boolean;
  context: CrmRecordIntegrationContext | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'posted'): void;
}>();

const { generateUniqueId } = useUniqueElementId();
const toast = useToast();

const memo = ref('');
const amountDollars = ref<number | null>(100);
const submitting = ref(false);

const commentFieldId = generateUniqueId('crm-ledger-memo');
const amountFieldId = generateUniqueId('crm-ledger-amount');
const dialogRootId = generateUniqueId('crm-ledger-post-dialog');
const cancelBtnId = generateUniqueId('crm-ledger-cancel');
const submitBtnId = generateUniqueId('crm-ledger-submit');

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
});

const headerLabel = computed(() => {
  const label = props.context?.recordLabel?.trim();
  return label ? `Post entry — ${label}` : 'Post journal entry';
});

watch(
  () => props.visible,
  (open) => {
    if (open) {
      memo.value = '';
      amountDollars.value = 100;
    }
  },
);

async function submit(): Promise<void> {
  const ctx = props.context;
  if (!ctx) {
    return;
  }
  submitting.value = true;
  try {
    const base = props.serverUrl.replace(/\/$/, '');
    const amountCents =
      amountDollars.value != null && Number.isFinite(amountDollars.value)
        ? Math.round(amountDollars.value * 100)
        : undefined;
    const res = await labAppFetch(`${base}/api/integrations/ledger-entry/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityKey: ctx.entityKey,
        recordId: ctx.recordId,
        recordLabel: ctx.recordLabel,
        memo: memo.value.trim() || undefined,
        amountCents,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      throw new Error(body.error ?? `Post failed (${res.status})`);
    }
    toast.add({
      severity: 'success',
      summary: 'Ledger post requested',
      detail: 'Workflow Studio will post the journal entry using the demo COA.',
      life: 4000,
    });
    dialogVisible.value = false;
    emit('posted');
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Could not request ledger post',
      detail: err instanceof Error ? err.message : undefined,
      life: 6000,
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    :header="headerLabel"
    class="crm-ledger-post-dialog lab-integration-dialog lab-app-dialog lab-form-runtime w-full max-w-lg"
    :pt="{
      root: { attrs: { id: dialogRootId } },
      mask: { class: 'lab-app-dialog lab-integration-dialog-mask' },
    }"
  >
    <div
      class="crm-ledger-post-dialog__body flex flex-col gap-3"
      :id="generateUniqueId('crm-ledger-post-body')"
    >
      <section
        class="lab-form-section"
        :id="generateUniqueId('crm-ledger-post-workflow-section')"
      >
        <h4
          class="lab-form-section__title m-0"
          :id="generateUniqueId('crm-ledger-post-workflow-title')"
        >
          <span class="lab-form-section__icon" aria-hidden="true">
            <i class="pi pi-sitemap" />
          </span>
          Workflow
        </h4>
        <p class="lab-form-section__lead mb-0">
          Your request publishes a domain event with account and deal context; enabled workflows post
          to Financial Ledger using the demo chart of accounts. Adjust amount or optional note before
          sending.
        </p>
      </section>

      <section
        class="lab-form-section"
        :id="generateUniqueId('crm-ledger-post-entry-section')"
      >
        <h4
          class="lab-form-section__title m-0"
          :id="generateUniqueId('crm-ledger-post-entry-title')"
        >
          <span class="lab-form-section__icon" aria-hidden="true">
            <i class="pi pi-book" />
          </span>
          Journal entry
        </h4>
        <p class="lab-form-section__lead">
          Optional note on the event. The journal memo uses account + deal from the record when the
          workflow maps <code class="text-xs">ledgerMemo</code> on the post step.
        </p>
        <label
          class="crm-ledger-post-dialog__field-label"
          :id="generateUniqueId('crm-ledger-memo-label')"
          :for="commentFieldId"
        >
          Memo
        </label>
        <Textarea
          v-model="memo"
          rows="3"
          class="w-full mb-3"
          placeholder="Optional journal memo"
          :id="commentFieldId"
        />
        <label
          class="crm-ledger-post-dialog__field-label"
          :id="generateUniqueId('crm-ledger-amount-label')"
          :for="amountFieldId"
        >
          Amount (USD)
        </label>
        <InputNumber
          v-model="amountDollars"
          mode="currency"
          currency="USD"
          locale="en-US"
          class="w-full max-w-xs"
          :pt="{ root: { attrs: { id: amountFieldId } } }"
        />
      </section>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          :disabled="submitting"
          :pt="{ root: { attrs: { id: cancelBtnId } } }"
          @click="dialogVisible = false"
        />
        <Button
          label="Post"
          icon="pi pi-book"
          :loading="submitting"
          :pt="{ root: { attrs: { id: submitBtnId } } }"
          @click="submit"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
:global(.crm-ledger-post-dialog .crm-ledger-post-dialog__body) {
  padding: 1rem 1.25rem 1.25rem;
}

:global(.crm-ledger-post-dialog .p-dialog-footer) {
  margin: 0;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid color-mix(in srgb, var(--lab-general-border) 75%, transparent);
  background: var(--lab-integration-chrome-bg);
}

:global(.crm-ledger-post-dialog .p-textarea),
:global(.crm-ledger-post-dialog .p-inputnumber-input) {
  background: var(--lab-form-control-bg);
  border-color: var(--lab-form-control-border);
  color: var(--lab-general-text);
  font-size: 0.8125rem;
}

.crm-ledger-post-dialog__field-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.75rem;
  color: var(--lab-general-text-muted);
}
</style>
