<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import Select from 'primevue/select';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Message from 'primevue/message';
import InputText from 'primevue/inputtext';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { useLabThemeDraft } from '@/shared/composables/useLabThemeDraft';
import { LAB_THEME_MODES } from '@/shared/theme/lab-theme-token-keys';
import type { LabThemePresetId } from '@/shared/theme/lab-theme-preset-id';
import { getDefaultPresetIdForMode } from '@/shared/theme/presets';
import {
  customPresetUuidFromId,
  isCustomLabThemePresetId,
} from '@/shared/theme/lab-theme-preset-id';
import { THEME_SETTINGS_SECTIONS } from '@/shared/theme/theme-settings-groups';
import ThemeTailwindColorField from '@/dashboard/components/settings/ThemeTailwindColorField.vue';
import type { User } from '@/shared/types';

const { generateUniqueId } = useUniqueElementId();

const props = defineProps<{
  user: User | null;
}>();

const draft = useLabThemeDraft();

const isAdmin = computed(() => props.user?.role === 'owner' || props.user?.role === 'admin');

const modeOptions = LAB_THEME_MODES.map((m) => ({ label: m === 'dark' ? 'Dark' : 'Light', value: m }));

const presetOptions = computed(() =>
  draft
    .listPresetDefinitions()
    .filter((p) => p.mode === draft.editingTheme.value.mode)
    .map((p) => ({
      label: p.builtin === false ? `${p.displayName} (custom)` : p.displayName,
      value: p.id,
    })),
);

const editingCustomPreset = computed(() =>
  isCustomLabThemePresetId(draft.editingTheme.value.presetId),
);

const newCustomName = ref('My theme');
const libraryBusy = ref(false);
const libraryError = ref<string | null>(null);

async function onDuplicateCustom() {
  libraryBusy.value = true;
  libraryError.value = null;
  const name = newCustomName.value.trim() || 'Custom theme';
  const result = await draft.duplicateToCustomPreset(draft.editingTheme.value.presetId, name);
  libraryBusy.value = false;
  if (!result.success) {
    libraryError.value = result.error ?? 'Duplicate failed';
    return;
  }
  draft.patchThemeDraft({ presetId: result.presetId });
}

async function onDeleteCustom() {
  const presetId = draft.editingTheme.value.presetId;
  if (!isCustomLabThemePresetId(presetId)) {
    return;
  }
  libraryBusy.value = true;
  libraryError.value = null;
  const result = await draft.removeCustomPreset(customPresetUuidFromId(presetId));
  libraryBusy.value = false;
  if (!result.success) {
    libraryError.value = result.error ?? 'Delete failed';
    return;
  }
  draft.patchThemeDraft({
    presetId: getDefaultPresetIdForMode(draft.editingTheme.value.mode),
  });
}

const saveBtnId = generateUniqueId('theme-save');
const discardBtnId = generateUniqueId('theme-discard');
const resetPresetBtnId = generateUniqueId('theme-reset-preset');
const modeSelectId = generateUniqueId('theme-mode');
const presetSelectId = generateUniqueId('theme-preset');

const openPanels = ref<string[]>(['general']);

onMounted(async () => {
  if (!isAdmin.value) {
    return;
  }
  if (!draft.savedTheme.value) {
    await draft.hydrateLabThemeFromPlatform();
  }
});

function onModeChange(mode: 'light' | 'dark') {
  draft.patchThemeDraft({ mode });
}

function onPresetChange(presetId: LabThemePresetId) {
  if (!presetId) {
    return;
  }
  draft.patchThemeDraft({ presetId });
}

function tokenValue(key: string): string {
  const resolved = draft.resolvedEditingTokens.value;
  return resolved[key as keyof typeof resolved] ?? '';
}

function updateToken(key: string, value: string) {
  draft.patchThemeDraft({
    token: { key: key as import('@/shared/theme/lab-theme-token-keys').LabThemeTokenKey, value },
  });
}

