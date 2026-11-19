import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

/** Committed demo graph — vertical stack; no IF false branch (silent skip when ineligible). */
export const DEMO_WORKFLOW_QUARKS_LOGIN_ALLOTMENT_SNAPSHOT = {
  id: 'a1000002-0002-4002-8002-000000000132',
  name: 'Platform: Quarks daily allotment on login',
  description:
    'On `platform-auth.session.established`, read wallet eligibility, credit daily Quarks when due, and toast the signed-in user.',
  priority: 331,
  definition: {
    schemaVersion: 2,
    nodes: [
      {
        id: 'a1000002-0002-4002-8002-000000000132',
        kind: 'trigger',
        position: { x: 48, y: 48 },
        eventType: 'platform-auth.session.established',
      },
      {
        id: 'a1000002-0002-4002-8002-000000000133',
        kind: 'action',
        position: { x: 48, y: 188 },
        step: { kind: 'virtual_bank_get_wallet', userIdPath: 'userId' },
      },
      {
        id: 'a1000002-0002-4002-8002-000000000134',
        kind: 'action',
        position: { x: 48, y: 328 },
        step: {
          kind: 'if_condition',
          conditions: [
            { kind: 'payload_equals', path: 'dailyAllotmentEligible', value: true },
          ],
        },
      },
      {
        id: 'a1000002-0002-4002-8002-000000000135',
        kind: 'action',
        position: { x: 48, y: 468 },
        step: { kind: 'virtual_bank_credit_daily_allotment', userIdPath: 'userId' },
      },
      {
        id: 'a1000002-0002-4002-8002-000000000136',
        kind: 'action',
        position: { x: 48, y: 608 },
        step: {
          kind: 'show_user_toast',
          userIdPath: 'userId',
          severity: 'success',
          summary: 'Daily allotment',
          detail: '+{{accrualDelta}} Quarks ({{balanceAfter}} total)',
        },
      },
    ],
    edges: [
      {
        id: 'a1000002-0002-4002-8002-000000000138',
        source: 'a1000002-0002-4002-8002-000000000132',
        target: 'a1000002-0002-4002-8002-000000000133',
        when: 'always',
      },
      {
        id: 'a1000002-0002-4002-8002-000000000139',
        source: 'a1000002-0002-4002-8002-000000000133',
        target: 'a1000002-0002-4002-8002-000000000134',
        when: 'always',
      },
      {
        id: 'a1000002-0002-4002-8002-000000000140',
        source: 'a1000002-0002-4002-8002-000000000134',
        target: 'a1000002-0002-4002-8002-000000000135',
        when: 'on_true',
        outputIndex: 0,
      },
      {
        id: 'a1000002-0002-4002-8002-000000000141',
        source: 'a1000002-0002-4002-8002-000000000135',
        target: 'a1000002-0002-4002-8002-000000000136',
        when: 'always',
      },
    ],
    viewport: {
      x: 375.4184339314845,
      y: -1.4518760195758773,
      zoom: 0.9885807504078303,
    },
  },
  exportedAt: '2026-11-19T19:50:00.000Z',
} as {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  definition: LabWorkflowDefinitionV2;
  exportedAt: string;
};