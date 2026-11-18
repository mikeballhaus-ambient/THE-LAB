<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import '@/shared/game-platform/game-board.css';
import HangmanGallows from './HangmanGallows.vue';

/**
 * Hangman play surface — gallows, letter slots, setter form, guesser keyboard.
 */
const props = defineProps<{
  role: 'setter' | 'guesser';
  pattern: string;
  /** Full word (server state) — used only to style correct vs wrong guesses. */
  secretWord?: string;
  wordSet?: boolean;
  finished?: boolean;
  guessedLetters: string[];
  strikes: number;
  maxStrikes: number;
  needsWord?: boolean;
  setterChallengeBrief?: string;
  disabled?: boolean;
  /** Quarks safe-letter hint — highlights one keyboard letter. */
  suggestedLetter?: string | null;
  onSetWord: (word: string) => void | Promise<void>;
  onGuess: (letter: string) => void | Promise<void>;
}>();

const { generateUniqueId } = useUniqueElementId();
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const wordInput = defineModel<string>('word', { default: '' });

const guessedSet = computed(() => new Set(props.guessedLetters.map((l) => l.toUpperCase())));
const gameOver = computed(() => props.strikes >= props.maxStrikes || props.finished);
const wordUpper = computed(() => (props.secretWord ?? '').toUpperCase());

const patternSlots = computed(() => {
  if (!props.pattern.trim()) {
    return [] as string[];
  }
  return props.pattern.split(/\s+/).filter(Boolean);
});

const showPattern = computed(
  () => props.wordSet && (patternSlots.value.length > 0 || props.finished),
);

const wrongLetters = computed(() =>
  props.guessedLetters.filter((l) => !wordUpper.value.includes(l.toUpperCase())),
);

const roleLabel = computed(() =>
  props.role === 'setter' ? 'Word setter' : 'Guesser',
);

function letterState(letter: string): 'idle' | 'hit' | 'miss' {
  if (!guessedSet.value.has(letter)) {
    return 'idle';
  }
  if (wordUpper.value.includes(letter)) {
    return 'hit';
  }
  return 'miss';
}

function pick(letter: string): void {
  if (props.disabled || gameOver.value || guessedSet.value.has(letter)) {
    return;
  }
  void props.onGuess(letter);
}

function submitWord(): void {
  const word = wordInput.value.trim().toUpperCase();
  if (props.disabled || !/^[A-Z]{3,12}$/.test(word)) {
    return;
  }
  void props.onSetWord(word);
}

const wordInputValid = computed(() => /^[A-Z]{3,12}$/.test(wordInput.value.trim().toUpperCase()));
</script>

