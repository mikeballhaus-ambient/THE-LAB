import type { EntityFormBinding, FormBindingPurpose } from '../types/entity.types';

/** One row per entity + purpose — keep newest (highest id) when legacy saves created duplicates. */
export function dedupeFormBindings(bindings: EntityFormBinding[]): EntityFormBinding[] {
  const best = new Map<string, EntityFormBinding>();
  for (const binding of bindings) {
    const groupKey = `${binding.entityDefinitionId}:${binding.purpose}`;
    const existing = best.get(groupKey);
    if (!existing || binding.id > existing.id) {
      best.set(groupKey, binding);
    }
  }
  return [...best.values()].sort((a, b) => {
    const entityCmp = (a.entityKey ?? '').localeCompare(b.entityKey ?? '');
    if (entityCmp !== 0) {
      return entityCmp;
    }
    return a.purpose.localeCompare(b.purpose);
  });
}

export function bindingsForEntity(
  bindings: EntityFormBinding[],
  entityKey: string,
  entityDefinitionId?: number,
): EntityFormBinding[] {
  const deduped = dedupeFormBindings(bindings);
  return deduped.filter(
    (b) =>
      b.entityKey === entityKey ||
      (entityDefinitionId != null && b.entityDefinitionId === entityDefinitionId),
  );
}

export function formKeyForPurpose(
  bindings: EntityFormBinding[],
  purpose: FormBindingPurpose,
): string | undefined {
  return bindings.find((b) => b.purpose === purpose)?.formKey;
}

export function hasDuplicatePurposeRows(
  bindings: EntityFormBinding[],
  entityDefinitionId: number,
  purpose: FormBindingPurpose,
): boolean {
  return bindings.filter((b) => b.entityDefinitionId === entityDefinitionId && b.purpose === purpose).length > 1;
}
