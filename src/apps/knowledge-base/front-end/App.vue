<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';
import { useCatalogHostLiveRefresh } from '@/shared/composables/catalog/useCatalogHostLiveRefresh';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { renderKbArticleMarkdown } from '@/shared/utils/kb-article-markdown';
import { CatalogIntegrationHost, CatalogReportsPanel } from '@/shared/integration';
import type { Article } from '../shared/types';
import * as api from './api';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';
const HOST_APP_ID = 'app-knowledge-base';

interface Props {
  serverUrl?: string;
  appDescription?: string;
}
const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();
const toast = useToast();

const integrationRef = ref<InstanceType<typeof CatalogIntegrationHost> | null>(null);
const base = computed(() => (props.serverUrl ?? '').replace(/\/$/, ''));

useCatalogHostLiveRefresh({
  hostAppId: HOST_APP_ID,
  serverUrl: () => base.value,
  onRefresh: () => refresh(),
});
const loading = ref(false);
const error = ref<string | null>(null);
const articles = ref<Article[]>([]);
const search = ref('');
const selectedId = ref<number | null>(null);
const reportsExpanded = ref(false);
const readerExpanded = ref(false);
const readerViewportRef = useTemplateRef<HTMLElement>('readerViewportRef');

function scrollReaderToTop(): void {
  if (readerViewportRef.value) {
    readerViewportRef.value.scrollTop = 0;
  }
}

function toggleReaderExpanded(): void {
  const next = !readerExpanded.value;
  readerExpanded.value = next;
  if (next) {
    reportsExpanded.value = false;
  }
}

function parseTagList(tags: string): string[] {
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return articles.value;
  return articles.value.filter(
    (a) =>
      a.title.toLowerCase().includes(term) ||
      a.body.toLowerCase().includes(term) ||
      a.tags.toLowerCase().includes(term),
  );
});

const selected = computed(() => articles.value.find((a) => a.id === selectedId.value) ?? null);

/**
 * Article bodies are authored markdown, so they go through the shared platform renderer.
 * Deliberately **without** `repairStreamedMarkdown` — that pass repairs streamed model output
 * and would corrupt authored prose: it splits `Note: | …` table lead-ins and collapses every
 * blank line, which would flatten paragraphs into one dense block.
 * `breaks: false` lets paragraphs reflow instead of hard-wrapping on every source newline.
 */
const selectedBodyHtml = computed(() =>
  selected.value ? renderKbArticleMarkdown(selected.value.body) : '',
);

async function refresh(): Promise<void> {
  if (!base.value) {
    error.value = 'App server is not available.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const result = await api.listArticles(base.value);
    articles.value = result.articles;
  } catch (e) {
    error.value = msg(e);
  } finally {
    loading.value = false;
  }
}

function openArticle(a: Article): void {
  selectedId.value = a.id;
  void nextTick(scrollReaderToTop);
}

function newArticle(): void {
  selectedId.value = null;
  integrationRef.value?.openPrimaryCreate();
}

function editSelected(): void {
  const a = selected.value;
  if (!a) return;
  integrationRef.value?.openPrimaryEdit(a.id);
}

function removeSelected(): void {
  const a = selected.value;
  if (!a) return;
  integrationRef.value?.openPrimaryDelete(a.id);
}

