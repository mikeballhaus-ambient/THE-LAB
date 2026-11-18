<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { ZodSafeParseResult } from 'zod';
import { diffColors, type FileChanges, type UIChatMessage } from '@/shared/types';
import {
  type DistinctFileOperations,
  useFileOverview,
} from '@/shared/composables/components/useFileOverview';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = defineProps<{
  chatReady: boolean;
  activeMessages: UIChatMessage[];
  handleFileDiffs: (
    params: ZodSafeParseResult<{
      path: string;
      diffs: {
        start_line: number;
        updated: string;
        original?: string | undefined;
        is_additive?: boolean | undefined;
      }[] | undefined;
    }>,
    showPath: boolean,
    altPath?: string,
  ) => FileChanges;
  handleNewFileDiff: (
    paramsResult: ZodSafeParseResult<{
      path: string;
      content: string;
      overwrite: boolean;
      ensureDir: boolean;
    }>,
    showPath: boolean,
    altPath?: string,
  ) => FileChanges;
  handleRemoveFile: (
    params: ZodSafeParseResult<{
      path: string;
      recursive: boolean;
      force: boolean;
    }>,
    showPath: boolean,
    altPath?: string,
  ) => FileChanges;
}>();

const { generateUniqueId } = useUniqueElementId();

const {
  fileExpandedStateMap,
  toggleFileExpansion,
  getDistinctFileOperations,
  getTotalAdditions,
  getTotalRemovals,
} = useFileOverview(props.handleFileDiffs, props.handleNewFileDiff, props.handleRemoveFile);

const expandedPanel = ref(false);

const distinctFileOperations = computed((): DistinctFileOperations[] => {
  if (props.activeMessages.length === 0) {
    return [];
  }
  return getDistinctFileOperations(props.activeMessages);
});

const totalAdditions = computed(() => getTotalAdditions(distinctFileOperations.value));
const totalRemovals = computed(() => getTotalRemovals(distinctFileOperations.value));

watch(
  () => distinctFileOperations.value.length,
  (count, previous) => {
    if (previous === 0 && count > 0) {
      expandedPanel.value = true;
    }
  },
);
</script>

<template>
  <section
    v-if="chatReady && distinctFileOperations.length > 0"
    class="lab-sidecar-session-files text-xxs"
    :class="{ 'lab-sidecar-session-files--expanded': expandedPanel }"
    aria-label="File changes in this session"
  >
    <button
      type="button"
      class="lab-sidecar-session-files__summary"
      :id="generateUniqueId('lab-sidecar-files-toggle')"
      :aria-expanded="expandedPanel"
      @click="expandedPanel = !expandedPanel"
    >
      <span class="lab-sidecar-session-files__summary-leading">
        <span class="lab-sidecar-session-files__summary-icon" aria-hidden="true">
          <i class="fa-solid fa-copy" />
        </span>
        <span class="lab-sidecar-session-files__summary-label">Files</span>
        <span class="lab-sidecar-session-files__summary-count">{{
          distinctFileOperations.length
        }}</span>
      </span>
      <span class="lab-sidecar-session-files__stats">
        <span :class="diffColors.additive.text">+{{ totalAdditions }}</span>
        <span :class="diffColors.subtractive.text">-{{ totalRemovals }}</span>
      </span>
      <i
        class="fa-solid lab-sidecar-session-files__summary-chevron"
        :class="expandedPanel ? 'fa-chevron-up' : 'fa-chevron-down'"
        aria-hidden="true"
      />
    </button>
    <div v-show="expandedPanel" class="lab-sidecar-session-files__body lab-chat-scrollbar">
      <article
        v-for="file in distinctFileOperations"
        :key="file.path"
        class="lab-sidecar-session-files__list"
      >
        <button
          type="button"
          class="lab-sidecar-session-files__list-toggle"
          :id="generateUniqueId('lab-sidecar-file')"
          :aria-expanded="!!fileExpandedStateMap.get(file.path)"
          @click="toggleFileExpansion(file)"
        >
          <span class="lab-sidecar-session-files__list-leading min-w-0">
            <span class="lab-sidecar-session-files__chevron" aria-hidden="true">
              <i
                class="fa-solid"
                :class="fileExpandedStateMap.get(file.path) ? 'fa-chevron-down' : 'fa-chevron-right'"
              />
            </span>
            <i class="fa-solid fa-file" aria-hidden="true" />
            <span class="truncate font-mono" :title="file.path">{{ file.path }}</span>
          </span>
          <span class="lab-sidecar-session-files__stats">
            <span :class="diffColors.additive.text">
              +{{ file.operations.reduce((sum, item) => sum + item.totalAdditions, 0) }}
            </span>
            <span :class="diffColors.subtractive.text">
              -{{ file.operations.reduce((sum, item) => sum + item.totalRemovals, 0) }}
            </span>
          </span>
        </button>
        <div
          v-show="fileExpandedStateMap.get(file.path)"
          class="lab-sidecar-session-files__ops lab-chat-scrollbar font-mono"
        >
          <div
            v-for="(operation, oIdx) in file.operations"
            :key="oIdx"
            class="lab-sidecar-session-files__op"
          >
            <div class="lab-sidecar-session-files__op-detail" v-html="operation.html" />
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
