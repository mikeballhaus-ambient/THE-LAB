import type { LabWorkflowRecord } from '@/shared/types/lab-workflow';
import { labWorkflowTagKey } from '@/shared/utils/lab-workflow-tags';

export const WORKFLOW_UNTAGGED_SECTION_KEY = '__uncategorized__';
export const WORKFLOW_UNTAGGED_SECTION_LABEL = 'Untagged workflows';

export interface WorkflowTagSection {
  key: string;
  label: string;
  workflows: LabWorkflowRecord[];
}

function sortWorkflowsForBrowse(workflows: LabWorkflowRecord[]): LabWorkflowRecord[] {
  return [...workflows].sort(
    (a, b) => a.priority - b.priority || a.name.localeCompare(b.name),
  );
}

/**
 * Browse layout: each workflow appears once under its **primary** tag (`tags[0]`),
 * matching app catalog primary-section grouping.
 */
export function buildWorkflowSectionsByPrimaryTag(
  workflows: LabWorkflowRecord[],
): WorkflowTagSection[] {
  const byKey = new Map<string, { label: string; workflows: LabWorkflowRecord[] }>();
  const untagged: LabWorkflowRecord[] = [];

  for (const workflow of sortWorkflowsForBrowse(workflows)) {
    const primary = workflow.tags?.[0]?.trim();
    if (!primary) {
      untagged.push(workflow);
      continue;
    }
    const key = labWorkflowTagKey(primary);
    const bucket = byKey.get(key) ?? { label: primary, workflows: [] };
    bucket.workflows.push(workflow);
    byKey.set(key, bucket);
  }

  const sections: WorkflowTagSection[] = [...byKey.entries()]
    .sort((a, b) => a[1].label.localeCompare(b[1].label))
    .map(([key, { label, workflows: list }]) => ({
      key,
      label,
      workflows: list,
    }));

  if (untagged.length > 0) {
    sections.push({
      key: WORKFLOW_UNTAGGED_SECTION_KEY,
      label: WORKFLOW_UNTAGGED_SECTION_LABEL,
      workflows: untagged,
    });
  }

  return sections;
}