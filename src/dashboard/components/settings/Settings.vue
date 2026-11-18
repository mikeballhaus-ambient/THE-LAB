<script setup lang="ts">
import { watch, computed, onMounted, ref } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import UserManagement from './UserManagement.vue'
import AuthProvidersManagement from './AuthProvidersManagement.vue'
import AppSeedDataManagement from './AppSeedDataManagement.vue'
import ThemeManagement from './ThemeManagement.vue'
import ApiManagement from './ApiManagement.vue'
import PersonaManagement from './PersonaManagement.vue'
import CommandManagement from './CommandManagement.vue'
import SystemMessageManagement from './SystemMessageManagement.vue'
import AppsManagement from './AppsManagement.vue'
import SessionManagement from './SessionManagement.vue'
import ContextManagement from './ContextManagement.vue'
import MCPServerManagement from './MCPServerManagement.vue'
import AppCatalogTagsManagement from './AppCatalogTagsManagement.vue'
import LabApprovalsInbox from './LabApprovalsInbox.vue'
import LabApprovalPoliciesManagement from './LabApprovalPoliciesManagement.vue'
import LabLedgerJournal from './LabLedgerJournal.vue'
import LabLedgerAccountsAdmin from './LabLedgerAccountsAdmin.vue'
import LabAppBuilderSettings from './LabAppBuilderSettings.vue'
import LabSidecarActivitySettingsManagement from './LabSidecarActivitySettingsManagement.vue'
import LabGameSidecarPreferencesSettings from './LabGameSidecarPreferencesSettings.vue'
import LabLoginDialog from '../auth/LabLoginDialog.vue'
import { AiProvider, UpdatePersonaConfigEventData, ChatSessionRecord, LLMProviderConfig, Persona, ToolsList, ICommand, ICommandRequestData, IContextSettings, User, UserRole, TodoList, UIChatMessage, RuntimeApp, IMCPServerConfig } from '../../../shared/types';
import { useSettings } from '../../../shared/composables/components/useSettings'
import {
  SETTINGS_ADMIN_VIEWS,
  SETTINGS_NAV_GROUPS,
  SettingsViewId,
  findSettingsNavItem,
} from './settings-nav'
import { personaUtils } from '@/shared/utils/persona-utils'
import { useLabWorkspaceContext } from '@/shared/composables/useLabWorkspaceContext'
import { LAB_HOST_CTX_SETTINGS_VIEW } from '@/shared/lab-integrations/lab-host-context-keys'

const PERSONA_NAV_ORDER = ['Chat', 'Orchestrator', 'Architect', 'Code', 'Debug', 'QA']

const props = withDefaults(defineProps<{
  visible: boolean,
  activeTab: string,
  activePersonaTab: string,
  activePersonaPropertyTab: string,
  globalSysMsg: string,
  personaConfigs: Record<string, Persona>,
  availableTools: ToolsList[],
  sessions: ChatSessionRecord[],
  selectedSessions: string[],
  providers: AiProvider[],
  llmProviderConfig: LLMProviderConfig | undefined,
  isDashboardEnabled: boolean,
  availableChatModels: string[],
  availableEmbedModels: string[],
  onSettingsVisible: (visible: boolean) => void,
  onTabChange: (tabValue: string) => void,
  onPersonaSave: (data: UpdatePersonaConfigEventData) => void,
  onPersonaTabChange: (tab: string) => void,
  onPropertyTabChange: (tab: string) => void,
  onToggleSessionSelection: (sessionId: string) => void,
  onDeleteSessions: (sessionIds: string[]) => Promise<void>,
  onClearAllSessions: () => Promise<void>,
  onGlobalSysMsgChange: (data: string) => void,
  getPersonaBadgeColor: (personaName?: string) => string,
  getPersonaBadgeIcon: (personaName?: string) => string,
  handleLLMProviderSave: (llmProviderConfigUpdate: LLMProviderConfig | undefined, userId: number) => Promise<void>,
  handleLLMProviderTest: (llmProviderConfigUpdate: LLMProviderConfig | undefined) => Promise<void>,
  handleLLMProviderFetchModels: (llmProviderConfigUpdate: LLMProviderConfig | undefined) => void,
  previewSystemInstructionRequest: () => void,
  commands: ICommand[],
  contextSettings: IContextSettings | undefined,
  manageCommandsRequestHandler: (data: ICommandRequestData) => void,
  manageContextSettingsRequestHandler: (data: IContextSettings) => void,
  currentSystemInstructions: string,
  user: User | null,
  userList: User[],
  isAuthenticated: boolean,
  fetchUserList: () => void,
  handleUserLogin: (username: string, password: string) => void,
  handleUserRegister: (username: string, password: string, role: string, email?: string) => void,
  handleUserLogout: () => void,
  updateUserProfile: (updatedUser: User) => void,
  handleDeleteUser: (targetUserId: number) => void,
  updateUserRole: (targetUserId: number, newRole: UserRole) => void,
  logoutHandler: () => void,
  todolistRef: Map<string, TodoList[]> | undefined,
  messagesRef: Map<string, UIChatMessage[]> | undefined,
  loadingUserList: boolean,
  currentUserInstructions: string,
  handleUpdateGlobalUserMsg: (data: string) => void,
  apps: RuntimeApp[],
  mcpServers: IMCPServerConfig[],
  saveMcpServerConfig: (data: { userId?: number; action: 'add' | 'update' | 'remove'; server: IMCPServerConfig; serverId?: number }) => void,
  toggleMcpServer: (serverId: number) => void,
  mcpStdioAccess?: import('../../../shared/types').McpStdioAccessPayload,
  requestMcpStdioAccess?: (serverId: number, note?: string) => void,
  reviewMcpStdioAccess?: (requestId: number, action: 'approve' | 'deny') => void,
  externalMcpEnvGaps?: Array<{ id: string; label: string; envHint: string; detail: string }>,
  openThemesTrigger?: number,
  onAppsReordered?: (apps: RuntimeApp[]) => void,
  onFocusAppsWorkspace?: () => void,
  onLaunchApp?: (appId: string, appName: string) => void,
}>(), { visible: false })


