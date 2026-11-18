<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import {
  getLabShellSidecarBridge,
  LAB_APP_BUILDER_CONSULTATION_PERSONA,
} from '@/shared/composables/lab-shell-sidecar-bridge';
import {
  isLabAppFaIconId,
  searchLabAppIcons,
} from '@/apps/lab-app-builder/shared/lab-app-icon-catalog';
import {
  APP_BUILDER_CATALOG_TAG_ASSISTANT,
  formatAppBuilderConsultationMessage,
  type AppBuilderCatalogTagChoice,
} from '@/apps/lab-app-builder/shared/format-app-builder-consultation-message';
import { fetchPlatformAppTags } from '@/shared/services/platform-app-tags.client';
import type { PlatformAppTag } from '@/shared/types/platform-app-tags';
import {
  formInputTextPt,
  formTextareaPt,
  withFormControlRootId,
} from '@/shared/forms/form-control-pt';
import '@/assets/styles/platform-catalog-app.css';

const props = defineProps<{
  onCloseSettings?: () => void;
  onFocusAppsWorkspace?: () => void;
}>();

const toast = useToast();
const { generateUniqueId } = useUniqueElementId();

const nameInputId = generateUniqueId('app-builder-name');
const descInputId = generateUniqueId('app-builder-desc');
const iconClassInputId = generateUniqueId('app-builder-icon-class');
const iconSearchId = generateUniqueId('app-builder-icon-search');
const backBtnId = generateUniqueId('app-builder-back');
const continueBtnId = generateUniqueId('app-builder-continue');
const informBtnId = generateUniqueId('app-builder-inform');
const step = ref(0);
const displayName = ref('');
const description = ref('');
const selectedIcon = ref('fa-cube');
const iconQuery = ref('');
const starting = ref(false);
const catalogTags = ref<PlatformAppTag[]>([]);
const tagsLoading = ref(false);
const tagsError = ref('');
/** `assistant_recommend` or a platform tag id */
const selectedCatalogTagKey = ref<string>(APP_BUILDER_CATALOG_TAG_ASSISTANT);

const steps = [
  { key: 'name', label: 'Name', subtitle: 'How the app appears on the catalog card' },
  { key: 'describe', label: 'Describe', subtitle: 'What problem it solves for your team' },
  { key: 'category', label: 'Catalog section', subtitle: 'Where the app is grouped in the apps home' },
  { key: 'icon', label: 'Icon', subtitle: 'Pick a visual for the catalog' },
  { key: 'review', label: 'Review', subtitle: 'Send your draft to the Lab Assistant' },
] as const;

const filteredIcons = computed(() => searchLabAppIcons(iconQuery.value, 60));

const selectedIconTrimmed = computed(() => selectedIcon.value.trim());

const selectedIconIsValid = computed(() => isLabAppFaIconId(selectedIconTrimmed.value));

const activeStepMeta = computed(() => steps[step.value] ?? steps[0]);

const sortedCatalogTags = computed(() =>
  [...catalogTags.value].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
);

const catalogTagChoice = computed((): AppBuilderCatalogTagChoice => {
  if (selectedCatalogTagKey.value === APP_BUILDER_CATALOG_TAG_ASSISTANT) {
    return { mode: 'assistant_recommend' };
  }
  const tag = catalogTags.value.find((t) => t.id === selectedCatalogTagKey.value);
  return {
    mode: 'user_selected',
    tagId: selectedCatalogTagKey.value,
    tagLabel: tag?.label ?? selectedCatalogTagKey.value,
  };
});

const catalogTagOptions = computed(() => [
  {
    id: APP_BUILDER_CATALOG_TAG_ASSISTANT,
    label: 'Recommend for me',
    description: 'Lab Assistant suggests catalog section(s) after we discuss scope',
  },
  ...sortedCatalogTags.value.map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description ?? '',
  })),
]);

const catalogTagReviewLabel = computed(() => {
  if (catalogTagChoice.value.mode === 'assistant_recommend') {
    return 'Lab Assistant will recommend';
  }
  return `${catalogTagChoice.value.tagLabel} (${catalogTagChoice.value.tagId})`;
});

const canAdvance = computed(() => {
  if (step.value === 0) {
    return displayName.value.trim().length >= 2;
  }
  if (step.value === 1) {
    return description.value.trim().length >= 12;
  }
  if (step.value === 2) {
    return selectedCatalogTagKey.value.length > 0;
  }
  if (step.value === 3) {
    return selectedIconIsValid.value;
  }
  return true;
});

watch(step, (s) => {
  if (s === 3 && !selectedIcon.value) {
    selectedIcon.value = 'fa-cube';
  }
});

