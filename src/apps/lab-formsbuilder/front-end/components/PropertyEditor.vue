<template>
  <Card
    ref="cardRef"
    class="property-editor"
    pt:body="flex flex-col flex-1"
    pt:content="flex flex-col flex-1 p-0!"
  >
    <template #title>Properties</template>
    <template #content>
      <div v-if="selectedComponent && selectedComponent.type" class="flex flex-col flex-1 px-2 pt-1 pb-2">
        <div class="property-editor-tabs-shell rounded-lg border border-lab-general-border bg-lab-general-bg-muted/90 p-1 flex flex-col flex-1">
        <Tabs
          v-model:value="activePropertyTab"
          class="property-editor-tabs flex flex-col flex-1"
          :pt="{ root: { id: generateUniqueId('property-editor-tabs'), class: 'flex flex-col flex-1!' } }"
        >
          <TabList
            pt:root="shrink-0! w-full!"
            pt:tabList="flex! flex-wrap! items-end! justify-start! w-full! gap-0!"
          >
            <Tab
              value="basic"
              :class="propertyTabHeadClasses('basic')"
              :pt="{ root: { id: generateUniqueId('property-tab-basic') } }"
            >
              Basic
            </Tab>
            <Tab
              value="options"
              :class="propertyTabHeadClasses('options')"
              :pt="{ root: { id: generateUniqueId('property-tab-options') } }"
            >
              Options
            </Tab>
            <Tab
              value="validation"
              :class="propertyTabHeadClasses('validation')"
              :pt="{ root: { id: generateUniqueId('property-tab-validation') } }"
            >
              Validation
            </Tab>
            <Tab
              value="data"
              :class="propertyTabHeadClasses('data')"
              :pt="{ root: { id: generateUniqueId('property-tab-data') } }"
            >
              Data
            </Tab>
          </TabList>

          <TabPanels pt:root="flex flex-col flex-1 mt-1!">
            <!-- Basic -->
            <TabPanel value="basic" :pt="{ root: { id: generateUniqueId('property-panel-basic'), class: 'p-0!' } }">
              <div class="p-2">
                <div class="mb-3">
                  <label :id="generateUniqueId('label-label')" :for="generateUniqueId('label-input')">{{ basicTextPropertyLabel }}</label>
                  <InputText
                    v-model="labelValue"
                    placeholder="Enter label"
                    :pt="{ root: { id: generateUniqueId('label-input') } }"
                  />
                </div>

                <div class="mb-3">
                  <label :id="generateUniqueId('fieldKey-label')" :for="generateUniqueId('field-key-input')">Field Key</label>
                  <InputText
                    v-model="fieldKeyValue"
                    placeholder="e.g., name, email"
                    :pt="{ root: { id: generateUniqueId('field-key-input') } }"
                  />
                </div>

                <div v-if="showModelPropertySection" class="mb-3">
                  <label :id="generateUniqueId('model-property-label')" class="text-xs text-lab-general-text-muted block mb-1">
                    Model property
                  </label>
                  <Select
                    v-model="selectedModelProperty"
                    :options="modelPropertyOptions"
                    option-label="label"
                    option-value="value"
                    placeholder="Wire to connector field…"
                    show-clear
                    class="w-full"
                    :pt="{ root: { id: generateUniqueId('model-property-select') } }"
                    @update:model-value="onModelPropertySelected"
                  />
                  <small class="text-lab-general-text-muted text-xs">Maps field key, label, lookup, and control type when compatible.</small>
                </div>

                <div v-if="showHiddenFieldOption" class="mb-3 flex items-start gap-2">
                  <Checkbox
                    v-model="hiddenField"
                    binary
                    :pt="{ root: { id: generateUniqueId('hidden-field-check') } }"
                  />
                  <div>
                    <label
                      :id="generateUniqueId('hidden-field-label')"
                      :for="generateUniqueId('hidden-field-check')"
                      class="text-sm text-lab-general-text cursor-pointer"
                    >
                      Hidden field
                    </label>
                    <p class="text-lab-general-text-muted text-xs m-0 mt-0.5">
                      Not shown when the form runs; value is still submitted (e.g.
                      <code class="text-lab-general-text-muted">taskListId</code>, <code class="text-lab-general-text-muted">id</code>).
                    </p>
                  </div>
                </div>

                <div v-if="showParentContainerSection" class="mb-3">
                  <label :id="generateUniqueId('parent-container-label')" class="text-xs text-lab-general-text-muted block mb-1">
                    Parent container
                  </label>
                  <Select
                    v-model="parentContainerKey"
                    :options="parentContainerOptions"
                    option-label="label"
                    option-value="value"
                    placeholder="None (root grid)"
                    show-clear
                    class="w-full"
                    :pt="{ root: { id: generateUniqueId('parent-container-select') } }"
                  />
                </div>

                <template v-if="showGroupStyleSection">
                  <div class="text-xs font-semibold text-lab-general-text-muted uppercase tracking-wide mb-2 mt-2 pb-1 border-b border-lab-general-border">
                    Group styling
                  </div>
                  <div class="mb-2">
                    <label :id="generateUniqueId('group-bg-label')" class="text-xs text-lab-general-text-muted block mb-1">Background</label>
                    <InputText v-model="groupBackground" :pt="{ root: { id: generateUniqueId('group-bg-input') } }" />
                  </div>
                  <div class="mb-2">
                    <label :id="generateUniqueId('group-radius-label')" class="text-xs text-lab-general-text-muted block mb-1">Radius</label>
                    <InputText v-model="groupRadius" :pt="{ root: { id: generateUniqueId('group-radius-input') } }" />
                  </div>
                  <div class="mb-2">
                    <label :id="generateUniqueId('group-padding-label')" class="text-xs text-lab-general-text-muted block mb-1">Padding</label>
                    <InputText v-model="groupPadding" :pt="{ root: { id: generateUniqueId('group-padding-input') } }" />
                  </div>
                  <div class="mb-2">
                    <label :id="generateUniqueId('group-children-direction-label')" class="text-xs text-lab-general-text-muted block mb-1">
                      Child layout
                    </label>
                    <Select
                      v-model="groupChildrenDirection"
                      :options="groupDirectionOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                      :pt="{ root: { id: generateUniqueId('group-children-direction-select') } }"
                    />
                  </div>
                  <div v-if="showGroupInnerColumns" class="mb-2">
                    <label :id="generateUniqueId('group-inner-columns-label')" class="text-xs text-lab-general-text-muted block mb-1">
                      Columns before wrap
                    </label>
                    <Select
                      v-model="groupInnerColumns"
                      :options="groupInnerColumnSelectOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                      :pt="{ root: { id: generateUniqueId('group-inner-columns-select') } }"
                    />
                  </div>
                </template>

                <template v-if="showTabsSection">
                  <div class="text-xs font-semibold text-lab-general-text-muted uppercase tracking-wide mb-2 mt-2 pb-1 border-b border-lab-general-border">
                    Tab panels
                  </div>
                  <p class="text-lab-general-text-muted text-xs mb-2 m-0">
                    Switch to a tab on the canvas, then drop fields into that tab’s area. Or drop while the pointer is over a tab panel.
                  </p>
                  <div
                    v-for="(_, tabIndex) in tabTitles"
                    :key="`tab-title-row-${tabIndex}`"
                    class="mb-2 flex gap-2 items-center"
                  >
                    <InputText
                      v-model="tabTitles[tabIndex]"
                      class="flex-1 min-w-0"
                      :placeholder="`Tab ${tabIndex + 1}`"
                      :pt="{ root: { id: generateUniqueId(`tab-title-${tabIndex}`) } }"
                    />
                    <Button
                      type="button"
                      icon="pi pi-trash"
                      severity="danger"
                      text
                      size="small"
                      :disabled="tabTitles.length <= 1"
                      :aria-label="`Remove tab ${tabIndex + 1}`"
                      :pt="{ root: { id: generateUniqueId(`tab-remove-${tabIndex}`) } }"
                      @click="removeTab(tabIndex)"
                    />
                  </div>
                  <Button
                    type="button"
                    label="Add tab"
                    icon="pi pi-plus"
                    size="small"
                    severity="secondary"
                    class="w-full"
                    :pt="{ root: { id: generateUniqueId('tab-add-btn') } }"
                    @click="addTab"
                  />
                </template>

                <template v-if="showLabelStyleSection">
                  <div class="text-xs font-semibold text-lab-general-text-muted uppercase tracking-wide mb-2 mt-2 pb-1 border-b border-lab-general-border">
                    Label styling
                  </div>
                  <p class="text-lab-general-text-muted text-xs mb-2 m-0">Uses Tailwind utility classes only (no inline CSS).</p>
                  <div class="mb-2">
                    <label :id="generateUniqueId('label-size-label')" class="text-xs text-lab-general-text-muted block mb-1">Size</label>
                    <Select
                      v-model="labelTextSize"
                      :options="labelTextSizeOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                      :pt="{ root: { id: generateUniqueId('label-size-select') } }"
                    />
                  </div>
                  <div class="mb-2">
                    <label :id="generateUniqueId('label-color-label')" class="text-xs text-lab-general-text-muted block mb-1">Color</label>
                    <Select
                      v-model="labelTextColor"
                      :options="labelTextColorOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                      :pt="{ root: { id: generateUniqueId('label-color-select') } }"
                    />
                  </div>
                  <div class="mb-2">
                    <label :id="generateUniqueId('label-weight-label')" class="text-xs text-lab-general-text-muted block mb-1">Weight</label>
                    <Select
                      v-model="labelFontWeight"
                      :options="labelFontWeightOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                      :pt="{ root: { id: generateUniqueId('label-weight-select') } }"
                    />
                  </div>
                  <div class="mb-2">
                    <label :id="generateUniqueId('label-align-label')" class="text-xs text-lab-general-text-muted block mb-1">Alignment</label>
                    <Select
                      v-model="labelTextAlign"
                      :options="labelTextAlignOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                      :pt="{ root: { id: generateUniqueId('label-align-select') } }"
                    />
                  </div>
                  <div class="mb-2">
                    <label :id="generateUniqueId('label-custom-classes-label')" class="text-xs text-lab-general-text-muted block mb-1">Extra classes</label>
                    <InputText
                      v-model="labelCustomClasses"
                      placeholder="e.g. uppercase tracking-wide"
                      class="w-full"
                      :pt="{ root: { id: generateUniqueId('label-custom-classes-input') } }"
                    />
                  </div>
                </template>

                <div class="text-xs font-semibold text-lab-general-text-muted uppercase tracking-wide mb-2 mt-4 pb-1 border-b border-lab-general-border">
                  Layout
                </div>
                <Button
                  label="Field layout"
                  icon="pi pi-objects-column"
                  severity="secondary"
                  outlined
                  class="w-full mb-2"
                  :pt="{ root: { id: generateUniqueId('configure-layout-btn') } }"
                  @click="emit('configure-layout')"
                />
                <Button
                  label="Column span"
                  icon="pi pi-arrows-h"
                  severity="secondary"
                  outlined
                  class="w-full"
                  :pt="{ root: { id: generateUniqueId('configure-span-btn') } }"
                  @click="emit('configure-span')"
                />
              </div>
            </TabPanel>

            <!-- Options -->
            <TabPanel value="options" :pt="{ root: { id: generateUniqueId('property-panel-options'), class: 'p-0!' } }">
              <div class="p-2">
                <template v-if="showDatePickerOptionsSection">
                  <div class="mb-3 flex items-start gap-2">
                    <Checkbox
                      v-model="dateOnlyField"
                      binary
                      :pt="{ root: { id: generateUniqueId('date-only-check') } }"
                    />
                    <div>
                      <label
                        :id="generateUniqueId('date-only-label')"
                        :for="generateUniqueId('date-only-check')"
                        class="text-sm text-lab-general-text cursor-pointer"
                      >
                        Date only (no time)
                      </label>
                      <p class="text-lab-general-text-muted text-xs m-0 mt-0.5">
                        Unchecked by default: date and time with local
                        <code class="text-lab-general-text-muted">YYYY-MM-DDTHH:mm:ss</code> on save. Check for calendar-day fields only.
                      </p>
                    </div>
                  </div>
                </template>
                <template v-else-if="showOptionsSection">
                  <p class="text-lab-general-text-muted text-xs mb-2 m-0">
                    Label is shown to users; value is stored on submit.
                  </p>
                  <div
                    v-for="(row, optionIndex) in optionRows"
                    :key="`option-row-${optionIndex}`"
                    class="mb-2 rounded-lg border border-lab-general-border bg-lab-general-bg-muted/50 p-2"
                  >
                    <div class="mb-2">
                      <label
                        :id="generateUniqueId(`option-label-label-${optionIndex}`)"
                        class="text-xs text-lab-general-text-muted block mb-1"
                      >Label</label>
                      <InputText
                        v-model="optionRows[optionIndex].label"
                        placeholder="Display text"
                        class="w-full"
                        :pt="{ root: { id: generateUniqueId(`option-label-${optionIndex}`) } }"
                      />
                    </div>
                    <div class="mb-2">
                      <label
                        :id="generateUniqueId(`option-value-label-${optionIndex}`)"
                        class="text-xs text-lab-general-text-muted block mb-1"
                      >Value</label>
                      <InputText
                        v-model="optionRows[optionIndex].value"
                        placeholder="Stored value"
                        class="w-full"
                        :pt="{ root: { id: generateUniqueId(`option-value-${optionIndex}`) } }"
                      />
                    </div>
                    <Button
                      type="button"
                      label="Remove"
                      icon="pi pi-trash"
                      severity="danger"
                      text
                      size="small"
                      :disabled="optionRows.length <= 1"
                      :pt="{ root: { id: generateUniqueId(`option-remove-${optionIndex}`) } }"
                      @click="removeOptionRow(optionIndex)"
                    />
                  </div>
                  <Button
                    type="button"
                    label="Add option"
                    icon="pi pi-plus"
                    size="small"
                    severity="secondary"
                    class="w-full"
                    :pt="{ root: { id: generateUniqueId('option-add-btn') } }"
                    @click="addOptionRow"
                  />
                </template>
                <p v-else class="text-lab-general-text-muted text-sm m-0 py-4 text-center">
                  This control does not use manual options. Connector lookups are configured on the Data tab.
                </p>
              </div>
            </TabPanel>

            <!-- Validation -->
            <TabPanel value="validation" :pt="{ root: { id: generateUniqueId('property-panel-validation'), class: 'p-0!' } }">
              <div class="p-2">
                <template v-if="showValidationSection">
                  <p v-if="validationHint" class="text-lab-general-text-muted text-xs mb-2 m-0">{{ validationHint }}</p>
                  <div class="bg-lab-general-bg-muted rounded-lg p-2.5 text-sm">
                    <div v-if="showRequired" class="mb-2 flex items-center gap-2">
                      <Checkbox
                        :model-value="isRequired"
                        :binary="true"
                        @update:model-value="onRequiredChange"
                        :pt="{ root: { id: generateUniqueId('required-check') } }"
                      />
                      <label :id="generateUniqueId('required-check-label')">Required</label>
                    </div>

                    <template v-if="showTextLength">
                      <div class="mb-2">
                        <label :id="generateUniqueId('min-length-label')" class="text-xs text-lab-general-text-muted block mb-1">Min length</label>
                        <InputNumber
                          v-model="minLength"
                          :min="0"
                          placeholder="Optional"
                          :pt="{ root: { id: generateUniqueId('min-length-input') } }"
                        />
                      </div>
                      <div class="mb-2">
                        <label :id="generateUniqueId('max-length-label')" class="text-xs text-lab-general-text-muted block mb-1">Max length</label>
                        <InputNumber
                          v-model="maxLength"
                          :min="0"
                          placeholder="Optional"
                          :pt="{ root: { id: generateUniqueId('max-length-input') } }"
                        />
                      </div>
                    </template>

                    <div v-if="showPattern" class="mb-2">
                      <label :id="generateUniqueId('pattern-label-label')">Custom pattern (regex)</label>
                      <Textarea
                        v-model="pattern"
                        placeholder="e.g., ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                        :rows="3"
                        :pt="{ root: { id: generateUniqueId('pattern-textarea') } }"
                      />
                      <small class="text-lab-general-text-muted text-xs mt-1 block">Leave empty to disable</small>
                    </div>

                    <div v-if="showEmail" class="mb-2 flex items-center gap-2">
                      <Checkbox
                        :model-value="isEmail"
                        :binary="true"
                        @update:model-value="onEmailChange"
                        :pt="{ root: { id: generateUniqueId('email-format-check') } }"
                      />
                      <label :id="generateUniqueId('email-format-label')">Email format</label>
                    </div>

                    <template v-if="showNumericRange">
                      <div class="mb-2">
                        <label :id="generateUniqueId('min-number-label')" class="text-xs text-lab-general-text-muted block mb-1">Minimum value</label>
                        <InputNumber
                          v-model="minValue"
                          placeholder="Optional"
                          :pt="{ root: { id: generateUniqueId('min-number-input') } }"
                        />
                      </div>
                      <div class="mb-2">
                        <label :id="generateUniqueId('max-number-label')" class="text-xs text-lab-general-text-muted block mb-1">Maximum value</label>
                        <InputNumber
                          v-model="maxValue"
                          placeholder="Optional"
                          :pt="{ root: { id: generateUniqueId('max-number-input') } }"
                        />
                      </div>
                    </template>
                  </div>
                </template>
                <p v-else class="text-lab-general-text-muted text-sm m-0 py-4 text-center">
                  Validation is not available for this control type.
                </p>
              </div>
            </TabPanel>

            <!-- Data -->
            <TabPanel value="data" :pt="{ root: { id: generateUniqueId('property-panel-data'), class: 'p-0!' } }">
              <div class="p-2">
                <template v-if="showDataFetchSection">
                  <DataFetchConfig
                    embedded
                    :component="componentForDataFetch ?? undefined"
                    :linked-connector="linkedConnector"
                    :connector-lookups="connectorLookups"
                    @lookup-options="onLookupOptionsFromTest"
                  />
                </template>
                <p v-else-if="!linkedConnector" class="text-lab-general-text-muted text-sm m-0 py-4 text-center">
                  Link the form to a data connector to configure lookups and fetch.
                </p>
                <p v-else class="text-lab-general-text-muted text-sm m-0 py-4 text-center">
                  No connector lookup matches this field. Wire a model property on Basic or use a field key that matches a lookup.
                </p>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
        </div>

        <div class="shrink-0 border-t border-lab-general-border p-2 mt-2 bg-lab-general-bg-muted/80">
          <Button
            label="Update Component"
            icon="pi pi-check"
            class="w-full"
            :pt="{ root: { id: generateUniqueId('update-btn') } }"
            @click="handleUpdate"
          />
        </div>
      </div>
      <div v-else class="flex flex-col items-center justify-center h-50 gap-2 text-lab-general-text-muted text-sm p-4">
        <i class="pi pi-info-circle text-4xl mb-1"></i>
        <p>Select a component to edit its properties</p>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import DataFetchConfig from './DataFetchConfig.vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { DataConnector, FormComponent, ValidationRules, GroupContainerStyle, ContainerConfig } from '../../shared/types';
