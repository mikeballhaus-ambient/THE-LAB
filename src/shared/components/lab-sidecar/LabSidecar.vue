<script setup lang="ts">
import { computed, watch } from 'vue';
import { labSidecarInsetPx } from '@/shared/composables/lab-sidecar/lab-sidecar-shell-state';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { useLabSidecarPanel } from '@/shared/composables/useLabSidecarPanel';
import { useLabWorkspaceContext } from '@/shared/composables/useLabWorkspaceContext';
import { formatLabSidecarScopeSubtitle } from '@/shared/composables/lab-sidecar/format-lab-sidecar-scope-subtitle';
import type {
  AgentInteractionStatus,
  ChatSessionRecord,
  MCPToolCall,
  MCPToolResponse,
  RuntimeApp,
  TodoList,
  UIChatMessage,
} from '@/shared/types';
import LabSidecarChatPanel from './LabSidecarChatPanel.vue';
import LabSidecarSessionTabs from './LabSidecarSessionTabs.vue';
import LabSidecarSessionTodos from './LabSidecarSessionTodos.vue';
import LabSidecarSessionFiles from './LabSidecarSessionFiles.vue';
import {
  LAB_SIDECAR_HOST_CTX_MATCH_ID,
} from '@/shared/constants/lab-game-assistant-opponent';
import { rawLabGameSidecarSessionTitle } from '@/shared/composables/lab-sidecar/lab-game-sidecar-session-resolve';
import {
  ensureLabSidecarGameSessionWhenEngaging,
  readLabSidecarGameEngagementFromHost,
} from '@/shared/composables/lab-sidecar/useLabSidecarGameSession';
import {
  LAB_SHELL_COLLAPSE_SIDECAR_ARIA,
  LAB_SHELL_OPEN_LABORATORY_ARIA,
  LAB_SHELL_OPEN_SIDECAR_ARIA,
  LAB_SHELL_SIDECAR_LAB_ASSISTANT_LABEL,
  LAB_SHELL_SIDECAR_PANEL_ARIA,
} from '@/shared/constants/lab-shell-naming';

const props = defineProps<{
  apps: RuntimeApp[];
  focusAssistant: () => Promise<void>;
  sessionsRef: ChatSessionRecord[];
  activeSessionRef: ChatSessionRecord | null;
  activeMessages: UIChatMessage[];
  chatReady: boolean;
  agentInteractionStatus: Map<string, AgentInteractionStatus>;
  sidecarInputMessage: string;
  stopRequest: () => Promise<void>;
  getPersonaBadgeColor: (personaName?: string) => string;
  getPersonaBadgeIcon: (personaName?: string) => string;
  getMcpToolName: (toolCall: MCPToolCall) => string;
  formatMcpToolResult: (toolCall: MCPToolCall, toolResult: MCPToolResponse) => string;
  activeTodoLists: TodoList[] | undefined;
  handleFileDiffs: (
    params: import('zod').ZodSafeParseResult<{
      path: string;
      diffs: {
        start_line: number;
        updated: string;
        original?: string | undefined;
        is_additive?: boolean | undefined;
      }[] | undefined;
    }>,
    showPath: boolean,
    altPath?: string,
  ) => import('@/shared/types').FileChanges;
  handleNewFileDiff: (
    paramsResult: import('zod').ZodSafeParseResult<{
      path: string;
      content: string;
      overwrite: boolean;
      ensureDir: boolean;
    }>,
    showPath: boolean,
    altPath?: string,
  ) => import('@/shared/types').FileChanges;
  handleRemoveFile: (
    params: import('zod').ZodSafeParseResult<{
      path: string;
      recursive: boolean;
      force: boolean;
    }>,
    showPath: boolean,
    altPath?: string,
  ) => import('@/shared/types').FileChanges;
}>();

const emit = defineEmits<{
  (e: 'send-sidecar-message'): void;
  (e: 'update-sidecar-input', value: string): void;
  (e: 'switch-chat-session-tab', sessionId: string): void;
}>();

const { generateUniqueId } = useUniqueElementId();
const { expanded, panelWidthPx, expand, collapse } = useLabSidecarPanel();
const workspace = useLabWorkspaceContext();

const scopeSubtitle = computed(() => {
  const ctx = workspace?.viewContext.value;
  if (!ctx) {
    return 'THE-LAB';
  }
  return formatLabSidecarScopeSubtitle(ctx, props.apps);
});

const panelStyle = computed(() => ({
  '--lab-sidecar-panel-width': `${panelWidthPx.value}px`,
}));

watch(
  labSidecarInsetPx,
  (px) => {
    document.documentElement.style.setProperty('--lab-sidecar-inset', `${px}px`);
  },
  { immediate: true },
);

