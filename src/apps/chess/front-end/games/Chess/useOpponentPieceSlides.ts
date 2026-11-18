import { nextTick, ref, watch, type Ref } from 'vue';
import type { ChessBoardPiece, ChessColor } from './types';

const SLIDE_MS = 480;

export interface ActivePieceSlide {
  key: string;
  pieceId: number;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  color: ChessColor;
  type: ChessBoardPiece['type'];
  atDestination: boolean;
}

interface SlideJob {
  from: ChessBoardPiece;
  to: ChessBoardPiece;
}

function detectOpponentMoves(
  prev: ChessBoardPiece[],
  next: ChessBoardPiece[],
  yourColor: ChessColor | undefined,
): SlideJob[] {
  if (!yourColor) {
    return [];
  }
  const jobs: SlideJob[] = [];
  for (const to of next) {
    const from = prev.find((p) => p.id === to.id);
    if (!from) {
      continue;
    }
    if (from.row === to.row && from.col === to.col) {
      continue;
    }
    if (to.color === yourColor) {
      continue;
    }
    jobs.push({ from, to });
  }
  return jobs;
}

export function useOpponentPieceSlides(
  pieces: Ref<ChessBoardPiece[]>,
  yourColor: Ref<ChessColor | undefined>,
): {
  activeSlides: Ref<ActivePieceSlide[]>;
  hiddenGridPieceIds: Ref<Set<number>>;
} {
  const activeSlides = ref<ActivePieceSlide[]>([]);
  const hiddenGridPieceIds = ref(new Set<number>());
  const slideQueue: SlideJob[] = [];
  let draining = false;

  async function playSlide(job: SlideJob): Promise<void> {
    const key = `slide-${job.to.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const slide: ActivePieceSlide = {
      key,
      pieceId: job.to.id,
      fromRow: job.from.row,
      fromCol: job.from.col,
      toRow: job.to.row,
      toCol: job.to.col,
      color: job.to.color,
      type: job.to.type,
      atDestination: false,
    };

    hiddenGridPieceIds.value = new Set(hiddenGridPieceIds.value).add(job.to.id);
    activeSlides.value = [...activeSlides.value, slide];

    await nextTick();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    activeSlides.value = activeSlides.value.map((s) =>
      s.key === key ? { ...s, atDestination: true, type: job.to.type } : s,
    );

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, SLIDE_MS);
    });

    activeSlides.value = activeSlides.value.filter((s) => s.key !== key);
    const nextHidden = new Set(hiddenGridPieceIds.value);
    nextHidden.delete(job.to.id);
    hiddenGridPieceIds.value = nextHidden;
  }

  async function drainSlideQueue(): Promise<void> {
    if (draining) {
      return;
    }
    draining = true;
    while (slideQueue.length > 0) {
      const job = slideQueue.shift();
      if (job) {
        await playSlide(job);
      }
    }
    draining = false;
  }

  watch(
    () => pieces.value,
    (next, prev) => {
      if (!prev?.length) {
        return;
      }
      const jobs = detectOpponentMoves(prev, next, yourColor.value);
      if (jobs.length === 0) {
        return;
      }
      slideQueue.push(...jobs);
      void drainSlideQueue();
    },
  );

  return { activeSlides, hiddenGridPieceIds };
}