async function onIntegrationSuccess(payload: { slot: string }): Promise<void> {
  await refresh();
  if (payload.slot.includes('delete') && selectedId.value != null) {
    selectedId.value = null;
  }
  toast.add({ severity: 'success', summary: 'Article updated', life: 2500 });
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

onMounted(refresh);
</script>

<template>
  <div
    class="knowledge-base-app lab-platform-catalog-app lab-app-workspace-fill app-loaded-container text-lab-general-text w-full min-h-0 h-full flex flex-col overflow-hidden"
    :id="generateUniqueId('kb-root')"
  >
    <header class="lab-app-header shrink-0" :id="generateUniqueId('kb-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('kb-title')">Knowledge Base</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || 'Browse and search team knowledge articles.' }}
        </p>
      </div>
      <Button
        label="New article"
        icon="pi pi-plus"
        size="small"
        :pt="{ root: { attrs: { id: generateUniqueId('kb-new') } } }"
        @click="newArticle"
      />
    </header>

    <main
      class="lab-app-body kb-main-shell min-w-0 grid gap-3 kb-main-grid"
      :class="{ 'kb-main-grid--reader-expanded': readerExpanded }"
      :id="generateUniqueId('kb-main-shell')"
    >
    <section
      v-show="!readerExpanded"
      class="lab-form-section kb-reports-section shrink-0"
      :class="{ 'kb-reports-section--open': reportsExpanded }"
      :id="generateUniqueId('kb-reports')"
    >
      <div class="kb-reports-section__head">
        <div class="kb-section-head min-w-0 flex-1">
          <h4 class="lab-form-section__title" :id="generateUniqueId('kb-reports-title')">
            <span class="lab-form-section__icon" aria-hidden="true"><i class="pi pi-chart-pie" /></span>
            Reports
          </h4>
          <p class="lab-form-section__lead kb-section-head__lead">
            Chart Builder bindings for articles by category and status.
          </p>
        </div>
        <button
          type="button"
          class="kb-reports-section__toggle"
          :id="generateUniqueId('kb-reports-toggle')"
          :aria-expanded="reportsExpanded"
          :aria-label="reportsExpanded ? 'Collapse reports' : 'Expand reports'"
          @click="reportsExpanded = !reportsExpanded"
        >
          <span class="text-xs text-lab-general-text-muted">{{ reportsExpanded ? 'Hide' : 'Show' }}</span>
          <i
            class="pi text-lab-general-text-muted"
            :class="reportsExpanded ? 'pi-chevron-up' : 'pi-chevron-down'"
            aria-hidden="true"
          />
        </button>
      </div>
      <div v-show="reportsExpanded" class="kb-reports-section__charts">
        <CatalogReportsPanel :host-app-id="HOST_APP_ID" :server-url="props.serverUrl" />
      </div>
    </section>

    <section
      class="lab-form-section kb-workspace flex flex-col mb-0"
      :id="generateUniqueId('kb-main')"
    >
      <div class="kb-workspace__head kb-section-head shrink-0">
        <h4 class="lab-form-section__title" :id="generateUniqueId('kb-workspace-title')">
          <span class="lab-form-section__icon" aria-hidden="true"><i class="pi pi-th-large" /></span>
          Browse articles
        </h4>
        <p class="lab-form-section__lead kb-section-head__lead">
          Search the library, then read or edit an article in the reader pane.
        </p>
      </div>

      <div
        class="kb-workspace__panes flex flex-row items-stretch gap-3"
        :class="{ 'kb-workspace__panes--reader-expanded': readerExpanded }"
      >
        <section
          v-show="!readerExpanded"
          class="lab-form-section lab-form-section--nested kb-list-pane w-[min(100%,22rem)] shrink-0 flex h-full min-h-0 flex-col mb-0 overflow-hidden"
          :id="generateUniqueId('kb-list-pane')"
        >
          <div class="kb-list-pane__chrome shrink-0">
            <h4 class="lab-form-section__title" :id="generateUniqueId('kb-list-heading')">
              <span class="lab-form-section__icon" aria-hidden="true"><i class="pi pi-bookmark" /></span>
              Library
            </h4>
            <p class="lab-form-section__lead">Filter by title, body, or tags.</p>
            <InputText
              v-model="search"
              placeholder="Search articles…"
              class="mt-1"
              :pt="{ root: { attrs: { id: generateUniqueId('kb-search') } } }"
            />
            <p v-if="error" class="text-sm text-red-400 m-0" :id="generateUniqueId('kb-error')">{{ error }}</p>
            <p
              v-else-if="!loading && filtered.length === 0"
              class="text-sm text-lab-general-text-muted m-0"
              :id="generateUniqueId('kb-empty')"
            >
              No articles. Use “New article” to add one.
            </p>
          </div>
          <div
            class="kb-list-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
            role="region"
            aria-label="Article library"
            :id="generateUniqueId('kb-list-scroll')"
          >
            <ul class="kb-article-list flex flex-col" :id="generateUniqueId('kb-list')">
              <li
                v-for="a in filtered"
                :key="a.id"
                class="lab-form-section lab-form-section--nested kb-list-item mb-0"
                :class="{ 'kb-list-item--active': a.id === selectedId }"
                :id="generateUniqueId(`kb-list-item-${a.id}`)"
                @click="openArticle(a)"
              >
                <div class="font-medium truncate">{{ a.title }}</div>
                <div class="kb-list-item__meta text-xs truncate">
                  {{ a.category || 'Uncategorised' }} · {{ a.status }}
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section
          class="lab-form-section lab-form-section--nested kb-detail-pane flex h-full min-h-0 min-w-0 flex-1 flex-col mb-0 overflow-hidden"
          :class="{ 'kb-detail-pane--expanded': readerExpanded }"
          :id="generateUniqueId('kb-detail')"
        >
          <div class="kb-detail-pane__head flex items-start justify-between gap-2 shrink-0">
            <h4 class="lab-form-section__title m-0" :id="generateUniqueId('kb-reader-title')">
              <span class="lab-form-section__icon" aria-hidden="true"><i class="pi pi-file-edit" /></span>
              Reader
            </h4>
            <div class="flex gap-1 shrink-0">
              <Button
                :icon="readerExpanded ? 'pi pi-window-minimize' : 'pi pi-window-maximize'"
                size="small"
                severity="secondary"
                text
                :aria-label="readerExpanded ? 'Show library and reports' : 'Expand reader'"
                :disabled="!readerExpanded && !selected"
                :pt="{ root: { attrs: { id: generateUniqueId('kb-toggle-reader-expand') } } }"
                @click="toggleReaderExpanded"
              />
              <template v-if="selected">
              <Button
                icon="pi pi-pencil"
                size="small"
                severity="secondary"
                :pt="labRecordActionButtonPt(generateUniqueId, 'kb', 'edit', selected.id, selected.title)"
                @click="editSelected"
              />
              <Button
                icon="pi pi-trash"
                size="small"
                severity="danger"
                text
                :pt="labRecordActionButtonPt(generateUniqueId, 'kb', 'delete', selected.id, selected.title)"
                @click="removeSelected"
              />
              </template>
            </div>
          </div>
          <p v-if="selected" class="lab-form-section__lead shrink-0">
            {{ selected.category || 'Uncategorised' }} · {{ selected.status }}
            <template v-if="selected.author"> · {{ selected.author }}</template>
          </p>

          <div
            ref="readerViewportRef"
            class="kb-detail-pane__viewport flex flex-1 min-h-0 flex-col overflow-y-auto overflow-x-hidden"
            :id="generateUniqueId('kb-reader-viewport')"
          >
            <div
              v-if="selected"
              class="kb-detail-pane__scroll"
              :id="generateUniqueId('kb-article-scroll')"
            >
              <section
                class="lab-form-section lab-form-section--nested kb-reader-article-head mb-0"
                :id="generateUniqueId('kb-reader-article-head')"
              >
                <h2 class="kb-article-title m-0" :id="generateUniqueId('kb-detail-title')">{{ selected.title }}</h2>
                <div v-if="selected.tags" class="kb-tag-row mt-2 mb-0 flex flex-wrap gap-1.5">
                  <span
                    v-for="tag in parseTagList(selected.tags)"
                    :key="tag"
                    class="kb-tag"
                  >
                    {{ tag.startsWith('docs:') ? tag.slice(5) : tag }}
                  </span>
                </div>
              </section>
              <article
                class="kb-body lab-markdown"
                :id="generateUniqueId('kb-body')"
                v-html="selectedBodyHtml"
              />
            </div>
            <div
              v-else
              class="kb-empty-state flex flex-1 min-h-0 flex-col items-center justify-center text-center px-4"
              :id="generateUniqueId('kb-select-hint')"
            >
              <i class="pi pi-book text-3xl text-lab-general-text-muted mb-2" aria-hidden="true" />
              <p class="text-sm text-lab-general-text-muted m-0">Select an article from the list or create a new one.</p>
            </div>
          </div>
        </section>
      </div>
    </section>
    </main>

    <CatalogIntegrationHost
      ref="integrationRef"
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      @integration-success="onIntegrationSuccess"
    />

  </div>