onMounted(() => {
  tagsLoading.value = true;
  void fetchPlatformAppTags()
    .then((payload) => {
      catalogTags.value = payload.tags;
    })
    .catch(() => {
      tagsError.value = 'Could not load catalog sections. You can still ask the Lab Assistant to recommend one.';
    })
    .finally(() => {
      tagsLoading.value = false;
    });
});

function goBack(): void {
  if (step.value > 0) {
    step.value -= 1;
  }
}

function goNext(): void {
  if (!canAdvance.value) {
    return;
  }
  if (step.value < steps.length - 1) {
    step.value += 1;
  }
}

function selectIcon(id: string): void {
  selectedIcon.value = id;
  iconQuery.value = '';
}

function selectCatalogTag(key: string): void {
  selectedCatalogTagKey.value = key;
}

async function informLabAssistant(): Promise<void> {
  const bridge = getLabShellSidecarBridge();
  if (!bridge) {
    toast.add({
      severity: 'warn',
      summary: 'Lab shell not ready',
      detail: 'Open THE-LAB from the main dashboard, then try again.',
      life: 5000,
    });
    return;
  }

  const name = displayName.value.trim();
  const desc = description.value.trim();
  const icon = selectedIcon.value.trim();

  starting.value = true;
  try {
    const message = formatAppBuilderConsultationMessage({
      displayName: name,
      description: desc,
      faIcon: icon,
      catalogTag: catalogTagChoice.value,
    });
    const tagChoice = catalogTagChoice.value;
    await bridge.startConsultation({
      message,
      sessionTitle: `New app: ${name}`,
      toolProfile: 'app_builder',
      persona: LAB_APP_BUILDER_CONSULTATION_PERSONA,
      ...(tagChoice.mode === 'user_selected'
        ? {
            primaryCatalogTagId: tagChoice.tagId,
            primaryCatalogTagLabel: tagChoice.tagLabel,
          }
        : {}),
    });
    props.onCloseSettings?.();
    props.onFocusAppsWorkspace?.();
    toast.add({
      severity: 'success',
      summary: 'Lab Assistant notified',
      detail: 'A new Sidecar chat was started with your app draft.',
      life: 4000,
    });
  } catch (err) {
    console.error(err);
    toast.add({
      severity: 'error',
      summary: 'Could not start consultation',
      detail: 'Please try again or open the Sidecar manually.',
      life: 5000,
    });
  } finally {
    starting.value = false;
  }
}
</script>

