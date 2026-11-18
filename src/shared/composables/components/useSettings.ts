import { ref } from "vue";

export function useSettings() {
  const mainTab = ref<string>('system');

  return {
    mainTab,
  };
}
