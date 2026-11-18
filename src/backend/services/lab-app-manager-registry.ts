import type { AppManager } from '../AppManager';

let labAppManager: AppManager | null = null;

/** Registers the process AppManager for MCP and other backend modules that lack route context. */
export function registerLabAppManager(manager: AppManager): void {
  labAppManager = manager;
}

export function getLabAppManager(): AppManager | null {
  return labAppManager;
}
