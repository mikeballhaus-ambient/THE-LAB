/** PrimeVue PT classes for shared form runtime controls (theme tokens + visible field chrome). */

const fieldChrome =
  'text-sm! rounded-md! border! shadow-none! bg-[var(--lab-form-control-bg,var(--lab-prime-surface-900))]! border-[var(--lab-form-control-border,var(--lab-general-border))]! text-[var(--lab-general-text)]! ' +
  'enabled:hover:border-[var(--lab-button-border)]! focus:border-[var(--lab-button-border-hover)]! focus:outline-none! ' +
  'disabled:opacity-60!';

export const formInputTextPt = {
  root: {
    class: `w-full! px-2! py-1.5! ${fieldChrome}`,
  },
};

export const formTextareaPt = {
  root: {
    class: `w-full! px-2! py-1.5! min-h-[2.5rem]! ${fieldChrome}`,
  },
};

export const formInputNumberPt = {
  root: {
    class: `w-full! ${fieldChrome}`,
  },
  input: {
    root: {
      class: `w-full! px-2! py-1.5! border-0! bg-transparent! text-[var(--lab-general-text)]! shadow-none!`,
    },
  },
};

/** Laboratory MessageInput persona control — contrasts with composer panel when input-bg matches panel-bg. */
const chatComposerFieldChrome =
  'text-xs! rounded-md! border! border-solid! shadow-none! ' +
  'bg-[var(--lab-chat-composer-label-bg)]! border-[var(--lab-chat-input-border)]! text-[var(--lab-chat-input-text)]! ' +
  'enabled:hover:border-[color-mix(in_srgb,var(--lab-chat-input-border)_45%,var(--lab-accent-primary))]! ' +
  'focus-within:border-[var(--lab-accent-primary)]! focus-within:outline-none! ' +
  'focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--lab-accent-primary)_22%,transparent)]! ' +
  'disabled:opacity-55!';

export const chatComposerSelectPt = {
  root: {
    class: `w-full! min-w-[8.5rem]! lab-chat-composer-select ${chatComposerFieldChrome}`,
  },
  label: {
    class: 'w-full! py-1! px-2! text-xs! text-[var(--lab-chat-input-text)]!',
  },
  dropdown: {
    class: 'text-[var(--lab-chat-composer-label-text)]!',
  },
  overlay: {
    class:
      'lab-chat-composer-select-overlay bg-[var(--lab-select-overlay-bg,var(--lab-general-bg))]! border! border-[color-mix(in_srgb,var(--lab-general-border)_55%,transparent)]! text-[var(--lab-general-text)]!',
  },
  option: {
    class: 'text-xs! text-[var(--lab-general-text)]!',
  },
  listContainer: { class: 'p-1!' },
  list: { class: 'p-1!' },
};

export const formSelectPt = {
  root: {
    class: `w-full! ${fieldChrome}`,
  },
  label: {
    class: 'w-full! py-1.5! px-2! text-sm!',
  },
  dropdown: {
    class: 'text-[var(--lab-general-text-muted)]!',
  },
  overlay: {
    class:
      'bg-[var(--lab-select-overlay-bg,var(--lab-general-bg))]! border! border-[color-mix(in_srgb,var(--lab-general-border)_55%,transparent)]! text-[var(--lab-general-text)]!',
  },
  option: {
    class: 'text-sm! text-[var(--lab-general-text)]!',
  },
};

export const formMultiSelectPt = {
  root: {
    class: `w-full! ${fieldChrome}`,
  },
  label: {
    class: 'w-full! py-1.5! px-2! gap-1! text-sm!',
  },
  chip: {
    class:
      'bg-[color-mix(in_srgb,var(--lab-button-bg)_40%,transparent)]! text-[var(--lab-general-text)]! rounded-sm!',
  },
  overlay: {
    class:
      'bg-[var(--lab-select-overlay-bg,var(--lab-general-bg))]! border! border-[color-mix(in_srgb,var(--lab-general-border)_55%,transparent)]! text-[var(--lab-general-text)]!',
  },
  option: {
    class: 'text-sm! text-[var(--lab-general-text)]!',
  },
};

export const formDatePickerPt = {
  root: {
    class: 'w-full! block!',
  },
  pcInputText: {
    root: {
      class: `w-full! px-2! py-1.5! ${fieldChrome}`,
    },
  },
  inputIcon: {
    class: 'text-[var(--lab-general-text-muted)]!',
  },
  dropdown: {
    class: 'text-[var(--lab-general-text-muted)]!',
  },
  panel: {
    class:
      'bg-[var(--lab-select-overlay-bg,var(--lab-general-bg))]! border! border-[color-mix(in_srgb,var(--lab-general-border)_55%,transparent)]! text-[var(--lab-general-text)]!',
  },
};

type RadioPtContext = { checked?: boolean };

type PtWithRoot = { root?: { class?: string; attrs?: Record<string, unknown> } };

/** Merge themed PT with a unique root id for UI automation (PrimeVue mergeProps). */
export function withFormControlRootId<T extends PtWithRoot>(pt: T, elementId: string): T {
  const root = pt.root ?? {};
  return {
    ...pt,
    root: {
      ...root,
      attrs: { ...(root.attrs ?? {}), id: elementId },
    },
  } as T;
}

export const formCheckboxPt = {
  root: {
    class: 'inline-flex! shrink-0! items-center! justify-center!',
  },
  box: ({ context }: { context: { checked?: boolean } }) => ({
    class: [
      'flex! items-center! justify-center! shrink-0! w-4! h-4! rounded-sm! border! border-solid! transition-colors!',
      'border-[var(--lab-form-control-border,var(--lab-general-border))]!',
      'bg-[var(--lab-form-control-bg,var(--lab-prime-surface-900))]!',
      context.checked
        ? 'border-[var(--lab-button-border)]! bg-[var(--lab-button-bg)]!'
        : '',
    ].join(' '),
  }),
  icon: {
    class: 'text-[var(--lab-button-text)]! text-xs!',
  },
};

export const formRadioButtonPt = {
  root: {
    class: 'inline-flex! shrink-0! items-center! justify-center!',
  },
  box: ({ context }: { context: RadioPtContext }) => ({
    class: [
      'flex! items-center! justify-center! shrink-0! w-4! h-4! rounded-full! border! border-solid! transition-colors!',
      'border-[var(--lab-form-control-border,var(--lab-button-outlined-border,var(--lab-general-border)))]!',
      'bg-[var(--lab-form-control-bg,var(--lab-prime-surface-900))]!',
      context.checked
        ? 'border-[var(--lab-button-border)]! bg-[var(--lab-button-bg)]!'
        : '',
    ].join(' '),
  }),
  icon: {
    class:
      'block! w-2! h-2! rounded-full! bg-[var(--lab-button-text)]! scale-100!',
  },
};
