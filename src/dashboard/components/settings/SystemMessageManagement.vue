<script setup lang="ts">
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import { useSystemMessageManagement } from '../../../shared/composables/components/useSystemMessageManagement';
import { User } from '@/shared/types';

const props = defineProps<{
  globalSysMsg: string;
  currentSystemInstructions: string;
  previewSystemInstructionRequest: () => void,
  handleGlobalSysMsgChange: (data: string) => void,
  user: User | null,
  currentUserInstructions: string,
  handleUpdateGlobalUserMsg: (data: string) => void
}>();

defineEmits<{
  (e: 'save-global-sys-msg'): void
  (e: 'preview-system-instruction'): void
}>();

const {
  showSysInstructionsPreview,
  handleSaveGlobalSysMsg,
  previewSystemInstructionRequestHandler,
  globalSysMsgValue,
  canUpdateGlobalSysMsg,
  globalUserMsgValue,
  handleSaveGlobalUserMsg
} = useSystemMessageManagement(
  () => props.globalSysMsg,
  props.previewSystemInstructionRequest,
  props.handleGlobalSysMsgChange,
  () => props.user,
  () => props.currentUserInstructions,
  props.handleUpdateGlobalUserMsg
);

</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex-1 flex gap-5 w-full">
      <div v-if="!showSysInstructionsPreview && canUpdateGlobalSysMsg" class=" flex flex-col w-full gap-2">
        <div>System Instructions</div>
        <Textarea v-model="globalSysMsgValue" rows="26" class="lab-settings-input font-mono! h-full! w-full! text-xs!" />
        <div>
          <Button v-if="!showSysInstructionsPreview" label="Save System Instrutions" @click="handleSaveGlobalSysMsg"
            class="" />
        </div>
      </div>
      <div v-if="!showSysInstructionsPreview" class="flex flex-col w-full gap-2">
        <div>User Included Instructions</div>
        <Textarea v-model="globalUserMsgValue" rows="26" class="lab-settings-input font-mono! h-full! w-full! text-xs!" />
        <div class="flex justify-between">
          <Button label="Save User Instrutions" @click="handleSaveGlobalUserMsg" class="" />
          <Button v-if="!showSysInstructionsPreview" label="Show Preview"
            @click="previewSystemInstructionRequestHandler" class="" />
        </div>
      </div>
    </div>
    <Textarea v-if="showSysInstructionsPreview" rows="28"
      class="lab-settings-input font-mono! h-full! w-full! text-xs! text-lab-general-text-muted/90!" :readonly="true"
      :value="currentSystemInstructions"></Textarea>
    <div class="flex gap-3">
      <Button v-if="showSysInstructionsPreview" label="Hide Preview" @click="() => showSysInstructionsPreview = false"
        class="" />
    </div>
  </div>
</template>