import { defaultContainerConfig, isContainerType, resolveGroupChildrenDirection } from '../utils/container-types';
import {
  listModelPropertyOptions,
  wireComponentToModelProperty,
} from '../utils/model-property-wiring';
import {
  supportsValidationRule,
  validationHintForType,
  allowedValidationRules,
  type ValidationRuleKind,
} from '../utils/component-validation';
import { resolveEffectiveDataFetch } from '../utils/data-fetch-utils';
import { groupInnerColumnOptions, clampGroupInnerColumns } from '@/shared/forms/group-container-layout';
import {
  hydrateComponentWithLookupOptions,
  type LookupOption,
} from '../utils/lookup-options';
import {
  DEFAULT_LABEL_DISPLAY_STYLE,
  LABEL_FONT_WEIGHT_OPTIONS,
  LABEL_TEXT_ALIGN_OPTIONS,
  LABEL_TEXT_COLOR_OPTIONS,
  LABEL_TEXT_SIZE_OPTIONS,
  normalizeLabelDisplayStyle,
  isStaticLabelComponentType,
  type LabelDisplayStyle,
} from '@/shared/forms/label-display-style';
import {
  buildFieldOptionsFromRows,
  optionRowsFromComponent,
  supportsManualFieldOptions,
  type FieldOptionRow,
} from '../utils/field-options';