function maybeStartGameSidecarSession(): void {
  if (!expanded.value || !workspace) {
    return;
  }
  const engagement = readLabSidecarGameEngagementFromHost(workspace.hostContext.value);
  if (!engagement) {
    return;
  }
  void ensureLabSidecarGameSessionWhenEngaging({
    sessionTitle: rawLabGameSidecarSessionTitle(engagement.gameId),
    gameId: engagement.gameId,
    matchId: engagement.matchId,
    difficulty: engagement.difficulty,
  });
}

watch(expanded, () => {
  maybeStartGameSidecarSession();
});

watch(
  () => workspace?.hostContext.value[LAB_SIDECAR_HOST_CTX_MATCH_ID],
  () => {
    maybeStartGameSidecarSession();
  },
);
</script>

<template>
  <aside
    class="lab-sidecar"
    :class="expanded ? 'lab-sidecar--expanded' : 'lab-sidecar--collapsed'"
    :style="panelStyle"
    :aria-label="LAB_SHELL_SIDECAR_PANEL_ARIA"
  >
    <button
      v-if="!expanded"
      type="button"
      class="lab-sidecar-rail lab-sidecar-rail--header-chip"
      :id="generateUniqueId('lab-sidecar-rail')"
      :aria-label="LAB_SHELL_OPEN_SIDECAR_ARIA"
      aria-expanded="false"
      @click="expand"
    >
      <div class="lab-sidecar-panel__icon" aria-hidden="true">
        <i class="fa-solid fa-comment-dots" />
      </div>
      <span class="lab-sidecar-panel__title lab-sidecar-rail__title">
        {{ LAB_SHELL_SIDECAR_LAB_ASSISTANT_LABEL }}
      </span>
    </button>

    <div
      v-else
      class="lab-sidecar-panel"
      role="complementary"
      :aria-expanded="true"
    >
      <header class="lab-sidecar-panel__header">
        <div class="lab-sidecar-panel__lead">
          <button
            type="button"
            class="lab-sidecar-panel__icon-btn lab-sidecar-panel__icon-btn--collapse"
            :id="generateUniqueId('lab-sidecar-collapse')"
            :aria-label="LAB_SHELL_COLLAPSE_SIDECAR_ARIA"
            @click="collapse"
          >
            <i class="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>
          <div class="lab-sidecar-panel__identity">
            <div class="lab-sidecar-panel__icon" aria-hidden="true">
              <i class="fa-solid fa-comment-dots" />
            </div>
            <div class="lab-sidecar-panel__titles">
              <h2
                class="lab-sidecar-panel__title"
                :id="generateUniqueId('lab-sidecar-title')"
              >
                {{ LAB_SHELL_SIDECAR_LAB_ASSISTANT_LABEL }}
              </h2>
              <p class="lab-sidecar-panel__subtitle">{{ scopeSubtitle }}</p>
            </div>
          </div>
        </div>
        <div class="lab-sidecar-panel__actions">
          <button
            type="button"
            class="lab-sidecar-panel__icon-btn lab-sidecar-panel__icon-btn--laboratory"
            :id="generateUniqueId('lab-sidecar-open-full')"
            :aria-label="LAB_SHELL_OPEN_LABORATORY_ARIA"
            :title="LAB_SHELL_OPEN_LABORATORY_ARIA"
            @click="() => void props.focusAssistant()"
          >
            <i
              class="fa-solid fa-flask lab-sidecar-panel__laboratory-icon rotate-4"
              aria-hidden="true"
            />
          </button>
        </div>
      </header>
      <div class="lab-sidecar-panel__body lab-sidecar-panel__body--chat">
        <LabSidecarSessionTabs
          :sessions-ref="sessionsRef"
          :active-session-ref="activeSessionRef"
          :agent-interaction-status="agentInteractionStatus"
          :chat-ready="chatReady"
          :get-persona-badge-color="getPersonaBadgeColor"
          :get-persona-badge-icon="getPersonaBadgeIcon"
          @switch-chat-session-tab="(id) => emit('switch-chat-session-tab', id)"
        />
        <div class="lab-sidecar-panel__chat-stack">
          <LabSidecarSessionTodos
            :active-todo-lists="activeTodoLists"
            :chat-ready="chatReady"
          />
          <LabSidecarSessionFiles
            :chat-ready="chatReady"
            :active-messages="activeMessages"
            :handle-file-diffs="handleFileDiffs"
            :handle-new-file-diff="handleNewFileDiff"
            :handle-remove-file="handleRemoveFile"
          />
          <LabSidecarChatPanel
            :active-session-ref="activeSessionRef"
            :active-messages="activeMessages"
            :chat-ready="chatReady"
            :agent-interaction-status="agentInteractionStatus"
            :input-message="sidecarInputMessage"
            :stop-request="stopRequest"
            :get-mcp-tool-name="getMcpToolName"
            :format-mcp-tool-result="formatMcpToolResult"
            @send-message="emit('send-sidecar-message')"
            @update-input-message="(v) => emit('update-sidecar-input', v)"
          />
        </div>
      </div>
    </div>
  </aside>
</template>
