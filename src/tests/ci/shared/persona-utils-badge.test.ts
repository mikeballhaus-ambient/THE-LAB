import { personaUtils } from '@/shared/utils/persona-utils';

describe('personaUtils persona badges', () => {
  test('resolvePersonaBadgeSlug accepts PascalCase session names', () => {
    expect(personaUtils.resolvePersonaBadgeSlug('Chat')).toBe('chat');
    expect(personaUtils.resolvePersonaBadgeSlug('QA')).toBe('qa');
    expect(personaUtils.resolvePersonaBadgeSlug('Orchestrator')).toBe('orchestrator');
  });

  test('getPersonaBadgeClass maps each builtin to a distinct modifier', () => {
    expect(personaUtils.getPersonaBadgeClass('Architect')).toBe(
      'lab-persona-badge lab-persona-badge--architect',
    );
    expect(personaUtils.getPersonaBadgeClass('Code')).toBe(
      'lab-persona-badge lab-persona-badge--code',
    );
  });

  test('unknown personas use custom modifier instead of defaulting to chat', () => {
    expect(personaUtils.resolvePersonaBadgeSlug('Custom Planner')).toBe('custom');
    expect(personaUtils.getPersonaBadgeClass('Custom Planner')).toBe(
      'lab-persona-badge lab-persona-badge--custom',
    );
  });

  test('getPersonaBadgeIcon is case-insensitive', () => {
    expect(personaUtils.getPersonaBadgeIcon('Debug')).toBe('fa-bug');
    expect(personaUtils.getPersonaBadgeIcon('unknown')).toBe('fa-user');
  });
});
