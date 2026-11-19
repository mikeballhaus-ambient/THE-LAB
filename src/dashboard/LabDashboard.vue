<script setup lang="ts">
import AppContainer from './components/app/AppContainer.vue'
import SettingsDialog from './components/settings/Settings.vue';
import LabAssistant from './components/chat/LabAssistant.vue';
import TodoListView from './components/todo-list/TodoList.vue'
import FileOverview from './components/file-overview/FileOverview.vue'
import AppViewLayout from './components/app/AppViewLayout.vue'
import LabSidecar from '@/shared/components/lab-sidecar/LabSidecar.vue'
import About from './components/app/About.vue'
import LabMessagesDialog from './components/messages/LabMessagesDialog.vue'
import LabNotificationsDialog from './components/notifications/LabNotificationsDialog.vue'
import ForcePasswordChangeDialog from './components/auth/ForcePasswordChangeDialog.vue'
import { useLabMessagesShell } from './composables/useLabMessagesShell'
import { useLabNotificationsShell } from './composables/useLabNotificationsShell'
import Dialog from 'primevue/dialog';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import LabQuickNavQuarks from './components/shell/LabQuickNavQuarks.vue'
import LabQuarksWalletDialog from './components/shell/LabQuarksWalletDialog.vue'
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue';
import { resolveLabShellOverlay } from '@/shared/composables/lab-sidecar/resolve-lab-shell-overlay';
import { useLabQuarksShell } from './composables/useLabQuarksShell';
import { AppRegistry } from '@/shared/services/AppRegistry';
import { executeLabNotificationAction } from '@/shared/services/execute-lab-notification-action';
import type { LabNotificationAction } from '@/shared/types/lab-notification-action';
import type { LabUserNotification } from '@/shared/types/lab-domain-event';
import {
  labSidecarExpanded,
  labSidecarInsetPx,
} from '@/shared/composables/lab-sidecar/lab-sidecar-shell-state';
import { useLabSidecarPanel } from '@/shared/composables/useLabSidecarPanel';
import {
  LAB_SHELL_FOCUS_LABORATORY_ARIA,
  LAB_SHELL_LABORATORY_VIEW_LABEL,
} from '@/shared/constants/lab-shell-naming';
import { io } from 'socket.io-client';
import { useChatSession } from '../shared/composables/session/useChatSession';
import { useMcpToolFormatter } from '../shared/composables/mcp/useMcpToolFormatter';
import { SessionManager } from '../shared/composables/session/session-manager';
import { ChatInitializedData, TokenProgressEvent, ConnectErrorEvent, ChatResponseData, FirstMessageReceivedEventData, FirstMessageEditedEventData, SocketErrorEvent, PersonaSwitchedEventData, NewSessionRequestEventData, ResponsePersonaEventData, ProviderUpdateResultData, ProviderTestResultEventData, ProviderFetchModelResponse, ToolCallEventData, ToolResultEventData, SOCKET_EVENTS, SystemInstructionsResponseData, ICommandResultData, IContextSettingsResultData, UpdatedRepoFiles, ResponseData, UserAuthenticatedEventData, ToolCallAgentMesssage, StreamingDelta, StreamingDone, FollowupEventData, UIDiscoveryResponseData, UIElementActionResponseData, MCPServerUpdateEventData, McpStdioAccessUpdatedEventData, UserLoadEventData, UserLoadMCPEventData, User, UserLoginEventData, setAuthUser, type AppsOrderUpdatedEventData } from '../shared/types';
import { useLabDashboard } from '../shared/composables/components/useLabDashboard';
import { useShowDependencyAppsState } from '@/shared/composables/components/useShowDependencyApps';

const props = defineProps<{
  serverUrl: string
}>()

const sessionManager = new SessionManager();

let _onMounted = () => { };
let _onUnMounted = () => { };

onMounted(() => _onMounted());
onUnmounted(() => _onUnMounted());

const { showDependencyApps } = useShowDependencyAppsState();

