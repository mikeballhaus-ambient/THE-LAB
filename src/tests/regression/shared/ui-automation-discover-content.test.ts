import { describe, expect, test } from '@jest/globals';
import type { UIDiscoveryElement } from '@/shared/types/schemas/ui-automation-schema';
import {
  buildUiAutomationDiscoverToolMessage,
  formatDiscoverPaginationBlock,
  parseDiscoverElementsFromToolContent,
  truncateUiAutomationDiscoveryContent,
  UI_AUTOMATION_DISCOVER_PAGINATION_MARKER,
} from '@/shared/utils/ui-automation-discover-content';

function sampleElement(i: number): UIDiscoveryElement {
  return {
    tag: 'button',
    className: ['launch'],
    textContent: `Launch app ${i} with extra context `.repeat(40),
    isInteractive: true,
    isVisible: true,
    elementRef: `ui-ref-${i}`,
    target: `button[data-appname="App ${i}"]`,
    parentContextHTML: 'parent '.repeat(200),
  };
}

describe('ui-automation-discover-content', () => {
  test('build and parse round-trip', () => {
    const elements = [sampleElement(1)];
    const msg = buildUiAutomationDiscoverToolMessage(elements, 1, {
      contextArea: 'lab-workflow-studio-app',
      searchPattern: 'Demo: webhook',
      maxResults: 25,
    });
    expect(msg).toContain('searchPattern="Demo: webhook"');
    expect(msg).toContain('contextArea="lab-workflow-studio-app"');
    const parsed = parseDiscoverElementsFromToolContent(msg);
    expect(parsed.parseError).toBeUndefined();
    expect(parsed.elements).toHaveLength(1);
    expect(parsed.elements[0].target).toContain('data-appname');
  });

  test('pagination block tells agent to advance skip when more matches exist', () => {
    const block = formatDiscoverPaginationBlock(25, 47, {
      contextArea: 'lab-workflow-studio-app',
      searchPattern: 'webhook',
      skip: 0,
      maxResults: 25,
    });
    expect(block).toContain(UI_AUTOMATION_DISCOVER_PAGINATION_MARKER);
    expect(block).toContain('MORE MATCHES EXIST');
    expect(block).toContain('skip=25');
    expect(block).toContain('contextArea="lab-workflow-studio-app"');
    expect(block).toContain('searchPattern="webhook"');
  });

  test('pagination block says all matches returned on last page', () => {
    const block = formatDiscoverPaginationBlock(22, 47, {
      contextArea: 'lab-workflow-studio-app',
      searchPattern: 'webhook',
      skip: 25,
      maxResults: 25,
    });
    expect(block).toContain('ALL MATCHES ARE IN THIS MESSAGE');
    expect(block).not.toContain('MORE MATCHES EXIST');
  });

  test('build message includes match summary and pagination before JSON', () => {
    const msg = buildUiAutomationDiscoverToolMessage([sampleElement(1)], 40, {
      contextArea: 'app-list-container',
      searchPattern: 'crm',
      skip: 0,
      maxResults: 25,
    });
    expect(msg).toContain('Match summary: totalCount=40, returnedInJson=1');
    expect(msg).toContain('MORE MATCHES EXIST');
    expect(msg).toContain('skip=1');
    const markerIdx = msg.indexOf('selector components:');
    const pagIdx = msg.indexOf(UI_AUTOMATION_DISCOVER_PAGINATION_MARKER);
    expect(pagIdx).toBeGreaterThan(-1);
    expect(pagIdx).toBeLessThan(markerIdx);
  });

  test('empty discover payload still includes parseable JSON marker', () => {
    const msg = buildUiAutomationDiscoverToolMessage([], 0, {
      contextArea: 'app-list-container',
      searchPattern: 'Workflow Studio',
      resultMessage: 'No catalog Launch buttons matched.',
    });
    expect(msg).toContain('searchPattern="Workflow Studio"');
    const parsed = parseDiscoverElementsFromToolContent(msg);
    expect(parsed.parseError).toBeUndefined();
    expect(parsed.elements).toEqual([]);
  });

  test('condensed truncation prefers record-action edit over generic div', () => {
    const generic: UIDiscoveryElement = {
      tag: 'div',
      className: [],
      textContent: `My workflows ${'x'.repeat(9000)}`,
      isInteractive: true,
      isVisible: true,
      elementRef: 'ui-shell',
      target: '[data-lab-ui-automation-ref="ui-shell"]',
      uiRole: 'generic',
    };
    const edit: UIDiscoveryElement = {
      tag: 'button',
      className: [],
      textContent: null,
      isInteractive: true,
      isVisible: true,
      elementRef: 'ui-edit',
      target: 'button[data-lab-record-id="wf"][data-lab-record-action="edit"]',
      uiRole: 'record-action',
      recordAction: { recordId: 'wf', recordName: 'Demo: webhook loop', action: 'edit' },
    };
    const msg = buildUiAutomationDiscoverToolMessage([generic, edit], 2);
    const truncated = truncateUiAutomationDiscoveryContent(msg, 1200);
    const parsed = parseDiscoverElementsFromToolContent(truncated);
    expect(parsed.parseError).toBeUndefined();
    expect(parsed.elements[0]?.uiRole).toBe('record-action');
    expect(parsed.elements[0]?.elementRef).toBe('ui-edit');
  });

  test('truncate keeps valid JSON for formatter', () => {
    const elements = Array.from({ length: 30 }, (_, i) => sampleElement(i));
    const msg = buildUiAutomationDiscoverToolMessage(elements, 30);
    expect(msg.length).toBeGreaterThan(8000);

    const truncated = truncateUiAutomationDiscoveryContent(msg, 8000);
    const parsed = parseDiscoverElementsFromToolContent(truncated);
    expect(parsed.parseError).toBeUndefined();
    expect(parsed.elements.length).toBeGreaterThan(0);
    expect(parsed.elements.length).toBeLessThan(30);
  });
});
