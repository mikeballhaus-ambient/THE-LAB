import { describe, expect, test } from '@jest/globals';
import {
  buildLabCatalogLaunchTargetSelector,
  labCatalogLaunchButtonPt,
} from '@/shared/constants/lab-shell-ui-automation';

describe('lab-catalog-launch-automation', () => {
  test('buildLabCatalogLaunchTargetSelector is stable for agents', () => {
    expect(buildLabCatalogLaunchTargetSelector('button', 'app-lab-workflow-studio')).toBe(
      'button[data-app-id="app-lab-workflow-studio"][data-lab-catalog-action="launch"]',
    );
  });

  test('labCatalogLaunchButtonPt carries launch attrs on root', () => {
    const pt = labCatalogLaunchButtonPt(() => 'id-1', 'app-lab-workflow-studio', 'Workflow Studio', 'grid');
    expect(pt.root.attrs['data-app-id']).toBe('app-lab-workflow-studio');
    expect(pt.root.attrs['data-appname']).toBe('Workflow Studio');
    expect(pt.root.attrs['data-lab-catalog-action']).toBe('launch');
    expect(pt.root.attrs['aria-label']).toBe('Launch Workflow Studio');
  });
});
