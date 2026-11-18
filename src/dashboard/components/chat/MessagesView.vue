<script setup lang="ts">
import { watch, nextTick, computed } from 'vue';
import { buildChatDisplaySegments, type ChatDisplaySegment } from '@/shared/utils/build-chat-display-segments';
import { UIChatMessage, ChatSessionRecord, MCPToolCall, MCPToolResponse, ICommand, AgentInteractionStatus, FollowupParams, ChatPersona } from '../../../shared/types';
import { isRecord } from '@/shared/utils/record-narrowing';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import { useMessagesView } from '../../../shared/composables/components/useMessagesView';
import FollowupOptions from './FollowupOptions.vue';
import LabChatCopyMessageButton from '@/shared/components/chat/LabChatCopyMessageButton.vue';
import {
  getLabSidecarMessageText,
  labSidecarMessageHasVisibleText,
} from '@/shared/composables/lab-sidecar/lab-sidecar-chat-display';
// Track expanded thinking sections by chatId - stable across message insertions


const props = defineProps<{
  activeMessages: UIChatMessage[];
  activeSessionRef: ChatSessionRecord | null;
  focusAssistant: () => void;
  focusLab: () => void;
  updateSession: (sessionId: string, updates: Partial<ChatSessionRecord>) => Promise<void>;
  getMcpToolName: (toolCall: MCPToolCall) => string;
  formatMcpToolResult: (toolCall: MCPToolCall, toolResult: MCPToolResponse) => string;
  repoFiles: string[],
  commands: ICommand[],
  agentInteractionStatus: Map<string, AgentInteractionStatus>,
  handleFollowupSubmitted: (data: FollowupParams, messageRef: UIChatMessage, persona: ChatPersona) => Promise<void>,
  focusedAssistant: boolean | undefined,
}>();

const {
  messagesContainer,
  expandedLogIds,
  expandedToolBatchIds,
  toggleThinking,
  expandedThinkingIndices,
  toggleLog,
  toggleToolBatch,
  expandedFollowupChatIds,
  toggleFollowup,
  scrollToBottom,
  forceScrollToBottom,
  onMessagesPanelScroll,
  resetScrollPin,
  stickToBottom,
  agentMessageFormatter,
  userMessageFormatter,
  isActiveAwaitingResponse,
  currentPersona,
  splitterResizeEndHandler,
} = useMessagesView(() => props.repoFiles,
  () => props.commands,
  () => props.agentInteractionStatus,
  () => props.activeSessionRef,
  props.updateSession,
)

function toolPayloadFromSystemLog(data: unknown): { toolCall?: MCPToolCall; toolResult?: MCPToolResponse } {
  if (!isRecord(data)) {
    return {};
  }
  const toolCall = (data.toolCall ?? data.toolcall) as MCPToolCall | undefined;
  const toolResult = (data.toolResult ?? data.toolresult) as MCPToolResponse | undefined;
  return { toolCall, toolResult };
}

function isMcpToolCall(value: unknown): value is MCPToolCall {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.type === 'function' &&
    isRecord(value.function) &&
    typeof value.function.name === 'string'
  );
}

function resolveToolCallFromLogData(data: unknown): MCPToolCall | undefined {
  const wrapped = toolPayloadFromSystemLog(data);
  if (wrapped.toolCall) {
    return wrapped.toolCall;
  }
  if (isMcpToolCall(data)) {
    return data;
  }
  return undefined;
}

const displaySegments = computed(() => buildChatDisplaySegments(props.activeMessages));

function displaySegmentKey(segment: ChatDisplaySegment, index: number): string {
  if (segment.kind === 'tool-batch') {
    return `tool-batch-${segment.batchId}`;
  }
  const msg = props.activeMessages[segment.messageIndex];
  return `msg-${segment.messageIndex}-${msg?.chatId ?? index}`;
}

function messageAt(index: number): UIChatMessage {
  return props.activeMessages[index];
}

