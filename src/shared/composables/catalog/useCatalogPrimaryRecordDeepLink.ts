import { nextTick, watch, type Ref } from 'vue';
import { useLabWorkspaceContext } from '@/shared/composables/useLabWorkspaceContext';
import { LAB_HOST_CTX_CATALOG_OPEN_PRIMARY_RECORD_ID } from '@/shared/lab-integrations/lab-host-context-keys';
import { logNotificationDeepLink } from '@/shared/utils/lab-notification-deeplink-debug';

/**
 * When the lab shell launches a catalog app with {@link LAB_HOST_CTX_CATALOG_OPEN_PRIMARY_RECORD_ID},
 * expand/focus that primary record after data loads.
 */
export function useCatalogPrimaryRecordDeepLink(options: {
  records: Ref<readonly { id: number }[]>;
  onFocusRecord: (recordId: number) => void;
  /** Called when a host-context deep link succeeds (before context is cleared). */
  onDeepLink?: (recordId: number) => void;
}): void {
  const labWorkspace = useLabWorkspaceContext();

  async function tryFocusFromHostContext(): Promise<void> {
    const raw = labWorkspace?.hostContext.value[LAB_HOST_CTX_CATALOG_OPEN_PRIMARY_RECORD_ID]?.trim();
    if (!raw) {
      return;
    }
    const recordId = Number.parseInt(raw, 10);
    if (!Number.isFinite(recordId)) {
      logNotificationDeepLink('catalog deep link: invalid record id', { raw });
      return;
    }
    logNotificationDeepLink('catalog deep link: saw host context', {
      recordId,
      recordCount: options.records.value.length,
      recordIds: options.records.value.map((row) => row.id),
    });
    options.onDeepLink?.(recordId);
    if (!options.records.value.some((row) => row.id === recordId)) {
      logNotificationDeepLink('catalog deep link: waiting for records', { recordId });
      return;
    }
    options.onFocusRecord(recordId);
    await nextTick();
    const el = document.querySelector(`[data-catalog-primary-id="${recordId}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    labWorkspace?.setHostContext({ [LAB_HOST_CTX_CATALOG_OPEN_PRIMARY_RECORD_ID]: '' });
    logNotificationDeepLink('catalog deep link: consumed host context', { recordId });
  }

  watch(
    () => [labWorkspace?.hostContext.value[LAB_HOST_CTX_CATALOG_OPEN_PRIMARY_RECORD_ID], options.records.value] as const,
    () => {
      void tryFocusFromHostContext();
    },
    { immediate: true },
  );
}