const { sessionsRef, activeSessionRef, messagesRef, todolistRef, createNewSession, deleteCurrentSession, cleanupAndSetActive, updateSession, deleteSession, getActiveSessions, saveTodoList, deleteSessionTodoLists, saveMessage, updateMessages, bumpMessagesRef, deleteSessionMessages, setContextUsed, switchToSession, getPersonaBadgeColor, getPersonaBadgeIcon, insertBeforePlaceholder, waitForPendingMessageInserts, setLabView, isLabAssistantView, setStreamingEnabled, getStreamingEnabled, setShowServerApps, getShowServerApps, setShowDependencyApps, getShowDependencyApps } = await useChatSession(sessionManager)
const { initMcpFormatter, getMcpToolName, formatMcpToolResult, handleFileDiffs, handleNewFileDiff, handleRemoveFile } = useMcpToolFormatter()
const { inputMessage, sidecarInputMessage, socketConnection, commands, agentInteractionStatus, chatReady, chromaMemoryHealth, externalMcpEnvGaps, selectedSessions, activeTab, showSettingsModal, settingsDialogMounted, showAboutModal, aboutActiveTopicTab, labShellOverlay, activePersonaTab, activePersonaPropertyTab, personaConfigs, availableTools, globalSysMsg, todoListComponentRef, todoListVisible, fileOperationsVisible, providers, availableChatModels, availableEmbedModels, llmProviderConfig, repoFiles, contextSettings, focusedAssistant, currentSystemInstructions, focusAssistant, focusLab, activeTodoLists, activeMessages, chatReadyHandler, isDashboardEnabled, manageContextSettingsRequestHandler, manageContextSettingsResponseHandler, manageCommandsRequestHandler, toast, manageCommandsResponseHandler, previewSystemInstructionRequestHandler, previewSystemInstructionResponseHandler, fetchModelsResponseHandler, fetchModelsRequestHandler, providerConfigUpdateHandlder, testProviderResultsUpdateHandlder, handleProviderSave, handleProviderTest, updateGlobalSysMsg, switchChatSessionTab, savePersonaConfig, summarizeContext, sendMessage, sendSidecarMessage, tokenProgressHandler, connectErrorHandler, responseHandler, firstMessageReceivedHandler, firstMessageEditedHandler, toolCallBeforeHandler, toolCallAfterHandler, errorHandler, handlePersonaSwitched, handleNewSessionRequest, handleResponsePersona, deleteSelectedSessions, clearAllSessions, toggleSessionSelection, handleRepoFilesUpdated, handleAppsOrderUpdated, appsRef, fetchUserList, handleUserLogin, handleUserRegister, handleUserLogout, updateUserProfile, handleDeleteUser, updateUserRole, fetchUserListHandler, handleUserLoginHandler, handleUserRegisterHandler, handleUserLogoutHandler, updateUserProfileHandler, handleDeleteUserHandler, updateUserRoleHandler, user, userList, isAuthenticated, isLoadingServer, toolCallAgentMessageHandler, requestStop, unifiedStreamingHandler, followupRequestReceived, followupRequestSubmittedHandler, uiAutomationDiscoveryReceived, uiAutomationElementActionReceived, loadingModalMsg, loadingUserList, currentUserInstructions, handleUpdateGlobalUserMsg, mcpServers, mcpStdioAccess, saveMcpServerConfig, toggleMcpServer, mcpServersUpdated, requestMcpStdioAccess, reviewMcpStdioAccess, mcpStdioAccessUpdated, handleUserLoadData, handleUserMCPLoadData, onSocketReconnectAuth, emitLaunch, emitLaunchForTab, handleCloseTab, tabOrderApps, effectiveActiveTabId, runningApps, tabLoadingStates, emitTeardown, updateActiveAppTab, appWorkspaceLayout, setWorkspaceMode, updateWorkspaceSplitRatio, minimizedAppIds, minimizedApps, fullyMinimized, minimizeApp, minimizeAllApps, restoreApp, labWorkspaceContextApi } = useLabDashboard(() => sessionsRef.value, () => activeSessionRef.value, () => messagesRef.value, () => todolistRef.value, initMcpFormatter, createNewSession, switchToSession, saveMessage, setContextUsed, updateMessages, bumpMessagesRef, updateSession, insertBeforePlaceholder, waitForPendingMessageInserts, deleteSession, deleteSessionMessages, getActiveSessions, setLabView, isLabAssistantView, deleteCurrentSession, getStreamingEnabled)

const notificationsOverlayExpandedTitles = ref<string[]>([]);
const notificationsOverlaySelectedIds = ref<string[]>([]);

const {
  showMessagesModal,
  messagesDialogMounted,
  openPartnerIds,
  activePartnerId,
  sortedPickerUsers,
  partnerLabel,
  openMessagesDialog,
  focusPartner,
  closePartner,
  clearPartnerHistory,
  sendToPartner,
  acceptGameInvite,
  declineGameInvite,
  resolvedTwInviteIds,
  connected: commsConnected,
  reconnecting: commsReconnecting,
  channels: commsChannels,
  messagesByChannelId,
  presenceForUser,
  channelIdForPartner,
  unreadTotal,
  unreadByPartnerId,
} = useLabMessagesShell({
  serverUrl: props.serverUrl,
  user,
  isAuthenticated,
  toast,
  focusAppView: focusLab,
  launchGameApp: (appId, displayName) => emitLaunchForTab(appId, displayName),
})

/**
 * True when nothing is left to show: every running app is minimized, or the only apps still
 * running are hidden dependencies (Forms Builder) while "Show Dependency Apps" is off.
 *
 * Without the second case, minimizing the sole real tab left `fullyMinimized` false — the
 * dependency app was still running — so the container stayed visible and rendered an empty
 * pane instead of handing the screen back to the app catalog.
 */
const workspaceParked = computed(() => {
  if (fullyMinimized.value) {
    return true;
  }
  if (showDependencyApps.value) {
    return false;
  }
  const minimized = new Set(minimizedAppIds.value);
  const launchable = runningApps.value.filter(
    (app) => app.type === 'browser' || app.type === 'hybrid' || app.type === 'server',
  );
  if (launchable.length === 0) {
    return false;
  }
  return launchable.every((app) => minimized.has(app.id) || app.isDependencyLaunch);
});

