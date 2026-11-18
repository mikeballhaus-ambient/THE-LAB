<script setup lang="ts">
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanel from 'primevue/tabpanel';
import TabPanels from 'primevue/tabpanels';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Listbox from 'primevue/listbox';
import Select from 'primevue/select';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { computed } from 'vue';
import { usePersonaManagement } from '@/shared/composables/components/usePersonaManagement';
import { ICommand, ToolsList, PersonaEventType, UpdatePersonaConfigEventData, Persona, PersonaReasoningSelectOptions } from '@/shared/types';
import { personaUtils } from '@/shared/utils/persona-utils';
import {
  settingsNestedTabPanelsPtClass,
  settingsTabClassTier2,
} from './settings-ui';

const props = defineProps<{
  personaConfigs: Record<string, Persona>;
  currentPersonaName: string;
  currentPersonaProperty: string;
  availableTools: ToolsList[];
  commandsList: ICommand[];
  handlePersonaSave: (data: UpdatePersonaConfigEventData) => void,
}>();

const {
  personaPropertySelected,
  newPersonaFormVisible,
  handleSave,
  showNewPersonaForm,
  saveNewPersona,
  systemPersonas,
  newPersonaForm,
  newPersonaValidator,
  newPersonaFormValidated,
  renamePersonaValidator,
  renamePersona,
  showRenameOption,
  handleRename
} = usePersonaManagement(() => props.personaConfigs,
  () => props.currentPersonaName,
  () => props.currentPersonaProperty,
  props.handlePersonaSave)

const activePersona = computed(
  () => props.personaConfigs[props.currentPersonaName] as Persona | undefined,
)

</script>

