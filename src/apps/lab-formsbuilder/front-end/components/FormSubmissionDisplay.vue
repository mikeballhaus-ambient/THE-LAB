<template>
  <div class="w-full">
    <Card class="submission-card">
      <template #title>
        <div class="flex items-center gap-2 text-sm font-semibold text-lab-general-text">
          <i class="pi pi-file-alt"></i>
          Recent Submissions
        </div>
      </template>

      <template #content>
        <div v-if="!props.serverUrl" class="flex flex-col items-center justify-center gap-3 p-5 text-center">
          <i class="pi pi-server text-2xl text-lab-general-text-muted"></i>
          <p class="text-sm text-lab-general-text-muted">Launch the Forms Builder app server to load submissions.</p>
        </div>

        <div v-else-if="loading" class="flex flex-col items-center justify-center gap-4 p-5 text-center">
          <div class="w-10 h-10 border-4 border-lab-general-border border-t-cyan-400 rounded-full animate-spin"></div>
          <p class="text-sm text-lab-general-text-muted">Loading submissions...</p>
        </div>

        <div v-else-if="error" class="flex flex-col items-center justify-center gap-4 p-5 text-center">
          <i class="pi pi-exclamation-circle text-xl text-red-400 mb-2"></i>
          <p class="text-sm text-lab-general-text-muted">{{ error }}</p>
        </div>

        <div v-else-if="submissions.length === 0"
          class="flex flex-col items-center justify-center gap-3 p-4 text-center">
          <i class="pi pi-inbox text-2xl text-lab-general-text-muted"></i>
          <p class="text-sm text-lab-general-text-muted">No submissions yet</p>
          <p class="text-xs text-lab-general-text-muted">Submissions will appear here when the form is submitted through a connected
            connector.</p>
        </div>

        <div v-else class="flex flex-col gap-2">
          <div
            v-for="submission in submissions"
            :key="submission.id"
            class="p-3 rounded-lg border border-lab-general-border bg-lab-general-bg-muted/40"
          >
            <div class="flex justify-between items-center mb-2">
              <span class="text-xs text-lab-general-text-muted">{{ submission.created_at ? formatDate(submission.created_at) : '' }}</span>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium border"
                :class="{
                  'border-amber-500/50 text-amber-200 bg-amber-950/40': submission.status === 'pending',
                  'border-green-500/50 text-green-200 bg-green-950/40': submission.status === 'success',
                  'border-red-500/50 text-red-200 bg-red-950/40': submission.status === 'error',
                }"
              >
                {{ getStatusText(submission.status) }}
              </span>
            </div>

            <div class="flex flex-col gap-1 mb-2">
              <div v-for="(value, key) in submission.data" :key="key" class="flex justify-between text-xs gap-2">
                <span class="text-lab-general-text-muted shrink-0">{{ key }}</span>
                <span class="font-medium text-lab-general-text text-right break-all">{{ value }}</span>
              </div>
            </div>

            <Button
              v-if="showDetails"
              label="View Details"
              icon="pi pi-eye"
              severity="secondary"
              @click="viewSubmission(submission)"
              class="w-full"
              :pt="{ root: { id: generateUniqueId('view-submission-btn') } }"
            />
          </div>
        </div>
      </template>

      <template #footer v-if="submissions.length > 0">
        <Button
          label="Clear History"
          icon="pi pi-trash"
          severity="secondary"
          @click="clearSubmissions"
          class="w-full"
          :pt="{ root: { id: generateUniqueId('clear-submissions-btn') } }"
        />
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { FormSchema, FormSubmission } from '../../shared/types';
import { API_V1_PREFIX, apiUrl, apiFetch, parseJsonResponse } from '../utils/api-client';

const props = defineProps<{
  forms: FormSchema[];
  serverUrl?: string;
  showDetails?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submission-added', submission: FormSubmission): void;
}>();

const loading = ref(false);
const error = ref<string | null>(null);
const submissions = ref<FormSubmission[]>([]);
let loadRequestId = 0;

const { generateUniqueId } = useUniqueElementId();

function parseSubmissionData(data: FormSubmission['data']): FormSubmission['data'] {
  if (data == null) return {};
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data) as FormSubmission['data'];
  } catch {
    return { raw: data };
  }
}

async function loadSubmissions(): Promise<void> {
  if (!props.serverUrl) {
    loading.value = false;
    error.value = null;
    submissions.value = [];
    return;
  }

  const requestId = ++loadRequestId;
  loading.value = true;
  error.value = null;

  try {
    const selectedFormKey =
      props.forms.find((f) => f.formKey)?.formKey ?? props.forms[0]?.formKey;
    const query = selectedFormKey ? `?formKey=${encodeURIComponent(selectedFormKey)}` : '';
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    const response = await apiFetch(apiUrl(props.serverUrl, `${API_V1_PREFIX}/submissions${query}`), {
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);

    if (requestId !== loadRequestId) return;

    const data = await parseJsonResponse<{ submissions: FormSubmission[] }>(response);
    submissions.value = (data.submissions ?? []).map((row) => ({
      ...row,
      data: parseSubmissionData(row.data),
    }));
  } catch (err: unknown) {
    if (requestId !== loadRequestId) return;
    if (err instanceof DOMException && err.name === 'AbortError') {
      error.value = 'Timed out loading submissions. Check that the Forms Builder server is running.';
    } else {
      error.value = err instanceof Error ? err.message : 'Failed to load submissions';
    }
  } finally {
    if (requestId === loadRequestId) {
      loading.value = false;
    }
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusText(status: string | undefined): string {
  if (!status) return ''
  switch (status) {
    case 'success':
      return 'Success';
    case 'pending':
      return 'Pending';
    case 'error':
      return 'Error';
    default:
      return status;
  }
}

function viewSubmission(submission: FormSubmission): void {
  console.log('Viewing submission:', submission);
}

function clearSubmissions(): void {
  submissions.value = [];
  emit('submission-added', {} as FormSubmission);
}

onMounted(() => {
  void loadSubmissions();
});

watch(
  () => [props.serverUrl, props.forms.map((f) => f.formKey).join(',')] as const,
  () => {
    void loadSubmissions();
  }
);
</script>
