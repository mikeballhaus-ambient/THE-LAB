import { ref, computed, watchEffect } from 'vue';
import { IContextSettings } from '../../../shared/types';

export const useContextManagement = (contextSettings: () => IContextSettings | undefined,
  manageContextSettingsRequestHandler: (data: IContextSettings) => void) => {

  const settingsInitialized = ref<boolean>(false)
  const form_currentContextSettings = ref<IContextSettings>({
    id: 0,
    enableAutoSummarization: false,
    triggerSummarizationPercent: 100,
    normal: {
      colorClass: 'emerald',
      minValue: 0,
      maxValue: 50
    },
    warning: {
      colorClass: 'amber',
      minValue: 51,
      maxValue: 80
    },
    critical: {
      colorClass: 'red',
      minValue: 81,
      maxValue: 100
    }
  })

  watchEffect(() => {
    if (!settingsInitialized.value) {
      const _contextSettings = contextSettings()
      if (_contextSettings) form_currentContextSettings.value = _contextSettings
      settingsInitialized.value = true
    }
  })

  const saveContextSettings = () => {
    if (form_currentContextSettings.value) manageContextSettingsRequestHandler(form_currentContextSettings.value)
  }

  const normalMaxSliderValue = computed({
    get: () => [form_currentContextSettings.value.normal.minValue, form_currentContextSettings.value.normal.maxValue] as number[],
    set: (newValue) => {
      if (form_currentContextSettings.value) {
        if (form_currentContextSettings.value.normal.maxValue && newValue[1]) {
          form_currentContextSettings.value.normal.maxValue = newValue[1];
          form_currentContextSettings.value.warning.minValue = newValue[1] + 1
        }
        form_currentContextSettings.value.normal.minValue = 0
      }
    }
  });

  const warningRangeSliderValue = computed({
    get: () => [form_currentContextSettings.value.warning.minValue, form_currentContextSettings.value.warning.maxValue] as number[],

    set: (newValue) => {
      if (form_currentContextSettings.value) {
        if (form_currentContextSettings.value.warning.minValue && newValue[0]) form_currentContextSettings.value.warning.minValue = newValue[0];
        if (form_currentContextSettings.value.warning.maxValue && newValue[1]) form_currentContextSettings.value.warning.maxValue = newValue[1];
      }
    }
  });

  const criticalMinSliderValue = computed({
    get: () => [form_currentContextSettings.value.critical.minValue, form_currentContextSettings.value.critical.maxValue] as number[],

    set: (newValue) => {
      if (form_currentContextSettings.value) {
        if (form_currentContextSettings.value.critical.minValue && newValue[0]) {
          form_currentContextSettings.value.critical.minValue = newValue[0];
          form_currentContextSettings.value.warning.maxValue = newValue[0] - 1
        }
        form_currentContextSettings.value.critical.maxValue = 100;
      }
    }
  });

  return {
    form_currentContextSettings,
    normalMaxSliderValue,
    warningRangeSliderValue,
    criticalMinSliderValue,
    saveContextSettings
  };
};
