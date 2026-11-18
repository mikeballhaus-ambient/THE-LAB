<script setup lang="ts">
import { computed, onMounted, ref, toRef, watch } from 'vue';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import type {
  AgentInteractionStatus,
  ChatSessionRecord,
  MCPToolCall,
  MCPToolResponse,
  UIChatMessage,
} from '@/shared/types';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { marked } from 'marked';
import { sanitizeLabHtml } from '@/shared/utils/sanitize-lab-html';
import {
  buildLabSidecarDisplayItems,
  getLabSidecarMessageText,
  labSidecarMessageHasVisibleText,
} from '@/shared/composables/lab-sidecar/lab-sidecar-chat-display';
import { useLabSidecarActivityLabel } from '@/shared/composables/lab-sidecar/useLabSidecarActivityLabel';
import { ensureLabSidecarActivitySettingsLoaded } from '@/shared/composables/lab-sidecar/useLabSidecarActivitySettingsState';
import LabChatCopyMessageButton from '@/shared/components/chat/LabChatCopyMessageButton.vue';
import { useChatStickToBottom } from '@/shared/composables/useChatStickToBottom';
import {
  summarizeToolResultMessage,
  toolPayloadFromSystemLog,
  resolveToolCallFromLogData,
} from '@/shared/utils/chat-tool-log-payload';
import { useLabSidecarShowToolResults } from '@/shared/composables/lab-sidecar/useLabSidecarShowToolResults';

const props = defineProps<{
  activeSessionRef: ChatSessionRecord | null;
  activeMessages: UIChatMessage[];
  chatReady: boolean;
  agentInteractionStatus: Map<string, AgentInteractionStatus>;
  inputMessage: string;
  stopRequest: () => Promise<void>;
  getMcpToolName: (toolCall: MCPToolCall) => string;
  formatMcpToolResult: (toolCall: MCPToolCall, toolResult: MCPToolResponse) => string;
}>();

const emit = defineEmits<{
  (e: 'send-message'): void;
  (e: 'update-input-message', value: string): void;
}>();

const { generateUniqueId } = useUniqueElementId();
const { showToolResults, toggleShowToolResults } = useLabSidecarShowToolResults();
const scrollRef = ref<HTMLElement | null>(null);
const expandedToolBatchIds = ref<Set<string>>(new Set());
const expandedLogIds = ref<Set<string>>(new Set());
const {
  onScrollEvent: onMessagesScroll,
  scrollToBottomIfPinned,
  pinAndScroll,
  resetPin,
} = useChatStickToBottom();

const isAwaiting = computed(() => {
  const sid = props.activeSessionRef?.sessionId;
  if (!sid) return false;
  return Boolean(props.agentInteractionStatus.get(sid)?.isAwaitingResponse);
});

const displayItems = computed(() =>
  buildLabSidecarDisplayItems(props.activeMessages, showToolResults.value),
);

const activeMessagesRef = toRef(props, 'activeMessages');
const { activityLabel, showStatus: showTypingIndicator } = useLabSidecarActivityLabel(
  activeMessagesRef,
  isAwaiting,
);

onMounted(() => {
  void ensureLabSidecarActivitySettingsLoaded();
});

function formatContent(message: UIChatMessage): string {
  const raw = getLabSidecarMessageText(message);
  if (!raw.trim()) return '';
  return sanitizeLabHtml(marked.parse(raw, { async: false }) as string);
}

function messageRowKey(message: UIChatMessage, index: number): string {
  if (message.chatId) return message.chatId;
  const snippet = getLabSidecarMessageText(message).slice(0, 24);
  return `${message.role}-${index}-${snippet}`;
}

function displayItemKey(item: (typeof displayItems.value)[number], index: number): string {
  if (item.kind === 'tool-batch') {
    return `tool-batch-${item.batchId}`;
  }
  return messageRowKey(item.message, index);
}

