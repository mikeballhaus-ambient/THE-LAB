<!-- Conditional import of PrimeVue components -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Card from 'primevue/card';
import Checkbox from 'primevue/checkbox';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import type { FormComponent } from '../../shared/types';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

// Component props
interface Props {
  component?: FormComponent;
  onUpdate?: (component: FormComponent) => void;
}

const props = withDefaults(defineProps<Props>(), {
  component: undefined,
});

const emit = defineEmits<(e: 'update', component: FormComponent) => void>();

// Generate unique IDs for accessibility
const { generateUniqueId } = useUniqueElementId();

// Local state for validation rules - using the new keyed array format
const isRequired = ref(false);
const minLength = ref<number | undefined>(undefined);
const maxLength = ref<number | undefined>(undefined);
const pattern = ref('');
const minValue = ref<number | undefined>(undefined);
const maxValue = ref<number | undefined>(undefined);

// Computed: get current component or empty template
const currentComponent = computed(() => props.component || { type: '', config: {}, validation: {} });

// Watch for component changes and sync local state
watch(
  () => props.component,
  (newComponent) => {
    if (!newComponent) return;
    
    const fieldKey = newComponent.fieldKey;
    const componentValidation = newComponent.validation || {};
    
    // Get validation rules for this field using the new keyed array format
    const fieldRules = Array.isArray(componentValidation[fieldKey]) ? componentValidation[fieldKey] : [];

    // Sync local state from the new keyed array format
    isRequired.value = fieldRules.some(r => r.rule === 'required');

    const minLengthRule = fieldRules.find(r => r.rule === 'minLength');
    minLength.value = minLengthRule?.pattern ? parseInt(minLengthRule.pattern, 10) : undefined;

    const maxLengthRule = fieldRules.find(r => r.rule === 'maxLength');
    maxLength.value = maxLengthRule?.pattern ? parseInt(maxLengthRule.pattern, 10) : undefined;

    // Find pattern rule (not minLength/maxLength)
    const patternRule = fieldRules.find(r => r.rule === 'pattern' && !['minLength', 'maxLength'].includes(r.rule));
    pattern.value = patternRule?.pattern || '';

    const minRule = fieldRules.find(r => r.rule === 'min');
    minValue.value = minRule?.pattern ? parseInt(minRule.pattern, 10) : undefined;

    const maxRule = fieldRules.find(r => r.rule === 'max');
    maxValue.value = maxRule?.pattern ? parseInt(maxRule.pattern, 10) : undefined;
  },
  { immediate: true }
);

// Toggle required field
function toggleRequired(): void {
  const newRequired = !isRequired.value;
  isRequired.value = newRequired;
  
  if (props.component && props.onUpdate && props.component.validation) {
    const currentFieldRules = Array.isArray(props.component.validation[props.component.fieldKey])
      ? props.component.validation[props.component.fieldKey]
      : [];

    let updatedRules: Array<{ rule: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'number'; pattern?: string; message?: string }> = [...currentFieldRules];

    if (newRequired) {
      // Add required rule if not exists
      if (!updatedRules.some(r => r.rule === 'required')) {
        updatedRules.push({ rule: 'required' });
      }
    } else {
      // Remove required rule
      updatedRules = updatedRules.filter(r => r.rule !== 'required');
    }

    emit('update', {
      ...props.component,
      validation: {
        [props.component.fieldKey]: updatedRules
      }
    });
  }
}

// Update min length
function updateMinLength(value: number | undefined): void {
  minLength.value = value;
  if (props.component && props.onUpdate && props.component.validation) {
    const currentFieldRules = Array.isArray(props.component.validation[props.component.fieldKey])
      ? props.component.validation[props.component.fieldKey]
      : [];

    const updatedRules: Array<{ rule: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'number'; pattern?: string; message?: string }> = [...currentFieldRules];

    // Update or add minLength rule
    const existingMinLengthIndex = updatedRules.findIndex(r => r.rule === 'minLength');
    if (existingMinLengthIndex >= 0) {
      updatedRules[existingMinLengthIndex].pattern = value?.toString();
    } else if (value !== undefined && value > 0) {
      updatedRules.push({ rule: 'minLength', pattern: value.toString() });
    }

    emit('update', {
      ...props.component,
      validation: {
        [props.component.fieldKey]: updatedRules
      }
    });
  }
}

