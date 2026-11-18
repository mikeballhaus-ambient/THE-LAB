import type { FormsBuilderContract } from '@/shared/types/forms-builder-integration';

/** Per-slot visible fields for Chart Builder designer (avoids duplicate full-chart forms). */
export const CHART_BUILDER_DESIGNER_STUB_FIELDS: Record<string, readonly string[]> = {
  'chart.designer.metadata': [
    'chartKey',
    'name',
    'description',
    'chartType',
    'optionsJson',
    'layoutJson',
    'is_active',
    'dataConnectorId',
  ],
  'chart.designer.connector': ['dataMappingJson', 'allowedFiltersJson'],
};

/** Filter loaded form components when stub DB rows predate slot-specific provision. */
export function filterComponentsForChartBuilderSlot(
  hostAppId: string,
  slot: string,
  components: ReadonlyArray<{ fieldKey?: string }>,
): Array<{ fieldKey?: string }> {
  if (hostAppId !== 'app-lab-chartbuilder' && hostAppId !== 'chart-builder') {
    return [...components];
  }
  const allow = CHART_BUILDER_DESIGNER_STUB_FIELDS[slot];
  if (!allow) {
    return [...components];
  }
  const allowed = new Set(allow);
  return components.filter((field) => field.fieldKey && allowed.has(field.fieldKey));
}

export function filterContractForChartBuilderSlot(
  hostAppId: string,
  slot: string,
  contract: FormsBuilderContract,
): FormsBuilderContract {
  if (hostAppId !== 'app-lab-chartbuilder' && hostAppId !== 'chart-builder') {
    return contract;
  }
  const allow = CHART_BUILDER_DESIGNER_STUB_FIELDS[slot];
  if (!allow) {
    return contract;
  }
  const allowed = new Set(allow);
  const properties = (contract.entityModel?.properties ?? [])
    .filter((prop) => allowed.has(prop.name))
    .map((prop) => (prop.hidden ? { ...prop, hidden: false } : prop));
  return {
    ...contract,
    entityModel: {
      ...contract.entityModel,
      properties,
    },
  };
}