function toggleToolBatch(batchId: string): void {
  if (expandedToolBatchIds.value.has(batchId)) {
    expandedToolBatchIds.value.delete(batchId);
  } else {
    expandedToolBatchIds.value.add(batchId);
  }
}

function toggleLog(logId: string): void {
  if (expandedLogIds.value.has(logId)) {
    expandedLogIds.value.delete(logId);
  } else {
    expandedLogIds.value.add(logId);
  }
}

function toolSummary(message: UIChatMessage): string {
  return summarizeToolResultMessage(message, props.getMcpToolName);
}

watch(
  () => props.activeSessionRef?.sessionId,
  () => {
    resetPin();
    pinAndScroll(scrollRef.value);
  },
);

watch(
  () => {
    const items = displayItems.value;
    const lastMsg = [...items].reverse().find((i) => i.kind === 'message');
    const last = lastMsg?.kind === 'message' ? lastMsg.message : undefined;
    const assistantTail =
      last?.role === 'assistant' ? getLabSidecarMessageText(last).length : 0;
    return [items.length, showTypingIndicator.value, assistantTail, showToolResults.value] as const;
  },
  () => {
    void scrollToBottomIfPinned(scrollRef.value);
  },
);

function onSend(): void {
  pinAndScroll(scrollRef.value);
  emit('send-message');
}

function onInput(value: string | undefined): void {
  emit('update-input-message', value ?? '');
}
</script>