const { mainTab } = useSettings()
const labWorkspace = useLabWorkspaceContext()

function applySettingsHostContextNavigation(): void {
  const view = labWorkspace?.hostContext.value[LAB_HOST_CTX_SETTINGS_VIEW]?.trim()
  if (!view) {
    return
  }
  if (isViewAllowed(view as SettingsViewId)) {
    mainTab.value = view
  }
}

const showSettingsLoginDialog = ref(false)
const settingsLoginForm = ref({ username: '', password: '' })

onMounted(() => {
  if (!props.isAuthenticated) {
    mainTab.value = 'system'
  }
  if (props.visible && !props.isAuthenticated) {
    showSettingsLoginDialog.value = true
  }
})

const currentPersonaName = computed({
  get: () => props.activePersonaTab,
  set: (newVal: string) => {
    props.onPersonaTabChange(newVal)
  }
})
const currentPersonaProperty = computed({
  get: () => props.activePersonaPropertyTab,
  set: (newVal: string) => {
    props.onPropertyTabChange(newVal)
  }
})
const dialogVisible = computed({
  get: () => props.visible,
  set: (newVal: boolean) => {
    props.onSettingsVisible(newVal)
  }
})
watch(() => props.isAuthenticated, (authed) => {
  if (!authed) {
    mainTab.value = 'system'
    if (dialogVisible.value) {
      showSettingsLoginDialog.value = true
    }
  } else {
    showSettingsLoginDialog.value = false
  }
})

watch(dialogVisible, (visible) => {
  if (visible && !props.isAuthenticated) {
    showSettingsLoginDialog.value = true
  }
  if (visible) {
    applySettingsHostContextNavigation()
  }
})

watch(
  () => labWorkspace?.hostContext.value[LAB_HOST_CTX_SETTINGS_VIEW],
  () => {
    if (dialogVisible.value) {
      applySettingsHostContextNavigation()
    }
  },
)

const canManageAuthProviders = computed(
  () => props.user?.role === 'owner' || props.user?.role === 'admin',
)

const showUserManagementTab = computed(() =>
  Boolean(props.user?.permissions?.global?.canManageUsers),
)

function isViewAllowed(id: SettingsViewId): boolean {
  if (SETTINGS_ADMIN_VIEWS.includes(id)) {
    if (!props.isAuthenticated) return false
    if (id === 'usermanagement' && !showUserManagementTab.value) return false
    if ((id === 'authproviders' || id === 'seeddata' || id === 'themes' || id === 'appsOrder' || id === 'catalogTags' || id === 'sidecarActivity' || id === 'approvalPolicies' || id === 'appBuilder') && !canManageAuthProviders.value) return false
    return true
  }
  if (id === 'approvals' || id === 'ledger' || id === 'ledgerAccounts') {
    if (!props.isAuthenticated) return false
    if (props.user?.role === 'viewer') return false
    return true
  }
  const item = findSettingsNavItem(id)
  if (!item) return false
  if (item.requiresDashboard && !props.isDashboardEnabled) return false
  return true
}