const {
  dialogVisible: notificationsDialogVisible,
  loading: notificationsLoading,
  connected: notificationsConnected,
  reconnecting: notificationsReconnecting,
  notifications: labNotifications,
  unreadCount: notificationsUnreadCount,
  openDialog: openNotificationsDialog,
  closeDialog: closeNotificationsDialog,
  markRead: markLabNotificationRead,
  remove: removeLabNotification,
  removeMany: removeManyLabNotifications,
} = useLabNotificationsShell({
  serverUrl: props.serverUrl,
  isAuthenticated,
  onShellToast: (payload) => {
    toast.add({
      severity: payload.severity,
      summary: payload.summary,
      detail: payload.detail,
      life: payload.life ?? 6000,
    });
  },
})

const {
  dialogVisible: quarksDialogVisible,
  openDialog: openQuarksDialog,
  closeDialog: closeQuarksDialog,
  walletLoading: quarksWalletLoading,
  walletError: quarksWalletError,
  account: quarksAccount,
  ledger: quarksLedger,
  loadWalletDetail: reloadQuarksWallet,
} = useLabQuarksShell({
  serverUrl: () => props.serverUrl,
  isAuthenticated,
});

watchEffect(() => {
  labShellOverlay.value = resolveLabShellOverlay({
    focusedAssistant: Boolean(focusedAssistant.value),
    showSettingsModal: showSettingsModal.value,
    settingsTabId: activeTab.value,
    settingsPersonaTab: activePersonaTab.value,
    settingsPersonaPropertyTab: activePersonaPropertyTab.value,
    showMessagesModal: showMessagesModal.value,
    messagesActivePartnerId: activePartnerId.value,
    messagesOpenPartnerIds: openPartnerIds.value,
    notificationsDialogVisible: notificationsDialogVisible.value,
    notificationsExpandedTitles: notificationsOverlayExpandedTitles.value,
    notificationsSelectedIds: notificationsOverlaySelectedIds.value,
    quarksDialogVisible: quarksDialogVisible.value,
    showAboutModal: showAboutModal.value,
    aboutTopicTab: aboutActiveTopicTab.value,
  }) ?? null;
});

async function onLabNotificationAction(
  _item: LabUserNotification,
  action: LabNotificationAction,
): Promise<void> {
  closeNotificationsDialog();
  await executeLabNotificationAction(action, {
    workspace: labWorkspaceContextApi,
    focusAppsWorkspace: focusLab,
    launchApp: emitLaunchForTab,
    openSettings: () => {
      showSettingsModal.value = true;
    },
    resolveAppDisplayName: async (appId) => {
      const app = await AppRegistry.getInstance().getById(appId);
      return app?.name ?? appId;
    },
  });
}

const showForcePasswordChange = computed(
  () => isAuthenticated.value && Boolean(user.value?.mustChangePassword),
);

/** Hydrate Dexie sidecar state before the panel mounts so shell inset is correct on first paint. */
useLabSidecarPanel();

const sidecarExpanded = labSidecarExpanded;

const sidecarShellStyle = computed(() => ({
  '--lab-sidecar-inset': `${labSidecarInsetPx.value}px`,
}));

const showChromaDegradedBanner = computed(
  () =>
    chromaMemoryHealth.value?.status === 'degraded' ||
    chromaMemoryHealth.value?.status === 'unavailable',
);

function onForcedPasswordChangeCompleted(updatedUser: User) {
  user.value = { ...updatedUser, mustChangePassword: false };
  setAuthUser(user.value);
  if (socketConnection.value) {
    socketConnection.value.emit(SOCKET_EVENTS.USER_LOGIN, {
      isAutoLogin: true,
      userId: updatedUser.userId,
      username: '',
      password: '',
    } satisfies UserLoginEventData);
  }
}

