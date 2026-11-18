import { ChatPersona } from "./chat";

export const PersonaReasoningOptions = [
    { none: 0.0 },
    { low: 0.1 },
    { medium: 0.5 },
    { high: 0.75 },
    { extreme: 0.9 }
] as const;

export type PersonaReasoning = typeof PersonaReasoningOptions[number];

export const PersonaReasoningSelectOptions = PersonaReasoningOptions.map((obj) => {
    const key = Object.keys(obj)[0];
    return {
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: obj
    };
});

export interface Persona {
    id?: number,
    name: string,
    sysMsg: {
        role: string,
        capabilities: string,
        output: string,
        rules: string
    },
    tools: string[],
    reasoning: PersonaReasoning,
    slashCommands: string[]
}

export interface SeedToolPermission {
  id: string,
  name: string
  allowed: boolean
}

export interface SeedPersona {
  persona: ChatPersona,
  tools: SeedToolPermission[]
}

export interface DefaultPersonaSeeding {
  personas: SeedPersona[]
}