<template>
  <div class="lab-sidecar-chat">
    <div
      v-if="!activeSessionRef"
      class="lab-sidecar-chat__empty"
    >
      Open Laboratory (quick nav or comment-dots next to THE-LAB) to create a chat session. Session tabs here switch between existing conversations.
    </div>
    <div
      v-else
      ref="scrollRef"
      class="lab-sidecar-chat__messages lab-chat-scrollbar"
      :id="generateUniqueId('lab-sidecar-messages')"
      @scroll="onMessagesScroll"
    >
      <div
        v-if="displayItems.length === 0 && !showTypingIndicator"
        class="lab-sidecar-chat__empty"
      >
        Send a message to get help in context of your current apps view.
      </div>
      <template
        v-for="(item, index) in displayItems"
        :key="displayItemKey(item, index)"
      >
        <div
          v-if="item.kind === 'tool-batch'"
          class="lab-sidecar-chat__tool-batch"
        >
          <button
            type="button"
            class="lab-sidecar-chat__tool-batch-toggle lab-chat-tool-batch__toggle text-xs lab-chat-thinking-toggle transition-colors"
            :aria-expanded="expandedToolBatchIds.has(item.batchId)"
            @click="toggleToolBatch(item.batchId)"
          >
            <i class="fa-solid fa-screwdriver-wrench text-xs shrink-0" aria-hidden="true" />
            <span v-if="!expandedToolBatchIds.has(item.batchId)">
              Agent is using tools ({{ item.messages.length }})
            </span>
            <span v-else>Hide tool activity</span>
            <i
              class="fa-solid fa-chevron-down text-xs shrink-0 transition-transform"
              aria-hidden="true"
              :class="{ 'rotate-180': expandedToolBatchIds.has(item.batchId) }"
            />
          </button>
          <div
            v-show="expandedToolBatchIds.has(item.batchId)"
            class="lab-sidecar-chat__tool-batch-items"
          >
            <div
              v-for="toolMessage in item.messages"
              :key="toolMessage.systemLog?.id"
              class="lab-sidecar-chat__tool-row"
            >
              <button
                type="button"
                class="lab-sidecar-chat__tool-row-toggle lab-chat-log-row w-full text-left"
                :aria-expanded="expandedLogIds.has(toolMessage.systemLog?.id!)"
                @click="toggleLog(toolMessage.systemLog?.id!)"
              >
                <i
                  :class="`fa-solid ${toolMessage.systemLog?.success || resolveToolCallFromLogData(toolMessage.systemLog?.data)?.function.name === 'run_terminal_command' ? 'fa-check-circle text-lab-chat-log-success' : 'fa-times-circle text-lab-chat-log-error'}`"
                  class="shrink-0"
                  aria-hidden="true"
                />
                <span class="min-w-0 flex-1 leading-snug break-words">{{ toolSummary(toolMessage) }}</span>
                <i
                  class="fa-solid fa-chevron-down text-xs shrink-0 transition-transform"
                  aria-hidden="true"
                  :class="{ 'rotate-180': expandedLogIds.has(toolMessage.systemLog?.id!) }"
                />
              </button>
              <div
                v-show="expandedLogIds.has(toolMessage.systemLog?.id!)"
                class="lab-chat-tool-result-host lab-sidecar-chat__tool-detail"
                v-html="formatMcpToolResult(
                  toolPayloadFromSystemLog(toolMessage.systemLog?.data).toolCall!,
                  toolPayloadFromSystemLog(toolMessage.systemLog?.data).toolResult!
                )"
              />
            </div>
          </div>
        </div>
        <div
          v-else
          class="lab-sidecar-chat__row"
          :class="`lab-sidecar-chat__row--${item.message.role}`"
        >
          <div
            v-if="item.message.role === 'user'"
            class="lab-sidecar-chat__bubble lab-sidecar-chat__bubble--user"
          >
            {{ typeof item.message.content === 'string' ? item.message.content : '' }}
          </div>
          <div
            v-else
            class="lab-sidecar-chat__bubble lab-sidecar-chat__bubble--assistant"
            :class="{ 'lab-sidecar-chat__bubble--with-copy': labSidecarMessageHasVisibleText(item.message) }"
          >
            <LabChatCopyMessageButton
              v-if="labSidecarMessageHasVisibleText(item.message)"
              class="lab-sidecar-chat__copy-btn"
              :text="getLabSidecarMessageText(item.message)"
              id-prefix="lab-sidecar-copy-msg"
            />
            <div
              class="lab-sidecar-chat__markdown"
              v-html="formatContent(item.message)"
            />
          </div>
        </div>
      </template>
      <div
        v-if="showTypingIndicator"
        class="lab-sidecar-chat__row lab-sidecar-chat__row--assistant"
      >
        <div
          class="lab-sidecar-chat__bubble lab-sidecar-chat__bubble--assistant lab-sidecar-chat__bubble--typing"
          aria-live="polite"
        >
          <span class="lab-sidecar-chat__activity">{{ activityLabel }}</span>
        </div>
      </div>
    </div>

    <div
      v-if="activeSessionRef"
      class="lab-sidecar-chat__composer"
    >
      <Textarea
        :model-value="inputMessage"
        :disabled="!chatReady || isAwaiting"
        :auto-resize="true"
        rows="2"
        class="lab-sidecar-chat__input w-full"
        placeholder="Message the Lab Assistant…"
        :pt="{
          root: {
            attrs: { id: generateUniqueId('lab-sidecar-input') },
          },
        }"
        @update:model-value="onInput"
        @keydown.enter.exact.prevent="onSend"
      />
      <div class="lab-sidecar-chat__composer-actions">
        <Button
          type="button"
          size="small"
          severity="secondary"
          outlined
          :label="showToolResults ? 'Hide tools' : 'Show tools'"
          :pt="{ root: { attrs: { id: generateUniqueId('lab-sidecar-show-tools') } } }"
          @click="toggleShowToolResults"
        />
        <Button
          v-if="isAwaiting"
          type="button"
          severity="secondary"
          size="small"
          label="Stop"
          :pt="{ root: { attrs: { id: generateUniqueId('lab-sidecar-stop') } } }"
          @click="() => void stopRequest()"
        />
        <Button
          type="button"
          size="small"
          label="Send"
          class="lab-chat-micro-button"
          :disabled="!chatReady || isAwaiting"
          :pt="{ root: { attrs: { id: generateUniqueId('lab-sidecar-send') } } }"
          @click="onSend"
        />
      </div>
    </div>
  </div>
</template>
