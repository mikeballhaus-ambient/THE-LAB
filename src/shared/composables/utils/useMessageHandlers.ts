import { Ref } from "vue";
import { Socket } from 'socket.io-client';
import { SOCKET_EVENTS, UIChatMessage, TokenProgressEvent, ChatResponseData, ToolCallAgentMesssage, FirstMessageReceivedEventData, FirstMessageEditedEventData, ToolCallEventData, ToolResultEventData, StreamingDelta, StreamingDone, SendChatMesssageData, AgentInteractionStatus, ChatSessionRecord, User } from '../../../shared/types';
import { toLabSidecarChatContext } from '@/shared/types/lab-sidecar-view-context';
import type { LabWorkspaceContextApi } from '@/shared/composables/useLabWorkspaceContext';

export type ChatSendChannel = 'assistant' | 'sidecar';
import { mergeAgentInteractionStatus, clearPersonaDelegationStatus } from './agent-interaction-status';
import { resolveEmptyChatSendText } from '@/shared/utils/chat-empty-send-default';
import type { LabAssistantBanterRequest } from '@/shared/game-platform/lab-assistant-banter/types';
import { extractLeakedToolCallsFromText } from '@/shared/utils/leaked-tool-call-extraction';
import { stripLeakedNativeToolCallsFromText } from '@/shared/utils/strip-leaked-assistant-tool-calls';
import {
  dequeuePendingLabGameBanter,
  enqueuePendingLabGameBanter,
} from '@/shared/composables/lab-sidecar/pending-lab-game-banter';
import { notifyLabGameSidecarSummarizeDone } from '@/shared/composables/lab-sidecar/lab-game-sidecar-summarize-wait';
import { bumpSlowTurnBanterIdleTimer } from '@/shared/game-platform/lab-assistant-banter/slow-turn-banter-idle-registry';
import { getLabSidecarGameMatchSnapshot, enrichLabSidecarGameMatchSnapshotWithUser } from '@/shared/composables/lab-sidecar/lab-sidecar-game-match-snapshot';
import { readLabSidecarGameEngagementFromHost } from '@/shared/composables/lab-sidecar/useLabSidecarGameSession';
import { shouldApplyAutoSessionTitleFromFirstMessage } from '@/shared/composables/lab-sidecar/lab-game-sidecar-session-resolve';

const STREAMING_PERSIST_DEBOUNCE_MS = 120;

