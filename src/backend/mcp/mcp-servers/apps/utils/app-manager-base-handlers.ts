import * as fs from 'fs/promises';
import {
  MCPToolResponse,
  IApp,
  AppType,
  IServerConfig,
  AppMetadata,
  CreateAppParamsSchema,
  GetAppParamsSchema,
  GetAppsParamsSchema,
  UpdateAppParamsSchema,
  DeleteAppParamsSchema
} from '../../../../../shared/types';
import { appsService } from '../../../../../backend/db/Apps/apps-service';
import { platformAuditService } from '../../../../../backend/db/PlatformAudit/platform-audit-service';
import { templateGenerator } from '../../../../../shared/services/TemplateGenerator';
import { syncAppsCatalogToClients } from '../../../../../backend/services/sync-apps-catalog-to-clients';
import { resolveCreateAppCatalogTagSpecs } from './resolve-create-app-catalog-tags';
import { consumeAppBuilderCatalogTags } from '../../../../db/AppTags/app-builder-catalog-tag-stash';
import { fileHelpers } from '../../../../../backend/utils/file-helpers';
import { AppDatabaseService } from '../../../../../backend/AppDatabaseService';
import { AuthorizationRequest, userPermission } from '../../../../../backend/utils/user-permissions';
import {
  isAppDeletionProtected,
  protectedAppDeletionBlockedMessage,
} from '../../../../../shared/types/app/protected-apps';
import { releaseAppResourcesBeforeDelete } from './release-app-resources-before-delete';
import { resolveAppFolderSlugFromRecord } from './resolve-app-folder-slug';

/**
 * Base handlers for AppManagementTool operations that do not require direct database manipulation.
 * These handlers manage app metadata, CRUD operations, and app lifecycle.
 * 
 * The createApp handler includes database initialization code that creates the app's private database
 * and standard tables (items, users, configs, logs) after the template generator runs.
 */

/**
 * Create a new app in the database and generate app files
 * @param params - Validation params including operation and app creation details
 * @returns MCPToolResponse with app directory path
 */
export async function createApp(params: CreateAppParamsSchema): Promise<MCPToolResponse> {
  const {
    userId, ...app
  } = params || {};

  // Extract port from flattened property
  const port = app?.serverPort;

  // Validate permissions
  const validPermission = userPermission.isAuthorized({
    userId: userId,
    permissionType: 'global',
    globalAction: 'create-apps'
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

  // Validate required parameters
  if (!app.type) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'create_app',
      content: 'Invalid parameters: appType is required',
      success: false
    } as MCPToolResponse;
  }

  if (!app.name) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'create_app',
      content: 'Invalid parameters: appName is required',
      success: false
    } as MCPToolResponse;
  }

  if (!app.description) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'create_app',
      content: 'Invalid parameters: appDescription is required',
      success: false
    } as MCPToolResponse;
  }

  if (!app.faIcon) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'create_app',
      content: 'Invalid parameters: appFaIcon is required',
      success: false
    } as MCPToolResponse;
  }

  // Normalize name to lowercase with dashes (registry id gets `app-` prefix in TemplateGenerator)
  const folderSlug = templateGenerator.resolveAppFolderSlug(app.name);

  let newApp: IApp | undefined = undefined;

  try {
    // Use TemplateGenerator to generate app files and database entry
    let catalogTagSpecs = resolveCreateAppCatalogTagSpecs(app);
    if (!catalogTagSpecs?.length) {
      catalogTagSpecs = consumeAppBuilderCatalogTags(userId);
    }

    const templateResult = await templateGenerator.generateApp(
      app.name,
      app.name,
      app.type as AppType,
      app.description,
      app.faIcon,
      app.order || 100,
      'src/apps/',
      false,
      ((port as number | undefined) !== undefined && port !== null) ? port : 4000,
      app.appSystemInstructions,
      app.dependencies || [],
      catalogTagSpecs,
    );

    if (!templateResult.success) {
      return {
        type: 'tool_result',
        tool_call_id: 'app_management',
        function: 'create_app',
        content: `Error creating new app: ${templateResult.error}`,
        success: false
      } as MCPToolResponse;
    } else {
      newApp = templateResult.app

      syncAppsCatalogToClients();

      if (newApp?.id) {
        platformAuditService.record({
          actorUserId: userId,
          category: 'app',
          action: 'create',
          targetType: 'app',
          targetId: newApp.id,
          details: { name: app.name, type: app.type },
        });
      }

      // Initialize the app's private database with standard tables
      try {
        const service = await AppDatabaseService.getInstance(folderSlug);

        return {
          type: 'tool_result',
          tool_call_id: 'app_management',
          function: 'create_app',
          content: service.isValid()
            ? `New app ${app.name} was created successfully (registry id \`${newApp?.id ?? `app-${folderSlug}`}\`, folder \`src/apps/${folderSlug}/\`).` +
              (catalogTagSpecs?.length
                ? ` Catalog tags linked: ${catalogTagSpecs.map((t) => t.id).join(', ')}.`
                : '') +
              ` The catalog updates live; if Launch does nothing, hard-refresh the dashboard once so Vite picks up the new app module.`
            : `New app ${app.name} was created however the app database creation failed`,
          success: service.isValid()
        } as MCPToolResponse;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          type: 'tool_result',
          tool_call_id: 'app_management',
          function: 'create_app',
          content: `Error: ${errorMessage}`,
          success: false
        } as MCPToolResponse;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'create_app',
      content: `Error: ${errorMessage}`,
      success: false
    } as MCPToolResponse;
  }
}

