<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Message from 'primevue/message';
import type {
  LabWorkflowTriggerScheduleKind,
  LabWorkflowTriggerScheduleV1,
} from '@/shared/types/lab-workflow-graph';
import type { LabWorkflowSchedule } from '@/shared/types/lab-workflow-schedule';
// Imported from the **rrule-free** module: `lab-workflow-schedule-time.ts` pulls in `rrule`, which
// ships CommonJS only and breaks the browser build. The arithmetic is not needed here — only the text
// and the cron check — so the designer depends on the module that has no `rrule` import.
import {
  describeCronInPlainEnglish,
  describeSchedule,
  validateCronExpression,
} from '@/shared/utils/lab-workflow-schedule-expression';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import {
  formCheckboxPt,
  formInputTextPt,
  formSelectPt,
  withFormControlRootId,
} from '@/shared/forms/form-control-pt';

/**
 * "Run on a schedule" — the authoring surface for a scheduled trigger (phase 34).
 *
 * ## Why `relative` and `staleness` are not offered
 *
 * They derive their instant from a **record date**, and the platform tick never supplies one. An
 * author who picked one would create a schedule that stores cleanly, shows a plausible pattern, and
 * silently never fires. Per-record timing is the requirement sweep's job, so the panel says so rather
 * than offering a control that parks.
 *
 * ## Why the zone defaults to the browser's
 *
 * Defaulting to UTC is the classic way to produce "it runs at 3am" with no explanation. The browser
 * zone is at least the one the author is sitting in, and the resolved next run is shown immediately so
 * a wrong zone is visible before saving.
 */
const props = defineProps<{
  /** The trigger node's authored schedule, or `undefined` for a plain event trigger. */
  modelValue?: LabWorkflowTriggerScheduleV1;
  /** Runtime state for this trigger, when the workflow has been saved. */
  persisted?: LabWorkflowSchedule | null;
  /** True until the schedules route answers; avoids flashing "no next run". */
  persistedLoading?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: LabWorkflowTriggerScheduleV1 | undefined];
}>();

const { generateUniqueId } = useUniqueElementId();

/** One id for the checkbox's input and its `<label for>`, so click-to-toggle works per instance. */
const enabledInputId = generateUniqueId('wf-graph-schedule-enabled-input');

const KIND_OPTIONS: { label: string; value: LabWorkflowTriggerScheduleKind; hint: string }[] = [
  { label: 'Cron', value: 'cron', hint: '5 fields: minute hour day-of-month month day-of-week' },
  { label: 'Recurrence', value: 'recurrence', hint: 'An RRULE body, e.g. FREQ=WEEKLY;BYDAY=MO' },
  { label: 'Interval', value: 'interval', hint: 'Every N minutes, measured from the previous fire' },
];

/**
 * Zone list.
 *
 * `Intl.supportedValuesOf('timeZone')` is the authoritative list in a modern browser and needs no
 * maintenance. The fallback exists because the panel must still be usable in an older runtime — a
 * schedule with no zone select would be unauthorable rather than degraded.
 */
const FALLBACK_ZONES = [
  'UTC',
  'America/Denver',
  'America/Chicago',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const zoneOptions = ref<{ label: string; value: string }[]>([]);

onMounted(() => {
  let zones: string[] = FALLBACK_ZONES;
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
    .supportedValuesOf;
  if (typeof supported === 'function') {
    try {
      const list = supported.call(Intl, 'timeZone');
      if (Array.isArray(list) && list.length > 0) {
        zones = list;
      }
    } catch {
      // Older runtime: keep the fallback rather than failing to render the panel.
    }
  }
  zoneOptions.value = zones.map((zone) => ({ label: zone, value: zone }));
});

const browserZone = computed(() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
});

const enabled = computed(() => props.modelValue != null);
const kind = computed<LabWorkflowTriggerScheduleKind>(() => props.modelValue?.kind ?? 'cron');

const expression = computed(() => props.modelValue?.expression ?? '');
const intervalMinutes = computed(() => props.modelValue?.intervalMinutes ?? 60);
const timezone = computed(() => props.modelValue?.timezone ?? browserZone.value);

