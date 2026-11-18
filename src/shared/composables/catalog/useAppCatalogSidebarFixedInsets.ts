import { type Ref, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useResizeObserver } from '@vueuse/core';

const BASE_BOTTOM_INSET_PX = 8;

function measureShellBottomInsetPx(): number {
  let inset = BASE_BOTTOM_INSET_PX;
  const candidates = [
    '.message-input-container.lab-chat-composer',
    '.session-tabs-container.lab-chat-session-tabs',
  ];
  for (const selector of candidates) {
    const el = document.querySelector(selector);
    if (!(el instanceof HTMLElement)) {
      continue;
    }
    if (getComputedStyle(el).display === 'none') {
      continue;
    }
    const rect = el.getBoundingClientRect();
    if (rect.height < 1) {
      continue;
    }
    const gap = window.innerHeight - rect.top;
    if (gap > inset) {
      inset = gap;
    }
  }
  return inset;
}

/**
 * Pins the launch sidebar shell to the catalog column anchor (top/left) and viewport bottom
 * (above lab chat dock when visible).
 */
export function useAppCatalogSidebarFixedInsets(
  anchorRef: Ref<HTMLElement | null>,
  hostRef: Ref<HTMLElement | null>,
  active: Ref<boolean>,
): { syncInsets: () => void } {
  function syncInsets(): void {
    const anchor = anchorRef.value;
    const host = hostRef.value;
    const shell = document.querySelector('.the-lab-container');
    if (!(shell instanceof HTMLElement)) {
      return;
    }
    const bottomPx = measureShellBottomInsetPx();
    shell.style.setProperty('--lab-shell-catalog-launch-bottom', `${bottomPx}px`);

    if (!anchor || !host || !active.value) {
      return;
    }
    const { top, left } = anchor.getBoundingClientRect();
    host.style.setProperty('--lab-shell-catalog-launch-top', `${top}px`);
    host.style.setProperty('--lab-shell-catalog-launch-left', `${left}px`);
  }

  useResizeObserver(anchorRef, () => {
    syncInsets();
  });

  watch(active, (on) => {
    if (on) {
      nextTick(syncInsets);
    }
  });

  const labShellRef = ref<HTMLElement | null>(null);
  useResizeObserver(labShellRef, () => {
    syncInsets();
  });

  let dockResizeObserver: ResizeObserver | undefined;

  onMounted(() => {
    labShellRef.value = document.querySelector('.the-lab-container');
    window.addEventListener('resize', syncInsets);
    window.addEventListener('scroll', syncInsets, { passive: true });
    dockResizeObserver = new ResizeObserver(() => {
      syncInsets();
    });
    for (const selector of [
      '.message-input-container.lab-chat-composer',
      '.session-tabs-container.lab-chat-session-tabs',
    ]) {
      const el = document.querySelector(selector);
      if (el) {
        dockResizeObserver.observe(el);
      }
    }
    nextTick(syncInsets);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', syncInsets);
    window.removeEventListener('scroll', syncInsets);
    dockResizeObserver?.disconnect();
  });

  /*
   * Exposed so callers can re-measure after a *positional* shift.
   *
   * The sidebar host is `position: fixed` at a measured `left`, while the running-apps rail is
   * an in-flow sibling. Minimizing an app inserts the rail, which pushes the anchor right —
   * but the anchor's own box size is unchanged, so the ResizeObserver above never fires and the
   * fixed sidebar keeps its pre-rail offset (visible as the sidebar overlapping the app header).
   */
  return { syncInsets };
}
