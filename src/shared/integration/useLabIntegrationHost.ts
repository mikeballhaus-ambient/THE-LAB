import { inject } from 'vue';
import {
  labIntegrationHostContextKey,
  type LabIntegrationHostContext,
} from './lab-integration-host-context';

export function useLabIntegrationHost(): LabIntegrationHostContext | null {
  return inject(labIntegrationHostContextKey, null);
}
