import { ref } from 'vue';
import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';

const COMPONENT_METADATA: Record<string, Omit<FormComponent, 'component' | 'fieldKey'>> = {
  InputText: {
    type: 'InputText',
    label: 'Text Input',
    icon: 'pi pi-key',
  },
  Select: {
    type: 'Select',
    label: 'Select',
    icon: 'pi pi-filter',
  },
  Checkbox: {
    type: 'Checkbox',
    label: 'Checkbox',
    icon: 'pi pi-check-square',
  },
  RadioButton: {
    type: 'RadioButton',
    label: 'Radio Button',
    icon: 'pi pi-circle',
  },
  DatePicker: {
    type: 'DatePicker',
    label: 'Date Picker',
    icon: 'pi pi-calendar',
  },
  Textarea: {
    type: 'Textarea',
    label: 'Textarea',
    icon: 'pi pi-align-left',
  },
  NumberInput: {
    type: 'NumberInput',
    label: 'Number',
    icon: 'pi pi-calculator',
  },
  MultiSelect: {
    type: 'MultiSelect',
    label: 'Multi Select',
    icon: 'pi pi-list',
  },
  Label: {
    type: 'Label',
    label: 'Label',
    icon: 'pi pi-bookmark',
  },
  Group: {
    type: 'Group',
    label: 'Group',
    icon: 'pi pi-window-maximize',
  },
  Tabs: {
    type: 'Tabs',
    label: 'Tabs',
    icon: 'pi pi-table',
  },
};

export const FORM_BUILDER_CONTROL_TYPES = Object.keys(COMPONENT_METADATA);

/**
 * Metadata for palette / new field defaults. Runtime rendering uses @/shared/forms (FormField).
 */
export async function getComponentDefinition(type: string): Promise<Record<string, unknown> | undefined> {
  const metadata = COMPONENT_METADATA[type];
  if (!metadata) {
    return undefined;
  }
  return {
    fieldKey: '',
    type: metadata.type,
    label: metadata.label,
    icon: metadata.icon,
  };
}

export function useFormComponents() {
  const componentRegistry = ref<Record<string, FormComponent>>({});

  function registerComponent(type: string): void {
    if (!COMPONENT_METADATA[type]) {
      console.warn(`Unknown component type: ${type}`);
      return;
    }
    const metadata = COMPONENT_METADATA[type];
    componentRegistry.value[type] = {
      ...metadata,
      fieldKey: '',
    };
  }

  function getAvailableComponentTypes(): string[] {
    return FORM_BUILDER_CONTROL_TYPES.filter(type => COMPONENT_METADATA[type]);
  }

  function getComponentMetadata(type: string): FormComponent | null {
    const metadata = COMPONENT_METADATA[type];
    if (!metadata) {
      return null;
    }
    return {
      fieldKey: type,
      label: metadata.label,
      type: metadata.type as FormComponent['type'],
      required: false,
      value: null,
    };
  }

  async function preloadComponents(): Promise<void> {
    // Controls render via shared FormField; nothing to preload.
  }

  return {
    registerComponent,
    getComponentDefinition,
    getAvailableComponentTypes,
    preloadComponents,
    getComponentMetadata,
  };
}
