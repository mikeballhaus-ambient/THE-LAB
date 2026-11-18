import type { InjectionKey, Ref } from 'vue';
import type { FormComponent } from '../../../shared/types';

export interface ContainerDropEvent {
  containerFieldKey: string;
  tabIndex?: number;
  component: FormComponent;
}

export type ContainerDropHandler = (event: ContainerDropEvent) => void;

export const FORM_DESIGN_CONTAINER_DROP_KEY: InjectionKey<ContainerDropHandler> = Symbol(
  'formDesignContainerDrop',
);

/** Active tab index per Tabs container fieldKey (designer canvas). */
export const FORM_DESIGN_TABS_ACTIVE_TAB_KEY: InjectionKey<Ref<Map<string, number>>> = Symbol(
  'formDesignTabsActiveTab',
);

export interface DesignCanvasActions {
  select: (component: FormComponent) => void;
  remove: (component: FormComponent) => void;
}

export const FORM_DESIGN_CANVAS_ACTIONS_KEY: InjectionKey<DesignCanvasActions> = Symbol(
  'formDesignCanvasActions',
);
