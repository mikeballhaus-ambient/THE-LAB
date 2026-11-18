import type { ButtonPassThroughMethodOptions, ButtonProps } from 'primevue/button';

/** Density / sizing only — colors come from `--lab-button-*` CSS variables (rm-49). */
export function getLabPrimeVuePtOptions() {
  return {
    inputtext: {
      root: {
        class:
          'px-2! py-1! text-sm! rounded-md! border! shadow-none! bg-[var(--lab-form-control-bg,var(--lab-general-bg))]! border-[var(--lab-form-control-border,color-mix(in_srgb,var(--lab-general-border)_90%,transparent))]! text-[var(--lab-general-text)]!',
      },
    },
    textarea: {
      root: {
        class:
          'px-2! py-1! text-sm! rounded-md! border! shadow-none! bg-[var(--lab-form-control-bg,var(--lab-general-bg))]! border-[var(--lab-form-control-border,var(--lab-general-border))]! text-[var(--lab-general-text)]!',
      },
    },
    select: {
      root: {
        class:
          'rounded-md! border! shadow-none! bg-[var(--lab-form-control-bg,var(--lab-general-bg))]! border-[var(--lab-form-control-border,color-mix(in_srgb,var(--lab-general-border)_90%,transparent))]! text-[var(--lab-general-text)]!',
      },
      label: { class: 'text-sm! py-1! px-2! text-[var(--lab-general-text)]!' },
      dropdown: { class: 'text-[var(--lab-general-text-muted)]!' },
      optionLabel: { class: 'text-sm! text-[var(--lab-general-text)]!' },
      overlay: {
        class:
          'bg-[var(--lab-select-overlay-bg,var(--lab-general-bg))]! border! border-[color-mix(in_srgb,var(--lab-general-border)_55%,transparent)]! text-[var(--lab-general-text)]!',
      },
      option: { class: 'text-sm! text-[var(--lab-general-text)]!' },
      optionGroup: {
        class: 'text-xs! font-semibold! uppercase! tracking-wide! text-[var(--lab-general-text-muted)]!',
      },
      listContainer: { class: 'p-1!' },
      list: { class: 'p-1!' },
    },
    multiselect: {
      root: {
        class:
          'rounded-md! border! shadow-none! bg-[var(--lab-form-control-bg,var(--lab-general-bg))]! border-[var(--lab-form-control-border,var(--lab-general-border))]! text-[var(--lab-general-text)]!',
      },
      label: { class: 'text-sm! py-1! px-2! text-[var(--lab-general-text)]!' },
      overlay: {
        class:
          'bg-[var(--lab-select-overlay-bg,var(--lab-general-bg))]! border! border-[color-mix(in_srgb,var(--lab-general-border)_55%,transparent)]! text-[var(--lab-general-text)]!',
      },
      option: { class: 'text-sm! text-[var(--lab-general-text)]!' },
      chip: {
        class:
          'bg-[color-mix(in_srgb,var(--lab-accent-primary)_14%,var(--lab-general-bg))]! text-[var(--lab-general-text)]! border! border-[color-mix(in_srgb,var(--lab-general-border)_50%,transparent)]!',
      },
    },
    datepicker: {
      pcInputText: {
        root: {
          class:
            'w-full! px-2! py-1! text-sm! rounded-md! border! shadow-none! bg-[var(--lab-form-control-bg,var(--lab-prime-surface-900))]! border-[var(--lab-form-control-border,var(--lab-general-border))]! text-[var(--lab-general-text)]!',
        },
      },
    },
    inputnumber: {
      root: {
        class:
          'rounded-md! border! shadow-none! bg-[var(--lab-prime-surface-900)]! border-[var(--lab-general-border)]! text-[var(--lab-general-text)]!',
      },
    },
    toggleswitch: {
      slider: ({ context }: { context: { checked: boolean } }) => ({
        class: [
          'border!',
          context.checked
            ? 'bg-[var(--lab-button-bg)]! border-[var(--lab-button-border)]!'
            : 'bg-[color-mix(in_srgb,var(--lab-general-text-muted)_45%,var(--lab-general-bg))]! border-[color-mix(in_srgb,var(--lab-general-border)_70%,transparent)]!',
        ],
      }),
      handle: ({ context }: { context: { checked: boolean } }) => ({
        class: context.checked
          ? 'bg-[var(--lab-button-text)]!'
          : 'bg-[var(--lab-general-text)]!',
      }),
    },
    selectbutton: {
      root: { class: 'gap-1! flex-wrap!' },
      pcToggleButton: {
        root: ({ context }: { context: { active: boolean } }) => ({
          class: [
            'text-sm! rounded-md! border! px-3! py-1.5! font-medium! shadow-none! transition-colors!',
            context.active
              ? 'border-[var(--lab-accent-primary)]! bg-[color-mix(in_srgb,var(--lab-accent-primary)_18%,var(--lab-general-bg))]! text-[var(--lab-general-text)]!'
              : 'border-[color-mix(in_srgb,var(--lab-general-border)_85%,transparent)]! bg-[color-mix(in_srgb,var(--lab-general-border)_30%,var(--lab-general-bg))]! text-[var(--lab-general-text-muted)]! hover:text-[var(--lab-general-text)]!',
          ],
        }),
      },
    },
    accordionheader: {
      root: {
        class:
          'text-[var(--lab-general-text)]! bg-[color-mix(in_srgb,var(--lab-general-border)_20%,var(--lab-general-bg))]! border-[color-mix(in_srgb,var(--lab-general-border)_70%,transparent)]! font-semibold!',
      },
    },
    accordioncontent: {
      content: {
        class:
          'text-[var(--lab-general-text)]! bg-[var(--lab-general-bg)]! border-[color-mix(in_srgb,var(--lab-general-border)_65%,transparent)]!',
      },
    },
    button: {
      root: ({ props }: ButtonPassThroughMethodOptions<ButtonProps>) => ({
        class: [
          'w-fit! max-w-full! inline-flex! px-2! py-1! text-xs! rounded-sm! whitespace-nowrap! border! cursor-pointer! items-center! justify-center! transition-colors! duration-200!',
          {
            'bg-[var(--lab-button-bg)]! border-[var(--lab-button-border)]! text-[var(--lab-button-text)]! hover:bg-[var(--lab-button-bg-hover)]! hover:border-[var(--lab-button-border-hover)]!':
              !props.outlined && props.variant !== 'outlined',
          },
          {
            'bg-[var(--lab-button-outlined-bg)]! border-[var(--lab-button-outlined-border)]! text-[var(--lab-button-outlined-text)]! hover:bg-[var(--lab-button-outlined-bg-hover)]! hover:text-[var(--lab-button-outlined-text-hover)]!':
              props.outlined || props.variant === 'outlined',
          },
        ],
      }),
    },
    card: {
      title: {
        class: 'text-[var(--lab-general-text)]!',
      },
      subtitle: {
        class: 'text-[var(--lab-general-text-muted)]!',
      },
    },
    panel: {
      title: {
        class: 'text-[var(--lab-general-text)]!',
      },
      header: {
        class: 'text-[var(--lab-general-text)]!',
      },
    },
    dialog: {
      title: {
        class: 'text-[var(--lab-general-text)]!',
      },
      header: {
        class: 'text-[var(--lab-general-text)]!',
      },
      content: {
        class: 'text-[var(--lab-general-text)]!',
      },
      footer: {
        class: 'text-[var(--lab-general-text)]!',
      },
      pcCloseButton: {
        severity: 'info',
        variant: 'text',
        rounded: true,
        root: {
          class:
            'w-7! h-7! px-2! py-1! text-xs! rounded-sm! whitespace-nowrap! border! cursor-pointer! flex! items-center! transition-colors! duration-200! bg-[var(--lab-button-bg)]! border-[var(--lab-button-border)]! text-[var(--lab-button-text)]! hover:bg-[var(--lab-button-bg-hover)]! hover:border-[var(--lab-button-border-hover)]!',
        },
      },
    },
    checkbox: {
      root: { class: '!w-4 !h-4' },
      box: { class: '!w-4 !h-4' },
      icon: { class: '!w-3 !h-3' },
    },
    datatable: {
      root: {
        class: 'text-[var(--lab-general-text)]!',
      },
      columnTitle: { class: 'text-[var(--lab-general-text)]! font-semibold!' },
      headerCell: {
        class:
          'text-[var(--lab-general-text)]! bg-[color-mix(in_srgb,var(--lab-general-border)_14%,var(--lab-general-bg-muted))]!',
      },
      bodyCell: {
        class: 'text-[var(--lab-general-text)]! bg-[var(--lab-general-bg)]!',
      },
      column: {
        headerCell: {
          class:
            'text-[var(--lab-general-text)]! bg-[color-mix(in_srgb,var(--lab-general-border)_14%,var(--lab-general-bg-muted))]!',
        },
        bodyCell: {
          class: 'text-[var(--lab-general-text)]! bg-[var(--lab-general-bg)]!',
        },
      },
    },
    progressbar: {
      root: {
        class:
          'overflow-hidden! rounded-full! border! border-[color-mix(in_srgb,var(--lab-general-border)_70%,transparent)]! bg-[color-mix(in_srgb,var(--lab-general-bg)_55%,var(--lab-general-border))]!',
      },
      value: {
        class:
          'rounded-full! bg-[var(--lab-button-border-hover,var(--lab-button-bg))]! transition-[width]! duration-200!',
      },
    },
    mergeProps: true,
  };
}
