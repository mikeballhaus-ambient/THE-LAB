<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import ToggleSwitch from 'primevue/toggleswitch';
import Message from 'primevue/message';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import type { LabOidcProviderSettingsPublic } from '@/shared/types/oidc-provider-settings';
import type { User } from '@/shared/types';

const { generateUniqueId } = useUniqueElementId();

const props = defineProps<{
  user: User | null;
}>();

const loading = ref(false);
const savingId = ref<string | null>(null);
const errorMessage = ref('');
const successMessage = ref('');
const providers = ref<LabOidcProviderSettingsPublic[]>([]);
const clientSecrets = ref<Record<string, string>>({});
const storedSecrets = ref<Record<string, string>>({});
const secretVisible = ref<Record<string, boolean>>({});
const secretRevealLoading = ref<Record<string, boolean>>({});
/** User chose to replace a stored secret (fixes readonly trap on empty draft). */
const secretReplaceMode = ref<Record<string, boolean>>({});

const reloadBtnId = generateUniqueId('oidc-reload-all');
const oidcAccordionRootId = generateUniqueId('oidc-providers-accordion');

/** Empty = all provider panels collapsed by default. */
const openProviderPanels = ref<string[]>([]);
/** Setup instruction sub-panels — empty = all collapsed by default. */
const openSetupGuides = ref<string[]>([]);

const providerFieldIds = new Map<
  string,
  ReturnType<typeof buildFieldIdsForProvider>
>();

function buildFieldIdsForProvider(providerId: string) {
  return {
    enabled: generateUniqueId(`oidc-${providerId}-enabled`),
    clientId: generateUniqueId(`oidc-${providerId}-client-id`),
    clientSecret: generateUniqueId(`oidc-${providerId}-client-secret`),
    redirect: generateUniqueId(`oidc-${providerId}-redirect`),
    useSuggested: generateUniqueId(`oidc-${providerId}-use-suggested`),
    tenant: generateUniqueId(`oidc-${providerId}-tenant`),
    panelHeader: generateUniqueId(`oidc-${providerId}-panel-header`),
    secretPreview: generateUniqueId(`oidc-${providerId}-secret-preview`),
    save: generateUniqueId(`oidc-${providerId}-save`),
    setupGuidePanel: generateUniqueId(`oidc-${providerId}-setup-guide-panel`),
    setupGuideHeader: generateUniqueId(`oidc-${providerId}-setup-guide-header`),
  };
}

function fieldIds(providerId: string) {
  let ids = providerFieldIds.get(providerId);
  if (!ids) {
    ids = buildFieldIdsForProvider(providerId);
    providerFieldIds.set(providerId, ids);
  }
  return ids;
}

const isAdmin = computed(
  () => props.user?.role === 'owner' || props.user?.role === 'admin',
);

/** GitHub OAuth App "Homepage URL" — lab UI origin (not the OAuth callback on port 3000). */
const suggestedGithubHomepageUrl = computed((): string => {
  const explicit = (import.meta.env.VITE_LAB_FRONTEND_URL as string | undefined)?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  const host = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost').replace(/\/$/, '');
  return `${host}:5173`;
});

async function loadSettings(): Promise<void> {
  if (!isAdmin.value) {
    return;
  }
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await fetch(
      `${resolvePlatformBackendUrlForClient()}/api/platform/oidc-providers`,
      labPlatformFetchInit(),
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `Failed to load (${res.status})`);
    }
    const json = (await res.json()) as {
      success: boolean;
      data?: LabOidcProviderSettingsPublic[];
    };
    providers.value = (json.data ?? []).map((p) => ({
      ...p,
      tenantId:
        p.providerId === 'microsoft-entra'
          ? p.tenantId?.trim() || 'common'
          : p.tenantId,
    }));
    storedSecrets.value = {};
    secretVisible.value = {};
    secretReplaceMode.value = {};
    for (const p of providers.value) {
      clientSecrets.value[p.providerId] = '';
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to load OIDC settings';
  } finally {
    loading.value = false;
  }
}