const { generateUniqueId } = useUniqueElementId();

const props = defineProps<{
  selectedComponent: FormComponent | null;
  linkedConnector?: DataConnector | null;
  allComponents?: FormComponent[];
}>();

const emit = defineEmits<{
  (e: 'update', component: FormComponent): void;
  (e: 'configure-layout'): void;
  (e: 'configure-span'): void;
}>();

type FieldRule = ValidationRules[string][number];

const labelValue = ref('');
const fieldKeyValue = ref('');
const hiddenField = ref(false);
const isRequired = ref(false);
const isEmail = ref(false);
const minLength = ref<number | null>(null);
const maxLength = ref<number | null>(null);
const pattern = ref('');
const minValue = ref<number | null>(null);
const maxValue = ref<number | null>(null);
const selectedModelProperty = ref<string | null>(null);
const parentContainerKey = ref<string | null>(null);
const groupBackground = ref('');
const groupRadius = ref('');
const groupPadding = ref('');
const groupChildrenDirection = ref<'vertical' | 'horizontal'>('vertical');
const groupInnerColumns = ref(2);
const tabTitles = ref<string[]>([]);
const optionRows = ref<FieldOptionRow[]>([]);
const labelTextSize = ref(DEFAULT_LABEL_DISPLAY_STYLE.textSize ?? 'text-base');
const labelTextColor = ref(DEFAULT_LABEL_DISPLAY_STYLE.textColor ?? 'text-lab-general-text');
const labelFontWeight = ref(DEFAULT_LABEL_DISPLAY_STYLE.fontWeight ?? 'font-medium');
const labelTextAlign = ref(DEFAULT_LABEL_DISPLAY_STYLE.textAlign ?? 'text-left');
const labelCustomClasses = ref('');
const dateOnlyField = ref(false);
const activePropertyTab = ref<'basic' | 'options' | 'validation' | 'data'>('basic');