export function useMessageHandlers(
  activeSessionRef: () => ChatSessionRecord | null,
  messagesRef: () => Map<string, UIChatMessage[]> | undefined,
  socketConnection: Ref<Socket | null>,
  setContextUsed: (sessionId: string, percentage: number) => Promise<void>,
  updateMessages: (sessionId: string) => Promise<void>,
  bumpMessagesRef: (sessionId: string) => void,
  saveMessage: (sessionId: string, message: UIChatMessage | null) => Promise<void>,
  agentInteractionStatus: Ref<Map<string, AgentInteractionStatus>>,
  insertBeforePlaceholder: (chatId: string, sessionId: string | undefined, newMessage: UIChatMessage) => Promise<void>,
  waitForPendingMessageInserts: (sessionId: string) => Promise<void>,
  focusAssistant: () => void,
  getStreamingEnabled: () => Promise<boolean>,
  updateSession: (sessionId: string, updates: Partial<ChatSessionRecord>) => Promise<void>,
  sessionsRef: () => ChatSessionRecord[],
  inputMessage: Ref<string>,
  sidecarInputMessage: Ref<string>,
  focusedAssistant: Ref<boolean | undefined>,
  getDeveloperMode: () => Promise<boolean>,
  user: Ref<User | null>,
  getLabWorkspaceContext: () => LabWorkspaceContextApi | null,
) {
  function buildLabSidecarEmitContext() {
    const workspace = getLabWorkspaceContext();
    const baseCtx = workspace?.viewContext.value;
    if (baseCtx == null) {
      return undefined;
    }
    return toLabSidecarChatContext({
      ...baseCtx,
      hostContext: {
        ...(baseCtx.hostContext ?? {}),
        ...(workspace?.hostContext.value ?? {}),
      },
    });
  }

  function resolveLabGameMatchSnapshotForSidecarSend(
    labSidecarContext: ReturnType<typeof buildLabSidecarEmitContext>,
  ) {
    const host = labSidecarContext?.hostContext;
    if (!host) {
      return undefined;
    }
    const engagement = readLabSidecarGameEngagementFromHost(host);
    if (!engagement) {
      return undefined;
    }
    const snapshot = getLabSidecarGameMatchSnapshot();
    if (!snapshot || snapshot.matchId !== engagement.matchId || snapshot.gameId !== engagement.gameId) {
      return undefined;
    }
    return enrichLabSidecarGameMatchSnapshotWithUser(snapshot, user.value?.name);
  }

  // ==================================================================
  // MESSAGE/CHAT FLOW HANDLERS (socket-based, only in LabDashboard)
  // ==================================================================

  function resolveLabUserDisplayNameForChat(): string | undefined {
    const trimmed = user.value?.name?.trim();
    return trimmed || undefined;
  }

  const sendMessage = async (channel: ChatSendChannel = 'assistant') => {
    const _activeSessionRef = activeSessionRef();
    if (_activeSessionRef && user.value) {
      const inputRef = channel === 'sidecar' ? sidecarInputMessage : inputMessage;
      let userMsg = inputRef.value.trim();
      if (userMsg === '') {
        const priorMessages = messagesRef()?.get(_activeSessionRef.sessionId) ?? [];
        userMsg = resolveEmptyChatSendText(priorMessages);
      }

      await saveMessage(_activeSessionRef.sessionId, {
        chatId: crypto.randomUUID(),
        role: 'user',
        content: userMsg
      });
      bumpMessagesRef(_activeSessionRef.sessionId);

      if (socketConnection.value) {
        if (!_activeSessionRef.sessionId) {
          socketConnection.value.emit(SOCKET_EVENTS.ERROR, {
            message: 'Please select or create a chat session to send messages'
          });
          return;
        }
        const chatId: string = crypto.randomUUID()
        const placeholderMessage: UIChatMessage = {
          chatId: chatId,
          role: 'assistant',
          content: '',
          reasoning: '',
          isPlaceholder: true,
          loading: true,
        };
        agentInteractionStatus.value.set(_activeSessionRef.sessionId, {
          isAwaitingResponse: true,
        } as AgentInteractionStatus);

        // Small delay to ensure the user message is fully persisted before saving placeholder
        await new Promise(resolve => setTimeout(resolve, 250));
        await saveMessage(_activeSessionRef.sessionId, placeholderMessage);
        bumpMessagesRef(_activeSessionRef.sessionId);

        const labSidecarContext =
          channel === 'sidecar' ? buildLabSidecarEmitContext() : undefined;
        const labGameMatchSnapshot =
          channel === 'sidecar' ? resolveLabGameMatchSnapshotForSidecarSend(labSidecarContext) : undefined;

        if (channel === 'sidecar' && labSidecarContext?.hostContext) {
          const engagement = readLabSidecarGameEngagementFromHost(labSidecarContext.hostContext);
          if (engagement?.matchId) {
            bumpSlowTurnBanterIdleTimer(engagement.matchId);
          }
        }

        socketConnection.value.emit(SOCKET_EVENTS.MESSAGE, {
          userId: user.value.userId,
          chatId: chatId,
          sessionId: _activeSessionRef.sessionId,
          text: userMsg,
          persona: _activeSessionRef.persona,
          streaming: await getStreamingEnabled() ?? false,
          isDeveloperMode: await getDeveloperMode() ?? false,
          files: _activeSessionRef.files,
          labSidecarContext,
          labGameMatchSnapshot,
          labUserDisplayName: resolveLabUserDisplayNameForChat(),
        } as SendChatMesssageData);

      }
      inputRef.value = '';
    }
  };

  async function finishChatTurnAwaiting(sessionId: string): Promise<void> {
    agentInteractionStatus.value.set(sessionId, {
      isAwaitingResponse: false,
    } as AgentInteractionStatus);
    const pending = dequeuePendingLabGameBanter(sessionId);
    if (pending) {
      await sendGameBanter(pending, sessionId);
    }
  }

  /** Proactive Sidecar line for an in-game moment (LLM table talk; no Dexie user row). */
  const sendGameBanter = async (
    request: LabAssistantBanterRequest,
    targetSessionId?: string,
  ): Promise<boolean> => {
    const sessionId = targetSessionId?.trim() || activeSessionRef()?.sessionId;
    if (!sessionId || !user.value) {
      return false;
    }
    const sessions = sessionsRef();
    const sessionRecord =
      sessions?.find((s) => s.sessionId === sessionId) ?? activeSessionRef();
    const persona = sessionRecord?.persona;
    if (!persona) {
      return false;
    }
    const status = agentInteractionStatus.value.get(sessionId);
    if (status?.isAwaitingResponse) {
      enqueuePendingLabGameBanter(sessionId, request);
      return true;
    }
    if (!socketConnection.value) {
      return false;
    }

    const chatId = crypto.randomUUID();
    const placeholderMessage: UIChatMessage = {
      chatId,
      role: 'assistant',
      content: '',
      reasoning: '',
      isPlaceholder: true,
      loading: true,
    };
    agentInteractionStatus.value.set(sessionId, {
      isAwaitingResponse: true,
    } as AgentInteractionStatus);
    await saveMessage(sessionId, placeholderMessage);
    bumpMessagesRef(sessionId);

    const labSidecarContext = buildLabSidecarEmitContext();
    const labGameMatchSnapshot = resolveLabGameMatchSnapshotForSidecarSend(labSidecarContext);

    socketConnection.value.emit(SOCKET_EVENTS.MESSAGE, {
      userId: user.value.userId,
      chatId,
      sessionId,
      text: '',
      persona,
      streaming: (await getStreamingEnabled()) ?? false,
      isDeveloperMode: (await getDeveloperMode()) ?? false,
      files: sessionRecord?.files ?? [],
      labSidecarContext,
      labGameBanter: request,
      labGameMatchSnapshot,
      labUserDisplayName: resolveLabUserDisplayNameForChat(),
    } as SendChatMesssageData);

    return true;
  };

  const tokenProgressHandler = async (data: TokenProgressEvent) => {
    try {
      const sessionId = data.sessionId;
      const percentage = data.percentage ?? 0;
      await setContextUsed(sessionId, percentage);
    } catch (error) {
      console.error('Failed to process token progress:', error);
    }
  };

  const connectErrorHandler = (_err?: unknown) => {
    void _err;
  };

  const responseHandler = async (data: ChatResponseData) => {
    const responseSessionId =
      typeof data.metadata?.sessionId === 'string' ? data.metadata.sessionId : undefined;
    const isSummaryResponse = data.metadata?.operation === 'summary-completed';

    if (
      isSummaryResponse &&
      responseSessionId &&
      agentInteractionStatus.value.get(responseSessionId)?.isSummarizingMessasge
    ) {
      console.log('Received summary response');
      await setContextUsed(responseSessionId, 5);

      //create new assistant message displaying summary
      await saveMessage(responseSessionId, {
        chatId: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
        reasoning: '',
        isPlaceholder: false,
        isComplete: true,
        loading: false,
      });

      agentInteractionStatus.value.set(responseSessionId, {
        isSummarizingMessasge: false
      } as AgentInteractionStatus);
      notifyLabGameSidecarSummarizeDone(responseSessionId);
    } else {

      const __messagesRef = messagesRef();
      const _messagesRef = responseSessionId && __messagesRef ? __messagesRef.get(responseSessionId) : [];

      if (_messagesRef) {

        const lastPlaceholderIndex = _messagesRef.findLastIndex(
          (msg: UIChatMessage) => data.chatId == 'latest' ? msg.role == 'assistant' : msg.chatId == data.chatId
        );

        if (lastPlaceholderIndex !== -1) {

          if (data.content) {

            if (_messagesRef[lastPlaceholderIndex].content.length == 0) {
              _messagesRef[lastPlaceholderIndex].content = data.content
            } else if (_messagesRef[lastPlaceholderIndex].content.length > 0) {
              _messagesRef[lastPlaceholderIndex].content += '\n' + data.content
            }
          }

          if (data.reasoning) {
            if (!_messagesRef[lastPlaceholderIndex].reasoning || _messagesRef[lastPlaceholderIndex].reasoning.length == 0) {
              _messagesRef[lastPlaceholderIndex].reasoning = data.reasoning
            } else if (_messagesRef[lastPlaceholderIndex].reasoning && _messagesRef[lastPlaceholderIndex].reasoning.length > 0) {
              _messagesRef[lastPlaceholderIndex].reasoning += '\n' + data.reasoning
            }
          }

          if (_messagesRef[lastPlaceholderIndex].content.length > 0) {
            _messagesRef[lastPlaceholderIndex].isComplete = true;
            delete _messagesRef[lastPlaceholderIndex].isPlaceholder;
            delete _messagesRef[lastPlaceholderIndex].loading;
          }

          _messagesRef[lastPlaceholderIndex] = {
            ..._messagesRef[lastPlaceholderIndex]
          };

          // ✅ Remove ALL other placeholder messages except the one we just replaced
          for (let i = _messagesRef.length - 1; i >= 0; i--) {
            if (i < lastPlaceholderIndex && _messagesRef[i].role == 'assistant') {
              _messagesRef[i].loading = false;
              _messagesRef[i].isPlaceholder = false;
              _messagesRef[i].isComplete = true;
            }
            if (i > lastPlaceholderIndex && _messagesRef[i].role == 'assistant') {
              _messagesRef.splice(i, 1);
            }
          }

          if (responseSessionId) {
            await updateMessages(responseSessionId);
          }

        } else if (responseSessionId) {
          // No placeholder found — append as a normal message
          await saveMessage(responseSessionId, {
            role: data.sender,
            content: data.content,
            reasoning: data.reasoning
          });
        }
      }
      if (responseSessionId) {
        await finishChatTurnAwaiting(responseSessionId);
      }
    }
  };

  const toolCallAgentMessageHandler = async (data: ToolCallAgentMesssage) => {
    await waitForPendingMessageInserts(data.sessionId);

    const __messagesRef = messagesRef();
    const _messagesRef = __messagesRef ? __messagesRef.get(data.sessionId) : [];

    if (_messagesRef) {

      const cleanedMessage = stripLeakedNativeToolCallsFromText(data.message);

      const lastPlaceholderIndex = _messagesRef.findLastIndex((msg: UIChatMessage) =>
        data.chatId ? msg.chatId === data.chatId : msg.role === 'assistant',
      );

      if (lastPlaceholderIndex !== -1) {

        _messagesRef[lastPlaceholderIndex] = {
          ..._messagesRef[lastPlaceholderIndex],
          content: cleanedMessage,
          contentBuffer: undefined,
        };

        delete _messagesRef[lastPlaceholderIndex].isPlaceholder;
        delete _messagesRef[lastPlaceholderIndex].loading;

        for (let i = _messagesRef.length - 1; i >= 0; i--) {
          if (i < lastPlaceholderIndex && _messagesRef[i].role == 'assistant') {
            _messagesRef[i].loading = false;
            _messagesRef[i].isPlaceholder = false;
            _messagesRef[i].isComplete = true;
          }
          if (i > lastPlaceholderIndex && _messagesRef[i].role == 'assistant') {
            _messagesRef.splice(i, 1);
          }
        }

        await waitForPendingMessageInserts(data.sessionId);
        await updateMessages(data.sessionId);
/*
        const placeholderMessage: UIChatMessage = {
          role: 'assistant',
          content: '',
          isPlaceholder: true,
          loading: true
        };
        await saveMessage(data.sessionId, placeholderMessage);
        */
      }
    }

    await finishChatTurnAwaiting(data.sessionId);
  };

  const firstMessageReceivedHandler = async (data: FirstMessageReceivedEventData) => {
    if (!data.title || !data.sessionId) {
      return;
    }
    const session = sessionsRef().find((s) => s.sessionId === data.sessionId);
    if (!shouldApplyAutoSessionTitleFromFirstMessage(session)) {
      return;
    }
    await updateSession(data.sessionId, { title: data.title });
  };

  const firstMessageEditedHandler = async (data: FirstMessageEditedEventData) => {
    if (!data.title || !data.sessionId) {
      return;
    }
    const session = sessionsRef().find((s) => s.sessionId === data.sessionId);
    if (!shouldApplyAutoSessionTitleFromFirstMessage(session)) {
      return;
    }
    await updateSession(data.sessionId, { title: data.title });
  };

  const toolCallBeforeHandler = async (data: ToolCallEventData) => {
    try {
      await enableChatLoading(data.chatId, data.sessionId);

      agentInteractionStatus.value.set(data.sessionId, {
        isAwaitingResponse: true
      } as AgentInteractionStatus)

    } catch (error) {
      console.log('[TOOL_CALL_BEFORE] Failed to handle event data:', error);
    }
  };

  const toolCallAfterHandler = async (data: ToolResultEventData) => {
    try {
      await enableChatLoading(data.chatId, data.sessionId)
      const toolResultForUi = data.toolResult
        ? {
            ...data.toolResult,
            content: data.toolResult.content ?? '',
          }
        : data.toolResult;
      await insertBeforePlaceholder(
        data.chatId,
        data.sessionId,
        {
          role: 'system',
          content: '',
          systemLog: {
            id: data.id,
            data: {
              toolCall: data.toolCall,
              toolResult: toolResultForUi,
            },
            title: data.toolId,
            content: '',
            success: data.toolResult?.success,
            isResult: true
          }
        }
      );

      agentInteractionStatus.value.set(data.sessionId, {
        isAwaitingResponse: data.toolCall.function.name != 'followup_tool'
      } as AgentInteractionStatus)

      const toolName = data.toolCall?.function?.name ?? data.toolId;
      if (toolName === 'persona_manager_activate_persona') {
        mergeAgentInteractionStatus(data.sessionId, agentInteractionStatus.value, {
          isPersonaDelegationActive: true,
          isAwaitingResponse: true,
        });
        if (data.toolResult?.success) {
          try {
            const payload = JSON.parse(data.toolResult.content || '{}') as {
              newSessionId?: string;
              chatId?: string;
            };
            if (payload.newSessionId) {
              mergeAgentInteractionStatus(data.sessionId, agentInteractionStatus.value, {
                delegationChildSessionId: payload.newSessionId,
                delegationParentSessionId: data.sessionId,
                delegationChatId: payload.chatId,
              });
            }
          } catch {
            /* ignore malformed tool JSON */
          }
        } else {
          clearPersonaDelegationStatus(data.sessionId, agentInteractionStatus.value);
        }
      }
      if (toolName === 'persona_manager_response_persona' && data.toolResult?.success) {
        clearPersonaDelegationStatus(data.sessionId, agentInteractionStatus.value);
      }

    } catch (error) {
      console.log('[TOOL_CALL_AFTER] Failed to handle event data:', error);
    }
  };

  const streamingPersistTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const scheduleStreamingPersist = (sessionId: string) => {
    const existing = streamingPersistTimers.get(sessionId);
    if (existing) {
      clearTimeout(existing);
    }
    streamingPersistTimers.set(
      sessionId,
      setTimeout(() => {
        streamingPersistTimers.delete(sessionId);
        void updateMessages(sessionId);
      }, STREAMING_PERSIST_DEBOUNCE_MS),
    );
  };

  const flushStreamingPersist = async (sessionId: string) => {
    const existing = streamingPersistTimers.get(sessionId);
    if (existing) {
      clearTimeout(existing);
      streamingPersistTimers.delete(sessionId);
    }
    await updateMessages(sessionId);
  };

  const unifiedStreamingHandler = async (
    data: StreamingDelta | StreamingDone,
    eventType: string
  ) => {

    if (!data.sessionId) return;

    const messagesRefLocal = messagesRef();
    const sessionsRefLocal = sessionsRef();

    if (!messagesRefLocal || !sessionsRefLocal) return;

    const session = sessionsRefLocal.find(s => s.sessionId === data.sessionId);
    if (!session) return;

    const _messagesRef = messagesRefLocal.get(session.sessionId) || [];

    const lastPlaceholderIndex = _messagesRef.findLastIndex(
      (msg: UIChatMessage) => data.chatId == 'latest' ? msg.role == 'assistant' : msg.chatId == data.chatId
    );

    if (lastPlaceholderIndex === -1) return; // No placeholder to update

    const text = typeof data === 'string' && data != undefined ? data : (data as StreamingDelta).text;

    // Check for context usage tracking in REASONING_DELTA and CONTENT_DELTA events
    if ((eventType === SOCKET_EVENTS.REASONING_DELTA || eventType === SOCKET_EVENTS.CONTENT_DELTA) &&
      data.contextUsed !== undefined && data.contextUsed > 0) {
      await setContextUsed(data.sessionId, data.contextUsed);
    }

    switch (eventType) {
      case SOCKET_EVENTS.REASONING_DELTA:
        {
          if (_messagesRef[lastPlaceholderIndex].thinkingBuffer == undefined) _messagesRef[lastPlaceholderIndex].thinkingBuffer = ''
          _messagesRef[lastPlaceholderIndex].thinkingBuffer += text as string;
          _messagesRef[lastPlaceholderIndex].loading = true;
          _messagesRef[lastPlaceholderIndex].isPlaceholder = true;
          _messagesRef[lastPlaceholderIndex].isComplete = false;
          break;
        }
      case SOCKET_EVENTS.REASONING_DONE:
        break;
      case SOCKET_EVENTS.CONTENT_DELTA:
        {
          _messagesRef[lastPlaceholderIndex].loading = false;
          if (_messagesRef[lastPlaceholderIndex].contentBuffer == undefined) _messagesRef[lastPlaceholderIndex].contentBuffer = ''
          _messagesRef[lastPlaceholderIndex].contentBuffer += text as string;
          _messagesRef[lastPlaceholderIndex].loading = false;
          _messagesRef[lastPlaceholderIndex].isPlaceholder = true;
          _messagesRef[lastPlaceholderIndex].isComplete = false;
          break;
        }
      case SOCKET_EVENTS.CONTENT_DONE:
        {
          _messagesRef[lastPlaceholderIndex].loading = false;
          _messagesRef[lastPlaceholderIndex].isPlaceholder = false;
          _messagesRef[lastPlaceholderIndex].isComplete = true;
          const visibleText =
            (_messagesRef[lastPlaceholderIndex].contentBuffer as string | undefined) ??
            (_messagesRef[lastPlaceholderIndex].content as string | undefined) ??
            '';
          const strippedContent = stripLeakedNativeToolCallsFromText(visibleText);
          _messagesRef[lastPlaceholderIndex].content = strippedContent;
          delete _messagesRef[lastPlaceholderIndex].contentBuffer;
          const leakedPending = extractLeakedToolCallsFromText(visibleText).extracted;
          if (!leakedPending) {
            void finishChatTurnAwaiting(data.sessionId);
          }
          break;
        }
      default:
        console.warn(`Unknown streaming event type: ${eventType}`);
    }

    // ✅ Remove ALL other placeholder messages except the one we just replaced
    for (let i = _messagesRef.length - 1; i >= 0; i--) {
      if (i < lastPlaceholderIndex && _messagesRef[i].role == 'assistant') {
        _messagesRef[i].loading = false;
        _messagesRef[i].isPlaceholder = false;
        _messagesRef[i].isComplete = true;
      }
      if (i > lastPlaceholderIndex && _messagesRef[i].role == 'assistant') {
        _messagesRef.splice(i, 1);
      }
    }

    bumpMessagesRef(data.sessionId);
    if (
      eventType === SOCKET_EVENTS.CONTENT_DONE ||
      eventType === SOCKET_EVENTS.REASONING_DONE
    ) {
      await flushStreamingPersist(data.sessionId);
    } else {
      scheduleStreamingPersist(data.sessionId);
    }
  };

  const enableChatLoading = async (chatId: string, sessionId: string) => {
    const messagesRefLocal = messagesRef();
    const sessionsRefLocal = sessionsRef();

    if (!messagesRefLocal || !sessionsRefLocal) return;

    const session = sessionsRefLocal.find(s => s.sessionId === sessionId);
    if (!session) return;

    const _messagesRef = messagesRefLocal.get(session.sessionId) || [];

    // Find the *last* placeholder, not the first
    const lastPlaceholderIndex = _messagesRef.findLastIndex(
      (msg: UIChatMessage) => msg.chatId == chatId
    );

    if (lastPlaceholderIndex === -1) return; // No placeholder to update

    _messagesRef[lastPlaceholderIndex].loading = true;
    _messagesRef[lastPlaceholderIndex].isPlaceholder = true;
    _messagesRef[lastPlaceholderIndex].isComplete = false;

    await updateMessages(sessionId);
  };

  return {
    sendMessage,
    sendGameBanter,
    tokenProgressHandler,
    connectErrorHandler,
    responseHandler,
    toolCallAgentMessageHandler,
    firstMessageReceivedHandler,
    firstMessageEditedHandler,
    toolCallBeforeHandler,
    toolCallAfterHandler,
    unifiedStreamingHandler
  };
}