<template>
  <div class="hangman-board lab-game-surface">
    <div class="hangman-board__hero">
      <div class="hangman-board__gallows-card lab-form-section">
        <HangmanGallows :strikes="props.strikes" :max-strikes="props.maxStrikes" />
        <p class="hangman-board__strikes m-0" :id="generateUniqueId('hm-strikes')">
          <span class="hangman-board__strikes-label">Wrong guesses</span>
          <span class="hangman-board__strikes-value">{{ props.strikes }} / {{ props.maxStrikes }}</span>
        </p>
        <p v-if="wrongLetters.length" class="hangman-board__miss-letters m-0 text-sm text-lab-general-text-muted">
          {{ wrongLetters.join(' · ') }}
        </p>
      </div>

      <div class="hangman-board__main flex flex-col gap-4 min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <span class="hangman-board__role-badge">{{ roleLabel }}</span>
        </div>

        <section
          v-if="props.needsWord"
          class="lab-form-section"
          :id="generateUniqueId('hm-secret-word-section')"
        >
          <h4 class="lab-form-section__title" :id="generateUniqueId('hm-secret-word-title')">
            <span class="lab-form-section__icon"><i class="pi pi-key" aria-hidden="true" /></span>
            Secret word
          </h4>
          <p class="lab-form-section__lead">
            {{ props.setterChallengeBrief || 'Pick a word between 3 and 12 letters.' }}
            Your opponent will not see it until they guess or the game ends.
          </p>
          <div class="flex flex-col gap-3 max-w-md">
            <label class="text-sm flex flex-col gap-1" :id="generateUniqueId('hm-word-label')">
              <span class="text-lab-general-text-muted">Letters A–Z only</span>
              <InputText
                v-model="wordInput"
                maxlength="12"
                autocomplete="off"
                autocapitalize="characters"
                class="hangman-board__word-input uppercase tracking-widest font-semibold"
                :disabled="props.disabled || !props.needsWord"
                placeholder="e.g. LABORATORY"
                :pt="{ root: { attrs: { id: generateUniqueId('hm-word-input') } } }"
                @keyup.enter="submitWord"
              />
            </label>
            <Button
              label="Set word"
              icon="pi pi-check"
              :disabled="props.disabled || !props.needsWord || !wordInputValid"
              :pt="{ root: { attrs: { id: generateUniqueId('hm-set-word') } } }"
              @click="submitWord"
            />
          </div>
        </section>

        <section
          v-else-if="!props.wordSet && props.role === 'guesser'"
          class="lab-form-section"
          :id="generateUniqueId('hm-waiting-section')"
        >
          <h4 class="lab-form-section__title" :id="generateUniqueId('hm-waiting-title')">
            <span class="lab-form-section__icon"><i class="pi pi-hourglass" aria-hidden="true" /></span>
            Waiting
          </h4>
          <p class="lab-form-section__lead m-0">
            The word setter is choosing a secret word. The puzzle will appear here when they lock it in.
          </p>
        </section>

        <div v-if="showPattern" class="hangman-board__pattern-wrap">
          <p class="text-xs uppercase tracking-wide text-lab-general-text-muted m-0 mb-2">Word</p>
          <div
            class="hangman-board__pattern"
            :id="generateUniqueId('hm-word')"
            aria-live="polite"
          >
            <span
              v-for="(ch, i) in patternSlots"
              :key="`${i}-${ch}`"
              class="hangman-board__slot"
              :class="ch === '_' ? 'hangman-board__slot--blank' : 'hangman-board__slot--filled'"
            >
              {{ ch === '_' ? '' : ch }}
            </span>
          </div>
        </div>

        <section
          v-if="props.role === 'guesser' && props.wordSet && !props.finished"
          class="lab-form-section"
          :id="generateUniqueId('hm-guess-section')"
        >
          <h4 class="lab-form-section__title" :id="generateUniqueId('hm-guess-title')">
            <span class="lab-form-section__icon"><i class="pi pi-th-large" aria-hidden="true" /></span>
            Guess a letter
          </h4>
          <p class="lab-form-section__lead">
            Each wrong letter adds a piece to the gallows. You have
            {{ Math.max(0, props.maxStrikes - props.strikes) }} miss{{ props.maxStrikes - props.strikes === 1 ? '' : 'es' }} left.
          </p>
          <div class="hangman-board__alphabet lab-game-board" :id="generateUniqueId('hm-alphabet')">
            <div class="lab-game-board-row hangman-board__alphabet-row">
              <button
                v-for="letter in ALPHABET"
                :key="letter"
                type="button"
                class="lab-game-cell lab-game-cell--action hangman-board__key"
                :class="{
                  'hangman-board__key--hit': letterState(letter) === 'hit',
                  'hangman-board__key--miss': letterState(letter) === 'miss',
                  'lab-game-cell--quarks-hint':
                    props.suggestedLetter &&
                    letter === props.suggestedLetter.toUpperCase() &&
                    letterState(letter) === 'idle',
                }"
                :disabled="props.disabled || gameOver || guessedSet.has(letter)"
                :id="generateUniqueId(`hm-${letter}`)"
                @click="pick(letter)"
              >
                {{ letter }}
              </button>
            </div>
          </div>
        </section>

        <section
          v-else-if="props.role === 'setter' && props.wordSet && !props.needsWord"
          class="lab-form-section"
          :id="generateUniqueId('hm-setter-watch-section')"
        >
          <h4 class="lab-form-section__title" :id="generateUniqueId('hm-setter-watch-title')">
            <span class="lab-form-section__icon"><i class="pi pi-eye" aria-hidden="true" /></span>
            You set the word
          </h4>
          <p class="lab-form-section__lead m-0">
            Watch the pattern and strikes while your opponent guesses. You cannot guess letters in this role.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hangman-board {
  --hangman-slot-size: 2.75rem;
  width: 100%;
  max-width: 52rem;
}

.hangman-board__hero {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 1.25rem;
  width: 100%;
}

.hangman-board__gallows-card {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  min-width: 10rem;
  padding: 1rem 1.25rem;
}

.hangman-board__strikes {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  width: 100%;
  text-align: center;
}

.hangman-board__strikes-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--lab-general-text-muted);
}

.hangman-board__strikes-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--lab-general-text);
}

.hangman-board__miss-letters {
  letter-spacing: 0.12em;
  font-weight: 600;
}

.hangman-board__role-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid var(--lab-general-border);
  background: color-mix(in srgb, var(--lab-general-bg) 88%, var(--lab-general-border));
  color: var(--lab-general-text-muted);
}

.hangman-board__pattern-wrap {
  width: 100%;
}

.hangman-board__pattern {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.hangman-board__slot {
  width: var(--hangman-slot-size);
  height: var(--hangman-slot-size);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.35rem;
  border: 2px solid var(--lab-general-border);
  background: var(--lab-general-bg-subtle, rgba(255, 255, 255, 0.04));
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--lab-general-text);
}

.hangman-board__slot--blank {
  border-style: dashed;
  color: transparent;
}

.hangman-board__slot--filled {
  border-color: color-mix(in srgb, var(--lab-accent, #6b8afd) 55%, var(--lab-general-border));
}

:global(.hangman-board__word-input) {
  width: 100%;
}

.hangman-board__alphabet {
  --lab-game-cell-size: 2.35rem;
  padding: 0.65rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.hangman-board__alphabet-row {
  flex-wrap: wrap;
  width: 100%;
}

.hangman-board__key {
  font-size: 0.85rem;
  flex: 0 0 auto;
}

.hangman-board__key--hit {
  border-color: var(--lab-accent, #6b8afd);
  background: color-mix(in srgb, var(--lab-accent, #6b8afd) 18%, var(--lab-general-bg));
  color: var(--lab-general-text);
}

.hangman-board__key--miss {
  opacity: 0.45;
  text-decoration: line-through;
  border-color: var(--lab-error, #f87171);
}

@media (max-width: 520px) {
  .hangman-board {
    --hangman-slot-size: 2.25rem;
  }

  .hangman-board__alphabet {
    --lab-game-cell-size: 2rem;
  }
}
</style>