type PropertyEditorTabId = 'basic' | 'options' | 'validation' | 'data';

/** Match designer Tabs container: bottom border accent on active tab. */
function propertyTabHeadClasses(tabId: PropertyEditorTabId): Record<string, boolean> {
  const active = activePropertyTab.value === tabId;
  return {
    'border-t-0! border-b-2! px-3! py-2! whitespace-nowrap! text-xs! rounded-t!': true,
    'text-lab-general-text! bg-lab-general-bg-muted! border-lab-button-border-hover!': active,
    'text-lab-general-text-muted! bg-lab-general-bg-muted! border-lab-general-border! hover:text-lab-general-text! hover:bg-lab-general-bg-muted! hover:border-lab-button-border-hover!':
      !active,
  };
}

const labelTextSizeOptions = [...LABEL_TEXT_SIZE_OPTIONS];
const labelTextColorOptions = [...LABEL_TEXT_COLOR_OPTIONS];
const labelFontWeightOptions = [...LABEL_FONT_WEIGHT_OPTIONS];
const labelTextAlignOptions = [...LABEL_TEXT_ALIGN_OPTIONS];

const componentType = computed(() => props.selectedComponent?.type || '');

const basicTextPropertyLabel = computed(() =>
  isStaticLabelComponentType(componentType.value) ? 'Text' : 'Label',
);

