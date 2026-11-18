import { describe, test, expect, afterAll } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { templateGenerator } from '@/shared/services/TemplateGenerator';

describe('TemplateGenerator server scaffold', () => {
  let tmpRoot = '';

  afterAll(async () => {
    if (tmpRoot) {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  test('generateServerApp copies server.ts and entry.ts from templates', async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'the-lab-gen-'));
    const appsDir = path.join(tmpRoot, 'apps');
    await fs.mkdir(appsDir, { recursive: true });

    const appDir = path.join(appsDir, 'gen-test-app');
    await fs.mkdir(path.join(appDir, 'back-end'), { recursive: true });
    await fs.mkdir(path.join(appDir, 'db'), { recursive: true });
    await fs.mkdir(path.join(appDir, 'shared', 'types'), { recursive: true });

    await templateGenerator.generateServerApp(
      'gen-test-app',
      'Gen Test',
      'test',
      appsDir,
      4099,
    );

    const backEnd = path.join(appsDir, 'gen-test-app', 'back-end');
    const serverPath = path.join(backEnd, 'server.ts');
    const entryPath = path.join(backEnd, 'entry.ts');

    await expect(fs.access(serverPath)).resolves.toBeUndefined();
    await expect(fs.access(entryPath)).resolves.toBeUndefined();

    const entrySrc = await fs.readFile(entryPath, 'utf-8');
    expect(entrySrc).toContain("import { startServer } from './server'");
    expect(entrySrc).toContain('await startServer()');

    const serverSrc = await fs.readFile(serverPath, 'utf-8');
    expect(serverSrc).toContain('export const startServer');
    expect(serverSrc).not.toMatch(/^await startServer/m);
  });
});
