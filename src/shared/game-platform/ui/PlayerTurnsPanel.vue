<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { PlayerTurn } from './player-turn';

/**
 * Shared player-turns feed.
 *
 * Reconciles the two former copies: the kit version (summary only) and Word
 * Tile's richer version (live streaming turn + rejected-attempt notes). Games
 * that never set `streaming` / `rejectedAttemptNotes` behave exactly as before;
 * games that do get the bubble-and-dashed-note rendering.
 *
 * Chrome follows AGENTS.md rule 13 (`lab-form-section` + nested move cards).
 */
const props = defineProps<{
  turns: PlayerTurn[];
  /** In-flight turn appended after the committed ones. */
  liveTurn?: PlayerTurn | null;
  waitingForOpponent?: boolean;
  resolvingMove?: boolean;
}>();

const { generateUniqueId } = useUniqueElementId();
const scrollEl = ref<HTMLElement | null>(null);
const turnsContentEl = ref<HTMLElement | null>(null);

async function scrollToBottom(): Promise<void> {
  await nextTick();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const el = scrollEl.value;
      if (!el) {
        return;
      }
      el.scrollTop = el.scrollHeight;
    });
  });
}

let contentResizeObserver: ResizeObserver | null = null;
let panelResizeObserver: ResizeObserver | null = null;

onMounted(() => {
  void scrollToBottom();

  contentResizeObserver = new ResizeObserver(() => {
    void scrollToBottom();
  });
  if (turnsContentEl.value) {
    contentResizeObserver.observe(turnsContentEl.value);
  }

  panelResizeObserver = new ResizeObserver(() => {
    void scrollToBottom();
  });
  if (scrollEl.value) {
    panelResizeObserver.observe(scrollEl.value);
  }
});

onUnmounted(() => {
  contentResizeObserver?.disconnect();
  panelResizeObserver?.disconnect();
});

/** Live rows are for real in-progress copy (streamed reasoning, reject notes) — not placeholder bubbles. */
function shouldShowLiveTurnInFeed(turn: PlayerTurn): boolean {
  if (!turn.streaming) {
    return true;
  }
  if (turn.moveSummary?.trim() || turn.rejectedAttemptNotes?.trim()) {
    return true;
  }
  const text = (turn.summary ?? turn.text ?? '').trim();
  return text.length > 0 && text !== '…';
}

const displayTurns = computed<PlayerTurn[]>(() => {
  const list = [...props.turns];
  if (props.liveTurn && shouldShowLiveTurnInFeed(props.liveTurn)) {
    list.push(props.liveTurn);
  }
  return list;
});

const hasTurns = computed(() => displayTurns.value.length > 0);

/** Prefer the committed move line; suppress the text when it was only a reject. */
function committedMoveText(turn: PlayerTurn): string {
  const committed = turn.moveSummary?.trim();
  if (committed) {
    return committed;
  }
  if (turn.rejectedAttemptNotes?.trim() || turn.isAttempt) {
    return '';
  }
  return (turn.summary ?? turn.text ?? '').trim();
}

const headerSubtitle = computed(() => {
  if (props.resolvingMove && props.liveTurn?.streaming) {
    return 'Calculating next move';
  }
  if (props.resolvingMove || props.liveTurn?.streaming) {
    return 'Opponent is playing';
  }
  if (props.waitingForOpponent) {
    return 'Waiting for opponent';
  }
  return 'Moves in this match';
});

const scrollSignature = computed(() => {
  const turns = displayTurns.value;
  const last = turns[turns.length - 1];
  return [
    turns.length,
    props.waitingForOpponent ? 1 : 0,
    props.resolvingMove ? 1 : 0,
    last?.id ?? '',
    last?.moveSummary ?? '',
    last?.summary ?? '',
    last?.text ?? '',
    last?.rejectedAttemptNotes ?? '',
    last?.streaming ? 1 : 0,
  ].join('|');
});

watch(
  scrollSignature,
  () => {
    void scrollToBottom();
  },
  { immediate: true },
);

watch(turnsContentEl, (el, _prev, onCleanup) => {
  if (!contentResizeObserver || !el) {
    return;
  }
  contentResizeObserver.observe(el);
  onCleanup(() => {
    contentResizeObserver?.unobserve(el);
  });
});
</script>

