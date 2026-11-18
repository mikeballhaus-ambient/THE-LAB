import {
  DEFAULT_FORMS_BUILDER_PORT,
  buildFormsBuilderUrl,
  resolveFormsBuilderUrlFromApps,
  type FormsBuilderAppLike,
} from './forms-builder-url';

/** Resolve Forms Builder URL in app back-end processes (Node). */
export function resolveFormsBuilderUrl(explicit?: string): string {
  const fromEnv = process.env.FORMS_BUILDER_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  if (explicit?.trim()) {
    return buildFormsBuilderUrl('', DEFAULT_FORMS_BUILDER_PORT, explicit);
  }
  const host = (process.env.VITE_API_BASE_URL ?? process.env.BASEURL ?? 'http://localhost').replace(
    /\/$/,
    '',
  );
  return resolveFormsBuilderUrlFromApps([] as FormsBuilderAppLike[], host);
}
