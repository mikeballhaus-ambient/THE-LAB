import { computed, nextTick, onMounted, ref, type Ref, watch } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { usePlatformAppServers } from '@/shared/composables/usePlatformAppServers';
import { useLabWorkspaceContext } from '@/shared/composables/useLabWorkspaceContext';
import {
  LAB_HOST_CTX_CRM_OPEN_ENTITY_KEY,
  LAB_HOST_CTX_CRM_OPEN_READ_ONLY,
  LAB_HOST_CTX_CRM_OPEN_RECORD_ID,
} from '@/shared/lab-integrations/lab-host-context-keys';
import { FORMS_BUILDER_APP_ID } from '@/shared/config/forms-builder-url';
import { TASK_LIST_APP_ID } from '@/shared/config/task-list-url';
import { HELP_DESK_APP_ID } from '@/shared/config/help-desk-url';
import { CHART_BUILDER_APP_ID } from '@/shared/config/chart-builder-url';
import { CRM_TASKS_ENTITY_KEY } from '../../shared/config/task-form-keys';
import { CRM_TICKETS_ENTITY_KEY } from '../../shared/config/ticket-form-keys';
import { useCrmApi } from './useCrmApi';
import type { EntityDefinition, EntityFormBinding } from '../../shared/types/entity.types';
import type CrmSettingsDialog from '../components/CrmSettingsDialog.vue';
import { useCrmIntegrations } from './useCrmIntegrations';

export function useCrmAppShell(serverUrlProp: Ref<string | undefined>) {
  const { generateUniqueId } = useUniqueElementId();

  const serverUrl = computed(() => serverUrlProp.value?.replace(/\/$/, '') ?? '');

  const {
    urlsByAppId: peerAppUrls,
    loading: peerUrlsLoading,
    error: peerUrlsError,
    refresh: refreshPeerUrls,
  } = usePlatformAppServers({
    ids: [FORMS_BUILDER_APP_ID, TASK_LIST_APP_ID, HELP_DESK_APP_ID, CHART_BUILDER_APP_ID],
  });

  const formsBuilderUrl = computed(() => peerAppUrls.value[FORMS_BUILDER_APP_ID] ?? '');
  const taskListServerUrl = computed(() => peerAppUrls.value[TASK_LIST_APP_ID] ?? '');
  const helpDeskServerUrl = computed(() => peerAppUrls.value[HELP_DESK_APP_ID] ?? '');
  const chartBuilderServerUrl = computed(() => peerAppUrls.value[CHART_BUILDER_APP_ID] ?? '');

  const definitions = ref<EntityDefinition[]>([]);
  const bindings = ref<EntityFormBinding[]>([]);
  const crmTaskBindings = computed(() =>
    bindings.value.filter((b) => b.entityKey === CRM_TASKS_ENTITY_KEY),
  );
  const crmTicketBindings = computed(() =>
    bindings.value.filter((b) => b.entityKey === CRM_TICKETS_ENTITY_KEY),
  );

  const activeView = ref<'dashboard' | 'tasks' | string>('dashboard');
  const showSettings = ref(false);
  const settingsDialogRef = ref<InstanceType<typeof CrmSettingsDialog> | null>(null);

  const api = computed(() => (serverUrl.value ? useCrmApi(serverUrl.value) : null));

  const entityNavItems = computed(() =>
    [...definitions.value]
      .filter(
        (d) => d.entityKey !== CRM_TASKS_ENTITY_KEY && d.entityKey !== CRM_TICKETS_ENTITY_KEY,
      )
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
  );

  const activeEntityKey = computed(() =>
    activeView.value === 'dashboard' ? null : activeView.value,
  );

  const pendingOpenRecordId = ref<number | null>(null);
  /** True when the record view was opened from Approvals (View CRM record). Cleared when the view dialog closes. */
  const pendingOpenRecordReadOnly = ref(false);
  const labWorkspace = useLabWorkspaceContext();

  watch(
    () => labWorkspace?.hostContext.value,
    (ctx) => {
      if (!ctx) {
        return;
      }
      const entityKey = ctx[LAB_HOST_CTX_CRM_OPEN_ENTITY_KEY]?.trim();
      const recordRaw = ctx[LAB_HOST_CTX_CRM_OPEN_RECORD_ID]?.trim();
      if (!entityKey || !recordRaw) {
        return;
      }
      const recordId = Number(recordRaw);
      if (Number.isNaN(recordId)) {
        return;
      }
      const readOnlyRaw = ctx[LAB_HOST_CTX_CRM_OPEN_READ_ONLY]?.trim();
      pendingOpenRecordReadOnly.value = readOnlyRaw === '1' || readOnlyRaw?.toLowerCase() === 'true';
      selectEntity(entityKey);
      pendingOpenRecordId.value = recordId;
      labWorkspace?.clearHostContext();
    },
    { deep: true },
  );

  function clearPendingOpenReadOnly(): void {
    pendingOpenRecordReadOnly.value = false;
  }

  const dashboardRef = ref<{ refresh: () => Promise<void> } | null>(null);

  const integrations = useCrmIntegrations({
    serverUrl,
    taskListServerUrl,
    helpDeskServerUrl,
    onRecordsChanged: async () => {
      await loadMeta();
    },
  });

  const integrationInlineRegionIds = computed(() =>
    activeView.value === 'dashboard' ? ['reports.grid'] : [],
  );

  watch(
    () => [activeView.value, taskListServerUrl.value] as const,
    ([view, taskUrl]) => {
      if (view === 'dashboard' && taskUrl) {
        void integrations.ensureDefaultTaskListId();
      }
      if (view === 'dashboard') {
        void integrations.integrationSurfaceRef.value?.refresh();
      }
    },
    { immediate: true },
  );

  function selectDashboard(): void {
    activeView.value = 'dashboard';
  }

  function selectTasks(): void {
    activeView.value = 'tasks';
  }

  function selectEntity(entityKey: string): void {
    activeView.value = entityKey;
  }

  function openSettings(): void {
    showSettings.value = true;
  }

  async function openAddNewEntity(): Promise<void> {
    showSettings.value = true;
    await nextTick();
    await nextTick();
    await settingsDialogRef.value?.openNewEntity();
  }

  async function loadMeta(): Promise<void> {
    if (!api.value) {
      return;
    }
    definitions.value = await api.value.fetchDefinitions();
    const bindingLoad = await api.value.fetchFormBindings();
    bindings.value = bindingLoad.bindings;

    if (activeView.value !== 'dashboard') {
      const stillExists = definitions.value.some((d) => d.entityKey === activeView.value);
      if (!stillExists) {
        activeView.value = 'dashboard';
      }
    }

    await dashboardRef.value?.refresh?.();
  }

  onMounted(() => {
    void loadMeta();
  });

  return {
    generateUniqueId,
    serverUrl,
    peerUrlsLoading,
    peerUrlsError,
    refreshPeerUrls,
    formsBuilderUrl,
    taskListServerUrl,
    helpDeskServerUrl,
    chartBuilderServerUrl,
    definitions,
    bindings,
    crmTaskBindings,
    crmTicketBindings,
    activeView,
    showSettings,
    settingsDialogRef,
    entityNavItems,
    activeEntityKey,
    pendingOpenRecordId,
    pendingOpenRecordReadOnly,
    clearPendingOpenReadOnly,
    dashboardRef,
    selectDashboard,
    selectTasks,
    selectEntity,
    openSettings,
    openAddNewEntity,
    loadMeta,
    ...integrations,
    integrationInlineRegionIds,
  };
}
