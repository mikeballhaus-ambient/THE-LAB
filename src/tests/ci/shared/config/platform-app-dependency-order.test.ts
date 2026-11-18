import { describe, test, expect } from '@jest/globals';
import {
  CANONICAL_CRM_DEPENDENCIES,
  mergeDependenciesCanonical,
  orderDependenciesForLaunch,
} from '@/shared/config/platform-app-dependency-order';

describe('platform-app-dependency-order', () => {
  test('orderDependenciesForLaunch puts forms and chart builder first', () => {
    const ordered = orderDependenciesForLaunch([
      'app-lab-tasklist',
      'app-lab-chartbuilder',
      'app-lab-helpdesk',
      'app-lab-formsbuilder',
    ]);
    expect(ordered).toEqual([
      'app-lab-formsbuilder',
      'app-lab-chartbuilder',
      'app-lab-tasklist',
      'app-lab-helpdesk',
    ]);
  });

  test('mergeDependenciesCanonical preserves CRM order', () => {
    const merged = mergeDependenciesCanonical(
      ['app-lab-chartbuilder', 'app-lab-tasklist', 'app-lab-formsbuilder'],
      CANONICAL_CRM_DEPENDENCIES,
    );
    expect(merged).toEqual([...CANONICAL_CRM_DEPENDENCIES]);
  });
});
