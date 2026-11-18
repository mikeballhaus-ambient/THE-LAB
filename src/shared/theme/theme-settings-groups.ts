import type { TailwindColorPrefix } from '@/shared/theme/tailwind-color-catalog';
import type { LabThemeTokenKey } from '@/shared/theme/lab-theme-token-keys';

export type ThemeFieldEditor = 'tailwind-color' | 'text';

export interface ThemeTokenField {
  key: LabThemeTokenKey;
  label: string;
  utility: string;
  editor: ThemeFieldEditor;
  /** For `tailwind-color` fields — utility prefix shown in class hint. */
  twPrefix?: TailwindColorPrefix;
  /** Foreground token for contrast check against `key` when `key` is background. */
  contrastTextKey?: LabThemeTokenKey;
}

export function inferThemeTwPrefix(key: LabThemeTokenKey): TailwindColorPrefix | undefined {
  if (/-bg(?:-|$)/.test(key)) {
    return 'bg';
  }
  if (/-text(?:-|$)/.test(key)) {
    return 'text';
  }
  if (/-border(?:-|$)/.test(key)) {
    return 'border';
  }
  return undefined;
}

function colorField(
  key: LabThemeTokenKey,
  label: string,
  utility: string,
  contrastTextKey?: LabThemeTokenKey,
): ThemeTokenField {
  const twPrefix = inferThemeTwPrefix(key);
  return {
    key,
    label,
    utility,
    editor: twPrefix ? 'tailwind-color' : 'text',
    twPrefix,
    contrastTextKey,
  };
}

function textField(key: LabThemeTokenKey, label: string, utility = '—'): ThemeTokenField {
  return { key, label, utility, editor: 'text' };
}

export interface ThemeSettingsSection {
  id: string;
  title: string;
  fields: ThemeTokenField[];
}

export const THEME_CONTRAST_PAIRS: Array<{
  id: string;
  label: string;
  fg: LabThemeTokenKey;
  bg: LabThemeTokenKey;
}> = [
  { id: 'assistant', label: 'Assistant message', fg: 'chat-assistant-text', bg: 'chat-assistant-bg' },
  { id: 'user', label: 'User message', fg: 'chat-user-text', bg: 'chat-user-bg' },
  { id: 'log', label: 'Tool log row', fg: 'chat-log-text', bg: 'chat-log-bg' },
  { id: 'tool-result', label: 'Tool result body', fg: 'chat-tool-result-text', bg: 'chat-tool-result-bg' },
  { id: 'card-title', label: 'Card title on gradient', fg: 'card-title-text', bg: 'card-gradient-stop-1' },
  { id: 'general', label: 'Page text on background', fg: 'general-text', bg: 'general-bg' },
];

export const THEME_SETTINGS_SECTIONS: ThemeSettingsSection[] = [
  {
    id: 'general',
    title: 'General',
    fields: [
      colorField('general-bg', 'Page background', 'bg-lab-general-bg'),
      colorField('general-text', 'Default text', 'text-lab-general-text', 'general-bg'),
      colorField('general-text-muted', 'Muted text', 'text-lab-general-text-muted'),
      colorField('general-border', 'Default border', 'border-lab-general-border'),
    ],
  },
  {
    id: 'button',
    title: 'Button',
    fields: [
      colorField('button-bg', 'Solid background', 'bg-lab-button-bg'),
      colorField('button-text', 'Solid text', 'text-lab-button-text', 'button-bg'),
      colorField('button-border', 'Solid border', 'border-lab-button-border'),
      colorField('button-bg-hover', 'Solid hover background', 'bg-lab-button-bg-hover'),
      colorField('button-border-hover', 'Solid hover border', 'border-lab-button-border-hover'),
      colorField('button-outlined-text', 'Outlined text', '—'),
      colorField('button-outlined-border', 'Outlined border', '—'),
    ],
  },
  {
    id: 'card',
    title: 'Card (app catalog)',
    fields: [
      textField('card-gradient-angle', 'Gradient angle'),
      textField('card-gradient-stop-1', 'Gradient stop 1'),
      textField('card-gradient-stop-2', 'Gradient stop 2'),
      textField('card-gradient-stop-3', 'Gradient stop 3'),
      colorField('card-title-text', 'Title text', 'text-lab-card-title'),
      colorField('card-border', 'Border', 'border-lab-card-border'),
      textField('card-border-running', 'Running accent border'),
    ],
  },
  {
    id: 'chat-layout',
    title: 'Chat — layout',
    fields: [colorField('chat-canvas-bg', 'Message canvas', 'bg-lab-chat-canvas')],
  },
  {
    id: 'chat-messages',
    title: 'Chat — messages',
    fields: [
      colorField('chat-user-bg', 'User bubble', 'bg-lab-chat-user'),
      colorField('chat-user-text', 'User text', 'text-lab-chat-user', 'chat-user-bg'),
      colorField('chat-assistant-bg', 'Assistant bubble', 'bg-lab-chat-assistant'),
      colorField('chat-assistant-text', 'Assistant text', 'text-lab-chat-assistant', 'chat-assistant-bg'),
    ],
  },
  {
    id: 'chat-tools',
    title: 'Chat — tools & thinking',
    fields: [
      colorField('chat-log-bg', 'Log row background', 'bg-lab-chat-log'),
      colorField('chat-log-text', 'Log text', 'text-lab-chat-log', 'chat-log-bg'),
      colorField('chat-tool-result-bg', 'Tool result background', 'bg-lab-chat-tool-result'),
      colorField('chat-tool-result-text', 'Tool result text', 'text-lab-chat-tool-result', 'chat-tool-result-bg'),
      colorField('chat-thinking-bg', 'Thinking panel', 'bg-lab-chat-thinking'),
      colorField('chat-thinking-text', 'Thinking text', 'text-lab-chat-thinking', 'chat-thinking-bg'),
    ],
  },
  {
    id: 'chat-composer',
    title: 'Chat — composer & tabs',
    fields: [
      colorField('chat-tabs-bar-bg', 'Session tabs bar', 'bg-lab-chat-tabs-bar'),
      colorField('chat-tab-active-bg', 'Active tab', '—'),
      colorField('chat-composer-bg', 'Composer bar', 'bg-lab-chat-composer'),
      colorField('chat-composer-panel-bg', 'Composer panel', '—'),
      colorField('chat-input-bg', 'Input field', '—'),
      colorField('chat-input-text', 'Input text', '—', 'chat-input-bg'),
    ],
  },
];