function messageIndexFromSegment(segment: ChatDisplaySegment): number {
  return segment.kind === 'message' ? segment.messageIndex : -1;
}

function toolResultSummary(message: UIChatMessage): string {
  const { toolCall } = toolPayloadFromSystemLog(message.systemLog?.data);
  const fromRegistry = toolCall ? props.getMcpToolName(toolCall) : '';
  const name =
    fromRegistry.trim() ||
    message.systemLog?.title ||
    toolCall?.function?.name ||
    'Tool';
  const ok =
    message.systemLog?.success || toolCall?.function?.name === 'run_terminal_command';
  return `${name} — ${ok ? 'Success' : 'Failed'}`;
}

const scrollMessagesWhenPinned = async () => {
  if (!stickToBottom.value) {
    return;
  }
  if (messagesContainer.value) {
    const scrollables = messagesContainer.value?.$el.querySelectorAll(
      '.user-message, .assistant-message, .thinking-message',
    );
    scrollables?.forEach((el: HTMLElement) => {
      el.scrollTop = el.scrollHeight;
    });
  }
  await scrollToBottom(messagesContainer.value);
};

watch(() => props.activeMessages, scrollMessagesWhenPinned, { deep: true });

watch(() => props.activeSessionRef, async (newVal, oldVal) => {
  if (newVal !== oldVal && newVal) {
    resetScrollPin();
    await nextTick(async () => await forceScrollToBottom(messagesContainer.value));
  }
},
  { deep: true }
);

watch(() => props.focusedAssistant, async (newVal, oldVal) => {
  if (newVal !== oldVal && newVal) {
    await nextTick(async () => await scrollToBottom(messagesContainer.value));
  }
}, { immediate: true, deep: true });
</script>

