import { ref, computed, Ref, watch } from "vue";
import { provideLabWorkspaceContext } from '@/shared/composables/useLabWorkspaceContext';
import { setAuthUser } from '@/shared/types/auth';
import { useToast } from 'primevue/usetoast';
import { useProviderHandlers } from "../utils/useProviderHandlers";
import { useSessionHandlers } from "../utils/useSessionHandlers";
import { useMessageHandlers } from "../utils/useMessageHandlers";
import { useAuthHandlers } from "../utils/useAuthHandlers";
import { useLabApps } from './lab-dashboard/useLabApps';
import { useShowDependencyAppsState } from './useShowDependencyApps';
import { useLabMcpUi } from './lab-dashboard/useLabMcpUi';
import { useLabSocketBootstrap } from './lab-dashboard/useLabSocketBootstrap';
import { useLabSettingsEmitters } from './lab-dashboard/useLabSettingsEmitters';
import { AiProvider, Persona, LLMProviderConfig, ChatSessionRecord, UIChatMessage, TodoList, SOCKET_EVENTS, ToolsList, ChatPersona, SocketErrorEvent, User, RuntimeApp, AgentInteractionStatus, UIDiscoveryResponseData, UIElementActionResponseData, IMCPServerConfig, McpStdioAccessPayload, ICommand, IContextSettings } from '../../../shared/types';
import type { FollowupEventData, FollowupParams, UIAutomationDiscoverParams, UIAutomationElementActionParams } from '../../../shared/types';
import type { Socket } from 'socket.io-client';
import { UIAutomationHandler } from '../../../shared/services//ui-automation-handler';
import { AppRegistry } from '@/shared/services/AppRegistry';
import { registerLabShellSidecarBridge } from '@/shared/composables/lab-shell-sidecar-bridge';
import {
  APP_BUILDER_HOST_CTX_CATALOG_TAG_LABEL,
  APP_BUILDER_HOST_CTX_PRIMARY_CATALOG_TAG_ID,
} from '@/shared/constants/app-builder-host-context';
import { labSidecarExpanded, openLabSidecarPanel } from '@/shared/composables/lab-sidecar/lab-sidecar-shell-state';
import {
  LAB_APP_BUILDER_CONSULTATION_PERSONA,
  LAB_GAME_SIDECAR_PERSONA,
} from '@/shared/composables/lab-shell-sidecar-bridge';
import {
  LAB_SIDECAR_GAME_VIEW_PLAY,
  LAB_SIDECAR_HOST_CTX_GAME_DIFFICULTY,
  LAB_SIDECAR_HOST_CTX_GAME_ID,
  LAB_SIDECAR_HOST_CTX_GAME_VIEW,
  LAB_SIDECAR_HOST_CTX_MATCH_ID,
} from '@/shared/constants/lab-game-assistant-opponent';
import { SessionManager } from '@/shared/composables/session/session-manager';
import { isLabGameBanterDisabled, hydrateLabGameSidecarPreferences } from '@/shared/composables/lab-sidecar/lab-game-sidecar-preferences-state';
import {
  registerLabSidecarGameSessionForMatch,
  resolveLabSidecarGameSessionId,
} from '@/shared/composables/lab-sidecar/useLabSidecarGameSession';
import {
  findReusableLabGameSidecarSession,
  rawLabGameSidecarSessionTitle,
} from '@/shared/composables/lab-sidecar/lab-game-sidecar-session-resolve';
import { shouldResetLabGameSidecarThread } from '@/shared/composables/lab-sidecar/lab-game-sidecar-match-boundary';
import { clearPendingLabGameBanter } from '@/shared/composables/lab-sidecar/pending-lab-game-banter';
import { shouldSummarizeLabGameSidecarOnNewMatch } from '@/shared/composables/lab-sidecar/lab-game-sidecar-summarize-policy';
import { waitForLabGameSidecarSummarize } from '@/shared/composables/lab-sidecar/lab-game-sidecar-summarize-wait';
import { clearBanterRateLimit } from '@/shared/game-platform/lab-assistant-banter/banter-rate-limit';
import type { LabShellSidecarGameSessionRequest } from '@/shared/composables/lab-shell-sidecar-bridge';
import { logNotificationDeepLink } from '@/shared/utils/lab-notification-deeplink-debug';
export function useLabDashboard(
  sessionsRef: () => ChatSessionRecord[],
  activeSessionRef: () => ChatSessionRecord | null,
  messagesRef: () => Map<string, UIChatMessage[]> | undefined,
  todolistRef: () => Map<string, TodoList[]> | undefined,
  initMcpFormatter: (toolsList: ToolsList[]) => void,
  createNewSession: (persona?: ChatPersona, sessionId?: string) => Promise<string | null>,
  switchToSession: (sessionId: string) => Promise<void>,
  saveMessage: (sessionId: string, message: UIChatMessage | null) => Promise<void>,
  setContextUsed: (sessionId: string, percentage: number) => Promise<void>,
  updateMessages: (sessionId: string) => Promise<void>,
  bumpMessagesRef: (sessionId: string) => void,
  updateSession: (sessionId: string, updates: Partial<ChatSessionRecord>) => Promise<void>,
  insertBeforePlaceholder: (chatId: string, sessionId: string | undefined, newMessage: UIChatMessage) => Promise<void>,
  waitForPendingMessageInserts: (sessionId: string) => Promise<void>,
  deleteSession: (sessionId: string) => Promise<boolean>,
  deleteSessionMessages: (sessionId: string) => Promise<void>,
  getActiveSessions: () => Promise<ChatSessionRecord[]>,
  setLabView: (isLabAssistantView: boolean) => Promise<void>,
  isLabAssistantView: () => Promise<boolean>,
  deleteCurrentSession: (sessionId: string | undefined) => Promise<boolean>,
  getStreamingEnabled: () => Promise<boolean>,
) {

  const toast = useToast();
  const inputMessage = ref('');
  const sidecarInputMessage = ref('');
  const socketConnection = ref<Socket | null>(null);
  const agentInteractionStatus = ref<Map<string, AgentInteractionStatus>>(new Map<string, AgentInteractionStatus>())
  const selectedSessions = ref<string[]>([]);
  const activeTab = ref<string>('api');
  // User management state
  const user = ref<User | null>(null);
  const getDeveloperMode = async (): Promise<boolean> => Boolean(user.value?.isDeveloperMode);

  // Helper to get current user's ID from auth state
  const getCurrentUserId = () => {
    return user.value?.userId || undefined;
  };
  /** Set true only after server `USER_AUTHENTICATED` — not from localStorage alone. */
  const isAuthenticated = ref(false);
  const userList = ref<User[]>([]);
  const showSettingsModal = ref(false);
  /** Mount Settings tree once (idle after chat ready, or on first open) so the dialog shell is warm before first click. */
  const settingsDialogMounted = ref(false);
  const showAboutModal = ref(false)
  const aboutActiveTopicTab = ref('Getting Started');
  const activePersonaTab = ref<string>('Chat');
  const activePersonaPropertyTab = ref<string>('Role');
  const personaConfigs = ref<Record<string, Persona>>({});
  const availableTools = ref<ToolsList[]>([]);
  const globalSysMsg = ref<string>('')
  const todoListComponentRef = ref<{
    todoListUpdatedHandler: (toolcallData: string) => Promise<void>;
  } | null>(null);
  const todoListVisible = ref<boolean>(true);
  const fileOperationsVisible = ref<boolean>(true);
  const providers = ref<AiProvider[]>([]);
  const availableChatModels = ref<string[]>([])
  const availableEmbedModels = ref<string[]>([])
  const llmProviderConfig = ref<LLMProviderConfig | undefined>();
  const repoFiles = ref<string[]>([]);
  const commands = ref<ICommand[]>([]);
  const contextSettings = ref<IContextSettings>()
  const mcpServers = ref<IMCPServerConfig[]>([]);
  const mcpStdioAccess = ref<McpStdioAccessPayload>({
    allowlistedServerIds: [],
    myRequests: [],
    pendingForReview: [],
  });
  const focusedAssistant = ref<boolean>();
  const currentSystemInstructions = ref<string>('');
  const currentUserInstructions = ref<string>('')
  const appsRef = ref<RuntimeApp[]>([])

  async function handleAppsOrderUpdated(apps: RuntimeApp[]): Promise<void> {
    appsRef.value = apps;
    await AppRegistry.getInstance().hydrateFromSocket(apps);
  }

  const focusAssistant = async (): Promise<void> => {
    todoListVisible.value = true;
    fileOperationsVisible.value = true;
    focusedAssistant.value = true;
    await setLabView(true)
  }
  const focusLab = async (): Promise<void> => {
    todoListVisible.value = false
    fileOperationsVisible.value = false;
    focusedAssistant.value = false
    await setLabView(false)
  }
  const isDashboardEnabled = computed(() => {
    if (!llmProviderConfig.value) return false;
    const chatProvider = llmProviderConfig.value.chat;
    const embedProvider = llmProviderConfig.value.embed;
    const validChatProvider = chatProvider?.provider && chatProvider?.model
    const validEmbedProvider = embedProvider?.provider && embedProvider?.model
    return validChatProvider && validEmbedProvider && isAuthenticated.value ? true : false
  })

  const { showDependencyApps } = useShowDependencyAppsState();
  const labApps = useLabApps({ user, toast, showDependencyApps });

  const runningAppIds = computed(() => labApps.runningApps.value.map((app) => app.id));

  const labShellOverlay = ref<import('@/shared/types/lab-shell-overlay').LabShellOverlayState | null>(null);

  const labWorkspaceContextApi = provideLabWorkspaceContext({
    focusedAssistant,
    runningAppIds,
    activeTabId: labApps.activeTabId,
    workspaceLayout: labApps.appWorkspaceLayout,
    user,
    shellOverlay: labShellOverlay,
  });

  watch(
    user,
    (u) => {
      if (u) {
        setAuthUser(u);
      }
    },
    { deep: true },
  );

  watch(labApps.activeTabId, (tabId) => {
    logNotificationDeepLink('dashboard: activeTabId changed, clearing hostContext', {
      tabId,
      before: { ...labWorkspaceContextApi.hostContext.value },
    });
    labWorkspaceContextApi.clearHostContext();
  });

  const {
    chatReady,
    chromaMemoryHealth,
    externalMcpEnvGaps,
    hasCompletedInitialLoginBootstrap,
    chatReadyHandler,
    onSocketReconnectAuth,
    handleRepoFilesUpdated,
  } = useLabSocketBootstrap({
    socketConnection: socketConnection as Ref<Socket | null>,
    user,
    isAuthenticated,
    showSettingsModal,
    isDashboardEnabled,
    isLabAssistantView,
    focusAssistant,
    focusLab,
    toast,
    globalSysMsg,
    providers,
    repoFiles,
    appsRef,
    llmProviderConfig,
    hydrateAppWorkspaceLayout: labApps.hydrateAppWorkspaceLayout,
  });

  watch(showSettingsModal, (open) => {
    if (open) {
      settingsDialogMounted.value = true;
    }
  });

  watch(chatReady, (ready) => {
    if (!ready) {
      return;
    }
    void hydrateLabGameSidecarPreferences();
    const mountSettings = (): void => {
      settingsDialogMounted.value = true;
    };
    if (typeof globalThis.requestIdleCallback === 'function') {
      globalThis.requestIdleCallback(mountSettings, { timeout: 6000 });
    } else {
      globalThis.setTimeout(mountSettings, 1500);
    }
  });

  const {
    fetchUserListHandler,
    fetchUserList,
    handleUserLoginHandler,
    handleUserLogin,
    handleUserRegisterHandler,
    handleUserRegister,
    handleUserLogoutHandler,
    handleUserLogout,
    updateUserProfileHandler,
    updateUserProfile,
    handleDeleteUserHandler,
    handleDeleteUser,
    updateUserRoleHandler,
    updateUserRole,
    loadingUserList,
    handleUserLoadData,
    handleUserMCPLoadData
  } = useAuthHandlers(user,
    userList,
    isAuthenticated,
    socketConnection as Ref<Socket | null>,
    activeSessionRef,
    createNewSession,
    personaConfigs,
    llmProviderConfig,
    availableChatModels,
    availableEmbedModels,
    commands,
    contextSettings,
    () => activeTodoLists,
    showSettingsModal,
    isDashboardEnabled,
    isLabAssistantView,
    focusAssistant,
    focusLab,
    currentUserInstructions,
    mcpServers,
    availableTools,
    initMcpFormatter,
    mcpStdioAccess,
    hasCompletedInitialLoginBootstrap
  );
  const { fetchModelsRequestHandler, fetchModelsResponseHandler, providerConfigUpdateHandlder, testProviderResultsUpdateHandlder, handleProviderSave, handleProviderTest } = useProviderHandlers(availableChatModels, availableEmbedModels, llmProviderConfig, socketConnection as Ref<Socket | null>);
  const { deleteSessionWrapper, handlePersonaSwitched, handleNewSessionRequest, handleResponsePersona, deleteSelectedSessions, clearAllSessions, toggleSessionSelection } = useSessionHandlers(currentSystemInstructions, agentInteractionStatus, createNewSession, switchToSession, saveMessage, setContextUsed, updateSession, deleteSession, deleteSessionMessages, getActiveSessions, deleteCurrentSession, selectedSessions, socketConnection as Ref<Socket | null>);
  const { sendMessage, sendGameBanter, tokenProgressHandler, connectErrorHandler, responseHandler, toolCallAgentMessageHandler, firstMessageReceivedHandler, firstMessageEditedHandler, toolCallBeforeHandler, toolCallAfterHandler, unifiedStreamingHandler } = useMessageHandlers(activeSessionRef, messagesRef, socketConnection as Ref<Socket | null>, setContextUsed, updateMessages, bumpMessagesRef, saveMessage, agentInteractionStatus, insertBeforePlaceholder, waitForPendingMessageInserts, focusAssistant, getStreamingEnabled, updateSession, sessionsRef, inputMessage, sidecarInputMessage, focusedAssistant, getDeveloperMode, user, () => labWorkspaceContextApi)

  async function finalizeLabGameSidecarSessionForMatch(
    sessionId: string,
    request: LabShellSidecarGameSessionRequest,
    sessionTitle: string,
    sessionRecord: ChatSessionRecord | undefined,
  ): Promise<void> {
    registerLabSidecarGameSessionForMatch(request.matchId, sessionId);
    const messageCount = messagesRef()?.get(sessionId)?.length ?? 0;
    const contextUsedPercent = sessionRecord?.contextUsed ?? 0;
    const previousMatchId = sessionRecord?.labGameSidecarLastMatchId;
    const status = agentInteractionStatus.value.get(sessionId);
    const hasGameSidecarBinding = Boolean(sessionRecord?.labGameSidecarGameId?.trim());
    const resetThread = shouldResetLabGameSidecarThread({
      previousMatchId,
      nextMatchId: request.matchId,
      messageCount,
      hasGameSidecarBinding,
    });

    if (resetThread) {
      if (previousMatchId?.trim()) {
        clearBanterRateLimit(previousMatchId.trim());
      }
      clearPendingLabGameBanter(sessionId);
      await deleteSessionMessages(sessionId);
      bumpMessagesRef(sessionId);
      await setContextUsed(sessionId, 0);
    }

    if (
      resetThread &&
      shouldSummarizeLabGameSidecarOnNewMatch({
        previousMatchId,
        nextMatchId: request.matchId,
        contextUsedPercent,
        messageCount,
      }) &&
      socketConnection.value &&
      user.value &&
      !status?.isAwaitingResponse &&
      !status?.isSummarizingMessasge
    ) {
      agentInteractionStatus.value.set(sessionId, {
        isSummarizingMessasge: true,
      } as AgentInteractionStatus);
      const waitResult = waitForLabGameSidecarSummarize(sessionId);
      socketConnection.value.emit(SOCKET_EVENTS.SUMMARIZE_REQUEST, {
        userId: user.value.userId,
        sessionId,
      });
      await waitResult;
      agentInteractionStatus.value.set(sessionId, {
        isSummarizingMessasge: false,
      } as AgentInteractionStatus);
    }

    await updateSession(sessionId, {
      title: sessionTitle,
      labGameSidecarGameId: request.gameId,
      labGameSidecarLastMatchId: request.matchId,
      persona: LAB_GAME_SIDECAR_PERSONA,
    });
  }

  registerLabShellSidecarBridge({
    async startConsultation(request) {
      if (!isAuthenticated.value || !user.value) {
        toast.add({
          severity: 'warn',
          summary: 'Sign in required',
          detail: 'Sign in to start an App Builder consultation in the Lab Sidecar.',
          life: 5000,
        });
        return;
      }
      if (!isDashboardEnabled.value) {
        toast.add({
          severity: 'warn',
          summary: 'Chat not ready',
          detail: 'Configure chat and embedding providers before using the Lab Assistant.',
          life: 5000,
        });
        return;
      }
      labWorkspaceContextApi.setSidecarToolProfile(request.toolProfile ?? 'app_builder');
      if (request.primaryCatalogTagId?.trim()) {
        labWorkspaceContextApi.setHostContext({
          [APP_BUILDER_HOST_CTX_PRIMARY_CATALOG_TAG_ID]: request.primaryCatalogTagId.trim(),
          ...(request.primaryCatalogTagLabel?.trim()
            ? { [APP_BUILDER_HOST_CTX_CATALOG_TAG_LABEL]: request.primaryCatalogTagLabel.trim() }
            : {}),
        });
      }
      openLabSidecarPanel(400);
      const sessionManager = new SessionManager();
      await sessionManager.init();
      await sessionManager.setLabSidecarExpanded(true);
      const consultationPersona = request.persona ?? LAB_APP_BUILDER_CONSULTATION_PERSONA;
      await createNewSession(consultationPersona);
      const active = activeSessionRef();
      if (active?.sessionId && request.sessionTitle) {
        await updateSession(active.sessionId, { title: request.sessionTitle });
      }
      sidecarInputMessage.value = request.message;
      await focusLab();
      await sendMessage('sidecar');
    },
    async startGameSidecarSession(request) {
      if (!isAuthenticated.value || !user.value) {
        return;
      }
      if (!isDashboardEnabled.value) {
        return;
      }
      labWorkspaceContextApi.setSidecarToolProfile(undefined);
      labWorkspaceContextApi.setHostContext({
        [LAB_SIDECAR_HOST_CTX_GAME_VIEW]: LAB_SIDECAR_GAME_VIEW_PLAY,
        [LAB_SIDECAR_HOST_CTX_GAME_ID]: request.gameId,
        [LAB_SIDECAR_HOST_CTX_MATCH_ID]: request.matchId,
        ...(request.difficulty
          ? { [LAB_SIDECAR_HOST_CTX_GAME_DIFFICULTY]: request.difficulty }
          : {}),
      });
      openLabSidecarPanel(400);
      const sessionManager = new SessionManager();
      await sessionManager.init();
      await sessionManager.setLabSidecarExpanded(true);

      const sessionTitle =
        request.sessionTitle?.trim() || rawLabGameSidecarSessionTitle(request.gameId);
      const existingForMatch = resolveLabSidecarGameSessionId(request.matchId);
      if (existingForMatch) {
        await switchToSession(existingForMatch);
        const record =
          sessionsRef().find((s) => s.sessionId === existingForMatch) ??
          activeSessionRef() ??
          undefined;
        await finalizeLabGameSidecarSessionForMatch(
          existingForMatch,
          request,
          sessionTitle,
          record,
        );
        await focusLab();
        return;
      }

      const sessions = await getActiveSessions();
      const reusable = findReusableLabGameSidecarSession(sessions, request.gameId);
      if (reusable) {
        await switchToSession(reusable.sessionId);
        await finalizeLabGameSidecarSessionForMatch(
          reusable.sessionId,
          request,
          sessionTitle,
          reusable,
        );
        await focusLab();
        return;
      }

      await createNewSession(LAB_GAME_SIDECAR_PERSONA);
      const active = activeSessionRef();
      if (active?.sessionId) {
        await finalizeLabGameSidecarSessionForMatch(
          active.sessionId,
          request,
          sessionTitle,
          active,
        );
      }
      await focusLab();
    },
    async postGameBanter(request) {
      if (isLabGameBanterDisabled()) {
        return;
      }
      if (!labSidecarExpanded.value) {
        return;
      }
      if (!isAuthenticated.value || !isDashboardEnabled.value) {
        return;
      }
      let sessionId = resolveLabSidecarGameSessionId(request.matchId);
      if (!sessionId) {
        const ctxMatchId =
          labWorkspaceContextApi.hostContext.value[LAB_SIDECAR_HOST_CTX_MATCH_ID]?.trim();
        if (!ctxMatchId || ctxMatchId !== request.matchId) {
          return;
        }
        sessionId = activeSessionRef()?.sessionId;
        if (sessionId) {
          registerLabSidecarGameSessionForMatch(request.matchId, sessionId);
        }
      }
      if (!sessionId) {
        return;
      }
      const active = activeSessionRef();
      if (active?.sessionId !== sessionId) {
        await switchToSession(sessionId);
      }
      await sendGameBanter(request, sessionId);
    },
  });

  const activeTodoLists = computed(() => {
    const _activeSessionRef = activeSessionRef()
    const _todolistRef = todolistRef()
    if (_activeSessionRef && _todolistRef) {
      return _todolistRef.get(_activeSessionRef.sessionId)
    }
    return []
  });
  const activeMessages = computed(() => {
    const _activeSessionRef = activeSessionRef()
    const _messagesRef = messagesRef()
    if (!_activeSessionRef || !_messagesRef) return [];
    const msgs = _messagesRef.get(_activeSessionRef.sessionId) || [];
    return [...msgs];
  });

  const {
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
  } = useLabSettingsEmitters({
    socketConnection: socketConnection as Ref<Socket | null>,
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
  });

  const {
    mcpServersUpdated,
    saveMcpServerConfig,
    toggleMcpServer,
    mcpStdioAccessUpdated,
    requestMcpStdioAccess,
    reviewMcpStdioAccess,
  } = useLabMcpUi({
    socketConnection: socketConnection as Ref<Socket | null>,
    user,
    getCurrentUserId,
    toast,
    mcpServers,
    mcpStdioAccess,
    availableTools,
    initMcpFormatter,
  });

  const errorHandler = async (error: SocketErrorEvent) => {
    const errorMessage = error.message || 'An error occurred';
    console.log(errorMessage);
    const active = activeSessionRef();
    if (active?.sessionId) {
      agentInteractionStatus.value.set(active.sessionId, {
        isAwaitingResponse: false,
      } as AgentInteractionStatus);
      const __messagesRef = messagesRef();
      const _messagesRef = __messagesRef?.get(active.sessionId);
      if (_messagesRef) {
        const lastAssistant = _messagesRef.findLastIndex((msg: UIChatMessage) => msg.role === 'assistant');
        if (lastAssistant !== -1 && _messagesRef[lastAssistant].loading) {
          _messagesRef[lastAssistant].loading = false;
          _messagesRef[lastAssistant].isPlaceholder = false;
          if (
            typeof _messagesRef[lastAssistant].content === 'string' &&
            !_messagesRef[lastAssistant].content.trim()
          ) {
            _messagesRef[lastAssistant].content = errorMessage;
          } else if (
            typeof _messagesRef[lastAssistant].content !== 'string' ||
            !_messagesRef[lastAssistant].content
          ) {
            _messagesRef[lastAssistant].content = errorMessage;
          }
          _messagesRef[lastAssistant].isComplete = true;
          await updateMessages(active.sessionId);
          bumpMessagesRef(active.sessionId);
        }
      }
    }
  };

  // ==================================================================
  // FOLLOWUP TOOL SOCKET EVENT HANDLERS
  // ==================================================================

  const followupRequestReceived = async (data: FollowupEventData) => {

    const __messagesRef = messagesRef();
    const _messagesRef = __messagesRef ? __messagesRef.get(data.sessionId) : [];

    if (_messagesRef) {

      const lastPlaceholderIndex = _messagesRef.findLastIndex((msg: UIChatMessage) => msg.role == 'assistant');

      if (lastPlaceholderIndex !== -1) {

        _messagesRef[lastPlaceholderIndex].followupData = data.followupData;

        _messagesRef[lastPlaceholderIndex] = {
          ..._messagesRef[lastPlaceholderIndex]
        };

        await updateMessages(data.sessionId);
      }
    }
  }
  const followupRequestSubmittedHandler = async (data: FollowupParams, messageRef: UIChatMessage, persona: ChatPersona) => {
    if (!socketConnection.value) return;
    const _activeSessionRef = activeSessionRef();
    if (_activeSessionRef) {

      const __messagesRef = messagesRef();
      const _messagesRef = __messagesRef ? __messagesRef.get(data.sessionId) : [];

      if (_messagesRef) {

        const lastPlaceholderIndex = _messagesRef.findLastIndex((msg: UIChatMessage) => msg.chatId == messageRef.chatId);

        if (lastPlaceholderIndex !== -1) {

          _messagesRef[lastPlaceholderIndex].followupData = data;
          _messagesRef[lastPlaceholderIndex].isComplete = true;
          delete _messagesRef[lastPlaceholderIndex].isPlaceholder;
          delete _messagesRef[lastPlaceholderIndex].loading;

          _messagesRef[lastPlaceholderIndex] = {
            ..._messagesRef[lastPlaceholderIndex]
          };

          await updateMessages(data.sessionId);
        }
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
      await saveMessage(_activeSessionRef.sessionId, placeholderMessage);
      agentInteractionStatus.value.set(_activeSessionRef.sessionId, {
        isAwaitingResponse: true
      } as AgentInteractionStatus)

      socketConnection.value.emit(SOCKET_EVENTS.FOLLOWUP_RESPONSE, {
        chatId: chatId,
        followupData: data,
        isStreaming: await getStreamingEnabled() ?? false,
        sessionId: data.sessionId,
        persona: persona
      } as FollowupEventData);
    }
  };

  const uiAutomationHandler = UIAutomationHandler.getInstance()

  uiAutomationHandler.setuiAutomationActionResponseReceived(async (data: UIElementActionResponseData) => {
    if (!socketConnection.value) return;
    const _activeSessionRef = activeSessionRef();
    if (_activeSessionRef) {

      const __messagesRef = messagesRef();
      const _messagesRef = __messagesRef ? __messagesRef.get(_activeSessionRef.sessionId) : [];

      if (_messagesRef) {
        const lastPlaceholderIndex = _messagesRef.findLastIndex((msg: UIChatMessage) => msg.role == 'assistant');

        if (lastPlaceholderIndex !== -1) {

          agentInteractionStatus.value.set(_activeSessionRef.sessionId, {
            isAwaitingResponse: true
          } as AgentInteractionStatus)

          data.isStreaming = await getStreamingEnabled() ?? false

          socketConnection.value.emit(SOCKET_EVENTS.UI_AUTOMATION_ACTION_RESPONSE, data)
        }
      }
    }
  })

  uiAutomationHandler.setuiAutomationDiscoveryResponseReceived(async (data: UIDiscoveryResponseData) => {
    if (!socketConnection.value) return;
    const _activeSessionRef = activeSessionRef();
    if (_activeSessionRef) {

      const __messagesRef = messagesRef();
      const _messagesRef = __messagesRef ? __messagesRef.get(_activeSessionRef.sessionId) : [];

      if (_messagesRef) {
        const lastPlaceholderIndex = _messagesRef.findLastIndex((msg: UIChatMessage) => msg.role == 'assistant');

        if (lastPlaceholderIndex !== -1) {

          agentInteractionStatus.value.set(_activeSessionRef.sessionId, {
            isAwaitingResponse: true
          } as AgentInteractionStatus)

          data.isStreaming = await getStreamingEnabled() ?? false

          socketConnection.value.emit(SOCKET_EVENTS.UI_AUTOMATION_DISCOVER_RESPONSE, data)
        }
      }
    }
  })

  // Handle incoming discovery request from agent
  const uiAutomationDiscoveryReceived = async (data: UIAutomationDiscoverParams): Promise<void> => {
    await uiAutomationHandler.enumerateInteractiveElements(data, await getStreamingEnabled() ?? false);
  };

  // Handle incoming element action request from agent
  const uiAutomationElementActionReceived = async (data: UIAutomationElementActionParams): Promise<void> => {
    await uiAutomationHandler.executeBatchActions(data, await getStreamingEnabled() ?? false);
  };

  return {
    inputMessage,
    socketConnection,
    agentInteractionStatus,
    chatReady,
    chromaMemoryHealth,
    externalMcpEnvGaps,
    selectedSessions,
    activeTab,
    showSettingsModal,
    settingsDialogMounted,
    showAboutModal,
    aboutActiveTopicTab,
    labShellOverlay,
    activePersonaTab,
    activePersonaPropertyTab,
    personaConfigs,
    availableTools,
    globalSysMsg,
    todoListComponentRef,
    todoListVisible,
    fileOperationsVisible,
    providers,
    availableChatModels,
    availableEmbedModels,
    llmProviderConfig,
    repoFiles,
    commands,
    contextSettings,
    focusedAssistant,
    currentSystemInstructions,
    focusAssistant,
    focusLab,
    activeTodoLists,
    activeMessages,
    chatReadyHandler,
    isDashboardEnabled,
    manageContextSettingsRequestHandler,
    manageContextSettingsResponseHandler,
    toast,
    manageCommandsRequestHandler,
    manageCommandsResponseHandler,
    previewSystemInstructionRequestHandler,
    previewSystemInstructionResponseHandler,
    fetchModelsResponseHandler,
    fetchModelsRequestHandler,
    providerConfigUpdateHandlder,
    testProviderResultsUpdateHandlder,
    handleProviderSave,
    handleProviderTest,
    updateGlobalSysMsg,
    switchChatSessionTab,
    savePersonaConfig,
    summarizeContext,
    sendMessage,
    sendSidecarMessage: () => sendMessage('sidecar'),
    sidecarInputMessage,
    tokenProgressHandler,
    connectErrorHandler,
    responseHandler,
    firstMessageReceivedHandler,
    firstMessageEditedHandler,
    toolCallBeforeHandler,
    toolCallAfterHandler,
    errorHandler,
    handlePersonaSwitched,
    handleNewSessionRequest,
    handleResponsePersona,
    deleteSelectedSessions,
    clearAllSessions,
    toggleSessionSelection,
    handleRepoFilesUpdated,
    handleAppsOrderUpdated,
    appsRef,
    fetchUserList,
    fetchUserListHandler,
    handleUserLogin,
    handleUserLoginHandler,
    handleUserRegister,
    handleUserRegisterHandler,
    handleUserLogout,
    handleUserLogoutHandler,
    updateUserProfile,
    updateUserProfileHandler,
    handleDeleteUser,
    updateUserRole,
    handleDeleteUserHandler,
    updateUserRoleHandler,
    user,
    userList,
    isAuthenticated,
    isLoadingServer: labApps.isLoadingServer,
    showLoadingModal: labApps.showLoadingModal,
    hideLoadingModal: labApps.hideLoadingModal,
    toolCallAgentMessageHandler,
    requestStop,
    deleteSessionWrapper,
    unifiedStreamingHandler,
    followupRequestReceived,
    followupRequestSubmittedHandler,
    uiAutomationDiscoveryReceived,
    uiAutomationElementActionReceived,
    loadingModalMsg: labApps.loadingModalMsg,
    manageProviderConfigRequestHandler,
    loadingUserList,
    currentUserInstructions,
    handleUpdateGlobalUserMsg,
    mcpServers,
    mcpStdioAccess,
    saveMcpServerConfig,
    toggleMcpServer,
    mcpServersUpdated,
    requestMcpStdioAccess,
    reviewMcpStdioAccess,
    mcpStdioAccessUpdated,
    handleUserLoadData,
    handleUserMCPLoadData,
    onSocketReconnectAuth,
    emitLaunch: labApps.emitLaunch,
    emitLaunchForTab: labApps.emitLaunchForTab,
    handleCloseTab: labApps.handleCloseTab,
    handleTeardownApp: labApps.handleTeardownApp,
    tabOrderApps: labApps.tabOrderApps,
    visibleRunningApps: labApps.visibleRunningApps,
    minimizedApps: labApps.minimizedApps,
    minimizedAppIds: labApps.minimizedAppIds,
    fullyMinimized: labApps.fullyMinimized,
    minimizeApp: labApps.minimizeApp,
    minimizeAllApps: labApps.minimizeAllApps,
    restoreApp: labApps.restoreApp,
    restoreNextApp: labApps.restoreNextApp,
    effectiveActiveTabId: labApps.effectiveActiveTabId,
    sortByOrder: labApps.sortByOrder,
    runningApps: labApps.runningApps,
    activeTabId: labApps.activeTabId,
    tabLoadingStates: labApps.tabLoadingStates,
    emitTeardown: labApps.emitTeardown,
    updateActiveAppTab: labApps.updateActiveAppTab,
    appWorkspaceLayout: labApps.appWorkspaceLayout,
    setWorkspaceMode: labApps.setWorkspaceMode,
    updateWorkspaceSplitRatio: labApps.updateWorkspaceSplitRatio,
    labWorkspaceContextApi,
  }
}

