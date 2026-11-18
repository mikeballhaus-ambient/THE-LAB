<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { labAppFetch } from '@/shared/composables/useLabUserHeaders';
import type { CrmRecordIntegrationContext } from '../composables/useCrmIntegrations';

const props = defineProps<{
  serverUrl: string;
  visible: boolean;
  context: (CrmRecordIntegrationContext & { title?: string }) | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'submitted'): void;
}>();

const { generateUniqueId } = useUniqueElementId();
const toast = useToast();

const commentFieldId = generateUniqueId('crm-approval-comment');

const comment = ref('');
const submitting = ref(false);

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
});

const headerLabel = computed(() => {
  const label = props.context?.recordLabel?.trim();
  return label ? `Submit approval — ${label}` : 'Submit approval request';
});

watch(
  () => props.visible,
  (open) => {
    if (open) {
      comment.value = '';
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
    const res = await labAppFetch(`${base}/api/integrations/approval-request/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityKey: ctx.entityKey,
        recordId: ctx.recordId,
        recordLabel: ctx.recordLabel,
        comment: comment.value.trim() || undefined,
        stage: ctx.stage,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      throw new Error(body.error ?? `Submit failed (${res.status})`);
    }
    toast.add({
      severity: 'success',
      summary: 'Approval requested',
      detail: 'Workflow will open the approval request for assignees.',
      life: 4000,
    });
    dialogVisible.value = false;
    emit('submitted');
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Could not submit approval',
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
    class="crm-approval-submit-dialog lab-integration-dialog lab-app-dialog lab-form-runtime w-full max-w-lg"
    :pt="{
      root: { attrs: { id: generateUniqueId('crm-approval-submit-dialog') } },
      mask: { class: 'lab-app-dialog lab-integration-dialog-mask' },
    }"
  >
    <div
      class="crm-approval-submit-dialog__body flex flex-col gap-3"
      :id="generateUniqueId('crm-approval-submit-body')"
    >
      <section
        class="lab-form-section"
        :id="generateUniqueId('crm-approval-submit-workflow-section')"
      >
        <h4
          class="lab-form-section__title m-0"
          :id="generateUniqueId('crm-approval-submit-workflow-title')"
        >
          <span class="lab-form-section__icon" aria-hidden="true">
            <i class="pi pi-sitemap" />
          </span>
          Workflow
        </h4>
        <p class="lab-form-section__lead mb-0">
          Your request is sent to Workflow Studio, which raises the approval using the policy configured
          for this entity. Assignees are notified when the workflow creates the request.
        </p>
      </section>

      <section
        class="lab-form-section"
        :id="generateUniqueId('crm-approval-submit-comments-section')"
      >
        <h4
          class="lab-form-section__title m-0"
          :id="generateUniqueId('crm-approval-submit-comments-title')"
        >
          <span class="lab-form-section__icon" aria-hidden="true">
            <i class="pi pi-comment" />
          </span>
          Comments
        </h4>
        <p class="lab-form-section__lead">
          Optional notes are stored on the domain event and copied into the platform approval request
          description for assignees.
        </p>
        <label
          class="crm-approval-submit-dialog__field-label"
          :id="generateUniqueId('crm-approval-comment-label')"
          :for="commentFieldId"
        >
          Comment
        </label>
        <Textarea
          v-model="comment"
          rows="4"
          class="w-full"
          placeholder="Optional context for approvers"
          :id="commentFieldId"
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
          :pt="{ root: { attrs: { id: generateUniqueId('crm-approval-cancel') } } }"
          @click="dialogVisible = false"
        />
        <Button
          label="Submit"
          icon="pi pi-check"
          :loading="submitting"
          :pt="{ root: { attrs: { id: generateUniqueId('crm-approval-submit') } } }"
          @click="submit"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
:global(.crm-approval-submit-dialog .crm-approval-submit-dialog__body) {
  padding: 1rem 1.25rem 1.25rem;
}

:global(.crm-approval-submit-dialog .p-dialog-footer) {
  margin: 0;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid color-mix(in srgb, var(--lab-general-border) 75%, transparent);
  background: var(--lab-integration-chrome-bg);
}

:global(.crm-approval-submit-dialog .p-textarea) {
  background: var(--lab-form-control-bg);
  border-color: var(--lab-form-control-border);
  color: var(--lab-general-text);
  font-size: 0.8125rem;
}

.crm-approval-submit-dialog__field-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.75rem;
  color: var(--lab-general-text-muted);
}
</style>
