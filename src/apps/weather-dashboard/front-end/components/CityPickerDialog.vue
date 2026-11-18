<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Message from 'primevue/message';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { UsCityOption } from '../../shared/types';
import * as api from '../api';

/**
 * Intermediate step before the Forms Builder location form.
 *
 * Users cannot reasonably know a city's latitude/longitude, so this dialog asks for a US state
 * and city, resolves coordinates from the geocoder, and hands them back as form preset values.
 * The host then opens the real create/edit binding — this dialog never writes data itself.
 *
 * Styling deliberately reuses the integration-form chrome: `lab-app-dialog` for the shell and
 * `lab-form-runtime` for control treatment, so these inputs match the Forms Builder dialogs
 * rather than rendering as bare, unstyled PrimeVue controls.
 */
const props = defineProps<{
  visible: boolean;
  serverUrl?: string;
  /** `create` shows "Add location", `edit` shows "Change location". */
  mode: 'create' | 'edit';
  /** Pre-select the state when editing an existing location. */
  initialState?: string;
  /** Pre-fill the search box with the current city name when editing. */
  initialCity?: string;
  /** Disable the Continue button while the form dialog is opening. */
  busy?: boolean;
  /** US states, supplied by the shell from `/api/weather/map/config`. */
  states?: Array<{ code: string; name: string }>;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'continue', city: UsCityOption): void;
}>();

const { generateUniqueId } = useUniqueElementId();
const dialogId = generateUniqueId('city-picker-dialog');
const stateSelectId = generateUniqueId('city-picker-state');
const searchInputId = generateUniqueId('city-picker-search');
const continueId = generateUniqueId('city-picker-continue');
const cancelId = generateUniqueId('city-picker-cancel');

const query = ref('');
const stateCode = ref<string | null>(null);
const results = ref<UsCityOption[]>([]);
const selected = ref<UsCityOption | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const states = computed(() => props.states ?? []);
const base = computed(() => (props.serverUrl ?? '').replace(/\/$/, ''));

let debounceHandle: ReturnType<typeof setTimeout> | null = null;
/** Guards against an older in-flight response overwriting a newer one. */
let requestToken = 0;

async function runSearch(): Promise<void> {
  const text = query.value.trim();
  if (text.length < 2 || !base.value) {
    results.value = [];
    error.value = null;
    return;
  }
  const token = ++requestToken;
  loading.value = true;
  error.value = null;
  try {
    const response = await api.searchUsCities(base.value, text, stateCode.value ?? undefined);
    if (token !== requestToken) {
      return;
    }
    results.value = response.cities;
    error.value = response.error ?? null;
    // Keep a prior selection only if it survived the new search.
    if (selected.value && !response.cities.some((row) => row.id === selected.value?.id)) {
      selected.value = null;
    }
  } catch (e) {
    if (token !== requestToken) {
      return;
    }
    results.value = [];
    error.value = e instanceof Error ? e.message : 'City search failed';
  } finally {
    if (token === requestToken) {
      loading.value = false;
    }
  }
}

function onQueryInput(): void {
  if (debounceHandle) {
    clearTimeout(debounceHandle);
  }
  debounceHandle = setTimeout(() => void runSearch(), 300);
}

function onStateChange(): void {
  selected.value = null;
  // A state is a strong filter — re-run immediately rather than waiting for more typing.
  if (query.value.trim().length >= 2) {
    void runSearch();
  }
}

function choose(city: UsCityOption): void {
  selected.value = city;
}

function onContinue(): void {
  if (!selected.value || props.busy) {
    return;
  }
  emit('continue', selected.value);
}

function close(): void {
  emit('update:visible', false);
}

