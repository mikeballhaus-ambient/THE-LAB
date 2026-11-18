import { computed, onUnmounted, ref, watch, type Ref } from 'vue';
import type { UIChatMessage } from '@/shared/types';
import { shouldShowLabSidecarTypingIndicator } from '@/shared/composables/lab-sidecar/lab-sidecar-chat-display';
import {
  getLabSidecarActivityPhase,
  pickLabSidecarWorkingLabel,
} from '@/shared/composables/lab-sidecar/lab-sidecar-activity-status';
import { getLabSidecarActivitySettingsRef } from '@/shared/composables/lab-sidecar/useLabSidecarActivitySettingsState';

export function useLabSidecarActivityLabel(
  messages: Ref<UIChatMessage[]>,
  isAwaiting: Ref<boolean>,
) {
  const activitySettings = getLabSidecarActivitySettingsRef();
  const workingIndex = ref(0);
  let rotateTimer: ReturnType<typeof setInterval> | undefined;

  const showStatus = computed(() =>
    shouldShowLabSidecarTypingIndicator(messages.value, isAwaiting.value),
  );

  const phase = computed(() => getLabSidecarActivityPhase(messages.value, isAwaiting.value));

  const workingLabels = computed(() => activitySettings.value.workingLabels);
  const rotateMs = computed(() => activitySettings.value.rotateIntervalMs);

  function clearRotateTimer(): void {
    if (rotateTimer !== undefined) {
      clearInterval(rotateTimer);
      rotateTimer = undefined;
    }
  }

  watch(
    [phase, rotateMs, workingLabels],
    ([next, intervalMs, labels], [prev]) => {
      clearRotateTimer();
      if (next === 'working') {
        if (prev !== 'working') {
          const len = labels.length;
          workingIndex.value = len > 0 ? Math.floor(Math.random() * len) : 0;
        }
        rotateTimer = setInterval(() => {
          workingIndex.value += 1;
        }, intervalMs);
      }
    },
    { immediate: true },
  );

  onUnmounted(clearRotateTimer);

  const activityLabel = computed(() => {
    if (!showStatus.value) return '';
    if (phase.value === 'working') {
      return pickLabSidecarWorkingLabel(workingIndex.value, workingLabels.value);
    }
    return activitySettings.value.thinkingLabel;
  });

  return { activityLabel, showStatus, phase };
}
