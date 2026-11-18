import type { Ref } from 'vue';
import { useCatalogHostLiveRefresh } from './useCatalogHostLiveRefresh';
import { useCatalogReportsChartContext } from './useCatalogReportsChartContext';

export interface UseCatalogWorkspaceRefreshOptions {
  hostAppId: string;
  serverUrl: Ref<string> | (() => string);
  /** Reload workspace lists / summaries (not charts — those refetch via `dataRevision`). */
  reload: () => void | Promise<void>;
}

/**
 * Catalog workspace live refresh: Socket.IO `catalog-host:data-changed` + chart `dataRevision` bump.
 * Use with `CatalogAppReportsSection` `:chart-context="reportsChartContext"`.
 */
export function useCatalogWorkspaceRefresh(options: UseCatalogWorkspaceRefreshOptions) {
  const { reportsChartContext, bumpReportsCharts } = useCatalogReportsChartContext();

  async function reloadWorkspace(): Promise<void> {
    await options.reload();
    bumpReportsCharts();
  }

  useCatalogHostLiveRefresh({
    hostAppId: options.hostAppId,
    serverUrl: options.serverUrl,
    onRefresh: () => reloadWorkspace(),
  });

  return { reportsChartContext, reloadWorkspace, bumpReportsCharts };
}