async function saveProvider(provider: LabOidcProviderSettingsPublic): Promise<void> {
  if (!isAdmin.value) {
    return;
  }
  savingId.value = provider.providerId;
  errorMessage.value = '';
  successMessage.value = '';
  try {
    const body: Record<string, unknown> = {
      enabled: provider.enabled,
      clientId: provider.clientId.trim(),
      redirectUri: provider.redirectUri.trim() || provider.suggestedRedirectUri,
    };
    if (provider.providerId === 'microsoft-entra') {
      body.tenantId = (provider.tenantId ?? 'common').trim() || 'common';
    }
    const secret = clientSecrets.value[provider.providerId]?.trim();
    if (secret) {
      body.clientSecret = secret;
    }
    const res = await fetch(
      `${resolvePlatformBackendUrlForClient()}/api/platform/oidc-providers/${encodeURIComponent(provider.providerId)}`,
      labPlatformFetchInit({
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    );
    const json = (await res.json()) as {
      success: boolean;
      error?: string;
      data?: LabOidcProviderSettingsPublic;
    };
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? `Save failed (${res.status})`);
    }
    if (json.data) {
      const idx = providers.value.findIndex((p) => p.providerId === provider.providerId);
      if (idx >= 0) {
        providers.value[idx] = json.data;
        if (json.data.providerId === 'microsoft-entra' && !json.data.tenantId) {
          providers.value[idx].tenantId = 'common';
        }
      }
    }
    clientSecrets.value[provider.providerId] = '';
    storedSecrets.value[provider.providerId] = '';
    secretVisible.value[provider.providerId] = false;
    secretReplaceMode.value[provider.providerId] = false;
    if (!openProviderPanels.value.includes(provider.providerId)) {
      openProviderPanels.value = [...openProviderPanels.value, provider.providerId];
    }
    successMessage.value = `${provider.label} settings saved.`;
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to save settings';
  } finally {
    savingId.value = null;
  }
}

function useSuggestedRedirect(provider: LabOidcProviderSettingsPublic): void {
  provider.redirectUri = provider.suggestedRedirectUri;
}

function maskedSecretPlaceholder(provider: LabOidcProviderSettingsPublic): string {
  const len = provider.clientSecretLength ?? 16;
  const count = Math.min(Math.max(len, 8), 32);
  return '•'.repeat(count);
}

function isEditingSecret(providerId: string): boolean {
  return (
    Boolean(secretReplaceMode.value[providerId]) ||
    Boolean(clientSecrets.value[providerId]?.trim())
  );
}

function secretFieldReadonly(provider: LabOidcProviderSettingsPublic): boolean {
  if (isEditingSecret(provider.providerId)) {
    return false;
  }
  return provider.hasClientSecret;
}

function secretInputType(providerId: string): 'text' | 'password' {
  if (isEditingSecret(providerId)) {
    return secretVisible.value[providerId] ? 'text' : 'password';
  }
  return secretVisible.value[providerId] ? 'text' : 'password';
}

function secretDisplayValue(provider: LabOidcProviderSettingsPublic): string {
  const id = provider.providerId;
  if (isEditingSecret(id)) {
    return clientSecrets.value[id] ?? '';
  }
  if (secretVisible.value[id] && storedSecrets.value[id]) {
    return storedSecrets.value[id];
  }
  if (provider.hasClientSecret) {
    return maskedSecretPlaceholder(provider);
  }
  return '';
}

function onSecretInput(provider: LabOidcProviderSettingsPublic, value: string | undefined): void {
  if (secretFieldReadonly(provider)) {
    return;
  }
  const next = value ?? '';
  if (!isEditingSecret(provider.providerId) && provider.hasClientSecret && next === maskedSecretPlaceholder(provider)) {
    return;
  }
  clientSecrets.value[provider.providerId] = next;
}

function beginSecretReplace(provider: LabOidcProviderSettingsPublic): void {
  secretReplaceMode.value[provider.providerId] = true;
  clientSecrets.value[provider.providerId] = '';
  secretVisible.value[provider.providerId] = true;
  storedSecrets.value[provider.providerId] = '';
}

function secretPreviewIcon(providerId: string): string {
  return secretVisible.value[providerId] ? 'pi pi-eye-slash' : 'pi pi-eye';
}

function secretPreviewLabel(providerId: string): string {
  return secretVisible.value[providerId] ? 'Hide client secret' : 'Show client secret';
}

async function toggleSecretPreview(provider: LabOidcProviderSettingsPublic): Promise<void> {
  if (!isAdmin.value || isEditingSecret(provider.providerId)) {
    secretVisible.value[provider.providerId] = !secretVisible.value[provider.providerId];
    return;
  }
  const id = provider.providerId;
  if (secretVisible.value[id]) {
    secretVisible.value[id] = false;
    return;
  }
  if (storedSecrets.value[id]) {
    secretVisible.value[id] = true;
    return;
  }
  if (!provider.hasClientSecret) {
    return;
  }
  secretRevealLoading.value[id] = true;
  errorMessage.value = '';
  try {
    const res = await fetch(
      `${resolvePlatformBackendUrlForClient()}/api/platform/oidc-providers/${encodeURIComponent(id)}/client-secret`,
      labPlatformFetchInit(),
    );
    const json = (await res.json()) as {
      success: boolean;
      error?: string;
      data?: { clientSecret?: string };
    };
    if (!res.ok || !json.success || !json.data?.clientSecret) {
      throw new Error(json.error ?? `Could not load secret (${res.status})`);
    }
    storedSecrets.value[id] = json.data.clientSecret;
    secretVisible.value[id] = true;
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to reveal client secret';
  } finally {
    secretRevealLoading.value[id] = false;
  }
}

