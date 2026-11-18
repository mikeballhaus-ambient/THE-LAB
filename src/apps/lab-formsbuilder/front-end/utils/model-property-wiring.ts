import type { DataConnector, FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import type { FormBuilderContractModelProperty, LookupContract } from '@/shared/types';
import { controlTypeForProperty } from '@/apps/lab-formsbuilder/front-end/utils/autopopulate-from-connector';

export interface ModelPropertyOption {
  label: string;
  value: string;
  property: FormBuilderContractModelProperty;
}

export function listModelPropertyOptions(connector: DataConnector | null | undefined): ModelPropertyOption[] {
  const properties = connector?.entityModel?.properties ?? [];
  return properties
    .filter(p => p.name !== 'id' && p.hidden !== true)
    .map(p => ({
      label: p.label?.trim() || p.name,
      value: p.name,
      property: p,
    }));
}

export function compatibleControlTypes(
  property: FormBuilderContractModelProperty,
  lookup: LookupContract | undefined,
): string[] {
  const primary = controlTypeForProperty(property, lookup);
  const types = new Set<string>([primary]);
  if (lookup) {
    if (property.type === 'array') {
      types.add('MultiSelect');
    } else {
      types.add('Select');
      types.add('RadioButton');
    }
  }
  switch (property.type) {
    case 'string':
      types.add('InputText');
      types.add('Textarea');
      break;
    case 'number':
      types.add('NumberInput');
      break;
    case 'boolean':
      types.add('Checkbox');
      break;
    case 'date':
      types.add('DatePicker');
      break;
    case 'array':
      types.add('MultiSelect');
      break;
    default:
      break;
  }
  return [...types];
}

export function isControlCompatibleWithProperty(
  componentType: string,
  property: FormBuilderContractModelProperty,
  lookup: LookupContract | undefined,
): boolean {
  return compatibleControlTypes(property, lookup).includes(componentType);
}

export function wireComponentToModelProperty(
  component: FormComponent,
  propertyName: string,
  connector: DataConnector,
): FormComponent {
  const property = connector.entityModel?.properties?.find(p => p.name === propertyName);
  if (!property) {
    return component;
  }
  const lookups = connector.endpoints?.lookups ?? [];
  const lookup = lookups.find(l => l.forProperty === propertyName);
  const suggestedType = controlTypeForProperty(property, lookup);

  const next: FormComponent = {
    ...component,
    fieldKey: property.name,
    label: property.label?.trim() || property.name.replace(/_/g, ' '),
    modelProperty: property.name,
  };

  if (!isControlCompatibleWithProperty(component.type, property, lookup)) {
    next.type = suggestedType;
  }

  if (lookup) {
    next.dataFetch = {
      forProperty: lookup.forProperty,
      endpoint: lookup.endpoint,
    };
  } else {
    delete next.dataFetch;
  }

  if (property.type === 'date') {
    if (property.dateOnly === true) {
      next.dateOnly = true;
    } else {
      delete next.dateOnly;
    }
  }

  return next;
}
