import { SLATE_LAB_LIGHT_TOKENS } from '@/shared/theme/presets/slate-lab-light';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

/** Light — fresh mint greens on soft emerald-tinted surfaces. */
export const MINT_SPRING_LIGHT_TOKENS: LabThemeTokenMap = {
  ...SLATE_LAB_LIGHT_TOKENS,

  'general-bg': '#ecfdf5',
  'general-text': '#14532d',
  'general-text-muted': '#166534',
  'general-border': '#a7f3d0',

  'button-bg': '#059669',
  'button-text': '#ecfdf5',
  'button-border': '#10b981',
  'button-bg-hover': '#047857',
  'button-border-hover': '#059669',
  'button-outlined-text': '#059669',
  'button-outlined-border': '#34d399',
  'button-outlined-bg-hover': '#d1fae5',
  'button-outlined-text-hover': '#065f46',

  'card-gradient-stop-1': 'rgb(209 250 229 / 0.95)',
  'card-gradient-stop-2': 'rgb(167 243 208 / 0.9)',
  'card-gradient-stop-3': 'rgb(110 231 183 / 0.35)',
  'card-border': 'rgb(16 185 129 / 0.35)',
  'card-border-hover': 'rgb(5 150 105 / 0.45)',
  'card-title-text': '#065f46',
  'card-icon-bg': 'rgb(209 250 229 / 0.9)',
  'card-icon-border': 'rgb(52 211 153 / 0.45)',

  'chat-canvas-bg': '#d1fae5',
  'chat-canvas-text': '#14532d',
  'chat-user-bg': '#a7f3d0',
  'chat-user-text': '#14532d',
  'chat-user-border': '#34d399',
  'chat-assistant-bg': '#ecfdf5',
  'chat-assistant-text': '#166534',
  'chat-assistant-border': '#6ee7b7',
  'chat-log-bg': '#f0fdf4',
  'chat-tabs-bar-bg': '#d1fae5',
  'chat-tab-active-bg': '#059669',
  'chat-tab-inactive-bg': 'rgb(5 150 105 / 0.15)',
  'chat-tab-border': '#10b981',
  'chat-composer-bg': 'rgb(236 253 245 / 0.95)',
  'chat-composer-panel-bg': '#ecfdf5',
  'chat-input-border': '#6ee7b7',
  'chat-composer-label-bg': '#d1fae5',
  'chat-mention-command-bg': '#059669',
  'chat-followup-bg': '#ecfdf5',
};