</template>

<style scoped>
.knowledge-base-app {
  --kb-surface-floor: color-mix(in srgb, var(--lab-general-border) 14%, var(--lab-general-bg));
  --kb-surface-outer: color-mix(in srgb, var(--lab-general-bg) 86%, var(--lab-general-text));
  --kb-surface-pane: color-mix(in srgb, var(--lab-general-bg) 72%, var(--lab-general-border));
  --kb-browse-panes-height: calc(100dvh - 325px);
}

.kb-main-shell.lab-app-body {
  padding: 0.35rem 0.15rem 0.15rem;
  border-radius: 0.5rem;
  background: var(--kb-surface-floor);
}

.kb-main-grid {
  grid-template-rows: auto auto;
}

.kb-main-grid--reader-expanded {
  grid-template-rows: auto;
}

.kb-workspace {
  background: var(--kb-surface-outer) !important;
  border-color: color-mix(in srgb, var(--lab-general-border) 90%, transparent);
}

.kb-reports-section.lab-form-section {
  background: var(--kb-surface-outer) !important;
  border-color: color-mix(in srgb, var(--lab-general-border) 90%, transparent);
}

.kb-section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 0.5rem;
  row-gap: 0.15rem;
}

.kb-section-head .lab-form-section__title {
  margin: 0;
  flex: 0 0 auto;
}

