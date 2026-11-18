import { nextTick, ref, watch, type Ref } from 'vue';
import type { BoardPiece } from './types';

const SLIDE_MS = 480;

export interface ActivePieceSlide {
  key: string;
  pieceId: number;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  side: 'mine' | 'opp';
  isKing: boolean;
  atDestination: boolean;
}

interface SlideJob {
  from: BoardPiece;
  to: BoardPiece;
}

function detectOpponentMoves(
  prev: BoardPiece[],
  next: BoardPiece[],
  yourSeat: number | undefined,
): SlideJob[] {
  const jobs: SlideJob[] = [];
  for (const to of next) {
    const from = prev.find((p) => p.id === to.id);
    if (!from) {
      continue;
    }
    if (from.row === to.row && from.col === to.col) {
      continue;
    }
    if (yourSeat != null && to.color === yourSeat) {
      continue;
    }
    jobs.push({ from, to });
  }
  return jobs;
}

function pieceSide(piece: BoardPiece, yourSeat: number | undefined): 'mine' | 'opp' {
  return yourSeat != null && piece.color === yourSeat ? 'mine' : 'opp';
}

export function useOpponentPieceSlides(
  pieces: Ref<BoardPiece[]>,
  yourSeat: Ref<number | undefined>,
): {
  activeSlides: Ref<ActivePieceSlide[]>;
  hiddenGridPieceIds: Ref<Set<number>>;
  slideStyle: (slide: ActivePieceSlide) => Record<string, string | number>;
} {
  const activeSlides = ref<ActivePieceSlide[]>([]);
  const hiddenGridPieceIds = ref(new Set<number>());
  const slideQueue: SlideJob[] = [];
  let draining = false;

  function slideStyle(slide: ActivePieceSlide): Record<string, string | number> {
    const col = slide.atDestination ? slide.toCol : slide.fromCol;
    const row = slide.atDestination ? slide.toRow : slide.fromRow;
    return {
      '--slide-col': col,
      '--slide-row': row,
    };
  }

  async function playSlide(job: SlideJob): Promise<void> {
    const key = `slide-${job.to.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const side = pieceSide(job.to, yourSeat.value);
    const slide: ActivePieceSlide = {
      key,
      pieceId: job.to.id,
      fromRow: job.from.row,
      fromCol: job.from.col,
      toRow: job.to.row,
      toCol: job.to.col,
      side,
      isKing: job.to.isKing,
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
      s.key === key ? { ...s, atDestination: true } : s,
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
      const jobs = detectOpponentMoves(prev, next, yourSeat.value);
      if (jobs.length === 0) {
        return;
      }
      slideQueue.push(...jobs);
      void drainSlideQueue();
    },
  );

  return { activeSlides, hiddenGridPieceIds, slideStyle };
}
