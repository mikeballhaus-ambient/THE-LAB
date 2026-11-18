import { type Ref } from 'vue';
import type { ToastServiceMethods } from 'primevue/toastservice';
import type { Socket } from 'socket.io-client';
import {
  SOCKET_EVENTS,
  type AgentInteractionStatus,
  type ChatSessionRecord,
  type ICommand,
  type ICommandRequestData,
  type ICommandResultData,
  type IContextSettings,
  type IContextSettingsResultData,
  type LLMProviderConfig,
  type Persona,
  type SystemInstructionsRequestData,
  type SystemInstructionsResponseData,
  type UIChatMessage,
  type UpdatePersonaConfigEventData,
  type User,
  type UserInstructionsEventData,
} from '@/shared/types';

export interface UseLabSettingsEmittersOptions {
  socketConnection: Ref<Socket | null>;
  user: Ref<User | null>;
  getCurrentUserId: () => number | undefined;
  toast: ToastServiceMethods;
  contextSettings: Ref<IContextSettings | undefined>;
  commands: Ref<ICommand[]>;
  globalSysMsg: Ref<string>;
  currentSystemInstructions: Ref<string>;
  currentUserInstructions: Ref<string>;
  personaConfigs: Ref<Record<string, Persona>>;
  activeSessionRef: () => ChatSessionRecord | null;
  getDeveloperMode: () => Promise<boolean>;
  switchToSession: (sessionId: string) => Promise<void>;
  focusAssistant: () => Promise<void>;
  agentInteractionStatus: Ref<Map<string, AgentInteractionStatus>>;
  messagesRef: () => Map<string, UIChatMessage[]> | undefined;
  updateMessages: (sessionId: string) => Promise<void>;
}

