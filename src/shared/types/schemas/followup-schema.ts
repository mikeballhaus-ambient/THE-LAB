import { z } from 'zod';

// ==========================================
// Option Type for individual option definition
// ==========================================
export const OptionSchema = z.object({
  id: z.string().describe('Unique identifier for tracking and pre-selection reference'),
  label: z.string().describe('Display text'),
  value: z.any().optional().describe('Optional data payload'),
  userValue: z.any().optional().describe('User-provided value (e.g., custom input when userValueRequired is true)'),
  selected: z.boolean().optional().describe('Whether this option is selected'),
  userValueRequired: z.boolean().default(false).describe('If true, UI renders input field instead of checkbox; user input goes to userValue property')
});

export type Option = z.infer<typeof OptionSchema>;

// ==========================================
// Followup Tool Schema
// ==========================================
export const FollowupParamsSchema = z.object({
  sessionId: z.string().describe('Current session ID for scoping. This is provided in the `## Current Session Context` section of your system instructions'),
  question: z.string().describe('The main question or prompt'),
  options: z.array(OptionSchema).describe('Array of selectable options (required). Mix checkboxes and input fields freely - each option determines its own UI element based on userValueRequired setting.'),
  persona: z.string().describe('REQUIRED: Current persona name - identifies which persona is generating this follow-up question. Agents are aware of their current persona.'),
  defaultSelection: z.string().optional().describe('id of option to pre-select in UI (user must still confirm)'),
});

export type FollowupParams = z.infer<typeof FollowupParamsSchema>;

