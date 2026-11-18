import { describe, expect, test } from '@jest/globals';
import {
  normalizePeerUrls,
  resolveIntegrationAppIdForService,
  resolveIntegrationConnectorServerUrl,
  resolvePeerUrlForService,
  toMatchKey,
} from '@/shared/lab-integrations/resolve-integration-connector-server-url';

describe('toMatchKey', () => {
  test('collapses separators and registry prefixes', () => {
    expect(toMatchKey('task-list')).toBe('tasklist');
    expect(toMatchKey('app-lab-tasklist')).toBe('tasklist');
    expect(toMatchKey('lab-tasklist')).toBe('tasklist');
    expect(toMatchKey('help-desk')).toBe('helpdesk');
    expect(toMatchKey('app-lab-helpdesk')).toBe('helpdesk');
    expect(toMatchKey('OKR-Goals')).toBe('okrgoals');
    expect(toMatchKey('app-okr-goals')).toBe('okrgoals');
  });

  test('handles nested prefixes', () => {
    expect(toMatchKey('app-lab-app-builder')).toBe('builder');
    expect(toMatchKey('app-builder')).toBe('builder');
  });

  test('does not strip a key that is only a prefix', () => {
    expect(toMatchKey('lab')).toBe('lab');
    expect(toMatchKey('app')).toBe('app');
  });
});

describe('resolveIntegrationAppIdForService', () => {
  test('resolves protected platform apps without a registry callback', () => {
    expect(resolveIntegrationAppIdForService('app-okr-goals', 'crm.contacts')).toBe('app-lab-crm');
    expect(resolveIntegrationAppIdForService('app-okr-goals', 'task-list.tasks')).toBe(
      'app-lab-tasklist',
    );
    expect(resolveIntegrationAppIdForService('app-okr-goals', 'help-desk.ticket')).toBe(
      'app-lab-helpdesk',
    );
  });

  test('falls back to app-{prefix} for catalog apps', () => {
    expect(resolveIntegrationAppIdForService('app-lab-crm', 'okr-goals.objective')).toBe(
      'app-okr-goals',
    );
  });

  test('prefers an injected registry resolver', () => {
    const resolver = (matchKey: string) =>
      matchKey === 'crm' ? 'app-lab-crm' : undefined;
    expect(resolveIntegrationAppIdForService('x', 'crm.contacts', resolver)).toBe('app-lab-crm');
  });

  test('returns the host app when serviceId is absent', () => {
    expect(resolveIntegrationAppIdForService('app-okr-goals', undefined)).toBe('app-okr-goals');
    expect(resolveIntegrationAppIdForService('app-okr-goals', '')).toBe('app-okr-goals');
  });
});

describe('normalizePeerUrls', () => {
  test('keys entries by match key and trims trailing slashes', () => {
    const out = normalizePeerUrls({
      'app-lab-crm': 'http://localhost:3010/',
      'app-lab-tasklist': 'http://localhost:3005',
    });
    expect(out).toEqual({
      crm: 'http://localhost:3010',
      tasklist: 'http://localhost:3005',
    });
  });

  test('accepts short ids and legacy taskList/helpDesk keys', () => {
    const out = normalizePeerUrls({
      taskList: 'http://localhost:3005',
      helpDesk: 'http://localhost:3012',
      crm: 'http://localhost:3010',
      platform: 'http://localhost:3000',
    });
    expect(out.tasklist).toBe('http://localhost:3005');
    expect(out.helpdesk).toBe('http://localhost:3012');
    expect(out.crm).toBe('http://localhost:3010');
    expect(out.platform).toBe('http://localhost:3000');
  });

  test('drops empty and undefined values', () => {
    const out = normalizePeerUrls({
      'app-lab-crm': '',
      'app-lab-tasklist': undefined,
      platform: 'http://localhost:3000',
    });
    expect(out).toEqual({ platform: 'http://localhost:3000' });
  });

  test('handles undefined input', () => {
    expect(normalizePeerUrls(undefined)).toEqual({});
  });
});

describe('resolvePeerUrlForService', () => {
  const peers = normalizePeerUrls({
    crm: 'http://localhost:3010',
    'app-lab-tasklist': 'http://localhost:3005',
    'app-lab-helpdesk': 'http://localhost:3012',
  });

  test('matches provider slug to registry-id key', () => {
    expect(resolvePeerUrlForService('crm.contacts', peers)).toBe('http://localhost:3010');
    expect(resolvePeerUrlForService('task-list.tasks', peers)).toBe('http://localhost:3005');
    expect(resolvePeerUrlForService('help-desk.ticket', peers)).toBe('http://localhost:3012');
  });

  test('returns undefined when no peer matches', () => {
    expect(resolvePeerUrlForService('okr-goals.objective', peers)).toBeUndefined();
    expect(resolvePeerUrlForService(undefined, peers)).toBeUndefined();
  });
});

describe('resolveIntegrationConnectorServerUrl', () => {
  const hostUrl = 'http://localhost:4110';
  const peers = {
    'app-lab-crm': 'http://localhost:3010',
    'app-lab-tasklist': 'http://localhost:3005',
    'app-lab-helpdesk': 'http://localhost:3012',
    platform: 'http://localhost:3000',
  };

  test('routes a catalog host bound to a CRM service to CRM', () => {
    expect(resolveIntegrationConnectorServerUrl('crm.contacts', hostUrl, peers)).toBe(
      'http://localhost:3010',
    );
  });

  test('routes a catalog host bound to a Task List service to Task List', () => {
    expect(resolveIntegrationConnectorServerUrl('task-list.tasks', hostUrl, peers)).toBe(
      'http://localhost:3005',
    );
  });

  test('routes a catalog host bound to a Help Desk service to Help Desk', () => {
    expect(resolveIntegrationConnectorServerUrl('help-desk.ticket', hostUrl, peers)).toBe(
      'http://localhost:3012',
    );
  });

  test('routes platform-hosted services to :3000', () => {
    expect(
      resolveIntegrationConnectorServerUrl('lab-financial-ledger.accounts', hostUrl, peers),
    ).toBe('http://localhost:3000');
  });

  test('falls back to host URL when the provider peer is not configured', () => {
    expect(
      resolveIntegrationConnectorServerUrl('crm.contacts', hostUrl, {
        platform: 'http://localhost:3000',
      }),
    ).toBe(hostUrl);
  });

  test('falls back to host URL when the provider is the host itself', () => {
    expect(resolveIntegrationConnectorServerUrl('okr-goals.objective', hostUrl, peers)).toBe(
      hostUrl,
    );
  });

  test('resolution depends only on the serviceId, not the host', () => {
    expect(resolveIntegrationConnectorServerUrl('crm.contacts', 'http://localhost:4100', peers)).toBe(
      'http://localhost:3010',
    );
    expect(resolveIntegrationConnectorServerUrl('crm.contacts', 'http://localhost:4200', peers)).toBe(
      'http://localhost:3010',
    );
  });

  test('accepts the legacy peers shape without a crm key', () => {
    // Legacy shape has no way to express CRM — documents the defect this replaced.
    expect(
      resolveIntegrationConnectorServerUrl('crm.contacts', hostUrl, {
        taskList: 'http://localhost:3005',
        platform: 'http://localhost:3000',
      }),
    ).toBe(hostUrl);
  });
});