const currentView = computed((): SettingsViewId => {
  if (mainTab.value !== 'system') {
    return mainTab.value as SettingsViewId
  }
  return (props.activeTab || 'api') as SettingsViewId
})

const activeNavMeta = computed(() => findSettingsNavItem(currentView.value))

const visibleNavGroups = computed(() =>
  SETTINGS_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => isViewAllowed(item.id)),
  })).filter((group) => group.items.length > 0),
)

function selectView(id: SettingsViewId): void {
  if (!isViewAllowed(id)) return
  viewsEverOpened.value = { ...viewsEverOpened.value, [id]: true }
  if (SETTINGS_ADMIN_VIEWS.includes(id)) {
    mainTab.value = id
    return
  }
  mainTab.value = 'system'
  props.onTabChange(id)
}
const personasNavExpanded = ref(false)

watch(currentView, (id) => {
  if (id !== 'personas') {
    personasNavExpanded.value = false
  }
})

const personaNavEntries = computed(() => {
  const configs = Object.values(props.personaConfigs)
  return configs.sort((a, b) => {
    const ai = PERSONA_NAV_ORDER.indexOf(a.name)
    const bi = PERSONA_NAV_ORDER.indexOf(b.name)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.name.localeCompare(b.name)
  })
})

function onPersonasNavClick(): void {
  if (!isViewAllowed('personas')) return
  if (currentView.value === 'personas') {
    personasNavExpanded.value = !personasNavExpanded.value
    return
  }
  selectView('personas')
  personasNavExpanded.value = true
}

function selectPersonaFromNav(personaName: string): void {
  if (!isViewAllowed('personas')) return
  selectView('personas')
  props.onPersonaTabChange(personaName)
  personasNavExpanded.value = true
}

function ensureValidView(): void {
  if (!isViewAllowed(currentView.value)) {
    selectView('api')
  }
}

watch([canManageAuthProviders, showUserManagementTab, () => props.isDashboardEnabled, currentView], ensureValidView)

function handleSettingsLogin(): void {
  props.handleUserLogin(settingsLoginForm.value.username, settingsLoginForm.value.password)
  settingsLoginForm.value = { username: '', password: '' }
}

function handleSettingsLogout(): void {
  props.logoutHandler()
}

/** Lazy-mount panel bodies on first visit. */
const viewsEverOpened = ref<Record<string, boolean>>({ api: true })
watch(
  currentView,
  (id) => {
    viewsEverOpened.value = { ...viewsEverOpened.value, [id]: true }
  },
  { immediate: true },
)

watch(
  () => props.openThemesTrigger,
  (n) => {
    if (n && n > 0 && isViewAllowed('themes')) {
      selectView('themes')
    }
  },
)

