import * as fs from 'fs/promises';
import * as pathModule from 'path';
import { getPlatformAppsCatalog } from './platform-apps-catalog';
import { AppType, IApp, TemplateResult } from '../types/index';
import { fileHelpers } from '../../backend/utils/file-helpers';
import {
  type CatalogTagEnsureSpec,
  ensureCatalogTagsAndLinkApp,
} from '../../backend/db/AppTags/ensure-catalog-tags-for-app';

/**
 * TemplateGenerator - Service for generating new app templates
 * 
 * Provides:
 * - Browser app template generation (Vue components)
 * - Server app template generation
 */
export class TemplateGenerator {

  /**
   * Folder slug under src/apps/ (no `app-` prefix). Strips a leading `app-` from input.
   */
  resolveAppFolderSlug(input: string): string {
    let slug = input.trim().toLowerCase().replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
    if (slug.startsWith('app-')) {
      slug = slug.slice(4);
    }
    return slug;
  }

  /** Registry id in SQLite (`apps.id`), always `app-{folderSlug}`. */
  resolveRegistryAppId(input: string): string {
    const folderSlug = this.resolveAppFolderSlug(input);
    if (!folderSlug) {
      throw new Error('App slug cannot be empty');
    }
    return `app-${folderSlug}`;
  }

  /**
   * `src/apps/lab-*` is reserved for platform catalog apps (registry `app-lab-*`).
   * User/product apps must use other slugs (e.g. `smoke-test` → `app-smoke-test`).
   */
  validateUserAppFolderSlug(folderSlug: string): void {
    if (folderSlug.startsWith('lab-')) {
      throw new Error(
        `App folder slug "${folderSlug}" is reserved: "lab-*" is for platform catalog apps only. ` +
          `Use a product name that slugs without "lab-" (e.g. display name "Smoke Test" → folder smoke-test, registry app-smoke-test).`,
      );
    }
  }

  async generateApp(
    appSlugInput: string,
    appName: string,
    appType: AppType,
    appDescription: string,
    appFaIcon: string,
    order: number,
    destination: string,
    isFromScript: boolean,
    port: number = 4000,
    appSystemInstructions?: string,
    dependencies?: string[],
    catalogTagSpecs?: CatalogTagEnsureSpec[],
  ): Promise<TemplateResult> {
    const folderSlug = this.resolveAppFolderSlug(appSlugInput);
    const registryAppId = this.resolveRegistryAppId(appSlugInput);

    if (!folderSlug) {
      return {
        success: false,
        error: 'Invalid app slug',
        app: {},
      } as TemplateResult;
    }

    if (!isFromScript) {
      this.validateUserAppFolderSlug(folderSlug);
    }

    const appDir = pathModule.join(destination, folderSlug);

    const newApp: IApp = {
      id: registryAppId,
      name: appName,
      description: appDescription,
      type: appType,
      componentPath: appType === 'browser' || appType === 'hybrid' ? `/src/apps/${folderSlug}/front-end/App.vue` : undefined,
      isServerSideEnabled: appType === 'server' || appType === 'hybrid',
      isEnabled: true,
      order: order,
      faIcon: appFaIcon,
      server: appType === 'server' || appType === 'hybrid' ? {
        entry: `/src/apps/${folderSlug}/back-end/entry.ts`,
        port: port,
        env: {
          NODE_ENV: 'development',
        },
      } : undefined,
      dependencies: dependencies || [],
      optionalDependencies: [],
      requiresPort: appType === 'server' || appType === 'hybrid' ? port : undefined,
      version: '1.0.0',
      latestVersion: '1.0.0',
      isUpdateAvailable: false,
      metadata: {
        author: 'developer',
        version: '1.0.0',
        tags: [appName],
        category: 'Custom',
      },
      changelog: [],
      appSystemInstructions: appSystemInstructions,
    };

    const dbInsertsuccess: boolean = true
    const errMsg: string = ''
    try {
      const catalog = getPlatformAppsCatalog();
      if (isFromScript) {
        await catalog.ensureInitialized();
      }
      catalog.createApp(newApp);
      console.log(`Added app ${newApp.id} to SQLite database`);

      if (catalogTagSpecs && catalogTagSpecs.length > 0) {
        ensureCatalogTagsAndLinkApp(registryAppId, catalogTagSpecs);
      }
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        app: {}
      } as TemplateResult
    }

    await fs.mkdir(appDir, { recursive: true });
    await fs.mkdir(pathModule.join(appDir, 'docs'));
    await fs.mkdir(pathModule.join(appDir, 'shared'));
    await fs.mkdir(pathModule.join(appDir, 'shared', 'utils'));
    await fs.mkdir(pathModule.join(appDir, 'shared', 'types'));

    const domainEventManifestTemplate = await fileHelpers.readFile(
      'src/templates/shared/lab-domain-events.manifest.ts',
    );
    await fs.writeFile(
      pathModule.join(appDir, 'shared', 'lab-domain-events.manifest.ts'),
      domainEventManifestTemplate,
      'utf-8',
    );

