<script setup lang="ts">
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import Badge from 'primevue/badge';
import { ChatSessionRecord, TodoList, UIChatMessage } from '../../../shared/types';
import { useSessionManagement } from '../../../shared/composables/components/useSessionManagement';
import { personaUtils } from '@/shared/utils/persona-utils';

const props = withDefaults(defineProps<{
  sessions: ChatSessionRecord[];
  todolistRef: Map<string, TodoList[]> | undefined;
  messagesRef: Map<string, UIChatMessage[]> | undefined;
  selectedSessionsVal: string[];
  getPersonaBadgeColor?: (personaName?: string) => string;
  getPersonaBadgeIcon?: (personaName?: string) => string;
  handleToggleSessionSelection: (sessionId: string) => void,
  handleDeleteSessions: (sessionIds: string[]) => Promise<void>,
  handleClearAllSessions: () => Promise<void>,
}>(), {
  getPersonaBadgeColor: () => 'lab-persona-badge lab-persona-badge--chat',
  getPersonaBadgeIcon: () => 'fa-user'
});

const { exportSessionData, includeMessages, includeTodoLists } = useSessionManagement(() => props.sessions,
  () => props.selectedSessionsVal,
  () => props.todolistRef,
  () => props.messagesRef)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div>
    <Badge
      severity="secondary"
      size="large"
      class="flex items-center gap-2 bg-lab-general-bg! text-lab-general-text!"
    >
      <i class="fa fa-layer-group"></i>
      <span>Active Sessions</span>
    </Badge>
</div>
    <div class="flex gap-4">

      <div class="flex flex-col gap-2 mt-2 min-w-[250px] h-[400px]! max-h-[400px]! overflow-auto lab-settings-inner-panel p-3">
        <div
          v-for="session in props.sessions"
          :key="session.sessionId"
          class="transition-all duration-200 ease-in-out hover:-translate-y-px"
        >
          <div class="flex items-center gap-2">
            <Checkbox class="text-sm" :id="session.sessionId"
              :model-value="selectedSessionsVal.includes(session.sessionId)" :input-value="session.sessionId"
              :disabled="sessions.length <= 1" :binary="true"
              @change="props.handleToggleSessionSelection(session.sessionId)" />
            <label class="flex items-center gap-2 text-sm text-lab-general-text">
              {{ session.title }}
              <div
                v-if="session.persona"
                :class="getPersonaBadgeColor(session.persona)"
              >
                <i :class="['fa', getPersonaBadgeIcon(session.persona)]"></i>
                <span>{{ personaUtils.formatPersonaName(session.persona) }}</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div>
        <div class="mt-3 flex items-center gap-2">
          <Button size="small" label="Delete Selected" :disabled="selectedSessionsVal.length === 0"
            @click="props.handleDeleteSessions(selectedSessionsVal)" class="p-w-250" />
          <Button size="small" v-if="sessions.length > 1" label="Clear All" @click="props.handleClearAllSessions"
            class="p-w-250 p-mr-2" />
        </div>
        <div class="mt-3 flex flex-col gap-2 rounded border border-lab-general-border p-2">
          <div><Button size="small" label="Export" @click="exportSessionData" class="p-w-250"
              :disabled="selectedSessionsVal.length === 0" />
          </div>
          <div class="flex gap-2">
            <Checkbox class="text-sm" id="include-messages" :model-value="includeMessages"
              :input-value="includeMessages" :disabled="selectedSessionsVal.length === 0" :binary="true" />
            <label class="flex items-center gap-2 text-sm text-lab-general-text">Include messages </label>
          </div>
          <div class="flex gap-2">
            <Checkbox class="text-sm" id="include-todolists" :model-value="includeTodoLists"
              :input-value="includeTodoLists" :disabled="selectedSessionsVal.length === 0" :binary="true" />
            <label class="flex items-center gap-2 text-sm text-lab-general-text">Include todo lists </label>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
