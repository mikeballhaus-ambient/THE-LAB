<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue';
import ProgressBar from 'primevue/progressbar';
import Select from 'primevue/select';
import Button from 'primevue/button'
import Editor from 'primevue/editor'
import FileUpload from 'primevue/fileupload'
import Listbox from "primevue/listbox";
import Image from 'primevue/image';
import ToggleSwitch from 'primevue/toggleswitch';
import { useToast } from 'primevue/usetoast';
import { ChatSessionRecord, Persona, ICommand, IContextSettings, AgentInteractionStatus } from '../../../shared/types';
import { useMessagesInput, EditorInstance } from '../../../shared/composables/components/useMessageInput';
import { useInputFileHandler } from '../../../shared/composables/utils/useInputFileHandler';
import LabPersonaBadgeLabel from '@/shared/components/LabPersonaBadgeLabel.vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { chatComposerSelectPt, withFormControlRootId } from '@/shared/forms/form-control-pt';

const { generateUniqueId } = useUniqueElementId();
const streamingToggleInputId = generateUniqueId('lab-streaming-toggle');
const personaSelectId = generateUniqueId('lab-chat-persona-select');
const personaSelectPt = withFormControlRootId(chatComposerSelectPt, personaSelectId);

const props = defineProps<{
  activeSessionRef: ChatSessionRecord | null
  toast: ReturnType<typeof useToast>
  updateSession: (sessionId: string, updates: Partial<ChatSessionRecord>) => Promise<void>
  personaConfigs: Record<string, Persona>
  chatReady: boolean
  agentInteractionStatus: Map<string, AgentInteractionStatus>
  inputMessage: string
  contextUsed: number
  repoFiles: string[],
  commands: ICommand[],
  contextSettings: IContextSettings | undefined
  stopRequest: () => Promise<void>
  setStreamingEnabled: (streamingEnabled: boolean) => Promise<void>,
  getStreamingEnabled: () => Promise<boolean>,
  focusAssistant: () => void,
  focusLab: () => void,
  focusedAssistant: boolean | undefined
}>()

const emit = defineEmits<{
  (e: 'show-settings-modal'): void;
  (e: 'send-message'): void;
  (e: 'summarize-context'): void;
  (e: 'update-input-message', value: string): void;
}>();

const editorRef = ref<EditorInstance | null>(null);
const fileUploadRef = ref<InstanceType<typeof FileUpload> | null>(null);

const sendMessage = async () => {
  const userMsg = getMessage()
  emit('update-input-message', userMsg);
  await nextTick(() => {
    emit('send-message');
  })
};
const { getMessage, mentionState, dropdownStyle, handleContextCommandSelection, handleTextUpdate, modules, placeHolderMsg, disabledState, progressColor, onPersonaChange, insertMultipleMentions, toggleVoiceInput, isListening, isActiveAwaitingResponse, isStreaming } = useMessagesInput(editorRef, sendMessage, () => props.chatReady, () => props.agentInteractionStatus, () => props.contextUsed, () => props.contextSettings, () => props.activeSessionRef, props.updateSession, () => props.toast, props.setStreamingEnabled, props.getStreamingEnabled)

async function onStreamingToggleChange(enabled: boolean): Promise<void> {
  await props.setStreamingEnabled(enabled);
}
const { isDragging, uploadedFiles, loadUploadedFiles, onDrop, onFileSelect, removeFile, onPaste } = useInputFileHandler(fileUploadRef, () => props.activeSessionRef, props.updateSession)

onMounted(async () => {
  isStreaming.value = await props.getStreamingEnabled()
})

const toggleSettingsModal = () => emit('show-settings-modal')
const summarizeContext = () => emit('summarize-context')

watch(
  () => props.activeSessionRef, async (newSession) => {
    if (newSession) await loadUploadedFiles()
  },
  { deep: true } // Deep ensures nested property changes are caught
);

</script>

