import { AppDatabaseService } from '../../../../../backend/AppDatabaseService';
import { MCPToolResponse, AddColumnParamsSchema, AddTableParamsSchema, DeleteParamsSchema, ExecuteRawParamsSchema, InsertParamsSchema, RemoveColumnParamsSchema, RemoveTableParamsSchema, SelectParamsSchema, UpdateParamsSchema, IAddColumnParams, IAddTableParams, ICRUDSuccessResponse, IDeleteParams, IDeleteResponse, IExecuteRawParams, IExecuteRawResponse, IInsertParams, IInsertResponse, IRemoveColumnParams, IRemoveTableParams, ISelectParams, ISelectResponse, IUpdateParams, IUpdateResponse } from '@/shared/types/';
import { userPermission, AuthorizationRequest } from '../../../../../backend/utils/user-permissions';

/**
 * Handle add_table operation
 */
export async function handleAddTable(params: AddTableParamsSchema): Promise<MCPToolResponse> {
  const { userId, id, tableName, schema } = params || {};

  // Validate permissions
  const validPermission = userPermission.isAuthorized({
    userId: userId,
    permissionType: 'all',
    globalAction: 'manage-apps',
    appAction: 'update-app',
    appId: params.id
  } as AuthorizationRequest)

  if (!validPermission) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'create_app',
      content: 'The current user does not have permission to perform this action',
      success: false
    } as MCPToolResponse;
  }

  if (!id || !tableName || !schema) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'add_table',
      content: 'Invalid parameters: appId, tableName, and schema are required',
      success: false
    } as MCPToolResponse;
  }

  try {
    const service = await AppDatabaseService.getInstance(id);
    const result = await service.addTable({ tableName, schema } as IAddTableParams) as ICRUDSuccessResponse;

    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'add_table',
      content: JSON.stringify(result, null, 2),
      success: result.success
    } as MCPToolResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'add_table',
      content: `Error: ${errorMessage}`,
      success: false
    } as MCPToolResponse;
  }
}

/**
 * Handle remove_table operation
 */
export async function handleRemoveTable(params: RemoveTableParamsSchema): Promise<MCPToolResponse> {
  const { userId, id, tableName } = params || {};

  // Validate permissions
  const validPermission = userPermission.isAuthorized({
    userId: userId,
    permissionType: 'all',
    globalAction: 'manage-apps',
    appAction: 'update-app',
    appId: params.id
  } as AuthorizationRequest)

  if (!validPermission) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'create_app',
      content: 'The current user does not have permission to perform this action',
      success: false
    } as MCPToolResponse;
  }

  if (!id || !tableName) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'remove_table',
      content: 'Invalid parameters: appId and tableName are required',
      success: false
    } as MCPToolResponse;
  }

  try {
    const service = await AppDatabaseService.getInstance(id);
    const result = await service.removeTable({ tableName } as IRemoveTableParams) as ICRUDSuccessResponse;

    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'remove_table',
      content: JSON.stringify(result, null, 2),
      success: result.success
    } as MCPToolResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'remove_table',
      content: `Error: ${errorMessage}`,
      success: false
    } as MCPToolResponse;
  }
}

/**
 * Handle add_column operation
 */
export async function handleAddColumn(params: AddColumnParamsSchema): Promise<MCPToolResponse> {
  const { userId, id, tableName, columnName, columnType, nullable, defaultSchema: defaultVal, primaryKey, foreignKey } = params || {};

  // Validate permissions
  const validPermission = userPermission.isAuthorized({
    userId: userId,
    permissionType: 'all',
    globalAction: 'manage-apps',
    appAction: 'update-app',
    appId: params.id
  } as AuthorizationRequest)

  if (!validPermission) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'create_app',
      content: 'The current user does not have permission to perform this action',
      success: false
    } as MCPToolResponse;
  }

  if (!id || !tableName || !columnName || !columnType) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'add_column',
      content: 'Invalid parameters: appId, tableName, columnName, and columnType are required',
      success: false
    } as MCPToolResponse;
  }

  try {
    const service = await AppDatabaseService.getInstance(id);
    const result = await service.addColumn({
      tableName,
      columnName,
      columnType,
      nullable: nullable !== undefined ? nullable : false,
      default: defaultVal,
      primaryKey: primaryKey !== undefined ? primaryKey : false,
      foreignKey
    } as IAddColumnParams) as ICRUDSuccessResponse;

    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'add_column',
      content: JSON.stringify(result, null, 2),
      success: result.success
    } as MCPToolResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'add_column',
      content: `Error: ${errorMessage}`,
      success: false
    } as MCPToolResponse;
  }
}

/**
 * Handle remove_column operation
 */
export async function handleRemoveColumn(params: RemoveColumnParamsSchema): Promise<MCPToolResponse> {
  const { userId, id, tableName, columnName, cascadeForeignKeys } = params || {};

  // Validate permissions
  const validPermission = userPermission.isAuthorized({
    userId: userId,
    permissionType: 'all',
    globalAction: 'manage-apps',
    appAction: 'update-app',
    appId: params.id
  } as AuthorizationRequest)

  if (!validPermission) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'create_app',
      content: 'The current user does not have permission to perform this action',
      success: false
    } as MCPToolResponse;
  }

  if (!id || !tableName || !columnName) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'remove_column',
      content: 'Invalid parameters: appId, tableName, and columnName are required',
      success: false
    } as MCPToolResponse;
  }

  try {
    const service = await AppDatabaseService.getInstance(id);
    const result = await service.removeColumn({
      tableName,
      columnName,
      cascadeForeignKeys: cascadeForeignKeys !== undefined ? cascadeForeignKeys : false
    } as IRemoveColumnParams) as ICRUDSuccessResponse;

    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'remove_column',
      content: JSON.stringify(result, null, 2),
      success: result.success
    } as MCPToolResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'remove_column',
      content: `Error: ${errorMessage}`,
      success: false
    } as MCPToolResponse;
  }
}

