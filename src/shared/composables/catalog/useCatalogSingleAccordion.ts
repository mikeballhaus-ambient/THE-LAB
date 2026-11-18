import { ref } from 'vue';

/**
 * One collapsed-by-default accordion panel per master record id (travel items, charter details, etc.).
 * Bind PrimeVue 4 Accordion with `:value="accordionValue(id)"` and `@update:value="onAccordionChange(id, $event)"`.
 */
export function useCatalogSingleAccordion() {
  const expandedMasterIds = ref<Set<number>>(new Set());

  function accordionValue(masterId: number): string | null {
    return expandedMasterIds.value.has(masterId) ? String(masterId) : null;
  }

  function onAccordionChange(masterId: number, value: string | string[] | null | undefined): void {
    const next = new Set(expandedMasterIds.value);
    const open =
      value != null &&
      value !== '' &&
      (Array.isArray(value) ? value.includes(String(masterId)) : value === String(masterId));
    if (open) {
      next.add(masterId);
    } else {
      next.delete(masterId);
    }
    expandedMasterIds.value = next;
  }

  return { accordionValue, onAccordionChange };
}