    if (appType === 'browser' || appType === 'hybrid') {
      await fs.mkdir(pathModule.join(appDir, 'front-end'));
      await fs.mkdir(pathModule.join(appDir, 'front-end', 'components'));
      await fs.mkdir(pathModule.join(appDir, 'front-end', 'composables'));
      await fs.mkdir(pathModule.join(appDir, 'front-end', 'types'));
      await fs.mkdir(pathModule.join(appDir, 'front-end', 'utils'));
      await this.generateBrowserApp(folderSlug, appName, appDescription, destination, appType === 'hybrid');
    }
    if (appType === 'server' || appType === 'hybrid') {
      await fs.mkdir(pathModule.join(appDir, 'back-end'));
      await fs.mkdir(pathModule.join(appDir, 'back-end', 'types'));
      await fs.mkdir(pathModule.join(appDir, 'back-end', 'utils'));
      await fs.mkdir(pathModule.join(appDir, 'db'));
      await this.generateServerApp(folderSlug, appName, appDescription, destination, port);
    }

    return {
      success: dbInsertsuccess,
      error: errMsg,
      app: newApp
    } as TemplateResult
  }

  /**
   * Generate a browser app with Vue component and app definition
   * @param appName The name of the new app (lowercase with dashes)
   * @param appDescription Description of the app
   * @param destination Base directory for the new app
   * @returns The destination directory path
   */
  async generateBrowserApp(folderSlug: string, appName: string, appDescription: string, destination: string, hasServer: boolean): Promise<void> {
    const appDir = pathModule.join(destination, folderSlug);

    const template = await fileHelpers.readFile('src/templates/front-end/App.vue')
    const filePath = pathModule.join(appDir, 'front-end', 'App.vue')
    await fs.writeFile(
      filePath,
      !hasServer ? template
        .replace('const serverEnabled = ref<boolean>(true)', 'const serverEnabled = ref<boolean>(false)')
        .replace(`import { SOCKET_EVENTS } from '../shared/types';`, '')
        .replace(`SOCKET_EVENTS.EXAMPLE_CLIENT_CALL_REQUEST`, `'CLIENT_CALL_REQUEST'`)
        .replace(`SOCKET_EVENTS.EXAMPLE_CLIENT_CALL_RESPONSE`, `'CLIENT_CALL_RESPONSE'`)
        : template,
      'utf-8');
  }

  /**
   * Copy server-side templates from `src/templates/back-end/`.
   *
   * Platform convention (see task-list, forms-builder):
   * - `server.ts` — Fastify setup; exports `startServer` only (no top-level await).
   * - `entry.ts` — process entry spawned by AppManager (`tsx entry.ts`); calls `startServer()`.
   *
   * Registry `server.entry` must point at **entry.ts**, not server.ts.
   */
  async generateServerApp(folderSlug: string, appName: string, appDescription: string, destination: string, port: number = 4000): Promise<void> {
    void port;
    const appDir = pathModule.join(destination, folderSlug);

    const serverTemplate = await fileHelpers.readFile('src/templates/back-end/server.ts')
    const serverFilePath = pathModule.join(appDir, 'back-end', 'server.ts')
    await fs.writeFile(serverFilePath, serverTemplate, 'utf-8');

    const entryTemplate = await fileHelpers.readFile('src/templates/back-end/entry.ts')
    const entryFilePath = pathModule.join(appDir, 'back-end', 'entry.ts')
    await fs.writeFile(entryFilePath, entryTemplate, 'utf-8');

    const dbServiceTemplate = await fileHelpers.readFile('src/templates/db/app-db-service.ts');
    const dbServicePath = pathModule.join(appDir, 'db', 'app-db-service.ts');
    await fs.writeFile(dbServicePath, dbServiceTemplate.replace(/{{ id }}/g, folderSlug), 'utf-8');

    const socketEventsTemplate = await fileHelpers.readFile('src/templates/shared/types/socket-events.ts')
    const socketEventsFilePath = pathModule.join(appDir, 'shared', 'types', 'socket-events.ts')
    await fs.writeFile(socketEventsFilePath, socketEventsTemplate, 'utf-8');

    const barrellImportTemplate = await fileHelpers.readFile('src/templates/shared/types/index.ts')
    const barrellImportfilePath = pathModule.join(appDir, 'shared', 'types', 'index.ts')
    await fs.writeFile(barrellImportfilePath, barrellImportTemplate, 'utf-8');
  }

  /**
   * Logger interface (optional)
   */
  private logger?: {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
  };

  /**
   * Set the logger instance
   */
  setLogger(logger: { info?: (m: string) => void; warn?: (m: string) => void; error?: (m: string) => void }): void {
    this.logger = {
      info: logger.info ?? (() => {}),
      warn: logger.warn ?? (() => {}),
      error: logger.error ?? (() => {}),
    };
  }
}

/**
 * Helper function to capitalize the first letter of a string
 * @param s The string to capitalize
 * @returns The capitalized string
 */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Export singleton instance of TemplateGenerator
 */
export const templateGenerator = new TemplateGenerator();
