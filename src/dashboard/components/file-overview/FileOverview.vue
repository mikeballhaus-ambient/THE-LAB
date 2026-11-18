<script setup lang="ts">
import { computed } from 'vue';
import { diffColors } from '../../../shared/types'
import { ZodSafeParseResult } from 'zod';
import { FileChanges, UIChatMessage } from '../../../shared/types';
import { useFileOverview } from '../../../shared/composables/components/useFileOverview';

const props = defineProps<{
    isActive: boolean,
    activeMessages: UIChatMessage[],
    handleFileDiffs(params: ZodSafeParseResult<{
        path: string;
        diffs: {
            start_line: number;
            updated: string;
            original?: string | undefined;
            is_additive?: boolean | undefined;
        }[] | undefined
    }>, showPath: boolean, altPath?: string): FileChanges,
    handleNewFileDiff(paramsResult: ZodSafeParseResult<{
        path: string;
        content: string;
        overwrite: boolean;
        ensureDir: boolean;
    }>, showPath: boolean, altPath?: string): FileChanges,
    handleRemoveFile(params: ZodSafeParseResult<{
        path: string;
        recursive: boolean;
        force: boolean;
    }>, showPath: boolean, altPath?: string): FileChanges
}>()

const { fileExpandedStateMap, fileOpsPanelToggled, toggleFileExpansion, getDistinctFileOperations, getTotalAdditions, getTotalRemovals } = useFileOverview(props.handleFileDiffs, props.handleNewFileDiff, props.handleRemoveFile)
const distinctFileOperations = computed(() => {
    if (props.activeMessages.length == 0) return []
    return getDistinctFileOperations(props.activeMessages)
})

const totalAdditions = computed(() => {
    return getTotalAdditions(distinctFileOperations.value)
});

const totalRemovals = computed(() => {
    return getTotalRemovals(distinctFileOperations.value)
});


</script>
<template>
    <div class="z-5 fixed right-1" :class="{
        'bottom-[-1000px] transition-all duration-500 blur-[5px] opacity-50': !(isActive && distinctFileOperations.length > 0),
        'bottom-[175px] transition-all duration-500 blur-[0px] opacity-100': isActive && distinctFileOperations.length > 0
    }">
        <div class="lab-chat-session-overlay">
            <div class="lab-chat-session-overlay__stack">
                <div
                    class="lab-chat-session-overlay__summary lab-chat-session-overlay__summary--split"
                    @click="() => fileOpsPanelToggled = !fileOpsPanelToggled"
                >
                    <div class="lab-chat-session-overlay__summary-leading">
                        <i class="lab-chat-session-overlay__summary-icon fa-solid fa-copy" aria-hidden="true" />
                        <span class="text-lab-general-text-muted">
                            {{ distinctFileOperations.length }} file(s) changed in this chat
                        </span>
                    </div>
                    <div class="lab-chat-session-overlay__stats">
                        <span :class="diffColors.additive.text">+{{ totalAdditions }}</span>
                        <span :class="diffColors.subtractive.text">-{{ totalRemovals }}</span>
                    </div>
                </div>
                <div v-if="fileOpsPanelToggled" class="lab-chat-session-overlay__body text-sm">
                    <div
                        v-for="file in distinctFileOperations"
                        :key="file.path"
                        class="lab-chat-session-overlay__list-block"
                    >
                        <div
                            class="lab-chat-session-overlay__list-toggle lab-chat-session-overlay__list-toggle--split text-xs font-mono"
                            @click="() => toggleFileExpansion(file)"
                        >
                            <div class="lab-chat-session-overlay__list-leading">
                                <i
                                    class="lab-chat-session-overlay__chevron fa-solid"
                                    :class="fileExpandedStateMap.get(file.path) ? 'fa-chevron-down' : 'fa-chevron-right'"
                                    aria-hidden="true"
                                />
                                <i class="fa-solid fa-file" aria-hidden="true" />
                                <span :title="file.path">{{ file.path }}</span>
                            </div>
                            <div class="lab-chat-session-overlay__stats">
                                <span :class="diffColors.additive.text">
                                    +{{ file.operations.reduce((sum, item) => sum + item.totalAdditions, 0) }}
                                </span>
                                <span :class="diffColors.subtractive.text">
                                    -{{ file.operations.reduce((sum, item) => sum + item.totalRemovals, 0) }}
                                </span>
                            </div>
                        </div>
                        <div
                            v-show="fileExpandedStateMap.get(file.path)"
                            class="lab-chat-session-overlay__items lab-chat-scrollbar text-xs font-mono"
                        >
                            <div
                                v-for="(operation, oIdx) in file.operations"
                                :key="oIdx"
                                class="lab-chat-session-overlay__item"
                            >
                                <div class="lab-chat-session-overlay__item-detail lab-chat-session-overlay__item-detail--flush">
                                    <div v-html="operation.html"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