onMounted(() => {
  void loadSettings();
});

watch(
  () => props.user?.userId,
  () => {
    if (isAdmin.value) {
      void loadSettings();
    }
  },
);
</script>

<template>
  <div class="auth-providers-management lab-form-runtime flex flex-col gap-4 text-lab-general-text">
    <div class="flex justify-end">
      <Button
        type="button"
        label="Reload"
        severity="secondary"
        :loading="loading"
        :pt="{ root: { attrs: { id: reloadBtnId } } }"
        @click="loadSettings"
      />
    </div>

    <Message v-if="!isAdmin" severity="warn" :closable="false">
      Only platform owners and admins can manage auth providers.
    </Message>

    <Message v-if="errorMessage" severity="error" :closable="true" @close="errorMessage = ''">
      {{ errorMessage }}
    </Message>
    <Message v-if="successMessage" severity="success" :closable="true" @close="successMessage = ''">
      {{ successMessage }}
    </Message>

    <Accordion
      v-if="providers.length"
      v-model:value="openProviderPanels"
      multiple
      class="auth-providers-accordion w-full flex flex-col gap-2"
      :pt="{ root: { attrs: { id: oidcAccordionRootId } } }"
    >
      <AccordionPanel
        v-for="provider in providers"
        :key="provider.providerId"
        :value="provider.providerId"
        class="auth-providers-panel overflow-hidden"
        :pt="{ root: { attrs: { id: generateUniqueId(`oidc-panel-${provider.providerId}`) } } }"
      >
        <AccordionHeader
          :pt="{ root: { attrs: { id: fieldIds(provider.providerId).panelHeader } } }"
        >
          <div class="flex items-center justify-between gap-4 flex-wrap w-full pr-2">
            <div class="flex items-center gap-2 min-w-0">
              <i :class="provider.icon" class="text-xl shrink-0"></i>
              <span class="font-semibold truncate text-lab-general-text">{{ provider.label }}</span>
            </div>
            <div
              class="flex items-center gap-2 shrink-0"
              @click.stop
            >
              <label
                class="text-sm text-lab-general-text-muted"
                :for="fieldIds(provider.providerId).enabled"
              >Enabled</label>
              <ToggleSwitch
                v-model="provider.enabled"
                :input-id="fieldIds(provider.providerId).enabled"
                :disabled="loading || savingId === provider.providerId || !isAdmin"
                :pt="{
                  root: { attrs: { id: generateUniqueId(`oidc-${provider.providerId}-enabled-switch`) } },
                }"
              />
            </div>
          </div>
        </AccordionHeader>
        <AccordionContent
          :pt="{
            root: { attrs: { id: generateUniqueId(`oidc-content-${provider.providerId}`) } },
          }"
        >
          <div class="auth-providers-panel-body flex flex-col gap-4">
            <Accordion
              v-model:value="openSetupGuides"
              class="auth-providers-setup-guide w-full overflow-hidden"
            >
              <AccordionPanel
                :value="`${provider.providerId}-setup`"
                :pt="{ root: { attrs: { id: fieldIds(provider.providerId).setupGuidePanel } } }"
              >
                <AccordionHeader
                  :pt="{ root: { attrs: { id: fieldIds(provider.providerId).setupGuideHeader } } }"
                >
                  <span class="text-sm font-medium text-lab-general-text">Setup instructions</span>
                </AccordionHeader>
                <AccordionContent>
                  <div
                    v-if="provider.providerId === 'google'"
                    class="auth-providers-setup-copy px-3 pb-3 pt-1 text-xs leading-relaxed flex flex-col gap-2"
                  >
                    <p class="font-medium text-lab-general-text">Google Cloud OAuth client</p>
                    <p>
                      In
                      <span class="text-lab-general-text">Google Cloud Console → APIs &amp; Services → Credentials</span>,
                      create an <strong>OAuth client ID</strong> (application type
                      <strong>Web application</strong>).
                    </p>
                    <p>
                      Under <strong>Authorized redirect URIs</strong>, add the redirect URI
                      below (must match exactly). Copy the client ID and client secret into this form.
                    </p>
                    <p>
                      Sign-in uses OpenID Connect; users with a verified Google email receive
                      <strong>member</strong> access in THE-LAB.
                    </p>
                  </div>
                  <div
                    v-else-if="provider.providerId === 'github'"
                    class="auth-providers-setup-copy px-3 pb-3 pt-1 text-xs leading-relaxed flex flex-col gap-2"
                  >
                    <p class="font-medium text-lab-general-text">GitHub OAuth App (not a GitHub App)</p>
                    <p>
                      In GitHub →
                      <span class="text-lab-general-text">Settings → Developer settings → OAuth Apps</span>,
                      create a <strong>New OAuth App</strong>.
                    </p>
                    <p>
                      <strong>Homepage URL:</strong> your lab dashboard (where you open THE-LAB in the browser), e.g.
                      <code class="break-all">{{ suggestedGithubHomepageUrl }}</code>.
                      This is <em>not</em> the OAuth callback — GitHub only uses it as the app’s public link.
                    </p>
                    <p>
                      <strong>Authorization callback URL:</strong> the redirect URI below (backend, usually port
                      <code>3000</code>) — must match exactly, including
                      <code>http</code> vs <code>https</code>.
                    </p>
                    <p>
                      Paste the OAuth App <strong>Client ID</strong> here and generate a
                      <strong>Client secret</strong>. THE-LAB requests
                      <code>read:user</code> and <code>user:email</code>
                      to read a verified primary email for your lab account.
                    </p>
                  </div>
                  <div
                    v-else-if="provider.providerId === 'microsoft-entra'"
                    class="auth-providers-setup-copy px-3 pb-3 pt-1 text-xs leading-relaxed flex flex-col gap-2"
                  >
                    <p class="font-medium text-lab-general-text">Microsoft Entra app registration</p>
                    <p>
                      In <span class="text-lab-general-text">Azure Portal → Microsoft Entra ID → App registrations</span>,
                      register an app (single tenant or multitenant per your policy).
                    </p>
                    <p>
                      Add a <strong>Web</strong> redirect URI matching the value below. Create a
                      client secret under <strong>Certificates &amp; secrets</strong>.
                    </p>
                    <p>
                      Use the application (client) ID as <strong>Client ID</strong>. Set
                      <strong>Directory tenant ID</strong> to your tenant GUID, or
                      <code>common</code>,
                      <code>organizations</code>, or
                      <code>consumers</code>.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionPanel>
            </Accordion>

            <div
              v-if="provider.providerId === 'microsoft-entra'"
              class="auth-providers-field flex flex-col gap-1"
            >
              <label
                class="lab-rules-field-label min-w-0 w-full"
                :for="fieldIds(provider.providerId).tenant"
              >Directory tenant ID</label>
              <InputText
                :id="fieldIds(provider.providerId).tenant"
                v-model="provider.tenantId"
                class="w-full auth-providers-input"
                placeholder="common"
                :disabled="loading || savingId === provider.providerId || !isAdmin"
                autocomplete="off"
              />
              <p class="text-xs text-lab-general-text-muted m-0">
                Use your Azure tenant GUID, or <code>common</code>,
                <code>organizations</code>, or
                <code>consumers</code>.
              </p>
            </div>

            <div class="auth-providers-field flex flex-col gap-1">
              <label
                class="lab-rules-field-label min-w-0 w-full"
                :for="fieldIds(provider.providerId).clientId"
              >
                {{
                  provider.providerId === 'github'
                    ? 'Client ID (OAuth App)'
                    : 'Client ID'
                }}
              </label>
              <InputText
                :id="fieldIds(provider.providerId).clientId"
                v-model="provider.clientId"
                class="w-full auth-providers-input"
                :disabled="loading || savingId === provider.providerId || !isAdmin"
                autocomplete="off"
              />
            </div>

            <div class="auth-providers-field flex flex-col gap-1">
              <label
                class="lab-rules-field-label min-w-0 w-full"
                :for="fieldIds(provider.providerId).clientSecret"
              >Client secret</label>
              <div class="flex gap-2 items-center w-full">
                <InputText
                  :id="fieldIds(provider.providerId).clientSecret"
                  :model-value="secretDisplayValue(provider)"
                  :type="secretInputType(provider.providerId)"
                  class="flex-1 min-w-0 auth-providers-input"
                  :readonly="secretFieldReadonly(provider)"
                  :disabled="loading || savingId === provider.providerId || !isAdmin"
                  autocomplete="new-password"
                  :placeholder="provider.hasClientSecret ? '' : 'Enter to set or replace'"
                  @update:model-value="(v) => onSecretInput(provider, v)"
                />
                <Button
                  v-if="provider.hasClientSecret || isEditingSecret(provider.providerId)"
                  type="button"
                  :icon="secretPreviewIcon(provider.providerId)"
                  severity="secondary"
                  :aria-label="secretPreviewLabel(provider.providerId)"
                  :loading="Boolean(secretRevealLoading[provider.providerId])"
                  :disabled="
                    loading
                    || savingId === provider.providerId
                    || !isAdmin
                    || (!provider.hasClientSecret && !isEditingSecret(provider.providerId))
                  "
                  :pt="{ root: { attrs: { id: fieldIds(provider.providerId).secretPreview } } }"
                  @click="() => toggleSecretPreview(provider)"
                />
              </div>
              <p
                v-if="provider.hasClientSecret && !isEditingSecret(provider.providerId)"
                class="text-xs text-lab-general-text-muted m-0"
              >
                Stored credential masked. Use
                <button
                  type="button"
                  class="auth-providers-inline-link"
                  :disabled="loading || savingId === provider.providerId || !isAdmin"
                  @click="beginSecretReplace(provider)"
                >
                  Replace secret
                </button>
                to enter a new value.
              </p>
            </div>

            <div class="auth-providers-field flex flex-col gap-1">
              <label
                class="lab-rules-field-label min-w-0 w-full"
                :for="fieldIds(provider.providerId).redirect"
              >Redirect URI</label>
              <div class="flex gap-2 flex-wrap">
                <InputText
                  :id="fieldIds(provider.providerId).redirect"
                  v-model="provider.redirectUri"
                  class="flex-1 min-w-[280px] auth-providers-input"
                  :disabled="loading || savingId === provider.providerId || !isAdmin"
                />
                <Button
                  type="button"
                  label="Use suggested"
                  severity="secondary"
                  :disabled="loading || savingId === provider.providerId || !isAdmin"
                  :pt="{ root: { attrs: { id: fieldIds(provider.providerId).useSuggested } } }"
                  @click="useSuggestedRedirect(provider)"
                />
              </div>
              <p class="text-xs text-lab-general-text-muted m-0">
                Suggested: {{ provider.suggestedRedirectUri }}
              </p>
            </div>

            <div class="auth-providers-panel-footer flex justify-end">
              <Button
                type="button"
                label="Save"
                :loading="savingId === provider.providerId"
                :disabled="loading || !isAdmin"
                :pt="{ root: { attrs: { id: fieldIds(provider.providerId).save } } }"
                @click="saveProvider(provider)"
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionPanel>
    </Accordion>
  </div>
