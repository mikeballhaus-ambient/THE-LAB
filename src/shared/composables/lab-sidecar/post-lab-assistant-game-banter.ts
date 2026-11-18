import type { LabAssistantBanterRequest } from '@/shared/game-platform/lab-assistant-banter/types';
import { getLabShellSidecarBridge } from '@/shared/composables/lab-shell-sidecar-bridge';
import { isLabGameBanterDisabled } from '@/shared/composables/lab-sidecar/lab-game-sidecar-preferences-state';

import { getCurrentUserName } from '@/shared/types/auth/index';

export type { LabAssistantBanterRequest };

/** Fire-and-forget Sidecar table talk when the shell bridge is registered. */
export function postLabAssistantGameBanter(request: LabAssistantBanterRequest): void {
  if (isLabGameBanterDisabled()) {
    return;
  }
  const bridge = getLabShellSidecarBridge();
  if (!bridge?.postGameBanter) {
    return;
  }
  const humanDisplayName = getCurrentUserName() ?? undefined;
  void bridge.postGameBanter({
    ...request,
    humanDisplayName: request.humanDisplayName ?? humanDisplayName,
  });
}
