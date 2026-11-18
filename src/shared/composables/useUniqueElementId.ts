import { useId } from "vue";

/**
 * Generates unique IDs for interactive elements using Vue 3's useId() API.
 * Call this composable in any component that contains interactive elements.
 * 
 * @returns Object with generateUniqueId function that creates stable, globally unique IDs
 */
export function useUniqueElementId() {
  const globalId = useId(); // Stable, unique per component instance (Vue 3.5.28+)
  
  return {
    generateUniqueId: (prefix: string = 'ui') => `${prefix}-${globalId}`,
  };
}
