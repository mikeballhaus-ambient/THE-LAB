import type { FormComponent, GroupContainerStyle, ContainerConfig } from '@/apps/lab-formsbuilder/shared/types';
import {
  groupContainerChildrenStyle,
  groupContainerWrapperStyle,
  resolveGroupChildrenDirection,
} from '@/shared/forms/group-container-layout';

export const CONTAINER_TYPES = new Set(['Group', 'Tabs']);

export function isContainerType(type: string | undefined): boolean {
  return type != null && CONTAINER_TYPES.has(type);
}

export function defaultContainerConfig(kind: 'group' | 'tabs'): ContainerConfig {
  if (kind === 'tabs') {
    return {
      kind: 'tabs',
      tabs: [
        { title: 'Tab 1', childFieldKeys: [] },
        { title: 'Tab 2', childFieldKeys: [] },
      ],
    };
  }
  return {
    kind: 'group',
    groupStyle: {
      showTitle: true,
      backgroundColor: '#334155',
      borderRadius: '0.5rem',
      padding: '0.75rem',
      margin: '0',
      borderWidth: '1px',
      borderColor: '#475569',
      childrenDirection: 'vertical',
      innerColumns: 2,
      innerLayout: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    },
  };
}

export function getChildComponents(
  container: FormComponent,
  all: FormComponent[] | undefined,
): FormComponent[] {
  if (!all?.length) {
    return [];
  }
  const key = container.fieldKey;
  return all
    .filter(c => c.parentContainerKey === key && !isContainerType(c.type))
    .sort((a, b) => {
      const rowDiff = (a.row ?? 0) - (b.row ?? 0);
      if (rowDiff !== 0) {
        return rowDiff;
      }
      return (a.col ?? 0) - (b.col ?? 0);
    });
}

/** @deprecated Use groupContainerWrapperStyle + groupContainerChildrenStyle */
export function groupStyleToCss(style: GroupContainerStyle | undefined): Record<string, string> {
  return {
    ...groupContainerWrapperStyle(style),
    ...groupContainerChildrenStyle(style),
  };
}

export { groupContainerWrapperStyle, groupContainerChildrenStyle, resolveGroupChildrenDirection };
