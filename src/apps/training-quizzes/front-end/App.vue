<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import RadioButton from 'primevue/radiobutton';
import { useToast } from 'primevue/usetoast';
import { useCatalogSingleAccordion } from '@/shared/composables/catalog/useCatalogSingleAccordion';
import { useCatalogWorkspaceRefresh } from '@/shared/composables/catalog/useCatalogWorkspaceRefresh';
import { useLabShellUserRole } from '@/shared/composables/useLabShellUserRole';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { CatalogAppFormSection, CatalogAppReportsSection, CatalogIntegrationHost } from '@/shared/integration';
import { formRadioButtonPt } from '@/shared/forms/form-control-pt';
import { getAuthUser } from '@/shared/types/auth';
import { categoryCertIconFor } from '@/shared/training-quizzes/category-cert-definitions';
import { QUIZ_DEMO_CATEGORY_ORDER } from '../shared/quiz-demo-content';
import type { CategoryCertProgress, QuizWithQuestions } from '../shared/types';
import * as api from './api';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';

const HOST_APP_ID = 'app-training-quizzes';

interface Props {
  serverUrl?: string;
  appDescription?: string;
}
const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();
const toast = useToast();
const { accordionValue, onAccordionChange } = useCatalogSingleAccordion();

const integrationRef = ref<InstanceType<typeof CatalogIntegrationHost> | null>(null);
const base = computed(() => (props.serverUrl ?? '').replace(/\/$/, ''));
const shellUserRole = useLabShellUserRole();
const canManageQuizContent = computed(
  () => shellUserRole.value === 'owner' || shellUserRole.value === 'admin',
);

const loading = ref(false);
const error = ref<string | null>(null);
const quizzes = ref<QuizWithQuestions[]>([]);

const learner = ref('');
const categoryProgress = ref<CategoryCertProgress[]>([]);
const answersByQuizId = ref<Record<number, number[]>>({});
const resultByQuizId = ref<Record<number, { score: number; passed: boolean } | null>>({});

function answersFor(quiz: QuizWithQuestions): number[] {
  if (!answersByQuizId.value[quiz.id]) {
    answersByQuizId.value[quiz.id] = quiz.questions.map(() => -1);
  }
  return answersByQuizId.value[quiz.id];
}

function resultFor(quizId: number): { score: number; passed: boolean } | null {
  return resultByQuizId.value[quizId] ?? null;
}

function resetQuizAttempt(quiz: QuizWithQuestions): void {
  answersByQuizId.value[quiz.id] = quiz.questions.map(() => -1);
  resultByQuizId.value[quiz.id] = null;
}

function onQuizAccordionChange(quiz: QuizWithQuestions, value: string | string[] | null | undefined): void {
  const wasOpen = accordionValue(quiz.id) != null;
  onAccordionChange(quiz.id, value);
  const nowOpen =
    value != null &&
    value !== '' &&
    (Array.isArray(value) ? value.includes(String(quiz.id)) : value === String(quiz.id));
  if (nowOpen && !wasOpen) {
    resetQuizAttempt(quiz);
  }
}

async function refresh(): Promise<void> {
  if (!base.value) {
    error.value = 'App server is not available.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    quizzes.value = await api.listQuizzes(base.value);
    await loadCategoryProgress();
  } catch (e) {
    error.value = msg(e);
  } finally {
    loading.value = false;
  }
}

function resolveLearnerId(): number | null {
  const auth = getAuthUser();
  return auth?.userId ?? null;
}
const { reportsChartContext, reloadWorkspace } = useCatalogWorkspaceRefresh({
  hostAppId: HOST_APP_ID,
  serverUrl: () => base.value,
  reload: refresh,
});

async function loadCategoryProgress(): Promise<void> {
  if (!base.value || !learner.value.trim()) {
    categoryProgress.value = [];
    return;
  }
  try {
    categoryProgress.value = await api.fetchCategoryProgress(
      base.value,
      learner.value.trim(),
      resolveLearnerId(),
    );
  } catch {
    categoryProgress.value = [];
  }
}

function progressForCategory(category: string): CategoryCertProgress | undefined {
  return categoryProgress.value.find((row) => row.category === category);
}

async function onIntegrationSuccess(): Promise<void> {
  await reloadWorkspace();
  toast.add({ severity: 'success', summary: 'Quiz updated', life: 2500 });
}

