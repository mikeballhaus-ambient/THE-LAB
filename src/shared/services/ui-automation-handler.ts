// UI Automation Handler Service
// Browser-compatible Singleton Pattern for UIAutomationHandler
//
// Rationale: In browser context, the singleton persists across Vue component
// lifecycle (mount/unmount). This prevents memory leaks from creating multiple
// instances and ensures consistent state management for DOM operations.

import {
  UIDiscoveryResponseData,
  UIElementActionResponseData,
  UIAutomationDiscoverParams,
  UIAutomationElementActionParams,
  UIAutomationOperation
} from '@/shared/types';
import { sanitizeUiAutomationDiscoveryText } from '@/shared/utils/ui-automation-discover-content';
import { compileUiAutomationSearchPattern } from '@/shared/utils/ui-automation-search-pattern';
import {
  matchesUiAutomationDiscoverSearchPattern,
  rankUiAutomationDiscoverElement,
} from '@/shared/utils/ui-automation-record-row-search';
import {
  mergeDiscoverCandidates,
  refineDiscoverMatchesByUiRole,
  UI_AUTOMATION_ACTIONABLE_SUPPLEMENT_SELECTOR,
} from '@/shared/utils/ui-automation-discover-candidates';
import { resolveInteractiveSelectorForContext } from '@/shared/utils/ui-automation-context-profiles';
import { resolveUiAutomationDiscoverIntent } from '@/shared/utils/ui-automation-discover-intent';
import {
  isLabRecordActionControl,
  readLabRecordActionDiscoverMeta,
} from '@/shared/constants/lab-record-automation';
import {
  isLabShellWorkspaceControl,
  readLabShellActionDiscoverMeta,
  resolveShellActionUiRole,
} from '@/shared/constants/lab-shell-workspace-automation';
import {
  catalogLaunchMatchesSearchPattern,
  catalogTagFilterMatchesSearchPattern,
  filterCatalogChromeDiscoverPool,
  filterToCatalogCardActionControls,
  filterToCatalogTagFilterControls,
  hasVisibleMountedAppWorkspace,
  isCatalogCardActionControl,
  isCatalogDiscoveryContext,
  isCatalogEditTagsControl,
  isCatalogLaunchControl,
  isCatalogPinControl,
  isCatalogTagFilterControl,
  isCatalogToolbarControl,
  shouldExpandCatalogSidebarForDiscovery,
  readCatalogLaunchMeta,
  sampleCatalogLaunchLabels,
  sortCatalogLaunchByPattern,
} from '@/shared/utils/ui-automation-catalog-discover';
import {
  applyCatalogSearchForDiscovery,
  delayForCatalogDomRefresh,
  expandCollapsedCatalogSidebarIfNeeded,
} from '@/shared/utils/ui-automation-catalog-search-prime';
import {
  assignUiAutomationElementRef,
  buildUiAutomationDiscoveryTarget,
  resolveUiAutomationElement,
} from '@/shared/utils/ui-automation-target';
import { LAB_SHELL_UI_AUTOMATION_CONTEXT_AREAS } from '@/shared/constants/lab-shell-ui-automation';

type UIAutomationDiscoveryResponseCallback = (data: UIDiscoveryResponseData) => Promise<void>;
type UIAutomationActionResponseCallback = (data: UIElementActionResponseData) => Promise<void>;

export class UIAutomationHandler {
  // Static instance property - persists across module lifetime
  private static instance: UIAutomationHandler | null = null;

  // Private constructor guard - prevents direct instantiation with 'new' keyword
  private constructor() { }

  // ========== DISCOVERY HANDLER ==========
  private uiAutomationDiscoveryResponseReceived?: UIAutomationDiscoveryResponseCallback;

  // ========== ELEMENT ACTION HANDLER ==========
  private uiAutomationActionResponseReceived?: UIAutomationActionResponseCallback;

  /**
   * Get singleton instance and initialize callbacks if not already done.
   * This is the safe way to access the handler - always use getInstance().
   */
  public static getInstance(): UIAutomationHandler {
    if (!UIAutomationHandler.instance) UIAutomationHandler.instance = new UIAutomationHandler();
    return UIAutomationHandler.instance;
  }