<template>
  <div v-if="activePersona" class="persona-management flex flex-col min-h-0 w-full h-full">
    <Tabs v-model:value="personaPropertySelected" pt:root="flex! flex-col! w-full! flex-1! min-h-0!">
          <TabList pt:root="min-h-[48px] w-full! flex" pt:content="w-full!" pt:tabList="settingsTablistTier2PtClass">
            <Tab pt:root="flex-1!" value="Role" :class="settingsTabClassTier2(personaPropertySelected === 'Role')">
              <div class="flex gap-2 items-center justify-center whitespace-nowrap">
                <i class="fa-brands fa-redhat"></i>
                <span>Role</span>
              </div>
            </Tab>
            <Tab pt:root="flex-1!" value="Capabilities" :class="settingsTabClassTier2(personaPropertySelected === 'Capabilities')">
              <div class="flex gap-2 items-center justify-center whitespace-nowrap">
                <i class="fa fa-hand-sparkles"></i>
                <span>Capabilities</span>
              </div>
            </Tab>
            <Tab pt:root="flex-1!" value="Output" :class="settingsTabClassTier2(personaPropertySelected === 'Output')">
              <div class="flex gap-2 items-center justify-center whitespace-nowrap">
                <i class="fa fa-file-export"></i>
                <span>Output</span>
              </div>
            </Tab>
            <Tab pt:root="flex-1!" value="Rules" :class="settingsTabClassTier2(personaPropertySelected === 'Rules')">
              <div class="flex gap-2 items-center justify-center whitespace-nowrap">
                <i class="fa fa-gavel"></i>
                <span>Rules</span>
              </div>
            </Tab>
            <Tab pt:root="flex-1!" value="Tools" :class="settingsTabClassTier2(personaPropertySelected === 'Tools')">
              <div class="flex gap-2 items-center justify-center whitespace-nowrap">
                <i class="fa fa-screwdriver-wrench"></i>
                <span>Tools</span>
              </div>
            </Tab>
            <Tab pt:root="flex-1!" value="Commands" :class="settingsTabClassTier2(personaPropertySelected === 'Commands')">
              <div class="flex gap-2 items-center justify-center whitespace-nowrap">
                <i class="fa fa-slash rotate-x-180"></i>
                <span>Commands</span>
              </div>
            </Tab>
            <Tab pt:root="flex-1!" value="Reasoning" :class="settingsTabClassTier2(personaPropertySelected === 'Reasoning')">
              <div class="flex gap-2 items-center justify-center whitespace-nowrap">
                <i class="fa fa-lightbulb"></i>
                <span>Reasoning</span>
              </div>
            </Tab>
          </TabList>
          <TabPanels :pt="{ root: { class: settingsNestedTabPanelsPtClass } }">
            <TabPanel value="Role" pt:root="justify-between! w-full! h-full!">
              <Textarea v-model="activePersona.sysMsg.role" rows="20" class="font-mono! w-full text-xs! bg-lab-general-bg-muted!" />
            </TabPanel>
            <TabPanel value="Capabilities" pt:root="justify-between! w-full! h-full!">
              <Textarea v-model="activePersona.sysMsg.capabilities" rows="20"
                class="font-mono! w-full text-xs! bg-lab-general-bg-muted!" />
            </TabPanel>
            <TabPanel value="Output" pt:root="justify-between! w-full! h-full!">
              <Textarea v-model="activePersona.sysMsg.output" rows="20" class="font-mono! w-full text-xs! bg-lab-general-bg-muted!" />
            </TabPanel>
            <TabPanel value="Rules" pt:root="justify-between! w-full! h-full!">
              <Textarea v-model="activePersona.sysMsg.rules" rows="20" class="font-mono! w-full text-xs! bg-lab-general-bg-muted!" />
            </TabPanel>
            <TabPanel value="Tools" pt:root="justify-between! w-full! h-full!">
              <div class="flex flex-col gap-2">
                <div class="text-lab-general-text-muted">Assign MCP tools for the {{
                  personaUtils.formatPersonaName(activePersona.name)
                }}
                  persona</div>
                <Listbox id="existing-persona-tools" pt:listContainer="max-h-[320px]!" pt:list="p-2! bg-lab-general-bg-muted!"
                  v-model="activePersona.tools" multiple :options="props.availableTools" option-value="id">
                  <template #option="slotProps">
                    <div>
                      <div class="">{{
                        slotProps.option.isExternal ? slotProps.option.display : slotProps.option.name
                      }}</div>
                      <div class="text-xs text-lab-general-text-muted">{{
                        slotProps.option.description }}</div>
                    </div>
                  </template>
                </Listbox>
              </div>
            </TabPanel>
            <TabPanel value="Commands" pt:root="justify-between! w-full! h-full!">
              <div class="flex flex-col gap-2">
                <div class="text-lab-general-text-muted">Allow the {{ personaUtils.formatPersonaName(activePersona.name) }}
                  persona to call slash commands</div>
                <Listbox id="existing-persona-commands" pt:listContainer="max-h-[320px]!" pt:list="p-2! bg-lab-general-bg-muted!"
                  v-model="activePersona.slashCommands" multiple :options="props.commandsList" option-value="key">
                  <template #option="slotProps">
                    <div>
                      <div class="">{{
                        slotProps.option.key
                      }}</div>
                      <div class="text-xs text-lab-general-text-muted">{{
                        slotProps.option.description }}</div>
                    </div>
                  </template>
                </Listbox>
                <div class="mt-2 text-xs text-cyan-100">
                  Selected commands:
                  ({{ activePersona.slashCommands.length }})
                  {{ activePersona.slashCommands.join(' - ') }}
                </div>
              </div>
            </TabPanel>
            <TabPanel value="Reasoning" pt:root="justify-between! w-full! h-full!">
              <div class="flex flex-col gap-2">
                <div class="text-lab-general-text-muted">Set the level of reasoning
                  (temperature)
                  for the
                  {{ personaUtils.formatPersonaName(activePersona.name) }} persona</div>
                <Select size="small" v-model="activePersona.reasoning" :options="PersonaReasoningSelectOptions"
                  optionLabel="name" optionValue="value" placeholder="Select Reasoning Level"
                  class="w-50 bg-lab-general-bg-muted! persona-selector disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-lab-general-bg-muted">
                </Select>
              </div>
            </TabPanel>
          </TabPanels>
    </Tabs>
    <div class="flex justify-between mx-5 mb-1 mt-3 shrink-0">
      <div class="flex flex-col gap-3">
        <Button :label="`Save ${personaUtils.formatPersonaName(activePersona.name)} persona`" type="button"
          @click="() => handleSave('update' as PersonaEventType)" :disabled="showRenameOption" />
        <Button label="Add New" type="button" @click="showNewPersonaForm" :disabled="showRenameOption" />
      </div>

      <div v-if="showRenameOption" class="flex flex-col items-center gap-3">

        <InputText id="renamePersonaForm-name" type="text" v-model="renamePersona"
          placeholder="Enter new persona name" class="text-xs! min-w-[250px] bg-lab-general-bg-muted!"
          :class="{ 'border-red-800!': !renamePersonaValidator.isValid && renamePersonaValidator.validators.name.length > 0 }" />

        <div class="flex gap-3">
          <Button label="Update" type="button"
            @click="handleRename" />
          <Button  label="Cancel" type="button"
            @click="() => { showRenameOption = false; renamePersona = '' }" />
        </div>

      </div>

      <div class="flex flex-col gap-3">
        <Button :disabled="systemPersonas.includes(activePersona.name) || showRenameOption"
          :label="`Remove ${personaUtils.formatPersonaName(activePersona.name)} persona`" type="button"
          @click="() => handleSave('remove' as PersonaEventType)" />
        <Button :disabled="systemPersonas.includes(activePersona.name) || showRenameOption"
          :label="`Rename ${personaUtils.formatPersonaName(activePersona.name)} persona`" type="button"
          @click="() => { showRenameOption = true; renamePersona = props.currentPersonaName }" />
      </div>
    </div>
  </div>
  <Dialog v-model:visible="newPersonaFormVisible" modal :pt="{ mask: { class: 'settings-modal-child' } }"
    header="Add new persona" :style="{ width: '75rem' }"
    class="lab-settings-dialog w-[1200px] h-[800px]" :breakouts="{ disabled: true }">
    <div class="new-persona-form lab-settings-inner-panel p-6 shadow-md">

      <form @submit.prevent="saveNewPersona" class="">
        <div class="flex flex-col gap-4 text-lab-general-text-muted">

          <div class="flex gap-2 items-center">
            <label for="newPersonaForm-name" class="min-w-[100px]! w-[100px]!">Name:</label>
            <InputText id="newPersonaForm-name" type="text" v-model="newPersonaForm.name"
              placeholder="Enter new persona name" class="min-w-[250px] bg-lab-general-bg-muted!"
              :class="{ 'border-red-800!': !newPersonaValidator.isValid && newPersonaFormValidated && newPersonaValidator.validators.name.length > 0 }" />
            <div
              v-if="!newPersonaValidator.isValid && newPersonaFormValidated && newPersonaValidator.validators.name.length > 0">
              <span class="text-red-200" v-for="(msg, idx) in newPersonaValidator.validators.name" :key="idx">{{ msg
                }}</span>
            </div>
          </div>

          <div class="flex gap-2 items-start">
            <label for="newPersonaForm-sysMsg-role" class="min-w-[100px]! w-[100px]!">Role:</label>
            <div class="w-full">
              <Textarea id="newPersonaForm-sysMsg-role" v-model="newPersonaForm.sysMsg.role" rows="5"
                class="font-mono! w-full text-xs! bg-lab-general-bg-muted!"
                :class="{ 'border-red-800!': !newPersonaValidator.isValid && newPersonaFormValidated && newPersonaValidator.validators.sysMsg_role.length > 0 }" />
              <div
                v-if="!newPersonaValidator.isValid && newPersonaFormValidated && newPersonaValidator.validators.sysMsg_role.length > 0">
                <span class="text-red-200" v-for="(msg, idx) in newPersonaValidator.validators.sysMsg_role"
                  :key="idx">{{
                    msg
                  }}</span>
              </div>
            </div>
          </div>

          <div class="flex gap-2 items-start">
            <label for="newPersonaForm-sysMsg-capabilities" class="min-w-[100px]! w-[100px]!">Capabilities:</label>
            <div class="w-full">
              <Textarea id="newPersonaForm-sysMsg-capabilities" v-model="newPersonaForm.sysMsg.capabilities" rows="5"
                class="font-mono! w-full text-xs! bg-lab-general-bg-muted!"
                :class="{ 'border-red-800!': !newPersonaValidator.isValid && newPersonaFormValidated && newPersonaValidator.validators.sysMsg_capabilities.length > 0 }" />
              <div
                v-if="!newPersonaValidator.isValid && newPersonaFormValidated && newPersonaValidator.validators.sysMsg_capabilities.length > 0">
                <span class="text-red-200" v-for="(msg, idx) in newPersonaValidator.validators.sysMsg_capabilities"
                  :key="idx">{{
                    msg
                  }}</span>
              </div>
            </div>
          </div>

          <div class="flex gap-2 items-start">
            <label for="newPersonaForm-sysMsg-output" class="min-w-[100px]! w-[100px]!">Output:</label>
            <div class="w-full">
              <Textarea id="newPersonaForm-sysMsg-sysMsg_output" v-model="newPersonaForm.sysMsg.output" rows="5"
                class="font-mono! w-full text-xs! bg-lab-general-bg-muted!"
                :class="{ 'border-red-800!': !newPersonaValidator.isValid && newPersonaFormValidated && newPersonaValidator.validators.sysMsg_output.length > 0 }" />
              <div
                v-if="!newPersonaValidator.isValid && newPersonaFormValidated && newPersonaValidator.validators.sysMsg_output.length > 0">
                <span class="text-red-200" v-for="(msg, idx) in newPersonaValidator.validators.sysMsg_output"
                  :key="idx">{{
                    msg
                  }}</span>
              </div>
            </div>
          </div>

          <div class="flex gap-2 items-start">
            <label for="newPersonaForm-sysMsg-rules" class="min-w-[100px]! w-[100px]!">Rules:</label>
            <div class="w-full">
              <Textarea id="newPersonaForm-sysMsg-rules" v-model="newPersonaForm.sysMsg.rules" rows="5"
                class="font-mono! w-full text-xs! bg-lab-general-bg-muted!"
                :class="{ 'border-red-800!': !newPersonaValidator.isValid && newPersonaFormValidated && newPersonaValidator.validators.sysMsg_rules.length > 0 }" />
              <div
                v-if="!newPersonaValidator.isValid && newPersonaFormValidated && newPersonaValidator.validators.sysMsg_rules.length > 0">
                <span class="text-red-200" v-for="(msg, idx) in newPersonaValidator.validators.sysMsg_rules"
                  :key="idx">{{
                    msg
                  }}</span>
              </div>
            </div>
          </div>


          <div class="flex gap-2 items-start">
            <label for="new-persona-tools" class="min-w-[100px]! w-[100px]!">Tools:</label>
            <Listbox id="new-persona-tools" pt:listContainer="max-h-[320px]!" pt:list="p-2! bg-lab-general-bg-muted!"
              v-model="newPersonaForm.tools" multiple :options="props.availableTools" option-value="id">
              <template #option="slotProps">
                <div>
                  <div class="">{{
                    slotProps.option.name
                    }}</div>
                  <div class="text-xs text-lab-general-text-muted">{{
                    slotProps.option.description }}</div>
                </div>
              </template>
            </Listbox>
          </div>

          <div class="flex gap-2 items-start">
            <label for="existing-persona-commands" class="min-w-[100px]! w-[100px]!">Commands:</label>
            <Listbox id="existing-persona-commands" pt:listContainer="max-h-[320px]!" pt:list="p-2! bg-lab-general-bg-muted!"
              v-model="newPersonaForm.slashCommands" multiple :options="props.commandsList" option-value="key">
              <template #option="slotProps">
                <div>
                  <div class="">{{
                    slotProps.option.key
                  }}</div>
                  <div class="text-xs text-lab-general-text-muted">{{
                    slotProps.option.description }}</div>
                </div>
              </template>
            </Listbox>
          </div>

          <div class="flex gap-2 items-center">
            <label for="existing-persona-reasoning" class="min-w-[100px]! w-[100px]!">Reasoning:</label>
            <Select id="existing-persona-reasoning" size="small" v-model="newPersonaForm.reasoning"
              :options="PersonaReasoningSelectOptions" optionLabel="name" optionValue="value"
              placeholder="Select Reasoning Level"
              class="w-50 bg-lab-general-bg-muted! persona-selector disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-lab-general-bg-muted">
            </Select>
          </div>
        </div>


        <div class="flex justify-center gap-3 pt-4">
          <div><Button type="submit" label="Save Persona" icon="pi pi-save" severity="success" class="flex-1" /></div>
          <div><Button type="button" label="Cancel" icon="pi pi-times" severity="secondary"
              @click="() => newPersonaFormVisible = false" class="flex-1" />
          </div>
        </div>
      </form>
    </div>
  </Dialog>
</template>
