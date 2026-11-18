import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import { isContainerType } from './container-types';

export function getContainerChildren(
  allComponents: FormComponent[] | undefined,
  containerFieldKey: string,
): FormComponent[] {
  return (allComponents ?? []).filter(c => c.parentContainerKey === containerFieldKey);
}

export function nextChildRow(allComponents: FormComponent[], containerFieldKey: string): number {
  const siblings = getContainerChildren(allComponents, containerFieldKey);
  if (siblings.length === 0) {
    return 0;
  }
  return Math.max(...siblings.map(c => c.row ?? 0)) + 1;
}

export function removeFieldKeyFromAllTabs(container: FormComponent, fieldKey: string): void {
  const tabs = container.container?.tabs;
  if (!tabs?.length) {
    return;
  }
  for (const tab of tabs) {
    tab.childFieldKeys = (tab.childFieldKeys ?? []).filter(k => k !== fieldKey);
  }
}

export function addFieldKeyToTab(
  container: FormComponent,
  tabIndex: number,
  fieldKey: string,
): void {
  if (container.type !== 'Tabs' || !container.container?.tabs?.length) {
    return;
  }
  const idx = Math.max(0, Math.min(tabIndex, container.container.tabs.length - 1));
  const tab = container.container.tabs[idx];
  if (!tab.childFieldKeys) {
    tab.childFieldKeys = [];
  }
  if (!tab.childFieldKeys.includes(fieldKey)) {
    tab.childFieldKeys.push(fieldKey);
  }
}

/** Move or assign a canvas field into a Group/Tabs container. */
export function assignComponentToContainer(
  component: FormComponent,
  container: FormComponent,
  allComponents: FormComponent[],
  tabIndex?: number,
): void {
  if (isContainerType(component.type)) {
    return;
  }
  if (component.fieldKey === container.fieldKey) {
    return;
  }

  removeFieldKeyFromAllTabs(container, component.fieldKey);

  component.parentContainerKey = container.fieldKey;
  component.row = nextChildRow(
    allComponents.filter(c => c !== component),
    container.fieldKey,
  );
  component.col = 0;
  component.span = 1;
  component.rowSpan = 1;

  if (container.type === 'Tabs') {
    addFieldKeyToTab(container, tabIndex ?? 0, component.fieldKey);
  }
}

/** Return a canvas field to the top-level grid. */
export function releaseComponentToTopLevelGrid(
  component: FormComponent,
  row: number,
  col: number,
  allComponents: FormComponent[],
): void {
  for (const c of allComponents) {
    if (isContainerType(c.type)) {
      removeFieldKeyFromAllTabs(c, component.fieldKey);
    }
  }
  component.parentContainerKey = undefined;
  component.row = row;
  component.col = col;
}