<template>
  <div
    :id="generateUniqueId('app-builder-wizard-root')"
    class="lab-app-landing lab-app-builder-wizard w-full min-w-0"
  >
    <header :id="generateUniqueId('app-builder-header-block')">
      <h2 :id="generateUniqueId('app-builder-title')" class="text-xl font-semibold m-0 text-lab-general-text">
        Create a new app
      </h2>
      <p :id="generateUniqueId('app-builder-intro')" class="text-sm text-lab-general-text-muted m-0 mt-1">
        A short guided flow — then the Lab Assistant in Sidecar helps you finalize scope before anything is
        registered in the catalog.
      </p>
    </header>

    <ol
      :id="generateUniqueId('app-builder-progress')"
      class="lab-app-builder-wizard__steps"
      aria-label="Progress"
    >
      <li
        v-for="(s, index) in steps"
        :id="generateUniqueId(`app-builder-step-${s.key}`)"
        :key="s.key"
        class="lab-app-builder-wizard__step"
        :class="{
          'lab-app-builder-wizard__step--active': index === step,
          'lab-app-builder-wizard__step--done': index < step,
        }"
      >
        <span
          :id="generateUniqueId(`app-builder-step-num-${s.key}`)"
          class="lab-app-builder-wizard__step-index"
          aria-hidden="true"
        >
          {{ index + 1 }}.
        </span>
        {{ s.label }}
      </li>
    </ol>

    <section
      :id="generateUniqueId('app-builder-step-panel')"
      class="lab-form-section lab-app-builder-wizard__step-panel mb-0"
      :aria-labelledby="generateUniqueId('app-builder-panel-title')"
    >
      <h4 :id="generateUniqueId('app-builder-panel-title')" class="lab-form-section__title m-0">
        <span class="lab-form-section__step" aria-hidden="true">{{ step + 1 }}</span>
        {{ activeStepMeta.label }}
      </h4>
      <p :id="generateUniqueId('app-builder-panel-subtitle')" class="lab-form-section__lead m-0">
        {{ activeStepMeta.subtitle }}
      </p>

      <div :id="generateUniqueId('app-builder-panel-body')" class="mt-4">
        <template v-if="step === 0">
          <label
            :id="generateUniqueId('app-builder-name-label')"
            class="lab-app-builder-wizard__field-label"
            :for="nameInputId"
          >
            Display name
          </label>
          <div :id="generateUniqueId('app-builder-name-field-wrap')" class="lab-app-builder-wizard__field-max">
            <InputText
              v-model="displayName"
              placeholder="e.g. Vendor onboarding"
              :pt="withFormControlRootId(formInputTextPt, nameInputId)"
              @keydown.enter.prevent="goNext"
            />
          </div>
        </template>

        <template v-else-if="step === 1">
          <label
            :id="generateUniqueId('app-builder-desc-label')"
            class="lab-app-builder-wizard__field-label"
            :for="descInputId"
          >
            Description
          </label>
          <div :id="generateUniqueId('app-builder-desc-field-wrap')" class="lab-app-builder-wizard__field-max-wide">
            <Textarea
              v-model="description"
              rows="5"
              placeholder="Who uses this app, what they do day-to-day, and what success looks like."
              :pt="withFormControlRootId(formTextareaPt, descInputId)"
            />
          </div>
        </template>

        <template v-else-if="step === 2">
          <Message
            v-if="tagsError"
            severity="warn"
            class="mb-3!"
            :pt="{ root: { attrs: { id: generateUniqueId('app-builder-tags-warn') } } }"
          >
            {{ tagsError }}
          </Message>
          <p :id="generateUniqueId('app-builder-category-hint')" class="text-sm text-lab-general-text-muted m-0 mb-3">
            Catalog <strong>sections</strong> group apps on the home screen (Platform, Productivity, Builder, …).
            Pick one now, or let the Lab Assistant recommend the best fit during your chat.
          </p>
          <div
            :id="generateUniqueId('app-builder-tag-grid')"
            class="lab-app-builder-wizard__tag-grid"
            role="listbox"
            aria-label="Catalog sections"
          >
            <button v-for="tag in catalogTagOptions" :id="generateUniqueId(`app-builder-tag-${tag.id}`)" :key="tag.id"
              type="button"
              role="option"
              :aria-selected="selectedCatalogTagKey === tag.id"
              class="lab-app-builder-wizard__tag-card"
              :class="{ 'lab-app-builder-wizard__tag-card--selected': selectedCatalogTagKey === tag.id }"
              :disabled="tagsLoading && tag.id !== APP_BUILDER_CATALOG_TAG_ASSISTANT"
              @click="selectCatalogTag(tag.id)"
            >
              <span
                :id="generateUniqueId(`app-builder-tag-label-${tag.id}`)"
                class="lab-app-builder-wizard__tag-card-label"
              >
                <i
                  v-if="tag.id === APP_BUILDER_CATALOG_TAG_ASSISTANT"
                  class="fa-solid fa-wand-magic-sparkles mr-1 text-[var(--lab-accent-primary)]"
                  aria-hidden="true"
                />
                {{ tag.label }}
              </span>
              <span
                :id="generateUniqueId(`app-builder-tag-desc-${tag.id}`)"
                class="lab-app-builder-wizard__tag-card-desc"
              >
                {{ tag.description }}
              </span>
            </button>
          </div>
        </template>

        <template v-else-if="step === 3">
          <div :id="generateUniqueId('app-builder-icon-row')" class="flex flex-col gap-3 mb-3">
            <div
              :id="generateUniqueId('app-builder-icon-class-row')"
              class="flex items-center gap-3 lab-app-builder-wizard__field-max-wide"
            >
              <div
                :id="generateUniqueId('app-builder-icon-preview')"
                class="lab-app-builder-wizard__icon-preview flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--lab-card-border)_85%,var(--lab-general-border))] bg-transparent"
                :title="selectedIconIsValid ? selectedIconTrimmed : 'No icon to preview'"
              >
                <i
                  v-if="selectedIconIsValid"
                  :key="selectedIconTrimmed"
                  :class="[selectedIconTrimmed, 'fa-solid text-xl text-[var(--lab-accent-primary)]']"
                  aria-hidden="true"
                />
              </div>
              <div :id="generateUniqueId('app-builder-icon-class-wrap')" class="min-w-0 flex-1">
                <label
                  :id="generateUniqueId('app-builder-icon-class-label')"
                  class="lab-app-builder-wizard__field-label"
                  :for="iconClassInputId"
                >
                  Icon class
                </label>
                <InputText
                  v-model="selectedIcon"
                  placeholder="fa-cube"
                  :pt="withFormControlRootId(formInputTextPt, iconClassInputId)"
                />
              </div>
            </div>
            <div :id="generateUniqueId('app-builder-icon-search-wrap')" class="lab-app-builder-wizard__field-max-wide">
              <label
                :id="generateUniqueId('app-builder-icon-search-label')"
                class="lab-app-builder-wizard__field-label"
                :for="iconSearchId"
              >
                Search catalog
              </label>
              <InputText
                v-model="iconQuery"
                placeholder="Name or keyword (e.g. chart, support)"
                :pt="withFormControlRootId(formInputTextPt, iconSearchId)"
              />
            </div>
          </div>
          <div
            :id="generateUniqueId('app-builder-icon-listbox')"
            class="lab-app-builder-wizard__icon-grid"
            role="listbox"
            aria-label="Icon results"
          >
            <button
              v-for="icon in filteredIcons"
              :id="generateUniqueId(`app-builder-icon-${icon.id}`)"
              :key="icon.id"
              type="button"
              role="option"
              :aria-selected="selectedIcon === icon.id"
              class="lab-app-builder-wizard__icon-btn"
              :class="{ 'lab-app-builder-wizard__icon-btn--selected': selectedIcon === icon.id }"
              :title="icon.label"
              @click="selectIcon(icon.id)"
            >
              <i :class="[icon.id, 'fa-solid text-base']" aria-hidden="true" />
              <span :id="generateUniqueId(`app-builder-icon-label-${icon.id}`)" class="truncate w-full text-center">
                {{ icon.label }}
              </span>
            </button>
          </div>
        </template>

        <template v-else>
          <p :id="generateUniqueId('app-builder-review-summary')" class="text-sm text-lab-general-text-muted m-0 mb-4">
            We will open the Lab Sidecar on a <strong class="text-lab-general-text">new chat tab</strong>
            with this draft. Nothing is created until you and the assistant agree on a plan.
          </p>
          <dl :id="generateUniqueId('app-builder-review-dl')" class="lab-app-builder-wizard__review-dl">
            <div :id="generateUniqueId('app-builder-review-row-name')" class="lab-app-builder-wizard__review-row">
              <dt :id="generateUniqueId('app-builder-review-dt-name')" class="lab-app-builder-wizard__review-dt">Name</dt>
              <dd :id="generateUniqueId('app-builder-review-dd-name')" class="lab-app-builder-wizard__review-dd">
                {{ displayName.trim() }}
              </dd>
            </div>
            <div :id="generateUniqueId('app-builder-review-row-cat')" class="lab-app-builder-wizard__review-row">
              <dt :id="generateUniqueId('app-builder-review-dt-cat')" class="lab-app-builder-wizard__review-dt">
                Catalog section
              </dt>
              <dd :id="generateUniqueId('app-builder-review-dd-cat')" class="lab-app-builder-wizard__review-dd">
                {{ catalogTagReviewLabel }}
              </dd>
            </div>
            <div :id="generateUniqueId('app-builder-review-row-icon')" class="lab-app-builder-wizard__review-row">
              <dt :id="generateUniqueId('app-builder-review-dt-icon')" class="lab-app-builder-wizard__review-dt">Icon</dt>
              <dd :id="generateUniqueId('app-builder-review-dd-icon')" class="lab-app-builder-wizard__review-dd flex items-center gap-2">
                <span
                  :id="generateUniqueId('app-builder-review-icon-preview')"
                  class="lab-app-builder-wizard__icon-preview lab-app-builder-wizard__icon-preview--sm inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[color-mix(in_srgb,var(--lab-card-border)_85%,var(--lab-general-border))]"
                >
                  <i
                    v-if="selectedIconIsValid"
                    :class="[selectedIconTrimmed, 'fa-solid']"
                    aria-hidden="true"
                  />
                </span>
                <code class="text-xs">{{ selectedIconTrimmed }}</code>
              </dd>
            </div>
            <div :id="generateUniqueId('app-builder-review-row-desc')" class="lab-app-builder-wizard__review-row">
              <dt :id="generateUniqueId('app-builder-review-dt-desc')" class="lab-app-builder-wizard__review-dt">
                Description
              </dt>
              <dd :id="generateUniqueId('app-builder-review-dd-desc')" class="lab-app-builder-wizard__review-dd">
                {{ description.trim() }}
              </dd>
            </div>
          </dl>
        </template>
      </div>

      <footer
        :id="generateUniqueId('app-builder-nav-actions')"
        class="lab-app-builder-wizard__actions flex flex-wrap items-center justify-between gap-2"
      >
        <Button
          v-if="step > 0"
          label="Back"
          severity="secondary"
          text
          :pt="{ root: { attrs: { id: backBtnId } } }"
          @click="goBack"
        />
        <span v-else aria-hidden="true" />

        <div :id="generateUniqueId('app-builder-continue-group')" class="flex flex-wrap gap-2">
          <Button
            v-if="step < steps.length - 1"
            label="Continue"
            icon="pi pi-arrow-right"
            icon-pos="right"
            :disabled="!canAdvance"
            :pt="{ root: { attrs: { id: continueBtnId } } }"
            @click="goNext"
          />
          <Button
            v-else
            label="Continue with Lab Assistant"
            icon="pi pi-comments"
            :loading="starting"
            :disabled="!canAdvance || starting"
            :pt="{ root: { attrs: { id: informBtnId } } }"
            @click="informLabAssistant"
          />
        </div>
      </footer>
    </section>
  </div>
</template>
