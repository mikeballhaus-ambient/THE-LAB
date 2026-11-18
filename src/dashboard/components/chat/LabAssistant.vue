<script setup lang="ts">
import SessionTabs from './SessionTabs.vue'
import MessagesView from './MessagesView.vue'
import MessageInput from './MessageInput.vue'

import { useToast } from 'primevue/usetoast';
import { ChatMessage, ChatSessionRecord, MCPToolCall, MCPToolResponse, Persona, ICommand, IContextSettings, AgentInteractionStatus, UIChatMessage, FollowupParams, ChatPersona } from '../../../shared/types';

const props = defineProps<{
  sessionsRef: ChatSessionRecord[]
  activeSessionRef: ChatSessionRecord | null
  activeMessages: ChatMessage[]
  personaConfigs: Record<string, Persona>
  chatReady: boolean
  agentInteractionStatus: Map<string, AgentInteractionStatus>
  inputMessage: string
  repoFiles: string[]
  commands: ICommand[]
  contextSettings: IContextSettings | undefined,
  deleteCurrentSession: (sessionId: string) => Promise<boolean>
  createNewSession: () => Promise<string | null>
  updateSession: (sessionId: string, updates: Partial<ChatSessionRecord>) => Promise<void>
  toast: ReturnType<typeof useToast>,
  getPersonaBadgeColor: (personaName?: string) => string,
  getPersonaBadgeIcon: (personaName?: string) => string,
  focusAssistant: () => void,
  focusLab: () => void,
  getMcpToolName: (toolCall: MCPToolCall) => string,
  formatMcpToolResult: (toolCall: MCPToolCall, toolResult: MCPToolResponse) => string
  stopRequest: () => Promise<void>
  setStreamingEnabled: (streamingEnabled: boolean) => Promise<void>,
  getStreamingEnabled: () => Promise<boolean>,
  handleFollowupSubmitted: (data: FollowupParams, messageRef: UIChatMessage, persona: ChatPersona) => Promise<void>,
  focusedAssistant: boolean | undefined,
}>()
const emit = defineEmits<{
  (e: 'switch-chat-session-tab', sessionId: string): void
  (e: 'show-settings-modal'): void
  (e: 'send-message'): void
  (e: 'summarize-context'): void
  (e: 'collapse-messages'): void
  (e: 'update-input-message', value: string): void
}>()

const switchTab = (id: string) => emit('switch-chat-session-tab', id)
const doMessageUpdate = (val: string) => emit('update-input-message', val)
const doShowSettings = () => emit('show-settings-modal')
const doSendMessage = () => emit('send-message')
const doSummarize = () => emit('summarize-context')

</script>

<template>
  <div class="fixed bottom-0 left-0 right-0">
    <MessagesView :get-mcp-tool-name="getMcpToolName" :format-mcp-tool-result="formatMcpToolResult"
      :activeSessionRef="activeSessionRef" :update-session="updateSession" :focus-assistant="focusAssistant"
      :focus-lab="focusLab" :repoFiles="repoFiles" :commands="commands" :activeMessages="activeMessages"
      :agent-interaction-status="agentInteractionStatus" :handle-followup-submitted="handleFollowupSubmitted"
      :focused-assistant="focusedAssistant" @send-message="doSendMessage"
      @update-input-message="doMessageUpdate" />
    <SessionTabs :sessionsRef="sessionsRef" :toast="toast" :deleteCurrentSession="deleteCurrentSession"
      :createNewSession="createNewSession" :activeSessionRef="activeSessionRef"
      :agent-interaction-status="agentInteractionStatus" :chatReady="chatReady" @switch-chat-session-tab="switchTab"
      :get-persona-badge-color="getPersonaBadgeColor" :get-persona-badge-icon="getPersonaBadgeIcon"
      :focus-assistant="props.focusAssistant" :focus-lab="props.focusLab" :focused-assistant="focusedAssistant" />
    <MessageInput :activeSessionRef="activeSessionRef" :toast="toast" :updateSession="updateSession"
      :personaConfigs="personaConfigs" :chatReady="chatReady" :agent-interaction-status="agentInteractionStatus"
      :context-settings="contextSettings" :inputMessage="inputMessage" :repoFiles="repoFiles" :commands="commands"
      :contextUsed="activeSessionRef?.contextUsed ?? 0" @show-settings-modal="doShowSettings"
      @send-message="doSendMessage" @summarize-context="doSummarize" @update-input-message="doMessageUpdate"
      :stop-request="stopRequest" :setStreamingEnabled="setStreamingEnabled" :getStreamingEnabled="getStreamingEnabled"
      :focus-assistant="props.focusAssistant" :focus-lab="props.focusLab" :focused-assistant="focusedAssistant" />
  </div>
</template>