.kb-section-head .lab-form-section__lead {
  margin: 0;
  flex: 1 1 14rem;
  min-width: 0;
}

.kb-workspace__panes {
  height: var(--kb-browse-panes-height);
  min-height: 0;
  margin-top: 0.4rem;
  padding-top: 0.45rem;
  border-top: 1px solid color-mix(in srgb, var(--lab-general-border) 55%, transparent);
}

.knowledge-base-app:has(.kb-reports-section--open) {
  --kb-browse-panes-height: calc(100dvh - 22.5rem - 30px);
}

.knowledge-base-app:has(.kb-main-grid--reader-expanded) {
  --kb-browse-panes-height: calc(100dvh - 12.5rem - 30px);
}

.kb-workspace__panes--reader-expanded {
  gap: 0;
}

.kb-detail-pane--expanded .kb-body {
  max-width: none;
}

.kb-detail-pane--expanded .kb-body :deep(.kb-article-layout) {
  max-width: 56rem;
}

.kb-list-pane .lab-form-section__lead,
.kb-detail-pane .lab-form-section__lead {
  margin-bottom: 0;
}

.kb-list-pane,
.kb-detail-pane {
  background: var(--kb-surface-pane) !important;
  border-color: color-mix(in srgb, var(--lab-general-border) 75%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--lab-general-text) 4%, transparent);
}

.kb-list-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.kb-detail-pane {
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
  min-width: 0;
  min-height: 0;
}

