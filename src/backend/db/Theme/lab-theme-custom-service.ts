import { randomUUID } from 'node:crypto';
import {
  createCustomLabThemePresetId,
  customPresetUuidFromId,
  isBuiltinLabThemePresetId,
  isCustomLabThemePresetId,
  type LabThemeCustomPresetId,
} from '@/shared/theme/lab-theme-preset-id';
import { resolveLabTheme } from '@/shared/theme/resolve-lab-theme';
import type { LabThemeCustomPresetDefinition } from '@/shared/theme/resolve-preset-definition';
import { getBuiltinPresetDefinition } from '@/shared/theme/presets';
import { LAB_THEME_TOKEN_KEYS, type LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';
import { labThemeRepository } from './lab-theme-repository';
import { labThemeCustomPresetRepository } from './lab-theme-custom-repository';
import type { LabTheme, LabThemeCustomPreset } from '@/shared/types/lab-theme';

function parseTokenMap(json: string): LabThemeTokenMap {
  const parsed = JSON.parse(json) as Record<string, string>;
  const map = {} as LabThemeTokenMap;
  for (const key of LAB_THEME_TOKEN_KEYS) {
    const value = parsed[key];
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`Custom theme missing token: ${key}`);
    }
    map[key] = value;
  }
  return map;
}

function rowToCustomPreset(row: {
  id: string;
  name: string;
  mode: string;
  tokensJson: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId: number | null;
}): LabThemeCustomPreset {
  const presetId = createCustomLabThemePresetId(row.id);
  return {
    id: row.id,
    presetId,
    name: row.name,
    mode: row.mode as LabThemeCustomPreset['mode'],
    tokens: parseTokenMap(row.tokensJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdByUserId: row.createdByUserId,
  };
}

function buildCustomLookup(): Map<LabThemeCustomPresetId, LabThemeCustomPresetDefinition> {
  const map = new Map<LabThemeCustomPresetId, LabThemeCustomPresetDefinition>();
  for (const row of labThemeCustomPresetRepository.listAll()) {
    const presetId = createCustomLabThemePresetId(row.id);
    map.set(presetId, {
      id: presetId,
      mode: row.mode as LabThemeCustomPresetDefinition['mode'],
      displayName: row.name,
      tokens: parseTokenMap(row.tokensJson),
      builtin: false,
    });
  }
  return map;
}

export class LabThemeCustomPresetService {
  getCustomPresetLookup(): Map<LabThemeCustomPresetId, LabThemeCustomPresetDefinition> {
    return buildCustomLookup();
  }

  listCustomPresets(): LabThemeCustomPreset[] {
    return labThemeCustomPresetRepository.listAll().map(rowToCustomPreset);
  }

  createCustomPreset(input: {
    name: string;
    mode: 'light' | 'dark';
    duplicateFromPresetId?: string;
    createdByUserId: number | null;
  }): { success: true; preset: LabThemeCustomPreset } | { success: false; error: string } {
    const name = input.name.trim();
    if (!name) {
      return { success: false, error: 'Name is required' };
    }

    let tokens: LabThemeTokenMap;
    if (input.duplicateFromPresetId) {
      if (isBuiltinLabThemePresetId(input.duplicateFromPresetId)) {
        const builtin = getBuiltinPresetDefinition(input.duplicateFromPresetId);
        tokens = { ...builtin.tokens };
      } else if (isCustomLabThemePresetId(input.duplicateFromPresetId)) {
        const uuid = customPresetUuidFromId(input.duplicateFromPresetId);
        const row = labThemeCustomPresetRepository.getById(uuid);
        if (!row) {
          return { success: false, error: 'Source custom theme not found' };
        }
        tokens = parseTokenMap(row.tokensJson);
      } else {
        return { success: false, error: 'Invalid duplicateFromPresetId' };
      }
    } else {
      const baseId = input.mode === 'light' ? 'slate-lab-light' : 'cloud-grey-dark';
      tokens = { ...getBuiltinPresetDefinition(baseId).tokens };
    }

    const id = randomUUID();
    const row = labThemeCustomPresetRepository.insert({
      id,
      name,
      mode: input.mode,
      tokensJson: JSON.stringify(tokens),
      createdByUserId: input.createdByUserId,
    });
    return { success: true, preset: rowToCustomPreset(row) };
  }

  updateCustomPreset(
    id: string,
    input: { name?: string; mode?: 'light' | 'dark'; tokens?: LabThemeTokenMap },
  ): { success: true; preset: LabThemeCustomPreset } | { success: false; error: string } {
    const row = labThemeCustomPresetRepository.getById(id);
    if (!row) {
      return { success: false, error: 'Custom theme not found' };
    }
    const name = input.name?.trim() ?? row.name;
    if (!name) {
      return { success: false, error: 'Name is required' };
    }
    const mode = input.mode ?? row.mode;
    let tokensJson = row.tokensJson;
    if (input.tokens) {
      for (const key of LAB_THEME_TOKEN_KEYS) {
        if (!input.tokens[key]?.trim()) {
          return { success: false, error: `Missing token: ${key}` };
        }
      }
      tokensJson = JSON.stringify(input.tokens);
    }
    const updated = labThemeCustomPresetRepository.update({
      id,
      name,
      mode,
      tokensJson,
    });
    return { success: true, preset: rowToCustomPreset(updated) };
  }

  deleteCustomPreset(id: string): { success: true } | { success: false; error: string } {
    const active = labThemeRepository.getSingleton();
    if (active && active.presetId === createCustomLabThemePresetId(id)) {
      return { success: false, error: 'Cannot delete the active platform theme' };
    }
    const deleted = labThemeCustomPresetRepository.deleteById(id);
    if (!deleted) {
      return { success: false, error: 'Custom theme not found' };
    }
    return { success: true };
  }

  assertCustomPresetExists(presetId: string): boolean {
    if (!isCustomLabThemePresetId(presetId)) {
      return false;
    }
    const uuid = customPresetUuidFromId(presetId);
    return Boolean(labThemeCustomPresetRepository.getById(uuid));
  }

  resolveThemeWithCustoms(theme: LabTheme): ReturnType<typeof resolveLabTheme> {
    return resolveLabTheme(theme, { customPresets: this.getCustomPresetLookup() });
  }
}

export const labThemeCustomPresetService = new LabThemeCustomPresetService();
