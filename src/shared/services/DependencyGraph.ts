import { IApp } from '../../shared/types/app/app.d';
/**
 * DependencyGraph - Manages app dependencies with topological sort and cycle detection
 * 
 * Provides:
 * - Dependency resolution for app startup order
 * - Circular dependency detection using DFS with color marking
 * - External dependency identification
 */
export class DependencyGraph {
  private graph: Map<string, Set<string>>;
  private apps: IApp[];

  /**
   * Constructs a dependency graph from the given apps array
   * @param apps Array of app configurations to build the graph from
   */
  constructor(apps: IApp[]) {
    this.apps = apps;
    this.graph = new Map();

    // Build graph from app dependencies
    apps.forEach(app => {
      const deps = app.dependencies || [];
      this.graph.set(app.id, new Set(deps));
    });
  }

  getApps(): IApp[] {
    return this.apps
  }

  getGraph(): Map<string, Set<string>> {
    return this.graph
  }

  /**
* Returns apps that must be started before the given app
* @param appId The app ID to check
* @returns Array of dependency app IDs
*/
  getAppDependencies(appId: string): string[] {
    const deps = this.graph.get(appId);
    if (!deps) return [];

    // Convert Set to array and filter for app-only dependencies
    const appIds = new Set(this.apps.map(a => a.id));
    return Array.from(deps).filter((dep: string) => appIds.has(dep));
  }

  /**
   * Returns apps that depend on the given app (reverse dependencies)
   * @param appId The app ID to check
   * @returns Array of dependent app IDs
   */
  getDependents(appId: string): string[] {
    const dependents: string[] = [];
    for (const [appIdKey, deps] of this.graph.entries()) {
      if (deps.has(appId)) {
        dependents.push(appIdKey);
      }
    }
    return dependents;
  }

  /**
   * Returns apps in valid startup order (dependencies first) using topological sort
   * @returns Array of app IDs in startup order
   */
  getStartupOrder(): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const dfs = (node: string): void => {
      if (visited.has(node)) return;

      visited.add(node);

      // First visit all dependencies
      for (const dep of this.graph.get(node) || []) {
        if (this.apps.some(a => a.id === dep)) {
          dfs(dep);
        }
      }

      // Then add current node
      result.push(node);
    };

    // Process all apps in graph order
    for (const appId of this.graph.keys()) {
      dfs(appId);
    }

    return result;
  }

  /**
   * Detects circular dependencies using DFS with color marking
   * WHITE (0) = not visited
   * GRAY (1) = currently being processed (in recursion stack)
   * BLACK (2) = fully processed
   * 
   * @returns true if cycle exists
   */
  hasCycle(): boolean {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const colors = new Map<string, number>();

    // Initialize all nodes as WHITE
    for (const appId of this.graph.keys()) {
      colors.set(appId, WHITE);
    }

    const dfs = (node: string): boolean => {
      // Node doesn't exist in graph - skip
      if (!colors.has(node)) return false;

      if (colors.get(node) === GRAY) return true;   // Back edge = cycle
      if (colors.get(node) === BLACK) return false; // Already processed

      colors.set(node, GRAY);

      for (const dep of this.graph.get(node) || []) {
        if (this.apps.some(a => a.id === dep)) {
          if (dfs(dep)) return true;
        }
      }

      colors.set(node, BLACK);
      return false;
    };

    // Process all connected components
    for (const appId of this.graph.keys()) {
      if (colors.get(appId) === WHITE) {
        if (dfs(appId)) return true;
      }
    }

    return false;
  }

  /**
   * Returns dependencies that are not in the app list (external deps)
   * @param appId The app ID to check external dependencies for
   * @returns Array of external dependency names
   */
  getExternalDependencies(appId: string): string[] {
    const appIds = new Set(this.apps.map(a => a.id));
    const deps = Array.from(this.graph.get(appId) || []);
    return deps.filter((dep: string) => !appIds.has(dep));
  }

  /**
   * Returns the set of known app IDs in the graph
   * @returns Set of all app IDs
   */
  getAvailableAppIds(): Set<string> {
    return new Set(this.apps.map(a => a.id));
  }

  /**
   * Returns known app IDs as an array
   * @returns Array of app IDs
   */
  getKnownAppIds(): string[] {
    return this.apps.map(a => a.id);
  }
}