/**
 * Handle select operation
 */
export async function handleSelect(params: SelectParamsSchema): Promise<MCPToolResponse> {
  const { id, sql, sqlParams, limit, offset } = params || {};

  if (!id || !sql) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'select',
      content: 'Invalid parameters: appId and sql are required',
      success: false
    } as MCPToolResponse;
  }

  try {
    const service = await AppDatabaseService.getInstance(id);
    const result = await service.select({ sql, params: sqlParams, limit, offset } as ISelectParams) as ISelectResponse;

    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'select',
      content: JSON.stringify(result, null, 2),
      success: result.success
    } as MCPToolResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'select',
      content: `Error: ${errorMessage}`,
      success: false
    } as MCPToolResponse;
  }
}

/**
 * Handle insert operation
 */
export async function handleInsert(params: InsertParamsSchema): Promise<MCPToolResponse> {
  const { userId, id, tableName, data } = params || {};

  // Validate permissions
  const validPermission = userPermission.isAuthorized({
    userId: userId,
    permissionType: 'all',
    globalAction: 'manage-apps',
    appAction: 'update-app',
    appId: params.id
  } as AuthorizationRequest)

  if (!validPermission) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'create_app',
      content: 'The current user does not have permission to perform this action',
      success: false
    } as MCPToolResponse;
  }

  if (!id || !tableName || !data) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'insert',
      content: 'Invalid parameters: appId, tableName, and data are required',
      success: false
    } as MCPToolResponse;
  }

  try {
    const service = await AppDatabaseService.getInstance(id);
    const result = await service.insert({ tableName, data } as IInsertParams) as IInsertResponse;

    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'insert',
      content: JSON.stringify(result, null, 2),
      success: result.success
    } as MCPToolResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'insert',
      content: `Error: ${errorMessage}`,
      success: false
    } as MCPToolResponse;
  }
}

/**
 * Handle update operation
 */
export async function handleUpdate(params: UpdateParamsSchema): Promise<MCPToolResponse> {
  const { userId, id, tableName, data, where } = params || {};

  // Validate permissions
  const validPermission = userPermission.isAuthorized({
    userId: userId,
    permissionType: 'all',
    globalAction: 'manage-apps',
    appAction: 'update-app',
    appId: params.id
  } as AuthorizationRequest)

  if (!validPermission) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'create_app',
      content: 'The current user does not have permission to perform this action',
      success: false
    } as MCPToolResponse;
  }

  if (!id || !tableName || !data || !where) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'update',
      content: 'Invalid parameters: appId, tableName, data, and where are required',
      success: false
    } as MCPToolResponse;
  }

  try {
    const service = await AppDatabaseService.getInstance(id);
    const result = await service.update({ tableName, data, where } as IUpdateParams) as IUpdateResponse;

    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'update',
      content: JSON.stringify(result, null, 2),
      success: result.success
    } as MCPToolResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'update',
      content: `Error: ${errorMessage}`,
      success: false
    } as MCPToolResponse;
  }
}

/**
 * Handle delete operation
 */
export async function handleDelete(params: DeleteParamsSchema): Promise<MCPToolResponse> {
  const { userId, id, tableName, where } = params || {};

  // Validate permissions
  const validPermission = userPermission.isAuthorized({
    userId: userId,
    permissionType: 'global',
    globalAction: 'delete-apps'
  } as AuthorizationRequest)

  if (!validPermission) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'create_app',
      content: 'The current user does not have permission to perform this action',
      success: false
    } as MCPToolResponse;
  }

  if (!id || !tableName || !where) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'delete',
      content: 'Invalid parameters: appId, tableName, and where are required',
      success: false
    } as MCPToolResponse;
  }

  try {
    const service = await AppDatabaseService.getInstance(id);
    const result = await service.delete({ tableName, where } as IDeleteParams) as IDeleteResponse;

    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'delete',
      content: JSON.stringify(result, null, 2),
      success: result.success
    } as MCPToolResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'delete',
      content: `Error: ${errorMessage}`,
      success: false
    } as MCPToolResponse;
  }
}

/**
 * Handle execute_raw operation - execute arbitrary SQL queries
 */
export async function handleExecuteRaw(params: ExecuteRawParamsSchema): Promise<MCPToolResponse> {
  const { id, sql } = params || {};

  if (!id || !sql) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'execute_raw',
      content: 'Invalid parameters: appId and sql are required',
      success: false
    } as MCPToolResponse;
  }

  try {
    const service = await AppDatabaseService.getInstance(id);
    const result = await service.executeRaw({ sql } as IExecuteRawParams) as IExecuteRawResponse;

    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'execute_raw',
      content: JSON.stringify(result, null, 2),
      success: result.success
    } as MCPToolResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'execute_raw',
      content: `Error: ${errorMessage}`,
      success: false
    } as MCPToolResponse;
  }
}