_onMounted = () => {
  console.log('Server is available. Establishing connection. ..');
  socketConnection.value = io(props.serverUrl, { withCredentials: true });
  socketConnection.value.on('connect', onSocketReconnectAuth);
  socketConnection.value.on(SOCKET_EVENTS.CHAT_INITIALIZED, async (data: ChatInitializedData) => await chatReadyHandler(data));
  socketConnection.value.on(SOCKET_EVENTS.TOKEN_PROGRESS, async (data: TokenProgressEvent) => await tokenProgressHandler(data));
  socketConnection.value.on('connect_error', (err: ConnectErrorEvent) => connectErrorHandler(err));
  socketConnection.value.on(SOCKET_EVENTS.RESPONSE, async (data: ChatResponseData) => await responseHandler(data));
  socketConnection.value.on(SOCKET_EVENTS.TODO_LIST_UPDATED, async (toolcallData: string) => await todoListComponentRef.value?.todoListUpdatedHandler(toolcallData));
  socketConnection.value.on(SOCKET_EVENTS.FIRST_MESSAGE_RECEIVED, async (data: FirstMessageReceivedEventData) => await firstMessageReceivedHandler(data));
  socketConnection.value.on(SOCKET_EVENTS.FIRST_MESSAGE_EDITED, async (data: FirstMessageEditedEventData) => await firstMessageEditedHandler(data));
  socketConnection.value.on(SOCKET_EVENTS.FOLLOWUP_REQUEST, async (data: FollowupEventData) => await followupRequestReceived(data));
  socketConnection.value.on(SOCKET_EVENTS.ERROR, async (error: SocketErrorEvent) => await errorHandler(error));
  socketConnection.value.on(SOCKET_EVENTS.PERSONA_SWITCHED, async (data: PersonaSwitchedEventData) => await handlePersonaSwitched(data));
  socketConnection.value.on(SOCKET_EVENTS.UI_AUTOMATION_DISCOVER_REQUEST, async (data: UIDiscoveryResponseData) => await uiAutomationDiscoveryReceived(data));
  socketConnection.value.on(SOCKET_EVENTS.UI_AUTOMATION_ACTION_REQUEST, async (data: UIElementActionResponseData) => await uiAutomationElementActionReceived(data));
  socketConnection.value.on(SOCKET_EVENTS.NEW_SESSION_REQUEST, async (data: NewSessionRequestEventData) => await handleNewSessionRequest(data));
  socketConnection.value.on(SOCKET_EVENTS.RESPONSE_PERSONA, async (data: ResponsePersonaEventData) => await handleResponsePersona(data));
  socketConnection.value.on(SOCKET_EVENTS.PROVIDER_CONFIG_UPDATE_ACK, (data: ProviderUpdateResultData) => providerConfigUpdateHandlder(data));
  socketConnection.value.on(SOCKET_EVENTS.PROVIDER_TEST_RESULT, (data: ProviderTestResultEventData) => testProviderResultsUpdateHandlder(data));
  socketConnection.value.on(SOCKET_EVENTS.FETCH_MODELS_RESPONSE, (data: ProviderFetchModelResponse) => fetchModelsResponseHandler(data));
  socketConnection.value.on(SOCKET_EVENTS.TOOL_CALL_BEFORE, async (data: ToolCallEventData) => await toolCallBeforeHandler(data));
  socketConnection.value.on(SOCKET_EVENTS.TOOL_CALL_AFTER, async (data: ToolResultEventData) => await toolCallAfterHandler(data));
  socketConnection.value.on(SOCKET_EVENTS.CURRENT_SYSTEM_INSTRUCTIONS_REQUEST_COMPLETED, (data: SystemInstructionsResponseData) => previewSystemInstructionResponseHandler(data));
  socketConnection.value.on(SOCKET_EVENTS.UPDATE_SLACHCOMMAND_RESPONSE, (data: ICommandResultData) => manageCommandsResponseHandler(data));
  socketConnection.value.on(SOCKET_EVENTS.UPDATE_CONTEXTSETTINGS_RESPONSE, (data: IContextSettingsResultData) => manageContextSettingsResponseHandler(data));
  socketConnection.value.on(SOCKET_EVENTS.UPDATED_REPOFILES, async (data: UpdatedRepoFiles) => await handleRepoFilesUpdated(data));
  socketConnection.value.on(SOCKET_EVENTS.APPS_ORDER_UPDATED, async (data: AppsOrderUpdatedEventData) => {
    await handleAppsOrderUpdated(data.apps);
  });
  socketConnection.value.on(SOCKET_EVENTS.USER_LIST_RESPONSE, (data: ResponseData) => fetchUserListHandler(data));
  socketConnection.value.on(SOCKET_EVENTS.USER_AUTHENTICATED, async (data: UserAuthenticatedEventData) => await handleUserLoginHandler(data));
  socketConnection.value.on(SOCKET_EVENTS.USER_REGISTER, (data: UserAuthenticatedEventData) => handleUserRegisterHandler(data));
  socketConnection.value.on(SOCKET_EVENTS.USER_LOGOUT, (data: UserAuthenticatedEventData) => handleUserLogoutHandler(data));
  socketConnection.value.on(SOCKET_EVENTS.USER_UPDATE_RESPONSE, (data: UserAuthenticatedEventData) => updateUserProfileHandler(data));
  socketConnection.value.on(SOCKET_EVENTS.USER_DELETED_RESPONSE, async (data: ResponseData) => await handleDeleteUserHandler(data));
  socketConnection.value.on(SOCKET_EVENTS.USER_ROLE_CHANGE_RESPONSE, (data: ResponseData) => updateUserRoleHandler(data));
  socketConnection.value.on(SOCKET_EVENTS.TOOL_CALL_AGENT_MESSAGE, async (data: ToolCallAgentMesssage) => await toolCallAgentMessageHandler(data));
  socketConnection.value.on(SOCKET_EVENTS.REASONING_DELTA, async (data: StreamingDelta) => await unifiedStreamingHandler(data, SOCKET_EVENTS.REASONING_DELTA));
  socketConnection.value.on(SOCKET_EVENTS.REASONING_DONE, async (data: StreamingDone) => await unifiedStreamingHandler(data, SOCKET_EVENTS.REASONING_DONE));
  socketConnection.value.on(SOCKET_EVENTS.CONTENT_DELTA, async (data: StreamingDelta) => await unifiedStreamingHandler(data, SOCKET_EVENTS.CONTENT_DELTA));
  socketConnection.value.on(SOCKET_EVENTS.CONTENT_DONE, async (data: StreamingDone) => await unifiedStreamingHandler(data, SOCKET_EVENTS.CONTENT_DONE));
  socketConnection.value.on(SOCKET_EVENTS.UPDATE_MCP_SERVER, (data: MCPServerUpdateEventData) => mcpServersUpdated(data));
  socketConnection.value.on(SOCKET_EVENTS.TOGGLE_MCP_SERVER, (data: MCPServerUpdateEventData) => mcpServersUpdated(data));
  socketConnection.value.on(SOCKET_EVENTS.LOAD_USER_DATA, async (data: UserLoadEventData) => await handleUserLoadData(data));
  socketConnection.value.on(SOCKET_EVENTS.LOAD_MCP_DATA, async (data: UserLoadMCPEventData) => await handleUserMCPLoadData(data));
  socketConnection.value.on(SOCKET_EVENTS.MCP_STDIO_ACCESS_UPDATED, (data: McpStdioAccessUpdatedEventData) => mcpStdioAccessUpdated(data));
  cleanupAndSetActive();
}

