import { Ref } from "vue";
import { useToast } from 'primevue/usetoast';
import { Socket } from 'socket.io-client';
import { ChatSessionRecord, PersonaSwitchedEventData, NewSessionRequestEventData, ResponsePersonaEventData, DeleteSessionEventData, UIChatMessage, AgentInteractionStatus, ChatPersona } from '../../../shared/types';
import { SOCKET_EVENTS } from '../../../shared/types';
import { mergeAgentInteractionStatus, clearPersonaDelegationStatus } from './agent-interaction-status';

export function useSessionHandlers(
  currentSystemInstructions: Ref<string>,
  agentInteractionStatus: Ref<Map<string, AgentInteractionStatus>>,
  createNewSession: (persona?: ChatPersona, sessionId?: string) => Promise<string | null>,
  switchToSession: (sessionId: string) => Promise<void>,
  saveMessage: (sessionId: string, message: UIChatMessage | null) => Promise<void>,
  setContextUsed: (sessionId: string, percentage: number) => Promise<void>,
  updateSession: (sessionId: string, updates: Partial<ChatSessionRecord>) => Promise<void>,
  deleteSession: (sessionId: string) => Promise<boolean>,
  deleteSessionMessages: (sessionId: string) => Promise<void>,
  getActiveSessions: () => Promise<ChatSessionRecord[]>,
  deleteCurrentSession: (sessionId: string | undefined) => Promise<boolean>,
  selectedSessions: Ref<string[]>,
  socketConnection: Ref<Socket | null>
) {
  const toast = useToast();

  const deleteSessionWrapper = async (sessionId: string): Promise<boolean> => {
    const status = await deleteCurrentSession(sessionId);
    if (socketConnection.value) {
      socketConnection.value.emit(SOCKET_EVENTS.DELETE_SESSION, {
        sessionId: sessionId
      } as DeleteSessionEventData)
    }
    return status
  };

  const handlePersonaSwitched = async (data: PersonaSwitchedEventData) => {
    await updateSession(data.sessionId, { persona: data.persona });
    currentSystemInstructions.value = ''
  };

  const handleNewSessionRequest = async (data: NewSessionRequestEventData) => {
    // First create the new session (this already handles switching internally)
    await createNewSession(data.persona, data.sessionId);

    // If chatId and message are provided, add the user message and assistant placeholder
    if (data.chatId && data.message) {
      // Add the originator's message as the first message in this session
      await saveMessage(data.sessionId, data.message);

      // Create an assistant placeholder message for the response
      const placeholderMessage: UIChatMessage = {
        chatId: data.chatId,
        role: 'assistant',
        content: '',
        reasoning: '',
        isPlaceholder: true,
        loading: true
      };
      await saveMessage(data.sessionId, placeholderMessage);
    }

    mergeAgentInteractionStatus(data.sessionId, agentInteractionStatus.value, {
      isAwaitingResponse: true,
    });

    if (data.parentSessionId) {
      mergeAgentInteractionStatus(data.parentSessionId, agentInteractionStatus.value, {
        isPersonaDelegationActive: true,
        delegationChildSessionId: data.sessionId,
        delegationParentSessionId: data.parentSessionId,
        delegationChatId: data.chatId,
        delegationTargetPersona: data.persona,
        isAwaitingResponse: true,
      });
    }

    currentSystemInstructions.value = ''
  };

  const handleResponsePersona = async (data: ResponsePersonaEventData) => {

    if (data.chatId && data.message) {
      // Add the originator's message as the first message in this session
      await saveMessage(data.parentSessionId, data.message);
    }

    await switchToSession(data.parentSessionId);

    if (data.parentSessionId) {
      clearPersonaDelegationStatus(data.parentSessionId, agentInteractionStatus.value);
      mergeAgentInteractionStatus(data.parentSessionId, agentInteractionStatus.value, {
        isAwaitingResponse: false,
      });
    }

    currentSystemInstructions.value = ''
  };

  const deleteSelectedSessions = async () => {
    if (selectedSessions.value.length === 0) return;
    for (const sessionId of selectedSessions.value) {
      await deleteSession(sessionId);
      await deleteSessionMessages(sessionId);
      await setContextUsed(sessionId, 0);
    }
    selectedSessions.value = [];
    currentSystemInstructions.value = ''
    toast.add({ severity: 'success', summary: 'Sessions', detail: 'Session(s) removed', life: 3000 })
  };

  const clearAllSessions = async () => {
    const sessions = await getActiveSessions();
    if (sessions.length <= 1) {
      alert('Cannot delete the last session. Keep at least one session.');
      return;
    }
    for (let i = sessions.length - 1; i > 0; i--) {
      await deleteSession(sessions[i].sessionId);
    }
    selectedSessions.value = [];
    currentSystemInstructions.value = ''
    toast.add({ severity: 'success', summary: 'Sessions', detail: 'Session(s) removed', life: 3000 })
  };

  const toggleSessionSelection = (sessionId: string) => {
    const index = selectedSessions.value.indexOf(sessionId);
    if (index > -1) {
      selectedSessions.value.splice(index, 1);
    } else {
      selectedSessions.value.push(sessionId);
    }
    currentSystemInstructions.value = ''
  };

  return {
    deleteSessionWrapper,
    deleteCurrentSession,
    handlePersonaSwitched,
    handleNewSessionRequest,
    handleResponsePersona,
    deleteSelectedSessions,
    clearAllSessions,
    toggleSessionSelection,
  };
}
