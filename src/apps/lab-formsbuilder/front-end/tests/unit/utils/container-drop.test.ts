import { describe, test, expect } from '@jest/globals';
import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import {
  assignComponentToContainer,
  releaseComponentToTopLevelGrid,
  addFieldKeyToTab,
} from '@/apps/lab-formsbuilder/front-end/utils/container-drop';
import { defaultContainerConfig } from '@/apps/lab-formsbuilder/front-end/utils/container-types';

describe('container-drop', () => {
  test('assignComponentToContainer sets parent and tab child keys', () => {
    const container: FormComponent = {
      fieldKey: 'tabs-1',
      type: 'Tabs',
      label: 'Tabs',
      container: defaultContainerConfig('tabs'),
    };
    const field: FormComponent = {
      fieldKey: 'name',
      type: 'InputText',
      label: 'Name',
      row: 0,
      col: 0,
    };
    const all: FormComponent[] = [container, field];

    assignComponentToContainer(field, container, all, 0);

    expect(field.parentContainerKey).toBe('tabs-1');
    expect(field.row).toBe(0);
    expect(container.container?.tabs?.[0].childFieldKeys).toContain('name');
  });

  test('assignComponentToContainer assigns to second tab', () => {
    const container: FormComponent = {
      fieldKey: 'tabs-1',
      type: 'Tabs',
      label: 'Tabs',
      container: defaultContainerConfig('tabs'),
    };
    const field: FormComponent = {
      fieldKey: 'city',
      type: 'InputText',
      label: 'City',
      row: 0,
      col: 0,
    };
    assignComponentToContainer(field, container, [container, field], 1);
    expect(container.container?.tabs?.[1].childFieldKeys).toContain('city');
  });

  test('releaseComponentToTopLevelGrid clears parent and sets grid position', () => {
    const container: FormComponent = {
      fieldKey: 'g1',
      type: 'Group',
      label: 'Group',
      container: defaultContainerConfig('group'),
    };
    const field: FormComponent = {
      fieldKey: 'email',
      type: 'InputText',
      label: 'Email',
      parentContainerKey: 'g1',
    };
    const all = [container, field];

    releaseComponentToTopLevelGrid(field, 1, 2, all);

    expect(field.parentContainerKey).toBeUndefined();
    expect(field.row).toBe(1);
    expect(field.col).toBe(2);
  });

  test('addFieldKeyToTab adds unique keys', () => {
    const container: FormComponent = {
      fieldKey: 't1',
      type: 'Tabs',
      label: 'Tabs',
      container: defaultContainerConfig('tabs'),
    };
    addFieldKeyToTab(container, 0, 'a');
    addFieldKeyToTab(container, 0, 'a');
    expect(container.container?.tabs?.[0].childFieldKeys).toEqual(['a']);
  });
});
