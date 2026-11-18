/** Browser-persisted vs–Lab Assistant Sidecar UX (Dexie `sessionState`). */
export interface LabGameSidecarPreferences {
  /** Open Lab Sidecar when a vs–Lab Assistant catalog game app is launched. */
  autoOpenSidecar: boolean;
  /** Skip LLM game banter (moments + slow-turn nudges). Chat in Sidecar still works. */
  banterDisabled: boolean;
}

export const DEFAULT_LAB_GAME_SIDECAR_PREFERENCES: LabGameSidecarPreferences = {
  autoOpenSidecar: true,
  banterDisabled: false,
};