const summary = computed(() => {
  const schedule = props.modelValue;
  if (!schedule) {
    return '';
  }
  if (schedule.kind === 'cron' && schedule.expression?.trim()) {
    return `${describeCronInPlainEnglish(schedule.expression)} (${schedule.timezone})`;
  }
  return describeSchedule({
    kind: schedule.kind,
    expression: schedule.expression,
    timezone: schedule.timezone,
    intervalMinutes: schedule.intervalMinutes,
  });
});

/** Client-side preview of the same rule the server enforces, so a typo is caught while typing. */
const expressionProblem = computed(() => {
  const schedule = props.modelValue;
  if (!schedule || schedule.kind === 'interval') {
    return null;
  }
  if (!schedule.expression?.trim()) {
    return null;
  }
  // Only cron is checkable without `rrule`; an RRULE body is validated server-side at save, and the
  // panel does not pretend to know better than the validator that will judge it.
  if (schedule.kind !== 'cron') {
    return null;
  }
  return validateCronExpression(schedule.expression);
});

function emitSchedule(patch: Partial<LabWorkflowTriggerScheduleV1>): void {
  const current: LabWorkflowTriggerScheduleV1 = props.modelValue ?? {
    kind: 'cron',
    expression: '0 9 * * 1-5',
    timezone: browserZone.value,
  };
  emit('update:modelValue', { ...current, ...patch });
}

function onToggle(checked: boolean | undefined): void {
  if (checked) {
    emitSchedule({});
    return;
  }
  emit('update:modelValue', undefined);
}

function onKindChange(next: LabWorkflowTriggerScheduleKind | undefined): void {
  if (!next) {
    return;
  }
  if (next === 'interval') {
    emitSchedule({
      kind: next,
      expression: undefined,
      intervalMinutes: props.modelValue?.intervalMinutes ?? 60,
    });
    return;
  }
  emitSchedule({
    kind: next,
    expression: props.modelValue?.expression ?? (next === 'cron' ? '0 9 * * 1-5' : 'FREQ=WEEKLY;BYDAY=MO'),
    intervalMinutes: undefined,
  });
}

function resetToWeekdayMorning(): void {
  emitSchedule({ kind: 'cron', expression: '0 9 * * 1-5', timezone: browserZone.value });
}

