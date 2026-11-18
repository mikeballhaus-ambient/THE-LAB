// Vite-only: must stay a top-level `import.meta.glob` so app SFCs enter the dev graph.
import type { Component } from 'vue';

export type AppVueLoader = () => Promise<{ default: Component }>;
export type AppVueLoaderMap = Record<string, AppVueLoader>;

/**
 * Lazy import map for all app Vue SFCs (modules load on first `loader()` call).
 *
 * NOTE: the pattern is RELATIVE (from this file at `src/shared/services/`).
 * A root-absolute pattern (`/src/apps/**`) made Vite emit drive-letter keys
 * (`c:/Users/...`) which Rollup then treated as relative → `Could not resolve
 * "../../…/c:/Users/…/src/apps/x/front-end/App.vue"` at `vite build` on Windows.
 * Relative keys (`../../apps/...`) are posix-safe; `ComponentLoader` normalizes
 * them back to `/src/apps/...`.
 */
export const appComponentGlob: AppVueLoaderMap = import.meta.glob<{ default: Component }>(
  '../../apps/**/*.vue',
);