const showLabelStyleSection = computed(() => isStaticLabelComponentType(componentType.value));

const showValidationSection = computed(
  () => allowedValidationRules(componentType.value).length > 0,
);

const isContainer = computed(() => isContainerType(componentType.value));

const modelPropertyOptions = computed(() => listModelPropertyOptions(props.linkedConnector));

const showModelPropertySection = computed(
  () => Boolean(props.linkedConnector) && !isContainer.value && !isStaticLabelComponentType(componentType.value),
);

const showHiddenFieldOption = computed(
  () => !isContainer.value && !isStaticLabelComponentType(componentType.value),
);

const showParentContainerSection = computed(() => !isContainer.value);

const parentContainerOptions = computed(() =>
  (props.allComponents ?? [])
    .filter(c => isContainerType(c.type) && c.fieldKey !== props.selectedComponent?.fieldKey)
    .map(c => ({ label: c.label || c.fieldKey, value: c.fieldKey })),
);

const showGroupStyleSection = computed(() => props.selectedComponent?.type === 'Group');

const showTabsSection = computed(() => props.selectedComponent?.type === 'Tabs');

const showOptionsSection = computed(() => supportsManualFieldOptions(componentType.value));

const showDatePickerOptionsSection = computed(() => componentType.value === 'DatePicker');

