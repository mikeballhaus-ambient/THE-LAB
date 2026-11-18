<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { ChatPersona, FollowupParams, UIChatMessage } from '../../../shared/types';
import Button from 'primevue/button'
import InputText from 'primevue/inputtext';

interface Props {
  message: UIChatMessage
  persona: string,
  handleFollowupSubmitted: (data: FollowupParams, messageRef: UIChatMessage, persona: ChatPersona) => Promise<void>;
  isHidden: boolean;
  toggleFollowup: (chatId: string) => void;
}

const props = defineProps<Props>();

const formData = ref<Record<string, string | boolean>>({});

watch(() => props.message, async (newMessage) => {
  if (newMessage.followupData) {
    // pre-populate formData with existing previously entered values from followupData.options
    const options = newMessage.followupData.options;
    
    // Reset formData first to clear any stale data
    formData.value = {};
    
    // Populate formData based on existing selections and userValues
    options.forEach(option => {
      if (option.userValue !== undefined && option.userValueRequired) {
        // For checkbox options, use the selected property
        formData.value[option.id] = option.userValue;
      } else if (option.selected !== undefined) {
        // For input fields, use the userValue
        formData.value[option.id] = option.selected;
      }
    });
  }
}, { immediate: true, deep: true });

// Check if an option is selected based on user input or default selection
const isOptionSelected = (optionId: string): boolean => {
  // First check if this option matches the defaultSelection
  if (props.message?.followupData?.defaultSelection === optionId) {
    return true;
  }

  const value = formData.value[optionId];
  if (value === undefined) return false;

  // For checkbox options, check if value is truthy
  if (!props?.message?.followupData?.options?.find(o => o.id === optionId)?.userValueRequired) {
    return !!value;
  }

  // For input fields, check if user provided a non-empty value
  return String(value).trim().length > 0;
};

// Handle checkbox change
const handleCheckboxChange = (optionId: string, checked: boolean) => {
  formData.value[optionId] = checked;
};

// Handle input field change
const handleInputChange = (optionId: string, value: string) => {
  formData.value[optionId] = value;
};

// Submit the form with user selections
const handleSubmit = async () => {
  const updatedOptions = props?.message?.followupData?.options.map(option => ({
    ...option,
    selected: isOptionSelected(option.id),
    userValue: formData.value[option.id] ?? option.userValue
  }));

  const followupParams: FollowupParams = {
    ...props.message.followupData,
    options: updatedOptions
  } as FollowupParams

  await props.handleFollowupSubmitted(followupParams, props.message, props.persona);
};

// Format options for display
const checkboxOptions = computed(() =>
  props.message?.followupData ? props.message.followupData.options.filter(o => !o.userValueRequired) : []
);

const inputOptions = computed(() =>
  props.message?.followupData ? props.message?.followupData?.options.filter(o => o.userValueRequired) : []
);

</script>

<template>
  <div class="flex flex-col text-xs">

    <div class="lab-chat-followup-prompt mb-2 ml-1">Agent wants to ask a question:</div>

    <!-- Question Text with Question Icon -->
    <div @click="props.toggleFollowup(props.message.chatId!)"
      class="ml-2 cursor-pointer flex gap-3 items-center lab-chat-followup-question px-2 py-1 rounded-lg">
      <i class="fa fa-question-circle text-amber-300"></i>
      <span>{{ props.message?.followupData?.question }}</span>
    </div>

    <div v-if="!props.isHidden" class="flex flex-col gap-1 mt-1 ml-2 p-2 lab-chat-followup-panel rounded text-xs">
      <div>
        <!-- Checkbox Options -->
        <div v-if="checkboxOptions.length > 0">
          <label v-for="option in checkboxOptions" :key="option.id"
            class="flex items-center gap-2 cursor-pointer lab-chat-followup-option p-1 rounded-lg transition-colors">
            <input type="checkbox" :value="option.id" :checked="isOptionSelected(option.id)"
              @change="(e) => handleCheckboxChange(option.id, (e.target as HTMLInputElement).checked)"
              class="form-checkbox h-4 w-4 rounded border-lab-general-border bg-lab-chat-composer-panel text-lab-chat-thinking focus:ring-lab-general-text-muted" />
            <span class="option-label">{{ option.label }}</span>
          </label>
        </div>

        <!-- Input Field Options -->
        <div v-if="inputOptions.length > 0">
          <label v-for="option in inputOptions" :key="option.id"
            class="flex items-center gap-2 cursor-pointer p-1 rounded-lg transition-colors">

            <InputText pt:root="px-2! py-1! text-xs!" :value="formData[option.id] ?? ''"
              @input="(e: Event) => handleInputChange(option.id, (e.target as HTMLInputElement).value)"
              :placeholder="option.userValueRequired ? 'Enter value...' : undefined" class="">
            </InputText>

            <span class="option-label">{{ option.label }}</span>
          </label>
        </div>

      </div>
      <!-- Submit Button -->
      <div class="flex justify-end">
        <Button @click="handleSubmit">
          <div class="text-xs! whitespace-nowrap flex items-center gap-1">
            <i class="fa fa-paper-plane"></i>Submit
          </div>
        </Button>
      </div>
    </div>
  </div>
</template>