_onUnMounted = () => {
  if (socketConnection.value) {
    socketConnection.value.off('connect', onSocketReconnectAuth);
    socketConnection.value.off(SOCKET_EVENTS.CHAT_INITIALIZED);
    socketConnection.value.off(SOCKET_EVENTS.TOKEN_PROGRESS);
    socketConnection.value.off('connect_error');
    socketConnection.value.off(SOCKET_EVENTS.RESPONSE);
    socketConnection.value.off(SOCKET_EVENTS.TODO_LIST_UPDATED);
    socketConnection.value.off(SOCKET_EVENTS.FIRST_MESSAGE_RECEIVED);
    socketConnection.value.off(SOCKET_EVENTS.FIRST_MESSAGE_EDITED);
    socketConnection.value.off(SOCKET_EVENTS.ERROR);
    socketConnection.value.off(SOCKET_EVENTS.PERSONA_SWITCHED);
    socketConnection.value.off(SOCKET_EVENTS.NEW_SESSION_REQUEST);
    socketConnection.value.off(SOCKET_EVENTS.RESPONSE_PERSONA);
    socketConnection.value.off(SOCKET_EVENTS.PROVIDER_CONFIG_UPDATE_ACK);
    socketConnection.value.off(SOCKET_EVENTS.PROVIDER_TEST_RESULT);
    socketConnection.value.off(SOCKET_EVENTS.FETCH_MODELS_RESPONSE);
    socketConnection.value.off(SOCKET_EVENTS.TOOL_CALL_BEFORE);
    socketConnection.value.off(SOCKET_EVENTS.TOOL_CALL_AFTER);
    socketConnection.value.off(SOCKET_EVENTS.CURRENT_SYSTEM_INSTRUCTIONS_REQUEST_COMPLETED);
    socketConnection.value.off(SOCKET_EVENTS.UPDATE_SLACHCOMMAND_RESPONSE);
    socketConnection.value.off(SOCKET_EVENTS.UPDATE_CONTEXTSETTINGS_RESPONSE);
    socketConnection.value.off(SOCKET_EVENTS.UPDATED_REPOFILES);
    socketConnection.value.off(SOCKET_EVENTS.USER_LIST_RESPONSE);
    socketConnection.value.off(SOCKET_EVENTS.USER_AUTHENTICATED);
    socketConnection.value.off(SOCKET_EVENTS.USER_REGISTER);
    socketConnection.value.off(SOCKET_EVENTS.USER_LOGOUT);
    socketConnection.value.off(SOCKET_EVENTS.USER_UPDATE_RESPONSE);
    socketConnection.value.off(SOCKET_EVENTS.USER_DELETED_RESPONSE);
    socketConnection.value.off(SOCKET_EVENTS.USER_ROLE_CHANGE_RESPONSE);
    socketConnection.value.off(SOCKET_EVENTS.TOOL_CALL_AGENT_MESSAGE);
    socketConnection.value.off(SOCKET_EVENTS.REASONING_DELTA);
    socketConnection.value.off(SOCKET_EVENTS.REASONING_DONE);
    socketConnection.value.off(SOCKET_EVENTS.CONTENT_DELTA);
    socketConnection.value.off(SOCKET_EVENTS.CONTENT_DONE);
    socketConnection.value.off(SOCKET_EVENTS.UI_AUTOMATION_DISCOVER_REQUEST);
    socketConnection.value.off(SOCKET_EVENTS.UI_AUTOMATION_ACTION_REQUEST);
    socketConnection.value.off(SOCKET_EVENTS.UPDATE_MCP_SERVER);
    socketConnection.value.off(SOCKET_EVENTS.TOGGLE_MCP_SERVER);
    socketConnection.value.off(SOCKET_EVENTS.LOAD_USER_DATA);
    socketConnection.value.off(SOCKET_EVENTS.LOAD_MCP_DATA);
    socketConnection.value.off(SOCKET_EVENTS.MCP_STDIO_ACCESS_UPDATED);
    socketConnection.value.disconnect();
  }
}
</script>