<template>
  <section
    class="lab-form-section tw-player-turns-panel mb-0 flex h-full max-h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden"
    :id="generateUniqueId('gp-player-turns-panel')"
  >
    <h4 class="lab-form-section__title shrink-0" :id="generateUniqueId('gp-player-turns-title')">
      <span class="lab-form-section__icon" aria-hidden="true">
        <i class="pi pi-history" />
      </span>
      Player turns
    </h4>
    <p
      class="lab-form-section__lead shrink-0 flex items-center gap-2 flex-wrap m-0"
      :id="generateUniqueId('gp-player-turns-header')"
    >
      <span :class="props.resolvingMove ? 'text-lab-chat-assistant' : ''">{{ headerSubtitle }}</span>
      <span
        v-if="props.liveTurn?.streaming || props.resolvingMove"
        class="text-lab-chat-assistant message-loading ellipsis"
        aria-hidden="true"
      >
        <span class="dot" />
        <span class="dot" />
        <span class="dot" />
      </span>
    </p>

    <div
      class="lab-form-section__children tw-player-turns-panel__children flex min-h-0 flex-1 basis-auto flex-col px-0 pb-0"
    >
      <div
        ref="scrollEl"
        class="tw-player-turns-panel__body lab-chat-messages-panel lab-chat-scrollbar m-0 flex-1 overflow-x-hidden overflow-y-auto p-0 min-h-0"
        :id="generateUniqueId('gp-player-turns-body')"
      >
        <p
          v-if="!hasTurns && !props.waitingForOpponent"
          class="text-xs text-lab-general-text-muted m-0 px-1"
        >
          Each move will show up here — yours and your opponent's.
        </p>
        <div
          v-else-if="!hasTurns && props.waitingForOpponent"
          class="text-lab-chat-assistant message-loading ellipsis px-1"
          aria-label="Waiting for opponent"
        >
          <span class="dot" />
          <span class="dot" />
          <span class="dot" />
        </div>
        <div
          v-else
          ref="turnsContentEl"
          class="tw-player-turns-list m-0 ms-0 flex min-w-0 list-none flex-col gap-2 p-0 ps-0"
        >
          <div
            v-for="turn in displayTurns"
            :key="turn.id"
            class="tw-player-turns-list__item m-0 ms-0 min-w-0 list-none p-0 ps-0"
          >
            <section
              class="lab-form-section lab-form-section--nested tw-player-turn-card mb-0 min-w-0"
              :aria-label="`${turn.playerLabel} move`"
            >
              <div class="tw-player-turn-row grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3">
                <div class="tw-player-turn-row__label flex w-[4.75rem] min-w-0 shrink-0 flex-row items-center gap-1">
                  <span class="lab-form-section__icon" aria-hidden="true">
                    <i :class="turn.isYou ? 'pi pi-user' : 'pi pi-users'" />
                  </span>
                  <span
                    class="tw-player-turn-row__label-text m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-left text-[0.6875rem] leading-tight font-bold"
                    :class="turn.isYou ? 'text-lab-chat-user' : 'text-lab-chat-assistant'"
                    :title="turn.playerLabel"
                  >
                    {{ turn.playerLabel }}
                  </span>
                </div>
                <div
                  class="tw-player-turn-row__bubble-wrap flex min-w-0 flex-1 flex-col items-start justify-center gap-2"
                >
                  <div
                    v-if="turn.rejectedAttemptNotes"
                    class="tw-player-turn-row__bubble tw-player-turn-row__bubble--invalid max-w-full min-w-0 w-fit rounded-lg border border-dashed border-[color-mix(in_srgb,var(--lab-general-border)_75%,transparent)] bg-[color-mix(in_srgb,var(--lab-chat-composer-panel-bg)_35%,transparent)] p-2 text-xs whitespace-pre-wrap break-words text-lab-general-text-muted shadow-none"
                  >
                    {{ turn.rejectedAttemptNotes }}
                  </div>
                  <div
                    v-if="committedMoveText(turn)"
                    class="tw-player-turn-row__bubble max-w-full min-w-0 w-fit rounded-lg p-2 text-xs whitespace-pre-wrap break-words shadow"
                    :class="
                      turn.isYou
                        ? 'lab-chat-bubble-user text-lab-chat-user'
                        : 'lab-chat-bubble-assistant text-lab-chat-assistant'
                    "
                  >
                    <span>{{ committedMoveText(turn) }}</span>
                  </div>
                  <div
                    v-else-if="turn.streaming"
                    class="tw-player-turn-row__bubble max-w-full min-w-0 w-fit rounded-lg p-2 text-xs shadow lab-chat-bubble-assistant text-lab-chat-assistant"
                  >
                    <span class="text-lab-general-text-muted italic">…</span>
                    <p
                      v-if="props.resolvingMove"
                      class="m-0 mt-2 pt-2 text-lab-chat-assistant border-t border-lab-general-border/40 flex items-center gap-2 text-[0.7rem]"
                    >
                      <span>Calculating move</span>
                      <span class="message-loading ellipsis shrink-0" aria-hidden="true">
                        <span class="dot" />
                        <span class="dot" />
                        <span class="dot" />
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