<template>
  <!-- BEGIN MESSAGE INPUT COMPONENT -->
  <div v-if="activeSessionRef" @paste="onPaste"
    class="fixed bottom-0 left-0 right-0 focus-assistant-toggle message-input-container lab-chat-composer shadow-lg h-[120px] flex items-center message-input-container"
    :class="{
      'transition-all duration-500 hidden': !focusedAssistant,
      'transition-all duration-500 blur-[0px] opacity-100': focusedAssistant
    }">

    <div class="flex w-full h-full items-center px-1 py-1 gap-5">

      <!-- Editor version for styled mentions -->
      <Editor ref="editorRef" :disabled="disabledState" :modules="modules"
        @update:model-value="() => handleTextUpdate(props.repoFiles, props.commands)" :rows="3"
        :placeholder="placeHolderMsg" pt:root="h-full! w-full!"
        pt:content="h-full! w-full! border-0! [&_.ql-editor]:rounded-lg! [&_.ql-editor]:border!">
      </Editor>

      <!-- Persona Selector -->
      <div class="flex flex-col justify-between gap-2 h-full lab-chat-composer-panel px-4 py-2 rounded-lg">
        <div class="flex flex-col gap-1 text-xs">
          <div class="flex">
            <div class="px-2 py-1 rounded lab-chat-composer-chip">Agent Persona</div>
          </div>
          <Select
            :model-value="activeSessionRef.persona"
            :options="Object.keys(personaConfigs)"
            @update:model-value="onPersonaChange"
            :disabled="disabledState"
            :pt="personaSelectPt"
          >
            <template #option="{ option }">
              <LabPersonaBadgeLabel :persona-name="option" />
            </template>
            <template #value="{ value }">
              <LabPersonaBadgeLabel v-if="value" :persona-name="value" />
            </template>
          </Select>
        </div>
        <div class="flex gap-2 items-center justify-between">
          <!-- Send Button -->
          <Button v-if="!isActiveAwaitingResponse" @click="sendMessage"
            :class="{ 'lab-chat-micro-button--disabled': !chatReady }"
            class="lab-chat-micro-button">
            <div class="text-xs! whitespace-nowrap">
              <span><i class="fa fa-comment-dots mr-1"></i>Send</span>
            </div>
          </Button>
          <!-- Stop Button -->
          <Button v-if="isActiveAwaitingResponse" @click="props.stopRequest"
            :class="{ 'lab-chat-micro-button--disabled': !chatReady }"
            class="lab-chat-micro-button">
            <div class="text-xs! whitespace-nowrap">
              <span><i class="fa fa-stop mr-1"></i>Stop</span>
            </div>
          </Button>
          <div>
            <!-- Microphone Toggle Button -->
            <Button @click="toggleVoiceInput" :pt:root:class="{
              'bg-amber-700! border-amber-500!': isListening && !disabledState,
              'lab-chat-micro-button': !isListening && !disabledState,
              'lab-chat-micro-button--disabled': disabledState
            }"
              class="px-2! py-1! text-xs! rounded-sm! whitespace-nowrap! cursor-pointer! flex! items-center! transition-colors! duration-200!">
              <div class="text-xs! whitespace-nowrap">
                <span><i class="fa fa-microphone"></i></span>
              </div>
            </Button>
          </div>

        </div>
      </div>

      <div class="flex flex-col justify-between gap-2 h-full lab-chat-composer-panel px-4 py-2 rounded-lg">
        <div class="flex flex-col justify-between h-full gap-1 text-xs">
          <div class="px-2 whitespace-nowrap py-1 rounded lab-chat-composer-chip">Enable Streaming</div>
          <div class="flex items-center justify-center lab-chat-streaming-toggle-wrap">
            <ToggleSwitch
              v-model="isStreaming"
              :input-id="streamingToggleInputId"
              aria-label="Enable streaming"
              @update:model-value="onStreamingToggleChange"
            />
          </div>
        </div>
      </div>


      <!-- File add/drop -->
      <div
        class="flex items-center justify-center h-full lab-chat-composer-dropzone px-2 py-1 rounded-lg border-2 transition-all duration-300 ease-in-out"
        @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="onDrop" :class="{
          'border-dotted! lab-chat-composer-dropzone--drag': isDragging,
          'border-transparent!': !isDragging,
        }">

        <div :class="{ 'pointer-events-none': isDragging }" class="w-full h-full">
          <!-- Hidden FileUpload: Triggered via ref or drag-drop -->
          <FileUpload ref="fileUploadRef" @select="onFileSelect" mode="advanced" multiple
            pt:root="flex! h-full! border-0!" pt:header="bg-transparent! p-0! border-0! p-0!"
            pt:content:class="p-0! border-none! outline-none! shadow-none!">
            <template #content="{ files, removeFileCallback }">
              <div v-if="files.length > 0" class="flex flex-col flex-1 justify-center overflow-auto">
                <!-- File Row -->
                <div v-for="(file, index) in files" :key="file.name + file.size"
                  class="flex items-center justify-between py-1 gap-2 px-2">

                  <Image v-if="uploadedFiles[index]" :src="uploadedFiles[index].preview" alt="Preview" preview
                    pt:image:class="w-8 h-8 rounded object-cover shadow-sm cursor-pointer" />

                  <div class="flex flex-col overflow-hidden whitespace-nowrap">
                    <span class="text-xs! truncate min-w-[100px]  max-w-[225px]">{{ file.name }}</span>
                    <small class="text-xs!">{{ (file.size / 1024).toFixed(1) }} KB</small>
                  </div>

                  <!-- Delete Button -->
                  <Button size="small" icon="pi pi-trash" severity="danger"
                    @click="removeFile(index, removeFileCallback)" class="text-xs! h-8! w-8!" />
                </div>
              </div>
            </template>
            <!-- This removes the default toolbar buttons if you want a cleaner "Chat" look -->
            <template #header="{ chooseCallback }">
              <div v-show="uploadedFiles.length == 0" class="flex justify-between items-center p-2">
                <div @click="chooseCallback()"
                  class="text-xs! flex items-center gap-2 whitespace-nowrap cursor-pointer lab-chat-composer-chip rounded px-2 py-1">
                  <i class="fa fa-file"></i>
                  <span>Add/Drop Files</span>
                </div>
              </div>
            </template>
          </FileUpload>
        </div>
      </div>

      <!-- @mention /command Dropdown Overlay -->
      <div v-show="mentionState.showDropdown && mentionState.dropdownPosition.left != '0'"
        class="absolute text-xs z-50 shadow-[0_5px_5px_rgba(0,0,0,0.25)] rounded-lg overflow-hidden max-h-96"
        :style="dropdownStyle" :class="{
          'lab-chat-mention-shell--file': mentionState.trigger === '@',
          'lab-chat-mention-shell--command': mentionState.trigger === '/',
        }">

        <!-- Header -->
        <div class="px-2 py-1 flex items-center gap-2" :class="{
          'lab-chat-mention-header--file': mentionState.trigger === '@',
          'lab-chat-mention-header--command': mentionState.trigger === '/',
        }">
          <i v-if="mentionState.trigger === '@'" class="fa fa-copy"></i>
          <i v-if="mentionState.trigger === '/'" class="fa fa-bolt"></i>

          <span v-if="mentionState.trigger === '@'">Add Context Files</span>
          <span v-if="mentionState.trigger === '/'">Run Command</span>
        </div>

        <!-- context files -->
        <div v-if="mentionState.repoFiles && mentionState.repoFiles.length > 0"
          class="mention-dropdown shadow-lg rounded-md border lab-chat-mention-list">
          <Listbox multiple :options="mentionState.repoFiles.slice(0, 10)" class="w-full border-0 bg-transparent"
            :metaKeySelection="false" v-model="mentionState.selectedValues"
            @keydown.enter.capture.stop.prevent="insertMultipleMentions" :pt="{
              root: { class: 'bg-lab-chat-canvas border-0' },
              list: { class: 'p-0' },
              item: {
                class: [
                  'px-3 py-2 text-sm transition-colors duration-200 text-lab-chat-canvas',
                  mentionState.trigger === '@' ? 'lab-chat-mention-item--file' : 'lab-chat-mention-item--command'
                ]
              }
            }">
            <template #option="slotProps">
              <div class="flex items-center gap-2">
                <!-- Icon based on trigger -->
                <i v-if="mentionState.trigger === '@'" class="fa fa-file text-lab-button-outlined-text text-xs"></i>
                <i v-else-if="mentionState.trigger === '/'" class="fa fa-terminal text-lab-button-outlined-text text-xs"></i>

                <span class="font-normal truncate">
                  {{ slotProps.option }}
                </span>
              </div>
            </template>
          </Listbox>
        </div>

        <!-- context commands -->
        <div v-if="mentionState.commands && mentionState.commands.length > 0"
          class="max-h-48 overflow-y-auto scrollbar-thin lab-chat-scrollbar transition-all duration-300 ease-in-out cursor-pointer">
          <div v-for="item in mentionState.commands.slice(0, 10)" :key="item.key"
            class="flex items-center gap-2 px-1.5 py-1 text-lab-chat-canvas" @click="handleContextCommandSelection(item)" :class="{
              'lab-chat-mention-item--file border-b border-lab-general-border': mentionState.trigger === '@',
              'lab-chat-mention-item--command border-b border-lab-general-border': mentionState.trigger === '/',
            }">
            <!-- Icon based on trigger -->
            <i v-if="mentionState.trigger === '@'" class="fa fa-file text-lab-button-outlined-text"></i>
            <i v-else-if="mentionState.trigger === '/'" class="fa fa-terminal text-lab-button-outlined-text"></i>

            <div class="flex flex-col">
              <div class="flex gap-2">
                <span class="font-normal whitespace-nowrap">/{{ item.key }}</span>
                <span class="text-lab-chat-assistant font-normal italic whitespace-nowrap">({{ item.description }})</span>
              </div>
              <div v-if="item.argumentHints && item.argumentHints.length > 0" class="flex gap-2 text-lab-general-text-muted">
                <div>Args:</div>
                <span class="flex gap-1" v-for="argHint in item.argumentHints" :key="argHint">
                  &lt;{{ argHint }}&gt;
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="mentionState.trigger === '@' && mentionState.repoFiles.length == 0" class="px-3 py-4 text-center">
          <span class="text-lab-general-text-muted text-sm">No matching files found</span>
        </div>
        <div v-if="mentionState.trigger === '/' && mentionState.commands.length == 0" class="px-3 py-4 text-center">
          <span class="text-lab-general-text-muted text-sm">No matching commands found</span>
        </div>
      </div>

      <div class="flex flex-col gap-2 items-center h-full lab-chat-composer-panel px-4 py-2 rounded-lg justify-between">

        <!-- Context Usage Progress Bar -->
        <div class="flex gap-2 items-center text-xs lab-chat-composer-context">
          <span>Context:</span>
          <ProgressBar :pt="{
            root: { class: 'max-h-[10px]' },
            value: {
              style: `background-color: var(--color-${progressColor});`
            }
          }" mode="determinate" :value="contextUsed" :showValue="false" class="w-32" />
          <span class="w-7.5">
            {{ Math.round(contextUsed) }}%
          </span>
        </div>

        <div class="flex items-center w-full justify-between">
          <!-- Summarize Button -->
          <Button @click="summarizeContext" :pt:root:class="{
            'lab-chat-micro-button': !disabledState,
            'lab-chat-micro-button--disabled': disabledState
          }"
            class="summarize-toggle px-2! py-1! text-xs! rounded-sm! whitespace-nowrap! cursor-pointer! flex! items-center! transition-colors! duration-200!"
            :aria-label="'Summarize conversation history'">
            <div class="text-xs whitespace-nowrap">
              <i class="fa fa-list-check mr-1"></i>Summarize
            </div>
          </Button>
          <!-- Settings Button -->
          <Button @click="toggleSettingsModal" :aria-label="'Open settings'" :pt:root:class="{
            'show-settings-toggle lab-chat-micro-button': !disabledState,
            'lab-chat-micro-button--disabled': disabledState
          }"
            class="px-2! py-1! text-xs! rounded-sm! whitespace-nowrap! cursor-pointer! flex! items-center! transition-colors! duration-200!">
            <div class="text-xs whitespace-nowrap">
              <span><i class="fa fa-user-gear"></i> Settings</span>
            </div>
          </Button>
        </div>
      </div>

    </div>

  </div>
  <!-- END MESSAGE INPUT COMPONENT -->
</template>
<style scoped>
/* Target the Quill toolbar and hide it */
:deep(.p-editor-toolbar) {
  display: none;
}

/* Optional: Remove the top border from the content container since toolbar is gone */
:deep(.p-editor-content) {
  border-top: 1px solid var(--lab-chat-input-border);
  border-radius: 4px;
}
</style>