const groupDirectionOptions = [
  { label: 'Vertical (stacked)', value: 'vertical' as const },
  { label: 'Horizontal (wrap in columns)', value: 'horizontal' as const },
];

const groupInnerColumnSelectOptions = groupInnerColumnOptions();

const showGroupInnerColumns = computed(() => groupChildrenDirection.value === 'horizontal');

const connectorLookups = computed(
  () => props.linkedConnector?.endpoints?.lookups ?? [],
);

/** Draft field key while editing (lookup match updates before Save). */
const componentForDataFetch = computed((): FormComponent | null => {
  if (!props.selectedComponent) {
    return null;
  }
  const key = fieldKeyValue.value.trim() || props.selectedComponent.fieldKey;
  return { ...props.selectedComponent, fieldKey: key };
});

const showDataFetchSection = computed(() =>
  !isStaticLabelComponentType(componentType.value)
  && Boolean(resolveEffectiveDataFetch(componentForDataFetch.value, connectorLookups.value)),
);

const validationHint = computed(() => validationHintForType(componentType.value));

const showRequired = computed(() => supportsValidationRule(componentType.value, 'required'));
const showTextLength = computed(() =>
  supportsValidationRule(componentType.value, 'minLength')
  || supportsValidationRule(componentType.value, 'maxLength'),
);
const showPattern = computed(() => supportsValidationRule(componentType.value, 'pattern'));
const showEmail = computed(() => supportsValidationRule(componentType.value, 'email'));
const showNumericRange = computed(() =>
  supportsValidationRule(componentType.value, 'min')
  || supportsValidationRule(componentType.value, 'max'),
);

function getFieldRules(component: FormComponent): FieldRule[] {
  const validation = component.validation ?? {};
  const rules = validation[component.fieldKey];
  return Array.isArray(rules) ? [...rules] : [];
}

function syncFromComponent(newComponent: FormComponent): void {
  labelValue.value = newComponent.label || '';
  fieldKeyValue.value = newComponent.fieldKey || '';
  hiddenField.value = newComponent.hidden === true;

  const fieldRules = getFieldRules(newComponent);

  isRequired.value = newComponent.required === true || fieldRules.some(r => r.rule === 'required');
  isEmail.value = fieldRules.some(r => r.rule === 'email');

  const minLengthRule = fieldRules.find(r => r.rule === 'minLength');
  minLength.value = minLengthRule?.pattern ? parseInt(minLengthRule.pattern, 10) : null;

  const maxLengthRule = fieldRules.find(r => r.rule === 'maxLength');
  maxLength.value = maxLengthRule?.pattern ? parseInt(maxLengthRule.pattern, 10) : null;

  const patternRule = fieldRules.find(r => r.rule === 'pattern');
  pattern.value = patternRule?.pattern || '';

  const minRule = fieldRules.find(r => r.rule === 'min');
  minValue.value = minRule?.pattern != null && minRule.pattern !== ''
    ? Number(minRule.pattern)
    : null;

  const maxRule = fieldRules.find(r => r.rule === 'max');
  maxValue.value = maxRule?.pattern != null && maxRule.pattern !== ''
    ? Number(maxRule.pattern)
    : null;

  selectedModelProperty.value = newComponent.modelProperty ?? newComponent.fieldKey ?? null;
  parentContainerKey.value = newComponent.parentContainerKey ?? null;
  const gs = newComponent.container?.groupStyle;
  groupBackground.value = gs?.backgroundColor ?? '';
  groupRadius.value = gs?.borderRadius ?? '';
  groupPadding.value = gs?.padding ?? '';
  groupChildrenDirection.value = resolveGroupChildrenDirection(gs);
  groupInnerColumns.value = gs?.innerColumns ?? 2;

  if (newComponent.type === 'Tabs' && newComponent.container?.kind === 'tabs') {
    tabTitles.value = (newComponent.container.tabs ?? []).map(t => t.title);
  } else {
    tabTitles.value = [];
  }

  if (supportsManualFieldOptions(newComponent.type)) {
    optionRows.value = optionRowsFromComponent(newComponent.options);
  } else {
    optionRows.value = [];
  }

  const display = normalizeLabelDisplayStyle(newComponent.labelDisplay);
  labelTextSize.value = display.textSize ?? DEFAULT_LABEL_DISPLAY_STYLE.textSize!;
  labelTextColor.value = display.textColor ?? DEFAULT_LABEL_DISPLAY_STYLE.textColor!;
  labelFontWeight.value = display.fontWeight ?? DEFAULT_LABEL_DISPLAY_STYLE.fontWeight!;
  labelTextAlign.value = display.textAlign ?? DEFAULT_LABEL_DISPLAY_STYLE.textAlign!;
  labelCustomClasses.value = display.customClasses ?? '';
  dateOnlyField.value = newComponent.type === 'DatePicker' && newComponent.dateOnly === true;
}