/**
 * Retrieve a single app by ID
 * @param params - Validation params including operation and appId
 * @returns MCPToolResponse with app object JSON
 */
export async function getApp(params: GetAppParamsSchema): Promise<MCPToolResponse> {
  const { id } = params || {};

  if (!id || id === undefined || id === null || id === '') {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'get_app',
      content: 'Invalid parameters: appId is required',
      success: false
    } as MCPToolResponse;
  }

  try {
    const app = appsService.getAppById(id);

    if (!app) {
      return {
        type: 'tool_result',
        tool_call_id: 'app_management',
        function: 'get_app',
        content: `App with id '${id}' not found`,
        success: false
      } as MCPToolResponse;
    }

    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'get_app',
      content: JSON.stringify(app, null, 2),
      success: true
    } as MCPToolResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'get_app',
      content: `Error: ${errorMessage}`,
      success: false
    } as MCPToolResponse;
  }
}

/**
 * Retrieve apps with optional filtering by type and enabled status
 * @param params - Validation params including operation and type/enabled filters
 * @returns MCPToolResponse with array of apps JSON
 */
export async function getApps(params: GetAppsParamsSchema): Promise<MCPToolResponse> {
  const { type, isEnabled } = params || {};

  try {
    let apps: IApp[] = appsService.getAllApps();

    // Apply type filter if specified
    if (type) {
      apps = apps.filter(app => app.type === type);
    }

    // Apply enabled filter if specified
    if (isEnabled !== undefined) {
      apps = apps.filter(app => app.isEnabled === isEnabled);
    }

    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'get_apps',
      content: JSON.stringify(apps, null, 2),
      success: true
    } as MCPToolResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'get_apps',
      content: `Error: ${errorMessage}`,
      success: false
    } as MCPToolResponse;
  }
}

/**
 * Update an existing app in the database
 * @param params - Validation params including operation, appId, and appData
 * @returns MCPToolResponse with success message
 */
