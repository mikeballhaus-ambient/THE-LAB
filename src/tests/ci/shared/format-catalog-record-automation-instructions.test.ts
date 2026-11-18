import { describe, expect, test } from '@jest/globals';
import {
  formatCatalogHostRecordAutomationSection,
  formatPlatformRecordListAutomationSection,
} from '@/shared/constants/format-catalog-record-automation-instructions';

describe('format-catalog-record-automation-instructions', () => {
  test('catalog host section includes record attrs and display name', () => {
    const md = formatCatalogHostRecordAutomationSection({
      appId: 'app-polls-surveys',
      displayName: 'Polls & Surveys',
      contextAreaClass: 'polls-surveys-app',
      primaryRecordLabel: 'poll question',
    });
    expect(md).toContain('Polls & Surveys');
    expect(md).toContain('data-lab-record-name');
    expect(md).toContain('polls-surveys-app');
    expect(md).toContain('poll question');
  });

  test('platform list section includes contextArea', () => {
    const md = formatPlatformRecordListAutomationSection({
      contextArea: 'lab-workflow-studio-app',
      recordLabel: 'workflow',
      launchHint: 'Launch Workflow Studio from the catalog.',
    });
    expect(md).toContain('lab-workflow-studio-app');
    expect(md).toContain('data-lab-record-action');
  });
});
