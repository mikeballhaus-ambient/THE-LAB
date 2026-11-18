<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import InputNumber from 'primevue/inputnumber';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import {
  DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS,
  type LabSidecarActivitySettings,
} from '@/shared/types/lab-sidecar-activity-settings';
import {
  fetchPlatformLabSidecarActivitySettings,
  resetPlatformLabSidecarActivitySettings,
  savePlatformLabSidecarActivitySettings,
} from '@/shared/services/platform-lab-sidecar-activity.client';
import { applyLabSidecarActivitySettings } from '@/shared/composables/lab-sidecar/useLabSidecarActivitySettingsState';

const { generateUniqueId } = useUniqueElementId();
const thinkingLabelInputId = generateUniqueId('sidecar-thinking-label');
const workingLabelsInputId = generateUniqueId('sidecar-working-labels');
const rotateMsInputId = generateUniqueId('sidecar-rotate-ms');
const toast = useToast();

const loading = ref(false);
const saving = ref(false);
const thinkingLabel = ref(DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS.thinkingLabel);
const workingLabelsText = ref(
  DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS.workingLabels.join('\n'),
);
const rotateIntervalMs = ref(DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS.rotateIntervalMs);

function applyFormFromSettings(settings: LabSidecarActivitySettings): void {
  thinkingLabel.value = settings.thinkingLabel;
  workingLabelsText.value = settings.workingLabels.join('\n');
  rotateIntervalMs.value = settings.rotateIntervalMs;
}

function buildSettingsFromForm(): LabSidecarActivitySettings {
  const lines = workingLabelsText.value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return {
    thinkingLabel: thinkingLabel.value.trim(),
    workingLabels: lines,
    rotateIntervalMs: rotateIntervalMs.value,
  };
}

async function loadSettings(): Promise<void> {
  loading.value = true;
  try {
    const settings = await fetchPlatformLabSidecarActivitySettings();
    if (settings) {
      applyFormFromSettings(settings);
      applyLabSidecarActivitySettings(settings);
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Load failed',
      detail: err instanceof Error ? err.message : 'Could not load Sidecar activity text',
      life: 6000,
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadSettings();
});

async function saveSettings(): Promise<void> {
  saving.value = true;
  try {
    const payload = buildSettingsFromForm();
    const result = await savePlatformLabSidecarActivitySettings(payload);
    if (!result.success) {
      toast.add({
        severity: 'error',
        summary: 'Save failed',
        detail: result.error,
        life: 6000,
      });
      return;
    }
    applyFormFromSettings(result.settings);
    applyLabSidecarActivitySettings(result.settings);
    toast.add({ severity: 'success', summary: 'Sidecar activity text saved', life: 3000 });
  } finally {
    saving.value = false;
  }
}

async function resetDefaults(): Promise<void> {
  saving.value = true;
  try {
    const result = await resetPlatformLabSidecarActivitySettings();
    if (!result.success) {
      toast.add({
        severity: 'error',
        summary: 'Reset failed',
        detail: result.error,
        life: 6000,
      });
      return;
    }
    applyFormFromSettings(result.settings);
    applyLabSidecarActivitySettings(result.settings);
    toast.add({ severity: 'success', summary: 'Restored defaults', life: 3000 });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 max-w-2xl">
    <Message severity="info" :closable="false">
      Customize status text shown in the Lab Assistant Sidecar while a reply is in progress:
      <strong>Thinking…</strong> before tools run, then rotating lab phrases during tool activity.
    </Message>

    <div class="flex flex-col gap-2">
      <label :for="thinkingLabelInputId" class="text-sm font-medium text-lab-general-text">
        Thinking label
      </label>
      <InputText
        :id="thinkingLabelInputId"
        v-model="thinkingLabel"
        class="w-full"
        :disabled="loading || saving"
        maxlength="80"
      />
    </div>

    <div class="flex flex-col gap-2">
      <label :for="workingLabelsInputId" class="text-sm font-medium text-lab-general-text">
        Working labels (one per line, max 30)
      </label>
      <Textarea
        :id="workingLabelsInputId"
        v-model="workingLabelsText"
        class="w-full font-mono text-sm"
        rows="12"
        :disabled="loading || saving"
      />
    </div>

    <div class="flex flex-col gap-2">
      <label :for="rotateMsInputId" class="text-sm font-medium text-lab-general-text">
        Rotation interval (ms)
      </label>
      <InputNumber
        :input-id="rotateMsInputId"
        v-model="rotateIntervalMs"
        :min="1500"
        :max="15000"
        :step="100"
        :disabled="loading || saving"
      />
    </div>

    <div class="flex flex-wrap gap-2">
      <Button
        label="Save"
        icon="pi pi-check"
        :loading="saving"
        :disabled="loading"
        :pt="{ root: { attrs: { id: generateUniqueId('sidecar-activity-save') } } }"
        @click="saveSettings"
      />
      <Button
        label="Reset to defaults"
        severity="secondary"
        icon="pi pi-refresh"
        :loading="saving"
        :disabled="loading"
        :pt="{ root: { attrs: { id: generateUniqueId('sidecar-activity-reset') } } }"
        @click="resetDefaults"
      />
    </div>
  </div>
</template>