/** Format an ISO instant in the schedule's own zone — the author's frame of reference. */
function formatInZone(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: props.modelValue?.timezone || browserZone.value,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const nextRunLabel = computed(() => formatInZone(props.persisted?.nextFireAt ?? null));
const lastRunLabel = computed(() => formatInZone(props.persisted?.lastFiredAt ?? null));

/** A saved workflow whose row is missing means reconcile has not run yet — say so, do not hide it. */
const persistedMissing = computed(
  () => enabled.value && !props.persistedLoading && props.persisted == null,
);

watch(
  () => props.modelValue?.timezone,
  () => {
    // Nothing to do: the computed summary and next-run label both read `props`, so a zone edit
    // re-renders automatically. The watcher exists so the dependency is explicit for future readers.
  },
);
</script>

<template>
  <section class="mt-3 border-t border-lab-general-border pt-3">
    <h4 class="lab-workflow-graph-detail-io__title">Run on a schedule</h4>
    <p class="lab-workflow-graph-detail-io__lead">
      Fire this workflow on a wall-clock pattern, with no event required. The trigger event type stays
      the envelope a scheduled run carries, so downstream nodes cannot tell the difference.
    </p>

    <div class="flex items-center gap-2">
      <Checkbox
        :model-value="enabled"
        binary
        :input-id="enabledInputId"
        :pt="withFormControlRootId(formCheckboxPt, generateUniqueId('wf-graph-schedule-enabled'))"
        @update:model-value="onToggle"
      />
      <label class="text-sm" :for="enabledInputId">This workflow runs on a schedule</label>
    </div>

    <template v-if="enabled">
      <label class="lab-workflow-graph-detail-io__label">Pattern kind</label>
      <Select
        :model-value="kind"
        :options="KIND_OPTIONS"
        option-label="label"
        option-value="value"
        class="w-full"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId('wf-graph-schedule-kind'))"
        @update:model-value="onKindChange"
      />
      <p class="m-0 mt-1 text-xs text-lab-general-text-muted">
        {{ KIND_OPTIONS.find((option) => option.value === kind)?.hint }}
      </p>

      <template v-if="kind === 'interval'">
        <label class="lab-workflow-graph-detail-io__label">Minutes between fires</label>
        <InputNumber
          :model-value="intervalMinutes"
          :min="1"
          :max="525600"
          :step="1"
          show-buttons
          class="w-full"
          :pt="withFormControlRootId(formInputTextPt, generateUniqueId('wf-graph-schedule-interval'))"
          @update:model-value="
            (value) => emitSchedule({ kind: 'interval', intervalMinutes: Number(value ?? 60) })
          "
        />
        <p class="m-0 mt-1 text-xs text-lab-general-text-muted">
          Anchored to the previous fire, so a late tick does not push every later fire outwards.
        </p>
      </template>

      <template v-else>
        <label class="lab-workflow-graph-detail-io__label">
          {{ kind === 'cron' ? 'Cron expression (minute hour day-of-month month day-of-week)' : 'RRULE body' }}
        </label>
        <InputText
          :model-value="expression"
          :placeholder="kind === 'cron' ? '0 9 * * 1-5' : 'FREQ=WEEKLY;BYDAY=MO'"
          class="w-full font-mono text-sm"
          :pt="withFormControlRootId(formInputTextPt, generateUniqueId('wf-graph-schedule-expression'))"
          @update:model-value="(value) => emitSchedule({ expression: value ?? '' })"
        />
        <div class="mt-1 flex items-start justify-between gap-2">
          <p class="m-0 text-xs" :class="expressionProblem ? 'text-red-500' : 'text-lab-general-text-muted'">
            {{ expressionProblem ?? summary }}
          </p>
          <Button
            v-if="kind === 'cron'"
            label="Weekdays 09:00"
            size="small"
            text
            :pt="{ root: { attrs: { id: generateUniqueId('wf-graph-schedule-preset') } } }"
            @click="resetToWeekdayMorning"
          />
        </div>
      </template>

      <label class="lab-workflow-graph-detail-io__label">Time zone</label>
      <Select
        :model-value="timezone"
        :options="zoneOptions"
        option-label="label"
        option-value="value"
        filter
        class="w-full"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId('wf-graph-schedule-zone'))"
        @update:model-value="(zone) => zone && emitSchedule({ timezone: String(zone) })"
      />
      <p class="m-0 mt-1 text-xs text-lab-general-text-muted">
        A named IANA zone, never an offset — a fixed offset drifts an hour at daylight saving. Defaults
        to this browser's zone ({{ browserZone }}).
      </p>

      <Message v-if="persistedMissing" severity="warn" :closable="false" class="mt-2 text-xs">
        No schedule row is stored yet. Save the workflow to activate it — the row is created on save.
      </Message>

      <dl class="m-0 mt-3 flex gap-6 text-xs">
        <div>
          <dt class="font-semibold uppercase text-lab-general-text-muted">Next run</dt>
          <dd class="m-0 mt-0.5 tabular-nums text-lab-general-text">
            {{ persistedLoading ? 'Loading…' : nextRunLabel }}
          </dd>
        </div>
        <div>
          <dt class="font-semibold uppercase text-lab-general-text-muted">Last run</dt>
          <dd class="m-0 mt-0.5 tabular-nums text-lab-general-text">
            {{ persistedLoading ? 'Loading…' : lastRunLabel }}
          </dd>
        </div>
      </dl>

      <p class="m-0 mt-2 text-xs text-lab-general-text-muted">
        Time-based <em>record</em> events (a lease expiring in 30 days, an invoice going overdue) are
        not schedules — a platform sweep evaluates them per record. Use
        <strong>Events</strong> for those.
      </p>
    </template>
  </section>
</template>