/** Reset each time the dialog opens so a previous search never leaks into a new attempt. */
watch(
  () => props.visible,
  (isOpen) => {
    if (!isOpen) {
      return;
    }
    query.value = props.initialCity ?? '';
    stateCode.value = props.initialState ?? null;
    results.value = [];
    selected.value = null;
    error.value = null;
    if (query.value.trim().length >= 2) {
      void runSearch();
    }
  },
);
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="mode === 'create' ? 'Add location' : 'Change location'"
    :class="['city-picker-dialog', 'lab-app-dialog', 'lab-form-runtime']"
    :pt="{ root: { attrs: { id: dialogId } } }"
    @update:visible="(value: boolean) => emit('update:visible', value)"
  >
    <div class="city-picker">
      <p class="city-picker__hint">
        Pick a US state and city — coordinates are filled in for you.
      </p>

      <div class="city-picker__field">
        <label class="city-picker__label" :id="generateUniqueId('city-picker-state-label')" :for="stateSelectId">State</label>
        <Select
          v-model="stateCode"
          :options="states"
          option-label="name"
          option-value="code"
          filter
          placeholder="Any state"
          show-clear
          :pt="{ root: { attrs: { id: stateSelectId } } }"
          @change="onStateChange"
        />
      </div>

      <div class="city-picker__field">
        <label class="city-picker__label" :id="generateUniqueId('city-picker-search-label')" :for="searchInputId">City</label>
        <InputText
          v-model="query"
          placeholder="Start typing a city name…"
          :pt="{ root: { attrs: { id: searchInputId } } }"
          @input="onQueryInput"
        />
      </div>

      <Message v-if="error" severity="warn" :closable="false">
        Could not search cities: {{ error }}
      </Message>

      <p v-if="loading" class="city-picker__status">Searching…</p>
      <p
        v-else-if="query.trim().length >= 2 && results.length === 0 && !error"
        class="city-picker__status"
      >
        No matching US cities{{ stateCode ? ' in that state' : '' }}.
      </p>

      <!-- `:id` is declared before the `v-if`: the build-time gate parses attributes with a
           `[^>]*` capture, so a `>` inside `v-if="results.length > 0"` truncates the match and
           the id would be reported missing. -->
      <ul
        :id="generateUniqueId('city-picker-results')"
        v-if="results.length > 0"
        class="city-picker__list"
      >
        <li v-for="city in results" :key="city.id">
          <button
            type="button"
            class="city-picker__option"
            :class="{ 'city-picker__option--selected': selected?.id === city.id }"
            :aria-pressed="selected?.id === city.id"
            :id="generateUniqueId(`city-picker-option-${city.id}`)"
            @click="choose(city)"
          >
            <span class="city-picker__option-title">{{ city.city }}, {{ city.state }}</span>
            <span class="city-picker__option-meta">
              {{ city.county ? `${city.county} · ` : '' }}{{ city.latitude.toFixed(4) }}, {{ city.longitude.toFixed(4) }}
            </span>
          </button>
        </li>
      </ul>
    </div>

    <template #footer>
      <div class="city-picker__footer">
        <Button
          type="button"
          label="Cancel"
          severity="secondary"
          text
          :pt="{ root: { attrs: { id: cancelId } } }"
          @click="close"
        />
        <Button
          type="button"
          :label="mode === 'create' ? 'Continue' : 'Update location'"
          icon="pi pi-arrow-right"
          :disabled="!selected"
          :loading="busy"
          :pt="{ root: { attrs: { id: continueId } } }"
          @click="onContinue"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
/*
 * Chrome mirrors `.lab-integration-dialog` (see lab-form-runtime.css): a slightly raised header
 * and footer strip over a recessed body, so this dialog sits next to the Forms Builder dialogs
 * without looking unstyled.
 *
 * `:global()` is required because PrimeVue teleports the Dialog to <body> — a scoped selector
 * (even `:deep()`) would never match, since the teleported nodes carry no scope id.
 */
