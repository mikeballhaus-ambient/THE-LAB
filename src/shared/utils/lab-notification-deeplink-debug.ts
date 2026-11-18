const STORAGE_KEY = 'lab-debug-notification-deeplink';

/** Enable in DevTools: `localStorage.setItem('lab-debug-notification-deeplink', '1')` then reload. */
export function isNotificationDeepLinkDebugEnabled(): boolean {
  if (import.meta.env?.DEV) {
    return true;
  }
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function logNotificationDeepLink(
  step: string,
  detail?: Record<string, unknown>,
): void {
  if (!isNotificationDeepLinkDebugEnabled()) {
    return;
  }
  if (detail && Object.keys(detail).length > 0) {
    console.debug(`[lab-notification-deeplink] ${step}`, detail);
  } else {
    console.debug(`[lab-notification-deeplink] ${step}`);
  }
}
