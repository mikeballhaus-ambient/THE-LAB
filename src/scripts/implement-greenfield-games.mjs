/**
 * Wires playable MVP UIs + lean servers for rm-53 greenfield games (phases 06–12).
 * Run: node src/scripts/implement-greenfield-games.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const GAMES = [
  { slug: 'checkers', appId: 'app-checkers', title: 'Checkers', css: 'checkers-app', game: 'checkers' },
  { slug: 'chess', appId: 'app-chess', title: 'Chess', css: 'chess-app', game: 'chess' },
  { slug: 'hangman', appId: 'app-hangman', title: 'Hangman', css: 'hangman-app', game: 'hangman' },
  { slug: 'connect-four', appId: 'app-connect-four', title: 'Connect Four', css: 'connect-four-app', game: 'connect-four' },
  { slug: 'battleship', appId: 'app-battleship', title: 'Battleship', css: 'battleship-app', game: 'battleship' },
  { slug: 'poker-holdem', appId: 'app-poker-holdem', title: "Texas Hold'em", css: 'poker-holdem-app', game: 'poker-holdem' },
  { slug: 'tic-tac-toe', appId: 'app-tic-tac-toe', title: 'Tic-Tac-Toe', css: 'tic-tac-toe-app', game: 'tic-tac-toe' },
];

function w(rel, content) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
}

function appVue(g) {
  const gameComp =
    g.game === 'checkers' || g.game === 'chess'
      ? `import GameBoard from './games/${g.game === 'checkers' ? 'Checkers' : 'Chess'}/${g.game === 'checkers' ? 'CheckersGame' : 'ChessGame'}.vue';
import { DnDProvider } from '@vue-dnd-kit/core';`
      : `import GameBoard from './components/GameBoard.vue';`;

  const boardMarkup =
    g.game === 'checkers' || g.game === 'chess'
      ? `<DnDProvider>
        <GameBoard />
      </DnDProvider>`
      : `<GameBoard :server-url="appServerUrl" />`;

  return `<script setup lang="ts">
import Button from 'primevue/button';
import { computed } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
${gameComp}

interface Props {
  serverUrl?: string;
  appDescription?: string;
}

const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();
const appServerUrl = computed(() => (props.serverUrl ?? '').replace(/\\/$/, ''));

function newGame(): void {
  window.dispatchEvent(new CustomEvent('${g.slug}:new-game'));
}
</script>

<template>
  <div
    class="${g.css} app-loaded-container text-lab-general-text w-full min-h-full h-full flex flex-col p-4 gap-4"
    :id="generateUniqueId('${g.slug}-root')"
  >
    <header class="lab-app-header" :id="generateUniqueId('${g.slug}-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('${g.slug}-title')">${g.title}</h1>
        <p v-if="props.appDescription" class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription }}
        </p>
        <p v-else class="text-sm text-lab-general-text-muted m-0 mt-1">Local two-player MVP — invites via Lab Messages in a follow-up.</p>
      </div>
      <Button
        label="New game"
        icon="pi pi-refresh"
        size="small"
        severity="secondary"
        :pt="{ root: { attrs: { id: generateUniqueId('${g.slug}-new-game') } } }"
        @click="newGame"
      />
    </header>
    <main class="lab-app-body flex-1 min-h-0" :id="generateUniqueId('${g.slug}-main')">
      ${boardMarkup}
    </main>
  </div>
</template>
`;
}

function serverTs(slug, gameId, title) {
  return `import { createAppServer } from '@/shared/services/create-app-server';
import { AppDatabaseServiceProxy } from '../db/app-db-service';

const GAME_ID = '${gameId}';

const start = async (): Promise<void> => {
  await AppDatabaseServiceProxy.getInstance().initialize();

  const { listen } = await createAppServer({
    registerRoutes: async (server) => {
      server.get('/api/games', async () => ({
        games: [
          {
            id: GAME_ID,
            name: '${title.replace(/'/g, "\\'")}',
            description: 'Catalog game (MVP)',
            playerMode: 'multiplayer',
          },
        ],
      }));
      ${
        slug === 'hangman'
          ? `
      const words = ['REACT', 'VUEJS', 'LABORATORY', 'SOCKET', 'CHECKERS', 'HYBRID'];
      server.get('/api/hangman/word', async () => {
        const word = words[Math.floor(Math.random() * words.length)];
        return { length: word.length };
      });
      server.post('/api/hangman/guess', async (request, reply) => {
        const body = request.body as { word?: string; letter?: string };
        if (!body.word || !body.letter) {
          return reply.status(400).send({ error: 'word and letter required' });
        }
        const hit = body.word.toUpperCase().includes(body.letter.toUpperCase());
        return { hit };
      });
      `
          : ''
      }
    },
  });

  await listen();
};

export const startServer = start;
`;
}

function entryTs(slug) {
  return `import 'dotenv/config';
import { startServer } from './server';

await startServer().catch((err) => {
  console.error('Failed to initialize ${slug} server:', err);
  process.exit(1);
});
`;
}

// --- GameBoard.vue per game type (inline templates) ---
function gameBoardVue(game) {
  switch (game) {
    case 'tic-tac-toe':
      return ticTacToeBoard();
    case 'connect-four':
      return connectFourBoard();
    case 'hangman':
      return hangmanBoard();
    case 'battleship':
      return battleshipBoard();
    case 'poker-holdem':
      return pokerBoard();
    default:
      return '';
  }
}

function ticTacToeBoard() {
  return `<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const { generateUniqueId } = useUniqueElementId();
type Cell = 'X' | 'O' | null;
const board = ref<Cell[]>(Array(9).fill(null));
const turn = ref<'X' | 'O'>('X');
const winner = ref<string | null>(null);

function checkWinner(b: Cell[]): string | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, c, d] of lines) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  if (b.every((x) => x)) return 'Draw';
  return null;
}

function play(i: number): void {
  if (winner.value || board.value[i]) return;
  board.value[i] = turn.value;
  winner.value = checkWinner(board.value);
  if (!winner.value) turn.value = turn.value === 'X' ? 'O' : 'X';
}

function reset(): void {
  board.value = Array(9).fill(null);
  turn.value = 'X';
  winner.value = null;
}

function onNewGame(): void {
  reset();
}

onMounted(() => window.addEventListener('tic-tac-toe:new-game', onNewGame));
onUnmounted(() => window.removeEventListener('tic-tac-toe:new-game', onNewGame));
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <p class="text-lab-general-text-muted m-0" :id="generateUniqueId('ttt-status')">
      <template v-if="winner">{{ winner === 'Draw' ? 'Draw' : \`\${winner} wins!\` }}</template>
      <template v-else>Turn: {{ turn }}</template>
    </p>
    <div class="grid grid-cols-3 gap-2" :id="generateUniqueId('ttt-grid')">
      <Button
        v-for="(cell, i) in board"
        :key="i"
        :label="cell ?? ' '"
        class="w-16 h-16"
        :pt="{ root: { attrs: { id: generateUniqueId(\`ttt-cell-\${i}\`) } } }"
        @click="play(i)"
      />
    </div>
  </div>
</template>
`;
}

function connectFourBoard() {
  return `<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const { generateUniqueId } = useUniqueElementId();
const COLS = 7;
const ROWS = 6;
const board = ref<( 'R' | 'Y' | null)[][]>(
  Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
);
const turn = ref<'R' | 'Y'>('R');
const winner = ref<string | null>(null);

function drop(col: number): void {
  if (winner.value) return;
  for (let row = ROWS - 1; row >= 0; row--) {
    if (!board.value[row][col]) {
      board.value[row][col] = turn.value;
      winner.value = checkWin() ?? (isFull() ? 'Draw' : null);
      if (!winner.value) turn.value = turn.value === 'R' ? 'Y' : 'R';
      return;
    }
  }
}

function isFull(): boolean {
  return board.value[0].every((c) => c !== null);
}

function checkWin(): string | null {
  const b = board.value;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = b[r][c];
      if (!p) continue;
      if (c + 3 < COLS && p === b[r][c + 1] && p === b[r][c + 2] && p === b[r][c + 3]) return p;
      if (r + 3 < ROWS && p === b[r + 1][c] && p === b[r + 2][c] && p === b[r + 3][c]) return p;
    }
  }
  return null;
}

function reset(): void {
  board.value = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  turn.value = 'R';
  winner.value = null;
}

onMounted(() => window.addEventListener('connect-four:new-game', reset));
onUnmounted(() => window.removeEventListener('connect-four:new-game', reset));
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <p class="m-0 text-lab-general-text-muted" :id="generateUniqueId('c4-status')">
      <template v-if="winner">{{ winner === 'Draw' ? 'Draw' : \`\${winner} wins\` }}</template>
      <template v-else>Turn: {{ turn === 'R' ? 'Red' : 'Yellow' }}</template>
    </p>
    <div class="inline-block border border-lab-general-border rounded p-2 bg-lab-general-bg-subtle">
      <div v-for="(row, r) in board" :key="r" class="flex gap-1">
        <span
          v-for="(cell, c) in row"
          :key="c"
          class="w-8 h-8 rounded-full border border-lab-general-border flex items-center justify-center text-xs"
          :class="cell === 'R' ? 'bg-red-500' : cell === 'Y' ? 'bg-amber-400' : 'bg-lab-general-bg'"
        />
      </div>
    </div>
    <div class="flex gap-2">
      <Button
        v-for="c in COLS"
        :key="c"
        :label="\`Drop \${c + 1}\`"
        size="small"
        :pt="{ root: { attrs: { id: generateUniqueId(\`c4-col-\${c}\`) } } }"
        @click="drop(c - 1)"
      />
    </div>
  </div>
</template>
`;
}

function hangmanBoard() {
  return `<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = defineProps<{ serverUrl?: string }>();
const { generateUniqueId } = useUniqueElementId();
const WORDS = ['REACT', 'VUEJS', 'LABORATORY', 'SOCKET', 'CHECKERS', 'HYBRID'];
const secret = ref('');
const guessed = ref<Set<string>>(new Set());
const strikes = ref(0);
const maxStrikes = 6;

const display = () =>
  secret.value
    .split('')
    .map((ch) => (guessed.value.has(ch) ? ch : '_'))
    .join(' ');

function pick(letter: string): void {
  if (!secret.value || strikes.value >= maxStrikes) return;
  if (guessed.value.has(letter)) return;
  guessed.value.add(letter);
  if (!secret.value.includes(letter)) strikes.value += 1;
}

function won(): boolean {
  return secret.value.length > 0 && secret.value.split('').every((ch) => guessed.value.has(ch));
}

function lost(): boolean {
  return strikes.value >= maxStrikes;
}

async function startRound(): Promise<void> {
  const w = WORDS[Math.floor(Math.random() * WORDS.length)];
  secret.value = w;
  guessed.value = new Set();
  strikes.value = 0;
  if (props.serverUrl) {
    try {
      await fetch(\`\${props.serverUrl}/api/hangman/word\`);
    } catch {
      /* offline ok */
    }
  }
}

