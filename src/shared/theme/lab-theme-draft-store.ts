import { computed, ref } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { fetchPlatformLabTheme, savePlatformLabTheme } from '@/shared/theme/lab-platform-theme.client';
import {
  createCustomLabPreset,
  deleteCustomLabPreset,
  fetchCustomLabPresets,
  updateCustomLabPreset,
} from '@/shared/theme/lab-custom-presets.client';
import {
  getLabThemePresetLookup,
  listCustomPresetDefinitions,
  syncCustomLabPresetsFromServer,
} from '@/shared/theme/lab-custom-presets-cache';
import {
  customPresetUuidFromId,
  isCustomLabThemePresetId,
  type LabThemePresetId,
} from '@/shared/theme/lab-theme-preset-id';
import {
  getDefaultPresetIdForMode,
  listPresetDefinitions,
} from '@/shared/theme/presets';
import { resolvePresetDefinition } from '@/shared/theme/resolve-preset-definition';
import { resolveLabTheme } from '@/shared/theme/resolve-lab-theme';
import { persistPlatformLabThemeToClientCache } from '@/shared/theme/lab-theme-client-cache';
import { setActiveLabTheme } from '@/shared/theme/lab-theme-state';
import { contrastRatio, isAaBodyText, type ContrastWarning } from '@/shared/theme/lab-theme-contrast';
import { THEME_CONTRAST_PAIRS } from '@/shared/theme/theme-settings-groups';
import type { LabTheme } from '@/shared/types/lab-theme';
import type { LabThemeMode, LabThemeTokenKey } from '@/shared/theme/lab-theme-token-keys';

const savedTheme = ref<LabTheme | null>(null);
const draftTheme = ref<LabTheme | null>(null);
const isAdminSession = ref(false);
const saving = ref(false);
const saveError = ref<string | null>(null);
const contrastWarningsDismissed = ref(false);
const lastSaveSucceeded = ref(false);

let openThemesSettingsHandler: (() => void) | null = null;

function themesEqual(a: LabTheme | null, b: LabTheme | null): boolean {
  if (!a || !b) return a === b;
  return JSON.stringify(normalizeTheme(a)) === JSON.stringify(normalizeTheme(b));
}

function normalizeTheme(theme: LabTheme): LabTheme {
  const tokens = theme.tokens ? { ...theme.tokens } : undefined;
  if (tokens) {
    const sorted = Object.keys(tokens).sort();
    const ordered: Record<string, string> = {};
    for (const k of sorted) {
      ordered[k] = tokens[k as LabThemeTokenKey] ?? '';
    }
    return { mode: theme.mode, presetId: theme.presetId, tokens: ordered };
  }
  return { mode: theme.mode, presetId: theme.presetId };
}

const hasUnsavedChanges = computed(() => {
  if (!isAdminSession.value || !savedTheme.value) {
    return false;
  }
  const working = draftTheme.value ?? savedTheme.value;
  return !themesEqual(working, savedTheme.value);
});

const editingTheme = computed((): LabTheme => {
  if (draftTheme.value) {
    return draftTheme.value;
  }
  if (savedTheme.value) {
    return savedTheme.value;
  }
  return { mode: 'dark', presetId: 'cloud-grey-dark' };
});

const resolvedEditingTokens = computed(() =>
  resolveLabTheme(editingTheme.value, getLabThemePresetLookup()).tokens,
);

const contrastWarnings = computed((): ContrastWarning[] => {
  if (contrastWarningsDismissed.value || lastSaveSucceeded.value) {
    return [];
  }
  const tokens = resolvedEditingTokens.value;
  const warnings: ContrastWarning[] = [];
  for (const pair of THEME_CONTRAST_PAIRS) {
    const fg = tokens[pair.fg];
    const bg = tokens[pair.bg];
    const ratio = contrastRatio(fg, bg);
    if (!isAaBodyText(ratio)) {
      warnings.push({
        id: pair.id,
        label: pair.label,
        ratio: ratio ?? 0,
        minimum: 4.5,
      });
    }
  }
  return warnings;
});

const debouncedApply = useDebounceFn((theme: LabTheme) => {
  if (!isAdminSession.value) {
    return;
  }
  setActiveLabTheme(resolveLabTheme(theme, getLabThemePresetLookup()));
}, 200);

export function registerOpenThemesSettingsHandler(handler: () => void): void {
  openThemesSettingsHandler = handler;
}

export function requestOpenThemesSettings(): void {
  openThemesSettingsHandler?.();
}

export function setLabThemeAdminSession(enabled: boolean): void {
  isAdminSession.value = enabled;
  if (!enabled) {
    discardDraft();
    savedTheme.value = null;
  }
}

export async function refreshCustomLabPresets(): Promise<void> {
  const presets = await fetchCustomLabPresets();
  syncCustomLabPresetsFromServer(presets);
}

export async function hydrateLabThemeFromPlatform(): Promise<LabTheme | null> {
  await refreshCustomLabPresets();
  const theme = await fetchPlatformLabTheme();
  if (!theme) {
    return null;
  }
  syncSavedThemeFromServer(theme, true);
  return theme;
}

export function syncSavedThemeFromServer(theme: LabTheme, applyToDom = false): void {
  savedTheme.value = { ...theme, tokens: theme.tokens ? { ...theme.tokens } : undefined };
  lastSaveSucceeded.value = false;
  if (draftTheme.value) {
    return;
  }
  if (applyToDom) {
    const resolved = resolveLabTheme(theme, getLabThemePresetLookup());
    setActiveLabTheme(resolved);
    persistPlatformLabThemeToClientCache(resolved);
  }
}