function handleAppsReordered(apps: RuntimeApp[]): void {
  props.onAppsReordered?.(apps)
}
</script>
<template>
  <Dialog v-model:visible="dialogVisible" :pt="{
      mask: { class: 'settings-modal' },
      content: { class: 'flex! flex-col! flex-1! min-h-0! overflow-hidden!' },
      root: { class: 'flex! flex-col! max-h-[90vh]!' },
    }"
    :closable="props.isDashboardEnabled" modal class="lab-settings-dialog w-[1200px] h-[800px] max-h-[90vh]!"
    :breakouts="{ disabled: true }">
    <template #header>
      <div class="flex w-full items-center justify-between gap-4 pr-6">
        <h1 class="lab-settings-dialog__title m-0">
          <i class="fa-solid fa-user-gear lab-settings-dialog__title-icon" aria-hidden="true" />
          Settings
        </h1>
        <div class="flex shrink-0 gap-2">
          <Button
            v-if="!props.isAuthenticated"
            type="button"
            label="Login"
            icon="fa fa-sign-in-alt"
            severity="secondary"
            size="small"
            @click="showSettingsLoginDialog = true"
          />
          <Button
            v-else
            type="button"
            label="Logout"
            icon="fa fa-sign-out-alt"
            severity="secondary"
            size="small"
            @click="handleSettingsLogout"
          />
        </div>
      </div>
    </template>
    <div class="settings-container lab-settings-shell text-sm!">
      <nav class="lab-settings-nav" aria-label="Settings sections">
        <template v-for="group in visibleNavGroups" :key="group.label">
          <p class="lab-settings-nav__heading">{{ group.label }}</p>
          <ul class="lab-settings-nav__list">
            <li v-for="item in group.items" :key="item.id">
              <template v-if="item.id === 'personas'">
                <button
                  type="button"
                  class="lab-settings-nav__btn"
                  :class="{ 'lab-settings-nav__btn--active': currentView === 'personas' }"
                  @click="onPersonasNavClick"
                >
                  <i
                    class="fa-solid fa-chevron-right lab-settings-nav__chevron shrink-0"
                    :class="{ 'lab-settings-nav__chevron--expanded': personasNavExpanded }"
                    aria-hidden="true"
                  />
                  <i class="fa-solid shrink-0" :class="item.icon" aria-hidden="true" />
                  <span>{{ item.label }}</span>
                </button>
                <ul v-show="personasNavExpanded" class="lab-settings-nav__tree" aria-label="Personas">
                  <li v-for="persona in personaNavEntries" :key="persona.name">
                    <button
                      type="button"
                      class="lab-settings-nav__btn lab-settings-nav__btn--child"
                      :class="{
                        'lab-settings-nav__btn--active':
                          currentView === 'personas' && props.activePersonaTab === persona.name,
                      }"
                      @click="selectPersonaFromNav(persona.name)"
                    >
                      <i
                        class="fa shrink-0"
                        :class="personaUtils.getPersonaNavIcon(persona.name)"
                        aria-hidden="true"
                      />
                      <span>{{ personaUtils.formatPersonaName(persona.name) }}</span>
                    </button>
                  </li>
                </ul>
              </template>
              <button
                v-else
                type="button"
                class="lab-settings-nav__btn"
                :class="{ 'lab-settings-nav__btn--active': currentView === item.id }"
                @click="selectView(item.id)"
              >
                <i class="fa-solid shrink-0" :class="item.icon" aria-hidden="true" />
                <span>{{ item.label }}</span>
              </button>
            </li>
          </ul>
        </template>
      </nav>

      <div class="lab-settings-main">
        <header v-if="activeNavMeta" class="lab-settings-main__header">
          <h2 class="lab-settings-main__title">
            <template v-if="currentView === 'personas' && props.activePersonaTab">
              {{ personaUtils.formatPersonaName(props.activePersonaTab) }}
            </template>
            <template v-else>{{ activeNavMeta.label }}</template>
          </h2>
          <p v-if="activeNavMeta.description" class="lab-settings-main__desc">
            {{ activeNavMeta.description }}
          </p>
        </header>

        <div class="lab-settings-main__body">
          <ApiManagement
            v-if="currentView === 'api' && viewsEverOpened.api"
            :llm-provider-config="props.llmProviderConfig"
            :providers="props.providers"
            :user="props.user"
            :available-chat-models="props.availableChatModels"
            :available-embed-models="props.availableEmbedModels"
            :test-l-l-m-provider-connection="(config) => props.handleLLMProviderTest(config)"
            :request-l-l-m-model-list="(config) => props.handleLLMProviderFetchModels(config)"
            :save-l-l-m-provider-configuration="(config, userId) => props.handleLLMProviderSave(config, userId)"
          />

          <PersonaManagement
            v-else-if="currentView === 'personas' && viewsEverOpened.personas"
            :persona-configs="props.personaConfigs"
            :current-persona-name="currentPersonaName"
            :current-persona-property="currentPersonaProperty"
            :available-tools="props.availableTools"
            :commands-list="props.commands"
            :handle-persona-save="props.onPersonaSave"
          />

          <CommandManagement
            v-else-if="currentView === 'command' && viewsEverOpened.command"
            :commands="props.commands"
            :persona-configs="props.personaConfigs"
            :manage-commands-request-handler="props.manageCommandsRequestHandler"
          />

          <SystemMessageManagement
            v-else-if="currentView === 'sysMsg' && viewsEverOpened.sysMsg"
            :global-sys-msg="props.globalSysMsg"
            :current-system-instructions="props.currentSystemInstructions"
            :preview-system-instruction-request="props.previewSystemInstructionRequest"
            :handle-global-sys-msg-change="props.onGlobalSysMsgChange"
            :user="user"
            :current-user-instructions="props.currentUserInstructions"
            :handle-update-global-user-msg="props.handleUpdateGlobalUserMsg"
          />

          <SessionManagement
            v-else-if="currentView === 'sessions' && viewsEverOpened.sessions"
            :sessions="props.sessions"
            :selected-sessions-val="props.selectedSessions"
            :get-persona-badge-color="getPersonaBadgeColor"
            :get-persona-badge-icon="getPersonaBadgeIcon"
            :handle-clear-all-sessions="props.onClearAllSessions"
            :handle-delete-sessions="props.onDeleteSessions"
            :handle-toggle-session-selection="props.onToggleSessionSelection"
            :messages-ref="props.messagesRef"
            :todolist-ref="props.todolistRef"
          />

          <LabGameSidecarPreferencesSettings
            v-else-if="currentView === 'gameSidecar' && viewsEverOpened.gameSidecar"
          />

          <ContextManagement
            v-else-if="currentView === 'context' && viewsEverOpened.context"
            :context-settings="props.contextSettings"
            :manage-context-settings-request-handler="props.manageContextSettingsRequestHandler"
          />

          <MCPServerManagement
            v-else-if="currentView === 'mcpServers' && viewsEverOpened.mcpServers"
            :mcp-servers="props.mcpServers"
            :user="props.user || { userId: 0 }"
            :handle-mcp-server-save="props.saveMcpServerConfig"
            :toggle-mcp-server="props.toggleMcpServer"
            :stdio-access="props.mcpStdioAccess"
            :request-stdio-access="props.requestMcpStdioAccess"
            :review-stdio-access="props.reviewMcpStdioAccess"
          />

          <UserManagement
            v-else-if="currentView === 'usermanagement' && viewsEverOpened.usermanagement"
            :user="user"
            :user-list="userList"
            :is-authenticated="isAuthenticated"
            :fetch-user-list="fetchUserList"
            :handle-user-login="handleUserLogin"
            :handle-user-register="handleUserRegister"
            :handle-user-logout="handleUserLogout"
            :update-user-profile="updateUserProfile"
            :handle-delete-user="handleDeleteUser"
            :update-user-role="updateUserRole"
            :logout-handler="logoutHandler"
            :loading-user-list="props.loadingUserList"
            :apps="props.apps"
          />

          <LabApprovalsInbox
            v-else-if="currentView === 'approvals' && viewsEverOpened.approvals"
            :on-focus-apps-workspace="() => props.onFocusAppsWorkspace?.()"
            :on-launch-app="(appId, appName) => props.onLaunchApp?.(appId, appName)"
            :on-close-host="() => props.onSettingsVisible(false)"
            :crm-app-display-name="props.apps.find((a) => a.id === 'app-lab-crm')?.name"
          />

          <LabApprovalPoliciesManagement
            v-else-if="currentView === 'approvalPolicies' && viewsEverOpened.approvalPolicies"
          />

          <LabLedgerJournal
            v-else-if="currentView === 'ledger' && viewsEverOpened.ledger"
          />

          <LabLedgerAccountsAdmin
            v-else-if="currentView === 'ledgerAccounts' && viewsEverOpened.ledgerAccounts"
          />

          <LabAppBuilderSettings
            v-else-if="currentView === 'appBuilder' && viewsEverOpened.appBuilder"
            :on-close-settings="() => props.onSettingsVisible(false)"
            :on-focus-apps-workspace="() => props.onFocusAppsWorkspace?.()"
          />

          <AppCatalogTagsManagement
            v-else-if="currentView === 'catalogTags' && viewsEverOpened.catalogTags"
          />

          <LabSidecarActivitySettingsManagement
            v-else-if="currentView === 'sidecarActivity' && viewsEverOpened.sidecarActivity"
          />

          <AppsManagement
            v-else-if="currentView === 'appsOrder' && viewsEverOpened.appsOrder"
            :apps="props.apps"
            @apps-reordered="handleAppsReordered"
          />

          <AuthProvidersManagement
            v-else-if="currentView === 'authproviders' && viewsEverOpened.authproviders"
            :user="user"
          />

          <AppSeedDataManagement
            v-else-if="currentView === 'seeddata' && viewsEverOpened.seeddata"
            :user="user"
          />

          <ThemeManagement
            v-else-if="currentView === 'themes' && viewsEverOpened.themes"
            :user="user"
          />
        </div>
      </div>
    </div>
    <LabLoginDialog
      v-if="showSettingsLoginDialog"
      v-model:visible="showSettingsLoginDialog"
      :username="settingsLoginForm.username"
      :password="settingsLoginForm.password"
      :closable="props.isAuthenticated"
      @update:username="(v) => (settingsLoginForm.username = v)"
      @update:password="(v) => (settingsLoginForm.password = v)"
      @login="handleSettingsLogin"
      @cancel="showSettingsLoginDialog = false"
    />
  </Dialog>
  <template ref="providerOptions"></template>
</template>