onMounted(() => {
  void startRound();
  window.addEventListener('hangman:new-game', () => void startRound());
});
onUnmounted(() => window.removeEventListener('hangman:new-game', () => void startRound()));
</script>

<template>
  <div class="flex flex-col gap-4 max-w-lg">
    <p class="m-0 font-mono text-xl tracking-widest" :id="generateUniqueId('hm-word')">{{ display() }}</p>
    <p class="m-0 text-lab-general-text-muted" :id="generateUniqueId('hm-strikes')">Strikes: {{ strikes }}/{{ maxStrikes }}</p>
    <p v-if="won()" class="text-emerald-400 m-0">You won!</p>
    <p v-else-if="lost()" class="text-red-400 m-0">Word was {{ secret }}</p>
    <div class="flex flex-wrap gap-2">
      <Button
        v-for="letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'"
        :key="letter"
        :label="letter"
        size="small"
        :disabled="guessed.has(letter) || won() || lost()"
        :pt="{ root: { attrs: { id: generateUniqueId(\`hm-\${letter}\`) } } }"
        @click="pick(letter)"
      />
    </div>
  </div>
</template>
`;
}

function battleshipBoard() {
  return `<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const { generateUniqueId } = useUniqueElementId();
const SIZE = 8;
type Cell = 'water' | 'ship' | 'hit' | 'miss';
const grid = ref<Cell[][]>([]);
let shipsLeft = 0;