async function submit(quiz: QuizWithQuestions): Promise<void> {
  try {
    const answers = answersFor(quiz);
    const { attempt, categoryCertIssued } = await api.submitAttempt(
      base.value,
      quiz.id,
      learner.value,
      answers,
      resolveLearnerId(),
    );
    resultByQuizId.value[quiz.id] = { score: attempt.score, passed: attempt.passed };
    await loadCategoryProgress();
    if (categoryCertIssued) {
      toast.add({
        severity: 'success',
        summary: 'Category certification earned',
        detail: categoryCertIssued.title,
        life: 4500,
      });
    }
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Submit failed', detail: msg(e), life: 5000 });
  }
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

function quizRadioPt(idPrefix: string) {
  return {
    root: {
      class: formRadioButtonPt.root.class,
      attrs: { id: generateUniqueId(idPrefix) },
    },
    box: formRadioButtonPt.box,
    icon: formRadioButtonPt.icon,
  };
}

function categoryIcon(category: string): string {
  return categoryCertIconFor(category);
}

const quizSections = computed(() => {
  const byCategory = new Map<string, QuizWithQuestions[]>();
  for (const quiz of quizzes.value) {
    const key = quiz.category?.trim() || 'Other';
    const list = byCategory.get(key) ?? [];
    list.push(quiz);
    byCategory.set(key, list);
  }
  const sections: Array<{ category: string; quizzes: QuizWithQuestions[] }> = [];
  for (const cat of QUIZ_DEMO_CATEGORY_ORDER) {
    const list = byCategory.get(cat);
    if (list?.length) sections.push({ category: cat, quizzes: list });
  }
  for (const [cat, list] of byCategory) {
    if (!(QUIZ_DEMO_CATEGORY_ORDER as readonly string[]).includes(cat)) {
      sections.push({ category: cat, quizzes: list });
    }
  }
  return sections;
});

watch(learner, () => {
  void loadCategoryProgress();
});

onMounted(refresh);
</script>

<template>
  <div
    class="training-quizzes-app lab-platform-catalog-app app-loaded-container text-lab-general-text w-full min-h-0 h-full flex flex-1 flex-col overflow-hidden p-4 gap-4 [&>.lab-form-section>.lab-form-section__children]:pt-[0.85rem]"
    :id="generateUniqueId('quiz-root')"
  >
    <header class="lab-app-header" :id="generateUniqueId('quiz-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('quiz-title')">Training & Quizzes</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || 'Build quizzes and track training completion.' }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2 items-center">
        <InputText
          v-model="learner"
          placeholder="Your name (for attempts)"
          :pt="{ root: { attrs: { id: generateUniqueId('quiz-learner') } } }"
        />
        <Button
          v-if="canManageQuizContent"
          label="New quiz"
          icon="pi pi-plus"
          size="small"
          :pt="{ root: { attrs: { id: generateUniqueId('quiz-new') } } }"
          @click="integrationRef?.openPrimaryCreate()"
        />
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          size="small"
          severity="secondary"
          :loading="loading"
          :pt="{ root: { attrs: { id: generateUniqueId('quiz-refresh') } } }"
          @click="reloadWorkspace"
        />
      </div>
    </header>

    <CatalogAppReportsSection
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      :chart-context="reportsChartContext"
      id-prefix="quiz-reports"
    />

    <CatalogAppFormSection
      title="Quizzes"
      lead="Three training tracks — pass every quiz in a category to earn that category certification."
      icon="pi pi-question-circle"
      section-class="catalog-app-workspace-section lab-app-body flex-1 min-h-0 min-w-0 flex flex-col gap-4 overflow-x-hidden"
      id-prefix="quiz-main"
    >
      <p v-if="error" class="text-sm text-red-400 m-0" :id="generateUniqueId('quiz-error')">{{ error }}</p>
      <p
        v-else-if="!loading && quizzes.length === 0"
        class="text-sm text-lab-general-text-muted m-0"
        :id="generateUniqueId('quiz-empty')"
      >
        No quizzes yet<span v-if="canManageQuizContent"> — use “New quiz” to add one</span>.
      </p>

      <div
        v-else
        class="flex flex-col gap-6 min-h-0"
        :id="generateUniqueId('quiz-category-groups')"
      >
        <section
          v-for="section in quizSections"
          :key="section.category"
          class="lab-form-section mb-0"
          :id="generateUniqueId(`quiz-category-${section.category}`)"
        >
          <h4
            class="lab-form-section__title"
            :id="generateUniqueId(`quiz-category-title-${section.category}`)"
          >
            <span class="lab-form-section__icon">
              <i :class="categoryIcon(section.category)" aria-hidden="true" />
            </span>
            {{ section.category }}
          </h4>
          <p class="lab-form-section__lead m-0">
            Pass every quiz in this category to earn
            <strong>{{ progressForCategory(section.category)?.definition.title ?? 'the category certification' }}</strong>.
          </p>
          <div class="lab-form-section__children flex flex-col gap-3">
            <div
              v-if="progressForCategory(section.category)"
              class="flex flex-wrap items-center gap-2 text-xs text-lab-general-text-muted"
            >
              <span
                class="inline-flex items-center justify-center rounded-full border w-7 h-7"
                :class="
                  progressForCategory(section.category)!.earned
                    ? 'border-lab-button-border bg-lab-button-bg text-lab-button-text'
                    : 'border-lab-general-border bg-lab-general-bg-subtle'
                "
                :title="progressForCategory(section.category)!.definition.title"
              >
                <i
                  :class="progressForCategory(section.category)!.definition.icon"
                  aria-hidden="true"
                />
              </span>
              <span>
                {{ progressForCategory(section.category)!.passedQuizzes }} /
                {{ progressForCategory(section.category)!.totalQuizzes }} quizzes passed
                <span v-if="progressForCategory(section.category)!.earned"> · Certified</span>
              </span>
            </div>
            <ul
              class="catalog-master-list list-none m-0 p-0 ps-0"
              :id="generateUniqueId(`quiz-category-list-${section.category}`)"
            >
            <li
              v-for="quiz in section.quizzes"
              :key="quiz.id"
              class="list-none m-0 p-0 ps-0"
              :id="generateUniqueId(`quiz-wrap-${quiz.id}`)"
            >
          <section class="lab-form-section catalog-master-record" :id="generateUniqueId(`quiz-item-${quiz.id}`)">
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="min-w-0">
                <h2 class="text-lg font-semibold m-0" :id="generateUniqueId(`quiz-title-${quiz.id}`)">{{ quiz.title }}</h2>
                <p v-if="quiz.description" class="text-sm text-lab-general-text-muted m-0 mt-0.5 catalog-detail-text">
                  {{ quiz.description }}
                </p>
                <p class="text-xs text-lab-general-text-muted m-0 mt-0.5">
                  {{ quiz.questions.length }} questions · pass {{ quiz.passingScore }}%
                </p>
              </div>
              <div v-if="canManageQuizContent" class="flex gap-1 shrink-0 flex-wrap">
                <Button
                  icon="pi pi-pencil"
                  size="small"
                  severity="secondary"
                  text
                  :pt="labRecordActionButtonPt(generateUniqueId, 'quiz', 'edit', quiz.id, quiz.title)"
                  @click="integrationRef?.openPrimaryEdit(quiz.id)"
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  severity="danger"
                  text
                  :pt="labRecordActionButtonPt(generateUniqueId, 'quiz', 'delete', quiz.id, quiz.title)"
                  @click="integrationRef?.openPrimaryDelete(quiz.id)"
                />
              </div>
            </div>

            <Accordion
              :value="accordionValue(quiz.id)"
              class="catalog-details-accordion mt-3 w-full min-w-0"
              :pt="{ root: { attrs: { id: generateUniqueId(`quiz-details-accordion-${quiz.id}`) } } }"
              @update:value="(v) => onQuizAccordionChange(quiz, v)"
            >
              <AccordionPanel
                :value="String(quiz.id)"
                class="min-w-0"
                :pt="{ root: { attrs: { id: generateUniqueId(`quiz-details-panel-${quiz.id}`) } } }"
              >
                <AccordionHeader
                  :pt="{ root: { attrs: { id: generateUniqueId(`quiz-details-toggle-${quiz.id}`) } } }"
                >
                  <span class="text-sm font-medium">
                    Questions & attempt
                    <span class="text-lab-general-text-muted font-normal">({{ quiz.questions.length }})</span>
                  </span>
                </AccordionHeader>
                <AccordionContent
                  :pt="{ root: { attrs: { id: generateUniqueId(`quiz-details-body-${quiz.id}`) } } }"
                >
                  <div class="catalog-details-inner" :id="generateUniqueId(`quiz-details-inner-${quiz.id}`)">
                    <section
                      class="lab-form-section lab-form-section--nested mb-0"
                      :id="generateUniqueId(`quiz-questions-section-${quiz.id}`)"
                    >
                      <div class="flex items-center justify-between gap-2 flex-wrap">
                        <h3 class="text-sm font-semibold m-0" :id="generateUniqueId(`quiz-questions-heading-${quiz.id}`)">
                          Questions
                        </h3>
                        <Button
                          v-if="canManageQuizContent"
                          label="Add question"
                          icon="pi pi-plus"
                          size="small"
                          severity="secondary"
                          :pt="{ root: { attrs: { id: generateUniqueId(`quiz-add-question-${quiz.id}`) } } }"
                          @click="integrationRef?.openEntityCreate('quiz-question', { quizId: quiz.id })"
                        />
                      </div>
                      <p v-if="quiz.questions.length === 0" class="text-xs text-lab-general-text-muted m-0 mt-2">
                        No questions yet.
                      </p>
                      <ul
                        v-else
                        class="catalog-accordion-item-list catalog-accordion-item-list--cards mt-2"
                        :id="generateUniqueId(`quiz-questions-${quiz.id}`)"
                      >
                        <li
                          v-for="(q, qi) in quiz.questions"
                          :key="q.id"
                          class="list-none m-0 p-0 ps-0 lab-form-section lab-form-section--nested mb-0"
                          :id="generateUniqueId(`quiz-q-${q.id}`)"
                        >
                          <div class="flex items-start gap-2">
                            <span class="flex-1 text-sm">{{ q.prompt }}</span>
                            <template v-if="canManageQuizContent">
                              <Button
                                icon="pi pi-pencil"
                                size="small"
                                severity="secondary"
                                text
                                :pt="
                                  labRecordActionButtonPt(
                                    generateUniqueId,
                                    'quiz-question',
                                    'edit',
                                    q.id,
                                    q.prompt,
                                  )
                                "
                                @click="integrationRef?.openEntityEdit('quiz-question', q.id, { quizId: quiz.id })"
                              />
                              <Button
                                icon="pi pi-trash"
                                size="small"
                                severity="danger"
                                text
                                :pt="
                                  labRecordActionButtonPt(
                                    generateUniqueId,
                                    'quiz-question',
                                    'delete',
                                    q.id,
                                    q.prompt,
                                  )
                                "
                                @click="integrationRef?.openEntityDelete('quiz-question', q.id, { quizId: quiz.id })"
                              />
                            </template>
                          </div>
                          <div
                            class="lab-form-runtime fb-field__control flex flex-col gap-2 mt-2 w-full min-w-0"
                            role="radiogroup"
                            :id="generateUniqueId(`quiz-q-${q.id}-options`)"
                          >
                            <div
                              v-for="(opt, oi) in q.options"
                              :key="oi"
                              class="flex items-center gap-2.5 min-h-[1.75rem] min-w-0"
                              :id="generateUniqueId(`quiz-q-${q.id}-opt-row-${oi}`)"
                            >
                              <RadioButton
                                v-model="answersFor(quiz)[qi]"
                                :input-id="generateUniqueId(`quiz-q-${q.id}-ans-${oi}`)"
                                :name="`quiz-q-${q.id}`"
                                :value="oi"
                                :pt="quizRadioPt(`quiz-q-${q.id}-rb-${oi}`)"
                              />
                              <label
                                :for="generateUniqueId(`quiz-q-${q.id}-ans-${oi}`)"
                                class="text-sm m-0 cursor-pointer select-none text-lab-general-text leading-snug"
                                :id="generateUniqueId(`quiz-q-${q.id}-opt-label-${oi}`)"
                              >
                                {{ opt }}
                              </label>
                            </div>
                          </div>
                        </li>
                      </ul>
                    </section>

                    <section
                      class="lab-form-section lab-form-section--nested mb-0 flex flex-wrap gap-2 items-center"
                      :id="generateUniqueId(`quiz-take-${quiz.id}`)"
                    >
                      <Button
                        label="Submit attempt"
                        icon="pi pi-check"
                        size="small"
                        :disabled="quiz.questions.length === 0"
                        :pt="{ root: { attrs: { id: generateUniqueId(`quiz-submit-${quiz.id}`) } } }"
                        @click="submit(quiz)"
                      />
                      <span
                        v-if="resultFor(quiz.id)"
                        class="text-sm font-semibold"
                        :class="
                          resultFor(quiz.id)!.passed
                            ? 'text-lab-general-text'
                            : 'text-lab-general-text-muted'
                        "
                        :id="generateUniqueId(`quiz-result-${quiz.id}`)"
                      >
                        Score {{ resultFor(quiz.id)!.score }}% —
                        {{ resultFor(quiz.id)!.passed ? 'Passed' : 'Not passed' }}
                      </span>
                    </section>
                  </div>
                </AccordionContent>
              </AccordionPanel>
            </Accordion>
          </section>
            </li>
          </ul>
          </div>
        </section>
      </div>
    </CatalogAppFormSection>

    <CatalogIntegrationHost
      ref="integrationRef"
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      @integration-success="onIntegrationSuccess"
    />

  </div>
</template>

