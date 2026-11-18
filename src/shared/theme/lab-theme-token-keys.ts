/**
 * Stable token keys for LabTheme (rm-49). Each maps to `--lab-{key}` on :root.
 */
export const LAB_THEME_PRESET_IDS = [
  'cloud-grey-dark',
  'slate-indigo-dark',
  'forest-emerald-dark',
  'ocean-cyan-dark',
  'rose-noir-dark',
  'midnight-violet-dark',
  'amber-forge-dark',
  'steel-azure-dark',
  'moss-olive-dark',
  'graphite-zinc-dark',
  'slate-lab-light',
  'paper-warm-light',
  'sky-daylight-light',
  'mint-spring-light',
  'lavender-mist-light',
  'cream-linen-light',
  'peach-dawn-light',
  'arctic-ice-light',
  'sage-garden-light',
  'blush-petal-light',
] as const;

export const LAB_THEME_MODES = ['light', 'dark'] as const;
export type LabThemeMode = (typeof LAB_THEME_MODES)[number];

/** Hex, rgb(), or full box-shadow / gradient fragment values. */
export const LAB_THEME_TOKEN_KEYS = [
  // General (shell)
  'general-bg',
  'general-text',
  'general-text-muted',
  'general-border',
  // Button (primary / outlined — drives PrimeVue pt + chat actions)
  'button-bg',
  'button-text',
  'button-border',
  'button-bg-hover',
  'button-border-hover',
  'button-outlined-bg',
  'button-outlined-text',
  'button-outlined-border',
  'button-outlined-bg-hover',
  'button-outlined-text-hover',
  // Card / app catalog
  'card-gradient-angle',
  'card-gradient-stop-1',
  'card-gradient-stop-1-pos',
  'card-gradient-stop-2',
  'card-gradient-stop-2-pos',
  'card-gradient-stop-3',
  'card-gradient-stop-3-pos',
  'card-border',
  'card-border-hover',
  'card-border-running',
  'card-shadow',
  'card-shadow-hover',
  'card-shadow-running',
  'card-title-text',
  'card-icon-bg',
  'card-icon-border',
  // Chat — layout
  'chat-canvas-bg',
  'chat-canvas-text',
  // Chat — messages
  'chat-user-bg',
  'chat-user-text',
  'chat-user-border',
  'chat-assistant-bg',
  'chat-assistant-text',
  'chat-assistant-border',
  // Chat — system / tools
  'chat-log-bg',
  'chat-log-text',
  'chat-log-border',
  'chat-log-success',
  'chat-log-error',
  'chat-tool-result-bg',
  'chat-tool-result-text',
  // Chat — thinking
  'chat-thinking-bg',
  'chat-thinking-text',
  'chat-thinking-border',
  // Chat — session chrome
  'chat-tabs-bar-bg',
  'chat-tab-active-bg',
  'chat-tab-inactive-bg',
  'chat-tab-text',
  'chat-tab-border',
  // Chat — composer
  'chat-composer-bg',
  'chat-composer-panel-bg',
  'chat-input-bg',
  'chat-input-text',
  'chat-input-border',
  'chat-composer-label-bg',
  'chat-composer-label-text',
  // Chat — mentions & follow-ups
  'chat-mention-file-bg',
  'chat-mention-command-bg',
  'chat-followup-bg',
  'chat-followup-text',
  // PrimeVue Lara semantic (dark scheme)
  'prime-surface-0',
  'prime-surface-50',
  'prime-surface-100',
  'prime-surface-200',
  'prime-surface-300',
  'prime-surface-400',
  'prime-surface-500',
  'prime-surface-600',
  'prime-surface-700',
  'prime-surface-800',
  'prime-surface-900',
  'prime-surface-950',
  'prime-primary-500',
  'prime-primary-600',
  'prime-content-primary',
  'prime-content-secondary',
  // Legacy mist scale (Tailwind `mist-*` aliases)
  'legacy-mist-50',
  'legacy-mist-100',
  'legacy-mist-200',
  'legacy-mist-300',
  'legacy-mist-400',
  'legacy-mist-500',
  'legacy-mist-600',
  'legacy-mist-700',
  'legacy-mist-800',
  'legacy-mist-900',
  'legacy-mist-950',
] as const;

export type LabThemeTokenKey = (typeof LAB_THEME_TOKEN_KEYS)[number];

export type LabThemeTokenMap = Record<LabThemeTokenKey, string>;
