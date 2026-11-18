import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import { DEFAULT_FORM_GRID_COLUMNS } from '@/shared/forms/form-layout';
import {
  PLATFORM_SERVICE_ID_LAB_APPROVAL_POLICIES,
  PLATFORM_SERVICE_ID_LAB_RULES,
  PLATFORM_SERVICE_ID_LAB_WORKFLOWS,
} from './platform-catalog-integration-services';

/** Full-width approval steps editor; keep metadata fields above it. */
export function layoutApprovalPolicyStubComponents(components: FormComponent[]): FormComponent[] {
  const cols = DEFAULT_FORM_GRID_COLUMNS;
  const order = ['name', 'description', 'enabled', 'approvalSteps'];
  const byKey = new Map(components.map((c) => [c.fieldKey, c]));
  const ordered: FormComponent[] = [];
  for (const key of order) {
    const row = byKey.get(key);
    if (row) {
      ordered.push(row);
      byKey.delete(key);
    }
  }
  for (const rest of byKey.values()) {
    ordered.push(rest);
  }
  return ordered.map((component, index) => {
    const next: FormComponent = { ...component, row: index, col: 0 };
    if (component.fieldKey === 'approvalSteps') {
      next.span = cols;
      next.label = 'Approval steps';
    }
    if (component.fieldKey === 'description') {
      next.span = Math.min(2, cols);
    }
    return next;
  });
}

function layoutRuleLikeStubComponents(
  components: FormComponent[],
  guideFieldKey: 'definitionGuide',
): FormComponent[] {
  const cols = DEFAULT_FORM_GRID_COLUMNS;
  const order = ['name', 'description', 'scope', 'enabled', 'priority', guideFieldKey];
  const byKey = new Map(components.map((c) => [c.fieldKey, c]));
  const ordered: FormComponent[] = [];
  for (const key of order) {
    const row = byKey.get(key);
    if (row) {
      ordered.push(row);
      byKey.delete(key);
    }
  }
  for (const rest of byKey.values()) {
    ordered.push(rest);
  }
  return ordered.map((component, index) => {
    const next: FormComponent = { ...component, row: index, col: 0 };
    if (component.fieldKey === guideFieldKey) {
      next.span = cols;
    }
    if (component.fieldKey === 'description') {
      next.span = Math.min(2, cols);
    }
    return next;
  });
}

const KNOWLEDGE_BASE_ARTICLES_SERVICE_ID = 'knowledge-base.articles';

/** Article create/edit: metadata on rows 1–2, full-width body textarea on row 3 (0-based row 2). */
export function layoutKnowledgeBaseArticleStubComponents(
  components: FormComponent[],
): FormComponent[] {
  const cols = DEFAULT_FORM_GRID_COLUMNS;
  const byKey = new Map(components.map((c) => [c.fieldKey, c]));
  const place = (
    key: string,
    row: number,
    col: number,
    span: number,
    patch?: Partial<FormComponent>,
  ): FormComponent | null => {
    const base = byKey.get(key);
    if (!base) {
      return null;
    }
    byKey.delete(key);
    return { ...base, row, col, span, ...patch };
  };

  const laidOut: FormComponent[] = [];
  const title = place('title', 0, 0, 1);
  const category = place('category', 0, 1, 1);
  const tags = place('tags', 0, 2, 1);
  const status = place('status', 0, 3, 1);
  const author = place('author', 1, 0, 1);
  const body = place('body', 2, 0, cols, { type: 'Textarea' });

  for (const row of [title, category, tags, status, author, body]) {
    if (row) {
      laidOut.push(row);
    }
  }
  for (const rest of byKey.values()) {
    laidOut.push(rest);
  }
  return laidOut;
}

export function layoutPlatformCatalogStubComponents(
  serviceId: string,
  components: FormComponent[],
): FormComponent[] {
  if (serviceId === PLATFORM_SERVICE_ID_LAB_APPROVAL_POLICIES) {
    return layoutApprovalPolicyStubComponents(components);
  }
  if (serviceId === PLATFORM_SERVICE_ID_LAB_RULES || serviceId === PLATFORM_SERVICE_ID_LAB_WORKFLOWS) {
    return layoutRuleLikeStubComponents(components, 'definitionGuide');
  }
  if (serviceId === KNOWLEDGE_BASE_ARTICLES_SERVICE_ID) {
    return layoutKnowledgeBaseArticleStubComponents(components);
  }
  return components;
}
