<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import {
  fetchLabApprovalPolicies,
  fetchLabApprovalRequest,
} from '@/shared/services/platform-lab-approvals.client';
import type { LabApprovalPolicyRecord, LabApprovalRequestRecord } from '@/shared/types/lab-approval';
import { isApprovalRequestDecideSlot } from '@/shared/lab-integrations/approval-request-form-stub-filter';
import {
  buildLabApprovalPreviousActivityRows,
  type LabApprovalActivityRow,
} from '@/shared/utils/lab-approval-previous-activity';
import { fetchActivePlatformUsersForClient } from '@/shared/services/platform-user-client';
import { displayLabUserName } from '@/shared/utils/lab-comms-ui';

const props = defineProps<{
  slotId: string;
  context: Record<string, unknown>;
}>();

const { generateUniqueId } = useUniqueElementId();

const expanded = ref(false);
const loading = ref(false);
const loadError = ref<string | null>(null);
const request = ref<LabApprovalRequestRecord | null>(null);
const policy = ref<LabApprovalPolicyRecord | null>(null);
const userNameById = ref<Map<number, string>>(new Map());

const requestId = computed((): string | null => {
  const raw = props.context.requestId;
  if (typeof raw !== 'string' || !raw.trim()) {
    return null;
  }
  return raw.trim();
});

const isDecideDialog = computed(() => isApprovalRequestDecideSlot(props.slotId));

const activityRows = computed((): LabApprovalActivityRow[] => {
  if (!request.value) {
    return [];
  }
  return buildLabApprovalPreviousActivityRows(request.value, policy.value);
});

const showPanel = computed(
  () => isDecideDialog.value && requestId.value != null && activityRows.value.length > 0,
);

function formatDecidedAt(iso: string | undefined): string {
  if (!iso?.trim()) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function deciderLabel(userId: number | undefined): string {
  if (userId == null) {
    return '';
  }
  return userNameById.value.get(userId) ?? `User #${userId}`;
}

async function loadUsersForRows(rows: LabApprovalActivityRow[]): Promise<void> {
  const ids = new Set<number>();
  for (const row of rows) {
    if (row.kind === 'step' && row.decidedByUserId != null) {
      ids.add(row.decidedByUserId);
    }
  }
  if (ids.size === 0) {
    return;
  }
  const users = await fetchActivePlatformUsersForClient();
  const map = new Map<number, string>();
  for (const user of users) {
    if (ids.has(user.userId)) {
      map.set(user.userId, displayLabUserName(user));
    }
  }
  userNameById.value = map;
}

async function loadActivity(): Promise<void> {
  const id = requestId.value;
  if (!id || !isDecideDialog.value) {
    request.value = null;
    policy.value = null;
    return;
  }
  loading.value = true;
  loadError.value = null;
  try {
    const [req, policies] = await Promise.all([
      fetchLabApprovalRequest(id),
      fetchLabApprovalPolicies(),
    ]);
    request.value = req;
    policy.value = policies.find((p) => p.id === req.policyId) ?? null;
    const rows = buildLabApprovalPreviousActivityRows(req, policy.value);
    await loadUsersForRows(rows);
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Could not load approval history';
    request.value = null;
    policy.value = null;
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.slotId, requestId.value] as const,
  () => {
    expanded.value = false;
    void loadActivity();
  },
  { immediate: true },
);

watch(expanded, (open) => {
  if (open && request.value == null && !loading.value) {
    void loadActivity();
  }
});
</script>

<template>
  <section
    v-if="showPanel || loadError"
    class="lab-approval-decide-activity border-t border-lab-general-border/75 px-1 pt-4 mt-2"
    :id="generateUniqueId('lab-approval-decide-activity')"
  >
    <Message v-if="loadError" severity="warn" :closable="false" class="mb-2 text-sm">
      {{ loadError }}
    </Message>
    <template v-else-if="showPanel">
      <Button
        type="button"
        :label="expanded ? 'Hide previous activity' : 'Show previous activity'"
        :icon="expanded ? 'pi pi-chevron-up' : 'pi pi-history'"
        size="small"
        severity="secondary"
        text
        class="mb-2"
        :loading="loading"
        :pt="{ root: { attrs: { id: generateUniqueId('lab-approval-decide-activity-toggle') } } }"
        @click="expanded = !expanded"
      />
      <div
        v-show="expanded"
        class="lab-form-section__children flex flex-col gap-3"
        :id="generateUniqueId('lab-approval-decide-activity-body')"
      >
        <section
          v-for="(row, index) in activityRows"
          :key="row.kind === 'submission' ? 'submission' : `step-${row.stepIndex}`"
          class="lab-form-section lab-form-section--nested mb-0"
        >
          <h4 class="lab-form-section__title m-0 text-sm">
            <span class="lab-form-section__icon" aria-hidden="true">
              <i :class="row.kind === 'submission' ? 'pi pi-send' : 'pi pi-check-circle'" />
            </span>
            {{ row.kind === 'submission' ? row.label : row.label }}
          </h4>
          <p v-if="row.kind === 'step'" class="lab-form-section__lead mb-0 text-xs">
            <span
              class="inline-block rounded-md border border-lab-general-border/70 bg-lab-general-bg/50 px-2 py-0.5 font-medium"
              :class="
                row.decision === 'Approved'
                  ? 'text-lab-general-text'
                  : 'text-lab-general-text-muted'
              "
            >
              {{ row.decision }}
            </span>
            <template v-if="row.decidedByUserId != null">
              · {{ deciderLabel(row.decidedByUserId) }}
            </template>
            <template v-if="row.decidedAt">
              · {{ formatDecidedAt(row.decidedAt) }}
            </template>
          </p>
          <p
            v-if="row.comment"
            class="m-0 mt-2 text-sm text-lab-general-text whitespace-pre-wrap break-words"
            :id="generateUniqueId(`lab-approval-activity-comment-${index}`)"
          >
            {{ row.comment }}
          </p>
          <p
            v-else-if="row.kind === 'step'"
            class="m-0 mt-2 text-xs text-lab-general-text-muted italic"
          >
            No comment
          </p>
        </section>
      </div>
    </template>
  </section>
</template>
