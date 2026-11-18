import type {
  FormBuilderContractModel,
  FormBuilderContractModelProperty,
  FormsBuilderContract,
} from '@/shared/types';
import {
  buildStandardConnectorCrudPaths,
  resolveConnectorApiBase,
} from '@/shared/server/connector-discovery';
import { buildKanbanBoardFieldKeyLookups } from '@/shared/lab-integrations/kanban-board-lookup-contracts';

export function buildKanbanBoardDiscoveryContract(
  baseUrl: string,
  port: number,
): FormsBuilderContract {
  const apiBase = resolveConnectorApiBase(baseUrl, port);
  const properties: FormBuilderContractModelProperty[] = [
    { name: 'id', type: 'number', label: 'ID', hidden: true },
    { name: 'name', type: 'string', label: 'Board name' },
    { name: 'fieldKey', type: 'string', label: 'Group by field' },
    {
      name: 'columnsJson',
      type: 'string',
      label: 'Columns',
      controlType: 'LabKanbanBoardColumns',
    },
    { name: 'sortOrder', type: 'number', label: 'Sort order', hidden: true },
    { name: 'isSystem', type: 'boolean', label: 'System board', hidden: true },
    { name: 'createdAt', type: 'date', label: 'Created', hidden: true },
    { name: 'updatedAt', type: 'date', label: 'Updated', hidden: true },
  ];

  return {
    appName: 'help-desk',
    entityName: 'KanbanBoard',
    capabilities: ['CRUD'],
    entityModel: {
      id: 'number',
      name: 'string',
      fieldKey: 'string',
      columnsJson: 'string',
      sortOrder: 'number',
      isSystem: 'boolean',
      createdAt: 'date',
      updatedAt: 'date',
      properties,
    } as unknown as FormBuilderContractModel,
    endpoints: {
      baseUrl: apiBase,
      crud: buildStandardConnectorCrudPaths({ segment: 'kanban-boards' }),
      lookups: buildKanbanBoardFieldKeyLookups(),
    },
  };
}
