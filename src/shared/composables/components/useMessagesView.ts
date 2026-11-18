import { ref, computed, ComponentPublicInstance } from "vue";
import { useChatStickToBottom } from '@/shared/composables/useChatStickToBottom';
import { ChatSessionRecord, ChatMessageContent, ICommand, AgentInteractionStatus } from '../../../shared/types';
import { SplitterResizeEndEvent } from 'primevue/splitter';
import { sanitizeLabHtml } from '@/shared/utils/sanitize-lab-html';
import { renderLabMarkdown } from '@/shared/utils/render-lab-markdown';

export function useMessagesView(repoFiles: () => string[],
  commands: () => ICommand[],
  agentInteractionStatus: () => Map<string, AgentInteractionStatus>,
  activeSessionRef: () => ChatSessionRecord | null,
  updateSession: (sessionId: string, updates: Partial<ChatSessionRecord>) => Promise<void>,
) {

  const messagesContainer = ref<ComponentPublicInstance | null>(null);
  const expandedThinkingIndices = ref<Set<string>>(new Set());
  const expandedLogIds = ref<Set<string>>(new Set());
  const expandedToolBatchIds = ref<Set<string>>(new Set());
  const expandedFollowupChatIds = ref<Set<string>>(new Set());
  const {
    onScrollEvent: onMessagesPanelScroll,
    scrollToBottomIfPinned,
    pinAndScroll,
    resetPin,
    stickToBottom,
  } = useChatStickToBottom();

  const toggleLog = (logId: string) => {
    if (expandedLogIds.value.has(logId)) {
      expandedLogIds.value.delete(logId);
    } else {
      expandedLogIds.value.add(logId);
    }
  };

  const toggleToolBatch = (batchId: string) => {
    if (expandedToolBatchIds.value.has(batchId)) {
      expandedToolBatchIds.value.delete(batchId);
    } else {
      expandedToolBatchIds.value.add(batchId);
    }
  };

  const toggleThinking = (chatId: string) => {
    if (expandedThinkingIndices.value.has(chatId)) {
      expandedThinkingIndices.value.delete(chatId);
    } else {
      expandedThinkingIndices.value.add(chatId);
    }
  };

  const toggleFollowup = (chatId: string) => {
    if (expandedFollowupChatIds.value.has(chatId)) {
      expandedFollowupChatIds.value.delete(chatId);
    } else {
      expandedFollowupChatIds.value.add(chatId);
    }
  };

  function resolveScrollElement(
    container: ComponentPublicInstance | HTMLElement | null,
  ): HTMLElement | null {
    if (container && '$el' in container && container.$el instanceof HTMLElement) {
      const rootEl = container.$el;
      const scrollableDiv = rootEl.querySelector('.overflow-y-scroll, .overflow-y-auto');
      if (scrollableDiv instanceof HTMLElement) {
        return scrollableDiv;
      }
      return rootEl;
    }
    if (container instanceof HTMLElement) {
      return container;
    }
    return null;
  }

  const scrollToBottom = async (container: ComponentPublicInstance | HTMLElement | null): Promise<void> => {
    await scrollToBottomIfPinned(resolveScrollElement(container));
  };

  const forceScrollToBottom = async (
    container: ComponentPublicInstance | HTMLElement | null,
  ): Promise<void> => {
    pinAndScroll(resolveScrollElement(container));
  };

  /**
   * Chat text: streaming repair + per-newline breaks, then sanitize. The pipeline itself
   * lives in `shared/utils/render-lab-markdown.ts` so the Knowledge Base can share the same
   * `marked` configuration without inheriting the repair heuristics.
   */
  const agentMessageFormatter = (message: string | ChatMessageContent[]) => {
    const msg = message;

    if (typeof msg === 'string') {
      return renderLabMarkdown(msg, {
        repairStreamedMarkdown: true,
        stripLeakedToolCalls: true,
        breaks: true,
      });
    }

    return msg;
  };


  const userMessageFormatter = (message: string | ChatMessageContent[]) => {
    if (typeof message === 'string') {
      // Escape HTML first
      const escaped = message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '\'')

      let output = ''
      let i = 0
      const len = escaped.length

      while (i < len) {
        const ch = escaped[i]

        // --- Mention trigger ---
        if ((ch === '@' || ch === '/') && i + 1 < len) {
          // Capture mention text
          let j = i + 1
          while (j < len && !/\s/.test(escaped[j])) j++

          const mention = escaped.slice(i, j)
          //const type = ch === '@' ? 'file' : 'command'

          if (ch === '@') {
            const exsistingRepoFile = repoFiles().filter(_ => _ == mention.slice(1))
            if (exsistingRepoFile.length > 0) {
              output += `<span class="mention" data-type="file"><span>${mention}</span></span>`
            } else {
              output += mention
            }
          }

          if (ch === '/') {
            const exsistingCommand = commands().filter(_ => _.key == mention.slice(1))
            if (exsistingCommand.length > 0) {
              output += `<span class="mention" data-type="command"><span>${mention}</span></span>`
            } else {
              output += mention
            }
          }

          i = j
          continue
        }

        // --- Normal character ---
        output += ch
        i++
      }

      return sanitizeLabHtml(output)
    } else {
      return message
    }
  }

  const isActiveAwaitingResponse = computed(() => {
    const _activeSessionRef = activeSessionRef()
    if (_activeSessionRef) {
      const curAgentInteractionStatus = agentInteractionStatus().get(_activeSessionRef?.sessionId)
      if (curAgentInteractionStatus) return curAgentInteractionStatus.isAwaitingResponse

      return false
    }
    return false
  })

  const currentPersona = computed(() => {
    const _activeSessionRef = activeSessionRef()
    return _activeSessionRef ? _activeSessionRef.persona ? _activeSessionRef.persona : 'Chat' : 'Chat'
  })

  const splitterResizeEndHandler = async (evt: SplitterResizeEndEvent) => {
    const _activeSessionRef = activeSessionRef()
    if (_activeSessionRef) {
      await updateSession(_activeSessionRef.sessionId, {
        messagesWidth: evt.sizes[0],
        lastActivity: Date.now()
      });
    }
  };

  return {
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
    resetScrollPin: resetPin,
    stickToBottom,
    agentMessageFormatter,
    userMessageFormatter,
    isActiveAwaitingResponse,
    currentPersona,
    splitterResizeEndHandler,
  }
}