function init(): void {
  grid.value = Array.from({ length: SIZE }, () => Array(SIZE).fill('water'));
  shipsLeft = 0;
  for (let s = 0; s < 4; s++) {
    const r = Math.floor(Math.random() * SIZE);
    const c = Math.floor(Math.random() * SIZE);
    if (grid.value[r][c] === 'water') {
      grid.value[r][c] = 'ship';
      shipsLeft += 1;
    }
  }
}

function shoot(r: number, c: number): void {
  const cell = grid.value[r][c];
  if (cell === 'hit' || cell === 'miss') return;
  if (cell === 'ship') {
    grid.value[r][c] = 'hit';
    shipsLeft -= 1;
  } else {
    grid.value[r][c] = 'miss';
  }
}

onMounted(() => {
  init();
  window.addEventListener('battleship:new-game', init);
});
onUnmounted(() => window.removeEventListener('battleship:new-game', init));
</script>

<template>
  <div class="flex flex-col gap-3">
    <p class="m-0 text-lab-general-text-muted" :id="generateUniqueId('bs-status')">
      Ships remaining: {{ shipsLeft }} (hidden placement MVP)
    </p>
    <div class="inline-grid gap-1" :style="{ gridTemplateColumns: \`repeat(\${SIZE}, 2rem)\` }">
      <Button
        v-for="(row, r) in grid"
        :key="'r' + r"
        v-for="(cell, c) in row"
        :key="\`\${r}-\${c}\`"
        class="!w-8 !h-8 !p-0"
        :severity="cell === 'hit' ? 'danger' : cell === 'miss' ? 'secondary' : 'contrast'"
        :pt="{ root: { attrs: { id: generateUniqueId(\`bs-\${r}-\${c}\`) } } }"
        @click="shoot(r, c)"
      />
    </div>
  </div>