<template>
  <!-- BEGIN MESSAGES VIEW COMPONENT -->
  <div class="messages-view-container">

    <Splitter
      pt:root="border-0!"
      pt:gutter:class="lab-chat-splitter-gutter"
      :gutter-size="5"
      :step="5"
      @resizeend="splitterResizeEndHandler"
      class="lab-chat-assistant-splitter bg-transparent! fixed left-0 right-0 bottom-[170px] h-[calc(100vh-170px)]"
      :class="{
        'transition-all duration-500 opacity-100!': focusedAssistant,
        'transition-all duration-500 z-0 hidden!': !focusedAssistant
      }">
      <!-- Messages Container -->
      <SplitterPanel
        ref="messagesContainer"
        class="lab-chat-messages-splitter-panel"
        @click="() => focusAssistant()"
        :size="props.activeSessionRef?.messagesWidth ? props.activeSessionRef.messagesWidth : 40"
        :minSize="20"
        :class="{
          'opacity-50': props.activeMessages.length == 0,
        }"
      >
        <div v-if="props.activeMessages.length == 0" class="flex flex-1 justify-center items-center h-full">
          New Session
        </div>
        <div
          class="lab-chat-messages-panel p-0 h-full bg-lab-chat-canvas overflow-y-scroll scrollbar-thin lab-chat-scrollbar transition-all duration-300 ease-in-out"
          @scroll="onMessagesPanelScroll"
        >
          <!-- Message Bubbles -->
          <template v-for="(segment, sIdx) in displaySegments" :key="displaySegmentKey(segment, sIdx)">
          <!-- Grouped tool-result batch -->
          <div
            v-if="segment.kind === 'tool-batch'"
            class="px-2 flex flex-col py-1"
          >
            <div class="mt-2 mb-2 w-full min-w-0 text-sm">
              <button
                type="button"
                class="lab-chat-tool-batch__toggle ml-3 flex items-center gap-1 text-xs lab-chat-thinking-toggle transition-colors"
                :aria-expanded="expandedToolBatchIds.has(segment.batchId)"
                @click="toggleToolBatch(segment.batchId)"
              >
                <i class="fa-solid fa-screwdriver-wrench text-xs mt-0.5 shrink-0" aria-hidden="true" />
                <span v-if="!expandedToolBatchIds.has(segment.batchId)">
                  Agent is using tools ({{ segment.messageIndices.length }})
                </span>
                <span v-else>Hide tool activity</span>
                <i
                  class="fa-solid fa-chevron-down text-xs shrink-0 transform transition-transform"
                  aria-hidden="true"
                  :class="{ 'rotate-180': expandedToolBatchIds.has(segment.batchId) }"
                />
              </button>
              <div
                v-show="expandedToolBatchIds.has(segment.batchId)"
                class="lab-chat-tool-batch__items mt-2 text-xs w-full min-w-0"
              >
                  <div
                    v-for="mIdx in segment.messageIndices"
                    :key="messageAt(mIdx).systemLog?.id ?? mIdx"
                    class="text-xs w-full min-w-0"
                  >
                    <div class="ml-1 mr-1 w-full min-w-0 pb-1">
                      <div
                        role="button"
                        tabindex="0"
                        class="cursor-pointer flex gap-2 items-center justify-between lab-chat-log-row px-2 py-1 rounded-lg log-toggle w-full min-w-0"
                        @click="toggleLog(messageAt(mIdx).systemLog?.id!)"
                        @keydown.enter.prevent="toggleLog(messageAt(mIdx).systemLog?.id!)"
                        @keydown.space.prevent="toggleLog(messageAt(mIdx).systemLog?.id!)"
                      >
                        <div class="flex gap-2 items-center min-w-0 flex-1">
                          <i
                            :class="`fa-solid ${messageAt(mIdx).systemLog?.success || resolveToolCallFromLogData(messageAt(mIdx).systemLog?.data)?.function.name == 'run_terminal_command' ? 'fa-check-circle text-lab-chat-log-success' : 'fa-times-circle text-lab-chat-log-error'}`"
                            class="shrink-0"
                            aria-hidden="true"
                          />
                          <span class="min-w-0 flex-1 leading-snug break-words">{{ toolResultSummary(messageAt(mIdx)) }}</span>
                        </div>
                        <i
                          class="fa-solid fa-chevron-down text-xs shrink-0 ml-1 transition-transform"
                          aria-hidden="true"
                          :class="{ 'rotate-180': expandedLogIds.has(messageAt(mIdx).systemLog?.id!) }"
                        />
                      </div>
                      <div
                        v-show="expandedLogIds.has(messageAt(mIdx).systemLog?.id!)"
                        class="lab-chat-tool-result-host mt-1 min-w-0"
                      >
                        <div
                          v-html="formatMcpToolResult(
                            toolPayloadFromSystemLog(messageAt(mIdx).systemLog?.data).toolCall!,
                            toolPayloadFromSystemLog(messageAt(mIdx).systemLog?.data).toolResult!
                          )"
                        />
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </div>
          <div
            v-else
            v-for="message in [messageAt(messageIndexFromSegment(segment))]"
            :key="message.chatId ?? messageIndexFromSegment(segment)"
            class="px-2 flex flex-col"
            v-show="message.role !== 'system' || message.systemLog?.isResult"
            :class="{
              'py-1': message.role !== 'system'
            }"
          >
            <div class="flex flex-col items-start gap-0 text-sm">
              <!-- Role Icon -->
              <div class="flex items-baseline gap-2 whitespace-nowrap w-full min-w-0">
                <i v-if="message.role === 'user'" class="text-lab-chat-user fa-solid fa-user mt-1"></i>
                <i v-if="message.role === 'assistant'" class="text-lab-chat-assistant fa-solid fa-flask mt-1"></i>
                <div v-if="message.role !== 'system'" class="font-bold text-lab-chat-canvas">
                  {{ message.role === 'user' ? 'You' : 'Lab Assistant' }}:
                </div>
                <div
                  v-if="message.role == 'assistant' && !message.isComplete && isActiveAwaitingResponse"
                  class="truncate px-2 py-1 text-lab-chat-assistant"
                >
                  <div class="dot"></div>
                  <div class="dot"></div>
                  <div class="dot"></div>
                </div>
              </div>

              <!-- Thinking toggle section -->
              <div v-if="(message.thinkingBuffer || message.reasoning) && message.chatId" class="mt-2 mb-2">
                <div @click="toggleThinking(message.chatId!)"
                  class="ml-3 cursor-pointer flex items-center gap-1 text-xs lab-chat-thinking-toggle transition-colors">
                  <i class="fa-solid fa-lightbulb mt-0.5"></i>
                  <span v-if="!expandedThinkingIndices.has(message.chatId!)">See my thinking</span>
                  <span v-if="expandedThinkingIndices.has(message.chatId!)">Hide my thinking</span>
                  <i class="fa-solid fa-chevron-down text-xs transform transition-transform"
                    :class="{ 'rotate-180': expandedThinkingIndices.has(message.chatId!) }"></i>
                </div>
                <div v-if="expandedThinkingIndices.has(message.chatId!)"
                  v-html="agentMessageFormatter((message.thinkingBuffer || message.reasoning) as string)"
                  class="thinking-message mt-2 text-xs lab-chat-thinking-panel italic overflow-y-auto !max-h-[200px] scrollbar-thin lab-chat-scrollbar">
                </div>
              </div>

              <!-- Followup Options for assistant messages -->
              <div v-if="message.followupData" class="w-full m-1">
                <FollowupOptions :message="message" :persona="currentPersona" :followup-data="message.followupData"
                  :handle-followup-submitted="handleFollowupSubmitted" :toggle-followup="toggleFollowup"
                  :is-hidden="expandedFollowupChatIds.has(message.chatId!)" />
              </div>

              <div
                v-if="message.role === 'user'
                  || (message.role === 'assistant' && ((message.content && (message.content as string).trim().length > 0) || (message.contentBuffer && (message.contentBuffer as string).trim().length > 0)))"
                :class="{
                  'lab-chat-bubble-user p-2 m-1 shadow': message.role === 'user',
                  'lab-chat-bubble-assistant p-2 m-1 shadow': message.role === 'assistant',
                  'lab-chat-bubble-assistant--with-copy':
                    message.role === 'assistant' && labSidecarMessageHasVisibleText(message),
                }" class="rounded-lg w-full">

                <!-- user display -->
                <div v-if="message.role === 'user'"
                  class="user-message max-h-[200px]! overflow-y-auto text-[13px]! text-lab-chat-user scrollbar-thin lab-chat-scrollbar"
                  v-html="userMessageFormatter(message.content)"></div>

                <!-- assistant display -->
                <template v-if="message.role === 'assistant'">
                  <LabChatCopyMessageButton
                    v-if="labSidecarMessageHasVisibleText(message)"
                    class="lab-chat-bubble-assistant__copy shrink-0"
                    :text="getLabSidecarMessageText(message)"
                    id-prefix="lab-assistant-copy"
                  />
                  <div
                    ref="assistantDisplay"
                    class="assistant-message max-h-[400px]! overflow-y-auto text-[13px]! text-lab-chat-assistant scrollbar-thin lab-chat-scrollbar"
                    v-html="agentMessageFormatter(message.contentBuffer || message.content)"
                  />
                </template>
              </div>
            </div>
          </div>
          </template>
        </div>
      </SplitterPanel>
      <SplitterPanel @click="() => focusLab()" :size="75"
        class="focus-apps-toggle bg-transparent! w-full h-full flex-1">
        <div></div>
      </SplitterPanel>
    </Splitter>
  </div>
  <!-- END MESSAGES VIEW COMPONENT -->
</template>

<style scoped>
@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

.dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background-color: var(--lab-chat-assistant-text);
  border-radius: 50%;
  animation: pulse 1.4s ease-in-out infinite;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}
</style>