// Update max length
function updateMaxLength(value: number | undefined): void {
  maxLength.value = value;
  if (props.component && props.onUpdate && props.component.validation) {
    const currentFieldRules = Array.isArray(props.component.validation[props.component.fieldKey])
      ? props.component.validation[props.component.fieldKey]
      : [];

    const updatedRules: Array<{ rule: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'number'; pattern?: string; message?: string }> = [...currentFieldRules];

    // Update or add maxLength rule
    const existingMaxLengthIndex = updatedRules.findIndex(r => r.rule === 'maxLength');
    if (existingMaxLengthIndex >= 0) {
      updatedRules[existingMaxLengthIndex].pattern = value?.toString();
    } else if (value !== undefined && value > 0) {
      updatedRules.push({ rule: 'maxLength', pattern: value.toString() });
    }

    emit('update', {
      ...props.component,
      validation: {
        [props.component.fieldKey]: updatedRules
      }
    });
  }
}

// Update pattern
function updatePattern(value: string): void {
  pattern.value = value;
  if (props.component && props.onUpdate && props.component.validation) {
    const currentFieldRules = Array.isArray(props.component.validation[props.component.fieldKey])
      ? props.component.validation[props.component.fieldKey]
      : [];

    const updatedRules: Array<{ rule: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'number'; pattern?: string; message?: string }> = [...currentFieldRules];

    // Find existing pattern rule (not minLength/maxLength) and update it
    const existingPatternIndex = updatedRules.findIndex(r => r.rule === 'pattern' && !['minLength', 'maxLength'].includes(r.rule));
    if (existingPatternIndex >= 0) {
      updatedRules[existingPatternIndex].pattern = value;
    } else if (value !== '') {
      updatedRules.push({ rule: 'pattern', pattern: value });
    }

    emit('update', {
      ...props.component,
      validation: {
        [props.component.fieldKey]: updatedRules
      }
    });
  }
}

// Update min value (for number fields)
function updateMinValue(value: number | undefined): void {
  minValue.value = value;
  if (props.component && props.onUpdate && props.component.validation) {
    const currentFieldRules = Array.isArray(props.component.validation[props.component.fieldKey])
      ? props.component.validation[props.component.fieldKey]
      : [];

    const updatedRules: Array<{ rule: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'number'; pattern?: string; message?: string }> = [...currentFieldRules];

    // Update or add min rule
    const existingMinIndex = updatedRules.findIndex(r => r.rule === 'min');
    if (existingMinIndex >= 0) {
      updatedRules[existingMinIndex].pattern = value?.toString();
    } else if (value !== undefined && value !== null) {
      updatedRules.push({ rule: 'min', pattern: value.toString() });
    }

    emit('update', {
      ...props.component,
      validation: {
        [props.component.fieldKey]: updatedRules
      }
    });
  }
}

// Update max value (for number fields)
function updateMaxValue(value: number | undefined): void {
  maxValue.value = value;
  if (props.component && props.onUpdate && props.component.validation) {
    const currentFieldRules = Array.isArray(props.component.validation[props.component.fieldKey])
      ? props.component.validation[props.component.fieldKey]
      : [];

    const updatedRules: Array<{ rule: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'number'; pattern?: string; message?: string }> = [...currentFieldRules];

    // Update or add max rule
    const existingMaxIndex = updatedRules.findIndex(r => r.rule === 'max');
    if (existingMaxIndex >= 0) {
      updatedRules[existingMaxIndex].pattern = value?.toString();
    } else if (value !== undefined && value !== null) {
      updatedRules.push({ rule: 'max', pattern: value.toString() });
    }

    emit('update', {
      ...props.component,
      validation: {
        [props.component.fieldKey]: updatedRules
      }
    });
  }
}

