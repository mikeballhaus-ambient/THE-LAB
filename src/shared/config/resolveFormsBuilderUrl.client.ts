import {
  DEFAULT_FORMS_BUILDER_PORT,
  buildFormsBuilderUrl,
  resolveFormsBuilderUrlFromApps,
  type FormsBuilderAppLike,
} from './forms-builder-url';
/** Resolve Forms Builder URL in dashboard / app front-ends (Vite). Prefer `usePeerAppServerUrl` / platform API in apps. */
export function resolveFormsBuilderUrl(explicit?: string): string {
  if (explicit?.trim()) {
    return buildFormsBuilderUrl('', DEFAULT_FORMS_BUILDER_PORT, explicit);
  }
  const host = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost').replace(/\/$/, '');
  return resolveFormsBuilderUrlFromApps([] as FormsBuilderAppLike[], host);
}