  setuiAutomationActionResponseReceived(uiAutomationActionResponseReceived: UIAutomationActionResponseCallback) {
    this.uiAutomationActionResponseReceived = uiAutomationActionResponseReceived
  }

  setuiAutomationDiscoveryResponseReceived(uiAutomationDiscoveryResponseReceived: UIAutomationDiscoveryResponseCallback) {
    this.uiAutomationDiscoveryResponseReceived = uiAutomationDiscoveryResponseReceived
  }

  // ========== DISCOVERY HANDLER ==========

  async enumerateInteractiveElements(request: UIAutomationDiscoverParams, isStreaming: boolean): Promise<void> {
    const timeout = setTimeout(async () => {
      if (this.uiAutomationDiscoveryResponseReceived) {
        await this.uiAutomationDiscoveryResponseReceived({
          isStreaming: isStreaming,
          operation: UIAutomationOperation.DISCOVER_ELEMENTS,
          sessionId: request.sessionId,
          persona: request.persona,
          searchPattern: request.searchPattern || null,
          maxResults: request.maxResults,
          skip: request.skip || 0,
          contextArea: request.contextArea || null,
          elements: [],  // Empty array on error
          totalCount: 0,
          resultMessage: `Element enumeration timed out`
        } as UIDiscoveryResponseData);
      }
    }, 10000); // 10 second timeout
    try {
      const patternRaw = request.searchPattern?.trim();
      const contextArea = request.contextArea ?? '';
      const discoverIntent = resolveUiAutomationDiscoverIntent(contextArea);
      const catalogLaunchMode = discoverIntent === 'catalog-launch';
      const mountedAppOpen = hasVisibleMountedAppWorkspace();

      if (catalogLaunchMode && patternRaw) {
        const compiled = compileUiAutomationSearchPattern(patternRaw);
        const primedSearch = applyCatalogSearchForDiscovery(compiled.effectiveTerm);
        const expandedSidebar = shouldExpandCatalogSidebarForDiscovery(contextArea)
          ? expandCollapsedCatalogSidebarIfNeeded()
          : false;
        if (primedSearch || expandedSidebar) {
          await delayForCatalogDomRefresh(primedSearch && expandedSidebar ? 140 : 100);
        }
      }

      // Scope element discovery to contextArea if provided
      const elements = request.contextArea
        ? this.findInteractiveElementsInContainer(request.contextArea)
        : this.findInteractiveElements();

      let filteredElements = elements;
      let discoveryResultMessage = '';
      const contextProfile = resolveInteractiveSelectorForContext(contextArea);

      if (
        isCatalogDiscoveryContext(contextArea) &&
        !catalogLaunchMode &&
        mountedAppOpen &&
        patternRaw
      ) {
        discoveryResultMessage =
          `Mounted app workspace is open — do not use contextArea "app-list-container" for in-app row actions (catalog search and launcher sidebar were not auto-opened). ` +
          `Scope to the focused app root (e.g. lab-workflow-studio-app) and searchPattern on the record name (workflow title), not "Launch" or generic "edit".`;
        filteredElements = this.filterElementsByPattern(filteredElements, patternRaw);
      } else if (discoverIntent === 'catalog-chrome' && isCatalogDiscoveryContext(contextArea)) {
        const chromePool = filterCatalogChromeDiscoverPool(elements);
        if (!patternRaw) {
          filteredElements = chromePool.filter(isLabShellWorkspaceControl);
          discoveryResultMessage =
            `Catalog chrome: ${chromePool.length} control(s) in scope. Pass searchPattern (e.g. app name, Launch, Close, "app launcher", "running apps").`;
        } else {
          filteredElements = this.filterElementsByPattern(chromePool, patternRaw);
          filteredElements = refineDiscoverMatchesByUiRole(filteredElements);
          filteredElements = this.sortDiscoverElementsByRelevance(filteredElements, patternRaw);
          if (filteredElements.length === 0) {
            discoveryResultMessage =
              `No catalog chrome controls matched searchPattern "${patternRaw}" in "${contextArea}". ` +
              `Try lab-catalog-sidebar-rail, lab-app-catalog-sidebar, lab-running-apps-rail, or search + launch/close-tab rows.`;
          }
        }
      } else if (catalogLaunchMode) {
        const catalogLaunchPool = filterToCatalogCardActionControls(elements);
        const catalogLaunchCount = catalogLaunchPool.length;
        if (!patternRaw) {
          filteredElements = elements.filter(isCatalogToolbarControl);
          discoveryResultMessage =
            `Catalog: ${catalogLaunchCount} app Launch/Pin/Tags control(s) omitted without searchPattern. ` +
            `Pass searchPattern with the app display name (e.g. Workflow Studio) or registry id (app-lab-workflow-studio) to return Launch, Pin, and Edit-tags button(s) with elementRef. ` +
            `Use a category label (e.g. Games) to return tag filter chips (catalog-tag-filter).`;
        } else {
          const compiled = compileUiAutomationSearchPattern(patternRaw);
          const getText = (node: HTMLElement) => this.getTextContent(node);
          const cardMatches = catalogLaunchPool.filter((el) =>
            catalogLaunchMatchesSearchPattern(el, compiled.regex, getText),
          );
          const tagFilterMatches = filterToCatalogTagFilterControls(elements).filter((el) =>
            catalogTagFilterMatchesSearchPattern(el, compiled.regex, getText),
          );
          filteredElements = sortCatalogLaunchByPattern(
            [...cardMatches, ...tagFilterMatches],
            compiled.effectiveTerm,
          );
          if (filteredElements.length === 0) {
            const sample = sampleCatalogLaunchLabels(catalogLaunchPool);
            const sampleHint = sample.length
              ? ` Visible Launch labels (sample): ${sample.join(', ')}.`
              : ' Launch buttons lacked data-appname — use registry id substring.';
            discoveryResultMessage =
              `No catalog Launch buttons matched searchPattern "${patternRaw}"` +
              (compiled.effectiveTerm !== patternRaw
                ? ` (matched as "${compiled.effectiveTerm}")`
                : '') +
              ` in "${contextArea}". ${catalogLaunchCount} other Launch control(s) are on-screen (tags/sections preview **8 apps**; search was auto-applied when possible).${sampleHint} ` +
              `Match \`data-appname\` / \`data-app-id\` / \`aria-label\` on the Launch button — not card title text.`;
          }
        }
      } else if (!patternRaw && elements.length > contextProfile.unfilteredWarnThreshold) {
        discoveryResultMessage =
          `Warning: ${elements.length} elements in scope without searchPattern in contextArea "${contextArea}". ` +
          `Add searchPattern (plain substring) to narrow results before paginating.`;
      } else if (patternRaw) {
        filteredElements = this.filterElementsByPattern(filteredElements, patternRaw);
        filteredElements = refineDiscoverMatchesByUiRole(filteredElements);
        filteredElements = this.sortDiscoverElementsByRelevance(filteredElements, patternRaw);
        if (filteredElements.length === 0) {
          const compiled = compileUiAutomationSearchPattern(patternRaw);
          discoveryResultMessage =
            `No interactive elements matched searchPattern "${patternRaw}"` +
            (compiled.effectiveTerm !== patternRaw
              ? ` (matched as "${compiled.effectiveTerm}")`
              : '') +
            (request.contextArea ? ` in contextArea "${request.contextArea}"` : '') +
            `. ${elements.length} element(s) were in scope before filtering. ` +
            `For Workflow Studio list **Edit**, use searchPattern on the workflow **title** (e.g. "webhook loop" or "Demo: webhook") with contextArea "lab-workflow-studio-app", not the word "edit" alone. ` +
            `Prefer discover rows with uiRole "record-action" and recordAction.action "edit". ` +
            `Use a plain name or id substring (e.g. Workflow Studio or app-lab-workflow-studio), not a CSS selector unless it contains a quoted value like [data-app-id="…"].`;
        }
      }

      // Apply pagination: skip results first, then limit
      const paginatedElements = filteredElements.slice(request.skip || 0);
      const limitedElements = paginatedElements.slice(0, request.maxResults);

      // Build DOM Context Data for each element
      const resultElements: UIDiscoveryResponseData['elements'] = limitedElements.map(el => {
        const position = this.getElementPosition(el);
        const elementRef = assignUiAutomationElementRef(el);
        const catalogLaunch = readCatalogLaunchMeta(el);
        const launchRow = isCatalogLaunchControl(el);
        const pinRow = isCatalogPinControl(el);
        const editTagsRow = isCatalogEditTagsControl(el);
        const tagFilterRow = isCatalogTagFilterControl(el);
        const toolbarRow = isCatalogToolbarControl(el);
        const recordRow = isLabRecordActionControl(el);
        const recordAction = readLabRecordActionDiscoverMeta(el);
        const shellRow = isLabShellWorkspaceControl(el);
        const shellAction = readLabShellActionDiscoverMeta(el);

        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          className: Array.from(el.classList),
          textContent: sanitizeUiAutomationDiscoveryText(this.getTextContent(el)),
          attributes: this.extractRelevantAttributes(el),
          isInteractive: this.isElementInteractive(el),
          isVisible: this.isElementVisible(el),
          position: position ? position : undefined,
          parentId: this.getParentElementIdentifier(el),
          contextArea: request.contextArea || this.determineContextArea(el),
          parentContextHTML: isCatalogCardActionControl(el)
            ? undefined
            : sanitizeUiAutomationDiscoveryText(this.getParentContext(el)) ?? undefined,
          elementRef,
          target: buildUiAutomationDiscoveryTarget(el),
          uiRole: tagFilterRow
            ? 'catalog-tag-filter'
            : editTagsRow
              ? 'catalog-edit-tags'
            : pinRow
            ? 'catalog-pin'
            : launchRow
            ? 'catalog-launch'
            : toolbarRow
              ? 'catalog-toolbar'
            : recordRow
              ? 'record-action'
            : shellRow && shellAction
              ? resolveShellActionUiRole(shellAction.action)
              : 'generic',
          catalogLaunch: catalogLaunch,
          recordAction: recordAction,
          shellAction: shellAction
            ? {
                action: shellAction.action,
                ...(shellAction.targetAppId ? { targetAppId: shellAction.targetAppId } : {}),
              }
            : undefined,
        }
      });

      // Call the discovery response delegate with properly typed response
      if (this.uiAutomationDiscoveryResponseReceived) {
        await this.uiAutomationDiscoveryResponseReceived({
          isStreaming: isStreaming,
          operation: UIAutomationOperation.DISCOVER_ELEMENTS,
          sessionId: request.sessionId,
          persona: request.persona,
          searchPattern: request.searchPattern || null,
          maxResults: request.maxResults,
          skip: request.skip || 0,
          contextArea: request.contextArea || null,
          elements: resultElements,
          totalCount: filteredElements.length,
          resultMessage: discoveryResultMessage,
        } as UIDiscoveryResponseData);
      }
    } catch (error) {
      if (this.uiAutomationDiscoveryResponseReceived) {
        await this.uiAutomationDiscoveryResponseReceived({
          isStreaming: isStreaming,
          operation: UIAutomationOperation.DISCOVER_ELEMENTS,
          sessionId: request.sessionId,
          persona: request.persona,
          searchPattern: request.searchPattern || null,
          maxResults: request.maxResults,
          skip: request.skip || 0,
          contextArea: request.contextArea || null,
          elements: [],  // Empty array on error
          totalCount: 0,
          resultMessage: error instanceof Error ? error.message : 'Unknown error when discovering elements'
        } as UIDiscoveryResponseData);
      }
    }
    finally {
      clearTimeout(timeout);
    }
  }

  private findInteractiveElements(): HTMLElement[] {
    const profile = resolveInteractiveSelectorForContext('');
    const primary = Array.from(document.querySelectorAll(profile.interactiveSelector)) as HTMLElement[];
    const supplemental = Array.from(
      document.querySelectorAll(UI_AUTOMATION_ACTIONABLE_SUPPLEMENT_SELECTOR),
    ) as HTMLElement[];
    return mergeDiscoverCandidates(primary, supplemental);
  }

  private findInteractiveElementsInContainer(containerName: string): HTMLElement[] {
    const containerSelector = `[class*="${containerName}"]`;
    const containers = document.querySelectorAll(containerSelector);

    if (containers.length === 0) {
      return [];
    }

    const { interactiveSelector } = resolveInteractiveSelectorForContext(containerName);
    const elements: HTMLElement[] = [];
    containers.forEach((container) => {
      const primary = Array.from(
        container.querySelectorAll(interactiveSelector),
      ) as HTMLElement[];
      const supplemental = Array.from(
        container.querySelectorAll(UI_AUTOMATION_ACTIONABLE_SUPPLEMENT_SELECTOR),
      ) as HTMLElement[];
      elements.push(...mergeDiscoverCandidates(primary, supplemental));
    });

    return elements;
  }

  private filterElementsByPattern(elements: HTMLElement[], pattern: string): HTMLElement[] {
    const compiled = compileUiAutomationSearchPattern(pattern);
    const getText = (node: HTMLElement) => this.getTextContent(node);
    return elements.filter((el) => matchesUiAutomationDiscoverSearchPattern(el, compiled, getText));
  }

  private sortDiscoverElementsByRelevance(
    elements: HTMLElement[],
    pattern: string,
  ): HTMLElement[] {
    if (!pattern.trim()) return elements;
    const compiled = compileUiAutomationSearchPattern(pattern);
    const getText = (node: HTMLElement) => this.getTextContent(node);
    return [...elements].sort(
      (a, b) =>
        rankUiAutomationDiscoverElement(b, compiled, getText)
        - rankUiAutomationDiscoverElement(a, compiled, getText),
    );
  }

  private getTextContent(element: HTMLElement): string {
    return element.textContent?.trim() || '';
  }

  private extractRelevantAttributes(element: HTMLElement): Record<string, string> {
    const attributes: Record<string, string> = {};

    // Always include key attributes
    const importantAttrs = ['id', 'name', 'type', 'value', 'placeholder', 'disabled', 'readonly', 'required', 'href', 'target'];

    for (const attr of importantAttrs) {
      if (element.hasAttribute(attr)) {
        attributes[attr] = element.getAttribute(attr)!;
      }
    }

    // Include data-* attributes (Vue component context)
    for (const attr of element.attributes) {
      if (attr.name.startsWith('data-')) {
        attributes[attr.name] = attr.value;
      }
    }

    return attributes;
  }

  private getElementPosition(element: HTMLElement): { x: number; y: number; width: number; height: number } | null {
    // Check if element is visible in DOM (not display:none)
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return null;
    }

    const rect = element.getBoundingClientRect();

    // Validate that element has measurable dimensions
    if (rect.width === 0 && rect.height === 0) {
      return null;
    }

    return {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }

  private getParentElementIdentifier(element: HTMLElement): string | undefined {
    const parent = element.parentElement;
    if (!parent) return undefined;

    // Return parent's identifier or generate one (hierarchy context)
    const parentId = parent.id || '';
    if (parentId) {
      return `parent-${parentId}`;
    }

    // Fallback: generate based on parent tag and class
    const className = Array.from(parent.classList).slice(0, 2).join('-') || 'elem';
    return `parent-${className}`;
  }

  private determineContextArea(element: HTMLElement): string {
    const validContextAreas = [...LAB_SHELL_UI_AUTOMATION_CONTEXT_AREAS];

    // Check parent element for context clues by class name matching
    let current: HTMLElement | null = element.parentElement;

    while (current !== null) {
      const className = current.className?.toString() || '';
      const tagName = current.tagName

      // Match against valid context area names
      for (const contextArea of validContextAreas) {
        if ((contextArea == 'body' && tagName == contextArea) || (contextArea != 'body' && className.includes(contextArea))) {
          return contextArea;
        }
      }

      current = current.parentElement;
    }

    // Default fallback: app-view-container (most common context)
    return 'body';
  }

  private getParentContext(element: HTMLElement, levels: number = 2): string {
    let context = '';
    let current: HTMLElement | null = element.parentElement;

    for (let i = 0; i < levels && current !== null; i++) {
      const text = current.textContent?.trim() || '';
      if (text) {
        context = `[${text}] ${context}`;
      }
      current = current.parentElement;
    }

    return context.trim();
  }

  // Determine if element is interactive based on its type and attributes
  private isElementInteractive(element: HTMLElement): boolean {
    // Check if element is in the interactive selector list
    const interactiveSelector = 'button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';
    return element.matches(interactiveSelector);
  }

  // Determine if element is visible using computed styles
  private isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);

    // Check display and visibility properties
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
      return false;
    }

    // Check opacity
    if (parseFloat(style.opacity) === 0) {
      return false;
    }

    // Check if element is actually rendered (has dimensions from getBoundingClientRect)
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return false;
    }

    return true;
  }

  // ========== ELEMENT ACTION HANDLER ==========

  async executeBatchActions(request: UIAutomationElementActionParams, isStreaming: boolean): Promise<void> {

    if (!request.actions) return

    const response: UIElementActionResponseData = {
      isStreaming: isStreaming,
      ...request,
      success: true,
      results: []
    }

    // Execute actions in order
    for (const actionItem of request.actions) {

      const currentAction: {
        order: number;
        target: string;
        elementRef?: string;
        action: string;
        success: boolean;
        resultMessage: string;
      } = {
        order: actionItem.order,
        target: actionItem.target ?? '',
        elementRef: actionItem.elementRef,
        action: actionItem.action,
        success: true,
        resultMessage: '',
      };

      const targetEl = resolveUiAutomationElement(actionItem.target, actionItem.elementRef);

      if (!targetEl) {
        currentAction.success = false;
        const refPart = actionItem.elementRef ? ` elementRef="${actionItem.elementRef}"` : '';
        const targetPart = actionItem.target ? ` target="${actionItem.target}"` : '';
        currentAction.resultMessage =
          `Action ${actionItem.order}: Element not found (${refPart}${targetPart}). Re-run discover if the DOM changed.`;
        response.success = false;
      } else {
        const actionResult = await this.executeSingleAction(
          targetEl,
          actionItem.action,
          actionItem.actionParams,
        );
        currentAction.success = actionResult.success;
        currentAction.resultMessage = actionResult.resultMessage ?? '';
      }

      response.results?.push(currentAction);
    }

    if (this.uiAutomationActionResponseReceived) {
      await this.uiAutomationActionResponseReceived(response);
    }

  }

  // NEW: Helper method to execute single action (extracted from original switch)
  private async executeSingleAction(
    element: HTMLElement,
    action: string,
    actionParams?: Record<string, unknown>
  ): Promise<{ success: boolean, resultMessage?: string | undefined }> {

    try {
      switch (action) {
        case 'click':
          element.click();
          break;
        case 'doubleClick':
          element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
          break;
        case 'hover':
          element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
          break;
        case 'focus':
          element.focus();
          break;
        case 'blur':
          element.blur();
          break;
        case 'press': {
          const key = typeof actionParams?.key === 'string' ? actionParams.key : undefined;
          if (key) {
            element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
            element.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
          }
          break;
        }
        case 'setValue':
          if (actionParams?.value !== undefined) {
            (element as HTMLInputElement).value = String(actionParams.value);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
          break;
        case 'setAttribute': {
          const attrName = typeof actionParams?.name === 'string' ? actionParams.name : undefined;
          const attrValue = actionParams?.value !== undefined && actionParams?.value !== null
            ? String(actionParams.value)
            : undefined;
          if (attrName && attrValue !== undefined) {
            element.setAttribute(attrName, attrValue);
          }
          break;
        }
        case 'removeAttribute': {
          const attrName = typeof actionParams?.name === 'string' ? actionParams.name : undefined;
          if (attrName) {
            element.removeAttribute(attrName);
          }
          break;
        }
        default:
          throw new Error(`Unknown action type: ${action}`);
      }
      return {
        success: true
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        resultMessage: errorMessage
      }
    }
  }

}