export async function updateApp(params: UpdateAppParamsSchema): Promise<MCPToolResponse> {
  const { userId, ...appData } = params || {};

  // Validate permissions
  const validPermission = userPermission.isAuthorized({
    userId: userId,
    permissionType: 'all',
    globalAction: 'update-apps',
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

  // appId is required
  if (!appData.id || appData.id === undefined || appData.id === null || appData.id === '') {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'update_app',
      content: 'Invalid parameters: appId is required',
      success: false
    } as MCPToolResponse;
  }

  if (!appData || Object.keys(appData).length === 0) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'update_app',
      content: 'Invalid parameters: appData is required and cannot be empty',
      success: false
    } as MCPToolResponse;
  }

  try {
    const existingApp = appsService.getAppById(appData.id);

    if (!existingApp) {
      return {
        type: 'tool_result',
        tool_call_id: 'app_management',
        function: 'update_app',
        content: `App with id '${appData.id}' not found`,
        success: false
      } as MCPToolResponse;
    }

    // Build updated app with proper type safety - include all IApp properties
    // Use flattened properties from input and reconstruct nested objects for database storage
    const appToUpdate: IApp = {
      id: appData.id,
      name: appData.name ?? existingApp.name,
      description: appData.description ?? existingApp.description,
      faIcon: appData.faIcon ?? existingApp.faIcon,
      order: appData.order ?? existingApp.order,
      type: appData.type ?? existingApp.type,
      componentPath: appData.componentPath ?? existingApp.componentPath,
      isEnabled: appData.isEnabled ?? existingApp.isEnabled,
      isServerSideEnabled: appData.isServerSideEnabled ?? existingApp.isServerSideEnabled,
      requiresPort: appData.requiresPort ?? existingApp.requiresPort,
      dependencies: appData.dependencies ?? existingApp.dependencies,
      optionalDependencies: appData.optionalDependencies ?? existingApp.optionalDependencies,
      version: appData.version ?? existingApp.version,
      latestVersion: appData.latestVersion ?? existingApp.latestVersion,
      isUpdateAvailable: appData.isUpdateAvailable ?? existingApp.isUpdateAvailable,
      appSystemInstructions: appData.appSystemInstructions ?? existingApp.appSystemInstructions,
      // Reconstruct nested objects from flattened properties for database storage
      server: (appData.serverEntry || appData.serverPort || appData.serverEnv) ? {
        entry: (appData.serverEntry as string) || existingApp.server?.entry || '',
        port: (appData.serverPort as number | undefined) ?? existingApp.server?.port,
        env: appData.serverEnv ?? existingApp.server?.env
      } as IServerConfig : existingApp.server,
      metadata: (appData.metadataCategory || appData.metadataAuthor || appData.metadataVersion || appData.metadataTags) ? {
        category: (appData.metadataCategory as string) || existingApp.metadata?.category || '',
        author: (appData.metadataAuthor as string) || existingApp.metadata?.author || '',
        version: (appData.metadataVersion as string) || existingApp.metadata?.version || '',
        tags: appData.metadataTags ?? existingApp.metadata?.tags
      } as AppMetadata : existingApp.metadata,
      changelog: (appData.changelogVersion || appData.changelogDate || appData.changelogNotes || appData.changelogBreakingChangesMessages || appData.changelogMigrationGuide) ? [
        {
          version: (appData.changelogVersion as string) || existingApp.changelog?.[0]?.version || '',
          date: (appData.changelogDate as string) || existingApp.changelog?.[0]?.date || '',
          notes: (appData.changelogNotes as string) || existingApp.changelog?.[0]?.notes || '',
          breakingChanges: appData.changelogBreakingChangesMessages ? {
            messages: appData.changelogBreakingChangesMessages as string[]
          } : undefined,
          migrationGuide: (appData.changelogMigrationGuide as string) || existingApp.changelog?.[0]?.migrationGuide
        }
      ] : existingApp.changelog,
    };

    appsService.updateApp(appData.id, appToUpdate);

    platformAuditService.record({
      actorUserId: userId,
      category: 'app',
      action: 'update',
      targetType: 'app',
      targetId: appData.id,
      details: { name: appToUpdate.name },
    });

    syncAppsCatalogToClients();

    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'update_app',
      content: 'App updated successfully',
      success: true
    } as MCPToolResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'update_app',
      content: `Error: ${errorMessage}`,
      success: false
    } as MCPToolResponse;
  }
}

/**
 * Delete an app from the database and remove its directory
 * @param params - Validation params including operation and appId
 * @returns MCPToolResponse with success message
 */
export async function deleteApp(params: DeleteAppParamsSchema): Promise<MCPToolResponse> {
  const { userId, id } = params || {};

  if (!id || id === undefined || id === null || id === '') {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'delete_app',
      content: 'Invalid parameters: appId is required',
      success: false
    } as MCPToolResponse;
  }

  if (isAppDeletionProtected(id)) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'delete_app',
      content: protectedAppDeletionBlockedMessage(id),
      success: false
    } as MCPToolResponse;
  }

  const existingApp = appsService.getAppById(id);
  if (existingApp?.isSystem) {
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'delete_app',
      content: protectedAppDeletionBlockedMessage(id),
      success: false
    } as MCPToolResponse;
  }

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

  try {
    const app = appsService.getAppById(id);

    if (!app) {
      return {
        type: 'tool_result',
        tool_call_id: 'app_management',
        function: 'delete_app',
        content: `App with id '${id}' not found`,
        success: false
      } as MCPToolResponse;
    }

    await releaseAppResourcesBeforeDelete(app);

    const folderSlug = resolveAppFolderSlugFromRecord(app);
    if (folderSlug) {
      const appsDir = fileHelpers.toForwardPath('src/apps');
      const fullPath = fileHelpers.toForwardPath(`${appsDir}/${folderSlug}`);
      await fs.rm(fullPath, { recursive: true, force: true });
    }

    appsService.deleteApp(id);

    platformAuditService.record({
      actorUserId: userId,
      category: 'app',
      action: 'delete',
      targetType: 'app',
      targetId: id,
    });

    syncAppsCatalogToClients();

    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'delete_app',
      content: 'App and directory deleted successfully',
      success: true
    } as MCPToolResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      type: 'tool_result',
      tool_call_id: 'app_management',
      function: 'delete_app',
      content: `Error: ${errorMessage}`,
      success: false
    } as MCPToolResponse;
  }
}
