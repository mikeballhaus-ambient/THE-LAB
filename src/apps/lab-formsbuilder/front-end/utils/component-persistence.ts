import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';

/** True when definition includes a mountable Vue component (not JSON from SQLite). */
export function definitionIsHydrated(definition: FormComponent['definition']): boolean {
  if (!definition?.component) {
    return false;
  }
  const comp = definition.component as { default?: unknown } | (() => unknown);
  if (typeof comp === 'function') {
    return true;
  }
  if (comp && typeof comp === 'object' && 'default' in comp && comp.default) {
    return true;
  }
  return false;
}

export function resolveDefinitionComponent(
  definition: FormComponent['definition'],
): unknown | null {
  if (!definition?.component) {
    return null;
  }
  const comp = definition.component as { default?: unknown };
  if (comp && typeof comp === 'object' && 'default' in comp && comp.default) {
    return comp.default;
  }
  return comp ?? null;
}

/** Omit designer-only fields before POST/PUT (definitions are reloaded from the registry). */
export function stripComponentsForSave(components: FormComponent[]): FormComponent[] {
  return components.map((item) => {
    const persisted = { ...item } as FormComponent & { component?: unknown };
    delete persisted.definition;
    delete persisted.component;
    return persisted;
  });
}
