import type { InjectionKey, Ref } from 'vue';

export interface LabIntegrationHostContext {
  hostAppId: string;
  serverUrl?: string;
  openSlot: (slot: string) => void;
  closeSlot: () => void;
  activeDialogSlot: Ref<string | null>;
}

export const labIntegrationHostContextKey: InjectionKey<LabIntegrationHostContext> = Symbol(
  'labIntegrationHostContext',
);