function buildLabelDisplayFromDraft(): LabelDisplayStyle {
  return {
    textSize: labelTextSize.value,
    textColor: labelTextColor.value,
    fontWeight: labelFontWeight.value,
    textAlign: labelTextAlign.value,
    customClasses: labelCustomClasses.value.trim() || undefined,
  };
}

watch(
  () => props.selectedComponent,
  (newComponent) => {
    if (!newComponent) return;
    activePropertyTab.value = 'basic';
    syncFromComponent(newComponent);
  },
  { immediate: true },
);

function buildGroupStyleFromDraft(base?: GroupContainerStyle): GroupContainerStyle {
  return {
    ...(base ?? {}),
    backgroundColor: groupBackground.value || undefined,
    borderRadius: groupRadius.value || undefined,
    padding: groupPadding.value || undefined,
    childrenDirection: groupChildrenDirection.value,
    innerColumns:
      groupChildrenDirection.value === 'horizontal'
        ? clampGroupInnerColumns(groupInnerColumns.value)
        : undefined,
    flexDirection: groupChildrenDirection.value === 'horizontal' ? 'row' : 'column',
    innerLayout: groupChildrenDirection.value === 'horizontal' ? 'grid' : 'flex',
  };
}

function buildTabsContainerConfig(): ContainerConfig {
  const comp = props.selectedComponent;
  const existing =
    comp?.container?.kind === 'tabs' ? comp.container : defaultContainerConfig('tabs');
  const priorTabs = existing.tabs ?? [{ title: 'Tab 1', childFieldKeys: [] }];
  const titles = tabTitles.value.length > 0 ? tabTitles.value : priorTabs.map(t => t.title);

  const tabs = titles.map((title, index) => {
    const prior = priorTabs[index];
    return {
      title: title.trim() || `Tab ${index + 1}`,
      childFieldKeys: prior?.childFieldKeys ? [...prior.childFieldKeys] : [],
    };
  });

  return { kind: 'tabs', tabs };
}

function applyTabsContainerToCanvas(comp: FormComponent): void {
  if (comp.type !== 'Tabs') {
    return;
  }
  comp.container = buildTabsContainerConfig();
}

function addTab(): void {
  tabTitles.value = [...tabTitles.value, `Tab ${tabTitles.value.length + 1}`];
  syncLivePreviewToCanvas();
}

function removeTab(index: number): void {
  if (tabTitles.value.length <= 1 || index < 0 || index >= tabTitles.value.length) {
    return;
  }
  const comp = props.selectedComponent;
  if (comp?.container?.kind === 'tabs') {
    const removedKeys = new Set(comp.container.tabs?.[index]?.childFieldKeys ?? []);
    const first = comp.container.tabs?.[0];
    if (first && removedKeys.size > 0) {
      first.childFieldKeys = [...new Set([...(first.childFieldKeys ?? []), ...removedKeys])];
    }
    comp.container.tabs?.splice(index, 1);
  }
  tabTitles.value = tabTitles.value.filter((_, i) => i !== index);
  syncLivePreviewToCanvas();
}

function addOptionRow(): void {
  const n = optionRows.value.length + 1;
  optionRows.value = [...optionRows.value, { label: `Option ${n}`, value: `option-${n}` }];
  syncLivePreviewToCanvas();
}

function removeOptionRow(index: number): void {
  if (optionRows.value.length <= 1 || index < 0 || index >= optionRows.value.length) {
    return;
  }
  optionRows.value = optionRows.value.filter((_, i) => i !== index);
  syncLivePreviewToCanvas();
}

/** Push draft basic + group styling onto the canvas component (same object ref as schema). */
function syncLivePreviewToCanvas(): void {
  const comp = props.selectedComponent;
  if (!comp) {
    return;
  }

  comp.label = labelValue.value;
  comp.required = isRequired.value;
  comp.hidden = hiddenField.value ? true : undefined;

  const fieldRules = buildFieldRules(comp.type);
  comp.validation = {
    ...(comp.validation ?? {}),
    [comp.fieldKey]: fieldRules,
  };

  if (comp.type === 'Group') {
    const existing = comp.container?.kind === 'group' ? comp.container : defaultContainerConfig('group');
    comp.container = {
      kind: 'group',
      groupStyle: buildGroupStyleFromDraft(existing.groupStyle),
    };
    return;
  }

  if (comp.type === 'Tabs') {
    applyTabsContainerToCanvas(comp);
  }

  if (supportsManualFieldOptions(comp.type)) {
    comp.options = buildFieldOptionsFromRows(optionRows.value);
  }

  if (isStaticLabelComponentType(comp.type)) {
    comp.labelDisplay = buildLabelDisplayFromDraft();
  }

  if (comp.type === 'DatePicker') {
    comp.dateOnly = dateOnlyField.value ? true : undefined;
  }
}

watch(
  [
    labelValue,
    hiddenField,
    isRequired,
    minLength,
    maxLength,
    pattern,
    minValue,
    maxValue,
    isEmail,
    labelTextSize,
    labelTextColor,
    labelFontWeight,
    labelTextAlign,
    labelCustomClasses,
    groupBackground,
    groupRadius,
    groupPadding,
    groupChildrenDirection,
    groupInnerColumns,
    tabTitles,
    optionRows,
    dateOnlyField,
  ],
  () => {
    syncLivePreviewToCanvas();
  },
  { deep: true },
);

