import type { EntityDefinition } from '../types/entity.types';
import { applyLookupDisplayFormat } from './lookup-display-format';
import { formatPropertyValueAsLookupLabel } from './lookup-display-property';

/**
 * Human-readable label for a lookup target row (connector options + CRM list resolution).
 * @param labelProp — per-lookup-field override (`lookupLabelProperty`) when the target has no `lookupDisplayFormat`.
 */
export function formatLookupRecordLabel(
  definition: EntityDefinition,
  data: Record<string, unknown>,
  labelProp?: string,
): string {
  const formatTemplate = definition.lookupDisplayFormat?.trim();
  if (formatTemplate) {
    const fromFormat = applyLookupDisplayFormat(formatTemplate, definition, data);
    if (fromFormat) {
      return fromFormat;
    }
  }

  const displayPropName = labelProp ?? definition.lookupDisplayProperty;
  if (displayPropName) {
    const propDef = definition.properties.find((p) => p.name === displayPropName);
    const formatted = formatPropertyValueAsLookupLabel(propDef, data[displayPropName]);
    if (formatted) {
      return formatted;
    }
  }

  const firstName = data.firstName;
  const lastName = data.lastName;
  if (firstName != null || lastName != null) {
    const full = [firstName, lastName]
      .filter((v) => v != null && v !== '')
      .join(' ')
      .trim();
    if (full) {
      return full;
    }
  }

  const firstString = definition.properties.find((p) => p.type === 'string');
  if (firstString && data[firstString.name] != null && data[firstString.name] !== '') {
    return String(data[firstString.name]);
  }
  return `Record #${data.id ?? ''}`;
}