async function onSave() {
  await draft.saveThemeDraft();
}

function onDiscard() {
  draft.discardDraft();
}
</script>

<template>
  <div v-if="!isAdmin" class="text-lab-general-text-muted text-sm">
    Only platform owners and admins can edit the lab theme.
  </div>
  <div v-else class="lab-theme-settings flex min-h-0 flex-col gap-4">
    <p class="text-lab-general-text-muted text-xs m-0">
      Changes apply to the live lab immediately. Save to persist for all users. Refresh discards unsaved theme
      changes.
    </p>

    <div class="lab-theme-previews flex flex-wrap gap-3">
      <div class="lab-theme-preview-shell min-w-[8rem]">
        <p class="m-0 text-[0.65rem] font-semibold uppercase tracking-wide text-lab-general-text-muted">Shell</p>
        <div
          class="rounded px-2 py-1 text-xs"
          :style="{
            background: 'var(--lab-general-bg)',
            color: 'var(--lab-general-text)',
            border: '1px solid var(--lab-general-border)',
          }"
        >
          Sample text
        </div>
      </div>
      <div class="lab-theme-preview-card min-w-[10rem]">
        <p class="m-0 text-[0.65rem] font-semibold uppercase tracking-wide text-lab-general-text-muted">App card</p>
        <div
          class="rounded-md px-2 py-2 text-xs font-semibold"
          :style="{
            background: 'var(--lab-card-gradient)',
            color: 'var(--lab-card-title-text)',
            border: '1px solid var(--lab-card-border)',
          }"
        >
          App title
        </div>
      </div>
      <div class="lab-theme-preview-chat min-w-[10rem]">
        <p class="m-0 text-[0.65rem] font-semibold uppercase tracking-wide text-lab-general-text-muted">Chat</p>
        <div class="flex flex-col gap-1">
          <span
            class="text-[10px] px-1.5 py-0.5 rounded self-end"
            :style="{ background: 'var(--lab-chat-user-bg)', color: 'var(--lab-chat-user-text)' }"
            >User</span
          >
          <span
            class="text-[10px] px-1.5 py-0.5 rounded self-start"
            :style="{
              background: 'var(--lab-chat-assistant-bg)',
              color: 'var(--lab-chat-assistant-text)',
            }"
            >Assistant</span
          >
        </div>
      </div>
    </div>

    <Message v-if="draft.contrastWarnings.value.length" severity="warn" :closable="false" class="text-xs!">
      <p class="m-0 font-medium">Contrast warnings (save is still allowed):</p>
      <ul class="m-0 mt-1 pl-4 list-disc">
        <li v-for="w in draft.contrastWarnings.value" :key="w.id">
          {{ w.label }} — ratio {{ w.ratio.toFixed(2) }} (min {{ w.minimum }})
        </li>
      </ul>
    </Message>
    <Message v-if="draft.saveError.value" severity="error" class="text-xs!">{{ draft.saveError.value }}</Message>

    <div class="rounded-md border border-lab-general-border p-3 flex flex-col gap-2">
      <p class="text-xs text-lab-general-text-muted m-0 font-medium">Theme library</p>
      <p class="text-[10px] text-lab-general-text-muted m-0">
        Built-in presets cannot be deleted. Duplicate to create an editable custom theme.
      </p>
      <div class="flex flex-wrap items-end gap-2">
        <div class="flex flex-col gap-1 min-w-[10rem]">
          <label class="text-xs text-lab-general-text-muted" :for="generateUniqueId('theme-new-custom-name')"
            >New custom name</label
          >
          <InputText
            v-model="newCustomName"
            class="text-xs!"
            :pt="{ root: { attrs: { id: generateUniqueId('theme-new-custom-name') } } }"
          />
        </div>
        <Button
          type="button"
          label="Duplicate to custom"
          size="small"
          severity="secondary"
          :loading="libraryBusy"
          :pt="{ root: { attrs: { id: generateUniqueId('theme-duplicate-custom') } } }"
          @click="onDuplicateCustom"
        />
        <Button
          v-if="editingCustomPreset"
          type="button"
          label="Delete custom theme"
          size="small"
          severity="danger"
          :loading="libraryBusy"
          :disabled="!editingCustomPreset"
          :pt="{ root: { attrs: { id: generateUniqueId('theme-delete-custom') } } }"
          @click="onDeleteCustom"
        />
      </div>
      <Message v-if="libraryError" severity="error" class="text-xs!">{{ libraryError }}</Message>
    </div>

    <div class="flex flex-wrap items-end gap-3">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-lab-general-text-muted" :for="modeSelectId">Color scheme</label>
        <SelectButton
          :id="modeSelectId"
          :model-value="draft.editingTheme.value.mode"
          :options="modeOptions"
          option-label="label"
          option-value="value"
          :pt="{ root: { attrs: { id: modeSelectId } } }"
          @update:model-value="onModeChange"
        />
      </div>
      <div class="flex flex-col gap-1 min-w-[12rem]">
        <label class="text-xs text-lab-general-text-muted" :for="presetSelectId">Preset</label>
        <Select
          :input-id="presetSelectId"
          :model-value="draft.editingTheme.value.presetId"
          :options="presetOptions"
          option-label="label"
          option-value="value"
          :pt="{ root: { attrs: { id: presetSelectId } } }"
          @update:model-value="onPresetChange"
        />
      </div>
      <Button
        type="button"
        label="Reset to preset"
        severity="secondary"
        size="small"
        :id="resetPresetBtnId"
        :pt="{ root: { attrs: { id: resetPresetBtnId } } }"
        @click="draft.resetDraftToPreset()"
      />
      <Button
        type="button"
        label="Save theme"
        size="small"
        :id="saveBtnId"
        :loading="draft.saving.value"
        :pt="{ root: { attrs: { id: saveBtnId } } }"
        @click="onSave"
      />
      <Button
        type="button"
        label="Discard"
        severity="secondary"
        size="small"
        :id="discardBtnId"
        :disabled="!draft.hasUnsavedChanges.value"
        :pt="{ root: { attrs: { id: discardBtnId } } }"
        @click="onDiscard"
      />
    </div>

    <Accordion
      v-model:value="openPanels"
      multiple
      class="lab-theme-settings-accordion min-h-0 flex-1 overflow-y-auto"
    >
      <AccordionPanel
        v-for="section in THEME_SETTINGS_SECTIONS"
        :key="section.id"
        :value="section.id"
        :pt="{ root: { attrs: { id: generateUniqueId(`theme-section-${section.id}`) } } }"
      >
        <AccordionHeader>{{ section.title }}</AccordionHeader>
        <AccordionContent>
          <div class="grid gap-3 sm:grid-cols-2">
            <div v-for="field in section.fields" :key="field.key" class="flex flex-col gap-1">
              <label class="text-xs text-lab-general-text">{{ field.label }}</label>
              <span class="text-[10px] text-lab-general-text-muted font-mono">{{ field.utility }}</span>
              <ThemeTailwindColorField
                v-if="field.editor === 'tailwind-color' && field.twPrefix"
                :model-value="tokenValue(field.key)"
                :tw-prefix="field.twPrefix"
                :input-id="generateUniqueId(`theme-token-${field.key}`)"
                @update:model-value="(v) => updateToken(field.key, v ?? '')"
              />
              <InputText
                v-else
                :model-value="tokenValue(field.key)"
                class="text-xs! font-mono!"
                :pt="{ root: { attrs: { id: generateUniqueId(`theme-token-${field.key}`) } } }"
                @update:model-value="(v) => updateToken(field.key, v ?? '')"
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionPanel>
    </Accordion>
  </div>
</template>
