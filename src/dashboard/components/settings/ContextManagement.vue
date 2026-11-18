<script setup lang="ts">
import Checkbox from 'primevue/checkbox';
import Slider from 'primevue/slider';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { IContextSettings } from '../../../shared/types';
import { useContextManagement } from '../../../shared/composables/components/useContextManagement';

const props = defineProps<{
  contextSettings: IContextSettings | undefined;
  manageContextSettingsRequestHandler: (data: IContextSettings) => void,
}>();

const {
  form_currentContextSettings,
  normalMaxSliderValue,
  warningRangeSliderValue,
  criticalMinSliderValue,
  saveContextSettings
} = useContextManagement(() => props.contextSettings, 
props.manageContextSettingsRequestHandler);

</script>

<template>
  <div class="flex flex-1 flex-col gap-3">
    <!-- add form to edit contextSettingsRef (IContextSettings) -->
    <div v-if="form_currentContextSettings" class="flex flex-col gap-5">
      <div class="flex flex-col gap-5">
        <!-- Enable Auto Summarization Toggle -->
        <div class="flex gap-2 items-center">
          <Checkbox v-model="form_currentContextSettings.enableAutoSummarization"
            :binary="true" :id="'currentContextSettings-toggle'"
            class="text-sm!" />
          <label for="currentContextSettings-toggle" class="text-lab-general-text-muted">
            Enable Auto Summarization
          </label>
        </div>
        <!-- Trigger Summarization Percentage -->
        <div v-if="form_currentContextSettings.enableAutoSummarization" class="flex gap-2 items-center">
          <label class="text-sm! text-lab-general-text-muted!">
            Trigger at {{ form_currentContextSettings.triggerSummarizationPercent }}%:
          </label>
          <Slider v-model="form_currentContextSettings.triggerSummarizationPercent"
            :min="0" :max="100" :step="1"
            :disabled="!form_currentContextSettings"
            class="flex-1 bg-lab-general-bg-muted! accent-cyan-400" />
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <div class="text-lab-general-text-muted">
          Context Usage Indicators
        </div>
        <div class="flex flex-col gap-2 lab-settings-inner-panel p-6">
          <!-- Normal Level Configuration -->
          <div class="flex flex-col gap-4">
            <div
              class="text-lab-general-text text-sm! font-semibold mb-1 flex items-center gap-2 bg-lab-general-bg-muted! px-3 py-1 rounded-lg">
              <div class="flex justify-between w-full items-center">
                <div class="flex gap-2">
                  <div :style="`background-color: var(--color-${form_currentContextSettings.normal.colorClass});`"
                    class="h-[14px] w-[14px] rounded-sm"></div>
                  <span>Normal Level</span>
                </div>
                <InputText
                  v-model="form_currentContextSettings.normal.colorClass"
                  class="bg-lab-general-bg-muted! min-w-[250px]" />
              </div>
            </div>
            <div class="flex gap-5 items-center">
              <Slider v-model="normalMaxSliderValue" range :min="0"
                :max="100" :step="1"
                class="flex-1 bg-lab-general-bg-muted! accent-amber-400" :pt="{
                  startHandler: { style: 'display: none' },
                  range: { style: `background-color: var(--color-${form_currentContextSettings.normal.colorClass}) !important` }
                }" />

            </div>
            <div class="flex items-center w-full justify-between">
              <span class="text-sm font-mono! w-[60px]">{{
                form_currentContextSettings.normal.minValue }}</span>
              <span class="text-sm font-mono! w-[60px] text-right!">{{
                form_currentContextSettings.normal.maxValue }}</span>
            </div>
          </div>

          <!-- Warning Level Configuration -->
          <div class="flex flex-col gap-4">
            <div
              class="text-lab-general-text text-sm! font-semibold mb-1 flex items-center gap-2 bg-lab-general-bg-muted! px-3 py-1 rounded-lg">
              <div class="flex justify-between w-full items-center">
                <div class="flex gap-2">
                  <div :style="`background-color: var(--color-${form_currentContextSettings.warning.colorClass});`"
                    class="h-[14px] w-[14px] rounded-sm"></div>
                  <span>Normal Level</span>
                </div>
                <InputText
                  v-model="form_currentContextSettings.warning.colorClass"
                  class="bg-lab-general-bg-muted! min-w-[250px]" />
              </div>
            </div>
            <div class="flex gap-5 items-center cursor-not-allowed ">
              <Slider v-model="warningRangeSliderValue" range :min="0"
                :max="100" :step="1"
                class="flex-1 bg-lab-general-bg-muted! accent-red-400" :pt="{
                  endHandler: { style: 'display: none' },
                  startHandler: { style: 'display: none' },
                  range: { style: `background-color: var(--color-${form_currentContextSettings.warning.colorClass}) !important` }
                }" />
            </div>
            <div class="flex items-center w-full justify-between">
              <span class="text-sm font-mono! w-[60px]">{{
                form_currentContextSettings.warning.minValue }}</span>
              <span class="text-sm font-mono! w-[60px] text-right!">{{
                form_currentContextSettings.warning.maxValue }}</span>
            </div>
          </div>

          <!-- Critical Level Configuration -->
          <div class="flex flex-col gap-4">
            <div
              class="text-lab-general-text text-sm! font-semibold mb-1 flex items-center gap-2 bg-lab-general-bg-muted! px-3 py-1 rounded-lg">
              <div class="flex justify-between w-full items-center">
                <div class="flex gap-2">
                  <div :style="`background-color: var(--color-${form_currentContextSettings.critical.colorClass});`"
                    class="h-[14px] w-[14px] rounded-sm"></div>
                  <span>Normal Level</span>
                </div>
                <InputText
                  v-model="form_currentContextSettings.critical.colorClass"
                  class="bg-lab-general-bg-muted! min-w-[250px]" />
              </div>
            </div>
            <div class="flex gap-5 items-center">
              <Slider v-model="criticalMinSliderValue" range :min="0"
                :max="100" :step="1"
                class="flex-1 bg-lab-general-bg-muted! accent-red-600" :pt="{
                  endHandler: { style: 'display: none' },
                  range: { style: `background-color: var(--color-${form_currentContextSettings.critical.colorClass}) !important` }
                }" />
            </div>
            <div class="flex items-center w-full justify-between">
              <span class="text-sm font-mono! w-[60px]">{{
                form_currentContextSettings.critical.minValue }}</span>
              <span class="text-sm font-mono! w-[60px] text-right!">{{
                form_currentContextSettings.critical.maxValue }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex gap-2">
      <!-- save button -->
      <div>
        <Button size="small" label="Save Settings" @click="saveContextSettings"
          class="" />
      </div>
    </div>
  </div>
</template>
