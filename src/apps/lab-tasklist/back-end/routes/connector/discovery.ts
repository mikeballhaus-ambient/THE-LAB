import type { FastifyInstance } from 'fastify';
import type {
  FormBuilderContractModel,
  FormBuilderContractModelProperty,
  FormsBuilderContract,
} from '@/shared/types';
import {
  buildStandardConnectorCrudPaths,
  resolveConnectorApiBase,
} from '@/shared/server/connector-discovery';
import { buildTaskEntityLookupContracts } from '@/shared/lab-integrations/task-list-task-lookup-contracts';

function buildTaskDiscovery(baseUrl: string, port: number): FormsBuilderContract {
  const apiBase = resolveConnectorApiBase(baseUrl, port);
  return {
    appName: 'task-list',
    entityName: 'Task',
    capabilities: ['CRUD', 'Lookups'],
    entityModel: {
      id: 'number',
      title: 'string',
      description: 'string',
      status: 'string',
      priority: 'string',
      dueDate: 'date',
      assigneeId: 'string',
      tags: 'array',
      taskListId: 'number',
      metadata: 'string',
      properties: [
        { name: 'id', type: 'number', label: 'ID' } as FormBuilderContractModelProperty,
        { name: 'title', type: 'string', label: 'Title' } as FormBuilderContractModelProperty,
        { name: 'description', type: 'string', label: 'Description' } as FormBuilderContractModelProperty,
        { name: 'status', type: 'string', label: 'Status' } as FormBuilderContractModelProperty,
        { name: 'priority', type: 'string', label: 'Priority' } as FormBuilderContractModelProperty,
        { name: 'dueDate', type: 'date', label: 'Due date' } as FormBuilderContractModelProperty,
        { name: 'assigneeId', type: 'string', label: 'Assignee' } as FormBuilderContractModelProperty,
        { name: 'tags', type: 'array', label: 'Tags' } as FormBuilderContractModelProperty,
        { name: 'taskListId', type: 'number', label: 'Task list' } as FormBuilderContractModelProperty,
        { name: 'metadata', type: 'string', label: 'Metadata', hidden: true } as FormBuilderContractModelProperty,
      ],
    } as unknown as FormBuilderContractModel,
    endpoints: {
      baseUrl: apiBase,
      crud: buildStandardConnectorCrudPaths({ segment: 'tasks', getAllFilter: 'taskListId' }),
      lookups: buildTaskEntityLookupContracts(apiBase),
    },
  };
}

function buildTaskListDiscovery(baseUrl: string, port: number): FormsBuilderContract {
  const apiBase = resolveConnectorApiBase(baseUrl, port);
  return {
    appName: 'task-list',
    entityName: 'TaskList',
    capabilities: ['CRUD'],
    entityModel: {
      id: 'number',
      name: 'string',
      description: 'string',
      properties: [
        { name: 'id', type: 'number', label: 'ID' } as FormBuilderContractModelProperty,
        { name: 'name', type: 'string', label: 'Name' } as FormBuilderContractModelProperty,
        { name: 'description', type: 'string', label: 'Description' } as FormBuilderContractModelProperty,
      ],
    } as unknown as FormBuilderContractModel,
    endpoints: {
      baseUrl: apiBase,
      crud: buildStandardConnectorCrudPaths({ segment: 'task-lists' }),
      lookups: [],
    },
  };
}

const discoveryRoutes = async (fastifyInstance: FastifyInstance) => {
  const baseUrl = process.env.BASEURL ?? 'http://localhost';
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3005;

  fastifyInstance.get('/task', async () => buildTaskDiscovery(baseUrl, port));
  fastifyInstance.get('/task-list', async () => buildTaskListDiscovery(baseUrl, port));
};

export default discoveryRoutes;
