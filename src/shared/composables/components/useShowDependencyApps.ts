import { ref, watchEffect } from 'vue';

/**
 * Dependency-app visibility, shared process-wide.
 *
 * This used to be a per-call-site `ref`. `AppViewLayout` owns the toggle, but the running-apps
 * rail and the shell's workspace-parked decision also need the value — and independent copies
 * drift the moment one of them hydrates late or is never updated (the toggle has no setter
 * there). One module-level ref keeps every reader consistent, matching the session-backed
 * setting it mirrors.
 */
const showDependencyApps = ref<boolean>(false);

/**
 * Register a persistence pair and expose the shared flag.
 *
 * Hydration runs once per registration; `watchEffect` keeps re-reading until the session store
 * answers, which is why it is not a one-shot `onMounted`.
 */
export function useShowDependencyApps(
  setShowDependencyApps: (showDependencyApps: boolean) => Promise<void>,
  getShowDependencyApps: () => Promise<boolean>,
) {
  let hydrated = false;

  watchEffect(async () => {
    if (hydrated) {
      return;
    }
    const value = await getShowDependencyApps();
    hydrated = true;
    showDependencyApps.value = value;
  });

  async function updateShowDependencyApps(value: boolean): Promise<void> {
    showDependencyApps.value = value;
    await setShowDependencyApps(value);
  }

  return {
    showDependencyApps,
    updateShowDependencyApps,
  };
}

/** Read the shared flag without registering persistence (panes, rail, shell). */
export function useShowDependencyAppsState() {
  return { showDependencyApps };
}
