import { z } from 'zod';
import { LAB_SHELL_CONTEXT_AREA_SCHEMA_HINT } from '@/shared/constants/lab-shell-ui-automation';

export const UIAutomationOperation = {
  DISCOVER_ELEMENTS: 'discoverElements',
  ELEMENT_ACTION: 'elementAction'
} as const;

export type UIAutomationOperationValue = (typeof UIAutomationOperation)[keyof typeof UIAutomationOperation];


export interface UITargetData {
  target: string;
  selector?: { byId?: string | null; byClass?: string | null; byTag?: string | null };
}

export interface UIDiscoveryElement {
  tag: string;
  id?: string | null;
  className?: string[];
  textContent?: string | null;
  attributes?: Record<string, string>;
  position?: { x: number; y: number; width: number; height: number };
  parentId?: string;
  isInteractive: boolean;
  isVisible: boolean;
  contextArea?: string;
  parentContextHTML?: string;  // HTML text content from parent elements (up to 2 levels)
  /** Stable id stamped on the DOM during discover — prefer for element_action. */
  elementRef: string;
  /** Canonical CSS selector (catalog/record targets when available). */
  target: string;
  /** Discovery hint — catalog launch rows are the only Launch clicks in apps home. */
  uiRole?:
    | 'catalog-launch'
    | 'catalog-pin'
    | 'catalog-edit-tags'
    | 'catalog-tag-filter'
    | 'catalog-toolbar'
    | 'record-action'
    | 'workspace-tab'
    | 'workspace-layout'
    | 'workspace-chrome'
    | 'shell-rail'
    | 'generic';
  catalogLaunch?: { appId: string; appName: string };
  recordAction?: { recordId: string; recordName?: string; action: string };
  shellAction?: { action: string; targetAppId?: string };
}

export interface UIDiscoveryResponseData extends UIAutomationDiscoverParams {
  isStreaming: boolean;
  elements: UIDiscoveryElement[];
  totalCount: number;
  resultMessage?: string;
}

export interface UIElementActionResultItem {
  order: number;
  target: string;
  elementRef?: string;
  action: string;
  success: boolean;
  resultMessage?: string;
}

// ========== ELEMENT ACTION RESPONSE DATA ==========
export interface UIElementActionResponseData extends UIAutomationElementActionParams {
  isStreaming: boolean;
  success: boolean;
  results?: Array<UIElementActionResultItem>;
}

// UI Automation - Discover Elements schema for tool parameters
export const discoverElementsSchemaFields = z.object({
  sessionId: z.string().describe('Current session ID for scoping the discovery request'),
  persona: z.string().describe('Persona to use for generating responses based on discovered elements. Valid values: Chat, Orchestrator, Architect, Code, Debug, QA (or any user-created persona)'),
  searchPattern: z
    .string()
    .optional()
    .describe(
      'Optional filter term (case-insensitive substring). Matches element id, classes, data-* / aria-label, or visible text. Example: Workflow Studio or app-lab-workflow-studio. Not a CSS selector (quoted attribute values are extracted). Prefix regex: for regex:/pattern/i',
    ),
  maxResults: z.number().default(25).optional().describe('Maximum number of interactive elements to return (default: 25)'),
  skip: z.number().int().nonnegative().default(0).optional().describe('Number of results to skip before returning results. Enables pagination'),
  contextArea: z.string().describe(LAB_SHELL_CONTEXT_AREA_SCHEMA_HINT),
});

export type UIAutomationDiscoverParams = z.infer<typeof discoverElementsSchemaFields>;

// UI Automation - Element Action schema for tool parameters
export const elementActionSchemaFields = z.object({
  sessionId: z.string().describe('Current session ID for scoping the action request'),
  persona: z.string().describe('Persona to use for generating responses based on action results. Valid values: Chat, Orchestrator, Architect, Code, Debug, QA (or any user-created persona)'),
  actions: z
    .array(
      z
        .object({
          order: z.number().int().positive().describe('Execution order (guideline, not strict rule)'),
          target: z
            .string()
            .optional()
            .describe('CSS selector from discovery `target` (fallback when elementRef missing)'),
          elementRef: z
            .string()
            .optional()
            .describe('Prefer this — copy `elementRef` from the same discover result row'),
          action: z
            .enum([
              'click',
              'doubleClick',
              'hover',
              'focus',
              'blur',
              'press',
              'setValue',
              'setAttribute',
              'removeAttribute',
            ])
            .describe('Action type'),
          actionParams: z.record(z.string(), z.any()).optional().describe('Action-specific parameters'),
        })
        .superRefine((item, ctx) => {
          const hasTarget = Boolean(item.target?.trim());
          const hasRef = Boolean(item.elementRef?.trim());
          if (!hasTarget && !hasRef) {
            ctx.addIssue({
              code: 'custom',
              message: 'Each action needs elementRef (preferred) or target from discovery',
            });
          }
        }),
    )
    .min(1)
    .describe('Array of actions to execute in sequential order'),
});

export type UIAutomationElementActionParams = z.infer<typeof elementActionSchemaFields>;
