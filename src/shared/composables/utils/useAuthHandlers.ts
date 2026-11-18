import { ref, Ref, nextTick } from "vue";
import { useToast } from 'primevue/usetoast';
import { Socket } from 'socket.io-client';
import { User, UserRole, setAuthUser, removeAuthUser, UserAuthenticatedEventData, UserLoginEventData, ResponseData, ChatSessionRecord, ChatPersona, Persona, LLMProviderConfig, ICommand, IContextSettings, TodoList, UserRegisterEventData, IMCPServerConfig, ToolsList, UserLoadEventData, UserLoadMCPEventData, McpStdioAccessPayload } from '../../../shared/types';
import { SOCKET_EVENTS } from '../../../shared/types';
import { setLabAccessToken, setLabSessionId } from '../useLabPlatformAuth';
import {
  discardDraft,
  hydrateLabThemeFromPlatform,
  setLabThemeAdminSession,
} from '@/shared/theme/lab-theme-draft-store';
import { clearCachedPlatformLabTheme } from '@/shared/theme/lab-theme-client-cache';
import { bootstrapLabTheme } from '@/shared/theme/lab-theme-state';

export function useAuthHandlers(
  user: Ref<User | null>,
  userList: Ref<User[]>,
  isAuthenticated: Ref<boolean>,
  socketConnection: Ref<Socket | null>,
  activeSessionRef: () => ChatSessionRecord | null,
  createNewSession: (persona?: ChatPersona, sessionId?: string) => Promise<string | null>,
  personaConfigs: Ref<Record<string, Persona>>,
  llmProviderConfig: Ref<LLMProviderConfig | undefined>,
  availableChatModels: Ref<string[]>,
  availableEmbedModels: Ref<string[]>,
  commands: Ref<ICommand[]>,
  contextSettings: Ref<IContextSettings | undefined>,
  activeTodoLists: () => Ref<TodoList[] | undefined>,
  showSettingsModal: Ref<boolean>,
  isDashboardEnabled: Ref<boolean>,
  isLabAssistantView: () => Promise<boolean>,
  focusAssistant: () => Promise<void>,
  focusLab: () => Promise<void>,
  currentUserInstructions: Ref<string>,
  mcpServers: Ref<IMCPServerConfig[]>,
  availableTools: Ref<ToolsList[]>,
  initMcpFormatter: (toolsList: ToolsList[]) => void,
  mcpStdioAccess: Ref<McpStdioAccessPayload>,
  hasCompletedInitialLoginBootstrap?: Ref<boolean>
) {
  const toast = useToast();
  const loadingUserList = ref<boolean>(false)

  // ==================================================================
  // USER MANAGEMENT HANDLERS (socket-based, only in LabDashboard)
  // ==================================================================

  const fetchUserListHandler = (data: ResponseData) => {
    if (data.success && data.data) {
      userList.value = data.data as User[]
    }
    loadingUserList.value = false
  }

  const fetchUserList = () => {
    if (!socketConnection.value) return;
    userList.value = [];
    loadingUserList.value = true
    socketConnection.value.emit(SOCKET_EVENTS.USER_LIST_REQUEST)
  };

  const handleUserLoginHandler = async (data: UserAuthenticatedEventData) => {
    if (data.isAuthenticated && data.user) {
      user.value = data.user
      isAuthenticated.value = true;
      setAuthUser(data.user)
      setLabAccessToken(data.accessToken ?? null);
      setLabSessionId(data.labSessionId ?? null);

      if (hasCompletedInitialLoginBootstrap) {
        hasCompletedInitialLoginBootstrap.value = true;
      }

      const mustChangePassword =
        Boolean(data.mustChangePassword) || Boolean(data.user?.mustChangePassword);
      if (mustChangePassword) {
        return;
      }

      setLabThemeAdminSession(data.user.role === 'owner' || data.user.role === 'admin');
      await hydrateLabThemeFromPlatform();

      const _activeSessionRef = activeSessionRef()
      if (!_activeSessionRef) {
        await createNewSession()
      }
      const _activeToDoListRef = activeTodoLists()
      if (_activeSessionRef && socketConnection.value && _activeToDoListRef.value && _activeToDoListRef.value?.length > 0) {
        socketConnection.value.emit(SOCKET_EVENTS.TODO_LIST_SYNC, {
          sessionId: _activeSessionRef.sessionId,
          todoLists: _activeToDoListRef.value,
          userId: user.value.userId
        });
      }
      if (await isLabAssistantView()) {
        await focusAssistant();
      } else {
        await focusLab();
      }
    } else {
      user.value = null;
      isAuthenticated.value = false;
      removeAuthUser();
      setLabAccessToken(null);
      setLabSessionId(null);
      showSettingsModal.value = !isDashboardEnabled.value;
    }
  }

  const handleUserLoadData = async (data: UserLoadEventData) => {
    if (data.personas) {
      data.personas.forEach((persona: Persona) => {
        personaConfigs.value[persona.name] = persona;
      });
    }

    if (data.llmProviderConfig) {
      llmProviderConfig.value = data.llmProviderConfig
      if (llmProviderConfig.value.chat.model) availableChatModels.value.push(llmProviderConfig.value.chat.model)
      if (llmProviderConfig.value.embed.model) availableEmbedModels.value.push(llmProviderConfig.value.embed.model)
    }

    if (data.commands) {
      commands.value = data.commands;
    }
    if (data.contextSettings) {
      contextSettings.value = data.contextSettings;
    }
    if (data.userInstructions) {
      currentUserInstructions.value = data.userInstructions.text
    }
  }

  const handleUserMCPLoadData = async (data: UserLoadMCPEventData) => {
    if (data.mcpServers) {
      mcpServers.value = data.mcpServers;
    }

    if (data.tools) {
      const sortedTools = [...data.tools].sort((a: ToolsList, b: ToolsList) => {
        // 2. Get the display name fallback cleanly
        const aProp = a.display || a.name || '';
        const bProp = b.display || b.name || '';

        // 3. Use localeCompare for a perfect, human-readable alphabetical sort
        return aProp.localeCompare(bProp);
      });
      availableTools.value = sortedTools
      initMcpFormatter(sortedTools)
    }

    if (data.stdioAccess) {
      mcpStdioAccess.value = data.stdioAccess;
    }
  }

  const handleUserLogin = (username: string, password: string) => {
    if (!socketConnection.value) return;
    socketConnection.value.emit(SOCKET_EVENTS.USER_LOGIN, { username: username, password: password } as UserLoginEventData)
  };

  const handleUserRegisterHandler = async (data: UserAuthenticatedEventData) => {
    if (data.name) {
      toast.add({ severity: 'success', summary: 'Registration', detail: 'Registration successful ', life: 3000 });
      await nextTick(() => {
        fetchUserList()
      })
    } else {
      toast.add({ severity: 'warning', summary: 'Registration', detail: 'Registration failed', life: 3000 });
    }
  }

  const handleUserRegister = (username: string, password: string, role: string, email?: string) => {
    if (!socketConnection.value) return;
    socketConnection.value.emit(SOCKET_EVENTS.USER_REGISTER, { username: username, password: password, email: email, role: role } as UserRegisterEventData)
  };

  const handleUserLogoutHandler = (data: UserAuthenticatedEventData) => {
    if (!data.isAuthenticated) {
      const loggedOutUserId = user.value?.userId;
      discardDraft();
      setLabThemeAdminSession(false);
      if (loggedOutUserId) {
        clearCachedPlatformLabTheme(loggedOutUserId);
        bootstrapLabTheme();
      }
      user.value = null
      isAuthenticated.value = false;
      removeAuthUser()
      setLabAccessToken(null);
      setLabSessionId(null);
      if (hasCompletedInitialLoginBootstrap) {
        hasCompletedInitialLoginBootstrap.value = false;
      }
      toast.add({ severity: 'warning', summary: 'Logout', detail: 'Logout successful', life: 3000 });
    }
  }

  const handleUserLogout = () => {
    if (!socketConnection.value) return;
    socketConnection.value.emit(SOCKET_EVENTS.USER_LOGOUT, { userId: user.value?.userId });
  };

  const updateUserProfileHandler = (data: UserAuthenticatedEventData) => {
    if (data.isAuthenticated && data.user) {
      if (data.user.userId === user.value?.userId) {
        user.value = data.user;
        isAuthenticated.value = true;
        setAuthUser(data.user);
      }
      if (user.value?.permissions?.global?.canManageUsers) {
        fetchUserList();
      }
      toast.add({ severity: 'success', summary: 'Profile', detail: 'User updated successfully', life: 3000 });
    } else if (data.message) {
      toast.add({ severity: 'error', summary: 'Profile', detail: data.message, life: 3000 });
    }
  }

  const updateUserProfile = (updatedUser: User) => {
    if (!socketConnection.value) return;
    socketConnection.value.emit(SOCKET_EVENTS.USER_UPDATE, updatedUser);
  };

  const handleDeleteUserHandler = async (data: ResponseData) => {
    if (data.success) {
      toast.add({ severity: 'success', summary: 'Delete', detail: 'Successfully removed user', life: 3000 });
      await fetchUserList()
    } else {
      const detail =
        typeof data.error === 'string' && data.error.length > 0
          ? data.error
          : 'Failed to remove user';
      toast.add({ severity: 'error', summary: 'Delete', detail, life: 5000 });
    }
  }

  const handleDeleteUser = (targetUserId: number) => {
    if (!user.value || !socketConnection.value || targetUserId === user.value.userId) return;
    socketConnection.value.emit(SOCKET_EVENTS.USER_DELETED_REQUEST, { userId: targetUserId });
  };

  const updateUserRoleHandler = (data: ResponseData) => {
    if (data.success) {
      toast.add({ severity: 'success', summary: 'Update Role', detail: 'Successfully updated role', life: 3000 });
      if (data.user) {
        user.value = data.user
        setAuthUser(data.user)
      }
    } else {
      toast.add({ severity: 'error', summary: 'Update Role', detail: 'Failed to update role', life: 3000 });
    }
  }

  const updateUserRole = (targetUserId: number, newRole: UserRole) => {
    if (!user.value || !socketConnection.value) return;
    socketConnection.value.emit(SOCKET_EVENTS.USER_ROLE_CHANGE_REQUEST, { userId: targetUserId, role: newRole });
  };

  return {
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
  };
}