.kb-detail-pane__viewport {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.kb-detail-pane__scroll {
  padding-top: 0.5rem;
  border-top: 1px solid color-mix(in srgb, var(--lab-general-border) 45%, transparent);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.kb-empty-state {
  padding-block: 2rem;
}

.kb-list-pane__chrome {
  flex-shrink: 0;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid color-mix(in srgb, var(--lab-general-border) 48%, transparent);
}

.kb-list-scroll {
  flex: 1 1 auto;
  min-height: 0;
  margin-top: 0;
  padding-top: 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

/* Override global `ul { padding-left: 20px !important }` in tailwind.css */
.kb-article-list {
  list-style: none !important;
  margin: 0 !important;
  padding: 0 !important;
  padding-left: 0 !important;
  padding-inline-start: 0 !important;
  gap: 0.35rem;
}

.kb-article-list > li {
  list-style: none !important;
  margin: 0;
  padding-inline-start: 0;
}

.kb-article-list > li::marker {
  content: none;
}

.kb-reports-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.kb-reports-section__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.45rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 55%, transparent);
  border-radius: 0.375rem;
  background: color-mix(in srgb, var(--lab-general-bg) 88%, var(--lab-general-border));
  cursor: pointer;
  color: inherit;
  flex-shrink: 0;
}

.kb-reports-section--open {
  margin-bottom: 0.75rem;
}

.kb-reports-section__charts {
  margin-top: 0.65rem;
}

.kb-reports-section__charts :deep([data-lab-integration-region='reports.grid']) {
  display: grid !important;
  grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
  gap: 0.75rem;
  margin-bottom: 0;
  align-items: stretch;
}

.kb-reports-section__charts :deep([data-lab-integration-region='reports.grid'] > *) {
  min-width: 0;
}

.kb-reports-section__charts :deep(.chart-context-report-widget) {
  height: auto;
  min-height: 0;
}

.kb-reports-section__charts :deep(.chart-runtime) {
  margin-left: 0;
  margin-right: 0;
  width: 100% !important;
  max-width: 100%;
}

.kb-reports-section__charts :deep(.chart-context-report-widget h3) {
  font-size: 0.75rem;
  margin-bottom: 0.35rem;
}

.kb-list-scroll .kb-article-list > .kb-list-item.lab-form-section {
  margin-bottom: 0;
  padding: 0.45rem 0.55rem;
}

.kb-list-scroll .kb-article-list > .kb-list-item {
  cursor: pointer;
  background: color-mix(in srgb, var(--lab-general-bg) 90%, var(--lab-general-text)) !important;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.kb-list-scroll .kb-list-item:hover:not(.kb-list-item--active) {
  background: color-mix(in srgb, var(--lab-general-bg) 94%, var(--lab-general-text)) !important;
}

.kb-list-scroll .kb-list-item--active {
  border-color: color-mix(in srgb, var(--lab-accent-primary, #6366f1) 55%, var(--lab-general-border));
  border-left-color: color-mix(in srgb, var(--lab-accent-primary, #6366f1) 85%, transparent);
  background: color-mix(in srgb, var(--lab-accent-primary, #6366f1) 8%, var(--lab-general-bg)) !important;
}
.kb-list-item--active .font-medium {
  color: var(--lab-general-text);
}
.kb-list-item:not(.kb-list-item--active) .font-medium {
  color: color-mix(in srgb, var(--lab-general-text) 94%, var(--lab-general-text-muted));
}

.kb-list-item__meta {
  margin-top: 0.15rem;
  color: color-mix(in srgb, var(--lab-general-text-muted) 72%, var(--lab-general-bg));
}

.kb-list-item--active .kb-list-item__meta {
  color: color-mix(in srgb, var(--lab-general-text-muted) 82%, var(--lab-general-bg));
}

.kb-reader-article-head {
  background: color-mix(in srgb, var(--lab-general-bg) 80%, var(--lab-general-border)) !important;
  flex-shrink: 0;
}

.kb-detail-pane__scroll .kb-body {
  flex: 0 0 auto;
  min-height: min-content;
  padding-bottom: 0.75rem;
}

.kb-article-title {
  font-size: 1.35rem;
  font-weight: 650;
  line-height: 1.25;
  color: var(--lab-general-text);
}
.kb-tag {
  font-size: 0.65rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  padding: 0.12rem 0.4rem;
  border-radius: 0.25rem;
  color: color-mix(in srgb, var(--lab-general-text-muted) 92%, transparent);
  background: color-mix(in srgb, var(--lab-general-border) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 26%, transparent);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kb-body {
  font-family: inherit;
  line-height: 1.55;
  font-size: 0.8125rem;
  max-width: 52rem;
  color: color-mix(in srgb, var(--lab-general-text) 94%, var(--lab-general-text-muted));
}

/*
 * Markdown → section cards (`renderKbArticleMarkdown`). Scoped `:deep()` for `v-html`.
 */
.kb-body :deep(.kb-article-layout) {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.kb-body :deep(.kb-article-lead) {
  margin-bottom: 0.15rem;
}

.kb-body :deep(.kb-article-section.lab-form-section) {
  margin-bottom: 0;
  background: color-mix(in srgb, var(--lab-general-bg) 80%, var(--lab-general-border)) !important;
}

.kb-body :deep(.kb-article-section__body) {
  margin-top: 0.3rem;
}

.kb-body :deep(h1),
.kb-body :deep(h2),
.kb-body :deep(h3) {
  font-weight: 600;
  line-height: 1.3;
  margin: 1rem 0 0.45rem;
  color: var(--lab-general-text);
}
.kb-body :deep(h1) {
  font-size: 1.15rem;
}
.kb-body :deep(h2) {
  font-size: 1rem;
}
.kb-body :deep(h3) {
  font-size: 0.9rem;
  color: color-mix(in srgb, var(--lab-general-text) 88%, var(--lab-accent-primary, #6366f1));
}
.kb-body :deep(.kb-article-section__body > :first-child) {
  margin-top: 0;
}
.kb-body :deep(strong) {
  color: var(--lab-general-text);
  font-weight: 600;
}
.kb-body :deep(p),
.kb-body :deep(ul),
.kb-body :deep(ol),
.kb-body :deep(blockquote) {
  margin: 0 0 0.65rem;
}
.kb-body :deep(ul),
.kb-body :deep(ol) {
  padding-left: 1.25rem;
}
.kb-body :deep(li) {
  margin-bottom: 0.25rem;
}
.kb-body :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85em;
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
  background: var(--lab-general-bg-subtle, rgb(0 0 0 / 0.05));
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 40%, transparent);
}
.kb-body :deep(pre) {
  padding: 0.75rem;
  overflow-x: auto;
  border-radius: 0.375rem;
  background: var(--lab-general-bg-subtle, rgb(0 0 0 / 0.05));
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 40%, transparent);
}
.kb-body :deep(pre code) {
  padding: 0;
  border: 0;
  background: transparent;
}
.kb-body :deep(table) {
  border-collapse: collapse;
  margin: 0.5rem 0 0.9rem;
}
.kb-body :deep(th),
.kb-body :deep(td) {
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 55%, transparent);
  padding: 0.3rem 0.55rem;
  text-align: left;
  vertical-align: top;
}
.kb-body :deep(th) {
  font-weight: 600;
  background: var(--lab-general-bg-subtle, rgb(0 0 0 / 0.04));
}
.kb-body :deep(a) {
  color: var(--lab-accent-primary, #6366f1);
  text-decoration: underline;
}
.kb-body :deep(hr) {
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--lab-general-border) 55%, transparent);
  margin: 1rem 0;
}
</style>