export function beginThemeEditing(): void {
  if (!savedTheme.value) {
    return;
  }
  if (!draftTheme.value) {
    draftTheme.value = {
      mode: savedTheme.value.mode,
      presetId: savedTheme.value.presetId,
      tokens: savedTheme.value.tokens ? { ...savedTheme.value.tokens } : undefined,
    };
  }
}

export function patchThemeDraft(partial: {
  mode?: LabThemeMode;
  presetId?: LabThemePresetId;
  token?: { key: LabThemeTokenKey; value: string };
}): void {
  if (!isAdminSession.value || !savedTheme.value) {
    return;
  }
  beginThemeEditing();
  const base = draftTheme.value ?? savedTheme.value;
  const next: LabTheme = { ...base, tokens: base.tokens ? { ...base.tokens } : undefined };

  if (partial.mode !== undefined) {
    next.mode = partial.mode;
    const presetForId = resolvePresetDefinition(next.presetId, getLabThemePresetLookup());
    if (presetForId.mode !== partial.mode) {
      next.presetId = getDefaultPresetIdForMode(partial.mode);
      next.tokens = undefined;
    }
  }
  if (partial.presetId !== undefined) {
    next.presetId = partial.presetId;
    const preset = resolvePresetDefinition(partial.presetId, getLabThemePresetLookup());
    next.mode = preset.mode;
    next.tokens = undefined;
  }
  if (partial.token) {
    next.tokens = { ...(next.tokens ?? {}), [partial.token.key]: partial.token.value };
  }
  draftTheme.value = next;
  contrastWarningsDismissed.value = false;
  lastSaveSucceeded.value = false;
  debouncedApply(next);
}

export function resetDraftToPreset(): void {
  if (!isAdminSession.value || !draftTheme.value) {
    return;
  }
  const presetId = draftTheme.value.presetId;
  const preset = resolvePresetDefinition(presetId, getLabThemePresetLookup());
  draftTheme.value = {
    mode: preset.mode,
    presetId: preset.id,
    tokens: undefined,
  };
  debouncedApply(draftTheme.value);
}

export async function saveThemeDraft(): Promise<boolean> {
  if (!isAdminSession.value || !savedTheme.value) {
    return false;
  }
  saving.value = true;
  saveError.value = null;
  try {
    const toSave = editingTheme.value;
    const resolved = resolveLabTheme(toSave, getLabThemePresetLookup());
    if (isCustomLabThemePresetId(toSave.presetId)) {
      const customId = customPresetUuidFromId(toSave.presetId);
      const custom = listCustomPresetDefinitions().find((p) => p.id === toSave.presetId);
      const updateResult = await updateCustomLabPreset(customId, {
        name: custom?.displayName,
        mode: resolved.mode,
        tokens: resolved.tokens,
      });
      if (!updateResult.success) {
        saveError.value = updateResult.error ?? 'Failed to update custom theme';
        return false;
      }
      await refreshCustomLabPresets();
    }
    const result = await savePlatformLabTheme({
      mode: resolved.mode,
      presetId: toSave.presetId,
      tokens: isCustomLabThemePresetId(toSave.presetId) ? undefined : toSave.tokens,
    });
    if (!result.success) {
      saveError.value = result.error ?? 'Save failed';
      return false;
    }
    savedTheme.value = { ...result.theme, tokens: result.theme.tokens ? { ...result.theme.tokens } : undefined };
    draftTheme.value = null;
    contrastWarningsDismissed.value = true;
    lastSaveSucceeded.value = true;
    const applied = resolveLabTheme(result.theme, getLabThemePresetLookup());
    setActiveLabTheme(applied);
    persistPlatformLabThemeToClientCache(applied);
    return true;
  } finally {
    saving.value = false;
  }
}

export function discardDraft(): void {
  if (!savedTheme.value) {
    draftTheme.value = null;
    return;
  }
  draftTheme.value = null;
  contrastWarningsDismissed.value = false;
  lastSaveSucceeded.value = false;
  setActiveLabTheme(resolveLabTheme(savedTheme.value, getLabThemePresetLookup()));
}

function listAllPresetDefinitions() {
  return [...listPresetDefinitions(), ...listCustomPresetDefinitions()];
}

export async function duplicateToCustomPreset(
  sourcePresetId: LabThemePresetId,
  name: string,
): Promise<{ success: true; presetId: LabThemePresetId } | { success: false; error: string }> {
  const source = resolvePresetDefinition(sourcePresetId, getLabThemePresetLookup());
  const result = await createCustomLabPreset({
    name,
    mode: source.mode,
    duplicateFromPresetId: sourcePresetId,
  });
  if (!result.success) {
    return result;
  }
  await refreshCustomLabPresets();
  return { success: true, presetId: result.preset.presetId };
}

export async function removeCustomPreset(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const result = await deleteCustomLabPreset(id);
  if (result.success) {
    await refreshCustomLabPresets();
  }
  return result;
}

export function useLabThemeDraftStore() {
  return {
    savedTheme,
    draftTheme,
    editingTheme,
    resolvedEditingTokens,
    hasUnsavedChanges,
    contrastWarnings,
    saving,
    saveError,
    isAdminSession,
    listPresetDefinitions: listAllPresetDefinitions,
    refreshCustomLabPresets,
    duplicateToCustomPreset,
    removeCustomPreset,
    patchThemeDraft,
    resetDraftToPreset,
    saveThemeDraft,
    discardDraft,
    beginThemeEditing,
    hydrateLabThemeFromPlatform,
    syncSavedThemeFromServer,
    setLabThemeAdminSession,
    requestOpenThemesSettings,
    registerOpenThemesSettingsHandler,
  };
}