</template>

<style scoped>
/* Integration-form tokens (lab-form-runtime.css `.lab-integration-dialog` palette) for inline settings. */
.auth-providers-management.lab-form-runtime {
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

.auth-providers-panel {
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 75%, transparent);
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--lab-integration-chrome-bg) 35%, var(--lab-general-bg));
}

.auth-providers-panel-body {
  padding: 1rem 1.25rem;
  border-top: 1px solid color-mix(in srgb, var(--lab-general-border) 65%, transparent);
  background: var(--lab-integration-body-bg);
}

.auth-providers-setup-guide {
  border: 1px solid var(--lab-integration-field-border);
  border-radius: 0.375rem;
  background: color-mix(in srgb, var(--lab-integration-chrome-bg) 55%, transparent);
}

.auth-providers-setup-copy {
  color: var(--lab-general-text-muted);
}

.auth-providers-setup-copy code {
  color: var(--lab-general-text);
  font-size: 0.6875rem;
}

.auth-providers-panel-footer {
  margin-top: 0.25rem;
  padding-top: 0.85rem;
  border-top: 1px solid color-mix(in srgb, var(--lab-general-border) 75%, transparent);
}

.auth-providers-inline-link {
  color: var(--lab-button-border-hover);
  text-decoration: underline;
  font: inherit;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
}

.auth-providers-inline-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-providers-management :deep(.auth-providers-input.p-inputtext) {
  background: var(--lab-form-control-bg);
  border: 1px solid var(--lab-form-control-border);
  color: var(--lab-general-text);
  font-size: 0.8125rem;
  min-height: 2.25rem;
  border-radius: 0.375rem;
  box-shadow: none;
}

.auth-providers-management :deep(.auth-providers-input.p-inputtext:enabled:focus) {
  border-color: var(--lab-button-border-hover);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--lab-button-border-hover) 45%, transparent);
}
</style>
