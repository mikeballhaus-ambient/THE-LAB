import { describe, expect, test, afterEach } from '@jest/globals';
import type { User } from '@/shared/types/user';
import {
  evaluateMcpProductionPolicy,
  resolveTargetAppIdsFromToolParams,
} from '@/backend/utils/mcp-production-enforcer';

const memberUser: User = {
  id: 2,
  userId: 2,
  email: 'member@test',
  name: 'Member',
  role: 'member',
  status: 'active',
  lastSeen: '2020-01-01T00:00:00.000Z',
  createdAt: '2020-01-01T00:00:00.000Z',
  permissions: {
    global: {},
    app: [{ appId: 'app-lab-crm', canUpdate: true }],
  },
};

const adminUser: User = {
  ...memberUser,
  userId: 1,
  id: 1,
  role: 'admin',
};

describe('resolveTargetAppIdsFromToolParams', () => {
  test('parses app id from file path under src/apps', () => {
    expect(
      resolveTargetAppIdsFromToolParams('create_file', {
        path: 'src/apps/app-lab-crm/front-end/App.vue',
      }),
    ).toEqual(['app-lab-crm']);
  });

  test('parses app_management appId field', () => {
    expect(
      resolveTargetAppIdsFromToolParams('app_management_update_app', { appId: 'app-lab-tasklist' }),
    ).toEqual(['app-lab-tasklist']);
  });
});

describe('evaluateMcpProductionPolicy', () => {
  const prev = process.env.LAB_PRODUCTION_PROFILE;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.LAB_PRODUCTION_PROFILE;
    } else {
      process.env.LAB_PRODUCTION_PROFILE = prev;
    }
  });

  test('allows all tools when production profile unset', () => {
    delete process.env.LAB_PRODUCTION_PROFILE;
    const result = evaluateMcpProductionPolicy({
      user: memberUser,
      userId: 2,
      toolId: 'run_terminal_command',
      tool: undefined,
      params: {},
    });
    expect(result.allowed).toBe(true);
  });

  test('blocks run_terminal_command for member in production', () => {
    process.env.LAB_PRODUCTION_PROFILE = '1';
    const result = evaluateMcpProductionPolicy({
      user: memberUser,
      userId: 2,
      toolId: 'run_terminal_command',
      tool: undefined,
      params: {},
    });
    expect(result.allowed).toBe(false);
  });

  test('allows run_terminal_command for admin in production', () => {
    process.env.LAB_PRODUCTION_PROFILE = '1';
    const result = evaluateMcpProductionPolicy({
      user: adminUser,
      userId: 1,
      toolId: 'run_terminal_command',
      tool: undefined,
      params: {},
    });
    expect(result.allowed).toBe(true);
  });

  test('allows ui_automation for member in production', () => {
    process.env.LAB_PRODUCTION_PROFILE = '1';
    const result = evaluateMcpProductionPolicy({
      user: memberUser,
      userId: 2,
      toolId: 'ui_automation_element_action',
      tool: undefined,
      params: {},
    });
    expect(result.allowed).toBe(true);
  });

  test('allows create_file in app-lab-crm for member with canUpdate', () => {
    process.env.LAB_PRODUCTION_PROFILE = '1';
    const result = evaluateMcpProductionPolicy({
      user: memberUser,
      userId: 2,
      toolId: 'create_file',
      tool: undefined,
      params: { path: 'src/apps/app-lab-crm/front-end/foo.ts', content: 'x' },
    });
    expect(result.allowed).toBe(true);
  });

  test('denies create_file in other app without canUpdate', () => {
    process.env.LAB_PRODUCTION_PROFILE = '1';
    const result = evaluateMcpProductionPolicy({
      user: memberUser,
      userId: 2,
      toolId: 'create_file',
      tool: undefined,
      params: { path: 'src/apps/app-lab-helpdesk/back-end/x.ts', content: 'x' },
    });
    expect(result.allowed).toBe(false);
  });
});
