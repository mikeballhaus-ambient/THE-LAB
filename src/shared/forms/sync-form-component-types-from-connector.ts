import type { DataConnector, FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import type { LookupContract } from '@/shared/types/forms-builder-integration';
import { controlTypeForProperty } from './build-components-from-connector';

function lookupForField(
  fieldKey: string,
  modelProperty: string | undefined,
  savedForProperty: string | undefined,
  lookups: LookupContract[],
): LookupContract | undefined {
  return lookups.find((lookup) => {
    const forProp = lookup.forProperty;
    return forProp === fieldKey || forProp === modelProperty || forProp === savedForProperty;
  });
}

/**
 * Align canvas control types + dataFetch with connector entity model and lookup endpoints.
 * Used when loading forms (stale InputText after reprovision) and after stub provision.
 */
export function syncFormComponentTypesFromConnector(
  connector: DataConnector,
  components: FormComponent[],
): FormComponent[] {
  const properties = connector.entityModel?.properties ?? [];
  const propByName = new Map(properties.map((p) => [p.name, p]));
  const lookups = Array.isArray(connector.endpoints?.lookups) ? connector.endpoints.lookups : [];

  return components.map((component) => {
    const fieldKey = component.fieldKey;
    if (!fieldKey) {
      return component;
    }

    const prop = propByName.get(fieldKey);
    const matchingLookup = lookupForField(
      fieldKey,
      component.modelProperty as string | undefined,
      component.dataFetch?.forProperty as string | undefined,
      lookups,
    );

    let next: FormComponent = component;

    if (prop) {
      const expectedType = controlTypeForProperty(prop, matchingLookup);
      if (next.type !== expectedType) {
        next = { ...next, type: expectedType };
      }
    }

    if (matchingLookup) {
      next = {
        ...next,
        dataFetch: {
          forProperty: matchingLookup.forProperty,
          endpoint: matchingLookup.endpoint,
        },
      };
    }

    return next;
  });
}
