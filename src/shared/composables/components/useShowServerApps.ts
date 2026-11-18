import { ref, watchEffect } from 'vue';

export function useShowServerApps(
  setShowServerApps: (showServerApps: boolean) => Promise<void>,
  getShowServerApps: () => Promise<boolean>
) {
  const showServerApps = ref<boolean>(false);

  const toggleShowServerApps = async () => {
    await setShowServerApps(!showServerApps.value);
  };

  watchEffect(async () => {
    showServerApps.value = await getShowServerApps();
  });

  return {
    showServerApps,
    toggleShowServerApps,
  };
}
