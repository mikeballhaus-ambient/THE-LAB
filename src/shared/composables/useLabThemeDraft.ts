import { useLabThemeDraftStore } from '@/shared/theme/lab-theme-draft-store';

/** Admin theme draft session (rm-49 Phase 3). */
export function useLabThemeDraft() {
  return useLabThemeDraftStore();
}
