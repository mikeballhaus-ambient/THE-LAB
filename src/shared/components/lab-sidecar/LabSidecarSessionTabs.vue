<script setup lang="ts">
import { computed } from 'vue';
import type { AgentInteractionStatus, ChatSessionRecord } from '@/shared/types';
import { personaUtils } from '@/shared/utils/persona-utils';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = defineProps<{
  sessionsRef: ChatSessionRecord[];
  activeSessionRef: ChatSessionRecord | null;
  agentInteractionStatus: Map<string, AgentInteractionStatus>;
  chatReady: boolean;
  getPersonaBadgeColor: (personaName?: string) => string;
  getPersonaBadgeIcon: (personaName?: string) => string;
}>();

const emit = defineEmits<{
  (e: 'switch-chat-session-tab', sessionId: string): void;
}>();

const { generateUniqueId } = useUniqueElementId();

const isActiveSummarizing = computed(() => {
  if (!props.activeSessionRef) return false;
  const status = props.agentInteractionStatus.get(props.activeSessionRef.sessionId);
  return Boolean(status?.isSummarizingMessasge);
});

const tabsDisabled = computed(() => isActiveSummarizing.value || !props.chatReady);

function onSelectTab(sessionId: string): void {
  if (tabsDisabled.value) return;
  if (props.activeSessionRef?.sessionId === sessionId) return;
  emit('switch-chat-session-tab', sessionId);
}
</script>

<template>
  <div
    v-if="sessionsRef.length > 0"
    class="lab-sidecar-session-tabs lab-chat-scrollbar"
    :class="{ 'lab-sidecar-session-tabs--disabled': tabsDisabled }"
    role="tablist"
    aria-label="Chat sessions"
  >
    <button
      v-for="tab in sessionsRef"
      :key="tab.sessionId"
      type="button"
      role="tab"
      class="lab-chat-tab lab-sidecar-session-tabs__tab rounded-sm whitespace-nowrap flex items-center gap-1.5 px-2 py-1.5"
      :class="
        activeSessionRef?.sessionId === tab.sessionId
          ? 'lab-chat-tab--active'
          : 'lab-chat-tab--inactive'
      "
      :aria-selected="activeSessionRef?.sessionId === tab.sessionId"
      :disabled="tabsDisabled"
      :id="generateUniqueId('lab-sidecar-session-tab')"
      @click="onSelectTab(tab.sessionId)"
    >
      <span class="text-xs truncate max-w-[8rem]">{{ tab.title }}</span>
      <span
        v-if="tab.persona"
        :class="['shrink-0', getPersonaBadgeColor(tab.persona)]"
      >
        <i :class="['fa', getPersonaBadgeIcon(tab.persona)]" aria-hidden="true" />
        <span>{{ personaUtils.formatPersonaName(tab.persona) }}</span>
      </span>
    </button>
  </div>
</template>
