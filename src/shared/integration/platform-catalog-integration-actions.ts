export interface PlatformCatalogIntegrationChromeHandle {
  openSlot: (slot: string) => void;
  hasEnabledBinding: (slot: string) => boolean;
  refresh?: () => void;
}

export function tryOpenIntegrationSlot(
  chrome: PlatformCatalogIntegrationChromeHandle | null | undefined,
  slot: string,
  fallback: () => void,
): void {
  if (chrome?.hasEnabledBinding(slot)) {
    chrome.openSlot(slot);
    return;
  }
  fallback();
}
