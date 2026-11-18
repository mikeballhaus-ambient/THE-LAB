<script setup lang="ts">
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { ICommand, Persona, ICommandRequestData } from '../../../shared/types';
import { useCommandManagement } from '../../../shared/composables/components/useCommandManagement';
import { personaUtils } from '@/shared/utils/persona-utils';

const props = defineProps<{
  commands: ICommand[];
  personaConfigs: Record<string, Persona>;
  manageCommandsRequestHandler: (data: ICommandRequestData) => void
}>();

const { currentCommand, saveCurrentCommand, duplicateCurrentCommand, isCommandExisting, commandsList, addArgumentHint, removeArgumentHint, addNewCommand, selectExistingCommand, availablePersonas } = useCommandManagement(
  () => props.commands,
  () => props.personaConfigs,
  props.manageCommandsRequestHandler
);

</script>

<template>
  <div class="flex flex-1 flex-col gap-3">
    <div class="flex gap-2 items-start justify-between w-full h-full">
      <Select size="small" v-model="currentCommand"
        v-on:update:model-value="selectExistingCommand" :options="commandsList"
        optionLabel="key" placeholder="Select Command"
        class="w-50 lab-settings-input persona-selector disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-lab-general-bg-muted">
        <template #option="slotProps">
          <div>
            <div class="">/{{ slotProps.option.key }}</div>
            <div class="text-xs text-lab-general-text-muted">{{ slotProps.option.description }}</div>
          </div>
        </template>
      </Select>

      <!-- add button to create new slash command -->
      <Button size="small" label="Add New" @click="addNewCommand" class="" />
    </div>

    <!-- add form to edit/add slash commands-->
    <div v-if="currentCommand" class="flex flex-col gap-2">
      <div class="flex gap-2 items-center">
        <label for="cmd-key" class="text-lab-general-text w-[125px] text-sm!">Key:</label>
        <InputText v-model="currentCommand.key" :disabled="isCommandExisting"
          placeholder="Command key (starts with /)"
          class="w-50 lab-settings-input" />
      </div>

      <div class="flex gap-2 items-center">
        <label for="cmd-description" class="text-lab-general-text w-[125px] min-w-[125px]">Description:</label>
        <InputText v-model="currentCommand.description"
          class="lab-settings-input w-full" placeholder="Command description" />
      </div>

      <div class="flex gap-2 items-start">
        <label for="cmd-text" class="text-lab-general-text w-[125px] min-w-[125px] text-sm!">Agent Message:</label>
        <Textarea v-model="currentCommand.text"
          class="lab-settings-input text-xs! w-full font-mono!"
          placeholder="Enter the command text that will be sent to agents"
          rows="9" pt:root="px-2! py-1!" />
      </div>

      <div class="flex gap-2 items-center">
        <label for="cmd-persona" class="text-lab-general-text w-[125px] text-sm!">Persona:</label>
        <Select v-model="currentCommand.persona"
          :options="['', ...availablePersonas]"
          class="w-50 lab-settings-input">
          <template #option="slotProps">
            <div class="text-xs">{{ personaUtils.formatPersonaName(slotProps.option) }}</div>
          </template>
        </Select>
      </div>

      <div class="flex gap-2 items-center">
        <label for="arg-hints" class="text-lab-general-text w-[125px] text-sm!">Argument Hints:</label>
        <Button size="small" label="Add Argument Hint" type="button"
          @click="addArgumentHint" />
      </div>

      <div v-if="currentCommand?.argumentHints && currentCommand.argumentHints.length > 0"
        class="flex flex-col gap-2 max-h-[110px] overflow-auto">
        <div v-for="(hint, index) in currentCommand.argumentHints" :key="index"
          class="flex items-center gap-2">
          <InputText v-model="currentCommand.argumentHints[index]"
            placeholder="Argument description"
            class="w-[500px] lab-settings-input" />
          <Button size="small" label="Remove" severity="danger" type="button"
            @click="removeArgumentHint(index)" />
        </div>
      </div>

    </div>

    <div class="flex gap-2">
      <!-- save button -->
      <div>
        <Button size="small" v-if="currentCommand" label="Save"
          @click="saveCurrentCommand(false)" class="" />
      </div>
      <!-- delete button -->
      <div>
        <Button size="small" v-if="currentCommand" label="Delete"
          @click="saveCurrentCommand(true)" class="" />
      </div>
      <!-- duplicate button -->
      <div>
        <Button size="small" v-if="currentCommand" label="Clone"
          @click="duplicateCurrentCommand" class="" />
      </div>
    </div>
  </div>
</template>