<template>
  <div class="the-lab-container text-sm">
    <header class="lab-brand-header">
      <div class="lab-brand-lockup">
        <i class="fa-solid fa-flask rotate-4 lab-brand-lockup__icon" aria-hidden="true"></i>
        <h1 class="lab-brand-lockup__wordmark">THE-LAB</h1>
        <button
          type="button"
          class="lab-brand-assistant-toggle focus-assistant-toggle"
          :class="{
            'lab-brand-assistant-toggle--focused': focusedAssistant,
          }"
          :aria-label="LAB_SHELL_FOCUS_LABORATORY_ARIA"
          @click="() => focusAssistant()"
        >
          <i class="fa fa-solid fa-comment-dots" aria-hidden="true"></i>
        </button>
      </div>
    </header>

    <div
      v-if="showChromaDegradedBanner"
      class="mx-auto mb-3 max-w-3xl rounded-lg border border-amber-600/60 bg-amber-950/40 px-4 py-2 text-center text-sm text-amber-100"
      role="status"
    >
      Conversation memory is in degraded mode{{ chromaMemoryHealth?.message ? `: ${chromaMemoryHealth.message}` : '' }}.
      Chat continues; long-term recall may be limited until Chroma is healthy.
    </div>

    <nav
      class="lab-quick-nav"
      :class="{ 'lab-quick-nav--assistant-focused': focusedAssistant }"
      aria-label="Lab quick navigation"
    >
      <button
        type="button"
        class="lab-quick-nav__action show-settings-toggle"
        @click="showSettingsModal = !showSettingsModal"
      >
        <i class="fa fa-solid fa-gear" aria-hidden="true"></i>
        <span>Settings</span>
      </button>
      <button
        type="button"
        class="lab-quick-nav__action focus-assistant-toggle"
        @click="() => focusAssistant()"
      >
        <i class="fa fa-solid fa-comment-dots" aria-hidden="true"></i>
        <span>{{ LAB_SHELL_LABORATORY_VIEW_LABEL }}</span>
      </button>
      <button
        type="button"
        class="lab-quick-nav__action lab-messages-nav-action"
        @click="openMessagesDialog"
      >
        <i class="fa fa-solid fa-comments" aria-hidden="true"></i>
        <span>Messages</span>
        <span
          v-if="unreadTotal > 0"
          class="lab-messages-nav-badge"
          :aria-label="`${unreadTotal} unread message${unreadTotal === 1 ? '' : 's'}`"
        >{{ unreadTotal > 99 ? '99+' : unreadTotal }}</span>
      </button>
      <button
        type="button"
        class="lab-quick-nav__action lab-notifications-nav-action"
        @click="openNotificationsDialog()"
      >
        <i class="fa fa-solid fa-bell" aria-hidden="true"></i>
        <span>Notifications</span>
        <span
          v-if="notificationsUnreadCount > 0"
          class="lab-notifications-nav-badge"
          :aria-label="`${notificationsUnreadCount} unread notification${notificationsUnreadCount === 1 ? '' : 's'}`"
        >{{ notificationsUnreadCount > 99 ? '99+' : notificationsUnreadCount }}</span>
      </button>
      <LabQuickNavQuarks v-if="isAuthenticated" @open="openQuarksDialog()" />
      <button type="button" class="lab-quick-nav__action focus-assistant-toggle" @click="showAboutModal = true">
        <i class="fa fas fa-circle-info" aria-hidden="true"></i>
        <span>About THE-LAB</span>
      </button>
    </nav>

    <div class="lab-assistant-container relative z-2">
      <LabAssistant :sessions-ref="sessionsRef" :active-session-ref="activeSessionRef" :active-messages="activeMessages"
        :persona-configs="personaConfigs" :chat-ready="chatReady" :agent-interaction-status="agentInteractionStatus"
        :input-message="inputMessage" :repo-files="repoFiles" :commands="commands" :context-settings="contextSettings"
        :delete-current-session="deleteCurrentSession" :create-new-session="createNewSession"
        :update-session="updateSession" :toast="toast" :get-persona-badge-color="getPersonaBadgeColor"
        :get-persona-badge-icon="getPersonaBadgeIcon" :focus-assistant="focusAssistant" :focus-lab="focusLab"
        :get-mcp-tool-name="getMcpToolName" :format-mcp-tool-result="formatMcpToolResult" :stop-request="requestStop"
        :set-streaming-enabled="setStreamingEnabled" :get-streaming-enabled="getStreamingEnabled"
        :focused-assistant="focusedAssistant" :handle-followup-submitted="followupRequestSubmittedHandler"
        @switch-chat-session-tab="switchChatSessionTab" @show-settings-modal="showSettingsModal = !showSettingsModal"
        @send-message="sendMessage" @summarize-context="summarizeContext"
        @update-input-message="(value) => inputMessage = value" />
    </div>

    <div
      class="app-view-container relative z-0 flex gap-4 px-3"
      :class="{
        'transition-all duration-500 opacity-100': !focusedAssistant,
        'transition-all duration-500 blur-[3px] opacity-50': focusedAssistant,
        'lab-shell--sidecar-inset': !focusedAssistant && sidecarExpanded,
      }"
      :style="sidecarShellStyle"
    >

      <AppContainer :apps="appsRef" :user="user" :is-authenticated="isAuthenticated" :running-apps="runningApps"
        :minimized-apps="minimizedApps" :all-apps-minimized="workspaceParked"
        :set-show-server-apps="setShowServerApps" :get-show-server-apps="getShowServerApps"
        @launch="emitLaunch"
        @teardown="emitTeardown" @restore="restoreApp" />
      <div
        id="render-container"
        class="app-loaded-container min-h-0"
        :class="{
          'flex flex-col flex-1 min-h-0 w-full min-w-0':
            runningApps.length > 0 && !workspaceParked,
          /* Parked: keep panes mounted (app instances live here) but out of layout */
          hidden: runningApps.length == 0 || workspaceParked,
        }"
      >

        <!-- Tabs for running apps (placed FIRST inside render-container).
             Stays mounted when every app is parked — mounted instances live in these panes. -->
        <div
          v-if="runningApps.length > 0"
          class="tabs-wrapper flex flex-1 flex-col min-h-0 w-full min-w-0"
        >
          <AppViewLayout
            :tab-order-apps="tabOrderApps"
            :active-tab-id="effectiveActiveTabId"
            :tab-loading-states="tabLoadingStates"
            :workspace-layout="appWorkspaceLayout"
            :minimized-app-ids="minimizedAppIds"
            :workspace-parked="workspaceParked"
            :handle-close-tab="handleCloseTab"
            :minimize-app="minimizeApp"
            :minimize-all-apps="minimizeAllApps"
            :update-active-app-tab="updateActiveAppTab"
            :set-show-dependency-apps="setShowDependencyApps"
            :get-show-dependency-apps="getShowDependencyApps"
            @set-workspace-mode="setWorkspaceMode"
            @update-split-ratio="updateWorkspaceSplitRatio"
          />
        </div>

        <Dialog v-model:visible="isLoadingServer" :closable="false" :header="loadingModalMsg" :modal="true">
          <div class="flex-1 flex justify-center">
            <ProgressSpinner />
          </div>
        </Dialog>
      </div>

    </div>

    <LabSidecar
      v-if="!focusedAssistant"
      :apps="appsRef"
      :focus-assistant="focusAssistant"
      :sessions-ref="sessionsRef"
      :active-session-ref="activeSessionRef"
      :active-messages="activeMessages"
      :active-todo-lists="activeTodoLists"
      :handle-file-diffs="handleFileDiffs"
      :handle-new-file-diff="handleNewFileDiff"
      :handle-remove-file="handleRemoveFile"
      :chat-ready="chatReady"
      :agent-interaction-status="agentInteractionStatus"
      :sidecar-input-message="sidecarInputMessage"
      :stop-request="requestStop"
      :get-mcp-tool-name="getMcpToolName"
      :format-mcp-tool-result="formatMcpToolResult"
      :get-persona-badge-color="getPersonaBadgeColor"
      :get-persona-badge-icon="getPersonaBadgeIcon"
      @send-sidecar-message="sendSidecarMessage"
      @update-sidecar-input="(v) => (sidecarInputMessage = v)"
      @switch-chat-session-tab="(id) => switchChatSessionTab(id, { focusLaboratory: false })"
    />

    <TodoListView ref="todoListComponentRef" :is-visible="todoListVisible && chatReady"
      :active-todo-lists="activeTodoLists" :todolist-ref="todolistRef" :save-todo-list="saveTodoList"
      :delete-session-todo-lists="deleteSessionTodoLists" />

    <FileOverview :is-active="fileOperationsVisible && chatReady" :active-messages="activeMessages"
      :handle-file-diffs="handleFileDiffs" :handle-new-file-diff="handleNewFileDiff"
      :handle-remove-file="handleRemoveFile" />

    <Toast position="top-center" append-to="body" class="top-5! lab-shell-toast">
      <template #message="slotProps">
        <div class="text-xs flex flex-col items-start flex-auto">
          <div class="flex flex-col items-start gap-2">
            <div class="font-semibold">{{ slotProps.message.summary }}</div>
            <div>{{ slotProps.message.detail }}</div>
          </div>
        </div>
      </template>
    </Toast>
    <SettingsDialog v-if="settingsDialogMounted" :visible="showSettingsModal" :active-tab="activeTab" :active-persona-tab="activePersonaTab"
      :active-persona-property-tab="activePersonaPropertyTab" :global-sys-msg="globalSysMsg" :commands="commands"
      :persona-configs="personaConfigs" :context-settings="contextSettings" :available-tools="availableTools"
      :sessions="sessionsRef" :selected-sessions="selectedSessions"
      :on-settings-visible="(v: boolean) => showSettingsModal = v" :on-tab-change="(v: string) => activeTab = v"
      :on-persona-save="savePersonaConfig" :on-persona-tab-change="(v: string) => activePersonaTab = v"
      :on-property-tab-change="(v: string) => activePersonaPropertyTab = v"
      :on-toggle-session-selection="toggleSessionSelection" :on-delete-sessions="deleteSelectedSessions"
      :onClearAllSessions="clearAllSessions" :onGlobalSysMsgChange="updateGlobalSysMsg"
      :get-persona-badge-color="getPersonaBadgeColor" :get-persona-badge-icon="getPersonaBadgeIcon"
      :providers="providers" :llm-provider-config="llmProviderConfig" :is-dashboard-enabled="isDashboardEnabled"
      :handle-l-l-m-provider-save="handleProviderSave" :handle-l-l-m-provider-test="handleProviderTest"
      :available-chat-models="availableChatModels"
      :manageContextSettingsRequestHandler="manageContextSettingsRequestHandler"
      :available-embed-models="availableEmbedModels"
      :handle-l-l-m-provider-fetch-models="fetchModelsRequestHandler"
      :current-system-instructions="currentSystemInstructions"
      :preview-system-instruction-request="previewSystemInstructionRequestHandler"
      :manage-commands-request-handler="manageCommandsRequestHandler" :user="user" :user-list="userList"
      :is-authenticated="isAuthenticated" :fetch-user-list="fetchUserList" :handle-user-login="handleUserLogin"
      :handle-user-register="handleUserRegister" :handle-user-logout="handleUserLogout" :apps="appsRef"
      :update-user-profile="updateUserProfile" :handle-delete-user="handleDeleteUser" :update-user-role="updateUserRole"
      :logout-handler="handleUserLogout" :messages-ref="messagesRef" :todolist-ref="todolistRef"
      :loading-user-list="loadingUserList"
      :current-user-instructions="currentUserInstructions" :handle-update-global-user-msg="handleUpdateGlobalUserMsg"
      :mcp-servers="mcpServers" :save-mcp-server-config="saveMcpServerConfig" :toggle-mcp-server="toggleMcpServer"
      :external-mcp-env-gaps="externalMcpEnvGaps"
      :mcp-stdio-access="mcpStdioAccess" :request-mcp-stdio-access="requestMcpStdioAccess"
      :review-mcp-stdio-access="reviewMcpStdioAccess"
      :on-focus-apps-workspace="focusLab"
      :on-launch-app="(appId, appName) => void emitLaunchForTab(appId, appName)" />
    <LabMessagesDialog
      v-if="messagesDialogMounted"
      :visible="showMessagesModal"
      :connected="commsConnected"
      :reconnecting="commsReconnecting"
      :self-user="user"
      :sorted-users="sortedPickerUsers"
      :open-partner-ids="openPartnerIds"
      :active-partner-id="activePartnerId"
      :unread-by-partner-id="unreadByPartnerId"
      :channels="commsChannels"
      :messages-by-channel-id="messagesByChannelId"
      :presence-for-user="presenceForUser"
      :partner-label="partnerLabel"
      :channel-id-for-partner="channelIdForPartner"
      :resolved-tw-invite-ids="resolvedTwInviteIds"
      @update:visible="(v: boolean) => (showMessagesModal = v)"
      @focus-partner="focusPartner"
      @close-partner="closePartner"
      @clear-partner="clearPartnerHistory"
      @send="({ partnerUserId, text }) => sendToPartner(partnerUserId, text)"
      @accept-tw-invite="({ inviteId, partnerUserId, appId }) => acceptGameInvite(inviteId, partnerUserId, appId)"
      @decline-tw-invite="({ inviteId, partnerUserId, appId }) => declineGameInvite(inviteId, partnerUserId, appId)"
    />
    <LabNotificationsDialog
      v-if="isAuthenticated"
      :visible="notificationsDialogVisible"
      :loading="notificationsLoading"
      :connected="notificationsConnected"
      :reconnecting="notificationsReconnecting"
      :notifications="labNotifications"
      @update:visible="(v: boolean) => (v ? openNotificationsDialog() : closeNotificationsDialog())"
      @mark-read="(id) => markLabNotificationRead(id)"
      @remove="(id) => removeLabNotification(id)"
      @remove-many="(ids) => removeManyLabNotifications(ids)"
      @run-action="(item, action) => void onLabNotificationAction(item, action)"
      @overlay-detail="
        ({ expandedTitles, selectedIds }) => {
          notificationsOverlayExpandedTitles = expandedTitles;
          notificationsOverlaySelectedIds = selectedIds;
        }
      "
    />
    <LabQuarksWalletDialog
      v-if="isAuthenticated"
      :visible="quarksDialogVisible"
      :loading="quarksWalletLoading"
      :error="quarksWalletError"
      :account="quarksAccount"
      :ledger="quarksLedger"
      @update:visible="(v: boolean) => (v ? openQuarksDialog() : closeQuarksDialog())"
      @refresh="reloadQuarksWallet()"
    />
    <About
      :visible="showAboutModal"
      :active-topic-tab="aboutActiveTopicTab"
      :handle-about-visible="(v: boolean) => (showAboutModal = v)"
      @update:active-topic-tab="(tab: string) => (aboutActiveTopicTab = tab)"
    />
    <ForcePasswordChangeDialog
      :visible="showForcePasswordChange"
      :user="user"
      @completed="onForcedPasswordChangeCompleted"
    />
  </div>
</template>

