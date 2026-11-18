import { describe, test, expect } from '@jest/globals';
import {
  buildAppServerBaseUrl,
  buildLabAppMountProps,
  listPlatformAppServerEntries,
  resolveAppServerPort,
  resolveApiBaseHostFromEnv,
  urlForAppId,
} from '@/shared/services/app-server-url-resolution';

describe('app-server-url-resolution', () => {
  test('resolveApiBaseHostFromEnv strips :3000 from explicit backend URL', () => {
    expect(
      resolveApiBaseHostFromEnv({ backendUrl: 'http://localhost:3000' }),
    ).toBe('http://localhost');
  });

  test('resolveAppServerPort returns null for browser apps', () => {
    expect(
      resolveAppServerPort({
        id: 'x',
        name: 'X',
        type: 'browser',
        server: { port: 3011 },
      }),
    ).toBeNull();
  });

  test('listPlatformAppServerEntries builds URLs and running flag', () => {
    const apps = [
      {
        id: 'app-lab-formsbuilder',
        name: 'Forms Builder',
        type: 'hybrid' as const,
        isEnabled: true,
        server: { port: 3011 },
      },
      {
        id: 'app-disabled',
        name: 'Off',
        type: 'hybrid' as const,
        isEnabled: false,
        server: { port: 3099 },
      },
    ];
    const entries = listPlatformAppServerEntries(
      apps,
      'http://localhost',
      ['app-lab-formsbuilder'],
      ['app-lab-formsbuilder', 'app-disabled'],
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].url).toBe(buildAppServerBaseUrl('http://localhost', 3011));
    expect(entries[0].isRunning).toBe(true);
    expect(urlForAppId(entries, 'app-lab-formsbuilder')).toBe('http://localhost:3011');
  });

  test('buildLabAppMountProps sets serverUrl for hybrid apps', () => {
    const props = buildLabAppMountProps(
      {
        id: 'app-lab-crm',
        name: 'CRM',
        type: 'hybrid',
        description: 'CRM app',
        server: { port: 3010 },
      },
      { viteApiBaseUrl: 'http://localhost' },
    );
    expect(props.serverUrl).toBe('http://localhost:3010');
    expect(props.appDescription).toBe('CRM app');
  });

  test('buildLabAppMountProps omits serverUrl for browser apps', () => {
    const props = buildLabAppMountProps({
      id: 'app-gallery',
      name: 'Gallery',
      type: 'browser',
      server: { port: 3011 },
    });
    expect(props.serverUrl).toBeUndefined();
  });
});