/** Settings panel socket emits + summarize/stop (rm-46 **4.2**). */
export function useLabSettingsEmitters(options: UseLabSettingsEmittersOptions) {
  const {
    socketConnection,
    user,
    getCurrentUserId,
    toast,
    contextSettings,
    commands,
    globalSysMsg,
    currentSystemInstructions,
    currentUserInstructions,
    personaConfigs,
    activeSessionRef,
    getDeveloperMode,
    switchToSession,
    focusAssistant,
    agentInteractionStatus,
    messagesRef,
    updateMessages,
  } = options;

  const manageProviderConfigRequestHandler = (data: {
    llmProviderConfig: LLMProviderConfig;
    userId?: number;
  }) => {
    if (!socketConnection.value) {
      return;
    }
    const userId = data.userId || user.value?.id || 1;
    socketConnection.value.emit(SOCKET_EVENTS.PROVIDER_CONFIG_UPDATE, {
      providerConfig: data.llmProviderConfig,
      userId: userId,
    });
  };

  const manageContextSettingsRequestHandler = (data: IContextSettings) => {
    if (!socketConnection.value || !user.value?.userId) {
      return;
    }
    socketConnection.value.emit(SOCKET_EVENTS.UPDATE_CONTEXTSETTINGS_REQUEST, {
      userId: user.value.userId,
      contextSettings: data,
    });
  };

  const manageContextSettingsResponseHandler = (data: IContextSettingsResultData) => {
    if (data.success) {
      toast.add({
        severity: 'success',
        summary: 'Context Settings',
        detail: data.message,
        life: 3000,
      });
      if (data.updatedContextSettings) {
        contextSettings.value = data.updatedContextSettings;
      }
    } else {
      toast.add({
        severity: 'error',
        summary: 'Context Settings',
        detail: data.message,
        life: 3000,
      });
    }
  };

  const manageCommandsRequestHandler = (data: ICommandRequestData) => {
    if (!socketConnection.value) {
      return;
    }
    const userId = data.userId || user.value?.id || 1;
    socketConnection.value.emit(SOCKET_EVENTS.UPDATE_SLASHCOMMAND_REQUEST, {
      request: data,
      userId: userId,
    });
  };

  const manageCommandsResponseHandler = (data: ICommandResultData) => {
    if (data.success) {
      toast.add({
        severity: 'success',
        summary: 'Slash Commands',
        detail: data.message,
        life: 3000,
      });
      if (data.updatedCommands && data.updatedCommands.length > 0) {
        commands.value = data.updatedCommands;
      } else {
        commands.value = [];
      }
    } else {
      toast.add({
        severity: 'error',
        summary: 'Slash Commands',
        detail: data.message,
        life: 3000,
      });
    }
  };

  const previewSystemInstructionRequestHandler = async () => {
    const _activeSessionRef = activeSessionRef();
    if (!socketConnection.value || !_activeSessionRef) {
      return;
    }
    socketConnection.value.emit(SOCKET_EVENTS.CURRENT_SYSTEM_INSTRUCTIONS_REQUEST, {
      userId: user.value?.userId,
      sessionId: _activeSessionRef.sessionId,
      persona: _activeSessionRef.persona,
      isDeveloperMode: await getDeveloperMode(),
    } as SystemInstructionsRequestData);
  };

  const previewSystemInstructionResponseHandler = (data: SystemInstructionsResponseData) => {
    currentSystemInstructions.value = data.systemInstructions;
  };

  const updateGlobalSysMsg = (data: string) => {
    globalSysMsg.value = data;
    if (socketConnection.value) {
      socketConnection.value.emit(SOCKET_EVENTS.GLOBAL_SYSMSG_UPDATE, { sysMsg: globalSysMsg.value });
      toast.add({
        severity: 'success',
        summary: 'Settings Saved',
        detail: 'Global system message saved',
        life: 3000,
      });
      currentSystemInstructions.value = '';
    }
  };

  const handleUpdateGlobalUserMsg = (data: string) => {
    currentUserInstructions.value = data;
    if (socketConnection.value) {
      socketConnection.value.emit(SOCKET_EVENTS.GLOBAL_USERINSTRUCTIONS_UPDATE, {
        userId: user.value?.userId,
        text: data,
      } as UserInstructionsEventData);
      toast.add({
        severity: 'success',
        summary: 'Settings Saved',
        detail: 'User instruction message saved',
        life: 3000,
      });
      currentSystemInstructions.value = '';
    }
  };

  const switchChatSessionTab = async (
    sessionId: string,
    options?: { focusLaboratory?: boolean },
  ) => {
    await switchToSession(sessionId);
    currentSystemInstructions.value = '';
    if (options?.focusLaboratory !== false) {
      await focusAssistant();
    }
  };

  const savePersonaConfig = (data: UpdatePersonaConfigEventData) => {
    if (!socketConnection.value) {
      return;
    }
    socketConnection.value.emit(SOCKET_EVENTS.UPDATE_PERSONA_CONFIG, {
      personaName: data.personaName,
      persona: data.persona,
      action: data.action,
      userId: getCurrentUserId(),
    });
    currentSystemInstructions.value = '';
    toast.add({
      severity: 'success',
      summary: 'Settings Saved',
      detail: 'Persona configurations saved',
      life: 3000,
    });
    switch (data.action) {
      case 'add': {
        personaConfigs.value[data.personaName] = data.persona;
        break;
      }
      case 'remove': {
        delete personaConfigs.value[data.personaName];
        break;
      }
    }
  };

  const summarizeContext = async () => {
    const _activeSessionRef = activeSessionRef();
    if (!socketConnection.value || !_activeSessionRef) {
      return;
    }
    try {
      agentInteractionStatus.value.set(_activeSessionRef.sessionId, {
        isSummarizingMessasge: true,
      } as AgentInteractionStatus);
      socketConnection.value.emit(SOCKET_EVENTS.SUMMARIZE_REQUEST, {
        userId: user.value?.userId,
        sessionId: _activeSessionRef.sessionId,
      });
    } catch (error: unknown) {
      console.error('Failed to initiate summary:', error);
    }
  };

  const requestStop = async () => {
    const _activeSessionRef = activeSessionRef();
    if (!socketConnection.value || !_activeSessionRef) {
      return;
    }
    try {
      socketConnection.value.emit(SOCKET_EVENTS.STOP_REQUEST, {
        sessionId: _activeSessionRef.sessionId,
      });
      const __messagesRef = messagesRef();
      const _messagesRef = __messagesRef ? __messagesRef.get(_activeSessionRef.sessionId) : [];
      if (_messagesRef) {
        const lastPlaceholderIndex = _messagesRef.findLastIndex(
          (msg: UIChatMessage) => msg.role == 'assistant',
        );
        if (lastPlaceholderIndex !== -1) {
          _messagesRef[lastPlaceholderIndex].isComplete = true;
          _messagesRef[lastPlaceholderIndex].isPlaceholder = false;
          _messagesRef[lastPlaceholderIndex].loading = false;
          await updateMessages(_activeSessionRef.sessionId);
        }
      }
      agentInteractionStatus.value.set(_activeSessionRef.sessionId, {
        isAwaitingResponse: false,
      } as AgentInteractionStatus);
    } catch (error: unknown) {
      console.error('Failed to initiate stop:', error);
    }
  };

  return {
    manageProviderConfigRequestHandler,
    manageContextSettingsRequestHandler,
    manageContextSettingsResponseHandler,
    manageCommandsRequestHandler,
    manageCommandsResponseHandler,
    previewSystemInstructionRequestHandler,
    previewSystemInstructionResponseHandler,
    updateGlobalSysMsg,
    handleUpdateGlobalUserMsg,
    switchChatSessionTab,
    savePersonaConfig,
    summarizeContext,
    requestStop,
  };
}