function onRequiredChange(value: boolean): void {
  isRequired.value = value;
}

function onEmailChange(value: boolean): void {
  isEmail.value = value;
}

function buildFieldRules(type: string): FieldRule[] {
  const rules: FieldRule[] = [];

  const add = (rule: ValidationRuleKind, pattern?: string) => {
    if (!supportsValidationRule(type, rule)) {
      return;
    }
    if (rule === 'required') {
      rules.push({ rule: 'required' });
      return;
    }
    if (rule === 'email') {
      rules.push({ rule: 'email' });
      return;
    }
    if (pattern !== undefined && pattern !== '') {
      rules.push({ rule, pattern });
    }
  };

  if (isRequired.value) {
    add('required');
  }
  if (isEmail.value) {
    add('email');
  }

  if (minLength.value != null && minLength.value > 0) {
    add('minLength', String(minLength.value));
  }
  if (maxLength.value != null && maxLength.value > 0) {
    add('maxLength', String(maxLength.value));
  }
  if (pattern.value.trim() !== '') {
    add('pattern', pattern.value.trim());
  }
  if (minValue.value != null && !Number.isNaN(minValue.value)) {
    add('min', String(minValue.value));
  }
  if (maxValue.value != null && !Number.isNaN(maxValue.value)) {
    add('max', String(maxValue.value));
  }

  return rules;
}

function onModelPropertySelected(propertyName: string | null): void {
  if (!props.selectedComponent || !props.linkedConnector || !propertyName) {
    return;
  }
  void (async () => {
    const wired = wireComponentToModelProperty(
      props.selectedComponent!,
      propertyName,
      props.linkedConnector!,
    );
    labelValue.value = wired.label;
    fieldKeyValue.value = wired.fieldKey;
    selectedModelProperty.value = propertyName;
    await commitComponentUpdate(wired);
  })();
}

function onLookupOptionsFromTest(options: LookupOption[]): void {
  if (!props.selectedComponent || options.length === 0) {
    return;
  }
  const built = buildUpdatedComponentFromForm();
  if (!built) {
    return;
  }
  const next = applyEffectiveDataFetch({ ...built, options });
  emit('update', next);
}

function buildUpdatedComponentFromForm(): FormComponent | null {
  if (!props.selectedComponent) {
    return null;
  }

  const type = componentType.value;
  const newFieldKey = fieldKeyValue.value.trim() || props.selectedComponent.fieldKey;
  const fieldRules = buildFieldRules(type);

  const validation: ValidationRules = { ...(props.selectedComponent.validation ?? {}) };
  const oldFieldKey = props.selectedComponent.fieldKey;
  if (oldFieldKey !== newFieldKey) {
    delete validation[oldFieldKey];
  }
  validation[newFieldKey] = fieldRules;

  const updatedComponent: FormComponent = {
    ...props.selectedComponent,
    label: labelValue.value,
    fieldKey: newFieldKey,
    required: isRequired.value,
    validation,
    modelProperty: selectedModelProperty.value ?? undefined,
    parentContainerKey: parentContainerKey.value || undefined,
    hidden: hiddenField.value ? true : undefined,
  };

  if (props.selectedComponent.type === 'Group') {
    updatedComponent.container = {
      kind: 'group',
      groupStyle: buildGroupStyleFromDraft(props.selectedComponent.container?.groupStyle),
    };
  }

  if (props.selectedComponent.type === 'Tabs') {
    updatedComponent.container = buildTabsContainerConfig();
  }

  if (supportsManualFieldOptions(type)) {
    updatedComponent.options = buildFieldOptionsFromRows(optionRows.value);
  }

  if (isStaticLabelComponentType(type)) {
    updatedComponent.labelDisplay = buildLabelDisplayFromDraft();
  }

  if (type === 'DatePicker') {
    updatedComponent.dateOnly = dateOnlyField.value ? true : undefined;
  }

  return updatedComponent;
}

async function commitComponentUpdate(component: FormComponent): Promise<void> {
  let next = applyEffectiveDataFetch(component);
  if (props.linkedConnector) {
    next = await hydrateComponentWithLookupOptions(next, props.linkedConnector);
  }
  emit('update', next);
}

function applyEffectiveDataFetch(component: FormComponent): FormComponent {
  const effective = resolveEffectiveDataFetch(component, connectorLookups.value);
  if (!effective?.forProperty && !effective?.endpoint?.url) {
    return component;
  }
  return {
    ...component,
    dataFetch: {
      forProperty: effective.forProperty,
      endpoint: effective.endpoint,
    },
  };
}

function handleUpdate(): void {
  const built = buildUpdatedComponentFromForm();
  if (!built) {
    return;
  }
  void commitComponentUpdate(built);
}
</script>

<style scoped>
.property-editor-tabs-shell :deep([data-pc-section='tablist']) {
  border-bottom: 1px solid var(--lab-general-border);
}
</style>
