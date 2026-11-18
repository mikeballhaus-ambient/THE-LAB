import type { IApp } from '../types/app/app.d';

/**
 * Read/write app registry rows without importing `src/backend/**` from shared code (rm-46 **4.5**).
 * Backend registers a SQLite implementation at startup; CLI scripts register before `TemplateGenerator` runs.
 */
export interface PlatformAppsCatalogPort {
  getAllApps(): IApp[];
  getAppById(id: string): IApp | undefined;
  createApp(app: IApp): void;
  /** Ensures main DB is ready (e.g. `generate:app` outside the Fastify boot path). */
  ensureInitialized(): Promise<void>;
}
