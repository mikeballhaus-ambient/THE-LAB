import { LAB_CATALOG_LAUNCH_INTERACTIVE_SELECTOR } from '@/shared/constants/lab-shell-ui-automation';
import { LAB_SHELL_ACTION_ATTR } from '@/shared/constants/lab-shell-workspace-automation';

const LAB_WORKSPACE_TABBAR_INTERACTIVE_SELECTOR = [
  `[${LAB_SHELL_ACTION_ATTR}]`,
  '.lab-workspace-tab',
  '.lab-workspace-tab-action',
  '.lab-workspace-layout-pill',
  'button',
].join(', ');

/** Default scoped discovery — candidates are narrowed again by `isUiAutomationDiscoverCandidate`. */
export const UI_AUTOMATION_DEFAULT_INTERACTIVE_SELECTOR = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[data-lab-record-action]',
  '[data-lab-catalog-action]',
  '[data-lab-interactive]',
  '[onclick]',
  'audio',
].join(', ');

export const UI_AUTOMATION_DIALOG_INTERACTIVE_SELECTOR = [
  UI_AUTOMATION_DEFAULT_INTERACTIVE_SELECTOR,
  '.p-dialog button',
  '.p-dialog input',
  '.p-dialog [role="button"]',
].join(', ');

export interface UiAutomationContextProfile {
  contextSubstring: string;
  interactiveSelector: string;
  /** Warn when discover runs without searchPattern and in-scope count exceeds this. */
  unfilteredWarnThreshold: number;
}

export const UI_AUTOMATION_CONTEXT_PROFILES: UiAutomationContextProfile[] = [
  {
    contextSubstring: 'app-list-container',
    interactiveSelector: LAB_CATALOG_LAUNCH_INTERACTIVE_SELECTOR,
    unfilteredWarnThreshold: 40,
  },
  {
    contextSubstring: 'lab-app-catalog-sidebar',
    interactiveSelector: LAB_CATALOG_LAUNCH_INTERACTIVE_SELECTOR,
    unfilteredWarnThreshold: 40,
  },
  {
    contextSubstring: 'app-catalog-toolbar',
    interactiveSelector: LAB_CATALOG_LAUNCH_INTERACTIVE_SELECTOR,
    unfilteredWarnThreshold: 40,
  },
  {
    contextSubstring: 'app-catalog-body',
    interactiveSelector: LAB_CATALOG_LAUNCH_INTERACTIVE_SELECTOR,
    unfilteredWarnThreshold: 40,
  },
  {
    contextSubstring: 'settings-container',
    interactiveSelector: UI_AUTOMATION_DEFAULT_INTERACTIVE_SELECTOR,
    unfilteredWarnThreshold: 60,
  },
  {
    contextSubstring: 'lab-settings-dialog',
    interactiveSelector: UI_AUTOMATION_DIALOG_INTERACTIVE_SELECTOR,
    unfilteredWarnThreshold: 50,
  },
  {
    contextSubstring: 'lab-messages-dialog',
    interactiveSelector: UI_AUTOMATION_DIALOG_INTERACTIVE_SELECTOR,
    unfilteredWarnThreshold: 50,
  },
  {
    contextSubstring: 'lab-notifications-dialog',
    interactiveSelector: UI_AUTOMATION_DIALOG_INTERACTIVE_SELECTOR,
    unfilteredWarnThreshold: 50,
  },
  {
    contextSubstring: 'lab-quarks-wallet-dialog',
    interactiveSelector: UI_AUTOMATION_DIALOG_INTERACTIVE_SELECTOR,
    unfilteredWarnThreshold: 40,
  },
  {
    contextSubstring: 'lab-app-catalog-tags-dialog',
    interactiveSelector: UI_AUTOMATION_DIALOG_INTERACTIVE_SELECTOR,
    unfilteredWarnThreshold: 40,
  },
  {
    contextSubstring: 'app-loaded-container',
    interactiveSelector: UI_AUTOMATION_DEFAULT_INTERACTIVE_SELECTOR,
    unfilteredWarnThreshold: 80,
  },
  {
    contextSubstring: 'lab-workspace-tabbar',
    interactiveSelector: LAB_WORKSPACE_TABBAR_INTERACTIVE_SELECTOR,
    unfilteredWarnThreshold: 24,
  },
  {
    contextSubstring: 'app-view-layout',
    interactiveSelector: LAB_WORKSPACE_TABBAR_INTERACTIVE_SELECTOR,
    unfilteredWarnThreshold: 30,
  },
  {
    contextSubstring: 'lab-catalog-sidebar-rail',
    interactiveSelector: LAB_CATALOG_LAUNCH_INTERACTIVE_SELECTOR,
    unfilteredWarnThreshold: 8,
  },
  {
    contextSubstring: 'lab-running-apps-rail',
    interactiveSelector: [
      `[${LAB_SHELL_ACTION_ATTR}]`,
      'button.lab-running-apps-rail__restore',
      'button.lab-running-apps-rail__close',
      'button.lab-running-apps-rail-tab',
    ].join(', '),
    unfilteredWarnThreshold: 16,
  },
  {
    contextSubstring: 'p-dialog-mask',
    interactiveSelector: UI_AUTOMATION_DIALOG_INTERACTIVE_SELECTOR,
    unfilteredWarnThreshold: 60,
  },
];

export function resolveInteractiveSelectorForContext(contextArea: string): UiAutomationContextProfile {
  const normalized = contextArea.trim();
  for (const profile of UI_AUTOMATION_CONTEXT_PROFILES) {
    if (normalized.includes(profile.contextSubstring)) {
      return profile;
    }
  }
  return {
    contextSubstring: '',
    interactiveSelector: UI_AUTOMATION_DEFAULT_INTERACTIVE_SELECTOR,
    unfilteredWarnThreshold: 100,
  };
}
