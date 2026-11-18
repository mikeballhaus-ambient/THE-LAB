import { ref, watch, type Ref } from 'vue';

import type { ToastServiceMethods } from 'primevue/toastservice';

import type { Socket } from 'socket.io-client';

import {

  SOCKET_EVENTS,

  getAuthUser,

  type AiProvider,

  type ChatInitializedData,

  type LLMProviderConfig,

  type RuntimeApp,

  type UpdatedRepoFiles,

  type User,

  type UserLoginEventData,

} from '@/shared/types';

import { AppRegistry } from '@/shared/services/AppRegistry';

import {

  emitPendingSsoSocketLogin,

  readPendingSsoLoginFromUrl,

  stripSsoParamsFromUrl,

  type PendingSsoLogin,

} from '../../useSsoRedirect.client';



export interface UseLabSocketBootstrapOptions {

  socketConnection: Ref<Socket | null>;

  user: Ref<User | null>;

  isAuthenticated: Ref<boolean>;

  showSettingsModal: Ref<boolean>;

  isDashboardEnabled: Ref<boolean>;

  isLabAssistantView: () => Promise<boolean>;

  focusAssistant: () => Promise<void>;

  focusLab: () => Promise<void>;

  toast: ToastServiceMethods;

  globalSysMsg: Ref<string>;

  providers: Ref<AiProvider[]>;

  repoFiles: Ref<string[]>;

  appsRef: Ref<RuntimeApp[]>;

  llmProviderConfig: Ref<LLMProviderConfig | undefined>;

  hydrateAppWorkspaceLayout: () => Promise<void>;

}



/** CHAT_INITIALIZED, SSO URL bootstrap, reconnect auth (rm-46 **4.2**). */

export function useLabSocketBootstrap(options: UseLabSocketBootstrapOptions) {

  const {

    socketConnection,

    user,

    isAuthenticated,

    showSettingsModal,

    isDashboardEnabled,

    isLabAssistantView,

    focusAssistant,

    focusLab,

    globalSysMsg,

    providers,

    repoFiles,

    appsRef,

    llmProviderConfig,

    hydrateAppWorkspaceLayout,

  } = options;



  const chatReady = ref(false);

  const chromaMemoryHealth = ref<ChatInitializedData['memoryHealth']>(undefined);

  const externalMcpEnvGaps = ref<NonNullable<ChatInitializedData['externalMcpEnvGaps']>>([]);

  const hasCompletedInitialLoginBootstrap = ref(false);
  const autoLoginEmitted = ref(false);

  let pendingSsoLogin: PendingSsoLogin | null = readPendingSsoLoginFromUrl();

  function emitAutoLogin(userId: number): void {
    if (!socketConnection.value || autoLoginEmitted.value) {
      return;
    }
    autoLoginEmitted.value = true;
    socketConnection.value.emit(SOCKET_EVENTS.USER_LOGIN, {
      userId,
      isAutoLogin: true,
    } as UserLoginEventData);
  }

  watch(isAuthenticated, (authed) => {
    if (!authed) {
      autoLoginEmitted.value = false;
    }
  });



  function tryCompleteSsoLogin(): void {

    if (!pendingSsoLogin) {

      return;

    }

    if (emitPendingSsoSocketLogin(socketConnection, pendingSsoLogin)) {

      stripSsoParamsFromUrl();

      pendingSsoLogin = null;

    }

  }



  const chatReadyHandler = async (data: ChatInitializedData) => {

    if (data.ready) {

      chatReady.value = true;

      if (data.globalSysMsg) {

        globalSysMsg.value = data.globalSysMsg;

      }

      if (data.providers) {

        providers.value = data.providers;

      }

      if (data.llmProviderConfig) {

        llmProviderConfig.value = data.llmProviderConfig;

      }

      if (data.repoFiles) {

        repoFiles.value = data.repoFiles;

      }

      if (data.apps) {

        appsRef.value = data.apps;

        await AppRegistry.getInstance().hydrateFromSocket(appsRef.value);

      }

      if (data.memoryHealth) {

        chromaMemoryHealth.value = data.memoryHealth;

      }

      if (data.externalMcpEnvGaps) {

        externalMcpEnvGaps.value = data.externalMcpEnvGaps;

      }

      await hydrateAppWorkspaceLayout();



      const ssoFromUrl = pendingSsoLogin;

      if (ssoFromUrl) {

        tryCompleteSsoLogin();

        if (pendingSsoLogin) {

          return;

        }

        return;

      }



      const storedUser = getAuthUser();

      if (storedUser?.userId) {
        if (await isLabAssistantView()) {
          await focusAssistant();
        } else {
          await focusLab();
        }
        emitAutoLogin(storedUser.userId);
      } else {
        user.value = null;
        isAuthenticated.value = false;

        const attemptedSso = Boolean(pendingSsoLogin);

        tryCompleteSsoLogin();

        if (!isAuthenticated.value && !attemptedSso) {

          showSettingsModal.value = !isDashboardEnabled.value;

          if (await isLabAssistantView()) {

            await focusAssistant();

          } else {

            await focusLab();

          }

        }

      }

    }

  };



  const onSocketReconnectAuth = (): void => {
    tryCompleteSsoLogin();

    if (!chatReady.value || !socketConnection.value) {
      return;
    }

    const userId = user.value?.userId ?? getAuthUser()?.userId;
    if (!userId) {
      return;
    }

    autoLoginEmitted.value = false;
    emitAutoLogin(userId);
  };



  const handleRepoFilesUpdated = async (data: UpdatedRepoFiles) => {

    if (data.repoFiles) {

      repoFiles.value = data.repoFiles;

    }

  };



  return {

    chatReady,

    chromaMemoryHealth,

    externalMcpEnvGaps,

    hasCompletedInitialLoginBootstrap,

    chatReadyHandler,

    onSocketReconnectAuth,

    handleRepoFilesUpdated,

  };

}