// Reset validation rules to defaults
function resetValidation(): void {
  isRequired.value = false;
  minLength.value = undefined;
  maxLength.value = undefined;
  pattern.value = '';
  minValue.value = undefined;
  maxValue.value = undefined;
  
  if (props.component && props.onUpdate && props.component.validation) {
    const emptyRules: Array<{ rule: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'number'; pattern?: string; message?: string }> = [];
    emit('update', { ...props.component, validation: { [props.component.fieldKey]: emptyRules } });
  }
}

// Template
</script>

<template>
  <Card class="shrink-0">
    <template #title>Validation Rules</template>
    
    <template #content>
      <div v-if="currentComponent.type" class="flex flex-col gap-2">
        <!-- Required checkbox -->
        <div class="flex items-center gap-2 mb-3">
          <Checkbox
            :model-value="isRequired"
            :binary="true"
            input-id="required-check"
            @update:model-value="toggleRequired"
            :pt="{ root: { id: generateUniqueId('required-check') } }"
          />
          <label :for="generateUniqueId('required-check-label')" :id="generateUniqueId('required-check-label')">Required Field</label>
        </div>

        <!-- Min Length Input -->
        <div class="mb-3">
          <InputNumber
            :model-value="minLength"
            mode="decimal"
            placeholder="Min Length"
            :pt="{ root: { id: generateUniqueId('min-length-input') } }"
            @update:model-value="updateMinLength"
          />
        </div>

        <!-- Max Length Input -->
        <div class="mb-3">
          <InputNumber
            :model-value="maxLength"
            mode="decimal"
            placeholder="Max Length"
            :pt="{ root: { id: generateUniqueId('max-length-input') } }"
            @update:model-value="updateMaxLength"
          />
        </div>

        <!-- Pattern Textarea -->
        <div class="mb-3">
          <label
            class="mb-1 block text-sm font-medium text-lab-general-text"
            :id="generateUniqueId('pattern-label')"
            for="pattern-textarea-input"
          >Custom Pattern (Regex)</label>
          <Textarea
            :model-value="pattern"
            placeholder="e.g., ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
            :rows="3"
            :pt="{ root: { id: generateUniqueId('pattern-textarea') } }"
            @update:model-value="updatePattern"
          />
          <small class="text-lab-general-text-muted text-xs mt-1 block">Leave empty to disable custom pattern</small>
        </div>

        <!-- Number Range (Min/Max) -->
        <div class="mb-3">
          <label
            class="mb-1 block text-sm font-medium text-lab-general-text"
            :id="generateUniqueId('number-min-label')"
            for="number-min-input"
          >Minimum Value</label>
          <InputNumber
            :model-value="minValue"
            mode="decimal"
            placeholder="Leave empty for no minimum"
            :pt="{ root: { id: generateUniqueId('number-min-input') } }"
            @update:model-value="updateMinValue"
          />
        </div>

        <div class="mb-3">
          <label
            class="mb-1 block text-sm font-medium text-lab-general-text"
            :id="generateUniqueId('number-max-label')"
            for="number-max-input"
          >Maximum Value</label>
          <InputNumber
            :model-value="maxValue"
            mode="decimal"
            placeholder="Leave empty for no maximum"
            :pt="{ root: { id: generateUniqueId('number-max-input') } }"
            @update:model-value="updateMaxValue"
          />
        </div>

        <!-- Reset Button -->
        <div class="mt-4 pt-3 border-t border-lab-general-border">
          <Button
            label="Reset to Defaults"
            severity="secondary"
            icon="pi pi-refresh"
            @click="resetValidation"
            :pt="{ root: { id: generateUniqueId('reset-validation-btn') } }"
          />
        </div>
      </div>

      <div v-else class="text-lab-general-text-muted text-center py-8">
        Select a component to configure validation rules
      </div>
    </template>
  </Card>
</template>