:global(.city-picker-dialog.lab-app-dialog) {
  background: var(--lab-general-bg);
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 90%, transparent);
  color: var(--lab-general-text);
  border-radius: 0.5rem;
  /* Reuse the integration-dialog palette so the two dialogs look identical. */
  --lab-integration-chrome-bg: color-mix(
    in srgb,
    var(--lab-prime-surface-800) 22%,
    var(--lab-general-bg)
  );
  --lab-integration-body-bg: color-mix(
    in srgb,
    var(--lab-general-bg) 72%,
    var(--lab-prime-surface-500)
  );
  --lab-integration-field-bg: var(--lab-integration-chrome-bg);
  --lab-integration-field-border: color-mix(
    in srgb,
    var(--lab-general-border) 65%,
    var(--lab-prime-surface-700)
  );
  --lab-form-control-bg: var(--lab-integration-chrome-bg);
  --lab-form-control-border: var(--lab-integration-field-border);
}

:global(.city-picker-dialog .p-dialog-header) {
  flex-shrink: 0;
  padding: 0.85rem 1.25rem;
  color: var(--lab-general-text);
  border-bottom: 1px solid color-mix(in srgb, var(--lab-general-border) 75%, transparent);
  background: var(--lab-integration-chrome-bg);
}

:global(.city-picker-dialog .p-dialog-title) {
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

:global(.city-picker-dialog .p-dialog-content) {
  padding: 0;
  color: var(--lab-general-text);
  background: var(--lab-integration-body-bg);
}

:global(.city-picker-dialog .p-dialog-footer) {
  margin: 0;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid color-mix(in srgb, var(--lab-general-border) 75%, transparent);
  background: var(--lab-integration-chrome-bg);
}

:global(.city-picker-dialog .p-select),
:global(.city-picker-dialog .p-select-label),
:global(.city-picker-dialog .p-inputtext) {
  background: var(--lab-form-control-bg);
  border-color: var(--lab-form-control-border);
  color: var(--lab-general-text);
  font-size: 0.8125rem;
}

.city-picker {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
}

.city-picker__hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--lab-general-text-muted);
}

.city-picker__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.city-picker__label {
  font-size: 0.75rem;
  color: var(--lab-general-text-muted);
}

.city-picker__status {
  margin: 0;
  font-size: 0.75rem;
  color: var(--lab-general-text-muted);
}

.city-picker__list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  /* Global `ul` resets do not reach teleported dialog content, so the browser's default
     `margin-block` / `padding-inline-start` has to be cleared explicitly — otherwise the
     results stay indented relative to the fields above. */
  margin: 0;
  padding: 0;
  padding-inline-start: 0;
  margin-block: 0;
  margin-inline: 0;
  list-style: none;
  max-height: 16rem;
  overflow-y: auto;
  /* Muted separator between the search controls and the results. */
  margin-top: 0.25rem;
  padding-top: 0.75rem;
  border-top: 1px solid color-mix(in srgb, var(--lab-general-text-muted) 30%, transparent);
}

/*
 * Markers are rendered by the `li`, not the `ul` — `list-style: none` has to be repeated here or
 * the bullets survive (Tailwind preflight does not reach this component's scoped styles).
 */
.city-picker__list > li {
  list-style: none;
  margin: 0;
  padding: 0;
}

.city-picker__list > li::marker {
  content: '';
}

.city-picker__option {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.4rem 0.6rem;
  border-radius: 0.375rem;
  border: 1px solid var(--lab-integration-field-border);
  background: var(--lab-integration-field-bg);
  color: var(--lab-general-text);
  font-size: 0.8125rem;
}

.city-picker__option:hover {
  background: color-mix(in srgb, var(--lab-general-text-muted) 14%, var(--lab-integration-field-bg));
}

.city-picker__option--selected {
  border-color: var(--lab-button-border, var(--lab-general-border));
  background: color-mix(in srgb, var(--lab-general-text-muted) 22%, var(--lab-integration-field-bg));
}

.city-picker__option-title {
  font-weight: 600;
}

.city-picker__option-meta {
  display: block;
  font-size: 0.6875rem;
  color: var(--lab-general-text-muted);
}

.city-picker__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
