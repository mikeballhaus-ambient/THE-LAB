const BUILTIN_PERSONA_SLUGS = [
  'chat',
  'orchestrator',
  'architect',
  'code',
  'debug',
  'qa',
] as const;

export type BuiltinPersonaBadgeSlug = (typeof BUILTIN_PERSONA_SLUGS)[number];

function normalizePersonaKey(personaName?: string): string {
  return (personaName ?? 'chat').trim().replaceAll('_', ' ').toLowerCase();
}

export class personaUtils {
  static formatPersonaName = (personaName: string): string => {
    return personaName.replaceAll('_', ' ');
  };

  /** Maps session / DB persona names (e.g. `Chat`, `QA`) to badge modifier slugs. */
  static resolvePersonaBadgeSlug(personaName?: string): BuiltinPersonaBadgeSlug | 'custom' {
    const key = normalizePersonaKey(personaName);
    if ((BUILTIN_PERSONA_SLUGS as readonly string[]).includes(key)) {
      return key as BuiltinPersonaBadgeSlug;
    }
    return 'custom';
  }

  static getPersonaBadgeClass(personaName?: string): string {
    const slug = personaUtils.resolvePersonaBadgeSlug(personaName);
    return `lab-persona-badge lab-persona-badge--${slug}`;
  }

  static getPersonaBadgeIcon(personaName?: string): string {
    const key = normalizePersonaKey(personaName);
    const icons: Record<string, string> = {
      chat: 'fa-comment-dots',
      orchestrator: 'fa-diagram-project',
      architect: 'fa-compass-drafting',
      code: 'fa-code',
      debug: 'fa-bug',
      qa: 'fa-user-shield',
    };
    return icons[key] ?? 'fa-user';
  }

  static getPersonaNavIcon(personaName: string): string {
    return personaUtils.getPersonaBadgeIcon(personaName);
  }
}