</template>
`;
}

// Fix battleship template - nested v-for wrong in vue 3 - need template fix

function pokerBoard() {
  return `<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const { generateUniqueId } = useUniqueElementId();
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS = ['♠', '♥', '♦', '♣'];
const hole = ref<string[]>([]);
const board = ref<string[]>([]);
const pot = ref(100);
const message = ref('Play money only — not gambling.');

function deal(): void {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push(\`\${r}\${s}\`);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  hole.value = deck.slice(0, 2);
  board.value = deck.slice(2, 5);
  message.value = 'New hand dealt.';
}

function fold(): void {
  message.value = 'You folded.';
  hole.value = [];
}

onMounted(() => {
  deal();
  window.addEventListener('poker-holdem:new-game', deal);
});
onUnmounted(() => window.removeEventListener('poker-holdem:new-game', deal));
</script>

<template>
  <div class="flex flex-col gap-3 max-w-md">
    <p class="text-amber-300 text-sm m-0" :id="generateUniqueId('pk-disclaimer')">{{ message }}</p>
    <p class="m-0">Pot: {{ pot }} (chips)</p>
    <p class="m-0 font-mono">Your hand: {{ hole.join(' ') || '—' }}</p>
    <p class="m-0 font-mono">Board: {{ board.join(' ') || '—' }}</p>
    <div class="flex gap-2">
      <Button label="Deal" :pt="{ root: { attrs: { id: generateUniqueId('pk-deal') } } }" @click="deal" />
      <Button label="Fold" severity="secondary" :pt="{ root: { attrs: { id: generateUniqueId('pk-fold') } } }" @click="fold" />
    </div>
  </div>
</template>
`;
}

for (const g of GAMES) {
  const appDir = `src/apps/${g.slug}`;
  w(`${appDir}/front-end/App.vue`, appVue(g));
  w(`${appDir}/back-end/server.ts`, serverTs(g.slug, g.game, g.title));
  w(`${appDir}/back-end/entry.ts`, entryTs(g.slug));
  if (g.game !== 'checkers' && g.game !== 'chess') {
    let board = gameBoardVue(g.game);
    if (g.game === 'battleship') {
      board = battleshipBoardFixed();
    }
    w(`${appDir}/front-end/components/GameBoard.vue`, board);
  }
}

function battleshipBoardFixed() {
  return `<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const { generateUniqueId } = useUniqueElementId();
const SIZE = 8;
type Cell = 'water' | 'ship' | 'hit' | 'miss';
const grid = ref<Cell[][]>([]);
const shipsLeft = ref(0);

function init(): void {
  const g: Cell[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill('water'));
  let placed = 0;
  for (let s = 0; s < 4; s++) {
    const r = Math.floor(Math.random() * SIZE);
    const c = Math.floor(Math.random() * SIZE);
    if (g[r][c] === 'water') {
      g[r][c] = 'ship';
      placed += 1;
    }
  }
  grid.value = g;
  shipsLeft.value = placed;
}

function shoot(r: number, c: number): void {
  const cell = grid.value[r][c];
  if (cell === 'hit' || cell === 'miss') return;
  if (cell === 'ship') {
    grid.value[r][c] = 'hit';
    shipsLeft.value -= 1;
  } else {
    grid.value[r][c] = 'miss';
  }
}

onMounted(() => {
  init();
  window.addEventListener('battleship:new-game', init);
});
onUnmounted(() => window.removeEventListener('battleship:new-game', init));
</script>

<template>
  <div class="flex flex-col gap-3">
    <p class="m-0 text-lab-general-text-muted" :id="generateUniqueId('bs-status')">
      Ships remaining: {{ shipsLeft }}
    </p>
    <div class="flex flex-col gap-1">
      <div v-for="(row, r) in grid" :key="r" class="flex gap-1">
        <Button
          v-for="(cell, c) in row"
          :key="c"
          class="!w-8 !h-8 !p-0"
          :severity="cell === 'hit' ? 'danger' : cell === 'miss' ? 'secondary' : 'contrast'"
          :pt="{ root: { attrs: { id: generateUniqueId(\`bs-\${r}-\${c}\`) } } }"
          @click="shoot(r, c)"
        />
      </div>
    </div>
  </div>
</template>
`;
}

console.log('Wired', GAMES.length, 'greenfield game apps');
