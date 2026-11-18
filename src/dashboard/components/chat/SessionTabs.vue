<!-- src/dashboard/components/chat/SessionTabs.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import { AgentInteractionStatus, ChatSessionRecord } from '../../../shared/types';
import { personaUtils } from '@/shared/utils/persona-utils';

const props = defineProps<{
  sessionsRef: ChatSessionRecord[]
  activeSessionRef: ChatSessionRecord | null
  agentInteractionStatus: Map<string, AgentInteractionStatus>
  chatReady: boolean
  toast: ReturnType<typeof useToast>
  deleteCurrentSession: (sessionId: string) => Promise<boolean>
  createNewSession: () => Promise<string | null>,
  getPersonaBadgeColor: (personaName?: string) => string,
  getPersonaBadgeIcon: (personaName?: string) => string,
  focusAssistant: () => void;
  focusLab: () => void;
  focusedAssistant: boolean | undefined;
}>()
const emit = defineEmits<{
  (e: 'switch-chat-session-tab', sessionId: string): void;
}>();

const hasMultipleSessions = computed(() => props.sessionsRef.length > 1);

const switchChatSessionTab = (sessionId: string) => {
  emit('switch-chat-session-tab', sessionId);
};

const createNewSessionHandler = async () => {
  await props.createNewSession();
  showToast('Sessions', 'New session created', 3000);
};

const deleteCurrentSessionHandler = async (sessionId: string) => {
  await props.deleteCurrentSession(sessionId);
  showToast('Sessions', 'Sessioon removed', 3000);
};

// Toast notification handler
const showToast = (summary: string, detail: string, life: number = 3000) => {
  if (props.toast) {
    props.toast.add({
      severity: 'success',
      summary: summary,
      detail: detail,
      life: life
    });
  }
};

const isActiveSummarizing = computed(() => {
  if (props.activeSessionRef) {
    const curAgentInteractionStatus = props.agentInteractionStatus.get(props.activeSessionRef.sessionId)
    if (curAgentInteractionStatus) return curAgentInteractionStatus.isSummarizingMessasge

    return false
  }
  return false
})

</script>

<template>
  <div v-if="sessionsRef.length > 0"
    class="session-tabs-container lab-chat-session-tabs fixed left-0 right-0 bottom-[120px] text-xs shadow-[0_-8px_8px_rgba(0,0,0,0.25)] px-4 pt-2 pb-0 flex items-center gap-2 overflow-x-scroll scrollbar-thin lab-chat-scrollbar"
    :class="{
      'pointer-events-none opacity-50': isActiveSummarizing || !chatReady,
      'transition-all duration-500 hidden': !focusedAssistant,
      'transition-all duration-500 blur-[0px] opacity-100': focusedAssistant
    }">
    <div
      v-for="tab in sessionsRef"
      :key="tab.sessionId"
      class="lab-chat-tab rounded-sm whitespace-nowrap cursor-pointer flex items-center"
      :class="
        activeSessionRef?.sessionId === tab.sessionId
          ? 'lab-chat-tab--active'
          : 'lab-chat-tab--inactive'
      "
    >
      <div @click.stop="switchChatSessionTab(tab.sessionId)" class="px-2 py-1.5 flex items-center gap-1.5">
        <span class="text-xs">{{ tab.title }}</span>
        <div v-if="tab.persona" :class="getPersonaBadgeColor(tab.persona)">
          <i :class="['fa', getPersonaBadgeIcon(tab.persona)]" aria-hidden="true" />
          <span>{{ personaUtils.formatPersonaName(tab.persona) }}</span>
        </div>
      </div>
      <div v-if="hasMultipleSessions" @click.stop="deleteCurrentSessionHandler(tab.sessionId)"
        class="px-2 py-1.5 cursor-pointer flex items-center">
        <i class="text-xs fa fa-trash-can"></i>
      </div>
    </div>
    <div class="whitespace-nowrap">
      <Button
        label="New Chat"
        severity="secondary"
        outlined
        size="small"
        class="lab-chat-tab-new h-[30px]"
        :aria-label="'Create new chat session'"
        :disabled="isActiveSummarizing || !chatReady"
        @click.prevent="createNewSessionHandler"
      >
        <div class="text-xs">
          <i class="fa fa-plus mr-1"></i>New Chat
        </div>
      </Button>
    </div>
  </div>
  <!-- END SESSION TABS COMPONENT -->
</template>
